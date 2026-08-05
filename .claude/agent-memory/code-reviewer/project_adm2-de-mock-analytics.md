---
name: adm2-de-mock-analytics
description: ADM-2 (commit 60e21d1) — de-mock admin analytics/stats/audit/logs (FND-052/053); APPROVED with two follow-on items
metadata:
  type: project
---

commit 60e21d1 approved. TASK-MOK-01 closes FND-052/053.

**Why:** analytics returned 100% Math.random(); stats/audit had both a 42P01 branch and an outer catch that returned fabricated 200s; logs fabricated rows for a non-existent table.

**How to apply:** When reviewing future de-mock tasks (MOK-02..05) look for the same two-path pattern: the inner error-check branch AND the outer catch — both must return error responses, not fake data.

Key decisions confirmed:
- topFeatures in analytics/route.ts lines 161-167: 4 of 5 features return usage:0 (AI Chat, Credit Analysis, Student Loans, Marketplace). This is NOT fabrication — it's honest zeros awaiting dedicated tracking tables. Dispute Letters gets a real count. Acceptable.
- disputes/route.ts mock fallback on missing env vars is intentional and pre-existing — TASK-MOK-01 scope is analytics/stats/audit/logs only. disputes is TASK-MOK-03.
- logs route returns 200 + dataAvailable:false (not a 500) — correct; the table simply does not exist, not a DB error.
- adm2-real-queries.test.ts test "should have userGrowth counts as positive numbers" (line 402) passes because the profile mock returns count:5 (not zero) — valid.

Follow-on items (LOW, not blocking):
1. audit/route.ts lines 19-20: parseInt on user-supplied page/limit with no NaN guard — a non-numeric value yields NaN, which propagates to .range() producing a Supabase error (caught at line 70 → 500). Low severity since the catch handles it gracefully, but explicit NaN guards would be cleaner.
2. topFeatures array (analytics/route.ts lines 161-167): 4 features hardcode usage:0. Fine for now; needs real tracking tables before these numbers are meaningful. Track as TASK-MOK-04 follow-on.
