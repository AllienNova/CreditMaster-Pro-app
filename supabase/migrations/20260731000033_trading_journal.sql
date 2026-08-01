-- Real persistence for the trading journal (Wave 7 remediation,
-- trading/assets cluster).
--
-- PROBLEM: src/lib/trading/services/TradingJournalService.ts has always
-- queried .from("trading_journal"), but the table was never migrated. Four
-- live routes depend on it (journal, journal/[id], journal/[id]/close,
-- journal/stats) and are 100% non-functional as a result.
--
-- Columns are grounded exactly in toDbFormat()/fromDbFormat()
-- (TradingJournalService.ts:709-793), the service's own snake_case<->camelCase
-- mapping layer — already written correctly, so this migration needed no
-- application-code changes beyond the two error-swallow fixes noted below.
--
-- id is UUID with NO DEFAULT: createTrade() always supplies its own
-- `crypto.randomUUID()` (TradingJournalService.ts:171), so there is no
-- DB-generated surrogate key, matching the app-generated-id convention
-- already used for orders/positions (20260731000000_trading_orders_positions.sql),
-- just with a real UUID instead of an "ORD-<ts>-<rand>" string since that's
-- what crypto.randomUUID() actually produces here.
--
-- direction/status/outcome/emotional_state_before/emotional_state_after/
-- time_frame get CHECK constraints matching their TS union types exactly
-- (TradeDirection/TradeStatus/TradeOutcome/EmotionalState/TimeFrame in
-- TradingJournalService.ts:18-28). This is a real gap being closed, not just
-- matching existing enforcement: POST/PUT (route.ts, [id]/route.ts) spread
-- the request body into createTrade/updateTrade with zero server-side enum
-- validation today, so these CHECKs are the only validation these fields
-- get — consistent with the CHECK-per-enum-column convention already used
-- on every comparable table in this schema (e.g. orders.status/side/type).
--
-- tags/mistakes/screenshot_urls are TEXT[]: fromDbFormat() reads them
-- straight through as `data.tags as string[]` etc. with no per-element
-- validation, so a flexible array type is correct here.

CREATE TABLE IF NOT EXISTS trading_journal (
  id                        UUID PRIMARY KEY,
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol                    VARCHAR(20) NOT NULL,
  direction                 VARCHAR(10) NOT NULL
    CHECK (direction IN ('long', 'short')),
  status                    VARCHAR(10) NOT NULL
    CHECK (status IN ('open', 'closed', 'partial')),
  entry_date                TIMESTAMPTZ NOT NULL,
  entry_price               NUMERIC(20, 8) NOT NULL,
  entry_quantity            NUMERIC(20, 8) NOT NULL,
  entry_reason              TEXT NOT NULL,
  exit_date                 TIMESTAMPTZ,
  exit_price                NUMERIC(20, 8),
  exit_quantity              NUMERIC(20, 8),
  exit_reason               TEXT,
  stop_loss                 NUMERIC(20, 8),
  take_profit                NUMERIC(20, 8),
  risk_reward_ratio          NUMERIC(10, 4),
  position_size              NUMERIC(20, 8) NOT NULL,
  risk_amount                NUMERIC(20, 8),
  profit_loss                NUMERIC(20, 8),
  profit_loss_percent        NUMERIC(10, 4),
  outcome                    VARCHAR(10)
    CHECK (outcome IS NULL OR outcome IN ('win', 'loss', 'breakeven')),
  strategy                  TEXT,
  time_frame                VARCHAR(5)
    CHECK (time_frame IS NULL OR time_frame IN ('1m', '5m', '15m', '1h', '4h', '1d', '1w')),
  setup_type                 TEXT,
  tags                      TEXT[] NOT NULL DEFAULT '{}',
  emotional_state_before     VARCHAR(15)
    CHECK (emotional_state_before IS NULL OR emotional_state_before IN
      ('confident', 'fearful', 'greedy', 'neutral', 'fomo', 'revenge')),
  emotional_state_after      VARCHAR(15)
    CHECK (emotional_state_after IS NULL OR emotional_state_after IN
      ('confident', 'fearful', 'greedy', 'neutral', 'fomo', 'revenge')),
  followed_plan              BOOLEAN NOT NULL DEFAULT true,
  mistakes                  TEXT[],
  lessons_learned            TEXT,
  screenshot_urls             TEXT[],
  notes                     TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes matching getTrades()'s actual filter/sort predicates
-- (TradingJournalService.ts:271-304): user_id (always), entry_date (default
-- sort + range filter), symbol/strategy/outcome (in-list), direction/status (eq).
CREATE INDEX IF NOT EXISTS idx_trading_journal_user_id ON trading_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_journal_user_status ON trading_journal(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trading_journal_entry_date ON trading_journal(entry_date);
CREATE INDEX IF NOT EXISTS idx_trading_journal_symbol ON trading_journal(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_journal_strategy ON trading_journal(strategy);
CREATE INDEX IF NOT EXISTS idx_trading_journal_outcome ON trading_journal(outcome);

ALTER TABLE trading_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own journal trades" ON trading_journal;
CREATE POLICY "Users can view own journal trades"
    ON trading_journal FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own journal trades" ON trading_journal;
CREATE POLICY "Users can insert own journal trades"
    ON trading_journal FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own journal trades" ON trading_journal;
CREATE POLICY "Users can update own journal trades"
    ON trading_journal FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own journal trades" ON trading_journal;
CREATE POLICY "Users can delete own journal trades"
    ON trading_journal FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE trading_journal IS 'User trade journal entries (entry/exit, psychology, lessons) — see src/lib/trading/services/TradingJournalService.ts';
