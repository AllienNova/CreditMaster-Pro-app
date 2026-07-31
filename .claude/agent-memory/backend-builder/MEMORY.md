# backend-builder — Memory Index

- [Scoped stash in a shared worktree](feedback_scoped-stash-shared-worktree.md) — use `git stash push -- <path>`, never a bare stash, to prove red-before-green without disturbing other agents.
- [tax_profiles schema drift beyond tax_accounts](project_tax-profiles-schema-drift.md) — ~20 more columns mapDatabaseToProfile reads don't exist live; same defect class, flagged not fixed.
- [test:coverage:changed is branch-wide, not session-wide](project_coverage-changed-gate-branch-wide.md) — grep the log for your own file paths; the aggregate count includes the whole branch vs. main.
- [Jest resetMocks + postgrest-js error-vs-throw](feedback_jest-resetmocks-and-postgrest-errors.md) — re-apply createClient mocks in beforeEach every time; supabase queries resolve {error}, never throw on DB errors.
- [GDPR erasure RPC broken](project_gdpr-erasure-cascade-broken.md) — delete_user_data_cascade fails on its own first INSERT (audit_logs.resource_type NOT NULL); unfixed, flagged to compliance owner.
