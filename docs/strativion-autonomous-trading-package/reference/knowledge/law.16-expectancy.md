# Law 16: The Law of Expectancy

## Statement
A trading system's value is determined by its mathematical expectancy: (Win Rate x Average Win) minus (Loss Rate x Average Loss). A system with 30% win rate can be highly profitable if average wins are large enough relative to average losses.

## Detection
- **Expectancy per trade (R):** E = (Win% x Avg Win) - (Loss% x Avg Loss). Must be positive. Express in R-multiples
- **Profit factor:** Total gross profit / Total gross loss. Must be > 1.0. Target > 1.5 for robust edge
- **R-multiple distribution:** Track every trade in R-multiples (profit/initial risk). Positive mean R = positive expectancy
- **Sample adequacy:** Minimum 100 trades to estimate expectancy with confidence. 30 trades is statistically meaningless

## Action Rules
- WHEN expectancy is positive AND sample > 100 trades: Trade the system with confidence. Size per Law 21 (Position Sizing)
- WHEN win rate is low (< 40%) but R-multiple is high (> 3R average win): This is a valid trend-following system. Do not abandon it for low win rate
- WHEN expectancy turns negative over rolling 50-trade window: Stop trading the system. Investigate edge decay (Law 19) or regime mismatch (Law 8)
- NEVER: Judge a system solely by win rate. A 90% win rate with 1:10 risk-reward has catastrophic negative expectancy

## Regime Applicability
- **Trending:** Trend-following expectancy profile: low win rate (35-45%), high R-multiple (2-5R). Few big wins drive profitability
- **Ranging:** Mean-reversion expectancy profile: high win rate (60-75%), low R-multiple (0.5-1.5R). Many small wins accumulate
- **Shock:** Expectancy of normal strategies turns sharply negative. Only tail hedge strategies (very low win rate, extreme R-multiple) have positive expectancy

## Connected Laws
- Law 17 (Statistical Significance): Expectancy must be measured over sufficient sample to be reliable
- Law 20 (Backtest Illusion): Backtested expectancy systematically overestimates live expectancy
- Law 21 (Position Sizing): Optimal position sizing is a function of expectancy magnitude and certainty
- Law 25 (Transaction Costs): Expectancy must be calculated NET of all transaction costs

## Key Numbers
- Paul Tudor Jones: approximately 40% win rate but average win was 4-5x average loss = massive positive expectancy
- Turtle Traders: 35-40% win rate with 5-10R outlier wins driving all profitability
- Minimum viable expectancy: $0.20 per $1 risked (0.2R per trade) after costs
- Kelly optimal sizing assumes known expectancy. Half-Kelly is standard to account for estimation error

## Violation Cost
A retail trader with a 92% win rate averaged $150 per winning trade and $2,800 per losing trade. Expectancy = (0.92 x $150) - (0.08 x $2,800) = $138 - $224 = -$86 per trade. Despite "winning almost every trade," the system lost $86 per trade on average. Over 500 trades, total loss: $43,000. High win rate masked catastrophic negative expectancy.
