-- The last four buildable phantom tables: the trading promotion/demotion gates,
-- and the investment trend series.
--
-- Every remaining phantom table after this migration is blocked, not pending:
-- seven belong to the orphaned payout stack awaiting the FND-026 owner decision
-- (docs/qa/orphaned-payout-stack.md), and three belong to
-- src/lib/trading/autonomous/, which deploys as a separate Fly.io service whose
-- reachability is not decidable from this repo.
--
-- ── strategy_metrics, risk_vetoes, recon_breaks ──────────────────────────
-- These three are the DATA the WATCH -> GUIDED -> AUTONOMOUS safety machine
-- runs on, and none of them existed:
--   promotion-gates.ts   reads strategy_metrics to evaluate every promotion gate
--   demotion-rules.ts    reads risk_vetoes and recon_breaks to decide demotion
--
-- The consequence was asymmetric, and the asymmetry is the point:
--   * demotion-rules was hardened in dc4980e to FAIL CLOSED, so a missing table
--     reads as demote-worthy. Safe, but it means the moment anything wired
--     this up, every strategy would demote unconditionally.
--   * promotion-gates had no such data, so no strategy could ever be promoted.
-- The ladder was inert in both directions. Building these makes the gates
-- evaluate real numbers instead of permanently failing.
--
-- strategy_metrics columns are taken VERBATIM from the StrategyMetrics
-- interface at promotion-gates.ts:41-53 — the code's own declared contract,
-- not a guess. All are NOT NULL: a gate that reads a NULL sharpe ratio and
-- treats it as 0 would silently block promotion for a data gap rather than a
-- performance one, which is the fabrication class this wave removes.
--
-- risk_vetoes and recon_breaks are queried as
--   .select("id").eq("strategy_id", ...).gte("created_at", ...)   [vetoes]
--   .select("id").eq("strategy_id", ...).eq("status", "OPEN")     [breaks]
-- so they carry exactly what those predicates need and nothing invented.
--
-- ── investment_history ───────────────────────────────────────────────────
-- The last of six trend series feeding getFinancialTrends(). The other five
-- (net_worth_history, savings_history, debt_history, monthly_summaries,
-- health_score_history) were built earlier in this wave; the assets cluster
-- deliberately left this one, flagging that building 1-of-6 would ship a
-- half-working chart. Five of six now exist, so this completes the set rather
-- than starting a partial one.
--
-- Shape mirrors net_worth_history exactly — (user_id, date, <value>) — because
-- the reader treats all six identically:
--   .select("date, total_value").eq("user_id",..).gte("date",..).lte("date",..)
--
-- STILL NO PRODUCER. Nothing writes any of the six history tables; that is a
-- snapshot-job gap flagged repeatedly during this wave and NOT closed here.
-- Creating the table ends the phantom-table error; it does not by itself make
-- the chart populate. Said plainly so this is not mistaken for a working
-- feature.

CREATE TABLE IF NOT EXISTS public.strategy_metrics (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id        TEXT NOT NULL UNIQUE,
  signal_count       INTEGER NOT NULL DEFAULT 0,
  sharpe_ratio       NUMERIC(10,4) NOT NULL DEFAULT 0,
  max_drawdown_pct   NUMERIC(10,4) NOT NULL DEFAULT 0,
  hit_rate_pct       NUMERIC(10,4) NOT NULL DEFAULT 0,
  correlation        NUMERIC(10,4) NOT NULL DEFAULT 0,
  sev1_free_days     INTEGER NOT NULL DEFAULT 0,
  fill_sim_error_bps NUMERIC(10,4) NOT NULL DEFAULT 0,
  trade_count        INTEGER NOT NULL DEFAULT 0,
  slippage_bps       NUMERIC(10,4) NOT NULL DEFAULT 0,
  has_violations     BOOLEAN NOT NULL DEFAULT false,
  dwell_days         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_vetoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id TEXT NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS risk_vetoes_strategy_created_idx
  ON public.risk_vetoes (strategy_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.recon_breaks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS recon_breaks_strategy_status_idx
  ON public.recon_breaks (strategy_id, status);

CREATE TABLE IF NOT EXISTS public.investment_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  total_value NUMERIC(18,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS investment_history_user_date_idx
  ON public.investment_history (user_id, date DESC);

-- RLS. The three trading tables are operator/engine surfaces with no user_id
-- and no client reader — service-role only, matching strategy_lifecycle and
-- lifecycle_audit. investment_history is per-user and follows the
-- auth.uid() = user_id precedent, SELECT only: the series is derived, so a
-- client that could write it could forge its own history.
ALTER TABLE public.strategy_metrics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_vetoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_breaks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_history  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role manages strategy metrics" ON public.strategy_metrics;
CREATE POLICY "service role manages strategy metrics"
  ON public.strategy_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service role manages risk vetoes" ON public.risk_vetoes;
CREATE POLICY "service role manages risk vetoes"
  ON public.risk_vetoes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service role manages recon breaks" ON public.recon_breaks;
CREATE POLICY "service role manages recon breaks"
  ON public.recon_breaks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own investment history" ON public.investment_history;
CREATE POLICY "Users can view own investment history"
  ON public.investment_history FOR SELECT USING (auth.uid() = user_id);

-- service_role needs explicit table GRANTs: CREATE TABLE's defaults omit them
-- on this instance, and rolbypassrls does not substitute for a missing grant.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_metrics   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_vetoes        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recon_breaks       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_history TO service_role;

COMMENT ON TABLE public.strategy_metrics IS
  'Per-strategy gate inputs. Columns mirror the StrategyMetrics interface in promotion-gates.ts verbatim.';
COMMENT ON TABLE public.investment_history IS
  'Daily investment total per user. NOTE: no producer writes this yet — the snapshot job is still an open gap.';
