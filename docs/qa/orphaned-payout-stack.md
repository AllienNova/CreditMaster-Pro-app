# The Orphaned Payout Stack — an owner decision, not a cleanup task

> 2026-07-31. Every reachability claim below is a `grep` anyone can re-run.
> **Nothing in this document has been deleted or wired. It is a finding.**

## Summary

`src/lib/commerce/payouts/` and `src/lib/commerce/payments/` are **completely
unreachable** from the running application — roughly 1,400 lines of
money-movement code that no route, page, or job can invoke. Seven of the
phantom tables in the inventory belong exclusively to this dead stack.

It is not a cleanup task because the answer is not obviously "delete". This
code is the only implementation of affiliate payouts the project has, and the
feature is on the roadmap. Deleting it and rebuilding later is waste; wiring it
without a decision moves real money. Hence: owner decision.

## The reachability proof

```
# nothing imports the payouts or payments barrels
grep -rE "from ['\"]@/lib/commerce(/payouts|/payments)['\"]" src/   ->  (empty)

# there is no root commerce barrel that could re-export them
ls src/lib/commerce/index.ts                                        ->  absent

# the only importers of payout-service / payment-router are their own barrels
grep -rn "payoutService|PayoutService"  src/ | grep -v payout-service.ts
  -> src/lib/commerce/payouts/index.ts  (re-export only)
grep -rn "paymentRouter|payment-router" src/ | grep -v payment-router.ts
  -> src/lib/commerce/payments/index.ts (re-export only)

# no payout route exists at all
find src/app/api -ipath '*payout*'                                  ->  (empty)
```

A barrel re-export is not usage. The barrels have no consumers, so the chain
terminates: **dead**.

### The near-miss that makes this look alive

`src/app/api/payment/*` routes DO exist and DO work — but they import
`@/lib/payment/stripe-service` (singular `payment`), a **different module**
from `@/lib/commerce/payments` (plural, under `commerce`). Two payment stacks
live in this repo; only `src/lib/payment/` is wired. Anyone grepping for
"payment route exists?" will find the live one and wrongly conclude the
commerce stack is reachable.

### What IS live in `lib/commerce`

Not everything under `commerce` is orphaned. These have real consumers:

| Module | Consumer |
|---|---|
| `affiliate` (`commissionCalculator`) | `src/app/api/affiliate/webhooks/route.ts` |
| `matching/auto-loan-matcher` | `src/app/marketplace/auto-loans/page.tsx` |
| `matching/pre-approval-calculator` | `src/components/marketplace/PreQualModal.tsx` |
| `calculators/dti-calculator`, `calculators/auto-loan-calculator` | marketplace page + PreQualModal |

## The seven phantom tables that belong to the dead stack

| Table | Sites | File |
|---|---:|---|
| `payouts` | 5 | `payouts/payout-service.ts` |
| `payout_schedules` | 3 | `payouts/payout-service.ts` |
| `payout_batches` | 2 | `payouts/payout-service.ts` |
| `manual_payout_queue` | 1 | `payouts/payout-service.ts` |
| `affiliate_conversions` | 5 | `affiliate/commission-calculator.ts`, `payouts/payout-service.ts` |
| `affiliate_payouts` | 1 | `affiliate/commission-calculator.ts` |
| `commission_tiers` | 1 | `affiliate/commission-calculator.ts` |

`payments` was an eighth — it is now **built** (`20260731000020`), because
unlike the rest it had a genuinely live reader (`/api/admin/metrics`). See
below.

### The `commission-calculator` subtlety

`commission-calculator.ts` is a LIVE file (the affiliate webhook calls it), but
the three phantom tables it touches sit in methods with **no callers outside
the file**: `calculateTieredCommission`, `recalculateCommission`,
`getPartnerCommissions`, `getPendingPayout`, `getPayoutHistory`,
`getCommissionTiers`. The one live entry point, `calculateCommission`, reads
only `affiliate_partners` and `commission_rules` — both created in
`20260731000005`.

I initially mis-traced this: `getCommissionTiers` is called from line 150,
which is inside `calculateTieredCommission`, NOT inside `calculateCommission`
at line 82. Reading the code rather than trusting the grep is what caught it.
**So the live affiliate path is sound; the tier logic is dead alongside the
payout rail it was written for.**

Latent bug for whoever activates it: `getCommissionTiers` destructures only
`data` and ignores `error` entirely, returning `[]`. If tiers are ever wired
against a missing/erroring table, every high-volume partner silently gets the
base rate instead of their tier multiplier. Fix that at the same time.

## Why this must not be wired autonomously

1. **`CLAUDE.md` already gates it.** The launch conditions list "FND-026 dual
   payout-rail decision before wiring" as an open, operator-owned condition.
   The decision has not been made.
2. **It sends money.** `processStripeConnectPayout`, `processBankPayout`,
   `processPayPalPayout`, `processCheckPayout` are outbound transfers. Wiring
   them is spending money and touching prod — outside autonomous authority.
3. **The rail has a bad safety record.** Two dollar/cent unit bugs have already
   shipped in exactly this code path — FND-024 (dollars sent into a cents
   field, paying 1% of intent) and B1 (`calculateFees` netting a $50 payout to
   $0). This code should be re-reviewed line by line before it ever runs, not
   switched on because the tables now exist.

**Current risk posture is safe.** Because the stack is unreachable, none of
this can execute today. The danger is purely future: someone wires the barrel,
and it writes to seven tables that do not exist — silently, since PostgREST
resolves an `{error}` rather than throwing.

## The three options

| Option | What it means | Cost | Risk |
|---|---|---|---|
| **A. Build the rail** | Create the 7 tables, add `/api/payouts/*`, wire the barrel, fix `getCommissionTiers`, re-audit every money line | Large. Needs the FND-026 rail decision first | Highest — outbound money |
| **B. Delete the stack** | Remove `payouts/` + `payments/` (~1,400 lines) and the dead commission methods | Small, immediate | Rebuilding later costs more than keeping it |
| **C. Quarantine** *(recommended)* | Keep the code, make it fail LOUDLY: a build-time guard so importing it outside a wired feature flag is an error, plus a header naming FND-026 | Small | Lowest — preserves the work, removes the silent-write trap |

**My recommendation is C.** It is the only option that costs almost nothing
and still closes the actual hazard (a future silent wiring). B destroys the
only payout implementation the project has, over a feature that is genuinely
planned. A cannot start until the owner settles FND-026.

## What was done instead, and why it was different

`payments` got built (migration `20260731000020`, commit `4f552bd`) rather than
quarantined, because it is the one table in this group with a **live reader**:
`/api/admin/metrics` is `withRole`-guarded and reachable, and it was reporting
`$0` revenue unconditionally. That is a recording ledger (money already
received), not a sending rail — no outbound transfer, so no FND-026 gate. The
distinction between *recording* money and *moving* money is what separates the
two decisions.

## Open question for the owner

Pick A, B, or C. If C, I will add the import guard and the header in one small
commit. If B, say so explicitly — it is a deletion of working (if unwired)
money code and I will not do it on inference.
