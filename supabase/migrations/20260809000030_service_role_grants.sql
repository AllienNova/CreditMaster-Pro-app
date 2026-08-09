-- Grant service_role access to the public schema.
--
-- FOUND BY RUNNING THE APP. GET /api/notifications returned 500. The route
-- swallowed the cause (`catch (_error) { void _error; }`), so the real error
-- only surfaced by replaying the query through PostgREST with the service key:
--
--   {"code":"42501","message":"permission denied for table notifications",
--    "hint":"Grant the required privileges to the current role with:
--            GRANT SELECT ON public.notifications TO service_role;"}
--
-- 163 relations in `public` were unreadable by service_role. Spot-checked
-- live: budgets 403, notifications 403, bills 403 — while financial_goals,
-- payments and bank_connections returned 200 because 25 earlier migrations
-- happened to grant per-table.
--
-- WHY IT HAPPENED. Supabase ships ALTER DEFAULT PRIVILEGES granting anon,
-- authenticated and service_role on objects created by `supabase_admin`.
-- Migrations run as `postgres`, so nothing they create inherits that default.
-- Every table added by a migration since has been invisible to service_role
-- unless someone remembered an explicit GRANT.
--
-- WHY IT WAS INVISIBLE. Unit tests mock the Supabase client, so a missing
-- GRANT cannot fail them — the same blind spot as the phantom-table class,
-- one layer down: correct code, correct client, correct table, no privilege.
-- This session converted 63 files to the service-role client on the
-- assumption that service_role could read these tables. It could not.
--
-- SECURITY POSTURE IS UNCHANGED. service_role is the trusted server-side key;
-- it already bypasses RLS by design, and this is Supabase's own default for
-- the schema. The boundary that matters — never shipping the service key to a
-- browser — is untouched. Nothing here grants anon or authenticated anything,
-- and the deliberate REVOKEs on credential tables (bank_connections) only ever
-- targeted anon/authenticated, so they are preserved.

-- Existing objects.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Future objects, so the next migration does not reintroduce the gap. Set for
-- both roles that create objects here: `postgres` runs migrations locally and
-- via the CLI, `supabase_admin` owns the platform-managed path.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

-- NOT set for supabase_admin: `postgres` is not a member of that role, so the
-- statement fails outright with "permission denied to change default
-- privileges (42501)" and takes the whole migration with it. Supabase's
-- platform already installs those defaults for objects supabase_admin creates;
-- the gap this migration closes is specifically objects created by `postgres`,
-- which is what runs migrations.

-- Re-assert the credential table's deny for end-user roles. The blanket GRANT
-- above touches service_role only, but this table is the one place where a
-- mistake is unrecoverable — a live bank token — so its posture is restated
-- rather than assumed. RLS with zero policies still blocks every row for
-- anon/authenticated regardless of grants; this makes the intent explicit.
DO $$
BEGIN
  IF to_regclass('public.bank_connections') IS NOT NULL THEN
    REVOKE ALL ON public.bank_connections FROM anon, authenticated;
  END IF;
END
$$;
