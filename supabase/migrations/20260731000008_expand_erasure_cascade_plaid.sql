-- Register plaid_items / financial_accounts in delete_user_data_cascade
-- (GDPR Art. 17 — follow-up to 20260731000006_plaid_items_accounts.sql)
--
-- Both new tables carry `user_id UUID REFERENCES auth.users(id) ON DELETE
-- CASCADE`, so rows would eventually clear once server code calls
-- `supabase.auth.admin.deleteUser(id)` after this RPC returns. Per the
-- established defense-in-depth convention (see 20260731000001's header:
-- "the RPC and the admin.deleteUser() call are two separate steps, not one
-- transaction"), both are still listed explicitly here so an erasure
-- request removes the linked-bank data immediately even if the admin API
-- call is delayed, retried, or never reached.
--
-- `plaid_items` holds a live Plaid access token (a bank credential) — this
-- is exactly the kind of data GDPR Art. 17 erasure exists to remove
-- promptly, not leave dependent on a second, separate admin call.
--
-- Base: 20260731000003_fix_erasure_uuid_text_comparison.sql (the current,
-- live definition — verified via pg_proc.prosrc 2026-07-31 immediately
-- before writing this migration, confirming no other migration has touched
-- this function since 000003). Same signature, same to_regclass-guarded
-- delete loop, same uuid/text-cast anonymization, same profiles DELETE,
-- same REVOKE/GRANT. The only change is appending 'plaid_items' and
-- 'financial_accounts' to v_tables.
--
-- Ordering: plaid_items must delete AFTER financial_accounts in this loop
-- (financial_accounts.item_id REFERENCES plaid_items(item_id) ON DELETE
-- CASCADE, so deleting plaid_items first would already cascade-remove the
-- accounts — deleting financial_accounts explicitly first keeps this loop's
-- per-table DELETE list accurate/idempotent regardless of that FK).

CREATE OR REPLACE FUNCTION delete_user_data_cascade(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tables TEXT[] := ARRAY[
    -- -----------------------------------------------------------------------
    -- Original 28 (preserved, no regression)
    -- -----------------------------------------------------------------------
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
    'consent_records',
    -- -----------------------------------------------------------------------
    -- Delta: 002_production_enhancements.sql
    -- -----------------------------------------------------------------------
    'sessions',
    'uploads',
    'dispute_template_usage',
    'strategy_usage',
    -- -----------------------------------------------------------------------
    -- Delta: 20250107_credit_bureau_tables.sql
    -- -----------------------------------------------------------------------
    'credit_accounts',
    'credit_inquiries',
    'public_records',
    -- -----------------------------------------------------------------------
    -- Delta: 20250203_user_settings.sql
    -- -----------------------------------------------------------------------
    'user_settings',
    -- -----------------------------------------------------------------------
    -- Delta: 20250203000000_student_loan_schema.sql
    -- -----------------------------------------------------------------------
    'student_loans',
    'student_loan_strategies',
    'federal_program_applications',
    'servicer_communications',
    'regulatory_complaints',
    'credit_report_monitoring',
    'document_analyses',
    'ml_predictions',
    'servicer_errors',
    'monitoring_events',
    'performance_analytics',
    -- -----------------------------------------------------------------------
    -- Delta: 20250204000000_credit_repair_schema.sql
    -- -----------------------------------------------------------------------
    'credit_repair_scores',
    'credit_repair_actions',
    'credit_repair_progress',
    -- -----------------------------------------------------------------------
    -- Delta: 20250207000000_financial_intelligence_schema.sql
    -- (investment_holdings and investment_transactions cascade via investment_portfolios;
    --  financial_chat_messages cascades via financial_chat_sessions)
    -- -----------------------------------------------------------------------
    'financial_goals',
    'financial_health_scores',
    'financial_insights',
    'recurring_bills',
    'investment_portfolios',
    'trading_signals',
    'financial_chat_sessions',
    -- -----------------------------------------------------------------------
    -- Delta: 20251218000000_marketplace_schema.sql
    -- -----------------------------------------------------------------------
    'marketplace_reviews',
    -- -----------------------------------------------------------------------
    -- Delta: 20260110_vitality_scores.sql
    -- -----------------------------------------------------------------------
    'vitality_scores',
    'vitality_score_history',
    'quick_wins_completed',
    'milestones_achieved',
    -- -----------------------------------------------------------------------
    -- Delta: 20260115_create_financial_chat_tables.sql
    -- (chat_messages cascades via chat_sessions)
    -- -----------------------------------------------------------------------
    'chat_sessions',
    -- -----------------------------------------------------------------------
    -- Delta: 20260117_add_trading_tables.sql
    -- -----------------------------------------------------------------------
    'trailing_stops',
    'trading_rules',
    'trading_signals_v2',
    'broker_connections',
    'trade_history',
    'risk_rules',
    'backtest_results',
    -- -----------------------------------------------------------------------
    -- Delta: 20260120000000_gamification_ai_personalization.sql
    -- -----------------------------------------------------------------------
    'user_progress',
    'user_badges',
    'badge_progress',
    'xp_transactions',
    'user_quest_progress',
    'user_challenge_participation',
    'user_financial_profiles',
    'spending_patterns',
    'nudge_history',
    'ai_coaching_sessions',
    'goal_tracking',
    'emotional_spending_alerts',
    -- -----------------------------------------------------------------------
    -- Delta: 20260121000000_tax_optimization_schema.sql
    -- -----------------------------------------------------------------------
    'tax_profiles',
    'tax_recommendations',
    -- -----------------------------------------------------------------------
    -- Delta: 20260121000001_tax_documents_table.sql
    -- -----------------------------------------------------------------------
    'tax_document_processing_log',
    -- -----------------------------------------------------------------------
    -- Delta: 20260204000000_web_push_subscriptions.sql
    -- -----------------------------------------------------------------------
    'push_subscriptions',
    -- -----------------------------------------------------------------------
    -- Delta: 20260204000000_webauthn_tables.sql
    -- -----------------------------------------------------------------------
    'webauthn_credentials',
    -- -----------------------------------------------------------------------
    -- Delta: 20260226_trading_modes_compliance.sql
    -- -----------------------------------------------------------------------
    'trading_agent_logs',
    'mode_transitions',
    'circuit_breaker_events',
    -- -----------------------------------------------------------------------
    -- Delta: 20260420000001_user_risk_settings.sql
    -- -----------------------------------------------------------------------
    'user_risk_settings',
    -- -----------------------------------------------------------------------
    -- Delta: 20260427000001_strategy_lifecycle.sql
    -- -----------------------------------------------------------------------
    'strategy_lifecycle',
    -- -----------------------------------------------------------------------
    -- Delta: 20260427000002_credit_system.sql
    -- -----------------------------------------------------------------------
    'user_credits',
    'credit_transactions',
    'credit_purchases',
    'addon_subscriptions',
    -- -----------------------------------------------------------------------
    -- Delta: 20260516000001_atomic_backup_code_redemption.sql
    -- -----------------------------------------------------------------------
    'backup_codes',
    -- -----------------------------------------------------------------------
    -- Delta: 20260517000004_document_shares.sql
    -- -----------------------------------------------------------------------
    'document_share_links',
    -- -----------------------------------------------------------------------
    -- Delta: 20260517000005_revenue_events.sql
    -- -----------------------------------------------------------------------
    'revenue_events',
    -- -----------------------------------------------------------------------
    -- Delta: 20260517000006_referral_codes.sql
    -- -----------------------------------------------------------------------
    'referral_codes',
    -- -----------------------------------------------------------------------
    -- Delta: 20260331000000_adverse_action_notices.sql
    -- -----------------------------------------------------------------------
    'adverse_action_notices',
    -- -----------------------------------------------------------------------
    -- Delta: 20260518000001_breach_notifications.sql (CMP-2)
    -- -----------------------------------------------------------------------
    'breach_notifications',
    -- -----------------------------------------------------------------------
    -- Delta: 20250208000000_bills_schema.sql
    -- (also reachable via CASCADE from bills, but listed explicitly for
    --  idempotency and to document the dependency clearly)
    -- -----------------------------------------------------------------------
    'bill_payments',
    'bill_alerts',
    -- -----------------------------------------------------------------------
    -- Delta: 20260117_add_trading_tables.sql (ml_models)
    -- user_id is nullable; DELETE WHERE user_id=$1 only matches rows belonging
    -- to the target user; system models (user_id IS NULL) are untouched.
    -- -----------------------------------------------------------------------
    'ml_models',
    -- -----------------------------------------------------------------------
    -- Delta: 20260226_trading_modes_compliance.sql (strategy_library)
    -- user_id is nullable ON DELETE CASCADE; DELETE WHERE user_id=$1 only
    -- matches strategies belonging to the target user; system rows untouched.
    -- -----------------------------------------------------------------------
    'strategy_library',
    -- -----------------------------------------------------------------------
    -- Delta: 20260731000000_trading_orders_positions.sql
    -- Both tables carry user_id UUID REFERENCES auth.users(id) ON DELETE
    -- CASCADE (would eventually clear via the auth.users delete that follows
    -- this RPC), but listed explicitly here per the established
    -- defense-in-depth convention above.
    -- -----------------------------------------------------------------------
    'orders',
    'positions',
    -- -----------------------------------------------------------------------
    -- Delta: 20260731000006_plaid_items_accounts.sql
    -- financial_accounts listed before plaid_items: financial_accounts.
    -- item_id REFERENCES plaid_items(item_id) ON DELETE CASCADE, so deleting
    -- plaid_items first would already remove the accounts via that FK —
    -- ordering financial_accounts first keeps each entry's own DELETE
    -- meaningful and idempotent regardless of FK cascade timing.
    -- -----------------------------------------------------------------------
    'financial_accounts',
    'plaid_items'
  ];
  v_table TEXT;
BEGIN
  -- Log erasure start as a system event (user_id NULL so it survives
  -- the anonymization pass below).
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
  -- RESILIENCE: each table is guarded with to_regclass() so a table absent from
  -- the live schema (schema drift — see 20260519000000 header) is skipped
  -- instead of aborting the whole erasure. to_regclass(text) returns NULL
  -- (never raises) for a non-existent relation. Present tables are deleted
  -- exactly as before; any OTHER error (a real constraint failure on an
  -- existing table) still aborts the transaction — no partial state.
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('DELETE FROM %I WHERE user_id = $1', v_table)
        USING p_user_id;
    END IF;
  END LOOP;

  -- Anonymize historical audit log entries (SET NULL, not DELETE — retained
  -- for regulatory audit trail per EXCLUDED table comment above).
  -- user_id in the authoritative schema (20260217000000) is TEXT, so compare
  -- via ::text to avoid a UUID vs TEXT type mismatch at runtime.
  -- ip_address and user_agent are personal data under GDPR Art. 4(1) — nulled.
  UPDATE audit_logs
  SET user_id    = NULL,
      ip_address = NULL,
      user_agent = NULL
  -- Compare as text on BOTH sides: the audit_logs twin-schema means this
  -- column is uuid in the winning 002 shape but TEXT in 20260217000000.
  -- Casting both sides works against either, so this cannot silently
  -- break again if the twin is ever reconciled the other way.
  WHERE user_id::text = p_user_id::text;

  -- Anonymize tax audit log entries (same retention policy; ip_address is PII).
  -- user_id is UUID here (20260121000000_tax_optimization_schema.sql), so no cast.
  UPDATE tax_audit_log
  SET user_id    = NULL,
      ip_address = NULL
  WHERE user_id = p_user_id;

  -- Delete the profile last, after all FK-dependent tables are cleared.
  DELETE FROM profiles WHERE id = p_user_id;

  -- Log completion (system event, survives anonymization).
  INSERT INTO audit_logs (user_id, action, details, created_at)
  VALUES (
    NULL,
    'gdpr_erasure_completed',
    jsonb_build_object('deleted_user_id', p_user_id::text),
    NOW()
  );
END;
$function$;

REVOKE ALL ON FUNCTION delete_user_data_cascade(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION delete_user_data_cascade(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_user_data_cascade(UUID, TEXT) TO service_role;
