---
name: project-track-m-mny1
description: MNY-1 shipped — Stripe payout cents conversion fix + test pattern for payout-service
metadata:
  type: project
---

MNY-1 (FND-024) shipped at commit `0fef77a` on branch `remediation/wave-7-foundation`.

**Why:** `payout-service.ts` passed `payout.netAmount` (dollars) directly as Stripe's `amount` (integer cents) at two sites — `stripe.transfers.create` (:263) and `stripe.payouts.create` (:340). A $100 payout was sending $1.

**Fix:** `Math.round(payout.netAmount * 100)` at both sites with comment `// Stripe amount is integer cents; netAmount is dollars`.

**How to apply:** For MNY-4 (idempotency), `commission-calculator.ts:658` ALREADY converts to cents — do NOT stack another `* 100` on top. The payout-service.ts call sites are already fixed. Only add `idempotencyKey` there.

**Test pattern:** The existing test suite for payout-service mocks Stripe via `jest.mock("stripe")` at the top of the file, before any imports. Tests use helper functions `setupRecipientLookup`, `setupProfileRecipient`, `setupPayoutRecordCreation`, `setupRecipientNotFound`. 5 new cents-conversion tests added (3 for transfers.create, 2 for payouts.create). Also updated the existing `should create a Stripe transfer with correct parameters` test to assert `997500` instead of `9975`.

**Float gotcha:** `Math.round(1.005 * 100)` = 100 in JS (IEEE-754 gives 100.499...). Use values like `10.015` where `10.015 * 100 = 1001.5` exactly, OR assert `Math.round(value * 100)` directly instead of a hardcoded expected.
