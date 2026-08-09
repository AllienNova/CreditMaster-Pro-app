# Track M — Money Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development — ONE task per subagent, hard stop, two-stage review between tasks. Never batch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the money-handling correctness findings — a Stripe payout that pays 1% of the intended amount, lost affiliate revenue events, a double-pay race, self-referral abuse, a webhook that trusts a client-supplied commission, and float-drift commission aggregation — and add a `Money` type to prevent the unit-confusion class permanently.

**Architecture:** Cross-cutting fix track over `src/lib/commerce/**` and the affiliate subsystem. Three CRITICAL + three HIGH findings (FND-024..029) plus one preventive type. Recurring patterns: (a) **integer cents, never float dollars** at every money boundary; (b) **atomic Postgres RPC + cap check** for read-modify-write money operations — reuse the `d64e8d5` template (atomic RPC + `REVOKE EXECUTE FROM PUBLIC; GRANT TO service_role`); (c) **server is authoritative** — never trust a client/webhook-supplied money value, recompute it.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Stripe SDK, Jest + ts-jest.

---

## Pre-state (verified against HEAD `a8de39b` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + all 6 verticals merged & pushed).
- WBH-01 (`1552760`) established the atomic-RPC + `UNIQUE`-table pattern and the `is/mark_webhook_event_processed` helpers — Track M reuses the pattern.
- Full web suite green (14,967 passing / 0 failures as of the 2026-05-16 re-baseline).

### Findings (verified — file:line confirmed at HEAD)

| Finding | Sev | Site (verified) | Plan task |
|---|---|---|---|
| FND-024 | CRITICAL | `payout-service.ts:263` (`stripe.transfers.create`) + `:340` (`stripe.payouts.create`) — both pass **`payout.netAmount`** (dollars) as Stripe's integer-cents `amount` arg → a $100 payout sends $1 | MNY-1 |
| FND-025 | CRITICAL | `src/lib/affiliate/revenue-tracker.ts` (~:71) — inbound webhook revenue events stored in a process-local array → lost on every serverless cold start | MNY-2 |
| FND-026 | CRITICAL | `payout-service.ts` Stripe call (`processStripeConnectPayout`, ~`:253-275`) + `commission-calculator.ts` Stripe call (`processStripePayout`, ~`:648-665`) — two payout codepaths, neither passing a Stripe `Idempotency-Key` → double-pay on retry | MNY-4 |
| FND-027 | HIGH | `affiliate-service.ts:291-312` — `applyReferralCode` permits self-referral; the `uses_count` increment is a non-atomic read-modify-write → concurrent users race past `max_uses` | MNY-3 |
| FND-028 | HIGH | `src/app/api/affiliate/webhooks/route.ts:108` — the affiliate webhook stores the inbound `data.commission` verbatim, ignores `data.amount`, no server-side recomputation | MNY-5 |
| FND-029 | HIGH | `commission-calculator.ts:213-247` (`getCommissionReport`) — IEEE-754 float `+=` accumulation of commissions → drift across many small commissions | MNY-6 |

### CRITICAL codebase facts the executor must know (verified by grep at HEAD)

1. **`commission-calculator.ts:658` ALREADY converts to cents correctly** — `amount: Math.round(amount * 100)`. It is NOT a bug. **Do not touch it. Do not double-convert it.** The FND-024 bug is ONLY the two `payout-service.ts` sites.
2. **The field passed to Stripe is `payout.netAmount`, not `payout.amount`** — both fields exist on the payout object (`payout-service.ts:99` `netAmount`, `:176` `amount`); only `netAmount` reaches Stripe (`:263`, `:340`). Tests must assert on `netAmount`.
3. **No affiliate tables have migrations.** `grep` across all of `supabase/migrations/` for `referral_codes`, `uses_count`, `affiliate_partners`, `affiliate_conversions`, `affiliate_payouts`, `user_attributions`, `revenue_events` returns ZERO matches. These tables exist only in a live DB, not in schema-of-record. MNY-2 and MNY-3 must each CREATE the table migration they depend on.
4. **The referral counter column is `uses_count`** (not `uses`) — `affiliate-service.ts:301`, `:493`. The cap column is `max_uses`.
5. **Both `commerce/` payout codepaths are unwired dead code** — `payoutService.createPayout` and `commissionCalculator.initiatePayout` are exported via barrel `index.ts` but have NO production callers (only `__tests__/`). The bugs are still real defects in shippable code and must be fixed — but MNY-4's "collapse" is a dedup of dead implementations, NOT a refactor of a live call graph. `revenueTracker` (FND-025) IS wired — the affiliate webhook + admin revenue route call it.

### Surface note — two affiliate locations

`src/lib/affiliate/` holds `revenue-tracker.ts` (FND-025). `src/lib/commerce/affiliate/` holds `commission-calculator.ts` + `affiliate-service.ts` (FND-026/027/029). Both are real; the first task to touch each confirms imports before assuming canonical.

## Scope

**In scope:** FND-024/025/026/027/028/029 + a `Money`/`Cents` branded type. **Out of scope:** the affiliate *feature* surface beyond these findings; migrations for affiliate tables NOT needed by MNY-2/MNY-3 (`affiliate_partners`, `affiliate_conversions`, `affiliate_payouts`, `user_attributions` — flag as a follow-up, do not build); `MOK-01` (Track N); the trading-engine money paths.

---

## File Structure

| File / area | Responsibility | Task |
|---|---|---|
| `src/lib/commerce/payouts/payout-service.ts` | cents conversion at `:263` + `:340`; `Idempotency-Key` | MNY-1, MNY-4 |
| `src/lib/commerce/affiliate/commission-calculator.ts` | `Idempotency-Key` on `processStripePayout`; integer-cents `getCommissionReport` accumulators (FND-029) | MNY-4, MNY-6 |
| `supabase/migrations/<ts>_revenue_events.sql` | CREATE — `revenue_events` table | MNY-2 |
| `src/lib/affiliate/revenue-tracker.ts` | write-through to `revenue_events` instead of in-memory array | MNY-2 |
| `supabase/migrations/<ts>_referral_codes.sql` | CREATE — `referral_codes` table (it has no migration today) | MNY-3 |
| `supabase/migrations/<ts>_increment_referral_use.sql` | CREATE — atomic `increment_referral_use` RPC | MNY-3 |
| `src/lib/commerce/affiliate/affiliate-service.ts` | atomic referral increment via RPC; self-referral guard | MNY-3 |
| `src/app/api/affiliate/webhooks/route.ts` | server-side commission recomputation | MNY-5 |
| `src/lib/money/` (new) | `Money`/`Cents` branded type + helpers | MNY-6 |
| `eslint-rules/` | new rule flagging raw `number` on money fields (template: `no-math-random-in-prod.js`) | MNY-6 |
| co-located `__tests__/` | regression tests per task | all |

---

### Task MNY-1: Stripe payout cents conversion (FND-024, CRITICAL)

**Files:** Modify `src/lib/commerce/payouts/payout-service.ts` (`:263`, `:340`); test.

A `$100` payout currently sends `$1` — `payout.netAmount` (dollars) is passed where Stripe expects integer cents. Live financial loss.

- [ ] **Step 1: Verify.** Read `payout-service.ts` around `:253-275` (`stripe.transfers.create`) and `:326-345` (`stripe.payouts.create`). Confirm both pass `payout.netAmount` and that `netAmount` is dollars (trace from `:178` `netAmount: fees.net`). Confirm Stripe's `amount` parameter is integer cents. **Do NOT touch `commission-calculator.ts:658` — it already does `Math.round(amount * 100)` correctly; MNY-4 handles that file.**
- [ ] **Step 2: Write the failing test** — a payout with `netAmount` dollars `D` results in a Stripe call with `amount: Math.round(D * 100)`. Mock the Stripe client; assert the exact integer at BOTH `payout-service.ts` call sites. Cover `$100 → 10000`, fractional (`$12.34 → 1234`), and a half-cent rounding case.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — at `payout-service.ts:263` and `:340`, pass `Math.round(payout.netAmount * 100)`. Add a one-line comment at each: `// Stripe amount is integer cents; netAmount is dollars`. Convert ONCE, only here.
- [ ] **Step 5: Run — expect PASS.** Full suite (`npm run test`) 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-MNY-01 Stripe payout cents conversion (FND-024)`.

---

### Task MNY-2: Persist affiliate revenue events (FND-025, CRITICAL)

**Files:** Create `supabase/migrations/<timestamp>_revenue_events.sql`; modify `src/lib/affiliate/revenue-tracker.ts`; update `revenue-tracker.test.ts` in lockstep.

`revenue-tracker.ts` stores inbound webhook revenue events in a process-local array — every serverless cold start loses them.

- [ ] **Step 1: Read `revenue-tracker.ts` fully.** Note the `RevenueEvent` shape (`~:23-33`: `eventId`, `userId`, `productId`, `partnerId`, `eventType`, `commissionAmount`, `commissionCurrency`, `timestamp`, `metadata`), every method (`record`, `getReport`, `getTopProducts`, …), and who imports it (the affiliate webhook + admin revenue route).
- [ ] **Step 2: Create the migration** — `revenue_events` table: `id` uuid pk, `event_id` text unique, `user_id` uuid, `product_id` text, `partner_id` text, `event_type` text, `commission_amount_cents` integer (**integer cents**), `commission_currency` text, `metadata` jsonb, `created_at` timestamptz. Index on `(partner_id, created_at)` and `(product_id)`. RLS: server/admin data — service-role-only (no end-user policy), matching the existing service-role-table pattern. Next free `supabase/migrations/` timestamp.
  - **Scope note — `event_id` is NOT idempotency.** `trackEvent` mints `event_id` itself (`rev_${randomUUID()}`); the webhook does not pass a provider-stable id. So `event_id text unique` is just a synthetic key — a redelivered partner webhook mints a fresh id and inserts a SECOND row. Duplicate-delivery dedup is **out of scope for FND-025** (FND-025 is "events lost on cold start", not "events double-counted"). Do not claim this migration adds idempotency. (A follow-up could have the webhook pass MoneyLion's event id — flag it, don't build it.)
  - **`timestamp` maps to `created_at`.** `RevenueEvent.timestamp` is caller-supplied and `getReport`'s `filterByPeriod` keys off it — map `timestamp` → the `created_at` column so date-range reporting keeps working.
- [ ] **Step 3: Write the failing test** — `revenueTracker.record(event)` persists to `revenue_events`; a FRESH tracker instance reads it back via `getReport` (proving cold-start survival, which an in-memory array fails); `getTopProducts` reads from the table.
- [ ] **Step 4: Run — expect FAIL.**
- [ ] **Step 5: Fix** — `revenue-tracker.ts` writes through to `revenue_events` and reads from it; delete the in-memory array.
  - **sync→async is the real test churn (budget for it).** `getReport`, `getTopProducts`, `getTopPartners`, `getConversionFunnel` are currently SYNCHRONOUS (they read the in-memory array). Backed by Supabase they MUST become `async`. `revenue-tracker.test.ts` has ~30 assertions calling them synchronously (`const report = tracker.getReport()`) — every one becomes `const report = await tracker.getReport()`. This is a mechanical sync→async migration of the whole test file; it is expected and correct churn, NOT a weakening of the suite. Update every call site to `await`; do NOT keep any reader synchronous and do NOT delete/skip assertions to dodge the change.
  - **Unit lockstep:** the in-memory tracker holds `commissionAmount` in dollars (fixture `commissionAmount: 50` = $50); the column is `commission_amount_cents`. Convert dollars→cents on write (`Math.round(commissionAmount * 100)`), cents→dollars on read, so the reader methods keep returning dollar values. Existing dollar-total assertions must still pass once `await`-ed; touch an assertion's expected VALUE only if its unit genuinely changed, and document why in the commit (Test Integrity Rule).
- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 7: Commit** — `fix: TASK-MNY-05 persist affiliate revenue events to revenue_events table (FND-025)`.

---

### Task MNY-3: `referral_codes` table + atomic increment + self-referral guard (FND-027, HIGH)

**Files:** Create `supabase/migrations/<ts>_referral_codes.sql` AND `<ts>_increment_referral_use.sql`; modify `src/lib/commerce/affiliate/affiliate-service.ts`; test.

`applyReferralCode` (`:291-312`) reads/writes a `referral_codes` table that **has no migration** — and (a) lets a user apply their own code, (b) increments `uses_count` via a non-atomic read-modify-write → concurrent applies race past `max_uses`.

- [ ] **Step 1: Read `affiliate-service.ts:291-312` + `mapReferralCode` (`~:486-501`).** Derive the `referral_codes` column set from what the service reads/writes/maps. Confirm EXACT column names against the code (`uses_count`, NOT `uses`).
- [ ] **Step 2: Create the `referral_codes` table migration FIRST** — columns derived from `mapReferralCode`: `id` uuid pk, `code` text unique, `user_id` uuid (the code's owner), `partner_id` uuid null, `campaign_id` text null, `uses_count` integer not null default 0, `max_uses` integer, `expires_at` timestamptz null, `is_active` boolean not null default true, `created_at` timestamptz. Match the names the service already uses exactly. RLS per the existing service-role-table pattern. Next free timestamp.
- [ ] **Step 3: Create the atomic RPC migration** — `increment_referral_use(p_code text, p_user_id uuid)` as a **plpgsql function** (a single `UPDATE ... RETURNING` cannot distinguish *why* it matched zero rows — cap vs self-referral vs invalid vs expired all look identical). The function:
  1. `SELECT ... FROM referral_codes WHERE code = p_code FOR UPDATE` (row lock — this is what makes the increment atomic against concurrent callers).
  2. Classify and return a typed status: `invalid` (no row / `is_active` false / `expires_at <= now()`), `self_referral` (`user_id = p_user_id`), `cap_reached` (`max_uses IS NOT NULL AND uses_count >= max_uses`), else `applied`.
  3. Only on `applied`: `UPDATE referral_codes SET uses_count = uses_count + 1 WHERE id = <locked row>`.
  - **`max_uses` is nullable — a null cap means UNLIMITED.** The cap test MUST be `max_uses IS NOT NULL AND uses_count >= max_uses`. Never write `uses_count < max_uses` against a nullable column — `NULL` comparisons yield `NULL`, which would silently reject every uncapped code (the default — most codes have no cap).
  - Follow the `d64e8d5` template: `REVOKE EXECUTE … FROM PUBLIC; GRANT EXECUTE … TO service_role`.
- [ ] **Step 4: Write the failing tests** — (a) self-referral (a user's own code) → `self_referral`/rejected; (b) **null-cap code** (`max_uses` unset) → `applied`, `uses_count` increments (guards against the `NULL`-comparison regression); (c) a concurrency test — N parallel `applyReferralCode` on a code with `max_uses = 1` → exactly ONE succeeds, `uses_count` ends at 1 not N; the rest get `cap_reached`.
- [ ] **Step 5: Run — expect FAIL.**
- [ ] **Step 6: Fix** — `applyReferralCode` calls `increment_referral_use` instead of read-modify-write; map the RPC's typed status (`invalid`/`self_referral`/`cap_reached`/`applied`) to the service response. Add an explicit fast-fail self-referral guard at the service layer too — compare the caller's `userId` against the code owner's `ReferralCode.userId` (from `mapReferralCode`); the service guard and the RPC guard must agree on the rejection signal.
- [ ] **Step 7: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 8: Commit** — `fix: TASK-MNY-02/03 referral_codes migration + atomic increment + self-referral guard (FND-027)`.

> The other affiliate tables (`affiliate_partners`, `affiliate_conversions`, `affiliate_payouts`, `user_attributions`) also lack migrations. Out of scope for Track M — record as a follow-up task, do not build them here.

---

### Task MNY-4: Idempotency-Key + collapse the payout codepaths (FND-026, CRITICAL)

**Files:** Modify `src/lib/commerce/payouts/payout-service.ts`, `src/lib/commerce/affiliate/commission-calculator.ts`; test.

Two payout codepaths — `payout-service.ts` `processStripeConnectPayout` (Stripe call ~`:253-275`) and `commission-calculator.ts` `processStripePayout` (~`:648-665`) — neither passes a Stripe `Idempotency-Key` → a retried payout double-pays.

- [ ] **Step 1: Map both codepaths by FUNCTION NAME** (`processStripeConnectPayout`, `processStripePayout`). Confirm both are exported-but-unwired (no production callers — see Pre-state fact 5). Decide: collapse `processStripePayout` onto `processStripeConnectPayout` so there is ONE payout-issuing function, OR delete the redundant one. Report the determination before changing code. Because both are dead, this is a dead-code dedup, not a live-call-graph refactor — keep scope minimal.
- [ ] **Step 2: Write the failing test** — the same logical payout issued twice (same payout id) results in ONE Stripe transfer. Assert the Stripe call carries `idempotencyKey` derived from a stable payout identifier (NOT a random per-call value).
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — every Stripe transfer/payout call passes `{ idempotencyKey }`, the key a deterministic function of the payout (e.g. the payout row id). Collapse the duplicate codepath per Step 1. **`commission-calculator.ts:658`'s existing `Math.round(amount * 100)` is correct — when collapsing, keep exactly ONE cents conversion; do NOT stack it on top of MNY-1's `payout-service.ts` conversion (a double-conversion would send 100× the payout).**
- [ ] **Step 5: FND-024-class unit sweep in `payout-service.ts`** — while in this file, fix the two same-class dollars-as-minor-units defects the MNY-1 review surfaced:
  - `queueManualPayout` (~:404) stores `payout.netAmount` (dollars) into `manual_payout_queue.amount` — every Stripe path now stores cents, so this is a unit-inconsistent column. Convert to cents on write (`Math.round(payout.netAmount * 100)`) so a future PayPal/check integration reading that queue does not re-introduce FND-024; add a comment naming the unit.
  - TrueLayer `createPayout` (~:306) passes `{ value: payout.netAmount }`. Verify the TrueLayer connector contract (`TrueLayerPaymentsConnector.createPayout`) — TrueLayer's payment API uses integer minor units for GBP/EUR. If so, apply `Math.round(payout.netAmount * 100)` here too; if the connector already converts internally, leave it and note that. Report the determination.
  - Also tighten the MNY-1 rounding test (`payout-service.test.ts` ~:332): replace the tautological `amount: Math.round(10.015 * 100)` assertion with the literal `1002` so it is falsifiable against an alternative rounding strategy.
  - Add/extend tests so every changed line is covered.
- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 7: Commit** — `fix: TASK-MNY-04 Stripe idempotency keys + single payout codepath + FND-024 unit sweep (FND-026)`.

> Sequencing: MNY-4 AFTER MNY-1 (both edit `payout-service.ts`'s Stripe call; MNY-1's cents fix must be in place first).

---

### Task MNY-5: Server-side commission recalculation in the affiliate webhook (FND-028, HIGH)

**Files:** Modify `src/app/api/affiliate/webhooks/route.ts` (~`:108`); test.

The affiliate webhook stores the inbound `data.commission` verbatim and ignores `data.amount` — a malicious or buggy partner dictates the payout amount.

- [ ] **Step 1: Verify.** Read `webhooks/route.ts:101-115` — confirm it persists `data.commission` with no recomputation and that `data.amount` is currently unused. The canonical formula is `commissionCalculator.calculateCommission(partnerId, conversionType, value)`.
- [ ] **Step 2: Write the failing test** — a webhook payload with an inflated `commission` (≠ what `calculateCommission` yields for that payload's `amount` + partner) → the persisted commission is the SERVER-recomputed value.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — the webhook ignores any inbound `commission`; it maps `eventType` → `ConversionType`, calls `calculateCommission(partnerId, conversionType, data.amount)`, and persists THAT. (The webhook signature verification from WBH-05 stays — a valid signature proves origin, not that the body's numbers are right.) Note: `calculateCommission` returns `0` for an unknown/missing partner (`commission-calculator.ts:87`) rather than throwing — the test should cover an unknown-partner payload and assert the recomputed `0`, not an error.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-MNY-07 server-side commission recalculation in affiliate webhook (FND-028)`.

---

### Task MNY-6: `Money`/`Cents` branded type + integer-cents commission aggregation (FND-029, HIGH)

**Files:** Create `src/lib/money/`; modify `commission-calculator.ts` (`getCommissionReport`, `:213-247`); add an ESLint rule; test.

Two parts under one task (both `TASK-MNY-06`): the preventive `Money` type, and FND-029 — `getCommissionReport` accumulates commissions with float `+=` (`pendingCommission += commission` etc., `:222-231`) → drift across many small commissions.

- [ ] **Step 1: Design the type.** A `Cents` branded integer type (`type Cents = number & { readonly __brand: "Cents" }`), constructors (`cents(n)`, `fromDollars(d): Cents` = `Math.round(d*100)`), accessors (`toDollars`, `toStripeAmount`). Integers only. Small — no currency-arithmetic library (YAGNI).
- [ ] **Step 2: Write tests** for the constructors/accessors — `fromDollars(100) → 10000`, round-trip, rejects non-integer cents.
- [ ] **Step 3: Fix FND-029** — write a failing test first: `getCommissionReport` over many small commissions (e.g. 1000 × `$0.07`) returns an exact total with no float drift. Then convert `getCommissionReport`'s accumulators (`pendingCommission`/`confirmedCommission`/`paidCommission`) to integer-cents math — accumulate in `Cents`, convert to dollars once at the return boundary. Run — expect the drift test to pass.
- [ ] **Step 4: Apply `Money` at the Track-M money boundaries** already touched — the payout amount + Stripe argument (MNY-1/4), the `revenue_events` amount (MNY-2), the recomputed commission (MNY-5). Do NOT do a repo-wide migration — scope to the Track-M surface.
- [ ] **Step 5: Add the ESLint rule** — in `eslint-rules/` (template: the existing `no-math-random-in-prod.js`), flag a raw `number` on a field matching `/amount|price|payout|commission/i`, recommending `Cents`. Keep it a **warning**, not an error (the build already carries legacy warnings) — its value is surfacing the rest of the surface for a future task.
- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors; `npm run lint` no NEW blocking errors.
- [ ] **Step 7: Commit** — `feat: TASK-MNY-06 Money/Cents type + integer-cents commission aggregation (FND-029)`.

> Sequencing: MNY-6 LAST — depends on MNY-1/2/4/5 being in place.

---

## Track gate (Track M "done" criteria)

- FND-024/025/026/027/028/029 closed and evidenced.
- Stripe payout/transfer calls pass integer cents (`Math.round(dollars*100)`, exactly once) AND a stable `idempotencyKey` — proven by tests (same payout twice → one transfer).
- `revenue_events` + `referral_codes` tables have migrations; `revenue-tracker` writes through to `revenue_events`; no process-local money array remains (`grep` clean).
- Referral increment is atomic (concurrency test proves exactly-one-wins at `max_uses=1`); self-referral rejected at both service and RPC layers.
- The affiliate webhook recomputes commission server-side; an inflated inbound `commission` does not reach the DB.
- `getCommissionReport` accumulates in integer cents (FND-029 drift test passes).
- `Money`/`Cents` type exists and is applied at the Track-M money boundaries.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors.
- `BASE_REF=<track base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines.

---

## Notes for the executor

- Money is integer cents at every boundary. Convert exactly ONCE — `commission-calculator.ts:658` already converts; do not stack a second conversion on it.
- The Stripe-bound field is `payout.netAmount` (dollars), not `payout.amount`.
- Affiliate tables (`referral_codes`, `revenue_events`, …) have no repo migrations — MNY-2 and MNY-3 each CREATE the table they need; the rest are a flagged follow-up, not Track M scope.
- Both `commerce/` payout codepaths are dead exports — fixes still required, but "collapse" is a dead-code dedup, not a live refactor.
- Atomic money/usage mutations use a Postgres RPC with a cap check in the `WHERE` clause + `REVOKE FROM PUBLIC; GRANT TO service_role` — the `d64e8d5` template.
- The server never trusts a client- or webhook-supplied money value — recompute from trusted inputs even on a signature-verified webhook.
- Verify table/column names against `supabase/migrations/` + the service code before relying on them.
- Sequencing: MNY-1 → MNY-2 → MNY-3 → MNY-4 → MNY-5 → MNY-6. MNY-4 after MNY-1; MNY-6 last.
- Reviewers are advisory; challenge a review CRITICAL that would force a regression.
