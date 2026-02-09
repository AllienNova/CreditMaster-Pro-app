-- Migration: Add Trading System Tables
-- Date: 2026-01-17
-- Description: Creates tables for the automated trading system

-- ============================================================================
-- TRAILING STOPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trailing_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  position_id VARCHAR(100) NOT NULL,
  side VARCHAR(10) NOT NULL CHECK (side IN ('long', 'short')),
  
  -- Configuration (stored as JSONB)
  config JSONB NOT NULL,
  
  -- Tracking
  entry_price DECIMAL(20, 8) NOT NULL,
  current_stop_price DECIMAL(20, 8) NOT NULL,
  highest_price DECIMAL(20, 8) NOT NULL DEFAULT 0,
  lowest_price DECIMAL(20, 8) NOT NULL DEFAULT 999999999,
  activated BOOLEAN NOT NULL DEFAULT false,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'cancelled')),
  triggered_at TIMESTAMPTZ,
  triggered_price DECIMAL(20, 8),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trailing_stops_user_id ON trailing_stops(user_id);
CREATE INDEX idx_trailing_stops_symbol ON trailing_stops(symbol);
CREATE INDEX idx_trailing_stops_status ON trailing_stops(status);
CREATE INDEX idx_trailing_stops_user_status ON trailing_stops(user_id, status);

-- ============================================================================
-- TRADING RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trading_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Rule configuration (stored as JSONB)
  entry_conditions JSONB NOT NULL DEFAULT '[]',
  exit_conditions JSONB NOT NULL DEFAULT '[]',
  position_sizing JSONB NOT NULL,
  risk_management JSONB NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  execution JSONB NOT NULL DEFAULT '{}',
  
  -- Performance tracking
  performance JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trading_rules_user_id ON trading_rules(user_id);
CREATE INDEX idx_trading_rules_enabled ON trading_rules(user_id, enabled);

-- ============================================================================
-- TRADING SIGNALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trading_signals_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  
  -- Signal details
  signal_type VARCHAR(20) NOT NULL,
  action VARCHAR(20) NOT NULL,
  confidence DECIMAL(5, 4) NOT NULL,
  
  -- Source
  source VARCHAR(50) NOT NULL, -- 'rule_based', 'ml', 'llm', 'fused'
  source_details JSONB,
  
  -- Price targets
  entry_price DECIMAL(20, 8),
  target_price DECIMAL(20, 8),
  stop_loss DECIMAL(20, 8),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  execution_price DECIMAL(20, 8),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_trading_signals_v2_user_id ON trading_signals_v2(user_id);
CREATE INDEX idx_trading_signals_v2_symbol ON trading_signals_v2(symbol);
CREATE INDEX idx_trading_signals_v2_status ON trading_signals_v2(status);

-- ============================================================================
-- BROKER CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS broker_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker VARCHAR(50) NOT NULL, -- 'alpaca', 'interactive_brokers', 'schwab'
  
  -- Credentials (encrypted)
  credentials_encrypted BYTEA NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  paper_trading BOOLEAN NOT NULL DEFAULT true,
  
  -- Account info cache
  account_id VARCHAR(100),
  last_sync_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, broker)
);

CREATE INDEX idx_broker_connections_user_id ON broker_connections(user_id);

-- ============================================================================
-- TRADE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_connection_id UUID REFERENCES broker_connections(id),
  
  -- Order details
  broker_order_id VARCHAR(100),
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  
  -- Execution
  status VARCHAR(20) NOT NULL,
  filled_quantity DECIMAL(20, 8),
  filled_price DECIMAL(20, 8),
  
  -- Source
  signal_id UUID REFERENCES trading_signals_v2(id),
  rule_id UUID REFERENCES trading_rules(id),
  
  -- P&L
  realized_pnl DECIMAL(20, 8),
  commission DECIMAL(20, 8),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_trade_history_user_id ON trade_history(user_id);
CREATE INDEX idx_trade_history_symbol ON trade_history(symbol);
CREATE INDEX idx_trade_history_status ON trade_history(status);

-- ============================================================================
-- RISK RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Rules configuration
  max_daily_loss DECIMAL(5, 2) NOT NULL DEFAULT 2.0,
  max_position_size DECIMAL(5, 2) NOT NULL DEFAULT 10.0,
  max_correlated_exposure DECIMAL(5, 2) NOT NULL DEFAULT 30.0,
  max_sector_exposure DECIMAL(5, 2) NOT NULL DEFAULT 25.0,
  min_cash_reserve DECIMAL(5, 2) NOT NULL DEFAULT 10.0,
  max_open_positions INTEGER NOT NULL DEFAULT 20,
  max_drawdown DECIMAL(5, 2) NOT NULL DEFAULT 15.0,
  
  -- Trading restrictions
  trading_hours_only BOOLEAN NOT NULL DEFAULT true,
  no_trades_before_earnings INTEGER DEFAULT 2, -- days
  no_trades_around_fomc BOOLEAN NOT NULL DEFAULT true,
  
  -- Consensus requirements
  min_signal_consensus DECIMAL(5, 2) NOT NULL DEFAULT 0.6,
  min_confidence DECIMAL(5, 2) NOT NULL DEFAULT 0.5,
  
  -- Kill switch status
  kill_switch_active BOOLEAN NOT NULL DEFAULT false,
  kill_switch_reason TEXT,
  kill_switch_triggered_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_risk_rules_user_id ON risk_rules(user_id);

-- ============================================================================
-- ML MODELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for system models
  
  -- Model info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  model_type VARCHAR(50) NOT NULL, -- 'classification', 'regression'
  architecture VARCHAR(50) NOT NULL, -- 'random_forest', 'lstm', etc.
  
  -- Configuration
  config JSONB NOT NULL,
  feature_names JSONB NOT NULL,
  
  -- Performance metrics
  evaluation JSONB,
  
  -- Model storage
  model_path TEXT, -- S3 or local path
  version VARCHAR(20) NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'training',
  
  -- Timestamps
  trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ml_models_user_id ON ml_models(user_id);
CREATE INDEX idx_ml_models_status ON ml_models(status);

-- ============================================================================
-- BACKTEST RESULTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Strategy info
  strategy_name VARCHAR(255) NOT NULL,
  strategy_config JSONB NOT NULL,
  
  -- Parameters
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_capital DECIMAL(20, 2) NOT NULL,
  symbols JSONB NOT NULL,
  
  -- Results
  total_return DECIMAL(10, 4),
  annualized_return DECIMAL(10, 4),
  sharpe_ratio DECIMAL(10, 4),
  sortino_ratio DECIMAL(10, 4),
  max_drawdown DECIMAL(10, 4),
  win_rate DECIMAL(5, 4),
  profit_factor DECIMAL(10, 4),
  total_trades INTEGER,
  
  -- Detailed data
  equity_curve JSONB,
  trades JSONB,
  monthly_returns JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backtest_results_user_id ON backtest_results(user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trailing_stops_updated_at
  BEFORE UPDATE ON trailing_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_rules_updated_at
  BEFORE UPDATE ON trading_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broker_connections_updated_at
  BEFORE UPDATE ON broker_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_rules_updated_at
  BEFORE UPDATE ON risk_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
