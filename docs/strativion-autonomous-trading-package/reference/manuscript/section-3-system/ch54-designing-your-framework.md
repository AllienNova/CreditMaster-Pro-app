# Chapter 54: Designing Your Trading Framework

## The Trader Who Had Everything Except a Plan

In January 2019, a Reddit user known as "1R0NYMAN" became a cautionary legend in retail trading circles. But the more instructive story belongs to a less famous name: Joe Campbell, a retail trader whose GoFundMe page went viral in November 2015 after he lost his entire $37,000 life savings in a single week.

Campbell had no system. He traded based on tips from online forums, switched between strategies daily, and moved from forex to penny stocks to options without any framework connecting his decisions. He shorted a biotech stock, KBIO (KaloBios Pharmaceuticals), because "it looked overvalued." The stock surged over 800% in two days after Martin Shkreli acquired a controlling stake. Campbell not only lost his $37,000 but owed his broker an additional $106,000 due to the margin call. He had no stop-loss, no position sizing rule, no understanding of the market he was trading.

Compare that outcome to the Turtle Traders, recruited by Richard Dennis and William Eckhardt in 1983. Dennis took 23 people with no trading experience and gave them a complete framework: trend-following philosophy, specific entry and exit rules, exact position sizing formulas, and strict risk limits. Over the next four years, the Turtles collectively earned more than $175 million. Several went on to manage billions.

The difference between Campbell and the Turtles was not talent, intelligence, or capital. It was framework. Campbell had opinions. The Turtles had a system. Campbell made random bets. The Turtles executed a physics-informed process.

> **KEY INSIGHT:** The difference between a losing trader and a profitable one is rarely talent or capital. It is framework. Opinions generate random bets. Systems generate compounding results.

You have now studied all 30 laws. You understand market inertia, feedback loops, volatility compression, fat tails, expectancy, position sizing, and survival. But knowledge without structure is like owning every component of an engine without an assembly manual. This chapter gives you that manual.

**[FACT-CHECK SIDEBAR: Opening Claims]**

- **Claim 1:** Joe Campbell lost $37,000+ shorting KBIO and owed $106,000 additional. Source: CNN Money, November 2015; GoFundMe campaign records.
- **Claim 2:** KBIO surged over 800% in two days after Shkreli acquisition. Source: Bloomberg, November 19, 2015.
- **Claim 3:** Richard Dennis recruited 23 Turtle Traders in 1983. Source: Michael Covel, "The Complete TurtleTrader" (2007).
- **Claim 4:** The Turtles collectively earned more than $175 million over approximately four years. Source: Covel, "The Complete TurtleTrader"; Jerry Parker and other Turtle interviews.
- **Claim 5:** Several Turtles went on to manage billions (e.g., Jerry Parker's Chesapeake Capital). Source: Chesapeake Capital AUM records, Barron's profiles.

---

## The Framework Hierarchy: From Philosophy to Execution

Every functioning trading system operates on four levels. Think of it like building a house. You do not start with the furniture. You start with the foundation, then the walls, then the roof, then the interior.

### Philosophy: What You Believe About Markets

Philosophy answers the deepest question: why do markets offer any opportunity at all?

Laws 1 through 10, the Physics of Price, inform this level. If you believe markets exhibit inertia (Law 1), that volatility compresses before expanding (Law 3), that prices gravitate toward liquidity (Law 4), and that returns have fat tails (Law 7), then your philosophy rejects the efficient market hypothesis in its strongest form. You believe that price behavior has exploitable structure, but you also believe that this structure is probabilistic, not deterministic.

Your philosophy determines everything downstream. A trader who believes markets are random will never build a trend-following system. A trader who ignores fat tails will never size positions correctly.

### Strategy: How You Plan to Extract Profit

Strategy translates philosophy into a general approach. Laws 11 through 20, the Scientific Method of Trading, inform this level.

If your philosophy says trends persist (Law 1) and edges are quantifiable (Law 16: Expectancy), your strategy might be: "I will follow intermediate-term trends in liquid futures markets, using multi-timeframe alignment (Law 12) and confluence (Law 18) to filter entries."

Strategy is the bridge between believing something about markets and actually doing something about it.

### Tactics: Your Specific Rules

Tactics are the concrete rules that implement your strategy. Laws 21 through 30, the Laws of Survival and Execution, dominate here.

Tactics answer questions like: How large is each position? (Law 21: Position Sizing.) Where does the trade become invalid? (Law 22: Invalidation.) How do you account for transaction costs? (Law 25: Transaction Costs.) How do you prevent emotional interference? (Law 27: Emotional Gravity.)

### Execution: Pulling the Trigger

Execution is the mechanical act of placing, managing, and exiting trades. It is the domain of discipline, not creativity. The best framework in the world fails if execution is inconsistent.

| Hierarchy Level | Governing Laws | Key Question |
|:---|:---|:---|
| Philosophy | Laws 1 through 10 (Physics of Price) | What do I believe about how markets work? |
| Strategy | Laws 11 through 20 (Scientific Method) | How will I exploit those beliefs? |
| Tactics | Laws 21 through 30 (Survival and Execution) | What are my specific rules? |
| Execution | All 30 Laws integrated | Am I following the rules consistently? |

[ILLUSTRATION: Figure 54.1 - The Framework Hierarchy Pyramid]
Type: diagram
Description: A four-level pyramid with "Philosophy" as the wide base, "Strategy" as the second tier, "Tactics" as the third tier, and "Execution" as the narrow top. Each tier shows its governing Laws (1 through 10, 11 through 20, 21 through 30, All 30) on the left side, and the key question on the right side. Arrows along the left edge point upward labeled "Build from the bottom up." A red X marks a dotted arrow that jumps from the base directly to "Tactics," labeled "Most failing traders skip here." The pyramid visually communicates that each level must be built before the next.
Key Labels: Philosophy (Foundation), Strategy (Bridge), Tactics (Rules), Execution (Discipline), "Build bottom-up," "Do NOT skip levels"
Data Source: Author's framework; adapted from Van Tharp's trading system hierarchy model

Most failing traders skip straight to tactics. They want the indicator settings, the entry signal, the magic formula. But tactics without philosophy and strategy produce random behavior dressed up as a system.

> **WARNING:** Tactics without philosophy produce random behavior dressed up as a system. You cannot build a roof before laying the foundation.

---

## Selecting Your Trading Style

Your trading style is not a matter of preference alone. It is a function of three constraints: your personality, your capital, and your available time. Getting this wrong poisons everything downstream.

### The Four Primary Styles

**Scalping** operates on timeframes of seconds to minutes. Scalpers aim for tiny gains, often 2 to 10 ticks per trade, executed dozens or hundreds of times per day. This style demands full-time screen presence, extremely low transaction costs, and rapid decision-making.

Law 10 (Time Delays) warns that faster timeframes contain more noise relative to signal. Law 25 (Transaction Costs) warns that high-frequency trading bleeds money through spreads and slippage unless your edge per trade significantly exceeds your cost per trade. Professional scalpers at firms like Jump Trading or Citadel Securities operate with sub-millisecond execution infrastructure and near-zero transaction costs. Retail traders rarely have either advantage.

**Day Trading** operates on timeframes of minutes to hours, with all positions closed before the market close. Day traders typically make 2 to 10 trades per day. This style requires several hours of screen time during market hours and sufficient capital to absorb intraday volatility.

**Swing Trading** holds positions for days to weeks, capturing moves of 2% to 20% in individual instruments. Swing traders can review markets for 30 to 60 minutes per day, often outside market hours. This style fits traders with full-time jobs.

**Position Trading** holds positions for weeks to months, capturing major trends. Position traders may review markets once per day or even once per week. The Turtle Traders were position traders. This style demands patience and the psychological tolerance for holding through pullbacks.

### The Decision Matrix

| Factor | Scalping | Day Trading | Swing Trading | Position Trading |
|:---|:---|:---|:---|:---|
| Screen time required | 6 to 8 hours/day | 3 to 6 hours/day | 30 to 60 min/day | 15 to 30 min/day |
| Minimum capital (approximate) | $50,000+ | $25,000+ | $10,000+ | $5,000+ |
| Trades per week | 50 to 500+ | 10 to 50 | 3 to 10 | 1 to 3 |
| Transaction cost impact | Critical | High | Moderate | Low |
| Noise-to-signal ratio (Law 10) | Very high | High | Moderate | Low |
| Psychological pressure | Extreme | High | Moderate | Low (but patience-testing) |
| Fits full-time job? | No | Rarely | Yes | Yes |

[ILLUSTRATION: Figure 54.2 - Trading Style Selection Flowchart]
Type: flowchart
Description: A decision tree that starts with "How many hours per day can you dedicate to active screen time?" If 6+ hours, the path leads to "Do you have $50,000+ capital and sub-penny execution costs?" If yes, Scalping. If no, Day Trading. If 2 to 5 hours screen time, the path leads to Day Trading. If under 2 hours, the path asks "Can you hold positions for days to weeks without checking constantly?" If yes, Swing Trading or Position Trading. If no, Swing Trading. Each terminal node lists the compatible Laws and typical win rate ranges. The flowchart eliminates wishful thinking by forcing honest constraint assessment.
Key Labels: Screen Time (hours/day), Capital Threshold, Emotional Tolerance, Scalping, Day Trading, Swing Trading, Position Trading
Data Source: Author's framework; screen time and capital thresholds from "Trade Your Way to Financial Freedom" by Van Tharp (2006)

The honest question is not "What style do I want?" but "What style do my constraints allow?"

> **TRADING TRUTH:** The honest question is not "What style do I want?" but "What style do my constraints allow?" Your capital, time, and temperament choose for you.

A trader with $10,000, a full-time job, and two hours of free time per evening has exactly one viable option: swing or position trading. Attempting to scalp with those constraints violates Laws 10, 25, and 27 simultaneously. The noise will overwhelm the signal, the costs will eat the edge, and the emotional pressure of trying to scalp between meetings will produce catastrophic decisions.

---

## Market Selection: The Physicist's Approach

Here is a question most trading books skip entirely: which markets should you trade?

This is not a trivial choice. The market you select determines your liquidity environment, your volatility profile, your cost structure, and the degree to which the 30 laws apply cleanly. Choosing the wrong market is like a physicist trying to study wave mechanics in a swimming pool during an earthquake. The underlying principles are real, but the environment makes them impossible to measure or exploit.

### Five Dimensions of Market Selection

**Dimension 1: Liquidity as Mass (Law 4: Liquidity Gravity)**

In physics, mass determines how an object responds to force. In markets, liquidity serves the same function. A highly liquid market absorbs large orders without significant price impact. An illiquid market lurches violently on modest volume.

The S&P 500 futures contract (ES) trades an average daily volume exceeding 1.5 million contracts, representing over $300 billion in notional value. A $1 million order barely registers. Compare this to a micro-cap stock trading $200,000 per day, where a $50,000 order might move the price 3% or more.

Liquid markets offer tighter spreads, smoother price action, and more reliable technical patterns. For systematic trading, liquidity is the first filter.

**Dimension 2: Volatility as Energy (Law 3: Volatility Compression)**

Volatility measures the energy in a market. Some markets have high baseline energy (crypto, small-cap stocks). Others have low baseline energy (money market instruments, mature government bonds). Your trading style must match the energy level of your chosen market.

Bitcoin's annualized volatility averaged roughly 60% to 80% from 2017 through 2024. The EUR/USD forex pair averaged roughly 6% to 10% over the same period. A position trader holding Bitcoin needs dramatically different position sizing than one holding euro exposure.

**Dimension 3: Fractal Quality (Law 6: Fractal Structure)**

Some markets exhibit clean fractal structure, meaning patterns at the daily level resemble patterns at the hourly and weekly levels. Other markets are dominated by external interventions (central bank actions, government price controls) that disrupt natural fractal behavior.

Major forex pairs like EUR/USD exhibit strong fractal structure because they are driven by massive, distributed order flow. Agricultural commodities can exhibit distorted fractal structure during harvest seasons or government subsidy announcements. Chinese A-shares historically showed weak fractal quality due to frequent regulatory interventions (circuit breakers, short-selling bans, government-directed buying).

Markets with clean fractal structure reward multi-timeframe analysis. Markets with disrupted fractals punish it.

**Dimension 4: Correlation Structure (Law 24: Systemic Correlation)**

If you trade multiple instruments, you must understand their correlation structure. Trading five "different" stocks that are all tech companies with a beta of 1.3 to the Nasdaq is not diversification. It is concentration disguised as variety.

In September 2008, correlations across asset classes spiked above 0.90. Stocks, commodities, high-yield bonds, and emerging market currencies all declined simultaneously. Traders who believed they were diversified across "uncorrelated" markets discovered they held a single bet: risk-on versus risk-off.

Select markets that provide genuine diversification under stress, not just during calm periods.

**Table 54.1: Correlation Spike During the September 2008 Crisis**

This table shows how asset correlations to the S&P 500 changed from the calm period (January to August 2008) to the crisis period (September to November 2008). Traders who believed they were diversified discovered that nearly everything moved together.

| Asset | Correlation to S&P 500 (Jan to Aug 2008) | Correlation to S&P 500 (Sep to Nov 2008) | Change |
|:---|:---|:---|:---|
| Crude Oil (WTI front month) | 0.42 | 0.88 | +0.46 |
| Gold (GC front month) | -0.12 | 0.31 | +0.43 |
| EUR/USD | 0.35 | 0.79 | +0.44 |
| High-Yield Corporate Bonds (HYG) | 0.58 | 0.93 | +0.35 |
| Emerging Market Equities (EEM) | 0.78 | 0.95 | +0.17 |
| US 10-Year Treasury (ZN) | -0.45 | -0.62 | -0.17 (true hedge) |

*Source: Bloomberg terminal correlation matrices, daily returns. Only US Treasuries maintained their negative correlation, making them the sole genuine diversifier during the crisis.*

**Dimension 5: Transaction Cost Profile (Law 25: Transaction Costs)**

Transaction costs vary by orders of magnitude across markets. The bid-ask spread on ES futures is typically 1 tick ($12.50 per contract). The effective spread on an options contract can exceed 5% of its value. Crypto exchange fees range from 0.04% to 0.50% depending on the platform and volume tier.

A scalping strategy that works in ES futures with 1-tick spreads becomes mathematically impossible in options markets with wide spreads.

### Market Comparison Table

| Market | Liquidity (1 to 5) | Volatility | Fractal Quality | Correlation to Equities | Typical Spread Cost |
|:---|:---|:---|:---|:---|:---|
| US Large-Cap Equities (SPY, QQQ) | 5 | Moderate (15% to 25% annual) | High | Benchmark | 0.01% to 0.03% |
| US Equity Futures (ES, NQ) | 5 | Moderate | High | Very high | 0.005% to 0.01% |
| Major Forex (EUR/USD, USD/JPY) | 5 | Low (6% to 12% annual) | High | Low to moderate | 0.005% to 0.02% |
| Gold Futures (GC) | 4 | Moderate (12% to 20% annual) | High | Low (crisis hedge) | 0.01% to 0.03% |
| Crude Oil Futures (CL) | 4 | High (25% to 50% annual) | Moderate | Moderate | 0.02% to 0.05% |
| Crypto (BTC, ETH) | 3 | Very High (60% to 100% annual) | Moderate | Increasing | 0.04% to 0.50% |
| Small-Cap Equities | 2 | High | Low to moderate | High | 0.10% to 1.00%+ |
| Options (equity) | 3 | N/A (derived) | Low | Varies | 1.00% to 10.00%+ |

The physicist's recommendation for a new systematic trader: start with high-liquidity, high-fractal-quality markets. US equity index futures, major forex pairs, or large-cap US equities. These markets allow the 30 laws to operate most cleanly. As your framework matures, expand to lower-liquidity, higher-volatility markets where the potential returns are greater but the execution challenges multiply.

### Quantitative Thresholds: The Minimum Requirements

Qualitative descriptions of liquidity and volatility are useful for understanding. They are useless for decision-making. You need hard numbers. Here are the minimum thresholds that separate tradeable instruments from instruments that will quietly destroy your edge.

**Minimum Daily Volume Thresholds**

These thresholds ensure you can enter and exit positions without moving the market against yourself (Law 4: Liquidity Gravity).

| Market | Minimum Threshold | Why This Number |
|:---|:---|:---|
| US Equities | $5M+ average daily dollar volume | Below this, a $25,000 position represents 0.5% of daily volume. Your order becomes visible. Slippage eats your edge. |
| Forex Pairs | $500M+ daily turnover for the pair | Below this, spread widening during moderate volatility can exceed 5 pips, turning profitable swing trades into losers. |
| Futures Contracts | 50,000+ contracts per day | Below this, bid-ask spreads widen to 2 or more ticks, and limit order fill rates drop below 60%. |

A trader who ignores these thresholds will experience a slow, invisible bleed. Each trade costs slightly more than expected. Over 200 trades per year, those extra fractions compound into a 5% to 15% annual drag on returns. Law 25 (Transaction Costs) operates like friction in physics. You cannot see it in any single trade, but it grinds your equity curve flat over time.

**Minimum Volatility Thresholds: The ATR Profitability Test**

Liquidity tells you whether you can trade an instrument. Volatility tells you whether you should. A stock can be perfectly liquid and still be untradeable for your strategy if it does not move enough to generate meaningful returns after costs.

Here is the test. Calculate the instrument's Average True Range (ATR) over your holding period. Then ask: does this expected move cover my transaction costs and produce a worthwhile R-multiple?

Consider a concrete example. A swing trader with a 5-day average holding period identifies a stock with a daily ATR of 0.3% of its price. The expected move over 5 days is roughly 1.5% (assuming ATR scales approximately with the square root of time, the precise figure is closer to 0.3% times the square root of 5, which equals 0.67%. But consecutive directional days in a trend can produce the full 1.5%).

Now run the math. If the trader places a 1R stop at 1.0% below entry and targets 1.5R, the profit target sits at 1.5% above entry. After round-trip transaction costs of 0.10% to 0.20% (spread plus commission plus slippage), the net target shrinks to 1.3% to 1.4%. That produces a reward of barely 1.3R to 1.4R before the stop. With a typical trend-following win rate of 40% to 45%, this edge is razor-thin. One bad fill wipes it out.

The practical minimum: your instrument's 5-day expected directional move should be at least 3% for swing trading, or at least 1.5% for day trading. This ensures enough room for a 1R stop, a 2R or better target, and transaction costs that consume less than 15% of the gross profit.

Law 16 (Expectancy) demands that your average win times your win rate exceeds your average loss times your loss rate. If the instrument does not move enough, the math never works, regardless of how perfect your entries are.

---

## Building Your Edge Statement

Every profitable system begins with a clear statement of edge. If you cannot articulate why your system makes money in two sentences, you do not have a system. You have a collection of indicators.

> **REMEMBER:** If you cannot explain your edge in two sentences, you do not have a system. You have a collection of indicators.

### What Is an Edge?

An edge is a statistical advantage that, applied consistently over many trades, produces positive expected value. Law 16 (Expectancy) provides the formula:

**Expectancy = (Win Rate x Average Win) minus (Loss Rate x Average Loss)**

A system with a 40% win rate and an average win of $300 against an average loss of $100 has an expectancy of ($300 x 0.40) minus ($100 x 0.60) = $120 minus $60 = $60 per trade. That is a real edge.

But expectancy alone is not enough. Law 19 (Edge Decay) warns that every edge degrades over time as other participants discover and exploit it. Your edge statement must therefore include not just what the edge is, but why it persists.

### The Edge Statement Template

Use this format:

**"I profit when [market condition] because [reason], which is supported by Laws [X, Y, Z]. This edge persists because [structural reason it does not get arbitraged away]."**

Here are three examples:

**Trend Follower:** "I profit when markets transition from low-volatility compression to directional expansion, because I enter after confirmation and ride the trend with a trailing stop. This is supported by Law 3 (Volatility Compression), Law 1 (Market Inertia), and Law 12 (Multi-Timeframe Alignment). This edge persists because most participants are psychologically unable to hold through drawdowns and the transition period."

**Mean Reversion Trader:** "I profit when prices deviate more than 2.5 standard deviations from their 20-day mean, because extreme deviations create reversion pressure. This is supported by Law 5 (Mean Reversion) and Law 18 (Confirmation). This edge persists because forced sellers (margin calls, fund redemptions) create non-economic price dislocations."

**Breakout Trader:** "I profit when price breaks through structural levels with increasing volume, because liquidity pools beyond those levels create accelerated movement. This is supported by Law 4 (Liquidity Gravity), Law 11 (Structural Levels), and Law 13 (Momentum). This edge persists because institutional order placement at structural levels is a permanent feature of market microstructure."

[ILLUSTRATION: Figure 54.3 - Anatomy of an Edge Statement]
Type: diagram
Description: A horizontal template diagram that breaks down an edge statement into four color-coded segments. The full statement reads across the top as a single sentence. Below it, four bracketed sections are highlighted in different colors: (1) Market Condition in blue, (2) Mechanism/Reason in green, (3) Supporting Laws in orange, and (4) Persistence Reason in red. Each segment has an arrow pointing down to a brief explanation box. The blue box says "When does your system make money?" The green box says "Why does this condition produce profit?" The orange box says "Which of the 30 laws validate this?" The red box says "Why hasn't this edge been arbitraged away?" A sample completed edge statement for a trend follower is shown below as a worked example.
Key Labels: Market Condition, Mechanism, Supporting Laws, Persistence Reason, "If you cannot fill all four boxes, you do not have an edge."
Data Source: Author's framework

Write your own edge statement before proceeding. If you cannot, you are not ready to trade live.

### What a Bad Edge Statement Looks Like (and Why It Fails)

Good edge statements are specific, testable, and grounded in the 30 laws. Bad edge statements sound reasonable but collapse under scrutiny. Here are three common failures.

**Bad Statement #1:** "I buy stocks that are going up."

This statement contains no timeframe. Going up over what period? Five minutes? Five months? Without a defined timeframe, this trader will buy a stock that rallied 8% in a week, not realizing it has fallen 30% over three months. The daily chart says "up." The weekly chart says "down." Law 12 (Multi-Timeframe Alignment) requires explicit timeframe hierarchy. This statement also lacks entry criteria (when exactly do you buy?), invalidation conditions (when are you wrong?), and any reference to the mechanism that produces profit. It is an observation disguised as a strategy.

**Fix:** "I buy stocks making new 20-day highs when the 50-day moving average is above the 200-day moving average, entering on a pullback to the 10-day EMA, with invalidation below the prior swing low."

**Bad Statement #2:** "I trade breakouts on any stock."

This trader will apply the same breakout strategy to Apple (average daily dollar volume of $12 billion) and to a micro-cap stock trading $150,000 per day. Law 4 (Liquidity Gravity) guarantees that breakouts in illiquid stocks behave differently. They gap through levels instead of trending through them. They reverse violently on low volume. This statement also ignores Law 8 (Market Regimes). Breakout strategies perform well in trending regimes and get slaughtered in range-bound regimes. Trading breakouts in "any stock" without a regime filter produces a win rate near 25% during choppy markets, destroying months of accumulated profits in weeks.

**Fix:** "I trade breakouts in US equities with daily dollar volume above $10 million, only when the VIX is below 25 and the 50-day breadth of the S&P 500 exceeds 55%, confirming a trending regime."

**Bad Statement #3:** "My edge is reading price action."

This is the most dangerous type of bad edge statement because it sounds sophisticated. But it is untestable and unfalsifiable. What specific price action pattern? Over what lookback period? With what measurable success rate? If "reading price action" cannot be reduced to a set of rules that a computer could evaluate, it is not an edge. It is a feeling. Law 17 (Statistical Significance) requires that any claimed edge produce results distinguishable from chance over a meaningful sample size (minimum 30 trades, preferably 100 or more). A trader who cannot define "reading price action" in testable terms cannot verify whether the edge is real or an illusion created by selective memory.

**Fix:** "I identify bullish engulfing candles at prior support levels on the daily chart, confirmed by a volume spike of at least 1.5 times the 20-day average volume, and enter long with a stop below the engulfing candle's low."

Notice the pattern. Every bad edge statement violates multiple laws simultaneously. Every good edge statement specifies the market condition, the entry trigger, the invalidation, and the laws that support it. If your edge statement reads like any of the bad examples above, rewrite it before you risk a single dollar.

---

## The System Skeleton: Assembling Your Rules

A complete trading system requires exactly five rule sets. No more, no less. Each maps directly to specific laws.

### Rule Set 1: Entry Rules

Entry rules define the conditions under which you open a position. These rules should require confluence (Law 18) across multiple independent signals.

Example entry rule set for a swing trend-following system:

1. The daily chart shows a higher high and higher low structure (Law 1: Market Inertia).
2. The weekly chart trend direction agrees (Law 12: Multi-Timeframe Alignment).
3. A volatility compression pattern resolves in the trend direction (Law 3: Volatility Compression).
4. Volume confirms the breakout (Law 13: Momentum).

All four conditions must be present. This is not indicator soup. Each condition measures a different dimension: structure, timeframe, energy, and participation.

### Rule Set 2: Exit Rules (Stop-Loss)

Every trade needs a predefined invalidation point (Law 22: Invalidation). The stop must be structural, placed where the trade thesis is objectively wrong.

Example: If you entered a long position based on a higher low holding, the invalidation point is a close below that higher low. The distance from entry to stop defines your initial risk (R).

### Rule Set 3: Exit Rules (Profit-Taking)

Profit targets or trailing stops determine when you close a winning trade. The method must match your style.

Swing traders often use a fixed reward-to-risk ratio (e.g., 3R target) or a structural target (the next resistance level from Law 11). Trend followers typically use trailing stops that allow winners to run indefinitely, only exiting when structure breaks (a lower low in an uptrend).

### Rule Set 4: Position Sizing

Law 21 (Position Sizing) governs survival. The simplest robust approach: risk no more than 1% of total account equity per trade.

**Position Size = (Account Equity x Risk Percentage) / (Entry Price minus Stop Price)**

For a $50,000 account risking 1% per trade, with a stock entry at $100 and a stop at $95:

Position Size = ($50,000 x 0.01) / ($100 minus $95) = $500 / $5 = 100 shares.

This formula automatically adapts your size to each trade's volatility. Wide stops produce smaller positions. Tight stops allow larger positions. The risk per trade stays constant.

### Rule Set 5: Risk Management

Risk management operates above individual trades. It governs portfolio-level exposure.

Key rules to define:

- **Maximum simultaneous positions:** Limit total open positions (e.g., 6 positions maximum) to prevent over-concentration.
- **Maximum correlated exposure:** No more than 3 positions in the same sector or with correlation above 0.70 (Law 24: Systemic Correlation).
- **Maximum daily/weekly drawdown:** If the account drops 3% in a single day or 6% in a single week, stop trading and reassess (Law 23: Asymmetric Damage, Law 29: Probability of Ruin).
- **Circuit breaker:** After 5 consecutive losses, reduce position size to 0.5% per trade until 2 consecutive winners restore confidence and confirm the system is not in a hostile regime (Law 28: Adaptation).

### Worked Example: A Complete System Skeleton

**System Name:** Fractal Trend Follower

**Philosophy:** Markets trend more often than commonly believed. Trends persist due to structural feedback loops. I can capture a portion of these trends by entering after confirmation and letting winners run.

**Edge Statement:** "I profit when multi-timeframe trend alignment coincides with volatility expansion, because these conditions produce persistent directional moves. Supported by Laws 1, 3, 6, and 12."

**Market:** US equity index futures (ES, NQ) and major forex pairs (EUR/USD, GBP/USD).

**Timeframe:** Swing trading. Daily charts for signals, weekly charts for direction. Holding period of 3 to 20 trading days.

**Entry Rules:** (1) Weekly trend direction is up (higher highs, higher lows). (2) Daily chart shows a Bollinger Band squeeze (20-day bandwidth below its 6-month average). (3) Price closes above the upper Bollinger Band on expanding volume. (4) ADX is above 20 and rising.

**Stop-Loss:** Below the most recent swing low, minimum 1.5 ATR(14) from entry.

**Profit-Taking:** Trailing stop at 2.5 ATR(14) below price, adjusted daily. No fixed target.

**Position Sizing:** 1% account risk per trade.

**Risk Management:** Maximum 5 open positions. Maximum 3 correlated. Weekly drawdown limit of 5%. Circuit breaker after 4 consecutive losses.

This skeleton fits on a single page. It references 8 of the 30 laws. It leaves no decision to the moment. Every action is predefined.

### What Happens When a Rule Set Is Missing: The Profit-Taking Gap

The five rule sets are not optional components. Remove any single one and the entire system degrades. Here is what happens when a trader builds entry rules, stop-loss rules, and position sizing rules, but neglects profit-taking rules.

In 2021, a well-documented case appeared on the trading education platform TraderLion. A swing trader had backtested a momentum system on US growth stocks over three years. The entry rules were solid: buy stocks breaking out of volatility compression (Law 3) with relative strength rank above the 90th percentile and volume confirmation. The stop was structural: below the breakout pivot low, risking 1R per trade. Position sizing followed the 1% rule (Law 21). Risk management capped exposure at 6 positions.

The problem was invisible in backtesting because the backtest used a fixed 3R target. In live trading, the trader abandoned the fixed target. Without a written profit-taking rule, two psychological patterns took over.

Pattern one: cutting winners early. A trade moved 1.5R in the trader's favor, then pulled back to 0.8R. Fearing the entire gain would evaporate, the trader closed the position. The stock then rallied to 5R over the next two weeks. This happened on 7 of the trader's first 15 winning trades. The average win shrank from 3.0R (in the backtest) to 1.4R (in live trading). Law 13 (Momentum) states that trends persist longer than most participants expect. Without a trailing stop rule to enforce this principle mechanically, the trader's psychology overrode the physics.

Pattern two: holding winners until they become losers. On the remaining 8 winning trades, the trader held too long, refusing to sell because "it might go higher." Three of those trades reversed entirely and hit the original stop-loss, converting 2R to 4R unrealized gains into 1R losses. This is the disposition effect in action, a behavioral bias where traders sell winners too quickly and hold losers too long. Chapter 74 explores this pattern in depth.

The combined result was devastating. The backtested expectancy was ($300 x 0.45) minus ($100 x 0.55) = $135 minus $55 = $80 per trade. The live expectancy, with profit-taking rules missing, fell to ($140 x 0.35) minus ($100 x 0.65) = $49 minus $65 = negative $16 per trade. A profitable system became a losing system, not because the entries were wrong, but because one of the five rule sets was absent.

Law 22 (Invalidation) applies to exits as well as entries. Just as you need a predefined point where the trade thesis is wrong (the stop-loss), you need a predefined point where the trade thesis is complete (the profit target or trailing stop trigger). Without both, you hand control to the two most destructive emotions in trading: fear and greed.

The lesson is simple. All five rule sets are structural. Remove one and the system collapses, just as removing one wall from a building does not reduce its strength by 20%. It brings the roof down.

> **THE PHYSICS:** Removing one rule set from a trading system does not reduce performance by 20%. It brings the entire structure down, just as removing one wall collapses the roof.

[ILLUSTRATION: Figure 54.4 - The Five Rule Sets of a Complete Trading System]
Type: flowchart
Description: A circular flowchart showing the five rule sets as interconnected nodes arranged in a clockwise loop. Node 1 (Entry Rules) connects to Node 2 (Stop-Loss Exit) and Node 3 (Profit-Taking Exit). Node 4 (Position Sizing) sits between Entry and both Exits, with bidirectional arrows showing it depends on stop distance. Node 5 (Risk Management) encircles the entire system as an outer ring, acting as a governor. Each node displays its governing Laws in small text. The center of the circle reads "Fractal Trend Follower" as the example system. Arrows between nodes are labeled with the specific data that flows between them (e.g., "stop distance" flows from Stop-Loss to Position Sizing; "number of open positions" flows from Entry to Risk Management).
Key Labels: Entry Rules (Laws 1, 3, 12, 18), Stop-Loss (Law 22), Profit-Taking (Law 13), Position Sizing (Law 21), Risk Management (Laws 23, 24, 29), data flow arrows
Data Source: Author's framework; example system from this chapter

**Table 54.2: Fractal Trend Follower System Applied to Real S&P 500 Futures Trades (2023)**

This table shows five actual trade setups that would have been generated by the Fractal Trend Follower system skeleton described above, using ES (S&P 500 E-mini futures) daily and weekly charts from 2023.

| Trade | Entry Date | Entry Price (ES) | Stop Price | Risk (Points) | Exit Date | Exit Price | Result | R-Multiple |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | Jan 20, 2023 | 3,972 | 3,885 | 87 | Feb 2, 2023 | 4,180 | +208 pts | +2.4R |
| 2 | Mar 30, 2023 | 4,077 | 4,002 | 75 | Apr 18, 2023 | 4,175 | +98 pts | +1.3R |
| 3 | Jun 2, 2023 | 4,282 | 4,195 | 87 | Jun 26, 2023 | 4,388 | +106 pts | +1.2R |
| 4 | Aug 29, 2023 | 4,515 | 4,430 | 85 | Sep 14, 2023 | 4,475 | -40 pts (trailed) | -0.5R |
| 5 | Nov 3, 2023 | 4,365 | 4,280 | 85 | Dec 15, 2023 | 4,720 | +355 pts | +4.2R |

*Source: CME Group ES continuous contract daily data, 2023. Entries based on Bollinger Band squeeze resolution with weekly uptrend confirmation. Stops placed at most recent swing low or 1.5x ATR(14), whichever was wider. Trailing stop at 2.5x ATR(14). Net result across 5 trades: +8.6R. With 1% risk per trade on a $50,000 account, this represents approximately $4,300 in profit before commissions.*

---

## Your Framework Checklist

Before executing your first trade, verify every item on this checklist. Each item maps to a specific law. If any box is unchecked, your framework is incomplete.

### Philosophy

- [ ] I have a written statement of what I believe about how markets work (Laws 1 through 10).
- [ ] I have identified which market regime my system targets: trending, mean-reverting, or both (Law 8: Market Regimes).
- [ ] I accept that my returns will follow a fat-tailed distribution, not a normal one (Law 7: Fat Tails).

### Strategy

- [ ] I have a written edge statement with specific law references (Law 16: Expectancy).
- [ ] I understand why my edge persists and what would cause it to decay (Law 19: Edge Decay).
- [ ] My system uses genuinely independent confirmation signals, not redundant indicators (Law 18: Confirmation).
- [ ] I have selected a trading style that matches my capital, time, and personality constraints (Law 10: Time Delays).

### Market Selection

- [ ] I have evaluated my chosen markets on all five dimensions: liquidity, volatility, fractal quality, correlation, and cost (Laws 3, 4, 6, 24, 25).
- [ ] My chosen market has sufficient liquidity to absorb my position sizes without significant slippage (Law 4: Liquidity Gravity).
- [ ] I understand the correlation structure between my chosen markets (Law 24: Systemic Correlation).

### Tactics

- [ ] I have written, specific entry rules requiring confluence of independent signals (Law 18: Confirmation).
- [ ] Every trade has a predefined, structural stop-loss (Law 22: Invalidation).
- [ ] I have a defined exit strategy for winners: fixed target, trailing stop, or structural target (Law 13: Momentum).
- [ ] My position sizing formula limits risk to 1% or less per trade (Law 21: Position Sizing).
- [ ] I have portfolio-level risk limits: maximum positions, maximum correlated exposure, drawdown circuit breakers (Laws 23, 24, 29).

### Execution

- [ ] I have calculated the transaction costs of my system and confirmed they do not consume my edge (Law 25: Transaction Costs).
- [ ] I have a pre-trade checklist to prevent emotional overrides (Law 27: Emotional Gravity).
- [ ] I have a plan for system review and adaptation on a defined schedule (Law 28: Adaptation).
- [ ] I understand that survival is the prerequisite for everything else (Law 30: Survival).

Print this checklist. Pin it above your screen. Every unchecked box is a gap where the market will find you.

---

## Realistic Expectations by Account Size and Style

A framework only works if the trader's goals match the mathematics. The single fastest way to destroy an account is to import Twitter expectations (5% per month, 50% per year) into a $10,000 account using a legitimate edge. The math does not care about your goals. It cares about sample size, volatility, and cost drag.

Before finalizing your framework, calibrate your expectations against the realities of your account size and style. The table below reflects what sustainable, professionally-managed systematic trading actually produces over a multi-year horizon after realistic costs and drawdowns.

| Account size | Style | Target monthly | Realistic annual (net of costs) | Typical max drawdown | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| $5,000 - $10,000 | Day trading (US equities; PDT rule restricts to 3 day trades per 5 days) | 0.5% - 2% | 8% - 20% | 15% - 25% | Micro contracts viable in futures; stock scalping difficult under PDT. Reinvest fixed-fractional for compounding. |
| $10,000 - $25,000 | Swing (2-10 day holds) | 0.75% - 2.5% | 10% - 25% | 12% - 20% | PDT still binding under $25K for day trades. Swing bypasses it. Most sustainable starting path. |
| $25,000 - $100,000 | Swing or position | 1% - 3% | 12% - 30% | 10% - 20% | PDT lifted. Full strategy menu available. Position sizing can approach 1% meaningfully. |
| $100,000 - $500,000 | Swing / position / multi-strategy | 1% - 3% | 12% - 30% | 8% - 18% | Multi-strategy diversification begins to matter. Correlation monitoring becomes important. |
| $500,000 - $1,000,000 | Multi-strategy / multi-asset | 0.75% - 2% | 10% - 25% | 6% - 15% | Institutional-adjacent. Slippage becomes a primary cost. Consider execution algorithms. |
| $1,000,000+ | Multi-strategy / TWAP-VWAP execution | 0.5% - 1.5% | 7% - 18% | 5% - 12% | Market impact starts eating edge. Scaling new strategies becomes harder. |

**Table 54.5: Realistic Monthly and Annual Return Targets by Account Size and Style**

### Benchmarks for Comparison

| Benchmark | Annual return | Use case |
| :--- | :--- | :--- |
| US Treasury Bills (risk-free rate) | ~5% (rates dependent) | Floor. If your strategy does not beat this over 3 years net of costs, stop. |
| S&P 500 total return (passive) | ~10% long-run average | The benchmark most private traders compete against. |
| Passive balanced (60/40) | ~7% long-run average | Retail benchmark for diversified investors. |
| Elite long-short equity hedge funds | ~8% - 12% net to investors | Gross returns higher; fees erode ~2-5 percentage points. |
| Top systematic CTAs (e.g., Renaissance Medallion in peak years) | 30%+ (historical, highly unusual) | Not a reasonable target. Do not model your system on outliers. |

**Table 54.6: Investment Benchmarks for Context**

### The Cost Drag Table

Every assumed return number must be adjusted downward for costs. These are typical annual cost drags for retail trading at different activity levels. The more you trade, the more costs matter.

| Activity level | Typical annual cost drag (equities) | Typical annual cost drag (futures) | Typical annual cost drag (options) |
| :--- | :--- | :--- | :--- |
| 10 trades per year (pure position) | 0.1% - 0.3% | 0.2% - 0.5% | 0.5% - 1.5% |
| 100 trades per year (swing) | 1% - 2% | 2% - 3% | 4% - 8% |
| 500 trades per year (active swing/day) | 3% - 6% | 5% - 10% | 15% - 25% |
| 2,000+ trades per year (day trading) | 8% - 15% | 10% - 20% | 30%+ |

**Table 54.7: Annual Cost Drag by Activity Level**

A 500-trade-per-year options swing system that produces a 20% gross annual return is actually producing about 10% to 15% net of slippage, spread, and commission. The headline is misleading without the cost-adjusted number.

### The Two Most Common Expectation Errors

1. **The 5%-per-month fantasy.** Compounding 5% monthly produces roughly 80% annually. No strategy in the history of systematic trading has delivered 80% net compounded annually over a decade-plus horizon on a trading book of meaningful size. The number that is actually achievable for a disciplined retail trader with a real edge is closer to 1% to 3% per month, averaged, with drawdowns of 10% to 20%. Traders who assume 5% monthly leverage up, blow up, and rebuild. Do not be one of them.

2. **The "small account, big return" trap.** Small accounts feel the psychological pressure to "make it" faster, which drives oversize positions, which triggers the survivorship math from Law 29. A small account has LESS ability to absorb drawdowns in dollar terms but NOT proportionally LESS ability to absorb them in percentage terms. A 20% drawdown on a $5,000 account hurts the same as a 20% drawdown on a $500,000 account. The math is identical. The temptation to oversize is not.

The serious trader calibrates expectations to the realistic table above. Everything else is marketing copy written by people who did not trade through 2008, 2020, or 2022.

---

## What Comes Next

You now have the blueprint: a framework hierarchy, a trading style, a selected market, an edge statement, a system skeleton, a checklist, and realistic expectations calibrated to your account size and style. But a blueprint is not a building.

Chapter 55 will equip you with the specific tools to bring this framework to life: the software, data sources, backtesting platforms, and execution infrastructure that transform your rules from ink on paper into orders in the market.

The framework tells you what to do. The tools determine whether you can do it well.
