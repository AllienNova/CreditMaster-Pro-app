# PCTT Meta / Orchestration Extension (strategy-specific)

> **STATUS:** implementation-level, strategy-specific.
> **AUTHORITY:** subordinate to canonical and to `contexts/agent-contexts/context.agent.meta.md`.

## PCTT as a Strategy Within the System

PCTT is one strategy. The Meta Agent orchestrates it like any other strategy: canonical gates, canonical modes, canonical crisis playbooks.

## Agent Workflow for a PCTT Trade

1. Regime Agent classifies the canonical primary regime. PCTT sub-regime is computed per `pctt.agent.regime.md`.
2. Signal Agent runs the PCTT pipeline per `pctt.agent.signal.md` and emits the signal.
3. Risk Agent validates and sizes per `pctt.agent.risk.md` within canonical clamps.
4. Execution Agent executes per `pctt.agent.execution.md` within the canonical order lifecycle.
5. Journal Agent records per `pctt.agent.journal.md`.

## Conflict Resolution (PCTT-specific)

- Law 30 (Survival) always overrides.
- Canonical regime gate overrides signal quality: even A-Grade is rejected if the canonical primary regime disallows PCTT.
- Correlation roll-up uses canonical correlation rules.
- Time-of-day: canonical `policy.execution.yaml` windows apply.

## Multi-Timeframe Macro Gate

Meta may require macro alignment: only allow PCTT signals aligned with the daily/weekly direction. This is a strategy option; defaults live in the strategy's own configuration, never in canonical.

## Parameter Adaptation

Every 200 trades, Meta reviews PCTT performance from Journal. Any proposed parameter change (Q threshold, time-stop length, grade cutoffs) enters the change-control queue per `policy.governance.yaml#change_control`. Never live mutation.

## PCTT Dashboard Metrics

- Active PCTT positions (count, heat contribution, average Q).
- Pipeline status (pivots, lines, breaks pending, retests active).
- Canonical regime + PCTT sub-regime.
- Session performance (R-multiple today, trade count, streak).
- Drawdown and mode state (canonical).
