# CPFI Intelligent Banking & Financial Intelligence Suite
## Comprehensive Implementation Plan

**Version**: 1.0  
**Created**: December 7, 2025  
**Target Completion**: 14 weeks  

---

## Executive Summary

This plan implements four major feature suites to compete with and exceed Credit Karma's banking offerings:

1. **Intelligent Banking & Financial Management Suite** - Smart tools for existing accounts
2. **AI Financial Coach** - Dave Ramsey-style personalized financial advisor
3. **Expert Asset Scanner & Investment Intelligence** - Hedge fund-quality analysis
4. **Financial Chat Interface** - Conversational financial planning

Unlike Credit Karma's approach of creating new bank accounts, CPFI provides comprehensive intelligent tools that work with users' existing financial accounts via Plaid integration.

---

## Phase 1: Infrastructure & Core Services (Weeks 1-3)

### 1.1 Database Schema Extensions

#### Priority: P0 (Critical)

**New Tables Required:**

```sql
-- AI Financial Coach Conversations
CREATE TABLE financial_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  title TEXT,
  context JSONB DEFAULT '{}',  -- Financial snapshot at conversation start
  goal_type TEXT CHECK (goal_type IN ('debt_payoff', 'emergency_fund', 'savings', 'retirement', 'investment', 'general')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Messages
CREATE TABLE financial_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES financial_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',  -- Actions taken, recommendations, etc.
  tokens_used INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Financial Profile (AI Context)
CREATE TABLE financial_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_income DECIMAL(12, 2),
  income_sources JSONB DEFAULT '[]',
  fixed_expenses JSONB DEFAULT '[]',
  variable_expenses JSONB DEFAULT '[]',
  financial_goals JSONB DEFAULT '[]',
  risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  debt_strategy TEXT CHECK (debt_strategy IN ('snowball', 'avalanche', 'custom')),
  emergency_fund_target DECIMAL(12, 2),
  retirement_target DECIMAL(12, 2),
  coaching_preferences JSONB DEFAULT '{}',
  last_analysis_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart Budget Rules
CREATE TABLE smart_budget_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('category_limit', 'merchant_block', 'savings_transfer', 'alert_threshold', 'round_up')),
  conditions JSONB NOT NULL,  -- e.g., {"category": "dining", "threshold": 500}
  actions JSONB NOT NULL,      -- e.g., {"notify": true, "auto_transfer": 50}
  is_active BOOLEAN DEFAULT true,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings Goals with Automation
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  target_date DATE,
  priority INTEGER DEFAULT 1,
  category TEXT CHECK (category IN ('emergency', 'vacation', 'major_purchase', 'education', 'retirement', 'custom')),
  auto_save_enabled BOOLEAN DEFAULT false,
  auto_save_amount DECIMAL(12, 2),
  auto_save_frequency TEXT CHECK (auto_save_frequency IN ('weekly', 'biweekly', 'monthly')),
  funding_account_id TEXT,  -- Plaid account ID
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill Negotiation Tracker
CREATE TABLE bill_negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,  -- utilities, insurance, subscriptions, etc.
  current_amount DECIMAL(12, 2) NOT NULL,
  target_amount DECIMAL(12, 2),
  negotiated_amount DECIMAL(12, 2),
  annual_savings DECIMAL(12, 2),
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'analyzing', 'script_ready', 'in_progress', 'completed', 'failed')),
  ai_script JSONB,  -- Negotiation talking points
  ai_analysis JSONB,  -- Market comparison, success probability
  notes TEXT,
  negotiated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investment Portfolio Tracking
CREATE TABLE investment_portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portfolio_type TEXT CHECK (portfolio_type IN ('retirement', 'taxable', 'education', 'trading')),
  total_value DECIMAL(14, 2) DEFAULT 0,
  total_cost_basis DECIMAL(14, 2) DEFAULT 0,
  total_gain_loss DECIMAL(14, 2) DEFAULT 0,
  allocation JSONB DEFAULT '{}',  -- Asset allocation percentages
  risk_score INTEGER,  -- 1-10
  last_rebalanced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

*(Schema continues in next section)*

