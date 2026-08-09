---
name: mny6-money-cents-type
description: MNY-6 approved (bb3d0c6) — Cents branded type + integer-cents commission accumulation; pre-existing fee-unit bug in calculateFees; fromDollars NaN/Infinity gap; buildReport float accumulation not in scope
metadata:
  type: project
---

MNY-6 (bb3d0c6) approved with no blocking findings.

**Why:** FND-029 fix is correct: `getCommissionReport` now accumulates in integer `pendingCents`/`confirmedCents`/`paidCents` via `fromDollars()`, converts once at return boundary. Drift test (1000 × $0.07) is genuinely falsifiable — float sum gives 69.999...966. `Cents` module is 63 lines, appropriately minimal.

**Key deferred findings to track (not introduced by MNY-6):**

1. `calculateFees` in `payout-service.ts:771-783` — fee values (`50`, `100`, `25`) are in ambiguous units. Comment says "$0.50 flat" but value is `50` subtracted from a dollar-denominated amount, making it effectively $50. Pre-existing, out of MNY-6 scope. `fromDollars(payout.netAmount)` correctly converts whatever dollar value survives, but net is wrong before the call. File a dedicated issue.

2. `fromDollars(NaN/Infinity)` in `src/lib/money/index.ts:43-45` — `Math.round(NaN*100)` returns `NaN`; `cents()` guards with `Number.isInteger` but `fromDollars` does not. LOW risk (DB inputs coalesced to 0 upstream), but the API contract is inconsistent.

3. `buildReport` in `src/lib/affiliate/revenue-tracker.ts:328-365` — float `+=` on `totalRevenue`/`partnerEntry.revenue`/`productEntry.revenue`. Mitigated by `Math.round(...*100)/100` on `totalRevenue` only; per-partner/per-product figures can drift. Out of MNY-6 scope (task targeted `getCommissionReport` specifically).

**How to apply:** When reviewing follow-on money-path work, confirm `calculateFees` fee units are fixed before those call sites are considered clean. The `fromDollars` NaN guard is a good first-issue for a junior contributor.
