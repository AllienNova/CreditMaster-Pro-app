-- Credit Improvement Database Schema
-- Additional tables for the improvement features

-- Improvement Plans table
CREATE TABLE IF NOT EXISTS improvement_plans (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    plan_data JSONB NOT NULL, -- Stores the complete ImprovementPlan object
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Improvement Progress table
CREATE TABLE IF NOT EXISTS improvement_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES improvement_plans(id) ON DELETE CASCADE,
    action_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
    started_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    notes TEXT,
    actual_impact INTEGER, -- Actual score impact when completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ML Predictions table (enhanced)
CREATE TABLE IF NOT EXISTS ml_predictions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction_type TEXT NOT NULL CHECK (prediction_type IN ('credit_score', 'dispute_success', 'improvement_impact')),
    model_version TEXT NOT NULL,
    confidence_level DECIMAL(3,2) NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 1),
    prediction_data JSONB NOT NULL, -- Stores the complete prediction object
    actual_outcome JSONB, -- Stores actual results for accuracy tracking
    accuracy_score DECIMAL(3,2), -- Calculated accuracy when outcome is known
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Score History table (for tracking improvements)
CREATE TABLE IF NOT EXISTS credit_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
    score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
    score_type TEXT DEFAULT 'fico' CHECK (score_type IN ('fico', 'vantage')),
    report_date DATE NOT NULL,
    improvement_plan_id TEXT REFERENCES improvement_plans(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Action Templates table (for reusable improvement actions)
CREATE TABLE IF NOT EXISTS action_templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('debt_reduction', 'payment_optimization', 'credit_mix', 'history_building', 'income_optimization')),
    priority INTEGER NOT NULL CHECK (priority IN (1, 2, 3)),
    ml_feature_impact DECIMAL(3,2) NOT NULL,
    expected_score_increase_min INTEGER NOT NULL,
    expected_score_increase_max INTEGER NOT NULL,
    timeframe TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    cost TEXT NOT NULL CHECK (cost IN ('free', 'low', 'medium', 'high')),
    steps JSONB NOT NULL, -- Array of step strings
    requirements JSONB, -- Array of requirement strings
    warnings JSONB, -- Array of warning strings
    success_rate DECIMAL(3,2), -- Historical success rate
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Goals table
CREATE TABLE IF NOT EXISTS user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('credit_score', 'debt_reduction', 'approval_rate')),
    current_value INTEGER NOT NULL,
    target_value INTEGER NOT NULL,
    target_date DATE,
    priority INTEGER DEFAULT 1 CHECK (priority IN (1, 2, 3)),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Improvement Milestones table
CREATE TABLE IF NOT EXISTS improvement_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES improvement_plans(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL CHECK (milestone_type IN ('score_increase', 'debt_reduction', 'action_completion', 'time_based')),
    title TEXT NOT NULL,
    description TEXT,
    target_value INTEGER,
    current_value INTEGER DEFAULT 0,
    achieved BOOLEAN DEFAULT FALSE,
    achieved_date TIMESTAMP WITH TIME ZONE,
    reward_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_improvement_plans_user_id ON improvement_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_improvement_plans_status ON improvement_plans(status);
CREATE INDEX IF NOT EXISTS idx_improvement_progress_user_id ON improvement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_improvement_progress_plan_id ON improvement_progress(plan_id);
CREATE INDEX IF NOT EXISTS idx_improvement_progress_status ON improvement_progress(status);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_id ON ml_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_type ON ml_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_credit_score_history_user_id ON credit_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_score_history_date ON credit_score_history(report_date);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON user_goals(status);
CREATE INDEX IF NOT EXISTS idx_improvement_milestones_user_id ON improvement_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_improvement_milestones_plan_id ON improvement_milestones(plan_id);

-- Row Level Security (RLS) policies
ALTER TABLE improvement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvement_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for improvement_plans
CREATE POLICY "Users can view their own improvement plans" ON improvement_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own improvement plans" ON improvement_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own improvement plans" ON improvement_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own improvement plans" ON improvement_plans
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for improvement_progress
CREATE POLICY "Users can view their own improvement progress" ON improvement_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own improvement progress" ON improvement_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own improvement progress" ON improvement_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ml_predictions
CREATE POLICY "Users can view their own ML predictions" ON ml_predictions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ML predictions" ON ml_predictions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ML predictions" ON ml_predictions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for credit_score_history
CREATE POLICY "Users can view their own credit score history" ON credit_score_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit score history" ON credit_score_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit score history" ON credit_score_history
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_goals
CREATE POLICY "Users can view their own goals" ON user_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON user_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON user_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON user_goals
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for improvement_milestones
CREATE POLICY "Users can view their own milestones" ON improvement_milestones
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestones" ON improvement_milestones
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestones" ON improvement_milestones
    FOR UPDATE USING (auth.uid() = user_id);

-- Action templates are public (read-only for users)
ALTER TABLE action_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view action templates" ON action_templates
    FOR SELECT USING (true);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_improvement_plans_updated_at BEFORE UPDATE ON improvement_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_improvement_progress_updated_at BEFORE UPDATE ON improvement_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_predictions_updated_at BEFORE UPDATE ON ml_predictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_templates_updated_at BEFORE UPDATE ON action_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_improvement_milestones_updated_at BEFORE UPDATE ON improvement_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default action templates
INSERT INTO action_templates (id, title, description, category, priority, ml_feature_impact, expected_score_increase_min, expected_score_increase_max, timeframe, difficulty, cost, steps, requirements, warnings, success_rate) VALUES
('debt_reduction_primary', 'Pay Down High-Balance Credit Cards', 'Focus on reducing balances on your highest utilization credit cards first', 'debt_reduction', 1, 0.23, 15, 30, '60-90 days', 'medium', 'high', 
 '["List all credit cards with balances and limits", "Calculate utilization ratio for each card", "Focus extra payments on highest utilization cards", "Pay more than minimum payments", "Track progress monthly"]',
 '["Available funds for debt payment", "Current credit card statements"]',
 '["Avoid closing accounts after paying them off", "Don''t stop making payments on other accounts"]',
 0.78),

('payment_optimization', 'Achieve Perfect Payment History', 'Set up systems to ensure 100% on-time payments across all accounts', 'payment_optimization', 1, 0.19, 10, 25, '30-60 days', 'easy', 'free',
 '["Set up autopay for all accounts", "Pay before due dates, not on due dates", "Set up payment reminders", "Monitor all accounts weekly", "Make multiple payments per month if possible"]',
 '["Bank account for autopay", "Access to online banking"]',
 '["Ensure sufficient funds for autopay", "Monitor autopay transactions"]',
 0.85),

('income_optimization', 'Optimize Income Reporting', 'Update and maximize reported income across all credit accounts', 'income_optimization', 2, 0.18, 8, 18, '90-120 days', 'medium', 'low',
 '["Gather all income documentation", "Update income with all creditors", "Include all income sources", "Request credit limit increases", "Document income increases"]',
 '["Proof of income documentation", "Recent pay stubs or tax returns"]',
 '["Only report verifiable income", "Keep documentation for verification"]',
 0.65),

('credit_mix_diversification', 'Diversify Credit Portfolio', 'Add different types of credit accounts to improve credit mix', 'credit_mix', 3, 0.12, 5, 15, '120-180 days', 'medium', 'medium',
 '["Assess current credit types", "Research appropriate new credit types", "Apply for installment loan if beneficial", "Keep existing accounts active", "Monitor credit mix impact"]',
 '["Good payment history", "Stable income", "Low current utilization"]',
 '["New credit may temporarily lower score", "Don''t apply for unnecessary credit"]',
 0.58),

('history_building', 'Optimize Credit History Length', 'Maximize the age of your credit history through strategic account management', 'history_building', 2, 0.15, 5, 12, '180+ days', 'easy', 'free',
 '["Identify oldest accounts", "Keep old accounts open and active", "Make small purchases on old cards", "Pay off old cards monthly", "Become authorized user on old accounts"]',
 '["Existing old credit accounts", "Family member with good credit history"]',
 '["Don''t close old accounts", "Monitor for annual fees on old cards"]',
 0.72);

-- Insert sample user goals
-- (These would be created by users, but we can have some templates)

COMMENT ON TABLE improvement_plans IS 'Stores complete ML-generated improvement plans for users';
COMMENT ON TABLE improvement_progress IS 'Tracks user progress on individual improvement actions';
COMMENT ON TABLE ml_predictions IS 'Stores all ML model predictions with accuracy tracking';
COMMENT ON TABLE credit_score_history IS 'Historical credit scores for tracking improvement over time';
COMMENT ON TABLE action_templates IS 'Reusable improvement action templates with ML-based effectiveness data';
COMMENT ON TABLE user_goals IS 'User-defined credit improvement goals and targets';
COMMENT ON TABLE improvement_milestones IS 'Achievement milestones within improvement plans';

