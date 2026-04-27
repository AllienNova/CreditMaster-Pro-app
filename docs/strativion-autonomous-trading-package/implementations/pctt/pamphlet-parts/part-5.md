# PART V: 30-LAW INTEGRATION — PCTT AS PHYSICS-BASED TRADING

---

## Chapter 11: Laws 1-10 — The Foundation Laws in PCTT

The first ten laws describe the physics of price movement. They govern how markets move, why they move, and what forces cause transitions between states. Each one maps to a specific, quantifiable stage of the PCTT pipeline. This is not metaphor. These are engineering specifications.

---

### Law 1: Market Inertia — Break Detection (Stage 7)

Inertia is the tendency of a trend to persist until sufficient force acts upon it. A trendline with a Q-Score of 0.72 and four confirmed touches over 150 bars represents significant structural inertia. That line will not break from random noise. It requires genuine force: institutional selling, macro catalyst, or structural exhaustion.

PCTT quantifies inertia through the two-stage break detection. A break requires both penetration (wick below line minus beta_p times ATR) and close confirmation (close below line minus beta_c times ATR). Neither alone is sufficient. Penetration without close confirmation is a stop hunt. Close confirmation without penetration is a drift. Both together represent the force overcoming inertia.

The force required to overcome inertia is proportional to the Q-Score. Higher Q lines represent more structural inertia and demand stronger break confirmation. This is implemented through adaptive beta_c scaling:

```
beta_c = 0.15 * (1 + 0.5 * (Q - 0.55) / (0.70 - 0.55))
```

At Q = 0.55 (B-Grade threshold): beta_c = 0.15 ATR. Standard confirmation.
At Q = 0.70 (A-Grade threshold): beta_c = 0.1875 ATR. 25% more break force required.
At Q = 0.85 (exceptional line): beta_c = 0.225 ATR. 50% more force.

Agent implementation: when the break detection module runs at Stage 7, pull the Q-Score from Stage 4 output. Compute the adjusted beta_c. Apply the scaled confirmation buffer to the break test. Log both the raw and adjusted beta_c values for calibration review.

---

### Law 2: Feedback Loops — Retest Mechanics (Stage 9)

Markets exhibit two feedback modes. Positive feedback drives cascading moves: a break triggers stops, which trigger more selling, which triggers more stops. Negative feedback pulls price back toward equilibrium: the break overshoots, sellers exhaust, and price retraces toward the broken level.

PCTT captures both. The break is positive feedback (cascade). The retest is negative feedback (reversion to broken level). The rejection is the reassertion of positive feedback in the new direction.

The retest window M defines the expected duration of the negative feedback cycle. It is the time required for the reversion force to pull price back to the broken level. M is regime-dependent:

| Regime | M (bars) | Rationale |
|:-------|:---------|:----------|
| STRONG_TREND | 12 | Weaker reversion force in strong trends, retests take longer |
| TREND | 10 | Standard reversion cycle |
| TRANSITIONAL | 6 | Stronger reversion force, faster retests |

Agent implementation: after a confirmed break at Stage 7, start the retest countdown. At each bar, check whether price has returned to within gamma times ATR of the frozen Action Line. If the countdown reaches M without a retest, invalidate the setup and return to IDLE. The feedback loop has dissipated.

---

### Law 3: Volatility Compression — Regime Detection (Stage 6)

Compression before expansion is a fundamental pattern across physical and financial systems. Springs compress before releasing. Markets consolidate before trending. Volatility contracts before exploding.

PCTT detects compression through the ATR ratio:

```
ATR_ratio = ATR(5) / ATR(50)
```

ATR_ratio below 0.70 for 3 or more consecutive bars signals compression. When compression is detected, the PCTT response is specific:

1. Reduce position size to 25% of normal (compression environments produce whipsaws that destroy capital).
2. Prepare for volatility expansion by widening the trailing stop ATR multiplier by 1.5x once a break occurs during expansion.
3. Raise the minimum Q-Score threshold by 0.05 (from 0.55 to 0.60) because structure formed during compression is less reliable.

This is precisely why PCTT refuses to trade RANGING regimes. Ranging markets are often compression zones where both support and resistance are being tested repeatedly. Breaks in these environments have the lowest follow-through rate because the compressed energy can release in either direction.

Agent implementation: at Stage 6, compute ATR_ratio. If below 0.70 for 3+ bars, set the compression flag. Pass this flag downstream to Stage 10 (position sizing) and Stage 11 (trailing stop). Log the compression duration for calibration analysis.

---

### Law 4: Order Flow Mechanics — Volume Confirmation (Stage 7)

Price moves on volume, not on time. A break bar with 2x average volume tells a fundamentally different story than a break bar with 0.6x average volume. The first represents institutional participation. The second represents a drift into a level with no conviction behind it.

PCTT's volume confirmation threshold:

```
volume_confirmed = break_bar_volume > 1.2 * SMA(volume, 20)
```

When volume is confirmed, the break proceeds through the pipeline at full grade. When volume is absent (below 1.2x threshold), the setup is downgraded to B-Grade maximum regardless of Q-Score. An A-Grade line broken on thin volume is treated as a B-Grade setup.

Volume at the retest bar provides the inverse signal. Declining volume during the retest (retest_volume < 0.8 * SMA(volume, 20)) indicates weak counter-trend participation. The sellers (for a bearish break) are not showing up to defend the old level. This is bullish for the rejection thesis.

Agent implementation: at Stage 7, pull the 20-bar volume SMA. Compare break bar volume. If below threshold, set grade_cap = 'B'. At Stage 9, compare retest bar volume to the same SMA. Log volume ratios for both break and retest bars.

Note: volume confirmation is optional for spot FX (where volume data reflects only the broker's flow, not the full market) but mandatory for equities, futures, and crypto.

---

### Law 5: Mean Reversion — Retest Probability (Stage 9)

After any displacement from equilibrium, systems tend to return toward the center. The break displaces price from the structural level. Mean reversion is the force that brings it back. This return is the retest.

Retest probability is not constant. It increases with three measurable factors:

1. Displacement distance. The farther price moves from the broken line, the stronger the reversion pull. Breaks that travel 2+ ATR from the Action Line have higher retest probability than breaks that stall at 0.5 ATR.
2. Q-Score. Higher quality lines create stronger gravitational pull because more market participants recognize the level. A line with Q = 0.80 and 5 touches has thousands of traders anchored to it.
3. Time since break. Retest probability rises during bars 3 through 8 after the break, then declines. The peak retest window is typically bars 4 through 7.

PCTT leverages mean reversion by design. The entire strategy is built on expecting the retest rather than chasing the initial break. Chasing the break is a positive-feedback bet (hoping the cascade continues). Waiting for the retest is a negative-feedback bet (knowing that reversion is statistically likely), followed by a positive-feedback bet (the rejection confirms continuation).

Agent implementation: after a break at Stage 7, do not enter. Wait. Monitor the distance from price to the frozen Action Line each bar. Log the displacement trajectory. Enter only when price returns to within gamma times ATR of the line AND the rejection scores 3 of 4 or higher.

---

### Law 6: Fractal Structure — Multi-Timeframe (Stage 5)

The same structural patterns repeat at every timescale. A pivot on the 15-minute chart is structurally identical to a pivot on the daily chart. The only difference is magnitude. This self-similarity is the fractal property of markets.

PCTT exploits fractal structure through the three-layer timeframe stack:

```
MACRO pivots (Daily/Weekly) contain MESO pivots (4H) contain MICRO pivots (1H/15m)
```

Q-Scores compound across timeframes. A MACRO support line with Q = 0.72 containing a MESO support line with Q = 0.68 gives a structural confidence product of 0.72 * 0.68 = 0.49. This compound score feeds into the confluence calculation, providing a multi-scale quality measure that no single timeframe can achieve.

The adaptive zigzag respects fractal nature. The threshold kappa = 5.0 * ATR ensures that the zigzag resolution automatically adjusts to the timescale. On a daily chart with ATR = 50 points, kappa = 250 points, filtering out pivots smaller than 250 points. On a 15-minute chart with ATR = 8 points, kappa = 40 points, capturing the finer structural detail.

Agent implementation: run the pivot detection and boundary estimation pipeline independently on each timeframe layer. Pass MACRO direction and Q-Score as a gate to the MESO layer. Pass MESO Q-Score and setup details as a gate to the MICRO entry layer. Require alignment across all three layers before proceeding to Stage 7.

---

### Law 7: Position Sizing — Risk Geometry (Stage 10)

Position size is the only variable you fully control. You cannot control where price goes. You cannot control volatility. You cannot control gaps. You can control exactly how many shares or contracts you buy.

PCTT's position sizing formula:

```
Size = (Equity * Risk% * S(DD)) / (dGeom * ATR)
```

Where:
- Risk% is determined by grade: A-Grade = 1.0%, B-Grade = 0.5%
- S(DD) is the drawdown scaling factor: S(DD) = max(0, 1 - DD / 0.20)
- dGeom is the distance from entry to Safety Line in ATR units
- ATR is the current 14-period Average True Range

The denominator (dGeom * ATR) converts the stop distance to price units. The numerator caps the dollar risk per trade. The result is the maximum position size that keeps risk within bounds.

Subject to portfolio constraints:
- Single position risk cannot exceed Risk% * S(DD) of equity
- Total portfolio heat (sum of all open position risks) cannot exceed 6%
- Same-sector correlated positions: maximum 2 concurrent trades
- Single position cannot exceed 1% of average daily volume (liquidity cap)

Agent implementation: at Stage 10, compute Size using the formula above. Check all four constraints. Take the minimum of the formula-derived size and each constraint-derived maximum. Log which constraint was binding. If the binding constraint produces a position smaller than the minimum viable size (defined as 0.1% of equity in expected P&L at 1R), skip the trade.

---

### Law 8: Market Regimes — Regime Gate (Stage 6)

Markets alternate between trending and ranging states. In trending regimes, breaks follow through. In ranging regimes, breaks fail. This is not sometimes true. It is structurally true: the break-retest pattern requires directional follow-through, which by definition does not exist in a ranging market.

PCTT operates exclusively in TRENDING and TRANSITIONAL regimes. The RANGING and CHOPPY regimes are hard no-trade zones. This single filter, the refusal to trade in unfavorable regimes, adds an estimated 15 to 20 percentage points to win rate because it eliminates the category of trades most likely to fail.

The six-method ensemble ensures robust regime classification:

| Method | Weight | Trending Signal | Ranging Signal |
|:-------|:-------|:---------------|:---------------|
| Efficiency Ratio | 0.25 | ER >= 0.40 | ER <= 0.20 |
| Crossing Count | 0.20 | CC <= 6 | CC >= 14 |
| Hurst Exponent | 0.20 | H > 0.60 | H < 0.42 |
| Kalman Slope | 0.15 | norm_slope > 1.5 | norm_slope < 0.5 |
| CUSUM | 0.10 | No change point | Change point detected |
| Volatility | 0.10 | Normal ATR | Extreme ATR |

Weighted consensus determines the classification. The highest-scoring regime wins.

Agent implementation: at Stage 6, run all six methods. Compute weighted scores. If the winning regime is RANGING or CHOPPY, halt the pipeline immediately. Return NO_TRADE. Do not proceed to Stage 7 regardless of Q-Score quality. Log the regime classification and individual method votes for diagnostic review.

---

### Law 9: Information Decay — Time Stop (Stage 11, Phase 5)

Information has a half-life. The break signal at bar T carries maximum informational value at T. By bar T+5, some of that information has been priced in. By bar T+12, most of it has dissipated. By bar T+20, the original break is ancient history in market time.

PCTT implements information decay through two time-based mechanisms:

Retest timeout: if no retest occurs within M bars of the break, the setup is void. The break signal has decayed below the threshold needed for a reliable retest trade. M ranges from 6 bars (transitional regime) to 12 bars (strong trend).

Stagnation exit (Phase 5 time stop): if a position has been open for the mode-dependent maximum bars and unrealized P&L has not reached +0.5R, exit at market. The trade thesis has neither been confirmed nor invalidated. It is simply stale. Holding a stagnant position ties up capital and psychological bandwidth.

```
Time stop trigger:
  HIGH_WIN_RATE mode: 12 bars without reaching +0.5R
  HIGH_EXPECTANCY mode: 20 bars without reaching +0.5R
```

Agent implementation: at Stage 9, start the retest countdown from the break bar. Track bars elapsed. If M is reached without a valid retest, transition FSM to IDLE and log "retest_timeout." After entry at Stage 10, start the stagnation counter. At each bar, check max_unrealized_R. If the time stop triggers, exit on close and log "stagnation_exit" with the actual elapsed bars and max R achieved.

---

### Law 10: Time Delays — Pivot Confirmation (Stage 1)

The R-bar confirmation delay is the price of certainty. With R = 2, a swing low at bar 50 is not confirmed until bar 52. Those two bars of delay mean you will never catch the exact bottom. You will always enter after the turn has been confirmed.

This delay is a feature, not a bug. Without it, pivots repaint. A tentative pivot at bar 50 can be invalidated at bar 51 if price makes a new low. The R-bar delay guarantees that once a pivot is confirmed, it never disappears.

The cost of delay is knowable and bounded:

```
Missed move = R bars of trend movement
Typical cost = R * average_bar_range = 2 * (0.5 to 0.7) * ATR = 1.0 to 1.4 ATR
```

This is a fixed cost paid once per trade. The benefit is that every confirmed pivot is structurally real. No phantom pivots. No disappearing support levels. No repainting boundaries. The entire downstream pipeline (line generation, Q-Score, break detection) operates on structurally verified inputs.

Agent implementation: in Stage 1, never flag a pivot until R bars have elapsed after the swing point. Store tentative pivots separately from confirmed pivots. Only confirmed pivots are passed to Stage 2 for line generation. Log the confirmation delay for each pivot (always R bars, but track timestamp for audit purposes).

---

## Chapter 12: Laws 11-20 — The Analysis Laws in PCTT

The middle ten laws govern how to analyze, measure, and validate market information. They transform raw observation into actionable intelligence. In PCTT, these laws define how structure is identified, scored, filtered, and confirmed.

---

### Law 11: Structural Levels — Pivot Detection (Stage 1)

Pivots are structural levels. A pivot low at 142.30 with R = 2 confirmation means the market tested 142.30, decided it was too low, and reversed. That decision is structural information. It tells you that at 142.30, buyers overwhelmed sellers with enough force to reverse the local trend for at least R bars.

A Q-Score measures how structurally significant a line connecting pivots is. A line through 4 pivot lows over 120 bars with zero violations (Q = 0.78) is a structural level that the market has validated repeatedly. A line through 2 pivot lows over 25 bars with 1 violation (Q = 0.52) is noise masquerading as structure.

Agent implementation: the output of Stage 1 is the raw material for all downstream analysis. Every confirmed pivot is tagged with: bar index, price, type (high/low), classification (HH/HL/LH/LL), and the ATR at confirmation time. This metadata persists through the entire pipeline lifetime.

---

### Law 12: Momentum — Break Force (Stage 7)

Momentum measures the force behind a move. A break bar with a large body (close far from open), high volume, and price traveling through the boundary in a single bar represents high momentum. A break bar with a small body, average volume, and price barely closing below the boundary represents low momentum.

High-momentum breaks produce better follow-through because they represent genuine conviction. Low-momentum breaks are more likely to fail because they may be passive drift rather than active selling/buying.

Optional enhancement: add a momentum score to the break detection output.

```
momentum_score = (body_size / ATR) * (volume / SMA(volume, 20))
```

Where body_size = abs(close - open). A momentum_score above 1.5 indicates strong break force. Below 0.5 indicates weak break force.

The Kalman-filtered slope magnitude serves as a secondary momentum proxy. If the Kalman slope is accelerating in the break direction (slope of slope has the same sign as the break), momentum is confirmed.

Agent implementation: at Stage 7, compute momentum_score alongside the standard break test. Store it in the trade record. Use it as a tiebreaker when multiple setups compete for capital allocation. Higher momentum_score gets priority.

---

### Law 13: Momentum Persistence — Trailing Stop Phase Selection (Stage 11)

Strong momentum should be given room to run. Weak momentum should be protected immediately. The trailing stop must adapt to the current momentum state, not use a one-size-fits-all approach.

PCTT implements this through Phase 6 of the 7-phase trailing stop (slope momentum tightening):

```
Kalman momentum ratio = current_slope_magnitude / entry_slope_magnitude

Ratio >= 0.6: Momentum healthy. No trailing stop adjustment. Let it run.
Ratio 0.3 to 0.6: Momentum decaying. Tighten stop by 30% (move 30% closer to current price).
Ratio < 0.3: Momentum exhausted. Move stop to breakeven or better.
```

This creates a dynamic relationship between trend health and capital protection. When the trend is strong, the stop stays wide to avoid premature exit. When the trend weakens, the stop tightens to lock in profits before the reversal.

Agent implementation: at each bar after entry, compute the Kalman slope magnitude. Divide by the slope magnitude at entry time. Apply the Phase 6 tightening rules. Ensure monotonic enforcement: the stop can only move in the profitable direction. Log the momentum ratio at each bar for post-trade analysis.

---

### Law 14: Path Dependency — Phase Progression (Stage 11)

How you got here determines where you can go. The 7-phase trailing stop is explicitly path-dependent. Phase 3 (partial profit) cannot be reached without passing through Phase 2 (breakeven lock). Phase 4 (pivot trail) cannot be reached without passing through Phase 3.

This path dependency is not arbitrary. It reflects the structural reality of trade evolution:

1. Phase 1 (structural stop): the trade is in its infancy. Stop at Safety Line.
2. Phase 2 (breakeven): the trade has proven viable at +0.8R. Remove the possibility of loss.
3. Phase 3 (partial profit): the trade has reached +1.0R (HWR) or +1.5R (HE). Bank the majority.
4. Phase 4 (pivot trail): the remainder follows market structure.
5. Phase 5 (time stop): if stagnation occurs, exit.
6. Phase 6 (momentum tightening): adapt to decaying momentum.
7. Phase 7 (circuit breaker): emergency exit on extreme events.

The path matters because a trade that rockets to +2R in 3 bars (fast win) behaves differently from a trade that grinds to +2R over 18 bars (slow grind). The fast win likely has momentum continuation potential. The slow grind may be exhausting buyers. Phase progression captures this distinction.

Agent implementation: maintain a phase_state variable for each open position. At each bar, evaluate phase transition conditions in order. Once a phase is entered, it cannot be reverted to a prior phase. The phase_state is logged at every bar for the position's lifetime.

---

### Law 15: Signal Filtration — Q-Score (Stage 4)

Most signals in financial markets are noise. The Q-Score is the primary filter that separates structural signal from random noise. Only boundaries with Q >= 0.55 generate trade signals. Everything below is rejected as insufficiently evidenced.

The confluence score is the meta-filter. Even after Q-Score qualification, the setup must pass the multi-timeframe confluence test with a minimum score of 0.60:

```
Confluence = 0.30 * macro_strength + 0.40 * meso_q_score + 0.25 * (rejection_score / 4) + 0.05 * volume_flag
```

Together, Q-Score filtration and confluence scoring reject approximately 70% of all potential signals. This rejection rate is the source of PCTT's edge. The 70% rejected signals would have been predominantly losers. The 30% that pass are the high-probability setups.

Agent implementation: at Stage 4, compute Q-Score for every candidate boundary. Hard-reject all Q < 0.55. At the confluence stage (after retest and rejection), compute the weighted confluence score. Hard-reject all confluence < 0.60. Log both the Q-Score and confluence score for every evaluated setup, including rejected ones, for filter effectiveness analysis.

---

### Law 16: Sample Size — Calibration (Ongoing)

A Q-Score of 0.72 means nothing until it has been validated against actual outcomes. Isotonic calibration maps Q-Scores to empirical success probabilities, but this mapping requires sufficient data to be statistically reliable.

Calibration thresholds:
- Minimum 500 completed trades before trusting the Q-to-probability mapping
- Brier score monitoring on a rolling 200-trade window
- Brier < 0.20: calibration is good
- Brier 0.20 to 0.25: calibration is adequate, monitor closely
- Brier 0.25 to 0.30: calibration is degrading, alert triggered
- Brier > 0.30: calibration has failed, system halts for recalibration

Parameter optimization requires walk-forward validation with a minimum of 6 windows, each containing at least 100 trades in the test portion. Fewer than 6 windows means insufficient data to distinguish robust parameters from curve-fitted ones.

Agent implementation: maintain a trade outcome database. After each trade closes, update the isotonic calibration model (if 500+ trades exist). Compute Brier score on the rolling 200-trade window. If Brier exceeds 0.30, set system_state = HALTED and log "calibration_failure." Resume only after recalibration is complete and Brier returns below 0.25.

---

### Law 17: Statistical Significance — Q-Score Validation (Stage 4)

The Q-Score must predict actual outcomes. A scoring function that ranks lines but does not correlate with trade success is decorative, not functional.

Validation requirements:
- Brier score < 0.25 for adequate predictive calibration
- If Brier exceeds 0.30, the system halts because the scoring function no longer predicts reality
- Monte Carlo bootstrap (10,000 iterations) for confidence intervals on all performance metrics
- Walk-forward degradation ratio must stay below 0.30 (test performance within 70% of train performance)

The distinction between Law 16 and Law 17 is subtle but critical. Law 16 is about having enough data. Law 17 is about the data confirming the model. You can have 10,000 trades (Law 16 satisfied) and still have a Brier score of 0.40 (Law 17 violated). Sample size is necessary but not sufficient.

Agent implementation: after every 100 trades, run the bootstrap confidence interval calculation on Sharpe ratio, win rate, and profit factor. If the 95% confidence interval for Sharpe includes zero, flag "edge_significance_warning." If it includes zero after 500+ trades, flag "edge_not_significant" and recommend system review.

---

### Law 18: Signal-to-Noise Ratio — Adaptive Zigzag (Stage 1)

The zigzag threshold determines whether a price swing is classified as a pivot or ignored as noise. Too low a threshold captures every micro-wiggle, flooding the pipeline with meaningless pivots. Too high a threshold misses genuine structural turns.

The adaptive threshold solves this:

```
kappa = 5.0 * ATR
```

When volatility is high (ATR = 80 points), kappa = 400 points. Only swings of 400+ points register as pivots. When volatility is low (ATR = 15 points), kappa = 75 points. Smaller swings now qualify. The zigzag automatically adjusts its resolution to match the current signal-to-noise ratio.

Agent implementation: at each bar, compute ATR. Multiply by 5.0 to get kappa. Pass kappa to the adaptive zigzag algorithm. Confirmed pivots must represent a reversal of at least kappa from the prior confirmed pivot. Log the kappa value at pivot confirmation time for reproducibility.

---

### Law 19: Edge Decay — Performance Monitoring (Ongoing)

Every trading edge decays over time as markets adapt, competition increases, and structural patterns evolve. An edge that produced a 62% win rate in 2023 may produce 48% in 2025. PCTT monitors its own edge through three rolling metrics:

1. Rolling 100-trade win rate. Baseline threshold: 55% (HWR mode) or 45% (HE mode). Below threshold triggers alert.
2. Rolling 50-trade Sharpe ratio. Baseline threshold: 0.50. Below threshold triggers alert.
3. Rolling 200-trade Brier score. Baseline threshold: 0.25. Above threshold triggers alert.

If win rate drops below baseline for 150 consecutive trades, or if expectancy (win_rate * avg_win - loss_rate * avg_loss) turns negative over any 100-trade window: pause the system. Conduct a full parameter review. Re-run walk-forward optimization.

Parameter re-optimization protocol: every 500 trades, run 6-window walk-forward on the most recent 2,000 trades. If optimal parameters have shifted by more than 20% from current values, implement the new parameters gradually (blend 50% old, 50% new for the next 100 trades, then switch fully).

Agent implementation: after every trade close, update all three rolling metrics. Check against thresholds. If any threshold is breached, set alert_level appropriately. If expectancy turns negative, set system_state = PAUSED. Log all metric values at every trade close for long-term edge tracking.

---

### Law 20: Journaling — Trade Logging (All Stages)

Every trade must record the complete state of all 12 pipeline stages at the time of entry and exit. Without this data, calibration is impossible, edge monitoring is impossible, and adaptation is impossible.

Minimum logged fields per trade:

| Category | Fields |
|:---------|:-------|
| Setup | Q-Score, touches, line_length, violations, touch_spacing, slope |
| Regime | ER, crossing_count, Hurst, Kalman_slope, ensemble_regime, confidence |
| Break | break_bar_volume_ratio, momentum_score, beta_c_adjusted, break_displacement |
| Retest | bars_to_retest, retest_displacement, retest_volume_ratio |
| Rejection | CLV, wick_body_ratio, direction_match, position_match, rejection_score |
| Entry | entry_price, dGeom, grade, confluence_score, position_size, risk_dollars |
| Management | phase_transitions (timestamp of each), max_favorable_excursion, max_adverse_excursion |
| Exit | exit_price, exit_reason, R_multiple, bars_held, phase_at_exit |
| Context | instrument, timeframe, date, mode (HWR/HE), drawdown_at_entry |

This data feeds back into calibration (Law 16), edge monitoring (Law 19), parameter optimization (Law 28), and every diagnostic review. Without logging, PCTT is flying blind.

Agent implementation: create a structured trade record at Stage 7 (break detection). Populate fields progressively as the trade moves through stages. Finalize the record at exit. Store in a persistent database with indexing on date, instrument, grade, regime, and exit_reason.

---

## Chapter 13: Laws 21-30 — The Risk Laws in PCTT

The final ten laws govern survival. They are not about finding better entries or timing exits more precisely. They are about ensuring that the account survives long enough for the edge to compound. Every law in this section overrides the analysis laws when they conflict. Survival always wins.

---

### Law 21: Position Sizing — Risk Geometry Filter (Stage 10)

Position size is determined by four variables: dGeom (distance to stop in ATR), Q-Score grade (A or B), drawdown level (current peak-to-trough), and portfolio constraints.

```
Size = (Equity * Risk% * S(DD)) / |Entry - Stop|

Where:
  Risk% = 1.0% for A-Grade, 0.5% for B-Grade
  S(DD) = max(0, 1 - DD / 0.20)
  |Entry - Stop| = dGeom * ATR + epsilon * ATR
```

Four constraints compete. The tightest one always wins:

1. Formula-derived size from the equation above
2. Portfolio heat limit: sum of all position risks cannot exceed 6% of equity
3. Same-sector limit: maximum 2 concurrent trades in the same sector
4. Liquidity cap: position cannot exceed 1% of average daily volume

Agent implementation: compute all four constraints independently. Take the minimum. If the minimum is below the viable threshold (position too small to be meaningful), skip the trade. Log which constraint was binding.

---

### Law 22: Invalidation — Safety Line (Stage 8)

Every trade needs a structural invalidation point that is defined before entry and never moved. The Safety Line is the opposite boundary of the same structural object that generated the Action Line.

If the Action Line is a broken support, the Safety Line is the resistance of that same channel. If the Action Line is a broken resistance, the Safety Line is the support of that same channel. Both are frozen at break time.

If the Safety Line is breached by a close, the trade thesis is dead. The old structure is reasserting itself. There is no "giving it room." There is no "adjusting the stop." The structural invalidation is binary.

```
Invalidation (long trade): close < Safety_Line_value - epsilon * ATR
Invalidation (short trade): close > Safety_Line_value + epsilon * ATR
```

Agent implementation: at each bar, compute the projected Safety Line value. Check against the close. If invalidated, exit at market on the next bar's open. Log "safety_line_invalidation" as the exit reason. Never modify the Safety Line after it is frozen.

---

### Law 23: Asymmetric Damage — Drawdown Scaling (Ongoing)

A 50% loss requires a 100% gain to recover. A 20% loss requires a 25% gain. The damage function is convex: each incremental percentage of drawdown requires disproportionately more recovery.

PCTT's drawdown scaling directly addresses this asymmetry:

```
S(DD) = max(0, 1 - DD / 0.20)

DD = 0%:    S = 1.00 (full size)
DD = 5%:    S = 0.75 (75% size)
DD = 10%:   S = 0.50 (50% size)
DD = 15%:   S = 0.25 (25% size)
DD = 20%:   S = 0.00 (ZERO new trades, complete halt)
```

This prevents the death spiral where a trader in drawdown increases size to "make it back," which increases the drawdown, which increases the desperation. PCTT mathematically prevents this by reducing exposure as drawdown deepens.

Agent implementation: at the start of each trading day, compute current drawdown from equity high-water mark. Apply S(DD) to all position sizing calculations. If S(DD) = 0, set system_state = HALTED. Log drawdown level and scaling factor daily.

---

### Law 24: Systemic Correlation — Portfolio Heat (Ongoing)

Correlated positions are one bet wearing multiple disguises. Five long positions in tech stocks are not five independent bets. When tech sells off, all five lose simultaneously. The portfolio heat calculation must account for this.

```
H_adj = SUM|w_i * Risk_i| + SUM_pairs(rho_ij * |w_i * w_j * Risk_i * Risk_j|^0.5)
```

Where rho_ij is the 60-bar rolling correlation between instruments i and j.

Maximum H_adj = 6% of equity. Same-sector positions: maximum 2 concurrent trades.

Crisis override: when VIX > 30 (or the instrument-equivalent volatility measure exceeds the 90th percentile of its 252-day distribution), halve all position sizes immediately. This applies to existing positions (reduce by 50% at market) and new entries (half normal size).

Agent implementation: maintain a correlation matrix updated daily for all traded instruments. At each new entry, recompute H_adj including the proposed position. If H_adj exceeds 6%, reject the trade. If VIX exceeds 30, apply the 50% size override to the entire portfolio. Log the correlation matrix snapshot and H_adj at each entry decision.

---

### Law 25: Execution Quality — Entry Timing (Stage 9-10)

Enter on the rejection bar close. Not before. Not on a limit order at the line. The rejection bar close is the confirmation that the level held. Entering before confirmation is gambling that the level will hold.

Slippage modeling by order type:

```
Limit order: expected_fill = close + 0.5 * spread
Market order: expected_fill = close + 1.0 * spread
```

Order type selection by Q-Score:

- Q > 0.70 (high confidence): use limit orders. The setup is strong enough to wait for a fill.
- Q 0.55 to 0.70 (moderate confidence): use market orders. Certainty of fill matters more than price improvement.

Agent implementation: at Stage 9, on the rejection bar close, determine order type based on Q-Score. For limit orders, set the limit price at the rejection bar close. For market orders, execute at the next bar's open with the slippage model applied. Log the expected fill, actual fill, and slippage for execution quality analysis.

---

### Law 26: Slippage and Costs — Transaction Cost Modeling

Every backtest and every live trade must include the full cost stack: spread, commission, slippage, and swap/financing for overnight holds.

```
Total round-trip cost = entry_spread + exit_spread + 2 * commission + entry_slippage + exit_slippage + swap_days * swap_rate
```

The minimum viable edge test:

```
If E(trade) < 2 * total_round_trip_cost: the edge does not exist after costs.
```

An edge that produces 0.15R per trade expectancy with 0.10R in round-trip costs is a 0.05R edge. Fragile. Likely to be wiped out by execution variance. The 2x multiplier provides a safety margin.

Agent implementation: before entering any trade, compute the expected round-trip cost. Compare against the historical expectancy for the current mode and grade. If expected cost exceeds 50% of expected edge, flag "marginal_edge_warning." Log all cost components for every trade.

---

### Law 27: Trading Psychology — Mechanical Execution

PCTT removes discretion. The 12-stage pipeline computes every decision. There are no "feel" trades. No "gut" overrides. No "this time is different."

The pipeline IS the discipline enforcement:

- Q-Score < 0.55? No trade. Not "but the chart looks good."
- dGeom > 2.5? No trade. Not "but the trend is so strong."
- Rejection score 2/4? No trade. Not "but it almost rejected."
- Portfolio heat at 5.8%? No trade. Not "just one more small position."

Agent implementation: the agent has no override capability. Every gate is a hard binary. Pass or fail. There is no "soft pass" or "exception." The only way to change the behavior is to change the parameters through the formal adaptation protocol (Law 28), which requires 500 trades of evidence.

---

### Law 28: Adaptation — Parameter Re-Optimization (Ongoing)

Markets change. The optimal Q-Score threshold in 2024 may differ from 2026. The optimal retest window in a low-volatility regime may differ from a high-volatility regime.

Adaptation protocol:
- Walk-forward re-optimization every 500 trades
- Use 6+ windows with 70/30 train/test split
- Track degradation ratio: (train_Sharpe - test_Sharpe) / train_Sharpe
- If degradation > 0.30 across 3+ windows, the parameters are overfit
- Regime-adaptive parameters change automatically with the regime ensemble (no manual intervention)

Gradual transition: when new optimal parameters are identified, blend 50% old and 50% new for 100 trades, then switch fully. This prevents abrupt behavioral changes.

Agent implementation: maintain a parameter version history. After every 500th trade, trigger the walk-forward optimization routine. Compare new optimal parameters to current parameters. If any parameter shifts by more than 20%, implement the blended transition. Log all parameter changes with the walk-forward evidence that justified them.

---

### Law 29: Probability of Ruin — Position Limits (Ongoing)

The probability of ruin must stay below 1%. This is not a guideline. It is a hard constraint that governs all sizing decisions.

Kelly fraction provides the theoretical maximum bet size:

```
f* = (p * b - q) / b

Where:
  p = win rate
  b = average win / average loss
  q = 1 - p
```

For PCTT in HWR mode (p = 0.80, b = 1.0): f* = (0.80 * 1.0 - 0.20) / 1.0 = 0.60 (60% of capital per trade, which is absurd in practice).

PCTT uses fractional Kelly at 25% to 50% of the theoretical optimum:

- A-Grade at 1.0% risk and B-Grade at 0.5% risk corresponds to approximately 25% Kelly for typical PCTT parameters
- This keeps the probability of ruin negligible (well below 0.1%) while still capturing the compounding benefits of edge

Agent implementation: after every 200 trades, recompute the Kelly fraction from empirical win rate and average R:R. Verify that current risk percentages (1.0% A, 0.5% B) are between 20% and 50% of the Kelly fraction. If current risk exceeds 50% of Kelly, reduce. If below 20%, the system is being too conservative relative to its demonstrated edge. Log Kelly calculations and the fractional Kelly ratio.

---

### Law 30: Survival — The Supreme Override (ALL Stages)

Survival overrides everything. Every other law, every other rule, every other parameter. If any risk limit is breached, trading stops.

The escalation ladder:

```
Daily loss > 2% of equity:           Stop trading for the rest of the day.
Weekly loss > 4%:                     Reduce all position sizes by 50% for the next week.
Monthly loss > 8%:                    System pause. Full parameter review before resuming.
Drawdown > 15%:                       Emergency mode. 25% position sizes only.
Drawdown > 20%:                       Complete trading halt. Zero new positions.
```

No exception. No override. No "but this is a great setup." No "but I need to recover." The escalation ladder is non-negotiable.

This is why Law 30 maps to ALL stages. The survival check runs before Stage 1 (should we even scan for setups today?) and after Stage 11 (should we keep this position open given the portfolio state?). It is the first check and the last check.

Agent implementation: at the start of every bar processing cycle, evaluate all five escalation conditions. If any condition is triggered, apply the corresponding action immediately. This check has priority over all pipeline stages. Log every escalation trigger with the exact metric value that caused it.

---

## Chapter 14: The 30-Law Quick Reference Matrix

| Law # | Law Name | PCTT Stage(s) | Quantitative Impact | Key Parameter | Agent Action |
|:------|:---------|:--------------|:-------------------|:-------------|:-------------|
| 1 | Market Inertia | 7 (Break Detection) | beta_c scales +22.5% for A-Grade lines | beta_c = 0.15 * (1 + 0.5*(Q-0.55)/0.15) | Scale break confirmation buffer by Q-Score |
| 2 | Feedback Loops | 9 (Retest) | Retest window M = 6-12 bars by regime | M = {6, 10, 12} per regime | Start retest countdown at break bar, invalidate at M |
| 3 | Volatility Compression | 6 (Regime) | Size to 25% when ATR_ratio < 0.70 for 3+ bars | ATR(5)/ATR(50) threshold = 0.70 | Set compression flag, reduce size, widen post-expansion trail 1.5x |
| 4 | Order Flow | 7 (Volume) | Downgrade to B-max if break volume < 1.2x SMA | volume_threshold = 1.2 * SMA(vol, 20) | Cap grade at B if volume unconfirmed |
| 5 | Mean Reversion | 9 (Retest) | Retest probability peaks at bars 4-7 post-break | gamma = 0.20 ATR proximity | Wait for retest, never chase the break |
| 6 | Fractal Structure | 5 (Multi-TF) | Compound Q: MACRO_Q * MESO_Q for structural confidence | kappa = 5.0 * ATR | Run independent pipelines per timeframe, gate MICRO by MACRO |
| 7 | Position Sizing | 10 (Entry) | Size = (Equity * Risk% * S(DD)) / (dGeom * ATR) | Risk% = {1.0%, 0.5%} by grade | Compute size, enforce 4 constraints, take minimum |
| 8 | Market Regimes | 6 (Regime Gate) | +15-20% win rate from regime filter alone | ER >= 0.25 to trade | Hard-reject RANGING/CHOPPY, 6-method ensemble |
| 9 | Information Decay | 11 Phase 5 | Exit stagnant trades at 12-20 bars without +0.5R | time_stop = {12, 20} by mode | Start bar counter at entry, exit if P&L < 0.5R at limit |
| 10 | Time Delays | 1 (Pivots) | R = 2 bars confirmation delay, costs ~1.0-1.4 ATR | R = 2 bars | Never confirm pivot before R bars elapsed |
| 11 | Structural Levels | 1 (Pivots) | Minimum 5 pivots, 20-bar span required | min_pivots = 5, min_span = 20 | Tag each pivot with metadata, pass only confirmed pivots downstream |
| 12 | Momentum | 7 (Break) | momentum_score = (body/ATR) * (vol/SMA_vol) | momentum_score threshold = 1.5 | Compute momentum_score, use for capital allocation priority |
| 13 | Momentum Persistence | 11 Phase 6 | Tighten stop 30% when momentum ratio drops to 0.3-0.6 | momentum_ratio thresholds = {0.6, 0.3} | Compute Kalman slope ratio vs entry, adjust trailing stop |
| 14 | Path Dependency | 11 (All Phases) | 7 sequential phases, each gated by prior phase completion | phase_state = {1..7} | Maintain phase_state per position, enforce sequential progression |
| 15 | Signal Filtration | 4 (Q-Score) | Reject ~70% of signals (Q < 0.55 or confluence < 0.60) | Q_min = 0.55, confluence_min = 0.60 | Hard-reject below thresholds, log all evaluated setups |
| 16 | Sample Size | Ongoing | Minimum 500 trades for calibration, 200-trade Brier window | calibration_window = 500 trades | Track trade count, halt if calibration data insufficient |
| 17 | Statistical Significance | 4 (Validation) | Brier < 0.25 adequate, > 0.30 system halt | brier_halt = 0.30 | Bootstrap CI every 100 trades, halt if Brier > 0.30 |
| 18 | Signal-to-Noise | 1 (Zigzag) | kappa adapts resolution to volatility automatically | kappa = 5.0 * ATR | Recompute kappa each bar, apply to zigzag threshold |
| 19 | Edge Decay | Ongoing | Alert if win rate < 55% (HWR) over 100 trades | rolling_window = 100 trades | Monitor 3 rolling metrics, pause if expectancy turns negative |
| 20 | Journaling | All Stages | 30+ fields logged per trade across 9 categories | Full trade record schema | Populate record progressively through pipeline, persist at exit |
| 21 | Position Sizing | 10 (Risk Filter) | 4 constraints: formula, heat 6%, sector 2, liquidity 1% ADV | H_max = 6%, sector_max = 2 | Compute all 4 constraints, enforce tightest |
| 22 | Invalidation | 8 (Safety Line) | Binary exit if Safety Line breached by close | epsilon = 0.10-0.20 ATR | Check Safety Line projection each bar, exit immediately if breached |
| 23 | Asymmetric Damage | Ongoing | S(DD) = max(0, 1 - DD/0.20), linear scaling to zero | DD_halt = 20% | Compute S(DD) daily, apply to all sizing, halt at 20% |
| 24 | Systemic Correlation | Ongoing | H_adj includes pairwise correlation penalty | rho_ij from 60-bar rolling | Update correlation matrix daily, reject trades if H_adj > 6% |
| 25 | Execution Quality | 9-10 (Entry) | Limit orders for Q > 0.70, market orders for Q < 0.65 | spread model per order type | Select order type by Q, log expected vs actual fill |
| 26 | Slippage and Costs | All | Edge must exceed 2x round-trip cost to be viable | min_edge = 2 * RT_cost | Compute full cost stack, reject if edge < 2x cost |
| 27 | Psychology | All | Zero discretionary overrides, all gates are binary | No override parameter | Enforce hard pass/fail at every gate, no exceptions |
| 28 | Adaptation | Ongoing | Walk-forward every 500 trades, 6+ windows, blend transition | degradation_max = 0.30 | Trigger optimization at 500-trade intervals, blend new parameters |
| 29 | Probability of Ruin | Ongoing | Use 25-50% fractional Kelly, P(ruin) < 1% | kelly_fraction = 0.25 to 0.50 | Recompute Kelly every 200 trades, verify sizing within bounds |
| 30 | Survival | ALL | Escalation ladder from daily 2% to monthly 8% to full halt | 5 escalation thresholds | Check all 5 conditions at start of every processing cycle |

---

*End of Part V: 30-Law Integration*

*Every law maps to a specific pipeline stage with a quantitative parameter. Every parameter has a threshold. Every threshold has a defined agent action. This is not philosophy. This is engineering.*
