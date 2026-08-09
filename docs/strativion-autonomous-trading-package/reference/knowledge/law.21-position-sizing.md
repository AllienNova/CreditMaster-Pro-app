# Law 21: The Law of Position Sizing

## Statement
Position sizing determines survival more than entry timing. Even with a positive-expectancy system, incorrect position sizing leads to ruin. The optimal bet size is a function of edge size AND uncertainty about that edge.

## Detection
- **Current risk per trade:** Position size x distance to stop / Account equity. Must be 0.5-2% for most traders
- **Portfolio heat:** Sum of all open position risks. Must not exceed 6% of account equity at any time
- **Kelly fraction:** f* = (bp - q) / b where b = win/loss ratio, p = win rate, q = 1-p. Use half-Kelly in practice
- **Drawdown monitoring:** If drawdown > 10%, reduce position sizes by 50%. If > 20%, reduce by 75%

## Action Rules
- WHEN edge is well-established (100+ trades, t-stat > 2.5): Use half-Kelly sizing. Maximum 2% risk per trade
- WHEN edge is uncertain (< 100 trades or new regime): Use quarter-Kelly sizing. Maximum 1% risk per trade
- WHEN in drawdown > 10%: Reduce all position sizes by 50% until new equity high or drawdown < 5%
- NEVER: Risk more than 2% of account on a single trade. NEVER let portfolio heat exceed 6%. These are hard limits

## Regime Applicability
- **Trending:** Standard position sizing. Trend persistence supports letting winners run. Trail stops to protect profits
- **Ranging:** Reduce position size by 25-50%. Higher trade frequency compensates. Tighter stops
- **Shock:** Reduce position size by 50-75%. Widened stops require smaller size to maintain same dollar risk

## Connected Laws
- Law 16 (Expectancy): Position sizing is meaningless without positive expectancy. Sizing amplifies the edge
- Law 22 (Invalidation): Stop placement determines the position size (size = risk$ / (entry - stop))
- Law 23 (Asymmetric Damage): Proper sizing prevents the asymmetric damage of large drawdowns
- Law 29 (Probability of Ruin): Position sizing is the primary defense against ruin

## Key Numbers
- Nick Leeson destroyed Barings Bank (233 years old, $1.4 billion loss) through unchecked position sizing
- Kelly Criterion: Developed by John Kelly at Bell Labs in 1956, popularized by Ed Thorp for trading
- Risk per trade thresholds: 0.5% (conservative), 1% (moderate), 2% (aggressive), > 2% (reckless)
- A system risking 10% per trade with 55% win rate has 99.9% probability of ruin over 1,000 trades

## Violation Cost
Nick Leeson's unauthorized position sizing at Barings Bank grew to $27 billion in notional exposure, a concentration that eventually generated a $1.4 billion loss and destroyed the oldest merchant bank in England (founded 1762). One trader's position sizing decisions, unchecked by any risk system, bankrupted a 233-year-old institution in weeks.
