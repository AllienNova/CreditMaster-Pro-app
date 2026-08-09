# Law 25: The Law of Transaction Costs

## Statement
Transaction costs (spreads, commissions, slippage, market impact) are the silent killer of trading systems. A strategy with 0.1% edge per trade that costs 0.15% per trade has negative expectancy. Costs are certain; profits are probabilistic.

## Detection
- **Cost-adjusted expectancy:** Recalculate expectancy after deducting realistic spread + slippage + commission per trade. If negative, the strategy is unprofitable
- **Break-even cost analysis:** Maximum allowable cost per trade = raw expectancy per trade. If actual costs > this, strategy is dead
- **Slippage measurement:** Track actual fill price vs. expected fill price over 50+ trades. Average slippage > 0.1% on equities = problem
- **Frequency-cost ratio:** Higher frequency = higher total cost burden. Daily trading at 0.05% round-trip cost = 12.5% annual cost drag

## Action Rules
- WHEN strategy has < 0.2% edge per trade: Only viable with institutional execution (< 0.05% total cost). Retail cost structure kills it
- WHEN trading frequency > 5x per day: Slippage becomes dominant cost. Use limit orders exclusively. Measure actual vs. theoretical fills
- WHEN spread > 50% of expected profit: The asset is too illiquid for the strategy. Switch to more liquid instruments
- NEVER: Backtest without realistic transaction costs. Add at minimum: 0.5x spread as slippage + actual commission + 0.01% market impact

## Regime Applicability
- **Trending:** Lower frequency trading (weeks to months). Transaction costs minimal. Focus on entry/exit quality
- **Ranging:** Higher frequency trading (days to weeks). Transaction costs significant. Must be incorporated in every backtest
- **Shock:** Spreads widen 5-10x. Slippage increases dramatically. Transaction costs can exceed 1% per trade. Reduce trading frequency. Use limit orders only

## Connected Laws
- Law 9 (Information Decay): Speed of information decay determines if paying higher execution costs for speed is justified
- Law 10 (Time Delays): Execution delay IS slippage cost
- Law 16 (Expectancy): Transaction costs directly reduce expectancy. Must be subtracted before position sizing
- Law 20 (Backtest Illusion): Backtests systematically underestimate transaction costs

## Key Numbers
- Average bid-ask spread: S&P 500 stocks ~0.02%, small caps ~0.5-2%, crypto ~0.1-0.5%
- Realistic slippage for retail: 0.5x spread per side minimum
- A scalping strategy trading 20x/day at 0.05% cost per trade = 250% annual cost drag
- Break-even trading frequency: if edge is 0.3% per trade and cost is 0.05%, maximum viable frequency is ~daily

## Violation Cost
A systematic trader backtested a scalping strategy showing 85% annual returns with zero slippage assumptions. In live trading with actual spreads (0.03%), slippage (0.02%), and commissions (0.01%), the 0.06% round-trip cost on 15 trades per day consumed 225% annually. The strategy that "made" 85% in backtesting lost 140% annualized in live trading. Transaction costs turned a winner into a catastrophe.
