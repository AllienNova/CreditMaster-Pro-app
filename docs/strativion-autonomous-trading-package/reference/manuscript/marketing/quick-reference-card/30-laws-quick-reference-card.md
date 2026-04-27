# The 30 Laws of Trading — Quick Reference Card

**Product:** Double-sided laminated card (4"×6" or 5"×8" trim)
**Intended use:** Kept at the trading desk. Consulted before every entry and after every close.
**Companion:** "The 30 Indisputable Laws of Trading" (Djam, 2026).
**Design brief:** Side 1 = the 30 laws (one line each + one decision rule). Side 2 = pre-trade checklist grounded in those laws.

---

## SIDE 1 — The 30 Laws

### Part I — The Physics of Price

| # | Law | One-line | Decision rule |
|---|---|---|---|
| 1 | Market Inertia | Trends persist until a structural break breaks them. | Never fight a confirmed trend. Wait for the BOS/CHoCH. |
| 2 | Feedback Loops | Markets amplify (trend) or damp (revert). | Identify the loop first. Then choose the strategy. |
| 3 | Volatility Compression | Low-vol precedes high-vol expansion. | Compression = potential energy. Longer squeeze = larger break. |
| 4 | Liquidity Gravity | Price hunts liquidity pools. | Map stops & limits before entry. Don't park a stop at an obvious level. |
| 5 | Mean Reversion | Price oscillates around equilibrium. | Fade extremes in ranges. Never fade in confirmed trends. |
| 6 | Fractal Structure | The same patterns appear on all timeframes. | Zoom out before zooming in. Higher TF wins. |
| 7 | Fat Tails | Extreme events occur far more than Gaussian predicts. | Size every position as if a 10-sigma move happens tomorrow. |
| 8 | Market Regimes | Markets operate in distinct states. Strategy must match. | Classify regime FIRST. Trending / Ranging / Shock / Transition. |
| 9 | Information Decay | News value decays exponentially. | If everyone knows it, the edge is gone. |
| 10 | Time Delays | Every indicator lags. | The faster the signal, the noisier. The smoother, the later. Pick deliberately. |

### Part II — The Scientific Method of Trading

| # | Law | One-line | Decision rule |
|---|---|---|---|
| 11 | Structural Levels | Price remembers swings and BOS levels. | Stops go at structure, never round numbers. |
| 12 | Multi-Timeframe Alignment | Aligned TFs = constructive interference. | Two timeframes agree, or you sit out. |
| 13 | Momentum (Persistence/Exhaustion) | Winners keep winning until they stop. | Trade momentum; fear divergence. |
| 14 | Path Dependency | HOW price arrived matters as much as where it is. | $100 after a crash ≠ $100 after a rally. Context over coordinates. |
| 15 | Signal Filtration | Too many filters = paralysis. Too few = noise. | Fewest independent filters that work. Nothing more. |
| 16 | Expectancy | E = (W × avg_win) − (L × avg_loss). | Win rate is vanity. Expectancy is sanity. |
| 17 | Statistical Significance | 20 trades prove nothing. | 100 trades = hunch. 200 = evidence. 380 = significance. |
| 18 | Confirmation (Confluence) | Independent confirmations multiply edge. Correlated ones multiply illusion. | Two confirmations, different families. |
| 19 | Edge & Pattern Decay | Every edge decays as it becomes known. | If rolling expectancy drops 50% from peak over 50 trades, retire the system. |
| 20 | Backtest Illusion | Every backtest is an optimistic estimate. | Paper-trade 30-90 days before live. Haircut expected returns by 50%. |

### Part III — The Laws of Survival & Execution

| # | Law | One-line | Decision rule |
|---|---|---|---|
| 21 | Position Sizing | Sizing determines survival, not timing. | 1% per trade default. 2% absolute max. Never full-Kelly. |
| 22 | Invalidation | Every trade has a pre-defined structural stop. | No structural stop = no trade. Never widen. Never delete. |
| 23 | Asymmetric Damage | 50% loss requires 100% gain to recover. | Small losses are the price of staying in the game. |
| 24 | Systemic Correlation | In crises, correlations spike to 1.0. | Correlated longs = one big long. Size accordingly. |
| 25 | Transaction Costs | Costs are certain. Edge is probabilistic. | If net edge isn't positive after all costs, there is no edge. |
| 26 | Complexity Decay | Adding rules = diminishing returns, then negative returns. | If you can't explain the system in 3 bullets, it's overfit. |
| 27 | Emotional Gravity | Emotion is inescapable. Build rules that override it. | Score < 6 = no trade. 30-min cooldown after every loss. |
| 28 | Adaptation | Markets evolve. Static systems die. | Review and adapt every quarter. Markets don't care about your history. |
| 29 | Probability of Ruin | Oversized + neg expectancy → ruin is WHEN, not IF. | Keep P(ruin) < 1%. Never risk > 2%. Heat cap 10%. |
| 30 | Survival | The meta-law. Survival is the prerequisite for success. | If in doubt, do nothing. The best trade you make this year may be the one you didn't take. |

---

## SIDE 2 — The Pre-Trade Checklist

**Run this in under 60 seconds before every entry. 13 gates. All must pass. No exceptions.**

| # | Gate | Q | Law |
|---|---|---|---|
| 1 | Regime match | Strategy's regime_applicability includes current regime? | 8 |
| 2 | Timeframe alignment | ≥ 2 timeframes agree with direction? | 12 |
| 3 | Independent confluence | ≥ 2 confirmations from DIFFERENT source families? | 18 |
| 4 | Structural invalidation | Stop anchored to a NAMED structural feature? | 22 |
| 5 | R-multiple | ≥ 2.0 normally; ≥ 3.0 in shock regime? | 16 |
| 6 | Risk cap | risk_dollars ≤ regime.risk_per_trade.default × equity? | 21 |
| 7 | Heat cap | heat_after ≤ regime.max_heat (10% absolute)? | 21, 24 |
| 8 | Correlation | No open position with \|ρ\|>0.7 that pushes combined over 1%? | 24 |
| 9 | Position count | open + 1 ≤ regime.max_positions? | 24, 26 |
| 10 | Cost-adjusted edge | Net expectancy positive after spread + slippage + commission? | 25 |
| 11 | Emotional state | Score ≥ 6 AND no loss in past 30 min AND not 6th trade today? | 27 |
| 12 | Ruin probability | After this trade, P(ruin) ≤ 1%? | 29 |
| 13 | Operational safety | Broker OK, data fresh, no breaker tripped, mode correct? | 30 |

**13/13 = TRADE. Anything less = SKIP.**

### Regime-Aware Caps (memorize)

| Regime | Risk/trade | Max positions | Max heat | Min R |
|--------|-----------|---------------|----------|-------|
| Trending | 1% (2% max) | 6 | 8-10% | 2.0 |
| Ranging | 0.75% (1% max) | 3 | 3-5% | 2.0 |
| Shock | 0.25% (0.5% max) | 2 | 1-2% | 3.0 |
| Transition | 0.5% | 3 | 2-3% | 2.0 |

### Circuit Breakers (hard halts)

| Trigger | Halt |
|---|---|
| Daily P&L ≤ -2% | Rest of calendar day |
| Weekly P&L ≤ -3% | Until Monday |
| Monthly P&L ≤ -6% | Reduce size 50% for remainder of month |
| Drawdown ≥ 15% | Paper mode until sustained recovery |
| P(ruin) > 1% | Halt new entries; re-size |
| Correlation > 0.7 | Halt new entries |
| Regime transition | Halt 15 min; re-classify |
| System/data failure | Halt + flatten if kill-switch |

### The One-Question Shortcut

> **"If this trade loses 1R, does my day, week, month, and career survive unchanged?"**
>
> YES → trade. NO → reduce size or skip.

### The Meta Rule

> **Survival is Law 30. Everything else serves it.**
> **If in doubt, do nothing.**

---

## PRODUCTION NOTES

**Format:** Double-sided, 4×6 inches (landscape) OR 5×8 (portrait). Matte-laminated 300 gsm stock.

**Typography:**
- Title: bold sans-serif (e.g., Inter Bold 10pt)
- Table headers: sans-serif 7pt bold
- Table body: sans-serif 6pt
- Callout quotes: serif italic (Georgia Italic 8pt)

**Color system:**
- Part I (Laws 1-10): blue accent (#1E3A8A) — "Physics of Price"
- Part II (Laws 11-20): amber accent (#B45309) — "Scientific Method"
- Part III (Laws 21-30): red accent (#991B1B) — "Survival & Execution"
- Gates + Caps: gray neutral with red emphasis on hard limits

**Suggested SKUs:**
- **Print bundle:** $9.99 (single card) / $14.99 (3-pack)
- **Digital download:** free with book purchase; listed separately on website
- **Merch variant:** mug with full laws list on side; sold via print-on-demand

**Distribution:**
- Ship with print book (via insert card or as free add-on)
- Sell on Amazon as separate accessory
- Give away free on indisputablelawsoftrading.com in exchange for email signup (lead magnet)
- Include PDF with Audible companion

**Conversion logic:** readers who use the card daily become the book's strongest word-of-mouth engine. The card at the trader's elbow is an always-on referral tool.
