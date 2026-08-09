---
name: auth-route-csv-multi-subcase
description: auth-route-inventory.csv proposed_guard can be wrong for multi-sub-case API routes — verify against route source before trusting it
metadata:
  type: project
---

`docs/superpowers/auth-route-inventory.csv` has one `proposed_guard` per route file. This is wrong for routes that branch on a query param (`?type=`) and serve BOTH per-user data (scoped to `user.id`) AND admin-only sub-cases in one handler.

Concrete case: `src/app/api/analytics/route.ts` — CSV row says `withRole(admin)`, but the file serves `type=user/disputes/workflows/ai_usage/financial/dashboard` (per-user, must be reachable by any authenticated non-admin) plus `type=system` (admin-only, already gated by an inline `rbac.hasPermission(user,"admin:analytics")`). Correct guard is `withAuth` + the inline check, NOT `withRole(admin)` — the latter 403s every non-admin before the handler runs.

**Why:** Commit `2072ffc` (AUTH-04) changed this route to `withRole(admin)` purely to make `npm run audit:auth` pass against the CSV. That introduced a silent user-facing regression — no test covered an authenticated non-admin, so 0 test failures did not mean it was safe.

**How to apply:** When `audit:auth` flags an analytics/reports/metrics route as a guard offender, read the route source for `searchParams.get("type")`-style branching before "promoting" the guard. If the file mixes per-user and admin sub-cases, the fix is `withAuth` + inline admin check on the admin branch, and the CSV row is what needs correcting. Suspect siblings: `analytics/reports`, `analytics/timeseries`.
