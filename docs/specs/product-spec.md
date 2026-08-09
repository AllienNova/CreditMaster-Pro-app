# Product Spec — Backend Parity (Wave 7 → ≥98% web↔mobile parity)

> Grounded against real code (2026-07-26). Companion: `research-notes.md` (evidence), `architecture.md` (how), `delivery-plan.md` (sequence), `adr/` (decisions). Mode: hybrid.

## Problem

The client-wiring parity drive is complete: every mobile + web screen with an honest data source is wired. The residual parity gap is **backend that does not exist** — screens that still render local `MOCK_*` because there is no route, no table, or the table was never migrated. This spec defines the backend to close that gap **without fabricating data**: where no honest source exists, the screen empty-states; it never shows invented numbers.

A second, load-bearing discovery: **many tables the code already reads/writes have no migration** (`transactions`, `spending_alerts`, `spending_limits`, `budget_alerts`) and **17 tables are twinned** (colliding `CREATE TABLE IF NOT EXISTS` — the first-applied shape wins, later definitions no-op). This is the CLAUDE.md "live-schema audit" launch condition. Some routes have **live bugs today** (admin-audit POST and profile GET query columns absent from the operative schema; `audit-logger.ts` silently swallows its failed insert). Schema reconciliation is therefore a prerequisite, not a nicety.

## Users

- **Existing Fynvita end users** (mobile + web) whose screens currently show mock data: crypto/real-estate/journey/shared-goals, credit-builder (utilization/age), disputes, reports, activity, weekly-summary, alerts, vitality trend, profile edit, documents, support.
- **Admins** whose dashboards show hardcoded system health and an audit log that cannot be written.

## Requirements (MoSCoW; FR-IDs)

### MUST — schema reconciliation (M0, unblocks everything) — re-specced after critic round 1
Reconcile via **NEW forward `ALTER … ADD COLUMN IF NOT EXISTS` migrations, never edits to applied files** (ADR-0001). **17 tables are twinned** (`grep CREATE TABLE … | uniq -d`); M0 covers the ones read/written by a new route.
- **FR-010** (foundation) Introspect the actual target-DB schema (scratch DB from `supabase/migrations/*`) and diff vs each route's reader/writer usage — classify all 17 twins; do NOT infer the live shape from filename order. Regenerate `src/lib/supabase/types.ts` after reconcile; dry-run apply (exit 0) before dependent routes build.
- **FR-001** Create the bare `transactions` table (never migrated) grounded in the Plaid writer + analyzer reader, resolving `category` (string[] vs string) and `pending`/`is_pending`.
- **FR-002** Reconcile `credit_reports`: **choose the inquiries model** — separate `credit_inquiries` table (`20250107`, wins) vs inline `inquiries JSONB` (`20250204`) — then forward-reconcile so FR-206 POST writes the chosen shape.
- **FR-003** Reconcile `subscriptions` twin + add a write-time `tier` column (removes the read-path `?? "free"` recompute).
- **FR-004** `audit_logs` **redesign** (ADR-0010, not a simple column-add): the twin has an unmergeable PK-type conflict (UUID vs TEXT). Standardize on the UUID security-audit table + additive columns (`details/type/category/actor_email/target_type/success/error_message`), split the AI-event shape to `system_event_logs`, fix the 3 writers, and **unswallow `audit-logger.ts:84`** (security audit logging silently fails today).
- **FR-005** Add `phone, address, city, state, zip, date_of_birth` to `profiles` (twinned); fix the live profile GET/PATCH bug **and** the `subscriptions!inner` join that drops sub-less users.
- **FR-006** Create `spending_alerts`, `spending_limits`, `budget_alerts`; reconcile `budgets` + `recurring_bills` twins for the columns the alert signals read.
- **FR-007** Reconcile `financial_goals` (forward `ADD milestones/ai_recommendations` — the winning twin lacks them, **breaking FR-302**), plus `financial_health_scores` (FR-304), `financial_insights` (FR-301), `disputes` (FR-204) per the M0-0 deltas.
- **FR-008** Every new/reconciled table carries RLS and is registered in the GDPR erasure cascade; verify the sweep reaches child tables (holdings/valuations/contributions).
- **Out of M0 (honest scope):** the 7 twins no new route touches (investment_holdings/portfolios/transactions, financial_chat_sessions/messages, trading_signals, document_share_links) are logged latent drift, not reconciled here.

### MUST — Track 1 orphaned services (complete logic, no route/migration/client)
- **FR-101** `journey` — `financial_journeys` migration + `GET/POST /api/journey` (withAuth) + un-mock web `journey/page.tsx` + mobile screen. Ownership already enforced. (CLEAN-WIRE, S)
- **FR-102** `crypto` — 3-table migration + `GET/POST /api/financial/crypto` + un-mock web + mobile. **Fix by-id IDOR holes** (owner-scope `getWallet/updateWallet/deleteWallet/getWalletHoldings/updateHolding/deleteAlert`) before wiring. (M)
- **FR-103** `real-estate` — 3-table migration + `GET/POST /api/financial/real-estate` + un-mock web + mobile. **Fix by-id IDOR holes.** (M)
- **FR-104** `shared-goals` — 5-table membership-RLS migration + `GET/POST /api/goals/shared` + un-mock web + mobile. Add membership check to `getGoal:197`; contributions via **atomic RPC** (ADR). (L)

### MUST — Track 2 read-routes / additive columns
- **FR-201** Wire mobile `credit-builder/utilization.tsx` to the existing `GET /api/credit-repair/cards` (remove MOCK_CARDS). (ROUTE-ONLY, S)
- **FR-202** Wire mobile `reports/[id].tsx` to the real `GET /api/credit-repair/reports/[id]` (the cited `/api/credit/reports/[id]` is a 404). (ROUTE-ONLY)
- **FR-203** New `GET` for credit tradelines/age over `credit_accounts` (age from `opened_date`); wire `credit-builder/age.tsx`.
- **FR-204** New `GET` disputable-items = union of `credit_inquiries` + negative `credit_accounts`; wire `dispute/create.tsx`.
- **FR-205** New `GET` activity feed over `notifications` (+optional audit_logs/credit_scores union); wire `activity/index.tsx`.
- **FR-206** Populate the `credit_reports` POST (accounts/inquiries) and serve structured data to `reports/[id].tsx` (depends on FR-002).
- **FR-207** Expand `GET/PATCH /api/profile` for city/state/zip/dob; wire `profile/edit.tsx` (depends on FR-005).
- **FR-208** Add `analysis_result JSONB` to `documents` and wire the existing credit-report OCR pipeline to persist it; wire `document/[id].tsx`. (depends on migration)
- **FR-209** New `support_tickets` table + `POST /api/support` (withAuth); wire `help/contact.tsx`.

### MUST — Track 3 aggregation engines
- **FR-301** `GET /api/financial/insights/weekly-summary` aggregating real `getSpendingAnalysis`+`getBudgets`+`getFinancialGoals` (avoid placeholder scoring); wire both weekly-summary screens. (depends on FR-001)
- **FR-302** `GET /api/alerts` union engine over the 4 real signals (budget/goal/savings/bills); wire both alerts screens. (depends on FR-006)
- **FR-303** `GET /api/admin/health` (withRole admin) probing the 6 real services; missing-env → degraded, never green; wire admin health web + mobile.
- **FR-304** Vitality/health-score history table + endpoint; wire mobile `dashboard/vitality.tsx` (currently 404s to a dead route) and web. (depends on ADR score-unification)

### SHOULD
- **FR-501** Durable `stripe_invoices` sync table (payment-history is already display-wired via live Stripe; durable/offline history only).

### WON'T (this pass) / GATED on owner ADRs (Track 4)
- **FR-601** Market-data/quotes vendor (watchlist + OHLC) — **gated on ADR-market-data.**
- **FR-602** Identity-monitoring vendor — **gated on ADR-identity-monitoring.**
- **FR-603** Cards screen product direction — **gated on ADR-cards-fork.**
- **FR-604** Marketplace route-guarding policy — **gated on ADR-marketplace-routes.**
- **FR-605** Credit simulators deterministic-math de-fab — **gated on ADR-credit-simulators.**

## Non-functional requirements

- **NFR-1 Security:** every new route via `withAuth`/`withPermission`/`withRole`; every query `user_id`-scoped (`.eq("user_id", user.id)` or ownership-join) — RLS is defence-in-depth (orphaned services use the service-role key, which bypasses RLS).
- **NFR-2 Migrations:** additive/non-destructive only; reconcile drift via `ALTER`, never shadow `CREATE`; no prod execution by the build.
- **NFR-3 Honesty:** no fabricated data; empty-state on no source; missing-env probes report degraded/unknown, not healthy.
- **NFR-4 Money correctness:** balance/contribution mutations use atomic RPCs (no read-modify-write).
- **NFR-5 Types/tests:** TypeScript strict, no `any`; co-located tests; changed-line coverage ≥85% (web); screen tests (mobile); auth-negative + IDOR tests for every new route.
- **NFR-6 Secrets:** vendor keys in Doppler only, never inline/committed.

## Success metrics

- Screens converted from MOCK → real (or honest empty-state) across Tracks 1–3: target 100% of non-gated items.
- Zero fabricated-data code paths remain in the touched screens (grep-verified).
- Schema reconciled: `transactions` created + the route-touched twins forward-reconciled (audit_logs, credit_reports, subscriptions, profiles, financial_goals, budgets, recurring_bills, financial_health_scores, financial_insights, disputes) + alert tables (3) + Track-1 tables (12); 7 non-route-touched twins logged as latent. Verified by M0-0 introspection + M0-12 dry-run exit 0 + `tsc` 0 after type-regen.
- All new routes: auth-negative + IDOR test green; `tsc` 0; changed-line coverage ≥85%.

## Out of scope

- External-vendor features (Track 4) until their ADRs are signed.
- Running migrations against production (operator-owned; the build produces migration files only).
- The trading market-data provider beyond the ADR decision.
