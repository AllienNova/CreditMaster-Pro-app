-- ============================================================================
-- credit_builder_actions + credit_monitoring_settings — missing schema behind
-- two phantom-table reads in the credit/identity cluster
-- (docs/qa/phantom-table-inventory.md, docs/qa/SYSTEMATIC-REVIEW-SYNTHESIS.md).
--
-- Both tables were already being read by live code with no backing migration:
-- CreditBuilderService.getProgress() (src/lib/credit-builder/credit-builder-
-- service.ts, reachable via GET /api/credit-builder/progress) and
-- CreditMonitoringService.getMonitoringSettings/updateMonitoringSettings
-- (src/lib/credit-monitoring/credit-monitoring-service.ts, reachable via
-- GET/PUT /api/credit-monitoring/settings). Every call silently resolved a
-- 42P01 "relation does not exist" error rather than throwing.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- credit_builder_actions
--
-- Backs CreditBuilderService.getProgress() (credit-builder-service.ts:543),
-- which reads only `id, completed` per user to compute actionsCompleted /
-- actionsTotal counts. There is no write path yet anywhere in the codebase —
-- getRecommendedActions()/getDefaultActions() generate an in-memory action
-- catalog (CreditBuilderAction: type, category, title, pointsImpact, ...)
-- that is never persisted. Rather than ship a bare 3-column stub that a
-- future "mark action complete" endpoint would immediately need to ALTER,
-- this mirrors the persist-worthy subset of the CreditBuilderAction type
-- (type, category, title, points_impact) alongside the completion state the
-- current read already depends on (id, completed). Presentation-only fields
-- of that interface (impact, difficulty, timeframe, description, reasoning,
-- aiGenerated) stay out — those are catalog/generation-time detail, not
-- completion-record detail, and inventing persistence for them here would be
-- speculating on an unbuilt feature's design.
--
-- RLS: SELECT + INSERT scoped to auth.uid() = user_id, matching the
-- bureau_disputes precedent (20260731000007) for a table with a read path
-- live today and no write path yet — a user completing their own tracked
-- action is a direct user action. No UPDATE/DELETE policy: nothing in the
-- codebase updates or deletes a row today.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_builder_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type   TEXT NOT NULL,
  category      TEXT NOT NULL,
  title         TEXT NOT NULL,
  points_impact INTEGER,
  completed     BOOLEAN NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_builder_actions_type_check CHECK (
    action_type IN ('quick_win', 'short_term', 'long_term')
  ),
  CONSTRAINT credit_builder_actions_category_check CHECK (
    category IN ('payment', 'utilization', 'age', 'mix', 'inquiry')
  )
);

CREATE INDEX IF NOT EXISTS idx_credit_builder_actions_user_id
  ON credit_builder_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_builder_actions_completed
  ON credit_builder_actions(completed);

ALTER TABLE credit_builder_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credit builder actions" ON credit_builder_actions;
CREATE POLICY "Users can view own credit builder actions" ON credit_builder_actions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own credit builder actions" ON credit_builder_actions;
CREATE POLICY "Users can insert own credit builder actions" ON credit_builder_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_credit_builder_actions_updated_at ON credit_builder_actions;
CREATE TRIGGER update_credit_builder_actions_updated_at
  BEFORE UPDATE ON credit_builder_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- credit_monitoring_settings
--
-- Backs CreditMonitoringService.getMonitoringSettings/updateMonitoringSettings
-- (credit-monitoring-service.ts:261-329). Column shape matches the
-- MonitoringSettings interface exactly: experian_enabled, equifax_enabled,
-- transunion_enabled, alert_preferences (JSONB — the 7-key AlertPreferences
-- object literal already read/written by this file), score_change_threshold.
--
-- user_id is the PRIMARY KEY (one settings row per user), not a separate
-- surrogate id + UNIQUE constraint. This is load-bearing, not stylistic:
-- updateMonitoringSettings() calls `.upsert({ user_id, ... })` with no
-- `onConflict` argument, so postgrest-js resolves conflicts against the
-- table's PRIMARY KEY by default. A surrogate `id` PK would make every
-- "Update Settings" click silently INSERT a new row instead of updating the
-- existing one — the next getMonitoringSettings() call's `.single()` would
-- then error on "multiple (or ambiguous) rows returned" for any user who
-- saved settings more than once. Making user_id the PK makes the upsert's
-- existing (unmodified) call correctly update in place.
--
-- RLS: SELECT + INSERT + UPDATE scoped to auth.uid() = user_id — settings a
-- user reads and writes directly, matching the credit_builder_actions/
-- bureau_disputes pattern above plus UPDATE (the upsert path requires it).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_monitoring_settings (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  experian_enabled       BOOLEAN NOT NULL DEFAULT true,
  equifax_enabled        BOOLEAN NOT NULL DEFAULT true,
  transunion_enabled     BOOLEAN NOT NULL DEFAULT true,
  alert_preferences      JSONB NOT NULL DEFAULT '{
    "scoreChanges": true,
    "newAccounts": true,
    "inquiries": true,
    "addressChanges": true,
    "fraudAlerts": true,
    "emailNotifications": true,
    "smsNotifications": false
  }'::jsonb,
  score_change_threshold INTEGER NOT NULL DEFAULT 10,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE credit_monitoring_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credit monitoring settings" ON credit_monitoring_settings;
CREATE POLICY "Users can view own credit monitoring settings" ON credit_monitoring_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own credit monitoring settings" ON credit_monitoring_settings;
CREATE POLICY "Users can insert own credit monitoring settings" ON credit_monitoring_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credit monitoring settings" ON credit_monitoring_settings;
CREATE POLICY "Users can update own credit monitoring settings" ON credit_monitoring_settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_credit_monitoring_settings_updated_at ON credit_monitoring_settings;
CREATE TRIGGER update_credit_monitoring_settings_updated_at
  BEFORE UPDATE ON credit_monitoring_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
