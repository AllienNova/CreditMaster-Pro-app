# Chapter 70: When Giants Fall: Post-Mortems on Spectacular Blow-Ups

## The Autopsy Room

On a whiteboard in the risk management department of every major bank, there should be a single sentence: **Concentrated risk, excessive leverage, ignored warnings, inevitable catalyst.**

That is the formula. Every catastrophic trading blow-up in modern history follows it. Not most of them. All of them. The names change. The asset classes rotate. The specific instruments evolve from bonds to swaps to crypto tokens. But the underlying physics never changes. It is the same equation producing the same result, over and over, while each new generation of traders convinces itself that this time the rules do not apply.

The historical record is merciless on this point. Long-Term Capital Management in 1998. Amaranth Advisors in 2006. Bear Stearns in 2008. MF Global in 2011. The pattern repeats with the regularity of a metronome. LTCM levered Nobel Prize-winning models at 25:1 and lost $4.6 billion in four months. Amaranth concentrated 50% of its $9.2 billion fund in natural gas spreads and lost $6.6 billion in a single week. Bear Stearns loaded its balance sheet with mortgage-backed securities at 33:1 leverage and ceased to exist after 85 years in business. MF Global, under former Goldman Sachs CEO Jon Corzine, bet $6.3 billion on European sovereign debt at 30:1 leverage and filed for bankruptcy on October 31, 2011, making it the eighth-largest corporate bankruptcy in U.S. history at that time.

Every single one follows the formula on the whiteboard. Every single one.

This chapter dissects three of the most spectacular blow-ups of the last decade. Each case study follows the same forensic format: the setup, the precise timeline, the exact positions, the laws violated, and what a systematic 30-Law compliance check would have flagged before the collapse. Think of it as a physics lab report on three separate experiments that all tested the same hypothesis: can you concentrate risk, lever it up, ignore the warning signs, and survive?

The hypothesis failed every time. The question is whether it had to.

> **THE PHYSICS:** Every catastrophic blow-up is a chain reaction. Concentrated risk is the fissile material. Leverage is the neutron multiplier. Ignored warnings are the failure to insert control rods. And the catalyst is the stray neutron that starts the chain reaction. Remove any one element and the reactor stays stable. Leave them all in place and the meltdown is not a possibility. It is a certainty.

Let us open the autopsy room.

---

> **FACT-CHECK SIDEBAR: VERIFIABLE CLAIMS IN THIS CHAPTER**
>
> 1. **Archegos leverage and losses.** Bill Hwang's Archegos Capital built over $30 billion in notional exposure through total return swaps. Credit Suisse lost $5.5 billion; Nomura lost $2.9 billion. Hwang was convicted on 10 of 11 counts in July 2024. *Sources: SEC Complaint 22-cv-3402 (April 2022); DOJ Indictment, Southern District of New York (April 2022); Credit Suisse Q1 2021 earnings report; Nomura Holdings Q4 FY2021 press release; Reuters, "Bill Hwang found guilty of fraud and market manipulation," July 10, 2024.*
>
> 2. **OptionSellers.com collapse.** James Cordier's firm managed approximately $150 million across 290 client accounts. Natural gas futures surged approximately 18% in a single session on November 14, 2018 (Henry Hub front-month contract moved from approximately $3.62 to $4.84 intraday, though the prior day's close was approximately $4.10, making the close-to-close move roughly 18%). The 33% figure represents the cumulative multi-day rally from early-November levels near $3.62. All client accounts were liquidated by the clearing broker, INTL FC Stone (now StoneX). *Sources: CFTC enforcement action against OptionSellers.com; NFA records; EIA Natural Gas Weekly Update, November 15, 2018.*
>
> 3. **Three Arrows Capital cascade.** 3AC managed approximately $10 billion at peak. The fund owed Genesis Trading $2.36 billion and Voyager Digital $661 million (15,250 BTC plus $350 million USDC). A BVI court ordered liquidation on June 27, 2022. Total creditor claims exceeded $3.5 billion. *Sources: Voyager Digital court filings, Chapter 11 Case No. 22-10943; Genesis Trading creditor filings; Financial Times, "Three Arrows Capital: the hedge fund that crashed crypto lending," July 2022.*
>
> 4. **Luna/UST collapse timeline.** UST depegged on May 7, 2022, falling from $1.00 to $0.69 by May 9. Luna token supply expanded from 345 million to over 6.5 trillion. Luna price fell from $80 to $0.00001. *Sources: CoinGecko historical data; Terraform Labs bankruptcy filings; Chainalysis "The 2022 Crypto Crime Report."*
>
> 5. **LTCM, Amaranth, Bear Stearns, MF Global.** LTCM lost $4.6 billion in 1998 at 25:1 leverage. Amaranth lost $6.6 billion in September 2006. Bear Stearns collapsed in March 2008 at 33:1 leverage. MF Global filed for bankruptcy on October 31, 2011, after a $6.3 billion bet on European sovereign debt. *Sources: Roger Lowenstein, "When Genius Failed" (2000); U.S. Senate Permanent Subcommittee on Investigations, "Excessive Speculation in the Natural Gas Market" (2007); SEC Bear Stearns report; MF Global Chapter 11 filing, Case No. 11-15059.*

---


## Case Study 1: Archegos Capital Management

### The Architect of Invisible Risk

Bill Hwang was not a newcomer. He had spent years at Julian Robertson's Tiger Management, one of the most respected hedge funds in history, before founding Tiger Asia Management in 2001. In 2012, the SEC charged Tiger Asia with insider trading and wire fraud related to Chinese bank stocks. Hwang's firm paid $44 million in penalties and was forced to convert to a family office. That family office became Archegos Capital Management.

The family office structure mattered enormously. Unlike hedge funds, family offices face almost no disclosure requirements. They do not file 13F reports with the SEC. They do not have outside investors demanding transparency. Hwang could build any position he wanted, in any size, with zero public visibility.

And he did.

By early 2021, Archegos had approximately $10 billion in capital. But $10 billion was not enough for Hwang's conviction. He used total return swaps (TRS), a type of derivative contract where a bank agrees to pay the total return of a stock in exchange for a financing fee. The critical feature of TRS contracts: the bank holds the actual stock. Hwang never appeared on any shareholder registry. His name appeared on no public filings. He was, in effect, invisible.

Through TRS contracts with six different prime brokers (Goldman Sachs, Morgan Stanley, Credit Suisse, Nomura, Deutsche Bank, and Wells Fargo), Hwang built notional exposure exceeding $30 billion. His leverage ratio was approximately 5:1 on concentrated positions in a handful of stocks: ViacomCBS (VIAC), Discovery (DISCA), Baidu (BIDU), GSX Techedu (GSX), Tencent Music (TME), and a few others.

Here is where the physics gets dangerous. No single prime broker knew the full picture. Goldman Sachs saw its slice. Morgan Stanley saw its slice. Credit Suisse saw its slice. None of them could see the aggregate. Hwang's total position in ViacomCBS alone may have exceeded 50% of the company's available float. One man, through derivatives, effectively controlled the price of a $30 billion media company. And nobody knew.

### The Timeline: Seven Days That Destroyed $20 Billion

**Monday, March 22, 2021.** ViacomCBS announced a $3 billion stock offering and a $1 billion convertible note offering, diluting existing shareholders. The stock dropped 9% in a single session, falling from $91.25 to approximately $83.00. For most investors, this was an annoyance. For Hwang, with leveraged exposure potentially exceeding $10 billion in ViacomCBS alone, it triggered massive margin pressure.

**Tuesday through Thursday, March 23 to 25.** Archegos received margin calls from multiple prime brokers simultaneously. The margin calls demanded that Hwang post additional collateral to cover the declining value of his positions. He could not meet them. With $10 billion in actual capital supporting $30 billion in notional exposure, there was no cushion. Every dollar of decline required additional margin that simply did not exist.

Behind the scenes, the prime brokers attempted to coordinate. Goldman Sachs reportedly tried to organize an orderly unwind. The idea was simple: if all the banks sold Archegos positions gradually, market impact would be manageable. But coordination requires trust, and trust requires time. They had neither.

**Friday, March 26.** Goldman Sachs and Morgan Stanley decided to act unilaterally. They did not wait for a coordinated plan. Starting in the pre-market session, Goldman and Morgan began dumping Archegos positions in enormous block trades. The numbers were staggering. Approximately $19 billion in stocks changed hands in a single session through block trades, many executed at steep discounts to the previous close.

ViacomCBS dropped from $66 to $48, a 27% decline in one day. Discovery fell from $66 to $42, losing 36% of its value. Baidu dropped 7%. Tencent Music fell 15%. The block trades were so large they overwhelmed normal market liquidity, creating the exact cascading price collapse that the prime brokers had feared.

**Monday, March 29.** Credit Suisse and Nomura, slower to act than Goldman and Morgan, were left holding the bag. The positions they had not yet liquidated had already collapsed in value. Credit Suisse eventually reported losses of $5.5 billion from its Archegos exposure. Nomura lost $2.9 billion. Goldman Sachs, by moving first and fastest, escaped with minimal damage (approximately $10 million in losses). Morgan Stanley lost roughly $911 million but avoided catastrophe by acting on Friday rather than waiting.

**Total damage across all parties:** Wall Street firms reported a combined ~$10 billion in direct losses (Credit Suisse $5.5B, Nomura $2.9B, Morgan Stanley ~$0.9B, UBS $0.77B, MUFG $0.30B). When Archegos's own destroyed capital and the market-cap losses on its concentrated positions (ViacomCBS, Discovery, Baidu, Tencent Music) are added, combined damage to all parties exceeded $20 billion.

Bill Hwang and former Archegos CFO Patrick Halligan were indicted in April 2022 on charges of racketeering, fraud, and market manipulation. In July 2024, a federal jury found Hwang guilty on 10 of 11 counts. Halligan was convicted on all charges.

The regulatory aftermath reshaped prime brokerage risk management across Wall Street. Credit Suisse, already weakened by the Greensill Capital scandal earlier in 2021, fired its head of prime services and its chief risk officer. The Swiss bank's board commissioned an external investigation by law firm Paul Weiss, which produced a damning 172-page report documenting systematic failures in risk oversight. Credit Suisse never fully recovered from the reputational and financial damage. By March 2023, a crisis of confidence triggered by unrelated losses forced the Swiss government to orchestrate an emergency takeover by UBS for $3.25 billion, a fraction of Credit Suisse's book value. While Archegos was not the sole cause of Credit Suisse's demise, the $5.5 billion loss and the exposed risk management failures accelerated the bank's decline.

The SEC also responded. In February 2022, the commission proposed new rules requiring large hedge funds and family offices to report significant positions through amended Form PF filings. The "Archegos rules," as industry participants began calling them, aimed to close the visibility gap that had allowed Hwang to build a $30 billion position without any single regulator or counterparty seeing the full picture.

### The Laws That Would Have Saved Archegos

**Law 21 (Position Sizing):** Five-to-one leverage on concentrated stock positions violates every principle of rational position sizing. The Kelly Criterion, even under the most generous assumptions about edge, would never recommend concentrating 300% of capital in a single stock. At 5:1 leverage, a 20% decline in the portfolio wipes out all equity. Hwang was one bad week away from zero at all times. He just did not know which week it would be.

**Law 24 (Systemic Correlation):** Archegos held concentrated positions in growth and media stocks. ViacomCBS, Discovery, Baidu, GSX Techedu, and Tencent Music all shared exposure to the same factors: growth sentiment, streaming sector optimism, and Chinese tech valuations. When one position came under pressure, all of them did. There was zero diversification. The portfolio was a single bet wearing six different costumes.

**Law 29 (Probability of Ruin):** At 5:1 leverage, the probability of ruin over any meaningful time horizon approaches 1.0. This is not opinion. It is mathematics. The gambler's ruin theorem tells us that for any leveraged portfolio facing random shocks, the absorbing barrier at zero will eventually be hit if leverage exceeds the threshold set by the edge size. Hwang's edge, if it existed at all, could not support 5:1 leverage on concentrated, correlated positions.

**Law 22 (Invalidation):** The ViacomCBS stock offering on March 22 was a clear invalidation signal. When a company issues new shares, it dilutes existing shareholders and signals that management believes the stock is richly valued (why else would they sell?). For a leveraged bull position, a major dilutive offering is one of the clearest possible invalidation events. Hwang did not cut the position. He held it through the offering, through the first margin call, through the second margin call, until there was nothing left to hold.

**Law 2 (Feedback Loops):** Leveraged positions create vicious feedback loops on the way down. As prices fall, margin calls force selling, which pushes prices lower, which triggers more margin calls, which forces more selling. This is a positive feedback loop (deviation amplifying) that converts an orderly decline into a cascade. The same mechanism that amplified Hwang's gains on the way up destroyed him on the way down, faster and more violently.

### What the 30-Law Framework Would Have Flagged

A systematic compliance check would have raised five red flags before the first dollar was lost.

1. **Position sizing alarm:** Single-name concentration exceeding 50% of capital (Law 21 violation, critical severity).
2. **Correlation alarm:** All positions sharing growth/media factor exposure with correlation above 0.7 (Law 24 violation, high severity).
3. **Leverage alarm:** Notional exposure at 5:1 with concentrated positions (Law 29 violation, critical severity).
4. **Invalidation trigger:** ViacomCBS stock offering as structural thesis invalidation (Law 22 violation, requiring immediate position reduction).
5. **Feedback loop warning:** Leveraged positions with multiple counterparties creating cascade risk (Law 2 warning, systemic).

Any one of these flags, if acted upon, would have reduced the eventual losses. Acting on all five would have prevented the blow-up entirely.


## Case Study 2: OptionSellers.com

### The Seductive Math of "97% Win Rate"

James Cordier founded OptionSellers.com, a managed futures firm based in Tampa, Florida. His strategy was straightforward and, to the uninitiated, compelling: sell naked options on commodities, specifically far out-of-the-money call and put options on natural gas, crude oil, and agricultural futures. The logic was seductive. Most options expire worthless. Academic research confirms this. By selling options with very low probability of being exercised (3% to 5% probability), Cordier collected steady premiums month after month. His marketing materials highlighted the "97% probability of profit" on individual trades.

Cordier attracted high-net-worth clients, many of whom were retirees looking for steady income. Minimum account sizes ranged from $250,000 to $1 million. By November 2018, OptionSellers.com managed approximately $150 million across roughly 290 client accounts cleared through INTL FC Stone (now StoneX).

The strategy had a flaw that every student of the 30 laws would recognize instantly: the 97% figure described the probability of any single trade being profitable. It said nothing about the magnitude of the 3% that lost. And in that 3%, the losses were theoretically unlimited.

Selling a naked call option means agreeing to sell a commodity at a specific price (the strike) if the market rises above that level. If natural gas is trading at $3.50 and you sell a call option with a $4.50 strike, you collect a premium (perhaps $500 per contract) and hope the gas stays below $4.50. If gas rises to $5.00, you owe the difference: $5,000 per contract. If it rises to $10.00, you owe $55,000 per contract. If it rises to $20.00, you owe $155,000 per contract. There is no ceiling. The premium collected ($500) is all you can ever earn. The loss is bounded only by how high the market goes.

This is the purest possible violation of Law 23 (Asymmetric Damage). Limited upside. Unlimited downside. The strategy works until it does not, and when it stops working, it destroys everything.

### The Catalyst: November 14, 2018

Natural gas futures (Henry Hub, ticker NG) had traded in a relatively calm range throughout most of 2018. Prices fluctuated between $2.50 and $3.20 per MMBtu for the first nine months of the year. In late October, prices began climbing as early winter weather forecasts turned colder than expected. By November 1, natural gas had reached $3.30. By November 8, it had climbed to $3.62. The move was notable but not alarming.

Then the forecasts changed dramatically.

On November 13, updated weather models projected an unprecedented early-season cold snap across the eastern United States. Temperatures were expected to plunge 15 to 20 degrees below normal across the major gas-consuming regions. Heating demand forecasts spiked. Gas traders began scrambling for long positions to cover anticipated demand.

**November 14, 2018.** Natural gas futures surged approximately 18% in a single session, part of a larger multi-day spike that saw prices climb over 30% from their early-November levels near $3.62. The front-month contract closed at $4.84 per MMBtu, up from the prior day's close of approximately $4.10. Prices were driven by a combination of cold weather forecasts, short covering (traders who had sold gas were buying back to limit losses), and technical breakouts through key resistance levels. In volatility terms, even the single-session move was a multi-standard-deviation event relative to the trailing 30-day realized volatility.

Cordier's naked call options, many with strikes between $4.00 and $4.50, went from comfortably out-of-the-money to deeply in-the-money within hours. The losses were not gradual. They were instantaneous and catastrophic.

INTL FC Stone (now StoneX), the clearing broker for OptionSellers.com client accounts, began automatic liquidation procedures. When account equity falls below margin requirements, the clearing broker does not call and negotiate. Its systems liquidate positions immediately at market prices. On November 14, "market prices" meant the worst possible execution. Clients were liquidated at the top of a parabolic spike, locking in maximum losses.

**November 15, 2018.** James Cordier posted a video to YouTube. In it, visibly emotional, he apologized to his clients. "I've let you down," he said. The video went viral within hours. It became one of the most-watched financial disaster videos on the internet, with millions of views across platforms.

The damage was total. Every client account was wiped out. Not just to zero. Many accounts went negative, meaning clients owed the clearing broker money beyond their initial investment. Some clients lost more than 100% of their capital. The $150 million under management was gone. OptionSellers.com was finished.

### The Laws That Would Have Prevented This

**Law 7 (Fat Tails):** Natural gas is one of the most volatile commodities in the world. It exhibits extreme kurtosis (fat tails) in its return distribution. Five-sigma moves happen in natural gas futures roughly once every two to three years, not once every 14,000 years as a normal distribution would predict. Selling naked options on a fat-tailed asset is the equivalent of building a house in a flood zone and declining to buy insurance. The flood will come. The only question is when.

**Law 23 (Asymmetric Damage):** Naked option selling creates the most extreme risk-reward asymmetry in all of finance. Maximum gain per contract: the premium collected (a few hundred dollars). Maximum loss per contract: theoretically infinite. A strategy built on this asymmetry is not a strategy. It is a delayed catastrophe. The 97% win rate is irrelevant because the 3% loss obliterates everything the 97% accumulated. This is the classic "picking up nickels in front of a steamroller" problem, and the steamroller always wins eventually.

**Law 29 (Probability of Ruin):** The probability of ruin for a naked option seller over a long enough time horizon is 1.0. This is mathematical certainty. The ruin formula depends on the ratio of average win to average catastrophic loss, and for naked options, that ratio is horrifying. Cordier needed roughly 200 consecutive winning months to recover from one catastrophic loss. He did not get them.

**Law 30 (Survival):** The supreme law. Survival is the prerequisite for everything else. A strategy that produces steady income for years but has a guaranteed ruin event at some point in the future is not a strategy. It is a countdown. Cordier's 97% win rate was real. His clients made money most months. But the strategy was fundamentally incompatible with survival because it contained a structural ruin event that could not be hedged, diversified, or managed away.

**Law 3 (Volatility Compression):** Natural gas had been in a low-volatility environment for months before November 2018. The 30-day realized volatility was compressed. Law 3 states explicitly that low-volatility compression is followed by high-volatility expansion, and the magnitude of the expansion correlates with the duration of the compression. Selling volatility at the end of a compression cycle is the worst possible timing. The spring was fully loaded.

### The Numbers That Tell the Full Story

Here is the arithmetic that every client should have demanded before investing.

Average monthly premium collected per contract: approximately $500. Number of winning months needed to offset one month where gas moves $3.00 against you (loss of $30,000 per contract): 60 months. That is five years of perfect execution to offset a single bad month. And in natural gas, a $3.00 move in a single month is not a black swan. It has happened multiple times in the last two decades. November 2018 saw a move of $1.22 in a single day.

The math never worked. It only looked like it worked because the catastrophic event had not happened yet.

### The Aftermath: Regulatory and Legal Consequences

The CFTC and NFA (National Futures Association) had already taken action against Cordier before the blowup. In 2014, the NFA had fined OptionSellers.com $150,000 for misleading promotional materials that overstated the safety of naked option selling. Cordier continued operating with essentially the same strategy and the same marketing pitch.

After the November 2018 collapse, clients filed a class-action lawsuit against Cordier, his firm, and the clearing broker. The clearing broker countered that its margin policies were clearly disclosed and that Cordier, as the registered investment advisor, bore responsibility for position sizing. The CFTC filed a civil enforcement action against Cordier in May 2020, seeking restitution and trading bans.

The case illustrates a crucial point about survivorship bias in strategy selection. For every James Cordier who blew up publicly, dozens of smaller naked option sellers had been quietly wiped out before him. The strategy's apparent track record was an artifact of selection. The survivors looked brilliant. The failures disappeared from the data. Only when the failure was public and spectacular did the inherent flaw become visible to the broader market. This is precisely the mechanism Law 20 (Backtest Illusion) warns about. A strategy that has survived is not the same as a strategy that is safe. It may simply be a strategy that has not yet encountered its specific destroyer.


## Case Study 3: Three Arrows Capital

### The Crypto Kings Who Forgot About Gravity

Su Zhu and Kyle Davies met at Phillips Academy Andover, one of the most prestigious boarding schools in the United States. Both went on to careers in traditional finance before founding Three Arrows Capital (3AC) in 2012, initially as a small fund trading emerging market FX. By 2020, they had pivoted fully to cryptocurrency, and the timing was impeccable. The 2020-2021 crypto bull market turned 3AC into a colossus. At its peak in late 2021, the fund managed approximately $10 billion in assets.

3AC's strategy combined concentrated directional bets on cryptocurrency with leveraged yield farming across decentralized finance (DeFi) protocols. The fund took large positions in Bitcoin, Ethereum, staked ETH (stETH), Grayscale Bitcoin Trust (GBTC), and the Terra/Luna ecosystem. The leverage was layered and opaque. 3AC borrowed from centralized lenders (Genesis Trading, Voyager Digital, BlockFi, Celsius Network), used those funds to take leveraged positions on exchanges, and then used the exchange positions as collateral to borrow more.

The total leverage ratio was never precisely known. Post-collapse estimates range from 3:1 to 5:1, but the true figure may have been higher due to hidden DeFi positions.

Two positions deserve special attention because they illustrate the specific laws that 3AC violated.

**The GBTC Trade.** Grayscale Bitcoin Trust historically traded at a premium to its net asset value (NAV) because it was one of the few institutional vehicles for Bitcoin exposure. 3AC borrowed Bitcoin, deposited it into GBTC (which had a six-month lock-up period), and planned to sell the GBTC shares at a premium once unlocked. This was a legitimate arbitrage strategy. Until it was not. In early 2021, as Bitcoin ETF anticipation grew, the GBTC premium flipped to a discount. By late 2021, GBTC traded at a 20% to 30% discount to NAV. 3AC's GBTC position became an anchor, losing money and locked up with no exit.

**The Luna/UST Position.** 3AC invested approximately $200 million in the Terra ecosystem, specifically in Luna tokens and UST, an algorithmic stablecoin pegged to $1.00. UST maintained its peg through a mechanism that allowed holders to swap 1 UST for $1.00 worth of Luna tokens. The system worked as long as confidence held. When confidence broke, it became a death spiral.

### The Timeline: From Empire to Liquidation

**May 7 to 13, 2022.** Large withdrawals from Anchor Protocol, a DeFi lending platform on the Terra blockchain offering 20% yields on UST deposits, triggered the initial UST depegging. On May 7, UST slipped from $1.00 to $0.98. The Luna Foundation Guard (LFG) deployed $1.5 billion in Bitcoin reserves to defend the peg. It was not enough. By May 9, UST had dropped to $0.69. The algorithmic mechanism designed to restore the peg began minting enormous quantities of Luna to absorb UST selling pressure. Luna's supply exploded from 345 million tokens to over 6.5 trillion tokens in days. Luna's price collapsed from $80 to $0.00001. UST fell to $0.10.

3AC's $200 million Luna/UST position went to zero. Complete loss. No recovery. No restructuring. Zero.

**May to June 2022.** Bitcoin dropped from approximately $40,000 in early May to $18,000 by mid-June, a 55% decline. Ethereum fell from $2,900 to $880, a 70% decline. 3AC's leveraged Bitcoin and Ethereum positions were liquidated across multiple exchanges. The fund also held approximately 220,000 stETH (staked Ethereum) tokens, which began trading at a persistent 5% to 8% discount to regular ETH as liquidity dried up. Every asset in the portfolio was cratering simultaneously.

**June 14 to 16, 2022.** 3AC failed to meet margin calls from multiple lenders. Genesis Trading had $2.36 billion in loans outstanding to 3AC. Voyager Digital had lent 3AC 15,250 Bitcoin and $350 million in USDC, totaling approximately $661 million. BlockFi had exposure of approximately $80 million. Celsius, itself already under extreme stress, had significant indirect exposure.

**June 27, 2022.** A British Virgin Islands court ordered the liquidation of Three Arrows Capital after a petition from creditor Deribit, a crypto derivatives exchange.

**July 1, 2022.** 3AC filed for Chapter 15 bankruptcy protection in a U.S. court. Total creditor claims eventually exceeded $3.5 billion.

### The Cascade: When One Domino Topples Them All

The 3AC collapse did not occur in isolation. It triggered a chain reaction that nearly destroyed the entire crypto lending industry.

**Genesis Trading** halted withdrawals after revealing $175 million stuck in an FTX trading account (FTX itself collapsed five months later) and billions in exposure to 3AC. Genesis's parent company, Digital Currency Group, was forced to absorb $1.1 billion in liabilities. Genesis filed for bankruptcy in January 2023.

**Voyager Digital** filed for Chapter 11 bankruptcy on July 5, 2022, citing 3AC's failure to repay its $661 million loan. Voyager had approximately 3.5 million customers whose assets were frozen.

**Celsius Network** filed for Chapter 11 bankruptcy on July 13, 2022, revealing a $1.19 billion hole in its balance sheet. Celsius had approximately 1.7 million customers and owed depositors $4.7 billion.

**BlockFi** narrowly avoided immediate collapse through a $400 million credit facility from FTX. That lifeline proved temporary. When FTX collapsed in November 2022, BlockFi filed for bankruptcy on November 28.

3AC's own trading losses were approximately $4.2 billion over 2021-2022, with creditor claims totaling $3.5 billion in the bankruptcy. When contagion losses to Voyager (~$670 million owed to 3AC), Celsius, BlockFi, Genesis Trading (~$2.36 billion lent to 3AC), and other lenders are included — along with frozen customer funds across those collapsed platforms — the total ecosystem damage from the 3AC cascade exceeded $20 billion. Two men who met at boarding school had inadvertently triggered the equivalent of a financial earthquake across an entire industry.

Su Zhu and Kyle Davies fled Singapore after 3AC's liquidation, becoming the subject of an international search by liquidators from advisory firm Teneo. Both men were eventually located. In September 2023, Zhu was arrested at Changi Airport in Singapore while attempting to board a flight. A Singapore court sentenced him to four months in prison for contempt of court and failure to cooperate with liquidators. Davies remained at large for months longer before being apprehended. As of early 2025, the liquidation process was still ongoing, with creditors having recovered only a fraction of the $3.5 billion owed.

The 3AC collapse also forced a fundamental reassessment of counterparty risk in crypto lending. Before June 2022, crypto lenders extended credit to large funds based largely on reputation and trading volume rather than rigorous collateral requirements. Genesis Trading, despite being one of the most sophisticated institutional players in crypto, had lent $2.36 billion to 3AC without adequate collateral controls. The industry's lending practices resembled 19th-century banking more than 21st-century risk management. After the cascade of bankruptcies, surviving crypto lenders implemented proof-of-reserves audits, stricter collateral ratios, and real-time monitoring of borrower positions. The lessons were expensive. They cost roughly $20 billion in aggregate.

### The Laws That Would Have Prevented This

**Law 2 (Feedback Loops):** Leveraged cryptocurrency positions create the most violent feedback loops in modern finance. When BTC drops, leveraged longs get liquidated. Liquidations are market sell orders that push the price lower. Lower prices trigger more liquidations. The cycle accelerates until there is nothing left to liquidate. 3AC was not just caught in this loop. It was one of the largest contributors to it. The fund's own liquidations pushed prices down, which triggered more liquidations across the industry, which pushed prices down further.

**Law 7 (Fat Tails):** Luna going from $80 to $0.00001 was an extinction-level fat-tail event. No Gaussian model would assign any meaningful probability to a top-20 cryptocurrency losing 99.99999% of its value in six days. But in cryptocurrency, where assets have no earnings, no cash flows, and no recovery mechanisms, such events are not anomalies. They are a feature of the asset class. 3AC treated Luna as if tail risk did not exist. The tail existed. It ate the fund.

**Law 21 (Position Sizing):** At estimated 3:1 to 5:1 leverage across the portfolio, 3AC was violating basic position sizing principles. The Kelly Criterion for a cryptocurrency portfolio with realistic volatility and edge estimates would recommend leverage well below 2:1. At 3:1 or higher, the probability of ruin dominates the probability of compounding. Size killed 3AC more than direction. If the fund had held the same positions at 1:1 (unlevered), it would have suffered severe losses but survived.

**Law 24 (Systemic Correlation):** Every position in 3AC's portfolio was cryptocurrency. Bitcoin, Ethereum, stETH, Luna, GBTC. During a crypto bull market, these positions look diversified because they perform differently in terms of magnitude. During a crypto bear market, they all go down together. Correlation spikes toward 1.0 in a crisis (this is one of the most robust empirical findings in all of finance). 3AC's "diversified" crypto portfolio was a single bet on the crypto market going up, multiplied by leverage.

**Law 26 (Complexity Decay):** 3AC layered complexity upon complexity. Algorithmic stablecoin mechanisms. Staked ETH with liquidity risk. GBTC arbitrage with six-month lock-ups. DeFi yield farming on protocols with smart contract risk. Each layer added hidden risk that was invisible during good times and catastrophic during bad times. Complexity did not create edge. It created fragility.

### What the 30-Law Framework Would Have Flagged

1. **Correlation alarm:** All positions in a single asset class, crypto, with crisis correlation approaching 1.0 (Law 24, critical severity).
2. **Leverage alarm:** Estimated 3:1 to 5:1 on assets with 80% to 100% annual volatility (Law 21/29, critical severity).
3. **Fat-tail alarm:** $200 million position in an algorithmic stablecoin with no collateral backing (Law 7, extreme severity).
4. **Complexity alarm:** GBTC lock-up risk, stETH liquidity risk, DeFi smart contract risk layered simultaneously (Law 26, high severity).
5. **Feedback loop warning:** Leveraged positions across a thinly capitalized market creating cascade liquidation risk (Law 2, systemic severity).


## The Pattern: Physics Does Not Negotiate

Here is what all three blow-ups share, laid out in a single table.

| Factor | Archegos | OptionSellers | Three Arrows Capital |
|---|---|---|---|
| **Primary Laws Violated** | Law 21, 24, 29 | Law 7, 23, 29 | Law 2, 7, 21, 24 |
| **Leverage** | 5:1 | Unlimited (naked options) | 3 to 5:1 (estimated) |
| **Diversification** | None (6 correlated stocks) | None (natural gas only) | None (all crypto) |
| **Warning Signs Ignored** | ViacomCBS stock offering | Weather forecast shift | Luna/UST depeg beginning |
| **Time to Destruction** | 1 week | 1 day | 6 weeks |
| **Total Ecosystem Losses** | ~$10B direct to banks + $20B+ including Hwang's capital and stock market-cap losses | $150 million+ | $4.2B fund losses / $3.5B+ creditor claims / $20B+ including contagion |
| **Cascading Damage** | $5.5B Credit Suisse, $2.9B Nomura | Client accounts negative | $20B+ across Voyager, Genesis, Celsius, BlockFi |

The pattern is always the same: **concentration plus leverage plus ignored warnings plus catalyst equals catastrophe.** This is not a guideline. It is a physical law. It operates with the same inevitability as gravity.

Remove any one element and the outcome changes fundamentally. With diversification, Archegos survives the ViacomCBS decline because no single stock can destroy the portfolio. Without naked options, Cordier survives the natural gas spike because his losses are bounded. Without leverage, Three Arrows Capital survives the crypto winter because unlevered losses, however painful, do not trigger liquidation cascades and bankruptcy.

Here is the deeper lesson, and it comes straight from physics. These were not failures of prediction. None of these firms needed to predict the ViacomCBS offering, the cold snap, or the Luna collapse. They needed to survive them. The laws do not ask you to see the future. They ask you to build a system that does not blow up regardless of what the future brings.

Hwang, Cordier, and Zhu/Davies all made the same fundamental error. They optimized for return and forgot about ruin. They designed systems that produced maximum returns in normal conditions and guaranteed destruction in abnormal conditions. The 30 laws reverse this priority. They optimize first for survival (Law 30), then for return. The difference between these two approaches is the difference between compounding wealth over decades and making a tearful apology on YouTube.

### The Four-Point Stress Test

Any portfolio can be checked against the blow-up pattern in 60 seconds.

**Question 1: Concentration.** Is more than 25% of capital exposed to a single position, sector, or correlated cluster? If yes, reduce. Archegos, OptionSellers, and 3AC would all fail this test immediately.

**Question 2: Leverage.** Does total notional exposure exceed 2:1 for equities, 1.5:1 for commodities, or 1:1 for crypto? If yes, delever. All three case studies operated well beyond these thresholds.

**Question 3: Invalidation.** Is there a predefined event or price level that would force a reduction in risk? If no, define one. Hwang had no invalidation trigger for the ViacomCBS offering. Cordier had no stop-loss on naked options. 3AC had no exit plan for the Luna depeg.

**Question 4: Survival.** If every position in the portfolio moves against you simultaneously by two standard deviations, does the portfolio survive? If no, restructure until it does. None of the three case studies would survive even a one-standard-deviation correlated shock.

Four questions. Sixty seconds. And they would have prevented over $40 billion in combined losses.

### A Worked Example: Applying the Stress Test

Consider a hypothetical portfolio on March 1, 2021, structured similarly to Archegos but run through the four-point stress test.

**Portfolio:** $10 million in capital. Positions in five growth/media stocks via total return swaps. Leverage at 5:1, creating $50 million in notional exposure. Largest single position (ViacomCBS) at 35% of notional.

**Question 1 (Concentration):** ViacomCBS at 35% of notional. Fails immediately. The test demands reduction to 25% maximum. Action: trim ViacomCBS from $17.5 million to $12.5 million notional, redistributing across uncorrelated sectors.

**Question 2 (Leverage):** Total notional at 5:1. Fails immediately. For equities, the threshold is 2:1. Action: reduce total notional from $50 million to $20 million, a 60% reduction in exposure.

**Question 3 (Invalidation):** No predefined exit triggers. Fails. Action: set invalidation at a 15% decline in ViacomCBS from cost basis, and at any dilutive equity offering by any position's underlying company.

**Question 4 (Survival):** A two-standard-deviation correlated move in growth/media stocks is approximately 18% to 22% over a one-week period. At 5:1 leverage, an 18% portfolio decline equals a 90% loss of equity. Complete failure. At the corrected 2:1 leverage with diversification, the same 18% decline equals a 36% equity drawdown. Painful but survivable.

After applying all four corrections, the hypothetical portfolio holds $20 million in notional across at least four uncorrelated sectors, with explicit stop-losses and invalidation triggers. When ViacomCBS announces its stock offering on March 22, the invalidation trigger fires automatically. The position closes at a manageable loss. The portfolio survives. The trader trades again the next day.

That is the difference between a system and a gamble.


## What Comes Next

These blow-ups happened to professionals. Bill Hwang had decades of experience under Julian Robertson. James Cordier had been trading options for over 20 years. Su Zhu and Kyle Davies had backgrounds in institutional finance. Experience did not save them because experience without a framework is just pattern recognition waiting to meet a new pattern.

When the broader market enters crisis mode, even properly managed portfolios face extraordinary stress. Flash crashes evaporate liquidity in seconds. Circuit breaker halts freeze markets mid-cascade. Correlation spikes turn diversified portfolios into concentrated ones. Liquidity vacuums mean your stop-loss sits unfilled while prices gap through it.

The next chapter provides specific playbooks for trading during these market dislocations. Not theory. Not principles. Step-by-step protocols: what to do in the first 60 seconds of a flash crash, how to manage positions when circuit breakers halt trading, how to identify and trade the recovery after a correlation spike, and how to protect capital when liquidity evaporates. The laws told us what to believe. The blow-ups told us what happens when we ignore them. The playbooks tell us what to do when the impossible happens anyway.
