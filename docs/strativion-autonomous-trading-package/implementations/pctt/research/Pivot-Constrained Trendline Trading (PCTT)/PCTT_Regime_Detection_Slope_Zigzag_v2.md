# A Quantitative Framework for Regime Detection Using Slope Analysis and Zigzag Extremes

(PCTT Methodology Upgrade v2)

**Robust derivatives, adaptive structure, probabilistic regimes, and change-point detection for live trading systems**  
Version: 2026-01-23 (draft for implementation)

---

## Abstract

Markets switch between regimes (trend, range, transition, volatility expansion) faster than most lagging indicators can track. This document upgrades a slope + zigzag approach into an implementable, mathematically robust regime detector suitable for live PCTT deployments across **stocks, futures, options (underlying-driven), crypto, and FX**.

Core improvements:

1. **Robust derivative estimation** on _log-price_ using local polynomial regression (Savitzky–Golay equivalent) and optional Kalman smoothing.
2. **Volatility-normalized slope and curvature** to convert “direction” into a signal-to-noise ratio.
3. **Adaptive zigzag extremes** with volatility-scaled pivot thresholds and non-repainting confirmation semantics.
4. **Structure-aware features** (HH/HL sequences, swing angle, swing density, efficiency ratio) to anchor slope in price geometry.
5. **Probabilistic regime inference** via a small Hidden Markov Model (HMM) or score-based classifier with calibrated probabilities.
6. **Online change-point detection** (CUSUM / Page–Hinkley / Bayesian online CPD) to detect regime breaks early.
7. **Multi-timescale fusion** so micro-trend noise does not override higher-timeframe structure.
8. **Tight integration** into PCTT scoring (Q-score) and risk (position sizing, stop behavior, trade gating).

This is not a promise of profitability; it is a rigorous, testable framework for **more stable and explainable** regime detection.

---

## 0. Notation

We use discretely sampled bars:

- Price: \(P_t\) (close), log-price \(x_t = \log P_t\)
- Returns: \(r*t = x_t - x*{t-1}\)
- Time step: \(\Delta t\) (bar duration)
- Window length: \(W\) (bars)
- Realized volatility (EWMA): \(\sigma_t\)
- ATR: \(\text{ATR}\_t\)

We define three “derivative-like” objects (computed on smoothed \(x_t\)):

- **Slope** (first derivative): \(m_t \approx \frac{dx}{dt}\)
- **Curvature** (second derivative): \(c_t \approx \frac{d^2x}{dt^2}\)
- **Jerk** (third derivative, optional): \(j_t \approx \frac{d^3x}{dt^3}\)

---

## 1. Robust Slope Estimation on Log-Price

### 1.1 Local polynomial regression (endpoint derivative)

Fit a polynomial of order \(k\) on the last \(W\) points of \(x\):

\[
x\_{t-i} \approx a_0 + a_1 i + a_2 i^2 + \dots + a_k i^k, \quad i=0,1,\dots,W-1
\]

Then:

- slope at the endpoint: \(m_t = a_1\)
- curvature at endpoint: \(c_t = 2a_2\)

This is equivalent to a Savitzky–Golay filter when using fixed convolution coefficients.

### 1.2 Robustification (Huber / Theil–Sen)

Spikes and single-bar gaps corrupt derivatives. Replace least squares with a robust loss:

\[
\min*{a} \sum*{i=0}^{W-1} \rho(x*{t-i} - \hat x*{t-i}(a)),
\]

where \(\rho\) is Huber or Tukey loss. A pragmatic compromise: use OLS but **winsorize** returns and/or downweight outliers.

### 1.3 Optional state-space smoothing (Kalman)

Model log-price as a local linear trend:

\[
\begin{aligned}
x*t &= x*{t-1} + v*{t-1} + \epsilon_t,\\
v_t &= v*{t-1} + \eta_t,
\end{aligned}
\]

where \(v_t\) is the latent slope. Kalman filtering yields a smoothed estimate of \(v_t\) (slope) and its uncertainty.

---

## 2. Volatility-normalized slope, curvature, and significance

Raw slope is incomparable across instruments. Normalize by volatility.

### 2.1 EWMA volatility

\[
\sigma*t = \sqrt{(1-\lambda)\sum*{i=0}^{\infty} \lambda^i r\_{t-i}^2}
\]

### 2.2 Normalized slope and curvature (signal-to-noise)

\[
\tilde m_t = \frac{m_t}{\sigma_t} \quad \text{and} \quad \tilde c_t = \frac{c_t}{\sigma_t}
\]

### 2.3 Statistical confidence of slope (t-stat)

\[
t_m = \frac{\hat\beta}{\text{SE}(\hat\beta)}
\]

---

## 3. Adaptive Zigzag Extremes (volatility-scaled, non-repainting)

### 3.1 Threshold definition

Let \(\theta_t\) be pivot threshold:

\[
\theta_t = \kappa \cdot \sigma_t \sqrt{\Delta t}
\]
or \(\theta_t = \kappa \cdot \text{ATR}\_t\).

### 3.2 Confirmed pivot semantics (streaming-safe)

- Maintain a current pivot candidate.
- A pivot is **confirmed** only after price retraces by at least \(\theta_t\) from the candidate extreme.
- Confirmed pivots never repaint; the newest pivot can be “tentative”.

### 3.3 Structural features from pivots

Given pivots \((t_j, P_j)\):

- swing return: \(R*j = \log(P_j/P*{j-1})\)
- swing duration: \(D*j = t_j - t*{j-1}\)
- swing angle: \(\alpha_j = \arctan\left(\frac{|R_j|}{D_j}\right)\)

---

## 4. Fusing Slope + Structure into Regime Features

Observation vector:

\[
o*t = [\tilde m_t, \tilde c_t, t_m, ER_t, S*{hhhl,t}, A*{swing,t}, \rho*{swing,t}]
\]

Efficiency ratio:

\[
ER*t = \frac{|x_t - x*{t-W}|}{\sum*{i=1}^{W} |x*{t-i+1}-x\_{t-i}|}
\]

---

## 5. Regime Inference Models (implementable options)

### Option A: Score-based classifier

\[
p(z*t = r) = \frac{\exp(s_r(o_t))}{\sum*{r'} \exp(s\_{r'}(o_t))}
\]

### Option B: Hidden Markov Model (HMM)

Forward filtering:

\[
\alpha*t \propto (\alpha*{t-1} A) \odot p(o_t | z_t)
\]

---

## 6. Online Change-Point Detection (early regime breaks)

### 6.1 CUSUM

\[
g*t = \max(0, g*{t-1} + (r_t - \mu) - k)
\]

---

## 7. Multi-timescale Fusion

\[
\bar o_t = \sum_i \omega_i o_t^{(T_i)}, \quad \sum_i \omega_i = 1
\]

---

## 8. Integration into PCTT (Q-score + gating + risk)

Add slope component \(S_s\) and regime component \(S_r\):

\[
Q_t = \sigma\left(w_0 + w_s S_s(t) + w_r S_r(t) + \ldots\right)
\]

---

## 9. Implementation Sketches

### 9.1 Streaming zigzag (pseudocode)

```text
state:
  lastPivot = (idx, price, type)   # type in {HIGH, LOW}
  candidate = (idx, price, type)
  threshold = kappa * ATR

on_new_bar(idx, high, low, close):
  update threshold using ATR/vol

  if candidate.type == HIGH:
     if high > candidate.price: candidate = (idx, high, HIGH)
     if close < candidate.price - threshold:
        confirm candidate as pivot HIGH
        candidate = (idx, low, LOW)
  else:
     if low < candidate.price: candidate = (idx, low, LOW)
     if close > candidate.price + threshold:
        confirm pivot LOW
        candidate = (idx, high, HIGH)
```

### 9.2 Python: local polynomial slope

```python
import numpy as np

def poly_slope_curvature(log_prices: np.ndarray, k: int = 2):
    W = len(log_prices)
    i = np.arange(W)
    X = np.vander(i, N=k+1, increasing=True)
    a, *_ = np.linalg.lstsq(X, log_prices, rcond=None)
    slope = float(a[1])
    curvature = float(2*a[2]) if k >= 2 else 0.0
    return slope, curvature
```

### 9.3 TypeScript: EWMA vol + normalized slope

```ts
export function ewmaVol(returns: number[], lambda = 0.94): number {
  let s = 0;
  for (let i = 0; i < returns.length; i++) {
    s = lambda * s + (1 - lambda) * returns[i] * returns[i];
  }
  return Math.sqrt(s);
}

export function normalizedSlope(slope: number, vol: number, eps = 1e-12) {
  return slope / Math.max(vol, eps);
}
```

### 9.4 Pine Script: normalized slope proxy (illustrative)

```pine
//@version=5
indicator("PCTT Slope Regime (v2)", overlay=false)

len = input.int(20, "Window")
x = math.log(close)
lin = ta.linreg(x, len, 0)
m = lin - lin[1]
vol = ta.stdev(ta.change(x), len)
m_norm = m / math.max(vol, 1e-6)

plot(m_norm, "Normalized Slope")
hline(0)
```

---

## 10. Live Visual Explainability (the “wow” layer)

- Confirmed zigzag pivots and swing legs (colored by regime)
- Background regime shading (UpTrend/DownTrend/Range)
- Regime probability ribbon below price
- Slope and curvature panels with zero-cross annotations
- Change-point markers when CPD triggers
- “Agent narrative” side panel explaining drivers + risk adjustments
