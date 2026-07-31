# Systematic Review — Synthesis

> 2026-07-31. Every claim below is diffed against a **live** Postgres with all 57 migrations applied, not against migration files. Sources: `phantom-table-inventory.md` (mechanical sweep) + `triage-trading.md`, `triage-platform.md`, `triage-commerce.md`. The financial/savings slice was still in triage when this was written — **this synthesis is incomplete by exactly that slice.**

## The finding

**The codebase's relationship to its own database was never verified.** 147 of 248 referenced tables (59%) do not exist. Nothing caught it because:

1. `src/lib/supabase/types.ts` omits the `Relationships` field postgrest-js's `GenericSchema` requires → the `Schema` generic degrades → `.from()` accepted **any string** (proven with two independent minimal repros).
2. `src/lib/supabase/client.ts` is **deliberately untyped**, by its own comment: *"the Database type only covers ~20 tables while the codebase uses 40+"* → its consumers stay invisible to `tsc` even after (1) is fixed.
3. PostgREST **resolves an error object, it does not throw** (verified live: HTTP 404 for a missing table). So a broken query is indistinguishable from an empty result unless the caller checks — and this codebase overwhelmingly does not.

Net effect: **a feature queries a table that was never migrated, the error is swallowed or defaulted, and the feature renders as empty/zero/false while appearing to work.**

## Triage outcome (3 of 4 slices, 109 tables)

| Slice | RENAME | UNBUILT | DEAD | CRITICAL |
|---|---:|---:|---:|---:|
| Trading / investing | 3 | 14 | 18 | 3 |
| Identity / credit / platform | 3 | 7 | 20 | 5 |
| Commerce / growth | 2 | 4 | 38 | 2 |

**~70% is dead code.** The raw 147 substantially overstates user-facing impact — which is why triage mattered before any remediation plan.

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

## Method caveats — stated, not buried
- **`pctt_positions` reachability is UNKNOWN**: constructors live in a separate Fly.io app (`fynvita-autonomous-trading`). If deployed, real positions are lost on restart; if not, LOW. Not resolvable from this repo.
- **Barrel-only exports defeat path-based dead-code greps.** One agent's first reachability pass was wrong for this reason and it self-corrected. `commerce/`, `gamification/`, `goals/services/`, `trading/lifecycle/` all re-export dead modules.
- **Phantom-column coverage is a floor, not a ceiling.** The `select("*")` + `row.field` pattern (which hid `tax_profiles`' ~27 phantom reads) needs real static analysis; a snake_case heuristic misattributed ~50% in spot checks and its 41 "suspects" are deliberately not quoted as findings.
- **Commerce triage is static analysis + schema diff**, not runtime reproduction — the lead independently verified the $0-commission chain end to end.
- **One slice (financial/savings) is missing from this synthesis.**

## Recommended order
1. `credit_profiles` → `latest_credit_scores` and `portfolio_holdings` → `investment_holdings` — **pure renames, real data already exists**, closes 2 CRITICALs cheaply.
2. `affiliate_partners` + `commission_rules` — stop recording $0 commissions; decide whether historical `revenue_events` zeros need backfill (**owner decision, money**).
3. `plaid_items` / `plaid_accounts` — restores bank linking and net worth.
4. Fail-closed sweep: `credit_builder_actions` (remove the `|| 8` fabrication *first* — it survives the migration), `bureau_disputes`, `credit_alerts`.
5. Neutralise latent risks: delete or schema-back `payout-service.ts`; invert the `demotion-rules.ts` guards.
6. Structural: land the real `types.ts` **together with** removing the untyped-client carve-out — separately, either gives false confidence.
