CREATE TABLE IF NOT EXISTS user_risk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  kill_switch JSONB NOT NULL DEFAULT '{"active": false}',
  equity NUMERIC NOT NULL DEFAULT 100000,
  peak_equity NUMERIC NOT NULL DEFAULT 100000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE user_risk_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own risk settings" ON user_risk_settings
  FOR ALL USING (auth.uid() = user_id);
