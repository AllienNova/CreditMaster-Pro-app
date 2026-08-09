# Crisis Playbook (REFERENCE ONLY, NON-BINDING)

> **STATUS:** reference
> **AUTHORITY:** NONE.
> **BINDING SOURCE:**
> - `canonical/policy/policy.runtime.yaml#crisis`
> - `canonical/policy/policy.risk.yaml`
> - `canonical/policy/policy.portfolio.yaml`
> - `canonical/workflows/workflow.crisis.yaml`
> - `canonical/workflows/workflow.incidents.yaml`
>
> This guide is historical narrative. Numeric triggers inside this file
> (e.g. VIX>30, S&P -3%, correlation>0.7, heat max 3% in crisis, "cut
> gross by 50%", "buy 10-delta 30-60 DTE puts at 2% of equity", re-entry
> scaling 25%/50%/75%) are **LEGACY PROSE** and are overridden by the
> canonical crisis workflow and runtime policy.
>
> Autonomous consumers MUST NOT derive crisis thresholds or hedging actions
> from this file. Autonomous trading strategies (e.g. buy tail protection)
> must be defined in a consumer's own strategy module, not sourced from
> this file.

## Purpose
Narrative explanation of crisis-mode behavior and the laws that govern it (7, 24, 29, 30). All enforceable thresholds live in canonical policy.

## Crisis Activation Triggers (ANY ONE triggers crisis mode)

- VIX closes above 30 (or VIX spikes > 40 intraday)
- S&P 500 drops > 3% in a single session
- Average portfolio correlation spikes above 0.7
- Bid-ask spreads widen > 3x normal across multiple instruments
- Circuit breaker or limit-down event on major exchange
- Two or more 3-sigma daily moves within a 5-day window

## Immediate Actions (Execute Within 1 Hour of Trigger)

### Phase 1: Reduce (First 30 Minutes)
1. **Cut gross exposure by 50%.** Close lowest-conviction positions first. Use limit orders where possible but accept slippage on urgent exits
2. **Set portfolio heat maximum to 3%** (from normal 6%). Close positions as needed to achieve this
3. **Widen all remaining stops by 1.5x ATR.** Reduce position sizes proportionally to maintain same dollar risk
4. **Cancel all pending entry orders.** No new positions during Phase 1

### Phase 2: Hedge (Minutes 30-60)
5. **Activate tail hedges.** If not already in place, buy OTM index puts (10-delta, 30-60 DTE). Allocate up to 2% of equity
6. **Check correlation status.** If portfolio correlation > 0.8, reduce to 3 or fewer positions
7. **Set daily loss limit to 1.5%** (from normal 3%). If hit, halt all trading for session

### Phase 3: Monitor (Ongoing)
8. **Run risk report every 2 hours** during active crisis. Track: drawdown, heat, correlation, VIX, spread widths
9. **Log all actions and conditions.** Post-crisis review depends on accurate records
10. **No discretionary decisions.** Follow this playbook mechanically. Emotional decisions during crisis have negative expected value

## Crisis Trading Rules

### What You CAN Do During Crisis
- Execute pre-planned exits and stop-losses
- Roll or adjust existing hedges
- Buy tail protection (puts, VIX calls) if not already positioned
- Take small crisis-alpha positions if SPECIFICALLY pre-designed for crisis (e.g., long vol, short credit)

### What You CANNOT Do During Crisis
- Open new directional positions ("buying the dip")
- Average down on any existing position
- Remove or widen stop-losses beyond the 1.5x ATR crisis adjustment
- Increase position sizes for any reason
- Make any decision based on "this feels like the bottom"

## Crisis Duration Assessment

| VIX Level | Expected Duration | Stance |
|---|---|---|
| 30-40 | Days to weeks | Defensive. 50% reduced exposure |
| 40-50 | Weeks to months | Maximum defense. 75% reduced exposure |
| > 50 | Extended crisis | Survival mode. Minimal positions, maximum hedges |

## Re-Entry Protocol (Exiting Crisis Mode)

Do NOT resume normal trading until ALL of the following are met:
1. VIX has declined from peak AND closed below 25 for 5 consecutive sessions
2. Average portfolio correlation has returned below 0.5
3. Bid-ask spreads have normalized (< 1.5x of pre-crisis levels)
4. No circuit breaker events in prior 10 sessions
5. ADX readings indicate identifiable regime (trending or ranging)

**Re-entry scaling:**
- Day 1-5 after exit triggers met: 25% of normal position sizing
- Day 5-10: 50% of normal sizing
- Day 10-20: 75% of normal sizing
- Day 20+: Resume normal sizing if no crisis relapse

## Post-Crisis Review (Within 48 Hours of Crisis Exit)

1. Total crisis P&L and maximum drawdown during crisis
2. Which actions were executed on time? Which were late?
3. Did hedges perform as expected?
4. What positions should have been closed sooner?
5. Update crisis playbook with lessons learned
6. Recalibrate all VIX thresholds if market structure has changed

## Historical Reference Points

| Crisis | VIX Peak | S&P Drawdown | Duration |
|---|---|---|---|
| 2008 GFC | 80.9 | -56.8% | 17 months |
| 2010 Flash Crash | 40.1 | -9.2% (intraday) | 1 day |
| 2011 Debt Ceiling | 48.0 | -19.4% | 5 months |
| 2018 Volmageddon | 37.3 | -10.2% | 2 weeks |
| 2020 COVID Crash | 82.7 | -33.9% | 5 weeks |
| 2022 Bear Market | 36.5 | -25.4% | 10 months |
