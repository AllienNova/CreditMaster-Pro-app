# ADR-0009 — Credit-score simulators: deterministic de-fab

- **Status:** Proposed
- **Date:** 2026-07-26
- **Deciders:** owner (product + compliance)
- **Confidence:** medium (owner call)

## Context

Two mobile simulators fabricate score deltas: `mobile-app/app/credit-builder/score-simulator.tsx` hardcodes per-action ranges (pay-down-utilization +30..+70; missed-payment −60..−100) → `projectedScore = clamp(current + avgImpact, 300, 850)` (`:43-176`); `mobile-app/app/credit-builder/simulator.tsx` sums hardcoded per-scenario ints → `simulatedScore = base + Σimpact` (`:47-167`). Web has parallels (`src/app/credit/simulator/page.tsx`, `src/app/credit-builder/score-simulator/page.tsx`). None reads the user's real credit file; all present specific point outcomes as predictions — an FCRA/UDAAP exposure (FICO/VantageScore impacts are individualized and not precisely predictable).

## Decision

**Stop shipping the hardcoded point tables.** If ADR-0006 → Array, adopt Array's compliant simulator and delete the tables. Otherwise build a **deterministic directional model** grounded in the user's actual factors (utilization from linked accounts, derogatory counts, age of credit) that outputs a **direction + coarse band** ("likely +20–40; individual results vary") with a persistent disclaimer — **never a single guaranteed number**. Removing the feature is the fallback only if neither is resourced before launch.

## Rationale

Presenting invented point magnitudes as predictions is fabrication and a consumer-finance compliance risk. A directional band grounded in real factors is defensible and honest; Array's simulator offloads the model + compliance to a vendor already under consideration. Either path removes the fabrication.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Keep hardcoded tables | popular feature, no work | fabricated, FCRA/UDAAP exposure | violates honesty + compliance |
| Remove the feature | zero risk, low effort | loses a feature competitors ship | fallback only if unresourced |

## Consequences

### Positive
- Fabricated deltas + guaranteed-outcome copy removed from 2 mobile + 2 web screens.
### Negative
- Either a vendor dependency (Array) or an in-house model + legal-reviewed disclaimers.
### Neutral / follow-ups
- Directional-band copy needs legal review.

## Implementation notes

- **Proceed-now (no owner gate):** flag/gate the 4 fabricated simulators so the point tables don't ship (feature-flag off or honest "estimate unavailable" state) — FR-605 rebuild is gated on the model choice.

## Revisit triggers

- UDAAP/regulator guidance on simulators; Array adopted/dropped; model-accuracy complaints.

## Owner must decide

Replace the fabricated simulators with Array's compliant simulator (if ADR-0006=Array) or a documented deterministic directional model with disclaimers — and stop shipping the hardcoded point tables. Which path?

## References

- `mobile-app/app/credit-builder/{score-simulator,simulator}.tsx`; `src/app/credit/simulator/page.tsx`; `src/app/credit-builder/score-simulator/page.tsx`. ADR-0006 (Array).
