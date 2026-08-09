-- WebAuthn (Passkey) Support Tables
-- Migration: 20260204000000_webauthn_tables.sql
-- Description: Creates tables for storing WebAuthn credentials and challenges

-- ============================================================================
-- WEBAUTHN CREDENTIALS TABLE
-- ============================================================================
-- Stores registered passkeys/security keys for users

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Passkey',
  type TEXT NOT NULL CHECK (type IN ('platform', 'security_key')),
  transports TEXT[] DEFAULT ARRAY['internal', 'hybrid'],
  counter INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT webauthn_credentials_user_id_credential_id_unique UNIQUE (user_id, credential_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);

-- Enable RLS
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own credentials
DROP POLICY IF EXISTS "Users can view own webauthn credentials" ON webauthn_credentials;
CREATE POLICY "Users can view own webauthn credentials"
  ON webauthn_credentials FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own webauthn credentials" ON webauthn_credentials;
CREATE POLICY "Users can insert own webauthn credentials"
  ON webauthn_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own webauthn credentials" ON webauthn_credentials;
CREATE POLICY "Users can update own webauthn credentials"
  ON webauthn_credentials FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own webauthn credentials" ON webauthn_credentials;
CREATE POLICY "Users can delete own webauthn credentials"
  ON webauthn_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- WEBAUTHN CHALLENGES TABLE
-- ============================================================================
-- Temporary storage for registration and authentication challenges

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Can be actual user_id or session_id for anonymous auth
  challenge TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  credential_name TEXT,
  authenticator_type TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT webauthn_challenges_user_type_unique UNIQUE (user_id, type)
);

-- Create index for cleanup of expired challenges
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at ON webauthn_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge ON webauthn_challenges(challenge);

-- Enable RLS
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations (challenges are short-lived and validated server-side)
DROP POLICY IF EXISTS "Allow all operations on webauthn challenges" ON webauthn_challenges;
CREATE POLICY "Allow all operations on webauthn challenges"
  ON webauthn_challenges FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================
-- Automatically removes expired challenges

CREATE OR REPLACE FUNCTION cleanup_expired_webauthn_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM webauthn_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- OPTIONAL: ADD EMAIL COLUMN TO PROFILES IF NOT EXISTS
-- ============================================================================
-- This helps with passkey authentication lookup

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
  END IF;
END
$$;

-- ============================================================================
-- TRIGGER TO SYNC EMAIL FROM AUTH.USERS TO PROFILES
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_user_email_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_email_update'
  ) THEN
    CREATE TRIGGER on_auth_user_email_update
    AFTER INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_email_to_profile();
  END IF;
END
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE webauthn_credentials IS 'Stores WebAuthn/Passkey credentials for passwordless authentication';
COMMENT ON TABLE webauthn_challenges IS 'Temporary storage for WebAuthn registration and authentication challenges';
COMMENT ON COLUMN webauthn_credentials.credential_id IS 'Base64url-encoded credential ID from the authenticator';
COMMENT ON COLUMN webauthn_credentials.public_key IS 'Base64url-encoded attestation object containing the public key';
COMMENT ON COLUMN webauthn_credentials.type IS 'Type of authenticator: platform (built-in) or security_key (external)';
COMMENT ON COLUMN webauthn_credentials.transports IS 'Available transports for this credential (internal, hybrid, usb, ble, nfc)';
COMMENT ON COLUMN webauthn_credentials.counter IS 'Signature counter for replay attack prevention';
