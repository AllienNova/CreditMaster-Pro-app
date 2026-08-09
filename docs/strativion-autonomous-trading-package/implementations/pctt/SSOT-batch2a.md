# SSOT Batch 2a: Configuration, Formulas, Database, and API Specifications

**Generated:** 2026-02-23
**Source:** Architecture Parts 1-7, config/*.yaml, implementations/python-formulas/*.py
**Scope:** SSOT-CFG-01 through CFG-09, SSOT-FRM-01 through FRM-08, SSOT-DB-01 through DB-04, SSOT-API-*

---

<!-- SSOT-CFG-01 -->
## SSOT-CFG-01: Pipeline Configuration Parameters

All parameters governing the 12-stage PCTT signal pipeline. Extracted from `pctt-canonical-specification.md` and architecture Part 1, Section 3.3.

| Key Path | Type | Default | Valid Range | Unit | Law Ref | Description |
|----------|------|---------|-------------|------|---------|-------------|
| `pipeline.pivot.left_bars` | int | 2 | 1 to 10 | bars | Law 11 | Left lookback for pivot detection |
| `pipeline.pivot.right_bars` | int | 2 | 1 to 10 | bars | Law 11 | Right confirmation for pivot detection |
| `pipeline.pivot.atr_threshold` | float | 1.0 | 0.5 to 3.0 | ATR multiplier | Law 6 | Minimum pivot significance threshold |
| `pipeline.candidate.min_touches` | int | 3 | 2 to 8 | touches | Law 15 | Minimum pivot touches for valid line |
| `pipeline.candidate.min_bars` | int | 20 | 10 to 50 | bars | Law 15 | Minimum span between defining pivots |
| `pipeline.candidate.lookback_window` | int | 200 | 50 to 500 | bars | Law 12 | Lookback window for candidate generation |
| `pipeline.candidate.touch_tolerance` | float | 0.30 | 0.10 to 0.50 | ATR multiplier | Law 15 | Proximity tolerance for touch counting |
| `pipeline.candidate.min_pivots` | int | 5 | 3 to 10 | pivots | Law 15 | Minimum confirmed pivots for estimation |
| `pipeline.boundary.huber_epsilon` | float | 1.35 | 1.0 to 2.0 | sigma units | Law 15 | Huber loss delta parameter |
| `pipeline.boundary.elastic_net_alpha` | float | 0.01 | 0.001 to 0.1 | scalar | Law 15 | Elastic Net regularization strength |
| `pipeline.boundary.elastic_net_l1_ratio` | float | 0.5 | 0.0 to 1.0 | ratio | Law 15 | L1 vs L2 balance in Elastic Net |
| `pipeline.boundary.ransac_threshold` | float | 1.0 | 0.5 to 2.0 | ATR multiplier | Law 15 | RANSAC inlier residual threshold |
| `pipeline.boundary.ransac_max_trials` | int | 100 | 50 to 500 | iterations | Law 15 | Maximum RANSAC iterations |
| `pipeline.boundary.ransac_min_samples` | int | 2 | 2 to 5 | pivots | Law 15 | Minimum samples per RANSAC trial |
| `pipeline.boundary.max_slope_per_bar` | float | 0.02 | 0.01 to 0.05 | ATR/bar | Law 15 | Maximum allowed boundary slope |
| `pipeline.qscore.a_threshold` | float | 0.70 | 0.60 to 0.85 | Q [0,1] | Law 16 | Minimum Q-Score for A-Grade |
| `pipeline.qscore.b_threshold` | float | 0.55 | 0.45 to 0.70 | Q [0,1] | Law 16 | Minimum Q-Score for B-Grade |
| `pipeline.qscore.sigmoid_scale` | float | 3.0 | 1.0 to 5.0 | scalar | Law 16 | Sigmoid normalization scale factor |
| `pipeline.qscore.violation_penalty` | float | 2.0 | 1.0 to 5.0 | scalar | Law 16 | Penalty weight for boundary violations |
| `pipeline.qscore.span_weight` | float | 0.2 | 0.1 to 0.5 | scalar | Law 16 | Logarithmic span reward weight |
| `pipeline.break.penetration_buffer` | float | 0.10 | 0.05 to 0.20 | ATR multiplier | Law 1 | Stage 1 wick-based penetration buffer |
| `pipeline.break.confirmation_buffer` | float | 0.20 | 0.10 to 0.40 | ATR multiplier | Law 1 | Stage 2 close-based confirmation buffer |
| `pipeline.retest.window_bars` | int | 12 | 5 to 20 | bars | Law 2 | Maximum bars to wait for retest |
| `pipeline.retest.proximity_buffer` | float | 0.25 | 0.10 to 0.40 | ATR multiplier | Law 2 | Proximity to frozen Action Line for retest |
| `pipeline.rejection.min_features` | int | 3 | 2 to 4 | count | Law 4 | Minimum rejection features required (out of 4) |
| `pipeline.risk_geometry.dgeom_min` | float | 0.5 | 0.3 to 1.0 | ATR units | Law 22 | Minimum dGeom for valid entry |
| `pipeline.risk_geometry.dgeom_max` | float | 2.5 | 1.5 to 4.0 | ATR units | Law 22 | Maximum dGeom for valid entry |
| `pipeline.confluence.macro_gate_required` | bool | true | true/false | flag | Law 12 | Whether HTF macro gate must pass |

<!-- /SSOT-CFG-01 -->

---

<!-- SSOT-CFG-02 -->
## SSOT-CFG-02: Regime Detection Configuration Parameters

Parameters for the 6-method ensemble regime detector. Extracted from `regime-thresholds.yaml` and architecture Part 1, Section 3.2.

| Key Path | Type | Default | Valid Range | Unit | Law Ref | Description |
|----------|------|---------|-------------|------|---------|-------------|
| `regime.ensemble.min_agreement` | int | 4 | 3 to 6 | votes | Law 8 | Minimum ensemble votes for classification |
| `regime.ensemble.debounce_bars` | int | 5 | 3 to 10 | bars | Law 8 | Minimum bars before regime transition confirmed |
| `regime.ensemble.max_duration_alert` | int | 100 | 50 to 200 | bars | Law 19 | Alert threshold for unusually long regime |
| `regime.efficiency_ratio.period` | int | 20 | 10 to 50 | bars | Law 8 | ER calculation lookback period |
| `regime.efficiency_ratio.trending_threshold` | float | 0.40 | 0.30 to 0.60 | ratio [0,1] | Law 8 | ER value above which market is trending |
| `regime.efficiency_ratio.ranging_threshold` | float | 0.25 | 0.15 to 0.35 | ratio [0,1] | Law 8 | ER value below which market is mean-reverting |
| `regime.crossing_count.ema_period` | int | 20 | 10 to 50 | bars | Law 8 | EMA period for midline crossing detection |
| `regime.crossing_count.max_crosses_trending` | int | 4 | 2 to 8 | crosses | Law 8 | Max crosses to qualify as trending |
| `regime.crossing_count.min_crosses_choppy` | int | 8 | 5 to 12 | crosses | Law 8 | Min crosses to classify as choppy |
| `regime.hurst.window` | int | 100 | 50 to 200 | bars | Law 8 | Hurst exponent estimation window |
| `regime.hurst.trending_threshold` | float | 0.55 | 0.52 to 0.60 | H value | Law 8 | H above this indicates persistent trending |
| `regime.hurst.mean_reverting_threshold` | float | 0.45 | 0.40 to 0.48 | H value | Law 8 | H below this indicates mean-reversion |
| `regime.kalman.process_noise` | float | 0.01 | 0.001 to 0.1 | scalar | Law 8 | Kalman filter process noise parameter |
| `regime.cusum.threshold` | float | 2.0 | 1.0 to 5.0 | sigma | Law 8 | CUSUM alarm threshold for change detection |
| `regime.volatility.atr_expansion_threshold` | float | 2.0 | 1.5 to 3.0 | ATR ratio | Law 3 | ATR/avg(ATR) ratio above which = volatile |
| `regime.adx.period` | int | 14 | 7 to 21 | bars | Law 8 | ADX indicator period |
| `regime.adx.trending_threshold` | float | 25.0 | 20 to 35 | ADX value | Law 8 | ADX above this = trending |
| `regime.adx.ranging_threshold` | float | 20.0 | 15 to 25 | ADX value | Law 8 | ADX below this = ranging |
| `regime.adx.exhausted_threshold` | float | 40.0 | 35 to 50 | ADX value | Law 8 | ADX above this = trend exhausted |
| `regime.volatile_params.atr_multiplier` | float | 1.5 | 1.2 to 2.0 | scalar | Law 8 | ATR multiplier scale in volatile regime |
| `regime.volatile_params.position_size_scale` | float | 0.50 | 0.25 to 0.75 | scalar | Law 8 | Position size multiplier in volatile regime |

<!-- /SSOT-CFG-02 -->

---

<!-- SSOT-CFG-03 -->
## SSOT-CFG-03: Risk Management Configuration Parameters

Risk limits, circuit breakers, and drawdown protocols. Extracted from `risk-limits.yaml`, `master-config.yaml`, and architecture Part 1, Section 3.4.

| Key Path | Type | Default | Valid Range | Unit | Law Ref | Description |
|----------|------|---------|-------------|------|---------|-------------|
| `risk.per_trade.default` | float | 0.01 | 0.0025 to 0.02 | equity fraction | Law 21 | Default risk per trade (1%) |
| `risk.per_trade.max` | float | 0.02 | 0.01 to 0.03 | equity fraction | Law 21 | Absolute maximum risk per trade (hard limit) |
| `risk.per_trade.min` | float | 0.0025 | 0.001 to 0.005 | equity fraction | Law 21 | Absolute minimum risk per trade |
| `risk.per_trade.a_grade` | float | 0.01 | 0.005 to 0.02 | equity fraction | Law 16 | Risk allocation for A-Grade setups |
| `risk.per_trade.b_grade` | float | 0.005 | 0.0025 to 0.01 | equity fraction | Law 16 | Risk allocation for B-Grade setups |
| `risk.portfolio_heat.max_default` | float | 0.06 | 0.03 to 0.10 | equity fraction | Law 21 | Default max portfolio heat (6%) |
| `risk.portfolio_heat.max_absolute` | float | 0.08 | 0.06 to 0.10 | equity fraction | Law 21 | Absolute ceiling for portfolio heat (hard limit) |
| `risk.portfolio_heat.conservative` | float | 0.04 | 0.02 to 0.06 | equity fraction | Law 21 | Conservative operating heat |
| `risk.correlation.threshold` | float | 0.70 | 0.50 to 0.85 | correlation | Law 24 | Pairwise correlation threshold for "correlated" |
| `risk.correlation.max_correlated_normal` | int | 3 | 2 to 5 | positions | Law 24 | Normal correlated position limit |
| `risk.correlation.max_correlated_override` | int | 5 | 3 to 7 | positions | Law 24 | High-conviction override limit (SUPERVISED only) |
| `risk.correlation.crisis_multiplier` | float | 1.3 | 1.1 to 1.5 | scalar | Law 24 | Correlation stress multiplier (cap at 1.0) |
| `risk.drawdown_scale.halt_threshold` | float | 0.20 | 0.15 to 0.30 | equity fraction | Law 30 | Drawdown at which S(DD) = 0, halt trading |
| `risk.drawdown_scale.formula` | string | "max(0, 1 - DD/0.20)" | N/A | formula | Law 23 | Continuous drawdown scaling function |
| `risk.circuit_breaker.daily_loss_halt` | float | 0.02 | 0.01 to 0.03 | equity fraction | Law 30 | Daily loss limit triggers halt |
| `risk.circuit_breaker.weekly_loss_halt` | float | 0.03 | 0.02 to 0.05 | equity fraction | Law 30 | Weekly loss limit triggers halt |
| `risk.circuit_breaker.monthly_drawdown_reduce` | float | 0.06 | 0.04 to 0.08 | equity fraction | Law 30 | Monthly drawdown triggers 50% size reduction |
| `risk.circuit_breaker.consecutive_loss_soft` | int | 3 | 2 to 5 | trades | Law 30 | Consecutive losses trigger 50% size reduction |
| `risk.circuit_breaker.consecutive_loss_hard` | int | 5 | 4 to 7 | trades | Law 30 | Consecutive losses trigger full halt |
| `risk.survival_score.min_for_trading` | int | 6 | 4 to 8 | score [0-10] | Law 30 | Minimum survival score to allow trading |
| `risk.leverage.max_allowed` | float | 3.0 | 1.0 to 5.0 | multiplier | Law 29 | Maximum leverage |
| `risk.adv.max_position_pct` | float | 0.01 | 0.005 to 0.05 | ADV fraction | Law 25 | Max position size vs average daily volume |
| `risk.min_reward_risk_ratio` | float | 2.0 | 1.5 to 3.0 | ratio | Law 16 | Minimum reward-to-risk ratio for entry |

<!-- /SSOT-CFG-03 -->

---

<!-- SSOT-CFG-04 -->
## SSOT-CFG-04: Execution Configuration Parameters

Order management, trailing stop phases, and fail-fast conditions. Extracted from architecture Part 1, Section 3.6.

| Key Path | Type | Default | Valid Range | Unit | Law Ref | Description |
|----------|------|---------|-------------|------|---------|-------------|
| `execution.order.default_type` | string | "LIMIT" | LIMIT, MARKET | type | Law 25 | Default order type for entries |
| `execution.order.slippage_buffer_ticks` | int | 1 | 0 to 5 | ticks | Law 25 | Tick buffer added to limit orders |
| `execution.order.fill_timeout_bars` | int | 2 | 1 to 5 | bars | Law 10 | Bars to wait for fill before cancel |
| `execution.trailing.phase1_atr_buffer` | float | 1.5 | 1.0 to 2.5 | ATR multiplier | Law 22 | Phase 1: Safety Line buffer |
| `execution.trailing.phase2_breakeven_trigger` | float | 0.8 | 0.5 to 1.0 | R-multiple | Law 23 | Phase 2: Trigger level for breakeven stop |
| `execution.trailing.phase3_partial_trigger` | float | 1.0 | 0.8 to 1.5 | R-multiple | Law 23 | Phase 3: Trigger level for partial exit |
| `execution.trailing.phase3_partial_pct` | float | 0.60 | 0.50 to 0.70 | position fraction | Law 23 | Phase 3: Percentage of position to exit |
| `execution.trailing.phase4_pivot_lookback` | int | 3 | 2 to 5 | pivots | Law 14 | Phase 4: Number of pivots for trail calculation |
| `execution.trailing.phase5_stagnation_bars` | int | 20 | 10 to 30 | bars | Law 10 | Phase 5: Bars without new extreme triggers time stop |
| `execution.trailing.phase6_atr_percentile` | float | 75.0 | 60 to 90 | percentile | Law 3 | Phase 6: ATR contraction threshold for tightening |
| `execution.trailing.phase7_daily_loss_trigger` | float | 0.02 | 0.01 to 0.03 | equity fraction | Law 30 | Phase 7: Circuit breaker daily loss |
| `execution.fail_fast.safety_line_bars` | int | 5 | 3 to 8 | bars | Law 4 | Fail-fast: bars to check Safety Line violation |
| `execution.fail_fast.regime_shift_bars` | int | 5 | 3 to 8 | bars | Law 8 | Fail-fast: bars to check regime shift |
| `execution.fail_fast.volume_collapse_bars` | int | 3 | 2 to 5 | bars | Law 4 | Fail-fast: bars to check volume collapse |
| `execution.fail_fast.volume_collapse_ratio` | float | 0.5 | 0.3 to 0.7 | ratio vs SMA | Law 4 | Fail-fast: volume collapse threshold |

<!-- /SSOT-CFG-04 -->

---

<!-- SSOT-CFG-05 -->
## SSOT-CFG-05: Sentinel Configuration Parameters

Market monitoring, session management, and watchlist curation. Extracted from `market-hours.yaml`, `master-config.yaml`, and architecture Part 1, Section 3.1.

| Key Path | Type | Default | Valid Range | Unit | Law Ref | Description |
|----------|------|---------|-------------|------|---------|-------------|
| `sentinel.wake_time_minutes_before_open` | int | 90 | 60 to 120 | minutes | Law 9 | Minutes before market open to wake |
| `sentinel.market_brief_deadline_minutes` | int | 45 | 30 to 60 | minutes | Law 9 | Minutes before open, brief must be published |
| `sentinel.session_monitor_interval` | int | 15 | 5 to 30 | minutes | Law 9 | Interval for session phase checks |
| `sentinel.vix.crisis_threshold` | float | 35.0 | 30 to 45 | VIX level | Law 30 | VIX above this triggers crisis alert |
| `sentinel.vix.extreme_threshold` | float | 65.0 | 50 to 80 | VIX level | Law 30 | VIX above this triggers forced close of leveraged positions |
| `sentinel.gap.significant_atr_ratio` | float | 1.0 | 0.5 to 2.0 | ATR multiple | Law 3 | Gap > 1 ATR is significant |
| `sentinel.gap.structure_invalidating_ratio` | float | 2.0 | 1.5 to 3.0 | ATR multiple | Law 3 | Gap > 2 ATR invalidates structures |
| `sentinel.lunch_hour.start` | string | "11:30" | N/A | ET time | Law 9 | Lunch hour start (no new signals) |
| `sentinel.lunch_hour.end` | string | "13:30" | N/A | ET time | Law 9 | Lunch hour end (resume signals) |
| `sentinel.power_hour.start` | string | "15:00" | N/A | ET time | Law 9 | Power hour start |
| `sentinel.first_candle_wait_minutes` | int | 5 | 2 to 10 | minutes | Law 9 | Minutes after open before signal generation |
| `sentinel.calendar.tier1_reduce_size` | float | 0.50 | 0.25 to 0.75 | multiplier | Law 9 | Size reduction factor before Tier 1 events |
| `sentinel.overnight_range.compression_threshold` | float | 0.50 | 0.30 to 0.70 | ratio vs 20-day avg | Law 3 | Below this = volatility compression expected |
| `sentinel.overnight_range.expansion_threshold` | float | 1.50 | 1.20 to 2.00 | ratio vs 20-day avg | Law 3 | Above this = day's move may be priced in |

<!-- /SSOT-CFG-05 -->

---

<!-- SSOT-CFG-06 -->
## SSOT-CFG-06: Journal Configuration Parameters

Trade recording, edge decay detection, and performance analytics. Extracted from architecture Part 1, Section 3.7.

| Key Path | Type | Default | Valid Range | Unit | Law Ref | Description |
|----------|------|---------|-------------|------|---------|-------------|
| `journal.rolling_window` | int | 20 | 10 to 50 | trades | Law 19 | Rolling window for performance metrics |
| `journal.edge_decay.win_rate_threshold` | float | 0.50 | 0.40 to 0.55 | ratio | Law 19 | Win rate below this = trigger 1 |
| `journal.edge_decay.expectancy_threshold` | float | 0.2 | 0.1 to 0.4 | R-multiple | Law 19 | Expectancy below this = trigger 2 |
| `journal.edge_decay.profit_factor_threshold` | float | 1.3 | 1.0 to 1.5 | ratio | Law 19 | Profit factor below this = trigger 3 |
| `journal.edge_decay.triggers_for_pause` | int | 2 | 1 to 3 | count | Law 19 | Number of triggers that causes pause recommendation |
| `journal.edge_decay.consecutive_alerts_for_downgrade` | int | 3 | 2 to 5 | count | Law 28 | Consecutive alerts trigger mode downgrade |
| `journal.weekly_review.day` | string | "Sunday" | N/A | day | Law 20 | Day of the week for automatic weekly review |
| `journal.speed_journal.auto_generate` | bool | true | true/false | flag | Law 20 | Auto-generate 5-minute speed journal at close |

<!-- /SSOT-CFG-06 -->

---

<!-- SSOT-CFG-07 -->
## SSOT-CFG-07: Calibration Configuration Parameters

Walk-forward optimization and parameter tuning. Extracted from architecture Part 4 (SSOT-batch1b) and Part 1 Section 12.

| Key Path | Type | Default | Valid Range | Unit | Law Ref | Description |
|----------|------|---------|-------------|------|---------|-------------|
| `calibration.walk_forward.train_pct` | float | 0.60 | 0.50 to 0.70 | fraction | Law 20 | In-sample training fraction |
| `calibration.walk_forward.validate_pct` | float | 0.20 | 0.10 to 0.30 | fraction | Law 20 | Validation fraction |
| `calibration.walk_forward.test_pct` | float | 0.20 | 0.10 to 0.30 | fraction | Law 20 | Out-of-sample test fraction |
| `calibration.walk_forward.windows` | int | 6 | 3 to 10 | windows | Law 20 | Number of walk-forward windows |
| `calibration.walk_forward.degradation_threshold` | float | 0.60 | 0.40 to 0.80 | ratio | Law 20 | Min OOS/IS degradation ratio |
| `calibration.monte_carlo.permutations` | int | 10000 | 1000 to 100000 | runs | Law 17 | Monte Carlo simulation count |
| `calibration.monte_carlo.p_value_threshold` | float | 0.05 | 0.01 to 0.10 | p-value | Law 17 | Statistical significance threshold |
| `calibration.rollback.degrade_pct` | float | 0.15 | 0.10 to 0.25 | fraction | Law 28 | Performance degradation triggering rollback |
| `calibration.rollback.monitor_trades` | int | 20 | 10 to 50 | trades | Law 28 | Trades to monitor under new parameters |
| `calibration.min_trades_statistical` | int | 380 | 200 to 500 | trades | Law 17 | Minimum trades for 95% confidence |
| `calibration.min_trades_kelly` | int | 200 | 100 to 300 | trades | Law 17 | Minimum trades before Kelly sizing allowed |
| `calibration.qscore_recalibration_window` | int | 500 | 200 to 1000 | trades | Law 16 | Trades between Q-Score isotonic recalibrations |

<!-- /SSOT-CFG-07 -->

---

<!-- SSOT-CFG-08 -->
## SSOT-CFG-08: Research Configuration Parameters

Universe selection, instrument screening, and sector analysis. Extracted from architecture Part 3 and Part 4.

| Key Path | Type | Default | Valid Range | Unit | Law Ref | Description |
|----------|------|---------|-------------|------|---------|-------------|
| `research.universe.max_instruments` | int | 50 | 20 to 100 | instruments | Law 24 | Maximum instruments in master universe |
| `research.universe.rebalance_frequency` | string | "weekly" | daily, weekly, monthly | period | Law 28 | How often to refresh the full universe |
| `research.screening.min_adv_dollars` | float | 5000000 | 1000000 to 50000000 | USD | Law 25 | Minimum average daily volume in dollars |
| `research.screening.min_price` | float | 10.0 | 5.0 to 50.0 | USD | Law 25 | Minimum instrument price |
| `research.screening.max_spread_pct` | float | 0.10 | 0.05 to 0.50 | percent | Law 25 | Maximum bid-ask spread as percent of price |
| `research.asset_allocation.max_single_class` | float | 0.60 | 0.40 to 0.80 | fraction | Law 24 | Maximum allocation to any single asset class |
| `research.asset_allocation.tolerance` | float | 0.25 | 0.10 to 0.50 | fraction | Law 24 | Allowed overweight above target before rejection |

<!-- /SSOT-CFG-08 -->

---

<!-- SSOT-CFG-09 -->
## SSOT-CFG-09: Strategy Configuration Parameters

Seasonal patterns, session hours, and market-specific overrides. Extracted from `seasonal-patterns.yaml` and `market-hours.yaml`.

| Key Path | Type | Default | Valid Range | Unit | Law Ref | Description |
|----------|------|---------|-------------|------|---------|-------------|
| `strategy.seasonal.sell_in_may_reduce` | float | 0.25 | 0.10 to 0.50 | fraction | Law 8 | Equity exposure reduction in May-Oct |
| `strategy.seasonal.september_max_positions` | int | 2 | 1 to 4 | positions | Law 8 | Max positions during September |
| `strategy.seasonal.friday_no_new_after` | string | "14:00" | N/A | ET time | Law 8 | No new positions after this time on Friday |
| `strategy.fomc.size_reduction` | float | 0.50 | 0.25 to 0.75 | multiplier | Law 9 | Position size reduction before FOMC |
| `strategy.fomc.blackout_start` | string | "14:00" | N/A | ET time | Law 9 | No trading window start on FOMC days |
| `strategy.fomc.blackout_end` | string | "14:30" | N/A | ET time | Law 9 | No trading window end on FOMC days |
| `strategy.opex.size_reduction` | float | 0.50 | 0.25 to 0.75 | multiplier | Law 8 | Size reduction on quad witching weeks |
| `strategy.session.us_equity_open` | string | "09:30" | N/A | ET time | Law 9 | US equity regular session open |
| `strategy.session.us_equity_close` | string | "16:00" | N/A | ET time | Law 9 | US equity regular session close |
| `strategy.session.forex_best_window_start` | string | "08:00" | N/A | ET time | Law 9 | London/NY overlap start |
| `strategy.session.forex_best_window_end` | string | "12:00" | N/A | ET time | Law 9 | London/NY overlap end |
| `strategy.crisis.vix_threshold` | float | 35.0 | 30 to 50 | VIX level | Law 30 | VIX crisis entry threshold |
| `strategy.crisis.spx_drop_pct` | float | 3.0 | 2.0 to 5.0 | percent | Law 30 | SPX single-day drop crisis threshold |
| `strategy.crisis.correlation_threshold` | float | 0.70 | 0.60 to 0.85 | correlation | Law 24 | Cross-asset correlation crisis threshold |
| `strategy.crisis.phase1_cut_exposure_pct` | float | 50.0 | 25 to 75 | percent | Law 30 | Phase 1: gross exposure reduction |
| `strategy.crisis.reentry_day1_size` | float | 0.25 | 0.10 to 0.50 | multiplier | Law 30 | Re-entry days 1-5 size |
| `strategy.crisis.reentry_day5_size` | float | 0.50 | 0.25 to 0.75 | multiplier | Law 30 | Re-entry days 5-10 size |
| `strategy.crisis.reentry_day10_size` | float | 0.75 | 0.50 to 1.00 | multiplier | Law 30 | Re-entry days 10-20 size |

<!-- /SSOT-CFG-09 -->

---

<!-- SSOT-FRM-01 -->
## SSOT-FRM-01: Expectancy Formula

**Source:** `implementations/python-formulas/expectancy.py`, Appendix C Section 3, Law 16

### Mathematical Notation

```
E = (W_r * A_w) - (L_r * A_l)

Where:
  E   = Expected profit per trade
  W_r = Win rate = wins / total_trades
  L_r = Loss rate = losses / total_trades = 1 - W_r
  A_w = Average dollar profit on winning trades
  A_l = Average dollar loss on losing trades (positive)
```

**Per dollar risked:**

```
E_R = (W_r * R_avg) - (L_r * 1.0)

Where:
  E_R   = Expected R-multiple per trade
  R_avg = Average R-multiple on winning trades
```

### Python Function Signatures

```python
def calculate_expectancy(
    wins: int,
    losses: int,
    avg_win: float,
    avg_loss: float,
) -> float:
    """Returns expected dollar profit per trade."""

def expectancy_per_dollar_risked(
    win_rate: float,   # 0.0 to 1.0
    avg_r_multiple: float,
) -> float:
    """Returns expected R-multiple per trade."""

def profit_factor(
    gross_profits: float,
    gross_losses: float,
) -> float:
    """Returns PF = gross_profits / gross_losses."""
```

### Parameters

| Parameter | Type | Valid Range | Description |
|-----------|------|-------------|-------------|
| `wins` | int | >= 0 | Number of winning trades |
| `losses` | int | >= 0 | Number of losing trades |
| `avg_win` | float | > 0 | Average dollar profit on wins |
| `avg_loss` | float | > 0 | Average dollar loss (positive) |
| `win_rate` | float | 0.0 to 1.0 | Win probability |
| `avg_r_multiple` | float | > 0 | Average R on winners |

### Return Types

- `calculate_expectancy` returns `float` (dollar value, can be negative)
- `expectancy_per_dollar_risked` returns `float` (R-multiple, can be negative)
- `profit_factor` returns `float` (ratio, > 1.0 = profitable)

### Example Calculation

```
Given: 45 wins, 55 losses, avg_win = $800, avg_loss = $400
  W_r = 45/100 = 0.45
  L_r = 55/100 = 0.55
  E = (0.45 * 800) - (0.55 * 400) = 360 - 220 = $140 per trade
```

<!-- /SSOT-FRM-01 -->

---

<!-- SSOT-FRM-02 -->
## SSOT-FRM-02: Position Sizing (Kelly Criterion)

**Source:** `implementations/python-formulas/position_sizing.py`, Appendix C Section 2, Law 21

### Mathematical Notation

**Full Kelly:**

```
f* = (b * p - q) / b

Where:
  f* = Optimal fraction of capital to risk
  b  = Payoff ratio = avg_win / avg_loss
  p  = Win probability
  q  = Loss probability = 1 - p
```

**Fractional Kelly:**

```
f = f* * k

Where:
  k = Kelly fraction (0.25 = quarter-Kelly, 0.50 = half-Kelly)
```

**Fixed Fractional:**

```
Size = (Equity * Risk%) / |Entry - Stop|
```

**ATR-Based:**

```
Size = (Equity * Risk%) / (ATR * Multiplier * PointValue)
```

**PCTT Drawdown-Adjusted:**

```
S(DD) = max(0, 1 - DD / 0.20)
Size = (Equity * Risk% * S(DD)) / |Entry - Stop|
```

### Python Function Signatures

```python
def kelly_criterion(
    win_rate: float,   # 0.0 to 1.0
    avg_win: float,    # Positive
    avg_loss: float,   # Positive
) -> float:
    """Returns full Kelly fraction. WARNING: Too aggressive for live trading."""

def fractional_kelly(
    win_rate: float,
    avg_win: float,
    avg_loss: float,
    fraction: float = 0.25,  # Quarter-Kelly default
) -> float:
    """Returns fractional Kelly position size."""

def fixed_fractional_size(
    account: float,
    risk_pct: float,
    entry_price: float,
    stop_price: float,
) -> float:
    """Returns number of shares (not rounded)."""

def atr_based_size(
    account: float,
    risk_pct: float,
    atr: float,
    multiplier: float = 2.0,
    point_value: float = 1.0,
) -> float:
    """Returns number of contracts/shares (not rounded)."""
```

### Example Calculation

```
Kelly: win_rate=0.55, avg_win=2.0, avg_loss=1.0
  b = 2.0/1.0 = 2.0
  f* = (2.0*0.55 - 0.45) / 2.0 = (1.10 - 0.45) / 2.0 = 0.325
  Quarter-Kelly: f = 0.325 * 0.25 = 0.08125 (8.1% risk per trade)

Fixed Fractional: $50K account, 1% risk, entry $150, stop $145
  Size = (50000 * 0.01) / |150 - 145| = 500 / 5 = 100 shares
```

<!-- /SSOT-FRM-02 -->

---

<!-- SSOT-FRM-03 -->
## SSOT-FRM-03: Risk of Ruin

**Source:** `implementations/python-formulas/risk_of_ruin.py`, Appendix C Section 5, Law 29

### Mathematical Notation

```
P(ruin) = ((1 - edge) / (1 + edge)) ^ N

Where:
  edge = W_r * b - (1 - W_r)
  N    = ruin_threshold / risk_per_trade
  W_r  = Win rate
  b    = Payoff ratio
```

If edge <= 0, P(ruin) = 1.0 (certain ruin).

### Python Function Signature

```python
def probability_of_ruin(
    win_rate: float,         # 0.0 to 1.0
    payoff_ratio: float,     # avg_win / avg_loss
    risk_per_trade: float,   # 0.0 to 1.0
    ruin_threshold: float = 0.50,  # 50% drawdown = ruin
) -> float:
    """Returns P(ruin) between 0.0 and 1.0."""
```

### Example Calculation

```
Given: win_rate=0.55, payoff=2.0, risk=0.02, ruin=0.50
  edge = 0.55*2.0 - 0.45 = 0.65
  N = 0.50 / 0.02 = 25
  P(ruin) = ((1 - 0.65)/(1 + 0.65))^25 = (0.35/1.65)^25 = 0.2121^25 ~ 0.00
```

### Key Reference Table (55% WR, 2:1 R/R)

| Risk/Trade | P(Ruin) |
|-----------|---------|
| 0.5% | < 0.1% |
| 1.0% | < 0.5% |
| 2.0% | ~1% |
| 5.0% | ~22% |
| 10.0% | ~68% |
| 20.0% | ~97% |

<!-- /SSOT-FRM-03 -->

---

<!-- SSOT-FRM-04 -->
## SSOT-FRM-04: Drawdown Recovery

**Source:** `implementations/python-formulas/drawdown_recovery.py`, Appendix C Section 4, Law 23

### Mathematical Notation

```
Recovery = 1 / (1 - DD) - 1

Where:
  DD = Drawdown as decimal (0.50 = 50% loss)

Recovery Time (months) = ln(1 + Recovery) / ln(1 + r)

Where:
  r = Expected monthly return
```

### Python Function Signatures

```python
def recovery_required(drawdown_pct: float) -> float:
    """Returns required gain as decimal. 0.50 drawdown returns 1.0 (100%)."""

def recovery_time(
    drawdown_pct: float,
    monthly_return: float,
) -> float:
    """Returns estimated months to recover."""
```

### Key Reference Table

| Drawdown | Gain to Recover | Months @2%/mo | Zone |
|----------|----------------|---------------|------|
| 5% | 5.3% | 3 | Safe |
| 10% | 11.1% | 6 | Safe |
| 15% | 17.6% | 9 | Caution |
| 20% | 25.0% | 12 | Caution |
| 25% | 33.3% | 15 | Danger |
| 30% | 42.9% | 18 | Danger |
| 40% | 66.7% | 26 | Critical |
| 50% | 100.0% | 35 | Death Zone |
| 75% | 300.0% | 78 | Death Zone |

<!-- /SSOT-FRM-04 -->

---

<!-- SSOT-FRM-05 -->
## SSOT-FRM-05: Q-Score Formula

**Source:** `pctt-canonical-specification.md`, Stage 4

### Mathematical Notation

**Raw Score:**

```
Score(l) = Touch_Reward + Span_Reward - Violation_Penalty

Touch_Reward = SUM_k [ w_k * 1{touch}(k) ]
  where w_k = 1 - (distance_k / tau_k),  w_k in [0, 1]

Span_Reward = omega_s * ln(1 + span)
  omega_s = 0.2 (default)

Violation_Penalty = lambda * SUM_u [ V_u ]
  lambda = 2.0 (default)
  V_u capped at 3.0 ATR per violation
```

**Q-Score (sigmoid normalization):**

```
Q = 1 / (1 + e^{-Score/3})
```

**Grading:**

| Grade | Condition | Risk Allocation |
|-------|-----------|----------------|
| A | Q >= 0.70 AND touches >= 3 | 1.0% equity |
| B | Q >= 0.55 AND touches >= 2 | 0.5% equity |
| SKIP | Q < 0.55 | No trade |

### Python Function Signature

```python
def calculate_q_score(
    line: CandidateLine,
    atr: float,
    scale: float = 3.0,
) -> float:
    """Returns Q-Score in [0, 1]."""

def grade_setup(q_score: float) -> str:
    """Returns 'A', 'B', or 'SKIP'."""
```

### Example Calculation

```
Given: 4 touches, span=80 bars, 1 violation at 1.5 ATR
  Touch_Reward ~ 4 * 0.85 = 3.4 (avg weight 0.85)
  Span_Reward  = 0.2 * ln(81) = 0.2 * 4.39 = 0.878
  Violation    = 2.0 * 1.5 = 3.0
  Raw Score    = 3.4 + 0.878 - 3.0 = 1.278
  Q = 1 / (1 + e^{-1.278/3}) = 1 / (1 + e^{-0.426}) = 1 / 1.653 = 0.605
  Grade: B (Q >= 0.55)
```

<!-- /SSOT-FRM-05 -->

---

<!-- SSOT-FRM-06 -->
## SSOT-FRM-06: Regime Detection (Efficiency Ratio + Hurst)

**Source:** `implementations/python-formulas/regime_detector.py`, `pctt-canonical-specification.md` Stage 5, Law 8

### Mathematical Notation

**Efficiency Ratio:**

```
ER_t = |C_t - C_{t-n}| / SUM_{i=1..n}( |C_{t-i+1} - C_{t-i}| )

ER -> 1.0 in strong trends (straight-line movement)
ER -> 0.0 in chop (much movement, no progress)

Default n = 20
```

**Hurst Exponent (R/S method):**

```
H estimated via rescaled range analysis over window of 100 bars.

H > 0.55: Persistent (trending)
H = 0.50: Random walk
H < 0.45: Anti-persistent (mean-reverting)
```

**Classification Rules:**

```
TRENDING:       ER >= 0.40 AND crosses <= max_trending
MEAN_REVERTING: ER <= 0.25 OR crosses >= min_choppy
CHOPPY:         No agreement (4+ methods disagree)
VOLATILE:       ATR > 2x 20-day average ATR
```

### Python Function Signature

```python
def detect_regime(
    adx: float,
    vix: float,
    atr_ratio: float,
) -> MarketRegime:
    """Returns MarketRegime enum: TRENDING, MEAN_REVERTING, VOLATILE, CRISIS."""
```

### Ensemble Voting

The 6 methods each cast a vote. 4/6 agreement required for classification. Otherwise, CHOPPY (no trading).

| Method | Input | Trending Signal | Mean-Reverting Signal |
|--------|-------|----------------|----------------------|
| Efficiency Ratio | prices, n=20 | ER >= 0.40 | ER <= 0.25 |
| Crossing Count | prices, EMA(20) | crosses <= 4 | crosses >= 8 |
| Hurst Exponent | prices, w=100 | H > 0.55 | H < 0.45 |
| Kalman Slope | prices, noise=0.01 | Positive/negative slope significant | Slope near zero |
| CUSUM | prices, thresh=2.0 | No alarm | Alarm fired |
| Volatility Regime | ATR series | ATR < 2x avg | ATR expansion |

<!-- /SSOT-FRM-06 -->

---

<!-- SSOT-FRM-07 -->
## SSOT-FRM-07: Trailing Stop Phases

**Source:** Architecture Part 1, Section 3.6, `pctt-canonical-specification.md` Stage 10

### Phase Definitions

| Phase | Trigger | Stop Calculation | Notes |
|-------|---------|-----------------|-------|
| **Phase 1: Initial Hold** | Entry confirmed | `Safety(t_entry) +/- 1.5 * ATR` | Structural stop. No movement. |
| **Phase 2: Breakeven** | Price reaches +0.8R | `Entry +/- epsilon_BE * ATR` | Lock in entry. Eliminate risk. |
| **Phase 3: Partial Exit** | Price reaches +1.0R | Close 60% of position. Stop on remainder moves to breakeven. | Mandatory. Locks profit. |
| **Phase 4: Pivot Trail** | After partial exit | Trail behind 3-pivot lookback `PL_last - epsilon * ATR` (long) | Updated only on new confirmed pivot. Monotonic. |
| **Phase 5: Time Stop** | 20 bars without new favorable extreme | Tighten to most recent confirmed pivot | Prevents stagnation. |
| **Phase 6: Momentum Tightening** | ATR contracts below 75th percentile | Reduce trail width proportionally | Captures momentum decay. |
| **Phase 7: Circuit Breaker** | Daily loss hits 2% | EXIT ALL positions. Market orders. | Overrides all other phases. Law 30. |

### State Transitions

```
Phase 1 -> Phase 2 (price >= +0.8R)
Phase 2 -> Phase 3 (price >= +1.0R)
Phase 3 -> Phase 4 (partial executed, continue trailing remainder)
Phase 4 -> Phase 5 (20 bars no new extreme)
Phase 4 -> Phase 6 (ATR < 75th percentile)
Phase 5 -> Phase 4 (new extreme resets timer)
Phase 6 -> Phase 4 (ATR recovers)
Any Phase -> Phase 7 (daily loss = 2%)
Any Phase -> EXIT (stop hit)
Phase 1 -> EXIT (fail-fast triggered)
```

### Monotonic Enforcement

Stops only move in the favorable direction. For longs, stops only rise. For shorts, stops only lower. Any calculation that would move the stop in the unfavorable direction is rejected and the previous stop level is retained.

<!-- /SSOT-FRM-07 -->

---

<!-- SSOT-FRM-08 -->
## SSOT-FRM-08: Survival Score

**Source:** Architecture Part 1, Section 3.4 (Risk Agent), Law 30

### Mathematical Notation

```
SurvivalScore = S1 + S2 + S3 + S4 + S5

Where each component is 0 or 2 points (total 0 to 10):

S1 = 2 if expectancy_last_20 > 0, else 0
S2 = 2 if risk_per_trade < 2%, else 0
S3 = 2 if current_drawdown < 10%, else 0
S4 = 2 if all_stops_honored (no manual overrides), else 0
S5 = 2 if crisis_plan_active (hedges in place or cash sufficient), else 0
```

### Thresholds

| Score | Status | Action |
|-------|--------|--------|
| 9-10 | Excellent | Full trading, all strategies available |
| 7-8 | Good | Normal trading, monitor closely |
| 5-6 | Caution | Trading allowed at reduced size |
| 3-4 | Danger | Trading paused, review required |
| 0-2 | Critical | All trading halted. Law 30 override. |

### Python Function Signature

```python
def compute_survival_score(account_metrics: dict) -> int:
    """
    Computes the 5-component survival score (0-10).

    Parameters:
        account_metrics: Dict containing:
            - expectancy_last_20: float (expected R per trade)
            - risk_per_trade: float (current risk percentage)
            - current_drawdown: float (drawdown from peak)
            - stops_honored: bool (all stops executed without override)
            - crisis_plan_active: bool (hedges/cash adequate)

    Returns:
        int: Survival score from 0 to 10.
    """
```

### Integration with Risk Decision Flow

The survival score is computed before every trade approval. If the score falls below the `risk.survival_score.min_for_trading` threshold (default 6), the Risk agent vetoes the trade regardless of signal quality or Q-Score grade.

<!-- /SSOT-FRM-08 -->

---

<!-- SSOT-DB-01 -->
## SSOT-DB-01: PostgreSQL Database Schema (Cold Tier)

**Source:** Architecture Parts 1-2, Part 4 (data models), Part 7 (audit log)

The PostgreSQL database stores all cold-tier historical data. It serves as the durable, queryable long-term store for trades, daily metrics, calibration history, and research findings.

### Table: `trades`

Stores every completed PCTTTradeRecord.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `trade_id` | VARCHAR(64) PK | NO | uuid_generate_v4() | Unique trade identifier |
| `entry_time` | TIMESTAMP WITH TZ | NO | | Entry order fill time |
| `entry_price` | NUMERIC(12,4) | NO | | Actual fill price |
| `direction` | VARCHAR(5) | NO | | LONG or SHORT |
| `instrument` | VARCHAR(20) | NO | | Ticker/symbol |
| `timeframe` | VARCHAR(5) | NO | | 1m, 5m, 15m, 1h, 4h, D, W |
| `q_score` | NUMERIC(5,4) | NO | | Q-Score at entry [0,1] |
| `rejection_score` | SMALLINT | NO | | Rejection features passed (0-4) |
| `regime` | VARCHAR(20) | NO | | Regime at entry (TRENDING, VOLATILE, etc.) |
| `d_geom` | NUMERIC(5,2) | NO | | Risk geometry in ATR units |
| `grade` | CHAR(1) | NO | | A or B |
| `position_size` | NUMERIC(12,4) | NO | | Shares or contracts |
| `risk_per_share` | NUMERIC(12,4) | NO | | Dollar risk per unit |
| `initial_stop` | NUMERIC(12,4) | NO | | Initial stop-loss price |
| `action_line_value` | NUMERIC(12,4) | NO | | Frozen Action Line at entry |
| `safety_line_value` | NUMERIC(12,4) | NO | | Frozen Safety Line at entry |
| `trailing_phases` | JSONB | NO | '[]' | Array of phase transitions with timestamps |
| `partial_exits` | JSONB | NO | '[]' | Array of partial exit records |
| `fail_fast_triggered` | BOOLEAN | NO | false | Whether fail-fast caused exit |
| `max_favorable_excursion` | NUMERIC(12,4) | YES | | MFE in dollars |
| `max_adverse_excursion` | NUMERIC(12,4) | YES | | MAE in dollars |
| `exit_time` | TIMESTAMP WITH TZ | YES | | Exit order fill time |
| `exit_price` | NUMERIC(12,4) | YES | | Actual exit fill price |
| `exit_reason` | VARCHAR(30) | YES | | STOP, PARTIAL, FAIL_FAST, TIME_STOP, CIRCUIT_BREAKER, ROTATION_EXIT |
| `r_multiple` | NUMERIC(6,3) | YES | | Realized R-multiple |
| `duration_bars` | INTEGER | YES | | Bars from entry to exit |
| `realized_pnl` | NUMERIC(12,2) | YES | | Net P&L in dollars |
| `commission` | NUMERIC(8,2) | YES | 0.00 | Total commission paid |
| `macro_gate_result` | VARCHAR(10) | YES | | PASS or FAIL |
| `confluence_score` | NUMERIC(5,4) | YES | | Multi-timeframe confluence [0,1] |
| `entry_regime` | VARCHAR(20) | YES | | Regime at entry |
| `exit_regime` | VARCHAR(20) | YES | | Regime at exit |
| `operating_mode` | VARCHAR(15) | YES | | MANUAL, SUPERVISED, AUTONOMOUS |
| `created_at` | TIMESTAMP WITH TZ | NO | NOW() | Record creation timestamp |

**Indexes:**
- `idx_trades_instrument` ON (instrument)
- `idx_trades_entry_time` ON (entry_time)
- `idx_trades_grade` ON (grade)
- `idx_trades_regime` ON (regime)
- `idx_trades_r_multiple` ON (r_multiple)

### Table: `daily_metrics`

One row per trading day with aggregate performance data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `date` | DATE PK | NO | | Trading date |
| `equity_open` | NUMERIC(12,2) | NO | | Account equity at open |
| `equity_close` | NUMERIC(12,2) | NO | | Account equity at close |
| `realized_pnl` | NUMERIC(12,2) | NO | | Total realized P&L |
| `unrealized_pnl` | NUMERIC(12,2) | NO | | Unrealized P&L at close |
| `trades_taken` | INTEGER | NO | 0 | Number of trades |
| `wins` | INTEGER | NO | 0 | Winning trades |
| `losses` | INTEGER | NO | 0 | Losing trades |
| `r_total` | NUMERIC(8,3) | NO | 0.0 | Sum of R-multiples |
| `max_heat_pct` | NUMERIC(5,4) | NO | 0.0 | Peak portfolio heat |
| `drawdown_pct` | NUMERIC(5,4) | NO | 0.0 | Drawdown from HWM |
| `vix_close` | NUMERIC(6,2) | YES | | VIX closing value |
| `regime_primary` | VARCHAR(20) | YES | | Dominant regime |
| `survival_score` | SMALLINT | YES | | End-of-day survival score |
| `circuit_breakers_triggered` | JSONB | NO | '[]' | Any breakers that fired |
| `laws_violated` | JSONB | NO | '[]' | Law violations detected |
| `one_sentence_summary` | TEXT | YES | | Auto-generated daily summary |

### Table: `calibration_runs`

Records every calibration/optimization attempt.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `run_id` | VARCHAR(64) PK | NO | uuid_generate_v4() | Unique run identifier |
| `started_at` | TIMESTAMP WITH TZ | NO | | Run start time |
| `completed_at` | TIMESTAMP WITH TZ | YES | | Run completion time |
| `parameter_name` | VARCHAR(100) | NO | | Parameter being optimized |
| `old_value` | JSONB | NO | | Previous parameter value |
| `new_value` | JSONB | YES | | Proposed new value |
| `objective_function` | VARCHAR(50) | NO | | Objective used (expectancy, sharpe, etc.) |
| `in_sample_score` | NUMERIC(8,4) | YES | | In-sample performance |
| `out_sample_score` | NUMERIC(8,4) | YES | | Out-of-sample performance |
| `degradation_ratio` | NUMERIC(5,4) | YES | | OOS/IS ratio |
| `p_value` | NUMERIC(8,6) | YES | | Statistical significance |
| `status` | VARCHAR(20) | NO | 'PENDING' | PENDING, APPROVED, REJECTED, ROLLED_BACK |
| `approved_by` | VARCHAR(20) | YES | | 'human' or 'auto' |
| `rollback_marker` | VARCHAR(64) | YES | | Reference to previous config snapshot |

### Table: `research_findings`

Stores instrument research and universe selection results.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `finding_id` | VARCHAR(64) PK | NO | uuid_generate_v4() | Unique finding ID |
| `date` | DATE | NO | | Date of research |
| `instrument` | VARCHAR(20) | NO | | Instrument analyzed |
| `asset_class` | VARCHAR(20) | NO | | equities, futures, forex, crypto |
| `suitability_score` | NUMERIC(5,4) | YES | | PCTT suitability [0,1] |
| `adv_dollars` | NUMERIC(16,2) | YES | | Average daily volume in USD |
| `spread_pct` | NUMERIC(6,4) | YES | | Average bid-ask spread % |
| `regime` | VARCHAR(20) | YES | | Regime classification |
| `recommendation` | VARCHAR(20) | YES | | INCLUDE, EXCLUDE, WATCHLIST |
| `notes` | TEXT | YES | | Analyst notes |

<!-- /SSOT-DB-01 -->

---

<!-- SSOT-DB-02 -->
## SSOT-DB-02: Redis Key Schema (Warm Tier)

**Source:** Architecture Part 1, Section 5.2, Part 4 Fixes

All warm-tier data is stored in Redis for sub-10ms access. Keys use colon-delimited namespacing.

| Key Pattern | Data Type | TTL | Owner | Readers | Description |
|-------------|-----------|-----|-------|---------|-------------|
| `market:brief:{YYYY-MM-DD}` | Hash | 24h | Sentinel | All | Today's MarketBrief object |
| `regime:{instrument}` | Hash | Until changed | Regime | Signal, Risk | Current regime classification |
| `htf:{instrument}` | Hash | Until next ensemble run | Regime | Signal | Higher-timeframe slope for macro gate |
| `fsm:{instrument}` | String | Until changed | Signal | Execution | Current FSM state (IDLE, WAIT_RETEST, etc.) |
| `frozen:{instrument}:{break_bar}` | Hash | Until trade closed | Signal | Execution | Frozen Action + Safety Line structure |
| `consumed_breaks:{instrument}` | Hash | 24h | Signal | Signal | Set of consumed structure IDs for one-break-one-trade |
| `position:{position_id}` | Hash | Until closed | Execution | Risk, Journal | Active position state |
| `heat:portfolio` | String (float) | Real-time | Risk | All | Current portfolio heat percentage |
| `circuit:status` | String | Until cleared | Risk | All | Circuit breaker state (GREEN, SOFT_PAUSE, HARD_HALT) |
| `metrics:rolling20` | Hash | Per trade update | Journal | Risk, Orchestrator | Rolling 20-trade performance + KellyInputs |
| `config:params:{instrument}` | Hash | Until changed | Config | All | Active resolved parameters for instrument |
| `margin:aggregate` | Hash | 120s | Risk | All | AggregateMargin snapshot |
| `margin:positions` | Hash | 120s | Risk | Dashboard, Execution | Per-instrument MarginPosition data |
| `margin:stress` | Hash | 120s | Risk | Dashboard, Journal | LiquidationRisk snapshot |
| `margin:tier` | String | Until change | Risk | All | Current MarginHealthTier (GREEN, YELLOW, ORANGE, RED) |
| `performance:instrument:{sym}` | Hash | 24h | Journal | Orchestrator | Per-instrument rolling performance |
| `watchlist:active` | List | Until refresh | Sentinel | Signal, Regime | Current tradeable instrument list |
| `system:mode` | String | Until changed | Orchestrator | All | Current operating mode (MANUAL, SUPERVISED, AUTONOMOUS) |
| `system:phase` | String | Until changed | Orchestrator | All | Current workflow phase (PRE_MARKET, SESSION, POST_MARKET) |
| `alerts:active` | List | 24h | Sentinel | Orchestrator | Unresolved alert list |

<!-- /SSOT-DB-02 -->

---

<!-- SSOT-DB-03 -->
## SSOT-DB-03: SQLite Audit Log Schema

**Source:** Architecture Part 7, Section 30.3

Append-only SQLite database for tool invocation auditing. Never truncated during a session. Archived to Parquet weekly.

### Table: `tool_invocations`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `record_id` | TEXT PK | NO | UUID for each invocation |
| `timestamp` | TEXT | NO | ISO-8601 timestamp |
| `agent_name` | TEXT | NO | Invoking agent (Sentinel, Regime, Signal, etc.) |
| `tool_name` | TEXT | NO | Tool being invoked |
| `tool_category` | TEXT | NO | market_data, order_management, memory_write, etc. |
| `permission_level_required` | INTEGER | NO | 0=READ, 1=WRITE, 2=EXECUTE, 3=ADMIN |
| `permission_level_granted` | INTEGER | NO | Actual level granted |
| `parameters` | TEXT | NO | JSON-serialized input parameters |
| `result_summary` | TEXT | YES | Brief result description |
| `result_status` | TEXT | NO | SUCCESS, DENIED, ERROR, TIMEOUT |
| `approval_status` | TEXT | NO | NOT_REQUIRED, APPROVED, REJECTED, TIMEOUT, PENDING |
| `approved_by` | TEXT | YES | "human", "auto", "system_critical_override", or NULL |
| `approval_latency_ms` | REAL | YES | Time from request to approval |
| `execution_latency_ms` | REAL | NO | Tool execution time |
| `operating_mode` | TEXT | NO | MANUAL, SUPERVISED, AUTONOMOUS |
| `trace_id` | TEXT | YES | Distributed trace ID for trade lineage |
| `span_id` | TEXT | YES | Span within trace |
| `error_message` | TEXT | YES | Error details if status = ERROR |
| `session_date` | TEXT | NO | YYYY-MM-DD for partitioning |

**Indexes:**
- `idx_tool_inv_agent` ON (agent_name)
- `idx_tool_inv_tool` ON (tool_name)
- `idx_tool_inv_status` ON (result_status)
- `idx_tool_inv_session` ON (session_date)
- `idx_tool_inv_trace` ON (trace_id)
- `idx_tool_inv_approval` ON (approval_status)

**Pragmas:**
- `journal_mode = WAL` (Write-Ahead Logging for concurrent reads)
- `synchronous = NORMAL` (balance durability and speed)

<!-- /SSOT-DB-03 -->

---

<!-- SSOT-DB-04 -->
## SSOT-DB-04: Parquet Archive Schema

**Source:** Architecture Part 7, Section 30.3

Weekly archives of audit logs and daily snapshots of performance data. Stored as partitioned Parquet files for efficient analytical queries.

### Archive: `audit/tool_invocations/`

Partitioned by `session_date`. One Parquet file per week.

| Column | Parquet Type | Description |
|--------|-------------|-------------|
| `record_id` | STRING | UUID |
| `timestamp` | TIMESTAMP | Invocation time |
| `agent_name` | STRING | Agent identity |
| `tool_name` | STRING | Tool invoked |
| `tool_category` | STRING | Tool category |
| `permission_level_required` | INT32 | Required permission level |
| `permission_level_granted` | INT32 | Granted level |
| `parameters` | STRING | JSON-serialized parameters |
| `result_status` | STRING | SUCCESS, DENIED, ERROR, TIMEOUT |
| `approval_status` | STRING | NOT_REQUIRED, APPROVED, REJECTED, TIMEOUT |
| `execution_latency_ms` | FLOAT | Execution time |
| `operating_mode` | STRING | System mode at time of call |
| `trace_id` | STRING | Trade lineage trace |
| `session_date` | STRING | YYYY-MM-DD partition key |

### Archive: `performance/daily_snapshots/`

Partitioned by month. Contains daily equity, drawdown, and metric snapshots.

| Column | Parquet Type | Description |
|--------|-------------|-------------|
| `date` | DATE | Trading date |
| `equity` | FLOAT64 | Account equity at close |
| `drawdown_pct` | FLOAT64 | Drawdown from HWM |
| `heat_max_pct` | FLOAT64 | Peak heat for the day |
| `trades` | INT32 | Trades executed |
| `r_total` | FLOAT64 | Sum of R-multiples |
| `win_rate_rolling20` | FLOAT64 | Rolling 20-trade win rate |
| `expectancy_rolling20` | FLOAT64 | Rolling 20-trade expectancy |
| `profit_factor_rolling20` | FLOAT64 | Rolling 20-trade profit factor |
| `survival_score` | INT32 | End-of-day survival score |
| `regime_primary` | STRING | Primary regime classification |

### Archive: `trades/historical/`

Partitioned by quarter. Complete trade records for backtesting and analysis.

Same schema as PostgreSQL `trades` table, converted to Parquet types (TIMESTAMP, FLOAT64, STRING, etc.).

<!-- /SSOT-DB-04 -->

---

<!-- SSOT-API-WS-01 -->
## SSOT-API-WS-01: WebSocket Protocol

**Source:** Architecture Part 5 (SSOT-batch2b), Part 1 Section 4

Connection endpoint: `ws://127.0.0.1:8765`

### Message Envelope

All WebSocket messages use a standard JSON envelope:

```json
{
  "type": "<MESSAGE_TYPE>",
  "timestamp": "<ISO-8601>",
  "source": "<agent_name>",
  "payload": { ... },
  "sequence": 12345,
  "trace_id": "<optional-trace-id>"
}
```

### Message Types (Backend to Frontend)

| Type | Source | Payload Schema | Description |
|------|--------|---------------|-------------|
| `INIT` | System | `InitPayload` | Full state snapshot on connection |
| `REGIME_UPDATE` | Regime | `{instrument, regime, confidence, er, duration_bars, htf_slope, htf_direction}` | Regime classification change |
| `ENTRY_PROPOSAL` | Signal | `{instrument, direction, entry_price, action_line, safety_line, q_score, grade, d_geom, rejection_score}` | New trade proposal |
| `RISK_ASSESSMENT` | Risk | `{approved, position_size, risk_dollars, risk_pct, heat_after, drawdown_scale, survival_score}` | Risk validation result |
| `APPROVAL_REQUEST` | Orchestrator | `{request_id, proposal, risk_assessment, expires_at}` | Requires human decision |
| `ORDER_UPDATE` | Execution | `{order_id, status, fill_price, fill_size, slippage}` | Order lifecycle updates |
| `POSITION_UPDATE` | Execution | `{position_id, instrument, trailing_phase, current_stop, unrealized_pnl, r_multiple}` | Position state changes |
| `TRADE_CLOSED` | Execution | `{trade_id, instrument, exit_reason, r_multiple, pnl}` | Position closed |
| `ALERT` | Any | `{level, title, message, agent}` | System alert (INFO, WARNING, URGENT, CRITICAL) |
| `DAILY_REPORT` | Journal | `{date, pnl, trades, wins, losses, r_total, edge_decay_status}` | End-of-day summary |
| `MARGIN_UPDATE` | Risk | `{tier, margin_ratio, excess_margin, buying_power}` | Margin health change |
| `CIRCUIT_BREAKER` | Risk | `{type, action, reason}` | Circuit breaker activation |
| `SYSTEM_MODE` | Orchestrator | `{old_mode, new_mode, reason}` | Operating mode change |
| `PIPELINE_STATUS` | Signal | `{instrument, stage, passed, total_processed, total_signals}` | Pipeline stage statistics |
| `EDGE_DECAY` | Journal | `{triggers_active, trigger_details, recommendation}` | Edge decay alert |

### Message Types (Frontend to Backend)

| Type | Target | Payload Schema | Description |
|------|--------|---------------|-------------|
| `APPROVE_TRADE` | Orchestrator | `{request_id}` | Approve entry at gate |
| `REJECT_TRADE` | Orchestrator | `{request_id, reason}` | Reject entry at gate |
| `MODIFY_TRADE` | Orchestrator | `{request_id, modifications}` | Modify and approve |
| `OVERRIDE_STOP` | Execution | `{position_id, new_stop, reason}` | Manual stop adjustment (Gate 3) |
| `RESUME_TRADING` | Orchestrator | `{confirm, conditions}` | Resume after halt (Gate 4) |
| `CHANGE_MODE` | Orchestrator | `{target_mode, reason}` | Request mode change |
| `HEARTBEAT` | System | `{}` | Keep-alive ping |

### InitPayload Schema

Sent once on connection. Contains complete system state.

```json
{
  "equity": 102340.00,
  "drawdown_pct": 0.021,
  "survival_score": 9,
  "mode": "SUPERVISED",
  "phase": "SESSION",
  "positions": [ ... ],
  "regime_map": { "AAPL": "TRENDING", "NVDA": "VOLATILE" },
  "watchlist": ["AAPL", "MSFT", "NVDA"],
  "heat_pct": 0.018,
  "circuit_breaker": "GREEN",
  "margin_tier": "GREEN",
  "rolling_metrics": { "win_rate": 0.62, "expectancy": 0.45, "profit_factor": 1.92 },
  "pending_approvals": [],
  "alerts": []
}
```

<!-- /SSOT-API-WS-01 -->

---

<!-- SSOT-API-REST-01 -->
## SSOT-API-REST-01: Internal REST Endpoints

**Source:** Architecture Parts 1-7 (derived from agent tool interfaces)

Base URL: `http://127.0.0.1:8766/api/v1`

All endpoints return JSON. Authentication is via local-only access (no external exposure).

### System Endpoints

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | `/system/status` | None | `{mode, phase, agents: {name: status}, uptime_seconds}` | System health check |
| GET | `/system/config` | None | `{resolved_params: {...}}` | Current resolved configuration |
| POST | `/system/mode` | `{target_mode, reason}` | `{success, old_mode, new_mode}` | Change operating mode |
| POST | `/system/halt` | `{reason}` | `{halted: true}` | Emergency halt |
| POST | `/system/resume` | `{conditions}` | `{resumed: true}` | Resume after halt |

### Portfolio Endpoints

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | `/portfolio/positions` | None | `[{position_id, instrument, direction, size, entry_price, current_price, r_multiple, trailing_phase}]` | All open positions |
| GET | `/portfolio/heat` | None | `{current_heat, max_heat, positions_contributing: [...]}` | Portfolio heat breakdown |
| GET | `/portfolio/equity` | `?period=30d` | `{equity_curve: [{date, value}], drawdown_pct, hwm}` | Equity curve data |
| GET | `/portfolio/margin` | None | `{aggregate_margin, per_position: [...], stress_scenarios: [...]}` | Complete margin snapshot |

### Trade Endpoints

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | `/trades/history` | `?from=&to=&instrument=&grade=` | `[PCTTTradeRecord]` | Historical trades |
| GET | `/trades/{trade_id}` | None | `PCTTTradeRecord` | Single trade detail |
| GET | `/trades/pending` | None | `[{proposal_id, instrument, direction, q_score, expires_at}]` | Pending approval requests |
| POST | `/trades/{request_id}/approve` | `{modifications?}` | `{approved: true}` | Approve trade proposal |
| POST | `/trades/{request_id}/reject` | `{reason}` | `{rejected: true}` | Reject trade proposal |

### Analytics Endpoints

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | `/analytics/rolling` | `?window=20` | `{win_rate, expectancy, profit_factor, sharpe, sortino}` | Rolling metrics |
| GET | `/analytics/edge-decay` | None | `{triggers_active, trigger_details, consecutive_alerts}` | Edge decay status |
| GET | `/analytics/regime` | `?instrument=` | `{regime, confidence, ensemble_votes, duration_bars}` | Current regime for instrument |
| GET | `/analytics/daily-report` | `?date=` | `DailyReport` | Daily performance report |
| GET | `/analytics/weekly-report` | `?week_ending=` | `WeeklyReport` | Weekly review report |

### Calibration Endpoints

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | `/calibration/runs` | `?status=&parameter=` | `[CalibrationRun]` | Calibration history |
| POST | `/calibration/run` | `{parameter, search_space, data_range}` | `{run_id, status: PENDING}` | Start calibration run |
| POST | `/calibration/{run_id}/approve` | None | `{applied: true}` | Approve parameter change |
| POST | `/calibration/{run_id}/rollback` | None | `{rolled_back: true}` | Rollback to previous params |

<!-- /SSOT-API-REST-01 -->

---

<!-- SSOT-API-BROKER-01 -->
## SSOT-API-BROKER-01: IBKR TWS Integration

**Source:** Architecture Part 1, Section 12.2 (Technology Stack)

### Connection

| Parameter | Value | Description |
|-----------|-------|-------------|
| API | TWS API (IB Gateway preferred) | Interactive Brokers Trader Workstation API |
| Protocol | Socket (TCP) | Native socket connection |
| Host | `127.0.0.1` | Local connection to IB Gateway |
| Port | 7497 (paper), 7496 (live) | TWS port for paper/live trading |
| Client ID | 1 (primary), 2 (data), 3 (backup) | Multiple client IDs for separation |
| Heartbeat | 60 seconds | Connection keepalive interval |
| Reconnect | Automatic, 5 second backoff, max 3 retries | Reconnection policy |

### Order Types Used

| Order Type | PCTT Usage | Parameters |
|-----------|-----------|------------|
| LMT (Limit) | Entry orders, partial exits | Price = rejection bar close +/- 1 tick |
| STP (Stop) | Initial stop-loss | Price = Safety Line +/- buffer |
| STP LMT (Stop Limit) | Trailing stops | Stop = trigger, limit = stop - slippage buffer |
| MKT (Market) | Fail-fast exits, circuit breaker exits | No price. Speed over price. |
| MOC (Market on Close) | EOD position flatten | Executed at closing auction |

### Data Subscriptions

| Data Type | Request Method | Frequency | Description |
|-----------|---------------|-----------|-------------|
| Real-time bars | `reqRealTimeBars` | 5-second intervals | Live OHLCV for active instruments |
| Historical bars | `reqHistoricalData` | On demand | Backfill for pivot detection and regime |
| Market depth | `reqMktDepth` | Streaming | Level 2 data for liquidity assessment |
| Account updates | `reqAccountUpdates` | Real-time | Equity, margin, buying power |
| Position updates | `reqPositions` | Real-time | Open positions and sizes |
| Execution reports | `execDetails` callback | On fill | Fill confirmations with slippage data |
| Error handling | `error` callback | On error | Connection issues, order rejections, data errors |

### Error Handling

| Error Code | Meaning | PCTT Response |
|-----------|---------|---------------|
| 504 | Not connected | Attempt reconnect. Alert if 3 failures. |
| 110 | Price too far from market | Adjust limit order price. Retry once. |
| 201 | Order rejected | Log rejection reason. Alert human. |
| 202 | Order cancelled | Update position state. Log. |
| 162 | Historical data pacing violation | Backoff 15 seconds. Retry. |
| 1100 | Connectivity lost | Immediate alert. Queue pending orders. |
| 1102 | Connectivity restored (data lost) | Re-request all positions. Reconcile. |
| 2104 | Market data farm connected | Resume normal data flow. |
| 2106 | HMDS data farm connected | Resume historical data requests. |

<!-- /SSOT-API-BROKER-01 -->

---

<!-- SSOT-API-BROKER-02 -->
## SSOT-API-BROKER-02: Alpaca Integration

**Source:** Architecture Part 1, Section 12.2 (Alternative broker)

### Connection

| Parameter | Value | Description |
|-----------|-------|-------------|
| API | Alpaca Trading API v2 | REST + WebSocket |
| Base URL (Paper) | `https://paper-api.alpaca.markets` | Paper trading endpoint |
| Base URL (Live) | `https://api.alpaca.markets` | Live trading endpoint |
| Stream URL | `wss://stream.data.alpaca.markets/v2` | Market data WebSocket |
| Authentication | API Key + Secret Key | Environment variables: `APCA_API_KEY_ID`, `APCA_API_SECRET_KEY` |
| Rate Limit | 200 requests/minute | Per API key |

### Order Types Used

| Order Type | PCTT Usage | Alpaca API Field |
|-----------|-----------|-----------------|
| limit | Entry orders, partial exits | `type: "limit", limit_price: X` |
| stop | Initial stop-loss | `type: "stop", stop_price: X` |
| stop_limit | Trailing stops | `type: "stop_limit", stop_price: X, limit_price: Y` |
| market | Fail-fast, circuit breaker | `type: "market"` |
| trailing_stop | Alternative trailing method | `type: "trailing_stop", trail_percent: X` |

### Data Subscriptions (WebSocket)

| Channel | Message Type | Description |
|---------|-------------|-------------|
| `trades` | Trade | Real-time trade prints |
| `quotes` | Quote | Real-time NBBO quotes |
| `bars` | Bar | 1-minute aggregated bars |
| `dailyBars` | DailyBar | Daily bars |
| `updatedBars` | UpdatedBar | Corrected bars |
| `statuses` | Status | Trading halts, resumptions |

### Error Handling

| HTTP Code | Meaning | PCTT Response |
|-----------|---------|---------------|
| 403 | Forbidden (auth failure) | Alert critical. No retry. |
| 422 | Unprocessable (invalid order) | Log, parse error body, alert. |
| 429 | Rate limited | Backoff exponentially. Min 30 seconds. |
| 500 | Server error | Retry after 5 seconds. Max 3 retries. |
| WS disconnect | Stream lost | Reconnect with exponential backoff. |

### Account Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v2/account` | Account equity, buying power, PDT status |
| GET | `/v2/positions` | All open positions |
| GET | `/v2/positions/{symbol}` | Single position detail |
| GET | `/v2/orders` | Open and recent orders |
| POST | `/v2/orders` | Place new order |
| DELETE | `/v2/orders/{order_id}` | Cancel order |
| PATCH | `/v2/orders/{order_id}` | Modify order |
| DELETE | `/v2/positions/{symbol}` | Close position (market order) |

<!-- /SSOT-API-BROKER-02 -->

---

<!-- SSOT-API-DATA-01 -->
## SSOT-API-DATA-01: Polygon.io Market Data

**Source:** Architecture Part 1, Section 12.2

### Connection

| Parameter | Value | Description |
|-----------|-------|-------------|
| REST Base URL | `https://api.polygon.io` | Historical and reference data |
| WebSocket URL | `wss://socket.polygon.io` | Real-time streaming |
| Authentication | API Key (query param or header) | `apiKey=XXX` or `Authorization: Bearer XXX` |

### Subscription Tiers

| Tier | Price | Real-time | Historical | Websocket | PCTT Usage |
|------|-------|-----------|-----------|-----------|------------|
| Basic | Free | 15-min delay | 2 years, 5 calls/min | No | Development only |
| Starter | $29/mo | 15-min delay | 5 years, unlimited | No | Backtesting only |
| Developer | $79/mo | Real-time | Full history, unlimited | Yes (stocks) | Paper trading |
| Advanced | $229/mo | Real-time | Full history, unlimited | Yes (all) | Live trading (recommended) |

### Rate Limits

| Tier | REST Calls/Minute | WebSocket Subscriptions | Historical Calls/Minute |
|------|-------------------|------------------------|------------------------|
| Basic | 5 | 0 | 5 |
| Starter | Unlimited | 0 | Unlimited |
| Developer | Unlimited | 1000 tickers | Unlimited |
| Advanced | Unlimited | Unlimited | Unlimited |

### Endpoints Used

| Method | Path | Parameters | Response | PCTT Usage |
|--------|------|-----------|----------|------------|
| GET | `/v2/aggs/ticker/{ticker}/range/{mult}/{timespan}/{from}/{to}` | `adjusted=true, sort=asc, limit=50000` | OHLCV bars | Historical bars for pivot detection, regime, backtesting |
| GET | `/v2/aggs/ticker/{ticker}/prev` | None | Previous day bar | Overnight gap calculation |
| GET | `/v2/snapshot/locale/us/markets/stocks/tickers/{ticker}` | None | Current snapshot | Pre-market data, current price |
| GET | `/v3/reference/tickers` | `market=stocks, active=true, limit=1000` | Ticker list | Universe screening |
| GET | `/v2/last/trade/{ticker}` | None | Last trade | Real-time price check |
| GET | `/v2/last/nbbo/{ticker}` | None | Last NBBO quote | Spread calculation |

### WebSocket Channels

| Channel | Message Format | Description |
|---------|---------------|-------------|
| `T.{ticker}` | `{ev, sym, p, s, t, c, x, z}` | Real-time trades |
| `Q.{ticker}` | `{ev, sym, bp, bs, ap, as, t}` | Real-time NBBO quotes |
| `A.{ticker}` | `{ev, sym, o, h, l, c, v, s, e}` | Second aggregates |
| `AM.{ticker}` | `{ev, sym, o, h, l, c, v, s, e}` | Minute aggregates |
| `status` | `{ev, status, message}` | Connection status |

### Data Formats

| Field | Type | Description |
|-------|------|-------------|
| `o` | float | Open price |
| `h` | float | High price |
| `l` | float | Low price |
| `c` | float | Close price |
| `v` | float | Volume |
| `vw` | float | Volume-weighted average price |
| `t` | int64 | Timestamp (Unix ms) |
| `n` | int | Number of transactions |
| `otc` | bool | Whether OTC trade |

### Error Handling

| Status | Meaning | PCTT Response |
|--------|---------|---------------|
| 401 | Invalid API key | Alert critical. No retry. |
| 403 | Insufficient subscription | Alert. Recommend tier upgrade. |
| 429 | Rate limited | Backoff. Respect `Retry-After` header. |
| 500 | Server error | Retry after 2 seconds. Max 5 retries. |
| WS close code 1006 | Abnormal closure | Reconnect with 1s, 2s, 4s, 8s backoff. |

<!-- /SSOT-API-DATA-01 -->
