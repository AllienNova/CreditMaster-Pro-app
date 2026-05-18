# Track M — Money Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development — ONE task per subagent, hard stop, two-stage review between tasks. Never batch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the money-handling correctness findings — a Stripe payout that pays 1% of the intended amount, lost affiliate revenue events, a double-pay race, self-referral abuse, and a webhook that trusts a client-supplied commission — and add a `Money` type to prevent the unit-confusion class permanently.

**Architecture:** Cross-cutting fix track over `src/lib/commerce/**` and the affiliate subsystem. Three CRITICAL + two HIGH findings (FND-024..028) plus one preventive task. Recurring patterns: (a) **integer cents, never float dollars** at every money boundary; (b) **atomic Postgres RPC + `UNIQUE` constraint** for read-modify-write money operations — reuse the template from commit `d64e8d5` (atomic RPC + `UNIQUE` + `REVOKE EXECUTE FROM PUBLIC; GRANT TO service_role`); (c) **server is authoritative** — never trust a client/webhook-supplied money value, recompute it.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Stripe SDK, Jest + ts-jest.

---

## Pre-state (verified against HEAD `a8de39b` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + all 6 verticals merged & pushed).
- WBH-01 (`1552760`) established the atomic-RPC + `UNIQUE`-table pattern (`processed_webhook_events`) and the `is/mark_webhook_event_processed` helpers — Track M reuses both the pattern and, where applicable, the webhook-idempotency helper.
- Full web suite green (15,875 passing / 0 failures post-Ancillary).
- **Findings (from `gap_analysis.md` — re-verify each against HEAD before fixing; line numbers may have drifted):**

| Finding | Sev | Site | Task |
|---|---|---|---|
| FND-024 | CRITICAL | `src/lib/commerce/payouts/payout-service.ts` (~:263, ~:340) — a Stripe transfer/`payouts.create` sends `payout.amount` as the cents argument while the value is in dollars → a $100 payout sends $1 (live financial loss) | MNY-1 |
| FND-025 | CRITICAL | `src/lib/affiliate/revenue-tracker.ts` (~:71) — inbound webhook revenue events stored in a process-local array → lost on every serverless cold start | MNY-2 |
| FND-026 | CRITICAL | `src/lib/commerce/affiliate/commission-calculator.ts` (~:370-428) + `payout-service.ts` (~:157-198) — two parallel payout codepaths, neither with a Stripe `Idempotency-Key` → double-pay on retry | MNY-5 |
| FND-027 | HIGH | `src/lib/commerce/affiliate/affiliate-service.ts` (~:291-311) — `applyReferralCode` permits self-referral; the `max_uses` increment is a non-atomic read-modify-write → concurrent users race past the cap | MNY-3, MNY-4 |
| FND-028 | HIGH | `src/app/api/affiliate/webhooks/route.ts` (~:107) — the affiliate webhook stores the inbound `commission` value verbatim with no server-side recalculation | MNY-6 |

- **Surface note:** there appear to be TWO affiliate locations — `src/lib/affiliate/` (FND-025's `revenue-tracker.ts`) and `src/lib/commerce/affiliate/` (FND-026/027's files). The first task to touch the affiliate code must map both and confirm which is canonical / whether one is dead — report before assuming.

## Scope

**In scope:** FND-024/025/026/027/028 + a `Money`/`Cents` branded type (preventive). **Out of scope:** the affiliate *feature* surface beyond these findings; `MOK-01` (admin analytics — Track N); the trading-engine money paths (separate); anything not on the affiliate/payout money path.

---

## File Structure

| File / area | Responsibility | Task |
|---|---|---|
| `src/lib/commerce/payouts/payout-service.ts` | cents conversion at both Stripe call sites; `Idempotency-Key`; one payout codepath | MNY-1, MNY-5 |
| `supabase/migrations/<ts>_revenue_events.sql` | CREATE — `revenue_events` table for affiliate revenue | MNY-2 |
| `src/lib/affiliate/revenue-tracker.ts` | write-through to `revenue_events` instead of an in-memory array | MNY-2 |
| `supabase/migrations/<ts>_increment_referral_use.sql` | CREATE — atomic `increment_referral_use` RPC + `UNIQUE`/cap enforcement | MNY-3 |
| `src/lib/commerce/affiliate/affiliate-service.ts` | atomic referral increment via RPC; self-referral guard | MNY-3, MNY-4 |
| `src/lib/commerce/affiliate/commission-calculator.ts` | collapse the second payout codepath | MNY-5 |
| `src/app/api/affiliate/webhooks/route.ts` | server-side commission recomputation | MNY-6 |
| `src/lib/money/` (new) — `Money`/`Cents` branded type + helpers; an ESLint rule | the preventive type | MNY-7 |
| co-located `__tests__/` | regression tests per task | all |

---

### Task MNY-1: Stripe payout cents conversion (FND-024, CRITICAL)

**Files:** Modify `src/lib/commerce/payouts/payout-service.ts`; test.

A `$100` payout currently sends `$1` — `payout.amount` (dollars) is passed where Stripe expects an integer-cents argument. This is live financial loss.

- [ ] **Step 1: Verify the bug.** Read `payout-service.ts` around the two Stripe call sites (`stripe.transfers.create` ~:263 and `stripe.payouts.create` ~:340 — confirm exact lines). Confirm `payout.amount` is in dollars (trace where it is set). Confirm Stripe's `amount` parameter is integer cents.
- [ ] **Step 2: Write the failing test** — a payout of `amount` dollars `D` results in a Stripe call with `amount: Math.round(D * 100)` cents. Mock the Stripe client; assert the exact integer passed. Cover `$100 → 10000`, a fractional amount (`$12.34 → 1234`), and a rounding edge (`$0.005`-style — confirm `Math.round` is correct, no float drift).
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — at BOTH Stripe call sites, pass `Math.round(payout.amount * 100)` (integer cents). If `payout.amount` is ever already-cents anywhere, do NOT double-convert — trace the value's unit end to end and convert exactly once, at the Stripe boundary. Add a brief comment stating the unit at the boundary.
- [ ] **Step 5: Run — expect PASS.** Full suite (`npx jest --watchman=false`) 0 failures; `npx tsc --noEmit` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-MNY-01 Stripe payout cents conversion (FND-024)`.

---

### Task MNY-2: Persist affiliate revenue events (FND-025, CRITICAL)

**Files:** Create `supabase/migrations/<timestamp>_revenue_events.sql`; modify `src/lib/affiliate/revenue-tracker.ts`; test.

`revenue-tracker.ts` stores inbound webhook revenue events in a process-local array — every serverless cold start loses them.

- [ ] **Step 1: Map the affiliate dirs.** Confirm `src/lib/affiliate/revenue-tracker.ts` vs `src/lib/commerce/affiliate/**` — which is canonical, what imports `revenue-tracker`. Read `revenue-tracker.ts` fully: the event shape, every method (`record`, queries, aggregations).
- [ ] **Step 2: Create the migration** — `revenue_events` table: `id` uuid pk, the columns matching the event shape (source/affiliate, amount in **integer cents**, currency, event type, external ref, `created_at`), an index on whatever the queries filter by, RLS appropriate to how it's read (revenue events are admin/server data — likely service-role-only; scope per the existing pattern). Pick the next free `supabase/migrations/` timestamp.
- [ ] **Step 3: Write the failing test** — `revenueTracker.record(event)` persists to `revenue_events` (a fresh tracker instance reads it back — proving it survives, which an in-memory array cannot); the aggregation/query methods read from the table.
- [ ] **Step 4: Run — expect FAIL.**
- [ ] **Step 5: Fix** — `revenue-tracker.ts` writes through to `revenue_events` and reads from it; delete the in-memory array. Money fields stored as integer cents.
- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors.
- [ ] **Step 7: Commit** — `fix: TASK-MNY-05 persist affiliate revenue events to revenue_events table (FND-025)`.

---

### Task MNY-3: Atomic referral increment + self-referral guard (FND-027, HIGH)

**Files:** Create `supabase/migrations/<timestamp>_increment_referral_use.sql`; modify `src/lib/commerce/affiliate/affiliate-service.ts`; test.

`applyReferralCode` (~:291-311) (a) lets a user apply their own referral code, and (b) increments `uses` via a non-atomic read-modify-write → concurrent applies race past `max_uses`.

- [ ] **Step 1: Verify.** Read `applyReferralCode` — the self-referral path and the read-modify-write increment.
- [ ] **Step 2: Create the atomic RPC migration** — `increment_referral_use(p_code text, p_user_id uuid)`: in a single statement, with a row lock (`SELECT … FOR UPDATE` or an atomic `UPDATE … WHERE uses < max_uses RETURNING`), increment `uses` ONLY if `uses < max_uses` and the code is valid; return a typed result (`{ ok, reason }`) so the caller distinguishes "applied" / "cap reached" / "invalid". Follow the `d64e8d5` template: `REVOKE EXECUTE … FROM PUBLIC; GRANT EXECUTE … TO service_role`. Enforce the self-referral guard IN the RPC too (reject when the code's owner = `p_user_id`) — defense in depth.
- [ ] **Step 3: Write the failing tests** — self-referral (a user's own code) → rejected; a concurrency test — N parallel `applyReferralCode` on a code with `max_uses = 1` → exactly ONE succeeds (the rest get "cap reached"), `uses` ends at 1 not N.
- [ ] **Step 4: Run — expect FAIL.**
- [ ] **Step 5: Fix** — `applyReferralCode` calls `increment_referral_use` (atomic) instead of read-modify-write; add an explicit self-referral guard at the service layer too (fail fast before the RPC). Map the RPC's typed result to the service's response.
- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors.
- [ ] **Step 7: Commit** — `fix: TASK-MNY-02/03 atomic referral increment + self-referral guard (FND-027)`.

---

### Task MNY-4: Idempotency-Key + collapse the payout codepaths (FND-026, CRITICAL)

**Files:** Modify `src/lib/commerce/payouts/payout-service.ts`, `src/lib/commerce/affiliate/commission-calculator.ts`; test.

Two parallel payout codepaths (`commission-calculator.ts:370-428` and `payout-service.ts:157-198`), neither passing a Stripe `Idempotency-Key` → a retried payout double-pays.

- [ ] **Step 1: Map both codepaths.** Read both. Determine which is canonical and what calls each. Decide: collapse the second onto the first (one payout path), or — if they genuinely serve different purposes — make that explicit and ensure BOTH carry idempotency. Report the determination before changing code.
- [ ] **Step 2: Write the failing test** — the same logical payout issued twice (same payout id / same idempotency basis) results in ONE Stripe transfer, not two. Assert the Stripe call carries an `idempotencyKey` derived from a stable payout identifier (NOT a random per-call value).
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — every Stripe transfer/payout call passes `{ idempotencyKey }` where the key is a stable, deterministic function of the payout (e.g. the payout row id). Collapse the duplicate codepath so there is ONE payout-issuing function; the other call site delegates to it. (Stripe deduplicates on the idempotency key for 24h — a stable key per payout is the fix.)
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-MNY-04 Stripe idempotency keys + single payout codepath (FND-026)`.

> Sequencing: MNY-4 depends on MNY-1 (both edit `payout-service.ts`'s Stripe calls — do MNY-1 first so the cents fix is in place when MNY-4 collapses the paths).

---

### Task MNY-5: Server-side commission recalculation in the affiliate webhook (FND-028, HIGH)

**Files:** Modify `src/app/api/affiliate/webhooks/route.ts`; test.

The affiliate webhook (~:107) stores the inbound `commission` value verbatim — a malicious or buggy partner can dictate the payout amount.

- [ ] **Step 1: Verify.** Read the webhook handler — confirm it persists the request-supplied `commission` with no recomputation. Find the canonical commission formula (`commission-calculator.ts`).
- [ ] **Step 2: Write the failing test** — a webhook payload with an inflated `commission` (≠ what the server formula yields for that payload's amount/rate) → the persisted commission is the SERVER-recomputed value, not the inbound one.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — the webhook ignores any inbound `commission` field; it recomputes commission server-side from the trusted inputs (transaction amount × the rate from `commission-calculator.ts` / the affiliate's stored rate) and persists THAT. (The webhook signature verification from AUTH-08/WBH-05 stays — this is about not trusting the *payload body's* money value even on a signed webhook.)
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-MNY-07 server-side commission recalculation in affiliate webhook (FND-028)`.

---

### Task MNY-6: `Money`/`Cents` branded type (preventive)

**Files:** Create `src/lib/money/` (the branded type + helpers); add an ESLint rule; migrate the Track-M-touched money fields to the type.

The unit-confusion class (FND-024) recurs without a type that makes dollars-vs-cents un-mixable.

- [ ] **Step 1: Design the type.** A `Cents` branded integer type (`type Cents = number & { readonly __brand: "Cents" }`), constructors (`cents(n)`, `fromDollars(d) → Cents` doing `Math.round(d*100)`), and accessors (`toDollars`, `toStripeAmount`). `Cents` values are integers only — the constructors enforce it. Keep it small (YAGNI — no currency-arithmetic library).
- [ ] **Step 2: Write tests** for the constructors/accessors — `fromDollars(100)` → `10000`, round-trip, rejects non-integer cents.
- [ ] **Step 3: Apply it at the money boundaries this track touched** — the payout amount and the Stripe-call argument (MNY-1/4), the `revenue_events` amount (MNY-2), the recomputed commission (MNY-5). Do NOT attempt a repo-wide migration of every `amount`/`price` field — scope to the Track-M surface; the ESLint rule (next) flags the rest for later.
- [ ] **Step 4: Add the ESLint rule** — a rule (in the existing `eslint-rules/` dir — see how the project's custom rules are structured) that flags a raw `number` assigned to a field matching `/amount|price|payout|commission/i` at the Track-M files, recommending the `Cents` type. Keep it a *warning* (not an error) repo-wide so it does not break the existing build's 3,193 legacy warnings situation — its value is surfacing the rest of the surface for a future task.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npx tsc --noEmit` 0 errors; `npm run lint` produces no NEW blocking errors.
- [ ] **Step 6: Commit** — `feat: TASK-MNY-06 Money/Cents branded type + amount-field lint rule`.

> Sequencing: MNY-6 LAST — it depends on MNY-1's cents fix being in place and is preventive, not a finding fix.

---

## Track gate (Track M "done" criteria)

- FND-024/025/026/027/028 closed and evidenced.
- Stripe payout/transfer calls pass integer cents (`Math.round(dollars*100)`) AND a stable `idempotencyKey` — proven by tests (the same payout twice → one transfer).
- `revenue_events` table exists; `revenue-tracker` writes through to it; no process-local money array remains (`grep` clean).
- Referral increment is atomic (the concurrency test proves exactly-one-wins at `max_uses=1`); self-referral rejected at both service and RPC layers.
- The affiliate webhook recomputes commission server-side; an inflated inbound `commission` does not reach the DB.
- `Money`/`Cents` type exists and is applied at the Track-M money boundaries.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors.
- `BASE_REF=<track base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines; the new migrations' RPC paths covered.

---

## Notes for the executor

- Money is integer cents at every boundary. A dollars value crossing into Stripe or the DB without `Math.round(d*100)` is a bug. Convert exactly once — trace units end to end, never double-convert.
- Atomic money mutations use a Postgres RPC with a row lock + `UNIQUE`/cap check, `REVOKE FROM PUBLIC; GRANT TO service_role` — the `d64e8d5` template. A read-modify-write on a money/usage counter is a race.
- The server never trusts a client- or webhook-supplied money value — recompute it from trusted inputs, even on a signature-verified webhook (a valid signature proves origin, not that the body's numbers are right).
- Verify table/column names against `supabase/migrations/` + `src/lib/supabase/types.ts` before relying on them — the repo schema is known-incomplete.
- Sequencing: MNY-1 → MNY-2 → MNY-3 → MNY-4 → MNY-5 → MNY-6. MNY-4 depends on MNY-1; MNY-6 last.
- Reviewers are advisory; challenge a review CRITICAL that would force a regression.
