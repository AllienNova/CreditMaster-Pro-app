# ADR-0002 — Balance/contribution mutations use atomic Postgres RPCs

- **Status:** Accepted
- **Date:** 2026-07-26
- **Deciders:** parity-backend (architect)
- **Confidence:** high

## Context

The shared-goals service updates a goal's running total with a read-modify-write: `recordContribution` reads `current_amount` and writes back `current + delta` (`shared-goals-service.ts:307,335`). Concurrent contributions from different members lose updates. This is the same lost-update class Wave 7 already fixed elsewhere with an atomic RPC + `UNIQUE` constraint (the `d64e8d5` / `increment_referral_use` template).

## Decision

We will implement shared-goals contribution increments (and any other new balance mutation in this parity work) as atomic Postgres RPCs — `UPDATE … SET current_amount = current_amount + $delta` inside the function — never read-modify-write in application code.

## Rationale

A single atomic `UPDATE` under Postgres row locking eliminates the lost-update race without app-level locking. The pattern is already proven in this codebase (`increment_referral_use`), so it is consistent and low-risk. `REVOKE EXECUTE FROM PUBLIC; GRANT TO service_role` keeps the RPC callable only by the server.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Read-modify-write (status quo) | simplest | lost updates under concurrency | correctness defect |
| App-level advisory lock | no schema change | extra round-trips, lock leak risk | RPC is simpler and atomic |
| Optimistic concurrency (version col) | detects conflict | requires retry loop in app | heavier than a single atomic UPDATE |

## Consequences

### Positive
- Correct totals under concurrent multi-member contributions.
- Consistent with the established Wave 7 money-correctness pattern.

### Negative
- One RPC migration per mutation; RPC logic lives in SQL.

### Neutral / follow-ups
- Contribution amounts validated (positive, bounded) at the route boundary before the RPC.

## Implementation notes

- Migration: `CREATE FUNCTION increment_shared_goal_contribution(goal_id uuid, member uuid, delta numeric)` → atomic UPDATE + insert into `shared_goal_contributions`; `REVOKE … FROM PUBLIC; GRANT … TO service_role`.
- Ties to FR-104 (Track 1 shared-goals, M3).

## Revisit triggers

- If contributions move to an event-sourced ledger model.
- If multi-currency contributions are introduced (needs a `Money` branded type first).

## References

- `research-notes.md` Track 1 shared-goals ADR-input.
- Commit `d64e8d5` (atomic RPC template); CLAUDE.md first-fix template.
