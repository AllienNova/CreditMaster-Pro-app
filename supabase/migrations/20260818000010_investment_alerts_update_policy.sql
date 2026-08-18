-- UPDATE policy for investment_alerts (Wave 7 remediation, trading/assets
-- cluster).
--
-- PROBLEM: 20260731000032_investment_alerts.sql enabled RLS and wrote
-- policies for SELECT, INSERT and DELETE — matching the three verbs
-- route.ts served at the time. It has no UPDATE policy, so with RLS enabled
-- and no policy, every UPDATE by a non-service-role client is denied.
--
-- That was harmless while no code updated a row. This migration accompanies
-- the new PATCH verb on /api/investments/alerts (pause / resume), which sets
-- `status`. PATCH itself goes through the service-role client and so bypasses
-- RLS either way; the policy is here so the table is protected by its own
-- rules rather than by the accident of which client happens to reach it —
-- the same posture the other three verbs already have.
--
-- Scope matches the sibling policies exactly: a row is the caller's iff
-- auth.uid() = user_id. USING controls which rows may be targeted; WITH CHECK
-- controls what they may become, and repeating the predicate there prevents
-- an owner from reassigning an alert to another user_id.

DROP POLICY IF EXISTS "Users can update own investment alerts" ON investment_alerts;
CREATE POLICY "Users can update own investment alerts"
    ON investment_alerts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
