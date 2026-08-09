# Law 20: The Law of Backtest Illusion

## Statement
Every backtest is an optimistic estimate of future performance. Look-ahead bias, survivorship bias, curve-fitting, and unrealistic execution assumptions create a systematic gap between backtested and live performance.

## Detection
- **Backtest-to-live ratio:** Measure live performance / backtest performance. Typical ratio: 0.3-0.5x (live is 30-50% of backtest)
- **Parameter sensitivity:** If changing a parameter by 10% causes > 30% performance change, the system is overfit
- **Degrees of freedom check:** Parameters / Trades ratio > 1:10 = likely overfit. Target < 1:20
- **Out-of-sample degradation:** If out-of-sample Sharpe < 50% of in-sample Sharpe, overfitting is present

## Action Rules
- WHEN backtesting: Always reserve 30% of data for out-of-sample validation. Never peek at the holdout set
- WHEN deploying a backtested strategy: Expect 40-60% performance degradation. Size positions accordingly
- WHEN backtest shows Sharpe > 3.0: Almost certainly overfit. Real-world Sharpe > 2.0 is extremely rare. Investigate
- NEVER: Optimize parameters on the full dataset. Always use walk-forward analysis with rolling in-sample/out-of-sample windows

## Regime Applicability
- **Trending:** Trend-following backtests are more robust (fewer parameters, physics-based). Apply 30% haircut to backtest
- **Ranging:** Mean-reversion backtests are more fragile (more parameters, pattern-based). Apply 50% haircut to backtest
- **Shock:** Crisis strategies cannot be reliably backtested (too few events). Use Monte Carlo simulation and theoretical justification instead

## Connected Laws
- Law 16 (Expectancy): Backtested expectancy overestimates true expectancy. Apply a decay factor
- Law 17 (Statistical Significance): Backtests inflate significance through data-mining
- Law 19 (Edge Decay): Backtests cannot predict future edge decay
- Law 25 (Transaction Costs): Backtests systematically underestimate transaction costs, especially slippage

## Key Numbers
- The average backtest-to-live performance ratio across hedge funds: 0.4x (live = 40% of backtest)
- Marcos Lopez de Prado: "Most backtested strategies are false positives." Estimates > 90% of backtested edges are noise
- Walk-forward analysis reduces overfitting by 60-80% compared to single in-sample optimization
- Realistic slippage assumptions reduce backtest profitability by 20-40% for intraday strategies

## Violation Cost
A quantitative hedge fund raised $200 million based on a backtest showing 45% annual returns over 10 years. The strategy used 15 optimized parameters on 180 trades (1:12 ratio, borderline overfit). In its first year of live trading, the fund returned -22%, a $44 million loss. The "edge" existed only in the historical data where parameters were cherry-picked to fit noise.
