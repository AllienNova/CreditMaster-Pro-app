# Risk Management Guide (REFERENCE ONLY, NON-BINDING)

> **STATUS:** reference
> **AUTHORITY:** NONE.
> **BINDING SOURCE:**
> - `canonical/policy/policy.runtime.yaml`
> - `canonical/policy/policy.risk.yaml`
> - `canonical/policy/policy.portfolio.yaml`
>
> This guide is historical narrative. Numeric thresholds inside this file
> (e.g. daily loss limit 3%, weekly 5%, monthly 8%, drawdown 25%+ survival
> mode, correlation 0.6/0.7, heat 6%/4.5% bands) are **LEGACY PROSE** that
> predate the canonical normalization. Where these numbers disagree with
> the canonical policy layer, the canonical policy layer wins without
> exception.
>
> Autonomous consumers MUST NOT derive runtime thresholds from this file.
> Agent context files MUST NOT reference this file as a source of numbers.

## Purpose
This guide describes the *shape* of a portfolio risk architecture and the laws it embodies (21, 23, 24, 29, 30). Concrete thresholds have moved to canonical policy.

## Risk Hierarchy (Priority Order)

1. **Survival** (Law 30): Never allow any scenario where account goes to zero
2. **Drawdown Control** (Law 23): Prevent asymmetric damage from compounding
3. **Position Limits** (Law 21): Control per-trade and portfolio-level risk
4. **Correlation Management** (Law 24): Prevent hidden concentrated bets
5. **Tail Risk Hedging** (Law 7): Protect against fat-tail events

## Per-Trade Risk Controls

### Pre-Entry Checklist
Before any trade executes, verify ALL of the following:
- [ ] Invalidation level defined (Law 22). If undefined, REJECT trade
- [ ] Risk per trade < 2% of equity (1% in crisis regime)
- [ ] Portfolio heat after entry < 6% (3% in crisis regime)
- [ ] No more than 3 correlated positions open (correlation > 0.7)
- [ ] Regime confirmed and strategy matches regime (Law 8)
- [ ] Position size calculated per Position Sizing Guide

### Stop-Loss Protocol
- Every position MUST have a hard stop-loss at the structural invalidation level
- Stops are set at entry time and stored in the order management system
- Moving stops FURTHER from entry is PROHIBITED
- Moving stops CLOSER to entry (tightening) is allowed and encouraged after profit
- Stop-loss execution: market order (equities), stop-limit with 0.5% buffer (futures/FX)

### Maximum Loss Per Day
- Daily loss limit: 3% of account equity
- If daily P&L reaches -3%: HALT all trading for remainder of session
- Weekly loss limit: 5% of account equity
- Monthly loss limit: 8% of account equity
- See `canonical/policy/policy.risk.yaml` for configurable limits

## Portfolio-Level Risk Controls

### Heat Management
**Portfolio heat** = sum of risk on all open positions (distance to stop x position size).

| Heat Level | Status | Action |
|---|---|---|
| 0-3% | Green | Full operations. New trades allowed |
| 3-4.5% | Yellow | Caution. Only high-conviction trades allowed (4+ confluence) |
| 4.5-6% | Orange | Warning. No new trades. Manage existing positions |
| > 6% | Red | BREACH. Close weakest position(s) until heat < 4.5% |

### Correlation Risk Management
- Calculate 30-day rolling pairwise correlations for all open positions
- If any pair has correlation > 0.7: treat them as ONE position for heat calculation
- If average portfolio correlation > 0.6: reduce gross exposure by 30%
- In crisis (correlation > 0.8): reduce to minimum exposure, activate tail hedges

### Sector/Theme Concentration
- Maximum 30% of equity in any single sector
- Maximum 40% of equity in any single theme/narrative
- Maximum 20% of equity in any single instrument

## Drawdown Response Protocol

| Drawdown | Response Level | Actions |
|---|---|---|
| 0-5% | Normal | Continue trading. No changes |
| 5-10% | Alert | Review all open positions. Reduce size multiplier to 0.75x. Tighten all stops |
| 10-15% | Warning | Reduce size multiplier to 0.50x. Close bottom 25% of positions (lowest conviction). Full strategy audit |
| 15-20% | Critical | Reduce size multiplier to 0.25x. Close 50% of positions. Halt all new trades except hedges |
| 20-25% | Emergency | Close all positions. FULL HALT. No trading until systematic review complete |
| > 25% | Survival Mode | Account preservation only. No trading. Rebuild capital (or deposit) before resuming |

## Tail Risk Hedging

### Permanent Hedge Portfolio
Allocate 1-3% of equity annually to tail risk protection:
- OTM puts (5-10 delta) on major index, 30-90 DTE, rolling
- VIX call spreads (when VIX < 15)
- Long volatility positions sized to offset 20%+ portfolio drawdown

### Crisis Activation
When VIX crosses above 30:
1. All existing hedges activate (let them work, do not close)
2. Reduce gross exposure by 50% within 24 hours
3. Set maximum portfolio heat to 3%
4. Only long-volatility and crisis-alpha strategies active
5. No bottom-fishing until VIX has peaked and declined for 5+ consecutive sessions

## Risk Reporting

Generate daily risk reports including:
- Current portfolio heat and trend (rising/falling)
- Drawdown from peak and recovery timeline estimate
- Average portfolio correlation
- Largest single-name and sector exposures
- P(ruin) calculation at current position sizing
- Number of active risk limit breaches

See `canonical/policy/policy.risk.yaml` for all configurable thresholds and alert levels.
