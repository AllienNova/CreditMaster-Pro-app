-- INF-001, INF-002, INF-003: Persistence tables for rate limiting, audit logs, and metrics
-- Replaces in-memory storage with Supabase persistence (survives deploys/restarts)

-- ============================================================
-- INF-001: Rate Limiting Persistence
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limit_usage (
  key TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC(12,6) NOT NULL DEFAULT 0,
  tokens BIGINT NOT NULL DEFAULT 0,
  last_request TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_quotas (
  user_id TEXT PRIMARY KEY,
  max_requests INTEGER NOT NULL,
  max_cost NUMERIC(12,6) NOT NULL,
  max_tokens BIGINT NOT NULL,
  reset_period TEXT NOT NULL DEFAULT 'daily',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup expired rate limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits (reset_at);

-- ============================================================
-- INF-002: Audit Log Persistence
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  duration INTEGER,
  cost NUMERIC(12,6),
  tokens INTEGER,
  model TEXT,
  error JSONB,
  severity TEXT,
  action TEXT
);

-- ---------------------------------------------------------------------------
-- Twin-schema reconciliation (M0 / ADR-0001, ADR-0010).
--
-- `002_production_enhancements.sql` already declares `CREATE TABLE IF NOT
-- EXISTS audit_logs` as the SECURITY audit log (id UUID, action,
-- resource_type NOT NULL, old_values/new_values). It sorts first, so the
-- AI/observability-event shape created above is skipped and provisioning
-- aborted on the `event_type` index below.
--
-- ⚠ Per ADR-0010 the correct end state is a SPLIT: `audit_logs` stays the
-- UUID-keyed security log, and AI/observability events move to their own
-- `system_event_logs` table (the two shapes disagree on primary-key type, which
-- cannot be reconciled additively). The ALTERs below only unblock provisioning
-- by widening `audit_logs` to the union of columns; they do NOT implement the
-- split, which requires moving this file's writers and is tracked as M0-1.
-- ---------------------------------------------------------------------------
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS duration NUMERIC;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS cost NUMERIC;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tokens INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS error JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs (level);

-- Partition-friendly index for time-range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_type_time ON audit_logs (event_type, created_at DESC);

-- ============================================================
-- INF-003: Metrics Persistence
-- ============================================================

CREATE TABLE IF NOT EXISTS metrics_data (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tags JSONB,
  metric_type TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metrics_data_name ON metrics_data (name);
CREATE INDEX IF NOT EXISTS idx_metrics_data_recorded_at ON metrics_data (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_data_name_time ON metrics_data (name, recorded_at DESC);

-- ============================================================
-- Cleanup policies (run via pg_cron or Edge Function)
-- ============================================================

-- Rate limits: delete expired entries daily
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', $$DELETE FROM rate_limits WHERE reset_at < NOW()$$);

-- Audit logs: keep 90 days
-- SELECT cron.schedule('cleanup-audit-logs', '0 3 * * *', $$DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'$$);

-- Metrics: keep 30 days of raw data
-- SELECT cron.schedule('cleanup-metrics', '0 4 * * *', $$DELETE FROM metrics_data WHERE recorded_at < NOW() - INTERVAL '30 days'$$);
