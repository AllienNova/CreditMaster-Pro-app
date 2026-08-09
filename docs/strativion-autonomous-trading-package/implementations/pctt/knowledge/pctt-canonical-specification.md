# PCTT: Pivot-Constrained Trendline Trading - Canonical Specification

**Version:** 1.0 (Canonical)
**Source papers:** v2 (Rigorous), v3 (RG Structure), v4 (Production-Grade)
**Purpose:** Single authoritative reference for LLM agents implementing or reasoning about PCTT.

---

## Overview

PCTT is a deterministic, non-repainting framework that converts subjective trendline analysis into a backtestable, automatable trading system. Its core innovation is **pivot-constrained objective scoring**: trendlines are not drawn by humans but selected algorithmically from all valid pivot-pair candidates using a fully specified scoring function, then normalized to a Quality Score (Q-Score) via sigmoid mapping.

The system produces a **Structure Object** each bar containing: support/resistance boundaries, Q-Scores, regime classification, FSM event labels, and normalized distances. This Structure API is embeddable inside any higher-level strategy.

The complete pipeline has 10 stages: Pivot Detection, Candidate Line Generation, Boundary Estimation, Q-Score Scoring, Regime Detection, Break Detection (FSM), Line Freezing, Retest and Rejection, Entry with Risk Geometry Filter, and Hybrid Trailing Stop.

---

## Complete Pipeline

1. Detect ATR-normalized pivot highs and lows from confirmed fractals.
2. Generate all valid pivot-pair candidate lines within the lookback window.
3. Estimate optimal boundaries using robust regression (Huber + RANSAC + Elastic Net).
4. Score each candidate and map to Q-Score via sigmoid normalization.
5. Classify market regime (Trending, Mean-Reverting, Choppy/Transition).
6. Detect boundary breaks via two-stage FSM (penetration then confirmation).
7. Freeze Action Line and Safety Line at break bar; project forward from frozen slope.
8. Detect retest of Action Line and score rejection quality (multi-feature, 3-of-4).
9. Enter on confirmed rejection if Risk Geometry filter passes (dGeom <= 2.5 ATR).
10. Manage trade via 5-phase hybrid trailing stop system.

---

## Stage 1: Pivot Detection

**ATR normalization:**

    TR_t = max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)
    ATR_t = (1/n) * SUM(TR_{t-i}, i=0..n-1)       [default n = 14]

**Pivot low** at bar i with left parameter L and right parameter R:

    PL_i exists if L_i = min(L_{i-L}, ..., L_i, ..., L_{i+R})

**Pivot high** at bar i:

    PH_i exists if H_i = max(H_{i-L}, ..., H_i, ..., H_{i+R})

**Defaults:** L = 2, R = 2. Pivot PL_i is confirmed only at bar i + R. This delay is the foundation of the non-repainting guarantee.

**Pivot classification:** Higher-High (HH), Higher-Low (HL), Lower-High (LH), Lower-Low (LL) by comparing successive pivots of the same type. Used for CHOCH/MSS detection and regime context.

---

## Stage 2: Candidate Line Generation

For pivot-pair (t_a, p_a) and (t_b, p_b) with t_a < t_b, define candidate line:

    l(t) = p_a + m * (t - t_a),  where m = (p_b - p_a) / (t_b - t_a)

**Lookback window:** default N = 200 bars. Only confirmed pivots within this window are used.

**Touch tolerance:** tau = alpha * ATR_t, where alpha in [0.10, 0.30] (default 0.30 ATR).

**Minimum requirements:**

| Condition                    | Minimum |
|:-----------------------------|:--------|
| Confirmed pivots available   | k >= 5  |
| Span between defining pivots | >= 20 bars |
| Inlier touches (RANSAC)     | >= 3    |
| Total bars in lookback       | n >= 50 |

**Candidate cap:** Last 8-12 pivots to keep O(K^2) complexity Pine-feasible.

---

## Stage 3: Boundary Estimation

Three methods are attempted; the candidate with the highest score wins.

**Method 1: Huber Loss Robust Regression**

Minimize the Huber loss function:

    L_delta(r) = (1/2) * r^2                    if |r| <= delta
    L_delta(r) = delta * (|r| - delta/2)         otherwise

where r is the residual and delta = 1.345 * sigma (default huber_epsilon = 1.35).

With **Elastic Net regularization** on slope m:

    theta_hat = argmin { SUM(L_delta(r_i)) + alpha * rho * |m| + alpha * (1-rho)/2 * m^2 }

**Defaults:** alpha = 0.01 (regularization strength), rho (l1_ratio) = 0.5.

**Method 2: RANSAC Consensus Validation**

1. Randomly select subset of pivots (min_samples = 2).
2. Fit candidate line to subset.
3. Count inlier pivots within residual_threshold = 1.0 * ATR.
4. Repeat for max_trials = 100 iterations.
5. Select line with largest inlier set; refit on all inliers.
6. Add consensus bonus: 0.5 * (n_inliers / n_total_pivots).

**Method 3: Pairwise Enumeration (fallback)**

Enumerate all pivot pairs, score each, select highest-scoring line meeting minimum touch requirement.

**Boundaries:** Upper boundary = max(residuals from fit), Lower boundary = min(residuals from fit). Slope constraint: |m| <= 0.02 * ATR per bar.

---

## Stage 4: Q-Score Quality Scoring

**Raw Score:**

    Score(l) = Touch_Reward + Span_Reward - Violation_Penalty

Where:

    Touch_Reward = SUM over pivots k: w_k * 1{touch}(k)
    w_k = 1 - (distance_k / tau_k)                       [weight in 0..1]
    Span_Reward  = omega_s * ln(1 + span)                 [omega_s = 0.2]
    Violation_Penalty = lambda * SUM over bars u: V_u     [lambda = 2.0]

**One-sided touch definition (support):**

    Touch_L(t_k) = 1 iff 0 <= PL_{t_k} - l(t_k) <= tau_{t_k}

**One-sided violation severity (support):**

    V_t^L = (l(t) - L_t) / ATR_t   if L_t < l(t) - tau_t, else 0
    Capped at 3.0 ATR maximum per violation.

Mirror definitions for resistance.

**Q-Score (sigmoid normalization to [0, 1]):**

    Q = 1 / (1 + e^{-Score/3})

**Grading:**

| Grade | Condition               | Risk Allocation  |
|:------|:------------------------|:-----------------|
| A     | Q >= 0.70 AND touches >= 3 | 1.0% equity risk |
| B     | Q >= 0.55 AND touches >= 2 | 0.5% equity risk |
| SKIP  | Q < 0.55                | No trade         |

**Optional calibration:** Isotonic regression mapping Q to P(success), recalibrated every 500 trades, monitored via Brier score.

---

## Stage 5: Regime Detection

**Efficiency Ratio (ER):**

    ER_t = |C_t - C_{t-n}| / SUM(|C_{t-i+1} - C_{t-i}|, i=1..n)

ER approaches 1 in strong trends, 0 in chop.

**Crossing Count (midline chop detector):**

    mu_t = (L_hat_t + U_hat_t) / 2            [midline of boundaries]
    Cross_t = SUM over i=1..n: 1{(P_{t-i} - mu_{t-i}) * (P_{t-i+1} - mu_{t-i+1}) < 0}

**Regime classification:**

    TRENDING:       ER_t >= 0.40 AND Cross_t <= theta_cross_max
    MEAN_REVERTING: ER_t <= 0.25 OR Cross_t >= theta_cross_min
    CHOPPY/TRANSITION: otherwise

**Strategy activation:** Allow break-retest logic only in TRENDING or TRANSITION regimes.

**Advanced extensions:** Hurst exponent estimation, Kalman-filtered slope on log-price, volatility-normalized slope (signal-to-noise ratio), CUSUM change-point detection.

---

## Stage 6: Break Detection (FSM)

All break detection uses **past-only boundaries**: the boundary at time t is estimated from data available at t-1, projected forward.

    L_hat_{t-1}(t) = b_{t-1}^L + m_{t-1}^L * (t - t_anchor)

**Two-stage break detection (downward break through support):**

Stage 1, Penetration (wick-based):

    Penetrate_down_t = L_t < L_hat_{t-1}(t) - beta_p * ATR_t

Stage 2, Confirmation (close-based):

    Break_down_t = Penetrate_down_t AND C_t < L_hat_{t-1}(t) - beta_c * ATR_t

**Buffer defaults:** beta_p (penetration) = 0.05-0.10 ATR, beta_c (confirmation) = 0.10-0.20 ATR.

Mirror definitions for upward breaks through resistance.

**State transitions:** IDLE -> WAIT_RETEST (on confirmed break). One-Break-One-Trade rule: FSM enters POST_TRADE after entry, failure, or timeout, preventing re-entry on the same break.

---

## Stage 7: Line Freezing Protocol

At break bar t_0:

**Action Line** (the broken boundary, frozen):

    A_0 = L_{t_0}  (or U_{t_0} for upward break)
    m_A = slope of broken boundary at t_0
    Action(t) = A_0 + m_A * (t - t_0)

**Safety Line** (the opposite boundary, frozen):

    S_0 = U_{t_0}  (or L_{t_0} for upward break)
    m_S = slope of opposite boundary at t_0
    Safety(t) = S_0 + m_S * (t - t_0)

**Non-repainting guarantee:** Once frozen, both lines are extrapolated forward from their frozen slope and intercept. They never recalculate regardless of subsequent price action.

---

## Stage 8: Retest and Rejection

**Retest window:** M = 12 bars after break confirmation.

**Retest detection:**

    Retest_t = (t - t_0 <= M) AND |P_t - Action(t)| <= gamma * ATR_t

where gamma (retest buffer) = 0.15-0.25 ATR.

**Robust Rejection Scoring (4 features, minimum 3 of 4 required):**

For SHORT entry (bearish rejection at retested support-turned-resistance):

| # | Feature              | Condition                                      |
|:--|:---------------------|:-----------------------------------------------|
| 1 | CLV                  | CLV_t = (2*C_t - H_t - L_t)/(H_t - L_t) < -0.3 |
| 2 | Wick/Body ratio      | Upper wick > 1.5x body                         |
| 3 | Candle direction     | C_t < O_t (bearish close)                      |
| 4 | Close vs Action Line | C_t < Action(t)                                |

For LONG entry (bullish rejection at retested resistance-turned-support):

| # | Feature              | Condition                                      |
|:--|:---------------------|:-----------------------------------------------|
| 1 | CLV                  | CLV_t > 0.3                                    |
| 2 | Wick/Body ratio      | Lower wick > 1.5x body                         |
| 3 | Candle direction     | C_t > O_t (bullish close)                      |
| 4 | Close vs Action Line | C_t > Action(t)                                |

    Reject_t = (SUM of satisfied features) >= 3

**Failure condition:**

    Fail_t (after bearish break) = C_t > Action(t) + delta * ATR_t
    Fail_t (after bullish break) = C_t < Action(t) - delta * ATR_t

**Timeout:** If no retest within M bars, FSM returns to IDLE.

---

## Stage 9: Entry with Risk Geometry Filter

**Entry:** On the close of the rejection confirmation bar.

**Risk Geometry Filter:**

    dGeom = |P_entry - Safety(t_entry)| / ATR_{t_entry}

Trade is allowed ONLY if:

    dGeom <= d_max        [default d_max = 2.5]

This prevents entries where the structural stop (Safety Line) is excessively far, creating hidden outsized risk.

**Stop loss:** Safety Line value at entry time.

    Stop = Safety(t_entry)

**Position sizing (fixed fractional):**

    Size = (Equity * Risk%) / |P_entry - Stop|

Risk% determined by grade: A-Grade = 1.0%, B-Grade = 0.5%.

---

## Stage 10: Hybrid Trailing Stop (5 Phases)

All stops are **monotonic** (never loosen: longs only raise, shorts only lower).

**Phase 1 - Structural:**

    Stop_0 = Safety(t_entry) +/- epsilon * ATR      [initial structural stop]

**Phase 2 - Break-Even Lock (at +0.8R profit):**

    Stop_BE = P_entry +/- epsilon_BE * ATR
    Triggers when unrealized profit >= 0.8 * |P_entry - Stop_0|

**Phase 3 - Partial Profit (at +1.0R):**

    Close 50-70% of position (default 60%)
    Trail remainder with tighter stop

**Phase 4 - Pivot Trailing (after +1.0R on remainder):**

    Stop_trail_long  = PL_last - epsilon_trail * ATR     [trail behind last pivot low]
    Stop_trail_short = PH_last + epsilon_trail * ATR     [trail above last pivot high]
    Updated only when a new confirmed pivot forms; monotonic enforcement.

**Phase 5 - Time Stop:**

    Exit if trade has not reached +1.0R within T_max bars   [default T_max = 20]

---

## Non-Repainting Guarantees

1. **Pivots:** Confirmed only after R bars pass. No future data can alter a confirmed pivot.
2. **Boundaries:** Scored using only data available at scoring time (past-only window ending at t-1).
3. **Break detection:** Uses L_hat_{t-1}(t), the boundary estimated from t-1 data projected to t. The break candle itself does not influence the boundary it breaks.
4. **FSM transitions:** Monotone state progression (IDLE -> WAIT_RETEST -> RETEST -> REJECT/FAIL/TIMEOUT -> POST_TRADE -> IDLE). No backward state changes.
5. **Frozen lines:** Once Action and Safety lines are frozen at break bar, they never recalculate.

Formally: dL_hat_t / dP_s = 0 for all s >= t.

---

## 30-Law Alignment

| PCTT Stage                | Relevant Trading Laws                                     |
|:--------------------------|:----------------------------------------------------------|
| Pivot Detection           | Law 11 (Structural Levels), Law 6 (Fractal Structure)    |
| Candidate Generation      | Law 12 (Multi-Timeframe Alignment), Law 3 (Volatility Compression) |
| Boundary Estimation       | Law 15 (Signal Filtration), Law 17 (Statistical Significance) |
| Q-Score Scoring           | Law 16 (Expectancy), Law 18 (Confirmation Confluence)    |
| Regime Detection          | Law 8 (Market Regimes), Law 5 (Mean Reversion)           |
| Break Detection (FSM)     | Law 1 (Market Inertia), Law 13 (Momentum)                |
| Line Freezing             | Law 14 (Path Dependency), Law 10 (Time Delays)           |
| Retest and Rejection      | Law 2 (Feedback Loops), Law 4 (Liquidity Gravity)        |
| Risk Geometry + Entry     | Law 21 (Position Sizing), Law 22 (Invalidation)          |
| Hybrid Trailing Stop      | Law 23 (Asymmetric Damage), Law 29 (Probability of Ruin) |
| Portfolio Management      | Law 24 (Systemic Correlation), Law 30 (Survival)         |
| Edge Monitoring           | Law 19 (Edge/Pattern Decay), Law 28 (Adaptation)         |
| Backtesting Integrity     | Law 20 (Backtest Illusion), Law 25 (Transaction Costs)   |
| System Simplicity         | Law 26 (Complexity Decay), Law 9 (Information Decay)     |
| Emotional Discipline      | Law 27 (Emotional Gravity), Law 7 (Fat Tails)            |

---

## Default Parameters Table

| Parameter                  | Symbol       | Default      | Unit/Range     |
|:---------------------------|:-------------|:-------------|:---------------|
| Pivot left bars            | L            | 2            | bars           |
| Pivot right bars           | R            | 2            | bars           |
| ATR period                 | n_atr        | 14           | bars           |
| Lookback window            | N            | 200          | bars           |
| Touch tolerance            | alpha        | 0.30         | ATR multiplier |
| Violation penalty weight   | lambda       | 2.0          | scalar         |
| Persistence weight         | omega_s      | 0.2          | scalar         |
| Huber epsilon              | delta_huber  | 1.35         | sigma units    |
| Elastic Net alpha          | alpha_reg    | 0.01         | scalar         |
| Elastic Net l1_ratio       | rho          | 0.5          | [0, 1]         |
| Max slope per bar          | m_max        | 0.02         | ATR/bar        |
| RANSAC min samples         | -            | 2            | pivots         |
| RANSAC max trials          | -            | 100          | iterations     |
| RANSAC residual threshold  | -            | 1.0          | ATR multiplier |
| Q-Score A threshold        | Q_A          | 0.70         | [0, 1]         |
| Q-Score B threshold        | Q_B          | 0.55         | [0, 1]         |
| Min pivots for estimation  | k_min        | 5            | pivots         |
| Min touches for valid line | -            | 3            | touches        |
| Min span                   | -            | 20           | bars           |
| ER trend threshold         | theta_ER     | 0.40         | [0, 1]         |
| ER range threshold         | -            | 0.25         | [0, 1]         |
| Penetration buffer         | beta_p       | 0.05-0.10    | ATR multiplier |
| Confirmation buffer        | beta_c       | 0.10-0.20    | ATR multiplier |
| Retest window              | M            | 12           | bars           |
| Retest buffer              | gamma        | 0.15-0.25    | ATR multiplier |
| Rejection features needed  | -            | 3 of 4       | count          |
| Risk geometry max          | d_max        | 2.5          | ATR units      |
| A-Grade risk               | r_A          | 1.0%         | equity         |
| B-Grade risk               | r_B          | 0.5%         | equity         |
| Break-even trigger         | -            | +0.8R        | R-multiple     |
| Partial profit trigger     | -            | +1.0R        | R-multiple     |
| Partial close %            | -            | 60%          | position       |
| Time stop                  | T_max        | 20           | bars           |
| Max portfolio heat         | H_max        | 6%           | equity         |
| Calibration window         | -            | 500          | trades         |

---

*End of canonical specification.*
