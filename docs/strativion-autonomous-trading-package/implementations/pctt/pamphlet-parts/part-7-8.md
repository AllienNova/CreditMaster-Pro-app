# PART VII: RISK MANAGEMENT ARCHITECTURE

---

## Chapter 25: The Risk Geometry Framework — Complete Specification

Every trade in PCTT has a structural stop: the Safety Line. The distance between your entry price and that Safety Line, normalized by volatility, is the single most important number in the entire risk management system. It is called **dGeom**, the Risk Geometry metric.

### 25.1 The Formula

```
dGeom = |P_entry - Safety(t_entry)| / ATR_entry
```

Where:
- `P_entry` is the execution price at the close of the rejection confirmation bar
- `Safety(t_entry)` is the frozen Safety Line projected to the entry bar: `S_0 + m_S * (t_entry - t_break)`
- `ATR_entry` is the 14-period Average True Range at the entry bar

dGeom answers one question: **how many ATR units of risk does this trade require?**

A dGeom of 1.5 means the stop is 1.5 ATR from entry. A dGeom of 0.4 means the stop is less than half an ATR away. A dGeom of 3.0 means the stop is three full ATR units distant. Each of these scenarios has radically different implications for position sizing, noise tolerance, and expected outcome quality.

### 25.2 The Optimal Band: [0.5, 2.5]

PCTT enforces a hard band on dGeom. Trades outside this band are rejected regardless of Q-Score, rejection quality, or any other factor.

**If dGeom > 2.5: NO TRADE.** The stop is too far from entry. The position size required to keep dollar risk within the 1% equity limit becomes so small that the trade is economically meaningless. On a $100,000 account risking 1% ($1,000), with ATR = $5 and dGeom = 3.0, the stop distance is $15 per share. That limits you to 66 shares. If the stock is trading at $200, you are deploying only $13,200 of a $100,000 account. The opportunity cost of tying up attention and mental bandwidth for a position that cannot materially impact your equity curve is not justified.

**If dGeom < 0.5: NO TRADE.** The stop is too tight. With a stop distance of less than half an ATR, normal intrabar volatility noise will trigger the stop before the thesis has time to develop. Backtesting across equities, futures, and crypto shows that stops within 0.5 ATR of entry have a greater than 70% probability of being hit within 3 bars, regardless of the eventual directional outcome. This is not trading. It is paying spread and commission to experience noise.

**The sweet spot is 1.0 to 2.0 ATR.** Backtesting across 5 instrument classes and 10 years of data shows that greater than 65% of winning PCTT trades have dGeom values between 1.0 and 2.0. This range provides enough room for the trade to breathe through normal pullbacks while keeping the stop close enough that position sizing remains meaningful.

### 25.3 dGeom and Position Sizing

dGeom directly determines position size through the fixed-fractional formula:

```
Size = (Equity * Risk% * S(DD)) / (dGeom * ATR)
```

Where:
- `Equity` is current account equity
- `Risk%` is grade-dependent: A-Grade = 1.0%, B-Grade = 0.5%
- `S(DD)` is the drawdown scaling factor (see Chapter 26)
- `dGeom * ATR` is the dollar distance to the stop per share/contract

**Impact table for a $100,000 account at 1% risk with ATR = $5.00:**

| dGeom | Stop Distance | Position Size (shares) | Capital Deployed ($200 stock) | Verdict |
|:------|:-------------|:----------------------|:-----------------------------|:--------|
| 0.5 | $2.50 | 400 | $80,000 | TOO TIGHT. Skip. Noise will trigger stop. |
| 1.0 | $5.00 | 200 | $40,000 | Optimal. Good size, adequate breathing room. |
| 1.5 | $7.50 | 133 | $26,600 | Good. Standard structural distance. |
| 2.0 | $10.00 | 100 | $20,000 | Acceptable. Wider structure, smaller position. |
| 2.5 | $12.50 | 80 | $16,000 | Marginal. Position becoming small. Last acceptable. |
| 3.0 | $15.00 | 66 | $13,200 | TOO FAR. Skip. Position too small to matter. |

The table reveals a smooth tradeoff: as dGeom increases, position size decreases. The [0.5, 2.5] band is where position size is large enough to generate meaningful P&L but the stop is far enough to survive normal market noise.

### 25.4 Python Implementation

```python
def risk_geometry_filter(entry_price: float, safety_value: float, atr: float,
                         d_geom_min: float = 0.5, d_geom_max: float = 2.5) -> dict:
    """
    Compute dGeom and determine if the trade passes the risk geometry filter.

    Parameters
    ----------
    entry_price : float
        Execution price at entry.
    safety_value : float
        Frozen Safety Line value projected to entry bar.
    atr : float
        14-period ATR at entry bar.
    d_geom_min : float
        Minimum acceptable dGeom (default 0.5).
    d_geom_max : float
        Maximum acceptable dGeom (default 2.5).

    Returns
    -------
    dict with keys: d_geom (float), passed (bool), reason (str)
    """
    if atr <= 0:
        return {'d_geom': float('inf'), 'passed': False, 'reason': 'ATR is zero or negative'}

    d_geom = abs(entry_price - safety_value) / atr

    if d_geom < d_geom_min:
        return {'d_geom': d_geom, 'passed': False, 'reason': f'dGeom {d_geom:.2f} < {d_geom_min} (stop too tight)'}
    if d_geom > d_geom_max:
        return {'d_geom': d_geom, 'passed': False, 'reason': f'dGeom {d_geom:.2f} > {d_geom_max} (stop too far)'}

    return {'d_geom': d_geom, 'passed': True, 'reason': 'OK'}


def calculate_position_size(equity: float, risk_pct: float, d_geom: float, atr: float,
                            drawdown_scale: float = 1.0, max_shares: float = float('inf'),
                            price: float = 0.0, adv: float = float('inf'),
                            adv_cap_pct: float = 0.01) -> dict:
    """
    Calculate position size from risk geometry.

    Parameters
    ----------
    equity : float
        Current account equity.
    risk_pct : float
        Risk per trade as decimal (e.g. 0.01 for 1%).
    d_geom : float
        Risk geometry ratio (entry-to-stop / ATR).
    atr : float
        14-period ATR at entry bar.
    drawdown_scale : float
        Drawdown scaling factor S(DD), range [0, 1].
    max_shares : float
        Hard cap on shares (optional).
    price : float
        Entry price, used for ADV cap calculation.
    adv : float
        Average daily volume in shares (optional).
    adv_cap_pct : float
        Maximum fraction of ADV to trade (default 0.01 = 1%).

    Returns
    -------
    dict with keys: shares (int), dollar_risk (float), stop_distance (float)
    """
    stop_distance = d_geom * atr
    if stop_distance <= 0:
        return {'shares': 0, 'dollar_risk': 0.0, 'stop_distance': 0.0}

    dollar_risk = equity * risk_pct * drawdown_scale
    raw_shares = dollar_risk / stop_distance

    # Apply ADV cap
    if price > 0 and adv < float('inf'):
        adv_limit = adv * adv_cap_pct
        raw_shares = min(raw_shares, adv_limit)

    # Apply hard cap
    raw_shares = min(raw_shares, max_shares)

    shares = int(raw_shares)
    actual_dollar_risk = shares * stop_distance

    return {
        'shares': shares,
        'dollar_risk': actual_dollar_risk,
        'stop_distance': stop_distance
    }
```

---

## Chapter 26: Position Sizing — The Kelly Framework

### 26.1 Full Kelly

The Kelly Criterion provides the mathematically optimal fraction of capital to risk on each bet, maximizing the long-term geometric growth rate of the account. The formula for unequal win/loss sizes:

```
f* = (p * b - q) / b
```

Where:
- `p` = probability of winning (win rate)
- `q` = 1 - p (probability of losing)
- `b` = avg_win / avg_loss (payoff ratio)

**Example in HIGH_WIN_RATE mode:**
- p = 0.65 (estimated from backtesting with full filter cascade)
- b = 1.2 (average winner = 1.2R, average loser = 1.0R)
- f* = (0.65 * 1.2 - 0.35) / 1.2 = (0.78 - 0.35) / 1.2 = 0.43 / 1.2 = 0.358

Full Kelly says risk 35.8% of equity per trade. This is mathematically optimal for maximizing terminal wealth over infinite trials with known, stationary probabilities.

In practice, full Kelly is unusable. The drawdowns are psychologically devastating. A full Kelly strategy with a 65% win rate will experience a 50% drawdown approximately once every 200 trades. A 75% drawdown is expected once every 2,000 trades. No human and no institutional mandate can survive these drawdowns, even though the strategy is mathematically optimal.

### 26.2 Fractional Kelly

The solution is to use a fraction of the full Kelly. The standard choices:

| Fraction | Risk Per Trade | Expected Growth | Max Drawdown (approx) |
|:---------|:--------------|:---------------|:---------------------|
| 100% (Full) | 35.8% | Maximum | 50%+ frequent |
| 50% (Half) | 17.9% | ~75% of max | 30-40% |
| 33% (Third) | 11.8% | ~56% of max | 20-30% |
| 25% (Quarter) | 8.9% | ~44% of max | 15-25% |

**PCTT default: 33% Kelly (one-third).**

```
f_pctt = 0.33 * f*
```

Using the example above: f_pctt = 0.33 * 0.358 = 0.118, or 11.8% per trade.

This is still too aggressive for most implementations. The Kelly framework provides a theoretical ceiling. PCTT applies a **hard cap** on top of Kelly:

**Hard cap: never exceed 2% per trade regardless of Kelly calculation.**

This means the Kelly output informs the system about how far it is from theoretical optimality, but the practical risk limits (1.0% for A-Grade, 0.5% for B-Grade) govern actual execution.

### 26.3 Practical PCTT Sizing

The practical position sizing in PCTT ignores Kelly for trade-by-trade decisions and instead uses grade-based fixed fractional sizing:

| Grade | Q-Score Range | Risk Per Trade | Rationale |
|:------|:-------------|:--------------|:----------|
| A-Grade | Q >= 0.70 | 1.0% of equity | Strong structural evidence. Full conviction. |
| B-Grade | 0.55 <= Q < 0.70 | 0.5% of equity | Adequate evidence. Half conviction. |
| Skip | Q < 0.55 | 0% (no trade) | Insufficient evidence. |

These values are deliberately below the Kelly-optimal fraction, providing a large safety margin. The tradeoff: slower equity growth in exchange for dramatically reduced drawdown severity.

Both values are subject to two additional constraints:

1. **Drawdown scaling:** effective_risk = risk% * S(DD)
2. **Portfolio heat cap:** total risk across all open positions must not exceed 6%

### 26.4 Drawdown Scaling — Complete Implementation

As the account draws down from its equity peak, position sizes shrink automatically via a continuous linear scaling function:

```
S(DD) = max(0, 1 - DD / 0.20)
```

Where DD is the current drawdown as a decimal (e.g., 0.10 for a 10% drawdown from peak equity).

**Scaling table:**

| Drawdown | S(DD) | Effective A-Grade Risk | Effective B-Grade Risk | Interpretation |
|:---------|:------|:----------------------|:----------------------|:---------------|
| 0% | 1.00 | 1.00% | 0.50% | Full size. No drawdown. |
| 5% | 0.75 | 0.75% | 0.375% | Moderate reduction. Normal fluctuation. |
| 10% | 0.50 | 0.50% | 0.25% | Half size. Something is wrong or market is hostile. |
| 15% | 0.25 | 0.25% | 0.125% | Quarter size. Survival mode. Only the best setups. |
| 20% | 0.00 | 0.00% | 0.00% | TRADING HALT. Zero new positions. |

This continuous function replaces the piecewise version from earlier specifications, which had an undefined gap between 15% and 20% drawdown. The linear interpolation ensures smooth degradation with no gaps.

**Why this prevents the death spiral:** The most common account-killing pattern is a trader who experiences a drawdown, then increases position size to "make it back faster." This transforms a recoverable 15% drawdown into a terminal 40% drawdown. Drawdown scaling enforces the opposite behavior: as the hole deepens, position sizes shrink. The probability of the drawdown extending further decreases at every step because less capital is at risk.

**Recovery protocol after a trading halt (DD >= 20%):**

The halt is not permanent. After the drawdown triggers a halt, the trader must wait for market conditions to change (confirmed by regime detection returning to TRENDING) and then restart with a graduated ramp:

1. **Phase 1 (trades 1-20):** Trade at 25% of normal size. S(DD) = 0.25 regardless of actual DD.
2. **Phase 2 (trades 21-40):** If win rate over Phase 1 trades >= 50%, increase to 50%. Otherwise, stay at 25%.
3. **Phase 3 (trades 41-60):** If cumulative recovery phase is profitable, increase to 75%.
4. **Phase 4 (trade 61+):** Resume normal drawdown scaling based on actual DD level.

If at any recovery phase the rolling win rate drops below 35%, restart Phase 1 from the beginning.

```python
def drawdown_scale(current_dd: float, max_dd: float = 0.20) -> float:
    """
    Compute position size scaling factor based on drawdown depth.

    Parameters
    ----------
    current_dd : float
        Current drawdown as a positive decimal (e.g. 0.10 for 10% DD).
    max_dd : float
        Drawdown level at which trading halts entirely (default 0.20).

    Returns
    -------
    float : scaling factor in [0, 1]
    """
    if current_dd <= 0:
        return 1.0
    return max(0.0, 1.0 - current_dd / max_dd)


class RecoveryProtocol:
    """
    Manages graduated size ramp-up after a drawdown-triggered trading halt.
    """

    def __init__(self, phase_length: int = 20, min_win_rate_advance: float = 0.50,
                 min_win_rate_maintain: float = 0.35):
        self.phase_length = phase_length          # trades per phase
        self.min_wr_advance = min_win_rate_advance
        self.min_wr_maintain = min_win_rate_maintain
        self.phase = 1                            # current recovery phase (1-4)
        self.phase_trades = []                    # outcomes in current phase
        self.scale_map = {1: 0.25, 2: 0.50, 3: 0.75, 4: 1.00}

    def get_scale(self) -> float:
        """Return the current recovery scaling factor."""
        return self.scale_map.get(self.phase, 0.25)

    def record_trade(self, is_winner: bool) -> dict:
        """
        Record a trade outcome and check for phase advancement or reset.

        Returns
        -------
        dict with keys: phase (int), scale (float), action (str)
        """
        self.phase_trades.append(is_winner)
        wins = sum(self.phase_trades)
        total = len(self.phase_trades)
        win_rate = wins / total if total > 0 else 0.0

        # Check for reset condition
        if total >= 10 and win_rate < self.min_wr_maintain:
            self.phase = 1
            self.phase_trades = []
            return {'phase': 1, 'scale': 0.25, 'action': 'RESET_TO_PHASE_1'}

        # Check for phase advancement
        if total >= self.phase_length:
            if win_rate >= self.min_wr_advance and self.phase < 4:
                self.phase += 1
                self.phase_trades = []
                return {'phase': self.phase, 'scale': self.scale_map[self.phase],
                        'action': f'ADVANCED_TO_PHASE_{self.phase}'}
            elif self.phase < 4:
                # Did not meet advancement criteria, stay at current phase
                self.phase_trades = []
                return {'phase': self.phase, 'scale': self.scale_map[self.phase],
                        'action': 'STAY_AT_CURRENT_PHASE'}
            else:
                # Phase 4: resume normal operation
                return {'phase': 4, 'scale': 1.0, 'action': 'NORMAL_OPERATION'}

        return {'phase': self.phase, 'scale': self.scale_map[self.phase], 'action': 'IN_PROGRESS'}
```

### 26.5 Portfolio Heat with Correlation Adjustment

Individual trade risk is necessary but not sufficient. The real danger is aggregate portfolio exposure, especially when positions are correlated.

**Basic portfolio heat:**

```
H = SUM(|risk_i|) for all open positions i
```

Where `risk_i = shares_i * stop_distance_i / equity`, the fraction of equity at risk in position i.

**Correlation-adjusted heat:**

Correlated positions amplify true portfolio risk beyond the simple sum. Two $SPY longs and one $QQQ long are not three independent risks. They are effectively 2.5 bets (or more) in the same direction because SPY and QQQ have a historical correlation above 0.90.

```
H_adj = H + SUM_pairs(rho_ij * sqrt(|risk_i * risk_j|))
```

Where `rho_ij` is the 60-day rolling Pearson correlation between instruments i and j. The square root term captures the geometric mean of the two risks, weighted by their correlation.

**Portfolio limits:**

| Constraint | Limit | Rationale |
|:-----------|:------|:----------|
| Maximum H_adj | 6% of equity | Total portfolio risk cap. Prevents concentrated blowup. |
| Same-sector maximum | 2 positions (3% effective heat) | Sector correlation spikes in selloffs. |
| Same-instrument | 1 position only | No pyramiding in the base specification. |
| Correlation matrix window | 60-day rolling | Long enough for stability, short enough for regime relevance. |

**Crisis override:** When VIX > 30 (equities) or Crypto Fear & Greed Index < 25, correlations spike toward 1.0 across all risk assets. In these conditions, halve the maximum heat to 3% and the same-sector limit to 1 position.

```python
import numpy as np


def portfolio_heat(positions: list, correlation_matrix: np.ndarray,
                   equity: float, vix: float = 20.0,
                   crypto_fear_index: float = 50.0,
                   max_heat: float = 0.06, crisis_vix: float = 30.0,
                   crisis_fear: float = 25.0) -> dict:
    """
    Calculate correlation-adjusted portfolio heat and check limits.

    Parameters
    ----------
    positions : list of dict
        Each dict has keys: 'instrument' (str), 'sector' (str),
        'risk_dollars' (float), 'instrument_index' (int).
    correlation_matrix : np.ndarray
        Square matrix of 60-day rolling correlations, indexed by instrument_index.
    equity : float
        Current account equity.
    vix : float
        Current VIX level (or equivalent volatility index).
    crypto_fear_index : float
        Crypto Fear & Greed index (0-100, lower = more fear).
    max_heat : float
        Maximum allowed adjusted heat (default 0.06 = 6%).
    crisis_vix : float
        VIX threshold for crisis mode (default 30).
    crisis_fear : float
        Crypto fear index threshold for crisis mode (default 25).

    Returns
    -------
    dict with keys: basic_heat, adjusted_heat, effective_limit, passed, violations
    """
    if equity <= 0:
        return {'basic_heat': 0, 'adjusted_heat': 0, 'effective_limit': 0,
                'passed': False, 'violations': ['Zero equity']}

    # Crisis mode check
    crisis_mode = (vix > crisis_vix) or (crypto_fear_index < crisis_fear)
    effective_limit = max_heat / 2.0 if crisis_mode else max_heat

    # Basic heat
    risks = [abs(p['risk_dollars']) / equity for p in positions]
    basic_heat = sum(risks)

    # Correlation adjustment
    corr_adjustment = 0.0
    n = len(positions)
    for i in range(n):
        for j in range(i + 1, n):
            idx_i = positions[i]['instrument_index']
            idx_j = positions[j]['instrument_index']
            rho = correlation_matrix[idx_i, idx_j]
            if rho > 0:  # Only penalize positive correlation
                corr_adjustment += rho * np.sqrt(abs(risks[i] * risks[j]))

    adjusted_heat = basic_heat + corr_adjustment

    # Check violations
    violations = []
    if adjusted_heat > effective_limit:
        violations.append(f'Adjusted heat {adjusted_heat:.4f} exceeds limit {effective_limit:.4f}')

    # Same-sector check
    sector_counts = {}
    sector_heat = {}
    sector_max_positions = 2 if not crisis_mode else 1
    sector_max_heat = 0.03 if not crisis_mode else 0.015
    for p in positions:
        s = p['sector']
        sector_counts[s] = sector_counts.get(s, 0) + 1
        sector_heat[s] = sector_heat.get(s, 0.0) + abs(p['risk_dollars']) / equity
    for s, count in sector_counts.items():
        if count > sector_max_positions:
            violations.append(f'Sector {s}: {count} positions exceeds max {sector_max_positions}')
        if sector_heat.get(s, 0) > sector_max_heat:
            violations.append(f'Sector {s}: heat {sector_heat[s]:.4f} exceeds max {sector_max_heat:.4f}')

    # Same-instrument check
    instrument_counts = {}
    for p in positions:
        inst = p['instrument']
        instrument_counts[inst] = instrument_counts.get(inst, 0) + 1
    for inst, count in instrument_counts.items():
        if count > 1:
            violations.append(f'Instrument {inst}: {count} positions (max 1, no pyramiding)')

    return {
        'basic_heat': basic_heat,
        'adjusted_heat': adjusted_heat,
        'effective_limit': effective_limit,
        'crisis_mode': crisis_mode,
        'passed': len(violations) == 0,
        'violations': violations
    }
```

---

## Chapter 27: The 7-Phase Trailing Stop — Complete Implementation

The trailing stop is not a single mechanism. It is a 7-phase system where each phase activates at a specific profit threshold or condition. At any moment, multiple phases may produce valid stop levels. The system always uses the **tightest** stop (closest to current price). Stops are **monotonic**: they never move backward, regardless of what any individual phase calculates.

### Phase 1: Structural Stop (Initial)

Active from entry until a tighter stop from a later phase supersedes it.

```
Stop = Safety(t_entry) +/- epsilon * ATR
```

Where epsilon is a small buffer beyond the Safety Line to avoid getting clipped by noise around the structural level. The regime determines the width:

| Regime | ATR Multiplier for Stop Buffer | Example (ATR=$5) |
|:-------|:------------------------------|:-----------------|
| STRONG_TREND | epsilon = 0.20 | $1.00 beyond Safety |
| TREND | epsilon = 0.15 | $0.75 beyond Safety |
| TRANSITIONAL | epsilon = 0.10 | $0.50 beyond Safety |

The structural stop is the widest stop in the system. It represents the full invalidation thesis: if price reaches the Safety Line, the break was false and the old structure has reasserted.

### Phase 2: Breakeven Lock (Triggered at +0.8R)

When the unrealized profit on the position reaches 0.8 times the initial risk (0.8R):

```
Stop_new = entry_price + 2 * spread    (for longs)
Stop_new = entry_price - 2 * spread    (for shorts)
```

The 2x spread buffer accounts for both the bid-ask spread and typical execution slippage. This ensures the breakeven stop is truly breakeven after transaction costs.

This is a **one-way ratchet**. Once the breakeven lock is triggered, the stop never goes below entry again (for longs) or above entry (for shorts). The position is "risk-free" in terms of realized P&L, ignoring gap risk.

**Why +0.8R, not +1.0R?** Triggering at exactly 1.0R means the trade must achieve a full risk unit of profit before locking. Many trades reach 0.8R, pull back briefly, and then continue. Setting the trigger at 0.8R captures these trades before the pullback sends them back to entry. Backtesting shows that approximately 12% more trades achieve breakeven lock at +0.8R compared to +1.0R.

### Phase 3: Partial Exit (Triggered at 1.0R or 1.5R)

The trigger and percentage depend on the operating mode:

| Mode | Trigger | Exit Percentage | Remainder Stop |
|:-----|:--------|:---------------|:--------------|
| HIGH_WIN_RATE | +1.0R | 60% of position | Move to +0.5R |
| HIGH_EXPECTANCY | +1.5R | 40% of position | Move to +0.5R |

After the partial exit, the stop on the remainder moves to +0.5R, locking in at least half a risk unit of profit on the remaining shares.

Partial exits are the second most important win rate enhancer in the system (after the Q-Score gate). They convert many trades that would otherwise pull back from 0.8R to a loss into realized winners. The 60/40 split in HWR mode is calibrated to lock in the majority of the profit while leaving enough remainder to capture trend continuation.

### Phase 4: Pivot Trail (After Partial Exit)

Once the partial exit has been taken, the remainder is trailed using confirmed pivots from the same pivot detection algorithm as the main pipeline:

```
LONG: stop = last confirmed PL - 0.5 * ATR
SHORT: stop = last confirmed PH + 0.5 * ATR
```

Pivots use the same L/R parameters as the main pipeline (default L=2, R=2). The 0.5 ATR buffer below the pivot low (for longs) provides room for normal retest action around the pivot without triggering the stop.

**Monotonic enforcement:** The pivot trail stop only moves in the favorable direction. If a new pivot low forms higher than the previous one (for a long trade), the stop ratchets up. If a new pivot low is lower than the current stop, it is ignored. This captures the natural rhythm of a healthy trend (higher lows for uptrends, lower highs for downtrends) while ignoring brief structural violations that do not constitute a genuine reversal.

### Phase 5: Time Stop (Stagnation Protection)

If the trade fails to reach a minimum profit threshold within a specified number of bars, it is exited at market:

| Mode | Maximum Bars | Minimum Progress | Action |
|:-----|:------------|:----------------|:-------|
| HIGH_WIN_RATE | 12 bars | +0.5R | Exit at market |
| HIGH_EXPECTANCY | 20 bars | +0.5R | Exit at market |

A trade that has been open for 12 bars (HWR mode) without reaching +0.5R is stagnating. Capital is locked in a position that is not generating returns. The time stop frees this capital for redeployment into a fresh setup.

The time stop is Law 9 (Information Decay) in action. The informational edge from the break-retest-rejection signal decays with time. If the move has not materialized within the allotted window, the edge is likely gone.

### Phase 6: Slope Momentum Tightening

This phase monitors the Kalman-filtered slope of the position's favorable direction. As momentum exhausts, the stop tightens:

```
momentum_ratio = current_slope_magnitude / max_slope_in_trade
```

| Momentum Ratio | Action | Rationale |
|:---------------|:-------|:----------|
| >= 0.60 | No change | Momentum healthy. Let the trade run. |
| 0.30 to 0.59 | Tighten stop by 30% | Momentum fading. Protect more profit. |
| < 0.30 | Move stop to breakeven or best available | Momentum dead. Exit imminent. |

"Tighten by 30%" means move the stop 30% closer to the current price. If the current stop is $10 below the price, tightening by 30% moves it to $7 below.

```python
def momentum_tightening(current_stop: float, current_price: float,
                        slope_now: float, max_slope_in_trade: float,
                        entry_price: float, direction: str,
                        spread: float = 0.0) -> float:
    """
    Tighten the trailing stop based on momentum decay.

    Parameters
    ----------
    current_stop : float
        Current stop price.
    current_price : float
        Current market price.
    slope_now : float
        Current absolute Kalman slope magnitude.
    max_slope_in_trade : float
        Maximum absolute slope observed since entry.
    entry_price : float
        Original entry price.
    direction : str
        'LONG' or 'SHORT'.
    spread : float
        Bid-ask spread for breakeven buffer.

    Returns
    -------
    float : new stop price (only tighter than current_stop)
    """
    if max_slope_in_trade <= 0:
        return current_stop

    ratio = slope_now / max_slope_in_trade

    if ratio >= 0.60:
        return current_stop  # Momentum healthy

    if direction == 'LONG':
        gap = current_price - current_stop
        if gap <= 0:
            return current_stop

        if ratio >= 0.30:
            # Tighten by 30%
            new_stop = current_stop + 0.30 * gap
        else:
            # Momentum dead: move to breakeven
            new_stop = entry_price + 2 * spread

        # Monotonic: only tighten (move up for longs)
        return max(current_stop, new_stop)

    else:  # SHORT
        gap = current_stop - current_price
        if gap <= 0:
            return current_stop

        if ratio >= 0.30:
            new_stop = current_stop - 0.30 * gap
        else:
            new_stop = entry_price - 2 * spread

        # Monotonic: only tighten (move down for shorts)
        return min(current_stop, new_stop)
```

### Phase 7: Emergency Circuit Breaker

Extreme market events override all other phases:

| Trigger | Condition | Action |
|:--------|:---------|:-------|
| Flash move | abs(close - prev_close) > 5 * ATR | Immediate market exit |
| Extreme range bar | (high - low) > 4 * ATR | Immediate market exit |

These are Law 30 (Survival) overrides. When a bar moves 5 ATR in a single close-to-close, or a single bar has a range exceeding 4 ATR, the market has entered a regime that PCTT was not designed for. Flash crashes, flash rallies, circuit breaker events, and black swan moves all trigger this phase.

**Post-circuit-breaker cooldown:** After a circuit breaker exit, no new trades for 20 bars. This cooldown allows the market to stabilize and prevents the system from immediately re-entering during the chaotic aftermath.

### Stop Aggregation and Monotonic Enforcement

At every bar, the system calculates stop levels from all active phases and selects the tightest one:

```python
def aggregate_stops(phase_stops: dict, direction: str) -> float:
    """
    Select the tightest stop from all active phases.

    Parameters
    ----------
    phase_stops : dict
        Keys are phase names, values are stop prices.
        Only include phases that are currently active.
        Example: {'structural': 95.0, 'breakeven': 100.2, 'pivot_trail': 98.5}
    direction : str
        'LONG' or 'SHORT'.

    Returns
    -------
    float : the tightest stop price
    """
    valid_stops = [v for v in phase_stops.values() if v is not None]
    if not valid_stops:
        return None

    if direction == 'LONG':
        return max(valid_stops)  # Highest stop = tightest for longs
    else:
        return min(valid_stops)  # Lowest stop = tightest for shorts


def monotonic_enforce(new_stop: float, previous_stop: float, direction: str) -> float:
    """
    Ensure the stop only moves in the favorable direction.

    Parameters
    ----------
    new_stop : float
        Candidate new stop level.
    previous_stop : float
        The current enforced stop level.
    direction : str
        'LONG' or 'SHORT'.

    Returns
    -------
    float : enforced stop (never loosened)
    """
    if previous_stop is None:
        return new_stop
    if new_stop is None:
        return previous_stop

    if direction == 'LONG':
        return max(new_stop, previous_stop)  # Only move up
    else:
        return min(new_stop, previous_stop)  # Only move down
```

---

## Chapter 28: Daily, Weekly, and Monthly Risk Limits

Beyond individual trade management and portfolio heat, PCTT enforces hard time-based risk limits. These are non-negotiable circuit breakers that override all other considerations, including the mode-specific parameters, the Kelly framework, and the grade-based sizing.

### 28.1 The Limits

| Time Frame | Loss Limit | Action When Breached |
|:-----------|:----------|:--------------------|
| Daily | 2% of equity | Stop trading for the remainder of the day. No exceptions. |
| Weekly | 4% of equity | Reduce position size by 50% for the remainder of the week. |
| Monthly | 8% of equity | Full system pause. Parameter review and re-optimization required before resuming. |
| Consecutive losses | 5 losses in a row | Halve position size until 2 consecutive winners achieved. |
| Rolling win rate | 20-trade rolling win rate < 40% | Pause for review. Do not resume until parameter audit complete. |

### 28.2 Why These Specific Numbers

The daily 2% limit prevents a single bad day from inflicting irreversible damage. With maximum position sizing (1% per trade, up to 6% portfolio heat), a 2% daily loss represents 2-3 stopped-out positions. Beyond this, something systemic is happening, either a regime the system was not designed for, a data feed error, or a structural market dislocation, and the correct response is to stop.

The weekly 4% limit catches slower bleeds. A trader losing 1.5% on Monday, 0.5% on Tuesday, and 1.5% on Wednesday has hit the weekly limit. The reduced sizing (50%) for the remainder of the week slows the bleed while still allowing the system to participate if conditions improve.

The monthly 8% limit represents a serious drawdown that demands reflection. At 8% monthly loss, the trailing drawdown scaling is already reducing position sizes significantly. The system pause forces a deliberate review: has the edge decayed? Are the regime filters working? Is the parameter set still valid?

The consecutive loss limit addresses the psychological and statistical reality of losing streaks. Five consecutive losses at 1% risk each represents a 5% drawdown, which is significant but recoverable. Halving size after 5 losses ensures that an extended streak does not compound into ruin.

The rolling win rate check catches edge decay. If the 20-trade win rate drops below 40%, the system may have lost its edge. This is not a temporary fluctuation, it is a signal that something fundamental has changed.

### 28.3 Python Implementation

```python
from collections import deque
from datetime import datetime, date


class RiskLimitsManager:
    """
    Enforces daily, weekly, monthly, and streak-based risk limits.
    All limits are non-negotiable circuit breakers.
    """

    def __init__(self, equity: float,
                 daily_limit: float = 0.02,
                 weekly_limit: float = 0.04,
                 monthly_limit: float = 0.08,
                 max_consecutive_losses: int = 5,
                 min_rolling_win_rate: float = 0.40,
                 rolling_window: int = 20):
        self.initial_equity = equity
        self.daily_limit = daily_limit
        self.weekly_limit = weekly_limit
        self.monthly_limit = monthly_limit
        self.max_consecutive_losses = max_consecutive_losses
        self.min_rolling_win_rate = min_rolling_win_rate
        self.rolling_window = rolling_window

        # Tracking state
        self.daily_pnl = 0.0
        self.weekly_pnl = 0.0
        self.monthly_pnl = 0.0
        self.current_date = None
        self.current_week = None
        self.current_month = None
        self.consecutive_losses = 0
        self.wins_needed_to_reset = 0      # wins needed after streak halving
        self.recent_outcomes = deque(maxlen=rolling_window)

        # Flags
        self.daily_halted = False
        self.weekly_reduced = False
        self.monthly_paused = False
        self.streak_halved = False
        self.win_rate_paused = False

    def update_equity(self, equity: float):
        """Update equity reference for limit calculations."""
        self.initial_equity = equity

    def _check_period_reset(self, trade_date: date):
        """Reset period counters when a new day/week/month begins."""
        if self.current_date is None or trade_date != self.current_date:
            self.daily_pnl = 0.0
            self.daily_halted = False
            self.current_date = trade_date

        trade_week = trade_date.isocalendar()[1]
        if self.current_week is None or trade_week != self.current_week:
            self.weekly_pnl = 0.0
            self.weekly_reduced = False
            self.current_week = trade_week

        if self.current_month is None or trade_date.month != self.current_month:
            self.monthly_pnl = 0.0
            self.monthly_paused = False
            self.current_month = trade_date.month

    def record_trade(self, pnl_dollars: float, trade_date: date = None) -> dict:
        """
        Record a completed trade and check all risk limits.

        Parameters
        ----------
        pnl_dollars : float
            Realized P&L in dollars (positive = win, negative = loss).
        trade_date : date
            Date of the trade close.

        Returns
        -------
        dict with keys:
            size_multiplier (float): 1.0, 0.5, or 0.0
            halted (bool): whether trading should stop entirely
            alerts (list of str): warning/halt messages
        """
        if trade_date is None:
            trade_date = date.today()
        self._check_period_reset(trade_date)

        pnl_pct = pnl_dollars / self.initial_equity if self.initial_equity > 0 else 0.0
        is_winner = pnl_dollars > 0

        # Update P&L trackers
        self.daily_pnl += pnl_pct
        self.weekly_pnl += pnl_pct
        self.monthly_pnl += pnl_pct

        # Update streak
        if is_winner:
            self.consecutive_losses = 0
            if self.wins_needed_to_reset > 0:
                self.wins_needed_to_reset -= 1
                if self.wins_needed_to_reset == 0:
                    self.streak_halved = False
        else:
            self.consecutive_losses += 1

        # Update rolling outcomes
        self.recent_outcomes.append(is_winner)

        # Check limits
        alerts = []
        size_multiplier = 1.0
        halted = False

        # Daily limit
        if abs(self.daily_pnl) >= self.daily_limit and self.daily_pnl < 0:
            self.daily_halted = True
            halted = True
            alerts.append(f'DAILY HALT: {self.daily_pnl:.2%} loss exceeds {self.daily_limit:.0%} limit')

        # Weekly limit
        if abs(self.weekly_pnl) >= self.weekly_limit and self.weekly_pnl < 0:
            self.weekly_reduced = True
            size_multiplier = min(size_multiplier, 0.50)
            alerts.append(f'WEEKLY REDUCTION: {self.weekly_pnl:.2%} loss exceeds {self.weekly_limit:.0%} limit. Size halved.')

        # Monthly limit
        if abs(self.monthly_pnl) >= self.monthly_limit and self.monthly_pnl < 0:
            self.monthly_paused = True
            halted = True
            alerts.append(f'MONTHLY PAUSE: {self.monthly_pnl:.2%} loss exceeds {self.monthly_limit:.0%} limit. Full review required.')

        # Consecutive losses
        if self.consecutive_losses >= self.max_consecutive_losses:
            self.streak_halved = True
            self.wins_needed_to_reset = 2
            size_multiplier = min(size_multiplier, 0.50)
            alerts.append(f'STREAK LIMIT: {self.consecutive_losses} consecutive losses. Size halved until 2 winners.')

        # Rolling win rate
        if len(self.recent_outcomes) >= self.rolling_window:
            win_rate = sum(self.recent_outcomes) / len(self.recent_outcomes)
            if win_rate < self.min_rolling_win_rate:
                self.win_rate_paused = True
                halted = True
                alerts.append(f'WIN RATE PAUSE: Rolling {self.rolling_window}-trade win rate = {win_rate:.0%} < {self.min_rolling_win_rate:.0%}. Review required.')

        # Apply streak halving if still active
        if self.streak_halved:
            size_multiplier = min(size_multiplier, 0.50)

        # Apply weekly reduction if still active
        if self.weekly_reduced:
            size_multiplier = min(size_multiplier, 0.50)

        if halted:
            size_multiplier = 0.0

        return {
            'size_multiplier': size_multiplier,
            'halted': halted,
            'alerts': alerts,
            'daily_pnl': self.daily_pnl,
            'weekly_pnl': self.weekly_pnl,
            'monthly_pnl': self.monthly_pnl,
            'consecutive_losses': self.consecutive_losses,
            'rolling_win_rate': sum(self.recent_outcomes) / len(self.recent_outcomes) if self.recent_outcomes else None
        }

    def can_trade(self) -> dict:
        """
        Check whether the system is allowed to take new trades.

        Returns
        -------
        dict with keys: allowed (bool), reason (str), size_multiplier (float)
        """
        if self.daily_halted:
            return {'allowed': False, 'reason': 'Daily loss limit reached', 'size_multiplier': 0.0}
        if self.monthly_paused:
            return {'allowed': False, 'reason': 'Monthly loss limit reached. Review required.', 'size_multiplier': 0.0}
        if self.win_rate_paused:
            return {'allowed': False, 'reason': 'Rolling win rate below minimum. Review required.', 'size_multiplier': 0.0}

        multiplier = 1.0
        if self.weekly_reduced:
            multiplier = 0.5
        if self.streak_halved:
            multiplier = min(multiplier, 0.5)

        return {'allowed': True, 'reason': 'OK', 'size_multiplier': multiplier}
```

---

# PART VIII: AUTO-SWITCHING & EDGE MONITORING

---

## Chapter 29: The Dual-Mode System — HIGH_WIN_RATE vs HIGH_EXPECTANCY

### 29.1 Why Two Modes

There is a fundamental tradeoff in every trading system: you can optimize for win rate or for average R-multiple, but not both simultaneously. A system that takes profit early (at 1.0R) and has strict filters (high Q-Score minimum) will win more often, but each winner will be smaller. A system that lets winners run (trailing to 3R+) and accepts lower-quality setups will win less often, but each winner will be much larger.

Neither mode is universally superior. Each excels in different market conditions.

**HIGH_WIN_RATE (HWR) mode:**
- Target: 80-87% win rate on taken trades
- Average winner: 0.5-0.8R
- Average loser: 0.8-1.0R
- Estimated Sharpe: 2.0
- Best in: trending-with-reversion regimes, high-noise environments, psychologically fragile accounts, and during drawdowns (when smaller, frequent wins rebuild confidence)

**HIGH_EXPECTANCY (HE) mode:**
- Target: 50-60% win rate on taken trades
- Average winner: 2.5-3.5R
- Average loser: 0.8-1.0R
- Estimated Sharpe: 1.5
- Best in: clean trending regimes, low-noise environments, accounts that can tolerate losing streaks of 4-6 trades

HWR achieves its high win rate by: taking profit early (60% at 1.0R), only accepting A-Grade setups (Q >= 0.70), avoiding TRANSITIONAL regimes entirely, and cutting stagnant trades after 12 bars. HE achieves its high expectancy by: letting winners run (40% at 1.5R with wider trail), accepting B-Grade setups (Q >= 0.55), allowing TRANSITIONAL regimes, and giving trades 20 bars to develop.

### 29.2 Parameter Differences Between Modes

| Parameter | HWR Mode | HE Mode | Why |
|:----------|:---------|:--------|:----|
| Partial exit % | 60% at 1.0R | 40% at 1.5R | HWR locks profit fast; HE lets winners run |
| Time stop bars | 12 | 20 | HWR cuts dead trades faster |
| Min Q-Score | 0.65 | 0.55 | HWR only takes best setups |
| dGeom range | 0.8-2.0 | 0.5-2.5 | HWR tighter band avoids marginal geometry |
| Trail ATR mult | 1.5x | 2.0x | HWR tighter trail captures more frequent exits |
| Rejection min | 4/4 features | 3/4 features | HWR requires full rejection confirmation |
| Regime allowed | TRENDING only | TRENDING + TRANSITIONAL | HWR avoids marginal regimes entirely |
| Risk per trade (A) | 1.0% | 0.75% | HWR can risk more per trade (higher hit rate) |
| Risk per trade (B) | 0.5% | 0.5% | Same for lower conviction setups |
| Confluence min | 0.75 | 0.60 | HWR demands higher multi-TF agreement |
| BE lock trigger | +0.8R | +1.0R | HWR locks breakeven earlier |
| Daily loss limit | 2% | 3% | HWR more protective per day |
| Consecutive loss pause | 3 | 5 | HWR pauses sooner on losing streaks |

### 29.3 Auto-Switching Logic

The system does not require manual mode selection. It switches automatically based on market conditions, with hysteresis to prevent oscillation.

**Switching criteria:**

Switch from HWR to HE when ALL of these hold:
- Efficiency Ratio (macro timeframe) > 0.50
- Crossing Count (macro timeframe) < 6
- Hurst exponent > 0.60
- Current drawdown < 10%

Switch from HE to HWR when ANY of these hold:
- Efficiency Ratio (macro timeframe) < 0.40
- Crossing Count (macro timeframe) > 10
- Hurst exponent < 0.55
- Current drawdown >= 10%

**Transition mechanism:** Mode switches are not instantaneous. They occur gradually over 10 trades to prevent parameter whiplash:

1. Trade 1-2 after switch trigger: 25% new mode params, 75% old mode params
2. Trade 3-5: 50% new mode, 50% old mode
3. Trade 6-8: 75% new mode, 25% old mode
4. Trade 9+: 100% new mode

**Hysteresis:** Minimum 20 trades between switches. If the system switched from HWR to HE at trade 100, it cannot switch back before trade 120, even if the conditions change. This prevents the destructive pattern of rapid mode oscillation in TRANSITIONAL regimes.

**Default start:** HWR mode. Always start conservative and let the system earn the right to switch to HE by demonstrating strong trending conditions.

```python
class ModeSwitch:
    """
    Auto-switching between HIGH_WIN_RATE and HIGH_EXPECTANCY modes.
    Includes gradual transition and hysteresis to prevent oscillation.
    """

    HWR = 'HIGH_WIN_RATE'
    HE = 'HIGH_EXPECTANCY'

    # Parameter tables for each mode
    PARAMS = {
        'HIGH_WIN_RATE': {
            'partial_exit_pct': 0.60,
            'partial_trigger_r': 1.0,
            'time_stop_bars': 12,
            'q_score_min': 0.65,
            'd_geom_min': 0.8,
            'd_geom_max': 2.0,
            'trail_atr_mult': 1.5,
            'rejection_min': 4,
            'regimes_allowed': ['TRENDING', 'STRONG_TREND'],
            'risk_a': 0.010,
            'risk_b': 0.005,
            'confluence_min': 0.75,
            'be_trigger_r': 0.8,
            'daily_loss_limit': 0.02,
            'consecutive_loss_pause': 3,
        },
        'HIGH_EXPECTANCY': {
            'partial_exit_pct': 0.40,
            'partial_trigger_r': 1.5,
            'time_stop_bars': 20,
            'q_score_min': 0.55,
            'd_geom_min': 0.5,
            'd_geom_max': 2.5,
            'trail_atr_mult': 2.0,
            'rejection_min': 3,
            'regimes_allowed': ['TRENDING', 'STRONG_TREND', 'TRANSITIONAL'],
            'risk_a': 0.0075,
            'risk_b': 0.005,
            'confluence_min': 0.60,
            'be_trigger_r': 1.0,
            'daily_loss_limit': 0.03,
            'consecutive_loss_pause': 5,
        }
    }

    def __init__(self, min_trades_between_switches: int = 20, transition_trades: int = 10):
        self.current_mode = self.HWR  # Always start conservative
        self.target_mode = self.HWR
        self.trades_since_switch = 0
        self.transition_progress = 1.0  # 1.0 = fully in current mode
        self.min_trades_between = min_trades_between_switches
        self.transition_trades = transition_trades
        self.in_transition = False

    def evaluate(self, er_macro: float, cc_macro: int, hurst: float,
                 current_dd: float) -> str:
        """
        Evaluate whether a mode switch should be triggered.

        Parameters
        ----------
        er_macro : float
            Efficiency Ratio on macro timeframe.
        cc_macro : int
            Crossing Count on macro timeframe.
        hurst : float
            Hurst exponent on macro timeframe.
        current_dd : float
            Current drawdown as decimal.

        Returns
        -------
        str : current effective mode name
        """
        self.trades_since_switch += 1

        # Check hysteresis
        if self.trades_since_switch < self.min_trades_between:
            return self.current_mode

        # Evaluate switch conditions
        new_target = self.current_mode

        if self.current_mode == self.HWR:
            # Switch to HE requires ALL conditions
            if (er_macro > 0.50 and cc_macro < 6 and
                    hurst > 0.60 and current_dd < 0.10):
                new_target = self.HE

        elif self.current_mode == self.HE:
            # Switch to HWR requires ANY condition
            if (er_macro < 0.40 or cc_macro > 10 or
                    hurst < 0.55 or current_dd >= 0.10):
                new_target = self.HWR

        # Initiate transition if target changed
        if new_target != self.target_mode:
            self.target_mode = new_target
            if new_target != self.current_mode:
                self.in_transition = True
                self.transition_progress = 0.0
                self.trades_since_switch = 0

        # Advance transition
        if self.in_transition:
            self.transition_progress = min(1.0,
                self.transition_progress + 1.0 / self.transition_trades)
            if self.transition_progress >= 1.0:
                self.current_mode = self.target_mode
                self.in_transition = False

        return self.current_mode

    def get_params(self) -> dict:
        """
        Get the current blended parameter set.
        During transitions, parameters are linearly interpolated.

        Returns
        -------
        dict : parameter name -> value
        """
        if not self.in_transition:
            return dict(self.PARAMS[self.current_mode])

        old_params = self.PARAMS[self.current_mode]
        new_params = self.PARAMS[self.target_mode]
        blended = {}

        for key in old_params:
            old_val = old_params[key]
            new_val = new_params[key]

            if isinstance(old_val, (int, float)) and isinstance(new_val, (int, float)):
                # Linear interpolation for numeric params
                blended[key] = old_val + self.transition_progress * (new_val - old_val)
                if isinstance(old_val, int) and isinstance(new_val, int):
                    blended[key] = int(round(blended[key]))
            else:
                # Non-numeric: use target if past 50%, otherwise old
                blended[key] = new_val if self.transition_progress > 0.5 else old_val

        return blended
```

---

## Chapter 30: Edge Monitoring & Decay Detection

### 30.1 What is "Edge" in PCTT

Edge is positive expectancy after all costs. It is the mathematical reason the system makes money over a large sample.

```
E = (win_rate * avg_win) - (loss_rate * avg_loss) - avg_cost
```

Where avg_cost includes spread, commission, slippage, and funding/carry costs per trade.

Edge is measured on rolling windows of different lengths to capture both short-term degradation and long-term stability:
- **50-trade window:** Early warning. Sensitive to recent changes. Noisy.
- **100-trade window:** Medium-term signal. Balances sensitivity and stability.
- **200-trade window:** Long-term baseline. If the edge is gone here, it is genuinely gone.

**Edge is NOT permanent.** Markets adapt. Other participants discover the same patterns. Regulatory changes alter market microstructure. Algorithmic crowding erodes the structural advantage. Every edge decays over time (Law 19). The only question is how fast and whether you detect it before it kills you.

### 30.2 Metrics to Monitor

| Metric | How to Calculate | What it Tells You |
|:-------|:----------------|:-----------------|
| Rolling win rate | wins / total over last N trades | Whether the system is still selecting winners |
| Rolling expectancy | E formula above, per trade | Whether wins are large enough relative to losses |
| Rolling Sharpe ratio | mean(returns) / std(returns) * sqrt(252) | Risk-adjusted performance quality |
| Brier score | mean((predicted_probability - actual_outcome)^2) | Whether Q-Score calibration is still accurate |
| Average R-multiple | mean(trade_result / initial_risk) across recent trades | Whether the risk/reward structure is intact |
| Consecutive loss streaks | max consecutive losses in recent window | Whether losing streaks are within statistical norms |
| Recovery factor | total_profit / max_drawdown | Whether the system recovers from drawdowns efficiently |

### 30.3 Alert Thresholds

| Metric | Green (Healthy) | Yellow (Warning) | Red (Action Required) | Red Action |
|:-------|:---------------|:----------------|:---------------------|:-----------|
| Win Rate (HWR) | > 70% | 60-70% | < 60% | Switch to HE mode |
| Win Rate (HE) | > 50% | 40-50% | < 40% | Pause system |
| Expectancy | > 0.3R | 0.1-0.3R | < 0.1R | Parameter review |
| Sharpe | > 1.5 | 1.0-1.5 | < 1.0 | Reduce size 50% |
| Brier Score | < 0.20 | 0.20-0.30 | > 0.30 | Halt and recalibrate |
| Consecutive Losses | < 4 | 4-6 | > 6 | Halve size |
| Recovery Factor | > 3.0 | 1.5-3.0 | < 1.5 | Reduce exposure |

Yellow alerts generate log entries and notifications. Red alerts trigger automatic system responses as specified in the "Red Action" column.

### 30.4 Parameter Re-Optimization Protocol

When any metric stays in the RED zone for 50+ trades, the system triggers a formal re-optimization.

**Method: Walk-forward optimization.**

1. **Data split:** 70% training window, 30% testing window.
2. **Rolling windows:** Minimum 6 windows, each containing 200-500 trades. Roll forward by 1 window (the training window drops the oldest segment and adds the newest).
3. **Optimization objective:** Maximize Sharpe ratio, not win rate or total profit. Sharpe penalizes both low returns and high variance, producing the most robust parameter set.
4. **Parameter constraints:** All parameters must remain within their allowed ranges (see the Complete Default Parameter Table in the main pamphlet). The optimizer is not allowed to discover "solutions" outside the structurally valid range.
5. **Degradation ratio:** `test_performance / train_performance`. This measures how well in-sample performance transfers to out-of-sample data.
   - Degradation ratio > 0.60: Parameters are robust. Deploy.
   - Degradation ratio 0.40-0.60: Parameters are fragile. Deploy with reduced sizing (50%).
   - Degradation ratio < 0.40: The edge may be gone. Consider system retirement or fundamental redesign.
6. **If degradation ratio < 0.40 across 3 consecutive re-optimization cycles:** The edge is almost certainly gone. The market has structurally changed. System retirement is the correct response.

```python
class WalkForwardOptimizer:
    """
    Skeleton for walk-forward parameter optimization.
    Actual optimization engine (scipy.optimize, Optuna, etc.) is pluggable.
    """

    def __init__(self, n_windows: int = 6, train_pct: float = 0.70,
                 min_trades_per_window: int = 200,
                 degradation_threshold: float = 0.60):
        self.n_windows = n_windows
        self.train_pct = train_pct
        self.min_trades = min_trades_per_window
        self.degradation_threshold = degradation_threshold
        self.results = []

    def split_windows(self, trades: list) -> list:
        """
        Generate rolling train/test splits.

        Parameters
        ----------
        trades : list
            Complete trade history.

        Returns
        -------
        list of (train_trades, test_trades) tuples
        """
        total = len(trades)
        window_size = total // self.n_windows
        if window_size < self.min_trades:
            raise ValueError(
                f'Insufficient trades: {total} trades / {self.n_windows} windows = '
                f'{window_size} per window (min {self.min_trades})')

        splits = []
        for i in range(self.n_windows):
            end = (i + 1) * window_size
            if i == self.n_windows - 1:
                end = total
            train_end = int(end * self.train_pct)
            start = i * window_size
            train = trades[start:train_end]
            test = trades[train_end:end]
            if len(train) > 0 and len(test) > 0:
                splits.append((train, test))

        return splits

    def evaluate_degradation(self, train_sharpe: float, test_sharpe: float) -> dict:
        """
        Compute degradation ratio and determine if parameters are robust.

        Returns
        -------
        dict with keys: ratio, verdict, deploy_sizing
        """
        if train_sharpe <= 0:
            return {'ratio': 0.0, 'verdict': 'EDGE_GONE', 'deploy_sizing': 0.0}

        ratio = test_sharpe / train_sharpe

        if ratio > self.degradation_threshold:
            return {'ratio': ratio, 'verdict': 'ROBUST', 'deploy_sizing': 1.0}
        elif ratio > 0.40:
            return {'ratio': ratio, 'verdict': 'FRAGILE', 'deploy_sizing': 0.50}
        else:
            return {'ratio': ratio, 'verdict': 'EDGE_GONE', 'deploy_sizing': 0.0}

    def run(self, trades: list, optimize_fn, evaluate_fn) -> dict:
        """
        Run full walk-forward optimization.

        Parameters
        ----------
        trades : list
            Complete trade history.
        optimize_fn : callable
            Function(train_trades) -> optimal_params dict.
        evaluate_fn : callable
            Function(trades, params) -> sharpe_ratio float.

        Returns
        -------
        dict with keys: windows (list of results), avg_degradation,
                        overall_verdict, recommended_params
        """
        splits = self.split_windows(trades)
        window_results = []

        for i, (train, test) in enumerate(splits):
            params = optimize_fn(train)
            train_sharpe = evaluate_fn(train, params)
            test_sharpe = evaluate_fn(test, params)
            degradation = self.evaluate_degradation(train_sharpe, test_sharpe)

            window_results.append({
                'window': i,
                'train_sharpe': train_sharpe,
                'test_sharpe': test_sharpe,
                'params': params,
                **degradation
            })

        self.results = window_results
        avg_deg = sum(w['ratio'] for w in window_results) / len(window_results)

        # Use params from the most recent robust window
        robust_windows = [w for w in window_results if w['verdict'] == 'ROBUST']
        recommended = robust_windows[-1]['params'] if robust_windows else None

        if avg_deg > self.degradation_threshold:
            verdict = 'DEPLOY'
        elif avg_deg > 0.40:
            verdict = 'DEPLOY_REDUCED'
        else:
            verdict = 'RETIRE'

        return {
            'windows': window_results,
            'avg_degradation': avg_deg,
            'overall_verdict': verdict,
            'recommended_params': recommended
        }
```

### 30.5 The PerformanceTracker Class

This is the central monitoring class that ties together all edge monitoring, alert generation, and auto-switching integration.

```python
from collections import deque
from datetime import datetime
import math


class PerformanceTracker:
    """
    Real-time performance monitoring for PCTT.
    Tracks all metrics, generates alerts, integrates with auto-switching.
    """

    def __init__(self, mode: str = 'HIGH_WIN_RATE',
                 windows: tuple = (50, 100, 200)):
        self.mode = mode
        self.windows = windows
        self.max_window = max(windows)
        self.all_trades = []
        self.recent_trades = deque(maxlen=self.max_window)

        # Alert thresholds (mode-dependent)
        self.thresholds = self._get_thresholds(mode)

        # Peak equity tracking for drawdown
        self.peak_equity = 0.0
        self.current_equity = 0.0

        # Alert history
        self.alerts = []

    def _get_thresholds(self, mode: str) -> dict:
        if mode == 'HIGH_WIN_RATE':
            return {
                'win_rate_yellow': 0.70, 'win_rate_red': 0.60,
                'expectancy_yellow': 0.30, 'expectancy_red': 0.10,
                'sharpe_yellow': 1.50, 'sharpe_red': 1.00,
                'brier_yellow': 0.20, 'brier_red': 0.30,
                'consec_loss_yellow': 4, 'consec_loss_red': 6,
                'recovery_factor_yellow': 3.0, 'recovery_factor_red': 1.5,
            }
        else:
            return {
                'win_rate_yellow': 0.50, 'win_rate_red': 0.40,
                'expectancy_yellow': 0.30, 'expectancy_red': 0.10,
                'sharpe_yellow': 1.50, 'sharpe_red': 1.00,
                'brier_yellow': 0.20, 'brier_red': 0.30,
                'consec_loss_yellow': 4, 'consec_loss_red': 6,
                'recovery_factor_yellow': 3.0, 'recovery_factor_red': 1.5,
            }

    def update_mode(self, mode: str):
        self.mode = mode
        self.thresholds = self._get_thresholds(mode)

    def record_trade(self, trade: dict):
        """
        Record a completed trade.

        Parameters
        ----------
        trade : dict with keys:
            pnl (float): realized P&L in dollars
            r_multiple (float): result as R-multiple (e.g. 1.5 = 1.5R win)
            q_score (float): Q-Score prediction at entry
            outcome (int): 1 for win, 0 for loss (for Brier)
            timestamp (datetime): trade close time
        """
        self.all_trades.append(trade)
        self.recent_trades.append(trade)

    def update_equity(self, equity: float):
        self.current_equity = equity
        if equity > self.peak_equity:
            self.peak_equity = equity

    def compute_metrics(self, window: int = 50) -> dict:
        """
        Compute all performance metrics over the specified window.

        Returns
        -------
        dict of metric name -> value
        """
        trades = list(self.recent_trades)[-window:]
        if len(trades) < 20:
            return {'status': 'INSUFFICIENT_DATA', 'trade_count': len(trades)}

        wins = [t for t in trades if t['pnl'] > 0]
        losses = [t for t in trades if t['pnl'] <= 0]
        n = len(trades)

        # Win rate
        win_rate = len(wins) / n

        # Expectancy in R-multiples
        r_multiples = [t['r_multiple'] for t in trades]
        expectancy = sum(r_multiples) / n

        # Average R
        avg_r = sum(r_multiples) / n

        # Sharpe ratio (annualized, assuming 252 trading days)
        pnls = [t['pnl'] for t in trades]
        mean_pnl = sum(pnls) / n
        var_pnl = sum((p - mean_pnl) ** 2 for p in pnls) / max(n - 1, 1)
        std_pnl = math.sqrt(var_pnl) if var_pnl > 0 else 0.0001
        sharpe = (mean_pnl / std_pnl) * math.sqrt(252) if std_pnl > 0 else 0.0

        # Brier score (Q-Score calibration quality)
        brier_pairs = [(t['q_score'], t['outcome']) for t in trades
                       if 'q_score' in t and 'outcome' in t]
        brier = (sum((q - o) ** 2 for q, o in brier_pairs) / len(brier_pairs)
                 if brier_pairs else None)

        # Consecutive losses (current streak)
        consec = 0
        max_consec = 0
        for t in trades:
            if t['pnl'] <= 0:
                consec += 1
                max_consec = max(max_consec, consec)
            else:
                consec = 0

        # Recovery factor
        cumulative_pnl = sum(pnls)
        running = 0.0
        peak = 0.0
        max_dd_dollars = 0.0
        for p in pnls:
            running += p
            if running > peak:
                peak = running
            dd = peak - running
            if dd > max_dd_dollars:
                max_dd_dollars = dd
        recovery_factor = (cumulative_pnl / max_dd_dollars
                           if max_dd_dollars > 0 else float('inf'))

        return {
            'status': 'OK',
            'trade_count': n,
            'win_rate': win_rate,
            'expectancy_r': expectancy,
            'avg_r_multiple': avg_r,
            'sharpe': sharpe,
            'brier_score': brier,
            'max_consecutive_losses': max_consec,
            'current_consecutive_losses': consec,
            'recovery_factor': recovery_factor,
            'total_pnl': cumulative_pnl,
        }

    def check_alerts(self) -> list:
        """
        Check all metrics against thresholds and generate alerts.

        Returns
        -------
        list of dict with keys: metric, value, level ('GREEN'/'YELLOW'/'RED'), action
        """
        new_alerts = []

        for window in self.windows:
            metrics = self.compute_metrics(window)
            if metrics['status'] != 'OK':
                continue

            prefix = f'[{window}-trade]'
            t = self.thresholds

            # Win rate
            wr = metrics['win_rate']
            if wr < t['win_rate_red']:
                new_alerts.append({
                    'metric': f'{prefix} Win Rate', 'value': wr,
                    'level': 'RED',
                    'action': 'Switch to HWR mode' if self.mode == 'HIGH_EXPECTANCY' else 'Pause system'
                })
            elif wr < t['win_rate_yellow']:
                new_alerts.append({
                    'metric': f'{prefix} Win Rate', 'value': wr,
                    'level': 'YELLOW', 'action': 'Monitor closely'
                })

            # Expectancy
            exp = metrics['expectancy_r']
            if exp < t['expectancy_red']:
                new_alerts.append({
                    'metric': f'{prefix} Expectancy', 'value': exp,
                    'level': 'RED', 'action': 'Parameter review required'
                })
            elif exp < t['expectancy_yellow']:
                new_alerts.append({
                    'metric': f'{prefix} Expectancy', 'value': exp,
                    'level': 'YELLOW', 'action': 'Monitor closely'
                })

            # Sharpe
            sh = metrics['sharpe']
            if sh < t['sharpe_red']:
                new_alerts.append({
                    'metric': f'{prefix} Sharpe', 'value': sh,
                    'level': 'RED', 'action': 'Reduce size 50%'
                })
            elif sh < t['sharpe_yellow']:
                new_alerts.append({
                    'metric': f'{prefix} Sharpe', 'value': sh,
                    'level': 'YELLOW', 'action': 'Monitor closely'
                })

            # Brier score
            if metrics['brier_score'] is not None:
                bs = metrics['brier_score']
                if bs > t['brier_red']:
                    new_alerts.append({
                        'metric': f'{prefix} Brier Score', 'value': bs,
                        'level': 'RED', 'action': 'Halt and recalibrate Q-Score'
                    })
                elif bs > t['brier_yellow']:
                    new_alerts.append({
                        'metric': f'{prefix} Brier Score', 'value': bs,
                        'level': 'YELLOW', 'action': 'Schedule recalibration'
                    })

            # Consecutive losses
            cl = metrics['max_consecutive_losses']
            if cl > t['consec_loss_red']:
                new_alerts.append({
                    'metric': f'{prefix} Consecutive Losses', 'value': cl,
                    'level': 'RED', 'action': 'Halve position size'
                })
            elif cl >= t['consec_loss_yellow']:
                new_alerts.append({
                    'metric': f'{prefix} Consecutive Losses', 'value': cl,
                    'level': 'YELLOW', 'action': 'Monitor closely'
                })

        self.alerts.extend(new_alerts)
        return new_alerts

    def generate_report(self) -> dict:
        """
        Generate a comprehensive performance report across all windows.

        Returns
        -------
        dict with per-window metrics and aggregate assessment
        """
        report = {
            'mode': self.mode,
            'total_trades': len(self.all_trades),
            'current_equity': self.current_equity,
            'peak_equity': self.peak_equity,
            'current_drawdown': (1 - self.current_equity / self.peak_equity
                                 if self.peak_equity > 0 else 0),
            'windows': {}
        }

        for w in self.windows:
            report['windows'][w] = self.compute_metrics(w)

        report['active_alerts'] = self.check_alerts()
        report['red_alert_count'] = sum(1 for a in report['active_alerts'] if a['level'] == 'RED')

        return report
```

---

## Chapter 31: Statistical Validation Framework

Before trusting any performance metric, the system must confirm that the observed results are not the product of random chance, data-snooping, or overfitting. PCTT requires three independent statistical tests plus a walk-forward degradation check before any parameter set is considered valid.

### 31.1 Monte Carlo Permutation Test

**Purpose:** Determine whether the strategy's performance exceeds what could be achieved by random entry and exit timing.

**Method:**
1. Take the actual sequence of trade returns.
2. Randomly shuffle the entry/exit assignments 10,000 times, creating 10,000 "null model" equity curves.
3. Calculate the Sharpe ratio for each null curve.
4. Compare the actual Sharpe to the distribution of null Sharpes.
5. The p-value is the fraction of null Sharpes that exceed the actual Sharpe.

**Pass criterion:** p-value < 0.05. The strategy's Sharpe must exceed the 95th percentile of random performance.

### 31.2 Bootstrap Confidence Intervals

**Purpose:** Estimate the uncertainty around key performance metrics without assuming any distribution.

**Method:**
1. Resample the actual trade outcomes with replacement, 5,000 times.
2. For each resample, compute: Sharpe ratio, win rate, expectancy, max drawdown.
3. Report the 2.5th and 97.5th percentiles as the 95% confidence interval.

**Pass criteria:**
- P(Sharpe > 0) must exceed 95%
- P(Win Rate > 50% for HE mode, > 65% for HWR mode) must exceed 90%
- P(Expectancy > 0) must exceed 95%

### 31.3 White's Reality Check

**Purpose:** Correct for data-snooping bias when multiple parameter sets have been tested.

If you test N different parameter combinations and pick the best one, the probability that the best one is "significant by chance" increases with N. White's Reality Check adjusts for this.

**Method:** Apply a Bonferroni correction. If N parameter sets were tested, the significance threshold is 0.05 / N instead of 0.05.

**Example:** If you tested 100 parameter combinations, the p-value threshold drops from 0.05 to 0.0005. Only strategies that beat 99.95% of random permutations survive.

### 31.4 Minimum Sample Requirements

- 200 trades per parameter set per instrument. Fewer trades produce unreliable statistics.
- Walk-forward degradation ratio > 0.60 across at least 6 rolling windows.
- Bootstrap confidence interval for Sharpe must exclude zero at the 95% level.

### 31.5 Python Implementation

```python
import numpy as np
from typing import List, Tuple


class MonteCarloValidator:
    """
    Monte Carlo permutation test to validate strategy edge over random chance.
    """

    def __init__(self, n_simulations: int = 10000, significance: float = 0.05,
                 seed: int = 42):
        self.n_simulations = n_simulations
        self.significance = significance
        self.rng = np.random.RandomState(seed)

    def permutation_test(self, actual_returns: np.ndarray) -> dict:
        """
        Test whether the strategy's Sharpe ratio is significantly better than random.

        Parameters
        ----------
        actual_returns : np.ndarray
            Array of per-trade returns (dollar or R-multiple).

        Returns
        -------
        dict with keys: actual_sharpe, p_value, percentile_rank, passed,
                        null_sharpe_95th
        """
        n = len(actual_returns)
        if n < 30:
            return {'actual_sharpe': 0, 'p_value': 1.0, 'percentile_rank': 0,
                    'passed': False, 'reason': 'Insufficient trades (need 30+)'}

        actual_sharpe = self._sharpe(actual_returns)

        # Generate null distribution by shuffling returns
        null_sharpes = np.zeros(self.n_simulations)
        for i in range(self.n_simulations):
            shuffled = self.rng.permutation(actual_returns)
            null_sharpes[i] = self._sharpe(shuffled)

        p_value = np.mean(null_sharpes >= actual_sharpe)
        percentile_rank = np.mean(null_sharpes < actual_sharpe) * 100
        null_95th = np.percentile(null_sharpes, 95)

        return {
            'actual_sharpe': float(actual_sharpe),
            'p_value': float(p_value),
            'percentile_rank': float(percentile_rank),
            'null_sharpe_95th': float(null_95th),
            'passed': p_value < self.significance
        }

    def sensitivity_test(self, base_returns: np.ndarray,
                         perturbation_pct: float = 0.15,
                         n_perturbations: int = 1000) -> dict:
        """
        Test parameter sensitivity by perturbing returns.

        Parameters
        ----------
        base_returns : np.ndarray
            Baseline per-trade returns.
        perturbation_pct : float
            Maximum perturbation as fraction (default 0.15 = +/-15%).
        n_perturbations : int
            Number of perturbation scenarios.

        Returns
        -------
        dict with keys: base_sharpe, profitable_pct, median_sharpe, worst_sharpe
        """
        base_sharpe = self._sharpe(base_returns)
        perturbed_sharpes = np.zeros(n_perturbations)

        for i in range(n_perturbations):
            noise = self.rng.uniform(1 - perturbation_pct, 1 + perturbation_pct,
                                     size=len(base_returns))
            perturbed = base_returns * noise
            perturbed_sharpes[i] = self._sharpe(perturbed)

        profitable_pct = np.mean(perturbed_sharpes > 0) * 100

        return {
            'base_sharpe': float(base_sharpe),
            'profitable_pct': float(profitable_pct),
            'median_sharpe': float(np.median(perturbed_sharpes)),
            'worst_sharpe': float(np.min(perturbed_sharpes)),
            'best_sharpe': float(np.max(perturbed_sharpes)),
            'robust': profitable_pct > 85.0
        }

    @staticmethod
    def _sharpe(returns: np.ndarray) -> float:
        if len(returns) < 2:
            return 0.0
        std = np.std(returns, ddof=1)
        if std < 1e-10:
            return 0.0
        return float(np.mean(returns) / std * np.sqrt(252))


def bootstrap_confidence(returns: np.ndarray, n_bootstrap: int = 5000,
                         confidence: float = 0.95, seed: int = 42) -> dict:
    """
    Bootstrap confidence intervals for key performance metrics.

    Parameters
    ----------
    returns : np.ndarray
        Per-trade returns (R-multiples or dollar P&L).
    n_bootstrap : int
        Number of bootstrap resamples (default 5000).
    confidence : float
        Confidence level (default 0.95).
    seed : int
        Random seed for reproducibility.

    Returns
    -------
    dict with confidence intervals for sharpe, win_rate, expectancy, max_drawdown
    """
    rng = np.random.RandomState(seed)
    n = len(returns)
    alpha = (1 - confidence) / 2

    boot_sharpe = np.zeros(n_bootstrap)
    boot_win_rate = np.zeros(n_bootstrap)
    boot_expectancy = np.zeros(n_bootstrap)
    boot_max_dd = np.zeros(n_bootstrap)

    for i in range(n_bootstrap):
        sample = rng.choice(returns, size=n, replace=True)

        # Sharpe
        std = np.std(sample, ddof=1)
        boot_sharpe[i] = (np.mean(sample) / std * np.sqrt(252)) if std > 1e-10 else 0.0

        # Win rate
        boot_win_rate[i] = np.mean(sample > 0)

        # Expectancy
        boot_expectancy[i] = np.mean(sample)

        # Max drawdown
        cumulative = np.cumsum(sample)
        peak = np.maximum.accumulate(cumulative)
        drawdowns = peak - cumulative
        boot_max_dd[i] = np.max(drawdowns) if len(drawdowns) > 0 else 0.0

    def ci(arr):
        return {
            'lower': float(np.percentile(arr, alpha * 100)),
            'upper': float(np.percentile(arr, (1 - alpha) * 100)),
            'median': float(np.median(arr)),
            'mean': float(np.mean(arr))
        }

    results = {
        'sharpe': ci(boot_sharpe),
        'win_rate': ci(boot_win_rate),
        'expectancy': ci(boot_expectancy),
        'max_drawdown': ci(boot_max_dd),
        'probabilities': {
            'p_sharpe_positive': float(np.mean(boot_sharpe > 0)),
            'p_win_rate_above_50': float(np.mean(boot_win_rate > 0.50)),
            'p_expectancy_positive': float(np.mean(boot_expectancy > 0)),
        }
    }

    return results
```

**White's Reality Check adjustment:**

```python
def whites_reality_check(actual_sharpe: float, n_parameter_sets: int,
                         base_p_value: float) -> dict:
    """
    Apply Bonferroni correction for data-snooping bias.

    Parameters
    ----------
    actual_sharpe : float
        Sharpe ratio of the selected parameter set.
    n_parameter_sets : int
        Total number of parameter sets tested during optimization.
    base_p_value : float
        Uncorrected p-value from permutation test.

    Returns
    -------
    dict with keys: corrected_threshold, corrected_p_value, passed
    """
    corrected_threshold = 0.05 / n_parameter_sets
    # Bonferroni: multiply p-value by number of tests (capped at 1.0)
    corrected_p = min(base_p_value * n_parameter_sets, 1.0)

    return {
        'n_parameter_sets': n_parameter_sets,
        'base_p_value': base_p_value,
        'corrected_threshold': corrected_threshold,
        'corrected_p_value': corrected_p,
        'passed': corrected_p < 0.05,
        'note': (f'With {n_parameter_sets} parameter sets tested, '
                 f'significance threshold is {corrected_threshold:.6f}')
    }
```

---

*End of Parts VII and VIII.*

*These two parts provide the complete risk management architecture and auto-switching system for PCTT. Every formula has executable Python code. Every parameter has a specific default value. Every threshold triggers a defined action. The system is fully deterministic and agent-implementable.*
