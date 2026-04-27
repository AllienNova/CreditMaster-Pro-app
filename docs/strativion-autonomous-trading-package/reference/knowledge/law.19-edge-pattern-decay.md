# Law 19: The Law of Edge and Pattern Decay

## Statement
Every trading edge decays over time as it becomes known and exploited by other market participants. Patterns that worked in 2005 may not work in 2025. The market is an adaptive adversary.

## Detection
- **Rolling Sharpe ratio:** Declining Sharpe over 2+ year rolling window = edge decay in progress
- **Alpha decay curve:** Plot strategy alpha over time. If alpha halves every 3-5 years, decay is following standard entropy curve
- **Crowding indicators:** Strategy correlation with peer fund returns increasing = crowding (more participants, less alpha)
- **Published edge test:** If a strategy has been published in a major journal or book, assume 50-80% of edge has decayed within 5 years

## Action Rules
- WHEN rolling Sharpe declines > 30% from peak over 2 years: Initiate strategy review. Edge may be decaying
- WHEN strategy alpha turns negative for 6+ months: Suspend strategy. Research whether the edge is temporarily dormant (regime) or permanently decayed
- WHEN a strategy you use gets published widely: Expect 50% alpha reduction within 2-3 years. Begin developing replacement
- NEVER: Assume a strategy will work forever. Every edge has a half-life. Budget R&D time for continuous edge development

## Regime Applicability
- **Trending:** Trend-following edges decay slowest (physics-based, not pattern-based). Still viable after 100+ years
- **Ranging:** Mean-reversion edges at specific patterns decay fastest. Patterns get arbitraged away
- **Shock:** Crisis alpha strategies have the longest half-life because few participants can execute them (requires pre-positioned hedges)

## Connected Laws
- Law 8 (Market Regimes): Some "edge decay" is actually regime change. Distinguish between the two
- Law 17 (Statistical Significance): Decayed edges lose statistical significance. Monitor t-statistics over time
- Law 26 (Complexity Decay): Complex edges decay faster because they are more fragile
- Law 28 (Adaptation): Adaptation is the response to edge decay

## Key Numbers
- The January Effect (small-cap outperformance in January) declined from 8% excess return (1926-1983) to < 1% after publication
- Simple MA crossover strategies: Sharpe declined from 0.8 (1960s-1980s) to 0.2 (2000s-2020s)
- Average published edge half-life: 3-7 years post-publication
- Renaissance Technologies' Medallion Fund: 66% annual returns for 30+ years by continuously discovering new edges as old ones decay

## Violation Cost
The January Effect, documented by Rozeff and Kinney in 1976, generated 8%+ annual excess returns for small caps. After widespread publication and adoption, the effect shrank to under 1% by the 2000s. Traders who allocated capital to the January Effect in 2010 based on 1980s research earned essentially zero excess return while bearing full concentration risk.
