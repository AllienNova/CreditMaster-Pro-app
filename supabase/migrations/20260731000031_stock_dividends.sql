-- Dividend reference catalog for src/lib/investments/services/DividendTrackingService.ts
-- (Wave 7 remediation, trading/assets cluster).
--
-- PROBLEM: DividendTrackingService.getDividendStocks() — the only method in
-- that file still reachable from a route (/api/investments/dividends) after
-- this same migration set deleted the rest of the file's dead
-- dividend_payments/drip_settings methods — queries .from("stock_dividends")
-- per holding, but the table was never migrated. The error was silently
-- discarded (`const { data: dividendInfo } = await ...`), so every holding
-- was excluded from the dividend list, indistinguishable from "this stock
-- pays no dividend."
--
-- Unlike the other 4 tables this migration set touches, stock_dividends is
-- NOT user data — it's a per-symbol reference catalog (dividend rate,
-- frequency, next ex/pay date), the same category as a market-data cache.
-- Building it here does not, by itself, populate real dividend data: nothing
-- in this repo currently writes to this table (no dividend-data provider is
-- wired in). It starts empty on purpose. That is not a regression from
-- today's behavior — a query against a genuinely empty stock_dividends and a
-- query against a nonexistent one both resolve to "no row for this symbol,"
-- which getDividendStocks already treats identically (skips the holding).
-- The fix here is that the failure reason becomes real ("not catalogued
-- yet") instead of a phantom "relation does not exist," and the query no
-- longer risks masking an unrelated real error the same way. Populating this
-- table with real per-symbol dividend data is a separate, follow-on
-- integration (e.g. a market-data provider job), out of scope for this
-- migration.
--
-- Columns are grounded exactly in what getDividendStocks() reads off each
-- row: symbol, annual_dividend, frequency, next_ex_date, next_pay_date,
-- payout_ratio, dividend_growth_rate, years_of_growth.
--
-- symbol is the primary key (one reference row per ticker, not per user) —
-- there is no user_id anywhere in this table by design.
--
-- RLS: SELECT-only for authenticated users (this is public reference data,
-- not owned by anyone). No INSERT/UPDATE/DELETE policies for authenticated/
-- anon — DividendTrackingService itself runs on SUPABASE_SERVICE_ROLE_KEY
-- (see getDividendTrackingService()), which bypasses RLS entirely, so
-- write access is already restricted to the service role by construction;
-- the missing write policies are a defense-in-depth backstop, not the
-- primary control.

CREATE TABLE IF NOT EXISTS stock_dividends (
  symbol                 VARCHAR(20) PRIMARY KEY,
  annual_dividend        NUMERIC(15, 4) NOT NULL DEFAULT 0,
  frequency               VARCHAR(20) NOT NULL DEFAULT 'quarterly'
    CHECK (frequency IN ('monthly', 'quarterly', 'semi-annual', 'annual', 'irregular')),
  next_ex_date           DATE,
  next_pay_date          DATE,
  payout_ratio           NUMERIC(6, 4),
  dividend_growth_rate   NUMERIC(6, 2),
  years_of_growth        INTEGER,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stock_dividends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read dividend reference data" ON stock_dividends;
CREATE POLICY "Authenticated users can read dividend reference data"
    ON stock_dividends FOR SELECT
    TO authenticated
    USING (true);

COMMENT ON TABLE stock_dividends IS 'Per-symbol dividend reference catalog (rate/frequency/dates) — read by DividendTrackingService.getDividendStocks(). Starts empty; not user data, no populating integration wired up yet.';
