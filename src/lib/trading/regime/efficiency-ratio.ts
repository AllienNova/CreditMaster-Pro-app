/**
 * Kaufman Efficiency Ratio (KER)
 *
 * ER = |price_change_over_period| / sum(|daily_changes_over_period|)
 *
 * ER → 1.0: perfectly trending (all moves in one direction)
 * ER → 0.0: perfectly ranging (moves cancel out)
 *
 * Result is always in [0, 1].
 */

/**
 * Calculate the Kaufman Efficiency Ratio for a price series.
 *
 * @param closes - Array of closing prices (oldest first)
 * @param period - Lookback period in bars
 * @returns ER in [0, 1], or 0 for degenerate inputs
 */
export function calculateEfficiencyRatio(
  closes: number[],
  period: number,
): number {
  if (closes.length < period + 1 || period <= 0) {
    return 0;
  }

  const end = closes.length - 1;
  const start = end - period;

  // Net directional move over the full period
  const priceChange = Math.abs(closes[end] - closes[start]);

  // Sum of absolute bar-to-bar moves (path length)
  let pathLength = 0;
  for (let i = start + 1; i <= end; i++) {
    pathLength += Math.abs(closes[i] - closes[i - 1]);
  }

  if (pathLength === 0) {
    // All prices identical — perfectly ranging (no movement at all)
    return 0;
  }

  // Clamp to [0, 1] to guard against floating-point edge cases
  return Math.min(1, Math.max(0, priceChange / pathLength));
}
