---
name: supabase-service-role-needs-explicit-grant
description: RLS policies alone are not sufficient for service_role table access on this local Supabase instance — CREATE TABLE's default privileges omit base SELECT/INSERT/UPDATE/DELETE for service_role
metadata:
  type: project
---

On this project's local Supabase instance, `service_role` has the `BYPASSRLS` Postgres attribute (`\du service_role` confirms it), so RLS policies never actually gate its access either way. What DOES gate it is base table privileges — and a freshly `CREATE TABLE`'d table's default grants for `service_role` are only `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` (`Dxtm`), NOT `SELECT/INSERT/UPDATE/DELETE` (`arwd`). A migration that follows the `20260331000000_adverse_action_notices.sql` idiom — `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY ... TO service_role ... USING (true) WITH CHECK (true)` and nothing else — compiles and applies cleanly via `supabase db reset`, but every subsequent `service_role`-authenticated query against that table fails at runtime with `permission denied for table X` (SQLSTATE 42501), because the policy is never even evaluated.

**Why:** discovered via a real-DB integration test (see [[project_msw-real-network-fetch-in-jest]]) against a table created by `20260731000005_affiliate_partners_commission_rules.sql` — a mocked test would never have caught this, since mocks don't exercise real Postgres grants.

**How to apply:** any new service-role-only table needs an explicit `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO service_role;` in addition to (not instead of) the RLS policy — the policy documents intent and is defense-in-depth if BYPASSRLS is ever revoked; the GRANT is what actually works today. This is exactly what the sibling `20260517000005_revenue_events.sql` / `20260517000006_referral_codes.sql` migrations already do (`revoke all on ... from public, anon, authenticated; grant select, insert, update, delete on ... to service_role;`) — trust that pattern over `adverse_action_notices.sql`'s policy-only one when the two disagree; the policy-only tables may share this same latent bug undetected. Verify with `\dp <table>` before trusting a new service-role-only table actually works — don't assume grants from RLS-policy presence alone.
