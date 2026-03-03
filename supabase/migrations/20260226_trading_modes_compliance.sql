-- Migration: Trading Modes, Compliance, Agents, Strategies
-- Date: 2026-02-26
-- Description: Adds operating mode management, 30-Law compliance scoring,
--              AI agent logging, strategy library, mode transitions, and
--              circuit breaker events for the PCTT trading system upgrade.
-- Depends on: 20260117_add_trading_tables.sql (existing trading tables)

-- ============================================================================
-- TRADING ACCOUNTS TABLE (Operating Mode + Graduation Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Operating Mode: WATCH (observe only) -> GUIDED (suggestions) -> AUTONOMOUS (auto-execute)
  operating_mode VARCHAR(20) NOT NULL DEFAULT 'watch'
    CHECK (operating_mode IN ('watch', 'guided', 'autonomous')),

  -- WATCH -> GUIDED graduation tracking
  watch_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  watch_paper_trade_count INTEGER NOT NULL DEFAULT 0,
  watch_paper_days_active INTEGER NOT NULL DEFAULT 0,
  watch_paper_profitable BOOLEAN NOT NULL DEFAULT false,
  watch_graduation_date TIMESTAMPTZ,

  -- GUIDED -> AUTONOMOUS graduation tracking
  guided_start_date TIMESTAMPTZ,
  guided_live_trade_count INTEGER NOT NULL DEFAULT 0,
  guided_live_days_active INTEGER NOT NULL DEFAULT 0,
  guided_live_profitable BOOLEAN NOT NULL DEFAULT false,
  guided_graduation_date TIMESTAMPTZ,

  -- Per-strategy performance tracking (JSONB map: strategy_id -> metrics)
  strategy_performance JSONB NOT NULL DEFAULT '{}',

  -- Autonomous safety limits
  max_daily_trades INTEGER NOT NULL DEFAULT 10,
  max_position_value DECIMAL(20, 2) NOT NULL DEFAULT 10000.00,
  max_daily_loss_pct DECIMAL(5, 2) NOT NULL DEFAULT 2.00,
  autonomous_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Account status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_trading_accounts_user_id ON trading_accounts(user_id);
CREATE INDEX idx_trading_accounts_mode ON trading_accounts(operating_mode);

-- ============================================================================
-- COMPLIANCE SCORES TABLE (30-Law Engine per Signal)
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES trading_signals_v2(id) ON DELETE SET NULL,

  -- Composite score (0-100, higher = more compliant)
  composite_score DECIMAL(5, 2) NOT NULL,

  -- Per-law breakdown (JSONB: { "law_id": { "score": 0-100, "applicable": true, "weight": 1.0, "details": "..." } })
  law_scores JSONB NOT NULL DEFAULT '{}',

  -- Applicable laws count (not all 30 apply to every signal)
  applicable_laws INTEGER NOT NULL DEFAULT 0,
  passing_laws INTEGER NOT NULL DEFAULT 0,
  failing_laws INTEGER NOT NULL DEFAULT 0,

  -- Violation tracking
  violations JSONB NOT NULL DEFAULT '[]',
  has_critical_violation BOOLEAN NOT NULL DEFAULT false,

  -- Context
  symbol VARCHAR(20),
  signal_type VARCHAR(50),
  operating_mode VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_scores_user_id ON compliance_scores(user_id);
CREATE INDEX idx_compliance_scores_signal_id ON compliance_scores(signal_id);
CREATE INDEX idx_compliance_scores_composite ON compliance_scores(composite_score);
CREATE INDEX idx_compliance_scores_created ON compliance_scores(created_at DESC);

-- ============================================================================
-- TRADING AGENT LOGS TABLE (AI Agent Decision Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trading_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES trading_signals_v2(id) ON DELETE SET NULL,

  -- Agent identification
  agent_type VARCHAR(50) NOT NULL
    CHECK (agent_type IN (
      'sentiment', 'regime_confirmation', 'news_impact',
      'signal_explainer', 'risk_narrative', 'earnings_analysis',
      'consensus_arbiter'
    )),

  -- Decision output
  decision JSONB NOT NULL,
  confidence DECIMAL(5, 4) NOT NULL DEFAULT 0,

  -- Model info
  provider VARCHAR(50) NOT NULL DEFAULT 'aiml',
  model VARCHAR(100) NOT NULL,
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  fallback_chain JSONB,

  -- Performance
  latency_ms INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- Validation
  validation_passed BOOLEAN NOT NULL DEFAULT true,
  validation_errors JSONB,

  -- Context
  symbol VARCHAR(20),
  operating_mode VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_logs_user_id ON trading_agent_logs(user_id);
CREATE INDEX idx_agent_logs_signal_id ON trading_agent_logs(signal_id);
CREATE INDEX idx_agent_logs_agent_type ON trading_agent_logs(agent_type);
CREATE INDEX idx_agent_logs_created ON trading_agent_logs(created_at DESC);
CREATE INDEX idx_agent_logs_provider ON trading_agent_logs(provider);

-- ============================================================================
-- STRATEGY LIBRARY TABLE (Pre-built + Custom Strategies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS strategy_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Strategy identity
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL
    CHECK (category IN (
      'momentum', 'mean_reversion', 'breakout', 'trend_following',
      'volatility', 'multi_factor', 'income', 'defensive', 'custom'
    )),

  -- Strategy configuration (matches rule-based-engine JSONB schema)
  config JSONB NOT NULL,

  -- Risk parameters
  risk_params JSONB NOT NULL DEFAULT '{}',

  -- Backtest performance
  backtest_results JSONB,
  degradation_factor DECIMAL(5, 4) NOT NULL DEFAULT 0.7000,

  -- Visibility
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Usage stats
  usage_count INTEGER NOT NULL DEFAULT 0,
  avg_rating DECIMAL(3, 2),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(slug)
);

CREATE INDEX idx_strategy_library_user_id ON strategy_library(user_id);
CREATE INDEX idx_strategy_library_category ON strategy_library(category);
CREATE INDEX idx_strategy_library_system ON strategy_library(is_system);
CREATE INDEX idx_strategy_library_public ON strategy_library(is_public, is_active);

-- ============================================================================
-- MODE TRANSITIONS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mode_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,

  -- Transition details
  from_mode VARCHAR(20) NOT NULL
    CHECK (from_mode IN ('watch', 'guided', 'autonomous')),
  to_mode VARCHAR(20) NOT NULL
    CHECK (to_mode IN ('watch', 'guided', 'autonomous')),

  -- Graduation metrics snapshot at time of transition
  metrics_snapshot JSONB NOT NULL DEFAULT '{}',

  -- Whether this was an upgrade or downgrade
  direction VARCHAR(10) NOT NULL
    CHECK (direction IN ('upgrade', 'downgrade')),

  -- Reason for transition
  reason TEXT,

  -- Who/what initiated it
  initiated_by VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (initiated_by IN ('user', 'system', 'admin')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mode_transitions_user_id ON mode_transitions(user_id);
CREATE INDEX idx_mode_transitions_account ON mode_transitions(trading_account_id);
CREATE INDEX idx_mode_transitions_created ON mode_transitions(created_at DESC);

-- ============================================================================
-- CIRCUIT BREAKER EVENTS TABLE (Risk Event Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS circuit_breaker_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Breaker identification
  breaker_type VARCHAR(50) NOT NULL
    CHECK (breaker_type IN (
      'daily_loss', 'position_concentration', 'correlation',
      'sector_exposure', 'drawdown', 'api_failure',
      'model_degradation', 'market_hours', 'kill_switch'
    )),

  -- Event details
  severity VARCHAR(20) NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
  trigger_value DECIMAL(20, 8),
  threshold_value DECIMAL(20, 8),
  action_taken VARCHAR(50) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',

  -- Resolution
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Context
  symbol VARCHAR(20),
  operating_mode VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circuit_breaker_user_id ON circuit_breaker_events(user_id);
CREATE INDEX idx_circuit_breaker_type ON circuit_breaker_events(breaker_type);
CREATE INDEX idx_circuit_breaker_severity ON circuit_breaker_events(severity);
CREATE INDEX idx_circuit_breaker_unresolved ON circuit_breaker_events(user_id, resolved)
  WHERE resolved = false;
CREATE INDEX idx_circuit_breaker_created ON circuit_breaker_events(created_at DESC);

-- ============================================================================
-- ALTER EXISTING TABLES (Add new columns)
-- ============================================================================

-- Add strategy and compliance columns to trade_history
ALTER TABLE trade_history
  ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES strategy_library(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compliance_score DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS operating_mode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS agent_consensus JSONB;

CREATE INDEX IF NOT EXISTS idx_trade_history_strategy ON trade_history(strategy_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_mode ON trade_history(operating_mode);

-- Add agent and compliance columns to trading_signals_v2
ALTER TABLE trading_signals_v2
  ADD COLUMN IF NOT EXISTS compliance_score DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS operating_mode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS agent_votes JSONB;

CREATE INDEX IF NOT EXISTS idx_signals_v2_mode ON trading_signals_v2(operating_mode);

-- ============================================================================
-- TRIGGERS (Auto-update updated_at)
-- ============================================================================

-- Reuse existing update_updated_at_column() function from 20260117_add_trading_tables.sql

CREATE TRIGGER update_trading_accounts_updated_at
  BEFORE UPDATE ON trading_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategy_library_updated_at
  BEFORE UPDATE ON strategy_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_events ENABLE ROW LEVEL SECURITY;

-- Trading accounts: users can only access their own
CREATE POLICY trading_accounts_user_policy ON trading_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Compliance scores: users can only access their own
CREATE POLICY compliance_scores_user_policy ON compliance_scores
  FOR ALL USING (auth.uid() = user_id);

-- Agent logs: users can only access their own
CREATE POLICY agent_logs_user_policy ON trading_agent_logs
  FOR ALL USING (auth.uid() = user_id);

-- Strategy library: users see their own + system + public strategies
CREATE POLICY strategy_library_read_policy ON strategy_library
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_system = true
    OR (is_public = true AND is_active = true)
  );

CREATE POLICY strategy_library_write_policy ON strategy_library
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY strategy_library_update_policy ON strategy_library
  FOR UPDATE USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY strategy_library_delete_policy ON strategy_library
  FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- Mode transitions: users can only access their own
CREATE POLICY mode_transitions_user_policy ON mode_transitions
  FOR ALL USING (auth.uid() = user_id);

-- Circuit breaker events: users can only access their own
CREATE POLICY circuit_breaker_events_user_policy ON circuit_breaker_events
  FOR ALL USING (auth.uid() = user_id);
