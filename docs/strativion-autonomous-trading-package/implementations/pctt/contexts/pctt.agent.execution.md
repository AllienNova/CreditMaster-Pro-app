# PCTT Execution Extension (strategy-specific)

> **STATUS:** implementation-level, strategy-specific.
> **AUTHORITY:** subordinate to canonical and to `contexts/agent-contexts/context.agent.execution.md`.
> The canonical order lifecycle, pre-submission gate sequence, spread and window controls, and compliance gates all apply regardless of strategy.

## Entry Execution

1. Wait for the rejection confirmation bar to close. Do not anticipate.
2. Enter at market on the close of the rejection bar.
3. Set initial stop at Safety Line value at entry time.
4. Record: entry price, stop price, `dGeom`, `Q`, grade, rejection score.

## Line Freezing

- Action Line and Safety Line freeze at break bar.
- Both lines extrapolate forward using their frozen slope.
- Safety Line is the structural stop.
- Never recalculate frozen lines.

## 5-Phase Trailing Stop

1. **Structural:** stop at `Safety Line + 0.10 ATR` buffer.
2. **Breakeven:** at `+0.8R`, move stop to `entry + 0.05 ATR`.
3. **Partial Profit:** at `+1.0R`, close 60% at market.
4. **Pivot Trailing:** trail behind each new confirmed pivot with `0.20 ATR` buffer; monotonic only.
5. **Time Stop:** if 20 bars pass without `+1R`, exit at market.

## Monotonic Rule

Stops only move in the profitable direction. Long stops only rise; short stops only fall. A loosening stop update is rejected.

## Exit Priority

1. Safety Line stop (Phase 1).
2. Regime-change exit (canonical regime agent signals `SHOCK`/`CRISIS`).
3. Phase-based trailing updates.
4. Time stop.

All of the above operate within the canonical order lifecycle, compliance, and crisis workflows.
