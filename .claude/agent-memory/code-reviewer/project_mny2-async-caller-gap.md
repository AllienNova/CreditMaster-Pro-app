---
name: mny2-async-caller-gap
description: MNY-2 (revenue-tracker) made all reader methods async but left two production callers missing await — HIGH correctness defect found in review
metadata:
  type: project
---

`revenueTracker.getReport/getTopProducts/getTopPartners` became `async` in commit `ed53a27` (MNY-2). Two production callers were NOT updated:

- `src/app/api/admin/affiliate/revenue/route.ts:48-50` — calls all three without `await`; `data.metrics.report` is a Promise, not a RevenueReport.
- `src/app/api/affiliate/webhooks/route.ts:103` — `revenueTracker.trackEvent(...)` is called without `await`; insert errors are silently swallowed and a cold-start could fire-and-forget the DB write.

**Why:** The task plan (Step 5) explicitly said to update every call site to `await`, but the implementer only updated the test file and not the two wired production routes.

**How to apply:** When reviewing any sync→async migration, grep all non-test callers before signing off. A type-check pass does NOT catch missing `await` on `Promise<T>` where `T` is a structural match (e.g. `Promise<RevenueReport>` assigned to `unknown` or a `Record<string, unknown>` field).
