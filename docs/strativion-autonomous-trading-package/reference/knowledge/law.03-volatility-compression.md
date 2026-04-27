# Law 3: The Law of Volatility Compression (Energy States)

## Statement
Volatility clusters in time. Low-volatility compression is followed by high-volatility expansion. The magnitude of expansion correlates positively with the duration and tightness of compression. This is captured by GARCH models.

## Detection
- **Bollinger Band width:** Percentile rank < 10th percentile of 120-day lookback = extreme compression; breakout imminent
- **ATR ratio:** Current 5-period ATR / 50-period ATR < 0.5 = significant compression
- **VIX term structure:** VIX < 12 with flat/inverted term structure = systemic compression (market-wide)
- **GARCH conditional variance:** Declining conditional variance for > 15 consecutive bars = spring loading

## Action Rules
- WHEN Bollinger width at 6-month low AND ATR ratio < 0.5: Prepare breakout strategies, set alerts at band edges, buy straddles/strangles
- WHEN compression persists > 20 bars: Size the breakout trade proportional to compression duration (longer compression = larger expected move)
- WHEN VIX < 13 for > 30 days: Reduce portfolio delta, buy tail protection (OTM puts), expect Volmageddon-type event
- NEVER: Sell options during extreme compression. You are selling a loaded spring for pennies

## Regime Applicability
- **Trending:** Compression within a trend (consolidation) precedes continuation moves. Trade the breakout in the trend direction
- **Ranging:** Compression in a range precedes range expansion. Direction unknown. Use straddles or wait for breakout confirmation
- **Shock:** This is what compression releases INTO. The shock IS the expansion. Once in shock, this law has already fired

## Connected Laws
- Law 1 (Market Inertia): Compression breaks inertia or reloads it
- Law 7 (Fat Tails): Compression releases create the fat tail events
- Law 8 (Market Regimes): Compression is a regime transition signal
- Law 19 (Edge Decay): Compression breakout edges are among the most persistent because they are physics-based, not pattern-based

## Key Numbers
- VIX was at historic lows (9.14) in November 2017; Volmageddon hit February 5, 2018, VIX spiked 115% in one day
- XIV (inverse VIX ETN) lost 96% of its value overnight, wiping out $1.8 billion
- Bollinger Band squeezes at the 5th percentile precede moves > 2x ATR within 10 bars 78% of the time
- Average compression-to-expansion ratio: 1:3 (20 days of compression yields ~60 days of expansion)

## Violation Cost
Investors in the XIV inverse volatility ETN lost $1.8 billion on February 5, 2018 (Volmageddon) when a historically compressed VIX exploded 115% in a single session. Selling volatility during extreme compression is picking up pennies in front of a freight train that is guaranteed to arrive.
