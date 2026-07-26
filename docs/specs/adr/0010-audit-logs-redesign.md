# ADR-0010 — audit_logs: standardize on the security-audit shape, split AI-event logging, unswallow the write

- **Status:** Accepted
- **Date:** 2026-07-26
- **Deciders:** parity-backend (architect) + security
- **Confidence:** medium
- **Origin:** critic F-003 (audit_logs is not additively reconcilable as a single table).

## Context

`audit_logs` is twinned into two incompatible shapes: `002_production_enhancements.sql:24` (`id UUID` PK, `action`, `resource_type NOT NULL`, `old_values/new_values` JSONB, `ip_address`, `user_agent`) — a **security/human audit** log; and `20260217000000:39` (`id TEXT` PK, `event_type`, `level`, `message`, `cost`, `tokens`, `model`, `metadata`) — an **AI/observability event** log. `002` applied first, so the live table is the UUID security shape; the TEXT AI-event table was never created. Three writers disagree with the live shape: `admin/audit/route.ts:110` writes `details` (absent) and omits `resource_type NOT NULL`; `trading/audit/audit-trail.ts:114` writes `resource_type` (present, OK); `src/lib/audit/audit-logger.ts:70-82` writes `actor_email/target_type/success/error_message` (all absent) **and swallows the insert error at :84** — so security audit logging is silently failing against the live schema **today**. A PK type (UUID↔TEXT) and a `NOT NULL` cannot be changed by additive `ALTER`, so the two shapes cannot be merged into one table.

## Decision

Keep `audit_logs` as the **canonical UUID-PK security-audit table** and reconcile it additively; move AI/observability events to a **separate `system_event_logs` table** (only if a live writer/reader for that shape exists — confirm by introspection); fix all three writers to the canonical shape; and **stop swallowing the insert error** in `audit-logger.ts:84` (log + surface it).

## Rationale

The two shapes are genuinely different logs conflated under one name; splitting is correct domain modeling, not a workaround. Everything the security writers actually need (`details`, `type`/`category`, `actor_email`, `target_type`, `success`, `error_message`) is **additive** to the UUID table (`ADD COLUMN IF NOT EXISTS`), so no PK/NOT-NULL surgery is required once we stop trying to absorb the TEXT AI shape. Unswallowing the write turns a silent compliance failure into an observable one.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Force one table via ALTER (M0-1 original) | one table | can't ALTER PK type or drop NOT NULL; loses AI-event fields or breaks security fields | non-additive, impossible on live table |
| Change PK to TEXT + backfill | unifies id | destructive rewrite of a populated audit table; risky | violates additive/non-destructive |
| Leave as-is | no work | security audit logging stays silently broken | live compliance defect |

## Consequences

### Positive
- Security audit writes succeed + errors surface; admin-audit POST + audit-logger fixed; AI-event log gets a correct home.
### Negative
- Three writers edited to the canonical shape; a new table if AI events are live.
### Neutral / follow-ups
- `resource_type NOT NULL`: the admin POST must **supply** it (not drop the constraint). Regenerate types after (ADR-0001).

## Implementation notes

- M0-1: forward migration `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details jsonb, type text, category text, actor_email text, target_type text, success boolean, error_message text`; create `system_event_logs` iff introspection finds a live AI-event writer; fix the 3 writers; replace the `if (error) { }` swallow at `audit-logger.ts:84` with a logged surfaced error; admin POST supplies `resource_type`. **Note (F-017): `audit-logger.ts` writes `target_type`, not `resource_type` — so after the additive columns land, `resource_type NOT NULL` still rejects its inserts. Map `target_type` → `resource_type` (or supply `resource_type`) in that writer specifically.** Add an insert-failure test (fails before, passes after) covering all 3 writers.

## Revisit triggers

- AI-event volume warrants a time-series store; audit retention/immutability requirements (WORM) emerge.

## References

- Critic F-003. `002_production_enhancements.sql:24`; `20260217000000:39`; `admin/audit/route.ts:110`; `trading/audit/audit-trail.ts:114`; `audit-logger.ts:70-84`.
