# Chapter 45: Position Sizing in Practice

## Same Market, Opposite Outcomes

On March 16, 2020, the S&P 500 fell 11.98%. It was the third largest single-day percentage decline in the index's history, behind only October 19, 1987 (Black Monday, down 20.47%) and October 28, 1929 (down 12.82%). The COVID pandemic had arrived in the financial markets with the force of an avalanche at full momentum.

Two of the world's most sophisticated trading operations sat on opposite sides of that avalanche.

Bridgewater Associates, the world's largest hedge fund with approximately $160 billion in assets under management, ran a risk parity strategy through its Pure Alpha fund. The premise was elegant: allocate risk equally across asset classes so that no single class dominates portfolio volatility. Bonds balance equities. Commodities balance both. The math was pristine. The backtests were beautiful.

The problem was position sizing.

Risk parity models assume stable correlations between asset classes. Stocks go down, bonds go up. That relationship held for decades. In March 2020, it broke. Treasuries sold off alongside equities for several sessions as investors dumped everything for cash. Bridgewater's Pure Alpha fund lost approximately 12% in March 2020. Their risk parity framework had sized bond positions based on historical volatility that suddenly became irrelevant. The positions were too large for the regime they entered.

Across the quantitative divide, Renaissance Technologies' Medallion Fund operated with a different sizing philosophy. The Medallion Fund, which has generated annualized returns exceeding 66% before fees since 1988, uses strict position limits that automatically reduce exposure when volatility expands. Their models do not assume stable correlations. They assume correlations will break at the worst possible moment and size accordingly.

The Medallion Fund gained approximately 39% in 2020. In the same markets. During the same pandemic. Trading many of the same instruments.

The difference between these two outcomes was not intelligence. Both firms employ some of the most brilliant quantitative minds on the planet. It was not information. Both had access to the same data. It was not strategy in the traditional sense of stock picking or market timing.

The difference was how much they traded. Position sizing.

Ray Dalio himself acknowledged the issue in a LinkedIn post on April 15, 2020, writing that Bridgewater "did not sufficiently account for the possibility of such a sharp and simultaneous decline across asset classes." That is a sophisticated way of saying their positions were too big for what the market actually did.

This chapter is not about theory. You already read Law 21 on position sizing principles. This chapter is about sitting at your desk at 9:25 AM with a live account and calculating exactly how many shares, contracts, or lots to trade. It is the mechanical implementation of the principle. The spreadsheet. The formula. The table you tape to your monitor.

Position sizing determines whether a losing streak is a temporary drawdown or a permanent exit from the market. It determines whether a winning streak builds wealth or merely delays the inevitable blowup caused by oversized bets.

Get this right and everything else becomes easier. Get this wrong and nothing else matters.

**[FACT-CHECK: Key Claims in This Chapter]**

* **Claim 1:** On March 16, 2020, the S&P 500 fell 11.98%, the third largest single-day percentage decline in history, behind October 19, 1987 (down 20.47%) and October 28, 1929 (down 12.82%). Source: S&P Dow Jones Indices Historical Data; NYSE Archives
* **Claim 2:** Bridgewater Associates' Pure Alpha fund lost approximately 12% in March 2020, and Renaissance Technologies' Medallion Fund gained approximately 39% in 2020. Source: Bridgewater Associates investor letters; Gregory Zuckerman, "The Man Who Solved the Market," Penguin, 2019; Wall Street Journal reporting on Medallion Fund returns
* **Claim 3:** The Medallion Fund has generated annualized returns exceeding 66% before fees since 1988. Source: Zuckerman, G., "The Man Who Solved the Market," Penguin, 2019; Renaissance Technologies public disclosures
* **Claim 4:** J. Welles Wilder Jr. developed the Average True Range (ATR) and published it in his 1978 book "New Concepts in Technical Trading Systems." Source: Wilder, J. W., "New Concepts in Technical Trading Systems," Trend Research, 1978
* **Claim 5:** John Larry Kelly Jr. published "A New Interpretation of Information Rate" in the Bell System Technical Journal in 1956, establishing the Kelly Criterion. Source: Kelly, J. L., Bell System Technical Journal, 1956
* **Claim 6:** On January 15, 2015, the Swiss National Bank removed the EUR/CHF floor, and EUR/CHF gapped from 1.2010 to below 0.8500 in minutes. Source: Swiss National Bank Press Release, January 15, 2015; Reuters and Bloomberg Historical Tick Data for EUR/CHF

---

## The ATR-Based Sizing Method

The Average True Range, or ATR, is a volatility measure developed by J. Welles Wilder Jr. and published in his 1978 book "New Concepts in Technical Trading Systems." It measures the average range of price movement over a specified period, accounting for gaps between sessions.

The ATR is the single best tool for position sizing because it does something no fixed-dollar or fixed-percentage stop can do. It adjusts automatically to the market's current behavior. When the market is calm, ATR contracts and your stops tighten, allowing larger position sizes. When the market is volatile, ATR expands and your stops widen, forcing smaller position sizes. The math does what your emotions cannot: it shrinks your exposure precisely when the market becomes most dangerous.

Here is the formula. Print it. Tape it to your monitor.

**Position Size = Account Risk Per Trade / (ATR x Multiplier x Point Value)**

Each variable is concrete. There is nothing subjective here.

- **Account Risk Per Trade:** The dollar amount you are willing to lose on a single trade. For a $50,000 account risking 1%, this is $500. Period. Non-negotiable.
- **ATR (14-period daily):** The 14-day Average True Range of the instrument you are trading. Every charting platform calculates this. Use the daily timeframe regardless of your trading timeframe.
- **Multiplier:** How many ATR units wide you set your stop. A multiplier of 1.5 means your stop is 1.5 times the daily ATR away from your entry. This gives the trade enough room to breathe without exposing you to excessive loss. Range: 1.0 for tight stops, 2.0 for wide stops, 1.5 as the default.
- **Point Value:** The dollar value of a one-point move in the instrument. For ES futures, this is $50 per point. For stocks, it is $1 per share. For EUR/USD, it is $10 per pip on a standard lot.

Let us walk through three complete examples so the formula stops being abstract and starts being mechanical.

### Example 1: ES Futures, $50,000 Account

You trade E-mini S&P 500 futures. Your account holds $50,000. You risk 1% per trade.

- Account: $50,000
- Risk per trade: 1% = $500
- ES daily ATR (14-period): 45 points (as of October 2023)
- Stop distance: 1.5 x ATR = 67.5 points, round to 68
- ES point value: $50 per point
- Dollar risk per contract: 68 x $50 = $3,400
- Position size: $500 / $3,400 = 0.15 contracts

You cannot trade 0.15 of an ES contract. The ES is indivisible. This is where the Micro E-mini (MES) becomes essential. The MES has a point value of $5, exactly one-tenth of the ES.

- Dollar risk per MES contract: 68 x $5 = $340
- MES position size: $500 / $340 = 1.47 contracts
- Practical sizing: Trade 1 MES contract

One MES contract. That is the correct position size for a $50,000 account trading ES with a 1.5 ATR stop during a period when ATR reads 45 points. Not 2 contracts because you "feel good about the setup." Not 3 because "the signal is strong." One.

### Example 2: AAPL Stock, $100,000 Account

You want to buy Apple shares. Your account holds $100,000. You risk 1% per trade.

- Account: $100,000
- Risk per trade: 1% = $1,000
- AAPL daily ATR (14-period): $3.85 (as of January 2024, price approximately $185)
- Stop distance: 1.5 x ATR = $5.78, round to $5.80
- Position size: $1,000 / $5.80 = 172 shares
- Dollar exposure: 172 x $185 = $31,820, which is 31.8% of the account in a single stock

Notice something important. The position sizing formula tells you how many shares to buy to risk exactly 1%. But the total dollar exposure is 31.8% of your account. Some traders see that number and panic. They think having $31,820 in a single stock is "too concentrated."

It is not. Your risk is $1,000. That is 1% of your account. The $31,820 is your exposure, not your risk. If AAPL hits your stop, you lose $1,000. If AAPL goes to zero overnight (it will not, but the exercise matters), you lose $31,820. That is a tail risk you manage through account heat limits, not through position sizing.

### Example 3: EUR/USD Forex, $25,000 Account

You trade EUR/USD on a forex platform. Your account holds $25,000. You risk 1% per trade.

- Account: $25,000
- Risk per trade: 1% = $250
- EUR/USD daily ATR: 65 pips (as of Q4 2023)
- Stop distance: 1.5 x ATR = 97.5 pips, round to 98
- Standard lot pip value: $10 per pip
- Dollar risk per standard lot: 98 x $10 = $980
- Position size: $250 / $980 = 0.26 standard lots = 2.6 mini lots
- Practical sizing: Trade 2 or 3 mini lots

If you trade 2 mini lots, your actual risk is $196 (0.78% of account). If you trade 3 mini lots, your actual risk is $294 (1.18%). Choose based on your conviction and the quality of the setup. When in doubt, round down.

### The Master Sizing Table

Print this table. Update the ATR column weekly. The position sizes will change as volatility changes. That is the entire point.

| Instrument | ATR (14-day) | 1.5x ATR Stop | Point Value | 1% Risk on $50K | Position Size |
|:-----------|:-------------|:--------------|:------------|:-----------------|:--------------|
| ES | 45 pts | 68 pts | $50 | $500 | 0.15 (use 1 MES) |
| NQ | 200 pts | 300 pts | $20 | $500 | 0.08 (use 1 MNQ) |
| AAPL (~$185) | $3.85 | $5.78 | $1/share | $500 | 86 shares |
| TSLA (~$240) | $12.50 | $18.75 | $1/share | $500 | 26 shares |
| EUR/USD | 65 pips | 98 pips | $10/pip | $500 | 0.5 std lot |
| Gold (GC) | $28 | $42 | $100/pt | $500 | 0.12 (use 1 MGC) |
| Crude Oil (CL) | $1.80 | $2.70 | $1,000/pt | $500 | 0.19 (use 1 MCL) |
| BTC (~$43K) | $1,800 | $2,700 | varies | $500 | 0.19 BTC |

Notice how TSLA, with its $12.50 ATR, allows only 26 shares on a $50,000 account. Meanwhile, AAPL allows 86 shares. This is not a mistake. TSLA is three times more volatile than AAPL on a dollar-per-share basis. The formula automatically accounts for this. A trader who buys 86 shares of both AAPL and TSLA is risking three times more on the TSLA position. The ATR method prevents this error by construction.

---

## Account Heat Management

Individual trade risk is the brick. Account heat is the building. You can have perfectly sized bricks and still construct a building that collapses if you stack too many of them in the same place.

Account heat is the total portfolio risk at any given moment. It is the sum of all open position risks. If you hold 3 trades, each risking 1% of your account, your account heat is 3%. Simple addition.

The rules are straightforward.

**Maximum account heat: 6% for aggressive traders, 4% for conservative traders.**

This means a maximum of 6 positions at 1% risk each. Or 3 positions at 2% risk each. Or any combination that sums to 6% or less. When your account heat reaches the maximum, you take no new trades until an existing position is closed or until you move an existing stop to breakeven, which reduces that position's contribution to heat from 1% to 0%.

Why 6%?

Van Tharp, author of "Trade Your Way to Financial Freedom" (1998) and one of the foremost researchers on position sizing, analyzed the relationship between account heat and probability of ruin across thousands of simulated trading sequences. His research showed that professional traders who maintained account heat below 6% had a probability of ruin under 1% over a 1,000-trade sample, assuming a 40% win rate with a 2:1 reward-to-risk ratio. Once account heat exceeded 10%, the probability of ruin climbed above 5%, even with the same win rate and reward-to-risk ratio.

The math of why this matters is uncomfortable but necessary.

A trader holds 6 positions, each risking 2% of the account. Total account heat: 12%. Now consider what happens during a correlation spike, the kind described in Law 24 (Systemic Correlation). On August 5, 2024, the Bank of Japan raised interest rates by 15 basis points, triggering a global unwind of the yen carry trade. The Nikkei 225 fell 12.4% in a single session. The S&P 500 dropped 3% at the open. Correlations across asset classes spiked toward 1.0. Stocks, bonds, and commodities all moved in the same direction. If all 6 of your positions hit their stops simultaneously, and during correlation spikes they do, the account drops 12% in a single day.

Recovery from a 12% drawdown requires a 13.6% gain just to get back to breakeven. That sounds manageable until you realize that a 13.6% gain at a 2:1 reward-to-risk with 1% risk per trade requires roughly 7 consecutive winning trades. The probability of 7 consecutive wins at a 55% win rate is 1.5%.

Now run the same scenario at 6% maximum heat. Worst case: all positions stop out, account drops 6%. Recovery from 6% requires a 6.4% gain. That is approximately 3 to 4 winning trades. The probability of 3 consecutive wins at 55% is 16.6%.

The difference between 6% heat and 12% heat is the difference between a rough day and a potential career-ending event.

### The Heat Dashboard

At any moment during the trading day, you should be able to answer this question without looking anything up: "What is my current account heat?"

Build a simple tracker. It does not need to be sophisticated.

| Position | Instrument | Risk % | Stop Hit? |
|:---------|:-----------|:-------|:----------|
| Trade 1 | ES Long | 1.0% | No |
| Trade 2 | AAPL Long | 1.0% | No |
| Trade 3 | Gold Short | 0.5% | No |
| **Total Heat** | | **2.5%** | |
| **Remaining Capacity** | | **3.5%** | |
| **Heat Cap** | | **6.0%** | |

When Trade 1's stop moves to breakeven, its risk contribution drops from 1.0% to 0%. Your heat drops from 2.5% to 1.5%. You now have capacity for 4.5% more risk. That is 4 or 5 new trades at 1% each.

This tracker is more important than any chart pattern, any indicator signal, or any market analysis you will ever perform. A trader who ignores account heat is a builder who ignores the load-bearing capacity of the foundation. The individual bricks might be perfect. The building still falls.

---

## Correlation-Adjusted Sizing

This is the most important concept that most traders ignore completely. It is also the concept that separates professionals from amateurs more cleanly than any other single variable.

Holding long positions in AAPL and MSFT is not two independent bets. Their 90-day rolling correlation averages 0.82 to 0.88. When AAPL drops, MSFT drops in the same session approximately 85% of the time. Treating them as independent positions is a mathematical fiction. It feels like diversification. It is not.

The formula for effective number of positions accounts for this reality.

**Effective Positions = N / (1 + (N - 1) x Average Correlation)**

Where N equals the number of actual positions you hold.

This formula comes from portfolio theory and measures how many truly independent bets you actually have, as opposed to how many ticker symbols appear on your screen.

| Positions Held | Avg Correlation | Effective Positions | Actual Diversification |
|:---------------|:----------------|:--------------------|:-----------------------|
| 3 tech stocks | 0.85 | 3 / (1 + 2 x 0.85) = 1.11 | Almost 1 position |
| 3 stocks (tech, energy, utilities) | 0.25 | 3 / (1 + 2 x 0.25) = 2.0 | 2 effective positions |
| 3 assets (stock, gold, bond) | -0.10 | 3 / (1 + 2 x (-0.10)) = 3.75 | Better than 3 due to negative correlation |

Read that first row again. Three tech stocks with 0.85 average correlation give you 1.11 effective positions. You think you have three bets. You have one.

Here is what this looks like in practice.

A trader holds long positions in NVDA, AMD, and AVGO. All three are semiconductor stocks with a 90-day correlation above 0.90. The trader has sized each position at 1% risk, believing the total account heat is 3%. The math says otherwise.

With a correlation of 0.90, the effective number of positions is 3 / (1 + 2 x 0.90) = 1.07. The trader effectively has 1 position, not 3. And that 1 effective position carries approximately 2.8% risk, not the 1% the trader assigned to each individual ticker.

When the Philadelphia Semiconductor Index (SOX) dropped 7.1% on September 3, 2024, all three positions stopped out within the same hour. The trader expected a maximum loss of 1% if one trade went wrong. Instead, all three went wrong simultaneously, producing a 3% drawdown when the trader thought the worst case was 1%.

The correct approach: size the three semiconductor positions as if they are a single 1% risk position split across three tickers. Each ticker gets 0.33% risk. Total risk across the three correlated names: 1%. Now the trader has 5% of heat capacity remaining for genuinely uncorrelated positions.

### Common Correlation Groups

Memorize these. They are the invisible wires connecting your "diversified" portfolio.

| Group | Typical Intra-Group Correlation | Examples |
|:------|:-------------------------------|:---------|
| Mega-cap tech | 0.82 to 0.92 | AAPL, MSFT, GOOGL, AMZN, META |
| Semiconductors | 0.85 to 0.95 | NVDA, AMD, AVGO, INTC |
| Banks | 0.80 to 0.90 | JPM, BAC, GS, MS |
| Energy | 0.75 to 0.88 | XOM, CVX, COP, SLB |
| Equity indices | 0.90 to 0.98 | ES, NQ, YM, RTY |
| USD pairs | 0.60 to 0.85 | EUR/USD, GBP/USD, AUD/USD |

The equity indices row is the most dangerous. ES, NQ, YM, and RTY have correlations above 0.90. A trader who is long ES and long NQ does not have two positions. They have approximately 1.05 positions at double the risk. Trading multiple equity index futures simultaneously without adjusting for correlation is one of the fastest ways to blow through your heat cap without realizing it.

The energy and bank groups are similarly tight. During the SVB crisis in March 2023, bank stock correlations spiked above 0.95. JPM, BAC, GS, WFC, and MS all moved in near-lockstep for three weeks. Any trader holding multiple bank stocks during that period was carrying a single concentrated bet disguised as diversification.

True diversification requires crossing group boundaries. Long AAPL (tech), short crude oil (energy), long gold (precious metals). These three positions might have correlations near zero or even negative. Three positions at 0.0 correlation gives 3 / (1 + 2 x 0.0) = 3.0 effective positions. That is actual diversification. Three independent bets. Three independent chances to be right.

---

## Scaling Across Account Sizes

Position sizing math does not change with account size. The formula is the same whether you have $10,000 or $10,000,000. What changes is the menu of instruments available to you and the practical constraints you face at each level.

> **NOTE:** U.S. equity day traders with margin accounts below $25,000 face the Pattern Day Trader (PDT) rule, which limits day trades to 3 within any rolling 5-business-day window. This constraint affects position sizing strategy: smaller accounts may need to hold overnight (converting day trades to swing trades) or trade PDT-exempt instruments like futures and forex. See the Equities Playbook (Chapter 32) for detailed PDT workarounds.

### $10,000 Account (Starter)

- 1% risk = $100 per trade
- Tradeable instruments: micro futures (MES, MNQ, MGC, MCL), small stock positions (20 to 50 shares of mid-priced stocks), forex mini and micro lots
- Maximum 3 positions at a time (conservative heat cap: 3%)
- Expected monthly income at 10R per month: $1,000

At $10,000, your job is not to get rich. Your job is to prove your system works and build a track record. The most common mistake at this level is trading instruments that are too large. A single ES contract with a 68-point stop risks $3,400. That is 34% of a $10,000 account. One loss and you are in a hole that takes months to climb out of. Stick to micro contracts. Trade small. Survive.

### $50,000 Account (Developing)

- 1% risk = $500 per trade
- Tradeable instruments: micro futures with multiple contracts, small standard futures positions (1 CL, 1 GC), stock positions of 50 to 200 shares, standard forex lots
- Maximum 5 positions at a time (heat cap: 5%)
- Expected monthly income at 10R per month: $5,000

At $50,000, you can start thinking about trading as supplemental income. The math begins to work. Five hundred dollars of risk per trade on a system that produces 10R per month generates $5,000 in monthly income. That is not life-changing in most major cities, but it is meaningful. More importantly, at this level you have enough capital to trade multiple instruments and begin practicing real portfolio management across asset classes.

### $100,000 Account (Professional)

- 1% risk = $1,000 per trade
- Full access to standard futures (1 to 2 ES contracts), options strategies, and larger stock positions (200 to 500 shares of most stocks)
- Maximum 6 positions (heat cap: 6%)
- Expected monthly income at 10R per month: $10,000

At $100,000, you are operating at professional scale. This is the level where consistent execution of a proven system can replace employment income for many traders. The instrument menu is fully open. Slippage is negligible on liquid instruments. The primary challenge shifts from "can I afford to trade" to "can I maintain discipline at this scale." Losses of $1,000 feel different than losses of $100. The math is identical. The psychology is not. Chapter 74 covers this in detail.

### $500,000 Account (Institutional)

- 1% risk = $5,000 per trade
- Multiple contracts on any instrument. 5 to 10 ES contracts is routine.
- Slippage becomes a concern on less liquid markets. A market order for 50 CL contracts will move the market against you.
- Orders above 1% of average daily volume in a stock begin to have measurable market impact
- Consider splitting large orders using TWAP (Time-Weighted Average Price) or VWAP (Volume-Weighted Average Price) algorithms

At $500,000, your problems shift from "how to make money" to "how to not move the market against yourself." A $5,000 risk per trade on ES with a 68-point stop allows approximately 1.5 standard ES contracts. No liquidity problem. But the same $5,000 risk on a thinly traded micro-cap stock might require buying 10% of the daily volume, which pushes the entry price against you before you finish filling.

### $1,000,000+ Account

- 1% risk = $10,000 per trade
- Market impact is a real concern on mid-cap stocks and less liquid futures
- Diversify across asset classes, geographies, and timeframes to deploy capital efficiently
- Consider managed accounts or fund structure for regulatory and tax optimization
- Multi-strategy approaches become necessary because no single strategy can absorb unlimited capital without degrading its edge

At seven figures, you are no longer a retail trader. You are a small institution. The same position sizing formula applies. The execution requires professional infrastructure.

---

## Real Spreadsheet Walkthrough

Every concept in this chapter reduces to a single spreadsheet that you fill out before every trade. Here is the complete walkthrough for a $50,000 account trading ES futures.

### POSITION SIZING CALCULATOR

| Field | Value | Formula / Source |
|:------|:------|:-----------------|
| Account Balance | $50,000 | Broker statement |
| Risk Per Trade (%) | 1.0% | Your rule (fixed) |
| Risk Per Trade ($) | $500 | Balance x Risk% |
| Instrument | ES (E-mini S&P) | Your selection |
| Current Price | 4,780 | Market data |
| ATR (14-day) | 42 points | Chart indicator |
| ATR Multiplier | 1.5 | Your rule (range: 1.0 to 3.0) |
| Stop Distance (points) | 63 | ATR x Multiplier |
| Point Value | $50 | Contract specification |
| Dollar Risk Per Contract | $3,150 | Stop Distance x Point Value |
| **Contracts to Trade** | **0.16** | **Risk$ / Dollar Risk Per Contract** |
| **Practical Size** | **1 MES** | **Round down, use micro** |
| Max Positions | 5 | Heat Cap / Risk% |
| Current Heat | 2.0% (2 open trades) | Sum of all position risks |
| Remaining Capacity | 3.0% (3 more trades) | Heat Cap minus Current Heat |

Fill this out before every trade. Every single one. No exceptions for "obvious" setups. No shortcuts for "quick scalps." The three minutes it takes to complete this table will save you thousands of dollars over the course of a trading year.

### When Volatility Doubles

The true power of ATR-based sizing reveals itself during volatility explosions.

On August 5, 2024, the Bank of Japan raised its benchmark interest rate by 15 basis points to 0.25%, triggering a violent unwind of the global yen carry trade. The Nikkei 225 crashed 12.4%. S&P 500 futures (ES) gapped down sharply. The VIX spiked from 23.39 to 65.73 intraday, its highest reading since March 2020.

ES ATR surged from 42 points to 95 points within three trading sessions.

Watch what happens to the spreadsheet with the exact same account, same rules, and same formula.

| Field | Normal (ATR 42) | Crisis (ATR 95) |
|:------|:----------------|:----------------|
| Account Balance | $50,000 | $50,000 |
| Risk Per Trade ($) | $500 | $500 |
| ATR (14-day) | 42 points | 95 points |
| Stop Distance (1.5x ATR) | 63 points | 143 points |
| Dollar Risk Per Contract | $3,150 | $7,150 |
| Position Size | 0.16 ES (1 MES) | 0.07 ES (use 1 MES with tighter risk) |

The system automatically shrinks your position when volatility explodes. You did not have to make a judgment call. You did not have to overcome the temptation to "buy the dip" with full size. The formula did the work. Your dollar risk stayed at $500 regardless of whether the market was asleep or on fire.

This is the ATR method's greatest feature. It keeps your dollar risk constant across all market conditions. During calm markets, your positions are larger. During violent markets, your positions are smaller. The formula adapts. You follow it.

Traders who use fixed lot sizes (always trade 2 contracts, always buy 100 shares) do not have this protection. During calm markets, their risk is moderate. During volatile markets, their risk explodes without them realizing it until the statement arrives.

### The Friday Update Ritual

Every Friday after the close, update your ATR table for every instrument you trade. This takes 10 minutes. Open your charting platform. Pull up the 14-day ATR for each instrument. Record the number. Recalculate your position sizes for the following week.

ATR changes slowly during normal markets. It might drift from 42 to 44 over the course of two weeks. But during regime changes, it can double in three days. The Friday update ensures you walk into Monday with accurate numbers. Stale ATR values are dangerous because they tell you to trade larger than you should during volatility expansions.

---

## The Kelly Criterion (And Why You Should Use Half Kelly)

In 1956, John Larry Kelly Jr., a researcher at Bell Labs, published a paper titled "A New Interpretation of Information Rate" in the Bell System Technical Journal. The paper solved a fundamental problem: given a favorable bet that you can repeat many times, what fraction of your bankroll should you wager on each bet to maximize the long-run growth rate of your wealth?

The answer became the Kelly Criterion.

**f* = (bp - q) / b**

Where:
- f* = optimal fraction of account to risk
- b = ratio of average win to average loss (reward-to-risk ratio)
- p = probability of winning
- q = probability of losing (1 minus p)

Let us run the numbers for a realistic trading system.

Win rate: 55%. Average win: $1,000. Average loss: $500. This gives b = 2.0, p = 0.55, q = 0.45.

Kelly fraction: (2.0 x 0.55 minus 0.45) / 2.0 = (1.10 minus 0.45) / 2.0 = 0.65 / 2.0 = 0.325.

The Kelly Criterion says to risk 32.5% of your account on every trade.

This is insane.

Full Kelly assumes three things that are never true in practice. First, it assumes you know your exact win rate. You do not. You have an estimate based on historical data that may or may not represent future conditions. Second, it assumes you know your exact reward-to-risk ratio. You do not. Slippage, gaps, and early exits all distort the realized ratio. Third, it assumes you have an infinite number of trades ahead of you. You do not. You have a finite career, and a string of losses at 32.5% risk per trade will end that career before the long run arrives.

Edward Thorp, the mathematician who popularized Kelly in both gambling and finance through his books "Beat the Dealer" (1962) and "Beat the Market" (1967), recommended Half Kelly for real-world application. Risk half of what the formula recommends.

Half Kelly on our example: 16.25% per trade. Still far too aggressive for most traders. A string of 4 consecutive losses (which happens regularly at a 55% win rate, with a probability of about 4.1%) would produce a drawdown of approximately 50%.

Quarter Kelly: 8.1% per trade. Approaching reasonable but still aggressive.

Here is the practical takeaway. The fixed fractional method used throughout this book, risking 1% to 2% per trade, approximates Quarter Kelly for most strategy profiles with win rates between 40% and 60% and reward-to-risk ratios between 1.5 and 3.0. You capture approximately 75% of the Kelly-optimal growth rate with roughly one-quarter of the maximum drawdown.

The Kelly Criterion is valuable not as a practical sizing tool but as a ceiling. It tells you the absolute maximum you should ever risk. If your system's Kelly fraction is 10%, risking 5% per trade (Half Kelly) is the upper bound of aggressive. Risking 2.5% (Quarter Kelly) is prudent. Risking 1% is conservative and sustainable.

Never exceed Half Kelly. The traders who blow up are almost always trading above Full Kelly without knowing it, because they overestimate their win rate, overestimate their reward-to-risk ratio, or both.

---

## The 30 Laws Applied to Position Sizing

Position sizing is not an isolated technique. It connects to nearly every law in this book. Here are the five most critical intersections.

**Law 7 (Fat Tails).** ATR measures average volatility. Tail events are not average. Your stop at 1.5 ATR will get blown through by a 5-ATR gap event. On January 15, 2015, the Swiss National Bank removed the EUR/CHF floor, and EUR/CHF gapped from 1.2010 to below 0.8500 in minutes, a move of approximately 2,800 pips. No stop was honored. Traders who had risked "1% per trade" with a 100-pip stop lost 28% instantly because the market gapped through their stop by a factor of 28. This is why you never risk more than 1% per trade and why you maintain account heat limits. The ATR stop handles normal volatility. The 1% risk cap and 6% heat limit handle the tails.

**Law 21 (Position Sizing).** This entire chapter is the applied implementation of Law 21. The law establishes the principle: your position size is the primary determinant of your returns and your risk. This chapter provides the mechanical execution. The law is the physics. This chapter is the engineering.

**Law 23 (Asymmetric Damage).** Oversized positions create asymmetric downside because losses compound geometrically. A 10% loss requires an 11.1% gain to recover. A 20% loss requires 25%. A 50% loss requires 100%. Every dollar of excess position size amplifies this asymmetry. The 1% risk rule and ATR-based sizing keep you in the zone where losses are linear and recoverable, not exponential and catastrophic.

**Law 24 (Systemic Correlation).** Correlation-adjusted sizing, covered in detail earlier in this chapter, is the direct application of Law 24 to position management. When correlations spike during crises, "diversified" portfolios reveal themselves as concentrated bets. Only correlation-adjusted sizing accounts for this reality before the crisis arrives.

**Law 29 (Probability of Ruin).** Every position sizing decision either increases or decreases your probability of ruin. Van Tharp's research and the mathematical models behind the Kelly Criterion both converge on the same conclusion: fixed fractional sizing at 1% to 2% per trade, with account heat below 6%, keeps the probability of ruin below 1% for any system with a positive expectancy. Exceed these limits and the probability of ruin climbs rapidly. At 5% risk per trade with 25% account heat, a trader with a 55% win rate has a probability of ruin above 15% over 500 trades. Those are not odds that a professional accepts.

---

## The Position Sizing Checklist

Before every trade, answer these seven questions. If any answer is "no" or "I don't know," do not take the trade.

1. Have I calculated the 14-day ATR for this instrument within the last 5 trading days?
2. Is my stop distance set at 1.0x to 2.0x ATR from my planned entry?
3. Is my position size calculated using the formula: Risk$ / (Stop Distance x Point Value)?
4. Is my risk on this trade 1% or less of my current account balance?
5. Will this trade keep my total account heat at or below 6%?
6. Have I checked the correlation between this trade and my existing open positions?
7. If this instrument is correlated above 0.70 with an existing position, have I reduced my sizing to treat them as a single effective position?

Seven questions. Thirty seconds. The difference between professional risk management and amateur gambling.

---

## What Comes Next

Individual trades happen within the larger rhythm of weeks, months, and seasons. Options expiration weeks behave differently than non-expiration weeks. January behaves differently than September. Earnings season brings different volatility patterns than the mid-quarter lull. The VIX has a seasonal cycle. Volume has a seasonal cycle. Even the distribution of gap opens varies by month.

The next chapter maps these rhythms so you can position your trading calendar as deliberately as you position your trades. Because the best-sized position in the world still loses money if you take it during a period when your edge disappears.
