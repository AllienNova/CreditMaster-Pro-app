-- ============================================================================
-- Sprint 2: Safety Controls
-- kill_switch_events, dual_control_requests, incidents, trading_audit_trail
-- ============================================================================

-- ----------------------------------------------------------------------------
-- kill_switch_events
-- Immutable log of every kill switch state transition.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kill_switch_events (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level                      TEXT NOT NULL,
  previous_level             TEXT NOT NULL,
  reason                     TEXT NOT NULL,
  actor_id                   TEXT NOT NULL,
  dual_control_request_id    UUID,
  canonical_package_version  TEXT NOT NULL,
  canonical_hash             TEXT NOT NULL,
  created_at                 TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT kill_switch_level_valid CHECK (
    level IN (
      'INACTIVE',
      'LEVEL_1_PAUSE_NEW',
      'LEVEL_2_CANCEL_WORKING',
      'LEVEL_3_FREEZE',
      'LEVEL_4_FLATTEN'
    )
  ),
  CONSTRAINT kill_switch_previous_level_valid CHECK (
    previous_level IN (
      'INACTIVE',
      'LEVEL_1_PAUSE_NEW',
      'LEVEL_2_CANCEL_WORKING',
      'LEVEL_3_FREEZE',
      'LEVEL_4_FLATTEN'
    )
  )
);

CREATE INDEX IF NOT EXISTS kill_switch_events_created_at_idx
  ON kill_switch_events (created_at DESC);

ALTER TABLE kill_switch_events ENABLE ROW LEVEL SECURITY;

-- Service role (server-side) can read and insert; no client-side mutations
CREATE POLICY "Service role manages kill switch events"
  ON kill_switch_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- Admins and super-admins can read for audit purposes
CREATE POLICY "Admins read kill switch events"
  ON kill_switch_events
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_risk_settings WHERE settings->>'role' IN ('admin', 'super_admin')
    )
  );

-- ----------------------------------------------------------------------------
-- dual_control_requests
-- Pending and resolved dual-control approvals for L3/L4 kill switch transitions.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dual_control_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_level   TEXT NOT NULL,
  requestor_id   TEXT NOT NULL,
  approver_id    TEXT,
  denier_id      TEXT,
  reason         TEXT NOT NULL,
  denial_reason  TEXT,
  status         TEXT NOT NULL DEFAULT 'PENDING',
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at    TIMESTAMPTZ,
  CONSTRAINT dual_control_target_level_valid CHECK (
    target_level IN (
      'LEVEL_1_PAUSE_NEW',
      'LEVEL_2_CANCEL_WORKING',
      'LEVEL_3_FREEZE',
      'LEVEL_4_FLATTEN'
    )
  ),
  CONSTRAINT dual_control_status_valid CHECK (
    status IN ('PENDING', 'APPROVED', 'DENIED')
  ),
  -- P0-10: Approver must differ from requestor (enforced at app layer too)
  CONSTRAINT dual_control_approver_differs CHECK (
    approver_id IS NULL OR approver_id != requestor_id
  ),
  CONSTRAINT dual_control_denier_differs CHECK (
    denier_id IS NULL OR denier_id != requestor_id
  )
);

CREATE INDEX IF NOT EXISTS dual_control_requests_status_idx
  ON dual_control_requests (status)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS dual_control_requests_created_at_idx
  ON dual_control_requests (created_at DESC);

ALTER TABLE dual_control_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages dual control requests"
  ON dual_control_requests
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins read dual control requests"
  ON dual_control_requests
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_risk_settings WHERE settings->>'role' IN ('admin', 'super_admin')
    )
  );

-- ----------------------------------------------------------------------------
-- incidents
-- Canonical incident records keyed by INC_* / SIG_* codes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                       TEXT NOT NULL,
  category                   TEXT NOT NULL,
  severity                   TEXT NOT NULL,
  default_action             TEXT NOT NULL,
  auto_recoverable           BOOLEAN NOT NULL DEFAULT false,
  status                     TEXT NOT NULL DEFAULT 'OPEN',
  raised_by                  TEXT NOT NULL,
  resolved_by                TEXT,
  resolution_note            TEXT,
  details                    JSONB NOT NULL DEFAULT '{}',
  canonical_package_version  TEXT NOT NULL,
  canonical_hash             TEXT NOT NULL,
  raised_at                  TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at                TIMESTAMPTZ,
  CONSTRAINT incidents_severity_valid CHECK (
    severity IN ('SEV1', 'SEV2', 'SEV3', 'SEV4')
  ),
  CONSTRAINT incidents_status_valid CHECK (
    status IN ('OPEN', 'RESOLVED', 'SUPPRESSED')
  ),
  CONSTRAINT incidents_category_valid CHECK (
    category IN (
      'DATA', 'COMPLIANCE', 'EXECUTION', 'RISK',
      'OPS', 'SEC', 'TENANCY', 'CALENDAR', 'SUPERVISORY'
    )
  )
);

CREATE INDEX IF NOT EXISTS incidents_status_idx
  ON incidents (status)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS incidents_code_status_idx
  ON incidents (code, status);

CREATE INDEX IF NOT EXISTS incidents_severity_idx
  ON incidents (severity, raised_at DESC);

CREATE INDEX IF NOT EXISTS incidents_raised_at_idx
  ON incidents (raised_at DESC);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages incidents"
  ON incidents
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins read incidents"
  ON incidents
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_risk_settings WHERE settings->>'role' IN ('admin', 'super_admin')
    )
  );

-- ----------------------------------------------------------------------------
-- trading_audit_trail
-- Immutable append-only record of all significant runtime decisions.
-- Every row carries canonical_hash for policy version traceability.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trading_audit_trail (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor                      TEXT NOT NULL,
  action                     TEXT NOT NULL,
  resource_type              TEXT NOT NULL,
  resource_id                UUID,
  reason                     TEXT NOT NULL,
  success                    BOOLEAN NOT NULL,
  details                    JSONB NOT NULL DEFAULT '{}',
  canonical_package_version  TEXT NOT NULL DEFAULT '',
  canonical_hash             TEXT NOT NULL DEFAULT '',
  created_at                 TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT audit_resource_type_valid CHECK (
    resource_type IN (
      'kill_switch', 'dual_control', 'incident', 'order',
      'position', 'risk_rule', 'mode_transition', 'policy',
      'session', 'system'
    )
  )
);

-- Audit trail is append-only — no updates or deletes
CREATE INDEX IF NOT EXISTS trading_audit_trail_created_at_idx
  ON trading_audit_trail (created_at DESC);

CREATE INDEX IF NOT EXISTS trading_audit_trail_actor_idx
  ON trading_audit_trail (actor, created_at DESC);

CREATE INDEX IF NOT EXISTS trading_audit_trail_resource_idx
  ON trading_audit_trail (resource_type, resource_id, created_at DESC)
  WHERE resource_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS trading_audit_trail_action_idx
  ON trading_audit_trail (action, created_at DESC);

ALTER TABLE trading_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages audit trail"
  ON trading_audit_trail
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins read audit trail"
  ON trading_audit_trail
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_risk_settings WHERE settings->>'role' IN ('admin', 'super_admin')
    )
  );

-- ----------------------------------------------------------------------------
-- FK: kill_switch_events → dual_control_requests
-- Added after both tables exist.
-- ----------------------------------------------------------------------------
ALTER TABLE kill_switch_events
  ADD CONSTRAINT kill_switch_events_dual_control_fk
  FOREIGN KEY (dual_control_request_id)
  REFERENCES dual_control_requests(id)
  ON DELETE SET NULL;
