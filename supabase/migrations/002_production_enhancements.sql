-- CreditMaster Pro - Production Enhancements
-- Migration: 002_production_enhancements
-- Created: 2025-12-04
-- Description: Add production tables, audit logging, and enhanced security

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- Sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs for security compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploads table for temporary file tracking
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  is_temp BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit scores history
CREATE TABLE IF NOT EXISTS credit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bureau TEXT CHECK (bureau IN ('experian', 'equifax', 'transunion')) NOT NULL,
  score INTEGER CHECK (score >= 300 AND score <= 850),
  score_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, bureau, score_date)
);

-- Dispute templates usage tracking
CREATE TABLE IF NOT EXISTS dispute_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  template_id TEXT NOT NULL,
  dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL,
  outcome TEXT CHECK (outcome IN ('pending', 'success', 'partial', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategy usage tracking
CREATE TABLE IF NOT EXISTS strategy_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strategy_id TEXT NOT NULL,
  dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL,
  current_step INTEGER DEFAULT 1,
  outcome TEXT CHECK (outcome IN ('pending', 'success', 'partial', 'rejected', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- EXTEND EXISTING TABLES
-- ============================================================================

-- Add columns to disputes if not exist
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS strategy_id TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add columns to notifications for more types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('dispute_update', 'payment_success', 'document_uploaded', 'tip', 
                  'dispute_overdue', 'dispute_reminder', 'draft_reminder', 'score_reminder',
                  'subscription_expiring', 'welcome', 'system'));

-- Add notification_preferences to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email_disputes": true,
  "email_payments": true,
  "push_disputes": true,
  "push_tips": true,
  "score_reminders": true
}'::jsonb;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_scores_user ON credit_scores(user_id, score_date DESC);
CREATE INDEX IF NOT EXISTS idx_template_usage_user ON dispute_template_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_usage_user ON strategy_usage(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_usage ENABLE ROW LEVEL SECURITY;

-- Sessions policies (users can only see their own sessions)
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE USING (auth.uid() = user_id);

-- Audit logs (read-only for users, insert for system)
CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Uploads policies
CREATE POLICY "Users can view own uploads" ON uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own uploads" ON uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own uploads" ON uploads FOR DELETE USING (auth.uid() = user_id);

-- Credit scores policies
CREATE POLICY "Users can view own scores" ON credit_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scores" ON credit_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Template/Strategy usage policies
CREATE POLICY "Users can view own template usage" ON dispute_template_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own template usage" ON dispute_template_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own strategy usage" ON strategy_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategy usage" ON strategy_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategy usage" ON strategy_usage FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Audit log function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
  VALUES (
    COALESCE(auth.uid(), NEW.user_id, OLD.user_id),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_disputes ON disputes;
CREATE TRIGGER audit_disputes AFTER INSERT OR UPDATE OR DELETE ON disputes
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_subscriptions ON subscriptions;
CREATE TRIGGER audit_subscriptions AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

