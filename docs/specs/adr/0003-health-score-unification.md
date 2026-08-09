# ADR-0003 — Reconcile the two health-score systems before wiring the vitality trend

- **Status:** Proposed
- **Date:** 2026-07-26
- **Deciders:** parity-backend (architect) + product (confirm concept)
- **Confidence:** medium

## Context

Two score engines coexist. `healthScoreCalculatorV2` backs `/api/financial/health-score[/v2]` and **already returns history** (`?history=true&days=N` → `getScoreHistory`); it is consumed by web `HealthScoreCard.tsx:37`. `vitalityScoreService` (de-mocked in `533f6e4`) backs `/api/financial/ai-insights` and computes a component breakdown (Debt excluded, null when no data). Mobile `dashboard/vitality.tsx:518` fetches `/api/financial/vitality-score` — a route that **does not exist** → 404 → silent `mockVitalityData` fallback. The committed `20260110_vitality_scores.sql` drifts from the service's column usage, so no operative persistence exists.

The open question is whether "vitality score" and "health score" are the **same product concept** or two distinct scores.

## Decision

Before building any vitality-history persistence, confirm the concept (a ~15-minute code/product check), then branch:
- **If same concept:** point mobile `dashboard/vitality.tsx` at the existing `/api/financial/health-score?history=true`; add **no** new backend; deprecate the dead `/api/financial/vitality-score` expectation.
- **If distinct:** give `vitalityScoreService` its own additive history table (nullable component columns) + a real `/api/financial/vitality-score` route; keep `healthScoreCalculatorV2` unchanged.

Default (hypothesis) pending the check: **distinct** — the mobile screen already names `/api/financial/vitality-score` and the vitality service has its own Debt-excluded component model.

## Rationale

Silently mapping the mobile vitality screen to `health-score` would show a *different* number under a "vitality" label if the concepts differ — a fabrication-by-mislabel risk that violates the honesty constraint. Confirming first is cheap and prevents shipping the wrong number. Whichever branch wins, the fallback-to-mock 404 is removed (real data or honest empty trend).

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Force-merge onto health-score now | least code | mislabels the number if concepts differ | honesty risk |
| Build vitality history unconditionally | matches mobile's route | may duplicate an existing system | resolve the concept question first |
| Leave the 404 + mock | no work | ships fabricated trend | violates honesty constraint |

## Consequences

### Positive
- The dead-route → mock fallback is removed either way.
- No mislabeled score ships.

### Negative
- A short concept-confirmation step gates FR-304.

### Neutral / follow-ups
- If distinct, the new table follows ADR-0001 (additive) + ADR-0004 (erasure cascade).

## Implementation notes

- FR-304, M4. History table (if built): `(user_id, captured_at, <component cols nullable>, overall nullable)`; empty trend until history accrues — never backfill fabricated points.

## Revisit triggers

- If product consolidates the two scores into one brand concept.
- If `healthScoreCalculatorV2` gains the vitality component breakdown (then merge).

## References

- `research-notes.md` Track 3.4; commit `533f6e4` (vitality de-mock).
