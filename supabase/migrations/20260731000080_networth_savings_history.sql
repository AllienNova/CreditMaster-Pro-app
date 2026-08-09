-- net_worth_history / savings_history — trend tables for financial-aggregation-service.ts
--
-- PROBLEM: `net_worth_history` (fetchNetWorthData, fetchNetWorthHistory) and
-- `savings_history` (fetchSavingsHistory) have never existed on the live
-- schema. PostgREST resolves an {error} for the missing relation instead of
-- throwing; both call sites destructure only `{ data }` (never `error`), so
-- the failure is fully silent. Consequences, verified against the code:
--   - fetchNetWorthData: `previousMonth` falls back to the CURRENT net
--     worth (`accounts.netWorth`) whenever history is empty, so
--     month-over-month change renders as exactly 0 for every user, always.
--   - fetchNetWorthHistory / fetchSavingsHistory: trend charts on
--     /api/financial/aggregated and /api/financial/health-score{,/v2}
--     render as flat empty lines with no error surfaced anywhere.
--
-- PRODUCER CHECK (explicit per instruction, not assumed): grepped the full
-- repo (src/, mobile-app/, scripts/, vercel.json) for any INSERT/upsert
-- into either table under any name — zero matches. Nothing computes or
-- persists a net-worth or savings snapshot anywhere today. This migration
-- closes the phantom-table defect (silent error -> honest empty result)
-- but does NOT make the trend charts populate — that needs a periodic
-- snapshot job this migration does not attempt to guess the shape of.
-- Matches the monthly_summaries precedent (20260731000012).
--
-- SCHEMA DERIVATION: columns are exactly what financial-aggregation-
-- service.ts reads — `date, net_worth, total_assets, total_liabilities`
-- (net_worth_history) and `date, total_saved` (savings_history). No field
-- is invented beyond what a live .select()/.map() call already expects.

CREATE TABLE IF NOT EXISTS net_worth_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  net_worth NUMERIC(15,2) NOT NULL,
  total_assets NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_liabilities NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_net_worth_history_user_date ON net_worth_history(user_id, date);

ALTER TABLE net_worth_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own net worth history" ON net_worth_history;
CREATE POLICY "Users view own net worth history"
  ON net_worth_history FOR SELECT
  USING (auth.uid() = user_id);

-- No authenticated write policy: this is a computed snapshot, not
-- user-entered data — only a future service-role snapshot job should
-- write it (same rationale as financial_accounts, monthly_summaries).
DROP POLICY IF EXISTS "Service role manages net worth history" ON net_worth_history;
CREATE POLICY "Service role manages net worth history"
  ON net_worth_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON net_worth_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON net_worth_history TO service_role;

CREATE TABLE IF NOT EXISTS savings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_saved NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_savings_history_user_date ON savings_history(user_id, date);

ALTER TABLE savings_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own savings history" ON savings_history;
CREATE POLICY "Users view own savings history"
  ON savings_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages savings history" ON savings_history;
CREATE POLICY "Service role manages savings history"
  ON savings_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON savings_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON savings_history TO service_role;
