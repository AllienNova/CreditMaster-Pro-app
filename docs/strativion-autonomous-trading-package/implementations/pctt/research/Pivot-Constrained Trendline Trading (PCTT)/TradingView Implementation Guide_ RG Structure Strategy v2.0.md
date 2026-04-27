# TradingView Implementation Guide: RG Structure Strategy v2.0

**A Step-by-Step Guide to Implementing and Backtesting the Visual Edition**

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Adding the Script to TradingView](#2-adding-the-script-to-tradingview)
3. [Understanding the Visual Features](#3-understanding-the-visual-features)
4. [Configuring Strategy Parameters](#4-configuring-strategy-parameters)
5. [Running Your First Backtest](#5-running-your-first-backtest)
6. [Interpreting the Visual Elements](#6-interpreting-the-visual-elements)
7. [Analyzing Backtest Results](#7-analyzing-backtest-results)
8. [Setting Up Alerts](#8-setting-up-alerts)
9. [Optimization Tips](#9-optimization-tips)
10. [Troubleshooting Common Issues](#10-troubleshooting-common-issues)

---

## 1. Prerequisites

Before implementing the strategy, ensure you have:

| Requirement             | Details                                                               |
| :---------------------- | :-------------------------------------------------------------------- |
| **TradingView Account** | Free tier works, but Premium/Pro recommended for more historical bars |
| **Pine Script Version** | The script uses Pine Script v6 (latest)                               |
| **Chart Timeframe**     | Recommended: 1H, 4H, or Daily for best results                        |
| **Asset Type**          | Works on Forex, Crypto, Stocks, Indices, Futures                      |

### Recommended Starting Configuration

- **Symbol**: BTCUSD, EURUSD, SPY, or any liquid market
- **Timeframe**: 4H (good balance of signals and reliability)
- **Historical Data**: At least 1 year for meaningful backtest

---

## 2. Adding the Script to TradingView

### Step 2.1: Open Pine Script Editor

1. Go to [TradingView.com](https://www.tradingview.com) and log in
2. Open any chart (e.g., BTCUSD on Coinbase)
3. At the bottom of the screen, click on **"Pine Editor"** tab
4. If you see existing code, click **"Open"** → **"New blank indicator"**

### Step 2.2: Paste the Script

1. Select all content in the Pine Editor (Ctrl+A / Cmd+A)
2. Delete it (Backspace/Delete)
3. Open the `RG_Structure_Strategy_v2.pine` file
4. Copy the entire script content
5. Paste into the Pine Editor (Ctrl+V / Cmd+V)

### Step 2.3: Save and Add to Chart

1. Click **"Save"** (or Ctrl+S / Cmd+S)
2. Name it: `RG Structure v2.0 [Visual Edition]`
3. Click **"Add to Chart"** button

You should now see the strategy applied to your chart with visual elements appearing.

---

## 3. Understanding the Visual Features

The v2 script provides comprehensive visual feedback. Here's what each element means:

### 3.1 Trendlines (Support & Resistance)

| Element             | Color       | Description                                       |
| :------------------ | :---------- | :------------------------------------------------ |
| **Support Line**    | Green solid | Dynamic support boundary fitted to pivot lows     |
| **Resistance Line** | Red solid   | Dynamic resistance boundary fitted to pivot highs |

These lines are **automatically drawn and updated** as new pivots form. They extend back N bars (default 200) to show the full structure.

### 3.2 Pivot Markers

| Marker         | Symbol                | Meaning              |
| :------------- | :-------------------- | :------------------- |
| **Pivot Low**  | ▲ (Green triangle up) | Confirmed swing low  |
| **Pivot High** | ▼ (Red triangle down) | Confirmed swing high |

Pivots appear with a delay of `right` bars (default 2) to ensure confirmation.

### 3.3 Frozen Action/Safety Lines

| Line            | Color  | Style  | Description                                |
| :-------------- | :----- | :----- | :----------------------------------------- |
| **Action Line** | Orange | Dashed | The broken boundary (frozen at break time) |
| **Safety Line** | Blue   | Dashed | The opposite boundary (used for stop-loss) |

These lines appear **only after a break is detected** and remain fixed until the setup completes or fails.

### 3.4 Event Labels

| Label           | Color  | Meaning                                          |
| :-------------- | :----- | :----------------------------------------------- |
| **BREAK ↓**     | Red    | Support break detected (potential short setup)   |
| **BREAK ↑**     | Green  | Resistance break detected (potential long setup) |
| **RETEST**      | Orange | Price returning to test the broken level         |
| **SHORT ENTRY** | Red    | Short position entered                           |
| **LONG ENTRY**  | Green  | Long position entered                            |
| **BE**          | Blue   | Break-even stop activated                        |
| **TP1**         | Teal   | Partial profit taken                             |
| **TIMEOUT**     | Gray   | Setup expired without entry                      |
| **FAIL**        | Purple | Break failed (price reversed)                    |
| **TIME**        | Gray   | Time stop triggered                              |

### 3.5 Trailing Stop Line

| Element           | Color           | Style     |
| :---------------- | :-------------- | :-------- |
| **Trailing Stop** | Fuchsia/Magenta | Step line |

This line shows the **current stop-loss level** for any open position. It moves in your favor as the trade progresses through the three phases:

1. Initial stop at Safety Line
2. Break-even lock at +0.8R
3. Pivot-based trailing at +1.0R

### 3.6 Regime Background

| Background Color | Regime     | Trading Implication               |
| :--------------- | :--------- | :-------------------------------- |
| **Light Green**  | Trend      | Favorable for break-retest trades |
| **Light Red**    | Range      | Strategy pauses (no new entries)  |
| **Light Yellow** | Transition | Optimal for catching new trends   |

### 3.7 Info Table (Top Right)

The real-time dashboard displays:

```
┌─────────────────────────┐
│ RG Structure v2.0       │
├─────────────────────────┤
│ Regime:    TREND        │
│ ER:        42.3%        │
│ Q-Sup:     0.72         │
│ Q-Res:     0.68         │
│ State:     IDLE         │
│ dGeom:     1.85         │
│ R-Now:     1.23         │
└─────────────────────────┘
```

---

## 4. Configuring Strategy Parameters

### Step 4.1: Open Settings

1. Click on the strategy name in the top-left of the chart
2. Click the **gear icon** (⚙️) to open Settings
3. Or double-click the strategy name

### Step 4.2: Parameter Groups Explained

#### Structure Module Parameters

| Parameter                   | Default | Range  | Description                          |
| :-------------------------- | :------ | :----- | :----------------------------------- |
| Lookback Window (N)         | 200     | 80-600 | Bars to analyze for structure        |
| Pivot Left Bars             | 2       | 1-10   | Bars left of pivot for confirmation  |
| Pivot Right Bars            | 2       | 1-10   | Bars right of pivot (introduces lag) |
| Max Pivots for Line Fitting | 12      | 4-30   | Number of pivots to consider         |
| Violation Eval Step         | 4       | 1-20   | Sampling frequency for violations    |
| Min Pivot Touches           | 2       | 2-6    | Required touches for valid line      |

**Tip**: For higher timeframes (Daily+), increase N to 300-400. For lower timeframes (15m-1H), reduce to 100-150.

#### Line Scoring Parameters

| Parameter                 | Default | Description                          |
| :------------------------ | :------ | :----------------------------------- |
| Touch Tolerance (α × ATR) | 0.10    | How close a pivot must be to "touch" |
| Span Reward Weight (ωs)   | 0.20    | Reward for longer-spanning lines     |
| Violation Penalty (λ)     | 1.50    | Penalty for price violations         |

#### Break & Retest Logic

| Parameter                     | Default | Description                        |
| :---------------------------- | :------ | :--------------------------------- |
| Break Penetration (βp × ATR)  | 0.10    | Initial break threshold            |
| Break Confirmation (βc × ATR) | 0.15    | Close-based confirmation           |
| Retest Buffer (γ × ATR)       | 0.20    | Zone around action line for retest |
| Fail Buffer (δ × ATR)         | 0.20    | Threshold for failed break         |
| Retest Window (M bars)        | 12      | Max bars to wait for retest        |

#### Regime Context

| Parameter               | Default | Description                          |
| :---------------------- | :------ | :----------------------------------- |
| Regime Window           | 150     | Bars for ER and crossing calculation |
| ER Trend Threshold      | 0.35    | Above this = trending                |
| ER Range Threshold      | 0.20    | Below this = ranging                 |
| Max Crossings for Trend | 8       | Crossing limit for trend regime      |
| Min Crossings for Range | 20      | Crossing minimum for range regime    |

#### Risk Management

| Parameter             | Default | Description                    |
| :-------------------- | :------ | :----------------------------- |
| Risk % (A Setup)      | 1.0     | Risk for high-quality setups   |
| Risk % (B Setup)      | 0.5     | Risk for medium-quality setups |
| A Setup Q Threshold   | 0.70    | Q-Score for A-grade            |
| B Setup Q Threshold   | 0.60    | Q-Score for B-grade            |
| Max dGeom (ATR units) | 2.5     | Maximum allowed risk geometry  |
| Stop Buffer (× ATR)   | 0.20    | Buffer added to Safety Line    |

#### Trade Management

| Parameter               | Default | Description                   |
| :---------------------- | :------ | :---------------------------- |
| BE Trigger (R)          | 0.8     | R-multiple for break-even     |
| Partial Take Profit (R) | 1.0     | R-multiple for partial exit   |
| Partial Qty %           | 60      | Percentage to close at TP1    |
| Trail Start (R)         | 1.0     | R-multiple to start trailing  |
| Trail Buffer (× ATR)    | 0.20    | Buffer below pivot for trail  |
| Time Stop Bars          | 20      | Exit if not +0.5R by this bar |

#### Visual Settings

| Parameter               | Default | Description                        |
| :---------------------- | :------ | :--------------------------------- |
| Show Pivot Markers      | ✓       | Display pivot triangles            |
| Show Trendlines         | ✓       | Display support/resistance lines   |
| Show Break/Retest Zones | ✓       | Display action/safety lines        |
| Show Trailing Stop      | ✓       | Display stop level for open trades |
| Show Regime Background  | ✓       | Color background by regime         |
| Show Event Labels       | ✓       | Display BREAK, RETEST, etc.        |

---

## 5. Running Your First Backtest

### Step 5.1: Select Backtest Period

1. Go to **Settings** → **Properties** tab
2. Set **Initial Capital**: $10,000 (or your preferred amount)
3. Set **Commission**: 0.05% (adjust for your broker)
4. Set **Slippage**: 2 ticks

### Step 5.2: Choose Date Range

1. In the chart, right-click → **"Reset Chart"** to see full history
2. Or use the date range selector at the bottom

### Step 5.3: View Strategy Tester

1. Click the **"Strategy Tester"** tab at the bottom of the screen
2. You'll see three sub-tabs:
   - **Overview**: Summary statistics
   - **Performance Summary**: Detailed metrics
   - **List of Trades**: Individual trade log

### Step 5.4: Analyze Initial Results

Look for these key metrics in the Overview:

| Metric        | Good Value | Concern  |
| :------------ | :--------- | :------- |
| Net Profit    | Positive   | Negative |
| Profit Factor | > 1.5      | < 1.2    |
| Max Drawdown  | < 15%      | > 25%    |
| Win Rate      | > 45%      | < 35%    |
| Avg Trade     | Positive   | Negative |

---

## 6. Interpreting the Visual Elements

### 6.1 Reading a Complete Trade Sequence

Here's how to follow a typical short trade on the chart:

```
1. TREND REGIME (green background)
   ↓
2. PIVOT MARKERS appear (▲ lows, ▼ highs)
   ↓
3. TRENDLINES drawn (green support, red resistance)
   ↓
4. "BREAK ↓" label appears (support broken)
   ↓
5. ACTION LINE (orange dashed) & SAFETY LINE (blue dashed) freeze
   ↓
6. Price returns to action line → "RETEST" zone (orange box)
   ↓
7. Rejection candle forms → "SHORT ENTRY" label
   ↓
8. TRAILING STOP (fuchsia line) appears at Safety Line + buffer
   ↓
9. Price moves in favor → "BE" label (stop moved to entry)
   ↓
10. +1R reached → "TP1" label (60% closed)
    ↓
11. Trailing stop follows pivot lows (fuchsia step-line)
    ↓
12. Stop hit or target reached → Trade closed
```

### 6.2 Identifying Quality Setups

Use the Info Table to assess setup quality:

| Q-Score   | Grade | Action           |
| :-------- | :---- | :--------------- |
| ≥ 0.70    | A     | Full risk (1.0%) |
| 0.60-0.69 | B     | Half risk (0.5%) |
| < 0.60    | Skip  | No trade         |

Also check:

- **dGeom ≤ 2.5**: Risk geometry acceptable
- **Regime ≠ RANGE**: Strategy active

---

## 7. Analyzing Backtest Results

### 7.1 Performance Summary Metrics

Navigate to **Strategy Tester** → **Performance Summary**:

| Metric                | What It Tells You                       |
| :-------------------- | :-------------------------------------- |
| **Total Trades**      | Sample size (need 30+ for significance) |
| **Profit Factor**     | Gross profit / Gross loss (want > 1.5)  |
| **Max Drawdown**      | Largest peak-to-trough decline          |
| **Sharpe Ratio**      | Risk-adjusted return (want > 1.0)       |
| **Avg Winning Trade** | Average profit on winners               |
| **Avg Losing Trade**  | Average loss on losers                  |
| **Largest Win/Loss**  | Outlier detection                       |

### 7.2 Equity Curve Analysis

Look for:

- **Smooth upward slope**: Consistent profitability
- **Minimal drawdowns**: Good risk management
- **No flat periods**: Strategy active in various conditions

### 7.3 Trade Distribution

In **List of Trades**, check:

- Are wins larger than losses on average?
- Are there clusters of losses (regime issue)?
- Do partial exits (TP1) improve overall results?

---

## 8. Setting Up Alerts

### Step 8.1: Create Alert

1. Right-click on the chart
2. Select **"Add Alert"**
3. In the **Condition** dropdown, select `RG Structure v2.0 [Visual Edition]`

### Step 8.2: Available Alert Conditions

| Alert                 | Trigger                   |
| :-------------------- | :------------------------ |
| **Break Down**        | Support break detected    |
| **Break Up**          | Resistance break detected |
| **Bearish Rejection** | Short entry signal        |
| **Bullish Rejection** | Long entry signal         |

### Step 8.3: Configure Notification

1. Set **Alert name**: e.g., "RG Structure - Short Signal"
2. Choose **Notification method**:
   - App notification
   - Email
   - Webhook (for automation)
3. Set **Expiration**: "Open-ended" for continuous monitoring
4. Click **Create**

---

## 9. Optimization Tips

### 9.1 Parameter Optimization

TradingView's built-in optimizer:

1. Go to **Settings** → **Properties**
2. Enable **"Deep Backtesting"** (Premium feature)
3. Or manually test parameter ranges

### 9.2 Recommended Parameter Ranges to Test

| Parameter     | Test Range         | Step |
| :------------ | :----------------- | :--- |
| N (Lookback)  | 150, 200, 250, 300 | 50   |
| Retest Window | 8, 12, 16, 20      | 4    |
| Q-A Threshold | 0.65, 0.70, 0.75   | 0.05 |
| Partial %     | 50, 60, 70         | 10   |

### 9.3 Walk-Forward Testing

1. Optimize on first 70% of data
2. Test on remaining 30%
3. Compare in-sample vs out-of-sample performance
4. If degradation > 30%, parameters may be overfit

### 9.4 Multi-Timeframe Testing

Test the same parameters across:

- 1H, 4H, Daily
- Different assets in same class
- Look for consistent performance

---

## 10. Troubleshooting Common Issues

### Issue 1: No Trades Appearing

**Possible Causes:**

- Regime is RANGE (red background) → Strategy pauses
- Q-Scores too low (< 0.60) → Lower thresholds
- dGeom too high → Increase dSafetyMax
- Not enough historical data → Extend chart

**Solution:**

1. Check Info Table for current state
2. Temporarily lower Q thresholds to 0.50
3. Increase lookback period

### Issue 2: Too Many False Signals

**Possible Causes:**

- Retest window too long
- Break confirmation too loose
- Rejection scoring too lenient

**Solution:**

1. Increase `Break Confirmation (βc)` to 0.20
2. Reduce `Retest Window` to 8
3. Ensure rejection requires 3/4 conditions

### Issue 3: Lines Not Drawing

**Possible Causes:**

- Not enough pivots detected
- Min Touches too high
- Lookback too short

**Solution:**

1. Reduce `Min Pivot Touches` to 2
2. Increase `Lookback Window (N)` to 250
3. Reduce `Pivot Left/Right` to 2

### Issue 4: Script Errors

**Common Errors:**

- "Too many labels": Reduce historical bars or disable labels
- "Script timeout": Increase `Violation Eval Step` to 8
- "Array out of bounds": Ensure enough historical data

### Issue 5: Backtest vs Live Discrepancy

**Causes:**

- Lookahead bias (should be fixed in v2)
- Repainting (should be fixed in v2)
- Slippage/commission not modeled

**Solution:**

1. Verify using `barstate.isconfirmed` for entries
2. Increase slippage in settings
3. Paper trade for 1 month before live

---

## Quick Reference Card

### Visual Element Summary

| Element            | Color               | Meaning |
| :----------------- | :------------------ | :------ |
| Green solid line   | Support boundary    |
| Red solid line     | Resistance boundary |
| Orange dashed line | Frozen Action Line  |
| Blue dashed line   | Frozen Safety Line  |
| Fuchsia step line  | Trailing stop       |
| Green background   | Trend regime        |
| Red background     | Range regime        |
| Yellow background  | Transition regime   |
| ▲ Green            | Pivot low           |
| ▼ Red              | Pivot high          |

### State Machine Flow

```
IDLE → BREAK DETECTED → WAIT RETEST → ENTRY → POST-TRADE → IDLE
         ↓                    ↓
       FAIL               TIMEOUT
```

### Entry Checklist

- [ ] Regime ≠ RANGE
- [ ] Q-Score ≥ 0.60
- [ ] dGeom ≤ 2.5
- [ ] Rejection Score ≥ 3/4
- [ ] Within Retest Window

---

_Guide prepared by Manus AI. For educational purposes only. Always paper trade before risking real capital._
