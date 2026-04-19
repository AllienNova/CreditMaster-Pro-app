-- FCRA Section 615 Adverse Action Notices
-- Tracks all adverse action notices sent to users when decisions are made
-- based on credit report information.

CREATE TABLE IF NOT EXISTS adverse_action_notices (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  credit_score_used INTEGER,
  credit_score_range JSONB,
  bureau_used TEXT NOT NULL,
  notice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  free_report_deadline TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_adverse_action_user_id ON adverse_action_notices(user_id);
CREATE INDEX idx_adverse_action_notice_date ON adverse_action_notices(notice_date);

-- ROW LEVEL SECURITY
ALTER TABLE adverse_action_notices ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notices
CREATE POLICY "Users read own adverse action notices"
  ON adverse_action_notices FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (server-side only).
-- `TO service_role` restricts the policy so authenticated clients cannot
-- bypass FCRA validation by inserting notices directly.
CREATE POLICY "Service role inserts adverse action notices"
  ON adverse_action_notices FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Consent records table for GDPR/CCPA opt-out tracking
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(user_id, consent_type)
);

CREATE INDEX idx_consent_records_user_id ON consent_records(user_id);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own consent records"
  ON consent_records FOR SELECT
  USING (auth.uid() = user_id);

-- Only the service role can write/update/delete consent records.
-- Authenticated clients can read their own rows via the SELECT policy above,
-- but cannot forge rows for arbitrary user_ids.
CREATE POLICY "Service role manages consent records"
  ON consent_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
