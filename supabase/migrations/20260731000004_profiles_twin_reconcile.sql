-- ============================================================================
-- `profiles` twin reconciliation — closes a LIVE bug in GET /api/profile.
--
-- `profiles` is declared by BOTH `001_initial_schema.sql` and
-- `20251217000001_cpfi_financial_suite_schema.sql`. 001 sorts first, so ITS
-- shape wins and three columns the later definition declares never exist:
-- avatar_url, onboarding_completed, preferences.
--
-- LIVE IMPACT (reproduced against the running DB):
--   `src/app/api/profile/route.ts:21` selects
--     id, full_name, avatar_url, phone, address, created_at, role
--   which fails outright:
--     ERROR: column "avatar_url" does not exist
--   The route has therefore been returning an error, not a profile. An earlier
--   M0 migration added phone/address/city/state/zip/date_of_birth for this same
--   route but missed avatar_url, so the bug survived that fix.
--
-- avatar_url is referenced in 14 non-test places (profile route, admin users
-- page, the admin users API's Zod schema), so the app clearly expects it to
-- exist; adding it is the correct reconciliation rather than stripping it from
-- the queries.
--
-- Additive and idempotent per ADR-0001 — safe on a populated database.
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

COMMENT ON COLUMN profiles.avatar_url IS
  'Profile image URL. Added by twin reconciliation: declared only in the '
  'losing 20251217000001 definition, so it never existed and GET /api/profile '
  'failed with "column avatar_url does not exist".';
