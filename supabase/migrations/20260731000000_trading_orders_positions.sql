-- Real persistence for trading orders and positions (Wave 7 remediation).
--
-- PROBLEM: src/lib/trading/orders/order-manager.ts (persistOrder, loadOrderFromDb,
-- getOrders) and src/lib/trading/positions/position-manager.ts (persistPosition,
-- loadPositions) have always queried .from("orders") / .from("positions"), but
-- neither table existed in any prior migration. Postgrest's "relation does not
-- exist" error was swallowed by try/catch in both persist methods, so every
-- order/position write silently no-op'd — the in-memory Map was the only source
-- of truth and a restart or second instance lost all order/position history.
--
-- This migration creates both tables. Columns are grounded exactly in what
-- persistOrder/mapDbToOrder (order-manager.ts) and persistPosition/
-- mapDbToPosition (position-manager.ts) read and write — cross-checked field by
-- field against order-types.ts (Order/OrderRequest) and position-types.ts
-- (Position). Fields on the Order/Position TS interfaces that are never
-- persisted by these methods (legs, commission, fees, estimatedRisk,
-- trailPercent/trailAmount, orderClass, clientOrderId, extendedHours,
-- stopLossPrice/takeProfitPrice/stopLossLimitPrice on Order — those live only
-- on the request/broker-submission path, not the DB row) are intentionally
-- omitted; adding them would invent columns nobody reads or writes.
--
-- id is TEXT, not UUID: both managers generate their own IDs in the app
-- ("ORD-<ts>-<rand>" / "POS-<ts>-<rand>" — see generateOrderId/generatePositionId)
-- and always supply `id` on upsert, so there is no DB-generated surrogate key.
--
-- account_id is TEXT with no FK: confirmed via src/app/api/trading/orders/route.ts
-- (`body.accountId || "default"`, `brokerConn?.account_id || pendingOrder.accountId
-- || user.id`) and paper-trading tests ("paper_acc_1") that it is a free-form
-- identifier (broker sub-account id, "default", a paper-trading id, or the
-- user's own id) — NOT the trading_accounts.id UUID (a distinct concept: one
-- settings/operating-mode row per user, see 20260226_trading_modes_compliance.sql).
-- signal_id / strategy_id are similarly free-form TEXT with no FK for the same
-- reason — no evidence in the calling code that they are UUIDs referencing a
-- specific row, and adding an unverified FK risks rejecting legitimate writes.
--
-- Money/quantity/percent columns use NUMERIC(20,8), matching the convention
-- already established for trading tables in 20260117_add_trading_tables.sql
-- (DECIMAL(20, 8) for prices/quantities). Percent/ratio fields (unrealized_pl_percent,
-- risk_percent) use the same width rather than a tighter DECIMAL(5,2)-style bound
-- used elsewhere for pre-defined config ratios, since these are computed at
-- runtime from live P&L and must never hit a silent overflow rejection.
--
-- No auto-update trigger on updated_at / last_updated_at: unlike
-- notification_preferences (DB-only timestamp), both managers explicitly compute
-- and pass their own timestamp on every persist call and read it back via
-- mapDbToOrder/mapDbToPosition into the in-memory Order/Position object. A
-- BEFORE UPDATE trigger that overwrote it with NOW() would silently diverge the
-- persisted value from the in-memory Date the app just set, corrupting
-- optimistic-concurrency and audit reasoning that depends on this column being
-- app-authoritative.
--
-- RLS is the enforcement layer for the common path, not just defense-in-depth:
-- createClient() (src/lib/supabase/server.ts) returns a cookie-scoped client
-- using the caller's own JWT (Postgres role `authenticated`) for every request
-- EXCEPT the Fly.io autonomous service (STANDALONE_MODE=true), which uses the
-- service-role client and bypasses RLS entirely. Both managers are called with
-- user_id/userId always sourced from the authenticated caller
-- (src/app/api/trading/orders/route.ts, src/app/api/trading/positions/route.ts —
-- never client-supplied), so `auth.uid() = user_id` is safe and correct. Table
-- privileges are left at Supabase's project-default grants to anon/authenticated/
-- service_role (as every other RLS-only table in this repo relies on, e.g.
-- debt_accounts, user_risk_settings, strategy_lifecycle) — no REVOKE ALL, since
-- (unlike notification_preferences) these tables ARE reached directly by the
-- per-request authenticated client, not exclusively by a service-role client.

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id                 TEXT PRIMARY KEY,
  broker_id          TEXT,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id         TEXT NOT NULL,
  symbol             VARCHAR(20) NOT NULL,
  side               VARCHAR(10) NOT NULL
    CHECK (side IN ('buy', 'sell')),
  quantity           NUMERIC(20, 8) NOT NULL,
  type               VARCHAR(20) NOT NULL
    CHECK (type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop')),
  limit_price        NUMERIC(20, 8),
  stop_price         NUMERIC(20, 8),
  time_in_force      VARCHAR(10) NOT NULL
    CHECK (time_in_force IN ('day', 'gtc', 'ioc', 'fok', 'opg', 'cls')),
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'accepted', 'partial', 'filled',
                       'cancelled', 'rejected', 'expired', 'error')),
  filled_qty         NUMERIC(20, 8) NOT NULL DEFAULT 0,
  filled_avg_price   NUMERIC(20, 8),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at       TIMESTAMPTZ,
  filled_at          TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message      TEXT,
  reject_reason      TEXT,
  estimated_value    NUMERIC(20, 8) NOT NULL DEFAULT 0,
  signal_id          TEXT,
  strategy_id        TEXT,
  notes              TEXT
);

-- Indexes matching getOrders()'s actual filter/sort predicates
-- (order-manager.ts:419-474): user_id, status (in-list), symbol, strategy_id,
-- and created_at (the default sort column, also range-filtered by
-- startDate/endDate).
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_strategy_id ON orders(strategy_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
CREATE POLICY "Users can insert own orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders"
    ON orders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own orders" ON orders;
CREATE POLICY "Users can delete own orders"
    ON orders FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE orders IS 'Trading order lifecycle records (durable backing for OrderManager) — see src/lib/trading/orders/order-manager.ts';

-- ============================================================================
-- POSITIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS positions (
  id                     TEXT PRIMARY KEY,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id             TEXT NOT NULL,
  symbol                 VARCHAR(20) NOT NULL,
  side                   VARCHAR(10) NOT NULL
    CHECK (side IN ('long', 'short', 'flat')),
  quantity               NUMERIC(20, 8) NOT NULL,
  avg_entry_price        NUMERIC(20, 8) NOT NULL,
  current_price          NUMERIC(20, 8) NOT NULL,
  cost_basis             NUMERIC(20, 8) NOT NULL,
  market_value           NUMERIC(20, 8) NOT NULL,
  unrealized_pl          NUMERIC(20, 8) NOT NULL DEFAULT 0,
  unrealized_pl_percent  NUMERIC(20, 8) NOT NULL DEFAULT 0,
  realized_pl            NUMERIC(20, 8) NOT NULL DEFAULT 0,
  total_pl               NUMERIC(20, 8) NOT NULL DEFAULT 0,
  stop_loss_price        NUMERIC(20, 8),
  take_profit_price      NUMERIC(20, 8),
  risk_amount            NUMERIC(20, 8),
  risk_percent           NUMERIC(20, 8),
  strategy_id            TEXT,
  signal_id              TEXT,
  opened_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at              TIMESTAMPTZ,
  status                 VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'liquidated')),
  exchange               TEXT,
  asset_class            TEXT,
  notes                  TEXT
);

-- Indexes matching loadPositions()'s actual query (position-manager.ts:622-642):
-- .eq("user_id", userId).eq("status", "open"). getPositions()/getOpenPositions()
-- filter in-memory (not DB queries), so no index is added for side/symbol/
-- strategyId/minValue/maxValue — they are never used in a WHERE clause here.
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_status ON positions(user_id, status);

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own positions" ON positions;
CREATE POLICY "Users can view own positions"
    ON positions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own positions" ON positions;
CREATE POLICY "Users can insert own positions"
    ON positions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own positions" ON positions;
CREATE POLICY "Users can update own positions"
    ON positions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own positions" ON positions;
CREATE POLICY "Users can delete own positions"
    ON positions FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE positions IS 'Open/closed trading position records (durable backing for PositionManager) — see src/lib/trading/positions/position-manager.ts';
