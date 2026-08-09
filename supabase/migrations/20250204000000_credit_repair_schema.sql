-- Credit Repair Accelerator Schema
-- This migration creates all tables needed for the Credit Repair Accelerator system
-- Created: 2025-01-04
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CREDIT REPAIR SCORES TABLE
-- Stores user credit repair scores over time with factors and opportunities
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_repair_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  factors JSONB NOT NULL DEFAULT '{}',
  opportunities JSONB NOT NULL DEFAULT '[]',
  estimated_impact INTEGER,
  timeline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for credit_repair_scores
CREATE INDEX IF NOT EXISTS idx_credit_repair_scores_user_id ON credit_repair_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_repair_scores_created_at ON credit_repair_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_repair_scores_score ON credit_repair_scores(score);

-- ============================================================================
-- CREDIT REPAIR ACTIONS TABLE
-- Tracks all credit repair actions with status and outcomes
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_repair_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'dispute_inaccuracy',
    'pay_down_utilization',
    'goodwill_letter',
    'pay_for_delete',
    'remove_inquiry',
    'optimize_payment_timing',
    'add_authorized_user',
    'credit_builder_loan',
    'secured_credit_card',
    'debt_consolidation'
  )),
  action_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
  )),
  impact INTEGER,
  success_rate DECIMAL(5, 2),
  timeline TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for credit_repair_actions
CREATE INDEX IF NOT EXISTS idx_credit_repair_actions_user_id ON credit_repair_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_repair_actions_status ON credit_repair_actions(status);
CREATE INDEX IF NOT EXISTS idx_credit_repair_actions_action_type ON credit_repair_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_credit_repair_actions_created_at ON credit_repair_actions(created_at DESC);

-- ============================================================================
-- CREDIT REPAIR PROGRESS TABLE
-- Tracks milestones and progress over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_repair_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_data JSONB NOT NULL DEFAULT '{}',
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  score_before INTEGER,
  score_after INTEGER,
  impact INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for credit_repair_progress
CREATE INDEX IF NOT EXISTS idx_credit_repair_progress_user_id ON credit_repair_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_repair_progress_achieved_at ON credit_repair_progress(achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_repair_progress_milestone_type ON credit_repair_progress(milestone_type);

-- ============================================================================
-- CREDIT REPORTS TABLE
-- Stores credit report data from all three bureaus
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL DEFAULT '{}',
  bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
  report_date DATE NOT NULL,
  score INTEGER CHECK (score >= 300 AND score <= 850),
  accounts JSONB NOT NULL DEFAULT '[]',
  inquiries JSONB NOT NULL DEFAULT '[]',
  collections JSONB NOT NULL DEFAULT '[]',
  public_records JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for credit_reports
-- ---------------------------------------------------------------------------
-- Twin-schema reconciliation (M0 / ADR-0001).
--
-- `20250107_credit_bureau_tables.sql` also declares `CREATE TABLE IF NOT EXISTS
-- credit_reports`, with a DIFFERENT shape (credit_score / raw_data /
-- parsed_data). It sorts first, so the CREATE above is skipped and the columns
-- this file's indexes and the application code rely on (score, report_data,
-- accounts, inquiries, collections, public_records) never exist. Provisioning
-- then died here: `ERROR: column "score" does not exist` on the index below —
-- the whole migration chain aborted, so the database could not be built from
-- this repo at all.
--
-- These ALTERs converge the table to the union of both shapes. They are
-- additive and idempotent: no-ops when this file's CREATE did run, and the
-- healing path when 20250107's did. Nothing is dropped or retyped, so an
-- already-provisioned database is safe.
-- ---------------------------------------------------------------------------
ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS report_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS accounts JSONB NOT NULL DEFAULT '[]';
ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS inquiries JSONB NOT NULL DEFAULT '[]';
ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS collections JSONB NOT NULL DEFAULT '[]';
ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS public_records JSONB NOT NULL DEFAULT '[]';
ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Range check for `score` mirrors the CREATE above. Added separately because
-- ADD COLUMN IF NOT EXISTS cannot carry a named constraint idempotently.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_reports_score_range'
  ) THEN
    ALTER TABLE credit_reports
      ADD CONSTRAINT credit_reports_score_range
      CHECK (score IS NULL OR (score >= 300 AND score <= 850));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_credit_reports_user_id ON credit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_bureau ON credit_reports(bureau);
CREATE INDEX IF NOT EXISTS idx_credit_reports_report_date ON credit_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_credit_reports_score ON credit_reports(score);

-- ============================================================================
-- DISPUTES TABLE
-- Tracks all credit report disputes with full lifecycle
-- ============================================================================
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_description TEXT NOT NULL,
  creditor_name TEXT,
  account_number TEXT,
  balance DECIMAL(12, 2),
  inaccuracy_type TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN (
    'basic_dispute',
    'debt_validation',
    'method_of_verification',
    'procedural_violation',
    'statute_of_limitations',
    'identity_theft',
    'mixed_file',
    'creditor_direct',
    'goodwill',
    'pay_for_delete'
  )),
  letter_content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'sent',
    'under_review',
    'resolved',
    'rejected',
    'escalated'
  )),
  bureau TEXT NOT NULL CHECK (bureau IN ('experian', 'equifax', 'transunion')),
  sent_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  outcome TEXT CHECK (outcome IN ('removed', 'updated', 'verified', 'pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for disputes
-- ---------------------------------------------------------------------------
-- Twin-schema reconciliation (M0 / ADR-0001) — same pattern as credit_reports.
--
-- `001_initial_schema.sql` also declares `CREATE TABLE IF NOT EXISTS disputes`
-- with a narrower shape (no strategy / creditor_name / account_number /
-- balance / inaccuracy_type / response_received_at / notes / updated_at). It
-- sorts first, so the CREATE above is skipped and provisioning died on the
-- `strategy` index below. Additive + idempotent: no-op when this file's CREATE
-- ran, healing path when 001's did. Nothing dropped or retyped.
--
-- NOTE: the two shapes also disagree on CHECK constraints (001 omits the
-- 'escalated' status and the 'pending' outcome). Widening an existing CHECK is
-- NOT additive, so it is deliberately NOT done here — tracked as an M0
-- follow-up rather than silently altering validation on a populated table.
-- ---------------------------------------------------------------------------
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS creditor_name TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2);
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS inaccuracy_type TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS strategy TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS response_received_at TIMESTAMPTZ;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'disputes_strategy_allowed'
  ) THEN
    ALTER TABLE disputes
      ADD CONSTRAINT disputes_strategy_allowed
      CHECK (strategy IS NULL OR strategy IN (
        'basic_dispute',
        'debt_validation',
        'method_of_verification',
        'procedural_violation',
        'statute_of_limitations',
        'identity_theft',
        'mixed_file',
        'creditor_direct',
        'goodwill',
        'pay_for_delete'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_bureau ON disputes(bureau);
CREATE INDEX IF NOT EXISTS idx_disputes_strategy ON disputes(strategy);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);

-- ============================================================================
-- GOODWILL LETTERS TABLE
-- Tracks goodwill letter requests to creditors
-- ============================================================================
CREATE TABLE IF NOT EXISTS goodwill_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creditor_name TEXT NOT NULL,
  account_number TEXT,
  late_payment_date DATE,
  reason TEXT NOT NULL,
  letter_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'sent',
    'under_review',
    'approved',
    'denied'
  )),
  sent_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  outcome TEXT CHECK (outcome IN ('removed', 'denied', 'pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for goodwill_letters
CREATE INDEX IF NOT EXISTS idx_goodwill_letters_user_id ON goodwill_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_goodwill_letters_status ON goodwill_letters(status);
CREATE INDEX IF NOT EXISTS idx_goodwill_letters_created_at ON goodwill_letters(created_at DESC);

-- ============================================================================
-- NEGOTIATIONS TABLE
-- Tracks pay-for-delete negotiations with collection agencies
-- ============================================================================
CREATE TABLE IF NOT EXISTS negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_agency TEXT NOT NULL,
  original_creditor TEXT,
  account_number TEXT,
  original_balance DECIMAL(12, 2) NOT NULL,
  current_balance DECIMAL(12, 2) NOT NULL,
  settlement_percentage DECIMAL(5, 2),
  settlement_amount DECIMAL(12, 2),
  scripts JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'negotiating',
    'agreed',
    'paid',
    'deleted',
    'failed'
  )),
  negotiated_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for negotiations
CREATE INDEX IF NOT EXISTS idx_negotiations_user_id ON negotiations(user_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_status ON negotiations(status);
CREATE INDEX IF NOT EXISTS idx_negotiations_created_at ON negotiations(created_at DESC);

-- ============================================================================
-- CREDIT CARDS TABLE
-- Stores user credit card data for utilization optimization
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(12, 2) NOT NULL,
  utilization DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN credit_limit > 0 THEN (current_balance / credit_limit * 100)
      ELSE 0
    END
  ) STORED,
  statement_date INTEGER CHECK (statement_date >= 1 AND statement_date <= 31),
  due_date INTEGER CHECK (due_date >= 1 AND due_date <= 31),
  last_payment_date DATE,
  last_payment_amount DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for credit_cards
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_utilization ON credit_cards(utilization);
CREATE INDEX IF NOT EXISTS idx_credit_cards_statement_date ON credit_cards(statement_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensure users can only access their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE credit_repair_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_repair_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_repair_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE goodwill_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_repair_scores
DROP POLICY IF EXISTS "Users can view their own credit repair scores" ON credit_repair_scores;
CREATE POLICY "Users can view their own credit repair scores"
  ON credit_repair_scores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credit repair scores" ON credit_repair_scores;
CREATE POLICY "Users can insert their own credit repair scores"
  ON credit_repair_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credit repair scores" ON credit_repair_scores;
CREATE POLICY "Users can update their own credit repair scores"
  ON credit_repair_scores FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own credit repair scores" ON credit_repair_scores;
CREATE POLICY "Users can delete their own credit repair scores"
  ON credit_repair_scores FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for credit_repair_actions
DROP POLICY IF EXISTS "Users can view their own credit repair actions" ON credit_repair_actions;
CREATE POLICY "Users can view their own credit repair actions"
  ON credit_repair_actions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credit repair actions" ON credit_repair_actions;
CREATE POLICY "Users can insert their own credit repair actions"
  ON credit_repair_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credit repair actions" ON credit_repair_actions;
CREATE POLICY "Users can update their own credit repair actions"
  ON credit_repair_actions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own credit repair actions" ON credit_repair_actions;
CREATE POLICY "Users can delete their own credit repair actions"
  ON credit_repair_actions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for credit_repair_progress
DROP POLICY IF EXISTS "Users can view their own credit repair progress" ON credit_repair_progress;
CREATE POLICY "Users can view their own credit repair progress"
  ON credit_repair_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credit repair progress" ON credit_repair_progress;
CREATE POLICY "Users can insert their own credit repair progress"
  ON credit_repair_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own credit repair progress" ON credit_repair_progress;
CREATE POLICY "Users can delete their own credit repair progress"
  ON credit_repair_progress FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for credit_reports
--
-- M0 fix: `20250107_credit_bureau_tables.sql` declares these same four policy
-- names on this same table, and Postgres has no `CREATE POLICY IF NOT EXISTS`,
-- so provisioning aborted with `policy ... already exists`. DROP-then-CREATE is
-- the idempotent idiom; the definitions below are identical in effect
-- (`auth.uid() = user_id`), so re-creating them changes no access decision.
DROP POLICY IF EXISTS "Users can view their own credit reports" ON credit_reports;
CREATE POLICY "Users can view their own credit reports"
  ON credit_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credit reports" ON credit_reports;
CREATE POLICY "Users can insert their own credit reports"
  ON credit_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credit reports" ON credit_reports;
CREATE POLICY "Users can update their own credit reports"
  ON credit_reports FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own credit reports" ON credit_reports;
CREATE POLICY "Users can delete their own credit reports"
  ON credit_reports FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for disputes
DROP POLICY IF EXISTS "Users can view their own disputes" ON disputes;
CREATE POLICY "Users can view their own disputes"
  ON disputes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own disputes" ON disputes;
CREATE POLICY "Users can insert their own disputes"
  ON disputes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own disputes" ON disputes;
CREATE POLICY "Users can update their own disputes"
  ON disputes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own disputes" ON disputes;
CREATE POLICY "Users can delete their own disputes"
  ON disputes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for goodwill_letters
DROP POLICY IF EXISTS "Users can view their own goodwill letters" ON goodwill_letters;
CREATE POLICY "Users can view their own goodwill letters"
  ON goodwill_letters FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goodwill letters" ON goodwill_letters;
CREATE POLICY "Users can insert their own goodwill letters"
  ON goodwill_letters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goodwill letters" ON goodwill_letters;
CREATE POLICY "Users can update their own goodwill letters"
  ON goodwill_letters FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goodwill letters" ON goodwill_letters;
CREATE POLICY "Users can delete their own goodwill letters"
  ON goodwill_letters FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for negotiations
DROP POLICY IF EXISTS "Users can view their own negotiations" ON negotiations;
CREATE POLICY "Users can view their own negotiations"
  ON negotiations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own negotiations" ON negotiations;
CREATE POLICY "Users can insert their own negotiations"
  ON negotiations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own negotiations" ON negotiations;
CREATE POLICY "Users can update their own negotiations"
  ON negotiations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own negotiations" ON negotiations;
CREATE POLICY "Users can delete their own negotiations"
  ON negotiations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for credit_cards
DROP POLICY IF EXISTS "Users can view their own credit cards" ON credit_cards;
CREATE POLICY "Users can view their own credit cards"
  ON credit_cards FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credit cards" ON credit_cards;
CREATE POLICY "Users can insert their own credit cards"
  ON credit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credit cards" ON credit_cards;
CREATE POLICY "Users can update their own credit cards"
  ON credit_cards FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own credit cards" ON credit_cards;
CREATE POLICY "Users can delete their own credit cards"
  ON credit_cards FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- Automatically update updated_at column on row updates
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE OR REPLACE TRIGGER update_credit_repair_scores_updated_at
  BEFORE UPDATE ON credit_repair_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_credit_repair_actions_updated_at
  BEFORE UPDATE ON credit_repair_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_credit_reports_updated_at
  BEFORE UPDATE ON credit_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_goodwill_letters_updated_at
  BEFORE UPDATE ON goodwill_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_negotiations_updated_at
  BEFORE UPDATE ON negotiations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE credit_repair_scores IS 'Stores user credit repair scores over time with factors and opportunities';
COMMENT ON TABLE credit_repair_actions IS 'Tracks all credit repair actions with status and outcomes';
COMMENT ON TABLE credit_repair_progress IS 'Tracks milestones and progress over time';
COMMENT ON TABLE credit_reports IS 'Stores credit report data from all three bureaus';
COMMENT ON TABLE disputes IS 'Tracks all credit report disputes with full lifecycle';
COMMENT ON TABLE goodwill_letters IS 'Tracks goodwill letter requests to creditors';
COMMENT ON TABLE negotiations IS 'Tracks pay-for-delete negotiations with collection agencies';
COMMENT ON TABLE credit_cards IS 'Stores user credit card data for utilization optimization';

-- ============================================================================
-- SAMPLE DATA FOR TESTING (Optional - comment out for production)
-- ============================================================================

-- This section can be used for local testing
-- Comment out or remove before deploying to production

-- Example: Insert sample credit repair score
-- INSERT INTO credit_repair_scores (user_id, score, factors, opportunities, estimated_impact, timeline)
-- VALUES (
--   'sample-user-id',
--   75,
--   '{"utilization": 0.8, "payment_history": 0.9, "credit_age": 0.6}',
--   '[{"type": "pay_down_utilization", "impact": 30}]',
--   30,
--   '30-60 days'
-- );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Credit Repair Accelerator schema migration completed successfully';
  RAISE NOTICE 'Created 8 tables with full indexes and RLS policies';
  RAISE NOTICE 'Tables: credit_repair_scores, credit_repair_actions, credit_repair_progress, credit_reports, disputes, goodwill_letters, negotiations, credit_cards';
END $$;

