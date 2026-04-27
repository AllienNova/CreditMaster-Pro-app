# Law 8: The Law of Market Regimes

## Statement
Markets operate in distinct regimes (trending, mean-reverting, volatile/crisis). Each regime has different statistical properties. Strategies that work in one regime fail in another. Regime identification is the master skill.

## Detection
- **ADX-based regime:** ADX > 25 = trending; ADX < 20 = ranging; VIX > 30 = crisis/volatile
- **Hidden Markov Model (HMM):** 3-state HMM on returns + volatility. State probabilities > 0.7 = confident regime classification
- **60-Second Regime Check:** (1) ADX direction, (2) VIX level, (3) 200-day MA slope, (4) correlation regime
- **Regime transition signals:** ADX crossing 25 (either direction), VIX crossing 20 or 30, 200-day MA flattening

## Action Rules
- WHEN trending regime confirmed (ADX > 25, clear MA alignment): Deploy trend-following only. Disable mean-reversion
- WHEN ranging regime confirmed (ADX < 20, flat MAs): Deploy mean-reversion only. Disable trend-following
- WHEN crisis regime (VIX > 30, correlation spike): Reduce gross exposure 50-75%, activate crisis playbook, tail hedges active
- NEVER: Run a strategy designed for one regime in another regime. This is the single most expensive mistake in trading

## Regime Applicability
- **Trending:** THIS IS a defined regime. All trend strategies active. Mean-reversion off
- **Ranging:** THIS IS a defined regime. All mean-reversion strategies active. Trend-following off
- **Shock:** THIS IS a defined regime. Only crisis alpha and tail hedge strategies active. All normal strategies suspended

## Connected Laws
- Law 1 (Market Inertia): Defines the trending regime
- Law 3 (Volatility Compression): Signals regime transitions
- Law 5 (Mean Reversion): Defines the ranging regime
- Law 19 (Edge Decay): Edges are regime-specific; what works in one regime decays when regime shifts
- Law 28 (Adaptation): Adaptation IS regime-appropriate strategy selection

## Key Numbers
- Markets spend approximately 30% of time trending, 60% ranging, 10% in crisis
- Strategy applied in wrong regime: average Sharpe ratio of -0.8 (negative)
- Regime transitions take 3-10 days on average
- VIX regime thresholds: < 15 (calm), 15-20 (normal), 20-30 (elevated), > 30 (crisis)

## Violation Cost
In 2008, quantitative equity funds running mean-reversion strategies during what became a trending crisis regime lost 30-40% in weeks. Goldman Sachs Global Alpha fund lost $1.6 billion by failing to detect the regime shift from ranging to crisis, applying the exact wrong strategy as correlations spiked and trends accelerated downward.
