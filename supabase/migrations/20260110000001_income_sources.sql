-- Income Sources Migration
-- Tracks user income sources for payday countdown and financial planning

-- Create income_sources table
CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  next_pay_date DATE NOT NULL,
  last_pay_date DATE,
  account_id UUID,
  is_auto_detected BOOLEAN DEFAULT false,
  category VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_sources_user ON income_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_next_pay ON income_sources(user_id, next_pay_date);

-- Enable RLS
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own income sources" ON income_sources;
CREATE POLICY "Users can view own income sources"
  ON income_sources FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own income sources" ON income_sources;
CREATE POLICY "Users can insert own income sources"
  ON income_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own income sources" ON income_sources;
CREATE POLICY "Users can update own income sources"
  ON income_sources FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own income sources" ON income_sources;
CREATE POLICY "Users can delete own income sources"
  ON income_sources FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_income_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER income_sources_updated_at
  BEFORE UPDATE ON income_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_income_sources_updated_at();

-- Add comments
COMMENT ON TABLE income_sources IS 'Stores user income sources for payday tracking';
COMMENT ON COLUMN income_sources.frequency IS 'Pay frequency: weekly, biweekly, semimonthly, monthly';
COMMENT ON COLUMN income_sources.is_auto_detected IS 'Whether this income was detected from transactions';
