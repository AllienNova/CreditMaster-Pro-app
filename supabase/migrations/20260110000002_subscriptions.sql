-- Subscriptions Migration
-- Tracks user subscriptions for management and cancellation assistance

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  merchant_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  category VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'pending_cancellation', 'cancelled')),
  next_billing_date DATE,
  detected_from_bill_id UUID,
  logo_url TEXT,
  annual_cost DECIMAL(12,2),
  cancellation_status VARCHAR(20) CHECK (cancellation_status IN ('cancelled', 'retained', 'pending', 'failed')),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cancellation_requests table
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('cancelled', 'retained', 'pending', 'failed')),
  method VARCHAR(20) CHECK (method IN ('phone', 'email', 'website', 'chat', 'in_app')),
  ai_script TEXT,
  instructions JSONB,
  contact_info JSONB,
  outcome VARCHAR(20) CHECK (outcome IN ('cancelled', 'retained', 'pending', 'failed')),
  savings_amount DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Twin-schema reconciliation (M0 / ADR-0001).
--
-- `001_initial_schema.sql` already declares `CREATE TABLE IF NOT EXISTS
-- subscriptions` for STRIPE subscriptions (stripe_subscription_id,
-- stripe_price_id, current_period_*). It sorts first, so the CREATE above —
-- which models THIRD-PARTY subscription tracking (merchant_name, amount,
-- frequency, next_billing_date, cancellation_status) — is skipped, and
-- provisioning aborted on the `next_billing_date` index below.
--
-- ⚠ MODELLING CONFLICT, NOT JUST DRIFT: these are two different domain concepts
-- sharing one table name. The ALTERs below only unblock provisioning; they do
-- NOT resolve the conflict, and the result is a table carrying both vocabularies.
-- The correct fix is to rename this concept to its own table (e.g.
-- `tracked_subscriptions`) and migrate its readers/writers — deliberately left
-- as an M0 follow-up rather than silently merged, because renaming touches
-- application code and is not additive.
-- ---------------------------------------------------------------------------
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS merchant_name TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_billing_date DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS annual_cost DECIMAL(12, 2);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_status TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS detected_from_bill_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(user_id, next_billing_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_user ON cancellation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_subscription ON cancellation_requests(subscription_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;
CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON subscriptions;
CREATE POLICY "Users can delete own subscriptions"
  ON subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for cancellation_requests
DROP POLICY IF EXISTS "Users can view own cancellation requests" ON cancellation_requests;
CREATE POLICY "Users can view own cancellation requests"
  ON cancellation_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cancellation requests" ON cancellation_requests;
CREATE POLICY "Users can insert own cancellation requests"
  ON cancellation_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cancellation requests" ON cancellation_requests;
CREATE POLICY "Users can update own cancellation requests"
  ON cancellation_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Compute annual_cost trigger
CREATE OR REPLACE FUNCTION compute_subscription_annual_cost()
RETURNS TRIGGER AS $$
BEGIN
  NEW.annual_cost = CASE NEW.frequency
    WHEN 'weekly' THEN NEW.amount * 52
    WHEN 'monthly' THEN NEW.amount * 12
    WHEN 'quarterly' THEN NEW.amount * 4
    WHEN 'yearly' THEN NEW.amount
    ELSE NEW.amount * 12
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_compute_annual_cost
  BEFORE INSERT OR UPDATE OF amount, frequency ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION compute_subscription_annual_cost();

-- Add comments
COMMENT ON TABLE subscriptions IS 'Stores user subscriptions for tracking and cancellation';
COMMENT ON TABLE cancellation_requests IS 'Tracks subscription cancellation attempts and outcomes';
COMMENT ON COLUMN subscriptions.detected_from_bill_id IS 'ID of bill record if auto-detected';
COMMENT ON COLUMN cancellation_requests.ai_script IS 'AI-generated cancellation script for phone calls';
