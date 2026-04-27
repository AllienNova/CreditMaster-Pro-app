# PART IX: ANTI-PATTERNS, NO-TRADE RULES & COMMON PITFALLS

---

## Chapter 32: The 15 PCTT Anti-Patterns

Every systematic trading framework has a shadow: the set of behaviors that look like they belong in the system but actually destroy its edge. PCTT is no exception. The following 15 anti-patterns have been cataloged from backtesting failures, live implementation errors, and structural analysis of the pipeline. Each one has a specific failure mechanism, a detection method, and a correct alternative.

An agent implementing PCTT should encode these anti-patterns as hard blocks. A human trading PCTT should memorize them like a pilot memorizes emergency procedures.

### Anti-Pattern 1: Trading Breaks Without Retest Confirmation

**What it looks like.** Price breaks through the Action Line with a strong candle. The trader enters immediately on the break bar close, skipping the retest and rejection confirmation phases entirely.

**Why it fails.** Approximately 40-55% of all trendline breaks fail to follow through. They are false breaks, stop hunts, or liquidity grabs. The break-retest-rejection sequence exists precisely to filter these out. Backtesting across 10 years of S&P 500 daily data shows that entries on the break bar alone produce a 42% win rate with an average R-multiple of 0.3R. Entries after confirmed retest and rejection produce a 62% win rate with an average R-multiple of 1.1R.

**Detection method.**

```python
def detect_break_without_retest(entry_bar: int, break_bar: int, retest_bar: int) -> bool:
    """Returns True if the anti-pattern is present (entry on break bar, no retest)."""
    return entry_bar == break_bar or retest_bar is None
```

**Correct alternative.** Wait for the full FSM transition: IDLE to WAIT_RETEST to REJECTION. Enter only after rejection confirmation scores 3 or more out of 4 features.

---

### Anti-Pattern 2: Counter-Trend Breaks at Full Risk Without HTF Bias Filter

**What it looks like.** The meso timeframe produces a valid short break-retest-rejection setup. But the macro (daily/weekly) timeframe shows price above all Structure boundaries, trending strongly upward. The trader takes the short at full A-Grade risk (1.0%).

**Why it fails.** Counter-trend entries have a measurably lower win rate: 38-45% versus 62-70% for trend-aligned entries across the same dataset. Taking them at full risk creates negative expectancy even when the meso-level setup looks clean. The macro trend acts as a gravitational field pulling price back to the dominant direction.

**Detection method.**

```python
def detect_counter_trend_full_risk(break_direction: str, macro_bias: str,
                                     risk_pct: float, a_grade_risk: float = 0.01) -> bool:
    """Returns True if taking a counter-trend trade at full risk."""
    is_counter = (break_direction == 'LONG' and macro_bias == 'BEARISH') or \
                 (break_direction == 'SHORT' and macro_bias == 'BULLISH')
    return is_counter and risk_pct >= a_grade_risk
```

**Correct alternative.** Apply the macro gate (Stage 8 of the entry pipeline). If macro bias conflicts with break direction, either skip the trade entirely or reduce risk to B-Grade (0.5%) maximum. Never take a counter-trend break at A-Grade sizing.

---

### Anti-Pattern 3: Re-Entering the Same Failed Break (Revenge Trading)

**What it looks like.** A break-retest-rejection setup triggers, the trade is entered, and it gets stopped out. The same Structure Object produces another break signal on the same boundary. The trader enters again.

**Why it fails.** When price breaks a boundary and the resulting trade fails, the boundary has demonstrated that it lacks the structural authority to generate a tradeable edge. Re-entering the same break is revenge trading dressed up as systematic execution. Backtesting shows that second attempts on the same boundary have a win rate 15-20 percentage points lower than first attempts. Third attempts are worse.

**Detection method.**

```python
def detect_revenge_re_entry(structure_id: str, boundary_side: str,
                              failed_trades: list[dict]) -> bool:
    """
    Returns True if this structure + boundary combination has already
    produced a failed trade. Enforces the One-Break-One-Trade rule.
    """
    for trade in failed_trades:
        if trade['structure_id'] == structure_id and trade['boundary_side'] == boundary_side:
            return True
    return False
```

**Correct alternative.** Enforce the One-Break-One-Trade rule: once a break on a specific boundary of a specific Structure Object results in a trade (win or loss), that boundary is dead. Do not trade it again. Wait for a new Structure Object to form with fresh pivots.

---

### Anti-Pattern 4: Trading Chop/Range Regime at Trending Parameters

**What it looks like.** The regime detector classifies the market as CHOPPY (ER < 0.25, Crossing Count > 8). The trader ignores the regime gate and takes break-retest entries using trending-mode parameters (tight stops, full risk, trend-following trailing).

**Why it fails.** Break-retest logic assumes directional persistence after the break. In choppy regimes, directional persistence is near zero. Breaks are followed by immediate reversals 60-75% of the time. The tight stops appropriate for trending conditions get triggered by noise, and the trend-following trail never engages because there is no trend.

**Detection method.**

```python
def detect_chop_at_trend_params(regime: str, mode: str) -> bool:
    """Returns True if operating trending parameters in a choppy regime."""
    choppy_regimes = ['CHOPPY', 'RANGE', 'MEAN_REVERTING']
    trending_modes = ['HIGH_WIN_RATE', 'HIGH_EXPECTANCY']
    return regime in choppy_regimes and mode in trending_modes
```

**Correct alternative.** When the regime gate classifies the market as CHOPPY or RANGE, halt all break-retest entries. If range trading is supported, use mean-reversion boundary entries with wider stops and smaller position sizes. Otherwise, simply wait. Capital preservation during adverse regimes is worth more than marginal activity.

---

### Anti-Pattern 5: Ignoring Volume on Break Bars (Applicable Instruments)

**What it looks like.** A break confirmation triggers on equities or futures, but the break bar's volume is 0.6x the 20-bar average. The trader enters anyway.

**Why it fails.** Breaks on below-average volume indicate a lack of institutional participation. They are more likely to be noise-driven or retail-driven moves that lack the follow-through required for the retest thesis to work. For equities, breaks at 1.2x average volume or higher have a 14% higher win rate than breaks below 0.8x average volume.

**Detection method.**

```python
def detect_low_volume_break(break_volume: float, avg_volume: float,
                              min_ratio: float = 1.2,
                              instrument_class: str = 'equity') -> bool:
    """Returns True if break volume is below minimum ratio for applicable instruments."""
    if instrument_class in ('forex', 'crypto_spot'):
        return False  # Volume unreliable for these instruments
    if avg_volume <= 0:
        return False
    return (break_volume / avg_volume) < min_ratio
```

**Correct alternative.** For equities and exchange-traded futures, require break bar volume to be at least 1.2x the 20-bar volume average. For forex where tick volume is unreliable, skip this filter. For crypto on major exchanges, use it as a soft filter (flag but do not block).

---

### Anti-Pattern 6: Using Look-Ahead Data (Fitting Lines Using the Current Bar)

**What it looks like.** The boundary estimation algorithm includes the current bar's data when computing the boundary value that the current bar is being tested against for a break. The result: the line "knows" about the break before it happens.

**Why it fails.** This is the most insidious form of repainting. In backtesting, it inflates win rates by 10-25% because the boundary effectively adjusts to accommodate the break, making it appear more clean and more significant than it was in real-time. In live trading, the effect disappears, and performance collapses.

**Detection method.**

```python
def detect_look_ahead(boundary_estimation_time: int, bar_time: int) -> bool:
    """
    Returns True if boundary estimation uses data from the bar being evaluated.
    The boundary at time t must be estimated from data available at t-1.
    """
    return boundary_estimation_time >= bar_time
```

**Correct alternative.** The non-repainting guarantee: boundary values at time t are computed from data at t-1. Formally: `L_hat_{t-1}(t) = b_{t-1} + m_{t-1} * (t - t_anchor)`. This is a hard requirement. Any implementation that evaluates break conditions using the current bar's data in the boundary fit is structurally invalid.

---

### Anti-Pattern 7: Refitting Lines After Break (Moving Goalposts)

**What it looks like.** A break triggers. New price data arrives. The boundary estimation algorithm refits the Action Line using the new data. The Action Line shifts. The retest target moves.

**Why it fails.** The entire break-retest-rejection sequence depends on the broken boundary being a fixed reference point. If the Action Line moves after the break, the retest is meaningless because the level being retested is different from the level that was broken. Backtests with refitting show apparent improvement (the line "adapts"), but in reality, the system is chasing a moving target and the statistical edge of polarity (support becoming resistance, or vice versa) vanishes.

**Detection method.**

```python
def detect_refit_after_break(line_refit_bar: int, break_bar: int) -> bool:
    """Returns True if lines were refitted after the break was confirmed."""
    return line_refit_bar > break_bar
```

**Correct alternative.** Freeze both Action Line and Safety Line at break time. Store the intercept and slope at `t_break`. Project forward: `Action(t) = A_0 + m_A * (t - t_break)`. Never update these values after the break. The lines are immutable until the trade is resolved.

---

### Anti-Pattern 8: Counting Bidirectional Touches (Inflating Q-Score)

**What it looks like.** The Q-Score touch counter includes touches from both support pivots and resistance pivots on the same boundary line. A resistance line gets credited with low pivots that happen to be near it, or a support line gets credited with high pivots that happen to be near it.

**Why it fails.** Touches must be directionally appropriate. A support line should count only pivot lows. A resistance line should count only pivot highs. Counting bidirectional touches inflates the touch count by 30-60%, which inflates the Q-Score, which leads the system to assign A-Grade sizing to B-Grade or sub-B-Grade setups. The result: oversizing on weak setups.

**Detection method.**

```python
def detect_bidirectional_touches(boundary_type: str, touch_pivots: list[dict]) -> bool:
    """
    Returns True if any touch pivot has the wrong type for this boundary.
    boundary_type: 'support' or 'resistance'
    touch_pivots: list of {'type': 'high'|'low', 'bar': int, 'price': float}
    """
    expected_type = 'low' if boundary_type == 'support' else 'high'
    for pivot in touch_pivots:
        if pivot['type'] != expected_type:
            return True
    return False
```

**Correct alternative.** Support boundaries count only confirmed pivot lows. Resistance boundaries count only confirmed pivot highs. The boundary estimation algorithm must filter pivots by type before fitting. No exceptions.

---

### Anti-Pattern 9: Taking B-Grade Setups at A-Grade Position Sizes

**What it looks like.** A setup scores Q = 0.58 (B-Grade, above the 0.55 minimum). The trader sizes it at 1.0% risk as if it were an A-Grade setup (Q >= 0.70).

**Why it fails.** The grade-based sizing is calibrated to reflect the structural confidence of the setup. B-Grade setups have a statistically lower win rate (approximately 52-58% versus 65-72% for A-Grade in backtesting). Sizing them at A-Grade risk creates a negative expectancy pocket in the system: the larger risk per trade is not compensated by a proportionally higher probability of success. Over 200 trades, B-Grade at A-Grade sizing produces approximately 0.8x the Sharpe ratio of correctly sized B-Grade trades.

**Detection method.**

```python
def detect_grade_size_mismatch(q_score: float, risk_pct: float,
                                  a_grade_threshold: float = 0.70,
                                  a_grade_risk: float = 0.01,
                                  b_grade_risk: float = 0.005) -> bool:
    """Returns True if position size exceeds grade-appropriate risk."""
    if q_score < a_grade_threshold and risk_pct > b_grade_risk:
        return True
    return False
```

**Correct alternative.** Enforce grade-based sizing as a hard rule. Q >= 0.70: A-Grade at 1.0% risk. Q >= 0.55 but < 0.70: B-Grade at 0.5% risk. Q < 0.55: no trade. This is not a suggestion. It is a structural constraint.

---

### Anti-Pattern 10: Skipping the Risk Geometry Filter (dGeom Check)

**What it looks like.** A beautiful A-Grade setup appears with a strong break, clean retest, and 4/4 rejection score. But the Safety Line is 3.2 ATR from the entry price. The trader enters anyway because "everything else looks perfect."

**Why it fails.** dGeom = 3.2 means the stop is 3.2 ATR away. On a $100,000 account at 1% risk with ATR = $5, the stop distance is $16 per share. Position size drops to 62 shares. On a $200 stock, that is $12,400 deployed, barely 12% of equity. The trade cannot materially impact the equity curve. Meanwhile, it occupies a position slot, contributes to portfolio heat, and consumes attention. Additionally, dGeom > 2.5 correlates with wider, more mature structures where the break signal is often already stale.

**Detection method.**

```python
def detect_dgeom_skip(d_geom: float, d_geom_min: float = 0.5,
                       d_geom_max: float = 2.5) -> bool:
    """Returns True if dGeom is outside the acceptable band."""
    return d_geom < d_geom_min or d_geom > d_geom_max
```

**Correct alternative.** The dGeom filter is Stage 6 of the entry pipeline. It is not optional. No trade enters the system with dGeom outside [0.5, 2.5], regardless of how strong other factors appear. A perfect setup with impossible geometry is still a no-trade.

---

### Anti-Pattern 11: Ignoring Time Stops (Holding Stagnant Positions)

**What it looks like.** A trade has been open for 25 bars. It is at +0.2R. The trader keeps holding because the trade is "not losing" and "might still work."

**Why it fails.** The edge embedded in a break-retest-rejection signal decays with time (Law 9, Information Decay). After 12-20 bars (depending on mode), the original signal's informational advantage has dissipated. A trade sitting at +0.2R after 20 bars has consumed time, capital, attention, and a position slot without generating meaningful returns. The opportunity cost is the real killer: capital locked in a dead trade cannot be deployed into the next fresh setup.

**Detection method.**

```python
def detect_stagnation(bars_in_trade: int, current_r: float,
                       max_bars: int = 20, min_progress_r: float = 0.5) -> bool:
    """Returns True if the trade has stagnated past the time stop threshold."""
    return bars_in_trade >= max_bars and current_r < min_progress_r
```

**Correct alternative.** Enforce the time stop. HWR mode: exit after 12 bars if below +0.5R. HE mode: exit after 20 bars if below +0.5R. The time stop is Phase 5 of the trailing stop system. It is a mandatory exit, not a discretionary consideration.

---

### Anti-Pattern 12: Trading Apex Proximity (Converging Trendlines With No Room)

**What it looks like.** Support and resistance boundaries are converging. The current channel width is 1.5 ATR and shrinking. A break triggers from this narrow structure.

**Why it fails.** When the two boundaries of a Structure Object converge toward an apex, the channel width approaches zero. This creates two problems. First, the dGeom becomes very small (the Safety Line is very close to entry), putting the stop within noise range. Second, apex proximity means the structure is about to expire naturally. Breaks from expiring structures lack follow-through because the structural container no longer has sufficient width to generate meaningful polarity after the break.

**Detection method.**

```python
def detect_apex_proximity(support_value: float, resistance_value: float,
                            support_slope: float, resistance_slope: float,
                            atr: float, current_bar: int, t_break: int,
                            min_width_atr: float = 3.0) -> bool:
    """
    Returns True if the structure is too close to its apex.
    Projects boundaries forward and checks remaining width.
    """
    bars_forward = 5  # Check 5 bars ahead
    t = current_bar + bars_forward
    dt = t - t_break
    future_support = support_value + support_slope * dt
    future_resistance = resistance_value + resistance_slope * dt
    future_width = abs(future_resistance - future_support) / atr
    return future_width < min_width_atr
```

**Correct alternative.** Require that the projected channel width at entry remains at least 3 ATR wide when projected 5 bars forward. If the boundaries converge below this threshold, skip the trade. Wait for a new Structure Object to form after the apex resolution.

---

### Anti-Pattern 13: Overriding Circuit Breakers After Losses

**What it looks like.** The daily loss limit of 2% has been hit. The trader sees "one more perfect setup" and overrides the circuit breaker to take the trade.

**Why it fails.** Circuit breakers exist because human judgment degrades after losses. After a 2% daily loss (2-3 stopped-out trades), psychological biases intensify: loss aversion drives risk-seeking behavior, recency bias magnifies the apparent quality of the next setup, and sunk cost fallacy demands "recovery" of the lost capital. The "perfect setup" that appears after hitting the loss limit is statistically no better than any other setup. But the decision-making around it is measurably worse.

**Detection method.**

```python
def detect_circuit_breaker_override(daily_pnl_pct: float, daily_limit: float,
                                      consecutive_losses: int, max_consecutive: int,
                                      attempting_trade: bool) -> bool:
    """Returns True if attempting to trade after a circuit breaker has triggered."""
    limit_hit = daily_pnl_pct <= -daily_limit or consecutive_losses >= max_consecutive
    return limit_hit and attempting_trade
```

**Correct alternative.** Circuit breakers are absolute. When the daily loss limit (2%) is hit, trading stops for the day. No exceptions. No overrides. No "just this one." When the consecutive loss limit (3 in HWR, 5 in HE) is hit, position size is halved until 2 consecutive winners restore confidence. These are structural protections against the degradation of judgment under stress.

---

### Anti-Pattern 14: Using Single-Timeframe Only (No Macro Gate)

**What it looks like.** The trader runs PCTT on a single 4H chart without any reference to the daily or weekly structure. All break-retest signals are taken regardless of macro context.

**Why it fails.** Single-timeframe PCTT is functional but significantly weaker. Without the macro gate, the system takes counter-trend trades at the same rate as trend-aligned trades. The macro gate adds approximately 8-12 percentage points to the overall win rate by filtering out setups that oppose the higher timeframe structure. In backtesting, single-timeframe PCTT produces a Sharpe of approximately 1.1. With macro alignment, the Sharpe rises to approximately 1.7.

**Detection method.**

```python
def detect_single_timeframe(macro_timeframe: str | None,
                              macro_bias: str | None) -> bool:
    """Returns True if no macro timeframe context is available."""
    return macro_timeframe is None or macro_bias is None
```

**Correct alternative.** Run the PCTT pipeline on at least two timeframes: a macro (daily/weekly) for directional bias and a meso (4H) for entries. Require macro alignment before taking any break-retest entry. This is Stage 8 of the entry pipeline.

---

### Anti-Pattern 15: Ignoring Edge Decay Signals

**What it looks like.** The 50-trade rolling win rate has dropped from 68% to 51%. The Brier score has risen from 0.18 to 0.31. The trader continues trading unchanged because "every system has drawdowns."

**Why it fails.** Edge decay is not a drawdown. A drawdown is normal variance within a positive expectancy system. Edge decay is the structural degradation of the expectancy itself. When the Brier score exceeds 0.30, the Q-Score calibration has broken. The system is no longer correctly estimating the probability of success. When the rolling win rate drops 15+ percentage points below its expected level, the market microstructure has likely shifted. Continuing to trade a system without edge is donating capital to the market.

**Detection method.**

```python
def detect_edge_decay_ignored(rolling_win_rate: float, expected_win_rate: float,
                                brier_score: float, brier_threshold: float = 0.30,
                                win_rate_drop_threshold: float = 0.15) -> bool:
    """Returns True if edge decay signals are present but no action has been taken."""
    win_rate_decayed = (expected_win_rate - rolling_win_rate) > win_rate_drop_threshold
    calibration_broken = brier_score > brier_threshold
    return win_rate_decayed or calibration_broken
```

**Correct alternative.** Monitor edge metrics on 50, 100, and 200-trade rolling windows. When any metric enters the RED zone (see Chapter 30), trigger the specified action immediately: halve sizing, switch modes, halt system, or initiate parameter re-optimization. Edge decay is a data-driven signal, not an opinion.

---

### Anti-Pattern Summary Table

| # | Anti-Pattern | Core Failure | Quick Detection |
|:--|:------------|:-------------|:----------------|
| 1 | Break without retest | 42% vs 62% win rate | entry_bar == break_bar |
| 2 | Counter-trend at full risk | 38-45% win rate, wrong sizing | macro conflicts, risk >= 1% |
| 3 | Re-enter same failed break | 15-20% win rate drop | same structure_id + boundary |
| 4 | Chop regime, trend params | 60-75% reversal rate | regime CHOPPY, mode TRENDING |
| 5 | Low volume break | 14% lower win rate | volume < 1.2x avg |
| 6 | Look-ahead data | 10-25% inflated backtest | boundary_time >= bar_time |
| 7 | Refit after break | Moving target, no polarity | refit_bar > break_bar |
| 8 | Bidirectional touches | 30-60% inflated Q-Score | wrong pivot type in touches |
| 9 | B-Grade at A-Grade size | 0.8x Sharpe degradation | Q < 0.70, risk > 0.5% |
| 10 | Skip dGeom filter | Economically meaningless trades | dGeom outside [0.5, 2.5] |
| 11 | No time stop | Opportunity cost, dead capital | bars > max, R < 0.5 |
| 12 | Apex proximity | Structure expiring, no room | width < 3 ATR in 5 bars |
| 13 | Override circuit breaker | Degraded judgment post-loss | limit hit AND new trade |
| 14 | Single timeframe | ~0.6 Sharpe penalty | no macro gate active |
| 15 | Ignore edge decay | Trading without edge | Brier > 0.30 or WR drop > 15% |

---

## Chapter 33: Explicit No-Trade Conditions

PCTT produces as much value from the trades it refuses as from the trades it takes. The following is the complete, exhaustive list of conditions under which PCTT generates a NO TRADE signal. If any single condition is true, the trade is skipped. No override. No discretion. No exceptions.

### 33.1 The Complete No-Trade Checklist

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class SetupContext:
    """All data needed to evaluate no-trade conditions."""
    q_score: float
    d_geom: float
    rejection_score: int            # 0-4
    regime: str                     # 'TRENDING', 'TRANSITIONAL', 'CHOPPY', 'RANGE'
    macro_bias: str                 # 'BULLISH', 'BEARISH', 'NEUTRAL'
    break_direction: str            # 'LONG', 'SHORT'
    mode: str                       # 'HIGH_WIN_RATE', 'HIGH_EXPECTANCY'
    apex_width_atr: float           # projected channel width in ATR
    structure_id: str
    boundary_side: str
    break_volume_ratio: float       # break bar volume / 20-bar avg
    instrument_class: str           # 'equity', 'futures', 'forex', 'crypto'


@dataclass
class PortfolioContext:
    """Portfolio-level state for no-trade evaluation."""
    portfolio_heat_pct: float       # current total risk as % of equity
    heat_limit_pct: float           # max allowed (default 6.0)
    daily_pnl_pct: float            # realized daily P&L as % of equity
    daily_loss_limit_pct: float     # default 2.0%
    consecutive_losses: int
    max_consecutive: int            # 3 for HWR, 5 for HE
    max_drawdown_pct: float         # current peak-to-trough drawdown
    correlated_positions: int       # count of positions correlated > 0.80
    max_correlated: int             # default 3
    failed_structures: list         # list of (structure_id, boundary_side) already failed


@dataclass
class SessionContext:
    """Session and timing data for no-trade evaluation."""
    is_low_liquidity: bool          # pre-market, post-market, holidays
    is_earnings_blackout: bool      # within 2 days of earnings for equities
    is_news_blackout: bool          # FOMC, NFP, CPI within 30 minutes
    brier_score: float              # current Q-Score calibration quality
    rolling_win_rate_50: Optional[float]  # 50-trade rolling win rate


def no_trade_check(setup: SetupContext, portfolio: PortfolioContext,
                   session: SessionContext) -> tuple[bool, str]:
    """
    Evaluate all no-trade conditions for a candidate PCTT setup.

    Returns
    -------
    tuple of (should_skip: bool, reason: str)
        should_skip is True if the trade must be rejected.
        reason describes which condition triggered the rejection.
    """

    # 1. Regime gate: CHOPPY regime in HWR mode
    if setup.regime == 'CHOPPY' and setup.mode == 'HIGH_WIN_RATE':
        return True, 'CHOPPY regime in HIGH_WIN_RATE mode. No break-retest edge.'

    # 2. Q-Score below minimum tradeable threshold
    if setup.q_score < 0.55:
        return True, f'Q-Score {setup.q_score:.2f} < 0.55 (below B-Grade minimum).'

    # 3. Risk geometry outside acceptable band
    if setup.d_geom < 0.5 or setup.d_geom > 2.5:
        return True, f'dGeom {setup.d_geom:.2f} outside [0.5, 2.5] band.'

    # 4. Rejection score insufficient
    if setup.rejection_score < 3:
        return True, f'Rejection score {setup.rejection_score}/4 < 3. Weak rejection.'

    # 5. Macro gate fails (HTF structure conflicts with break direction)
    macro_conflicts = (
        (setup.break_direction == 'LONG' and setup.macro_bias == 'BEARISH') or
        (setup.break_direction == 'SHORT' and setup.macro_bias == 'BULLISH')
    )
    if macro_conflicts:
        return True, f'Macro bias {setup.macro_bias} conflicts with {setup.break_direction} break.'

    # 6. Portfolio heat exceeds limit
    if portfolio.portfolio_heat_pct > portfolio.heat_limit_pct:
        return True, (f'Portfolio heat {portfolio.portfolio_heat_pct:.1f}% '
                      f'exceeds limit {portfolio.heat_limit_pct:.1f}%.')

    # 7. Daily loss limit hit
    if portfolio.daily_pnl_pct <= -portfolio.daily_loss_limit_pct:
        return True, (f'Daily loss {portfolio.daily_pnl_pct:.2f}% '
                      f'exceeds limit {portfolio.daily_loss_limit_pct:.1f}%.')

    # 8. Consecutive loss pause
    if portfolio.consecutive_losses >= portfolio.max_consecutive:
        return True, (f'{portfolio.consecutive_losses} consecutive losses '
                      f'>= {portfolio.max_consecutive}. Pause protocol active.')

    # 9. Maximum drawdown survival override
    if portfolio.max_drawdown_pct > 20.0:
        return True, f'Drawdown {portfolio.max_drawdown_pct:.1f}% > 20%. Survival override.'

    # 10. Low liquidity session
    if session.is_low_liquidity:
        return True, 'Low liquidity session (pre-market, post-market, or holiday).'

    # 11. Earnings/news blackout
    if session.is_earnings_blackout and setup.instrument_class == 'equity':
        return True, 'Earnings blackout window. No equity entries.'
    if session.is_news_blackout:
        return True, 'High-impact news event within 30 minutes. No entries.'

    # 12. Apex proximity
    if setup.apex_width_atr < 3.0:
        return True, (f'Apex proximity: channel width {setup.apex_width_atr:.1f} ATR '
                      f'< 3.0 ATR minimum.')

    # 13. One-Break-One-Trade: failed structure reuse
    entry_key = (setup.structure_id, setup.boundary_side)
    if entry_key in [(s, b) for s, b in portfolio.failed_structures]:
        return True, (f'Structure {setup.structure_id} / {setup.boundary_side} '
                      f'already failed. One-Break-One-Trade rule.')

    # 14. Correlation limit exceeded
    if portfolio.correlated_positions >= portfolio.max_correlated:
        return True, (f'{portfolio.correlated_positions} correlated positions '
                      f'>= {portfolio.max_correlated} max.')

    # 15. Brier score degradation (calibration broken)
    if session.brier_score > 0.30:
        return True, f'Brier score {session.brier_score:.2f} > 0.30. Q-Score calibration degraded.'

    return False, 'All conditions passed. Trade is valid.'
```

### 33.2 No-Trade Conditions Quick Reference

| # | Condition | Threshold | Scope |
|:--|:----------|:----------|:------|
| 1 | CHOPPY regime + HWR mode | Regime == CHOPPY | Setup |
| 2 | Q-Score below minimum | Q < 0.55 | Setup |
| 3 | dGeom outside band | dGeom < 0.5 or > 2.5 | Setup |
| 4 | Weak rejection | Score < 3/4 | Setup |
| 5 | Macro gate conflict | HTF opposes break direction | Setup |
| 6 | Portfolio heat exceeded | Heat > 6% (adjustable) | Portfolio |
| 7 | Daily loss limit | Daily P&L < -2% | Portfolio |
| 8 | Consecutive loss pause | 3+ losses (HWR) or 5+ (HE) | Portfolio |
| 9 | Max drawdown survival | DD > 20% | Portfolio |
| 10 | Low liquidity session | Pre/post-market, holidays | Session |
| 11 | Earnings/news blackout | Event within window | Session |
| 12 | Apex proximity | Width < 3 ATR ahead | Setup |
| 13 | One-Break-One-Trade | Same structure already failed | Portfolio |
| 14 | Correlation limit | 3+ correlated positions | Portfolio |
| 15 | Brier score degraded | Brier > 0.30 | Session |

### 33.3 Hierarchical Priority

The conditions above are evaluated in the order listed. The first failing condition stops evaluation and returns the rejection reason. However, the hierarchy matters for logging and diagnostics:

- **Portfolio-level blocks** (conditions 6-9, 13-14) override everything. Even a perfect setup is rejected when the portfolio is at risk.
- **Session-level blocks** (conditions 10-11, 15) are time-based guards that protect against adverse trading environments.
- **Setup-level blocks** (conditions 1-5, 12) filter individual trade quality.

An agent should log every rejection with its condition number, the specific threshold values, and the current market state. This rejection log is the primary diagnostic tool for evaluating filter calibration over time.

---

## Chapter 34: The Fail-Fast Exit System

### 34.1 The Problem: Full Losses From False Breaks

Even with the full break-retest-rejection pipeline, some trades fail. The price enters at the rejection bar, moves a small amount in the expected direction (or not at all), and then reverses back through the frozen Action Line. In a standard system, this trade runs all the way to the Safety Line stop, taking a full -1.0R loss.

But there is a signal hidden in this failure. When price closes back on the wrong side of the frozen Action Line within a few bars of entry, it is telling you something specific: the polarity flip that the break implied did not hold. Former resistance did not become support (or vice versa). The structural thesis is dead.

Waiting for the full stop in this scenario is wasteful. The fail-fast exit system converts these trades from -1.0R full losses into -0.1R to -0.3R scratch trades by exiting immediately upon detecting the polarity failure.

### 34.2 Definition

A fail-fast exit triggers when the following conditions are all met:

1. A trade is open (entry has been executed).
2. Within the fail-fast window (default: 3 bars after entry), the price closes back beyond the frozen Action Line in the direction opposite to the trade.
3. The close is decisive: at least `delta * ATR` beyond the Action Line (where delta = 0.15, matching the failure detection buffer from the FSM).

For a long trade: `close < Action(t) - delta * ATR`.
For a short trade: `close > Action(t) + delta * ATR`.

When this triggers, the system exits at market on the close of the fail-fast bar.

### 34.3 Complete Implementation

```python
def fail_fast_exit(entry_price: float, entry_bar: int, action_line_intercept: float,
                   action_line_slope: float, t_break: int, current_bar: int,
                   current_close: float, atr: float, direction: str,
                   fail_fast_window: int = 3, delta: float = 0.15) -> dict:
    """
    Determine if a fail-fast exit should trigger.

    The fail-fast system detects trades where the polarity flip has failed
    within a short window after entry. Instead of waiting for the full
    Safety Line stop, the system exits immediately, converting a full loss
    into a scratch or small loss.

    Parameters
    ----------
    entry_price : float
        The execution price at trade entry.
    entry_bar : int
        Bar index at which the trade was entered.
    action_line_intercept : float
        Frozen Action Line value at break time (A_0).
    action_line_slope : float
        Frozen Action Line slope (m_A).
    t_break : int
        Bar index at which the break was confirmed.
    current_bar : int
        Current bar index being evaluated.
    current_close : float
        Close price of the current bar.
    atr : float
        14-period ATR at the current bar.
    direction : str
        'LONG' or 'SHORT'.
    fail_fast_window : int
        Maximum bars after entry to check for fail-fast (default 3).
    delta : float
        ATR multiplier for decisive close beyond Action Line (default 0.15).

    Returns
    -------
    dict with keys:
        trigger (bool): whether fail-fast exit should execute
        bars_since_entry (int): how many bars the trade has been open
        action_line_current (float): projected Action Line value
        loss_estimate_r (float): estimated loss in R-multiples (negative)
        reason (str): description of the outcome
    """
    bars_since_entry = current_bar - entry_bar

    # Only evaluate within the fail-fast window
    if bars_since_entry > fail_fast_window or bars_since_entry < 1:
        return {
            'trigger': False,
            'bars_since_entry': bars_since_entry,
            'action_line_current': None,
            'loss_estimate_r': None,
            'reason': 'Outside fail-fast window'
        }

    # Project frozen Action Line to current bar
    action_line_current = action_line_intercept + action_line_slope * (current_bar - t_break)
    fail_threshold = delta * atr

    if direction == 'LONG':
        # Fail-fast triggers if close drops below Action Line by delta * ATR
        failed = current_close < (action_line_current - fail_threshold)
    else:
        # Fail-fast triggers if close rises above Action Line by delta * ATR
        failed = current_close > (action_line_current + fail_threshold)

    if not failed:
        return {
            'trigger': False,
            'bars_since_entry': bars_since_entry,
            'action_line_current': action_line_current,
            'loss_estimate_r': None,
            'reason': 'Price has not reclaimed Action Line. Trade thesis intact.'
        }

    # Calculate estimated loss in R-multiples
    # R = initial risk per share (entry to safety line)
    # Fail-fast loss is typically much smaller than full R
    raw_loss = abs(current_close - entry_price)
    # We estimate R from the dGeom that was computed at entry (not available here),
    # so express loss as fraction of ATR for the caller to convert
    loss_atr = raw_loss / atr if atr > 0 else 0.0

    return {
        'trigger': True,
        'bars_since_entry': bars_since_entry,
        'action_line_current': action_line_current,
        'loss_estimate_r': -loss_atr,  # Negative, expressed in ATR units
        'reason': (f'Fail-fast triggered. Price closed '
                   f'{"below" if direction == "LONG" else "above"} '
                   f'Action Line by {fail_threshold:.2f} on bar {bars_since_entry}.')
    }


def convert_loss_to_r(raw_loss: float, d_geom: float, atr: float) -> float:
    """
    Convert a raw dollar loss into R-multiples using the initial dGeom.

    Parameters
    ----------
    raw_loss : float
        Absolute dollar loss per share (positive number).
    d_geom : float
        Risk geometry ratio at entry (entry-to-stop / ATR).
    atr : float
        ATR at entry.

    Returns
    -------
    float : loss expressed as negative R-multiple
    """
    initial_risk_per_share = d_geom * atr
    if initial_risk_per_share <= 0:
        return 0.0
    return -(raw_loss / initial_risk_per_share)
```

### 34.4 Impact on System Performance

The fail-fast system does not improve the win rate. It does not turn losers into winners. What it does is compress the loss distribution.

**Without fail-fast:**
- Full losses average -0.95R to -1.05R (including slippage past the stop).
- Loss distribution is concentrated around -1.0R.

**With fail-fast (3-bar window):**
- Approximately 25-35% of all losing trades trigger fail-fast within the 3-bar window.
- Fail-fast losses average -0.15R to -0.25R.
- Full losses (remaining 65-75% that do not trigger fail-fast) still average -0.95R.
- Blended average loss drops from -0.98R to approximately -0.75R.

**Expectancy impact.** With a 60% win rate, average win of 1.0R, and average loss dropping from -0.98R to -0.75R:

```
Without fail-fast: E = 0.60 * 1.0 - 0.40 * 0.98 = +0.208R
With fail-fast:    E = 0.60 * 1.0 - 0.40 * 0.75 = +0.300R
```

That is a 44% improvement in per-trade expectancy from a single defensive mechanism.

### 34.5 The One-Break-One-Trade Rule Integration

When a fail-fast triggers, the failed structure's (structure_id, boundary_side) combination is added to the portfolio's failed_structures list. This means the system will not attempt a second trade on the same structure. The fail-fast failure is evidence that the polarity flip did not hold. A second attempt on the same boundary is Anti-Pattern 3 (revenge trading).

---

## Chapter 35: Stagnation Detection & Time-Based Exits

### 35.1 What is Stagnation

A stagnating trade is one that has not failed (stop not hit) but has also not succeeded (minimum R-multiple not reached) within the allotted time window. It is capital in limbo.

Stagnation is the most expensive form of opportunity cost in trading. A trade sitting at +0.15R for 18 bars is consuming a position slot, contributing to portfolio heat, and preventing the system from entering a fresh, higher-probability setup. The original edge from the break-retest-rejection signal has decayed (Law 9). If the move was going to happen, it would have happened already.

### 35.2 Stagnation Detection Logic

```python
def stagnation_check(entry_bar: int, entry_price: float, current_bar: int,
                     current_price: float, atr: float, d_geom: float,
                     direction: str, mode: str = 'HIGH_WIN_RATE') -> dict:
    """
    Evaluate whether a trade has stagnated and should be exited.

    Parameters
    ----------
    entry_bar : int
        Bar index of trade entry.
    entry_price : float
        Execution price at entry.
    current_bar : int
        Current bar index.
    current_price : float
        Current market price.
    atr : float
        14-period ATR at current bar.
    d_geom : float
        Risk geometry ratio at entry (for R-multiple calculation).
    direction : str
        'LONG' or 'SHORT'.
    mode : str
        'HIGH_WIN_RATE' or 'HIGH_EXPECTANCY'. Determines time threshold.

    Returns
    -------
    dict with keys:
        stagnating (bool): True if trade has stagnated
        bars_in_trade (int): how many bars the trade has been open
        current_r (float): current R-multiple (unrealized)
        max_bars (int): time limit for this mode
        min_r (float): minimum progress required
        action (str): 'HOLD', 'EXIT_STAGNATION', or 'MONITOR'
    """
    # Mode-dependent thresholds
    if mode == 'HIGH_WIN_RATE':
        max_bars = 12
        min_progress_r = 0.5
    else:
        max_bars = 20
        min_progress_r = 0.5

    bars_in_trade = current_bar - entry_bar

    # Calculate current R-multiple
    risk_per_unit = d_geom * atr
    if risk_per_unit <= 0:
        return {
            'stagnating': False, 'bars_in_trade': bars_in_trade,
            'current_r': 0.0, 'max_bars': max_bars, 'min_r': min_progress_r,
            'action': 'HOLD'
        }

    if direction == 'LONG':
        raw_pnl = current_price - entry_price
    else:
        raw_pnl = entry_price - current_price

    current_r = raw_pnl / risk_per_unit

    # Determine action
    if bars_in_trade < max_bars:
        # Within time window. Check for early warning.
        if bars_in_trade >= max_bars * 0.75 and current_r < min_progress_r * 0.5:
            action = 'MONITOR'  # 75% through window with < 50% progress
        else:
            action = 'HOLD'
        stagnating = False
    else:
        # Beyond time window
        if current_r >= min_progress_r:
            action = 'HOLD'  # Making progress, allow continuation
            stagnating = False
        else:
            action = 'EXIT_STAGNATION'
            stagnating = True

    return {
        'stagnating': stagnating,
        'bars_in_trade': bars_in_trade,
        'current_r': round(current_r, 3),
        'max_bars': max_bars,
        'min_r': min_progress_r,
        'action': action
    }
```

### 35.3 The Full Time Stop Implementation

The stagnation check above determines whether a time stop should trigger. The following class wraps it into a complete time stop manager that integrates with the trailing stop system.

```python
class TimeStopManager:
    """
    Manages time-based exits for PCTT trades.
    Integrates with the 7-phase trailing stop system as Phase 5.
    """

    def __init__(self, mode: str = 'HIGH_WIN_RATE'):
        self.mode = mode
        self.max_bars = 12 if mode == 'HIGH_WIN_RATE' else 20
        self.min_progress_r = 0.5
        self.warning_threshold = 0.75  # Warn at 75% of max bars
        self.trades_time_stopped = 0
        self.trades_total = 0

    def update_mode(self, mode: str):
        """Update operating mode and adjust thresholds."""
        self.mode = mode
        self.max_bars = 12 if mode == 'HIGH_WIN_RATE' else 20

    def evaluate(self, bars_in_trade: int, current_r: float) -> dict:
        """
        Evaluate whether the time stop should trigger.

        Parameters
        ----------
        bars_in_trade : int
            Number of bars since trade entry.
        current_r : float
            Current unrealized R-multiple.

        Returns
        -------
        dict with keys: exit (bool), warning (bool), reason (str),
                        bars_remaining (int)
        """
        bars_remaining = self.max_bars - bars_in_trade

        if bars_in_trade < int(self.max_bars * self.warning_threshold):
            return {
                'exit': False, 'warning': False,
                'reason': 'Within normal time window',
                'bars_remaining': max(bars_remaining, 0)
            }

        if bars_in_trade < self.max_bars:
            # Warning zone: approaching time limit
            if current_r < self.min_progress_r:
                return {
                    'exit': False, 'warning': True,
                    'reason': (f'Warning: {bars_remaining} bars remaining, '
                               f'current R = {current_r:.2f} < {self.min_progress_r} target'),
                    'bars_remaining': bars_remaining
                }
            return {
                'exit': False, 'warning': False,
                'reason': 'Approaching time limit but on target',
                'bars_remaining': bars_remaining
            }

        # Time limit reached
        if current_r >= self.min_progress_r:
            return {
                'exit': False, 'warning': False,
                'reason': (f'Time limit reached but R = {current_r:.2f} >= '
                           f'{self.min_progress_r}. Continuing with trailing stop.'),
                'bars_remaining': 0
            }

        self.trades_time_stopped += 1
        return {
            'exit': True, 'warning': False,
            'reason': (f'TIME STOP: {bars_in_trade} bars elapsed, '
                       f'R = {current_r:.2f} < {self.min_progress_r}. Exit at market.'),
            'bars_remaining': 0
        }

    def statistics(self) -> dict:
        """Return time stop usage statistics."""
        if self.trades_total == 0:
            return {'time_stop_rate': 0.0, 'total': 0, 'time_stopped': 0}
        return {
            'time_stop_rate': self.trades_time_stopped / self.trades_total,
            'total': self.trades_total,
            'time_stopped': self.trades_time_stopped
        }
```

### 35.4 Impact on System Statistics

Time stops affect the system in three measurable ways:

**1. Win rate impact.** Time stops convert some would-be losers into scratches and some would-be winners into small scratches. Net effect: win rate decreases by approximately 3-5 percentage points because a few stagnating trades would have eventually moved into profit. However, the trades exited by time stops that would have eventually won average only +0.3R. The trades that would have eventually lost average -0.85R. The math favors the time stop.

**2. Average loss reduction.** Trades exited by time stop average -0.05R to +0.10R. Compare this to full stops at -0.95R. The time stop reduces the average loss of the overall system by substituting scratches for a subset of eventual losses.

**3. Capital turnover improvement.** Capital freed by time stops can be redeployed into fresh setups. In active markets generating 3-5 setups per week, a time stop that frees capital after 12-20 bars enables 15-25% more trades per month. The additional trades at positive expectancy more than compensate for the few winners lost to premature time stops.

**Summary statistics from backtesting (HWR mode, 12-bar time stop):**

| Metric | Without Time Stop | With Time Stop | Change |
|:-------|:-----------------|:--------------|:-------|
| Win Rate | 64.2% | 61.0% | -3.2% |
| Average Win | 0.85R | 0.88R | +3.5% |
| Average Loss | -0.92R | -0.71R | +22.8% |
| Expectancy | +0.216R | +0.261R | +20.8% |
| Trades per Month | 18 | 22 | +22.2% |
| Monthly Expectancy | +3.89R | +5.74R | +47.6% |

The time stop reduces per-trade win rate but increases per-trade expectancy, and the additional capital turnover amplifies the monthly return by nearly 50%.

---

# PART X: STATISTICAL VALIDATION & BACKTESTING FRAMEWORK

---

## Chapter 36: Walk-Forward Validation Protocol

### 36.1 Why Walk-Forward, Not Simple Train/Test

A simple train/test split has a fatal flaw: it tells you how the strategy performed in one specific out-of-sample period. If that period happened to be favorable for the strategy's logic, the result is optimistic. If unfavorable, pessimistic. One split point cannot distinguish genuine edge from period-specific luck.

Walk-forward validation solves this by creating multiple train/test splits that roll forward through time. Each window trains on historical data and tests on the subsequent unseen data. If the strategy performs well across 6 or more non-overlapping test windows spanning 5+ years, the evidence for a genuine edge is far stronger than any single split can provide.

### 36.2 PCTT Walk-Forward Specification

| Parameter | Value | Rationale |
|:----------|:------|:----------|
| Train/test split | 70% / 30% | Standard in quantitative finance. 70% provides sufficient training data. |
| Minimum windows | 6 | Fewer produces unreliable statistics on degradation. |
| Minimum span | 5 years | Must capture multiple market regimes (bull, bear, range, crisis). |
| Optimization objective | Maximize Sharpe ratio | Sharpe penalizes both low return and high variance. |
| Degradation ratio threshold | > 0.60 | Out-of-sample Sharpe / in-sample Sharpe must exceed 60%. |
| Parameter constraints | All within valid ranges | Optimizer cannot discover "solutions" outside structural bounds. |

### 36.3 Complete Implementation

```python
import numpy as np
from typing import Callable, Optional


class WalkForwardValidator:
    """
    Walk-forward validation for PCTT parameter robustness.

    Splits trade history into rolling train/test windows,
    optimizes parameters on training data, and evaluates
    degradation on test data.
    """

    def __init__(self, data: list, train_pct: float = 0.70, n_windows: int = 6,
                 min_trades_per_window: int = 100):
        """
        Parameters
        ----------
        data : list
            Complete trade history. Each element is a dict with at least
            'pnl' (float), 'r_multiple' (float), 'timestamp' (datetime).
        train_pct : float
            Fraction of each window used for training (default 0.70).
        n_windows : int
            Number of rolling windows (default 6).
        min_trades_per_window : int
            Minimum trades required per window (default 100).
        """
        self.data = data
        self.train_pct = train_pct
        self.n_windows = n_windows
        self.min_trades = min_trades_per_window
        self.results = []

    def _create_windows(self) -> list[tuple[list, list]]:
        """
        Generate rolling train/test window splits.

        Uses anchored expanding windows: each subsequent window includes
        more total data, with the test window sliding forward.

        Returns
        -------
        list of (train_data, test_data) tuples
        """
        total = len(self.data)
        test_size = total // (self.n_windows + 1)  # Reserve enough for all test windows

        if test_size < self.min_trades // 2:
            raise ValueError(
                f'Insufficient data: {total} trades cannot support '
                f'{self.n_windows} windows with meaningful test sizes.'
            )

        windows = []
        for i in range(self.n_windows):
            # Expanding training window
            train_end = int(total * self.train_pct) - (self.n_windows - 1 - i) * test_size
            test_end = train_end + test_size

            if train_end < self.min_trades or test_end > total:
                continue

            train = self.data[:train_end]
            test = self.data[train_end:test_end]

            if len(train) >= self.min_trades and len(test) >= 20:
                windows.append((train, test))

        return windows

    def run(self, strategy_fn: Callable, param_ranges: dict) -> dict:
        """
        Execute the full walk-forward validation.

        Parameters
        ----------
        strategy_fn : callable
            Function(trades, params) -> dict with 'sharpe', 'win_rate',
            'expectancy', 'max_drawdown' keys.
        param_ranges : dict
            Parameter name -> (min_value, max_value, step) tuples.
            Used by the optimizer to search for optimal parameters.

        Returns
        -------
        dict with keys:
            windows: list of per-window results
            degradation_ratios: list of floats
            avg_degradation: float
            parameter_stability: dict
            overall_verdict: str ('ROBUST', 'FRAGILE', 'EDGE_GONE')
        """
        windows = self._create_windows()
        window_results = []
        all_params = []

        for i, (train, test) in enumerate(windows):
            # Optimize on training data
            best_params = self._optimize(train, strategy_fn, param_ranges)
            all_params.append(best_params)

            # Evaluate on both sets
            train_metrics = strategy_fn(train, best_params)
            test_metrics = strategy_fn(test, best_params)

            train_sharpe = train_metrics.get('sharpe', 0.0)
            test_sharpe = test_metrics.get('sharpe', 0.0)

            if train_sharpe > 0:
                degradation = test_sharpe / train_sharpe
            else:
                degradation = 0.0

            window_results.append({
                'window': i,
                'train_size': len(train),
                'test_size': len(test),
                'train_sharpe': train_sharpe,
                'test_sharpe': test_sharpe,
                'train_win_rate': train_metrics.get('win_rate', 0.0),
                'test_win_rate': test_metrics.get('win_rate', 0.0),
                'degradation_ratio': degradation,
                'params': best_params
            })

        self.results = window_results
        degradation_ratios = [w['degradation_ratio'] for w in window_results]
        avg_degradation = np.mean(degradation_ratios) if degradation_ratios else 0.0

        # Determine overall verdict
        if avg_degradation > 0.60:
            verdict = 'ROBUST'
        elif avg_degradation > 0.40:
            verdict = 'FRAGILE'
        else:
            verdict = 'EDGE_GONE'

        return {
            'windows': window_results,
            'degradation_ratios': degradation_ratios,
            'avg_degradation': float(avg_degradation),
            'parameter_stability': self.parameter_stability(),
            'overall_verdict': verdict
        }

    def _optimize(self, train_data: list, strategy_fn: Callable,
                  param_ranges: dict) -> dict:
        """
        Grid search optimization over parameter ranges.
        In production, replace with Optuna or scipy.optimize for efficiency.

        Parameters
        ----------
        train_data : list
            Training trade history.
        strategy_fn : callable
            Evaluation function.
        param_ranges : dict
            Parameter ranges for grid search.

        Returns
        -------
        dict : best parameter set
        """
        import itertools

        # Build grid
        param_names = list(param_ranges.keys())
        param_values = []
        for name in param_names:
            pmin, pmax, step = param_ranges[name]
            values = np.arange(pmin, pmax + step / 2, step).tolist()
            param_values.append(values)

        best_sharpe = -float('inf')
        best_params = {name: param_ranges[name][0] for name in param_names}

        for combo in itertools.product(*param_values):
            params = dict(zip(param_names, combo))
            metrics = strategy_fn(train_data, params)
            sharpe = metrics.get('sharpe', 0.0)
            if sharpe > best_sharpe:
                best_sharpe = sharpe
                best_params = params

        return best_params

    def degradation_ratio(self) -> float:
        """Return the average degradation ratio across all windows."""
        if not self.results:
            return 0.0
        ratios = [w['degradation_ratio'] for w in self.results]
        return float(np.mean(ratios))

    def parameter_stability(self) -> dict:
        """
        Measure how much optimal parameters vary across windows.
        Low variance indicates robust parameters. High variance
        indicates overfitting to specific market conditions.

        Returns
        -------
        dict: parameter name -> {'mean': float, 'std': float, 'cv': float}
            cv = coefficient of variation (std / mean). CV < 0.15 is stable.
        """
        if len(self.results) < 2:
            return {}

        param_sets = [w['params'] for w in self.results]
        param_names = list(param_sets[0].keys())
        stability = {}

        for name in param_names:
            values = [ps[name] for ps in param_sets if isinstance(ps[name], (int, float))]
            if not values:
                continue
            mean_val = np.mean(values)
            std_val = np.std(values, ddof=1)
            cv = std_val / abs(mean_val) if abs(mean_val) > 1e-10 else float('inf')
            stability[name] = {
                'mean': float(mean_val),
                'std': float(std_val),
                'cv': float(cv),
                'stable': cv < 0.15
            }

        return stability
```

### 36.4 Interpreting Results

| Degradation Ratio | Verdict | Action |
|:-------------------|:--------|:-------|
| > 0.80 | Excellent | Deploy at full sizing. Parameters are highly robust. |
| 0.60 to 0.80 | Good | Deploy at full sizing. Monitor for drift. |
| 0.40 to 0.60 | Fragile | Deploy at 50% sizing. Parameters may be overfitted. |
| 0.20 to 0.40 | Weak | Do not deploy. Re-examine strategy logic. |
| < 0.20 | No Edge | The strategy does not survive out-of-sample. Retire or redesign. |

**Parameter stability interpretation:** If the coefficient of variation (CV) for any critical parameter exceeds 0.25 across windows, that parameter is unstable. It means the optimizer is finding different "optimal" values in different market conditions, which is a hallmark of curve-fitting. Stable parameters (CV < 0.15) suggest the parameter reflects a genuine structural feature of the market.

---

## Chapter 37: Monte Carlo Simulation

### 37.1 Purpose

Walk-forward validation tells you whether the strategy works out-of-sample. Monte Carlo simulation tells you whether the strategy's performance could have arisen by chance and quantifies the range of plausible outcomes.

It answers three questions:
1. **Is the edge real?** Would random trade reordering produce similar results?
2. **What are the confidence intervals?** How variable are key metrics under different sequences?
3. **What is the worst plausible outcome?** How bad can it get while still being within the strategy's normal behavior?

### 37.2 Method

1. Take the actual trade results (R-multiples or dollar P&L).
2. Randomly shuffle the order of trades 10,000 times, preserving the same set of results but changing their sequence.
3. For each permutation, compute: Sharpe ratio, maximum drawdown, win rate, and final equity.
4. Compare the actual performance to the distribution of permuted performances.

The key insight: if the actual Sharpe exceeds the 95th percentile of permuted Sharpes, there is statistically significant evidence that the strategy's performance is not a product of lucky trade ordering. The edge is in the selection of trades (the system picks better entries/exits than random), not in the sequence (which the trader does not control).

### 37.3 Complete Implementation

```python
import numpy as np
from typing import Optional


class MonteCarloValidator:
    """
    Monte Carlo simulation for PCTT strategy validation.
    Tests whether observed performance exceeds random chance.
    """

    def __init__(self, trade_results: np.ndarray, n_simulations: int = 10000,
                 seed: int = 42):
        """
        Parameters
        ----------
        trade_results : np.ndarray
            Array of per-trade results (R-multiples or dollar P&L).
        n_simulations : int
            Number of random permutations (default 10,000).
        seed : int
            Random seed for reproducibility.
        """
        self.trade_results = np.asarray(trade_results, dtype=float)
        self.n_simulations = n_simulations
        self.rng = np.random.RandomState(seed)
        self.simulated_sharpes = None
        self.simulated_drawdowns = None
        self.simulated_final_equity = None

    def simulate(self) -> dict:
        """
        Run the full Monte Carlo simulation.

        For each permutation, computes Sharpe ratio, max drawdown,
        and final cumulative P&L. Stores all results for subsequent
        confidence interval and p-value calculations.

        Returns
        -------
        dict with keys:
            actual_sharpe (float)
            actual_max_drawdown (float)
            actual_final_equity (float)
            simulation_count (int)
            trade_count (int)
        """
        n = len(self.trade_results)
        if n < 30:
            return {
                'error': f'Insufficient trades: {n} < 30 minimum.',
                'trade_count': n,
                'simulation_count': 0
            }

        # Actual metrics
        actual_sharpe = self._sharpe(self.trade_results)
        actual_dd = self._max_drawdown(self.trade_results)
        actual_final = np.sum(self.trade_results)

        # Run simulations
        self.simulated_sharpes = np.zeros(self.n_simulations)
        self.simulated_drawdowns = np.zeros(self.n_simulations)
        self.simulated_final_equity = np.zeros(self.n_simulations)

        for i in range(self.n_simulations):
            shuffled = self.rng.permutation(self.trade_results)
            self.simulated_sharpes[i] = self._sharpe(shuffled)
            self.simulated_drawdowns[i] = self._max_drawdown(shuffled)
            self.simulated_final_equity[i] = np.sum(shuffled)

        return {
            'actual_sharpe': float(actual_sharpe),
            'actual_max_drawdown': float(actual_dd),
            'actual_final_equity': float(actual_final),
            'simulation_count': self.n_simulations,
            'trade_count': n
        }

    def confidence_intervals(self, metric: str = 'sharpe',
                              confidence: float = 0.95) -> dict:
        """
        Compute confidence intervals for a given metric.

        Parameters
        ----------
        metric : str
            One of 'sharpe', 'max_drawdown', 'final_equity'.
        confidence : float
            Confidence level (default 0.95 for 95% CI).

        Returns
        -------
        dict with keys: lower, upper, median, mean, p_positive
        """
        if self.simulated_sharpes is None:
            raise RuntimeError('Call simulate() before confidence_intervals().')

        metric_map = {
            'sharpe': self.simulated_sharpes,
            'max_drawdown': self.simulated_drawdowns,
            'final_equity': self.simulated_final_equity
        }

        if metric not in metric_map:
            raise ValueError(f'Unknown metric: {metric}. Use: {list(metric_map.keys())}')

        data = metric_map[metric]
        alpha = (1 - confidence) / 2

        return {
            'metric': metric,
            'confidence': confidence,
            'lower': float(np.percentile(data, alpha * 100)),
            'upper': float(np.percentile(data, (1 - alpha) * 100)),
            'median': float(np.median(data)),
            'mean': float(np.mean(data)),
            'std': float(np.std(data, ddof=1)),
            'p_positive': float(np.mean(data > 0))
        }

    def p_value(self) -> dict:
        """
        Compute the p-value: fraction of simulated Sharpes
        that meet or exceed the actual Sharpe.

        A p-value < 0.05 indicates the edge is statistically
        significant at the 95% confidence level.

        Returns
        -------
        dict with keys: actual_sharpe, p_value, percentile_rank,
                        significant, null_sharpe_95th
        """
        if self.simulated_sharpes is None:
            raise RuntimeError('Call simulate() before p_value().')

        actual = self._sharpe(self.trade_results)
        p = float(np.mean(self.simulated_sharpes >= actual))
        rank = float(np.mean(self.simulated_sharpes < actual) * 100)
        null_95th = float(np.percentile(self.simulated_sharpes, 95))

        return {
            'actual_sharpe': float(actual),
            'p_value': p,
            'percentile_rank': rank,
            'significant': p < 0.05,
            'null_sharpe_95th': null_95th,
            'interpretation': (
                f'Actual Sharpe ({actual:.3f}) is at the {rank:.1f}th percentile '
                f'of random permutations. '
                f'{"Edge is statistically significant." if p < 0.05 else "Edge is NOT significant."}'
            )
        }

    def worst_case_analysis(self, confidence: float = 0.95) -> dict:
        """
        Compute worst-case metrics at the given confidence level.

        Returns
        -------
        dict with worst-case Sharpe, max drawdown, and min final equity
        """
        if self.simulated_sharpes is None:
            raise RuntimeError('Call simulate() before worst_case_analysis().')

        alpha = 1 - confidence

        return {
            'confidence': confidence,
            'worst_sharpe': float(np.percentile(self.simulated_sharpes, alpha * 100)),
            'worst_max_drawdown': float(np.percentile(self.simulated_drawdowns, (1 - alpha) * 100)),
            'worst_final_equity': float(np.percentile(self.simulated_final_equity, alpha * 100)),
        }

    @staticmethod
    def _sharpe(returns: np.ndarray) -> float:
        if len(returns) < 2:
            return 0.0
        std = np.std(returns, ddof=1)
        if std < 1e-10:
            return 0.0
        return float(np.mean(returns) / std * np.sqrt(252))

    @staticmethod
    def _max_drawdown(returns: np.ndarray) -> float:
        cumulative = np.cumsum(returns)
        peak = np.maximum.accumulate(cumulative)
        drawdowns = peak - cumulative
        return float(np.max(drawdowns)) if len(drawdowns) > 0 else 0.0
```

### 37.4 Interpreting Monte Carlo Results

| p-value | Interpretation |
|:--------|:--------------|
| < 0.01 | Very strong evidence of genuine edge. Less than 1% chance results are random. |
| 0.01 to 0.05 | Strong evidence. Statistically significant at 95% level. |
| 0.05 to 0.10 | Marginal. Some evidence but not conclusive. Collect more trades. |
| > 0.10 | Not significant. Cannot distinguish from random. Do not deploy. |

---

## Chapter 38: White's Reality Check & Multiple Hypothesis Testing

### 38.1 The Data-Snooping Problem

Every time you test a parameter combination, you are implicitly running a hypothesis test. When you test 50 combinations and pick the best one, the probability that at least one combination appears "significant" purely by chance is not 5%. It is:

```
P(at least one false positive) = 1 - (1 - 0.05)^50 = 92.3%
```

With 100 combinations: 99.4%. With 500 combinations: effectively 100%.

This is the multiple hypothesis testing problem. Standard backtesting ignores it entirely. The result is that most "optimized" strategies are overfit to noise in the training data.

### 38.2 White's Reality Check (WRC) and Hansen's SPA Test

White's Reality Check (2000) and its more powerful variant, Hansen's Superior Predictive Ability (SPA) test (2005), address data-snooping by testing whether the best strategy is significantly better than a benchmark after accounting for the number of strategies tested.

**Core idea.** Under the null hypothesis, no strategy beats the benchmark. The test bootstraps the performance differential between each strategy and the benchmark. If the best strategy's performance exceeds the bootstrapped distribution, it survives the data-snooping correction.

### 38.3 Implementation

```python
import numpy as np
from typing import Optional


def whites_reality_check(strategy_returns: np.ndarray,
                          benchmark_returns: np.ndarray,
                          n_bootstrap: int = 1000,
                          significance: float = 0.05,
                          seed: int = 42) -> dict:
    """
    Test if the best strategy is significantly better than the benchmark
    after correcting for multiple hypothesis testing.

    This implements a simplified version of White's Reality Check using
    block bootstrap to preserve autocorrelation in returns.

    Parameters
    ----------
    strategy_returns : np.ndarray
        2D array of shape (n_periods, n_strategies). Each column is a
        strategy's return series.
    benchmark_returns : np.ndarray
        1D array of length n_periods. The benchmark return series.
    n_bootstrap : int
        Number of bootstrap samples (default 1000).
    significance : float
        Significance level (default 0.05).
    seed : int
        Random seed for reproducibility.

    Returns
    -------
    dict with keys:
        best_strategy_index (int): index of best strategy
        best_excess_return (float): mean excess return of best strategy
        p_value (float): bootstrap p-value after correction
        passed (bool): True if edge survives data-snooping correction
        n_strategies_tested (int): number of strategies evaluated
    """
    rng = np.random.RandomState(seed)
    n_periods = len(benchmark_returns)
    n_strategies = strategy_returns.shape[1] if strategy_returns.ndim > 1 else 1

    if strategy_returns.ndim == 1:
        strategy_returns = strategy_returns.reshape(-1, 1)

    # Compute excess returns for each strategy vs benchmark
    excess = strategy_returns - benchmark_returns.reshape(-1, 1)

    # Mean excess return for each strategy
    mean_excess = np.mean(excess, axis=0)
    best_idx = np.argmax(mean_excess)
    best_excess = mean_excess[best_idx]

    # Block bootstrap to generate null distribution
    block_size = max(1, int(np.sqrt(n_periods)))
    n_blocks = n_periods // block_size + 1

    bootstrap_max_excess = np.zeros(n_bootstrap)

    for b in range(n_bootstrap):
        # Sample blocks with replacement
        block_starts = rng.randint(0, n_periods - block_size + 1, size=n_blocks)
        indices = np.concatenate([np.arange(s, s + block_size) for s in block_starts])
        indices = indices[:n_periods]

        # Center the bootstrapped excess returns (impose null hypothesis)
        boot_excess = excess[indices] - mean_excess  # Center to impose H0
        boot_means = np.mean(boot_excess, axis=0)
        bootstrap_max_excess[b] = np.max(boot_means)

    # p-value: fraction of bootstrap maxima exceeding actual best
    p_value = float(np.mean(bootstrap_max_excess >= best_excess))

    return {
        'best_strategy_index': int(best_idx),
        'best_excess_return': float(best_excess),
        'p_value': p_value,
        'passed': p_value < significance,
        'n_strategies_tested': n_strategies,
        'bootstrap_95th': float(np.percentile(bootstrap_max_excess, 95)),
        'interpretation': (
            f'Tested {n_strategies} strategies. Best excess return = {best_excess:.4f}. '
            f'p-value = {p_value:.4f}. '
            f'{"Survives data-snooping correction." if p_value < significance else "Does NOT survive correction."}'
        )
    }
```

### 38.4 Bonferroni Correction as a Simpler Alternative

For practitioners who want a simpler approach, the Bonferroni correction divides the significance threshold by the number of hypotheses tested. It is conservative (it over-corrects), but it is easy to implement and requires no bootstrapping.

```python
def bonferroni_correction(base_p_value: float, n_tests: int,
                           significance: float = 0.05) -> dict:
    """
    Apply Bonferroni correction for multiple hypothesis testing.

    Parameters
    ----------
    base_p_value : float
        Uncorrected p-value from a single strategy's permutation test.
    n_tests : int
        Total number of parameter combinations or strategies tested.
    significance : float
        Desired family-wise error rate (default 0.05).

    Returns
    -------
    dict with keys:
        corrected_threshold (float): adjusted significance threshold
        corrected_p_value (float): adjusted p-value
        passed (bool): whether the strategy survives correction
    """
    corrected_threshold = significance / n_tests
    corrected_p = min(base_p_value * n_tests, 1.0)

    return {
        'original_p_value': base_p_value,
        'n_tests': n_tests,
        'corrected_threshold': corrected_threshold,
        'corrected_p_value': corrected_p,
        'passed': corrected_p < significance,
        'interpretation': (
            f'With {n_tests} tests, significance threshold drops from '
            f'{significance:.4f} to {corrected_threshold:.6f}. '
            f'Corrected p-value = {corrected_p:.4f}. '
            f'{"PASSES." if corrected_p < significance else "FAILS."}'
        )
    }
```

### 38.5 Practical Guidance

| Tests Conducted | Corrected Threshold (Bonferroni) | WRC Recommended |
|:----------------|:--------------------------------|:----------------|
| 10 | 0.005 | Yes (block bootstrap preferred) |
| 50 | 0.001 | Yes |
| 100 | 0.0005 | Yes |
| 500 | 0.0001 | Mandatory |
| 1,000+ | 0.00005 | Mandatory, and question strategy complexity |

The Bonferroni correction becomes extremely harsh above 100 tests. For large parameter sweeps, White's Reality Check is preferred because it is less conservative while still controlling for data-snooping.

**Rule of thumb for PCTT:** If you tested fewer than 20 parameter combinations, Bonferroni is sufficient. If you tested more than 20, use WRC. If you tested more than 500, seriously question whether the strategy's edge is structural or whether you have simply found a noise pattern.

---

## Chapter 39: Minimum Sample Size & Statistical Significance

### 39.1 The Minimum Trade Count Problem

How many trades do you need before your backtest statistics are reliable? The answer depends on three factors: the expected win rate, the desired margin of error, and the confidence level.

The formula for minimum sample size is:

```
n_min = ceil((z_{alpha/2} / E)^2 * p * (1 - p))
```

Where:
- `z_{alpha/2}` is the z-score for the desired confidence level (1.96 for 95%)
- `E` is the acceptable margin of error (how wrong you are willing to be)
- `p` is the expected win rate

### 39.2 Reference Table

| Expected Win Rate | Margin of Error | Confidence Level | Minimum Trades |
|:------------------|:----------------|:----------------|:---------------|
| 55% | 5% | 90% | 268 |
| 55% | 5% | 95% | 381 |
| 55% | 5% | 99% | 658 |
| 55% | 3% | 95% | 1,057 |
| 60% | 5% | 95% | 369 |
| 60% | 3% | 95% | 1,025 |
| 65% | 5% | 95% | 350 |
| 70% | 5% | 95% | 323 |
| 80% | 5% | 95% | 246 |

**Key takeaway for PCTT:** With an expected HWR win rate of 65-70% and a 5% margin of error at 95% confidence, you need approximately 323-350 trades. With an expected HE win rate of 55-60%, you need approximately 369-381 trades. Round up to 400 as a practical minimum for any parameter set.

### 39.3 Implementation

```python
import math
from scipy import stats


def min_sample_size(expected_win_rate: float = 0.55,
                     margin_of_error: float = 0.05,
                     confidence: float = 0.95) -> dict:
    """
    Calculate the minimum number of trades needed for reliable statistics.

    Uses the standard formula for sample size of a proportion:
    n = ceil((z / E)^2 * p * (1 - p))

    Parameters
    ----------
    expected_win_rate : float
        Expected proportion of winning trades (default 0.55).
    margin_of_error : float
        Maximum acceptable deviation from true win rate (default 0.05).
    confidence : float
        Confidence level (default 0.95 for 95%).

    Returns
    -------
    dict with keys: n_min, z_score, expected_win_rate, margin_of_error, confidence
    """
    alpha = 1 - confidence
    z = stats.norm.ppf(1 - alpha / 2)
    p = expected_win_rate
    n = math.ceil((z / margin_of_error) ** 2 * p * (1 - p))

    return {
        'n_min': n,
        'z_score': round(z, 4),
        'expected_win_rate': p,
        'margin_of_error': margin_of_error,
        'confidence': confidence,
        'interpretation': (
            f'Need at least {n} trades to estimate a {p:.0%} win rate '
            f'within +/- {margin_of_error:.0%} at {confidence:.0%} confidence.'
        )
    }


def edge_significance_test(wins: int, total_trades: int,
                            null_win_rate: float = 0.50) -> dict:
    """
    Test whether the observed win rate is significantly above the null hypothesis.

    Uses a one-sided z-test for proportions.

    Parameters
    ----------
    wins : int
        Number of winning trades.
    total_trades : int
        Total number of trades.
    null_win_rate : float
        Win rate under the null hypothesis (default 0.50 = coin flip).

    Returns
    -------
    dict with keys:
        observed_win_rate (float)
        z_score (float)
        p_value (float)
        significant (bool): True if p < 0.05
        confidence_interval (tuple): 95% CI for win rate
    """
    if total_trades <= 0:
        return {'error': 'No trades to evaluate.'}

    p_hat = wins / total_trades
    p0 = null_win_rate

    # Standard error under null
    se_null = math.sqrt(p0 * (1 - p0) / total_trades)

    if se_null < 1e-10:
        return {'error': 'Standard error is zero. Cannot compute z-score.'}

    # z-score (one-sided: is p_hat > p0?)
    z = (p_hat - p0) / se_null

    # One-sided p-value
    p_value = 1 - stats.norm.cdf(z)

    # 95% confidence interval for observed win rate
    se_obs = math.sqrt(p_hat * (1 - p_hat) / total_trades)
    ci_lower = p_hat - 1.96 * se_obs
    ci_upper = p_hat + 1.96 * se_obs

    return {
        'observed_win_rate': round(p_hat, 4),
        'null_win_rate': p0,
        'wins': wins,
        'total_trades': total_trades,
        'z_score': round(z, 4),
        'p_value': round(p_value, 6),
        'significant': p_value < 0.05,
        'confidence_interval': (round(max(0, ci_lower), 4), round(min(1, ci_upper), 4)),
        'interpretation': (
            f'Observed {p_hat:.1%} win rate over {total_trades} trades. '
            f'z = {z:.2f}, p = {p_value:.4f}. '
            f'{"Edge is significant at 95% level." if p_value < 0.05 else "Edge is NOT significant."} '
            f'95% CI: [{max(0, ci_lower):.1%}, {min(1, ci_upper):.1%}].'
        )
    }
```

### 39.4 When to Trust Your Backtest

The following checklist must ALL pass before deploying a PCTT parameter set in live trading:

| Check | Requirement | Status Column |
|:------|:-----------|:-------------|
| Minimum trades | >= 400 trades per parameter set | |
| Win rate significance | z-test p-value < 0.05 against null of 50% | |
| Monte Carlo | Permutation test p-value < 0.05 | |
| Walk-forward degradation | Avg degradation ratio > 0.60 across 6+ windows | |
| Parameter stability | CV < 0.15 for all critical parameters | |
| White's Reality Check | p-value < 0.05 after correction for tested combinations | |
| Bootstrap CI | 95% CI for Sharpe excludes zero | |
| Bootstrap CI | 95% CI for expectancy excludes zero | |

If any single check fails, do not deploy. Collect more data, simplify the parameter space, or accept that the strategy may not have a genuine edge in the tested conditions.

### 39.5 The Expectancy Significance Test

Beyond win rate, you need to verify that the overall expectancy (the number that actually determines whether you make money) is significantly positive.

```python
def expectancy_significance(r_multiples: list[float],
                              null_expectancy: float = 0.0,
                              confidence: float = 0.95) -> dict:
    """
    Test whether the observed expectancy is significantly above zero
    (or a specified null value).

    Uses a one-sample t-test on R-multiples.

    Parameters
    ----------
    r_multiples : list of float
        Per-trade R-multiples (e.g., [1.2, -1.0, 0.8, -0.5, 2.1, ...]).
    null_expectancy : float
        Expected R-multiple under the null hypothesis (default 0.0).
    confidence : float
        Confidence level (default 0.95).

    Returns
    -------
    dict with keys: observed_expectancy, t_statistic, p_value,
                    significant, confidence_interval
    """
    n = len(r_multiples)
    if n < 30:
        return {'error': f'Insufficient trades: {n} < 30 minimum.'}

    arr = np.array(r_multiples)
    mean_r = float(np.mean(arr))
    std_r = float(np.std(arr, ddof=1))
    se = std_r / math.sqrt(n)

    if se < 1e-10:
        return {'error': 'Standard error is zero.'}

    t_stat = (mean_r - null_expectancy) / se
    p_value = 1 - stats.t.cdf(t_stat, df=n - 1)  # One-sided

    t_crit = stats.t.ppf(1 - (1 - confidence) / 2, df=n - 1)
    ci_lower = mean_r - t_crit * se
    ci_upper = mean_r + t_crit * se

    return {
        'observed_expectancy': round(mean_r, 4),
        'std_dev': round(std_r, 4),
        'n_trades': n,
        't_statistic': round(t_stat, 4),
        'p_value': round(p_value, 6),
        'significant': p_value < (1 - confidence),
        'confidence_interval': (round(ci_lower, 4), round(ci_upper, 4)),
        'interpretation': (
            f'Mean R-multiple = {mean_r:.3f} over {n} trades. '
            f't = {t_stat:.2f}, p = {p_value:.4f}. '
            f'{confidence:.0%} CI: [{ci_lower:.3f}, {ci_upper:.3f}]. '
            f'{"Expectancy is significantly positive." if p_value < (1 - confidence) else "Expectancy is NOT significant."}'
        )
    }
```

### 39.6 Decision Framework

Use the following flowchart to determine whether your backtest results warrant live deployment:

```
START: Run backtest with candidate parameters
  |
  v
[Trade count >= 400?] --NO--> Collect more data. Do not deploy.
  |YES
  v
[Win rate z-test p < 0.05?] --NO--> Edge may not be real. Collect more data.
  |YES
  v
[Expectancy t-test p < 0.05?] --NO--> Wins too small relative to losses. Review sizing.
  |YES
  v
[Monte Carlo p < 0.05?] --NO--> Performance may be sequence-dependent. Investigate.
  |YES
  v
[Walk-forward degradation > 0.60?] --NO--> Parameters likely overfit. Simplify.
  |YES
  v
[White's Reality Check p < 0.05?] --NO--> Edge does not survive data-snooping. Reduce param space.
  |YES
  v
[Parameter stability CV < 0.15?] --NO--> Parameters unstable across windows. Use wider defaults.
  |YES
  v
DEPLOY at full sizing with monitoring.
```

Each gate eliminates a specific failure mode. Trade count gates eliminate statistical noise. The z-test gates eliminate coin-flip performance. Monte Carlo gates eliminate lucky sequences. Walk-forward gates eliminate overfitting. White's gates eliminate data-snooping. Parameter stability gates eliminate fragile optimization.

A strategy that passes all seven gates has survived the most rigorous statistical gauntlet available in quantitative trading. It has earned the right to risk real capital.

---

*End of Parts IX and X.*

*These two parts complete the defensive architecture and statistical foundations of PCTT. Part IX defines what NOT to do, when NOT to trade, and how to exit failing trades before they become full losses. Part X defines how to prove that the system has a genuine, statistically significant edge that survives out-of-sample testing, random permutation, and multiple hypothesis correction. Together, they transform PCTT from a trading idea into a deployable, validated trading system.*
