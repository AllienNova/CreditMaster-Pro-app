# Law 5: The Law of Mean Reversion (Equilibrium)

## Statement
Prices oscillate around equilibrium values (moving averages, fair value estimates). Extreme deviations from equilibrium create reversion pressure. The magnitude and speed of reversion depend on the deviation's statistical significance.

## Detection
- **Z-score from 20-day mean:** > 2.0 or < -2.0 signals statistically significant deviation; reversion probability > 70%
- **RSI extremes:** RSI(14) > 80 or < 20 on daily timeframe = overextended; > 90 or < 10 = extreme
- **Bollinger Band penetration:** Price closing > 2 consecutive bars outside 2-sigma bands = mean-reversion setup
- **Ornstein-Uhlenbeck half-life:** Calculated half-life < 10 bars = strong mean-reversion tendency for that instrument

## Action Rules
- WHEN Z-score > 2.5 AND RSI > 80 AND in ranging regime: Enter mean-reversion short with stop at 3.5 sigma
- WHEN Z-score < -2.5 AND RSI < 20 AND in ranging regime: Enter mean-reversion long with stop at -3.5 sigma
- WHEN deviation is extreme BUT regime is trending (ADX > 30): Do NOT fade. Trending overrides reversion
- NEVER: Trade mean-reversion during confirmed positive feedback loops (Law 2). LTCM tried this and lost $4.6 billion

## Regime Applicability
- **Trending:** Mean reversion is DANGEROUS. Deviations expand, not revert. Pullbacks to the mean are buying/selling opportunities WITH the trend, not against it
- **Ranging:** Mean reversion is the dominant strategy. Fade extremes, target the mean. Win rate 65-75%
- **Shock:** Temporary extreme deviations. Mean reversion works AFTER the shock stabilizes (3-5 days), not during it

## Connected Laws
- Law 1 (Market Inertia): Inertia overrides mean reversion in trending markets
- Law 2 (Feedback Loops): Negative feedback IS mean reversion; positive feedback overwhelms it
- Law 8 (Market Regimes): Mean reversion only works in the correct regime
- Law 14 (Path Dependency): HOW price deviated from the mean affects reversion behavior

## Key Numbers
- LTCM lost $4.6 billion in 1998 when mean-reversion bets diverged further instead of converging
- Z-score > 3.0 reverts within 10 bars 82% of the time in ranging regimes
- Ornstein-Uhlenbeck half-life for S&P 500: approximately 15-20 trading days
- Mean-reversion strategies show Sharpe ratios of 1.5-2.5 in ranging regimes, -0.5 to -1.5 in trending regimes

## Violation Cost
Long-Term Capital Management lost $4.6 billion in 1998 by assuming convergence trades would mean-revert on schedule. Their positions diverged further as the Russian debt crisis created positive feedback that overwhelmed equilibrium forces, ultimately requiring a $3.6 billion Federal Reserve-orchestrated bailout.
