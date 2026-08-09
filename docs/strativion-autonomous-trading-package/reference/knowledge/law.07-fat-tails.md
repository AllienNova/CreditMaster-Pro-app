# Law 7: The Law of Fat Tails

## Statement
Market returns are not normally distributed. Extreme events (crashes, melt-ups) occur far more frequently than Gaussian models predict. A 20-sigma event under normal distribution assumptions happens regularly in markets.

## Detection
- **Kurtosis:** Excess kurtosis > 3 on rolling 60-day returns = fat tails present (equities typically show 5-20)
- **Tail ratio:** Frequency of > 3-sigma moves vs. Gaussian expectation. Ratio > 5x = significant fat tails
- **VIX/realized vol spread:** VIX > 1.5x 20-day realized vol = market pricing tail risk
- **Options skew:** 25-delta put skew > 10 vol points above 25-delta call = market pricing left tail fear

## Action Rules
- WHEN kurtosis rising AND VIX term structure inverting: Buy tail protection (OTM puts at 5-10 delta), reduce gross exposure by 25-50%
- WHEN implied skew is historically cheap (< 25th percentile): Buy crash protection. This is insurance at a discount
- WHEN a 3+ sigma event occurs: Expect clustering (fat tail events cluster). Do NOT assume "it's over." Reduce risk further
- NEVER: Use Value-at-Risk (VaR) based on normal distribution as your sole risk measure. It will underestimate tail risk by 5-10x

## Regime Applicability
- **Trending:** Fat tails are compressed but still present. Trend reversals create left-tail events. Maintain tail hedges
- **Ranging:** Moderate tail risk. Kurtosis near baseline. Standard risk management applies
- **Shock:** Fat tails are REALIZED. This is the event you were hedging for. Execute crisis playbook, do not freeze

## Connected Laws
- Law 3 (Volatility Compression): Compression precedes fat-tail events
- Law 23 (Asymmetric Damage): Fat tails on the left side cause asymmetric portfolio damage
- Law 24 (Systemic Correlation): Fat-tail events cause correlation spikes
- Law 29 (Probability of Ruin): Fat tails are the primary driver of unexpected ruin

## Key Numbers
- Black Monday (October 19, 1987): Dow dropped 22.6%, a 20+ sigma event under Gaussian assumptions
- Under normal distribution, a 20-sigma event should occur once every 10^89 years. It happened in 1987, 2008, 2010, 2020
- Equity markets show excess kurtosis of 5-20 on daily returns (Gaussian = 0)
- Portfolio insurance failures in 1987 cost over $100 billion industry-wide

## Violation Cost
On Black Monday (October 19, 1987), portfolio insurance strategies based on Gaussian risk models failed catastrophically, turning a decline into a 22.6% crash. The Dow lost $500 billion in a single day. Every model that assumed normal distribution was wrong by orders of magnitude, and the traders who relied on them had no hedges when they needed them most.
