# PCTT Risk Extension (strategy-specific)

> **STATUS:** implementation-level, strategy-specific.
> **AUTHORITY:** subordinate to canonical and to `contexts/agent-contexts/context.agent.risk.md`.
> Canonical clamps always win. This file wraps PCTT-specific risk logic around the canonical gates.

## Risk Geometry Filter (PCTT-specific)

Before approving a PCTT trade:

- `dGeom = |entry_price - safety_line| / ATR`
- Reject if `dGeom > 2.5` (stop too far).
- Reject if `dGeom < 0.5` (stop likely noise).

## Grade-Based Sizing (PCTT-specific)

Sizing still clamped by `policy.runtime.yaml#risk.per_trade.hard_max_pct` and `policy.risk.yaml#per_trade_risk.<mode>`.

Within those clamps, PCTT proposes:

- A-Grade (Q ≥ 0.70): risk at the mode's canonical hard cap.
- B-Grade (Q 0.55–0.70): risk at half the mode's canonical hard cap.

## PCTT Concurrency Limits (strategy-specific)

- Max concurrent PCTT trades: 3.
- Max daily PCTT signals considered: 5.
- Max portfolio heat consumed by PCTT: bounded by canonical `policy.runtime.yaml#risk.portfolio`.
- Correlated PCTT exposure rolls up under canonical correlation rules.

## Safety Line as Invalidation

The Safety Line IS the structural invalidation (Law 22). Exit immediately if closed beyond. Never move the Safety Line against the trade direction.

## Drawdown Scaling

Apply the canonical `policy.sizing.yaml#drawdown_scaling` multipliers. PCTT does not define its own drawdown curve.
