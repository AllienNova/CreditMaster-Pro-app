-- Transaction Rules Migration
-- Enables automatic transaction categorization and tagging rules

-- Create transaction_rules table
CREATE TABLE IF NOT EXISTS transaction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  condition_logic VARCHAR(3) NOT NULL DEFAULT 'AND' CHECK (condition_logic IN ('AND', 'OR')),
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transaction_rules_user ON transaction_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_rules_active ON transaction_rules(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_transaction_rules_priority ON transaction_rules(user_id, priority);

-- Enable RLS
ALTER TABLE transaction_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own rules"
  ON transaction_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules"
  ON transaction_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
  ON transaction_rules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
  ON transaction_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_transaction_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_rules_updated_at
  BEFORE UPDATE ON transaction_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_rules_updated_at();

-- Function to increment match count
CREATE OR REPLACE FUNCTION increment_rule_match_count(
  p_rule_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE transaction_rules
  SET
    match_count = match_count + 1,
    last_matched_at = NOW()
  WHERE id = p_rule_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE transaction_rules IS 'User-defined rules for automatic transaction categorization';
COMMENT ON COLUMN transaction_rules.conditions IS 'JSON array of conditions that must match';
COMMENT ON COLUMN transaction_rules.condition_logic IS 'AND = all conditions must match, OR = any condition matches';
COMMENT ON COLUMN transaction_rules.actions IS 'JSON array of actions to apply when rule matches';
COMMENT ON COLUMN transaction_rules.priority IS 'Lower priority rules are applied first';
