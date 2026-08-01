-- ============================================================================
-- credit_builder_applications + rent_reporting_accounts + rent_payments
--
-- CORRECTION: an earlier pass in this session (commit 5635b21) classified
-- these three tables' owning modules (CreditBuilderLoanService.ts,
-- RentReportingService.ts) DEAD by HTTP reachability and deleted them.
-- That was wrong. `git log --follow` on both files shows a recent, explicitly
-- labeled commit (2a99c6d, "TASK-CRD-2 IDOR sweep") that added user-scoping
-- fixes to updateApplication/updateAccount/getPaymentHistory, backed by
-- dedicated *.idor.test.ts regression suites -- someone was actively
-- investing in and security-hardening this code, not abandoning it. "No
-- live route calls it today" is not the same as "abandoned legacy code."
-- Per this session's own established rule for that exact distinction: when
-- a DEAD-classified table's owning code has passing tests and recent git
-- activity, the default flips to "build the missing table," not "delete
-- the code" -- even though building is more work than deleting. The two
-- deleted files were restored (`git checkout <pre-deletion-commit> --
-- <paths>`) unmodified; this migration builds their backing schema.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- credit_builder_applications
--
-- Backs CreditBuilderLoanService.trackApplication/updateApplication/
-- getUserApplications (src/lib/credit/services/CreditBuilderLoanService.ts).
-- Column shape matches toDbFormat()/fromDbFormat() exactly (lines 627-675):
--   id, user_id, loan_id, provider, status, applied_date, approved_date,
--   loan_amount, term, apr, monthly_payment, start_date, end_date,
--   payments_made, payments_remaining, on_time_payments, created_at,
--   updated_at.
--
-- loan_id is TEXT, not a UUID FK: it identifies an entry in the in-memory
-- CREDIT_BUILDER_LOANS catalog (e.g. "self-credit-builder"), not a database
-- row -- matching this schema's existing precedent for opaque catalog/
-- bureau-sourced identifiers (see bureau_disputes.credit_item_id in
-- 20260731000007).
--
-- provider/status CHECK values are the full literal unions from
-- LoanProvider and LoanApplication['status'] in that same file -- nothing
-- invented beyond what the code already emits.
--
-- RLS: SELECT + INSERT + UPDATE scoped to auth.uid() = user_id -- a user
-- tracking their own loan application is a direct user action, and
-- updateApplication's IDOR guard (the .idor.test.ts this migration exists
-- to unblock) already scopes its own query to `.eq("user_id", userId)`; RLS
-- backs that same invariant at the database layer.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_builder_applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id            TEXT NOT NULL,
  provider           TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'started',
  applied_date       TIMESTAMPTZ NOT NULL,
  approved_date      TIMESTAMPTZ,
  loan_amount        NUMERIC(12,2),
  term               INTEGER,
  apr                NUMERIC(6,3),
  monthly_payment    NUMERIC(12,2),
  start_date         TIMESTAMPTZ,
  end_date           TIMESTAMPTZ,
  payments_made      INTEGER NOT NULL DEFAULT 0,
  payments_remaining INTEGER NOT NULL DEFAULT 0,
  on_time_payments   INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_builder_applications_provider_check CHECK (
    provider IN (
      'self', 'chime', 'moneyLion', 'dave', 'brigit', 'current', 'varo',
      'credit_strong', 'local_credit_union'
    )
  ),
  CONSTRAINT credit_builder_applications_status_check CHECK (
    status IN (
      'started', 'submitted', 'approved', 'denied', 'active', 'completed',
      'defaulted'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_credit_builder_applications_user_id
  ON credit_builder_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_builder_applications_status
  ON credit_builder_applications(status);

ALTER TABLE credit_builder_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credit builder applications" ON credit_builder_applications;
CREATE POLICY "Users can view own credit builder applications" ON credit_builder_applications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own credit builder applications" ON credit_builder_applications;
CREATE POLICY "Users can insert own credit builder applications" ON credit_builder_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credit builder applications" ON credit_builder_applications;
CREATE POLICY "Users can update own credit builder applications" ON credit_builder_applications
  FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_credit_builder_applications_updated_at ON credit_builder_applications;
CREATE TRIGGER update_credit_builder_applications_updated_at
  BEFORE UPDATE ON credit_builder_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- rent_reporting_accounts
--
-- Backs RentReportingIntegrationService.createAccount/updateAccount/
-- getUserAccounts (src/lib/credit/services/RentReportingService.ts).
-- Column shape matches accountToDb()/accountFromDb() exactly (lines
-- 544-607): id, user_id, provider, status, landlord_name, landlord_email,
-- landlord_phone, property_address, monthly_rent, lease_start_date,
-- lease_end_date, verification_status, verification_method, verified_at,
-- reporting_start_date, historical_months_reported, total_payments_reported,
-- on_time_payments, late_payments, missed_payments, created_at, updated_at.
--
-- provider/status/verification_status/verification_method CHECK values are
-- the full literal unions from RentReportingProvider, ReportingStatus, and
-- RentReportingAccount['verificationStatus' | 'verificationMethod'] in that
-- same file. Note verification_method here is the 2-value account field
-- ("bank" | "landlord"), distinct from the 3-value catalog-level
-- RentReportingService.verificationMethod ("bank" | "landlord" | "both"),
-- which is never persisted -- it describes the provider, not the account.
--
-- RLS: SELECT + INSERT + UPDATE scoped to auth.uid() = user_id, same
-- reasoning as credit_builder_applications above -- updateAccount's IDOR
-- guard already scopes to `.eq("user_id", userId)` at the application
-- layer; RLS backs the same invariant at the database layer.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rent_reporting_accounts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider                  TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'pending',
  landlord_name             TEXT NOT NULL,
  landlord_email            TEXT,
  landlord_phone            TEXT,
  property_address          TEXT NOT NULL,
  monthly_rent              NUMERIC(12,2) NOT NULL,
  lease_start_date          TIMESTAMPTZ NOT NULL,
  lease_end_date            TIMESTAMPTZ,
  verification_status       TEXT NOT NULL DEFAULT 'pending',
  verification_method       TEXT NOT NULL,
  verified_at               TIMESTAMPTZ,
  reporting_start_date      TIMESTAMPTZ,
  historical_months_reported INTEGER NOT NULL DEFAULT 0,
  total_payments_reported   INTEGER NOT NULL DEFAULT 0,
  on_time_payments          INTEGER NOT NULL DEFAULT 0,
  late_payments             INTEGER NOT NULL DEFAULT 0,
  missed_payments           INTEGER NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rent_reporting_accounts_provider_check CHECK (
    provider IN (
      'boom', 'rental_kharma', 'rent_reporters', 'self_rent',
      'experian_boost', 'level_credit', 'piñata'
    )
  ),
  CONSTRAINT rent_reporting_accounts_status_check CHECK (
    status IN ('pending', 'verified', 'reporting', 'paused', 'cancelled')
  ),
  CONSTRAINT rent_reporting_accounts_verification_status_check CHECK (
    verification_status IN ('pending', 'verified', 'failed')
  ),
  CONSTRAINT rent_reporting_accounts_verification_method_check CHECK (
    verification_method IN ('bank', 'landlord')
  )
);

CREATE INDEX IF NOT EXISTS idx_rent_reporting_accounts_user_id
  ON rent_reporting_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_rent_reporting_accounts_status
  ON rent_reporting_accounts(status);

ALTER TABLE rent_reporting_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rent reporting accounts" ON rent_reporting_accounts;
CREATE POLICY "Users can view own rent reporting accounts" ON rent_reporting_accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rent reporting accounts" ON rent_reporting_accounts;
CREATE POLICY "Users can insert own rent reporting accounts" ON rent_reporting_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rent reporting accounts" ON rent_reporting_accounts;
CREATE POLICY "Users can update own rent reporting accounts" ON rent_reporting_accounts
  FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_rent_reporting_accounts_updated_at ON rent_reporting_accounts;
CREATE TRIGGER update_rent_reporting_accounts_updated_at
  BEFORE UPDATE ON rent_reporting_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- rent_payments
--
-- Backs RentReportingIntegrationService.recordPayment/getPaymentHistory
-- (same file). Column shape matches the insert in recordPayment() and
-- paymentFromDb() exactly (lines 419-463): id, account_id, user_id, amount,
-- due_date, paid_date, status, reported_to_credit, reported_date,
-- bureaus_reported, created_at.
--
-- account_id FKs to rent_reporting_accounts(id) ON DELETE CASCADE -- a
-- payment has no independent existence once its reporting account is gone,
-- matching credit_accounts -> credit_reports in this schema. user_id is
-- ALSO stored directly (denormalized against account_id) because
-- getPaymentHistory's IDOR guard filters `.eq("account_id", accountId)
-- .eq("user_id", userId)` directly on this table rather than joining
-- through the account -- the redundant column is what the code (and its
-- .idor.test.ts) already depends on, not an invented addition.
--
-- status CHECK is the full PaymentStatus union. bureaus_reported is a plain
-- TEXT[] (equifax/experian/transunion) -- no array-element CHECK, matching
-- this schema's existing precedent of not constraining array contents.
--
-- RLS: SELECT + INSERT scoped to auth.uid() = user_id -- a user recording
-- their own rent payment is a direct user action; no UPDATE/DELETE policy,
-- matching credit_scores (payment history is append-only, never edited
-- after the fact by the current code).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rent_payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         UUID NOT NULL REFERENCES rent_reporting_accounts(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount             NUMERIC(12,2) NOT NULL,
  due_date           TIMESTAMPTZ NOT NULL,
  paid_date          TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'pending',
  reported_to_credit BOOLEAN NOT NULL DEFAULT false,
  reported_date      TIMESTAMPTZ,
  bureaus_reported   TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rent_payments_status_check CHECK (
    status IN ('pending', 'on_time', 'late', 'missed', 'partial')
  )
);

CREATE INDEX IF NOT EXISTS idx_rent_payments_account_id
  ON rent_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_user_id
  ON rent_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_due_date
  ON rent_payments(due_date DESC);

ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rent payments" ON rent_payments;
CREATE POLICY "Users can view own rent payments" ON rent_payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rent payments" ON rent_payments;
CREATE POLICY "Users can insert own rent payments" ON rent_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
