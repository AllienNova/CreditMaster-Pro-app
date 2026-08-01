-- properties / property_valuations / mortgages — real-estate-tracking-service.ts
--
-- CLASSIFICATION: UNBUILT, currently unreached (zero API route wires up
-- RealEstateTrackingService — only reachable via the barrel at
-- src/lib/financial/index.ts, which itself has zero importers).
--
-- NOT deleted, per the recent-investment check: TASK-INV-04 "Real Estate
-- Tracking" is an explicit, current entry in docs/ssot/task_extraction.md,
-- docs/ssot/traceability_matrix.md, and docs/ssot/PLAN-EXTRACTION-LEDGER.md
-- (status "Partial — services exist", P2, Investments epic) — this is
-- planned, tracked work with its implementation started, not abandoned
-- code. Building the schema now means the already-comprehensive service
-- (678 lines: CRUD, valuation history, mortgage amortization, portfolio
-- ROI/cap-rate analytics) is correct the moment TASK-INV-04 wires a route
-- to it, instead of trading today's "relation does not exist" for a
-- forgotten reason to fail all over again later.
--
-- SCHEMA DERIVATION: every column is read from or written by
-- RealEstateTrackingService's propertyToDb/propertyFromDb,
-- mortgageToDb/mortgageFromDb, and the inline property_valuations
-- insert/select in updateValuation()/getValuationHistory(). No field is
-- invented beyond what the service already references.
--
-- AUTH: the service already uses a service-role client by construction
-- (getRealEstateTrackingService() passes SUPABASE_SERVICE_ROLE_KEY — no
-- anon-key/RLS gap to fix here, unlike the savings-automation-service.ts
-- finding from the prior cluster). RLS + authenticated grants are still
-- added as the correct end-state for user-entered data (a user manually
-- adds their own property), matching this repo's savings_rules-style
-- convention (not the sync-derived financial_accounts-style restricted
-- one) — properties/mortgages are user-authored, not vendor-synced.

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'primary_residence', 'rental', 'vacation', 'investment', 'commercial',
    'land', 'multi_family'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'owned', 'under_contract', 'sold', 'listed'
  )),
  -- PropertyAddress { street, unit?, city, state, zipCode, country }
  address JSONB NOT NULL DEFAULT '{}',
  purchase_price NUMERIC(15,2) NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  current_value NUMERIC(15,2) NOT NULL,
  last_value_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value_source TEXT NOT NULL DEFAULT 'manual' CHECK (value_source IN (
    'manual', 'zillow', 'redfin', 'appraisal'
  )),
  -- PropertyDetails { squareFeet?, lotSize?, bedrooms?, bathrooms?, ... }
  details JSONB NOT NULL DEFAULT '{}',
  -- RentalInfo, nullable (only set for rental properties)
  rental JSONB,
  annual_taxes NUMERIC(15,2) NOT NULL DEFAULT 0,
  annual_insurance NUMERIC(15,2) NOT NULL DEFAULT 0,
  annual_hoa NUMERIC(15,2),
  annual_maintenance NUMERIC(15,2),
  notes TEXT,
  -- PropertyDocument[], nullable
  documents JSONB,
  image_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own properties" ON properties;
CREATE POLICY "Users manage own properties"
  ON properties FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON properties TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS mortgages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lender TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'arm', 'interest_only', 'balloon')),
  original_amount NUMERIC(15,2) NOT NULL,
  current_balance NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(6,3) NOT NULL,
  term_months INTEGER NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  maturity_date TIMESTAMPTZ NOT NULL,
  monthly_payment NUMERIC(15,2) NOT NULL,
  escrow_amount NUMERIC(15,2),
  pmi_amount NUMERIC(15,2),
  -- { initialFixedPeriod, adjustmentPeriod, rateCapPeriodic, rateCapLifetime, margin, index }
  arm_details JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_mortgages_property_id ON mortgages(property_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_property_active ON mortgages(property_id, is_active);

ALTER TABLE mortgages ENABLE ROW LEVEL SECURITY;

-- No direct user_id column (matches the service, which scopes mortgages
-- only via property_id) — RLS goes through the parent property's owner,
-- same join-based pattern used for investment_holdings/investment_
-- transactions -> investment_portfolios in 20251217000001.
DROP POLICY IF EXISTS "Users manage own mortgages" ON mortgages;
CREATE POLICY "Users manage own mortgages"
  ON mortgages FOR ALL
  USING (property_id IN (SELECT id FROM properties WHERE user_id = auth.uid()))
  WITH CHECK (property_id IN (SELECT id FROM properties WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON mortgages TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS property_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  value NUMERIC(15,2) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'zillow', 'redfin', 'appraisal')),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Read by getValuationHistory()'s mapper but never written by
  -- updateValuation()'s insert — included for read-completeness (same
  -- "declared in the type, not yet wired to a write path" judgment as
  -- financial_goals.linked_rule_ids in the prior cluster's migration).
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_property_valuations_property_id ON property_valuations(property_id, date DESC);

ALTER TABLE property_valuations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own property valuations" ON property_valuations;
CREATE POLICY "Users manage own property valuations"
  ON property_valuations FOR ALL
  USING (property_id IN (SELECT id FROM properties WHERE user_id = auth.uid()))
  WITH CHECK (property_id IN (SELECT id FROM properties WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON property_valuations TO authenticated, service_role;
