-- Credit Score History Table
-- Created: 2026-03-01
-- Purpose: Track credit score changes over time for each bureau

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CREDIT SCORE HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
  score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
  report_id TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for credit_score_history
CREATE INDEX idx_credit_score_history_user_id ON credit_score_history(user_id);
CREATE INDEX idx_credit_score_history_bureau ON credit_score_history(bureau);
CREATE INDEX idx_credit_score_history_recorded_at ON credit_score_history(recorded_at);
CREATE INDEX idx_credit_score_history_user_bureau ON credit_score_history(user_id, bureau);
CREATE INDEX idx_credit_score_history_user_bureau_date ON credit_score_history(user_id, bureau, recorded_at DESC);

-- RLS policies for credit_score_history
ALTER TABLE credit_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own score history"
  ON credit_score_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own score history"
  ON credit_score_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- BUREAU CONNECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bureau_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
  connected BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  last_pull_date TIMESTAMP WITH TIME ZONE,
  last_score INTEGER CHECK (last_score IS NULL OR (last_score >= 300 AND last_score <= 850)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bureau)
);

-- Indexes for bureau_connections
CREATE INDEX idx_bureau_connections_user_id ON bureau_connections(user_id);
CREATE INDEX idx_bureau_connections_bureau ON bureau_connections(bureau);

-- RLS policies for bureau_connections
ALTER TABLE bureau_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bureau connections"
  ON bureau_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bureau connections"
  ON bureau_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bureau connections"
  ON bureau_connections FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bureau_connections_updated_at
  BEFORE UPDATE ON bureau_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE credit_score_history IS 'Tracks credit score changes over time for trend analysis';
COMMENT ON TABLE bureau_connections IS 'Tracks which credit bureaus a user has connected to';
