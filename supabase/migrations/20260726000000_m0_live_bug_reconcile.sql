-- ============================================================================
-- M0 live-bug reconciliation (ADR-0001 forward migration, ADR-0010)
--
-- Each block below closes a defect that is failing in the RUNNING application
-- today, not a theoretical drift. Everything is additive and idempotent
-- (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`), so it is safe to
-- apply to a populated database and safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles: columns the profile route already queries.
--
-- `src/app/api/profile/route.ts` SELECTs `phone, address` and its PATCH
-- allowlist accepts `phone`/`address`, but NO migration ever created them —
-- so the live query drops/errors. `mobile-app/app/profile/edit.tsx` edits
-- city/state/zip/date_of_birth on top of that.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- ---------------------------------------------------------------------------
-- 2. audit_logs: columns the security writers already write.
--
-- `src/app/api/admin/audit/route.ts` INSERTs `details`, and
-- `src/lib/audit/audit-logger.ts` writes `actor_email/target_type/success/
-- error_message` — none of which exist. audit-logger SWALLOWS the resulting
-- insert error, so security audit logging is silently failing in production
-- right now. Adding the columns makes those writes land; unswallowing the
-- error is a code change tracked separately (ADR-0010 / M0-1).
--
-- NOTE: `resource_type` is NOT NULL on the operative (002) table, so the admin
-- POST must SUPPLY it rather than have the constraint relaxed — dropping a NOT
-- NULL is not additive and is deliberately not done here.
-- ---------------------------------------------------------------------------
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_email TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS success BOOLEAN;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs (type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs (category);

-- ---------------------------------------------------------------------------
-- 3. transactions: the table the app reads and writes, which no migration
--    ever created.
--
-- Columns are taken from the two real call sites, reconciled:
--   writer  `src/lib/financial/plaid-service.ts:411` upserts
--           id, account_id, user_id, transaction_id, date, amount,
--           merchant_name, category (string[]), pending
--   reader  `src/lib/financial/spending-analyzer.ts:77` expects
--           user_id, account_id, date, amount, merchant_name, category,
--           subcategory, is_pending, is_recurring, created_at
--
-- The writer/reader disagreed on two fields. Resolved explicitly:
--   * `category` is TEXT[] — the Plaid writer is the source of truth and Plaid
--     returns a category hierarchy. The reader treats it as a single string;
--     that read path must index [0] (tracked as an M0 follow-up rather than
--     silently narrowing the stored data).
--   * `pending` vs `is_pending` — stored ONCE, as `is_pending` (the reader's
--     name; it pairs with `is_recurring`). A generated mirror column is NOT
--     possible here because generated columns are not writable and the Plaid
--     writer INSERTs the field, so `plaid-service.ts:411` must be changed to
--     write `is_pending`. That is a code change, tracked as an M0 follow-up —
--     until it lands, the writer's `pending` key will error against this table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  transaction_id TEXT,
  date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  merchant_name TEXT,
  category TEXT[] DEFAULT '{}',
  subcategory TEXT,
  is_pending BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);
