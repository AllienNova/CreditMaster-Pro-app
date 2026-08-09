# Law 28: The Law of Adaptation

## Statement
Markets evolve. Strategies must evolve with them. The traders who survive long-term are not the smartest or the boldest; they are the most adaptive. Rigid systems are fragile; adaptive systems are antifragile.

## Detection
- **Strategy performance decay:** Rolling 6-month Sharpe declining consistently for 12+ months = adaptation needed
- **Regime mismatch frequency:** If strategy triggers in "wrong" regimes > 30% of the time, the regime detection model needs updating
- **Market microstructure changes:** Spread compression, volume pattern shifts, new participant types (HFT, passive flows) = structural market evolution
- **Correlation structure shift:** If inter-asset correlations change persistently from historical norms, the market has evolved

## Action Rules
- WHEN strategy performance decays for 12+ months: Initiate systematic review. Test if edge has decayed (Law 19) or if regime has shifted (Law 8)
- WHEN new market regime is identified: Adjust strategy parameters within pre-defined bounds. Do NOT add new parameters (Law 26)
- WHEN market microstructure changes fundamentally (e.g., decimalization, HFT entry): Re-validate all execution assumptions and slippage models
- NEVER: Change your strategy during a drawdown without systematic analysis. Adaptation must be data-driven, not panic-driven

## Regime Applicability
- **Trending:** Adaptive systems adjust trend-following sensitivity based on volatility and autocorrelation regime
- **Ranging:** Adaptive systems adjust mean-reversion thresholds based on current range width and volatility
- **Shock:** The ultimate test of adaptation. Pre-built crisis playbooks activate automatically. Post-crisis: review and update all models

## Connected Laws
- Law 8 (Market Regimes): Adaptation IS regime-appropriate strategy selection
- Law 19 (Edge Decay): Edge decay triggers the need for adaptation
- Law 26 (Complexity Decay): Adaptation should simplify, not complexify. Adjust parameters, don't add them
- Law 30 (Survival): Adaptation is the primary mechanism of long-term survival

## Key Numbers
- Renaissance Technologies (Medallion Fund): 66% average annual returns for 30+ years through continuous adaptation
- Average strategy lifespan without adaptation: 3-7 years before edge decays to zero
- Jim Simons hired 90+ PhDs to continuously discover and adapt strategies as old ones decayed
- Markets evolve approximately every 3-5 years as participant composition and technology shift

## Violation Cost
Long-Term Capital Management's rigid mean-reversion models, calibrated on 1994-1997 data, could not adapt to the 1998 Russian debt crisis. Their models assumed correlations and spreads would revert to historical norms. They did not. LTCM lost $4.6 billion and nearly crashed the global financial system because their system was brilliant but rigid, incapable of adapting to a market that had fundamentally changed.
