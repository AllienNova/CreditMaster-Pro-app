# Law 29: The Law of Probability of Ruin

## Statement
Given enough time, any system with negative expectancy or excessive risk-per-trade will go to zero. The probability of ruin is a mathematical certainty for over-leveraged traders. It is not a question of IF but WHEN.

## Detection
- **Risk of ruin formula:** P(ruin) = ((1-edge)/(1+edge))^(capital/risk_per_trade). Calculate monthly
- **Current risk-per-trade:** If risking > 5% per trade, P(ruin) > 50% regardless of win rate. Above 10%, P(ruin) approaches 100%
- **Maximum adverse excursion (MAE):** Track worst intra-trade drawdown. If MAE regularly exceeds planned risk, actual ruin probability is higher than calculated
- **Consecutive loss capacity:** How many consecutive max-risk losses can the account survive? If < 10, ruin probability is dangerous

## Action Rules
- WHEN P(ruin) calculation > 5%: Immediately reduce risk per trade until P(ruin) < 1%
- WHEN consecutive loss count reaches 5+: Reduce position size by 50% regardless of system confidence
- WHEN drawdown exceeds 25%: Halt trading. P(ruin) increases exponentially with drawdown depth (Law 23)
- NEVER: Risk more than 2% per trade under any circumstances. At 2% risk and 50% win rate, you can survive 25+ consecutive losses

## Regime Applicability
- **Trending:** Lower ruin risk if trading with trend. Consecutive losses less likely. Standard position sizing
- **Ranging:** Moderate ruin risk. Whipsaw losses can accumulate. Reduce per-trade risk to 1%
- **Shock:** Maximum ruin risk. Multiple correlated positions can all lose simultaneously (Law 24). Emergency protocols mandatory

## Connected Laws
- Law 7 (Fat Tails): Fat-tail events are the primary pathway to unexpected ruin
- Law 21 (Position Sizing): Position sizing is the direct control mechanism for ruin probability
- Law 23 (Asymmetric Damage): Asymmetric damage accelerates the path to ruin
- Law 30 (Survival): Ruin probability must be kept near zero for survival

## Key Numbers
- Victor Niederhoffer: Blew up spectacularly twice (1997 and 2007), losing $100M+ each time through excessive leverage
- At 10% risk per trade with 55% win rate: P(ruin) = 99.9% over 1,000 trades
- At 2% risk per trade with 55% win rate: P(ruin) = 1.3% over 1,000 trades
- At 1% risk per trade with 55% win rate: P(ruin) = 0.01% over 1,000 trades
- The gambler's ruin theorem: with any negative edge, P(ruin) = 100% given infinite time

## Violation Cost
Victor Niederhoffer, once managing $350 million with a stellar track record, blew up his fund in October 1997 by selling naked puts on the S&P 500 with excessive position sizing. When the market dropped 7% in one day, his fund lost everything. He rebuilt, then blew up AGAIN in 2007 with the same flaw: excessive risk per trade. Two spectacular ruins, $200+ million lost, same root cause: position sizing that made ruin a mathematical certainty.
