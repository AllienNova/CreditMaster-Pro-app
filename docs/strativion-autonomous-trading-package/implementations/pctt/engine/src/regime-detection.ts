/**
 * @module regime-detection
 * Market regime classification using Efficiency Ratio and crossing count.
 *
 * TRENDING: ER >= 0.40 (strong directional move, low noise)
 * MEAN_REVERTING: ER <= 0.25 or high crossing count (range-bound)
 * CHOPPY: high crossing count with moderate ER
 * TRANSITION: everything else (uncertain regime)
 */

import { MarketRegime, DEFAULT_REGIME_CONFIG } from './types.js';
import type { RegimeConfig } from './types.js';

/**
 * Calculate the Efficiency Ratio (ER) over a lookback period.
 *
 * ER_t = |C_t - C_{t-n}| / SUM(|C_{t-i+1} - C_{t-i}|, i=1..n)
 *
 * ER approaches 1.0 in strong trends (price moves directly from start to end)
 * and approaches 0.0 in choppy markets (lots of back-and-forth movement).
 *
 * @param closes - Array of close prices.
 * @param period - Lookback period n (default 20).
 * @returns ER value in [0, 1]. Returns 0 if insufficient data or zero path length.
 */
export function efficiencyRatio(closes: number[], period: number = 20): number {
  if (closes.length <= period) return 0;

  const n = closes.length;
  const currentClose = closes[n - 1];
  const pastClose = closes[n - 1 - period];

  // Net directional movement
  const direction = Math.abs(currentClose - pastClose);

  // Sum of absolute bar-to-bar changes (total path length)
  let volatility = 0;
  for (let i = n - period; i < n; i++) {
    volatility += Math.abs(closes[i] - closes[i - 1]);
  }

  if (volatility === 0) return 0;
  return direction / volatility;
}

/**
 * Count the number of midline crossings over a lookback period.
 *
 * A crossing occurs when price moves from one side of the midline to the other.
 * High crossing count indicates choppy, range-bound price action.
 *
 * Cross_t = SUM over i=1..n: 1{(P_{t-i} - mu_{t-i}) * (P_{t-i+1} - mu_{t-i+1}) < 0}
 *
 * @param prices - Array of close prices.
 * @param midline - Array of midline values (e.g., average of upper and lower boundaries).
 * @param period - Lookback period for counting crossings (default 20).
 * @returns Number of midline crossings in the lookback window.
 */
export function crossingCount(
  prices: number[],
  midline: number[],
  period: number = 20,
): number {
  const n = Math.min(prices.length, midline.length);
  if (n < 2) return 0;

  const start = Math.max(0, n - period);
  let crossings = 0;

  for (let i = start + 1; i < n; i++) {
    const prevDiff = prices[i - 1] - midline[i - 1];
    const currDiff = prices[i] - midline[i];

    // A crossing occurs when the sign changes (product is negative)
    if (prevDiff * currDiff < 0) {
      crossings++;
    }
  }

  return crossings;
}

/**
 * Detect the current market regime from close prices.
 *
 * Classification rules:
 * - TRENDING:       ER >= er_trending_threshold AND crossings <= crossing_count_choppy
 * - MEAN_REVERTING: ER <= er_mean_reverting_threshold OR crossings >= crossing_count_choppy
 * - CHOPPY:         crossings >= crossing_count_choppy AND ER in between thresholds
 * - TRANSITION:     otherwise (ambiguous regime)
 *
 * Strategy activation: PCTT break-retest logic is allowed only in TRENDING or TRANSITION.
 *
 * @param closes - Array of close prices (must have enough bars for the ER period).
 * @param config - Regime detection configuration.
 * @param midline - Optional midline array for crossing count. If not provided,
 *                  a simple moving average of the closes is used.
 * @returns The detected MarketRegime.
 */
export function detectRegime(
  closes: number[],
  config: RegimeConfig = DEFAULT_REGIME_CONFIG,
  midline?: number[],
): MarketRegime {
  if (closes.length < config.er_period + 1) {
    return MarketRegime.TRANSITION;
  }

  const er = efficiencyRatio(closes, config.er_period);

  // If no midline provided, compute a simple moving average as a proxy
  let mid: number[];
  if (midline && midline.length === closes.length) {
    mid = midline;
  } else {
    mid = simpleMovingAverage(closes, config.crossing_count_period);
  }

  const crossings = crossingCount(closes, mid, config.crossing_count_period);

  // Classification logic
  if (er >= config.er_trending_threshold && crossings < config.crossing_count_choppy) {
    return MarketRegime.TRENDING;
  }

  if (er <= config.er_mean_reverting_threshold) {
    return MarketRegime.MEAN_REVERTING;
  }

  if (crossings >= config.crossing_count_choppy) {
    // High crossings: could be mean-reverting or choppy
    if (er <= config.er_mean_reverting_threshold) {
      return MarketRegime.MEAN_REVERTING;
    }
    return MarketRegime.CHOPPY;
  }

  return MarketRegime.TRANSITION;
}

/**
 * Check whether the current regime allows PCTT break-retest trading.
 *
 * Per the specification, break-retest logic is only activated in
 * TRENDING or TRANSITION regimes.
 *
 * @param regime - The current market regime.
 * @returns True if trading is allowed in this regime.
 */
export function isTradeableRegime(regime: MarketRegime): boolean {
  return regime === MarketRegime.TRENDING || regime === MarketRegime.TRANSITION;
}

/**
 * Compute a simple moving average for each bar.
 *
 * @param values - Input values.
 * @param period - SMA period.
 * @returns Array of SMA values (same length as input, with expanding window for early bars).
 */
function simpleMovingAverage(values: number[], period: number): number[] {
  const n = values.length;
  const sma: number[] = new Array(n);
  let sum = 0;

  for (let i = 0; i < n; i++) {
    sum += values[i];
    if (i < period) {
      sma[i] = sum / (i + 1);
    } else {
      sum -= values[i - period];
      sma[i] = sum / period;
    }
  }

  return sma;
}
