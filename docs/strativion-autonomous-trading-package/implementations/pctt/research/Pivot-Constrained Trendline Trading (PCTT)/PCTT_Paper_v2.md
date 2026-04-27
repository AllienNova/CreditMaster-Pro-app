# Pivot‑Constrained Trendline Trading (PCTT)

## A Research‑Grade Mathematical Framework + Production Implementation Notes (v2.0)

**Author:** (drafted with AI assistance)  
**Date:** January 16, 2026  
**Status:** Research‑grade specification (backtestable; production‑ready architecture guidance)

---

## Executive Summary (What changed from v1)

This v2.0 expands the v1 paper you shared by closing the major research/production gaps:

1. **Statistical testing is no longer optional**: permutation tests, stationary/bootstrap CIs, Monte Carlo trade‑sequencing, and White’s Reality Check are specified as mandatory acceptance gates.
2. **Boundary estimation is made robust**: minimum pivot count, degenerate‑case handling, ridge regularization on slope, robust losses (Huber), and RANSAC‑style consensus checking.
3. **Q‑Score becomes a calibrated probability**: isotonic regression calibration + rolling recalibration + Brier score drift monitoring.
4. **Execution realism is explicitly modeled**: spread/slippage regimes, partial fills, latency, adverse selection; plus liquidity/ADV‑aware sizing.
5. **Risk management is elevated to portfolio level**: heat limits, correlation clustering, drawdown scaling, and stop systems defined as stateful processes.
6. **Multi‑market practicalities are included**: stocks, futures, options, FX, and crypto each have a market adapter section.

> Important: No strategy can _guarantee_ an 85–90% win rate in live markets. What we can do is design **selective entry**, **calibrated probability gates**, **strict risk governance**, and **execution‑aware stops** that make the system _harder_ to lose money—while being honest about the trade‑offs (fewer trades, smaller average R, regime dependence).

---

## 1. Problem Statement and Goals

### 1.1 Why “trendlines” fail in quant settings

Manual trendlines are:

- non‑reproducible
- lookahead‑biased (humans subconsciously use future data)
- not portable across markets/timeframes
- not naturally calibratable into probabilities

### 1.2 PCTT goals

We want a structure layer that is:

- **deterministic** (same data ⇒ same lines)
- **non‑repainting** (signals never change historically)
- **probabilistic** (each setup has an estimated success probability)
- **embeddable** (the structure object is an API other strategies can call)
- **execution‑aware** (spread/impact/latency aren’t hand‑waved)

---

## 2. Notation and Normalization

Let price series be OHLC: \(O_t, H_t, L_t, C_t\).

### 2.1 ATR normalization

\[
ATR*t = \text{SMA}\_n(TR_t), \quad TR_t = \max(H_t-L_t, |H_t-C*{t-1}|, |L*t-C*{t-1}|).
\]
For any price distance \(d\):
\[
\tilde d_t = \frac{d}{ATR_t}.
\]

### 2.2 Log‑price option (recommended for long horizons)

When instruments span orders of magnitude (crypto, indices over decades), use:
\[
X_t = \ln(C_t)
\]
and perform geometry in \(X_t\) space; then convert thresholds back to percent.

---

## 3. The Structure Object (PCTT‑S)

We define a market structure estimate at time \(t\):
\[
\mathcal{S}\_t = (L_t, U_t, Q_L(t), Q_U(t), \mathcal{R}\_t, \mathcal{E}\_t, \tilde d_L(t), \tilde d_U(t), \Theta_t).
\]
Where:

- \(L_t\): support boundary function, \(U_t\): resistance boundary function
- \(Q_L, Q_U\): calibrated line quality probabilities in \([0,1]\)
- \(\mathcal{R}\_t\): regime label (Trend / Range / Transition)
- \(\mathcal{E}\_t\): event label (Break / Retest / Failure / None)
- \(\tilde d_L, \tilde d_U\): normalized distance to boundaries
- \(\Theta_t\): parameter context (volatility, spread regime, session state, etc.)

This object is intended to be an **embeddable feature layer**.

---

## 4. Pivots (Non‑Repainting Extraction)

### 4.1 Confirmed pivots

A pivot low at index \(i\) with confirmation \(k\):
\[
L*i = \min(L*{i-k}, ..., L\_{i+k}).
\]
A pivot high analogously uses \(H_i\).

**Non‑repainting rule:** a pivot is only usable once its right‑side bars exist.

### 4.2 Minimum evidence threshold

To prevent underdetermined lines:

- require at least \(n\_{piv} \ge 5\) pivots in the evaluation window to activate structure
- otherwise \(\mathcal{S}\_t\) remains in “IDLE / weak structure”

---

## 5. Boundary Estimation (Robust and Deterministic)

We build \(L_t\) and \(U_t\) via a pivot‑constrained candidate search **with regularization**.

### 5.1 Candidate parameterization

A line through two pivots \((t_a, p_a)\), \((t_b,p_b)\):
\[
\ell(t) = p_a + m(t-t_a),\quad m=\frac{p_b-p_a}{t_b-t_a}.
\]

We generate candidates from the most recent \(M\) confirmed pivots (e.g., last 20).

### 5.2 Robust objective function

Define residual at pivot \(j\):
\[
r_j = p_j - \ell(t_j).
\]
For support, touches are near \(r_j\in[0,\tau_j]\). For resistance, near \(r_j\in[-\tau_j,0]\).

We use a **Huber loss** for violations/outliers:
\[
\rho\_\delta(x)=\begin{cases}
\frac12x^2 & |x|\le\delta\\
\delta(|x|-\frac12\delta) & |x|>\delta
\end{cases}
\]

Support scoring (example):
\[
\text{Score}(\ell)=\underbrace{\sum*{j\in \mathcal{P}} \phi(r_j;\tau_j)}*{\text{touch reward}}
-\lambda\underbrace{\sum*{t\in \mathcal{W}} \rho*\delta(\max(0,\ell(t)-L*t-\tau_t))}*{\text{violation penalty}}
-\gamma\,m^2
+\omega\ln(1+\text{span}).
\]
Where:

- \(\phi\) rewards proximity within tolerance
- \(\gamma m^2\) is ridge regularization discouraging absurd slopes
- \(\text{span}=|t_b-t_a|\)

### 5.3 Degenerate/edge cases

Reject candidates when:

- \(t_a=t_b\) (division by zero)
- slope magnitude implies \(|m| > m*{max}\) where \(m*{max}\) is ATR‑scaled
- pivot count too low

### 5.4 RANSAC‑style consensus validation

Even after scoring, require **consensus**:

- sample candidate lines
- compute inlier set: pivots within tolerance
- keep line with largest inlier count and best score

This materially improves robustness in noisy markets.

### 5.5 “Action” vs “Safety” boundaries

We keep two boundaries:

- **Action line**: the boundary being broken / retested
- **Safety line**: opposite boundary used for stop geometry / invalidation

---

## 6. Q‑Score as a Calibrated Probability

### 6.1 From raw score to probability

Raw score is not a probability. In v2:

1. compute raw \(s\)
2. map to \(q_0=\sigma(s)\)
3. **calibrate** \(q=\text{Iso}(q_0)\) using isotonic regression on historical outcomes

Outcome definition example:

- label 1 if “break‑retest entry” reaches \(+R\) before stop within \(T\) bars
- else 0

### 6.2 Mandatory calibration process

- minimum \(n\ge 200\) trades per calibration regime (per symbol group / timeframe bucket)
- rolling recalibration every 500 bars (or weekly)
- monitor Brier score; if it degrades beyond threshold ⇒ auto tighten gates or disable

### 6.3 Using calibrated Q

- entry gating: trade only if \(q \ge q\_{min}\) (e.g., 0.70)
- risk scaling: \(risk \propto (q-q\_{min})\)
- portfolio control: cap sum of \(risk\cdot q\) across positions

---

## 7. Regime Modeling (Context)

### 7.1 Base regime: ER + crossings

Efficiency ratio (Kaufman):
\[
ER*t = \frac{|C_t - C*{t-n}|}{\sum*{i=1}^n |C*{t-i+1}-C\_{t-i}|}.
\]
Crossings count vs midline \(\mu_t\) (MA or channel midpoint).

### 7.2 Enhancements (optional, recommended)

- **Fractal dimension proxy** (range vs trend)
- **Hurst exponent estimate** (persistence vs mean reversion)
- **Volatility regime** via ATR percentile

### 7.3 Transition detection

Define a transition score:
\[
T_t = w_1\Delta ER_t + w_2\Delta \text{Crossings}\_t + w_3\Delta\tilde{\text{width}}\_t
\]
where \(\tilde{\text{width}}\) is channel width in ATR units.

---

## 8. Event Detection (Non‑Repainting State Machine)

We define a deterministic finite state machine (FSM) that prevents lookahead.

### 8.1 Two‑stage break confirmation

Support break (down):

- penetration: \(L_t < L^{line}\_t - \beta_p ATR_t\)
- confirmation: \(C_t < L^{line}\_t - \beta_c ATR_t\)

Resistance break (up) analogously.

### 8.2 Freezing rule (“no moving goalposts”)

At break time \(t_0\), freeze:

- line slope \(m\) and intercept \(b\) for action and safety lines
- subsequent projected values are \(\hat \ell(t)=m(t-t_0)+\ell(t_0)\)

### 8.3 Retest window + failure

Retest must occur within \(M\) bars:

- retest: price revisits within \(\pm\eta ATR\) of frozen line
- failure: price returns beyond safety line or violates invalidation rules

---

## 9. Entries and Exits

### 9.1 Entry logic (example: bullish)

Requirements:

1. regime \(\in\{\text{Trend},\text{Transition}\}\)
2. break up confirmed
3. retest within \(M\) bars
4. trigger candle meets microstructure rules (spread OK; no volatility shock)
5. \(q \ge q\_{min}\)

Entry price options:

- close‑based (simpler)
- stop entry above retest candle high (reduces false starts)
- limit entry at line + buffer (improves R but reduces fill)

### 9.2 Exit hierarchy (always deterministic)

1. **Hard stop** (structural): beyond safety line + buffer
2. **Time stop**: if no progress after \(T\) bars
3. **Partial take profit**: at \(+R_1\) (e.g., 1R)
4. **Hybrid trail**: see Section 10
5. **Emergency kill**: spread/volatility blow‑out, broker disconnect, etc.

---

## 10. Risk Management (Trade + Portfolio)

### 10.1 What “hard to lose money” means in practice

You cannot remove risk, but you can:

- reduce tail loss events
- avoid low‑edge regimes
- enforce portfolio‑level heat limits
- stop trading when calibration degrades

### 10.2 Trade risk sizing

Let equity \(E\), risk fraction \(r\) (e.g., 0.5%–1.0%).
Stop distance \(D\) in price units.
Position size:
\[
qty = \frac{E\cdot r}{D\cdot v}
\]
Where \(v\) is value per point (tick value, pip value, contract multiplier).

### 10.3 Portfolio heat + correlation

Define open risk per position \(R*k\). Portfolio heat:
\[
H = \frac{\sum_k R_k}{E}.
\]
Enforce \(H \le H*{max}\) (e.g., 3%).

Correlation adjustment:

- cluster instruments by rolling correlation
- within a cluster, cap summed risk (e.g., 1%)

### 10.4 Drawdown scaling

If drawdown \(DD\) exceeds thresholds:

- scale risk linearly: \(r'=r\cdot(1-DD/DD\_{max})\)
- disable entries at \(DD>DD\_{stop}\)

### 10.5 Hybrid trailing stop (research‑grade)

We use a 3‑phase trail:

**Phase A — Structural protection (early):**

- initial stop = safety line ± buffer

**Phase B — Break‑even transition:**

- once price reaches \(+R\_{BE}\) (e.g., +0.8R), move stop to entry ± fees/slippage

**Phase C — Pivot/structure trailing:**

- trail stop behind newly confirmed pivots in the trade direction
- stop = max(previous_stop, last_confirmed_pivot_low − k·ATR) for longs

Add a volatility guard:

- if ATR spikes above percentile threshold, widen trail to avoid noise

### 10.6 Why win‑rate targets can mislead

High win rate often implies small wins and rare large losses. The system should optimize:

- expectancy \(E[R]\)
- downside tail risk (CVaR)
- max drawdown

---

## 11. Execution Realism and Microstructure

### 11.1 Spread/slippage modeling

Model expected slippage:
\[
\text{slip} = a\cdot \text{spread} + b\cdot ATR\_{1m} + c\cdot \text{impact}(qty)
\]

### 11.2 Partial fills + order types

- stop orders risk adverse selection
- limit orders risk non‑fill

System should choose order type by regime and urgency.

### 11.3 Liquidity / ADV constraints (stocks)

If order size > 1% ADV:

- reduce size or slice orders
- include impact model

---

## 12. Multi‑Market Practical Application

### 12.1 Crypto

- 24/7 session (no daily gaps)
- volatility shocks common ⇒ strict ATR shock filters
- exchange outages ⇒ connectivity watchdog

### 12.2 FX

- 24/5 sessions; liquidity clusters (London/NY)
- spreads widen at rollover ⇒ session filters mandatory
- no centralized volume ⇒ rely on structure + volatility

### 12.3 Stocks

- overnight gap risk ⇒ gap guards + earnings blackouts
- corporate actions (splits) ⇒ adjust history
- liquidity/ADV sizing mandatory

### 12.4 Futures

- contract rolls ⇒ continuous contract handling
- tick size/multiplier vary ⇒ adapter must normalize
- session gaps (weekends) ⇒ risk adjustments

### 12.5 Options (overlay)

Trade PCTT on the underlying, but execute via options:

- translate stop/target into delta‑equivalent risk
- use spreads (verticals) to bound tail risk
- manage IV and theta: avoid buying premium in low edge environments

---

## 13. Research Protocol (Mandatory Acceptance Gates)

### 13.1 Hypothesis tests

- Null: strategy performance is indistinguishable from chance under the same trade count distribution.

Tests:

- block permutation / stationary bootstrap for dependency
- bootstrap CI for Sharpe, expectancy, win rate, max DD
- Monte Carlo trade reshuffling (10k+ paths)
- White’s Reality Check across parameter sets

### 13.2 Walk‑forward and stability

- rolling train/test splits
- parameter stability bounds
- drift detection on calibration metrics

---

## 14. Pine Script Implementation Notes (Key Non‑Repainting Rules)

- pivots only after confirmation bars
- freeze line parameters at break bar
- state machine stored in `var` state
- never reference future bars

### 14.1 Sample Pine v5 (skeleton)

Below is a **conceptual** Pine v5 scaffold for the non‑repainting event FSM. (Full production script should be split into modules.)

```pinescript
//@version=5
strategy("PCTT Core Skeleton", overlay=true, calc_on_every_tick=false, process_orders_on_close=true)

// --- Inputs
k = input.int(3, "Pivot confirmation", minval=1)
atrLen = input.int(14, "ATR")
M = input.int(25, "Retest window bars")

betaP = input.float(0.10, "Penetration (ATR)")
betaC = input.float(0.15, "Confirmation (ATR)")
eta   = input.float(0.10, "Retest tolerance (ATR)")

atr = ta.atr(atrLen)

// --- Confirmed pivots (non-repainting)
pl = ta.pivotlow(low, k, k)
ph = ta.pivothigh(high, k, k)

// Store recent pivots (simple fixed arrays)
var float[] plPrice = array.new_float()
var int[]   plIdx   = array.new_int()
if not na(pl)
    array.unshift(plPrice, pl)
    array.unshift(plIdx, bar_index - k)
    if array.size(plPrice) > 20
        array.pop(plPrice)
        array.pop(plIdx)

// --- Candidate support line from last 2 pivots (placeholder; replace with scoring search)
float mL = na
float bL = na
if array.size(plPrice) >= 2
    float p1 = array.get(plPrice, 0)
    float p2 = array.get(plPrice, 1)
    int   t1 = array.get(plIdx, 0)
    int   t2 = array.get(plIdx, 1)
    if t1 != t2
        mL := (p1 - p2) / float(t1 - t2)
        bL := p1 - mL * float(t1)

supportNow = not na(mL) ? (mL * float(bar_index) + bL) : na

// --- FSM
var int state = 0 // 0 idle, 1 break, 2 wait retest
var float mFreeze = na
var float bFreeze = na
var int   tBreak = na

breakDown = not na(supportNow) and low < supportNow - betaP*atr and close < supportNow - betaC*atr

if state == 0 and breakDown
    state := 1
    mFreeze := mL
    bFreeze := bL
    tBreak := bar_index

frozenLine = not na(mFreeze) ? (mFreeze * float(bar_index) + bFreeze) : na
inWindow = not na(tBreak) and (bar_index - tBreak) <= M
retest = state == 1 and inWindow and not na(frozenLine) and math.abs(high - frozenLine) <= eta*atr

if state == 1 and retest
    state := 2

// Example entry: short after retest candle closes red
enterShort = state == 2 and close < open
if enterShort
    strategy.entry("S", strategy.short)
    state := 0

plot(supportNow, "Support", color=color.new(color.green, 0))
plot(frozenLine, "Frozen", color=color.new(color.orange, 0))
```

**Production upgrades needed in Pine:** scoring search across pivot pairs, Q‑score computation, calibrated gates (done off‑platform), and full stop/partial/trailing logic.

---

## 15. Conclusion

PCTT is best viewed as a **structure layer + probabilistic gating + execution‑aware risk system**, not “a trendline trick.” If you enforce the research protocol (Section 13) and implement the microstructure and portfolio risk controls (Sections 10–11), you get a system that is genuinely automatable and portable across markets.
