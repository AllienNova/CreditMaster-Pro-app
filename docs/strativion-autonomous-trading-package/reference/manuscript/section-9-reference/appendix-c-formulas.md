# Appendix C: Mathematical Formulas Quick Reference

> Every formula in this appendix has been referenced in at least one of the 30 law chapters. This is not a textbook. It is a field manual. Keep it open while you trade.

---

## Section 1: The 30 Law Formulations

Each law is expressed here as a formal statement. These are the condensed versions of the principles explored in the full chapters.

1. **Market Inertia:** A market's prevailing regime persists until a statistically significant structural break occurs. Autocorrelation > 0 confirms trend continuation; its decay signals regime change.
2. **Feedback Loops:** Price dynamics alternate between positive feedback (trend-reinforcing, deviations grow) and negative feedback (mean-reverting, deviations self-correct). Applying the wrong strategy for the active regime produces systematically negative returns.
3. **Volatility Compression:** Volatility clusters in time. Low-volatility compression precedes high-volatility expansion, and the magnitude of expansion correlates positively with the duration and tightness of compression.
4. **Liquidity Gravity:** Price gravitates toward liquidity pools. Large clusters of resting orders act as attractors. When liquidity is consumed or withdrawn, price moves violently through liquidity voids.
5. **Mean Reversion:** Prices oscillate around equilibrium values. Extreme deviations from equilibrium create reversion pressure proportional to the deviation's statistical significance.
6. **Fractal Structure:** Market price patterns are self-similar across timeframes. The same structural patterns appear on 1-minute, daily, and monthly charts. No single timeframe contains the "truth."
7. **Fat Tails:** Market returns follow power-law distributions, not Gaussian distributions. Extreme events occur far more frequently than normal models predict. A 5-sigma event occurs roughly every 6 months, not every 14,000 years.
8. **Market Regimes:** Markets operate in distinct regimes (trending, mean-reverting, volatile/crisis), each with different statistical properties. Strategies that work in one regime fail in another.
9. **Information Decay:** The trading value of information decays over time following an exponential curve. Half-life varies: earnings surprises decay in days, structural macro shifts persist for months.
10. **Time Delays:** Every trading signal, indicator, and system operates with inherent time delays. The tradeoff between signal smoothness and latency is fundamental and unavoidable.
11. **Structural Levels:** Price remembers key levels. Structural levels created by concentrations of memory, order flow, and psychological anchoring act as barriers until decisively broken.
12. **Multi-Timeframe Alignment:** The probability of a successful trade increases when multiple timeframes align in the same direction. Conflicting timeframes produce destructive interference, reducing edge.
13. **Momentum:** Price momentum persists in the short term but eventually exhausts. The transition from persistence to exhaustion is identifiable through volume divergence, indicator divergence, and structural weakening.
14. **Path Dependency:** How price arrives at a level matters as much as what level it reaches. Market structure (the path) creates context that shapes future price behavior.
15. **Signal Filtration:** Raw market data contains more noise than signal. System quality depends on filter effectiveness. Over-filtering eliminates valid signals; under-filtering generates excessive false signals.
16. **Expectancy:** A trading system's value is determined by E = (Win Rate x Average Win) minus (Loss Rate x Average Loss). A 30% win rate system can be highly profitable with large enough R-multiples.
17. **Statistical Significance:** A trading edge must be tested over a sufficient sample size to distinguish skill from luck. Minimum sample sizes depend on win rate, payoff ratio, and desired confidence level.
18. **Confirmation Confluence:** Signal reliability increases when multiple independent evidence sources converge. True confluence requires genuinely independent measurements, not redundant indicators from the same data.
19. **Edge/Pattern Decay:** Every trading edge decays over time as it becomes known and exploited. The market is an adaptive adversary. Published edges decay fastest.
20. **Backtest Illusion:** Every backtest is an optimistic estimate of future performance. Look-ahead bias, survivorship bias, curve-fitting, and unrealistic execution assumptions create a systematic gap between backtested and live results.
21. **Position Sizing:** Position sizing determines survival more than entry timing. The optimal bet size is a function of edge size AND uncertainty about that edge.
22. **Invalidation:** Every trade requires a predefined invalidation point. If the market reaches this level, the thesis is wrong and the position must be exited immediately.
23. **Asymmetric Damage:** Losses damage portfolios more than equivalent gains help them. A 50% loss requires a 100% gain to recover. Capital preservation must be the primary objective.
24. **Systemic Correlation:** In crisis conditions, correlations spike toward 1.0. Diversification fails precisely when you need it most.
25. **Transaction Costs:** Transaction costs (spreads, commissions, slippage, market impact) are certain; profits are probabilistic. A strategy with 0.1% edge per trade that costs 0.15% per trade has negative expectancy.
26. **Complexity Decay:** Adding complexity produces diminishing and eventually negative returns. The optimal system is the simplest one that captures the core edge.
27. **Emotional Gravity:** Emotions exert a constant gravitational pull on decisions, systematically biasing behavior toward holding losers too long, cutting winners too short, and trading too frequently.
28. **Adaptation:** Markets evolve. Strategies must evolve with them. The traders who survive long-term are the most adaptive, not the smartest or boldest.
29. **Probability of Ruin:** Given enough time, any system with negative expectancy or excessive risk-per-trade will go to zero. For over-leveraged traders, ruin is not a question of IF but WHEN.
30. **Survival:** The meta-rule above all others. Survival is the prerequisite for success. Every other law serves this one.

---

## Section 2: Position Sizing Formulas

### Kelly Criterion

**Formula:**

f* = (bp - q) / b

**Variables:**
- f* = optimal fraction of capital to risk
- b = net odds received on the bet (reward-to-risk ratio)
- p = probability of winning
- q = probability of losing (q = 1 - p)

**Worked Example:**
Your system wins 55% of the time with a 2:1 reward-to-risk ratio.
- b = 2.0, p = 0.55, q = 0.45
- f* = (2.0 x 0.55 - 0.45) / 2.0
- f* = (1.10 - 0.45) / 2.0
- f* = 0.65 / 2.0
- f* = 0.325 (32.5% of capital per trade)

This is almost always too aggressive for real trading. See Fractional Kelly below.

### Fractional Kelly

**Formula:**

f = f* x fraction

The fraction is typically 0.25 to 0.50. Most professional traders use quarter-Kelly or half-Kelly.

**Worked Example (using the result above):**
- Full Kelly: f* = 0.325
- Half-Kelly: f = 0.325 x 0.50 = 0.1625 (16.25%)
- Quarter-Kelly: f = 0.325 x 0.25 = 0.0813 (8.13%)

Quarter-Kelly sacrifices roughly 44% of the growth rate but reduces volatility by 75%. This is why most professionals use it.

### ATR-Based Position Sizing

**Formula:**

Position Size = Account Risk / (ATR x Multiplier x Point Value)

**Variables:**
- Account Risk = Account Balance x Risk Percentage (e.g., 1%)
- ATR = Average True Range (typically 14-period)
- Multiplier = Stop distance in ATR units (typically 1.5 to 3.0)
- Point Value = Dollar value per point of the instrument

**Worked Example (ES Futures):**
- Account: $100,000. Risk: 1% = $1,000
- ES 14-period ATR: 45 points
- Multiplier: 2.0 (stop at 2x ATR)
- Point Value: $50 per point (ES futures)
- Position Size = $1,000 / (45 x 2.0 x $50)
- Position Size = $1,000 / $4,500
- Position Size = 0.22 contracts. Round down to 0 contracts.

The math says you cannot afford to trade ES futures with a $100,000 account at 1% risk with a 2-ATR stop. You need either a smaller stop, more capital, or higher risk tolerance.

### Fixed Fractional Position Sizing

**Formula:**

Position Size = (Account x Risk%) / (Entry Price - Stop Price)

**Worked Example (Stock):**
- Account: $50,000. Risk: 2% = $1,000
- Entry: $150.00. Stop: $142.00 (risk of $8.00 per share)
- Position Size = $1,000 / $8.00
- Position Size = 125 shares
- Position Value = 125 x $150 = $18,750 (37.5% of account)

Notice: The position size is determined by the stop distance, not by a fixed dollar amount. Wider stops mean fewer shares. Tighter stops mean more shares.

### Correlation-Adjusted Position Count

**Formula:**

Effective Positions = N / (1 + (N - 1) x Avg Correlation)

**Variables:**
- N = Number of open positions
- Avg Correlation = Average pairwise correlation between positions

**Worked Example:**
- You hold 6 positions. Average pairwise correlation: 0.40.
- Effective Positions = 6 / (1 + (6 - 1) x 0.40)
- Effective Positions = 6 / (1 + 2.0)
- Effective Positions = 6 / 3.0
- Effective Positions = 2.0

Six positions with 0.40 average correlation behave like two independent bets. You are far less diversified than you think.

### Account Heat

**Formula:**

Total Heat = Sum of (Risk% per position for all open positions)

**Rule:** Maximum Total Heat = 6% of account equity.

**Example:**
- Position 1: 1.5% risk
- Position 2: 2.0% risk
- Position 3: 1.0% risk
- Total Heat = 4.5%. You can add one more position risking up to 1.5%.

If all positions are correlated, effective heat is higher than nominal heat. Adjust using the correlation formula above.

---

## Section 3: Expectancy and Performance Metrics

### Expectancy (E)

**Formula:**

E = (Win% x Avg Win) - (Loss% x Avg Loss)

**Worked Example:**
- Win Rate: 45%. Loss Rate: 55%.
- Average Win: $800. Average Loss: $400.
- E = (0.45 x $800) - (0.55 x $400)
- E = $360 - $220
- E = $140 per trade

This system makes $140 on average per trade, despite losing more often than it wins.

### Expectancy Per Dollar Risked (E/R)

**Formula:**

E/R = (Win% x Avg R-multiple on wins) - (Loss% x 1)

**Worked Example:**
- Win Rate: 40%. Average R-multiple on wins: 3.2R.
- E/R = (0.40 x 3.2) - (0.60 x 1.0)
- E/R = 1.28 - 0.60
- E/R = 0.68R

For every dollar risked, this system returns $0.68 on average. This is excellent despite the low win rate.

### Profit Factor (PF)

**Formula:**

PF = Gross Profits / Gross Losses

**Interpretation:**
- PF < 1.0: Losing system
- PF 1.0 to 1.5: Marginal (transaction costs may kill it)
- PF 1.5 to 2.0: Good
- PF 2.0 to 3.0: Excellent
- PF > 3.0: Exceptional (or the sample size is too small)

### Sharpe Ratio (S)

**Formula:**

S = (Mean Return - Risk-Free Rate) / Standard Deviation of Returns

**Annualized (from daily returns):**

S_annual = S_daily x sqrt(252)

**Interpretation:**
- S < 0.5: Poor
- S 0.5 to 1.0: Acceptable
- S 1.0 to 2.0: Good
- S > 2.0: Excellent
- S > 3.0: Either exceptional or something is wrong with the data

### Sortino Ratio

**Formula:**

Sortino = (Mean Return - Risk-Free Rate) / Downside Deviation

Downside Deviation uses only negative returns in the standard deviation calculation. The Sortino Ratio is superior to the Sharpe Ratio for strategies with asymmetric return distributions (which is most trading strategies). A system that has occasional large wins and consistent small losses will have a much better Sortino than Sharpe.

### Calmar Ratio

**Formula:**

Calmar = Annualized Return / Maximum Drawdown

**Interpretation:**
- Calmar < 0.5: Painful equity curve
- Calmar 0.5 to 1.0: Acceptable
- Calmar 1.0 to 2.0: Good
- Calmar > 2.0: Excellent
- Calmar > 3.0: Exceptional (or the track record is too short)

Calmar is calculated over a rolling 36-month window.

### Maximum Drawdown (MDD)

**Formula:**

MDD = (Peak - Trough) / Peak

Example: Account peaks at $125,000 then drops to $95,000.
MDD = ($125,000 - $95,000) / $125,000 = 24%

---

## Section 4: Drawdown Recovery Table

This table shows why capital preservation is the most important job in trading. The deeper the hole, the harder (and longer) it takes to climb out.

| Drawdown | Gain Required to Recover | Recovery at 1%/month | Recovery at 2%/month | Recovery at 5%/month |
|----------|--------------------------|---------------------|---------------------|---------------------|
| 5%       | 5.3%                     | 6 months            | 3 months            | 2 months            |
| 10%      | 11.1%                    | 11 months           | 6 months            | 3 months            |
| 15%      | 17.6%                    | 17 months           | 9 months            | 4 months            |
| 20%      | 25.0%                    | 23 months           | 12 months           | 5 months            |
| 25%      | 33.3%                    | 29 months           | 15 months           | 6 months            |
| 30%      | 42.9%                    | 36 months           | 18 months           | 8 months            |
| 35%      | 53.8%                    | 44 months           | 22 months           | 9 months            |
| 40%      | 66.7%                    | 52 months           | 26 months           | 11 months           |
| 45%      | 81.8%                    | 61 months           | 31 months           | 13 months           |
| 50%      | 100.0%                   | 70 months           | 35 months           | 15 months           |
| 55%      | 122.2%                   | 82 months           | 41 months           | 17 months           |
| 60%      | 150.0%                   | 95 months           | 48 months           | 20 months           |
| 65%      | 185.7%                   | 112 months          | 56 months           | 23 months           |
| 70%      | 233.3%                   | 132 months          | 66 months           | 27 months           |
| 75%      | 300.0%                   | 155 months          | 78 months           | 32 months           |
| 80%      | 400.0%                   | 185 months          | 93 months           | 38 months           |
| 85%      | 566.7%                   | 224 months          | 112 months          | 46 months           |
| 90%      | 900.0%                   | 282 months          | 141 months          | 58 months           |
| 95%      | 1,900.0%                 | 433 months          | 217 months          | 89 months           |

**Key insight:** A 50% drawdown requires a 100% gain to recover. At a strong 2% monthly return, that takes almost 3 years. A 75% drawdown requires a 300% gain. That takes 6.5 years at the same pace. Most traders quit long before recovery.

---

## Section 5: Probability of Ruin Tables

### Table 1: Probability of Ruin by Win Rate and Payoff Ratio

Assumes 2% risk per trade, 1,000-trade simulation, ruin defined as 50% drawdown from peak.

| Win Rate | R = 1.0 | R = 1.5 | R = 2.0 | R = 2.5 | R = 3.0 |
|----------|---------|---------|---------|---------|---------|
| 40%      | 100%    | 99%     | 71%     | 38%     | 18%     |
| 45%      | 100%    | 67%     | 24%     | 8%      | 3%      |
| 50%      | 84%     | 18%     | 4%      | 1%      | < 1%    |
| 55%      | 31%     | 3%      | < 1%    | < 1%    | < 1%    |
| 60%      | 5%      | < 1%    | < 1%    | < 1%    | < 1%    |
| 65%      | < 1%    | < 1%    | < 1%    | < 1%    | < 1%    |

**Reading the table:** With a 45% win rate and 2:1 payoff ratio, risking 2% per trade, there is a 24% chance of hitting a 50% drawdown over 1,000 trades. That is roughly once every 4 years of active trading. Most traders cannot survive that.

### Table 2: Probability of Ruin by Risk Per Trade

Assumes 55% win rate, 2:1 reward-to-risk ratio, 1,000 trades, ruin defined as 50% drawdown.

| Risk Per Trade | P(Ruin) over 1,000 Trades |
|----------------|---------------------------|
| 0.5%           | < 0.1%                    |
| 1.0%           | < 0.5%                    |
| 2.0%           | < 1%                      |
| 3.0%           | 4%                        |
| 5.0%           | 22%                       |
| 10.0%          | 68%                       |
| 20.0%          | 97%                       |

**Key insight:** Even with a genuine 55% win rate and 2:1 R/R (a very good system), risking 10% per trade gives you a 68% probability of ruin. At 20% risk, ruin is virtually certain. The edge does not matter if the sizing is wrong. This is Law 21 and Law 29 speaking in numbers.

---

## Section 6: Options Formulas

### Black-Scholes Key Relationships

The full Black-Scholes derivation fills textbooks. For traders, these are the relationships that matter.

**Call Price** is primarily driven by:
- Intrinsic value: max(S - K, 0)
- Time value: increases with time to expiration (theta decay accelerates near expiry)
- Volatility premium: increases with implied volatility

**Put Price** follows the same logic via put-call parity.

### Put-Call Parity

**Formula:**

C + PV(K) = P + S

**Variables:**
- C = Call price
- PV(K) = Present value of the strike price = K x e^(-rT)
- P = Put price
- S = Current stock price

If this equation does not hold, an arbitrage opportunity exists. In practice, market makers enforce parity within the bid-ask spread.

### Delta Approximation

- **Call Delta:** Delta approximately equals N(d1), where N is the cumulative standard normal distribution. Ranges from 0 to 1.
- **Put Delta:** Delta approximately equals N(d1) minus 1. Ranges from -1 to 0.
- **At-the-money options:** Delta is approximately 0.50 for calls and -0.50 for puts.
- **Rule of thumb:** Delta roughly equals the probability the option expires in the money.

### Expected Move from Options

**Rule of Thumb:**

Expected Move = Straddle Price x 0.85

**Worked Example:**
- Stock at $200. The at-the-money straddle (call + put at the $200 strike) costs $16.
- Expected Move = $16 x 0.85 = $13.60
- Expected Range: $186.40 to $213.60

This is the market's implied one-standard-deviation range for the expiration period. The actual move stays within this range roughly 68% of the time.

### Implied Volatility to Daily Move

**Formula:**

Daily Move = Price x IV / sqrt(252)

**Worked Example:**
- Stock at $100. IV = 30% (0.30).
- Daily Move = $100 x 0.30 / 15.87
- Daily Move = $1.89

The market expects a $1.89 daily move (one standard deviation). On 68% of trading days, the stock should move less than $1.89. On 32% of days, it moves more.

---

## Section 7: Correlation Matrix Template

Use this template to track correlations across your portfolio. Update weekly or when market regimes change (Law 8).

|         | SPY   | QQQ   | TLT   | GLD   | DXY   | CL    | BTC   | EUR/USD |
|---------|-------|-------|-------|-------|-------|-------|-------|---------|
| **SPY** | 1.00  |       |       |       |       |       |       |         |
| **QQQ** |       | 1.00  |       |       |       |       |       |         |
| **TLT** |       |       | 1.00  |       |       |       |       |         |
| **GLD** |       |       |       | 1.00  |       |       |       |         |
| **DXY** |       |       |       |       | 1.00  |       |       |         |
| **CL**  |       |       |       |       |       | 1.00  |       |         |
| **BTC** |       |       |       |       |       |       | 1.00  |         |
| **EUR/USD** |   |       |       |       |       |       |       | 1.00    |

### How to Fill It In

1. **Source:** Download 90-day daily return data from Yahoo Finance, TradingView, or your broker's platform.
2. **Calculation:** Use Excel's CORREL function, Python's pandas `.corr()` method, or TradingView's built-in correlation indicator.
3. **Interpretation:**
   - +0.70 to +1.00: Strongly correlated. These positions behave as one bet.
   - +0.30 to +0.70: Moderately correlated. Some diversification benefit.
   - -0.30 to +0.30: Weakly correlated. Good diversification.
   - -0.70 to -0.30: Moderately inverse. Potential hedge.
   - -1.00 to -0.70: Strongly inverse. Strong hedge.

4. **Crisis Adjustment (Law 24):** In crisis conditions, multiply all positive correlations by 1.3 (cap at 1.0). Diversification benefits evaporate when you need them most. Plan for the crisis correlation, not the calm-market correlation.

### Typical Calm-Market Correlations (for reference)

- SPY/QQQ: +0.90 to +0.95 (almost identical)
- SPY/TLT: -0.30 to -0.50 (inverse, but unreliable in some regimes)
- SPY/GLD: +0.05 to +0.20 (weakly positive)
- DXY/EUR/USD: -0.95 to -1.00 (nearly perfect inverse by construction)
- SPY/BTC: +0.30 to +0.60 (regime-dependent, has increased over time)
- GLD/DXY: -0.40 to -0.60 (inverse)

---

## Section 8: Statistical Significance

### Minimum Sample Sizes

The question every trader must answer: "How many trades do I need before I know my edge is real?"

**Formula:**

n = (z squared x p x (1 - p)) / e squared

**Variables:**
- n = minimum number of trades
- z = z-score for desired confidence level
- p = observed win rate (use 0.50 if unknown)
- e = acceptable margin of error (how precise you need the estimate)

### Z-Score Table for Common Confidence Levels

| Confidence Level | Z-Score | Meaning |
|-----------------|---------|---------|
| 90%             | 1.645   | 1 in 10 chance the result is random |
| 95%             | 1.960   | 1 in 20 chance the result is random |
| 99%             | 2.576   | 1 in 100 chance the result is random |
| 99.9%           | 3.291   | 1 in 1,000 chance the result is random |

For trading purposes, 95% confidence is the minimum acceptable threshold. Particle physicists require 5-sigma (99.99994%). Traders should be at least as rigorous as medical researchers (95%).

### Worked Example: How Many Trades to Confirm an Edge

Your backtest shows a 55% win rate. You want 95% confidence that the true win rate is above 50% (with 5% margin of error).

- z = 1.96 (for 95% confidence)
- p = 0.55
- e = 0.05

n = (1.96 squared x 0.55 x 0.45) / 0.05 squared
n = (3.8416 x 0.2475) / 0.0025
n = 0.9508 / 0.0025
n = 380 trades

You need at least 380 trades to confirm your edge is real at 95% confidence. Not 20. Not 50. Three hundred and eighty.

### Quick Reference: Minimum Trades by Win Rate

| Observed Win Rate | 95% Confidence, 5% Margin | 99% Confidence, 5% Margin |
|-------------------|---------------------------|---------------------------|
| 50%               | 385                       | 664                       |
| 55%               | 380                       | 656                       |
| 60%               | 369                       | 637                       |
| 65%               | 350                       | 604                       |
| 70%               | 323                       | 557                       |

**Bottom line:** If you have fewer than 300 trades in your track record, you do not know whether your system works or whether you have been lucky. This is Law 17 in its purest form.

---

*This appendix is a living reference. Print it. Laminate it. Keep it next to your trading screen. The formulas do not care about your feelings. They work whether you believe in them or not.*
