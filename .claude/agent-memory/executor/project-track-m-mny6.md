---
name: project-track-m-mny6
description: MNY-6 done (commit bb3d0c6); Cents branded type, FND-029 integer-cents commission fix, ESLint money-field guard
metadata:
  type: project
---

MNY-6 shipped at commit `bb3d0c6` on `remediation/wave-7-foundation`.

**What was built:**

1. `src/lib/money/index.ts` — `Cents` branded integer type (`number & { readonly __brand: "Cents" }`), plus four constructors/accessors: `cents(n)` (requires integer, throws otherwise), `fromDollars(d)` (rounds to nearest cent), `toDollars(c)`, `toStripeAmount(c)` (returns raw integer for Stripe).

2. `src/lib/money/__tests__/money.test.ts` — 12 unit tests. Covers happy paths, non-integer throw, half-up rounding ($10.015→1002), round-trip, zero, and type-level branding.

3. **FND-029 fix** in `commission-calculator.ts` `getCommissionReport`: replaced three `float +=` accumulators (`pendingCommission`, `confirmedCommission`, `paidCommission`) with integer-cents accumulators (`pendingCents` etc.). Each `conv.commission_earned` is converted with `fromDollars()` before summing; `toDollars()` applied once at the return boundary. Public return shape (dollar values) is unchanged. Drift test: 1000 × $0.07 now yields exactly `70`, not `69.99999999999966`.

4. **Track-M boundary application** (scoped — not repo-wide):
   - `payout-service.ts`: all 4 `Math.round(netAmount * 100)` → `toStripeAmount(fromDollars(payout.netAmount))`
   - `revenue-tracker.ts`: `Math.round(commissionAmount * 100)` → `fromDollars(fullEvent.commissionAmount)`
   - `commission-calculator.ts` `processStripePayout`: `Math.round(amount * 100)` → `toStripeAmount(fromDollars(amount))`

5. `eslint-rules/no-raw-number-on-money-fields.js` — custom ESLint rule wired into `.eslintrc.json` as `"warn"`. Fires on `TSPropertySignature` (type annotations) and `Property` (object literal numeric values) where key matches `/amount|price|payout|commission/i`. Excludes `__tests__/`, `.test.`, `.spec.`, `/src/lib/money/`. Confirmed firing on legacy fields (e.g., `price_basic`, `targetAmount`, `settlementAmount`) as warnings, not errors.

**Why:** Hard constraint — rule must be `warn` not `error` because legacy codebase has many untyped money fields; escalating would break the build on untouched code.

**How to apply:** When adding new money fields anywhere in the codebase, use `Cents` from `@/lib/money`. The ESLint rule will catch regressions at PR time as warnings — when the migration is complete, escalate to `error`.

**Verification:** 15,910 tests pass, 0 failures, 19 skipped (env-dependent). Type-check 0 errors. Lint 0 blocking errors.
