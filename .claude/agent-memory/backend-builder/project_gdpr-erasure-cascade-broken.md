---
name: gdpr-erasure-cascade-broken
description: delete_user_data_cascade RPC fails end-to-end on its own first statement — GDPR Art. 17 erasure is currently non-functional for every user. Discovered 2026-07-31, not fixed (out of scope for the orders/positions persistence task).
metadata:
  type: project
---

`delete_user_data_cascade` (the GDPR/CCPA right-to-erasure RPC, most recently redefined in `supabase/migrations/20260519000000_erasure_cascade_resilient.sql` and further extended in `supabase/migrations/20260731000001_expand_erasure_cascade_orders_positions.sql`) currently **fails on its own very first statement** for every invocation:

```
ERROR: null value in column "resource_type" of relation "audit_logs" violates not-null constraint
```

The function's opening `INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (NULL, 'gdpr_erasure_started', ...)` never supplies `resource_type`, which is `NOT NULL` with no default in the live `public.audit_logs` schema (authoritative definition: `20260217000000_infrastructure_persistence.sql`). This aborts the whole transaction before the function ever reaches the per-table DELETE loop — meaning no user's erasure request can complete today, for a reason completely unrelated to which tables are or aren't in `v_tables`.

**Why this matters:** GDPR Article 17 erasure is a hard compliance requirement. This is a live P0-class defect, not a nice-to-have follow-up — verified via direct `psql` call to the RPC (`SELECT delete_user_data_cascade('<uuid>'::uuid, 'test');`) against the local stack on 2026-07-31.

**How to apply:** Not fixed as part of the orders/positions persistence task (out of scope — `audit_logs` schema is owned by a different workstream, and the shared `remediation/wave-7-foundation` branch has other agents actively touching compliance-adjacent files). Reported directly to the team lead in the task handoff. Whoever picks up `audit_logs`/compliance work next should treat this as the top item — either give `resource_type` a sane default (e.g., `'user'` or `'gdpr_erasure'`) or have the RPC supply it explicitly on every `INSERT INTO audit_logs` call within the function body (there are two: erasure-started and erasure-completed). Re-verify with a real `psql` call to the RPC, not just a migration-content test — the existing `gdpr-erasure-cascade.test.ts` suite is content-only (parses the migration SQL) and would not have caught this, since the bug is a cross-migration schema/RPC mismatch, not anything wrong with the RPC's own SQL text. See [[feedback-jest-resetmocks-and-postgrest-errors]] for the general "swallowed DB error" pattern this project keeps tripping over.
