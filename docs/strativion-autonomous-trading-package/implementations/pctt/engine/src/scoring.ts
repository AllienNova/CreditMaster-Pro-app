/**
 * @module scoring
 * Rejection scoring utilities for retest evaluation.
 *
 * Implements the 4-feature rejection score used to confirm trade entries:
 * 1. Close Location Value (CLV)
 * 2. Wick-to-body ratio
 * 3. Candle direction
 * 4. Close position relative to action line
 */

import type { CandleData, RejectionScore } from './types.js';
import { BreakDirection } from './types.js';

/**
 * Calculate the Close Location Value (CLV) of a candle.
 *
 * CLV = (2 * C - H - L) / (H - L)
 *
 * CLV ranges from -1 (close at low) to +1 (close at high).
 * Values near -1 indicate bearish rejection (selling pressure).
 * Values near +1 indicate bullish rejection (buying pressure).
 *
 * @param candle - OHLCV candle data.
 * @returns CLV value in [-1, 1]. Returns 0 if H equals L (doji with zero range).
 */
export function closeLocationValue(candle: CandleData): number {
  const range = candle.high - candle.low;
  if (range === 0) return 0;
  return (2 * candle.close - candle.high - candle.low) / range;
}

/**
 * Calculate the wick-to-body ratio for a given direction.
 *
 * For SHORT (bearish rejection): upper wick / body
 * For LONG (bullish rejection): lower wick / body
 *
 * A high ratio indicates strong rejection (price was pushed in one direction
 * but reversed, leaving a long wick).
 *
 * @param candle - OHLCV candle data.
 * @param direction - Break direction (determines which wick to measure).
 * @returns Wick-to-body ratio. Returns Infinity if body is zero (doji).
 */
export function wickBodyRatio(candle: CandleData, direction: BreakDirection): number {
  const body = Math.abs(candle.close - candle.open);

  if (body === 0) {
    // Doji candle: any wick means infinite ratio
    const wick =
      direction === BreakDirection.DOWN
        ? candle.high - Math.max(candle.open, candle.close)
        : Math.min(candle.open, candle.close) - candle.low;
    return wick > 0 ? Infinity : 0;
  }

  if (direction === BreakDirection.DOWN) {
    // Bearish rejection: measure upper wick
    // Upper wick = High - max(Open, Close)
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    return upperWick / body;
  } else {
    // Bullish rejection: measure lower wick
    // Lower wick = min(Open, Close) - Low
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    return lowerWick / body;
  }
}

/**
 * Calculate the full rejection score for a candle at a retested action line.
 *
 * Four features are evaluated (minimum 3 of 4 required for valid rejection):
 *
 * For SHORT entry (bearish rejection after downward break):
 * 1. CLV < -0.3 (close near the low, selling pressure)
 * 2. Upper wick > 1.5x body (failed push higher)
 * 3. C < O (bearish candle close)
 * 4. C < Action line (close below the retested level)
 *
 * For LONG entry (bullish rejection after upward break):
 * 1. CLV > 0.3 (close near the high, buying pressure)
 * 2. Lower wick > 1.5x body (failed push lower)
 * 3. C > O (bullish candle close)
 * 4. C > Action line (close above the retested level)
 *
 * @param candle - The retest candle to evaluate.
 * @param actionLinePrice - The frozen action line price at this bar.
 * @param direction - The direction of the original break.
 * @param clvThreshold - CLV threshold (default 0.30).
 * @param wickBodyMin - Minimum wick-to-body ratio (default 1.5).
 * @returns Complete RejectionScore with individual feature results and pass/fail.
 */
export function calculateRejectionScore(
  candle: CandleData,
  actionLinePrice: number,
  direction: BreakDirection,
  clvThreshold: number = 0.30,
  wickBodyMin: number = 1.5,
): RejectionScore {
  const clv = closeLocationValue(candle);
  const wbr = wickBodyRatio(candle, direction);

  let clvPassed: boolean;
  let wickBodyPassed: boolean;
  let candleDirectionPassed: boolean;
  let closeVsActionPassed: boolean;

  if (direction === BreakDirection.DOWN) {
    // SHORT entry: bearish rejection at retested support-turned-resistance
    clvPassed = clv < -clvThreshold;
    wickBodyPassed = wbr > wickBodyMin;
    candleDirectionPassed = candle.close < candle.open;
    closeVsActionPassed = candle.close < actionLinePrice;
  } else {
    // LONG entry: bullish rejection at retested resistance-turned-support
    clvPassed = clv > clvThreshold;
    wickBodyPassed = wbr > wickBodyMin;
    candleDirectionPassed = candle.close > candle.open;
    closeVsActionPassed = candle.close > actionLinePrice;
  }

  const total =
    (clvPassed ? 1 : 0) +
    (wickBodyPassed ? 1 : 0) +
    (candleDirectionPassed ? 1 : 0) +
    (closeVsActionPassed ? 1 : 0);

  return {
    clv: clvPassed,
    wick_body: wickBodyPassed,
    candle_direction: candleDirectionPassed,
    close_vs_action: closeVsActionPassed,
    total,
    passed: total >= 3,
  };
}
