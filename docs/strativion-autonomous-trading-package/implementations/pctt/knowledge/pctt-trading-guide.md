# PCTT Trading Guide for Agents

**Purpose:** Concise decision-making reference for LLM agents evaluating and executing PCTT (Pivot-Constrained Trendline Trading) setups. This guide distills the canonical specification into actionable trading logic. For full mathematical definitions, see `pctt-canonical-specification.md`.

---

## When to Trade PCTT Setups

- Only in **TRENDING** or **TRANSITION** regimes (ER >= 0.25).
- Never in **CHOPPY** regime (ER between 0.25 and 0.40 combined with high midline crossing count).
- Require Q-Score >= 0.55 minimum (Grade B). Below 0.55 is an automatic skip.
- Prefer Q-Score >= 0.70 (Grade A) for full position sizing at 1.0% equity risk.
- Check macro timeframe alignment before micro entries. A 4H setup in a daily downtrend demands extra caution.
- Confirm that the market is not within 30 minutes of a known catalyst (earnings, FOMC, NFP) unless the trade is already in profit with a break-even stop.

---

## The PCTT Decision Flow (Agent Checklist)

Execute these nine steps in strict sequence. A "no" at any step terminates the evaluation.

1. **Is regime favorable?** Check Efficiency Ratio (ER >= 0.25) and midline crossing count. TRENDING (ER >= 0.40, low crossings) is ideal. TRANSITION is acceptable with caution. CHOPPY/MEAN_REVERTING is a hard stop.
2. **Are there high-quality trendlines?** At least one candidate line must have Q-Score >= 0.55 with a minimum of 2 touches (3 touches for A-Grade). Lines must span at least 20 bars.
3. **Has a break been confirmed?** Two-stage verification required: (a) wick penetrates the boundary beyond beta_p buffer, then (b) close confirms beyond beta_c buffer. Both conditions on the same bar or penetration first, confirmation on a subsequent bar.
4. **Are lines frozen?** After confirmed break, the Action Line (broken boundary) and Safety Line (opposite boundary) must be frozen with their slopes projected forward. No recalculation permitted.
5. **Is price retesting the Action Line?** Retest must occur within 12 bars of the break confirmation. Price must come within gamma (0.15 to 0.25 ATR) of the frozen Action Line.
6. **Does the rejection bar score 3/4 features?** Evaluate CLV, wick-to-body ratio, candle direction, and close position relative to Action Line. Minimum 3 of 4 features must be satisfied.
7. **Is risk geometry acceptable?** Calculate dGeom = |entry price minus Safety Line| / ATR. Trade is allowed only if dGeom <= 2.5. If the stop is too far, skip the trade regardless of quality.
8. **Is position size within limits?** A-Grade (Q >= 0.70): risk 1.0% equity. B-Grade (Q >= 0.55): risk 0.5% equity. Verify total portfolio heat does not exceed 6% across all open positions.
9. **Enter on rejection confirmation bar close.** Set initial stop at the Safety Line value. Begin Phase 1 (structural stop) of the hybrid trailing system.

---

## How Q-Score Maps to Conviction

| Q-Score Range | Quality Level | Grade | Risk per Trade | Agent Guidance |
|:--------------|:--------------|:------|:---------------|:---------------|
| >= 0.80 | Exceptional | A | 1.0% equity | High confidence. Full sizing. Prioritize these setups. |
| 0.70 to 0.80 | Strong | A | 1.0% equity | Reliable structure. Standard A-Grade execution. |
| 0.60 to 0.70 | Good | B | 0.5% equity | Solid but not exceptional. Half-size position. |
| 0.55 to 0.60 | Marginal | B | 0.5% equity | Minimum threshold. Consider skipping if regime is borderline or dGeom is elevated. |
| < 0.55 | Insufficient | SKIP | 0% | No trade. The structural quality does not justify risk. |

---

## Common PCTT Failure Modes

Agents must monitor for and avoid these eight errors:

1. **Trading in choppy regimes.** ER between 0.25 and 0.40 with high crossing count produces false breaks. The regime gate exists to prevent this.
2. **Accepting low Q-Score lines.** Subjective "it looks good" does not override Q < 0.55. The scoring function exists to eliminate cognitive bias.
3. **Entering without rejection confirmation.** Jumping the gun on retest contact without waiting for a scored rejection bar (3/4 features) leads to premature entries that reverse.
4. **Ignoring risk geometry filter.** A dGeom above 2.5 means the structural stop is too far away, creating outsized risk that position sizing alone cannot control.
5. **Moving stops against the trade.** Stops are monotonic. Longs only raise stops, shorts only lower them. Violating this rule destroys the mathematical edge.
6. **Overriding the time stop.** If the trade has not reached +1.0R within 20 bars, exit. "It will work eventually" is not a PCTT-compatible statement.
7. **Adding to losing positions.** PCTT never averages down. If the Safety Line is hit, the thesis is invalidated. Accept the loss and move on.
8. **Trading during known catalysts without adjustment.** Earnings, FOMC, and other scheduled events can invalidate structural levels. Either widen stops (and accept larger dGeom), reduce size, or stand aside.

---

## Integration with 30-Law Framework

PCTT is the operational embodiment of multiple trading laws working simultaneously:

- **Structural Levels (Law 11):** Pivots define the structure from which all lines are drawn. Without clean pivots, there is no PCTT.
- **Signal Filtration (Law 15):** The Q-Score is a noise filter. It separates genuine structural boundaries from random price fluctuations.
- **Market Regimes (Law 8):** The regime gate (ER + crossing count) prevents the system from operating in environments where trendline breaks are meaningless.
- **Invalidation (Law 22):** The Safety Line is the falsification point. When hit, the trade thesis is objectively wrong.
- **Position Sizing (Law 21):** Grade-based sizing ensures that conviction level (Q-Score) directly controls capital exposure.
- **Survival (Law 30):** Portfolio heat limits (6% max), monotonic stops, and the One-Break-One-Trade rule all serve the ultimate law: survive to trade tomorrow.
- **Momentum (Law 13):** Break detection captures momentum shifts as price escapes structural boundaries.
- **Asymmetric Damage (Law 23):** The hybrid trailing stop system locks in gains asymmetrically, ensuring winners are managed differently from losers.

---

## When to Override PCTT Signals

Even valid PCTT setups should be skipped or exited early under these conditions:

- **Crisis protocol active.** VIX above 35 or flash crash detected. Structural levels become unreliable when market microstructure breaks down.
- **Correlation spike.** Cross-position correlation exceeds 0.80 with existing PCTT positions. Multiple correlated PCTT trades are effectively one large bet.
- **Approaching max portfolio heat.** If total capital at risk across all positions nears 6%, do not add new exposure regardless of setup quality.
- **End of session for day trades.** Intraday PCTT setups on 1H or lower timeframes should not be held through overnight gaps unless the trade is already in profit with a break-even stop.
- **After 5 consecutive losses.** Reduce to half size for the next 3 trades. This is a regime-adaptation measure, not a psychological crutch. Five consecutive losses may indicate the market regime has shifted in ways the ER has not yet captured.

---

*This guide is a decision-layer summary. For full mathematical formulations, parameter defaults, and non-repainting guarantees, consult the canonical specification.*
