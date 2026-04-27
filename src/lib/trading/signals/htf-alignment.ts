/**
 * HTF Alignment Gate — Sprint 9C
 *
 * Higher timeframe alignment gate for signal filtering.
 * Signals must align with the dominant HTF trend before execution.
 *
 * Two methods:
 *   1. EMA slope: 20-period EMA on HTF — rising for long, falling for short.
 *   2. Pivot structure: higher highs + higher lows for long,
 *      lower highs + lower lows for short.
 *
 * "both" mode requires both methods to agree.
 */

import type { Bar } from "@/lib/trading/data/bar-consolidator";
import type { Timeframe } from "@/lib/trading/data/bar-consolidator";

// ============================================================================
// TYPES
// ============================================================================

export type HTFTrend = "bullish" | "bearish" | "neutral";
export type HTFMethod = "ema_slope" | "pivot_structure" | "both";

export interface HTFInput {
  signalTimeframe: Timeframe;
  signalDirection: "long" | "short";
  htfBars: Bar[];
  method?: HTFMethod;
}

export interface HTFResult {
  aligned: boolean;
  htfTrend: HTFTrend;
  method: string;
  details: string;
}

// ============================================================================
// EMA SLOPE METHOD
// ============================================================================

/**
 * Compute exponential moving average of close prices.
 * Returns the full EMA array (same length as input).
 */
function computeEMA(closes: number[], period: number): number[] {
  if (closes.length === 0) return [];

  const multiplier = 2 / (period + 1);
  const ema: number[] = [closes[0]];

  for (let i = 1; i < closes.length; i++) {
    ema.push(closes[i] * multiplier + ema[i - 1] * (1 - multiplier));
  }

  return ema;
}

/**
 * Determine HTF trend from EMA slope.
 * Uses 20-period EMA. Rising EMA = bullish, falling = bearish.
 * "Rising" is defined by comparing the last EMA value to the one 3 bars prior,
 * requiring a minimum slope magnitude to avoid noise.
 */
function emaSlopeTrend(bars: Bar[]): { trend: HTFTrend; details: string } {
  const EMA_PERIOD = 20;
  const SLOPE_LOOKBACK = 3;
  const MIN_BARS = EMA_PERIOD + SLOPE_LOOKBACK;

  if (bars.length < MIN_BARS) {
    return {
      trend: "neutral",
      details: `Insufficient bars for EMA slope: ${bars.length} < ${MIN_BARS} required`,
    };
  }

  const closes = bars.map((b) => b.close);
  const ema = computeEMA(closes, EMA_PERIOD);

  const current = ema[ema.length - 1];
  const prior = ema[ema.length - 1 - SLOPE_LOOKBACK];

  // Slope as percentage change
  const slopeChange = (current - prior) / prior;
  const SLOPE_THRESHOLD = 0.001; // 0.1% minimum change to declare trend

  if (slopeChange > SLOPE_THRESHOLD) {
    return {
      trend: "bullish",
      details: `EMA(20) rising: slope ${(slopeChange * 100).toFixed(3)}% over ${SLOPE_LOOKBACK} bars`,
    };
  }

  if (slopeChange < -SLOPE_THRESHOLD) {
    return {
      trend: "bearish",
      details: `EMA(20) falling: slope ${(slopeChange * 100).toFixed(3)}% over ${SLOPE_LOOKBACK} bars`,
    };
  }

  return {
    trend: "neutral",
    details: `EMA(20) flat: slope ${(slopeChange * 100).toFixed(3)}% within threshold`,
  };
}

// ============================================================================
// PIVOT STRUCTURE METHOD
// ============================================================================

interface PivotPoint {
  index: number;
  price: number;
  type: "high" | "low";
}

/**
 * Extract simple swing pivots from bars using a lookback depth.
 * A swing high requires the high to be the highest of the surrounding bars.
 * A swing low requires the low to be the lowest of the surrounding bars.
 */
function extractSwingPivots(bars: Bar[], depth: number = 3): PivotPoint[] {
  const pivots: PivotPoint[] = [];

  for (let i = depth; i < bars.length - depth; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = i - depth; j <= i + depth; j++) {
      if (j === i) continue;
      if (bars[j].high >= bars[i].high) isHigh = false;
      if (bars[j].low <= bars[i].low) isLow = false;
    }

    if (isHigh) {
      pivots.push({ index: i, price: bars[i].high, type: "high" });
    }
    if (isLow) {
      pivots.push({ index: i, price: bars[i].low, type: "low" });
    }
  }

  return pivots;
}

/**
 * Determine HTF trend from pivot structure.
 * Bullish: last 2+ swing highs ascending AND last 2+ swing lows ascending.
 * Bearish: last 2+ swing highs descending AND last 2+ swing lows descending.
 * Neutral: mixed or insufficient pivots.
 */
function pivotStructureTrend(bars: Bar[]): { trend: HTFTrend; details: string } {
  const MIN_BARS = 10;
  if (bars.length < MIN_BARS) {
    return {
      trend: "neutral",
      details: `Insufficient bars for pivot analysis: ${bars.length} < ${MIN_BARS} required`,
    };
  }

  const pivots = extractSwingPivots(bars);
  const highs = pivots.filter((p) => p.type === "high");
  const lows = pivots.filter((p) => p.type === "low");

  if (highs.length < 2 || lows.length < 2) {
    return {
      trend: "neutral",
      details: `Insufficient pivots: ${highs.length} highs, ${lows.length} lows (need 2+ each)`,
    };
  }

  // Use last 3 pivots of each type (or fewer if not available)
  const recentHighs = highs.slice(-3);
  const recentLows = lows.slice(-3);

  const highsAscending = recentHighs.every(
    (h, i) => i === 0 || h.price > recentHighs[i - 1].price,
  );
  const highsDescending = recentHighs.every(
    (h, i) => i === 0 || h.price < recentHighs[i - 1].price,
  );
  const lowsAscending = recentLows.every(
    (l, i) => i === 0 || l.price > recentLows[i - 1].price,
  );
  const lowsDescending = recentLows.every(
    (l, i) => i === 0 || l.price < recentLows[i - 1].price,
  );

  if (highsAscending && lowsAscending) {
    return {
      trend: "bullish",
      details: `Higher highs (${recentHighs.map((h) => h.price.toFixed(2)).join(" > ")}) + higher lows (${recentLows.map((l) => l.price.toFixed(2)).join(" > ")})`,
    };
  }

  if (highsDescending && lowsDescending) {
    return {
      trend: "bearish",
      details: `Lower highs (${recentHighs.map((h) => h.price.toFixed(2)).join(" < ")}) + lower lows (${recentLows.map((l) => l.price.toFixed(2)).join(" < ")})`,
    };
  }

  return {
    trend: "neutral",
    details: "Mixed pivot structure — no clear directional bias",
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check whether a signal's direction aligns with the higher timeframe trend.
 *
 * Alignment rules:
 *   - "long" signals require a "bullish" HTF trend
 *   - "short" signals require a "bearish" HTF trend
 *   - "neutral" HTF trend never aligns (signal is filtered out)
 */
export function checkHTFAlignment(params: HTFInput): HTFResult {
  const method = params.method ?? "ema_slope";

  if (method === "ema_slope") {
    const { trend, details } = emaSlopeTrend(params.htfBars);
    const aligned =
      (params.signalDirection === "long" && trend === "bullish") ||
      (params.signalDirection === "short" && trend === "bearish");

    return {
      aligned,
      htfTrend: trend,
      method: "ema_slope",
      details,
    };
  }

  if (method === "pivot_structure") {
    const { trend, details } = pivotStructureTrend(params.htfBars);
    const aligned =
      (params.signalDirection === "long" && trend === "bullish") ||
      (params.signalDirection === "short" && trend === "bearish");

    return {
      aligned,
      htfTrend: trend,
      method: "pivot_structure",
      details,
    };
  }

  // "both" — both methods must agree
  const ema = emaSlopeTrend(params.htfBars);
  const pivot = pivotStructureTrend(params.htfBars);

  let combinedTrend: HTFTrend;
  if (ema.trend === pivot.trend) {
    combinedTrend = ema.trend;
  } else {
    combinedTrend = "neutral";
  }

  const aligned =
    (params.signalDirection === "long" && combinedTrend === "bullish") ||
    (params.signalDirection === "short" && combinedTrend === "bearish");

  return {
    aligned,
    htfTrend: combinedTrend,
    method: "both",
    details: `EMA: ${ema.trend} (${ema.details}) | Pivot: ${pivot.trend} (${pivot.details})`,
  };
}
