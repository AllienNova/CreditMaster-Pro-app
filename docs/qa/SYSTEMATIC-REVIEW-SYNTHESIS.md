# Systematic Review — Synthesis

> 2026-07-31. Every claim below is diffed against a **live** Postgres with all 57 migrations applied, not against migration files. Sources: `phantom-table-inventory.md` (mechanical sweep) + `triage-trading.md`, `triage-platform.md`, `triage-commerce.md`, `triage-financial.md`. **All four slices complete (148 tables triaged).**

## The finding

**The codebase's relationship to its own database was never verified.** 147 of 248 referenced tables (59%) do not exist. Nothing caught it because:

1. `src/lib/supabase/types.ts` omits the `Relationships` field postgrest-js's `GenericSchema` requires → the `Schema` generic degrades → `.from()` accepted **any string** (proven with two independent minimal repros).
2. `src/lib/supabase/client.ts` is **deliberately untyped**, by its own comment: *"the Database type only covers ~20 tables while the codebase uses 40+"* → its consumers stay invisible to `tsc` even after (1) is fixed.
3. PostgREST **resolves an error object, it does not throw** (verified live: HTTP 404 for a missing table). So a broken query is indistinguishable from an empty result unless the caller checks — and this codebase overwhelmingly does not.

Net effect: **a feature queries a table that was never migrated, the error is swallowed or defaulted, and the feature renders as empty/zero/false while appearing to work.**

## Triage outcome (all 4 slices, 148 tables)

| Slice | RENAME | UNBUILT | DEAD | CRITICAL |
|---|---:|---:|---:|---:|
| Trading / investing | 3 | 14 | 18 | 3 |
| Identity / credit / platform | 3 | 7 | 20 | 5 |
| Commerce / growth | 2 | 4 | 38 | 2 |
| Financial / savings / goals | 3 | 15 | 21 | 2 |
| **Total** | **11** | **40** | **97** | **12** |

**~66% is dead code.** The raw 147 substantially overstates user-facing impact — which is why triage mattered before any remediation plan. Call-site counts are actively misleading: `scheduled_contributions` has the most sites in its slice (12) and zero user impact, while `debts` has 2 sites and is CRITICAL.

## CRITICAL — ranked by real-world harm

### 1. Every affiliate conversion records $0 commission — MONEY, LIVE ✅ independently verified
`POST /api/affiliate/webhooks` correctly refuses to trust the inbound amount and recomputes server-side. That recompute reads `affiliate_partners` (absent) → `commission-calculator.ts:408 if (error) return null` → `:88 if (!partner) return 0` → **`0` persisted to the real `revenue_events` table**, response `200 {"success": true}`.
Verified by me: table absent in `pg_class`; `revenue_events` real; PostgREST returns 404 (error object, not throw).
**`route.ts:121` carries the comment *"returns 0 for an unknown/missing partner rather than throwing"* — the zero was observed and misattributed rather than investigated.**

### 2. Bank linking cannot complete at all
`plaid_items` has no home for the Plaid access token → `storeAccessToken` throws on every link (`plaid-service.ts:170`). Every downstream Plaid surface (accounts, transactions, income, liabilities, investments; web + mobile) calls `getAccessToken`, which throws. Cheapest CRITICAL, widest unblock.

### 3. Every user is told their net worth is $0 — silent
`plaid_accounts` absent; `financial-aggregation-service.ts:375` swallows → `getEmptyAccounts()` → assets/liabilities/savings all 0. Feeds `/api/financial/health-score` (twice). Users get a health score derived from zeros, with `200 OK`. No bank-accounts table exists under any name.

### 4. The live AI coach fabricates investment advice
`portfolio_holdings` (RENAME → the real `investment_holdings`). `financial-chat-engine.ts:876,939` discard the error; `:888` `holding?.current_value || 0` → emits `{recommendation:"HOLD", confidence:0.5, targetPrice:0}` for any symbol, and computes risk from a £0 portfolio. **Fix is a rename** — `/api/investments/holdings` already uses the real table.

### 5. Credit-builder progress shows fabricated numbers — FCRA surface
`GET /api/credit-builder/progress` returns `actionsCompleted || 8`, `actionsTotal || 12`, `targetScore || 720` to every authenticated user. Affirmative misrepresentation, not empty data. **Does not self-heal:** `||` means a legitimately empty `[]` still yields 8, so creating the table leaves the fabrication in place.

### 6. Credit disputes filed with bureaus are never recorded
`bureau_disputes` absent. `submitDispute` persists only `if (response.success)` — so the bureau has accepted it and the **FCRA §611 30-day clock is running**, then `saveDisputeRecord` throws, the outer catch swallows, and the user is told it failed. Retry files a duplicate, which bureaus may treat as frivolous under §611(a)(3). **The only finding with irreversible external state divergence.**

### 7. Credit alerts are discarded; an empty list looks like good news
`credit_alerts` absent → `createAlert` returns null, `getAlerts` returns `[]`. Every new-account/inquiry/score alert ever raised was dropped, indistinguishable from a genuine all-clear.

### 8. Credit score reads 0 although the real data exists
`credit_profiles` (RENAME → `latest_credit_scores`). 3 live routes fall back to `currentScore: 0`. **The data is already in `credit_scores` and simply never read** — cheapest CRITICAL to close.

### 9. GDPR/CCPA data-subject rights are entirely unrouted
No `/api/privacy/*` or `/api/gdpr/*` endpoint exists. `exportUserData` (Art. 15/20) and `deleteUserData` (Art. 17) have no caller. Compounds the already-fixed erasure abort: that code was **both broken and unreachable**.

### 10. Admin revenue permanently $0; analytics silently stores nothing
`payments` absent → admin revenue/trend read $0 **beside a correct MRR** from the real `subscriptions` table, so it reads as "subscribers but no revenue". `analytics_events` absent → `POST /api/analytics/events` returns `200 {"success": true}` having stored 0% of events.

### 11. The AI coach tells every user they are debt-free — ✅ verified by lead
`financial_accounts` does not exist under any name. `financial-chat-engine.ts:1121` returns, verbatim:
> `"No debt accounts found. Great job being debt-free!"`

to **every** user, because the query failed — not because they have no debt. Congratulating a user on being debt-free while they carry debt is worse than showing an error. Same failure class as the DTI gate. 43 entry points; `credit-builder-service.ts:1068,1174` additionally substitute fabricated constants (`revolving: 2`, `averageAge = 3.5`) and present them as the user's real credit profile (FCRA-adjacent). `plaid-service.ts:287` has a literally empty `if (error) { /* comment */ }` — account sync reports success and persists nothing.

### 12. `debts` → `debt_accounts`, and DTI reads 0 for everyone
`savings-optimizer.ts:1372` swallows so "Pay Off High-Interest Debt" can never fire; `financial-aggregation-service.ts:236` computes `debtToIncomeRatio` from a total the `catch` at `:632` pins to 0, so `/api/financial/health-score` reports **DTI = 0 for every user**.

> **⚠ RENAME TRAP — verified by lead.** `savings-optimizer.ts:1370` filters `.eq("status","active")`, but `debt_accounts` has **`is_active boolean` and no `status` column** (confirmed via information_schema). A string-only rename trades a 42P01 for a 42703 and looks fixed. The already-shipped wellness-gate fix (`247fe9a`) correctly used `.eq("is_active", true)`.

## Also confirmed live (fixed this session)
DTI risk gate never fired (`247fe9a`) · orders/positions never persisted (`8e3422a`) · GDPR erasure aborted for every user (`6b8e838`) · security audit logging silently failing · `GET /api/profile` erroring on `avatar_url` (`5d28a4b`) · budgets entirely dead — creation errors, reads yield Invalid Date (fix in flight).

## Negative findings — worth having
- **Mobile is clean.** Every non-test `.from()` in `mobile-app` targets `disputes` or `profiles`; both real. Zero phantoms reach mobile.
- **MFA is not bypassed.** The phantom-backed `mfa-service.ts` has zero importers; the live path uses the real `backup_codes`, and fails **closed**.
- **CAN-SPAM unsubscribe works** against real tables.
- **Paper trading fails closed** — the graduation counter never increments, so nobody reaches live trading on unrecorded paper trades.

## Latent risks (dead today, dangerous when wired)
- `payout-service.ts` — 980 lines, real `stripe.transfers.create` with correct idempotency and cents handling, sitting on four absent tables with `getPendingEarnings` returning 0. **Whoever imports it next ships $0 payouts.**
- `trading/lifecycle/demotion-rules.ts` fails **OPEN** on two phantom tables — missing data reads as "no risk veto"/"no recon break", the two triggers that demote a misbehaving strategy from `autonomous_live`. Its sibling `promotion-gates.ts` correctly fails closed.

## Traps for whoever fixes this — each would produce a plausible wrong fix
1. **`try/catch` around a postgrest call is not error handling.** `transaction-categorizer.ts:559` wraps a phantom upsert in `try/catch`, but postgrest-js **resolves** `{error}` rather than throwing — so the catch never fires and the error is discarded with no branch at all. This idiom reads as "handled" in review and isn't. Expect it elsewhere.
2. **`debts` → `debt_accounts` also needs `status` → `is_active`** (see #12). A string-only rename swaps one error code for another.
3. **`savings_goals` → `financial_goals` needs an ALTER, not just a rename** — only 7 of 17 mapped columns exist; `createGoal` inserts `category` and `start_date`, which are absent.
4. **`bill_negotiations` is NOT the real `negotiations` table.** `negotiations` is collection-agency debt settlement (`collection_agency`, `settlement_percentage`); bill-rate negotiation state actually lives on `recurring_bills.negotiation_status`. Repointing it would silently corrupt two features.
5. **`credit_builder_actions`: remove the `|| 8` fabrication BEFORE creating the table.** A legitimately empty `[]` is falsy, so the invented numbers survive the migration.
6. **Barrel-only exports defeat path-based dead-code greps.** `commerce/`, `gamification/`, `goals/services/`, `trading/lifecycle/`, `financial/` all re-export dead modules; `src/lib/financial/index.ts` has zero importers.

## Method caveats — stated, not buried
- **`pctt_positions` reachability is UNKNOWN**: constructors live in a separate Fly.io app (`fynvita-autonomous-trading`). If deployed, real positions are lost on restart; if not, LOW. Not resolvable from this repo.
- **Barrel-only exports defeat path-based dead-code greps.** One agent's first reachability pass was wrong for this reason and it self-corrected. `commerce/`, `gamification/`, `goals/services/`, `trading/lifecycle/` all re-export dead modules.
- **Phantom-column coverage is a floor, not a ceiling.** The `select("*")` + `row.field` pattern (which hid `tax_profiles`' ~27 phantom reads) needs real static analysis; a snake_case heuristic misattributed ~50% in spot checks and its 41 "suspects" are deliberately not quoted as findings.
- **Commerce triage is static analysis + schema diff**, not runtime reproduction — the lead independently verified the $0-commission chain end to end.
- **All four slices are now included.** Remaining incompleteness is the phantom-COLUMN axis (above), not the table axis.

## Recommended order
0. **Delete fabricated user-facing copy first** — the `|| 8` credit-builder numbers and the "Great job being debt-free!" message. These actively mislead users and are a one-line change each; they should not wait behind schema work.
1. `credit_profiles` → `latest_credit_scores`, `portfolio_holdings` → `investment_holdings`, `debts` → `debt_accounts` (+ `status`→`is_active`) — **pure renames, real data already exists**, closes 3 CRITICALs cheaply.
2. `affiliate_partners` + `commission_rules` — stop recording $0 commissions; decide whether historical `revenue_events` zeros need backfill (**owner decision, money**).
3. `plaid_items` / `plaid_accounts` — restores bank linking and net worth.
4. Fail-closed sweep: `credit_builder_actions` (remove the `|| 8` fabrication *first* — it survives the migration), `bureau_disputes`, `credit_alerts`.
5. Neutralise latent risks: delete or schema-back `payout-service.ts`; invert the `demotion-rules.ts` guards.
6. Structural: land the real `types.ts` **together with** removing the untyped-client carve-out — separately, either gives false confidence.

## Two coordination/architecture findings from the build phase (2026-07-31)

### A. The erasure cascade is a concurrency hazard — serialise it
`delete_user_data_cascade` is redefined **wholesale** via `CREATE OR REPLACE` with a **hardcoded `v_tables` array**; it is NOT additive. Each migration that registers a table reproduces the entire array. With multiple builders adding tables concurrently, **whichever migration file sorts last silently drops the others' tables** from GDPR Art. 17 erasure.

This was predicted, then **observed**: a builder's erasure migration (`000008`) landed covering its own tables but not the Plaid tables still in flight. It was reverted (`9ba9c5d`) and the step serialised to a single consolidated migration owned by the lead.

**Guard status — measured, and the nuance matters.** `gdpr-erasure-cascade.test.ts` DOES assert array contents (127 expected entries: "original 28 preserved", seed deltas, full deltas, plus excluded tables asserted absent). So the array is not unguarded. But **newly added tables are only guarded once someone adds them to the test's expected list** — `transactions` is there; `orders`/`positions` were not. The unguarded set is precisely the newest additions, i.e. exactly those at risk in a race. **Any table added to the cascade must also be added to the test's expected list.**

### B. `getSupabase()` (anon key, no JWT) cannot read RLS-protected tables — but it fails LOUD
`src/lib/supabase/client.ts` builds its client with `NEXT_PUBLIC_SUPABASE_ANON_KEY` and forwards no user session, so `auth.uid()` is NULL.

A hypothesis was raised that this would yield **silent empty results** on every RLS-protected read — which would be the same defect class as the phantom tables. **Tested against the live stack, that is wrong:**
```
GET /rest/v1/transactions  (anon key, no user JWT)
-> 42501 "permission denied for table transactions"
```
The `anon` role holds no GRANT on these tables, so PostgREST fails **closed and loudly** — the opposite of silent-empty. The correct clients already exist in `src/lib/supabase/server.ts` (`createServerClient` forwards the session; a separate service-role client throws if its key is absent).

**Implication:** services must not use `getSupabase()` for server-side reads of RLS-protected tables — not because data is silently lost, but because the call will error. Recorded as an architecture note, NOT as a data-integrity defect.
