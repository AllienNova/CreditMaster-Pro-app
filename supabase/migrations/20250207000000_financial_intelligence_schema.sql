-- CPFI - Financial Intelligence Schema
-- Migration: 20250207000000_financial_intelligence_schema
-- Description: Creates tables for Financial Context Engine, Health Score, Investments, and Chat

-- ============================================================================
-- FINANCIAL GOALS TABLE (Enhanced)
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('emergency_fund', 'debt_payoff', 'savings', 'investment', 'retirement', 'home_purchase', 'education', 'custom')) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) DEFAULT 0,
  target_date DATE,
  auto_save_enabled BOOLEAN DEFAULT FALSE,
  auto_save_amount DECIMAL(15, 2),
  auto_save_frequency TEXT CHECK (auto_save_frequency IN ('weekly', 'biweekly', 'monthly')),
  linked_account_id TEXT,
  priority INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL HEALTH SCORES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100) NOT NULL,
  savings_score INTEGER CHECK (savings_score >= 0 AND savings_score <= 100),
  debt_score INTEGER CHECK (debt_score >= 0 AND debt_score <= 100),
  spending_score INTEGER CHECK (spending_score >= 0 AND spending_score <= 100),
  credit_score_component INTEGER CHECK (credit_score_component >= 0 AND credit_score_component <= 100),
  insurance_score INTEGER CHECK (insurance_score >= 0 AND insurance_score <= 100),
  breakdown JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, calculated_at::date)
);

-- ============================================================================
-- FINANCIAL INSIGHTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('spending_alert', 'savings_opportunity', 'bill_reduction', 'debt_advice', 'investment_tip', 'budget_warning', 'goal_milestone', 'general')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical', 'success')) DEFAULT 'info',
  action_type TEXT,
  action_data JSONB,
  read BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RECURRING BILLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')) NOT NULL,
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  linked_account_id TEXT,
  auto_detected BOOLEAN DEFAULT FALSE,
  negotiation_status TEXT CHECK (negotiation_status IN ('not_started', 'in_progress', 'completed', 'declined')),
  negotiation_savings DECIMAL(15, 2),
  last_paid_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'paused', 'cancelled')) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BUDGETS TABLE (Enhanced)
-- ============================================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  spent DECIMAL(15, 2) DEFAULT 0,
  period TEXT CHECK (period IN ('weekly', 'biweekly', 'monthly', 'yearly')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rollover_enabled BOOLEAN DEFAULT FALSE,
  rollover_amount DECIMAL(15, 2) DEFAULT 0,
  alert_threshold INTEGER DEFAULT 80,
  status TEXT CHECK (status IN ('active', 'completed', 'overbudget')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVESTMENT PORTFOLIOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS investment_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  portfolio_type TEXT CHECK (portfolio_type IN ('manual', 'linked', 'simulated')) DEFAULT 'manual',
  linked_account_id TEXT,
  total_value DECIMAL(15, 2) DEFAULT 0,
  total_cost_basis DECIMAL(15, 2) DEFAULT 0,
  total_gain_loss DECIMAL(15, 2) DEFAULT 0,
  total_gain_loss_percent DECIMAL(10, 4) DEFAULT 0,
  risk_level TEXT CHECK (risk_level IN ('conservative', 'moderate', 'aggressive')),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVESTMENT HOLDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS investment_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES investment_portfolios(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT CHECK (asset_type IN ('stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'cash', 'other')) NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  average_cost DECIMAL(15, 4) NOT NULL,
  current_price DECIMAL(15, 4),
  current_value DECIMAL(15, 2),
  gain_loss DECIMAL(15, 2),
  gain_loss_percent DECIMAL(10, 4),
  sector TEXT,
  last_price_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVESTMENT TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES investment_portfolios(id) ON DELETE CASCADE NOT NULL,
  holding_id UUID REFERENCES investment_holdings(id) ON DELETE SET NULL,
  transaction_type TEXT CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'split', 'transfer_in', 'transfer_out')) NOT NULL,
  symbol TEXT NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(15, 4) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  fees DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  transaction_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRADING SIGNALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  asset_type TEXT CHECK (asset_type IN ('stock', 'etf', 'crypto')) NOT NULL,
  signal_type TEXT CHECK (signal_type IN ('buy', 'sell', 'hold')) NOT NULL,
  strength TEXT CHECK (strength IN ('strong', 'moderate', 'weak')) NOT NULL,
  confidence DECIMAL(5, 2) CHECK (confidence >= 0 AND confidence <= 100),
  analysis_type TEXT CHECK (analysis_type IN ('technical', 'fundamental', 'sentiment', 'ai_combined')) NOT NULL,
  analysis_data JSONB DEFAULT '{}',
  target_price DECIMAL(15, 4),
  stop_loss DECIMAL(15, 4),
  time_horizon TEXT CHECK (time_horizon IN ('short_term', 'medium_term', 'long_term')),
  outcome TEXT CHECK (outcome IN ('pending', 'success', 'failure', 'expired')),
  outcome_price DECIMAL(15, 4),
  outcome_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL CHAT SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  context JSONB DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL CHAT MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES financial_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  intent TEXT,
  action_taken JSONB,
  tokens_used INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Financial Goals
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status);
CREATE INDEX IF NOT EXISTS idx_financial_goals_type ON financial_goals(type);

-- Financial Health Scores
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_user_id ON financial_health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_calculated_at ON financial_health_scores(calculated_at DESC);

-- Financial Insights
CREATE INDEX IF NOT EXISTS idx_financial_insights_user_id ON financial_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_insights_type ON financial_insights(type);
CREATE INDEX IF NOT EXISTS idx_financial_insights_read ON financial_insights(read);
CREATE INDEX IF NOT EXISTS idx_financial_insights_created_at ON financial_insights(created_at DESC);

-- Recurring Bills
CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_id ON recurring_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_status ON recurring_bills(status);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_next_due ON recurring_bills(next_due_at);

-- Budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);

-- Investment Portfolios
CREATE INDEX IF NOT EXISTS idx_investment_portfolios_user_id ON investment_portfolios(user_id);

-- Investment Holdings
CREATE INDEX IF NOT EXISTS idx_investment_holdings_portfolio_id ON investment_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_symbol ON investment_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_asset_type ON investment_holdings(asset_type);

-- Investment Transactions
CREATE INDEX IF NOT EXISTS idx_investment_transactions_portfolio_id ON investment_transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_symbol ON investment_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(transaction_date DESC);

-- Trading Signals
CREATE INDEX IF NOT EXISTS idx_trading_signals_user_id ON trading_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol ON trading_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_signals_created_at ON trading_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_outcome ON trading_signals(outcome);

-- Financial Chat Sessions
CREATE INDEX IF NOT EXISTS idx_financial_chat_sessions_user_id ON financial_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_chat_sessions_status ON financial_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_financial_chat_sessions_updated_at ON financial_chat_sessions(updated_at DESC);

-- Financial Chat Messages
CREATE INDEX IF NOT EXISTS idx_financial_chat_messages_session_id ON financial_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_financial_chat_messages_created_at ON financial_chat_messages(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_chat_messages ENABLE ROW LEVEL SECURITY;

-- Financial Goals Policies
CREATE POLICY "Users can view their own financial goals"
  ON financial_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own financial goals"
  ON financial_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial goals"
  ON financial_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial goals"
  ON financial_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Financial Health Scores Policies
CREATE POLICY "Users can view their own health scores"
  ON financial_health_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health scores"
  ON financial_health_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Financial Insights Policies
CREATE POLICY "Users can view their own insights"
  ON financial_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own insights"
  ON financial_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
  ON financial_insights FOR UPDATE
  USING (auth.uid() = user_id);

-- Recurring Bills Policies
CREATE POLICY "Users can view their own recurring bills"
  ON recurring_bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring bills"
  ON recurring_bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring bills"
  ON recurring_bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring bills"
  ON recurring_bills FOR DELETE
  USING (auth.uid() = user_id);

-- Budgets Policies
CREATE POLICY "Users can view their own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Investment Portfolios Policies
CREATE POLICY "Users can view their own portfolios"
  ON investment_portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios"
  ON investment_portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
  ON investment_portfolios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
  ON investment_portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- Investment Holdings Policies (through portfolio ownership)
CREATE POLICY "Users can view holdings in their portfolios"
  ON investment_holdings FOR SELECT
  USING (portfolio_id IN (SELECT id FROM investment_portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create holdings in their portfolios"
  ON investment_holdings FOR INSERT
  WITH CHECK (portfolio_id IN (SELECT id FROM investment_portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update holdings in their portfolios"
  ON investment_holdings FOR UPDATE
  USING (portfolio_id IN (SELECT id FROM investment_portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete holdings in their portfolios"
  ON investment_holdings FOR DELETE
  USING (portfolio_id IN (SELECT id FROM investment_portfolios WHERE user_id = auth.uid()));

-- Investment Transactions Policies (through portfolio ownership)
CREATE POLICY "Users can view transactions in their portfolios"
  ON investment_transactions FOR SELECT
  USING (portfolio_id IN (SELECT id FROM investment_portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create transactions in their portfolios"
  ON investment_transactions FOR INSERT
  WITH CHECK (portfolio_id IN (SELECT id FROM investment_portfolios WHERE user_id = auth.uid()));

-- Trading Signals Policies
CREATE POLICY "Users can view their own trading signals"
  ON trading_signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading signals"
  ON trading_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading signals"
  ON trading_signals FOR UPDATE
  USING (auth.uid() = user_id);

-- Financial Chat Sessions Policies
CREATE POLICY "Users can view their own chat sessions"
  ON financial_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
  ON financial_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON financial_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
  ON financial_chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Financial Chat Messages Policies (through session ownership)
CREATE POLICY "Users can view messages in their sessions"
  ON financial_chat_messages FOR SELECT
  USING (session_id IN (SELECT id FROM financial_chat_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can create messages in their sessions"
  ON financial_chat_messages FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM financial_chat_sessions WHERE user_id = auth.uid()));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_financial_goals_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_bills_updated_at
  BEFORE UPDATE ON recurring_bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_portfolios_updated_at
  BEFORE UPDATE ON investment_portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_holdings_updated_at
  BEFORE UPDATE ON investment_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_chat_sessions_updated_at
  BEFORE UPDATE ON financial_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

