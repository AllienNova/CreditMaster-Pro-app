# Position Sizing Guide

## Purpose
This guide defines all position sizing methods, formulas, and rules for the Strativion trading agent. Position sizing determines survival more than entry timing (Law 21). Every sizing decision must account for edge size, uncertainty, regime, and current portfolio state.

## Core Principle
Position size = f(edge certainty, risk budget, volatility, regime). Never size based on conviction alone.

## Method 1: Fixed Fractional (Default)

**Formula:**
```
Position Size (units) = (Account Equity x Risk Fraction) / (Entry Price - Stop Price)
```

**Risk Fraction by Confidence:**
- High confidence (4-5 confluence factors): 2.0% of equity
- Standard confidence (3 factors): 1.0% of equity
- Low confidence (2 factors): 0.5% of equity
- Exploratory/new strategy: 0.25% of equity

**Example:** $100,000 account, 1% risk, entry $50.00, stop $48.00
- Dollar risk = $100,000 x 0.01 = $1,000
- Position size = $1,000 / ($50.00 - $48.00) = 500 shares

## Method 2: ATR-Based Sizing

**Formula:**
```
Position Size (units) = (Account Equity x Risk Fraction) / (N x ATR(14))
```
Where N = ATR multiplier for stop distance (typically 2-3).

**Advantages:** Automatically adjusts for volatility. Wider stops in volatile markets = smaller positions.

**ATR Multiplier by Strategy:**
- Trend-following: N = 2.5-3.0 ATR
- Swing trading: N = 1.5-2.0 ATR
- Day trading: N = 1.0-1.5 ATR
- Crisis/elevated vol: N = 3.0-4.0 ATR

## Method 3: Kelly Criterion

**Formula:**
```
f* = (b * p - q) / b
```
Where: b = average win / average loss, p = win probability, q = 1 - p

**ALWAYS use Half-Kelly or Quarter-Kelly in practice:**
- Half-Kelly: f*/2 (standard deployment for established strategies)
- Quarter-Kelly: f*/4 (new strategies, uncertain edge, drawdown recovery)

**Example:** Win rate 55%, average win $200, average loss $100. b = 2.0
- f* = (2.0 x 0.55 - 0.45) / 2.0 = 0.325 (32.5%)
- Half-Kelly = 16.25%
- Quarter-Kelly = 8.125%
- Cap at 2% regardless (hard limit overrides Kelly)

## Method 4: Volatility-Adjusted Parity

**Formula:**
```
Position Weight = (1 / Asset Volatility) / Sum(1 / All Asset Volatilities)
Position Size = Portfolio Equity x Position Weight x Leverage Factor
```

**Use for:** Multi-asset portfolio construction. Each position contributes equal risk.

## Portfolio-Level Constraints (Hard Limits)

| Constraint | Limit | Action if Breached |
|---|---|---|
| Risk per trade | Max 2% of equity | Reject trade |
| Portfolio heat (sum of all open risk) | Max 6% of equity | No new trades until heat < 4% |
| Single sector exposure | Max 30% of equity | Diversify or reduce |
| Correlated positions (r > 0.7) | Max 3 positions | Treat correlated group as one position |
| Maximum gross exposure | Max 200% of equity | Reduce positions |

## Regime-Based Adjustments

Apply these multipliers to all sizing methods:

| Regime | Size Multiplier | Max Risk/Trade | Max Heat |
|---|---|---|---|
| Trending | 1.0x (full) | 2.0% | 6% |
| Ranging | 0.75x | 1.5% | 4.5% |
| Crisis (VIX 30-40) | 0.50x | 1.0% | 3% |
| Acute Crisis (VIX > 40) | 0.25x | 0.5% | 1.5% |

## Drawdown-Based Adjustments

Apply these multipliers ON TOP of regime adjustments:

| Current Drawdown | Size Multiplier | Action |
|---|---|---|
| 0-5% | 1.0x | Normal operations |
| 5-10% | 0.75x | Tighten risk, review strategy |
| 10-15% | 0.50x | Significant reduction, strategy audit |
| 15-20% | 0.25x | Minimum sizing only |
| > 20% | 0.0x | HALT all new trading |

## Scaling In and Out

**Scaling In (adding to winners):**
- Add only after 1R profit confirmed
- Each add is 50% the size of the initial position
- Maximum 3 adds (initial + 3 adds = 2.5x initial size)
- Trail stop on entire position to breakeven or better before adding

**Scaling Out (profit taking):**
- 25% at 1R profit
- 25% at 2R profit
- 25% at 3R profit
- Final 25% on trailing stop

## Position Sizing Calculator

For automated sizing, reference `canonical/policy/policy.sizing.yaml` for all thresholds, multipliers, and limits.

**Pre-trade checklist:**
1. Calculate raw position size (Method 1 or 2)
2. Apply regime multiplier
3. Apply drawdown multiplier
4. Check against portfolio heat limit
5. Check against sector/correlation limits
6. Final size = minimum of all constraints
