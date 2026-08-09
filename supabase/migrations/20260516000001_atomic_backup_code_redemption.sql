-- Atomic backup-code (MFA recovery code) redemption
--
-- Addresses FND-010: BackupCodesService.verifyBackupCode performed a
-- check-then-update — SELECT the unused row, then UPDATE it as used in a
-- separate statement. Two concurrent redemptions of the SAME code both pass
-- the SELECT before either UPDATE lands, so a single code can be consumed
-- twice (TOCTOU race defeating single-use semantics).
--
-- Fix: redeem the code inside a single PL/pgSQL transaction that takes a
-- FOR UPDATE row lock on the matching unused code. The second concurrent
-- caller blocks on the lock, then re-reads the row as already used and is
-- rejected. Mirrors the atomic-RPC template in
-- 20260501000000_credit_purchase_idempotency.sql (add_credits / FOR UPDATE).

-- 1. Ensure the backup_codes table exists. BackupCodesService queries this
--    table but no prior migration created it; create idempotently so the
--    RPC below has a stable schema to operate on.
CREATE TABLE IF NOT EXISTS backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backup_codes_user_code
  ON backup_codes (user_id, code);

ALTER TABLE backup_codes ENABLE ROW LEVEL SECURITY;

-- 2. Atomic redemption. The FOR UPDATE lock serializes concurrent callers:
--    the first locks the unused row and flips it to used; the second blocks,
--    then finds no unused row matching the code and returns redeemed = false.
CREATE OR REPLACE FUNCTION redeem_backup_code(
  p_user_id UUID,
  p_code_hash TEXT
)
RETURNS TABLE(redeemed BOOLEAN) AS $$
DECLARE
  v_code_id UUID;
BEGIN
  SELECT id INTO v_code_id
  FROM backup_codes
  WHERE user_id = p_user_id
    AND code = p_code_hash
    AND used = FALSE
  FOR UPDATE;

  IF v_code_id IS NULL THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;

  UPDATE backup_codes
  SET used = TRUE,
      used_at = now()
  WHERE id = v_code_id;

  RETURN QUERY SELECT true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Privilege guard. SECURITY DEFINER + default PUBLIC EXECUTE would let any
--    authenticated session redeem codes over PostgREST. Restrict to
--    service_role; the RPC is only invoked from server-side service code.
REVOKE EXECUTE ON FUNCTION redeem_backup_code(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_backup_code(UUID, TEXT) TO service_role;
