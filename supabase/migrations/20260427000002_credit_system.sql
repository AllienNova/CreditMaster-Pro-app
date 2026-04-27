-- Credit System Foundation
-- User credit balances, transaction audit trail, purchases, and add-on subscriptions.

-- User credit balances
CREATE TABLE user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_balance INTEGER NOT NULL DEFAULT 0 CHECK (credit_balance >= 0),
  subscription_allowance INTEGER NOT NULL DEFAULT 500,
  purchased_credits INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own credits" ON user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages credits" ON user_credits FOR ALL USING (auth.role() = 'service_role');

-- Credit transaction log (immutable audit trail)
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  credits_consumed INTEGER DEFAULT 0,
  credits_added INTEGER DEFAULT 0,
  balance_after INTEGER NOT NULL,
  ai_model TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  raw_cost_usd NUMERIC(10, 6),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role inserts transactions" ON credit_transactions FOR INSERT WITH CHECK (true);
CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id, created_at DESC);

-- Credit purchases (one-time packs)
CREATE TABLE credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_type TEXT NOT NULL CHECK (pack_type IN ('starter', 'value', 'power')),
  credits_purchased INTEGER NOT NULL,
  amount_paid_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own purchases" ON credit_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages purchases" ON credit_purchases FOR ALL USING (auth.role() = 'service_role');

-- Add-on subscriptions (recurring bundles)
CREATE TABLE addon_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle_type TEXT NOT NULL CHECK (bundle_type IN ('ai_trading_boost', 'credit_repair_pro', 'family_member')),
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  credits_per_period INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE addon_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own addons" ON addon_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages addons" ON addon_subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX idx_addon_user ON addon_subscriptions(user_id);

-- Atomic credit deduction function (prevents race conditions)
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER, p_action TEXT, p_metadata JSONB DEFAULT '{}')
RETURNS TABLE(success BOOLEAN, remaining INTEGER) AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Lock the row for update
  SELECT credit_balance INTO v_balance FROM user_credits WHERE user_id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    -- Auto-create with default free tier allowance
    INSERT INTO user_credits (user_id, credit_balance, subscription_allowance)
    VALUES (p_user_id, 500, 500)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT credit_balance INTO v_balance FROM user_credits WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  IF v_balance < p_amount THEN
    RETURN QUERY SELECT false, v_balance;
    RETURN;
  END IF;

  UPDATE user_credits SET credit_balance = credit_balance - p_amount, updated_at = now() WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, action_type, credits_consumed, balance_after, metadata)
  VALUES (p_user_id, p_action, p_amount, v_balance - p_amount, p_metadata);

  RETURN QUERY SELECT true, v_balance - p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
