# ADR-0001 — Reconcile schema drift via NEW forward migrations + live-schema introspection

- **Status:** Accepted
- **Date:** 2026-07-26
- **Deciders:** parity-backend (architect)
- **Confidence:** medium
- **Revision:** 2026-07-26 — rewritten after critic F-001/F-002/F-013. Original "edit the later migration into an ALTER" was wrong: it no-ops on already-applied DBs.

## Context

Recon found **17 twinned tables** (`grep CREATE TABLE … | uniq -d`): `audit_logs, subscriptions, credit_reports, profiles, budgets, financial_goals, financial_health_scores, financial_insights, disputes, recurring_bills, investment_holdings, investment_portfolios, investment_transactions, financial_chat_sessions, financial_chat_messages, trading_signals, document_share_links`. Each has ≥2 `CREATE TABLE IF NOT EXISTS`; the first-applied wins and later definitions no-op. Confirmed live consequences: `financial_goals` twin `20250207000000` (wins) lacks `milestones`/`ai_recommendations` that `20251217000001` has → **FR-302's goal-milestone alert reads a column that doesn't exist**. `audit-logger.ts:84` writes columns absent from the live schema and **swallows the insert error** → security audit logging silently fails today.

Critically: there is **no `supabase/config.toml`**; `supabase/README.md` documents manual SQL paste (primary) + `supabase db push`. Under either path, once a migration file is recorded/applied it **never re-runs** — so editing a historical migration file to "fix" its shape is a silent no-op on exactly the databases that need fixing. Filenames also mix non-timestamped (`001`,`002`) and timestamped (`2026…`), so "runs first" cannot be inferred from sort order alone.

## Decision

Reconcile drift with **NEW forward migrations** (`2026072x_reconcile_<table>.sql`) containing only idempotent, additive statements — `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE POLICY` guarded by existence checks. **Never edit an already-applied migration file.** Before writing each reconcile migration, **introspect the actual target-DB schema** (a scratch/staging DB built from the current migration set) and diff it against the code's reader/writer column usage — do not infer the live shape from filename order.

## Rationale

Forward migrations are the only statements that actually execute against an already-provisioned DB. `ADD COLUMN IF NOT EXISTS` converges regardless of which twin won. Introspection replaces the unreliable "first file wins" inference with the ground truth of what the DB actually contains. Additive-only keeps it non-destructive on populated tables. Where a change is genuinely non-additive (a PK-type or NOT-NULL conflict — see `audit_logs`, ADR-0010), it is escalated to a redesign, not forced through an ALTER.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Edit the later migration into an ALTER (original) | one file | **no-ops on applied DBs**; only works on from-scratch rebuild | doesn't fix the live drift (critic F-001) |
| Infer live shape from filename sort | no DB access | unreliable (mixed naming, no config.toml, IF NOT EXISTS) | wrong ground truth (critic F-001) |
| Squash migrations | clean history | rewrites applied history; destructive | out of scope |

## Consequences

### Positive
- Reconcile migrations actually execute on the live DB; drift + live bugs (admin-audit POST, profile GET, audit-logger) fixed.
- Introspection catches column diffs the file-sort inference missed.
### Negative
- One forward migration per route-touched twin (more files); requires a scratch/staging DB to introspect + dry-run.
### Neutral / follow-ups
- After every reconcile, **regenerate `src/lib/supabase/types.ts`** or `tsc` drifts (types model the old shape — critic F-008). Build produces files; operator applies to staging→prod (launch condition).

## Implementation notes

- M0 in `delivery-plan.md`: (1) build a scratch DB from `supabase/migrations/*`; (2) introspect + diff vs code usage; (3) emit forward `2026072x_reconcile_<table>.sql` (additive) for every twin read/written by a new route; (4) regenerate types; (5) dry-run apply (exit 0) before dependent routes build.
- Non-additive twins (`audit_logs`) → ADR-0010.

## Revisit triggers

- Supabase adds enforced migration ordering / a config.toml workflow.
- A twin needs a breaking change (separate flagged migration + backfill).

## References

- Critic findings F-001/F-002/F-003/F-008/F-013 (2026-07-26). `research-notes.md` Track 2/3 systemic finding. `supabase/README.md`; absence of `supabase/config.toml`.
