-- Grant service_role access to 6 tables financial-aggregation-service.ts
-- reads that never had an explicit GRANT — the second half of the
-- "net worth is $0 for every user" bug.
--
-- BUG CHAIN: financial-aggregation-service.ts's fetchUserProfile/
-- fetchAccounts/fetchDebtData/fetchNetWorthData/fetchInvestmentData/
-- fetchCreditData/fetchGoalsData/fetchNetWorthHistory/fetchIncomeHistory/
-- fetchSpendingHistory/fetchSavingsHistory/fetchDebtHistory/
-- fetchInvestmentHistory/fetchHealthScoreHistory all read via the
-- module-level getSupabase() singleton (@/lib/supabase/client) — the ANON
-- key, with no forwarded JWT, so auth.uid() is always NULL. This commit's
-- companion source change moves every one of those methods onto a
-- lazily-constructed, module-local service-role client (mirroring
-- plaid-service.ts's getServiceRoleClient(), the established pattern for
-- tables outside the generated Database type in src/lib/supabase/types.ts).
--
-- That client swap alone is not sufficient for 6 of the 13 real tables
-- those methods touch. This local instance's CREATE TABLE default
-- privileges do not include base SELECT/INSERT/UPDATE/DELETE for
-- service_role (the same gap documented in
-- 20260731000005_affiliate_partners_commission_rules.sql and independently
-- rediscovered in 20260731000012_savings_goals_cluster.sql's header
-- comment: "this local instance does not auto-grant SELECT/INSERT/UPDATE/
-- DELETE to anon/authenticated/service_role on any table" — verified again
-- here via `SET ROLE service_role; SELECT ... FROM <table>;`, which fails
-- with 42501 permission-denied for all 6 tables below on a fresh
-- `supabase db reset`, before this migration). service_role's BYPASSRLS
-- attribute bypasses the RLS *policies* on these tables, not the base
-- table grant, which is a separate, earlier gate PostgREST/Postgres
-- evaluates first.
--
-- financial_health_scores (fetchHealthScoreHistory(), read via
-- getServiceRoleClient() as of this same commit) belongs in this same
-- bucket: defined by 20250207000000_financial_intelligence_schema.sql with
-- no inline GRANT and none added since, so it fails the same 42501 check.
-- This table was previously misidentified as the phantom `health_score_
-- history` in an earlier draft of this migration's comment — it is a real,
-- actively-written table (health-score-calculator.ts's saveScore()); the
-- rename from the non-existent name to this one is the companion source
-- fix, not a schema change, so no CREATE TABLE is needed here.
--
-- The other 7 real tables these methods touch already carry a service_role
-- grant from an earlier migration and need no change here:
-- financial_accounts (20260731000005 sibling — actually granted directly
-- on CREATE TABLE in that same migration's own DDL, see its header),
-- financial_goals and monthly_summaries (both granted by
-- 20260731000012_savings_goals_cluster.sql). net_worth_history and
-- savings_history are also out of scope for this migration, but for a
-- sequencing reason rather than a phantom-table reason: they are created
-- and granted (SELECT to authenticated, full CRUD to service_role) by
-- 20260731000080_networth_savings_history.sql, which runs after this one —
-- granting them here would fail since the tables don't exist yet at this
-- point in the migration order. Only investment_history remains genuinely
-- phantom — never migrated at all — a separate, already-documented gap
-- tracked in docs/qa/triage-trading.md and out of scope for this
-- client-architecture fix; granting privileges on a table that does not
-- exist is a no-op this migration correctly does not attempt.
--
-- Grant scope: SELECT, INSERT, UPDATE, DELETE (not SELECT-only) to match
-- the established convention already used for every other service_role
-- grant in this schema (20260731000005, 20260517000006_referral_codes,
-- 20260731000006_plaid_items_accounts, 20260731000007_bureau_disputes_
-- credit_alerts) — service_role's privilege boundary in this project is
-- controlled per-table (which tables it may touch at all), not per-verb
-- within a table it is already trusted to write test/sync data into. A
-- SELECT-only grant would also fail this migration's own companion
-- integration test (financial-aggregation-service.integration.test.ts),
-- which seeds fixture rows into these same tables via the service-role
-- client before exercising the real read path.
--
-- RLS: left untouched (all 6 tables keep their existing auth.uid() =
-- user_id policies as defense-in-depth for any future anon/authenticated-
-- key consumer) — this migration only adds the missing base grant.

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON debt_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON credit_scores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON investment_portfolios TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON debt_history TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_health_scores TO service_role;

-- transactions: same gap, needed by plaid-webhook-handler.ts's
-- handleTransactionsRemoved(), the 4th getSupabase() call site in that
-- file (the other 3 write plaid_items, already fully granted per
-- 20260731000006). Postgres's own error HINT on `SET ROLE service_role;
-- DELETE FROM transactions WHERE ...` names both SELECT and DELETE as
-- required (a filtered DELETE still needs to read matching rows to plan
-- the delete), so both are granted; INSERT/UPDATE are not — this handler
-- only ever deletes.
GRANT SELECT, DELETE ON transactions TO service_role;
