/**
 * Bar Consolidator — Sprint 9C
 *
 * Consolidates raw tick/1-minute OHLCV bars into higher timeframe bars.
 * Correct OHLCV consolidation: open=first, high=max, low=min, close=last, volume=sum.
 * Handles session gaps — does not bridge bars across market closed periods.
 */

import { isMarketOpen } from "@/lib/trading/calendar/market-calendar";

// ============================================================================
// TYPES
// ============================================================================

export interface Bar {
  timestamp: number; // Unix epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";

// ============================================================================
// TIMEFRAME HELPERS
// ============================================================================

const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

/**
 * Returns the duration in milliseconds for a given timeframe.
 */
export function getTimeframePeriodMs(tf: Timeframe): number {
  return TIMEFRAME_MS[tf];
}

/**
 * Returns the period start timestamp for a given bar timestamp and target timeframe.
 * Aligns to period boundaries (e.g., 5m bars align to :00, :05, :10, etc.).
 */
function getPeriodStart(timestamp: number, periodMs: number): number {
  return Math.floor(timestamp / periodMs) * periodMs;
}

/**
 * Determines if two timestamps are in the same trading session.
 * A gap of more than 30 minutes with the market closed between them
 * indicates a session boundary.
 */
function isSameSession(tsA: number, tsB: number, periodMs: number): boolean {
  // For daily bars, always group within the same calendar day
  if (periodMs >= 24 * 60 * 60_000) {
    return true;
  }

  const gap = Math.abs(tsB - tsA);
  // If gap is less than 2x the source timeframe, assume contiguous
  if (gap <= periodMs * 2) {
    return true;
  }

  // Check if market was closed during the gap — sample the midpoint
  const midpoint = new Date(Math.min(tsA, tsB) + gap / 2);
  return isMarketOpen(midpoint);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Consolidates an array of bars (assumed to be sorted by timestamp ascending,
 * typically 1-minute bars) into a higher timeframe.
 *
 * OHLCV rules:
 *   open   = first bar's open in the period
 *   high   = max high across all bars in the period
 *   low    = min low across all bars in the period
 *   close  = last bar's close in the period
 *   volume = sum of all bars' volume in the period
 *
 * Session gaps: bars separated by a market-closed gap are never merged
 * into the same consolidated bar, even if they fall in the same period bucket.
 */
export function consolidateBars(
  bars: Bar[],
  targetTimeframe: Timeframe,
): Bar[] {
  if (bars.length === 0) return [];

  const periodMs = getTimeframePeriodMs(targetTimeframe);
  const result: Bar[] = [];

  let currentPeriodStart = getPeriodStart(bars[0].timestamp, periodMs);
  let accOpen = bars[0].open;
  let accHigh = bars[0].high;
  let accLow = bars[0].low;
  let accClose = bars[0].close;
  let accVolume = bars[0].volume;
  let lastTimestamp = bars[0].timestamp;

  for (let i = 1; i < bars.length; i++) {
    const bar = bars[i];
    const barPeriodStart = getPeriodStart(bar.timestamp, periodMs);
    const sameSession = isSameSession(lastTimestamp, bar.timestamp, periodMs);

    if (barPeriodStart === currentPeriodStart && sameSession) {
      // Same period — accumulate
      accHigh = Math.max(accHigh, bar.high);
      accLow = Math.min(accLow, bar.low);
      accClose = bar.close;
      accVolume += bar.volume;
    } else {
      // Flush accumulated bar
      result.push({
        timestamp: currentPeriodStart,
        open: accOpen,
        high: accHigh,
        low: accLow,
        close: accClose,
        volume: accVolume,
      });

      // Start new accumulator
      currentPeriodStart = barPeriodStart;
      accOpen = bar.open;
      accHigh = bar.high;
      accLow = bar.low;
      accClose = bar.close;
      accVolume = bar.volume;
    }

    lastTimestamp = bar.timestamp;
  }

  // Flush final bar
  result.push({
    timestamp: currentPeriodStart,
    open: accOpen,
    high: accHigh,
    low: accLow,
    close: accClose,
    volume: accVolume,
  });

  return result;
}
