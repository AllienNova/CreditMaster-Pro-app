# Backend Builder Memory — Fynvita

- [Worktree review workflow](project_worktree_review_workflow.md) — Wave 7 tasks: implement in worktree, do NOT commit, report evidence, team-lead reviews first
- [Shared worktree can silently reset uncommitted edits](project_worktree-shared-collision-risk.md) — verify ground truth via grep/git status after any edit, don't trust "unchanged since last Read"
- [MSW fetch-mock pattern for jest tests](project_msw-fetch-mock-pattern.md) — reassign `global.fetch` fully + use real `Response` instances; `waitFor` a pending-fetch test to completion before it ends
- [Real network fetch inside jest (MSW opt-out)](project_msw-real-network-fetch-in-jest.md) — server.close()/listen() alone isn't enough; also reassign global.fetch to a fresh node-fetch import before importing supabase-js, for a genuine real-DB integration test
- [service_role needs explicit GRANT, not just RLS policy](project_supabase-service-role-needs-explicit-grant.md) — local instance's service_role has BYPASSRLS but CREATE TABLE's default privileges omit base SELECT/INSERT/UPDATE/DELETE; policy-only migrations (adverse_action_notices idiom) can silently 42501 at runtime
