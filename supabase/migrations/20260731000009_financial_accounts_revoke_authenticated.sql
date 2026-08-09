-- Correction to 20260731000006_plaid_items_accounts.sql: revoke the
-- authenticated grant/policy on financial_accounts.
--
-- 20260731000006 added `GRANT SELECT ON financial_accounts TO authenticated`
-- plus a `USING (auth.uid() = user_id)` policy as defense-in-depth, on the
-- (untested at the time) assumption that a client with no matching grant
-- would silently receive an empty result set from Postgres/PostgREST rather
-- than an error.
--
-- A live-stack QA check (docs/qa — commit 5e778bc, "erasure-cascade
-- concurrency hazard + correct the anon-client hypothesis") disproved that
-- assumption: a role with NO table-level grant gets a genuine 42501
-- permission-denied error, not a silent empty read. That is the behavior
-- every other sibling table in this remediation wave already relies on
-- (debt_accounts, credit_scores — neither grants authenticated a table
-- privilege; their fetchDebtData/fetchCreditData readers catch the
-- resulting error via logger.error and degrade to an honest empty default).
--
-- Because financial_accounts uniquely DID grant authenticated a table
-- privilege, it behaves differently from every sibling table for the exact
-- same access pattern: getSupabase() (anon key, no session, auth.uid()
-- always NULL) passes the table-level grant check, then RLS silently
-- filters out every row — a genuinely empty, error-free result. That
-- reintroduces the original defect class this migration exists to close:
-- financial-aggregation-service.ts's fetchAccounts() would render $0 net
-- worth with nothing to log, since there is no error to catch. Its
-- logger.error branch (added in the same commit as 20260731000006) is only
-- reachable if the table-level grant is absent, matching its siblings.
--
-- All real reads of financial_accounts already go through the service-role
-- client (plaid-service.ts's getAccounts(), explicitly scoped by
-- .eq("user_id", userId) — the same IDOR-safe pattern as
-- getAccessToken/getTransactions in that file), which bypasses RLS/grants
-- entirely via the service_role grant from 20260731000006. No caller
-- actually depends on the authenticated grant this migration removes.

REVOKE SELECT ON financial_accounts FROM authenticated;

DROP POLICY IF EXISTS "Users read own financial accounts" ON financial_accounts;
