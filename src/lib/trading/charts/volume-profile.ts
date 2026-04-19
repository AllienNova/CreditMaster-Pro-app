/**
 * Volume Profile Calculation Engine
 *
 * Divides a price range into equal-sized bins, distributes candle volume
 * across those bins, identifies the Point of Control (POC), and calculates
 * the Value Area (70% of total volume centered on the POC).
 */

import type { OHLCV } from './technical-indicators';

// ============================================================================
// TYPES
// ============================================================================

export interface VolumeProfileBin {
  priceLevel: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  isPointOfControl: boolean;
  isValueArea: boolean;
}

export interface VolumeProfileResult {
  bins: VolumeProfileBin[];
  pointOfControl: number;
  valueAreaHigh: number;
  valueAreaLow: number;
  totalVolume: number;
}

// ============================================================================
// CALCULATION
// ============================================================================

/**
 * Calculates a Volume Profile from an array of OHLCV candles.
 *
 * Each candle's volume is distributed proportionally across whichever bins
 * its high-to-low range overlaps. Buy volume = volume when close >= open;
 * sell volume = volume when close < open.
 *
 * @param candles - Array of OHLCV candles
 * @param bins    - Number of price buckets (default 50)
 */
export function calculateVolumeProfile(
  candles: OHLCV[],
  bins: number = 50,
): VolumeProfileResult {
  if (candles.length === 0 || bins < 1) {
    return {
      bins: [],
      pointOfControl: 0,
      valueAreaHigh: 0,
      valueAreaLow: 0,
      totalVolume: 0,
    };
  }

  // Determine overall price range
  let rangeHigh = -Infinity;
  let rangeLow = Infinity;
  for (const candle of candles) {
    if (candle.high > rangeHigh) rangeHigh = candle.high;
    if (candle.low < rangeLow) rangeLow = candle.low;
  }

  if (rangeHigh === rangeLow) {
    // All candles at the same price — single bin
    const totalVolume = candles.reduce((sum, c) => sum + c.volume, 0);
    const buyVolume = candles.reduce(
      (sum, c) => sum + (c.close >= c.open ? c.volume : 0),
      0,
    );
    const bin: VolumeProfileBin = {
      priceLevel: rangeHigh,
      volume: totalVolume,
      buyVolume,
      sellVolume: totalVolume - buyVolume,
      isPointOfControl: true,
      isValueArea: true,
    };
    return {
      bins: [bin],
      pointOfControl: rangeHigh,
      valueAreaHigh: rangeHigh,
      valueAreaLow: rangeHigh,
      totalVolume,
    };
  }

  const binSize = (rangeHigh - rangeLow) / bins;

  // Initialise bins
  const volumeBins: { volume: number; buyVolume: number; sellVolume: number }[] =
    Array.from({ length: bins }, () => ({ volume: 0, buyVolume: 0, sellVolume: 0 }));

  // Distribute each candle's volume across overlapping bins
  for (const candle of candles) {
    const isBuy = candle.close >= candle.open;
    const candleRange = candle.high - candle.low;

    const firstBin = Math.max(0, Math.floor((candle.low - rangeLow) / binSize));
    const lastBin = Math.min(bins - 1, Math.floor((candle.high - rangeLow) / binSize));

    for (let b = firstBin; b <= lastBin; b++) {
      const binBottom = rangeLow + b * binSize;
      const binTop = binBottom + binSize;

      // Overlap between candle range and this bin
      const overlapLow = Math.max(candle.low, binBottom);
      const overlapHigh = Math.min(candle.high, binTop);
      const overlap = overlapHigh - overlapLow;

      const fraction = candleRange > 0 ? overlap / candleRange : 1 / (lastBin - firstBin + 1);
      const allocated = candle.volume * fraction;

      volumeBins[b].volume += allocated;
      if (isBuy) {
        volumeBins[b].buyVolume += allocated;
      } else {
        volumeBins[b].sellVolume += allocated;
      }
    }
  }

  // Find POC (highest volume bin)
  let pocIndex = 0;
  let maxVolume = -Infinity;
  for (let i = 0; i < bins; i++) {
    if (volumeBins[i].volume > maxVolume) {
      maxVolume = volumeBins[i].volume;
      pocIndex = i;
    }
  }

  // Calculate total volume
  const totalVolume = volumeBins.reduce((sum, b) => sum + b.volume, 0);

  // Value Area: 70% of total volume, starting from POC and expanding outward
  const valueAreaTarget = totalVolume * 0.7;
  let valueAreaVolume = volumeBins[pocIndex].volume;
  let vaLow = pocIndex;
  let vaHigh = pocIndex;

  while (valueAreaVolume < valueAreaTarget && (vaLow > 0 || vaHigh < bins - 1)) {
    const nextLow = vaLow - 1;
    const nextHigh = vaHigh + 1;
    const volumeBelow = nextLow >= 0 ? volumeBins[nextLow].volume : 0;
    const volumeAbove = nextHigh < bins ? volumeBins[nextHigh].volume : 0;

    if (volumeAbove >= volumeBelow && nextHigh < bins) {
      vaHigh = nextHigh;
      valueAreaVolume += volumeBins[vaHigh].volume;
    } else if (nextLow >= 0) {
      vaLow = nextLow;
      valueAreaVolume += volumeBins[vaLow].volume;
    } else if (nextHigh < bins) {
      vaHigh = nextHigh;
      valueAreaVolume += volumeBins[vaHigh].volume;
    } else {
      break;
    }
  }

  // Build result bins with POC and Value Area flags
  const resultBins: VolumeProfileBin[] = volumeBins.map((b, i) => ({
    priceLevel: rangeLow + i * binSize + binSize / 2,
    volume: b.volume,
    buyVolume: b.buyVolume,
    sellVolume: b.sellVolume,
    isPointOfControl: i === pocIndex,
    isValueArea: i >= vaLow && i <= vaHigh,
  }));

  return {
    bins: resultBins,
    pointOfControl: rangeLow + pocIndex * binSize + binSize / 2,
    valueAreaHigh: rangeLow + vaHigh * binSize + binSize,
    valueAreaLow: rangeLow + vaLow * binSize,
    totalVolume,
  };
}
