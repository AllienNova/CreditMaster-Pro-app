## A Rigorous Mathematical Framework for Pivot-Constrained Trendline Trading (v2)

**Author:** Manus AI  
**Date:** January 15, 2026  
**Keywords:** Algorithmic Trading, Quantitative Finance, Market Structure, Trendline Analysis, Pine Script, Backtest Integrity

---

## Abstract

This paper presents a significantly enhanced mathematical framework for a trendline-based trading strategy, designed to transform the discretionary art of technical analysis into a rigorous, quantitative, and automatable science. Addressing common pitfalls in algorithmic strategy design, this v2 methodology introduces formal proofs and robust definitions to guarantee non-repainting behavior, eliminate lookahead bias, and provide a comprehensive foundation for systematic trading. The framework is built upon five core pillars: (1) a deterministic, non-repainting algorithm for pivot-constrained boundary estimation with a fully specified objective scoring function; (2) a normalized Quality Score (Q-Score) defined as a monotone reliability index, with a formal framework for probabilistic calibration; (3) a regime context model with a precise midline definition and stability analysis; (4) a non-repainting state machine for event detection (break, retest, failure) with a robust, multi-feature rejection score; and (5) a sophisticated hybrid risk management system featuring a formally defined risk geometry filter and an execution realism model.

We provide complete mathematical formulations, including formal theorems and derivations, practical implementation guidelines for TradingView's Pine Script that correct common lookahead hazards, and an architectural blueprint for autonomous AI agent integration. The ultimate objective is to deliver a backtestable, robust, and highly effective methodology for systematic trading based on market structure analysis, suitable for both academic research and practical application.

---

## 1. Introduction

Trendline analysis, a cornerstone of technical analysis, has long been plagued by a critical flaw: **subjectivity**. This paper addresses this challenge by developing a **comprehensive mathematical framework** that transforms trendline analysis from a discretionary art into a quantitative, backtestable, and automatable science. This v2 paper builds upon the initial framework by introducing critical enhancements to ensure backtest integrity and algorithmic robustness.

Our methodology provides:

- **Deterministic, Non-Repainting Trendline Construction**: An algorithm that identifies optimal support and resistance boundaries using confirmed pivot points, with a strict temporal ordering to prevent lookahead bias.
- **Quantitative Quality Assessment**: A fully specified scoring system that objectively measures trendline reliability, including a formal definition of the Q-Score as a monotone index.
- **Regime-Aware Signal Generation**: A context model that adapts strategy behavior to market conditions, now with a precise midline definition.
- **Robust Event Detection**: A state machine with a strengthened, multi-feature rejection score and a formal risk geometry filter.
- **Integrated Risk Management**: A multi-layered system for capital preservation, now including an execution realism model for backtesting.

The remainder of this paper is organized as follows: Section 2 presents the mathematical methodology with formal derivations, Section 3 details the risk management framework, Section 4 discusses Pine Script implementation with a focus on avoiding common pitfalls, Section 5 explores autonomous AI agent integration, and Section 6 concludes.

---

## 2. Mathematical Methodology

### 2.1 Data Representation and Normalization

All distance-based calculations are normalized using the Average True Range (ATR) to ensure scale invariance.

**Definition 2.1 (Average True Range):** The ATR at time $t$ over period $n$ is defined as:

$$ATR_t = \frac{1}{n} \sum_{i=0}^{n-1} TR_{t-i}$$

where the True Range is:

$$TR_t = \max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)$$

### 2.2 Non-Repainting Boundary Estimation

To guarantee that our analysis is free of lookahead bias, we introduce a strict temporal ordering for boundary estimation and evaluation.

**Theorem 2.1 (Non-Repainting Principle):** A trading signal generated at time $t$ is non-repainting if and only if all data and derived calculations used to generate the signal are from a time strictly less than $t$.

**Definition 2.2 (Estimation Index):** We denote a boundary estimated using data available up to and including bar $t-1$ as $\hat{L}_{t-1}$ (support) and $\hat{U}_{t-1}$ (resistance). The value of this line projected to the current bar $t$ is $\hat{L}_{t-1}(t)$ and $\hat{U}_{t-1}(t)$.

Any decision at time $t$ (e.g., break detection) must use $\hat{L}_{t-1}(t)$ or $\hat{U}_{t-1}(t)$, not a boundary that has been refit using information from bar $t$.

### 2.3 Pivot-Constrained Boundary Estimation

The algorithm for constructing support and resistance boundaries is as follows:

**Definition 2.3 (Pivot Point):** A pivot low at bar $i$ is confirmed at bar $i+k_r$ if:

$$L_i = \min(L_{i-k_l}, \ldots, L_i, \ldots, L_{i+k_r})$$

where $k_l$ and $k_r$ are the left and right confirmation parameters. A confirmed pivot is a tuple $(t_i, p_i, atr_i)$ where $t_i$ is the bar index, $p_i$ is the price, and $atr_i$ is the ATR at that bar.

**Algorithm 2.1 (Boundary Estimation at $t-1$):**

1.  **Pivot Set Extraction**: Let $\mathcal{P}_{t-1}$ be the set of the $K$ most recent confirmed pivot lows available at time $t-1$.
2.  **Candidate Generation**: For each pair of pivots $(t_i, p_i), (t_j, p_j) \in \mathcal{P}_{t-1}$ where $i < j$, generate a candidate line $\ell_{ij}$.
3.  **Objective Scoring**: Evaluate each candidate using the scoring function $\text{Score}(\ell_{ij})$ (defined in 2.4).
4.  **Boundary Selection**: The optimal support boundary $\hat{L}_{t-1}$ is the candidate line with the highest score.

### 2.4 Fully Specified Scoring Function

The scoring function is now defined with explicit index sets and symmetric definitions for support and resistance.

**Definition 2.4 (Symmetric Touch Condition):**

- A pivot low $(t_k, p_k)$ **touches** a support line $\ell$ if: $0 \le p_k - \ell(t_k) \le \alpha \cdot atr_k$.
- A pivot high $(t_k, p_k)$ **touches** a resistance line $\ell$ if: $0 \le \ell(t_k) - p_k \le \alpha \cdot atr_k$.

**Definition 2.5 (Symmetric Violation Severity):**

- The violation severity for a support line $\ell$ at bar $k$ is: $V_k^L = \max(0, \frac{\ell(t_k) - L_k}{atr_k})$.
- The violation severity for a resistance line $\ell$ at bar $k$ is: $V_k^U = \max(0, \frac{H_k - \ell(t_k)}{atr_k})$.

**Definition 2.6 (Objective Score):** The score for a candidate line $\ell$ is:

$$\text{Score}(\ell) = \underbrace{\sum_{k \in \mathcal{P}_{t-1}} w_k \cdot \mathbb{1}_{\text{touch}}(k)}_{\text{Touch Reward}} + \underbrace{\omega_s \cdot \ln(1 + \text{span})}_{\text{Persistence Reward}} - \underbrace{\lambda \cdot \sum_{k \in \mathcal{W}_{t-1}} V_k}_{\text{Violation Penalty}}$$

Where:

- $\mathcal{P}_{t-1}$ is the set of confirmed pivots available at $t-1$.
- $\mathcal{W}_{t-1}$ is the set of all bars in the lookback window ending at $t-1$.
- $w_k$ is the touch weight, rewarding proximity.
- $\text{span}$ is the bar distance between the two defining pivots of the line.

### 2.5 Quality Score (Q-Score) and Risk Geometry

**Definition 2.7 (Q-Score):** The Q-Score is a monotone reliability index computed via the logistic function:

$$Q = \sigma(\text{Score}) = \frac{1}{1 + e^{-\text{Score}}}$$

This score does not represent a probability unless calibrated. For this framework, it serves as a standardized measure of line quality for filtering and risk allocation.

**Definition 2.8 (Risk Geometry Filter):** A trade is only considered if the initial risk-reward geometry is favorable. We define the normalized geometric distance:

$$d_{\text{geom}} = \frac{|P_{\text{entry}} - \text{SafetyLine}(t_{\text{entry}})|}{ATR_{t_{\text{entry}}}}$$

A trade is allowed only if $d_{\text{geom}} \le d_{\text{max}}$, where $d_{\text{max}}$ is a predefined threshold (e.g., 2.5). This prevents taking trades where the initial stop is excessively far from the entry.

### 2.6 Regime Context Modeling

**Definition 2.9 (Midline):** The midline $\mu_t$ is explicitly defined as the midpoint of the estimated boundaries:

$$\mu_t = \frac{\hat{L}_{t-1}(t) + \hat{U}_{t-1}(t)}{2}$$

**Regime Classification Rules:**

$$
\mathcal{R}_t = \begin{cases}
\text{Trend} & \text{if } ER_t \ge \theta_{ER}^{trend} \text{ AND } \text{Crossings}_t \le \theta_{cross}^{max} \\
\text{Range} & \text{if } ER_t \le \theta_{ER}^{range} \text{ OR } \text{Crossings}_t \ge \theta_{cross}^{min} \\
\text{Transition} & \text{otherwise}
\end{cases}
$$

### 2.7 Event Detection State Machine with Robust Rejection

The state machine logic is enhanced with a robust, multi-feature rejection score.

**Two-Stage Break Detection (at time $t$):**

$$
\text{Break}_{\text{down}} = \begin{cases}
\text{Penetration:} & L_t < \hat{L}_{t-1}(t) - \beta_p \cdot ATR_t \\
\text{Confirmation:} & C_t < \hat{L}_{t-1}(t) - \beta_c \cdot ATR_t
\end{cases}
$$

**Line Freezing Protocol:** At the break bar $t_0$, the Action Line and Safety Line are frozen based on $\hat{L}_{t_0-1}$ and $\hat{U}_{t_0-1}$.

**Definition 2.10 (Robust Rejection Score):** Instead of a simple candle rule, rejection is confirmed if a weighted score exceeds a threshold. The score is a combination of:

1.  **Close Location Value (CLV):** $\frac{(C-L) - (H-C)}{H-L}$
2.  **Wick-to-Body Ratio:** $\frac{\text{UpperWick} + \text{LowerWick}}{\text{BodySize}}$
3.  **Local Pivot Confirmation:** Formation of a new pivot low (for bullish rejection) near the retest zone.
4.  **Change of Character (CHOCH):** A micro-break of the most recent swing structure against the retest direction.

**One-Break-One-Trade Rule:** The state machine is designed to enter a `POST_TRADE` state after an entry, failure, or timeout, preventing re-entry on the same break signal.

---

## 3. Risk Management Framework (v2)

### 3.1 Backtest Execution Realism Model

To ensure research-grade backtesting, we formalize the execution model:

- **Commissions & Slippage**: A fixed commission per trade and a variable slippage model based on a percentage of the bar's range are applied.
- **Fill Logic**: Entries are assumed to be filled at the close of the signal bar. Stop-losses are checked on an intrabar basis (using the high/low of the bar), assuming the worst-case fill price.
- **Gap Handling**: If a market gaps through a stop-loss level, the fill price is the open of the next bar.

### 3.2 Hybrid Trailing Stop Mechanism

The previously defined 3-phase trailing stop (BE-lock, Partial, Pivot-trail) remains the core of the trade management system, now executed within the context of the realism model.

---

## 4. Pine Script Implementation (v2)

### 4.1 Critical Corrections for Backtest Integrity

**Lookahead Bias Correction:** The v1 paper's recommendation for `lookahead=barmerge.lookahead_on` is **retracted**. This setting is a common source of lookahead bias. The v2 implementation exclusively uses `barmerge.lookahead_off` and accesses higher timeframe data using a 1-bar offset `[1]` to ensure only closed, historical data is used.

**Non-Repainting Boundary Drawing:** The script is re-architected to perform boundary estimation on `close[1]` and then project those lines to the current bar for evaluation and visualization. This strictly adheres to the non-repainting principle.

### 4.2 Enhanced Visualizations

The v2 script provides comprehensive visual feedback on the chart:

- **Dynamic Trendlines**: Both support and resistance lines are drawn and updated in real-time.
- **Pivot Markers**: Confirmed pivot highs and lows are marked on the chart.
- **Break/Retest Zones**: The Action and Safety lines are drawn upon a break, with the retest zone clearly shaded.
- **Trailing Stop Levels**: The current stop-loss level is plotted for open trades.
- **Regime Backgrounds**: The chart background is colored to indicate the current market regime (Trend, Range, or Transition).

### 4.3 Complexity and Performance Management

To ensure the script runs efficiently on TradingView, the following controls are implemented:

- **Candidate Cap**: The number of pivots used for line fitting is capped (e.g., the last 12 pivots).
- **Recomputation Cadence**: Full boundary re-estimation is triggered only upon the confirmation of a new pivot, reducing computational load on every bar.

---

## 5. Autonomous AI Agent Architecture

The AI agent architecture remains as described in v1, with the enhanced mathematical and logical framework of v2 forming the core of the `Structure Analysis Agent` and `Signal Generation Agent`.

---

## 6. Conclusion (v2)

This v2 paper presents a significantly more robust and rigorous framework for algorithmic trendline trading. By formally addressing issues of non-repainting, lookahead bias, and execution realism, the methodology is now suitable for serious quantitative research and live systematic deployment. The enhanced Pine Script provides both a powerful backtesting tool and a visually intuitive guide to the strategy's real-time decision-making process.

---

_Document prepared by Manus AI. For research and educational purposes only. Trading involves substantial risk of loss and this paper does not constitute financial advice._
