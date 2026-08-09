/**
 * @module pivot-detection
 * Fractal-based pivot detection with ATR normalization.
 *
 * Pivots are confirmed only after R bars pass (non-repainting guarantee).
 * Classification (HH/HL/LH/LL) compares successive pivots of the same type.
 */

import type { CandleData, PivotPoint } from './types.js';

/**
 * Detect pivot highs and lows using the fractal method.
 *
 * A pivot low at bar i exists if low[i] is the minimum of low[i-L..i+R].
 * A pivot high at bar i exists if high[i] is the maximum of high[i-L..i+R].
 * The pivot is confirmed only at bar i + R (non-repainting).
 *
 * @param candles - Array of OHLCV candle data, sorted by bar index ascending.
 * @param leftBars - Number of bars to the left of the pivot (L). Default 2.
 * @param rightBars - Number of bars to the right of the pivot (R). Default 2.
 * @returns Array of detected PivotPoint objects, sorted by bar index.
 */
export function detectPivots(
  candles: CandleData[],
  leftBars: number = 2,
  rightBars: number = 2,
): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  const n = candles.length;

  if (n < leftBars + rightBars + 1) {
    return pivots;
  }

  // Build a bar-index to array-index map for efficient lookup
  const barToIdx = new Map<number, number>();
  for (let idx = 0; idx < n; idx++) {
    barToIdx.set(candles[idx].bar, idx);
  }

  // We iterate through candles that have enough bars on both sides.
  // The pivot at array index i is confirmed at array index i + rightBars.
  for (let i = leftBars; i < n - rightBars; i++) {
    const candle = candles[i];

    // Check pivot low: low[i] must be the minimum of low[i-L..i+R]
    let isPivotLow = true;
    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j === i) continue;
      if (candles[j].low <= candle.low) {
        isPivotLow = false;
        break;
      }
    }

    // Check pivot high: high[i] must be the maximum of high[i-L..i+R]
    let isPivotHigh = true;
    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j === i) continue;
      if (candles[j].high >= candle.high) {
        isPivotHigh = false;
        break;
      }
    }

    if (isPivotLow) {
      pivots.push({
        bar: candle.bar,
        price: candle.low,
        type: 'low',
      });
    }

    if (isPivotHigh) {
      pivots.push({
        bar: candle.bar,
        price: candle.high,
        type: 'high',
      });
    }
  }

  // Sort by bar index
  pivots.sort((a, b) => a.bar - b.bar);

  return pivots;
}

/**
 * Classify pivots as HH (Higher-High), HL (Higher-Low), LH (Lower-High), LL (Lower-Low).
 *
 * Classification compares each pivot to the previous pivot of the same type.
 * The first pivot of each type has no classification.
 *
 * @param pivots - Array of PivotPoint objects (should be sorted by bar index).
 * @returns A new array of PivotPoint objects with classification set.
 */
export function classifyPivots(pivots: PivotPoint[]): PivotPoint[] {
  let lastHigh: PivotPoint | null = null;
  let lastLow: PivotPoint | null = null;

  return pivots.map((pivot) => {
    const classified = { ...pivot };

    if (pivot.type === 'high') {
      if (lastHigh !== null) {
        classified.classification = pivot.price > lastHigh.price ? 'HH' : 'LH';
      }
      lastHigh = pivot;
    } else {
      if (lastLow !== null) {
        classified.classification = pivot.price > lastLow.price ? 'HL' : 'LL';
      }
      lastLow = pivot;
    }

    return classified;
  });
}

/**
 * Calculate the Average True Range (ATR) for each bar.
 *
 * TR_t = max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)
 * ATR_t = simple moving average of TR over the specified period.
 *
 * The first `period` values use a cumulative average (expanding window).
 * Subsequent values use a rolling simple average.
 *
 * @param candles - Array of OHLCV candle data, sorted by bar index ascending.
 * @param period - ATR lookback period (default 14).
 * @returns Array of ATR values, one per candle. Index corresponds to candle index.
 */
export function calculateATR(
  candles: CandleData[],
  period: number = 14,
): number[] {
  const n = candles.length;
  if (n === 0) return [];

  const tr: number[] = new Array(n);
  const atr: number[] = new Array(n);

  // First bar: TR is simply H - L (no previous close)
  tr[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < n; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const cp = candles[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - cp), Math.abs(l - cp));
  }

  // Compute ATR using simple moving average
  // For bars 0..period-1, use expanding average
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += tr[i];
    if (i < period) {
      atr[i] = sum / (i + 1);
    } else {
      sum -= tr[i - period];
      atr[i] = sum / period;
    }
  }

  return atr;
}

/**
 * Get the confirmation bar for a pivot detected at a given bar index.
 * Confirmation occurs R bars after the pivot bar.
 *
 * @param pivotBar - Bar index of the pivot.
 * @param rightBars - R parameter (default 2).
 * @returns The bar index at which this pivot is confirmed.
 */
export function confirmationBar(pivotBar: number, rightBars: number = 2): number {
  return pivotBar + rightBars;
}

/**
 * Filter pivots to only those within a lookback window ending at the given bar.
 *
 * @param pivots - All detected pivots.
 * @param currentBar - The current bar index.
 * @param lookbackBars - Lookback window size (default 200).
 * @param maxPivots - Maximum number of most recent pivots to keep (default 12).
 * @returns Filtered pivots within the window, capped at maxPivots.
 */
export function filterPivotsInWindow(
  pivots: PivotPoint[],
  currentBar: number,
  lookbackBars: number = 200,
  maxPivots: number = 12,
): PivotPoint[] {
  const windowStart = currentBar - lookbackBars;
  const inWindow = pivots.filter(
    (p) => p.bar >= windowStart && p.bar <= currentBar,
  );
  // Keep only the most recent maxPivots
  if (inWindow.length > maxPivots) {
    return inWindow.slice(inWindow.length - maxPivots);
  }
  return inWindow;
}
