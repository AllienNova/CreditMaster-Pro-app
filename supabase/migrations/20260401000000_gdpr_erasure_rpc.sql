-- GDPR Art. 17 Right-to-Erasure: atomic cascade-delete function
--
-- Replaces the prior client-side 28-table sequential delete loop in
-- src/lib/compliance/gdpr-ccpa.ts which had three correctness issues:
--   1. No transaction — a mid-loop failure left partial state.
--   2. Audit-log anonymization wrote the string '[REDACTED]' into a
--      UUID column (would error or leak schema inconsistency).
--   3. The 'gdpr_erasure_started' audit row was overwritten by the
--      anonymization pass that followed it.
--
-- This function runs the full erasure inside its implicit PL/pgSQL
-- transaction (atomic on success, rolled back on any error), uses
-- NULL for anonymization, and records start/completion events as
-- system-scoped rows (user_id NULL) that survive the anonymization.

CREATE OR REPLACE FUNCTION delete_user_data_cascade(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'credit_cards',
    'goodwill_letters',
    'negotiations',
    'credit_reports',
    'disputes',
    'credit_scores',
    'subscriptions',
    'cancellation_requests',
    'notifications',
    'notification_preferences',
    'ai_interactions',
    'documents',
    'transactions',
    'transaction_rules',
    'budgets',
    'bills',
    'goals',
    'savings_accounts',
    'debt_accounts',
    'income_sources',
    'spending_categories',
    'onboarding_progress',
    'trading_accounts',
    'compliance_scores',
    'tax_documents',
    'credit_score_history',
    'bureau_connections',
    'consent_records'
  ];
  v_table TEXT;
BEGIN
  -- Log erasure start as a system event (user_id NULL so it survives
  -- the anonymization pass below). The deleted user's id is preserved
  -- in details for regulatory audit correlation.
  INSERT INTO audit_logs (user_id, action, details, created_at)
  VALUES (
    NULL,
    'gdpr_erasure_started',
    jsonb_build_object(
      'deleted_user_id', p_user_id::text,
      'reason', p_reason
    ),
    NOW()
  );

  -- Cascade delete across all user-linked tables.
  -- Any error aborts the function's transaction; no partial state.
  FOREACH v_table IN ARRAY v_tables
  LOOP
    EXECUTE format('DELETE FROM %I WHERE user_id = $1', v_table)
      USING p_user_id;
  END LOOP;

  -- Anonymize historical audit log entries. user_id is a nullable UUID
  -- (see 002_production_enhancements.sql) so NULL is the correct value —
  -- writing '[REDACTED]' would be a type mismatch.
  UPDATE audit_logs SET user_id = NULL WHERE user_id = p_user_id;

  -- Delete the profile last, after all FK-dependent tables are cleared.
  DELETE FROM profiles WHERE id = p_user_id;

  -- Log completion (again as a system event).
  INSERT INTO audit_logs (user_id, action, details, created_at)
  VALUES (
    NULL,
    'gdpr_erasure_completed',
    jsonb_build_object('deleted_user_id', p_user_id::text),
    NOW()
  );
END;
$$;

-- Only the service_role may invoke this function.
-- The auth.admin.deleteUser(id) call is done from server code after this
-- returns — it cannot be invoked from PL/pgSQL.
REVOKE ALL ON FUNCTION delete_user_data_cascade(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION delete_user_data_cascade(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_user_data_cascade(UUID, TEXT) TO service_role;
