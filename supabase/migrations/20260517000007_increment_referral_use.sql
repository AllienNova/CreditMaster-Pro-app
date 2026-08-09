-- increment_referral_use: atomic RPC for referral code application (FND-027).
--
-- Replaces the non-atomic read-modify-write in affiliate-service.ts applyReferralCode.
-- A single UPDATE...RETURNING cannot distinguish WHY it matched zero rows — cap vs
-- self-referral vs invalid vs expired all look identical. The plpgsql function
-- classifies and returns a typed status before conditionally incrementing.
--
-- Atomicity: SELECT...FOR UPDATE row-locks the target row so concurrent callers
-- serialize on the same code. Only the first caller to find uses_count < max_uses
-- wins; all others get cap_reached.
--
-- NULL cap: max_uses IS NOT NULL AND uses_count >= max_uses.
-- A NULL max_uses means unlimited — NULL comparisons yield NULL (not FALSE),
-- which would silently reject every uncapped code if written as uses_count >= max_uses.
--
-- Follows the d64e8d5 template:
-- REVOKE EXECUTE ... FROM PUBLIC; GRANT EXECUTE ... TO service_role.

create or replace function public.increment_referral_use(
  p_code    text,
  p_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.referral_codes%rowtype;
  v_status text;
begin
  -- Lock the row for the duration of this transaction.
  -- This serializes concurrent apply calls on the same code.
  select * into v_row
  from public.referral_codes
  where code = p_code
  for update;

  -- No matching row, or code is inactive, or code has expired.
  if not found
     or not v_row.is_active
     or (v_row.expires_at is not null and v_row.expires_at <= now())
  then
    return 'invalid';
  end if;

  -- Self-referral: caller is the code owner.
  if v_row.user_id = p_user_id then
    return 'self_referral';
  end if;

  -- Cap check: only apply when max_uses is NULL (unlimited) or not yet reached.
  -- IMPORTANT: max_uses IS NOT NULL guard is mandatory — NULL >= anything yields NULL,
  -- which is falsy, so a NULL cap would incorrectly fall through to cap_reached.
  if v_row.max_uses is not null and v_row.uses_count >= v_row.max_uses then
    return 'cap_reached';
  end if;

  -- Atomically increment; the row lock prevents concurrent over-increment.
  update public.referral_codes
  set uses_count = uses_count + 1
  where id = v_row.id;

  return 'applied';
end;
$$;

revoke execute on function public.increment_referral_use(text, uuid)
  from public, anon, authenticated;
grant execute on function public.increment_referral_use(text, uuid)
  to service_role;
