-- TASK-BNK-01 + BNK-02 — generalise plaid_items into a provider-tagged
-- bank_connections model, and encrypt the credential at rest.
--
-- WHY ONE TABLE AND NOT TWO. TrueLayer joins Plaid as a second aggregator
-- (ADR-0011). The alternative was parallel `truelayer_items` /
-- `truelayer_accounts` tables unioned at read time. This codebase has been
-- damaged repeatedly by exactly that shape — two payout rails (FND-026), two
-- Supabase clients, two SQL schema parsers — each of which drifted until the
-- drift became the defect. One table with a `provider` discriminator means
-- every existing reader keeps working and there is one place to fix.
--
-- WHAT WAS MISSING. `banking-aggregator.ts` declares a `ProviderConnection`
-- interface but persists NOTHING — it contains zero `.from()` calls. Bank
-- aggregation was unbuilt at the storage layer, not merely unwired.
-- `financial_accounts` likewise has no `provider` column: every row is
-- implicitly Plaid.
--
-- ENCRYPTION AT REST, AND WHAT IT IS NOT. access_token is a live bank
-- credential. It was stored as plaintext TEXT, protected by RLS-with-zero-
-- policies plus service_role-only GRANTs (20260731000006). That access control
-- stays exactly as it was; encryption is added underneath it.
--
--   This does NOT defend against a full server compromise. An attacker holding
--   the application environment holds both the service-role key and the
--   encryption key, and can simply call the accessor below. What it buys is
--   protection against DB-ONLY exposure: a leaked backup, a read replica, or a
--   SQL-injection path that yields rows but not environment. That is a real
--   and common exposure, and it is the honest extent of the claim.
--
-- The key never lives in the database. It is passed per call from
-- BANK_TOKEN_ENCRYPTION_KEY (Doppler). Supabase's client sends RPC arguments
-- as bound parameters rather than inlining them into SQL text, so the key does
-- not land in pg_stat_statements as a literal.
--
-- AAD BINDING. The ciphertext is bound to (id, provider) via pgp_sym_encrypt's
-- payload, so a row copied over another row's ciphertext fails to decrypt into
-- something usable rather than silently handing back the wrong bank's token.
--
-- ERASURE: REGISTERED, NOT EXCLUDED. Opposite of the payments ledgers, and
-- deliberately so. A financial record must survive the person; a live bank
-- credential must NOT. plaid_items was already registered (cascade array line
-- 267) and bank_connections replaces it there in this commit.
--
-- NO DATA MIGRATION: there are no live users, so there are no tokens to
-- re-encrypt. A backfill would otherwise be required here.
--
-- DRIFT TOLERANCE per LAUNCH_CHECKLIST Gate C: every statement is guarded.

-- pgcrypto is already installed by 20250204000000, and on Supabase it lands in
-- the `extensions` schema rather than `public`. Both accessors below pin
-- search_path (SECURITY DEFINER must, or the caller could redirect a function
-- call), so every pgcrypto call is schema-qualified. Widening search_path to
-- include `extensions` would work too but is the weaker habit for a definer
-- function. Verified live: `select extnamespace::regnamespace from pg_extension
-- where extname='pgcrypto'` -> extensions.
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. plaid_items -> bank_connections
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.plaid_items') IS NOT NULL
     AND to_regclass('public.bank_connections') IS NULL THEN
    ALTER TABLE public.plaid_items RENAME TO bank_connections;
  END IF;
END
$$;

-- Create from scratch when the rename source never existed (fresh database, or
-- a live schema that drifted). Column set is the union of what plaid-service
-- and plaid-webhook-handler actually read and write.
CREATE TABLE IF NOT EXISTS public.bank_connections (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id                 TEXT NOT NULL,
  access_token            TEXT,
  consent_expiration_time TIMESTAMPTZ,
  error_type              TEXT,
  error_code              TEXT,
  error_message           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Provider discriminator + institution metadata
-- ---------------------------------------------------------------------------

ALTER TABLE public.bank_connections
  -- Surrogate key. plaid_items used `item_id TEXT PRIMARY KEY`, a natural key
  -- that stops being unique the moment a second provider exists: the real
  -- identity is now (provider, item_id). A stable surrogate is also what
  -- financial_accounts.connection_id and the token accessors reference, and
  -- what makes the ciphertext binding in step 3 possible.
  ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'plaid',
  ADD COLUMN IF NOT EXISTS institution_id TEXT,
  ADD COLUMN IF NOT EXISTS institution_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  -- The credential, encrypted. The plaintext `access_token` column is dropped
  -- in step 4 once nothing reads it.
  ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA;

-- Move the primary key from item_id to the surrogate.
--
-- `financial_accounts.item_id` carries an FK onto plaid_items(item_id)
-- (20260731000006:129), and Postgres will not drop a primary key that an FK
-- depends on:
--   cannot drop constraint plaid_items_pkey on table bank_connections because
--   other objects depend on it (SQLSTATE 2BP01)
--
-- So the dependent FK goes first. It is not recreated against (provider,
-- item_id): a single-column FK cannot reference a composite key, and the
-- account->connection relationship is now expressed by connection_id, added in
-- step 5. item_id stays on financial_accounts as the provider's own reference,
-- no longer as a foreign key.
--
-- Every step is guarded so this is also a no-op on a database created fresh
-- from the CREATE TABLE above, where id is already the primary key.
DO $$
DECLARE
  v_pk  TEXT;
  v_fk  RECORD;
BEGIN
  SELECT conname INTO v_pk
  FROM pg_constraint
  WHERE conrelid = 'public.bank_connections'::regclass AND contype = 'p';

  IF v_pk IS NOT NULL AND v_pk <> 'bank_connections_pkey' THEN
    -- Drop every FK pointing at the key we are about to remove. Enumerated
    -- rather than named so a second dependent added later cannot silently
    -- break this migration.
    FOR v_fk IN
      SELECT c.conname, c.conrelid::regclass AS tbl
      FROM pg_constraint c
      WHERE c.contype = 'f'
        AND c.confrelid = 'public.bank_connections'::regclass
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', v_fk.tbl, v_fk.conname);
    END LOOP;

    EXECUTE format('ALTER TABLE public.bank_connections DROP CONSTRAINT %I', v_pk);
    v_pk := NULL;
  END IF;

  IF v_pk IS NULL THEN
    ALTER TABLE public.bank_connections ADD CONSTRAINT bank_connections_pkey PRIMARY KEY (id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bank_connections_provider_check'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD CONSTRAINT bank_connections_provider_check
      CHECK (provider IN ('plaid', 'truelayer'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bank_connections_status_check'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD CONSTRAINT bank_connections_status_check
      CHECK (status IN ('active', 'requires_reauth', 'revoked', 'error'));
  END IF;
END
$$;

-- One connection per (provider, item). Plaid reuses item_id; TrueLayer uses its
-- own connection id. Scoping by provider keeps them from colliding.
CREATE UNIQUE INDEX IF NOT EXISTS bank_connections_provider_item_key
  ON public.bank_connections (provider, item_id);

CREATE INDEX IF NOT EXISTS bank_connections_user_id_idx
  ON public.bank_connections (user_id);

-- ---------------------------------------------------------------------------
-- 3. Encrypted-credential accessors
--
-- SECURITY DEFINER so the functions can touch a table that no role but
-- service_role may read; REVOKE FROM PUBLIC so only service_role may call
-- them. Without the REVOKE, SECURITY DEFINER would make the credential
-- readable by anyone who can reach the database — strictly worse than the
-- plaintext column it replaces.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_bank_connection_token(
  p_connection_id UUID,
  p_token         TEXT,
  p_key           TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider TEXT;
BEGIN
  IF p_key IS NULL OR length(p_key) < 32 THEN
    -- Refuse a weak or absent key rather than encrypting with one. A short key
    -- here would look encrypted while being trivially breakable.
    RAISE EXCEPTION 'set_bank_connection_token: encryption key missing or too short';
  END IF;

  SELECT provider INTO v_provider
  FROM public.bank_connections WHERE id = p_connection_id;

  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'set_bank_connection_token: no connection %', p_connection_id;
  END IF;

  UPDATE public.bank_connections
  SET access_token_encrypted =
        extensions.pgp_sym_encrypt(
          -- Bind the ciphertext to the row it belongs to. Lifting this
          -- ciphertext onto another row yields a mismatched prefix on decrypt
          -- rather than a usable token for the wrong bank.
          p_connection_id::text || '|' || v_provider || '|' || p_token,
          p_key
        ),
      updated_at = now()
  WHERE id = p_connection_id;
END
$$;

CREATE OR REPLACE FUNCTION public.get_bank_connection_token(
  p_connection_id UUID,
  p_key           TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plain    TEXT;
  v_provider TEXT;
  v_prefix   TEXT;
BEGIN
  IF p_key IS NULL OR length(p_key) < 32 THEN
    RAISE EXCEPTION 'get_bank_connection_token: encryption key missing or too short';
  END IF;

  SELECT provider,
         extensions.pgp_sym_decrypt(access_token_encrypted, p_key)
    INTO v_provider, v_plain
  FROM public.bank_connections
  WHERE id = p_connection_id;

  IF v_plain IS NULL THEN
    RETURN NULL;
  END IF;

  v_prefix := p_connection_id::text || '|' || v_provider || '|';

  -- A ciphertext that decrypts but does not carry this row's binding was moved
  -- here from another row. Fail loudly: returning it would hand one user's
  -- bank credential to another.
  IF position(v_prefix in v_plain) <> 1 THEN
    RAISE EXCEPTION 'get_bank_connection_token: ciphertext binding mismatch for %', p_connection_id;
  END IF;

  RETURN substr(v_plain, length(v_prefix) + 1);
END
$$;

REVOKE ALL ON FUNCTION public.set_bank_connection_token(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_bank_connection_token(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_bank_connection_token(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_bank_connection_token(UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Retire the plaintext column
--
-- Safe because there are no live users and therefore no tokens to migrate. On
-- a database that somehow held rows, this would need a backfill through
-- set_bank_connection_token() first — which is why it is guarded rather than
-- unconditional.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'bank_connections'
      AND column_name  = 'access_token'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.bank_connections WHERE access_token IS NOT NULL
  ) THEN
    ALTER TABLE public.bank_connections DROP COLUMN access_token;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 5. financial_accounts becomes provider-aware
-- ---------------------------------------------------------------------------

ALTER TABLE public.financial_accounts
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'plaid',
  ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.bank_connections(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_accounts_provider_check'
  ) THEN
    ALTER TABLE public.financial_accounts
      ADD CONSTRAINT financial_accounts_provider_check
      CHECK (provider IN ('plaid', 'truelayer'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS financial_accounts_connection_id_idx
  ON public.financial_accounts (connection_id);

-- ---------------------------------------------------------------------------
-- 6. Access control — unchanged in kind from 20260731000006
--
-- RLS enabled with ZERO policies for anon/authenticated. This is default-deny,
-- not merely "no grant": it survives a future accidental GRANT, because RLS
-- still blocks every row that no policy admits. There is no legitimate
-- end-user read path for a bank credential.
-- ---------------------------------------------------------------------------

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.bank_connections FROM PUBLIC;
REVOKE ALL ON public.bank_connections FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_connections TO service_role;

COMMENT ON TABLE public.bank_connections IS
  'Bank aggregator connections, provider-tagged (plaid | truelayer). Generalised from plaid_items in 20260801000020 (ADR-0011). The credential lives in access_token_encrypted and is reachable ONLY via get_bank_connection_token(); RLS is enabled with zero policies so no end user can read this table at all. REGISTERED for GDPR erasure — a live bank credential must not survive the person, unlike the financial ledgers which are pseudonymised.';

COMMENT ON COLUMN public.bank_connections.access_token_encrypted IS
  'pgp_sym_encrypt of "<id>|<provider>|<token>", key supplied per call from BANK_TOKEN_ENCRYPTION_KEY (never stored in the database). The id|provider prefix binds the ciphertext to its row so it cannot be lifted onto another. Protects against DB-only exposure — a backup or replica leak — NOT against a compromised application environment.';
