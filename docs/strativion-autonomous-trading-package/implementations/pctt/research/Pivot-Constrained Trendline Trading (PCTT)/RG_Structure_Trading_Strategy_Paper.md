# A Robust Mathematical Framework for Pivot-Constrained Trendline Trading

**Author:** Manus AI  
**Date:** January 15, 2026  
**Keywords:** Trendline Analysis, Market Structure, Algorithmic Trading, Risk Management, Pine Script, Quantitative Finance

---

## Abstract

This paper presents a comprehensive mathematical framework for a trendline-based trading strategy that transforms the discretionary art of technical analysis into a rigorous, quantitative, and automatable science. The proposed methodology addresses the fundamental challenge of subjectivity in traditional trendline analysis by introducing deterministic algorithms for boundary construction, objective quality scoring, and regime-aware signal generation.

The framework is built upon five core pillars: (1) pivot-constrained boundary estimation using an objective scoring function, (2) a normalized Quality Score (Q-Score) for assessing trendline reliability, (3) a regime context model combining the Efficiency Ratio and crossing count metrics, (4) a non-repainting state machine for event detection (break, retest, failure), and (5) a sophisticated hybrid risk management system featuring structural stop-losses, partial profit-taking, and pivot-based trailing stops.

We provide complete mathematical formulations, practical implementation guidelines for TradingView's Pine Script, and an architectural blueprint for autonomous AI agent integration. The ultimate objective is to deliver a backtestable, robust, and highly effective methodology for systematic trading based on market structure analysis.

---

## 1. Introduction

Trendline analysis has been a cornerstone of technical analysis since the early days of charting. Practitioners draw lines connecting swing highs or swing lows to identify the prevailing market direction and potential support and resistance levels. Despite its intuitive appeal and widespread use, traditional trendline analysis suffers from a critical flaw: **subjectivity**. Two analysts examining the same price chart will often draw different trendlines, leading to inconsistent signals and non-reproducible results.

This subjectivity presents significant challenges for systematic and algorithmic trading:

1. **Non-Reproducibility**: Manual trendline drawing cannot be consistently replicated, making rigorous backtesting impossible.
2. **Lookahead Bias**: Discretionary identification of "breaks" and "retests" often incorporates future information unconsciously.
3. **Emotional Interference**: Human judgment in trendline placement is susceptible to cognitive biases and emotional states.
4. **Scalability Limitations**: Manual analysis cannot scale across multiple instruments and timeframes simultaneously.

This paper addresses these challenges by developing a **comprehensive mathematical framework** that transforms trendline analysis from a discretionary art into a quantitative, backtestable, and automatable science. Our methodology provides:

- **Deterministic Trendline Construction**: An algorithm that identifies optimal support and resistance boundaries using confirmed pivot points.
- **Quantitative Quality Assessment**: A scoring system that objectively measures trendline reliability.
- **Regime-Aware Signal Generation**: A context model that adapts strategy behavior to market conditions.
- **Non-Repainting Event Detection**: A state machine that ensures historical signals are generated without lookahead bias.
- **Integrated Risk Management**: A multi-layered system for capital preservation and profit optimization.

The remainder of this paper is organized as follows: Section 2 presents the mathematical methodology, Section 3 details the risk management framework, Section 4 discusses Pine Script implementation, Section 5 explores autonomous AI agent integration, and Section 6 concludes with practical recommendations.

---

## 2. Mathematical Methodology

### 2.1 Data Representation and Normalization

A fundamental requirement for any robust quantitative model is **scale invariance**—the strategy's logic should not depend on the absolute price level of an instrument. To achieve this, we normalize all distance-based calculations using the Average True Range (ATR).

**Definition 2.1 (Average True Range):** The ATR at time $t$ over period $n$ is defined as:

$$ATR_t = \frac{1}{n} \sum_{i=0}^{n-1} TR_{t-i}$$

where the True Range is:

$$TR_t = \max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)$$

with $H_t$, $L_t$, and $C_t$ representing the high, low, and close prices at time $t$.

**Definition 2.2 (Normalized Distance):** Any geometric distance $d$ is converted to a dimensionless quantity:

$$\tilde{d} = \frac{d}{ATR_t}$$

This normalization ensures that all thresholds and tolerances are expressed in volatility-adjusted units, making the strategy applicable across different instruments and market conditions.

### 2.2 The Structure Object

We formalize the concept of "market structure" as a mathematical object $\mathcal{S}_t$ estimated at each time $t$:

$$\mathcal{S}_t = (L_t, U_t, Q_L, Q_U, \mathcal{R}_t, \mathcal{E}_t, \tilde{d}_L, \tilde{d}_U)$$

| Component                  | Description                                                       |
| :------------------------- | :---------------------------------------------------------------- |
| $L_t, U_t$                 | Support (lower) and Resistance (upper) boundary lines             |
| $Q_L, Q_U$                 | Quality Scores for support and resistance, $Q \in [0, 1]$         |
| $\mathcal{R}_t$            | Regime label: $\{\text{Trend}, \text{Range}, \text{Transition}\}$ |
| $\mathcal{E}_t$            | Event labels: $\{\text{Break}, \text{Retest}, \text{Failure}\}$   |
| $\tilde{d}_L, \tilde{d}_U$ | Normalized distances to support and resistance                    |

This object-oriented representation provides a clean, embeddable "structure API" that can serve as a foundational layer for various trading strategies.

### 2.3 Pivot-Constrained Boundary Estimation

The cornerstone of our methodology is the deterministic construction of support and resistance boundaries using confirmed pivot points.

**Definition 2.3 (Pivot Point):** A pivot low at bar $i$ is confirmed if:

$$L_i = \min(L_{i-k}, L_{i-k+1}, \ldots, L_i, \ldots, L_{i+k-1}, L_{i+k})$$

where $k$ is the confirmation parameter (typically 2-3 bars). Pivot highs are defined analogously using the high prices.

**Algorithm 2.1 (Boundary Estimation):**

1. **Pivot Extraction**: Identify all confirmed pivot lows $\{(t_j, p_j)\}_{j=1}^{m}$ within the lookback window $N$.

2. **Candidate Generation**: For each pair of pivots $(t_i, p_i)$ and $(t_j, p_j)$ where $i < j$, generate a candidate line:

$$\ell(t) = p_i + m \cdot (t - t_i), \quad m = \frac{p_j - p_i}{t_j - t_i}$$

3. **Objective Scoring**: Evaluate each candidate using the scoring function:

$$\text{Score}(\ell) = \underbrace{\sum_{k} w_k \cdot \mathbb{1}_{\text{touch}}(k)}_{\text{Touch Reward}} + \underbrace{\omega_s \cdot \ln(1 + \text{span})}_{\text{Persistence Reward}} - \underbrace{\lambda \cdot \sum_{k} V_k}_{\text{Violation Penalty}}$$

4. **Boundary Selection**: Select the candidate with the highest score as the official boundary.

![Figure 1: Pivot-Constrained Trendline Construction](figures/fig1_trendline_construction.png)

_Figure 1: Illustration of pivot-constrained trendline construction. Green triangles mark confirmed pivot lows (PL), red triangles mark pivot highs (PH). The dashed lines represent the best-fit support and resistance boundaries. The shaded region shows the touch tolerance zone ($\tau$)._

**Definition 2.4 (Touch Condition):** A pivot point $(t_k, p_k)$ is considered to "touch" a support line $\ell$ if:

$$0 \leq p_k - \ell(t_k) \leq \tau_k, \quad \tau_k = \alpha \cdot ATR_{t_k}$$

where $\alpha$ is the touch tolerance parameter (typically 0.10). The touch weight is:

$$w_k = 1 - \frac{p_k - \ell(t_k)}{\tau_k}$$

**Definition 2.5 (Violation Severity):** The violation severity at bar $k$ is:

$$
V_k = \begin{cases}
\frac{\ell(t_k) - L_k}{ATR_{t_k}} & \text{if } L_k < \ell(t_k) - \tau_k \text{ (for support)} \\
0 & \text{otherwise}
\end{cases}
$$

### 2.4 Quality Score (Q-Score)

The Q-Score transforms the raw objective score into a normalized measure of trendline reliability.

**Definition 2.6 (Q-Score):** The Quality Score is computed using the logistic (sigmoid) function:

$$Q = \sigma(\text{Score}) = \frac{1}{1 + e^{-\text{Score}}}$$

This transformation maps the unbounded raw score to the interval $[0, 1]$:

- $Q \to 1$: High-quality line with many touches and minimal violations
- $Q \to 0$: Low-quality line with frequent violations or weak structural evidence

![Figure 6: Q-Score Distribution and Quality Gating](figures/fig6_qscore.png)

_Figure 6: Left panel shows the sigmoid transformation from raw score to Q-Score. Right panel illustrates the Q-Score distribution with quality gates for A-grade (Q ≥ 0.70) and B-grade (Q ≥ 0.60) setups._

The Q-Score enables **quality-based trade filtering**:

| Setup Grade | Q-Score Threshold    | Risk Allocation  |
| :---------- | :------------------- | :--------------- |
| A-Grade     | $Q \geq 0.70$        | Full risk (1.0%) |
| B-Grade     | $0.60 \leq Q < 0.70$ | Half risk (0.5%) |
| Skip        | $Q < 0.60$           | No trade         |

### 2.5 Regime Context Modeling

Trendline-based strategies perform poorly in choppy, range-bound markets. Our framework includes a regime classifier to filter low-probability conditions.

**Definition 2.7 (Efficiency Ratio):** The Efficiency Ratio over period $n$ is:

$$ER_t = \frac{|P_t - P_{t-n}|}{\sum_{i=1}^{n} |P_{t-i+1} - P_{t-i}|}$$

where $ER \to 1$ indicates efficient, directional movement and $ER \to 0$ indicates choppy, inefficient movement.

**Definition 2.8 (Crossing Count):** The number of times price crosses the midline $\mu_t$ over period $n$:

$$\text{Crossings}_t = \sum_{i=1}^{n} \mathbb{1}\{(P_{t-i} - \mu_{t-i})(P_{t-i+1} - \mu_{t-i+1}) < 0\}$$

**Regime Classification Rules:**

$$
\mathcal{R}_t = \begin{cases}
\text{Trend} & \text{if } ER_t \geq \theta_{ER}^{trend} \text{ AND } \text{Crossings}_t \leq \theta_{cross}^{max} \\
\text{Range} & \text{if } ER_t \leq \theta_{ER}^{range} \text{ OR } \text{Crossings}_t \geq \theta_{cross}^{min} \\
\text{Transition} & \text{otherwise}
\end{cases}
$$

Typical parameter values: $\theta_{ER}^{trend} = 0.35$, $\theta_{ER}^{range} = 0.20$, $\theta_{cross}^{max} = 8$, $\theta_{cross}^{min} = 20$.

![Figure 3: Regime Classification](figures/fig3_regime_classification.png)

_Figure 3: Illustration of the three market regimes. Left: Trend regime with high ER and low crossings. Center: Range regime with low ER and high crossings. Right: Transition regime, which is optimal for break-retest strategies._

### 2.6 Event Detection State Machine

The core trading logic is implemented as a **finite state machine** that ensures non-repainting, backtest-safe signal generation.

![Figure 5: State Machine for Event Detection](figures/fig5_state_machine.png)

_Figure 5: State machine diagram showing the transitions between Idle, Break Detected, Wait Retest, In Trade, Failed, and Timeout states._

**State Definitions:**

- **State 0 (Idle)**: No active setup; scanning for break conditions
- **State 1 (Wait Retest Down)**: Bearish break detected; waiting for retest of broken support
- **State 2 (Wait Retest Up)**: Bullish break detected; waiting for retest of broken resistance

**Two-Stage Break Detection:**

A break is confirmed when both conditions are met:

$$
\text{Break}_{\text{down}} = \begin{cases}
\text{Penetration:} & L_t < S_t - \beta_p \cdot ATR_t \\
\text{Confirmation:} & C_t < S_t - \beta_c \cdot ATR_t
\end{cases}
$$

where $S_t$ is the support level, $\beta_p$ is the penetration buffer (typically 0.10), and $\beta_c$ is the confirmation buffer (typically 0.15).

**Line Freezing Protocol:**

At the break bar $t_0$, the **Action Line** (broken boundary) and **Safety Line** (opposite boundary) are frozen:

$$\text{Action}(t) = A_0 + m_A \cdot (t - t_0)$$
$$\text{Safety}(t) = S_0 + m_S \cdot (t - t_0)$$

where $A_0, m_A$ and $S_0, m_S$ are the intercept and slope at the break time. This prevents the "moving goalpost" problem.

**Retest Condition:**

Within the retest window of $M$ bars:

$$\text{Retest}_{\text{down}} = |H_t - \text{Action}(t)| \leq \gamma \cdot ATR_t$$

**Rejection Trigger:**

Entry is confirmed when a rejection pattern forms at the retest:

$$\text{Rejection}_{\text{bear}} = \text{Retest}_{\text{down}} \land (C_t < O_t) \land (C_t < \text{Action}(t))$$

![Figure 2: Break-Retest-Rejection Sequence](figures/fig2_break_retest_sequence.png)

_Figure 2: Complete break → retest → rejection sequence. The support line becomes the Action Line after the break. The Safety Line provides the structural stop-loss level. Entry occurs on rejection confirmation._

---

## 3. Risk Management Framework

A profitable trading strategy requires robust risk management. Our framework implements a multi-layered system designed to protect capital while allowing winning trades to develop.

### 3.1 Initial Stop-Loss Placement

The initial stop-loss is placed at the **Safety Line** plus a buffer:

$$SL_{\text{initial}} = \text{Safety}(t_{\text{entry}}) \pm \epsilon \cdot ATR_t$$

where $\epsilon$ is the stop buffer (typically 0.20) and the sign depends on trade direction.

### 3.2 Dynamic Position Sizing

Position size is calculated to risk a fixed percentage of equity:

$$\text{Position Size} = \frac{\text{Equity} \times \text{Risk\%}}{|P_{\text{entry}} - SL_{\text{initial}}|}$$

Risk allocation varies by setup quality:

- A-Grade: Risk% = 1.0%
- B-Grade: Risk% = 0.5%

### 3.3 Hybrid Trailing Stop Mechanism

The trailing stop evolves through three phases:

**Phase 1 - Break-Even Lock:** When profit reaches $0.8R$:

$$SL_{\text{BE}} = P_{\text{entry}} + \delta_{\text{tick}}$$

**Phase 2 - Partial Profit:** At $1.0R$, close 60% of position:

$$TP_1 = P_{\text{entry}} + 1.0 \times (P_{\text{entry}} - SL_{\text{initial}})$$

**Phase 3 - Pivot Trailing:** For remaining position, trail behind confirmed pivots:

$$SL_{\text{trail}} = \max(SL_{\text{current}}, PL_{\text{recent}} - \gamma_{trail} \cdot ATR_t)$$

The stop is **monotonic**—it can only move in the favorable direction.

![Figure 4: Hybrid Trailing Stop Mechanism](figures/fig4_trailing_stop.png)

_Figure 4: Evolution of the trailing stop through three phases. Phase 1: Initial stop at Safety Line. Phase 2: Break-even lock at +0.8R with partial profit at +1.0R. Phase 3: Pivot-based trailing for remaining position._

### 3.4 Time and Failure Stops

**Time Stop:** Exit if trade doesn't reach $+0.5R$ within $X$ bars:

$$\text{Exit}_{\text{time}} = (t - t_{\text{entry}} \geq X) \land (R_{\text{current}} < 0.5)$$

**Failure Stop:** Exit immediately if break fails:

$$\text{Exit}_{\text{fail}} = C_t > \text{Action}(t) + \delta \cdot ATR_t \quad \text{(for short)}$$

### 3.5 Portfolio-Level Circuit Breakers

- **Daily Loss Limit:** Halt trading if daily loss exceeds 2R
- **Consecutive Loss Limit:** Pause after 3 consecutive losses
- **One-Break-One-Trade Rule:** No re-entry on the same break event

---

## 4. Pine Script Implementation

The complete Pine Script implementation is provided as a separate file (`RG_Structure_Strategy.pine`). Key implementation considerations include:

### 4.1 Core Functions

```pine
// Efficiency Ratio calculation
f_er(_s, _n) =>
    float netMove = math.abs(_s - _s[_n])
    float sumMove = ta.sum(math.abs(_s - _s[1]), _n)
    sumMove > 0 ? netMove / sumMove : 0.0

// Q-Score using sigmoid transformation
f_sigmoid(x) =>
    1.0 / (1.0 + math.exp(-x))

// Position sizing based on risk percentage
f_qtyForRisk(entryPrice, stopPrice, riskPercent) =>
    float riskCash = strategy.equity * (riskPercent / 100.0)
    float perUnit  = math.abs(entryPrice - stopPrice)
    perUnit > 0 ? (riskCash / perUnit) : 0.0
```

### 4.2 Non-Repainting Considerations

The implementation carefully avoids lookahead bias:

1. All pivot confirmations use the `right` parameter, introducing intentional lag
2. Higher timeframe data is requested with `lookahead=barmerge.lookahead_on` and offset expressions
3. Break and retest conditions use only confirmed (closed) bar data
4. Action/Safety lines are frozen at break time and projected forward

### 4.3 Recommended Parameters

| Parameter   | Default   | Description                    |
| :---------- | :-------- | :----------------------------- |
| N           | 200       | Structure lookback window      |
| left/right  | 2/2       | Pivot confirmation bars        |
| α (tauMult) | 0.10      | Touch tolerance                |
| βp/βc       | 0.10/0.15 | Break penetration/confirmation |
| γ           | 0.20      | Retest buffer                  |
| M           | 12        | Retest window (bars)           |
| Q_A/Q_B     | 0.70/0.60 | Quality thresholds             |
| dSafety_max | 2.5       | Maximum risk geometry          |

---

## 5. Autonomous AI Agent Architecture

The final component of this framework is the design of an autonomous AI trading system capable of executing the strategy without human intervention.

![Figure 7: AI Agent Architecture](figures/fig7_ai_architecture.png)

_Figure 7: Multi-layer architecture for autonomous AI trading agents. The system comprises Analysis, Risk, Execution, and Learning layers, with feedback loops for continuous improvement._

### 5.1 System Architecture

The autonomous trading system is organized into four functional layers:

**Analysis Layer:**

- **Market Data Ingestion Agent**: Connects to exchange APIs and WebSocket feeds for real-time OHLCV data
- **Structure Analysis Agent**: Implements the pivot-constrained boundary estimation algorithm
- **Regime Classification Agent**: Computes ER, crossing count, and regime labels
- **Signal Generation Agent**: Detects break, retest, and rejection events

**Risk Layer:**

- **Risk Management Agent**: Calculates initial stops, position sizes, and risk metrics
- **Position Sizing Agent**: Implements dynamic sizing based on Q-Score and account equity
- **Portfolio Optimization Agent**: Manages correlation, exposure limits, and diversification

**Execution Layer:**

- **Execution Agent**: Interfaces with broker/exchange APIs for order placement
- **Order Management Agent**: Handles order types, fills, and partial executions
- **Trade Monitoring Agent**: Tracks open positions, updates trailing stops, manages exits

**Learning Layer:**

- **Performance Analytics**: Tracks win rate, expectancy, drawdown, and Sharpe ratio
- **Parameter Optimization**: Uses walk-forward analysis to adapt parameters
- **Regime Adaptation**: Adjusts strategy behavior based on detected market regime changes

### 5.2 Data Flow and Communication

```
Exchange APIs → Data Ingestion → Structure Analysis → Signal Generation
                                      ↓
                              Regime Classification
                                      ↓
                              Risk Management → Position Sizing
                                      ↓
                              Execution Agent → Order Management
                                      ↓
                              Trade Monitoring → Learning Layer
                                      ↑___________________________________|
```

### 5.3 Implementation Technologies

| Component         | Recommended Technology        |
| :---------------- | :---------------------------- |
| Data Ingestion    | Python + ccxt/websockets      |
| Signal Processing | NumPy, Pandas, TA-Lib         |
| Agent Framework   | LangChain, AutoGen, or custom |
| Execution         | Exchange REST/WebSocket APIs  |
| Database          | TimescaleDB for time-series   |
| Monitoring        | Grafana + Prometheus          |
| Deployment        | Docker + Kubernetes           |

### 5.4 Safety and Compliance

The autonomous system must implement:

1. **Kill Switch**: Manual override to halt all trading immediately
2. **Position Limits**: Maximum position size per instrument and total exposure
3. **Loss Limits**: Daily, weekly, and monthly loss thresholds
4. **Latency Monitoring**: Alert on execution delays exceeding thresholds
5. **Audit Logging**: Complete record of all decisions and executions

---

## 6. Conclusion

This paper has presented a comprehensive mathematical framework for transforming discretionary trendline analysis into a rigorous, quantitative trading methodology. The key contributions include:

1. **Deterministic Boundary Estimation**: A pivot-constrained algorithm that removes subjectivity from trendline identification
2. **Quality Scoring System**: The Q-Score provides an objective measure of trendline reliability
3. **Regime Context Model**: ER and crossing count metrics enable adaptive strategy behavior
4. **Non-Repainting Event Detection**: A state machine ensures backtest integrity
5. **Integrated Risk Management**: A multi-layered system for capital preservation
6. **AI Agent Architecture**: A blueprint for autonomous execution

The framework is designed to be practical and implementable, with complete Pine Script code provided for TradingView deployment. While no trading strategy can guarantee profits, this methodology provides a significant advancement in terms of rigor, objectivity, and robustness compared to traditional discretionary approaches.

**Future Research Directions:**

- Machine learning optimization of scoring function weights
- Multi-timeframe structure alignment and hierarchical signal generation
- Adaptive parameter tuning based on regime detection
- Integration with alternative data sources (sentiment, order flow)

---

## References

[1] Osler, C. (2000). "Support for resistance: technical analysis and intraday exchange rates." _Economic Policy Review_, 6(2).

[2] Park, C. H., & Irwin, S. H. (2007). "What do we know about the profitability of technical analysis?" _Journal of Economic Surveys_, 21(4), 786-826.

[3] Chan, E. P. (2013). _Quantitative Trading: How to Build Your Own Algorithmic Trading Business_. John Wiley & Sons.

[4] Pardo, R. J. (2008). _The Evaluation and Optimization of Trading Strategies_. John Wiley & Sons.

[5] Leung, T., & Li, R. (2019). "Optimal trading with a trailing stop." _Annals of Operations Research_, 281(1-2), 357-385.

[6] Henderson, V., & Hobson, D. (2021). "The Support and Resistance Line Method: An Analysis via Optimal Stopping." _arXiv:2103.02331_.

[7] TradingView. (2024). "Pine Script v6 Language Reference Manual." https://www.tradingview.com/pine-script-docs/

---

## Appendix A: Complete Pine Script Code

The complete Pine Script implementation is provided in the accompanying file: `RG_Structure_Strategy.pine`

## Appendix B: Parameter Sensitivity Guidelines

| Parameter  | Sensitive Range | Impact                                   |
| :--------- | :-------------- | :--------------------------------------- |
| N          | 150-300         | Larger = smoother lines, fewer signals   |
| left/right | 2-5             | Larger = more confirmed pivots, more lag |
| α          | 0.08-0.15       | Smaller = stricter touches               |
| βc         | 0.10-0.25       | Larger = fewer false breaks              |
| M          | 8-20            | Larger = more retest opportunities       |
| Q_A        | 0.65-0.80       | Higher = fewer but higher quality trades |

---

_Document prepared by Manus AI. For research and educational purposes only. Trading involves substantial risk of loss._
