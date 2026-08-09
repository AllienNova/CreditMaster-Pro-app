-- affiliate_partners + commission_rules: schema-of-record for the two tables
-- commission-calculator.ts has always queried but that have never had a
-- migration. Their absence is a LIVE MONEY BUG: every affiliate conversion is
-- recorded with $0 commission.
--
-- Bug chain (verified live against the pre-migration DB):
--   POST /api/affiliate/webhooks -> commissionCalculator.calculateCommission()
--   -> getPartner() -> .from("affiliate_partners") -> PostgREST 404 (relation
--   does not exist) -> commission-calculator.ts:408 `if (error) return null`
--   -> commission-calculator.ts:88 `if (!partner) return 0` -> the 0 is
--   persisted to revenue_events.commission_amount_cents and the webhook
--   returns 200 {"success": true}. commission_rules compounds it: absent
--   getCommissionRule() special-cases PGRST116 (no matching rule -- a
--   legitimate business case) but the pre-fix code then ALSO swallows every
--   OTHER error (including "table does not exist") into the same `return
--   null`, so a broken lookup is indistinguishable from "no custom rule".
--   See commission-calculator.ts's companion fix in this same commit, which
--   makes both lookups throw on a real error instead of returning 0/null.
--
-- Column derivation (verbatim from the code that reads/writes these tables --
-- no invented columns, none omitted):
--   affiliate_partners <- commission-calculator.ts (getPartner/mapPartner),
--     affiliate-service.ts (createPartner/updatePartner/mapPartner,
--     CreatePartnerInput/UpdatePartnerInput/Partner in ./types.ts), AND
--     payout-service.ts:728-741 (getRecipient reads partner.email and
--     partner.bank_details -- fields Partner/mapPartner never surface, but
--     the payout rail reads them directly off the same table via
--     .select("*")). Columns: id, name, slug, type, description, logo_url,
--     website_url, api_endpoint, email, commission_type, commission_rate,
--     commission_fixed, min_payout, payout_frequency, payment_method,
--     stripe_account_id, bank_details, regions, is_active, metadata,
--     created_at, updated_at.
--   commission_rules <- commission-calculator.ts (createCommissionRule,
--     getCommissionRule, mapCommissionRule, CommissionRule interface).
--     Columns: id, partner_id, conversion_type, min_value, max_value,
--     commission_type, commission_rate, commission_fixed, bonus_rate,
--     bonus_threshold, created_at.
--
-- id type decision: affiliate_partners.id is UUID, not TEXT. createPartner()
-- never supplies a client-side id (DB-generated), matching the
-- gen_random_uuid() convention used everywhere else in this schema. This
-- also matches the one directly-analogous existing precedent,
-- referral_codes.partner_id (20260517000006_referral_codes.sql), which is
-- already typed `uuid` for the exact same Partner.id string flowing through
-- the same affiliate-service.ts. NOTE for whoever wires the MoneyLion
-- integration: the webhook handler (src/app/api/affiliate/webhooks/route.ts)
-- passes the inbound `data.partnerId` straight into calculateCommission()
-- with no translation step, so MoneyLion's outbound partnerId must be
-- configured, at partner-onboarding time, to echo this table's internal
-- UUID -- it is a plain lookup key, not a slug. (revenue_events.partner_id
-- is TEXT because that table records the raw, unresolved external partner
-- reference for audit purposes before any resolution against this registry;
-- it is a different, deliberately looser field and is not this table's id.)
--
-- Money units: commission_rate/bonus_rate are PERCENTAGES (e.g. 10 = 10%).
-- commission_fixed/min_payout/min_value/max_value/bonus_threshold are
-- DOLLARS, matching `value` (the conversion's dollar transaction amount) in
-- commission-calculator.ts's arithmetic -- NOT the integer-cents convention
-- used by revenue_events.commission_amount_cents. The dollars -> cents
-- conversion happens explicitly at the revenue-tracker.ts trackEvent()
-- boundary via fromDollars(); nothing here is pre-converted to cents.
--
-- RLS: affiliate_partners and commission_rules are operator/partner
-- configuration tables, not per-user data -- neither has a user_id column,
-- and both are read/written exclusively via commission-calculator.ts and
-- affiliate-service.ts using the service-role Supabase client (grep confirms
-- no client-side/RLS-scoped caller anywhere in the codebase). Each table
-- gets a single FOR ALL TO service_role policy and nothing else, matching
-- the consent_records table in 20260331000000_adverse_action_notices.sql --
-- no policy exists for anon/authenticated, so RLS's default-deny leaves them
-- with zero access. A commission rate is therefore never writable (or
-- readable) by an end user.
--
-- GRANTs (in addition to the policy): verified via `\dp` against a fresh
-- local `supabase db reset` that this instance's CREATE TABLE default
-- privileges do NOT include base SELECT/INSERT/UPDATE/DELETE for
-- service_role (only TRUNCATE/REFERENCES/TRIGGER/MAINTAIN), which produces
-- "permission denied for table X" (42501) on every query regardless of RLS --
-- service_role has BYPASSRLS, so the policy above never even gets evaluated;
-- the base grant is what actually gates access. Explicit GRANT statements
-- below match the sibling revenue_events/referral_codes tables, which
-- already carry the identical grant for the identical reason.
--
-- GDPR erasure cascade: NOT registered. Both tables are pure partner/rule
-- config with no user_id column -- delete_user_data_cascade() (see
-- 20260519000000_erasure_cascade_resilient.sql) issues
-- `DELETE FROM %I WHERE user_id = $1` for every table in its list, which
-- would fail against a table with no user_id column. Correctly out of scope
-- per the erasure cascade's own contract.

CREATE TABLE IF NOT EXISTS affiliate_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN (
    'credit_card', 'personal_loan', 'mortgage', 'student_loan',
    'auto_loan', 'insurance', 'broker', 'bank', 'other'
  )),
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  api_endpoint TEXT,
  -- Read by payout-service.ts's getRecipient(); not part of CreatePartnerInput
  -- today, so it starts NULL for partners created via affiliate-service.ts.
  email TEXT,
  commission_type TEXT NOT NULL CHECK (commission_type IN (
    'cpa', 'cpl', 'revenue_share', 'hybrid'
  )),
  -- PERCENTAGE (e.g. 10 = 10%), not cents.
  commission_rate NUMERIC,
  -- DOLLARS, not cents.
  commission_fixed NUMERIC,
  -- DOLLARS, not cents.
  min_payout NUMERIC NOT NULL DEFAULT 50,
  payout_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (payout_frequency IN (
    'weekly', 'biweekly', 'monthly'
  )),
  payment_method TEXT NOT NULL DEFAULT 'stripe' CHECK (payment_method IN (
    'stripe', 'bank_transfer', 'check'
  )),
  stripe_account_id TEXT,
  -- Read by payout-service.ts's getRecipient() as PayoutRecipient.bankDetails
  -- ({accountHolderName, accountNumber?, routingNumber?, iban?, sortCode?}).
  bank_details JSONB,
  regions TEXT[] NOT NULL DEFAULT ARRAY['US'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_partners_is_active
  ON affiliate_partners(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_type
  ON affiliate_partners(type);
-- listPartners() filters by region via .contains("regions", [region]);
-- a GIN index is the correct index type for array-containment queries.
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_regions
  ON affiliate_partners USING GIN(regions);

ALTER TABLE affiliate_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages affiliate partners" ON affiliate_partners;
CREATE POLICY "Service role manages affiliate partners"
  ON affiliate_partners FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- service_role has BYPASSRLS on this instance, so the policy above is
-- defense-in-depth, not what actually grants access -- CREATE TABLE's
-- default privileges here do NOT include base SELECT/INSERT/UPDATE/DELETE
-- for service_role (verified via \dp against a fresh local db reset: only
-- TRUNCATE/REFERENCES/TRIGGER/MAINTAIN were present, producing a real
-- "permission denied for table affiliate_partners" / 42501 on every query --
-- i.e. the exact failure mode this migration exists to eliminate, just one
-- layer deeper). Matches the explicit GRANT already used by the sibling
-- revenue_events/referral_codes tables in this same domain.
GRANT SELECT, INSERT, UPDATE, DELETE ON affiliate_partners TO service_role;

CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES affiliate_partners(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN (
    'click', 'lead', 'signup', 'application', 'approval',
    'funded', 'purchase', 'subscription'
  )),
  -- DOLLARS -- matched against a conversion's `value` via getCommissionRule's
  -- .or(min_value.lte.<value>) / .or(max_value.gte.<value>) range filter.
  min_value NUMERIC,
  max_value NUMERIC,
  commission_type TEXT NOT NULL CHECK (commission_type IN (
    'cpa', 'cpl', 'revenue_share', 'hybrid'
  )),
  -- PERCENTAGE, not cents.
  commission_rate NUMERIC,
  -- DOLLARS, not cents.
  commission_fixed NUMERIC,
  -- PERCENTAGE, not cents.
  bonus_rate NUMERIC,
  -- DOLLARS, not cents.
  bonus_threshold NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches getCommissionRule()'s exact filter: .eq("partner_id", ...).eq("conversion_type", ...).
CREATE INDEX IF NOT EXISTS idx_commission_rules_partner_conversion
  ON commission_rules(partner_id, conversion_type);

ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages commission rules" ON commission_rules;
CREATE POLICY "Service role manages commission rules"
  ON commission_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- See the matching GRANT on affiliate_partners above for why this is required
-- in addition to the policy (service_role has BYPASSRLS; the gap is base
-- table privileges, not row-level filtering).
GRANT SELECT, INSERT, UPDATE, DELETE ON commission_rules TO service_role;
