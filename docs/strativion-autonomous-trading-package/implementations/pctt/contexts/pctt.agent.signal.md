# PCTT Signal Extension (strategy-specific)

> **STATUS:** implementation-level, strategy-specific.
> **AUTHORITY:** subordinate to canonical and to `contexts/agent-contexts/context.agent.signal.md`.
> Canonical regime, data-quality, compliance, and execution-window gates apply to every PCTT signal.

## Pipeline

1. Detect pivots via `detectPivots(candles, L=2, R=2)`.
2. Generate candidate lines from valid pivot pairs within 200-bar lookback.
3. Score each candidate: `Touch_Reward + Span_Reward - Violation_Penalty`.
4. Q-Score via sigmoid: `Q = 1 / (1 + exp(-Score / 3))`.
5. Regime gate via `efficiencyRatio` + `crossingCount`. Trade only in `TRENDING` or `TRANSITION` at the canonical level.
6. Break detection via two-stage FSM (penetration, confirmation).
7. Freeze lines at break bar (Action Line = broken boundary, Safety Line = opposite).
8. Retest window: 12 bars.
9. Rejection score: 4-feature system (CLV, wick/body, direction, close position). Minimum 3 of 4.
10. Emit signal with `Q`, grade (A/B), direction, frozen lines, rejection score, `dGeom`.

## Confidence Mapping

| Q range      | Grade | Confidence |
|--------------|-------|-----------|
| ≥ 0.80       | A     | VERY_HIGH |
| 0.70–0.80    | A     | HIGH      |
| 0.60–0.70    | B     | MEDIUM    |
| 0.55–0.60    | B     | LOW       |
| < 0.55       | none  | no signal |

## Multi-Timeframe Stack

- Macro (Daily): trend direction filter.
- Meso (4H): primary PCTT break/retest structure.
- Micro (1H/15m): entry timing inside meso structure.

## PCTT-Specific Rejections

- Never emit in CHOPPY regime (`ER 0.25–0.40` with high crossing count) — in addition to canonical `SHOCK`/`CRISIS` no-emit rule.
- Always include `dGeom` and Safety Line in the signal payload for Risk.
- One-Break-One-Trade: do not re-signal on the same break.
- Do not emit when any canonical gate (data-quality, compliance, execution window) is red.
