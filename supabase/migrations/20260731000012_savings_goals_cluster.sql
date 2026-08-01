-- Savings/goals phantom-table cluster (SYSTEMATIC-REVIEW-SYNTHESIS, triage-financial slice)
--
-- PROBLEM: `savings_goals`, `savings_rules`, `savings_contributions`,
-- `savings_transfers`, and `monthly_summaries` are queried by
-- src/lib/financial/savings-automation-service.ts (the writer behind
-- /api/financial/savings*), src/lib/financial/savings-optimizer.ts, and
-- src/lib/financial/financial-aggregation-service.ts, but none has ever
-- existed on the live schema. PostgREST resolves an {error} object for a
-- missing relation instead of throwing, and this codebase overwhelmingly
-- swallows that error — reads silently returned `[]` (dashboards showed $0
-- saved / zero goals) and writes threw "relation does not exist" (creating
-- a goal or rule 500d). Verified live 2026-07-31 against all 62 migrations.
--
-- CLASSIFICATION (full reasoning + reachability evidence in
-- docs/qa/triage-financial.md):
--   RENAME (+ALTER): savings_goals -> financial_goals (real table, only
--     7 of 17 fields the code maps already exist)
--   UNBUILT + reachable (build): savings_rules, savings_contributions,
--     savings_transfers, monthly_summaries
--   DEAD (deleted in the same commit as this migration, not migrated):
--     save_transfers, scheduled_contributions, contribution_schedules,
--     auto_save_rules, goal_contributions, goal_milestones,
--     goal_notifications, goal_investment_links, weekly_summaries,
--     summary_preferences — zero reachable callers (barrel-only exports,
--     confirmed via import-graph trace, not just path grep).
--
-- GRANTS: this local instance does not auto-grant SELECT/INSERT/UPDATE/
-- DELETE to anon/authenticated/service_role on any table (verified via
-- information_schema.role_table_grants — profiles, transactions, and
-- financial_goals all show only REFERENCES/TRIGGER/TRUNCATE for every
-- non-postgres role). Both fixed call sites in this commit
-- (savings-automation-service.ts fully, savings-optimizer.ts's
-- getExistingGoals()) now use supabaseAdmin (service_role) rather than
-- getSupabase() (anon key, no forwarded JWT — auth.uid() is NULL, so
-- auth.uid() = user_id RLS policies would filter out every row even with a
-- grant). Matches the established pattern in wellness-gate.ts and
-- plaid-service.ts. RLS is still enabled with real per-user policies below
-- as defense in depth for any future anon/authenticated-key consumer.

-- ============================================================================
-- financial_goals — additive ALTER for the savings-automation call shape
-- ============================================================================
-- `type` (pre-existing, NOT NULL, its own CHECK constraint) is the general
-- goal-tracking discriminator already written by 13+ other reachable
-- consumers (goal-planner.ts, GoalInvestmentService.ts, financial-chat-
-- engine.ts, wellness-gate.ts, etc.) — left untouched. `category` below is
-- a SEPARATE, savings-specific vocabulary (see savings.types.ts
-- SavingsGoalCategory); savings-automation-service.ts maps category to the
-- closest `type` value on every write so the shared NOT NULL column stays
-- satisfied without corrupting the general feature's discriminator.
ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE financial_goals
  DROP CONSTRAINT IF EXISTS financial_goals_category_check;
ALTER TABLE financial_goals ADD CONSTRAINT financial_goals_category_check
  CHECK (category IS NULL OR category IN (
    'emergency_fund', 'vacation', 'major_purchase', 'education',
    'retirement', 'home_down_payment', 'debt_payoff', 'custom'
  ));

-- Backfilled to now() for rows created by the 13 pre-existing consumers,
-- none of which ever set this column — "we don't know when it started,
-- treat it as starting now" is a safer default than leaving reads to
-- produce Invalid Date (both call sites in this slice do
-- `new Date(row.start_date)` with no null guard).
ALTER TABLE financial_goals
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS notes TEXT;
-- Read by both savings-automation-service.ts and savings-optimizer.ts
-- (`row.linked_rule_ids || []`) but never written by either — no rule ->
-- goal back-reference is implemented yet. Included because it's part of
-- the shipped SavingsGoal contract and the read sites already expect it;
-- left unpopulated (write-path is a separate, unrequested feature, not a
-- phantom-table defect).
ALTER TABLE financial_goals
  ADD COLUMN IF NOT EXISTS linked_rule_ids TEXT[] DEFAULT '{}';

-- service_role (supabaseAdmin, see header) had no base grant on this
-- table at all prior to this migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_goals TO service_role;

-- ============================================================================
-- savings_rules — automation rules (round-up, percentage, fixed, surplus,
-- goal-based); every column below is read from or written by
-- savings-automation-service.ts's getRules/getRule/createRule/updateRule/
-- deleteRule/updateRuleStats.
-- ============================================================================
CREATE TABLE IF NOT EXISTS savings_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'round_up', 'percentage', 'fixed', 'surplus', 'goal_based'
  )),
  frequency TEXT NOT NULL CHECK (frequency IN (
    'per_transaction', 'daily', 'weekly', 'biweekly', 'monthly'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'paused', 'completed', 'cancelled'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  goal_id UUID REFERENCES financial_goals(id) ON DELETE SET NULL,
  -- Unconstrained TEXT, matching the established financial_accounts /
  -- transactions.account_id convention (financial_accounts uses a
  -- composite TEXT id, not every account reference is FK-backed yet).
  source_account_id TEXT,
  destination_account_id TEXT,
  total_saved NUMERIC(15,2) NOT NULL DEFAULT 0,
  transfer_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_rules_user_id ON savings_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_rules_goal_id ON savings_rules(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_rules_status ON savings_rules(status);

ALTER TABLE savings_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own savings rules" ON savings_rules;
CREATE POLICY "Users manage own savings rules"
  ON savings_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON savings_rules TO authenticated, service_role;

-- ============================================================================
-- savings_contributions — deposit ledger for a savings goal; columns read
-- from/written by addContribution/getContributions.
-- ============================================================================
CREATE TABLE IF NOT EXISTS savings_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Not read/written via a bare user_id filter anywhere in the reachable
  -- code (contributions are always scoped through goal_id) — still carried
  -- directly (not just via a goal_id join) to match this repo's existing
  -- child-table RLS convention (see investment_holdings/investment_
  -- transactions/financial_chat_messages in 20251217000001), and because
  -- addContribution() already has userId in scope, so populating it is
  -- zero extra cost. savings-automation-service.ts's insert was updated in
  -- this commit to set it.
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual', 'auto_rule', 'round_up', 'transfer'
  )),
  -- Read by mapContributionFromDb but not currently written by any caller
  -- (addContribution() never threads a ruleId/transactionId through) —
  -- included because the read site already expects them; nullable, no
  -- FK-enforced write path added (would be unused/speculative).
  rule_id UUID REFERENCES savings_rules(id) ON DELETE SET NULL,
  transaction_id TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_contributions_user_id ON savings_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal_id ON savings_contributions(goal_id);

ALTER TABLE savings_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own savings contributions" ON savings_contributions;
CREATE POLICY "Users manage own savings contributions"
  ON savings_contributions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON savings_contributions TO authenticated, service_role;

-- ============================================================================
-- savings_transfers — executed auto-save transfer ledger; columns read
-- from/written by createTransfer/getSummary.
-- ============================================================================
CREATE TABLE IF NOT EXISTS savings_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- createTransfer() always supplies ruleId (non-optional in its private
  -- param type) — every transfer originates from a rule.
  rule_id UUID NOT NULL REFERENCES savings_rules(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES financial_goals(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'failed', 'cancelled'
  )),
  -- Unconstrained/nullable TEXT: processRoundUp() falls back to `""` when
  -- a rule has no source/destination account configured yet.
  source_account_id TEXT,
  destination_account_id TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'transaction', 'scheduled', 'manual'
  )),
  trigger_transaction_id TEXT,
  error_message TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_transfers_user_id ON savings_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_transfers_rule_id ON savings_transfers(rule_id);
CREATE INDEX IF NOT EXISTS idx_savings_transfers_user_status_created
  ON savings_transfers(user_id, status, created_at);

ALTER TABLE savings_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own savings transfers" ON savings_transfers;
CREATE POLICY "Users manage own savings transfers"
  ON savings_transfers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON savings_transfers TO authenticated, service_role;

-- ============================================================================
-- monthly_summaries — per-user monthly income/expense rollup read by
-- financial-aggregation-service.ts's fetchIncomeHistory/fetchSpendingHistory
-- (feeds the trend charts on /api/financial/aggregated,
-- /api/financial/health-score{,/v2}).
--
-- NOTE (honesty, not a fix pretending to be complete): nothing in this
-- codebase currently computes and inserts into this table — there is no
-- monthly-rollup job. Building it closes the phantom-table defect (a
-- swallowed "relation does not exist" error masquerading as an honest
-- empty trend) but the trend charts will show no data points until a
-- rollup producer exists. That producer is a separate, larger feature
-- (scheduled job + aggregation-from-transactions logic) intentionally left
-- out of this table-existence fix — flagged for the team rather than
-- guessed at here. `transactions.amount`'s income/expense sign convention
-- is inconsistently applied across this codebase today (compare
-- financial-service.ts vs. income-tracking-service.ts vs.
-- spending-analysis-service.ts) — resolving that ambiguity is a
-- prerequisite for any correct rollup producer and out of scope here.
-- ============================================================================
CREATE TABLE IF NOT EXISTS monthly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_income NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_summaries_user_month ON monthly_summaries(user_id, month);

ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own monthly summaries" ON monthly_summaries;
CREATE POLICY "Users view own monthly summaries"
  ON monthly_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- No authenticated INSERT/UPDATE/DELETE policy: this is a computed
-- rollup, not user-entered data (same rationale as financial_accounts in
-- 20260731000006) — only a future service-role rollup job should write it.
DROP POLICY IF EXISTS "Service role manages monthly summaries" ON monthly_summaries;
CREATE POLICY "Service role manages monthly summaries"
  ON monthly_summaries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON monthly_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON monthly_summaries TO service_role;
