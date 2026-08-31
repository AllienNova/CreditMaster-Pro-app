-- tax_deductions — itemised deductions a user records for a tax year.
--
-- WHY IT DID NOT EXIST. The mobile deductions screen has called
-- /api/tax/deductions since it was written; the tax engine's
-- calculateDeductionSavings has existed just as long; there was no table
-- between them, so every call 404'd and the screen rendered an empty state
-- indistinguishable from "you have no deductions".
--
-- WHY THE AMOUNT IS NUMERIC, NOT FLOAT. These figures are summed and compared
-- against the standard deduction to decide whether a filer should itemise.
-- Binary floating point makes that comparison wrong near the boundary — the
-- same class of defect as FND-024, one layer down. NUMERIC(15,2) is exact.

CREATE TABLE IF NOT EXISTS tax_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  tax_year INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  deduction_date DATE NOT NULL,

  -- Optional link to the receipt/statement this came from. ON DELETE SET NULL
  -- rather than CASCADE: deleting a document must not silently delete the
  -- deduction it evidenced, which would change the user's tax position as a
  -- side effect of tidying up their files.
  document_id UUID REFERENCES tax_documents(id) ON DELETE SET NULL,

  is_verified BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The dominant query is "this user's deductions for this year", by category.
CREATE INDEX IF NOT EXISTS idx_tax_deductions_user_year
  ON tax_deductions (user_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_deductions_category
  ON tax_deductions (user_id, tax_year, category);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
--
-- Belt and braces. The API routes use the service-role client, which bypasses
-- RLS entirely, so the `.eq("user_id", ...)` in each handler is the control
-- that actually runs. These policies exist so that a future direct-from-client
-- query, or a mistake in a new route, still cannot reach another user's rows.

ALTER TABLE tax_deductions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tax deductions" ON tax_deductions;
CREATE POLICY "Users can view own tax deductions"
  ON tax_deductions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tax deductions" ON tax_deductions;
CREATE POLICY "Users can insert own tax deductions"
  ON tax_deductions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tax deductions" ON tax_deductions;
CREATE POLICY "Users can update own tax deductions"
  ON tax_deductions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tax deductions" ON tax_deductions;
CREATE POLICY "Users can delete own tax deductions"
  ON tax_deductions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- GRANTS
-- ============================================================================
--
-- 20260809000030 set ALTER DEFAULT PRIVILEGES for role `postgres`, so a table
-- created by a migration already reaches service_role. Restated explicitly
-- because that migration exists precisely because the implicit path failed
-- silently for 163 relations, and a table nobody can read fails at runtime
-- with 42501 rather than at migration time.
GRANT ALL PRIVILEGES ON TABLE tax_deductions TO service_role;

-- `authenticated` is granted NOTHING, matching the posture of the other
-- financial tables. A route that forgets its service-role client then fails
-- loudly with "permission denied" instead of returning an empty list that
-- looks like a user with no deductions.
REVOKE ALL ON TABLE tax_deductions FROM authenticated;
REVOKE ALL ON TABLE tax_deductions FROM anon;

COMMENT ON TABLE tax_deductions IS
  'Itemised deductions per user per tax year. Read/written only via service-role API routes that filter on user_id; RLS is a second line of defence.';
