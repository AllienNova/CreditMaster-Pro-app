# Law 4: The Law of Liquidity Gravity

## Statement
Price gravitates toward liquidity pools. Large clusters of resting orders (stops, limits) act as attractors. When liquidity is consumed or withdrawn, price moves violently through liquidity voids.

## Detection
- **Order book depth imbalance:** Bid/ask depth ratio > 3:1 or < 1:3 signals directional liquidity pull
- **Volume profile gaps:** Low-volume nodes (LVN) on volume profile mark liquidity voids where price will move fast
- **Spread widening:** Bid-ask spread > 2x normal = liquidity withdrawal in progress
- **Stop cluster estimation:** Prior swing highs/lows with high volume = likely stop-loss clusters acting as magnets

## Action Rules
- WHEN price approaches high-volume node (HVN): Expect slowdown, absorption, possible reversal. Take partial profits
- WHEN price enters low-volume node (LVN): Expect acceleration. Do NOT enter new positions mid-void. Wait for the next HVN
- WHEN spread widens > 2x average: Reduce position size, use limit orders only, avoid market orders
- NEVER: Use market orders during liquidity voids or after-hours. Slippage will destroy your edge

## Regime Applicability
- **Trending:** Price sweeps stop clusters in trend direction, then gravitates to next liquidity pool. Trail stops behind HVNs
- **Ranging:** Price oscillates between two HVN liquidity pools (support/resistance). Trade the bounces
- **Shock:** Liquidity evaporates. Voids dominate. Flash crash dynamics. Only pre-placed limit orders at extreme levels work

## Connected Laws
- Law 9 (Information Decay): Liquidity events create short-lived information with fast decay
- Law 10 (Time Delays): Liquidity withdrawal creates delayed fills, slippage
- Law 11 (Structural Levels): Structural levels ARE liquidity concentrations
- Law 25 (Transaction Costs): Liquidity conditions directly determine transaction costs

## Key Numbers
- May 6, 2010 Flash Crash: Dow dropped 998.5 points (9.2%) in minutes as liquidity evaporated
- $1 trillion in market value erased and restored within 36 minutes
- During the Flash Crash, some stocks traded at $0.01 (Accenture) due to complete liquidity voids
- Average bid-ask spread widens 5-10x during liquidity crises vs. normal conditions

## Violation Cost
During the May 6, 2010 Flash Crash, Procter and Gamble shares dropped from $60 to $39.37 in minutes as liquidity evaporated. Traders using market orders in the liquidity void received fills 35% below fair value, losing millions on executions that would have been fine 5 minutes later.
