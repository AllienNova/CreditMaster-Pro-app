-- ============================================================================
-- CPFI Financial Intelligence Suite - Complete Schema Migration
-- Migration: 20251217000001_cpfi_financial_suite_schema
-- Description: Creates all tables for Financial Context Engine, Health Scores,
--              Goals, Insights, Bills, Investments, Trading Signals, and Chat
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE (Required for FK references)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')) DEFAULT 'free',
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT UNIQUE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL GOALS TABLE
-- Tracks user financial goals with auto-save and AI recommendations
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('emergency_fund', 'debt_payoff', 'savings', 'investment', 'retirement', 'home_purchase', 'education', 'vacation', 'custom')) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(15, 2) DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  auto_save_enabled BOOLEAN DEFAULT FALSE,
  auto_save_amount DECIMAL(15, 2) CHECK (auto_save_amount IS NULL OR auto_save_amount > 0),
  auto_save_frequency TEXT CHECK (auto_save_frequency IN ('weekly', 'biweekly', 'monthly')),
  linked_account_id TEXT,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  milestones JSONB DEFAULT '[]',
  ai_recommendations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL HEALTH SCORES TABLE
-- Stores comprehensive financial health assessments with component scores
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
  income_stability_score INTEGER CHECK (income_stability_score >= 0 AND income_stability_score <= 100),
  breakdown JSONB DEFAULT '{}',
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  benchmark_comparison JSONB DEFAULT '{}',
  data_quality_score INTEGER CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL INSIGHTS TABLE
-- AI-generated insights and alerts for users
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN (
    'spending_alert', 'savings_opportunity', 'bill_reduction', 'debt_advice',
    'investment_tip', 'budget_warning', 'goal_milestone', 'income_pattern',
    'unusual_activity', 'account_optimization', 'credit_improvement', 'general'
  )) NOT NULL,
  category TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  impact_amount DECIMAL(15, 2),
  impact_type TEXT CHECK (impact_type IN ('savings', 'cost', 'risk', 'opportunity')),
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical', 'success')) DEFAULT 'info',
  action_type TEXT,
  action_data JSONB,
  source TEXT,
  confidence_score DECIMAL(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  read BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  acted_upon BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RECURRING BILLS TABLE
-- Tracks recurring bills with negotiation and payment status
-- ============================================================================
CREATE TABLE IF NOT EXISTS recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN (
    'utilities', 'rent', 'mortgage', 'insurance', 'subscription',
    'loan', 'credit_card', 'phone', 'internet', 'streaming',
    'gym', 'transportation', 'childcare', 'healthcare', 'other'
  )) NOT NULL,
  provider TEXT,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')) NOT NULL,
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  linked_account_id TEXT,
  auto_detected BOOLEAN DEFAULT FALSE,
  detection_confidence DECIMAL(5, 2) CHECK (detection_confidence >= 0 AND detection_confidence <= 100),
  transaction_pattern JSONB,
  negotiation_status TEXT CHECK (negotiation_status IN ('not_started', 'in_progress', 'completed', 'declined')) DEFAULT 'not_started',
  negotiation_savings DECIMAL(15, 2) DEFAULT 0,
  last_paid_at TIMESTAMPTZ,
  last_paid_amount DECIMAL(15, 2),
  next_due_at TIMESTAMPTZ,
  is_variable BOOLEAN DEFAULT FALSE,
  average_amount DECIMAL(15, 2),
  status TEXT CHECK (status IN ('active', 'paused', 'cancelled')) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BUDGETS TABLE
-- User budget definitions with tracking and alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  spent DECIMAL(15, 2) DEFAULT 0 CHECK (spent >= 0),
  period TEXT CHECK (period IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rollover_enabled BOOLEAN DEFAULT FALSE,
  rollover_amount DECIMAL(15, 2) DEFAULT 0,
  alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
  alert_sent BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('active', 'completed', 'overbudget')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- ============================================================================
-- INVESTMENT PORTFOLIOS TABLE
-- User investment portfolio containers
-- ============================================================================
CREATE TABLE IF NOT EXISTS investment_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  portfolio_type TEXT CHECK (portfolio_type IN ('manual', 'linked', 'simulated', 'paper_trading')) DEFAULT 'manual',
  linked_account_id TEXT,
  total_value DECIMAL(15, 2) DEFAULT 0,
  total_cost_basis DECIMAL(15, 2) DEFAULT 0,
  total_gain_loss DECIMAL(15, 2) DEFAULT 0,
  total_gain_loss_percent DECIMAL(10, 4) DEFAULT 0,
  day_change DECIMAL(15, 2) DEFAULT 0,
  day_change_percent DECIMAL(10, 4) DEFAULT 0,
  risk_level TEXT CHECK (risk_level IN ('conservative', 'moderate', 'aggressive', 'very_aggressive')),
  risk_score INTEGER CHECK (risk_score >= 1 AND risk_score <= 10),
  diversification_score INTEGER CHECK (diversification_score >= 0 AND diversification_score <= 100),
  target_allocation JSONB DEFAULT '{}',
  rebalance_threshold DECIMAL(5, 2) DEFAULT 5.00,
  last_rebalance_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVESTMENT HOLDINGS TABLE
-- Individual holdings within portfolios
-- ============================================================================
CREATE TABLE IF NOT EXISTS investment_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES investment_portfolios(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT CHECK (asset_type IN ('stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'option', 'future', 'cash', 'other')) NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL CHECK (quantity >= 0),
  average_cost DECIMAL(15, 4) NOT NULL CHECK (average_cost >= 0),
  current_price DECIMAL(15, 4),
  current_value DECIMAL(15, 2),
  gain_loss DECIMAL(15, 2),
  gain_loss_percent DECIMAL(10, 4),
  day_change DECIMAL(15, 2),
  day_change_percent DECIMAL(10, 4),
  allocation_percent DECIMAL(5, 2),
  sector TEXT,
  industry TEXT,
  country TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'USD',
  dividend_yield DECIMAL(6, 4),
  annual_dividend DECIMAL(15, 2),
  ex_dividend_date DATE,
  pe_ratio DECIMAL(10, 2),
  market_cap DECIMAL(20, 2),
  ai_analysis JSONB DEFAULT '{}',
  last_price_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVESTMENT TRANSACTIONS TABLE
-- Buy/sell/dividend transactions for holdings
-- ============================================================================
CREATE TABLE IF NOT EXISTS investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES investment_portfolios(id) ON DELETE CASCADE NOT NULL,
  holding_id UUID REFERENCES investment_holdings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'split', 'transfer_in', 'transfer_out', 'fee', 'interest')) NOT NULL,
  symbol TEXT NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(15, 4) NOT NULL CHECK (price >= 0),
  total_amount DECIMAL(15, 2) NOT NULL,
  fees DECIMAL(15, 2) DEFAULT 0 CHECK (fees >= 0),
  realized_gain_loss DECIMAL(15, 2),
  notes TEXT,
  transaction_date TIMESTAMPTZ NOT NULL,
  settlement_date TIMESTAMPTZ,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRADING SIGNALS TABLE
-- AI-generated trading signals and recommendations
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  asset_type TEXT CHECK (asset_type IN ('stock', 'etf', 'crypto', 'forex', 'commodity')) NOT NULL,
  signal_type TEXT CHECK (signal_type IN ('buy', 'sell', 'hold', 'strong_buy', 'strong_sell')) NOT NULL,
  strength TEXT CHECK (strength IN ('strong', 'moderate', 'weak')) NOT NULL,
  confidence DECIMAL(5, 2) CHECK (confidence >= 0 AND confidence <= 100) NOT NULL,
  analysis_type TEXT CHECK (analysis_type IN ('technical', 'fundamental', 'sentiment', 'ai_combined')) NOT NULL,
  analysis_data JSONB DEFAULT '{}',
  technical_indicators JSONB DEFAULT '{}',
  fundamental_metrics JSONB DEFAULT '{}',
  sentiment_score DECIMAL(5, 2),
  target_price DECIMAL(15, 4),
  stop_loss DECIMAL(15, 4),
  take_profit DECIMAL(15, 4),
  risk_reward_ratio DECIMAL(5, 2),
  time_horizon TEXT CHECK (time_horizon IN ('intraday', 'short_term', 'medium_term', 'long_term')),
  reasoning TEXT,
  supporting_factors JSONB DEFAULT '[]',
  outcome TEXT CHECK (outcome IN ('pending', 'success', 'partial', 'failure', 'expired')),
  outcome_price DECIMAL(15, 4),
  outcome_return_percent DECIMAL(10, 4),
  outcome_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL CHAT SESSIONS TABLE
-- Chat sessions for AI financial assistant
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  session_type TEXT CHECK (session_type IN ('general', 'budget', 'goals', 'investment', 'debt', 'tax', 'retirement')) DEFAULT 'general',
  context JSONB DEFAULT '{}',
  financial_snapshot JSONB DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'archived', 'deleted')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL CHAT MESSAGES TABLE
-- Individual messages within chat sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES financial_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
  content TEXT NOT NULL,
  intent TEXT,
  entities JSONB DEFAULT '[]',
  action_taken JSONB,
  action_result JSONB,
  referenced_data JSONB,
  tokens_used INTEGER,
  model_used TEXT,
  latency_ms INTEGER,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Financial Goals
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status);
CREATE INDEX IF NOT EXISTS idx_financial_goals_type ON financial_goals(type);
CREATE INDEX IF NOT EXISTS idx_financial_goals_target_date ON financial_goals(target_date);

-- Financial Health Scores
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_user_id ON financial_health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_calculated_at ON financial_health_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_overall ON financial_health_scores(overall_score);

-- Financial Insights
CREATE INDEX IF NOT EXISTS idx_financial_insights_user_id ON financial_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_insights_type ON financial_insights(type);
CREATE INDEX IF NOT EXISTS idx_financial_insights_read ON financial_insights(read);
CREATE INDEX IF NOT EXISTS idx_financial_insights_severity ON financial_insights(severity);
CREATE INDEX IF NOT EXISTS idx_financial_insights_created_at ON financial_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_insights_unread ON financial_insights(user_id) WHERE NOT read AND NOT dismissed;

-- Recurring Bills
CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_id ON recurring_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_status ON recurring_bills(status);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_category ON recurring_bills(category);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_next_due ON recurring_bills(next_due_at);

-- Budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);

-- Investment Portfolios
CREATE INDEX IF NOT EXISTS idx_investment_portfolios_user_id ON investment_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_portfolios_type ON investment_portfolios(portfolio_type);

-- Investment Holdings
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- Twin-schema reconciliation, consolidated (M0 / ADR-0001).
--
-- Every table below is ALSO declared by
-- `20250207000000_financial_intelligence_schema.sql`, which sorts first — so
-- each `CREATE TABLE IF NOT EXISTS` in this file is skipped and the columns
-- added after that earlier file was written never exist. Indexes, policies and
-- application reads that depend on them then fail (provisioning aborted on
-- `trading_signals.is_active`).
--
-- These ALTERs converge each table to the union of both shapes. They are
-- additive and idempotent: no-ops where this file's CREATE ran, healing path
-- where the earlier twin's did. `NOT NULL` is deliberately stripped — the
-- columns are absent on the winning shape, so existing rows have nothing to
-- backfill from and a NOT NULL would fail on a populated table.
--
-- Includes `financial_goals.milestones`, whose absence silently broke the
-- goal-milestone alert signal (FR-302).
-- ===========================================================================
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS alert_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE financial_chat_sessions ADD COLUMN IF NOT EXISTS financial_snapshot JSONB DEFAULT '{}';
ALTER TABLE financial_chat_sessions ADD COLUMN IF NOT EXISTS session_type TEXT CHECK (session_type IN ('general', 'budget', 'goals', 'investment', 'debt', 'tax', 'retirement')) DEFAULT 'general';
ALTER TABLE financial_chat_sessions ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0;
ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS ai_recommendations JSONB DEFAULT '[]';
ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]';
ALTER TABLE financial_health_scores ADD COLUMN IF NOT EXISTS benchmark_comparison JSONB DEFAULT '{}';
ALTER TABLE financial_health_scores ADD COLUMN IF NOT EXISTS data_quality_score INTEGER CHECK (data_quality_score >= 0 AND data_quality_score <= 100);
ALTER TABLE financial_health_scores ADD COLUMN IF NOT EXISTS income_stability_score INTEGER CHECK (income_stability_score >= 0 AND income_stability_score <= 100);
ALTER TABLE financial_health_scores ADD COLUMN IF NOT EXISTS strengths JSONB DEFAULT '[]';
ALTER TABLE financial_health_scores ADD COLUMN IF NOT EXISTS weaknesses JSONB DEFAULT '[]';
ALTER TABLE financial_insights ADD COLUMN IF NOT EXISTS acted_upon BOOLEAN DEFAULT FALSE;
ALTER TABLE financial_insights ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE financial_insights ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100);
ALTER TABLE financial_insights ADD COLUMN IF NOT EXISTS impact_amount DECIMAL(15, 2);
ALTER TABLE financial_insights ADD COLUMN IF NOT EXISTS impact_type TEXT CHECK (impact_type IN ('savings', 'cost', 'risk', 'opportunity'));
ALTER TABLE financial_insights ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE investment_portfolios ADD COLUMN IF NOT EXISTS day_change DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE investment_portfolios ADD COLUMN IF NOT EXISTS day_change_percent DECIMAL(10, 4) DEFAULT 0;
ALTER TABLE investment_portfolios ADD COLUMN IF NOT EXISTS diversification_score INTEGER CHECK (diversification_score >= 0 AND diversification_score <= 100);
ALTER TABLE investment_portfolios ADD COLUMN IF NOT EXISTS last_rebalance_at TIMESTAMPTZ;
ALTER TABLE investment_portfolios ADD COLUMN IF NOT EXISTS rebalance_threshold DECIMAL(5, 2) DEFAULT 5.00;
ALTER TABLE investment_portfolios ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score >= 1 AND risk_score <= 10);
ALTER TABLE investment_portfolios ADD COLUMN IF NOT EXISTS target_allocation JSONB DEFAULT '{}';
ALTER TABLE recurring_bills ADD COLUMN IF NOT EXISTS average_amount DECIMAL(15, 2);
ALTER TABLE recurring_bills ADD COLUMN IF NOT EXISTS detection_confidence DECIMAL(5, 2) CHECK (detection_confidence >= 0 AND detection_confidence <= 100);
ALTER TABLE recurring_bills ADD COLUMN IF NOT EXISTS is_variable BOOLEAN DEFAULT FALSE;
ALTER TABLE recurring_bills ADD COLUMN IF NOT EXISTS last_paid_amount DECIMAL(15, 2);
ALTER TABLE recurring_bills ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE recurring_bills ADD COLUMN IF NOT EXISTS transaction_pattern JSONB;
ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS fundamental_metrics JSONB DEFAULT '{}';
ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS outcome_return_percent DECIMAL(10, 4);
ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS reasoning TEXT;
ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS risk_reward_ratio DECIMAL(5, 2);
ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(5, 2);
ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS supporting_factors JSONB DEFAULT '[]';
ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS take_profit DECIMAL(15, 4);
ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS technical_indicators JSONB DEFAULT '{}';
ALTER TABLE trading_signals ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE;
-- Twin-schema reconciliation (M0 / ADR-0001).
--
-- `20250207000000_financial_intelligence_schema.sql` also declares
-- `CREATE TABLE IF NOT EXISTS investment_holdings` and sorts first, so the
-- richer CREATE in this file is skipped. Its shape has NO `user_id` (ownership
-- is reachable only by joining `portfolio_id` -> investment_portfolios), so the
-- `user_id` index below aborted provisioning.
--
-- `user_id` is added NULLABLE deliberately: the column is absent on the winning
-- shape, so existing rows have no value to backfill from here and a NOT NULL
-- would fail on a populated table. Direct-ownership filtering must therefore
-- keep using the portfolio join until a backfill lands (M0 follow-up).
-- ---------------------------------------------------------------------------
ALTER TABLE investment_holdings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE investment_holdings ADD COLUMN IF NOT EXISTS day_change DECIMAL(15, 2);
ALTER TABLE investment_holdings ADD COLUMN IF NOT EXISTS day_change_percent DECIMAL(10, 4);
ALTER TABLE investment_holdings ADD COLUMN IF NOT EXISTS allocation_percent DECIMAL(5, 2);
ALTER TABLE investment_holdings ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE investment_holdings ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE investment_holdings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS idx_investment_holdings_portfolio_id ON investment_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_user_id ON investment_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_symbol ON investment_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_asset_type ON investment_holdings(asset_type);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_sector ON investment_holdings(sector);

-- Investment Transactions
-- Twin reconciliation (M0 / ADR-0001): the winning `investment_transactions`
-- shape in 20250207000000_financial_intelligence_schema.sql has no `user_id`
-- (ownership only via portfolio_id), which aborted the index below. Nullable
-- for the same reason as investment_holdings above — no value to backfill here.
ALTER TABLE investment_transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_investment_transactions_portfolio_id ON investment_transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_user_id ON investment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_symbol ON investment_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_type ON investment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(transaction_date DESC);

-- Trading Signals
CREATE INDEX IF NOT EXISTS idx_trading_signals_user_id ON trading_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol ON trading_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_signals_type ON trading_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_trading_signals_outcome ON trading_signals(outcome);
CREATE INDEX IF NOT EXISTS idx_trading_signals_created_at ON trading_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_active ON trading_signals(user_id) WHERE is_active;

-- Financial Chat Sessions
CREATE INDEX IF NOT EXISTS idx_financial_chat_sessions_user_id ON financial_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_chat_sessions_status ON financial_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_financial_chat_sessions_updated_at ON financial_chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_chat_sessions_type ON financial_chat_sessions(session_type);

-- Financial Chat Messages
-- Twin reconciliation (M0 / ADR-0001): the winning `financial_chat_messages`
-- shape in 20250207000000_financial_intelligence_schema.sql has no `user_id`
-- (ownership only via session_id), which aborts the index below. Nullable —
-- no source to backfill from at this point in the chain.
ALTER TABLE financial_chat_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_financial_chat_messages_session_id ON financial_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_financial_chat_messages_user_id ON financial_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_chat_messages_created_at ON financial_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_financial_chat_messages_role ON financial_chat_messages(role);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
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

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FINANCIAL GOALS POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own goals" ON financial_goals;
CREATE POLICY "Users can view own goals" ON financial_goals FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own goals" ON financial_goals;
CREATE POLICY "Users can create own goals" ON financial_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own goals" ON financial_goals;
CREATE POLICY "Users can update own goals" ON financial_goals FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own goals" ON financial_goals;
CREATE POLICY "Users can delete own goals" ON financial_goals FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FINANCIAL HEALTH SCORES POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own health scores" ON financial_health_scores;
CREATE POLICY "Users can view own health scores" ON financial_health_scores FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own health scores" ON financial_health_scores;
CREATE POLICY "Users can create own health scores" ON financial_health_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FINANCIAL INSIGHTS POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own insights" ON financial_insights;
CREATE POLICY "Users can view own insights" ON financial_insights FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own insights" ON financial_insights;
CREATE POLICY "Users can create own insights" ON financial_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own insights" ON financial_insights;
CREATE POLICY "Users can update own insights" ON financial_insights FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- RECURRING BILLS POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own bills" ON recurring_bills;
CREATE POLICY "Users can view own bills" ON recurring_bills FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own bills" ON recurring_bills;
CREATE POLICY "Users can create own bills" ON recurring_bills FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own bills" ON recurring_bills;
CREATE POLICY "Users can update own bills" ON recurring_bills FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own bills" ON recurring_bills;
CREATE POLICY "Users can delete own bills" ON recurring_bills FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- BUDGETS POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
CREATE POLICY "Users can view own budgets" ON budgets FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own budgets" ON budgets;
CREATE POLICY "Users can create own budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
CREATE POLICY "Users can update own budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;
CREATE POLICY "Users can delete own budgets" ON budgets FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- INVESTMENT PORTFOLIOS POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own portfolios" ON investment_portfolios;
CREATE POLICY "Users can view own portfolios" ON investment_portfolios FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own portfolios" ON investment_portfolios;
CREATE POLICY "Users can create own portfolios" ON investment_portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own portfolios" ON investment_portfolios;
CREATE POLICY "Users can update own portfolios" ON investment_portfolios FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own portfolios" ON investment_portfolios;
CREATE POLICY "Users can delete own portfolios" ON investment_portfolios FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- INVESTMENT HOLDINGS POLICIES (through user_id and portfolio ownership)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own holdings" ON investment_holdings;
CREATE POLICY "Users can view own holdings" ON investment_holdings FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own holdings" ON investment_holdings;
CREATE POLICY "Users can create own holdings" ON investment_holdings FOR INSERT
    WITH CHECK (auth.uid() = user_id AND portfolio_id IN (SELECT id FROM investment_portfolios WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own holdings" ON investment_holdings;
CREATE POLICY "Users can update own holdings" ON investment_holdings FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own holdings" ON investment_holdings;
CREATE POLICY "Users can delete own holdings" ON investment_holdings FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- INVESTMENT TRANSACTIONS POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own transactions" ON investment_transactions;
CREATE POLICY "Users can view own transactions" ON investment_transactions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own transactions" ON investment_transactions;
CREATE POLICY "Users can create own transactions" ON investment_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id AND portfolio_id IN (SELECT id FROM investment_portfolios WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TRADING SIGNALS POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own signals" ON trading_signals;
CREATE POLICY "Users can view own signals" ON trading_signals FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own signals" ON trading_signals;
CREATE POLICY "Users can create own signals" ON trading_signals FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own signals" ON trading_signals;
CREATE POLICY "Users can update own signals" ON trading_signals FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FINANCIAL CHAT SESSIONS POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own chat sessions" ON financial_chat_sessions;
CREATE POLICY "Users can view own chat sessions" ON financial_chat_sessions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own chat sessions" ON financial_chat_sessions;
CREATE POLICY "Users can create own chat sessions" ON financial_chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own chat sessions" ON financial_chat_sessions;
CREATE POLICY "Users can update own chat sessions" ON financial_chat_sessions FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own chat sessions" ON financial_chat_sessions;
CREATE POLICY "Users can delete own chat sessions" ON financial_chat_sessions FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FINANCIAL CHAT MESSAGES POLICIES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own chat messages" ON financial_chat_messages;
CREATE POLICY "Users can view own chat messages" ON financial_chat_messages FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own chat messages" ON financial_chat_messages;
CREATE POLICY "Users can create own chat messages" ON financial_chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id AND session_id IN (SELECT id FROM financial_chat_sessions WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own chat messages" ON financial_chat_messages;
CREATE POLICY "Users can update own chat messages" ON financial_chat_messages FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at on all relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_goals_updated_at ON financial_goals;
CREATE TRIGGER update_financial_goals_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_bills_updated_at ON recurring_bills;
CREATE TRIGGER update_recurring_bills_updated_at
  BEFORE UPDATE ON recurring_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_investment_portfolios_updated_at ON investment_portfolios;
CREATE TRIGGER update_investment_portfolios_updated_at
  BEFORE UPDATE ON investment_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_investment_holdings_updated_at ON investment_holdings;
CREATE TRIGGER update_investment_holdings_updated_at
  BEFORE UPDATE ON investment_holdings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_chat_sessions_updated_at ON financial_chat_sessions;
CREATE TRIGGER update_financial_chat_sessions_updated_at
  BEFORE UPDATE ON financial_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update chat session message count
CREATE OR REPLACE FUNCTION public.update_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE financial_chat_sessions
  SET
    message_count = message_count + 1,
    total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_chat_message_created ON financial_chat_messages;
CREATE TRIGGER on_chat_message_created
  AFTER INSERT ON financial_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_session_on_message();

-- Function to calculate goal progress percentage
CREATE OR REPLACE FUNCTION public.calculate_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate progress only if target_amount is greater than 0
  IF NEW.target_amount > 0 THEN
    NEW.metadata = jsonb_set(
      COALESCE(NEW.metadata, '{}'::jsonb),
      '{progress_percent}',
      to_jsonb(ROUND((NEW.current_amount / NEW.target_amount * 100)::numeric, 2))
    );
  END IF;

  -- Auto-complete goal if target reached
  IF NEW.current_amount >= NEW.target_amount AND NEW.status = 'active' THEN
    NEW.status = 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_goal_progress_trigger ON financial_goals;
CREATE TRIGGER calculate_goal_progress_trigger
  BEFORE INSERT OR UPDATE OF current_amount, target_amount ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_goal_progress();

-- ============================================================================
-- VIEWS FOR ANALYTICS AND REPORTING
-- ============================================================================

-- View: Latest health score per user
CREATE OR REPLACE VIEW latest_health_scores AS
SELECT DISTINCT ON (user_id)
  id,
  user_id,
  overall_score,
  savings_score,
  debt_score,
  spending_score,
  credit_score_component,
  insurance_score,
  breakdown,
  recommendations,
  calculated_at
FROM financial_health_scores
ORDER BY user_id, calculated_at DESC;

-- View: Active goals summary
CREATE OR REPLACE VIEW active_goals_summary AS
SELECT
  user_id,
  COUNT(*) as total_goals,
  COUNT(*) FILTER (WHERE status = 'active') as active_goals,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_goals,
  SUM(target_amount) as total_target,
  SUM(current_amount) as total_current,
  ROUND(AVG(current_amount / NULLIF(target_amount, 0) * 100)::numeric, 2) as avg_progress_percent
FROM financial_goals
GROUP BY user_id;

-- View: Unread insights count
CREATE OR REPLACE VIEW unread_insights_count AS
SELECT
  user_id,
  COUNT(*) as total_unread,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'warning') as warning_count,
  COUNT(*) FILTER (WHERE severity = 'info') as info_count
FROM financial_insights
WHERE NOT read AND NOT dismissed
GROUP BY user_id;

-- View: Monthly bills summary
CREATE OR REPLACE VIEW monthly_bills_summary AS
SELECT
  user_id,
  COUNT(*) as total_bills,
  SUM(CASE
    WHEN frequency = 'monthly' THEN amount
    WHEN frequency = 'weekly' THEN amount * 4.33
    WHEN frequency = 'biweekly' THEN amount * 2.17
    WHEN frequency = 'quarterly' THEN amount / 3
    WHEN frequency = 'annually' THEN amount / 12
    ELSE 0
  END) as estimated_monthly_total,
  COUNT(*) FILTER (WHERE auto_detected) as auto_detected_count,
  SUM(negotiation_savings) as total_negotiation_savings
FROM recurring_bills
WHERE status = 'active'
GROUP BY user_id;

-- View: Portfolio summary
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT
  ip.user_id,
  COUNT(DISTINCT ip.id) as total_portfolios,
  SUM(ip.total_value) as total_portfolio_value,
  SUM(ip.total_gain_loss) as total_gain_loss,
  COUNT(DISTINCT ih.id) as total_holdings
FROM investment_portfolios ip
LEFT JOIN investment_holdings ih ON ih.portfolio_id = ip.id
GROUP BY ip.user_id;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles extending auth.users with subscription and preferences';
COMMENT ON TABLE financial_goals IS 'User financial goals with auto-save and AI recommendations';
COMMENT ON TABLE financial_health_scores IS 'Historical financial health assessments with component scores';
COMMENT ON TABLE financial_insights IS 'AI-generated financial insights and alerts';
COMMENT ON TABLE recurring_bills IS 'Tracked recurring bills with negotiation status';
COMMENT ON TABLE budgets IS 'User budget definitions with spending tracking';
COMMENT ON TABLE investment_portfolios IS 'Investment portfolio containers';
COMMENT ON TABLE investment_holdings IS 'Individual holdings within portfolios';
COMMENT ON TABLE investment_transactions IS 'Buy/sell/dividend transactions';
COMMENT ON TABLE trading_signals IS 'AI-generated trading signals and recommendations';
COMMENT ON TABLE financial_chat_sessions IS 'Chat sessions with AI financial assistant';
COMMENT ON TABLE financial_chat_messages IS 'Individual messages in chat sessions';

-- End of migration

