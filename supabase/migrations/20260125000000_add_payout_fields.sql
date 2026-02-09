-- Add Payout Fields to Profiles Table
-- Migration: 20260125000000_add_payout_fields
-- Created: 2025-01-25
-- Description: Adds payout-related fields to profiles table for affiliate/partner payouts

-- ============================================================================
-- ADD PAYOUT FIELDS TO PROFILES
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS payout_method TEXT CHECK (payout_method IN ('stripe_connect', 'bank_transfer', 'open_banking', 'paypal', 'check')) DEFAULT 'bank_transfer';

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bank_details JSONB;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS paypal_email TEXT;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_id ON profiles(stripe_connect_id) WHERE stripe_connect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_payout_method ON profiles(payout_method);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN profiles.payout_method IS 'Preferred payout method: stripe_connect, bank_transfer, open_banking, paypal, check';
COMMENT ON COLUMN profiles.stripe_connect_id IS 'Stripe Connect account ID for direct payouts';
COMMENT ON COLUMN profiles.bank_details IS 'Bank account details for bank transfer payouts (encrypted JSON)';
COMMENT ON COLUMN profiles.paypal_email IS 'PayPal email address for PayPal payouts';
