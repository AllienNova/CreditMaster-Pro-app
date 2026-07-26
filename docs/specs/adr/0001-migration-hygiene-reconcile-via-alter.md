# ADR-0001 — Reconcile schema drift via ALTER; forbid shadow re-CREATE

- **Status:** Accepted
- **Date:** 2026-07-26
- **Deciders:** parity-backend (architect)
- **Confidence:** high

## Context

Recon found three tables with colliding `CREATE TABLE IF NOT EXISTS` definitions across migrations — `credit_reports` (`20250107` vs `20250204`), `subscriptions` (`001_initial_schema` vs `20260110_subscriptions`), `audit_logs` (`002_production_enhancements` vs `20260217000000`). The earliest migration runs first, its shape wins, and the later richer definition becomes a silent no-op. Consequences are live bugs: the admin-audit POST writes `details`/omits `resource_type NOT NULL` and **fails against the running table** (`admin/audit/route.ts:111`); the profile route SELECTs `phone/address` columns that exist in no migration (`profile/route.ts:21`). Separately, several tables the code reads/writes were **never migrated** (`transactions`, `spending_alerts`, `spending_limits`, `budget_alerts`).

## Decision

We will reconcile every drifted table by making the later migration an idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` against the canonical (first-run) table, and create the never-migrated tables grounded in their code reader+writer usage. No migration may re-`CREATE` a table another migration already creates.

## Rationale

`ALTER` converges to the union of columns regardless of run order; a second `CREATE … IF NOT EXISTS` is a no-op that hides drift. Grounding never-migrated tables in actual reader/writer column usage (not guesses) keeps the schema honest and matches what the code already assumes. Additive-only keeps it non-destructive and safe to apply to a populated DB.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Leave twins, rely on run-order | no work | drift persists, live bugs remain, order is fragile | doesn't fix the bugs |
| DROP + re-CREATE canonical | clean single definition | destructive; data loss on populated DB | violates additive/non-destructive constraint |
| Squash all migrations | one clean history | rewrites applied history; risky on prod | out of scope; destructive |

## Consequences

### Positive
- Live admin-audit and profile bugs fixed; schema matches code.
- Run-order no longer determines the live shape.

### Negative
- One reconciliation migration per drifted table adds files.

### Neutral / follow-ups
- The build produces migration files only; an operator applies them to staging/prod (launch condition).

## Implementation notes

- M0 milestone in `delivery-plan.md`. Each reconciliation migration: `ALTER TABLE <t> ADD COLUMN IF NOT EXISTS …`, add RLS if missing, register in erasure cascade (ADR-0004).
- `transactions`: resolve `category` (Plaid writer `string[]` vs analyzer reader `string`) to one canonical type; pick `is_pending`. Ground in `plaid-service.ts:411` + `spending-analyzer.ts:77`.

## Revisit triggers

- If Supabase migration tooling changes to enforce ordering/uniqueness natively.
- If a table needs a genuinely breaking change (then a separate, explicitly-flagged migration + backfill plan).

## References

- `research-notes.md` Track 2 items 1/2/3; Track 3 systemic finding.
- CLAUDE.md status banner "live-schema audit" launch condition.
