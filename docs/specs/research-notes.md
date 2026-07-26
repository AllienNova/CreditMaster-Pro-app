# Research Notes — Backend Parity Plan (Wave 7 → parity)

> Decision-driving findings only. Grounded against real code by 4 parallel research personas (2026-07-26). Each claim cites file:line. Feeds `product-spec.md` / `architecture.md` / `delivery-plan.md` / ADRs / contracts.

## Cross-cutting auth + RLS contract (verified)

- `withAuth(handler)` — `src/lib/auth/api-guard.ts:102`. JWT establishes identity (`user.id`); role resolved fresh from `profiles` via `resolveRoleFromDb` (never JWT claim — FND-005). Fails **closed** to 503 if role resolution throws; 401 if unauthenticated. Handler receives `AuthedUser{id,email,role}`.
- Variants: `withPermission(perm, handler)` (403 on missing RBAC perm), `withRole(role, handler)` (403 below role), `withOptionalAuth`.
- **user_id always from `user.id`, never request body/query.** Canonical route model: `src/app/api/financial/savings/route.ts`.
- RLS idiom: `CREATE POLICY … USING (auth.uid() = user_id)` (e.g. `20250107_credit_bureau_tables.sql:124`, `profiles` `20251217000001_...:422`). Service-role insert: `... FOR INSERT TO service_role WITH CHECK (true)` (`20260331000000_adverse_action_notices.sql:33`).
- **⚠ Orphaned services instantiate Supabase with `SUPABASE_SERVICE_ROLE_KEY` → RLS is BYPASSED.** RLS is defence-in-depth only; every service/route path MUST carry an explicit `.eq("user_id", user.id)` (or ownership-join) filter. This is the load-bearing IDOR control for Track 1.

---

## Track 1 — Orphaned services (premise VERIFIED, 1 correction)

All four have COMPLETE `src/lib` logic, **no** migration, **no** route, and **no** mobile client. **Correction to premise:** the gap is *both* clients — every web page renders a hardcoded in-component `MOCK_*` array and never fetches; there is no mobile screen either. Shared missing piece = **migration + API route**; then un-mock the web page + add a mobile screen/adapter.

| Service | Location | Complete? | Tables (all new) | Route (new) | Verdict | Effort |
|---|---|---|---|---|---|---|
| journey | `src/lib/gamification/financial-journey-service.ts` (851) | COMPLETE; `updateProgress:592` enforces `journey.userId!==userId→throw` | `financial_journeys` (1; `waypoints` JSONB) | `/api/journey` | **CLEAN-WIRE** | S |
| crypto | `src/lib/financial/crypto-wallet-service.ts` (708) | COMPLETE (`MOCK_PRICES:190` sync honest-stub; realized P&L `0`) | `crypto_wallets`, `crypto_holdings` (FK wallet, no user_id), `crypto_price_alerts` (3) | `/api/financial/crypto` | **NEEDS-WORK** (IDOR) | M |
| real-estate | `src/lib/financial/real-estate-tracking-service.ts` (679) | COMPLETE (amortization pure-fn; `estimateValue:326` honest-mock) | `properties`, `property_valuations`, `mortgages` (3) | `/api/financial/real-estate` | **NEEDS-WORK** (IDOR) | M |
| shared-goals | `src/lib/gamification/shared-goals-service.ts` (490) | COMPLETE; `assertMember:236` gates most ops | `shared_goals`+`_members`+`_contributions`+`_invitations`+`_updates` (5, membership RLS) | `/api/goals/shared` | **CLEAN-WIRE** (1 gap: `getGoal:197` no membership check) | L |

- **IDOR holes to fix before wiring** (service-role key exposes them): crypto `getWallet:265/updateWallet:247/deleteWallet:306/getWalletHoldings:355/updateHolding:337/deleteAlert:583`; real-estate `getProperty:251/updateProperty:233/deleteProperty:273/getPropertyMortgages:371/getPropertyAnalytics:421/updateValuation:286/addMortgage:345`; shared-goals `getGoal:197`. Fix = add `userId` param + `.eq("user_id",…)` / ownership-join.
- **ADR inputs:** (1) shared-goals `recordContribution:307` does read-modify-write on `current_amount:335` → **must be an atomic RPC** (reuse `increment_referral_use` pattern; avoids Wave-7 lost-update class). (2) All four tables are **absent from the GDPR erasure cascade** → each new table must be added to the resilient-erasure sweep (ties to FND-057).
- **Build order:** journey → crypto → real-estate → shared-goals (ascending complexity; journey de-risks the migration+route+un-mock pattern).

---

## Track 2 — Schema reconciliations + read-routes (12 items)

| # | Item | Verdict | Key grounded fact |
|---|---|---|---|
| 1 | audit_logs type/category | **ADDITIVE-COLUMN** + **LIVE BUG** | Twin `CREATE TABLE IF NOT EXISTS audit_logs`: `002_production_enhancements.sql:23` (wins) vs `20260217000000_...:39`. Admin POST `admin/audit/route.ts:111` writes `details` (in neither schema) + omits `resource_type NOT NULL` → **INSERT fails on live 002 table**. Mobile `admin/audit.tsx:21` renders `type`+`details`. Fix: add `details JSONB`+`type`/`category` to 002; make 20260217 an `ALTER`, not shadow `CREATE`. |
| 2 | subscriptions read-model (FND-018) | **ADDITIVE-COLUMN** (FND-018 already fixed) | `getTierFromPriceId`→`tierFromPriceId` (`src/lib/payment/tier-mapping.ts:61`) **throws** on unknown, never defaults free. Tier durable on `profiles.subscription_tier`. Residual: silent `?? "free"` recompute in read path (`billing-data.ts:163`, webhook `stripe-service.ts:688`) depends on runtime env price IDs; twin `subscriptions` table (`001_initial_schema.sql:63` Stripe vs `20260110_subscriptions.sql:5` third-party-tracking) collide. Fix: add write-time `subscriptions.tier` column. |
| 3 | credit_reports twin-schema | **ROUTE-ONLY** + migration reconcile | Twin `credit_reports` (`20250107` wins, no `inquiries` col vs `20250204:98` full). POST `credit-repair/reports/route.ts:90` only writes `{bureau,reportDate,score,reportData}` → `accounts/inquiries` always `[]`. Mobile `reports/[id].tsx:27` expects structured accounts/negativeItems/inquiries/publicRecords. Reconcile twin + populate POST. |
| 4 | full user-profile | **ADDITIVE-COLUMN** + **LIVE BUG** | `profiles` has NO `phone/address/city/state/zip/dob` in any migration; `avatar_url` ✅. Route `profile/route.ts:21` SELECTs `phone,address` + PATCH `allowedFields:122` includes them → **live query drops/errors today**. Mobile `profile/edit.tsx:19` edits all 9 fields + `setTimeout` fake save. Add cols + expand route SELECT/allowedFields. |
| 5 | payment-history | **ROUTE-ONLY (already wired)** | No local invoice table. `GET /api/payment/billing` returns Stripe-live `invoices` (cap 10). Mobile `billing/invoices.tsx:65` already wired via `subscriptionApi.getInvoices`→`mapWebInvoices`. NEW-TABLE (`stripe_invoices` webhook-synced) only if durable/offline/>10 history wanted. |
| 6 | per-card credit-limits | **ROUTE-ONLY (easy win)** | `credit_cards` (`20250204:241`) has `credit_limit`, `current_balance`, generated `utilization STORED`. Route `GET /api/credit-repair/cards` exists. Mobile `credit-builder/utilization.tsx:22` hardcodes `MOCK_CARDS`. Just fetch. |
| 7 | credit tradelines/age | **ROUTE-ONLY (new route)** | `credit_accounts` (`20250107:53`) has `account_type,creditor_name,balance,credit_limit,payment_status,opened_date`. NO read route. Mobile `credit-builder/age.tsx:20` mocks `MOCK_ACCOUNTS`. Add GET; age computed from `opened_date`. |
| 8 | disputable-items list | **ROUTE-ONLY (new route)** | No dedicated endpoint. Real sources: `credit_inquiries` (live route `credit-repair/inquiries/route.ts:31`) + `credit_accounts` negative rows. Mobile `dispute/create.tsx:48` mocks `MOCK_CREDIT_ITEMS`. Join the two reads. |
| 9 | credit-report [id] | **ROUTE-ONLY (rewire)** | Cited `/api/credit/reports/[id]` = 404 (only `factors/`,`analyze/` exist). Real route lives at `/api/credit-repair/reports/[id]:24`. Mobile `reports/[id].tsx:27` hardcodes report, no fetch. Wire screen to the real route. |
| 10 | activity feed | **ROUTE-ONLY (correction: NOT no-source)** | No `/api/activity` route. **Real source EXISTS:** `notifications` (`001_initial_schema.sql:52`; `type/title/message/read/created_at`) maps ~1:1; optional union w/ `audit_logs`,`credit_scores`. Mobile `activity/index.tsx:33` hardcodes 8 items + `setTimeout`. |
| 11 | support tickets | **NEW-TABLE + ROUTE** | No `support_tickets` table, no submit route. Mobile `help/contact.tsx:68` `setTimeout` fake submit. Create table (`user_id,topic,subject,message,status,created_at`) + `POST /api/support` (`withAuth`). |
| 12 | doc-analysis payload | **ADDITIVE-COLUMN** (infra exists, unbacked) | `documents` (`001_initial_schema.sql:38`) has NO analysis column; `analysis_result` grep = 0 in src. Real OCR pipeline exists for **tax** only (`tax_documents.extracted_data`); `credit-report/analyze/route.ts:68` OCRs but doesn't persist. Mobile `document/[id].tsx:36` mocks `analysis_result{bureau,score,accounts_count,disputable_items,recommendations}`. Add `analysis_result JSONB` + wire analyze pipeline. |

### Track 2 systemic finding → ADR
**Migration twin-schema pattern** (`credit_reports`, `subscriptions`, `audit_logs` all have colliding `CREATE TABLE IF NOT EXISTS`): earlier migration's shape silently wins; later richer definition is a no-op. Root cause of items 1/2/3. Warrants an ADR on migration hygiene (reconcile via `ALTER`, forbid shadow re-`CREATE`).

### Track 2 build tiers
- **Trivial ROUTE-ONLY (wire existing):** 5 (already wired — verify only), 6 (fetch existing route).
- **New GET route over existing table:** 7, 8, 9, 10.
- **Additive column + route:** 1 (+POST fix), 4 (+live-bug fix), 12.
- **Additive column, write-path:** 2.
- **Migration reconcile + populate:** 3.
- **New table + route:** 11.

---

## Track 3 — Aggregation engines (4 engines; all consumers MOCK today)

Every consumer screen renders a local `MOCK_*` and never fetches. Real sources exist for all four, but each surfaces schema-drift.

### 3.1 weekly-summary
- Consumers: web `src/app/insights/weekly-summary/page.tsx:162` (MOCK_SUMMARY, no fetch); mobile `mobile-app/app/insights/weekly-summary.tsx:180` (MOCK_SUMMARY, no fetch). No weekly route exists.
- **Real sources:** `financialService.getSpendingAnalysis(userId,days)` (`financial-service.ts:280`) + `getBudgets` (`.from("budgets"):387`) + `getFinancialGoals` (`.from("financial_goals"):447`); or `spendingAnalyzer.analyzeSpendingPatterns(userId,"weekly")` (`spending-analyzer.ts:118`, last-7-days `:609`). Deterministic pattern/anomaly/velocity math is REAL.
- **AVOID placeholder paths** in spending-analyzer: `calculateCategoryTrends` prev = `currentAmount*0.9` (`:1287`), constant scores (`:1673`), `getAIInsights → []` (`:1753`).
- **⚠ Blocker:** bare `transactions` table has **NO migration** (schema drift); Plaid writer `plaid-service.ts:411` stores `category:string[]`+`pending`, analyzer reader `spending-analyzer.ts:77` expects `category:string`+`is_pending`/`is_recurring`. Reconcile before build.
- healthScore field in the payload ties to the vitality/health-score decision (3.4).

### 3.2 alerts
- Consumers: web `src/app/insights/alerts/page.tsx:208` (MOCK_ALERTS); mobile `mobile-app/app/insights/alerts.tsx:149` (MOCK_ALERTS). No unified `/api/alerts` route.
- **4 real signal sources (build the engine as a union):**
  1. Budget overspend — `spending-limit-alerts-service.getActiveAlerts:483`/`getLimitSummary:576` + `budget-service.getAlerts`. ⚠ `spending_alerts`/`spending_limits`/`budget_alerts` tables **missing from migrations**.
  2. Goal milestone — `goal-tracker.calculateProgressMetrics:123`/`goal-planner.getUserGoals:158`; `financial_goals` exists (`milestones` JSONB).
  3. Low savings — DERIVED from `financialService.getFinancialDashboard` `savingsRate:162`/`cashFlow:161` + threshold rule (requires Plaid link).
  4. Upcoming bills — `bill-calendar-service.getUpcomingBills:390`; `bills` table EXISTS.
- Auth `withPermission("financial:read")`; response `{success,data,count}` (budgets/alerts precedent).
- `notifications.type` CHECK is narrow (dispute_update/payment_success/document_uploaded/tip) vs broader TS `NotificationType` — drift; don't rely on it for alert categories.

### 3.3 admin/health
- **No `/api/admin/health` route** (greenfield). Existing `/api/health` (public) + `/api/monitoring/health` (`withRole("admin")`) are **fake-green**: `health.ts` `checkDatabase:34` returns healthy with the Supabase ping commented out (`:31`); `checkExternalServices:99` does a real HEAD fetch but `.catch(()=>{})` then unconditionally pushes `healthy` (`:106`).
- **6 probe-able services** (all have real client + env): Supabase (`src/lib/supabase/admin.ts:34`), Stripe (`stripe-service.ts:11`), AIML (`aiml-service.ts:56`), Plaid (`plaid-client.ts:7`), S3 (`document-service.ts:12` — client module-private, need exported probe helper), Resend (`email-service.ts:11`). **Probe must treat empty/missing env as unknown/degraded, NOT green** (clients tolerate `""` keys).
- Consumers: web `src/app/admin/health/page.tsx:3` (static SERVICES, no fetch); mobile `mobile-app/app/admin/health.tsx:29` (hardcoded + setTimeout); also `admin/page.tsx:34` inline `systemStatus`. Auth `withRole("admin")`.

### 3.4 vitality / health-score history — reconcile first (ADR)
- **Two parallel systems:** `healthScoreCalculatorV2` (backs `/api/financial/health-score[/v2]`, `?history=true&days=N` **already returns history** via `getScoreHistory`; consumed by web `HealthScoreCard.tsx:37`) vs `vitalityScoreService` (backs `/api/financial/ai-insights`; de-mocked `533f6e4`).
- Mobile `dashboard/vitality.tsx:518` fetches `/api/financial/vitality-score` — **route does not exist → 404 → silent `mockVitalityData` fallback** (`:524`), renders `<TrendChart history>`. Web `dashboard/vitality/page.tsx:412` local mock, no fetch.
- Committed `20260110_vitality_scores.sql` **drifts** from code (`credit_score`/`period_*` vs `credit`/`date`) → operative persistence schema absent.
- **Missing piece:** a vitality-history endpoint + a nullable-component history table. **ADR needed:** unify on ONE score system (recommend: point mobile at the existing v2 `health-score?history=true`, OR give `vitalityScoreService` its own history table + `/api/financial/vitality-score` route). Decide before building.

### Track 3 systemic finding (reinforces Track 2)
Tables the code writes/reads with **no migration**: `transactions`, `spending_alerts`, `spending_limits`, `budget_alerts`; drifted: `vitality_scores`, `subscriptions`, `credit_reports`, `audit_logs`. This IS the CLAUDE.md "live-schema audit" launch condition — broader than first scoped. A dedicated **schema-reconciliation milestone (M0)** must precede the read-routes that depend on these tables, grounding each new/reconciled table in the reader+writer column usage.

---

## Track 4 — Owner-decision items (→ ADR-0005..0009; vendor claims cite docs or "(verify)")

| ADR | Item | Recommendation (hypothesis) | Proceed-now (no owner input) | Gated |
|---|---|---|---|---|
| 0005 | Market-data vendor | **Alpaca Market Data** canonical (free IEX, creds exist, WS coded); Polygon Advanced $199 as paid upgrade | **DELETE synthetic-candle fabrication** in `src/lib/investments/services/MarketDataService.ts` (de-fab) | making watchlist/OHLC canonical (PARITY-P4) |
| 0006 | Identity/credit-monitoring vendor | **Array** (array.com) — consumer credit+identity monitoring, alerts, dark-web, compliant simulator+dispute in one; also settles 0009. Opaque pricing → verify + DPA | none (existing score *display* independent) | monitoring/alerts feature (vendor + DPA) |
| 0007 | Cards product fork | Cards = **MoneyLion affiliate CATALOG** (revenue; screens already catalog-shaped, `credit-card-matcher.ts` exists); utilization-optimizer = **separate** feature (Plaid liabilities, item 6). Don't merge (sponsored-vs-owned clarity). | wire `recommendations/credit-cards.tsx` → existing matcher **if** C=catalog | which product cards becomes |
| 0008 | Marketplace routes | **Ratify** intentionally-public catalog + hardening (FND-001 deny-by-default already closed; `PUBLIC_ROUTES.ts` allowlists 6 catalog reads; mutations already guarded) | **hardening pass now**: verify public payloads non-PII, reject non-GET, rate-limit, fix `products` base-GET vs `search` inconsistency | only "guard-all" alternative needs the call |
| 0009 | Credit simulators | If 0006=Array → adopt Array's compliant simulator; else deterministic directional model + disclaimer. **Never ship hardcoded point tables.** | **flag/gate the 4 fabricated simulators** (`mobile score-simulator.tsx`,`simulator.tsx`; `web credit/simulator`,`credit-builder/score-simulator`) so fabrication doesn't ship | the rebuild (Array vs deterministic) |

- **Net proceed-now Track 4 (radical-honesty de-fab, no owner gate):** delete synthetic-candle fabrication (0005), flag the 4 fabricated simulators (0009), marketplace hardening pass (0008).
- **Owner must decide:** 0005 (ratify Alpaca + authorize fabrication delete), 0006 (Array + DPA), 0007 (cards=catalog), 0008 (ratify public catalog vs guard-all), 0009 (Array-sim vs deterministic-model vs remove).
- **Unverified (honest gaps):** Alpaca real-time SIP price; Finnhub free rate-limit + `/stock/candle` premium status; Alpha Vantage daily cap; Array + Experian pricing (all contact-sales). Marked (verify) in ADRs; none guessed.


