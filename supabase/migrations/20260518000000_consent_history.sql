-- CMP-1: Consent history — drop UNIQUE constraint, add history index (FND-057)
--
-- GDPR Art. 7 requires demonstrable consent over time. The existing
-- UNIQUE(user_id, consent_type) constraint enforced a current-state-only model:
-- any new consent event for the same (user, type) would overwrite the previous
-- row via upsert, destroying the audit trail.
--
-- Fix: drop the constraint so consent_records becomes an append-only history
-- table (one row per consent event). "Current consent" for a given
-- (user_id, consent_type) is the latest row ordered by timestamp DESC.
--
-- A partial index on (user_id, consent_type, timestamp DESC) keeps the
-- "latest consent" query fast without reintroducing the uniqueness restriction.

ALTER TABLE consent_records
  DROP CONSTRAINT IF EXISTS consent_records_user_id_consent_type_key;

CREATE INDEX idx_consent_records_history
  ON consent_records (user_id, consent_type, timestamp DESC);
