-- Tax Optimization Schema - Part 1: Core Tables
-- Security-first, legislation-aware architecture

-- Enable RLS on all tax tables
-- Federal Tax Brackets (versioned by year for legislation updates)
CREATE TABLE IF NOT EXISTS tax_federal_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year INTEGER NOT NULL,
  filing_status VARCHAR(30) NOT NULL,
  bracket_min DECIMAL(15,2) NOT NULL,
  bracket_max DECIMAL(15,2),
  rate DECIMAL(5,4) NOT NULL,
  source_reference VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_federal_brackets_year ON tax_federal_brackets(tax_year, filing_status);

-- State Tax Rules (versioned)
CREATE TABLE IF NOT EXISTS tax_state_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year INTEGER NOT NULL,
  state_code CHAR(2) NOT NULL,
  has_income_tax BOOLEAN DEFAULT true,
  is_flat_rate BOOLEAN DEFAULT false,
  flat_rate DECIMAL(5,4),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tax_year, state_code)
);

-- Contribution Limits (versioned)
CREATE TABLE IF NOT EXISTS tax_contribution_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year INTEGER NOT NULL,
  account_type VARCHAR(30) NOT NULL,
  limit_amount DECIMAL(15,2) NOT NULL,
  catch_up_amount DECIMAL(15,2) DEFAULT 0,
  catch_up_age INTEGER DEFAULT 50,
  source_reference VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_contribution_limits_year ON tax_contribution_limits(tax_year);

-- User Tax Profiles
CREATE TABLE IF NOT EXISTS tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  filing_status VARCHAR(30) NOT NULL DEFAULT 'single',
  state_of_residence CHAR(2),
  gross_income DECIMAL(15,2) DEFAULT 0,
  w2_income DECIMAL(15,2) DEFAULT 0,
  self_employment_income DECIMAL(15,2) DEFAULT 0,
  investment_income DECIMAL(15,2) DEFAULT 0,
  capital_gains_long_term DECIMAL(15,2) DEFAULT 0,
  capital_gains_short_term DECIMAL(15,2) DEFAULT 0,
  dependents_count INTEGER DEFAULT 0,
  is_self_employed BOOLEAN DEFAULT false,
  has_hdhp BOOLEAN DEFAULT false,
  ytd_401k_contribution DECIMAL(15,2) DEFAULT 0,
  ytd_ira_contribution DECIMAL(15,2) DEFAULT 0,
  ytd_hsa_contribution DECIMAL(15,2) DEFAULT 0,
  optimization_goal VARCHAR(30) DEFAULT 'balanced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tax_year)
);
CREATE INDEX idx_tax_profiles_user ON tax_profiles(user_id);

-- Tax Strategies (master list)
CREATE TABLE IF NOT EXISTS tax_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_code VARCHAR(50) UNIQUE NOT NULL,
  strategy_name VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL,
  description TEXT,
  complexity VARCHAR(20) DEFAULT 'basic',
  requires_professional BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax Recommendations
CREATE TABLE IF NOT EXISTS tax_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tax_year INTEGER NOT NULL,
  strategy_id UUID REFERENCES tax_strategies(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  estimated_tax_savings DECIMAL(15,2),
  priority VARCHAR(10) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  deadline DATE,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tax_recommendations_user ON tax_recommendations(user_id, status);

-- Tax Audit Log (security/compliance)
CREATE TABLE IF NOT EXISTS tax_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tax_audit_log_user ON tax_audit_log(user_id, created_at);

-- Enable RLS
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_profiles_policy ON tax_profiles;
CREATE POLICY tax_profiles_policy ON tax_profiles FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS tax_recommendations_policy ON tax_recommendations;
CREATE POLICY tax_recommendations_policy ON tax_recommendations FOR ALL USING (auth.uid() = user_id);
