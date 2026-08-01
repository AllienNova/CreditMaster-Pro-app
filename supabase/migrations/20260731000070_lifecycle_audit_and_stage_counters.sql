-- Promotion lifecycle: create the missing audit table and the two genuinely
-- missing counter columns.
--
-- TWO DEFECTS, NOT ONE. promotion-manager.ts is broken against the schema in
-- both of the ways this remediation has been chasing:
--
--   1. PHANTOM TABLE  — `lifecycle_audit` exists in no migration. Every
--      transition's audit row is silently discarded (the insert is awaited but
--      its error is never read), so the 6-stage state machine records half its
--      state: strategy_lifecycle gets a row, the audit trail gets nothing.
--
--   2. PHANTOM COLUMNS on a REAL table — this is the axis the inventory has NOT
--      been measuring, and here is a live instance. `strategy_lifecycle` exists,
--      but the code reads and writes four columns it does not have:
--          current_stage      -> real column is `stage`
--          entered_stage_at   -> real column is `dwell_start`
--          promoted_count     -> genuinely missing
--          demoted_count      -> genuinely missing
--      Verified against information_schema; the real table is
--      (id, strategy_id, user_id, stage, dwell_start, gate_scores, promoted_at,
--       demoted_at, demotion_reason, created_at, updated_at).
--
-- WHY THAT SECOND ONE IS A SAFETY BUG, NOT A TYPO. getStrategyStage() does
--     .select("current_stage") ... if (error || !data) return "research";
-- Selecting a nonexistent column always errors, so EVERY strategy reports the
-- lowest stage, unconditionally — the promotion side of the WATCH -> GUIDED ->
-- AUTONOMOUS machine fails OPEN. This is the identical defect class that
-- dc4980e fixed today in the sibling file demotion-rules.ts, which was hardened
-- to fail CLOSED on a query error. Demotion was hardened; promotion was not.
-- The companion commit fixes the code side; this migration gives it real
-- columns to talk to.
--
-- WHY BUILD RATHER THAN DELETE. By pure reachability this module is dead: the
-- barrel @/lib/trading/lifecycle has zero consumers. But two deletions were
-- reversed today for exactly this reason — "no importers" is not the same as
-- "abandoned". The signals here all point the other way: the sibling file in
-- this same module was safety-hardened hours ago (dc4980e), the module carries
-- its own test suite (promotion-lifecycle.test.ts), and WATCH -> GUIDED ->
-- AUTONOMOUS is a documented core capability. Deleting it would also orphan
-- the fail-closed demotion work. Classification: UNBUILT + invested-in, not
-- DEAD.
--
-- COLUMN CHOICE — no twins. The obvious "fix" is to ADD current_stage and
-- entered_stage_at so the code compiles against the DB unchanged. That is
-- rejected: it would leave strategy_lifecycle carrying both `stage` and
-- `current_stage`, which is precisely the twin-column defect this wave exists
-- to eliminate. Instead the CODE moves onto the canonical existing columns, and
-- this migration adds ONLY the two counters that have no existing equivalent.
--
-- user_id IS A KNOWN, DELIBERATE GAP. strategy_lifecycle.user_id already exists
-- and the table is already registered in delete_user_data_cascade, but
-- updateStage(strategyId, ...) has no userId in scope and none of its callers
-- thread one. Rows written today would therefore have a NULL user_id and would
-- NOT be erased by an Art. 17 request. Threading userId through the call chain
-- is a signature change across the module and is NOT done here. It is recorded
-- as a hard PRECONDITION FOR WIRING: this module must not be connected to a
-- route until user_id is supplied on every write. The companion test asserts
-- the gap rather than letting it pass silently.

CREATE TABLE IF NOT EXISTS public.lifecycle_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('promotion', 'demotion')),
  from_stage  TEXT NOT NULL,
  to_stage    TEXT NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serves the natural query: the transition history of one strategy, newest first.
CREATE INDEX IF NOT EXISTS lifecycle_audit_strategy_created_idx
  ON public.lifecycle_audit (strategy_id, created_at DESC);

ALTER TABLE public.lifecycle_audit ENABLE ROW LEVEL SECURITY;

-- Service-role only, matching strategy_lifecycle and the rest of the trading
-- subsystem: this is an operator/audit surface written by the lifecycle engine,
-- never by a client. No anon/authenticated policy is defined, so RLS denies by
-- default even if a table GRANT were ever added by accident.
DROP POLICY IF EXISTS "service role manages lifecycle audit" ON public.lifecycle_audit;
CREATE POLICY "service role manages lifecycle audit"
  ON public.lifecycle_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- service_role needs an explicit table GRANT: CREATE TABLE's default grants omit
-- SELECT/INSERT/UPDATE/DELETE for it on this instance, and rolbypassrls does NOT
-- substitute for a missing grant — they are two independent permission layers.
-- Established by 20260731000005 and 20260731000006 after this exact 42501.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_audit TO service_role;

-- The two counters that have no existing equivalent on strategy_lifecycle.
-- Additive and idempotent; `stage` and `dwell_start` stay canonical.
ALTER TABLE public.strategy_lifecycle
  ADD COLUMN IF NOT EXISTS promoted_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.strategy_lifecycle
  ADD COLUMN IF NOT EXISTS demoted_count  INTEGER NOT NULL DEFAULT 0;

COMMENT ON TABLE public.lifecycle_audit IS
  'Append-only transition trail for the strategy promotion lifecycle. Written only by promotion-manager.ts under the service role.';
COMMENT ON COLUMN public.strategy_lifecycle.promoted_count IS
  'Cumulative promotions. Counter, not a timestamp — distinct from promoted_at.';
COMMENT ON COLUMN public.strategy_lifecycle.demoted_count IS
  'Cumulative demotions. Counter, not a timestamp — distinct from demoted_at.';
