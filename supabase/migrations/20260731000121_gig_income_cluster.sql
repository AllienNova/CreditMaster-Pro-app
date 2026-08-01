-- ============================================================================
-- gig_platforms + gig_income + gig_deductions
--
-- Backs GigIncomeService (src/lib/financial/gig-income-service.ts), reachable
-- live via GET/POST /api/financial/income/gig -- confirmed by direct import
-- of the gigIncomeService singleton in that route file, which also has its
-- own route.test.ts alongside the service's comprehensive
-- gig-income-service.test.ts. Every method already handles {error} correctly
-- (throw new Error(...) on every failure path, no silent swallow found), so
-- this migration is purely additive schema -- no application-code changes
-- needed.
--
-- Column shapes match mapDbToPlatform/mapDbToGigIncome/mapDbToDeduction
-- exactly (gig-income-service.ts:726-756), cross-checked against every
-- insert/select in getPlatforms/addPlatform/getIncome/addIncome/
-- deleteIncome/getDeductions/addDeduction/deleteDeduction.
-- ============================================================================

CREATE TABLE IF NOT EXISTS gig_platforms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,
  connected  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gig_platforms_category_check CHECK (
    category IN ('rideshare', 'delivery', 'freelance', 'marketplace', 'other')
  )
);

CREATE INDEX IF NOT EXISTS idx_gig_platforms_user_id
  ON gig_platforms(user_id);

ALTER TABLE gig_platforms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own gig platforms" ON gig_platforms;
CREATE POLICY "Users can view own gig platforms" ON gig_platforms
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gig platforms" ON gig_platforms;
CREATE POLICY "Users can insert own gig platforms" ON gig_platforms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- gig_income
--
-- platform_id FKs to gig_platforms(id) ON DELETE CASCADE -- no code path
-- currently deletes a platform, but every insert/select ties income rows to
-- a platform row and getAggregatedSummary/generateQuarterlyReport join them
-- in application code (platforms.find(p => p.id === entry.platformId)), so
-- an orphaned platform_id would silently break that lookup ("Unknown"
-- platform name) rather than error -- CASCADE keeps referential integrity
-- if a delete path is ever added.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gig_income (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES gig_platforms(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  date        DATE NOT NULL,
  type        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gig_income_type_check CHECK (
    type IN ('payment', 'tip', 'bonus', 'refund')
  )
);

CREATE INDEX IF NOT EXISTS idx_gig_income_user_id
  ON gig_income(user_id);
CREATE INDEX IF NOT EXISTS idx_gig_income_platform_id
  ON gig_income(platform_id);
CREATE INDEX IF NOT EXISTS idx_gig_income_date
  ON gig_income(date DESC);

ALTER TABLE gig_income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own gig income" ON gig_income;
CREATE POLICY "Users can view own gig income" ON gig_income
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gig income" ON gig_income;
CREATE POLICY "Users can insert own gig income" ON gig_income
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own gig income" ON gig_income;
CREATE POLICY "Users can delete own gig income" ON gig_income
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gig_deductions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  date        DATE NOT NULL,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gig_deductions_category_check CHECK (
    category IN ('mileage', 'home_office', 'equipment', 'phone', 'supplies', 'other')
  )
);

CREATE INDEX IF NOT EXISTS idx_gig_deductions_user_id
  ON gig_deductions(user_id);
CREATE INDEX IF NOT EXISTS idx_gig_deductions_date
  ON gig_deductions(date DESC);

ALTER TABLE gig_deductions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own gig deductions" ON gig_deductions;
CREATE POLICY "Users can view own gig deductions" ON gig_deductions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gig deductions" ON gig_deductions;
CREATE POLICY "Users can insert own gig deductions" ON gig_deductions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own gig deductions" ON gig_deductions;
CREATE POLICY "Users can delete own gig deductions" ON gig_deductions
  FOR DELETE USING (auth.uid() = user_id);
