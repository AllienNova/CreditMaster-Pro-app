---
name: project-track-m-mny4
description: MNY-4 done (commit 2f48f00); Stripe idempotency keys + FND-024 unit sweep pattern
metadata:
  type: project
---

MNY-4 shipped at commit `2f48f00` on branch `remediation/wave-7-foundation`.

**Why:** FND-026 — two Stripe payout codepaths had no `Idempotency-Key`, allowing retried payouts to double-pay. FND-024-class sweep — `queueManualPayout` stored dollars; TrueLayer `createPayout` sent dollars where minor units required.

**How to apply:** Use these patterns for any remaining Stripe transfer/payout calls that need idempotency.

## Collapse-vs-delete determination

Did NOT collapse `processStripePayout` (commission-calculator) into `processStripeConnectPayout` (payout-service). They are private methods in separate classes serving distinct concerns. Collapsing would require cross-module dependency. Minimal fix: add `payoutId` param + idempotencyKey independently to each.

## Idempotency key derivation

| Call site | Key format |
|-----------|-----------|
| `payout-service.ts` `stripe.transfers.create` | `` `transfer-${payout.id}` `` |
| `payout-service.ts` `stripe.payouts.create` (ACH) | `` `payout-${payout.id}` `` |
| `commission-calculator.ts` `stripeClient.transfers.create` | `` `commission-transfer-${payoutId}` `` |

Key always derived from the stable DB row id — never random. Same payout row → same key → Stripe deduplicates on retry.

## TrueLayer unit determination

`truelayer-payments.ts` `PaymentAmount` interface declares `value: number; // In minor units (cents/pence)` and `createPayout` sends `value` directly as `amount_in_minor` — no internal conversion. Passing `payout.netAmount` (dollars) was wrong. Fix: `Math.round(payout.netAmount * 100)`.

## FND-024 sweep changes

- `payout-service.ts` `queueManualPayout`: `amount: payout.netAmount` → `amount: Math.round(payout.netAmount * 100)`
- `payout-service.ts` `processBankPayout` TrueLayer: `value: payout.netAmount` → `value: Math.round(payout.netAmount * 100)`
- MNY-1 rounding test tightened: `amount: Math.round(10.015 * 100)` → `amount: 1002` (literal)

## Test pattern for idempotency options second arg

Pre-existing tests asserting only the first (params) arg needed `, expect.anything()` added as second arg.

New idempotency tests must assert the actual `idempotencyKey` value, not `expect.anything()`:
```typescript
// For transfers.create — use toHaveBeenCalledWith with two arg matchers:
expect(mockStripe.transfers.create).toHaveBeenCalledWith(
  expect.objectContaining({ amount: 5500 }),
  expect.objectContaining({ idempotencyKey: expect.stringContaining(payoutId) }),
);

// For payouts.create — when options also contain env-var fields (undefined in test),
// extract the call args directly rather than using objectContaining:
const options = mockStripe.payouts.create.mock.calls[0][1] as Record<string, unknown>;
expect(options.idempotencyKey).toEqual(expect.stringContaining(payoutId));
expect(Object.keys(options)).toContain("stripeAccount");
```

Why the direct extraction pattern: `expect.anything()` does NOT match `undefined`, so `stripeAccount: expect.anything()` fails when `STRIPE_PLATFORM_ACCOUNT_ID` env var is absent in tests.

## Files changed

- `src/lib/commerce/payouts/payout-service.ts` — idempotencyKey on transfers.create + payouts.create; TrueLayer value minor units; queueManualPayout cents
- `src/lib/commerce/affiliate/commission-calculator.ts` — `processStripePayout` gains `payoutId: string` param; idempotencyKey on transfers.create; call site passes `payout.id`
- `src/lib/commerce/payouts/__tests__/payout-service.test.ts` — new idempotency tests + FND-024 sweep tests; pre-existing single-arg assertions updated; TrueLayer GB test updated to 995000
- `src/lib/commerce/affiliate/__tests__/commission-calculator.test.ts` — new idempotency test; existing "should create payout" test updated to two-arg form

## Verification

- Tests: 15,895 passed, 0 failed, 19 skipped (env-dependent, pre-existing)
- Type-check: 0 errors
