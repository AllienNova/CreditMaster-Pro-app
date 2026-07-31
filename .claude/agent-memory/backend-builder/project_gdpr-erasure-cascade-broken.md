---
name: gdpr-erasure-cascade-broken
description: delete_user_data_cascade RPC failed end-to-end on its own first statement (audit_logs.resource_type NOT NULL) — discovered 2026-07-31, fixed same day. Kept as a historical record; do not treat as an open defect.
metadata:
  type: project
---

**FIXED as of 2026-07-31 (commit `6b8e838`, referenced in the privacy-routes task handoff).** Originally discovered: `delete_user_data_cascade` failed on its own first statement for every invocation —

```
ERROR: null value in column "resource_type" of relation "audit_logs" violates not-null constraint
```

— because its opening `INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (NULL, 'gdpr_erasure_started', ...)` never supplied `resource_type`, which was `NOT NULL` with no default in the live schema.

**Fix applied:** `supabase/migrations/20260731000002_audit_logs_resource_type_default.sql` gave the column a `DEFAULT 'unspecified'::text` — confirmed live via `\d audit_logs` (2026-07-31, wiring `/api/privacy/*`): `resource_type | text | not null | 'unspecified'::text`. The RPC's two `INSERT INTO audit_logs` calls (erasure-started, erasure-completed) still don't supply the column explicitly (confirmed via `\sf delete_user_data_cascade`), but a `NOT NULL` column with a default cannot violate the constraint on an omitted column — so this is resolved at the schema level, not by editing the RPC body. A companion migration, `20260731000003_fix_erasure_uuid_text_comparison.sql`, also fixed a UUID/TEXT comparison mismatch in the same function. `gdpr-erasure-cascade.test.ts` and `gdpr-ccpa-consent.test.ts` (179 tests) pass against current source.

**Residual, separate concern (not re-verified, not this finding):** the RPC's `gdpr_erasure_started`/`gdpr_erasure_completed` rows are written *inside* the same transaction as the cascade delete, so a genuine mid-transaction failure (a real constraint violation on an existing table, not the schema-drift case the `to_regclass` guard already handles) still rolls those log rows back too — meaning a failed erasure attempt can leave zero durable audit trail from the RPC alone. `/api/privacy/delete`'s route-level `writeAuditLog` calls (added 2026-07-31, outside the RPC's transaction) exist specifically to cover this gap for erasures reached through that route.

**How to apply:** Treat GDPR Art. 17 erasure as functional. If a future erasure failure resembles the original symptom (`resource_type` NOT NULL violation), re-check whether the column default from `20260731000002` is still present before assuming this exact bug regressed. See [[feedback-jest-resetmocks-and-postgrest-errors]] for the general "swallowed DB error" pattern this project keeps tripping over.
