-- ============================================================================
-- Alerts / bills / spending phantom-table cluster
-- (docs/qa/SYSTEMATIC-REVIEW-SYNTHESIS.md + docs/qa/phantom-table-inventory.md)
--
-- Six tables below are UNBUILT-but-reachable: each is queried by a live,
-- routed service today and the query silently returns an empty/failure
-- result (PostgREST resolves {error}, it does not throw). For an alerts
-- subsystem specifically, "no alerts" was indistinguishable from "alerts
-- query is broken" — this migration closes that gap by making the query
-- real. Companion source fixes (same commit) stop swallowing the error on
-- these read paths.
--
-- NEW USER-DATA TABLES — reported to team lead for GDPR erasure-cascade
-- registration (the cascade RPC is consolidated by the lead per
-- docs/qa/SYSTEMATIC-REVIEW-SYNTHESIS.md "erasure cascade is a concurrency
-- hazard" — not touched here): financial_alerts, email_logs, budget_alerts,
-- bill_negotiations, bill_negotiation_outcomes, debt_history.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- financial_alerts
--
-- Column shape matches the FinancialAlert interface
-- (src/lib/financial/types/financial-context.types.ts:531) exactly, plus the
-- `dismissed` filter column FinancialContextEngine.getFinancialAlerts()
-- (financial-context-engine.ts:858) already queries with
-- `.eq("dismissed", false)`. Reachable via FinancialContextEngine.
-- getFinancialContext(), called from /api/financial/context,
-- /api/financial/context/summary, /api/ai/financial-coach/dashboard and
-- /debt-strategy, plus five other financial/* services.
--
-- No writer exists anywhere in the codebase yet (verified: this is the only
-- call site referencing this table). Building the table does not fabricate
-- alerts — genuinely empty is still returned — but it turns a permanently-
-- broken query into a correctly-empty one, so a real future failure (RLS
-- misconfig, etc.) is distinguishable from "no alerts exist". Wiring a real
-- writer (aggregating budget_alerts/bill_alerts/credit_alerts/etc. into one
-- feed) is a separate, larger product decision, not attempted here.
--
-- RLS: SELECT only, matching the fact that nothing in the app inserts a row
-- yet (a future writer will run through a service-role connection).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  severity        TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  action_required BOOLEAN NOT NULL DEFAULT false,
  action_type     TEXT,
  action_data     JSONB,
  dismissed       BOOLEAN NOT NULL DEFAULT false,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_alerts_type_check CHECK (type IN (
    'budget_warning', 'bill_due', 'low_balance', 'unusual_spending',
    'goal_milestone', 'account_error'
  )),
  CONSTRAINT financial_alerts_severity_check CHECK (
    severity IN ('info', 'warning', 'critical')
  )
);

CREATE INDEX IF NOT EXISTS idx_financial_alerts_user_id
  ON financial_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_dismissed
  ON financial_alerts(dismissed);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_expires_at
  ON financial_alerts(expires_at);

ALTER TABLE financial_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own financial alerts" ON financial_alerts;
CREATE POLICY "Users can view own financial alerts" ON financial_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- email_logs
--
-- Column shape matches the one live writer exactly
-- (src/lib/automation/dispute-followups.ts:169, sendFollowupEmail(), called
-- from processFollowups() -> GET /api/cron/dispute-followups): user_id,
-- dispute_id, email_type, sent_at. This is a write-only audit trail (no
-- reader exists in the codebase today) of the follow-up emails already sent
-- via Resend for a dispute — kept for FCRA-adjacent support/compliance
-- traceability of communications sent to the user about their dispute.
--
-- dispute_id references the human-letter-drafting `disputes` table (the one
-- dispute-followups.ts actually queries via getDisputesNeedingFollowup()),
-- not bureau_disputes.
--
-- RLS: SELECT only. The only writer runs via SUPABASE_SERVICE_ROLE_KEY
-- (getSupabaseClient() in dispute-followups.ts), which bypasses RLS; the
-- SELECT policy exists so a future "email history" UI can read a user's own
-- log without another migration.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_dispute_id ON email_logs(dispute_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email logs" ON email_logs;
CREATE POLICY "Users can view own email logs" ON email_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- budget_alerts
--
-- Column shape matches BudgetAlertRow exactly
-- (src/lib/financial/types/budget.types.ts:397, the interface
-- budget-service.ts's own mapRowToAlert()/createAlert() already read and
-- write against) — deliberately narrower than the aspirational
-- CreateBudgetAlertInput/BudgetAlert (which also carry category/threshold/
-- isActive; createAlert() never actually inserts those three, so they are
-- not persisted here either — that type/implementation gap is pre-existing
-- and out of this migration's scope).
--
-- Reachable via BudgetService.createAlert/getAlerts/markAlertAsRead/
-- dismissAlert, routed through GET/POST /api/financial/budgets/alerts and
-- called internally whenever a budget crosses its warning/over-budget
-- threshold (checkAndCreateAlerts()).
--
-- type CHECK reuses the full BudgetAlertType literal union (budget.types.ts)
-- — nothing invented beyond what the code already emits.
--
-- RLS: SELECT + UPDATE (read/dismiss), matching credit_alerts' precedent —
-- alerts are system-raised (budget threshold crossed), not user-authored, so
-- no INSERT policy for the authenticated role; the write path runs through
-- the same service-layer client as every other table here.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id  UUID REFERENCES budgets(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  severity   TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  data       JSONB,
  read       BOOLEAN NOT NULL DEFAULT false,
  dismissed  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT budget_alerts_type_check CHECK (type IN (
    'threshold_warning', 'over_budget', 'unusual_spending', 'goal_at_risk',
    'savings_opportunity', 'period_summary', 'overspend', 'underspend',
    'category_limit', 'total_limit'
  )),
  CONSTRAINT budget_alerts_severity_check CHECK (
    severity IN ('info', 'warning', 'critical')
  )
);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON budget_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget_id ON budget_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_dismissed ON budget_alerts(dismissed);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_created_at ON budget_alerts(created_at DESC);

ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own budget alerts" ON budget_alerts;
CREATE POLICY "Users can view own budget alerts" ON budget_alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budget alerts" ON budget_alerts;
CREATE POLICY "Users can update own budget alerts" ON budget_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- bill_negotiations
--
-- NOT a rename target. `negotiations` (existing table) is collection-agency
-- debt SETTLEMENT (collection_agency, settlement_percentage) — a different
-- domain. `recurring_bills.negotiation_status`/`negotiation_savings` are
-- just two status columns on a bill row, not a full negotiation entity with
-- scripts/comparison-data/attempt-history. Repointing either would silently
-- corrupt an unrelated feature (docs/qa/SYSTEMATIC-REVIEW-SYNTHESIS.md trap
-- #4). This is a genuinely separate, previously-unbuilt table.
--
-- Column shape matches BillNegotiationService.mapNegotiationToDb() exactly
-- (src/lib/financial/bill-negotiation-service.ts:809). bill_id is a UUID FK
-- into the real `bills` table — createNegotiation()'s `bill: Bill` argument
-- is always sourced from bill-detection-service.ts's real `bills` rows
-- (confirmed via mapBillFromDb() in the same file, which maps merchant_name/
-- category/amount/frequency/next_due_date/status/is_auto_pay/account_id —
-- exactly the live `bills` schema). category reuses the existing
-- `bill_category` enum for the same reason.
--
-- Reachable via BillNegotiationService, routed through GET/POST
-- /api/financial/bills/negotiate and GET/PATCH/POST
-- /api/financial/bills/negotiate/[id], and fetched directly by the
-- BillNegotiationAssistant.tsx UI component.
--
-- RLS: full CRUD scoped to auth.uid() = user_id — every mutation
-- (createNegotiation/updateNegotiation/addAttempt) is a direct, explicit
-- user action from an authenticated route, same category as `disputes`.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bill_negotiations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id          UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  merchant_name    TEXT NOT NULL,
  category         bill_category NOT NULL,
  current_amount   NUMERIC(10,2) NOT NULL,
  target_amount    NUMERIC(10,2) NOT NULL,
  negotiation_type TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'researching',
  outcome          TEXT,
  actual_savings   NUMERIC(10,2),
  scripts          JSONB,
  talking_points   JSONB,
  comparison_data  JSONB,
  contact_info     JSONB,
  notes            TEXT,
  attempt_history  JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bill_negotiations_type_check CHECK (negotiation_type IN (
    'rate_reduction', 'fee_waiver', 'plan_change', 'cancellation',
    'price_match', 'loyalty_discount', 'bundle_discount'
  )),
  CONSTRAINT bill_negotiations_status_check CHECK (status IN (
    'not_started', 'researching', 'in_progress', 'awaiting_response',
    'completed', 'declined', 'cancelled'
  )),
  CONSTRAINT bill_negotiations_outcome_check CHECK (
    outcome IS NULL OR outcome IN (
      'success', 'partial_success', 'rejected', 'pending', 'no_response'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_bill_negotiations_user_id
  ON bill_negotiations(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_negotiations_bill_id
  ON bill_negotiations(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_negotiations_status
  ON bill_negotiations(status);
CREATE INDEX IF NOT EXISTS idx_bill_negotiations_created_at
  ON bill_negotiations(created_at DESC);

ALTER TABLE bill_negotiations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bill negotiations" ON bill_negotiations;
CREATE POLICY "Users can view own bill negotiations" ON bill_negotiations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bill negotiations" ON bill_negotiations;
CREATE POLICY "Users can insert own bill negotiations" ON bill_negotiations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bill negotiations" ON bill_negotiations;
CREATE POLICY "Users can update own bill negotiations" ON bill_negotiations
  FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_bill_negotiations_updated_at ON bill_negotiations;
CREATE TRIGGER update_bill_negotiations_updated_at
  BEFORE UPDATE ON bill_negotiations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- bill_negotiation_outcomes
--
-- A DIFFERENT, independently-reachable feature from bill_negotiations above
-- (BillNegotiator, not BillNegotiationService) — both are live, both are
-- wired to distinct real routes and UI, so both get built rather than one
-- being treated as a duplicate of the other (that consolidation, if wanted,
-- is a product decision, not a phantom-table fix).
--
-- BillNegotiator.identifyNegotiableBills() (bill-negotiator.ts:89) derives
-- "negotiable bills" from recurring TRANSACTION history, not from the real
-- `bills` table — NegotiableBill.id is a synthetic string
-- (`bill-${merchant}-${userId}`, bill-negotiator.ts:115), so bill_id here is
-- TEXT with no FK, not a UUID reference into `bills`.
--
-- Column shape matches BillNegotiationOutcomeRow exactly
-- (bill-negotiator.ts:41, and the literal insert payload at :280-297).
--
-- Reachable via BillNegotiator, routed through GET /api/financial/bills/
-- analysis, POST /api/financial/bills/[id]/negotiate,
-- GET/POST /api/financial/bills/[id]/outcome, and consumed directly by
-- src/app/financial-intelligence/page.tsx (web) and the mobile
-- financial-intelligence screens.
--
-- RLS: SELECT + INSERT scoped to auth.uid() = user_id — trackNegotiationOutcome
-- is a direct authenticated user action recording the result of a
-- negotiation call; no UPDATE/DELETE policy since nothing in the codebase
-- mutates a recorded outcome.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bill_negotiation_outcomes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id               TEXT NOT NULL,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  negotiation_date      TIMESTAMPTZ NOT NULL,
  success               BOOLEAN NOT NULL,
  savings_achieved      NUMERIC(10,2) NOT NULL,
  new_monthly_rate      NUMERIC(10,2),
  previous_monthly_rate NUMERIC(10,2) NOT NULL,
  method                TEXT NOT NULL,
  duration              INTEGER,
  representative        TEXT,
  notes                 TEXT,
  requires_followup     BOOLEAN NOT NULL DEFAULT false,
  followup_date         TIMESTAMPTZ,
  followup_reason       TEXT,
  recorded_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_negotiation_outcomes_user_id
  ON bill_negotiation_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_negotiation_outcomes_bill_id
  ON bill_negotiation_outcomes(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_negotiation_outcomes_negotiation_date
  ON bill_negotiation_outcomes(negotiation_date DESC);

ALTER TABLE bill_negotiation_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own negotiation outcomes" ON bill_negotiation_outcomes;
CREATE POLICY "Users can view own negotiation outcomes" ON bill_negotiation_outcomes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own negotiation outcomes" ON bill_negotiation_outcomes;
CREATE POLICY "Users can insert own negotiation outcomes" ON bill_negotiation_outcomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- debt_history
--
-- Time-series snapshot table (date, total_debt) — matches
-- FinancialAggregationService.fetchDebtHistory() exactly
-- (financial-aggregation-service.ts:1003), one of seven parallel trend
-- fetchers inside getFinancialTrends(), reachable via
-- GET /api/financial/aggregated.
--
-- No writer exists anywhere in the codebase (verified: this is the only
-- call site). Building the table turns a permanently-broken query into a
-- correctly-empty one, matching the financial_alerts rationale above.
-- Populating real historical points requires a periodic snapshot job that
-- does not exist yet for any of getFinancialTrends()'s six sibling history
-- fetchers either (net_worth_history, monthly_summaries, savings_history,
-- investment_history, health_score_history — all still phantom, owned by
-- other clusters) — building that snapshot cron is a separate, larger
-- feature, out of scope here and flagged in the handoff report rather than
-- attempted.
--
-- RLS: SELECT only, matching financial_alerts (no writer to grant to yet).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS debt_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  total_debt NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debt_history_user_id ON debt_history(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_history_date ON debt_history(date);

ALTER TABLE debt_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own debt history" ON debt_history;
CREATE POLICY "Users can view own debt history" ON debt_history
  FOR SELECT USING (auth.uid() = user_id);
