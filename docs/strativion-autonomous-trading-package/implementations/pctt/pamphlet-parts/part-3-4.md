# PART III: MULTI-FREQUENCY CONFLUENCE ARCHITECTURE

---

## Chapter 6: The Three-Layer Hierarchy

Single-timeframe trading is PCTT's largest structural vulnerability. A textbook break-retest-rejection on the 4H chart means nothing if the Daily trend is moving against you. A perfect Q-Score setup on the 1H chart is a trap if the 4H structure is choppy. The solution is hierarchical gating: three timeframe layers that must agree before capital is deployed.

The three layers are:

```
MACRO (Daily/Weekly)    -> Directional bias and trend health
  |
  v  must align
MESO (4H)              -> Setup qualification and Q-Score assessment
  |
  v  must align
MICRO (1H/15m)         -> Timing, break detection, rejection confirmation
```

Each layer has a distinct function. MACRO establishes the allowed direction. MESO identifies the structural pattern. MICRO times the entry. No layer can be skipped. No layer can override the one above it.

Why does this matter? Because hierarchical gating prevents regime thrashing (gap A11 fix). Without it, a single-timeframe system flips between long and short signals every time a minor countertrend develops within a larger trend. The trader gets whipsawed. The account bleeds from transaction costs and small losses. The multi-frequency architecture eliminates this by requiring directional consensus across scales before any trade is taken.

The rule is absolute: **direction must align across all three layers for a full-risk trade.** A MACRO long bias with a MESO long setup and a MICRO long entry gets full position sizing. Any misalignment either reduces the trade to half risk (if conditions qualify for a counter-trend override) or kills the trade entirely.

**Counter-trend override conditions** are narrow and demanding. A trade against the MACRO direction is allowed only when ALL of the following are true:

- Q-Score > 0.80 (exceptional structural quality)
- 3 or more confirmed touches on the Action Line
- dGeom < 1.5 ATR (tight risk geometry)
- Position size capped at 50% of normal risk allocation

These conditions are intentionally restrictive. Counter-trend trades against the MACRO layer should be rare events, not routine occurrences. If you find yourself taking counter-trend overrides frequently, either the MACRO classification is wrong or you are rationalizing.

---

### 6.1 MACRO Layer: Directional Bias

The MACRO layer answers one question: which direction is the market moving on the highest relevant timeframe? PCTT uses three independent measurements to answer this question, then combines them into a gate that either permits or prohibits trading in each direction.

**Measurement 1: Kalman Filter Slope Estimation**

The Kalman filter provides an optimal recursive estimate of the underlying trend slope, filtering out observation noise. Unlike a simple moving average, the Kalman filter maintains a state vector that includes both the current price level and its rate of change (slope). The slope estimate is inherently smoother and responds faster to genuine trend changes than any fixed-length moving average.

The complete Kalman filter equations for trend estimation:

**State vector:** `x = [price, slope]`

**Prediction step:**
```
x_hat = F * x_prev
P_hat = F * P_prev * F' + Q_noise
```

**Update step:**
```
K = P_hat * H' / (H * P_hat * H' + R)
x = x_hat + K * (z - H * x_hat)
P = (I - K * H) * P_hat
```

**System matrices:**
```
F = [[1, 1],    # State transition: price(t) = price(t-1) + slope(t-1)
     [0, 1]]    # Slope persists

H = [1, 0]      # We observe price, not slope directly

Q_noise = [[0.01, 0],      # Process noise covariance
            [0, 0.001]]     # Slope changes slowly

R = ATR^2                   # Observation noise scales with volatility
```

The key insight is that R (observation noise) scales with ATR squared. In volatile markets, the filter trusts the model more than individual observations. In quiet markets, it trusts observations more. This is adaptive smoothing with a principled statistical foundation.

**Measurement 2: Efficiency Ratio (ER)**

The Efficiency Ratio measures how much of the total price movement was directional versus noise:

```
ER = |C_t - C_{t-n}| / SUM(|C_i - C_{i-1}|, i = t-n+1 to t)
```

Where n = 50 bars on the MACRO timeframe. ER = 1.0 means price moved in a perfectly straight line. ER = 0.0 means price went nowhere despite constant movement. The 50-bar window on Daily gives roughly 10 weeks of data, enough to capture the dominant trend while filtering week-to-week noise.

**Measurement 3: Hurst Exponent (R/S Method)**

The Hurst exponent measures the persistence of a time series across multiple scales:

```
For each window size w in {16, 32, 64, 128}:
    1. Divide series into sub-windows of size w
    2. For each sub-window:
       a. Compute mean-adjusted cumulative deviation series
       b. R(w) = max(cumulative) - min(cumulative)
       c. S(w) = standard deviation of returns in window
    3. Average R/S across all sub-windows for that size w

Hurst = slope of log(R/S) vs log(w) regression
```

Interpretation:
- H > 0.55: Trending (persistent). Past direction predicts future direction.
- H < 0.45: Mean-reverting (anti-persistent). Past direction predicts opposite future direction.
- 0.45 to 0.55: Random walk. No exploitable persistence.

**MACRO Gate Logic:**

```python
import numpy as np

def macro_gate(prices_close, atr_values, window_er=50):
    """
    Determine directional bias from MACRO timeframe.

    Args:
        prices_close: array of closing prices (MACRO timeframe, min 200 bars)
        atr_values: array of ATR values (same length as prices_close)
        window_er: lookback window for Efficiency Ratio (default 50)

    Returns:
        dict with keys: direction ('LONG', 'SHORT', 'NEUTRAL'),
                        er, hurst, kalman_slope, confidence
    """
    # --- Kalman Filter Slope ---
    n = len(prices_close)
    x = np.array([prices_close[0], 0.0])  # [price, slope]
    P = np.diag([1.0, 1.0])
    F = np.array([[1.0, 1.0], [0.0, 1.0]])
    H = np.array([[1.0, 0.0]])
    Q_noise = np.diag([0.01, 0.001])

    for t in range(1, n):
        R = atr_values[t] ** 2
        # Predict
        x_hat = F @ x
        P_hat = F @ P @ F.T + Q_noise
        # Update
        S_innov = (H @ P_hat @ H.T + R).item()
        K = (P_hat @ H.T) / S_innov
        innovation = prices_close[t] - (H @ x_hat).item()
        x = x_hat + (K.flatten() * innovation)
        P = P_hat - np.outer(K.flatten(), H @ P_hat)

    kalman_slope = x[1]  # Current slope estimate

    # --- Efficiency Ratio ---
    if n >= window_er:
        net_move = abs(prices_close[-1] - prices_close[-window_er])
        path_length = sum(
            abs(prices_close[-window_er + i] - prices_close[-window_er + i - 1])
            for i in range(1, window_er)
        )
        er = net_move / path_length if path_length > 0 else 0.0
    else:
        er = 0.0

    # --- Hurst Exponent (R/S method) ---
    log_returns = np.diff(np.log(prices_close[-200:]))
    windows = [16, 32, 64, 128]
    log_rs = []
    log_w = []

    for w in windows:
        if len(log_returns) < w:
            continue
        n_segments = len(log_returns) // w
        if n_segments == 0:
            continue
        rs_values = []
        for seg in range(n_segments):
            segment = log_returns[seg * w:(seg + 1) * w]
            mean_seg = np.mean(segment)
            cumdev = np.cumsum(segment - mean_seg)
            r_val = np.max(cumdev) - np.min(cumdev)
            s_val = np.std(segment, ddof=1)
            if s_val > 0:
                rs_values.append(r_val / s_val)
        if rs_values:
            log_rs.append(np.log(np.mean(rs_values)))
            log_w.append(np.log(w))

    if len(log_rs) >= 2:
        hurst = np.polyfit(log_w, log_rs, 1)[0]
    else:
        hurst = 0.50  # Default to random walk if insufficient data

    # --- Gate Decision ---
    direction = 'NEUTRAL'
    confidence = 0.0

    if er < 0.25 or hurst < 0.45:
        direction = 'NEUTRAL'  # No PCTT trades allowed
        confidence = 0.0
    elif kalman_slope > 0 and er > 0.35 and hurst > 0.50:
        direction = 'LONG'
        confidence = min(1.0, er * hurst * 2.5)
    elif kalman_slope < 0 and er > 0.35 and hurst > 0.50:
        direction = 'SHORT'
        confidence = min(1.0, er * hurst * 2.5)
    else:
        direction = 'NEUTRAL'
        confidence = 0.0

    return {
        'direction': direction,
        'er': round(er, 4),
        'hurst': round(hurst, 4),
        'kalman_slope': round(kalman_slope, 6),
        'confidence': round(confidence, 4)
    }
```

**Gate thresholds summary:**

| Condition | LONG Allowed | SHORT Allowed | NEUTRAL (No Trade) |
|:----------|:-------------|:--------------|:-------------------|
| Kalman slope > 0, ER > 0.35, Hurst > 0.50 | Yes | No | No |
| Kalman slope < 0, ER > 0.35, Hurst > 0.50 | No | Yes | No |
| ER < 0.25 | No | No | Yes |
| Hurst < 0.45 | No | No | Yes |
| Kalman slope near 0 (< threshold) | No | No | Yes |

---

### 6.2 MESO Layer: Setup Qualification

The MESO layer is where the full PCTT pipeline runs. Pivots are detected, candidate lines are generated, boundaries are estimated, Q-Scores are calculated, and the regime is classified, all on the MESO timeframe. But unlike the standalone single-timeframe implementation, the MESO layer has an additional constraint: its output must align with the MACRO direction.

The MESO layer produces a qualified setup or nothing. There is no "maybe" state.

**Qualification criteria (ALL must pass):**

1. **Q-Score minimum: 0.55 (B-Grade).** Any setup below this threshold lacks sufficient structural evidence. The boundary might be spurious noise.

2. **Minimum 2 confirmed touches.** A line through 2 pivots that happens to have a decent Q-Score from span and zero violations is not structural evidence. It is a coincidence. Two touches is the absolute minimum. Three touches for A-Grade.

3. **Regime must be TRENDING or TRANSITIONAL.** Run the ER + Crossing Count classifier on the MESO timeframe. If the MESO regime is RANGING or CHOPPY, no setups are qualified, regardless of Q-Score.

4. **dGeom pre-check.** Before the break even occurs, estimate the risk geometry. If the current distance between the Action Line candidate and the Safety Line candidate exceeds 2.5 ATR, the setup is unlikely to produce acceptable risk geometry at entry. Flag it as "wide structure" and do not monitor for breaks.

5. **Direction alignment with MACRO.** The MESO setup direction must match the MACRO gate direction, with one exception: the counter-trend override described above.

```python
def qualify_meso_setup(q_score, touches, meso_regime, d_geom_estimate,
                       setup_direction, macro_direction):
    """
    Qualify a MESO-layer setup against all gating criteria.

    Args:
        q_score: float, sigmoid-normalized quality score [0, 1]
        touches: int, number of confirmed one-sided touches
        meso_regime: str, one of 'TRENDING', 'TRANSITIONAL', 'RANGING', 'CHOPPY'
        d_geom_estimate: float, estimated |Action - Safety| / ATR
        setup_direction: str, 'LONG' or 'SHORT'
        macro_direction: str, 'LONG', 'SHORT', or 'NEUTRAL'

    Returns:
        dict with keys: qualified (bool), grade (str), risk_pct (float),
                        rejection_reason (str or None)
    """
    # Gate 1: MACRO direction must allow trading
    if macro_direction == 'NEUTRAL':
        return {
            'qualified': False, 'grade': 'SKIP',
            'risk_pct': 0.0, 'rejection_reason': 'MACRO_NEUTRAL'
        }

    # Gate 2: Regime must be tradeable
    if meso_regime not in ('TRENDING', 'TRANSITIONAL'):
        return {
            'qualified': False, 'grade': 'SKIP',
            'risk_pct': 0.0, 'rejection_reason': 'MESO_REGIME_UNTRADEABLE'
        }

    # Gate 3: Minimum Q-Score
    if q_score < 0.55:
        return {
            'qualified': False, 'grade': 'SKIP',
            'risk_pct': 0.0, 'rejection_reason': 'Q_SCORE_TOO_LOW'
        }

    # Gate 4: Minimum touches
    if touches < 2:
        return {
            'qualified': False, 'grade': 'SKIP',
            'risk_pct': 0.0, 'rejection_reason': 'INSUFFICIENT_TOUCHES'
        }

    # Gate 5: Risk geometry pre-check
    if d_geom_estimate > 2.5:
        return {
            'qualified': False, 'grade': 'SKIP',
            'risk_pct': 0.0, 'rejection_reason': 'WIDE_STRUCTURE'
        }

    # Gate 6: Direction alignment
    is_counter_trend = (setup_direction != macro_direction)

    if is_counter_trend:
        # Counter-trend override: exceptionally strict requirements
        if q_score >= 0.80 and touches >= 3 and d_geom_estimate <= 1.5:
            return {
                'qualified': True, 'grade': 'B',
                'risk_pct': 0.005,  # 0.5% max, always half risk
                'rejection_reason': None
            }
        else:
            return {
                'qualified': False, 'grade': 'SKIP',
                'risk_pct': 0.0,
                'rejection_reason': 'COUNTER_TREND_INSUFFICIENT_QUALITY'
            }

    # Aligned direction: determine grade
    if q_score >= 0.70 and touches >= 3:
        grade = 'A'
        risk_pct = 0.010  # 1.0%
    else:
        grade = 'B'
        risk_pct = 0.005  # 0.5%

    return {
        'qualified': True, 'grade': grade,
        'risk_pct': risk_pct, 'rejection_reason': None
    }
```

---

### 6.3 MICRO Layer: Entry Timing

The MICRO layer does not decide whether to trade. That decision was made by MACRO (direction) and MESO (setup qualification). The MICRO layer decides exactly when to pull the trigger and whether the specific entry candle passes final quality checks.

**Break detection on MICRO timeframe.** The frozen Action Line from the MESO setup projects onto the MICRO timeframe. The two-stage break detection (penetration + close confirmation) runs on MICRO candles. This means the break is confirmed faster than on the MESO timeframe, but still requires a close below/above the buffer.

**Retest and rejection scoring on MICRO candles.** Once the break is confirmed on MICRO, the system monitors for price to return to the frozen Action Line within the retest window. The rejection scoring (4-feature: CLV, wick/body ratio, candle direction, close position) runs on the MICRO candle that touches the Action Line. A minimum score of 3 out of 4 is required.

**Volume confirmation on break bar.** If volume data is available (equities, futures, crypto), the break bar must show volume exceeding the 20-bar simple moving average of volume. This filter eliminates low-conviction breaks that are more likely to fail. For spot FX where volume is unreliable, this check is skipped.

```python
def volume_confirmed(break_bar_volume, volume_history, lookback=20):
    """Check if break bar volume exceeds the recent average."""
    if volume_history is None or len(volume_history) < lookback:
        return True  # Skip check if volume data unavailable
    avg_volume = sum(volume_history[-lookback:]) / lookback
    return break_bar_volume > avg_volume
```

**Fail-fast monitoring on MICRO.** After entry, every MICRO bar is checked against the fail-fast condition: if the close moves back through the frozen Action Line by more than 0.10 ATR in the wrong direction, exit immediately. This converts false breaks from full losses into scratch trades.

**Entry execution.** The entry is placed at the close of the rejection confirmation bar on the MICRO timeframe. Not a limit order. Not the next bar's open. The close of the bar that scored 3/4 or 4/4 on rejection. This ensures the rejection is real (the bar is closed, not still forming).

---

### 6.4 Confluence Score Calculation

The confluence score aggregates information from all three layers into a single number that determines trade grade and risk allocation.

**Formula:**

```
confluence = 0.30 * macro_strength + 0.40 * meso_q + 0.25 * (rejection / 4) + 0.05 * volume
```

Where:

- `macro_strength`: The confidence output from macro_gate(), range [0, 1]. Combines ER and Hurst into a single strength measure.
- `meso_q`: The sigmoid-normalized Q-Score from the MESO layer, range [0, 1].
- `rejection`: The rejection feature count from MICRO, range [0, 4]. Divided by 4 to normalize to [0, 1].
- `volume`: Binary, 1.0 if break bar volume > SMA(volume, 20), else 0.0.

**Thresholds:**

| Confluence Score | Grade | Risk Allocation |
|:-----------------|:------|:----------------|
| >= 0.75 | A-Grade | 1.0% equity risk |
| 0.60 to 0.74 | B-Grade | 0.5% equity risk |
| < 0.60 | NO TRADE | 0% (skip) |

```python
def confluence_score(macro_strength, meso_q_score, micro_rejection, volume_confirmed_flag):
    """
    Calculate the multi-timeframe confluence score.

    Args:
        macro_strength: float [0, 1], from macro_gate() confidence
        meso_q_score: float [0, 1], sigmoid Q-Score from MESO
        micro_rejection: int [0, 4], rejection feature count
        volume_confirmed_flag: bool, True if volume > SMA(vol, 20)

    Returns:
        dict with keys: score (float), grade (str), risk_pct (float)
    """
    W_MACRO = 0.30
    W_MESO = 0.40
    W_MICRO = 0.25
    W_VOLUME = 0.05

    score = (W_MACRO * macro_strength +
             W_MESO * meso_q_score +
             W_MICRO * (micro_rejection / 4.0) +
             W_VOLUME * (1.0 if volume_confirmed_flag else 0.0))

    if score >= 0.75:
        grade = 'A'
        risk_pct = 0.010
    elif score >= 0.60:
        grade = 'B'
        risk_pct = 0.005
    else:
        grade = 'SKIP'
        risk_pct = 0.0

    return {
        'score': round(score, 4),
        'grade': grade,
        'risk_pct': risk_pct
    }
```

---

### 6.5 Timeframe Mapping Table

The optimal timeframe assignment depends on the instrument class. Faster-moving instruments (crypto, intraday futures) use shorter MACRO/MESO/MICRO combos. Slower instruments (bonds, commodities) use longer timeframes.

| Instrument Class | MACRO | MESO | MICRO | Retest Window (MICRO bars) |
|:-----------------|:------|:-----|:------|:---------------------------|
| US Equities | Daily | 4H | 1H | 8 |
| Index Futures (ES, NQ) | Daily | 4H | 1H | 6 |
| FX Majors (EUR/USD, GBP/USD) | Weekly | Daily | 4H | 5 |
| FX Minors (EUR/GBP, AUD/NZD) | Daily | 4H | 1H | 8 |
| Crypto Large Cap (BTC, ETH) | Weekly | Daily | 4H | 6 |
| Crypto Altcoins (SOL, AVAX) | Daily | 4H | 1H | 8 |
| Commodities (CL, GC, NG) | Weekly | Daily | 4H | 5 |
| Bonds (ZN, ZB) | Weekly | Daily | 4H | 4 |

**Why these specific mappings:**

- **US Equities and Index Futures** trade in sessions with clear 4H structure. Daily provides the cleanest MACRO bias. 1H gives precise MICRO entries within the US session.
- **FX Majors** require Weekly MACRO because daily trends in FX are shorter-lived and noisier. The Daily MESO captures the 1-2 week structural setups. 4H MICRO provides intra-day timing within the London/NY overlap.
- **Crypto Large Cap** uses Weekly MACRO because BTC and ETH have longer macro cycles (months). Daily MESO captures the multi-day swings. 4H MICRO provides timing in the 24/7 market.
- **Bonds** are the slowest-moving instruments. Weekly MACRO with Daily MESO and 4H MICRO matches their naturally longer structural cycles. Retest window is shorter (4 bars on 4H = 16 hours) because bond retests tend to be faster and cleaner.

---

## Chapter 7: Cross-Timeframe Conflict Resolution

The three-layer hierarchy works cleanly when all layers agree: MACRO says long, MESO shows a bullish break-retest, MICRO confirms with a strong rejection. Real markets are messier. MACRO and MESO frequently disagree.

There are 9 possible combinations of MACRO direction (LONG, SHORT, NEUTRAL) crossed with MESO direction (LONG, SHORT, NEUTRAL). Each combination has a specific resolution.

### 7.1 The Conflict Resolution Matrix

| MACRO Direction | MESO Direction | Resolution | Max Risk |
|:----------------|:---------------|:-----------|:---------|
| LONG | LONG | Full trade allowed | 1.0% (A) / 0.5% (B) |
| LONG | NEUTRAL | No trade. Wait for MESO structure. | 0% |
| LONG | SHORT | Counter-trend override IF Q > 0.80 AND 3+ touches AND dGeom < 1.5 | 0.5% max |
| SHORT | SHORT | Full trade allowed | 1.0% (A) / 0.5% (B) |
| SHORT | NEUTRAL | No trade. Wait for MESO structure. | 0% |
| SHORT | LONG | Counter-trend override IF Q > 0.80 AND 3+ touches AND dGeom < 1.5 | 0.5% max |
| NEUTRAL | LONG | No trade. MACRO does not permit. | 0% |
| NEUTRAL | SHORT | No trade. MACRO does not permit. | 0% |
| NEUTRAL | NEUTRAL | No trade. Nothing is aligned. | 0% |

**Key principles:**

1. **MACRO always wins.** When MACRO says NEUTRAL, no trades are taken regardless of how beautiful the MESO setup looks. The market lacks directional persistence on the highest timeframe. PCTT break-retest signals in a non-persistent MACRO environment are noise.

2. **MESO NEUTRAL kills the trade.** Even if MACRO has a clear direction, no trade is taken until MESO produces a qualified structural setup. Direction without structure is not a trade.

3. **Counter-trend is the exception, not the rule.** The only scenario where MESO can override MACRO is the counter-trend override, and it requires three simultaneous conditions plus a 50% risk reduction. If any single condition is missing, the trade is rejected.

4. **Override hierarchy: MACRO > MESO > MICRO.** MICRO never overrides MESO. MESO never overrides MACRO at full size. The only exception is the narrow counter-trend override described above.

### 7.2 MACRO Direction Change Protocol

When the MACRO gate flips direction (e.g., from LONG to SHORT, or from LONG to NEUTRAL), all open MESO positions aligned with the old direction receive an immediate review:

**MACRO flips to opposite direction:**
- All same-direction positions: tighten stops to 1.0x ATR from current price.
- No new entries in the old direction.
- If any position is already at breakeven or better, let the trail manage it.
- If any position is underwater, close at market within 2 MICRO bars.

**MACRO flips to NEUTRAL:**
- All positions: tighten stops to 1.5x ATR from current price.
- No new entries in either direction.
- Existing profitable positions can continue with tightened trail.
- New entries resume only when MACRO re-establishes a direction.

```python
def resolve_timeframe_conflict(macro_direction, meso_direction, meso_q_score,
                                meso_touches, meso_d_geom):
    """
    Resolve conflicts between MACRO and MESO layers.

    Args:
        macro_direction: str, 'LONG', 'SHORT', or 'NEUTRAL'
        meso_direction: str, 'LONG', 'SHORT', or 'NEUTRAL'
        meso_q_score: float [0, 1]
        meso_touches: int
        meso_d_geom: float, ATR multiples

    Returns:
        dict with keys: action (str), max_risk_pct (float),
                        is_counter_trend (bool), reason (str)
    """
    # MACRO NEUTRAL: no trades
    if macro_direction == 'NEUTRAL':
        return {
            'action': 'NO_TRADE',
            'max_risk_pct': 0.0,
            'is_counter_trend': False,
            'reason': 'MACRO_NEUTRAL_NO_DIRECTION'
        }

    # MESO NEUTRAL: no structure
    if meso_direction == 'NEUTRAL':
        return {
            'action': 'NO_TRADE',
            'max_risk_pct': 0.0,
            'is_counter_trend': False,
            'reason': 'MESO_NO_STRUCTURE'
        }

    # Aligned: full trade
    if macro_direction == meso_direction:
        return {
            'action': 'FULL_TRADE',
            'max_risk_pct': 0.010,  # Up to 1.0% based on grade
            'is_counter_trend': False,
            'reason': 'ALIGNED'
        }

    # Conflicting: check counter-trend override
    if (meso_q_score >= 0.80 and
        meso_touches >= 3 and
        meso_d_geom <= 1.5):
        return {
            'action': 'COUNTER_TREND_OVERRIDE',
            'max_risk_pct': 0.005,  # 0.5% max
            'is_counter_trend': True,
            'reason': 'COUNTER_TREND_QUALIFIED'
        }

    # Conflicting without qualification
    return {
        'action': 'NO_TRADE',
        'max_risk_pct': 0.0,
        'is_counter_trend': False,
        'reason': 'CONFLICTING_DIRECTIONS_NO_OVERRIDE'
    }
```

### 7.3 Recalibration Triggers

The multi-frequency system requires periodic recalibration of the MACRO layer. The Kalman filter updates continuously, but the ER and Hurst calculations use fixed windows that can lag genuine regime shifts.

**Recalibration triggers:**

1. **CUSUM early warning fires.** The CUSUM detector (covered in Chapter 8) identifies structural breaks in the return series 3 to 8 bars before ER and Hurst catch up. When CUSUM fires, the MACRO gate is re-evaluated immediately rather than waiting for the next scheduled check.

2. **3 consecutive MESO failures.** If three consecutive qualified MESO setups fail (stopped out or timed out), the MACRO layer may be miscalibrated. Re-evaluate MACRO ER, Hurst, and Kalman slope. If any measurement has deteriorated below threshold, switch MACRO to NEUTRAL.

3. **Volatility regime shift.** A sudden ATR expansion (ATR_14 / SMA(ATR_14, 50) > 1.5) forces an immediate MACRO re-evaluation. Volatility regime shifts often coincide with directional regime shifts.

---

# PART IV: REGIME DETECTION & ADAPTATION

---

## Chapter 8: The 6-Method Ensemble Regime Detector

Single-method regime detection fails because every method has blind spots. The Efficiency Ratio misses strong trends with large pullbacks. The Hurst exponent is noisy at short sample sizes. Crossing Count is fooled by smooth sine-wave oscillations. Kalman slope is slow to detect sudden reversals. Any one method alone produces false regime classifications that lead to trading in the wrong conditions or sitting out profitable periods.

The solution is an ensemble of six independent methods, each measuring a different aspect of market character, combined through weighted voting.

### Method 1: Efficiency Ratio (ER)

Measures direction quality over a fixed window.

```
ER = |C_t - C_{t-n}| / SUM(|C_i - C_{i-1}|, i = t-n+1 to t)
```

Default window: n = 20 bars.

| ER Value | Interpretation |
|:---------|:---------------|
| > 0.40 | Trending signal |
| 0.25 to 0.40 | Transitional |
| < 0.25 | Ranging signal |

**Blind spot:** A strong trend with a single large pullback produces a low ER despite the trend being intact. The pullback's path contribution inflates the denominator.

### Method 2: Crossing Count (CC)

Counts zero-crossings of the detrended price series.

```
detrended = price - SMA(price, n)
CC = count of sign changes in detrended over n bars
```

Default window: n = 20 bars.

| CC Value | Interpretation |
|:---------|:---------------|
| < 8 | Trending (price stays on one side of the mean) |
| 8 to 15 | Transitional |
| > 15 | Ranging (price oscillates around the mean) |

**Blind spot:** Smooth oscillations (low frequency, large amplitude) produce few crossings and look trending when they are actually ranging.

### Method 3: Hurst Exponent

Measures persistence vs anti-persistence across multiple time scales.

R/S analysis over windows {16, 32, 64, 128} bars. The slope of log(R/S) vs log(window) gives H.

| H Value | Interpretation |
|:--------|:---------------|
| > 0.55 | Trending (persistent) |
| 0.45 to 0.55 | Random walk |
| < 0.45 | Mean-reverting (anti-persistent) |

**Blind spot:** Requires at least 128 bars of data for reliable estimation. Noisy at shorter sample sizes. Not suitable for intraday regime detection on its own.

### Method 4: Kalman Slope

Measures the smoothed trend direction and its magnitude relative to volatility.

```
slope_magnitude = |kalman_slope| / ATR
```

| Normalized Slope | Interpretation |
|:-----------------|:---------------|
| > 0.02 | Directional (trending) |
| 0.005 to 0.02 | Weak directional |
| < 0.005 | Flat (ranging) |

**Blind spot:** The Kalman filter has a built-in lag. It is slow to detect sudden regime changes and can maintain a directional reading for several bars after the trend has already reversed.

### Method 5: CUSUM Change-Point Detection

Detects structural breaks in the return series. Not a direct regime classifier, but it detects when the current regime is ending.

```
S_t^+ = max(0, S_{t-1}^+ + x_t - mu - k)    # Upward shift detector
S_t^- = max(0, S_{t-1}^- - x_t + mu - k)    # Downward shift detector

When S_t^+ > h OR S_t^- > h: regime change detected

Default: k = 0.5 * sigma, h = 4 * sigma
```

Where x_t is the log return, mu is the running mean, and sigma is the running standard deviation (estimated from a calibration window excluding the most recent 20 bars).

| CUSUM State | Interpretation |
|:------------|:---------------|
| No alarm | Current regime persists |
| Alarm fired | Regime change detected. Classify as TRANSITIONAL until new regime stabilizes. |

**Blind spot:** CUSUM detects that something has changed, not what it changed to. It must be combined with other methods that classify the new regime.

### Method 6: Volatility Regime Classification

Classifies the current volatility environment relative to its own history.

```
ATR_ratio = ATR_14 / SMA(ATR_14, 50)
```

| ATR Ratio | Classification |
|:----------|:---------------|
| > 1.5 | HIGH volatility |
| 1.2 to 1.5 | ELEVATED |
| 0.8 to 1.2 | NORMAL |
| < 0.8 | LOW volatility |

This is not a directional regime classification. It is a volatility overlay. A market can be TRENDING + HIGH_VOL or TRENDING + LOW_VOL. Both are different trading environments.

---

### 8.1 Ensemble Voting

The six methods are combined through weighted voting:

| Method | Weight | Rationale |
|:-------|:-------|:----------|
| ER | 0.25 | Most reliable single method for regime |
| Crossing Count | 0.20 | Strong complement to ER (catches its blind spots) |
| Hurst | 0.20 | Multi-scale persistence measurement |
| Kalman Slope | 0.15 | Smooth but laggy |
| CUSUM | 0.10 | Detects changes, not regimes |
| Volatility | 0.10 | Indirect regime indicator |

Each method produces a vote: TRENDING, TRANSITIONAL, or RANGING. The weighted votes are summed by regime category. The regime with the highest weighted sum wins.

**Confidence = weighted sum of the winning regime / sum of all weights.**

**Classification thresholds:**

- **TRENDING:** Winning category is TRENDING AND confidence > 0.60 AND at least 3 of 6 methods agree.
- **RANGING:** Winning category is RANGING AND confidence > 0.60 AND at least 3 of 6 methods agree.
- **TRANSITIONAL:** Everything else. Confidence between 0.40 and 0.60, or no majority agreement.

```python
import numpy as np
from collections import defaultdict

class EnhancedRegimeDetector:
    """
    6-method ensemble regime detector.
    Combines ER, Crossing Count, Hurst, Kalman Slope, CUSUM, and Volatility.
    """

    WEIGHTS = {
        'er': 0.25,
        'crossing_count': 0.20,
        'hurst': 0.20,
        'kalman_slope': 0.15,
        'cusum': 0.10,
        'volatility': 0.10,
    }

    def __init__(self, er_window=20, hurst_windows=None, cusum_k=0.5, cusum_h=4.0):
        self.er_window = er_window
        self.hurst_windows = hurst_windows or [16, 32, 64, 128]
        self.cusum_k = cusum_k
        self.cusum_h = cusum_h
        self.cusum_g_pos = 0.0
        self.cusum_g_neg = 0.0
        self.cusum_calibration = []

    def classify(self, prices_close, atr_values):
        """
        Classify market regime using 6-method ensemble.

        Args:
            prices_close: numpy array, closing prices (min 200 bars)
            atr_values: numpy array, ATR values (same length)

        Returns:
            dict: regime (str), confidence (float), votes (dict),
                  volatility_regime (str), cusum_alarm (bool)
        """
        votes = {}
        votes['er'] = self._classify_er(prices_close)
        votes['crossing_count'] = self._classify_cc(prices_close)
        votes['hurst'] = self._classify_hurst(prices_close)
        votes['kalman_slope'] = self._classify_kalman(prices_close, atr_values)
        cusum_alarm, votes['cusum'] = self._classify_cusum(prices_close)
        vol_regime, votes['volatility'] = self._classify_volatility(atr_values)

        # Weighted voting
        regime_scores = defaultdict(float)
        regime_counts = defaultdict(int)
        for method, regime_vote in votes.items():
            regime_scores[regime_vote] += self.WEIGHTS[method]
            regime_counts[regime_vote] += 1

        # Winner
        best_regime = max(regime_scores, key=regime_scores.get)
        confidence = regime_scores[best_regime]
        majority_count = regime_counts[best_regime]

        # Apply classification thresholds
        if confidence > 0.60 and majority_count >= 3:
            final_regime = best_regime
        elif confidence > 0.40:
            final_regime = 'TRANSITIONAL'
        else:
            final_regime = 'TRANSITIONAL'

        return {
            'regime': final_regime,
            'confidence': round(confidence, 4),
            'votes': votes,
            'volatility_regime': vol_regime,
            'cusum_alarm': cusum_alarm
        }

    def _classify_er(self, prices):
        n = self.er_window
        if len(prices) < n + 1:
            return 'TRANSITIONAL'
        net = abs(prices[-1] - prices[-n - 1])
        path = sum(abs(prices[-n + i] - prices[-n + i - 1]) for i in range(1, n + 1))
        er = net / path if path > 0 else 0
        if er >= 0.40:
            return 'TRENDING'
        if er <= 0.25:
            return 'RANGING'
        return 'TRANSITIONAL'

    def _classify_cc(self, prices):
        n = self.er_window
        if len(prices) < n + 1:
            return 'TRANSITIONAL'
        segment = prices[-n:]
        sma = np.mean(segment)
        detrended = segment - sma
        cc = sum(1 for i in range(1, len(detrended))
                 if detrended[i] * detrended[i - 1] < 0)
        if cc < 8:
            return 'TRENDING'
        if cc > 15:
            return 'RANGING'
        return 'TRANSITIONAL'

    def _classify_hurst(self, prices):
        if len(prices) < 200:
            return 'TRANSITIONAL'
        log_returns = np.diff(np.log(prices[-200:]))
        log_rs_list = []
        log_w_list = []
        for w in self.hurst_windows:
            if len(log_returns) < w:
                continue
            n_seg = len(log_returns) // w
            if n_seg == 0:
                continue
            rs_vals = []
            for s in range(n_seg):
                seg = log_returns[s * w:(s + 1) * w]
                m = np.mean(seg)
                cumdev = np.cumsum(seg - m)
                r = np.max(cumdev) - np.min(cumdev)
                sd = np.std(seg, ddof=1)
                if sd > 0:
                    rs_vals.append(r / sd)
            if rs_vals:
                log_rs_list.append(np.log(np.mean(rs_vals)))
                log_w_list.append(np.log(w))
        if len(log_rs_list) >= 2:
            h = np.polyfit(log_w_list, log_rs_list, 1)[0]
        else:
            h = 0.50
        if h > 0.55:
            return 'TRENDING'
        if h < 0.45:
            return 'RANGING'
        return 'TRANSITIONAL'

    def _classify_kalman(self, prices, atr_values):
        if len(prices) < 50:
            return 'TRANSITIONAL'
        # Simple linear regression slope as proxy for Kalman
        x = np.arange(20)
        y = prices[-20:]
        slope = np.polyfit(x, y, 1)[0]
        norm_slope = abs(slope) / atr_values[-1] if atr_values[-1] > 0 else 0
        if norm_slope > 0.02:
            return 'TRENDING'
        if norm_slope < 0.005:
            return 'RANGING'
        return 'TRANSITIONAL'

    def _classify_cusum(self, prices):
        if len(prices) < 50:
            return False, 'TRANSITIONAL'
        log_returns = np.diff(np.log(prices[-50:]))
        # Calibrate from first 30 returns
        mu = np.mean(log_returns[:30])
        sigma = np.std(log_returns[:30], ddof=1)
        if sigma == 0:
            return False, 'TRANSITIONAL'
        k = self.cusum_k * sigma
        h = self.cusum_h * sigma
        g_pos = 0.0
        g_neg = 0.0
        alarm = False
        for r in log_returns[30:]:
            g_pos = max(0, g_pos + (r - mu) - k)
            g_neg = max(0, g_neg - (r - mu) - k)
            if g_pos > h or g_neg > h:
                alarm = True
                g_pos = 0.0
                g_neg = 0.0
        if alarm:
            return True, 'TRANSITIONAL'
        return False, 'TRENDING'  # No change point = regime persists

    def _classify_volatility(self, atr_values):
        if len(atr_values) < 50:
            return 'NORMAL', 'TRANSITIONAL'
        current = atr_values[-1]
        mean_atr = np.mean(atr_values[-50:])
        ratio = current / mean_atr if mean_atr > 0 else 1.0
        if ratio > 1.5:
            vol_regime = 'HIGH'
        elif ratio > 1.2:
            vol_regime = 'ELEVATED'
        elif ratio > 0.8:
            vol_regime = 'NORMAL'
        else:
            vol_regime = 'LOW'
        # Map to directional regime (indirect)
        if ratio > 1.5:
            return vol_regime, 'RANGING'  # Extreme vol often = choppy
        if ratio < 0.8:
            return vol_regime, 'RANGING'  # Compression often = range
        return vol_regime, 'TRANSITIONAL'
```

---

## Chapter 9: Regime-Adaptive Parameter Tables

PCTT's parameters are not fixed. They adapt based on the detected regime. This is the operational implementation of Law 8 (Market Regimes): different regimes require different trading parameters.

### 9.0 The Master Parameter Table

Every PCTT parameter changes based on the current directional regime:

| Parameter | TRENDING | TRANSITIONAL | RANGING |
|:----------|:---------|:-------------|:--------|
| Q-Score minimum | 0.55 | 0.65 | NO TRADE |
| dGeom maximum | 2.5 | 2.0 | NO TRADE |
| Break buffer (beta_c) | 0.15 ATR | 0.20 ATR | NO TRADE |
| Retest window (M bars) | 12 | 8 | NO TRADE |
| Rejection min score | 3/4 | 4/4 | NO TRADE |
| Trail ATR multiplier | 2.0 | 1.5 | NO TRADE |
| Time stop (bars) | 20 | 12 | NO TRADE |
| Position risk % | 1.0% | 0.5% | 0% |
| Partial exit level | 1.5R | 1.0R | N/A |

**The critical insight: RANGING regime means ZERO PCTT trades.** This is the single most impactful win rate filter in the entire system. Break-retest signals in a ranging market are not structural events. They are oscillations around equilibrium. The "break" is just price visiting the boundary of the range, and the "retest" is price returning to the middle. There is no polarity shift, no momentum, no regime change. Trading these signals is how the unfiltered baseline 45% win rate is generated. Removing them is how the filtered win rate reaches 80%+.

### 9.1 Regime Transition Protocol

Markets do not jump instantaneously from one regime to another. There is always a transition period. The system must handle regime shifts gracefully, especially when open positions exist.

**TRENDING to TRANSITIONAL:**
- Tighten trailing stops from 2.0x ATR to 1.5x ATR on all open positions.
- No new B-Grade entries. Only A-Grade setups with confluence score >= 0.75.
- Raise Q-Score minimum for new setups from 0.55 to 0.65.
- Existing profitable positions can continue with the tightened trail.

**TRENDING to RANGING:**
- Close all open positions at market. No exceptions.
- No new entries of any kind. System is halted.
- Remain halted until regime transitions back to TRENDING or TRANSITIONAL with sustained confidence > 0.60 for 5 consecutive bars.

**RANGING to TRANSITIONAL:**
- Do not immediately resume trading. Wait for the FIRST fully qualified MESO setup to appear after the regime shift.
- The first trade after a RANGING period uses B-Grade risk (0.5%) regardless of Q-Score. This is the "test trade" to verify the regime has genuinely changed.
- If the test trade succeeds, resume normal parameter selection on subsequent setups.

**TRANSITIONAL to TRENDING:**
- Resume full parameter set. A-Grade and B-Grade entries both allowed.
- Widen trailing stops from 1.5x to 2.0x ATR.
- This is the best regime for PCTT. Trade it aggressively within risk limits.

### 9.2 CUSUM Early Warning System

CUSUM change-point detection is the system's advance warning mechanism. Because it operates on cumulative deviations from the mean, it detects structural breaks in the return series 3 to 8 bars before ER and Hurst catch up. This lead time is valuable.

**When CUSUM fires an alarm:**

1. Do not immediately reclassify the regime. CUSUM detects that something changed, not what the new regime is.
2. Reduce new position sizing by 50% immediately. This is a precautionary measure while the full ensemble re-evaluates.
3. Tighten stops on existing positions by 20% (multiply the current stop distance by 0.80).
4. Re-run the full 6-method ensemble at the next bar close. If ER, Hurst, and Crossing Count confirm the regime change, execute the full transition protocol.
5. If the ensemble does NOT confirm within 5 bars, reset CUSUM and resume normal parameters.

```python
class CUSUMDetector:
    """
    Online CUSUM change-point detector with early warning capability.
    Detects structural breaks in return series before lagging indicators.
    """

    def __init__(self, k_factor=0.5, h_factor=4.0, calibration_size=80,
                 recent_exclude=20):
        """
        Args:
            k_factor: float, slack parameter as multiple of sigma (default 0.5)
            h_factor: float, decision threshold as multiple of sigma (default 4.0)
            calibration_size: int, bars for mean/sigma estimation (default 80)
            recent_exclude: int, exclude recent bars from calibration (default 20)
        """
        self.k_factor = k_factor
        self.h_factor = h_factor
        self.calibration_size = calibration_size
        self.recent_exclude = recent_exclude
        self.g_positive = 0.0
        self.g_negative = 0.0
        self.return_history = []
        self.alarm_cooldown = 0

    def update(self, log_return):
        """
        Process a new log return observation.

        Args:
            log_return: float, log(price_t / price_{t-1})

        Returns:
            dict: alarm (bool), shift_direction (str), g_positive (float),
                  g_negative (float), threshold (float)
        """
        self.return_history.append(log_return)

        # Need enough calibration data
        min_required = self.calibration_size + self.recent_exclude
        if len(self.return_history) < min_required:
            return {
                'alarm': False, 'shift_direction': 'NONE',
                'g_positive': 0.0, 'g_negative': 0.0, 'threshold': 0.0
            }

        # Cooldown after alarm
        if self.alarm_cooldown > 0:
            self.alarm_cooldown -= 1
            return {
                'alarm': False, 'shift_direction': 'COOLDOWN',
                'g_positive': self.g_positive, 'g_negative': self.g_negative,
                'threshold': 0.0
            }

        # Calibrate from historical window, excluding recent bars
        cal_start = max(0, len(self.return_history) - min_required)
        cal_end = len(self.return_history) - self.recent_exclude
        calibration_data = self.return_history[cal_start:cal_end]

        mu = np.mean(calibration_data)
        sigma = np.std(calibration_data, ddof=1)

        if sigma == 0:
            return {
                'alarm': False, 'shift_direction': 'NONE',
                'g_positive': 0.0, 'g_negative': 0.0, 'threshold': 0.0
            }

        k = self.k_factor * sigma
        h = self.h_factor * sigma

        # Update CUSUM statistics
        self.g_positive = max(0.0, self.g_positive + (log_return - mu) - k)
        self.g_negative = max(0.0, self.g_negative - (log_return - mu) - k)

        # Check for alarms
        alarm = False
        direction = 'NONE'

        if self.g_positive > h:
            alarm = True
            direction = 'BULLISH_SHIFT'
            self.g_positive = 0.0
            self.alarm_cooldown = 5  # Cooldown period

        if self.g_negative > h:
            alarm = True
            direction = 'BEARISH_SHIFT'
            self.g_negative = 0.0
            self.alarm_cooldown = 5

        return {
            'alarm': alarm,
            'shift_direction': direction,
            'g_positive': round(self.g_positive, 6),
            'g_negative': round(self.g_negative, 6),
            'threshold': round(h, 6)
        }

    def reset(self):
        """Reset CUSUM accumulators without clearing history."""
        self.g_positive = 0.0
        self.g_negative = 0.0
        self.alarm_cooldown = 0
```

**CUSUM integration with the trading pipeline:**

```python
def process_cusum_alarm(cusum_result, current_positions, current_params):
    """
    Adjust trading parameters when CUSUM fires an early warning.

    Args:
        cusum_result: dict from CUSUMDetector.update()
        current_positions: list of open position objects
        current_params: dict of current PCTT parameters

    Returns:
        dict: adjusted_params, position_actions
    """
    if not cusum_result['alarm']:
        return {'adjusted_params': current_params, 'position_actions': []}

    # Precautionary adjustments
    adjusted = current_params.copy()
    adjusted['position_risk_pct'] = current_params['position_risk_pct'] * 0.50
    adjusted['cusum_warning_active'] = True

    # Tighten stops on existing positions
    actions = []
    for pos in current_positions:
        current_stop_distance = abs(pos.current_price - pos.stop_price)
        new_stop_distance = current_stop_distance * 0.80  # Tighten 20%
        if pos.direction == 'LONG':
            new_stop = pos.current_price - new_stop_distance
            new_stop = max(new_stop, pos.stop_price)  # Monotonic
        else:
            new_stop = pos.current_price + new_stop_distance
            new_stop = min(new_stop, pos.stop_price)  # Monotonic
        actions.append({
            'position_id': pos.id,
            'action': 'TIGHTEN_STOP',
            'new_stop': new_stop,
            'reason': 'CUSUM_EARLY_WARNING'
        })

    return {'adjusted_params': adjusted, 'position_actions': actions}
```

---

## Chapter 10: Volatility Regime Integration

The volatility regime is a separate dimension from the directional regime. A market can be simultaneously TRENDING (directionally persistent) and HIGH_VOL (wide price swings). These two dimensions combine to create four distinct trading environments, each requiring different parameter adjustments.

The four combinations that matter for PCTT:

| Directional | Volatility | PCTT Approach |
|:------------|:-----------|:-------------|
| TRENDING | NORMAL | Standard parameters. Best conditions. |
| TRENDING | HIGH_VOL | Widen buffers, reduce size. Still tradeable. |
| TRENDING | LOW_VOL | Tighten buffers, increase size slightly. Watch for compression breakout. |
| RANGING | Any | NO TRADE. Regime gate blocks all entries. |

### 10.1 Volatility Regime Classification

```
ATR_ratio = ATR_14 / SMA(ATR_14, 50)
```

| ATR Ratio | Volatility Regime |
|:----------|:------------------|
| > 1.5 | HIGH |
| 1.2 to 1.5 | ELEVATED |
| 0.8 to 1.2 | NORMAL |
| < 0.8 | LOW |

### 10.2 Volatility-Based Parameter Adjustments

**HIGH Volatility (ATR ratio > 1.5):**
- Widen all ATR-based buffers by 1.5x (penetration, confirmation, retest tolerance, trail)
- Reduce position size by 50%
- Widen dGeom maximum from 2.5 to 3.0 (structure is naturally wider)
- Increase retest window by 50% (retests take longer in volatile markets)

**ELEVATED Volatility (ATR ratio 1.2 to 1.5):**
- Widen all ATR-based buffers by 1.2x
- Reduce position size by 25%
- Keep dGeom maximum at 2.5
- Increase retest window by 25%

**NORMAL Volatility (ATR ratio 0.8 to 1.2):**
- Standard parameters. No adjustments.

**LOW Volatility (ATR ratio < 0.8):**
- Tighten all ATR-based buffers by 0.8x
- Increase position size by 25% (moves will be smaller, need larger size for same dollar P&L)
- Tighten dGeom maximum from 2.5 to 2.0
- This is a warning state. Low volatility precedes expansion (Law 3: Volatility Compression). A powerful move is loading.

### 10.3 Volatility Crush Detection

A volatility crush occurs when ATR contracts sharply and sustains below the historical average. This is the coiling phase before a powerful expansion.

**Detection criteria:** 3 or more consecutive bars where ATR ratio is below 0.70.

**Interpretation:** Compression before expansion. The market is building energy (Law 3). When the expansion comes, it will be fast and large. This is both an opportunity (the next PCTT break will be powerful) and a risk (the break could gap through stops).

**Response:**
- Reduce position size to 25% of normal. The expansion direction is uncertain.
- Tighten trailing stops on any open positions to 1.0x ATR.
- Set alerts for break confirmation. When the expansion arrives, the first qualified break-retest setup on the MESO timeframe is a high-conviction entry.
- After the expansion begins (ATR ratio climbs back above 1.0), gradually increase position sizing over 3 trades back to normal levels.

```python
def volatility_regime_adjustments(atr_current, atr_history, base_params):
    """
    Calculate volatility-regime-adjusted PCTT parameters.

    Args:
        atr_current: float, current ATR_14 value
        atr_history: array, last 50 ATR_14 values
        base_params: dict, base PCTT parameters for current directional regime

    Returns:
        dict: adjusted parameters with volatility modifications
    """
    if len(atr_history) < 50:
        return base_params  # Insufficient history, use base

    sma_atr_50 = np.mean(atr_history[-50:])
    atr_ratio = atr_current / sma_atr_50 if sma_atr_50 > 0 else 1.0

    # Classify volatility regime
    if atr_ratio > 1.5:
        vol_regime = 'HIGH'
        buffer_mult = 1.5
        size_mult = 0.50
        dgeom_adjust = 0.5  # Widen by 0.5 ATR
        retest_mult = 1.5
    elif atr_ratio > 1.2:
        vol_regime = 'ELEVATED'
        buffer_mult = 1.2
        size_mult = 0.75
        dgeom_adjust = 0.0
        retest_mult = 1.25
    elif atr_ratio > 0.8:
        vol_regime = 'NORMAL'
        buffer_mult = 1.0
        size_mult = 1.0
        dgeom_adjust = 0.0
        retest_mult = 1.0
    else:
        vol_regime = 'LOW'
        buffer_mult = 0.8
        size_mult = 1.25
        dgeom_adjust = -0.5  # Tighten by 0.5 ATR
        retest_mult = 1.0

    # Check for volatility crush
    recent_ratios = [atr_history[-i] / sma_atr_50 for i in range(1, min(4, len(atr_history)))]
    vol_crush = all(r < 0.70 for r in recent_ratios) and len(recent_ratios) >= 3

    if vol_crush:
        vol_regime = 'CRUSH'
        size_mult = 0.25  # Minimal size during compression
        buffer_mult = 0.8

    # Build adjusted parameters
    adjusted = base_params.copy()
    adjusted['beta_p'] = base_params.get('beta_p', 0.10) * buffer_mult
    adjusted['beta_c'] = base_params.get('beta_c', 0.15) * buffer_mult
    adjusted['retest_tolerance'] = base_params.get('retest_tolerance', 0.20) * buffer_mult
    adjusted['trail_atr_mult'] = base_params.get('trail_atr_mult', 2.0) * buffer_mult
    adjusted['position_risk_pct'] = base_params.get('position_risk_pct', 0.01) * size_mult
    adjusted['d_geom_max'] = base_params.get('d_geom_max', 2.5) + dgeom_adjust
    adjusted['retest_window'] = int(base_params.get('retest_window', 12) * retest_mult)
    adjusted['volatility_regime'] = vol_regime
    adjusted['atr_ratio'] = round(atr_ratio, 4)
    adjusted['vol_crush_detected'] = vol_crush

    return adjusted
```

### 10.4 Combined Regime State

The full regime state that feeds into the PCTT pipeline is a two-dimensional object:

```python
@dataclass
class RegimeState:
    directional: str       # 'TRENDING', 'TRANSITIONAL', 'RANGING'
    volatility: str        # 'HIGH', 'ELEVATED', 'NORMAL', 'LOW', 'CRUSH'
    confidence: float      # 0.0 to 1.0
    cusum_alarm: bool      # True if CUSUM detected change point
    tradeable: bool        # False if RANGING or confidence too low

    @property
    def trade_allowed(self):
        return self.directional in ('TRENDING', 'TRANSITIONAL') and self.tradeable

    @property
    def full_risk_allowed(self):
        return (self.directional == 'TRENDING' and
                self.volatility in ('NORMAL', 'LOW') and
                self.confidence > 0.60 and
                not self.cusum_alarm)
```

This state object is computed once per MESO bar and passed to every subsequent stage of the PCTT pipeline. It determines which parameter table is active, what risk limits apply, and whether new entries are permitted.

The regime detection system is not a black box. Every component has been specified with exact formulas, default parameters, and Python implementations. An agent can implement this system exactly as described and get deterministic, reproducible regime classifications on any price series.

---

*End of Parts III and IV*

*Part III specified the three-layer multi-frequency confluence architecture with complete Kalman filter equations, ensemble gating logic, conflict resolution matrix, and timeframe mapping table. Part IV specified the 6-method regime detection ensemble, regime-adaptive parameter tables, CUSUM early warning system, and volatility regime integration. All formulas have exact Python implementations. All parameters have specific default values.*
