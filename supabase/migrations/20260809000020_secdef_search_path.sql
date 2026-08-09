-- Pin search_path on every SECURITY DEFINER function in `public`.
--
-- FOUND BY RUNNING THE APP, not by reading. A smoke test against a local
-- Supabase could not create a user at all:
--
--   POST /auth/v1/admin/users -> 500
--   {"error_code":"unexpected_failure","msg":"Database error creating new user"}
--   postgres: supabase_auth_admin@postgres ERROR:
--     relation "profiles" does not exist at character 8
--
-- SIGNUP WAS BROKEN. `sync_user_email_to_profile()` runs `UPDATE profiles ...`
-- unqualified. GoTrue executes it as `supabase_auth_admin`, whose search_path
-- does not include `public`, so the relation could not be resolved. The same
-- statement succeeds when run as `postgres` — which is exactly why every test
-- and every psql check in this repo passed while real signup did not. Unit
-- tests mock the database; the direct psql probe I ran first also passed, and
-- was misleading for the same reason.
--
-- THE SECOND, LARGER PROBLEM. All 16 SECURITY DEFINER functions in `public`
-- had NO pinned search_path. That is a privilege-escalation vector
-- independent of the resolution bug: a SECURITY DEFINER function runs with its
-- OWNER's rights, and if it resolves an unqualified name through the CALLER's
-- search_path, a caller who can create objects in an earlier schema can shadow
-- a table or operator and have the definer execute it. Postgres documents
-- this directly ("Writing SECURITY DEFINER Functions Safely"). The affected
-- set includes the money and auth paths: add_credits, deduct_credits,
-- award_xp, redeem_backup_code.
--
-- WHY A LOOP RATHER THAN 16 NAMED ALTERs. An explicit list is auditable but
-- can miss one, and missing one is the whole failure mode. This pins every
-- SECURITY DEFINER function in `public` that has no proconfig, so it cannot
-- skip a function someone added. It is idempotent: a function that already
-- pins search_path (delete_user_data_cascade does) is left untouched.
--
-- `pg_temp` is placed LAST deliberately. If it resolved first, a caller could
-- create a temporary object that shadows a real one — the very attack this
-- migration closes.

DO $$
DECLARE
  fn RECORD;
  n  INTEGER := 0;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.prosecdef              -- SECURITY DEFINER only
      AND p.proconfig IS NULL      -- and not already pinned
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn.sig);
    n := n + 1;
  END LOOP;

  RAISE NOTICE 'pinned search_path on % SECURITY DEFINER function(s)', n;
END
$$;

-- Belt and braces for the function that was actually failing: qualify the
-- relation too, so it no longer depends on search_path at all. The pin above
-- is the general fix; this one is the specific bug.
CREATE OR REPLACE FUNCTION public.sync_user_email_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Same treatment for the other function that referenced `profiles`
-- unqualified. It is not on the signup path, so it was not failing yet — it
-- would have failed the first time it ran under a role without `public` in
-- search_path.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'complete_onboarding'
  ) THEN
    -- search_path is pinned by the loop above; qualifying the body as well
    -- would require reproducing it verbatim, which risks transcription error
    -- for no additional guarantee once search_path is fixed.
    RAISE NOTICE 'complete_onboarding: search_path pinned by the loop above';
  END IF;
END
$$;
