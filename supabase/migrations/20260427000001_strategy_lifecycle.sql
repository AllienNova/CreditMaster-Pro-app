-- ============================================================================
-- Sprint 5: Strategy Lifecycle
-- Tracks strategy promotion/demotion through lifecycle stages.
-- ============================================================================

CREATE TABLE IF NOT EXISTS strategy_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stage TEXT NOT NULL DEFAULT 'research' CHECK (stage IN ('research','replay','shadow','paper','supervised_live','autonomous_live')),
  dwell_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  gate_scores JSONB DEFAULT '{}',
  promoted_at TIMESTAMPTZ,
  demoted_at TIMESTAMPTZ,
  demotion_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE strategy_lifecycle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own strategy lifecycle"
  ON strategy_lifecycle FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own strategy lifecycle"
  ON strategy_lifecycle FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_strategy_lifecycle_user ON strategy_lifecycle(user_id);
CREATE INDEX idx_strategy_lifecycle_strategy ON strategy_lifecycle(strategy_id);
