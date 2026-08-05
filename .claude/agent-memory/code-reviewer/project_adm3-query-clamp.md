---
name: adm3-query-clamp
description: ADM-3 limit/page clamp + role-gate verification for admin/audit and admin/subscriptions (FND-055/049/050)
metadata:
  type: project
---

b9779b9 approved. `clampLimit`/`clampPage` use explicit `Number.isNaN` guard before `Math.min/max`, so `NaN` cannot reach `.range()`. `MAX_LIMIT=100` is named. `audit` GET+POST and `subscriptions` DELETE are all `withRole("admin")`-wrapped. `logs/route.ts` has no limit/page parse (ADM-2 left it query-free). `affiliate/revenue/route.ts` has a pre-existing NaN gap in its own parseInt/Math.max pattern — `Number.parseInt('abc' || '30')` returns NaN which propagates through Math.max → NaN reaches the service layer; that route is out of scope for ADM-3 (LOW, pre-existing).

**Why:** FND-055 unbounded query / OOM; FND-049/050 unguarded admin endpoints.
**How to apply:** affiliate/revenue NaN gap should be tagged for a follow-on fix.
