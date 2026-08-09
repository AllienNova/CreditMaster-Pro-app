-- Vitality Scores Migration
-- Created: 2026-01-10
-- Description: Tables for storing Financial Vitality Score history and component scores

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Vitality Scores Table
-- ============================================
CREATE TABLE IF NOT EXISTS vitality_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Overall Score
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    grade VARCHAR(2) NOT NULL CHECK (grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),
    percentile INTEGER CHECK (percentile >= 0 AND percentile <= 100),

    -- Component Scores (0-100 each)
    credit_score INTEGER NOT NULL CHECK (credit_score >= 0 AND credit_score <= 100),
    spending_score INTEGER NOT NULL CHECK (spending_score >= 0 AND spending_score <= 100),
    savings_score INTEGER NOT NULL CHECK (savings_score >= 0 AND savings_score <= 100),
    debt_score INTEGER NOT NULL CHECK (debt_score >= 0 AND debt_score <= 100),
    investments_score INTEGER NOT NULL CHECK (investments_score >= 0 AND investments_score <= 100),

    -- Component Details (JSON)
    credit_details JSONB DEFAULT '{}',
    spending_details JSONB DEFAULT '{}',
    savings_details JSONB DEFAULT '{}',
    debt_details JSONB DEFAULT '{}',
    investments_details JSONB DEFAULT '{}',

    -- Trend
    trend VARCHAR(20) DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining')),
    trend_percentage DECIMAL(5,2) DEFAULT 0,

    -- Quick Wins & Milestones
    quick_wins JSONB DEFAULT '[]',
    next_milestone JSONB DEFAULT '{}',

    -- Metadata
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Vitality Score History Table (for trend analysis)
-- ============================================
CREATE TABLE IF NOT EXISTS vitality_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Snapshot of scores
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    credit_score INTEGER NOT NULL CHECK (credit_score >= 0 AND credit_score <= 100),
    spending_score INTEGER NOT NULL CHECK (spending_score >= 0 AND spending_score <= 100),
    savings_score INTEGER NOT NULL CHECK (savings_score >= 0 AND savings_score <= 100),
    debt_score INTEGER NOT NULL CHECK (debt_score >= 0 AND debt_score <= 100),
    investments_score INTEGER NOT NULL CHECK (investments_score >= 0 AND investments_score <= 100),

    -- Period
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Quick Wins Completed Table
-- ============================================
CREATE TABLE IF NOT EXISTS quick_wins_completed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Win details
    win_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    impact INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL,

    -- Completion
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    points_earned INTEGER DEFAULT 0,

    -- Prevent duplicate completions
    UNIQUE(user_id, win_id)
);

-- ============================================
-- Milestones Achieved Table
-- ============================================
CREATE TABLE IF NOT EXISTS milestones_achieved (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Milestone details
    milestone_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    target_score INTEGER NOT NULL,
    description TEXT,

    -- Achievement
    achieved_score INTEGER NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate achievements
    UNIQUE(user_id, milestone_id)
);

-- ============================================
-- Indexes
-- ============================================

-- Vitality scores indexes
CREATE INDEX idx_vitality_scores_user_id ON vitality_scores(user_id);
CREATE INDEX idx_vitality_scores_calculated_at ON vitality_scores(calculated_at DESC);
CREATE INDEX idx_vitality_scores_user_latest ON vitality_scores(user_id, calculated_at DESC);

-- History indexes
CREATE INDEX idx_vitality_history_user_id ON vitality_score_history(user_id);
CREATE INDEX idx_vitality_history_period ON vitality_score_history(user_id, period_type, period_start DESC);

-- Quick wins indexes
CREATE INDEX idx_quick_wins_user_id ON quick_wins_completed(user_id);
CREATE INDEX idx_quick_wins_completed_at ON quick_wins_completed(completed_at DESC);

-- Milestones indexes
CREATE INDEX idx_milestones_user_id ON milestones_achieved(user_id);
CREATE INDEX idx_milestones_achieved_at ON milestones_achieved(achieved_at DESC);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE vitality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitality_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_wins_completed ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones_achieved ENABLE ROW LEVEL SECURITY;

-- Vitality scores policies
DROP POLICY IF EXISTS "Users can view their own vitality scores" ON vitality_scores;
CREATE POLICY "Users can view their own vitality scores"
    ON vitality_scores FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own vitality scores" ON vitality_scores;
CREATE POLICY "Users can insert their own vitality scores"
    ON vitality_scores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own vitality scores" ON vitality_scores;
CREATE POLICY "Users can update their own vitality scores"
    ON vitality_scores FOR UPDATE
    USING (auth.uid() = user_id);

-- History policies
DROP POLICY IF EXISTS "Users can view their own score history" ON vitality_score_history;
CREATE POLICY "Users can view their own score history"
    ON vitality_score_history FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own score history" ON vitality_score_history;
CREATE POLICY "Users can insert their own score history"
    ON vitality_score_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Quick wins policies
DROP POLICY IF EXISTS "Users can view their own completed quick wins" ON quick_wins_completed;
CREATE POLICY "Users can view their own completed quick wins"
    ON quick_wins_completed FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own completed quick wins" ON quick_wins_completed;
CREATE POLICY "Users can insert their own completed quick wins"
    ON quick_wins_completed FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Milestones policies
DROP POLICY IF EXISTS "Users can view their own milestones" ON milestones_achieved;
CREATE POLICY "Users can view their own milestones"
    ON milestones_achieved FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own milestones" ON milestones_achieved;
CREATE POLICY "Users can insert their own milestones"
    ON milestones_achieved FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Functions
-- ============================================

-- Function to get the latest vitality score for a user
CREATE OR REPLACE FUNCTION get_latest_vitality_score(p_user_id UUID)
RETURNS vitality_scores AS $$
DECLARE
    result vitality_scores;
BEGIN
    SELECT * INTO result
    FROM vitality_scores
    WHERE user_id = p_user_id
    ORDER BY calculated_at DESC
    LIMIT 1;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate score trend
CREATE OR REPLACE FUNCTION calculate_vitality_trend(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    trend VARCHAR(20),
    trend_percentage DECIMAL(5,2),
    score_change INTEGER
) AS $$
DECLARE
    current_score INTEGER;
    previous_score INTEGER;
    score_diff INTEGER;
    pct_change DECIMAL(5,2);
BEGIN
    -- Get current score
    SELECT overall_score INTO current_score
    FROM vitality_scores
    WHERE user_id = p_user_id
    ORDER BY calculated_at DESC
    LIMIT 1;

    -- Get previous score from p_days ago
    SELECT overall_score INTO previous_score
    FROM vitality_scores
    WHERE user_id = p_user_id
    AND calculated_at <= NOW() - (p_days || ' days')::INTERVAL
    ORDER BY calculated_at DESC
    LIMIT 1;

    -- Calculate difference
    IF previous_score IS NOT NULL AND previous_score > 0 THEN
        score_diff := current_score - previous_score;
        pct_change := (score_diff::DECIMAL / previous_score) * 100;

        IF score_diff > 2 THEN
            trend := 'improving';
        ELSIF score_diff < -2 THEN
            trend := 'declining';
        ELSE
            trend := 'stable';
        END IF;
    ELSE
        score_diff := 0;
        pct_change := 0;
        trend := 'stable';
    END IF;

    RETURN QUERY SELECT trend, pct_change, score_diff;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record daily score snapshot
CREATE OR REPLACE FUNCTION record_daily_vitality_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert daily snapshot if this is a new day
    INSERT INTO vitality_score_history (
        user_id,
        overall_score,
        credit_score,
        spending_score,
        savings_score,
        debt_score,
        investments_score,
        period_type,
        period_start,
        period_end
    )
    SELECT
        NEW.user_id,
        NEW.overall_score,
        NEW.credit_score,
        NEW.spending_score,
        NEW.savings_score,
        NEW.debt_score,
        NEW.investments_score,
        'daily',
        CURRENT_DATE,
        CURRENT_DATE
    WHERE NOT EXISTS (
        SELECT 1 FROM vitality_score_history
        WHERE user_id = NEW.user_id
        AND period_type = 'daily'
        AND period_start = CURRENT_DATE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to record daily snapshots
CREATE TRIGGER trigger_record_daily_snapshot
    AFTER INSERT ON vitality_scores
    FOR EACH ROW
    EXECUTE FUNCTION record_daily_vitality_snapshot();

-- ============================================
-- Views
-- ============================================

-- View for user's score summary
CREATE OR REPLACE VIEW user_vitality_summary AS
SELECT
    vs.user_id,
    vs.overall_score,
    vs.grade,
    vs.percentile,
    vs.credit_score,
    vs.spending_score,
    vs.savings_score,
    vs.debt_score,
    vs.investments_score,
    vs.trend,
    vs.trend_percentage,
    vs.calculated_at,
    (SELECT COUNT(*) FROM quick_wins_completed qw WHERE qw.user_id = vs.user_id) as wins_completed,
    (SELECT COUNT(*) FROM milestones_achieved ma WHERE ma.user_id = vs.user_id) as milestones_achieved
FROM vitality_scores vs
WHERE vs.calculated_at = (
    SELECT MAX(calculated_at)
    FROM vitality_scores
    WHERE user_id = vs.user_id
);

-- ============================================
-- Sample Data for Testing (Optional)
-- ============================================

-- Uncomment to insert sample data
/*
INSERT INTO vitality_scores (
    user_id,
    overall_score,
    grade,
    percentile,
    credit_score,
    spending_score,
    savings_score,
    debt_score,
    investments_score,
    credit_details,
    spending_details,
    savings_details,
    debt_details,
    investments_details,
    trend,
    trend_percentage,
    quick_wins,
    next_milestone
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Replace with actual user_id
    78,
    'B+',
    72,
    85,
    70,
    65,
    75,
    80,
    '{"score": 720, "change": 15, "utilization": 25}',
    '{"budgetAdherence": 0.85, "monthlySpending": 3500, "vsLastMonth": -5}',
    '{"emergencyFundMonths": 2.5, "savingsRate": 0.15, "monthlyContribution": 500}',
    '{"totalDebt": 25000, "debtToIncome": 0.28, "monthlyPayment": 800}',
    '{"totalValue": 45000, "yearlyReturn": 0.12, "diversificationScore": 0.75}',
    'improving',
    5.2,
    '[{"id": "1", "title": "Pay down credit card", "impact": 8, "category": "credit"}]',
    '{"target": 80, "title": "Score Champion", "description": "Reach 80+ score"}'
);
*/

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE vitality_scores IS 'Stores the current Financial Vitality Score for each user';
COMMENT ON TABLE vitality_score_history IS 'Historical snapshots of vitality scores for trend analysis';
COMMENT ON TABLE quick_wins_completed IS 'Tracks which quick win actions users have completed';
COMMENT ON TABLE milestones_achieved IS 'Tracks milestones users have achieved';
COMMENT ON FUNCTION get_latest_vitality_score IS 'Returns the most recent vitality score for a user';
COMMENT ON FUNCTION calculate_vitality_trend IS 'Calculates the trend direction and percentage for a user';
