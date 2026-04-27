# Law 17: The Law of Statistical Significance

## Statement
A trading edge must be tested over a sufficient sample size to distinguish skill from luck. A backtest with 20 trades proves nothing. Statistical significance requires understanding of p-values, confidence intervals, and the multiple comparisons problem.

## Detection
- **Minimum sample size:** 100+ trades for initial edge validation. 500+ for confidence. 30 trades is NOT statistically significant
- **t-test on returns:** t-statistic > 2.0 (p < 0.05) suggests the edge is real, not random. > 2.58 (p < 0.01) = strong evidence
- **Confidence interval width:** If 95% CI for expected return includes zero, the edge is NOT proven
- **Multiple comparisons correction:** If testing N strategies, significance threshold becomes p < 0.05/N (Bonferroni correction)

## Action Rules
- WHEN t-statistic > 2.0 on 100+ out-of-sample trades: Edge is likely real. Deploy with half-Kelly sizing
- WHEN backtest shows great results on < 50 trades: Do NOT deploy. Insufficient evidence. Collect more data via paper trading
- WHEN testing multiple strategies simultaneously: Apply Bonferroni correction. Testing 20 strategies means using p < 0.0025, not p < 0.05
- NEVER: Publish or deploy a strategy based on in-sample results alone. Out-of-sample validation is mandatory

## Regime Applicability
- **Trending:** Trend-following generates fewer, larger trades. Need longer observation period to reach significance. 2-3 years minimum
- **Ranging:** Mean-reversion generates more, smaller trades. Reaches significance faster. 6-12 months may suffice
- **Shock:** Too few observations. Cannot establish statistical significance for crisis strategies from backtests alone. Rely on theoretical justification

## Connected Laws
- Law 16 (Expectancy): Statistical significance tells you if the measured expectancy is real or noise
- Law 20 (Backtest Illusion): Backtests inflate significance through data-mining, look-ahead, and survivorship bias
- Law 19 (Edge Decay): Even statistically significant edges decay. Significance at time T does not guarantee significance at T+1
- Law 26 (Complexity Decay): Complex strategies have more parameters, requiring larger samples for significance

## Key Numbers
- 5-sigma threshold in physics (Higgs boson discovery): p < 0.0000003. Trading uses 2-sigma (p < 0.05), much weaker
- With 20 trades, a 60% win rate is NOT significantly different from 50% (p = 0.41). With 200 trades, it IS (p = 0.003)
- The p-hacking crisis: 50%+ of published finance strategies fail to replicate out of sample
- Harvey, Liu, and Zhu (2016): Most "discovered" factors in finance are false positives from multiple testing

## Violation Cost
A hedge fund raised $500 million based on a 3-year backtest showing 40% annual returns. The strategy was tested on only 36 trades (one per month) with no multiple comparisons correction across the 200+ variants tested. In live trading, the fund lost 28% in its first year. Investors lost $140 million because the "edge" was statistical noise that passed a threshold only through data-mining.
