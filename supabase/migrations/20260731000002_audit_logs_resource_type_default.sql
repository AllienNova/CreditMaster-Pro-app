-- ============================================================================
-- P0: GDPR Art. 17 erasure is completely non-functional.
--
-- `delete_user_data_cascade` aborts on its OWN FIRST STATEMENT, for every user:
--
--     ERROR: null value in column "resource_type" of relation "audit_logs"
--            violates not-null constraint
--
-- Reproduced live against the local DB with all migrations applied:
--     select delete_user_data_cascade('...'::uuid, 'test');
--
-- `audit_logs.resource_type` is NOT NULL with NO DEFAULT (declared in
-- `002_production_enhancements.sql`). The erasure RPC's two audit writes
-- (`gdpr_erasure_started` / `gdpr_erasure_completed`) insert only
-- (user_id, action, details, created_at) — no resource_type. The whole function
-- is one implicit transaction, so the first insert aborts the entire erasure and
-- NOTHING is deleted. Every right-to-erasure request has been failing.
--
-- WHY A DEFAULT RATHER THAN REWRITING THE FUNCTION:
--   The same omission exists in EVERY historical revision of this RPC
--   (20260401000000, 20260518000002, 20260519000000, 20260731000001) and in any
--   future caller that forgets the column. Rewriting one 300-line function fixes
--   one caller and leaves the trap armed for the next. A column default fixes
--   all of them at once.
--
-- THIS DOES NOT WEAKEN THE CONSTRAINT. `NOT NULL` remains in force — a caller
-- still cannot store NULL. A DEFAULT only supplies a value when the column is
-- OMITTED. An audit row honestly recorded as 'unspecified' is strictly better
-- than the compliance function failing shut and deleting nothing.
--
-- Callers that CAN name the resource still must: `admin/audit/route.ts` supplies
-- 'admin_action', and `audit-logger.ts` maps targetType -> resource_type
-- (both fixed separately). This default is the floor, not a licence to omit.
-- ============================================================================

ALTER TABLE audit_logs
  ALTER COLUMN resource_type SET DEFAULT 'unspecified';

COMMENT ON COLUMN audit_logs.resource_type IS
  'What the action acted on. NOT NULL; defaults to ''unspecified'' so a caller '
  'that omits it degrades to a less-precise audit row instead of aborting its '
  'entire transaction (this once broke GDPR Art. 17 erasure outright). Callers '
  'that know the resource MUST supply it.';
