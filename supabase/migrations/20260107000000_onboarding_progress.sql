-- ============================================================================
-- Onboarding Progress Tracking Schema
-- Migration: 20260107000000_onboarding_progress
-- Description: Creates table for tracking user onboarding progress with auto-save
-- ============================================================================

-- ============================================================================
-- ONBOARDING_PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 5),
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  form_data JSONB DEFAULT '{}'::JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one progress record per user
  UNIQUE(user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id 
  ON onboarding_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed_at 
  ON onboarding_progress(completed_at) 
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_last_updated 
  ON onboarding_progress(last_updated);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Users can only view their own onboarding progress
DROP POLICY IF EXISTS "Users can view own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can view own onboarding progress"
  ON onboarding_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own onboarding progress
DROP POLICY IF EXISTS "Users can insert own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can insert own onboarding progress"
  ON onboarding_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own onboarding progress
DROP POLICY IF EXISTS "Users can update own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can update own onboarding progress"
  ON onboarding_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own onboarding progress
DROP POLICY IF EXISTS "Users can delete own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can delete own onboarding progress"
  ON onboarding_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_onboarding_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on every update
CREATE TRIGGER update_onboarding_progress_timestamp_trigger
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_progress_timestamp();

-- Function to mark onboarding as complete
CREATE OR REPLACE FUNCTION complete_onboarding(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE onboarding_progress
  SET 
    completed_at = NOW(),
    current_step = 5,
    completed_steps = ARRAY[1, 2, 3, 4, 5]
  WHERE user_id = p_user_id;
  
  -- Also update profiles table
  UPDATE profiles
  SET onboarding_completed = TRUE
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE onboarding_progress IS 'Tracks user onboarding progress with auto-save functionality';
COMMENT ON COLUMN onboarding_progress.current_step IS 'Current step number (1-5)';
COMMENT ON COLUMN onboarding_progress.completed_steps IS 'Array of completed step numbers';
COMMENT ON COLUMN onboarding_progress.form_data IS 'JSON object storing form field values';
COMMENT ON COLUMN onboarding_progress.last_updated IS 'Timestamp of last auto-save';
COMMENT ON COLUMN onboarding_progress.completed_at IS 'Timestamp when onboarding was completed';

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON onboarding_progress TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

