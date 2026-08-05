---
name: adm1-dispute-whitelist
description: ADM-1 PATCH field whitelist approved; two enum divergence gaps (status missing "escalated", outcome missing "pending") are MEDIUM pre-existing schema issues
metadata:
  type: project
---

c7a786e approved. Mass-assignment fixed via `buildWhitelistedPayload` (explicit key-by-key pick, not spread-then-delete). `.update(safePayload)` confirmed at route.ts:251. `withRole("admin")` intact. 9/9 tests pass.

**Why:** FND-054/051 — raw `.update(updates)` allowed caller to overwrite `user_id`, `id`, `created_at` etc.

**How to apply:** When reviewing future PATCH routes, verify the payload builder is pick-by-key, not spread-then-delete. Two schema gaps to track for a follow-on task:
- `status` enum in route: 5 values (no "escalated"); credit_repair_schema migration has 6 values (includes "escalated"). Route would reject "escalated" → 400, but DB allows it. MEDIUM.
- `outcome` enum in route: 3 values (no "pending"); credit_repair_schema migration has 4 values (includes "pending"). Route would reject "pending" → 400. MEDIUM.
- 001_initial_schema.sql matches the route (5 status / 3 outcome) so the divergence is between the two migration files, not a new hole introduced by this commit.
- Mock fallback path in PATCH (lines 240-244) bypasses the DB entirely when env vars are absent — not a security gap (whitelist runs before this point) but notable for env-misconfiguration resilience.
- `resolved_at`/`sent_at` accept any string (no ISO 8601 validation). LOW pre-existing.
