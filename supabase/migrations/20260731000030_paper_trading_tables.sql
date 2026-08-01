-- Real persistence for paper trading (Wave 7 remediation, trading/assets cluster).
--
-- PROBLEM: src/lib/trading/paper/PaperTradingEngine.ts has always queried
-- .from("paper_accounts") / "paper_orders" / "paper_positions" / "paper_fills" /
-- "paper_trades", but none of the five ever existed in any prior migration.
-- All 5 live routes under src/app/api/trading/paper/** are 100% non-functional as
-- a result. This is NOT intentional in-memory simulation: there is no Map
-- fallback anywhere in the engine, and the sibling src/lib/trading/brokers/
-- paper-broker.ts (the only other candidate implementation) is a 0-byte empty
-- file with its barrel export commented out (trading/index.ts:258) — confirmed
-- before writing this migration, not assumed.
--
-- Columns are grounded exactly in what PaperTradingEngine.ts's insert/update
-- call sites actually send, cross-checked field by field against
-- order-types.ts (Order/OrderRequest/Fill), matching the discipline already
-- used in 20260731000000_trading_orders_positions.sql for the real
-- orders/positions tables. Fields on Order that paper orders never populate
-- (brokerId, submittedAt, errorMessage, rejectReason, legs, estimatedRisk,
-- fees) are intentionally omitted — adding them would invent columns nobody
-- reads or writes. Unlike the real `orders` table, paper orders DO need
-- trail_percent/trail_amount/order_class/extended_hours/client_order_id and
-- the three bracket-order price columns, because PaperTradingEngine spreads
-- the entire OrderRequest into the insert payload (`...request`) rather than
-- hand-picking fields, so a bracket or trailing-stop paper order would send
-- those keys and a missing column would fail the insert outright.
--
-- All five tables use a DB-generated UUID primary key (unlike the real
-- orders/positions tables, which use an app-generated TEXT id) because
-- PaperTradingEngine always inserts `Omit<Order/PaperPosition/PaperTrade/Fill,
-- "id">` and lets `.select().single()` (or, for fills, nothing) hand back the
-- generated id — it never supplies its own.
--
-- One paper account per user: src/app/api/trading/paper/route.ts POST checks
-- `getAccount(user.id)` first and returns 409 if one already exists, and GET
-- treats the lookup as a `.single()` keyed only on user_id. UNIQUE(user_id)
-- makes that invariant a DB guarantee instead of an app-level race.
--
-- account_id on the four child tables is a UUID FK to paper_accounts(id), not
-- the free-form TEXT used by the real orders/positions tables — paper trading
-- has exactly one caller (PaperTradingEngine) and it always supplies the
-- paper account's own generated UUID, so an unenforced free-form id would
-- only give up a real integrity check for no benefit.
--
-- paper_positions gets UNIQUE(account_id, symbol): PaperTradingEngine's own
-- getPosition() already assumes exactly one row per (account, symbol) via
-- .single(), and updatePosition() does a check-then-act read-modify-write
-- with no transaction around it. The constraint doesn't remove that race, but
-- it turns a silent duplicate-row bug into a loud, diagnosable insert failure
-- instead of two positions quietly diverging.
--
-- RLS on the four child tables (paper_orders/positions/fills/trades) uses the
-- existing repo pattern for account-scoped child tables — the same
-- `<parent_fk> IN (SELECT id FROM <parent> WHERE user_id = auth.uid())` shape
-- already used for investment_holdings/investment_transactions against
-- investment_portfolios (20250207000000_financial_intelligence_schema.sql) —
-- rather than denormalizing user_id onto every child row. paper_orders is the
-- one exception: Order.userId is part of the shared Order type contract (the
-- real `orders` table also stores it directly), so it gets its own user_id
-- column and a direct auth.uid() = user_id policy, matching `orders`.
--
-- paper_fills has no direct owner column in the Fill type at all (only
-- orderId) and the app never reads paper_fills back — it is a fire-and-forget
-- audit trail. account_id is added purely so RLS can scope it like every
-- other trading table in this repo; PaperTradingEngine already has the
-- account id in scope at the one call site that inserts a fill.

-- ============================================================================
-- PAPER ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS paper_accounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL DEFAULT 'Paper Trading Account',
  initial_balance    NUMERIC(20, 8) NOT NULL,
  cash_balance       NUMERIC(20, 8) NOT NULL,
  buying_power       NUMERIC(20, 8) NOT NULL,
  portfolio_value    NUMERIC(20, 8) NOT NULL DEFAULT 0,
  total_value        NUMERIC(20, 8) NOT NULL,
  day_trade_count    INTEGER NOT NULL DEFAULT 0,
  is_pdt_restricted  BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE paper_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own paper account" ON paper_accounts;
CREATE POLICY "Users can view own paper account"
    ON paper_accounts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own paper account" ON paper_accounts;
CREATE POLICY "Users can insert own paper account"
    ON paper_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own paper account" ON paper_accounts;
CREATE POLICY "Users can update own paper account"
    ON paper_accounts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own paper account" ON paper_accounts;
CREATE POLICY "Users can delete own paper account"
    ON paper_accounts FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE paper_accounts IS 'Simulated cash/buying-power ledger for paper trading — see src/lib/trading/paper/PaperTradingEngine.ts';

-- ============================================================================
-- PAPER ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS paper_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id              UUID NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
  symbol                  VARCHAR(20) NOT NULL,
  side                    VARCHAR(10) NOT NULL
    CHECK (side IN ('buy', 'sell')),
  quantity                NUMERIC(20, 8) NOT NULL,
  type                    VARCHAR(20) NOT NULL
    CHECK (type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop')),
  limit_price             NUMERIC(20, 8),
  stop_price              NUMERIC(20, 8),
  trail_percent           NUMERIC(10, 4),
  trail_amount            NUMERIC(20, 8),
  time_in_force           VARCHAR(10) NOT NULL
    CHECK (time_in_force IN ('day', 'gtc', 'ioc', 'fok', 'opg', 'cls')),
  extended_hours          BOOLEAN,
  order_class             VARCHAR(10)
    CHECK (order_class IS NULL OR order_class IN ('simple', 'bracket', 'oco', 'oto')),
  take_profit_price       NUMERIC(20, 8),
  stop_loss_price         NUMERIC(20, 8),
  stop_loss_limit_price   NUMERIC(20, 8),
  client_order_id         TEXT,
  signal_id               TEXT,
  strategy_id             TEXT,
  notes                   TEXT,
  status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'accepted', 'partial', 'filled',
                       'cancelled', 'rejected', 'expired', 'error')),
  filled_qty              NUMERIC(20, 8) NOT NULL DEFAULT 0,
  filled_avg_price        NUMERIC(20, 8),
  commission              NUMERIC(20, 8),
  estimated_value         NUMERIC(20, 8) NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  filled_at               TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes matching getOrders()'s actual filter/sort predicates
-- (PaperTradingEngine.ts getOrders): accountId, status (in-list), side,
-- symbol, and createdAt (default sort, also range-filtered).
CREATE INDEX IF NOT EXISTS idx_paper_orders_account_id ON paper_orders(account_id);
CREATE INDEX IF NOT EXISTS idx_paper_orders_account_status ON paper_orders(account_id, status);
CREATE INDEX IF NOT EXISTS idx_paper_orders_symbol ON paper_orders(symbol);
CREATE INDEX IF NOT EXISTS idx_paper_orders_created_at ON paper_orders(created_at);

ALTER TABLE paper_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own paper orders" ON paper_orders;
CREATE POLICY "Users can view own paper orders"
    ON paper_orders FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own paper orders" ON paper_orders;
CREATE POLICY "Users can insert own paper orders"
    ON paper_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own paper orders" ON paper_orders;
CREATE POLICY "Users can update own paper orders"
    ON paper_orders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own paper orders" ON paper_orders;
CREATE POLICY "Users can delete own paper orders"
    ON paper_orders FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE paper_orders IS 'Simulated order lifecycle records for paper trading — see src/lib/trading/paper/PaperTradingEngine.ts';

-- ============================================================================
-- PAPER POSITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS paper_positions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id             UUID NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
  symbol                 VARCHAR(20) NOT NULL,
  quantity               NUMERIC(20, 8) NOT NULL,
  avg_entry_price        NUMERIC(20, 8) NOT NULL,
  current_price          NUMERIC(20, 8) NOT NULL DEFAULT 0,
  market_value           NUMERIC(20, 8) NOT NULL DEFAULT 0,
  unrealized_pl          NUMERIC(20, 8) NOT NULL DEFAULT 0,
  unrealized_pl_percent  NUMERIC(20, 8) NOT NULL DEFAULT 0,
  realized_pl            NUMERIC(20, 8) NOT NULL DEFAULT 0,
  cost_basis             NUMERIC(20, 8) NOT NULL,
  side                   VARCHAR(10) NOT NULL
    CHECK (side IN ('long', 'short')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, symbol)
);

ALTER TABLE paper_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own paper positions" ON paper_positions;
CREATE POLICY "Users can view own paper positions"
    ON paper_positions FOR SELECT
    USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own paper positions" ON paper_positions;
CREATE POLICY "Users can insert own paper positions"
    ON paper_positions FOR INSERT
    WITH CHECK (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own paper positions" ON paper_positions;
CREATE POLICY "Users can update own paper positions"
    ON paper_positions FOR UPDATE
    USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()))
    WITH CHECK (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own paper positions" ON paper_positions;
CREATE POLICY "Users can delete own paper positions"
    ON paper_positions FOR DELETE
    USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

COMMENT ON TABLE paper_positions IS 'Open simulated positions for paper trading, one row per (account, symbol) — see src/lib/trading/paper/PaperTradingEngine.ts';

-- ============================================================================
-- PAPER FILLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS paper_fills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
  order_id     UUID NOT NULL REFERENCES paper_orders(id) ON DELETE CASCADE,
  symbol       VARCHAR(20) NOT NULL,
  side         VARCHAR(10) NOT NULL
    CHECK (side IN ('buy', 'sell')),
  quantity     NUMERIC(20, 8) NOT NULL,
  price        NUMERIC(20, 8) NOT NULL,
  commission   NUMERIC(20, 8) NOT NULL DEFAULT 0,
  fees         NUMERIC(20, 8) NOT NULL DEFAULT 0,
  filled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paper_fills_order_id ON paper_fills(order_id);
CREATE INDEX IF NOT EXISTS idx_paper_fills_account_id ON paper_fills(account_id);

ALTER TABLE paper_fills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own paper fills" ON paper_fills;
CREATE POLICY "Users can view own paper fills"
    ON paper_fills FOR SELECT
    USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own paper fills" ON paper_fills;
CREATE POLICY "Users can insert own paper fills"
    ON paper_fills FOR INSERT
    WITH CHECK (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

COMMENT ON TABLE paper_fills IS 'Fire-and-forget execution audit trail for paper trading (never read back by the app) — see src/lib/trading/paper/PaperTradingEngine.ts';

-- ============================================================================
-- PAPER TRADES
-- ============================================================================

CREATE TABLE IF NOT EXISTS paper_trades (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     UUID NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
  order_id       UUID NOT NULL REFERENCES paper_orders(id) ON DELETE CASCADE,
  symbol         VARCHAR(20) NOT NULL,
  side           VARCHAR(10) NOT NULL
    CHECK (side IN ('buy', 'sell')),
  quantity       NUMERIC(20, 8) NOT NULL,
  price          NUMERIC(20, 8) NOT NULL,
  total_value    NUMERIC(20, 8) NOT NULL,
  commission     NUMERIC(20, 8) NOT NULL DEFAULT 0,
  fees           NUMERIC(20, 8) NOT NULL DEFAULT 0,
  realized_pl    NUMERIC(20, 8),
  executed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes matching getTrades()'s actual query: accountId, executedAt sort +
-- range filter.
CREATE INDEX IF NOT EXISTS idx_paper_trades_account_id ON paper_trades(account_id);
CREATE INDEX IF NOT EXISTS idx_paper_trades_executed_at ON paper_trades(executed_at);

ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own paper trades" ON paper_trades;
CREATE POLICY "Users can view own paper trades"
    ON paper_trades FOR SELECT
    USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own paper trades" ON paper_trades;
CREATE POLICY "Users can insert own paper trades"
    ON paper_trades FOR INSERT
    WITH CHECK (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

COMMENT ON TABLE paper_trades IS 'Completed simulated trade/fill history for paper trading, drives getPerformance() — see src/lib/trading/paper/PaperTradingEngine.ts';
