---
name: mny5-commission-trust-boundary
description: MNY-5 (commit f7535c9) — affiliate webhook trust-boundary fix; conversion→purchase cpl-zero risk is a known judgment call, approved
metadata:
  type: project
---

FND-028 fix: `data.commission` is fully excised from route.ts. Commission is now server-recomputed via `await commissionCalculator.calculateCommission(partnerId, conversionTypeMap[eventType], amount)`. Both `calculateCommission` and `trackEvent` are properly `await`ed (the missing-await defect from [[mny2-async-caller-gap]] was fixed in the prior commit `dcccea8` and is intact here).

**Known judgment call — `conversion→purchase` under `cpl` model:**
When `conversionType === "purchase"` and the partner's `commissionType === "cpl"`, `calculateCommission` returns `0` because the `cpl` branch at commission-calculator.ts:104 only fires for `["lead", "signup", "application"]`. This is semantically correct: a CPL model pays for leads, not purchases. A `conversion.completed` event is a completed sale (a `cpa` or `revenue_share` partner event), not a lead. CPL partners should not generate commission on `conversion.completed`. The `purchase` mapping is correct.

**Test integrity:** The changed test swapped `commissionAmount: 25.5` (old inbound pass-through, codifying the FND-028 bug) to `commissionAmount: 12.0` (server-recomputed value). This is a legitimate correction of a bug-encoding test, not a weakening.

**Why:** Reviewed 2026-05-17 on commit f7535c9.

**How to apply:** If any future diff touches conversionTypeMap or adds a new RevenueEventType, re-verify the cpl-branch coverage for the new ConversionType.
