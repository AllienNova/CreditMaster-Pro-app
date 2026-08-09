-- ============================================================================
-- bureau_disputes + credit_alerts — missing schema behind two FCRA-regulated
-- CRITICALs (docs/qa/SYSTEMATIC-REVIEW-SYNTHESIS.md findings #6 and #7).
--
-- Both tables were already being written to by live code
-- (CreditBureauService.saveDisputeRecord, CreditMonitoringService.createAlert
-- / getAlerts) with no backing migration, so every write 500'd and every
-- read silently returned an empty/failure result.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- bureau_disputes
--
-- DECISION: this is a genuinely NEW table, not a twin of the existing
-- `disputes` table. Both represent "a consumer dispute" in the abstract, but
-- they back two structurally incompatible, independently-triggered flows:
--
--   `disputes` (src/lib/disputes/dispute-service-db.ts) backs a human-paced,
--   LETTER-drafting workflow. Its own sendDispute() (line 148) only flips
--   `status: 'sent', sent_at: now()` — it never calls a bureau API. Status
--   vocabulary is draft -> sent -> under_review -> resolved/rejected: an
--   asynchronous lifecycle with a pre-submission "draft" phase, and NOT NULL
--   columns (item_type, item_description, letter_content, reason) that only
--   make sense for a human-composed letter.
--
--   `bureau_disputes` backs CreditBureauService.submitDispute()
--   (src/lib/credit-bureau/credit-bureau-service.ts), a SYNCHRONOUS call
--   directly against a bureau's dispute API (Experian/Equifax/TransUnion
--   clients). It either succeeds or fails atomically; there is no "draft"
--   phase and no letter body. A successful call returns a bureau-issued
--   reference_id immediately — the single most legally load-bearing field
--   here (FCRA Sec. 611 proof of filing) — and `disputes` has no column for
--   it at all.
--
-- Column-by-column, reusing `disputes` would require: making letter_content/
-- item_type/item_description nullable (they are NOT NULL today), adding a
-- reference_id column, merging two incompatible status vocabularies onto one
-- CHECK constraint (submitted/processing vs draft/sent/under_review — where
-- "draft" would be actively misleading for a dispute the bureau already
-- accepted), and re-validating the generated Database["public"]["Tables"]
-- ["disputes"] type that src/lib/disputes/dispute-service-db.ts already
-- depends on. That is a bigger, separate product/architecture decision
-- (unifying "My Disputes" across both filing mechanisms) than this
-- correctness fix — noted for follow-up, not attempted here.
--
-- Column shape matches BureauDisputeRecord exactly (the private interface
-- credit-bureau-service.ts:1214 already writes against):
--   user_id, bureau, credit_item_id, dispute_reason, status, reference_id,
--   created_at.
--
-- credit_item_id is TEXT, not a UUID FK: it identifies a line item as
-- returned BY THE BUREAU (or MockCreditBureauAdapter) in a CreditReport
-- response, which is not guaranteed to be one of our own credit_accounts.id
-- / credit_inquiries.id UUIDs. No FK is added, matching the existing
-- precedent of disputes.account_number (no FK) and credit_accounts
-- .dispute_id / credit_inquiries.dispute_id (both plain uuid, no enforced
-- FK) — this schema already treats cross-references to bureau-sourced items
-- as opaque identifiers, not enforced foreign keys.
--
-- RLS: SELECT + INSERT only, scoped to auth.uid() = user_id, matching
-- `disputes`' own "Users can view/create own disputes" policies — filing a
-- dispute is a direct, explicit user action (POST /api/credit-bureau/dispute,
-- permission disputes:create), same category of action as creating a
-- `disputes` row. No UPDATE/DELETE policy: nothing in the codebase updates a
-- bureau_disputes row today (there is no bureau-side status-polling
-- mechanism yet), and this table is an FCRA compliance record of what was
-- actually filed — deliberately immutable to the end user via the client API
-- surface. updated_at + trigger are still included (matching every other
-- stateful table in this schema) so a future backend-side status-poller can
-- update status without another migration; that update would run via a
-- privileged/service-role connection, not through the (absent) user-facing
-- UPDATE policy.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bureau_disputes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bureau         TEXT NOT NULL,
  credit_item_id TEXT NOT NULL,
  dispute_reason TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'submitted',
  reference_id   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bureau_disputes_bureau_check CHECK (
    bureau IN ('experian', 'equifax', 'transunion')
  ),
  CONSTRAINT bureau_disputes_status_check CHECK (
    status IN ('submitted', 'processing', 'resolved', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS idx_bureau_disputes_user_id
  ON bureau_disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_bureau_disputes_bureau
  ON bureau_disputes(bureau);
CREATE INDEX IF NOT EXISTS idx_bureau_disputes_status
  ON bureau_disputes(status);
CREATE INDEX IF NOT EXISTS idx_bureau_disputes_credit_item_id
  ON bureau_disputes(credit_item_id);
CREATE INDEX IF NOT EXISTS idx_bureau_disputes_created_at
  ON bureau_disputes(created_at DESC);

ALTER TABLE bureau_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bureau disputes" ON bureau_disputes;
CREATE POLICY "Users can view own bureau disputes" ON bureau_disputes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bureau disputes" ON bureau_disputes;
CREATE POLICY "Users can insert own bureau disputes" ON bureau_disputes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_bureau_disputes_updated_at ON bureau_disputes;
CREATE TRIGGER update_bureau_disputes_updated_at
  BEFORE UPDATE ON bureau_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- credit_alerts
--
-- Column shape matches CreditAlertRow exactly (the private interface
-- src/lib/credit-monitoring/credit-monitoring-service.ts:563 already writes
-- against and reads back via mapAlertRow):
--   user_id, type, bureau, title, message, severity, read, data, created_at.
--
-- type/severity CHECK values are the full literal unions from AlertType and
-- CreditAlert['severity'] in that same file — nothing invented beyond what
-- the code already emits.
--
-- RLS: SELECT + UPDATE only, scoped to auth.uid() = user_id — no INSERT
-- policy. This mirrors the two closest structural siblings in this schema,
-- `bill_alerts` and `emotional_spending_alerts` (both: system/automated-
-- detection alerts, no INSERT policy, RLS enabled — writes happen via a
-- privileged/service-role connection, not a user-facing insert). credit
-- alerts are raised automatically by addCreditScore() when a score changes
-- past threshold, not authored directly by the user, same category as a
-- bill_alerts row. UPDATE is required: markAlertAsRead/markAllAlertsAsRead
-- flip `read` via this same table.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  bureau     TEXT,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  severity   TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  data       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_alerts_type_check CHECK (type IN (
    'score_increase', 'score_decrease', 'new_account', 'new_inquiry',
    'account_closed', 'payment_missed', 'credit_limit_change',
    'address_change', 'fraud_alert', 'identity_theft'
  )),
  CONSTRAINT credit_alerts_bureau_check CHECK (
    bureau IS NULL OR bureau IN ('experian', 'equifax', 'transunion')
  ),
  CONSTRAINT credit_alerts_severity_check CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  )
);

CREATE INDEX IF NOT EXISTS idx_credit_alerts_user_id
  ON credit_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_alerts_read
  ON credit_alerts(read);
CREATE INDEX IF NOT EXISTS idx_credit_alerts_severity
  ON credit_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_credit_alerts_created_at
  ON credit_alerts(created_at DESC);

ALTER TABLE credit_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credit alerts" ON credit_alerts;
CREATE POLICY "Users can view own credit alerts" ON credit_alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credit alerts" ON credit_alerts;
CREATE POLICY "Users can update own credit alerts" ON credit_alerts
  FOR UPDATE USING (auth.uid() = user_id);
