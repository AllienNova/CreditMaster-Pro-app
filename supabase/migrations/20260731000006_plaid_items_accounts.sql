-- Persistence schema for Plaid bank linking (SYSTEMATIC-REVIEW-SYNTHESIS #2/#3/#11)
--
-- PROBLEM:
--   `plaid_items` and `financial_accounts` are queried by src/lib/financial/
--   plaid-service.ts (storeAccessToken, getAccessToken, getAccounts,
--   storeAccount), src/lib/financial/plaid-webhook-handler.ts (item error /
--   consent-expiration updates), and src/lib/credit-builder/credit-builder-
--   service.ts (analyzeCreditMix, analyzeCreditAge) — but neither table has
--   ever existed in any migration. Verified live 2026-07-31: both inserts
--   fail with "relation ... does not exist".
--
--   Effect: `storeAccessToken` throws on every Plaid Link completion, so bank
--   linking cannot complete at all. Downstream, `financial-aggregation-
--   service.ts.fetchAccounts()` queried a THIRD name — `plaid_accounts` —
--   which also never existed; its `{error}` was swallowed into
--   `getEmptyAccounts()`, so every user's net worth silently read as $0
--   (feeding `/api/financial/health-score` with a fabricated-zero profile
--   instead of an error).
--
-- CONSOLIDATION DECISION (financial_accounts vs plaid_accounts):
--   `financial_accounts` is canonical. plaid-service.ts (the writer) and
--   credit-builder-service.ts already agree on `financial_accounts` across 5
--   call sites and 5 test files (plaid-service.test.ts, plaid-service.idor.
--   test.ts, credit-builder-service.test.ts, financial-chat-engine.test.ts's
--   regression-guard comment). `plaid_accounts` had exactly one caller
--   (financial-aggregation-service.ts:385) and zero test assertions of that
--   name. Repointing the one minority caller is far lower risk than renaming
--   the concept out from under 5 already-test-asserted call sites, and
--   `financial_accounts` is also the more accurate name going forward: this
--   table already serves credit-mix/credit-age analysis in addition to pure
--   Plaid sync, so a vendor-neutral name fits its actual usage better than
--   a Plaid-specific one. financial-aggregation-service.ts is repointed to
--   `financial_accounts` in the same commit as this migration.
--
-- SCHEMA DERIVATION: every column below is read from an actual .from() call
-- or upsert payload in plaid-service.ts, plaid-webhook-handler.ts, or
-- credit-builder-service.ts — see the column-by-column comments. No Plaid
-- API field is introduced that the code does not already reference.
--
-- SECURITY (access token is a bank credential — see task security note):
--   `plaid_items` holds `access_token`, which grants ongoing read access to
--   the user's bank via Plaid. It is service_role-only: RLS is enabled with
--   ZERO policies for anon/authenticated (default-deny, not merely "no grant"
--   — this survives a future accidental GRANT to authenticated, since RLS
--   still blocks every row with no matching policy), and only `service_role`
--   receives table-level GRANTs. There is no legitimate end-user read path
--   for this table (unlike adverse_action_notices, which users must see for
--   FCRA disclosure) — plaid-service.ts is repointed to the existing
--   `supabaseAdmin` service-role client (src/lib/supabase/admin.ts, already
--   used by ~125 call sites) for its plaid_items/financial_accounts calls in
--   the same commit, matching the pattern that already makes
--   adverse_action_notices' service_role-only policies actually enforceable
--   (fcra-adverse-action.ts also authenticates as service_role).
--
--   `financial_accounts` holds balances/institution metadata, not a
--   credential — `authenticated` gets SELECT-only on own rows (defense in
--   depth, matching the `transactions` table's own-row-SELECT convention).
--   No authenticated INSERT/UPDATE/DELETE policy: accounts are sync-derived
--   from Plaid, never user-editable — an authenticated write policy would
--   let a client forge its own balance via a raw REST call, bypassing Plaid
--   entirely.
--
-- GRANTS ARE NOT OPTIONAL HERE: verified live 2026-07-31 via
-- has_table_privilege() that this database does NOT auto-grant SELECT/
-- INSERT/UPDATE/DELETE to anon/authenticated/service_role on new tables —
-- e.g. `transactions`, `profiles`, and `debt_accounts` all show FALSE for
-- every role except `postgres`. This matches the established (if
-- inconsistently applied) convention already in this repo: 20260107000000_
-- onboarding_progress.sql and 20260115_create_financial_chat_tables.sql both
-- carry explicit `GRANT ... TO authenticated`, and 20250203_user_settings.sql
-- / 20260518000003_notification_preferences.sql / 20260518000001_
-- breach_notifications.sql all carry explicit `GRANT ... TO service_role`.
-- Schema-level USAGE on public is already granted to all three roles
-- (verified via has_schema_privilege) — only per-table grants are missing.
-- Omitting the GRANT statements below would leave both tables exactly as
-- inaccessible as they are today, just for a different reason (permission
-- denied instead of relation does not exist) — the same defect class this
-- migration exists to close.

-- ============================================================================
-- plaid_items — one row per linked Plaid Item (a single bank connection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS plaid_items (
  -- Plaid's own Item ID is the natural key: every lookup in plaid-service.ts
  -- and plaid-webhook-handler.ts filters or looks up by item_id (sometimes
  -- combined with user_id for IDOR protection — FND-037).
  item_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The credential itself (plaid-service.ts storeAccessToken/getAccessToken).
  -- Never selected by any authenticated-role query; never logged (see the
  -- task's explicit "do not log the token" instruction — plaid-service.ts
  -- and plaid-webhook-handler.ts already never log it, this migration does
  -- not change that).
  access_token TEXT NOT NULL,
  -- Written by plaid-webhook-handler.ts handleItemError() on an ITEM_ERROR
  -- webhook event.
  error_type TEXT,
  error_code TEXT,
  error_message TEXT,
  -- Written by plaid-webhook-handler.ts handlePendingExpiration() on a
  -- PENDING_EXPIRATION webhook event (Plaid consent nearing expiry).
  consent_expiration_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Explicitly set by both plaid-webhook-handler.ts update paths on every
  -- write; no trigger needed since the app already maintains it.
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);

ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;

-- Deliberately NO CREATE POLICY for anon/authenticated. ENABLE ROW LEVEL
-- SECURITY with zero policies default-denies every role except service_role
-- (which bypasses RLS via rolbypassrls). This is intentionally stricter than
-- "just omit the GRANT": it also blocks a future accidental
-- `GRANT SELECT ... TO authenticated` from exposing the access_token, since
-- RLS would still filter out every row with no matching policy.
GRANT SELECT, INSERT, UPDATE, DELETE ON plaid_items TO service_role;

-- ============================================================================
-- financial_accounts — synced Plaid account snapshots (balances, metadata)
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_accounts (
  -- App-generated composite key `${itemId}_${plaidAccountId}`
  -- (plaid-service.ts syncAccounts/storeAccount) — TEXT, not UUID, to match
  -- what the application actually writes.
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES plaid_items(item_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Plaid's raw account_id (distinct from the composite `id` above). Matches
  -- transactions.account_id's type (TEXT) and indexing convention; no FK to
  -- mirror transactions.account_id, which also carries no FK to this table —
  -- kept symmetric rather than introducing a stricter constraint on only one
  -- side of an existing, already-established relationship.
  account_id TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  account_name TEXT,
  -- Plaid's raw account.type ("depository"/"credit"/"loan"/"investment"/
  -- "other") — intentionally unconstrained TEXT. financial-aggregation-
  -- service.ts's mapAccountFromDb() independently normalizes into its own
  -- ("checking"/"savings"/"credit"/"investment"/"loan"/"other") set at the
  -- application layer; a DB CHECK constraint on either value set would
  -- reject the other caller's real writes.
  account_type TEXT NOT NULL,
  account_subtype TEXT,
  mask TEXT,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(15,2),
  -- Nullable, not yet written by any caller (Plaid's Liabilities product
  -- would populate these for credit/loan accounts) — included because
  -- financial-aggregation-service.ts's mapAccountFromDb() already reads
  -- them; a SELECT * omitting these columns would leave that reader
  -- silently getting `undefined` instead of an honest "not captured yet".
  credit_limit NUMERIC(15,2),
  interest_rate NUMERIC(6,3),
  currency TEXT NOT NULL DEFAULT 'USD',
  -- Nullable, read by credit-builder-service.ts analyzeCreditAge() but not
  -- currently written by any sync path — same "reader already expects this
  -- column" rationale as credit_limit/interest_rate above.
  opened_date TIMESTAMPTZ,
  last_synced TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_user_id ON financial_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_item_id ON financial_accounts(item_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_account_id ON financial_accounts(account_id);

ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own financial accounts" ON financial_accounts;
CREATE POLICY "Users read own financial accounts"
  ON financial_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- No authenticated INSERT/UPDATE/DELETE policy — see header comment: accounts
-- are sync-derived, never user-editable, to prevent a forged client-side
-- balance write.
DROP POLICY IF EXISTS "Service role manages financial accounts" ON financial_accounts;
CREATE POLICY "Service role manages financial accounts"
  ON financial_accounts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON financial_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_accounts TO service_role;
