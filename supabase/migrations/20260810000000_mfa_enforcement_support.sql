-- Support for conditional AAL2 enforcement (G-020) and server-side backup codes
-- (R-006). See docs/specs/adr/0012-mfa-enforcement-and-backup-code-recovery.md.
--
-- WHY THIS EXISTS. Measured against a local Supabase: a token carrying
-- `aal: "aal1"` — password verified, TOTP NOT yet satisfied — was accepted by
-- every guarded route, including /api/privacy/export, a full GDPR data export.
-- Nothing in the auth layer inspects assurance level. A user who enrols TOTP
-- therefore gains no protection at all.
--
-- Enforcing this needs one fact per request: does this user have a verified MFA
-- factor? That fact lives in `auth.mfa_factors`, which PostgREST does not
-- expose, so the API layer cannot read it directly. The alternative,
-- auth.admin.mfa.listFactors(), costs an HTTP round-trip to GoTrue on EVERY
-- guarded request.
--
-- Hence a SECURITY DEFINER function: one cheap indexed lookup, alongside the
-- per-request read api-guard already performs for the role.

CREATE OR REPLACE FUNCTION public.user_has_verified_mfa(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
-- pg_temp LAST, deliberately: if it resolved first a caller could shadow
-- auth.mfa_factors with a temporary object and make this return false, which
-- would silently disable MFA enforcement for that session.
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors
    WHERE user_id = p_user_id
      AND status = 'verified'
  );
$$;

-- SECURITY DEFINER + default PUBLIC EXECUTE would let any authenticated session
-- probe whether an arbitrary user has MFA enabled — an account-enumeration
-- oracle. Only server code needs it.
REVOKE EXECUTE ON FUNCTION public.user_has_verified_mfa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_verified_mfa(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- backup_codes: NO RLS POLICIES ARE ADDED HERE, AND THAT IS THE FIX.
--
-- The table has had RLS enabled with zero policies since 20260516000001, so
-- every browser read and write has failed closed. The instinct is to add
-- `authenticated` policies. That is wrong: it would re-open a credential table
-- to the browser and leave code generation — and therefore the entropy — under
-- client control.
--
-- Generation and redemption both move server-side, where service_role bypasses
-- RLS. Deny-all is the correct posture for everyone else. The defect was never
-- the missing policy; it was the browser being the caller.
--
-- What DOES change: the stored hash format. Codes were 32-bit
-- (crypto.randomBytes(4)) hashed with unsalted single-round SHA-256 — GPU-cheap
-- to reverse if this table ever leaked. They are now >=128-bit with a per-code
-- scrypt salt, stored as `scrypt$N$r$p$salt$hash`. Existing rows cannot be
-- verified under the new scheme, which costs nothing: no code has ever been
-- successfully generated, because every INSERT path has been failing since the
-- table was created.
-- ---------------------------------------------------------------------------

DELETE FROM backup_codes;

-- ---------------------------------------------------------------------------
-- Redemption must move from match-by-hash to match-by-id, because per-code
-- salts make the old approach impossible.
--
-- `redeem_backup_code(user_id, code_hash)` did `WHERE code = p_code_hash`. That
-- only works when the hash is deterministic — i.e. unsalted — which is exactly
-- the property being removed. With a per-code salt the server must verify the
-- submitted code against each candidate row in application code, then redeem
-- the specific row that matched.
--
-- Atomicity is preserved and is still the whole point (FND-010): the FOR UPDATE
-- lock serialises concurrent redemptions of the same row, so the second caller
-- blocks, re-reads it as used, and is rejected.
--
-- `user_id = p_user_id` in the WHERE clause is load-bearing, not defensive:
-- without it, knowing a code's row id would let one user redeem another user's
-- code. Service role bypasses RLS, so this predicate is the only thing scoping
-- the row — the FND-030 lesson.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.redeem_backup_code_by_id(
  p_user_id UUID,
  p_code_id UUID
)
RETURNS TABLE(redeemed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code_id UUID;
BEGIN
  SELECT id INTO v_code_id
  FROM backup_codes
  WHERE id = p_code_id
    AND user_id = p_user_id
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
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_backup_code_by_id(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_backup_code_by_id(UUID, UUID) TO service_role;

-- The hash-matching predecessor is dropped rather than left in place. Its only
-- caller is replaced in this same change, and a function that matches on an
-- unsalted digest is precisely the thing someone reaches for later without
-- realising why it was abandoned.
DROP FUNCTION IF EXISTS public.redeem_backup_code(UUID, TEXT);

COMMENT ON TABLE backup_codes IS
  'MFA recovery codes. Server-only: service_role bypasses RLS and there are no '
  'policies by design (ADR-0012 D3). Never expose to the browser. `code` holds '
  'scrypt$N$r$p$salt$hash, never a plaintext or unsalted-digest code.';
