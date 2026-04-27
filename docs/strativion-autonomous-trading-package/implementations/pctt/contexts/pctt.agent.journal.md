# PCTT Journal Extension (strategy-specific)

> **STATUS:** implementation-level, strategy-specific.
> **AUTHORITY:** subordinate to canonical and to `contexts/agent-contexts/context.agent.journal.md`.

## PCTT Strategy Extension (added to each trade's journal entry)

```yaml
strategy_extension:
  strategy: "pctt"
  setup_quality:
    q_score: [number]
    grade: [A | B]
    touches: [int]
    span_bars: [int]
  regime_context:
    efficiency_ratio: [number]
    crossing_count: [int]
    canonical_primary_regime: [string]
  break:
    break_bar_time: [ISO 8601]
    direction: [LONG | SHORT]
    action_line_price: [number]
    safety_line_price: [number]
  rejection:
    rejection_bar_time: [ISO 8601]
    rejection_score: [number]
    clv: [number]
    wick_body_ratio: [number]
    candle_direction: [UP | DOWN]
    close_position: [number]
  risk_geometry:
    d_geom: [number]
    atr_at_entry: [number]
  trailing_progression:
    highest_phase_reached: [1..5]
    partial_profit_taken: [bool]
  laws_relevant: [list of law ids]
```

## PCTT-Specific Metrics (rollups)

- Win rate by grade (A vs B).
- Average R-multiple by grade.
- Win rate by canonical primary regime.
- % of trades reaching each trailing phase.
- Time-stop frequency.
- Risk-geometry rejection rate.
- Q-Score calibration (does Q ≥ 0.70 actually win more than Q 0.55–0.70?).

## Feedback Loop

Every 50 PCTT trades, produce a proposal for the change-control queue per `policy.governance.yaml#change_control`. Proposals never mutate live parameters.
