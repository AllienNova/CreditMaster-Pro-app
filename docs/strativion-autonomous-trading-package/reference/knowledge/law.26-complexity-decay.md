# Law 26: The Law of Complexity Decay

## Statement
Adding complexity to a trading system produces diminishing returns and eventually negative returns. The optimal system is the simplest one that captures the core edge. Over-optimization is the enemy of robustness.

## Detection
- **Parameter count:** Total number of adjustable parameters in the system. < 5 = simple/robust; 5-10 = moderate; > 10 = fragile
- **Degrees of freedom ratio:** Trades / Parameters. Must be > 20:1 for robustness. < 10:1 = likely overfit
- **Parameter sensitivity:** Change any parameter by 20%. If performance changes > 30%, the system is fragile
- **In-sample vs. out-of-sample gap:** If in-sample Sharpe is 2x out-of-sample Sharpe, complexity is causing overfitting

## Action Rules
- WHEN designing a system: Start with the simplest version (1-2 rules). Add complexity only when it improves out-of-sample performance by > 10%
- WHEN system has > 7 parameters: Conduct a parameter reduction audit. Remove parameters one at a time. Keep only those that improve OOS results
- WHEN in-sample performance greatly exceeds out-of-sample: Remove the most recently added complexity until the gap narrows to < 30%
- NEVER: Add a parameter because it improves the backtest without testing its impact on out-of-sample robustness

## Regime Applicability
- **Trending:** Simple trend-following systems (1-2 MAs + stop) outperform complex ones. Turtle Traders proved this
- **Ranging:** Slightly more complexity justified (oscillator + structural levels + volume). But still cap at 4-5 parameters
- **Shock:** Simplest rules dominate. "If VIX > X, reduce exposure by Y%." Complex conditional logic fails under crisis conditions

## Connected Laws
- Law 15 (Signal Filtration): Over-filtering is a symptom of complexity decay
- Law 17 (Statistical Significance): Complex systems need larger samples to validate, which are often unavailable
- Law 20 (Backtest Illusion): Complexity amplifies the backtest-to-live performance gap
- Law 28 (Adaptation): Adaptation is not the same as complexity. Simple systems can adapt by changing parameters, not by adding them

## Key Numbers
- Turtle Traders: 2 parameters (breakout period, stop ATR multiple) generated 80%+ annual returns for a decade
- A system with 47 parameters and 99.9% backtest accuracy generated 0% live profitability (documented case)
- Optimal parameter count for most strategies: 3-5 (empirically validated)
- Each additional parameter reduces out-of-sample performance by approximately 5-10% on average

## Violation Cost
A quantitative researcher added 47 filters and parameters to an equity momentum system, achieving 99.9% win rate in backtesting. In live trading over 12 months, the system generated zero net profit because it was so over-optimized that it only triggered on conditions that perfectly matched historical noise patterns. Twelve months of development and capital allocation, wasted by complexity.
