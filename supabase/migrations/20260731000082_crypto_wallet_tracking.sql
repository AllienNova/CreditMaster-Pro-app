-- crypto_wallets / crypto_holdings / crypto_price_alerts — crypto-wallet-service.ts
--
-- CLASSIFICATION: UNBUILT, currently unreached (zero API route wires up
-- CryptoWalletService — only reachable via the barrel at
-- src/lib/financial/index.ts, which itself has zero importers). The live
-- `/api/investments/crypto/*` routes are a DIFFERENT feature (market-data
-- trending/sentiment lookups); confirmed they do not import this service.
--
-- NOT deleted, per the recent-investment check: TASK-INV-05 "Crypto Wallet
-- Sync" is an explicit, current entry in docs/ssot/task_extraction.md,
-- docs/ssot/traceability_matrix.md, and docs/ssot/PLAN-EXTRACTION-LEDGER.md
-- (status "Partial — services exist", P2, Investments epic) — planned,
-- tracked work with its implementation started, not abandoned code. Same
-- reasoning as 20260731000081 (real-estate-tracking-service.ts).
--
-- SCHEMA DERIVATION: every column is read from or written by
-- CryptoWalletService's walletToDb/walletFromDb, holdingToDb/
-- holdingFromDb, and createPriceAlert()/getUserAlerts()/alertFromDb(). No
-- field is invented beyond what the service already references.
--
-- AUTH: the service already uses a service-role client by construction
-- (getCryptoWalletService() passes SUPABASE_SERVICE_ROLE_KEY). RLS +
-- authenticated grants added as the correct end-state for user-entered
-- data (a user manually connects their own wallet address / sets their own
-- price alerts) — matches this repo's savings_rules-style convention.
--
-- PRECISION: quantity uses NUMERIC(28,10) — USD-amount NUMERIC(15,2) would
-- silently truncate on-chain token amounts (many ERC-20s use 18 decimals).
-- price_usd/target_price/current_price use NUMERIC(20,8) to hold sub-cent
-- prices for low-cap tokens; value_usd/cost_basis/unrealized_gain_loss/
-- total_value_usd stay NUMERIC(15,2), matching the rest of this codebase's
-- dollar-amount convention (these are already USD-converted totals, not
-- raw token quantities).

CREATE TABLE IF NOT EXISTS crypto_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hot', 'cold', 'exchange', 'defi')),
  address TEXT,
  network TEXT CHECK (network IS NULL OR network IN (
    'bitcoin', 'ethereum', 'solana', 'polygon', 'avalanche', 'arbitrum',
    'optimism', 'base', 'bnb'
  )),
  exchange TEXT CHECK (exchange IS NULL OR exchange IN (
    'coinbase', 'binance', 'kraken', 'gemini', 'crypto_com', 'robinhood', 'other'
  )),
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_sync TIMESTAMPTZ,
  sync_error TEXT,
  total_value_usd NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user_id ON crypto_wallets(user_id);

ALTER TABLE crypto_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own crypto wallets" ON crypto_wallets;
CREATE POLICY "Users manage own crypto wallets"
  ON crypto_wallets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON crypto_wallets TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS crypto_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES crypto_wallets(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(28,10) NOT NULL,
  value_usd NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_usd NUMERIC(20,8) NOT NULL DEFAULT 0,
  cost_basis NUMERIC(15,2),
  unrealized_gain_loss NUMERIC(15,2),
  unrealized_gain_loss_percent NUMERIC(9,4),
  contract_address TEXT,
  network TEXT,
  decimals INTEGER,
  logo_url TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- deleteWallet() already explicitly deletes crypto_holdings before
-- crypto_wallets at the app layer; ON DELETE CASCADE here is defense in
-- depth, not a substitute for that explicit call (kept for symmetry with
-- mortgages -> properties above).
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_wallet_id ON crypto_holdings(wallet_id, value_usd DESC);

ALTER TABLE crypto_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own crypto holdings" ON crypto_holdings;
CREATE POLICY "Users manage own crypto holdings"
  ON crypto_holdings FOR ALL
  USING (wallet_id IN (SELECT id FROM crypto_wallets WHERE user_id = auth.uid()))
  WITH CHECK (wallet_id IN (SELECT id FROM crypto_wallets WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON crypto_holdings TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS crypto_price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  target_price NUMERIC(20,8) NOT NULL,
  current_price NUMERIC(20,8) NOT NULL,
  is_triggered BOOLEAN NOT NULL DEFAULT false,
  -- Read by alertFromDb() but never written by createPriceAlert()'s insert
  -- (no code path flips is_triggered/sets this yet) — included for
  -- read-completeness, same judgment as property_valuations.notes above.
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_price_alerts_user_id ON crypto_price_alerts(user_id, is_triggered);

ALTER TABLE crypto_price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own crypto price alerts" ON crypto_price_alerts;
CREATE POLICY "Users manage own crypto price alerts"
  ON crypto_price_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON crypto_price_alerts TO authenticated, service_role;
