---
name: project-track-m-mny5
description: MNY-5 done (commit f7535c9) — server-side commission recomputation in affiliate webhook (FND-028)
metadata:
  type: project
---

MNY-5 shipped at commit `f7535c9`. Files changed: `src/app/api/affiliate/webhooks/route.ts` and its `__tests__/route.test.ts`.

**Why:** FND-028 — the affiliate webhook was storing `data.commission` verbatim. A malicious/buggy partner could dictate the payout. Fix: ignore inbound commission, recompute server-side via `commissionCalculator.calculateCommission(partnerId, conversionType, amount)`.

**How to apply:** For any future webhook that receives a partner-supplied money value, apply the same pattern: always ignore inbound money fields, recompute from trusted DB-backed inputs server-side.

Key details:
- `RevenueEventType` → `ConversionType` map: `click→"click"`, `application→"application"`, `approval→"approval"`, `conversion→"purchase"`.
- `data.amount` (defaulting to 0 if absent) is the trusted `value` arg; `data.commission` is never read.
- `calculateCommission` returns `0` for an unknown partner — route handles this gracefully (no throw).
- Signature verification (HMAC-SHA256 from WBH-05) was left intact.
- Jest 30 `clearAllMocks()` clears mock implementations; fix by re-applying `mockResolvedValue` in `beforeEach` rather than relying on the factory-set default.

[[project-track-m-mny4]]
