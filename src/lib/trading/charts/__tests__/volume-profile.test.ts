/**
 * Tests for volume-profile.ts
 *
 * Covers: calculateVolumeProfile, POC identification, Value Area calculation,
 * edge cases (empty input, single candle, uniform price, all same price).
 */

import { calculateVolumeProfile } from "../volume-profile";
import type { OHLCV } from "../technical-indicators";

// ============================================================================
// HELPERS
// ============================================================================

function makeCandle(
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  index = 0,
): OHLCV {
  return { timestamp: 1_000_000 + index * 60_000, open, high, low, close, volume };
}

function bullCandle(low: number, high: number, volume: number, index = 0): OHLCV {
  return makeCandle(low, high, low, high, volume, index);
}

// ============================================================================
// BASIC STRUCTURE
// ============================================================================

describe("calculateVolumeProfile — basic structure", () => {
  it("returns empty result for empty input", () => {
    const result = calculateVolumeProfile([]);
    expect(result.bins).toHaveLength(0);
    expect(result.totalVolume).toBe(0);
  });

  it("returns single bin when all prices are the same", () => {
    const candles = [makeCandle(100, 100, 100, 100, 500)];
    const result = calculateVolumeProfile(candles, 10);
    expect(result.bins).toHaveLength(1);
    expect(result.bins[0].isPointOfControl).toBe(true);
    expect(result.bins[0].isValueArea).toBe(true);
    expect(result.totalVolume).toBe(500);
  });

  it("returns the requested number of bins", () => {
    const candles = [bullCandle(100, 200, 1000)];
    const result = calculateVolumeProfile(candles, 20);
    expect(result.bins).toHaveLength(20);
  });

  it("defaults to 50 bins", () => {
    const candles = [bullCandle(100, 200, 1000)];
    const result = calculateVolumeProfile(candles);
    expect(result.bins).toHaveLength(50);
  });
});

// ============================================================================
// TOTAL VOLUME
// ============================================================================

describe("calculateVolumeProfile — total volume", () => {
  it("sums volume across all candles", () => {
    const candles = [
      bullCandle(100, 110, 300, 0),
      bullCandle(105, 115, 400, 1),
      bullCandle(108, 120, 200, 2),
    ];
    const result = calculateVolumeProfile(candles, 10);
    // Total allocated volume should approximately equal sum of candle volumes
    // (floating-point distribution means we allow a small tolerance)
    expect(result.totalVolume).toBeCloseTo(900, 0);
  });
});

// ============================================================================
// POINT OF CONTROL
// ============================================================================

describe("calculateVolumeProfile — Point of Control", () => {
  it("marks exactly one bin as POC", () => {
    const candles = [bullCandle(100, 200, 1000)];
    const result = calculateVolumeProfile(candles, 10);
    const pocBins = result.bins.filter((b) => b.isPointOfControl);
    expect(pocBins).toHaveLength(1);
  });

  it("POC is the bin with the highest volume", () => {
    const candles = [bullCandle(100, 200, 1000)];
    const result = calculateVolumeProfile(candles, 10);
    const poc = result.bins.find((b) => b.isPointOfControl);
    const maxVol = Math.max(...result.bins.map((b) => b.volume));
    expect(poc?.volume).toBe(maxVol);
  });

  it("POC price is within the overall price range", () => {
    const candles = [bullCandle(50, 150, 500, 0), bullCandle(80, 120, 800, 1)];
    const result = calculateVolumeProfile(candles, 20);
    expect(result.pointOfControl).toBeGreaterThanOrEqual(50);
    expect(result.pointOfControl).toBeLessThanOrEqual(150);
  });

  it("identifies POC in the heavily-traded price zone", () => {
    // Candle 1 covers 100–110 with 1000 volume
    // Candle 2 covers 190–200 with 100 volume
    // POC should be near 100–110
    const candles = [
      makeCandle(100, 110, 100, 110, 1000, 0),
      makeCandle(190, 200, 190, 200, 100, 1),
    ];
    const result = calculateVolumeProfile(candles, 20);
    expect(result.pointOfControl).toBeLessThan(150);
  });
});

// ============================================================================
// VALUE AREA
// ============================================================================

describe("calculateVolumeProfile — Value Area", () => {
  it("Value Area bins contain at least 70% of total volume", () => {
    const candles = [
      bullCandle(100, 200, 1000, 0),
      bullCandle(120, 160, 5000, 1),  // heavy volume in the middle
      bullCandle(180, 200, 300, 2),
    ];
    const result = calculateVolumeProfile(candles, 20);
    const vaVolume = result.bins
      .filter((b) => b.isValueArea)
      .reduce((sum, b) => sum + b.volume, 0);
    expect(vaVolume).toBeGreaterThanOrEqual(result.totalVolume * 0.69); // 0.69 allows rounding
  });

  it("Value Area always includes the POC bin", () => {
    const candles = [bullCandle(100, 200, 1000)];
    const result = calculateVolumeProfile(candles, 10);
    const poc = result.bins.find((b) => b.isPointOfControl);
    expect(poc?.isValueArea).toBe(true);
  });

  it("valueAreaHigh >= valueAreaLow", () => {
    const candles = [bullCandle(100, 200, 500), bullCandle(150, 250, 800, 1)];
    const result = calculateVolumeProfile(candles, 15);
    expect(result.valueAreaHigh).toBeGreaterThanOrEqual(result.valueAreaLow);
  });

  it("valueAreaHigh and valueAreaLow are within overall price range", () => {
    const candles = [bullCandle(100, 200, 500)];
    const result = calculateVolumeProfile(candles, 10);
    expect(result.valueAreaLow).toBeGreaterThanOrEqual(100);
    expect(result.valueAreaHigh).toBeLessThanOrEqual(200 + 10);  // allow one bin overshoot
  });
});

// ============================================================================
// BUY / SELL VOLUME SPLIT
// ============================================================================

describe("calculateVolumeProfile — buy/sell volume", () => {
  it("bull candle volume goes to buyVolume", () => {
    // open < close  => bull
    const candle = makeCandle(100, 110, 100, 110, 500);
    const result = calculateVolumeProfile([candle], 5);
    const totalBuy = result.bins.reduce((s, b) => s + b.buyVolume, 0);
    const totalSell = result.bins.reduce((s, b) => s + b.sellVolume, 0);
    expect(totalBuy).toBeGreaterThan(totalSell);
    expect(totalSell).toBeCloseTo(0, 1);
  });

  it("bear candle volume goes to sellVolume", () => {
    // open > close => bear
    const candle = makeCandle(110, 110, 100, 100, 500);
    const result = calculateVolumeProfile([candle], 5);
    const totalSell = result.bins.reduce((s, b) => s + b.sellVolume, 0);
    const totalBuy = result.bins.reduce((s, b) => s + b.buyVolume, 0);
    expect(totalSell).toBeGreaterThan(totalBuy);
    expect(totalBuy).toBeCloseTo(0, 1);
  });

  it("each bin: volume == buyVolume + sellVolume", () => {
    const candles = [bullCandle(100, 150, 600, 0), makeCandle(150, 160, 140, 145, 400, 1)];
    const result = calculateVolumeProfile(candles, 10);
    result.bins.forEach((bin) => {
      expect(bin.buyVolume + bin.sellVolume).toBeCloseTo(bin.volume, 5);
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("calculateVolumeProfile — edge cases", () => {
  it("handles bins=1 without throwing", () => {
    const candles = [bullCandle(100, 200, 500)];
    expect(() => calculateVolumeProfile(candles, 1)).not.toThrow();
    const result = calculateVolumeProfile(candles, 1);
    expect(result.bins).toHaveLength(1);
    expect(result.bins[0].isPointOfControl).toBe(true);
  });

  it("handles a single-candle dataset", () => {
    const candle = makeCandle(50, 100, 50, 75, 1000);
    const result = calculateVolumeProfile([candle], 10);
    expect(result.bins).toHaveLength(10);
    expect(result.totalVolume).toBeCloseTo(1000, 0);
  });

  it("handles large number of bins gracefully", () => {
    const candles = Array.from({ length: 5 }, (_, i) => bullCandle(100, 200, 100, i));
    const result = calculateVolumeProfile(candles, 200);
    expect(result.bins).toHaveLength(200);
    expect(result.totalVolume).toBeCloseTo(500, 0);
  });
});
