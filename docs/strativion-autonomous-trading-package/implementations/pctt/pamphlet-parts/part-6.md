# PART VI: INSTRUMENT-SPECIFIC PCTT TRADING

---

## Chapter 15: Why One Size Does NOT Fit All

A PCTT pipeline running identical parameters on Bitcoin and 10-Year Treasury futures will produce garbage on at least one of them. Probably both. The core logic, pivot detection through break-retest-rejection through trailing stop, is universal. The parameters feeding that logic are not.

Here is what differs across instrument classes and why it matters for every stage of the pipeline:

**Volatility Profiles.** Bitcoin's 14-period ATR routinely sits at 3-5% of price. The S&P 500's sits at 0.8-1.2%. Treasury futures hover around 0.3-0.5%. A break confirmation buffer of 0.15 ATR means entirely different things in these three markets. On BTC, 0.15 ATR is a $900 move at $60,000. On ES, it is roughly 7 points. On ZN, it is less than a quarter point. The buffer is the same in ATR units, but the behavioral context, how fast price reaches it, how often noise triggers it, how much slippage accumulates, differs radically.

**Session Structures.** US equities trade 6.5 hours per day with defined open and close auctions. Forex trades 24 hours across three overlapping sessions with distinct liquidity profiles. Crypto never closes. Index futures have a primary RTH session embedded in a nearly continuous Globex session. Session boundaries create volatility spikes, liquidity gaps, and spread widening that must be accounted for in pivot detection, break timing, and position management.

**Volume Patterns.** Equity volume is centralized, reliable, and directly observable. Forex volume is decentralized and unreliable; tick volume is a proxy at best. Crypto volume is fragmented across dozens of exchanges with documented wash trading on smaller venues. Volume confirmation on breaks, one of PCTT's most effective filters, must be treated as mandatory for equities, useful for futures, and optional-to-unreliable for forex.

**Gap Risk.** Stocks gap overnight. Roughly 60% of US equities gap on any given day, with the gap distribution following a Student's t with 4-5 degrees of freedom, meaning fat tails. Index futures gap only on weekends. Forex gaps only on weekends and around holidays. Crypto does not gap at all (24/7 trading), but it compensates with flash crashes that move 10-20% in minutes. Gap risk determines overnight position sizing, stop buffer requirements, and maximum hold time.

**Spread Characteristics.** SPY trades at a 0.01% spread. EUR/USD trades at 0.01-0.02% during London hours but widens to 0.05-0.10% during Tokyo. BTC perpetual futures on major exchanges trade at 0.01-0.03% but can blow out to 0.5%+ during liquidation cascades. Altcoins routinely trade at 0.10-0.50%. Spread directly affects the minimum viable dGeom: if your spread consumes 10% of your stop distance, you are donating edge to the market maker before the trade begins.

**Correlation Behavior.** Tech stocks correlate with each other at 0.60-0.85 during normal markets and spike to 0.95+ during selloffs. Forex majors share USD as a common factor, creating structural correlation. Crypto assets correlate at 0.70-0.90 with BTC, making diversification across crypto positions largely illusory. The maximum concurrent positions parameter must reflect the actual diversification available in each asset class.

**The Instrument Adaptation Layer.** PCTT's architecture places an instrument adaptation layer between the core pipeline and execution. This layer takes the core pipeline's output (setup grade, direction, entry price, stop price) and adjusts it for instrument-specific realities before the order hits the market. It handles session filtering, spread-adjusted sizing, gap-risk position limits, and instrument-specific circuit breakers. The core pipeline remains identical across all instruments. Only the adaptation layer changes.

Every chapter that follows provides the complete parameter table for one instrument class. These are not suggestions. They are calibrated defaults derived from the structural characteristics of each market. Start here. Adjust only after 200+ trades of walk-forward evidence justify a change.

---

## Chapter 16: US Equities

### 16.1 Market Characteristics

US equities trade on the NYSE and NASDAQ during Regular Trading Hours from 9:30 to 16:00 ET. Extended hours run from 4:00 to 20:00 ET but with materially thinner liquidity, wider spreads, and unreliable price discovery.

**Opening auction volatility.** The first 30 minutes of RTH typically produce 2-3x the normal bar-level ATR. This is driven by overnight order accumulation, gap resolution, and institutional portfolio rebalancing. Pivots formed during this window are unreliable because they reflect auction mechanics, not structural conviction. PCTT filters this by delaying signal generation until 10:00 ET.

**Closing imbalance.** The last 15 minutes see institutional rebalancing flows, index fund adjustments, and MOC (Market on Close) order imbalances. Volume spikes 3-5x the intraday average. Price moves during this window are driven by mechanical flows, not structural breaks. PCTT avoids new entries after 15:30 ET.

**Gap risk.** Approximately 60% of US stocks gap daily. The overnight gap distribution is heavy-tailed, well-modeled by a Student's t distribution with degrees of freedom between 4 and 5. This means gaps larger than 2 standard deviations occur 3-5x more frequently than a normal distribution would predict. For PCTT, this means overnight positions face uncontrollable risk beyond the stop level.

**Spread by capitalization.** Liquid large-cap stocks (AAPL, MSFT, AMZN) trade at 0.01-0.03% effective spread. Mid-cap stocks ($2B-$10B market cap) trade at 0.05-0.15%. Small-cap stocks below $2B trade at 0.25%+ and are generally unsuitable for PCTT without significant parameter widening.

**Minimum liquidity requirement.** Average daily volume must exceed 1 million shares. Average daily dollar volume must exceed $20 million. Below these thresholds, slippage on entry and exit will erode the PCTT edge.

### 16.2 PCTT Parameter Adaptations

| Parameter | US Equity Value | Default | Rationale |
|:----------|:---------------|:--------|:----------|
| Pivot L/R | 3/2 | 2/2 | Left=3 filters opening noise; Right=2 maintains responsiveness |
| ATR period | 14 | 14 | Standard. No change needed. |
| Q-Score A threshold | 0.70 | 0.70 | Standard |
| Q-Score B threshold | 0.55 | 0.55 | Standard |
| Break beta_p (penetration) | 0.10 ATR | 0.10 | Standard |
| Break beta_c (confirmation) | 0.15 ATR | 0.15 | Standard |
| Volume confirmation | YES (required) | Optional | Equity volume is centralized and reliable. Breaks without volume expansion are suspect. |
| Volume break ratio | 1.5x SMA(20) | 1.2x | Higher threshold. Equity breaks need stronger participation proof. |
| Retest window M | 10 bars | 12 | Shorter. Equities are event-driven; stale retests fail more often. |
| Retest tolerance gamma | 0.20 ATR | 0.20 | Standard |
| dGeom max | 2.5 ATR | 2.5 | Standard |
| dGeom min | 0.5 ATR | 0.5 | Standard |
| Trail ATR multiplier (Trending) | 2.0 | 2.0 | Standard |
| Trail ATR multiplier (Transitional) | 1.5 | 1.5 | Standard |
| Time stop bars | 15 | 20 | Shorter. Equities resolve or stagnate faster than other markets. |
| Session filter | 10:00-15:30 ET | None | Skip opening 30m auction noise and closing 30m rebalancing flows |
| Max daily risk | 1.5% | 3.0% | Reduced. Gap risk is material for overnight equity positions. |
| Max concurrent positions | 4 | 3 | Slightly higher, but constrained by sector correlation limits. |
| Correlated exposure max | 3.0% | 3.0% | Standard. Critical for equity sector clustering. |
| Overnight position max risk | 0.75% | N/A | Equity-specific. Halve risk for positions held through close. |

### 16.3 Sector-Specific Notes

**Technology (XLK constituents).** Wider ATR, faster directional moves, higher beta to indices. Tech stocks trend aggressively when they trend. Use 2.5x trail ATR multiplier in confirmed strong trend regimes. Expect more frequent false breaks during earnings season (4 quarterly cycles). FAANG-class names have the cleanest PCTT structures due to massive liquidity.

**Financials (XLF constituents).** Highly gap-sensitive. Banks and insurance companies react violently to Fed announcements, yield curve shifts, and earnings. Reduce overnight exposure to 0.5% max risk for financials. Avoid new positions 48 hours before FOMC. The sector tends to move as a block; if you are long JPM and GS simultaneously, treat them as a single correlated position for heat purposes.

**Energy (XLE constituents).** Strongly correlated with crude oil. When trading energy stocks via PCTT, cross-reference with the WTI crude oil structure. A bearish PCTT setup on XOM is more reliable when crude oil structure is also bearish. Energy stocks gap on EIA inventory reports (Wednesday 10:30 ET). No new energy entries within 2 hours of the EIA release.

**Healthcare/Biotech (XLV/XBI constituents).** Subject to binary events: FDA approvals, clinical trial results, drug pricing announcements. These events can move individual stocks 20-50% in a single session, completely overwhelming any structural analysis. Exclude any stock with a known FDA PDUFA date or major clinical trial readout within 10 trading days. Reduce position size by 50% for all biotech PCTT positions regardless of Q-Score.

**ETFs (SPY, QQQ, IWM, DIA).** The cleanest PCTT instruments in the equity space. Tightest spreads, highest liquidity, no single-stock event risk. Use for index-level PCTT trades when you want broad market exposure without single-name concentration. SPY and QQQ can use slightly tighter parameters: beta_c = 0.12, volume break ratio = 1.3x.

### 16.4 Earnings Season Protocol

Earnings are the single largest source of overnight gap risk for individual equities. The PCTT earnings protocol is non-negotiable:

1. **5 days before earnings:** No new PCTT positions in the stock. The options market begins pricing the earnings move, distorting implied volatility and often creating false structural signals as hedging flows dominate.
2. **2 days before earnings:** Close all existing PCTT positions in the stock, or tighten the stop to breakeven plus spread buffer. No exceptions, regardless of how profitable the position is.
3. **After earnings release:** Wait a minimum of 2 full bars (on your trading timeframe) for post-earnings volatility to normalize before evaluating new PCTT setups. The first 1-2 bars after earnings reflect gap resolution and analyst reaction, not structural price behavior.
4. **Earnings season broadly (Jan/Apr/Jul/Oct reporting periods):** Reduce the maximum number of concurrent equity positions from 4 to 3. More stocks are in the earnings exclusion zone, reducing the tradeable universe and increasing the risk of accidental earnings exposure.

---

## Chapter 17: Index Futures (ES, NQ, YM, RTY)

### 17.1 Market Characteristics

US index futures are the most liquid instruments on the planet and produce some of the cleanest PCTT structures.

**Session structure.** Trading runs from 18:00 ET Sunday through 17:00 ET Friday, with a daily maintenance halt from 17:00-18:00 ET. This creates a nearly 24-hour market with no overnight gap risk during the week. Weekend gaps exist but are typically modest (0.5-1.5% on ES).

**Globex vs RTH.** The Globex overnight session (18:00-09:30 ET) trades at roughly 15-30% of RTH volume. Effective spreads are wider, and structural signals are less reliable. Regular Trading Hours (09:30-16:15 ET) are the primary session for PCTT analysis. All ATR calculations should use RTH data only, as overnight Globex activity distorts the true volatility picture.

**Tick values.** ES (S&P 500 E-mini) = $12.50 per tick (0.25 points). NQ (Nasdaq 100 E-mini) = $5.00 per tick (0.25 points). YM (Dow E-mini) = $5.00 per tick (1 point). RTY (Russell 2000 E-mini) = $5.00 per tick (0.10 points). MES (Micro S&P) = $1.25 per tick, providing granular sizing for smaller accounts.

**Margin.** Day trade margins are significantly lower than overnight margins. A single ES contract requires approximately $500-$1,000 day trade margin vs $12,000+ overnight margin at most brokers. This makes futures capital-efficient but also means leverage is high. Position sizing discipline is paramount.

**No intra-week gap risk.** Because futures trade nearly continuously, the gap risk that plagues equities does not exist Monday through Friday. Weekend gaps exist but are typically orderly. This allows PCTT to hold positions overnight during the week without the same gap anxiety as equities.

### 17.2 PCTT Parameter Adaptations

| Parameter | Index Futures Value | Default | Rationale |
|:----------|:-------------------|:--------|:----------|
| Pivot L/R | 2/2 | 2/2 | Standard fractal. Futures have clean pivots. |
| ATR period | 14 | 14 | Standard |
| ATR data source | RTH only (9:30-16:15 ET) | All data | Overnight Globex distorts ATR. Use RTH bars for accurate volatility measurement. |
| Q-Score A threshold | 0.70 | 0.70 | Standard |
| Q-Score B threshold | 0.55 | 0.55 | Standard |
| Break beta_p | 0.10 ATR | 0.10 | Standard |
| Break beta_c | 0.20 ATR | 0.15 | Slightly wider. Futures are noisier tick-for-tick due to leverage and HFT activity. |
| Volume confirmation | YES (real volume for RTH, tick volume for Globex) | Optional | CME provides real volume. Use it. During Globex hours, tick volume is the available proxy. |
| Retest window M | 12 bars | 12 | Standard |
| dGeom max | 2.0 ATR | 2.5 | Tighter. Leverage amplifies losses. A 2.5 ATR stop on a leveraged futures contract can represent outsized dollar risk. |
| Trail ATR mult (Trending) | 1.8 | 2.0 | Futures trail tighter. Liquidity allows clean exits. |
| Trail ATR mult (Transitional) | 1.5 | 1.5 | Standard |
| Time stop bars | 20 | 20 | Standard |
| Session filter | RTH 9:30-16:15 ET | None | Avoid Globex-only entries unless overnight structure is exceptionally clean (Q > 0.75). |
| Max risk per trade | 1.0% | 1.0% | Standard |
| Contract sizing | Fixed fractional, floor() | Shares | Futures trade in whole contracts. Position size = floor(equity * risk% / (stop_distance * tick_value / tick_size)). You cannot trade 0.3 contracts. Use micro contracts (MES, MNQ) for granular sizing on smaller accounts. |
| Weekend risk reduction | 50% position size | N/A | Reduce exposure before Friday close to account for weekend gap risk. |

### 17.3 Roll Date Protocol

Index futures expire quarterly (March, June, September, December). The roll from the expiring front-month to the next contract creates a 3-5 day window of distorted structural data.

1. **Roll week minus 3 days:** Reduce all open PCTT positions to 50% of original size. Volume shifts to the new front-month contract, reducing liquidity on the expiring contract and widening effective spreads.
2. **Roll week:** No new PCTT positions on the expiring contract. Structural analysis during this window is contaminated by roll-related flows and calendar spread arbitrage.
3. **Volume crossover day:** The day when the new front-month contract's volume exceeds the expiring contract. Switch all PCTT analysis to the new front-month contract on this day. Typically occurs 5-8 trading days before expiration.
4. **Back-adjustment:** For continuous contract analysis (longer-term structure), use back-adjusted data. For active trade management, use the raw front-month contract. Never mix the two.

### 17.4 Index-Specific Notes

**ES (S&P 500).** The gold standard for PCTT. Deepest liquidity, tightest spreads, cleanest structural behavior. Most backtesting should start with ES. All default parameters are calibrated primarily to ES behavior.

**NQ (Nasdaq 100).** Higher beta than ES. Daily ATR is typically 1.3-1.5x ES in percentage terms. NQ trends more aggressively and breaks more violently. Widen beta_c to 0.25 ATR for NQ. Expect wider retest tolerances as well.

**RTY (Russell 2000).** Most volatile of the four. Wider spreads. More prone to false breaks and choppy behavior. Increase Q-Score B threshold to 0.60 for RTY. Reduce maximum risk per trade to 0.75%.

**YM (Dow 30).** Lowest volatility and tightest range of the four. PCTT setups are less frequent but tend to be cleaner. Standard parameters work well.

---

## Chapter 18: Forex, Major Pairs (EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CHF, USD/CAD)

### 18.1 Market Characteristics

The forex market is the largest and most liquid financial market in the world, with daily turnover exceeding $7.5 trillion. It operates 24 hours per day from Sunday 17:00 ET to Friday 17:00 ET.

**Three-session structure.** Tokyo session: 19:00-04:00 ET. London session: 03:00-12:00 ET. New York session: 08:00-17:00 ET. Peak liquidity occurs during the London-New York overlap window from 08:00-12:00 ET, when both of the world's largest trading centers are simultaneously active.

**Liquidity variation by session.** During the London-New York overlap, EUR/USD trades with spreads of 0.5-1.0 pip. During the Tokyo session, spreads on the same pair widen to 1.5-3.0 pips. During the low-liquidity window between the New York close and Tokyo open (17:00-19:00 ET), spreads can widen to 3-5 pips. PCTT break signals during low-liquidity windows are unreliable and should be filtered.

**No centralized volume data.** Forex is an OTC (over-the-counter) market with no single exchange. There is no consolidated tape. Tick volume from your broker's feed is a proxy that reflects activity on that broker's liquidity pool, not the entire market. For PCTT, volume confirmation is downgraded from required to optional.

**Swap rates (carry cost).** Holding positions overnight incurs a swap charge or credit based on the interest rate differential between the two currencies. Positive swap (earning carry) is a tailwind that adds to profitability. Negative swap is a headwind that subtracts from it. For PCTT positions held multiple days, swap must be factored into expected R.

**Pip value.** One pip = 0.0001 for most pairs, 0.01 for JPY pairs. Pip value in account currency depends on the pair and account denomination. For a 100,000-unit standard lot: EUR/USD 1 pip = $10 (USD account), USD/JPY 1 pip = approximately $6.50 (varies with USD/JPY rate).

### 18.2 PCTT Parameter Adaptations

| Parameter | FX Major Value | Default | Rationale |
|:----------|:--------------|:--------|:----------|
| Pivot L/R | 3/3 | 2/2 | Slower pivots. The 24-hour market produces more noise; wider confirmation windows filter false swing points. |
| ATR period | 14 (Daily chart) | 14 | Standard |
| Session ATR | Use London + NY hours only for intraday ATR | All data | Tokyo session low-volatility data dilutes the ATR, making buffers too tight during active hours. |
| Q-Score A threshold | 0.70 | 0.70 | Standard |
| Q-Score B threshold | 0.55 | 0.55 | Standard |
| Break beta_p | 0.10 ATR | 0.10 | Standard |
| Break beta_c | 0.15 ATR | 0.15 | Standard |
| Volume confirmation | OPTIONAL (tick volume only) | Optional | No real centralized volume. Tick volume is a weak proxy. Do not require it as a gate. |
| Retest window M | 15 bars | 12 | FX retests take longer. The 24-hour market and lower per-session volatility mean price meanders back to the broken level more slowly. |
| Retest tolerance gamma | 0.20 ATR | 0.20 | Standard |
| dGeom max | 2.5 ATR | 2.5 | Standard |
| Trail ATR mult (Trending) | 2.0 | 2.0 | Standard. FX trends tend to be smoother than equity or crypto trends. |
| Trail ATR mult (Transitional) | 1.8 | 1.5 | Slightly wider than default. Transitional FX regimes produce longer pullbacks before continuation. |
| Time stop bars | 25 | 20 | Longer holding periods are normal in FX. Structural setups need more time to resolve. |
| Session filter | London open (03:00 ET) through NY overlap close (12:00 ET) | None | Primary trading window. Entries outside this window have wider spreads and thinner participation. |
| Max risk per trade | 0.75% | 1.0% | Lower. FX leverage is typically 50:1-100:1, creating outsized notional exposure. Lower per-trade risk compensates. |
| Swap consideration | YES | N/A | Close negative-swap trades faster (tighten time stop by 20% for negative-carry positions). Positive-swap trades get standard time stop. |
| Max concurrent positions | 3 | 3 | Standard. But limit to 2 positions sharing the same base or quote currency (e.g., EUR/USD + EUR/GBP = double EUR exposure). |

### 18.3 News Event Protocol

High-impact economic releases create regime-disrupting volatility that can invalidate PCTT structure in seconds. The protocol is absolute:

**Tier 1 Events (maximum disruption):** Non-Farm Payrolls (NFP, first Friday of month), CPI/Core CPI, FOMC Rate Decision and Statement, ECB Rate Decision, BOE Rate Decision, BOJ Rate Decision.

- No new PCTT positions within 2 hours before the release.
- Close or flatten all PCTT positions 30 minutes before the release. No exceptions. The spread widening and order book thinning that precede these events can trigger stops prematurely.
- After the release: wait for 4 completed bars on your trading timeframe before evaluating any new PCTT setup. The first 2-4 bars after a major release reflect shock absorption, not structural price behavior.

**Tier 2 Events (significant disruption):** PMI releases, GDP, Retail Sales, Central Bank minutes, Employment data (non-US).

- No new positions within 1 hour before release.
- Tighten existing stops to breakeven if in profit. Hold existing stops if not yet at breakeven.
- Wait 2 bars post-release before new entries.

**Tier 3 Events (moderate disruption):** Housing data, Consumer Confidence, Trade Balance, Industrial Production.

- Awareness only. No parameter changes required. Note that spreads may widen briefly.

---

## Chapter 19: Forex, Minor and Exotic Pairs

Minor pairs (EUR/GBP, GBP/JPY, EUR/AUD, AUD/NZD, etc.) and exotic pairs (USD/MXN, USD/TRY, USD/ZAR, EUR/PLN, USD/SGD, etc.) share the forex market's 24-hour structure but diverge from majors in critical ways that require aggressive parameter adjustment.

**Wider spreads.** Minor pair spreads range from 1.5-5 pips. Exotic pair spreads range from 3-15+ pips. This has a direct impact on PCTT viability. The minimum dGeom must rise to ensure the stop distance is large enough that spread cost does not consume a material fraction of the risk budget.

**Lower liquidity.** Order book depth is 30-70% thinner than majors. Market impact on entry and exit is higher. Slippage on stop-loss execution can be 2-5x what you experience on EUR/USD.

**Higher volatility.** Many exotics exhibit daily ATR of 1.5-3% (vs 0.5-0.8% for majors). This is especially true for emerging market currencies (TRY, ZAR, MXN) which are subject to political risk, capital controls, and central bank intervention.

| Parameter | Minor/Exotic Value | Major FX Value | Adjustment |
|:----------|:-------------------|:---------------|:-----------|
| dGeom minimum | 1.0 ATR | 0.5 ATR | Raised to ensure spread cost < 10% of stop distance |
| Position size | 50% of major FX size | Standard | Reduced for liquidity risk |
| All ATR multipliers | +50% (e.g., trail 3.0 instead of 2.0) | Standard | Wider buffers for higher noise |
| Q-Score B threshold | 0.60 | 0.55 | Higher minimum quality to compensate for execution friction |
| Time stop bars | 20 | 25 | Shorter. Exotics trend and then gap violently; do not overstay. |
| Max risk per trade | 0.50% | 0.75% | Further reduced for execution uncertainty |
| Swap consideration | CRITICAL | YES | Exotic carry costs can be 5-20x major pair costs. Negative carry on TRY or ZAR positions can consume 0.5-1.0% of position value per week. |
| Overnight hold | Limit to 3 days max | Standard | Exotic pairs subject to weekend devaluation risk and capital control announcements |
| Correlation check | YES | YES | Many exotics are highly correlated proxies. USD/MXN, USD/BRL, and USD/ZAR often move in sync (all are "risk-on EM" trades). Treat them as a single correlated group. |

**Viability test.** Before trading any minor or exotic pair with PCTT, calculate the average daily range / average spread ratio. If this ratio is below 10:1, the pair is not viable for PCTT. Spread friction will consume too much of the structural edge. Most exotic pairs clear this hurdle on daily timeframes but fail it on intraday timeframes shorter than 4H.

---

## Chapter 20: Cryptocurrency, Large Cap (BTC, ETH)

### 20.1 Market Characteristics

Cryptocurrency markets operate 24 hours per day, 7 days per week, 365 days per year. There is no closing bell, no maintenance halt, and no weekend break.

**Exchange fragmentation.** Unlike equities or futures, there is no single exchange. BTC trades simultaneously on Binance, Coinbase, Kraken, Bybit, OKX, and dozens of other venues. Prices can differ by 0.1-0.5% across exchanges during normal conditions and by 1-3% during high-volatility events. Use a composite price feed (e.g., the CoinGecko or CoinMarketCap aggregate) for PCTT structural analysis, but execute on the exchange with the deepest order book for your position size.

**Extreme volatility.** BTC's daily ATR routinely sits at 3-5% of price, compared to 0.8-1.2% for the S&P 500. ETH is typically 1.2-1.5x BTC volatility. This means every ATR-normalized parameter in PCTT translates to proportionally larger absolute price movements. A 2.0 ATR trailing stop on BTC at $60,000 with a 4% ATR is a $4,800 stop. The same 2.0 ATR on ES at 5,000 with a 1% ATR is a 100-point stop. The math is identical; the absolute exposure is not.

**No circuit breakers.** Most crypto exchanges have no price limits and no trading halts (BitMEX and some perpetual platforms have auto-deleverage mechanisms, but these are not circuit breakers in the traditional sense). BTC can and does move 15-20% in a single session. The absence of circuit breakers means PCTT's own circuit breakers (daily loss cap, drawdown scaling, emergency exit at 5 ATR moves) are the only protection.

**Weekend trading.** Saturday and Sunday trading volume drops to 40-60% of weekday levels. Spreads widen. Order book depth thins. Structural signals formed during weekends are less reliable.

**Funding rates.** Perpetual futures (the most popular crypto derivatives) charge funding rates every 8 hours. When longs pay shorts (positive funding), it costs money to hold a long position. When shorts pay longs (negative funding), shorting has a carrying cost. Funding rates can reach 0.1-0.3% per 8-hour period during extreme positioning, which annualizes to 130-400%. This is not a rounding error. It is a material cost that must be factored into hold time and expected R.

### 20.2 PCTT Parameter Adaptations

| Parameter | Crypto Large Cap Value | Default | Rationale |
|:----------|:----------------------|:--------|:----------|
| Pivot L/R | 2/3 | 2/2 | Left=2 for fast pivot detection; Right=3 for stronger confirmation in noisy markets |
| ATR period | 14 | 14 | Standard |
| Q-Score A threshold | 0.70 | 0.70 | Standard |
| Q-Score B threshold | 0.55 | 0.55 | Standard |
| Break beta_p | 0.10 ATR | 0.10 | Standard |
| Break beta_c | 0.25 ATR | 0.15 | Wider. Crypto noise generates frequent wick-only breaks that fail to follow through. Requiring a stronger close confirmation filters these. |
| Volume confirmation | YES (exchange-specific) | Optional | Critical for crypto. Use the specific exchange's volume where you will execute. Aggregated volume can be misleading due to wash trading on smaller venues. |
| Volume break ratio | 1.5x SMA(20) | 1.2x | Higher threshold. Crypto volume spikes are common and not always meaningful. |
| Retest window M | 8 bars | 12 | Shorter. Crypto moves fast. If a retest has not occurred within 8 bars, the move was too aggressive for a clean entry. |
| dGeom max | 2.0 ATR | 2.5 | Tighter. With daily ATR at 3-5%, a 2.5 ATR stop represents 7.5-12.5% price risk. 2.0 ATR keeps this in the 6-10% range, still wide but more manageable. |
| Trail ATR mult (Trending) | 2.5 | 2.0 | Wider. Crypto trends pull back harder intra-move. A 2.0 ATR trail gets clipped by normal trend noise in crypto. |
| Trail ATR mult (Transitional) | 2.0 | 1.5 | Wider for the same reason. |
| Time stop bars | 15 | 20 | Shorter. Crypto resolves quickly. A stagnant crypto position suggests the structural thesis has been absorbed. |
| Max risk per trade | 0.5% | 1.0% | Reduced by half. Extreme volatility means a 1% risk trade can become a 2-3% loss on a gap-like move even with stops in place. |
| Weekend filter | Reduce position size by 50% on Saturday and Sunday | N/A | Lower weekend liquidity means wider effective spreads and higher slippage risk. |
| Funding rate check | YES for perpetual futures | N/A | If funding rate exceeds 0.05% per 8 hours against your position direction, tighten the time stop by 30%. If funding exceeds 0.10% against, close the position regardless of structural setup. |
| Max concurrent positions | 2 | 3 | Reduced. BTC and ETH correlate at 0.80-0.90. Two positions is effectively 1.6-1.8 independent bets. |

### 20.3 Crypto-Specific Anti-Patterns

**Social media / regulatory FUD.** If price moves 3+ ATR in fewer than 2 bars without a corresponding structural break, exit all positions immediately. This pattern (violent non-structural move) typically corresponds to an external shock: a major tweet, a regulatory announcement, an exchange hack, or a stablecoin de-peg rumor. PCTT structure is irrelevant during these events.

**Exchange outage.** If your primary exchange experiences an outage or degraded service, immediately submit emergency stop-loss orders on all secondary platforms where you have positions. Do not wait for the primary exchange to resume. Exchange outages in crypto frequently coincide with extreme price moves, meaning the worst time for an outage is exactly when it is most likely to occur.

**Stablecoin de-peg events.** If any major stablecoin (USDT, USDC, DAI) trades below $0.98 or above $1.02 for more than 15 minutes, halt all new crypto PCTT positions and tighten all existing stops to breakeven. A stablecoin de-peg is a systemic event that can cascade across the entire crypto market within hours. The 2022 UST collapse moved BTC 30%+ in days.

**Liquidation cascades.** Monitor open interest and estimated leverage ratio. When BTC open interest exceeds 2% of market cap (historically elevated), the market is vulnerable to liquidation cascades where leveraged positions are forcibly closed, creating a feedback loop of selling and further liquidations. Reduce position size by 50% when open interest is at historically elevated levels.

---

## Chapter 21: Cryptocurrency, Altcoins

All parameters from Chapter 20 (large-cap crypto) apply, with the following overrides that reflect the dramatically higher risk profile of altcoins:

| Parameter | Altcoin Value | Large-Cap Crypto Value | Adjustment |
|:----------|:-------------|:----------------------|:-----------|
| Position size | 25% of large-cap size | Standard | 75% reduction. Extreme vol + liquidity risk. A 10% move in a $200M market-cap altcoin can be a 2-3% portfolio event at standard sizing. |
| dGeom max | 1.5 ATR | 2.0 ATR | Tighter. Forces closer structural stops, preventing outsized losses on parabolic altcoin moves. |
| Q-Score minimum | 0.70 (A-Grade only) | 0.55 | B-Grade altcoin setups are not worth the execution risk. Only trade the highest-quality structure. |
| Volume confirmation | REQUIRED | YES | Non-negotiable for altcoins. Fake volume and wash trading are endemic on smaller venues. |
| Overnight holds | NO for sub-$100M market cap | Standard | Altcoins below $100M market cap can lose 20-40% overnight on a single whale exit or exchange delisting rumor. |
| Max hold time | 10 bars | 15 bars | Shorter. Altcoin trends are faster and more fragile. |
| Exchange listing check | YES before every entry | N/A | Verify the altcoin is listed on at least 2 major exchanges. Single-exchange tokens face delisting risk that PCTT cannot protect against. |
| Correlation filter | Check BTC correlation | N/A | If the altcoin's 30-day correlation with BTC exceeds 0.85, the position is effectively a leveraged BTC bet. Account for this in portfolio heat. |
| Max concurrent altcoin positions | 1 | 2 | One altcoin position at a time. Altcoin correlations spike to 0.95+ during selloffs, making multiple altcoin positions a single correlated bet. |

---

## Chapter 22: Commodities (Gold, Oil, Natural Gas, Grains)

### 22.1 Market Characteristics

Commodities trade primarily as futures contracts on the CME Group (COMEX for metals, NYMEX for energy, CBOT for grains). Each contract has an expiration date, creating roll mechanics that do not exist in equity or forex markets.

**Strong seasonal patterns.** Natural gas peaks in winter (heating demand) and troughs in shoulder months. Grains follow planting and harvest cycles. Gasoline peaks in summer driving season. These seasonal patterns create persistent directional biases that, when aligned with PCTT structure, produce high-conviction setups.

**Geopolitical sensitivity.** Oil prices respond to OPEC decisions, Middle East tensions, and sanctions. Gold responds to central bank policy, inflation expectations, and geopolitical risk. Agricultural commodities respond to weather events, trade policy, and government subsidy programs. These external drivers can create sudden structural breaks that are well-captured by PCTT.

**Backwardation and contango.** When front-month futures trade above back-month futures (backwardation), it signals supply tightness and generally supports bullish bias. When front-month trades below back-month (contango), it signals supply surplus and supports bearish bias. This curve structure provides a macro directional filter that complements PCTT regime detection.

**Physical delivery risk.** Futures contracts that reach expiration require physical delivery of the commodity. PCTT positions must be closed well before the first notice date (typically 2-3 weeks before contract expiration) to avoid any delivery obligation.

### 22.2 PCTT Parameter Adaptations

| Parameter | Commodity Value | Default | Rationale |
|:----------|:---------------|:--------|:----------|
| Pivot L/R | 3/3 | 2/2 | Slower pivots. Commodity prices are driven by inventory reports and geopolitical events that create noisy short-term swings. Wider confirmation filters. |
| ATR period | 20 | 14 | Longer ATR period for commodities. Commodity volatility clusters around report dates; a 14-bar ATR overweights recent report-driven spikes. 20-bar smooths this. |
| Q-Score A threshold | 0.70 | 0.70 | Standard |
| Q-Score B threshold | 0.55 | 0.55 | Standard |
| Break beta_p | 0.10 ATR | 0.10 | Standard |
| Break beta_c | 0.20 ATR | 0.15 | Moderately wider. Commodity markets are noisier at the bar level due to report-driven volatility. |
| Volume confirmation | YES | Optional | CME Group provides reliable, centralized volume data. Use it as a required gate. |
| Retest window M | 15 bars | 12 | Commodities retest more slowly. Report-driven breaks often need 2-3 sessions to produce a clean retest as the market digests the information. |
| dGeom max | 2.5 ATR | 2.5 | Standard |
| Trail ATR mult (Trending) | 2.5 | 2.0 | Wider. Commodities trend well but with deeper pullbacks than equities. A 2.0 ATR trail clips too many winning commodity trends prematurely. |
| Trail ATR mult (Transitional) | 2.0 | 1.5 | Wider for the same reason. |
| Time stop bars | 25 | 20 | Longer holds. Commodity trends develop over weeks, not days. Give the thesis more room to work. |
| Max risk per trade | 0.75% | 1.0% | Moderately reduced. Commodity limit moves can create gap-like risk even in futures. |
| Roll protocol | Exit 5 days before first notice date | N/A | No delivery risk. Five-day buffer allows orderly exit before liquidity migrates to the new front month. |
| Seasonal filter | YES (natural gas, grains, gasoline) | N/A | Trade with the seasonal trend, not against it. A bearish PCTT setup on natural gas in October (entering heating season, seasonal bullish bias) requires A-Grade quality and reduced sizing. |

### 22.3 Gold-Specific Notes

Gold (GC futures, XAU/USD spot) behaves more like a currency than a traditional commodity. It does not have the seasonal patterns of energy or grains.

**Safe haven dynamics.** Gold is inversely correlated with risk-on moves. When equities sell off sharply, gold typically rallies. This creates a natural hedge property. PCTT long signals on gold during equity market stress are high-conviction.

**DXY correlation.** Gold trades inversely to the US Dollar Index (DXY) approximately 70-80% of the time. A bearish DXY structure (falling dollar) is a macro tailwind for bullish gold PCTT setups. Check DXY structure before initiating gold positions.

**Use weekly macro for gold.** Gold's structural cycles are longer than most commodities. The macro regime detection layer should use Weekly charts for gold (vs Daily for most other instruments). Meso analysis on Daily. Micro entry on 4H. This matches gold's characteristically slow, persistent trends.

**Central bank buying.** Central bank gold purchases (particularly from China, India, and other emerging market central banks) create persistent underlying demand that supports gold's structural floor. This is a fundamental factor that PCTT cannot directly measure but that provides context for structural analysis.

---

## Chapter 23: Bonds and Interest Rates (US Treasuries, Bunds)

Bond futures (ZB 30-year, ZN 10-year, ZF 5-year, ZT 2-year on CME; Bund, Bobl, Schatz on Eurex) represent one of the largest and most liquid futures markets globally, but they behave fundamentally differently from every other instrument class.

**Extremely low volatility.** ZN (10-year Treasury futures) has a daily ATR of approximately 0.3-0.5% of price, compared to 0.8-1.2% for ES and 3-5% for BTC. This means PCTT parameters expressed in ATR units create proportionally smaller absolute buffers. The pipeline works, but position sizing must account for the need for larger notional positions to achieve meaningful dollar returns.

**Central bank event sensitivity.** FOMC meetings (8 per year), ECB rate decisions, and major employment/inflation data releases are regime-change catalysts for bonds. A single FOMC statement can reprice the entire yield curve in minutes, invalidating any existing structure. This is not gradual regime transition; it is instant structural demolition.

**Inverted price/yield relationship.** Bond prices move inversely to yields. When rates rise, bond prices fall. This is intuitive once understood but creates communication confusion. A "bearish" PCTT signal on ZN (price falling) corresponds to "bullish" rates (yields rising).

**Duration amplification.** Longer-duration bonds (ZB 30-year) have higher price volatility per unit move in rates. ZB daily ATR is roughly 2x ZN daily ATR in absolute terms. Use ZN or ZF for standard PCTT trading. Reserve ZB for experienced traders comfortable with the amplified volatility.

| Parameter | Bond Futures Value | Default | Rationale |
|:----------|:------------------|:--------|:----------|
| Pivot L/R | 3/3 | 2/2 | Wider. Bond trends are slow and structural pivots need more confirmation. |
| ATR period | 20 | 14 | Longer. Bond volatility is even more clustered around event dates than commodities. 20-bar ATR smooths this. |
| Q-Score A threshold | 0.70 | 0.70 | Standard |
| Q-Score B threshold | 0.55 | 0.55 | Standard |
| Break beta_c | 0.20 ATR | 0.15 | Wider. Bond markets are institutionally dominated; false breaks are common as large players probe levels. |
| Volume confirmation | YES | Optional | CBOT provides reliable volume data. Bond volume confirms institutional participation at structural levels. |
| Trail ATR mult (Trending) | 3.0 | 2.0 | Much wider. Bonds trend slowly but persistently. A 2.0 ATR trail exits bond trends prematurely. Bonds reward patience. |
| Trail ATR mult (Transitional) | 2.5 | 1.5 | Wider for the same reason. |
| Time stop bars | 30+ | 20 | Much longer. Bond structural setups can take weeks to fully resolve. 20 bars is too aggressive for bonds. |
| Max risk per trade | 0.5% | 1.0% | Reduced. Low volatility invites leverage. Overleverage in bonds is the most common mistake. Use lower per-trade risk and let the trend duration compensate. |
| Event filter | No positions 24h before FOMC/ECB | None | Non-negotiable. FOMC can move ZN 1-2 full points (30-60 ticks) in minutes. No structural analysis survives this. |
| Macro timeframe | Weekly | Daily | Bond structural cycles are longer. Use Weekly for macro regime detection, Daily for meso setup, 4H for micro entry. |
| Preferred contracts | ZN (10-year), ZF (5-year) | N/A | Best liquidity-to-volatility ratio for PCTT. ZB is viable but more volatile. ZT (2-year) has too little volatility for meaningful PCTT setups in most environments. |

---

## Chapter 24: The Universal Instrument Adaptation Framework

The preceding chapters cover the major instrument classes. But markets evolve, new instruments emerge, and traders may encounter asset classes not explicitly covered. This chapter provides a systematic framework for adapting PCTT parameters to any new instrument.

### 24.1 The 6-Step Adaptation Protocol

For any new instrument class:

**Step 1: Calculate the historical ATR profile.**

Pull at least 500 bars of data on your intended trading timeframe. Calculate the 14-period ATR across the entire sample. Record the mean, standard deviation, 5th percentile, 25th percentile, 75th percentile, and 95th percentile. This tells you the volatility regime you are dealing with.

**Step 2: Measure the average daily range / spread ratio.**

Calculate: `viability_ratio = average_daily_range / average_spread`

If `viability_ratio < 10`, the instrument is NOT viable for PCTT. Spread friction will consume too large a fraction of each trade's profit potential. Most major instruments clear this threshold easily (ES: ~500:1, EUR/USD: ~200:1, BTC: ~300:1). Exotic forex pairs and thinly traded altcoins may fail it, especially on shorter timeframes.

**Step 3: Identify session structure.**

Is it session-based (equities), multi-session (forex, futures), or continuous (crypto)? Map the session boundaries, identify peak and low liquidity windows, and determine whether ATR should be calculated using all-hours data or session-specific data.

**Step 4: Run 200-bar regime detection.**

Apply the ER + Crossing Count regime classifier across the most recent 200 bars. Determine whether the instrument is currently trending, transitional, ranging, or choppy. This gives you the baseline regime context for initial parameter selection.

**Step 5: Set initial parameters at DEFAULT, then apply conditional adjustments.**

Start with the complete default parameter table from Chapter 9. Then apply these rules:

| Condition | Adjustment |
|:----------|:-----------|
| `avg_spread / ATR > 0.05` | Raise dGeom minimum to 1.0 ATR. Spread cost is material. |
| `avg_spread / ATR > 0.10` | Instrument likely not viable. Proceed with extreme caution or skip. |
| `daily_range > 3%` | Reduce position size by 50%. Increase break confirmation buffer (beta_c) by 50%. |
| `daily_range > 5%` | Reduce position size by 75%. This is crypto-level volatility. |
| `24-hour market` | Apply session-aware ATR. Use peak-session data only for ATR calculation on intraday timeframes. |
| `No centralized volume` | Disable volume confirmation as a required gate. Demote to optional. |
| `Session-based (defined hours)` | Apply session filter. Avoid first and last 15-30 minutes of session. |
| `Futures with expiration` | Add roll protocol. Exit 5 days before first notice date. |
| `High gap risk (Student's t df < 6)` | Reduce overnight position risk by 50%. Tighten max daily risk. |

**Step 6: Walk-forward calibrate over 100 trades.**

Run the adapted parameters through a 100-trade walk-forward test on historical data. Use a 70/30 train/test split. Measure:

- Win rate on test set
- Average R:R on test set
- Profit factor on test set
- Maximum drawdown on test set
- Degradation ratio: `(train_sharpe - test_sharpe) / train_sharpe`

If degradation ratio > 0.30, the parameters are overfit to the training data. Simplify by moving parameters closer to the defaults. If profit factor on the test set < 1.0, the instrument may not be viable for PCTT, or the parameters need further adjustment.

### 24.2 Python Implementation: instrument_parameter_adapter()

```python
def instrument_parameter_adapter(
    historical_prices: list,
    historical_atr: list,
    average_spread: float,
    has_sessions: bool,
    session_start_hour: int = None,
    session_end_hour: int = None,
    has_volume: bool = True,
    has_expiration: bool = False,
    is_24h: bool = False
) -> dict:
    """
    Given historical data and instrument characteristics,
    return adapted PCTT parameters.

    Args:
        historical_prices: List of close prices (min 500 bars)
        historical_atr: List of 14-period ATR values (same length)
        average_spread: Average bid-ask spread in price units
        has_sessions: True if instrument has defined trading hours
        session_start_hour: Session start hour (ET) if has_sessions
        session_end_hour: Session end hour (ET) if has_sessions
        has_volume: True if centralized volume data is available
        has_expiration: True if the instrument is a futures contract
        is_24h: True if the instrument trades 24/7
    Returns:
        Dictionary of adapted PCTT parameters
    """
    import numpy as np

    # Start with defaults
    params = {
        'pivot_L': 2,
        'pivot_R': 2,
        'atr_period': 14,
        'q_score_a': 0.70,
        'q_score_b': 0.55,
        'break_beta_p': 0.10,
        'break_beta_c': 0.15,
        'volume_required': has_volume,
        'retest_window_M': 12,
        'retest_gamma': 0.20,
        'd_geom_max': 2.5,
        'd_geom_min': 0.5,
        'trail_atr_trending': 2.0,
        'trail_atr_transitional': 1.5,
        'time_stop_bars': 20,
        'max_risk_per_trade': 0.01,
        'position_size_mult': 1.0,
        'session_filter': None,
        'roll_protocol': has_expiration,
    }

    # Calculate instrument metrics
    prices = np.array(historical_prices)
    atr = np.array(historical_atr)
    avg_atr = np.mean(atr)
    avg_price = np.mean(prices)
    atr_pct = avg_atr / avg_price

    # Daily range as percentage
    daily_range_pct = atr_pct  # ATR approximates daily range

    # Spread/ATR ratio
    spread_atr_ratio = average_spread / avg_atr if avg_atr > 0 else 1.0

    # Viability check
    viability_ratio = avg_atr / average_spread if average_spread > 0 else 999
    if viability_ratio < 10:
        params['viable'] = False
        params['viability_warning'] = (
            f'Viability ratio {viability_ratio:.1f} < 10. '
            f'Instrument likely not profitable for PCTT.'
        )
    else:
        params['viable'] = True

    # Adjustment 1: Spread-based dGeom floor
    if spread_atr_ratio > 0.10:
        params['d_geom_min'] = 1.5
        params['position_size_mult'] = 0.25
    elif spread_atr_ratio > 0.05:
        params['d_geom_min'] = 1.0
        params['position_size_mult'] = 0.50

    # Adjustment 2: High volatility
    if daily_range_pct > 0.05:
        params['position_size_mult'] *= 0.25
        params['break_beta_c'] = 0.25
        params['trail_atr_trending'] = 2.5
        params['trail_atr_transitional'] = 2.0
    elif daily_range_pct > 0.03:
        params['position_size_mult'] *= 0.50
        params['break_beta_c'] = 0.20
        params['trail_atr_trending'] = 2.5
        params['trail_atr_transitional'] = 2.0

    # Adjustment 3: 24-hour market
    if is_24h:
        params['pivot_L'] = max(params['pivot_L'], 3)
        params['pivot_R'] = max(params['pivot_R'], 3)
        params['session_atr_note'] = (
            'Use peak-session hours only for ATR calculation '
            'on intraday timeframes.'
        )

    # Adjustment 4: No volume
    if not has_volume:
        params['volume_required'] = False
        params['volume_note'] = (
            'No centralized volume available. '
            'Volume confirmation disabled.'
        )

    # Adjustment 5: Session filter
    if has_sessions and session_start_hour is not None:
        # Skip first and last 30 minutes
        filter_start = session_start_hour + 0.5
        filter_end = session_end_hour - 0.5
        params['session_filter'] = {
            'start_hour_et': filter_start,
            'end_hour_et': filter_end
        }

    # Adjustment 6: Futures roll
    if has_expiration:
        params['roll_exit_days_before_notice'] = 5
        params['roll_no_new_positions_days'] = 7

    # Adjustment 7: Low volatility instruments
    if daily_range_pct < 0.005:
        params['trail_atr_trending'] = 3.0
        params['trail_atr_transitional'] = 2.5
        params['time_stop_bars'] = 30
        params['max_risk_per_trade'] = 0.005
        params['low_vol_note'] = (
            'Low-volatility instrument. Wider trails, longer time stops. '
            'Use leverage cautiously.'
        )

    # Calculate effective max risk
    params['effective_max_risk'] = (
        params['max_risk_per_trade'] * params['position_size_mult']
    )

    return params
```

### 24.3 Post-Calibration Monitoring

After deploying PCTT on a new instrument with adapted parameters, monitor these metrics over the first 50 trades:

| Metric | Acceptable Range | Action if Outside |
|:-------|:----------------|:------------------|
| Win rate | 35-55% (HE mode), 70-87% (HWR mode) | If below 35%, tighten Q-Score thresholds by 0.05 |
| Average R:R | > 1.5:1 (HE mode), > 0.8:1 (HWR mode) | If below, widen trail multiplier by 0.5 |
| Profit factor | > 1.2 | If below 1.0, halt and re-evaluate viability |
| Max drawdown | < 10% | If > 10%, reduce position_size_mult by 50% |
| Average bars in trade | 5-25 bars | If > 25, shorten time stop. If < 5, stops may be too tight. |
| Spread cost / average win | < 15% | If > 15%, instrument may not be viable on this timeframe. Move to a longer timeframe. |

If the instrument passes all 50-trade monitoring thresholds, it is validated for ongoing PCTT trading with the adapted parameters. Review parameters again after 200 trades and during each quarterly parameter audit.

---

*End of Part VI: Instrument-Specific PCTT Trading*
