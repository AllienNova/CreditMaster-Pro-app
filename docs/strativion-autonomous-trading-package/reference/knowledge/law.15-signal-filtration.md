# Law 15: The Law of Signal Filtration

## Statement
Raw market data contains more noise than signal. The quality of a trading system depends on the effectiveness of its filters. Over-filtering eliminates valid signals; under-filtering generates excessive false signals.

## Detection
- **Signal-to-noise ratio (SNR):** Calculate SNR = (signal variance) / (noise variance). Target SNR > 1.5 for actionable signals
- **False signal rate:** Track percentage of signals that hit stop-loss before reaching 1R target. > 60% = under-filtered
- **Signal frequency:** If filter produces < 2 signals per month on daily timeframe, likely over-filtered. > 20 per month = under-filtered
- **Filter correlation test:** If two filters produce > 0.8 correlated results, one is redundant. Remove it

## Action Rules
- WHEN adding a new filter: Test marginal improvement. If win rate improves < 3% while signal count drops > 30%, the filter costs more than it adds
- WHEN false signal rate > 50%: Add ONE filter at a time. Priority: regime filter first, then timeframe alignment, then volume confirmation
- WHEN system produces zero signals for 30+ days: Remove most restrictive filter. System is over-optimized
- NEVER: Use more than 4-5 independent filters simultaneously. Beyond 5 filters, you are curve-fitting, not filtering

## Regime Applicability
- **Trending:** Fewer filters needed. Trend itself is the primary filter. Add momentum confirmation only
- **Ranging:** More filters needed to avoid whipsaws. Add regime confirmation, volume, and structural level filters
- **Shock:** Most filters break down. Rely on pre-set rules and position sizing rather than signal filters

## Connected Laws
- Law 10 (Time Delays): Every filter adds latency. Filter count directly increases signal delay
- Law 12 (Multi-Timeframe Alignment): Multi-TF is the most effective single filter (non-redundant by design)
- Law 18 (Confirmation/Confluence): Filtration IS confirmation with independent measurements
- Law 26 (Complexity Decay): Over-filtering is a form of complexity that decays system performance

## Key Numbers
- Optimal filter count: 3-4 independent filters for most systems (diminishing returns beyond)
- Each additional filter typically reduces signal count by 30-50%
- Sweet spot: 55-65% win rate with 3 filters vs. 45% with 0 filters and 75% with 7 filters but only 2 trades per year
- The matched filter theorem: maximum SNR is achieved when the filter matches the expected signal shape

## Violation Cost
A systematic trader documented adding 12 filters to an S&P 500 momentum system, achieving 94% win rate in backtesting but generating only 3 trades per year. The system was so over-filtered it missed the entire 2019 rally (29% return) because conditions never perfectly aligned. The cost: $290,000 in opportunity cost on a $1 million account, all to avoid the occasional losing trade.
