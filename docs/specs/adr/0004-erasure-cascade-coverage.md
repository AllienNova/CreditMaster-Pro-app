# ADR-0004 — Every new/reconciled table joins the GDPR erasure cascade

- **Status:** Accepted
- **Date:** 2026-07-26
- **Deciders:** parity-backend (architect)
- **Confidence:** high

## Context

Wave 7 already treats erasure-cascade coverage as a launch condition (FND-057; the `7069485` erasure-resilience fix). This parity work adds ~20 user-scoped tables (Track 1: 12 across the four services; Track 2/3: profile columns, `support_tickets`, `spending_alerts`/`spending_limits`/`budget_alerts`, `transactions`, a vitality history table). None of the four orphaned services' tables are in the erasure cascade today. A user-deletion that misses these tables leaves orphaned PII — a compliance defect.

## Decision

Every table created or reconciled in this parity work that holds `user_id`-scoped data is added to the GDPR erasure cascade (the resilient per-table erasure sweep) in the same migration/PR that introduces it.

## Rationale

Coupling cascade registration to table creation makes "did we cover it?" a mechanical, reviewable check rather than a later audit. It matches the existing FND-057 remediation direction and keeps erasure complete-by-construction.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Register in a later sweep | defer work | tables ship uncovered; easy to forget | leaves PII gap between ship and audit |
| Rely on `ON DELETE CASCADE` FKs to `auth.users` | DB-enforced | not all tables FK directly to auth.users; erasure sweep is the app-level contract | insufficient alone; keep both |

## Consequences

### Positive
- No orphaned PII from the new tables; launch condition stays satisfied.

### Negative
- Each table migration must also touch the erasure config.

### Neutral / follow-ups
- Child tables (holdings, valuations, contributions) cascade via their parent FK; verify the sweep reaches them.

## Implementation notes

- Add each table to the erasure sweep alongside its migration; add an erasure test asserting the table is emptied for a deleted user (mirrors `7069485`).

## Revisit triggers

- If the erasure mechanism changes (e.g. moves fully to DB triggers).

## References

- FND-057; commit `7069485` (erasure resilience). `research-notes.md` Track 1 ADR-input.
