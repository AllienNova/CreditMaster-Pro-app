-- Real persistence for investment price alerts (Wave 7 remediation,
-- trading/assets cluster).
--
-- PROBLEM: src/app/api/investments/alerts/route.ts (GET/POST/DELETE) has
-- always queried .from("investment_alerts"), but the table was never
-- migrated. Unlike most phantom-table defects in this remediation, this one
-- already fails LOUD and correctly: all three verbs check `{ error }` and
-- return a typed 500 (route.ts:54-59, :141-147, :182-188). So the fix here is
-- purely additive — no application-code changes are needed, only the table.
--
-- Note: src/lib/investments/services/PriceAlertService.ts also references
-- the string "investment_alerts", but as a `localStorage` key
-- (PriceAlertService.ts:491,501), not a Supabase table — a client-side cache
-- entirely unrelated to this migration. Confirmed by reading the file before
-- writing this migration; route.ts is the only real caller.
--
-- Columns are grounded exactly in what route.ts reads/writes: user_id,
-- symbol, type, status, priority, condition, message, repeat_enabled,
-- cooldown_minutes, notification_sent, expires_at, created_at.
--
-- `type` gets a CHECK matching route.ts's own server-side validTypes list
-- (route.ts:105-112) — a defense-in-depth backstop for a constraint the app
-- already enforces, not a new restriction. `status`/`priority` do NOT get a
-- CHECK: POST defaults priority to "medium" but never validates it against a
-- whitelist, and GET accepts an arbitrary `status` query param with no
-- server-side enum either (grepped repo-wide: there is no background worker
-- or other caller that would reveal the full status vocabulary) — guessing a
-- constraint here risks rejecting legitimate app writes.
--
-- `condition` is JSONB: the route accepts it verbatim from request body with
-- no shape validation, and its shape varies by alert type (a price
-- threshold vs. a percent-change window vs. a pattern name), so a single
-- flexible JSONB column is the only representation that doesn't invent
-- app-level shape validation this migration has no authority to add.

CREATE TABLE IF NOT EXISTS investment_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol              VARCHAR(20) NOT NULL,
  type                VARCHAR(30) NOT NULL
    CHECK (type IN ('price_above', 'price_below', 'percent_change',
                     'volume_spike', 'indicator_crossover', 'pattern_detected')),
  status              VARCHAR(20) NOT NULL DEFAULT 'active',
  priority            VARCHAR(10) NOT NULL DEFAULT 'medium',
  condition           JSONB NOT NULL,
  message             TEXT,
  repeat_enabled      BOOLEAN NOT NULL DEFAULT false,
  cooldown_minutes    INTEGER NOT NULL DEFAULT 60,
  notification_sent   BOOLEAN NOT NULL DEFAULT false,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes matching route.ts's actual query: user_id (every verb),
-- user_id+status and user_id+symbol (GET filters), created_at (GET sort).
CREATE INDEX IF NOT EXISTS idx_investment_alerts_user_id ON investment_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_alerts_user_status ON investment_alerts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investment_alerts_user_symbol ON investment_alerts(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_investment_alerts_created_at ON investment_alerts(created_at);

ALTER TABLE investment_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own investment alerts" ON investment_alerts;
CREATE POLICY "Users can view own investment alerts"
    ON investment_alerts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own investment alerts" ON investment_alerts;
CREATE POLICY "Users can insert own investment alerts"
    ON investment_alerts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own investment alerts" ON investment_alerts;
CREATE POLICY "Users can delete own investment alerts"
    ON investment_alerts FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE investment_alerts IS 'User-defined price/pattern alerts for investment symbols — see src/app/api/investments/alerts/route.ts';
