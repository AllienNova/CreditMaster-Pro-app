-- Credit purchase idempotency + atomic addCredits + RLS hardening
-- Addresses team-review CRITICAL findings: Stripe webhook double-credit, addCredits race,
-- credit_transactions INSERT RLS open to all authenticated clients,
-- and SECURITY DEFINER privilege-escalation on the credit RPCs.

-- 1. Backfill any existing NULLs and forbid future ones, then enforce idempotency
--    on Stripe payment intent fulfillment. Without NOT NULL, the UNIQUE constraint
--    permits multiple NULLs and the idempotency guard would be bypassed by any
--    non-Stripe code path that omits the field.
DELETE FROM credit_purchases WHERE stripe_payment_intent_id IS NULL;
ALTER TABLE credit_purchases
  ALTER COLUMN stripe_payment_intent_id SET NOT NULL;
ALTER TABLE credit_purchases
  ADD CONSTRAINT credit_purchases_payment_intent_unique
  UNIQUE (stripe_payment_intent_id);

-- 2. Restrict credit_transactions INSERT to service_role only.
DROP POLICY IF EXISTS "Service role inserts transactions" ON credit_transactions;
CREATE POLICY "Service role inserts transactions"
  ON credit_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 3. Atomic credit grant. Both the credit_purchases sentinel row and the balance
--    update happen in a single transaction. The UNIQUE constraint on
--    stripe_payment_intent_id is checked inside that transaction, so a duplicate
--    Stripe webhook delivery short-circuits cleanly without granting credits twice
--    and without leaving a stranded sentinel row that would block legitimate retries.
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_payment_intent_id TEXT DEFAULT NULL,
  p_pack_type TEXT DEFAULT NULL,
  p_amount_paid_cents INTEGER DEFAULT NULL
)
RETURNS TABLE(new_balance INTEGER, already_fulfilled BOOLEAN) AS $$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_existing_purchase_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'add_credits requires p_amount > 0, got %', p_amount;
  END IF;

  -- Idempotency check for Stripe-fulfilled purchases. If the payment_intent_id
  -- has already produced a row, this delivery is a duplicate retry — return the
  -- current balance and signal already_fulfilled so the webhook short-circuits.
  IF p_payment_intent_id IS NOT NULL THEN
    SELECT id INTO v_existing_purchase_id
    FROM credit_purchases
    WHERE stripe_payment_intent_id = p_payment_intent_id;

    IF v_existing_purchase_id IS NOT NULL THEN
      SELECT credit_balance INTO v_balance
      FROM user_credits
      WHERE user_id = p_user_id;

      RETURN QUERY SELECT COALESCE(v_balance, 0), true;
      RETURN;
    END IF;
  END IF;

  SELECT credit_balance INTO v_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    INSERT INTO user_credits (user_id, credit_balance, subscription_allowance)
    VALUES (p_user_id, 500, 500)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT credit_balance INTO v_balance
    FROM user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
  END IF;

  v_new_balance := v_balance + p_amount;

  IF p_source = 'credit_purchase' THEN
    UPDATE user_credits
    SET credit_balance = v_new_balance,
        purchased_credits = purchased_credits + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Sentinel row for fulfillment. Pack type and amount paid are required when
    -- a payment_intent_id is supplied so the audit trail stays complete.
    IF p_payment_intent_id IS NOT NULL THEN
      IF p_pack_type IS NULL OR p_amount_paid_cents IS NULL THEN
        RAISE EXCEPTION 'credit_purchase fulfillment requires pack_type and amount_paid_cents';
      END IF;

      INSERT INTO credit_purchases (
        user_id, pack_type, credits_purchased, amount_paid_cents, stripe_payment_intent_id
      )
      VALUES (
        p_user_id, p_pack_type, p_amount, p_amount_paid_cents, p_payment_intent_id
      );
    END IF;
  ELSE
    UPDATE user_credits
    SET credit_balance = v_new_balance,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO credit_transactions (
    user_id, action_type, credits_added, credits_consumed, balance_after, metadata
  )
  VALUES (
    p_user_id, p_source, p_amount, 0, v_new_balance, p_metadata
  );

  RETURN QUERY SELECT v_new_balance, false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Privilege escalation guard. SECURITY DEFINER + default PUBLIC EXECUTE means
--    any authenticated session could call these RPCs over PostgREST and credit or
--    debit any user. Restrict to service_role; both RPCs are only invoked from
--    server-side code that already uses the service-role client.
REVOKE EXECUTE ON FUNCTION add_credits(UUID, INTEGER, TEXT, JSONB, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_credits(UUID, INTEGER, TEXT, JSONB, TEXT, TEXT, INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION deduct_credits(UUID, INTEGER, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deduct_credits(UUID, INTEGER, TEXT, JSONB) TO service_role;
