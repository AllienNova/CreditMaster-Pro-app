# Law 1: The Law of Market Inertia

## Statement
A market's prevailing regime (trending or mean-reverting) persists until a statistically significant structural break occurs. Positive autocorrelation confirms trend continuation; its decay signals regime change.

## Detection
- **Serial autocorrelation (lag-1):** > 0.05 on daily returns confirms trending regime; near zero or negative signals mean-reversion
- **ADX reading:** > 25 confirms directional trend persistence; < 20 indicates range-bound/no trend
- **Hurst exponent:** > 0.55 indicates trend persistence; < 0.45 indicates mean-reversion; 0.45-0.55 is random walk
- **Structural break test:** Chow test or CUSUM on rolling 50-bar window; p < 0.05 flags regime shift

## Action Rules
- WHEN ADX > 25 AND autocorrelation > 0.05: Deploy trend-following strategies, trail stops, let winners run
- WHEN ADX declining from > 30 toward 20: Tighten stops, reduce position size by 50%, prepare for regime shift
- WHEN structural break detected (CUSUM breach): Flatten all trend positions within 2 bars, reassess regime
- NEVER: Fade a persistent trend solely because "it's gone too far." Inertia kills counter-trend traders

## Regime Applicability
- **Trending:** This law is the defining law of trending markets. Maximum relevance. Ride inertia with trailing stops at 2x ATR
- **Ranging:** Inertia is weak or absent. Autocorrelation near zero. Shift to mean-reversion tactics (Law 5)
- **Shock:** External force breaks inertia violently. The regime shift IS the structural break this law warns about. Flatten immediately

## Connected Laws
- Law 2 (Feedback Loops): Positive feedback reinforces inertia; negative feedback breaks it
- Law 3 (Volatility Compression): Compression precedes the force that breaks current inertia
- Law 8 (Market Regimes): Inertia persistence is regime-dependent; this law defines the trending regime
- Law 13 (Momentum): Momentum is the measurable expression of inertia

## Key Numbers
- Tesla short-sellers lost $38 billion in 2020 fighting inertia (Chanos, Einhorn, Burry)
- Trends persist 60-70% of the time once ADX exceeds 30
- Average trend duration before structural break: 47 trading days (equities), 23 days (FX)
- Autocorrelation above 0.10 on daily data is statistically significant at 95% confidence for series > 250 bars

## Violation Cost
Tesla short-sellers collectively lost $38 billion in 2020 by fighting one of the strongest momentum regimes in modern markets. Jim Chanos, David Einhorn, and Michael Burry all suffered massive losses betting against persistent inertia, proving that even legendary investors bleed when they fight Newton's First Law of markets.
