# Law 10: The Law of Time Delays

## Statement
Every trading signal, indicator, and system operates with inherent time delays. Moving averages are rear-view mirrors. The tradeoff between signal smoothness and latency is fundamental and unavoidable.

## Detection
- **Indicator lag measurement:** Compare signal trigger time to actual price turn. EMA(20) lags by ~10 bars; SMA(50) lags by ~25 bars
- **Group delay calculation:** For any filter, group delay = (period - 1) / 2 for SMA. Shorter periods = less lag but more noise
- **Fill latency:** Time between order submission and fill. > 100ms in equities = significant for intraday strategies
- **Signal-to-noise ratio vs. lag:** Plot SNR against delay for each indicator. Find the optimal tradeoff for your timeframe

## Action Rules
- WHEN using MA crossovers: Add leading indicators (momentum, volume) to reduce effective lag by 3-5 bars
- WHEN execution delay > expected: Switch from market orders to aggressive limit orders, adjust slippage model
- WHEN multiple indicators confirm with different lag profiles: Higher confidence (fast + slow agreement reduces false signals)
- NEVER: Use a 200-period indicator for intraday timing decisions. The lag exceeds the trade horizon

## Regime Applicability
- **Trending:** Lagging indicators work well because the trend persists. Accept the lag, avoid whipsaws
- **Ranging:** Lagging indicators generate whipsaws. Use oscillators (lower lag) or reduce indicator periods by 50%
- **Shock:** All indicators lag the shock. Price moves faster than any signal. Pre-placed orders and rules-based responses are the only defense

## Connected Laws
- Law 9 (Information Decay): Delay in acting on information compounds decay losses
- Law 15 (Signal Filtration): Filtering adds lag. Every filter has a latency cost
- Law 25 (Transaction Costs): Execution delay IS a transaction cost
- Law 26 (Complexity Decay): More complex systems have more delay sources

## Key Numbers
- Knight Capital lost $440 million in 45 minutes on August 1, 2012, due to a software deployment delay/error
- SMA(20) average lag: 10 bars. EMA(20) average lag: ~7 bars. Hull MA(20) lag: ~4 bars
- The smoothness-latency frontier: halving lag doubles false signal rate (approximately)
- Optimal indicator period for day trading: 8-21 bars. Swing trading: 20-50 bars. Position trading: 50-200 bars

## Violation Cost
Knight Capital Group lost $440 million in 45 minutes on August 1, 2012, when a software deployment error caused their automated system to execute with no delay controls. The system sent millions of errant orders, moving prices against itself repeatedly. The company was bankrupt within days, proving that unmanaged time delays in execution can destroy a firm overnight.
