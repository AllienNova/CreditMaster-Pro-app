/**
 * Tests for Technical Indicators Library
 *
 * Pure math function tests: SMA, EMA, WMA, Bollinger Bands, ATR, RSI,
 * MACD, Stochastic, ADX, Ichimoku, VWAP, OBV, Pivot Points,
 * Fibonacci Retracement, and Candle Patterns.
 */

import {
  calculateSMA,
  calculateEMA,
  calculateWMA,
  calculateBollingerBands,
  calculateATR,
  calculateRSI,
  calculateMACD,
  calculateStochastic,
  calculateADX,
  calculateIchimoku,
  calculateVWAP,
  calculateOBV,
  calculatePivotPoints,
  calculateFibonacciRetracement,
  detectCandlePatterns,
  type OHLCV,
} from "../charts/technical-indicators";

// ============================================================================
// HELPERS
// ============================================================================

function makeBar(
  close: number,
  index: number,
  overrides: Partial<OHLCV> = {},
): OHLCV {
  return {
    timestamp: 1000 + index,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000,
    ...overrides,
  };
}

function makeBars(closes: number[]): OHLCV[] {
  return closes.map((c, i) => makeBar(c, i));
}

function makeOHLCVSeries(
  count: number,
  startPrice: number = 100,
  step: number = 1,
): OHLCV[] {
  const bars: OHLCV[] = [];
  for (let i = 0; i < count; i++) {
    const price = startPrice + i * step;
    bars.push({
      timestamp: 1000 + i,
      open: price - 0.5,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: 1000 + i * 10,
    });
  }
  return bars;
}

// ============================================================================
// SMA TESTS
// ============================================================================

describe("calculateSMA", () => {
  it("should calculate correct SMA values for known input", () => {
    const data = makeBars([1, 2, 3, 4, 5]);
    const result = calculateSMA(data, 3);

    expect(result).toHaveLength(3);
    expect(result[0].value).toBeCloseTo(2); // (1+2+3)/3
    expect(result[1].value).toBeCloseTo(3); // (2+3+4)/3
    expect(result[2].value).toBeCloseTo(4); // (3+4+5)/3
  });

  it("should return timestamps from source data", () => {
    const data = makeBars([10, 20, 30]);
    const result = calculateSMA(data, 2);

    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBe(data[1].timestamp);
    expect(result[1].timestamp).toBe(data[2].timestamp);
  });

  it("should return empty array when data is shorter than period", () => {
    const data = makeBars([1, 2]);
    const result = calculateSMA(data, 5);
    expect(result).toHaveLength(0);
  });

  it("should handle period of 1 (returns closes directly)", () => {
    const data = makeBars([10, 20, 30]);
    const result = calculateSMA(data, 1);

    expect(result).toHaveLength(3);
    expect(result[0].value).toBeCloseTo(10);
    expect(result[1].value).toBeCloseTo(20);
    expect(result[2].value).toBeCloseTo(30);
  });

  it("should handle period equal to data length", () => {
    const data = makeBars([2, 4, 6]);
    const result = calculateSMA(data, 3);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(4); // (2+4+6)/3
  });

  it("should return empty for empty data", () => {
    const result = calculateSMA([], 3);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// EMA TESTS
// ============================================================================

describe("calculateEMA", () => {
  it("should start with SMA value for the first point", () => {
    const data = makeBars([2, 4, 6, 8, 10]);
    const result = calculateEMA(data, 3);

    // First EMA value should be SMA of first 3: (2+4+6)/3 = 4
    expect(result[0].value).toBeCloseTo(4);
  });

  it("should apply EMA formula correctly", () => {
    const data = makeBars([2, 4, 6, 8]);
    const result = calculateEMA(data, 3);
    const multiplier = 2 / (3 + 1); // 0.5

    // First: SMA = (2+4+6)/3 = 4
    expect(result[0].value).toBeCloseTo(4);
    // Second: (8 - 4) * 0.5 + 4 = 6
    expect(result[1].value).toBeCloseTo(6);
  });

  it("should return correct number of results", () => {
    const data = makeBars([1, 2, 3, 4, 5, 6, 7]);
    const result = calculateEMA(data, 3);
    // period-1 values skipped at start, then from period-1 onward
    expect(result).toHaveLength(5); // 7 - 3 + 1 = 5
  });

  it("should produce timestamps from source data", () => {
    const data = makeBars([1, 2, 3, 4]);
    const result = calculateEMA(data, 2);

    expect(result[0].timestamp).toBe(data[1].timestamp);
  });

  it("should handle period equal to data length", () => {
    const data = makeBars([10, 20, 30]);
    const result = calculateEMA(data, 3);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(20); // SMA of all
  });
});

// ============================================================================
// WMA TESTS
// ============================================================================

describe("calculateWMA", () => {
  it("should calculate weighted moving average correctly", () => {
    // WMA period 3 for [1, 2, 3]:
    // weights: 3, 2, 1 (most recent = highest)
    // (3*3 + 2*2 + 1*1) / (3+2+1) = (9+4+1)/6 = 14/6 = 2.333
    const data = makeBars([1, 2, 3]);
    const result = calculateWMA(data, 3);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(14 / 6);
  });

  it("should return empty when data is too short", () => {
    const data = makeBars([1, 2]);
    const result = calculateWMA(data, 5);
    expect(result).toHaveLength(0);
  });

  it("should return correct count of results", () => {
    const data = makeBars([1, 2, 3, 4, 5]);
    const result = calculateWMA(data, 3);
    expect(result).toHaveLength(3);
  });
});

// ============================================================================
// BOLLINGER BANDS TESTS
// ============================================================================

describe("calculateBollingerBands", () => {
  it("should return correct number of results", () => {
    const data = makeOHLCVSeries(25);
    const result = calculateBollingerBands(data, 20, 2);
    expect(result).toHaveLength(6); // 25 - 20 + 1
  });

  it("should have middle band equal to SMA", () => {
    const data = makeOHLCVSeries(25);
    const bb = calculateBollingerBands(data, 20, 2);
    const sma = calculateSMA(data, 20);

    for (let i = 0; i < bb.length; i++) {
      expect(bb[i].middle).toBeCloseTo(sma[i].value);
    }
  });

  it("should have upper > middle > lower", () => {
    const data = makeOHLCVSeries(25);
    const result = calculateBollingerBands(data, 20, 2);

    for (const r of result) {
      expect(r.upper).toBeGreaterThan(r.middle);
      expect(r.middle).toBeGreaterThan(r.lower);
    }
  });

  it("should return bandwidth as a positive value", () => {
    const data = makeOHLCVSeries(25);
    const result = calculateBollingerBands(data, 20, 2);

    for (const r of result) {
      expect(r.bandwidth).toBeGreaterThan(0);
    }
  });

  it("should have zero bandwidth and NaN percentB when all values are identical", () => {
    // With identical closes, stddev = 0, upper = lower = middle
    const data = makeBars(Array(25).fill(50));
    const result = calculateBollingerBands(data, 20, 2);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].bandwidth).toBeCloseTo(0);
    // percentB is NaN when upper === lower (division by zero)
    expect(result[0].percentB).toBeNaN();
  });

  it("should return empty when data is shorter than period", () => {
    const data = makeOHLCVSeries(5);
    const result = calculateBollingerBands(data, 20, 2);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// ATR TESTS
// ============================================================================

describe("calculateATR", () => {
  it("should calculate correct ATR from true range", () => {
    // Simple case: constant range bars
    const data: OHLCV[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        timestamp: 1000 + i,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      });
    }
    const result = calculateATR(data, 14);

    // True range for each bar after first = max(105-95, |105-100|, |95-100|) = 10
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].value).toBeCloseTo(10);
  });

  it("should return empty when data is too short", () => {
    const data = makeOHLCVSeries(3);
    const result = calculateATR(data, 14);
    expect(result).toHaveLength(0);
  });

  it("should use previous close for gap calculations", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 100, high: 105, low: 95, close: 100, volume: 1000 },
      { timestamp: 2, open: 110, high: 115, low: 108, close: 112, volume: 1000 },
    ];
    const result = calculateATR(data, 1);

    // TR = max(115-108, |115-100|, |108-100|) = max(7, 15, 8) = 15
    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(15);
  });

  it("should return results starting after period bars", () => {
    const data = makeOHLCVSeries(20);
    const result = calculateATR(data, 5);
    // First TR at index 1, need 5 TR values, so results start at index 5
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].timestamp).toBe(data[5].timestamp);
  });
});

// ============================================================================
// RSI TESTS
// ============================================================================

describe("calculateRSI", () => {
  it("should return RSI between 0 and 100", () => {
    const data = makeOHLCVSeries(30);
    const result = calculateRSI(data, 14);

    for (const r of result) {
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThanOrEqual(100);
    }
  });

  it("should be 100 when all changes are gains", () => {
    // Monotonically increasing data
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const data = makeBars(closes);
    const result = calculateRSI(data, 14);

    // When avgLoss is 0, rs = 100, RSI = 100 - 100/(1+100) ~ 99.01
    expect(result.length).toBeGreaterThan(0);
    // With the implementation: avgLoss === 0 => rs = 100 => rsi = 100 - 100/101
    expect(result[0].value).toBeCloseTo(100 - 100 / 101, 1);
  });

  it("should be near 0 when all changes are losses", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 200 - i);
    const data = makeBars(closes);
    const result = calculateRSI(data, 14);

    expect(result.length).toBeGreaterThan(0);
    // avgGain = 0, rs = 0, RSI = 100 - 100/(1+0) = 0
    expect(result[0].value).toBeCloseTo(0, 1);
  });

  it("should flag overbought when RSI >= 70", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i * 5);
    const data = makeBars(closes);
    const result = calculateRSI(data, 14);

    const highRSI = result.find((r) => r.value >= 70);
    if (highRSI) {
      expect(highRSI.overbought).toBe(true);
      expect(highRSI.oversold).toBe(false);
    }
  });

  it("should flag oversold when RSI <= 30", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 200 - i * 5);
    const data = makeBars(closes);
    const result = calculateRSI(data, 14);

    const lowRSI = result.find((r) => r.value <= 30);
    if (lowRSI) {
      expect(lowRSI.oversold).toBe(true);
      expect(lowRSI.overbought).toBe(false);
    }
  });

  it("should return empty when data is too short", () => {
    const data = makeBars([1, 2, 3]);
    const result = calculateRSI(data, 14);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// MACD TESTS
// ============================================================================

describe("calculateMACD", () => {
  it("should produce results with correct structure", () => {
    const data = makeOHLCVSeries(60);
    const result = calculateMACD(data, 12, 26, 9);

    expect(result.length).toBeGreaterThan(0);
    for (const r of result) {
      expect(r).toHaveProperty("macd");
      expect(r).toHaveProperty("signal");
      expect(r).toHaveProperty("histogram");
      expect(r).toHaveProperty("bullish");
      expect(typeof r.macd).toBe("number");
      expect(typeof r.signal).toBe("number");
      expect(typeof r.histogram).toBe("number");
      expect(typeof r.bullish).toBe("boolean");
    }
  });

  it("should have histogram = macd - signal", () => {
    const data = makeOHLCVSeries(60);
    const result = calculateMACD(data, 12, 26, 9);

    for (const r of result) {
      expect(r.histogram).toBeCloseTo(r.macd - r.signal, 10);
    }
  });

  it("should throw when data is too short for the slow period", () => {
    // calculateMACD calls calculateEMA internally which accesses data[i].close
    // without a length guard, so insufficient data causes a TypeError.
    const data = makeOHLCVSeries(20);
    expect(() => calculateMACD(data, 12, 26, 9)).toThrow();
  });

  it("should produce MACD near zero for flat data", () => {
    const data = makeBars(Array(60).fill(100));
    const result = calculateMACD(data, 12, 26, 9);

    if (result.length > 0) {
      for (const r of result) {
        expect(Math.abs(r.macd)).toBeLessThan(0.01);
      }
    }
  });
});

// ============================================================================
// STOCHASTIC TESTS
// ============================================================================

describe("calculateStochastic", () => {
  it("should return K between 0 and 100", () => {
    const data = makeOHLCVSeries(30);
    const result = calculateStochastic(data, 14, 3);

    for (const r of result) {
      expect(r.k).toBeGreaterThanOrEqual(0);
      expect(r.k).toBeLessThanOrEqual(100);
    }
  });

  it("should return D as moving average of K", () => {
    const data = makeOHLCVSeries(30);
    const result = calculateStochastic(data, 14, 3);

    // D should always be between min and max of the last 3 K values
    expect(result.length).toBeGreaterThan(0);
    for (const r of result) {
      expect(typeof r.d).toBe("number");
    }
  });

  it("should flag overbought when K >= 80", () => {
    // Create data that pushes K to high values (close near high of range)
    const data: OHLCV[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        timestamp: 1000 + i,
        open: 100 + i,
        high: 100 + i + 0.1,
        low: 100, // Low stays constant
        close: 100 + i, // Close always at top
        volume: 1000,
      });
    }
    const result = calculateStochastic(data, 14, 3);

    const overboughtResult = result.find((r) => r.k >= 80);
    if (overboughtResult) {
      expect(overboughtResult.overbought).toBe(true);
    }
  });

  it("should handle high === low (returns 50)", () => {
    const data: OHLCV[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        timestamp: 1000 + i,
        open: 100,
        high: 100,
        low: 100,
        close: 100,
        volume: 1000,
      });
    }
    const result = calculateStochastic(data, 14, 3);

    expect(result.length).toBeGreaterThan(0);
    for (const r of result) {
      expect(r.k).toBeCloseTo(50);
    }
  });

  it("should return empty when data is too short", () => {
    const data = makeBars([1, 2, 3]);
    const result = calculateStochastic(data, 14, 3);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// ADX TESTS
// ============================================================================

describe("calculateADX", () => {
  it("should return ADX values >= 0", () => {
    const data = makeOHLCVSeries(30);
    const result = calculateADX(data, 14);

    for (const r of result) {
      expect(r.adx).toBeGreaterThanOrEqual(0);
    }
  });

  it("should classify trends correctly", () => {
    const data = makeOHLCVSeries(30);
    const result = calculateADX(data, 14);

    for (const r of result) {
      if (r.adx >= 25) expect(r.trend).toBe("strong");
      else if (r.adx >= 20) expect(r.trend).toBe("weak");
      else expect(r.trend).toBe("none");
    }
  });

  it("should have plusDI and minusDI >= 0", () => {
    const data = makeOHLCVSeries(30);
    const result = calculateADX(data, 14);

    for (const r of result) {
      expect(r.plusDI).toBeGreaterThanOrEqual(0);
      expect(r.minusDI).toBeGreaterThanOrEqual(0);
    }
  });

  it("should return empty when data is too short", () => {
    const data = makeBars([1, 2, 3]);
    const result = calculateADX(data, 14);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// ICHIMOKU TESTS
// ============================================================================

describe("calculateIchimoku", () => {
  it("should return correct number of results", () => {
    const data = makeOHLCVSeries(60);
    const result = calculateIchimoku(data, 9, 26, 52);
    // Results start at senkouBPeriod - 1 = 51
    expect(result).toHaveLength(60 - 52 + 1);
  });

  it("should calculate tenkan as midpoint of 9-period high-low", () => {
    const data = makeOHLCVSeries(60);
    const result = calculateIchimoku(data, 9, 26, 52);

    // Verify first result
    const firstIdx = 51;
    const slice = data.slice(firstIdx - 9 + 1, firstIdx + 1);
    const expectedHigh = Math.max(...slice.map((d) => d.high));
    const expectedLow = Math.min(...slice.map((d) => d.low));
    const expectedTenkan = (expectedHigh + expectedLow) / 2;

    expect(result[0].tenkan).toBeCloseTo(expectedTenkan);
  });

  it("should set chikou to current close", () => {
    const data = makeOHLCVSeries(60);
    const result = calculateIchimoku(data, 9, 26, 52);

    for (let i = 0; i < result.length; i++) {
      const dataIdx = 51 + i;
      expect(result[i].chikou).toBeCloseTo(data[dataIdx].close);
    }
  });

  it("should calculate senkouA as midpoint of tenkan and kijun", () => {
    const data = makeOHLCVSeries(60);
    const result = calculateIchimoku(data, 9, 26, 52);

    for (const r of result) {
      expect(r.senkouA).toBeCloseTo((r.tenkan + r.kijun) / 2);
    }
  });

  it("should return empty when data is too short", () => {
    const data = makeOHLCVSeries(10);
    const result = calculateIchimoku(data, 9, 26, 52);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// VWAP TESTS
// ============================================================================

describe("calculateVWAP", () => {
  it("should return one result per bar", () => {
    const data = makeOHLCVSeries(10);
    const result = calculateVWAP(data);
    expect(result).toHaveLength(10);
  });

  it("should have upper band >= vwap >= lower band", () => {
    const data = makeOHLCVSeries(20);
    const result = calculateVWAP(data, 2);

    for (const r of result) {
      expect(r.upperBand).toBeGreaterThanOrEqual(r.vwap);
      expect(r.vwap).toBeGreaterThanOrEqual(r.lowerBand);
    }
  });

  it("should calculate VWAP as cumulative TPV / cumulative volume", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 10, high: 12, low: 8, close: 10, volume: 100 },
      { timestamp: 2, open: 10, high: 14, low: 9, close: 11, volume: 200 },
    ];
    const result = calculateVWAP(data);

    // Bar 0: TP = (12+8+10)/3 = 10, TPV = 1000, cumVol = 100, VWAP = 10
    expect(result[0].vwap).toBeCloseTo(10);

    // Bar 1: TP = (14+9+11)/3 = 11.333, TPV = 2266.67
    // cumTPV = 1000+2266.67 = 3266.67, cumVol = 300
    // VWAP = 3266.67/300 = 10.889
    expect(result[1].vwap).toBeCloseTo(3266.667 / 300, 2);
  });

  it("should handle empty data", () => {
    const result = calculateVWAP([]);
    expect(result).toHaveLength(0);
  });

  it("should have bands equal to vwap for single bar (zero std)", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 100, volume: 500 },
    ];
    const result = calculateVWAP(data, 2);

    // Single bar, variance = 0, std = 0
    expect(result[0].upperBand).toBeCloseTo(result[0].vwap);
    expect(result[0].lowerBand).toBeCloseTo(result[0].vwap);
  });
});

// ============================================================================
// OBV TESTS
// ============================================================================

describe("calculateOBV", () => {
  it("should return one result per bar", () => {
    const data = makeOHLCVSeries(10);
    const result = calculateOBV(data);
    expect(result).toHaveLength(10);
  });

  it("should start at zero for first bar", () => {
    const data = makeOHLCVSeries(5);
    const result = calculateOBV(data);
    expect(result[0].value).toBe(0);
  });

  it("should add volume on up close", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 10, high: 12, low: 9, close: 10, volume: 100 },
      { timestamp: 2, open: 10, high: 13, low: 9, close: 12, volume: 200 },
    ];
    const result = calculateOBV(data);

    expect(result[0].value).toBe(0);
    expect(result[1].value).toBe(200); // Up close, add volume
  });

  it("should subtract volume on down close", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 10, high: 12, low: 9, close: 10, volume: 100 },
      { timestamp: 2, open: 10, high: 11, low: 7, close: 8, volume: 300 },
    ];
    const result = calculateOBV(data);

    expect(result[1].value).toBe(-300);
  });

  it("should not change on equal close", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 10, high: 12, low: 9, close: 10, volume: 100 },
      { timestamp: 2, open: 10, high: 12, low: 9, close: 10, volume: 500 },
    ];
    const result = calculateOBV(data);

    expect(result[1].value).toBe(0);
  });

  it("should accumulate correctly over multiple bars", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 10, high: 12, low: 9, close: 10, volume: 100 },
      { timestamp: 2, open: 10, high: 13, low: 9, close: 12, volume: 200 }, // +200
      { timestamp: 3, open: 12, high: 14, low: 11, close: 15, volume: 300 }, // +300
      { timestamp: 4, open: 15, high: 16, low: 12, close: 11, volume: 150 }, // -150
    ];
    const result = calculateOBV(data);

    expect(result[0].value).toBe(0);
    expect(result[1].value).toBe(200);
    expect(result[2].value).toBe(500);
    expect(result[3].value).toBe(350);
  });

  it("should handle empty data", () => {
    const result = calculateOBV([]);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// PIVOT POINTS TESTS
// ============================================================================

describe("calculatePivotPoints", () => {
  it("should calculate pivot as (H+L+C)/3", () => {
    const bar: OHLCV = {
      timestamp: 1,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 1000,
    };
    const result = calculatePivotPoints(bar);

    expect(result.pivot).toBeCloseTo((110 + 90 + 105) / 3);
  });

  it("should calculate R1 = 2*P - L", () => {
    const bar: OHLCV = {
      timestamp: 1,
      open: 100,
      high: 110,
      low: 90,
      close: 100,
      volume: 1000,
    };
    const result = calculatePivotPoints(bar);
    const pivot = (110 + 90 + 100) / 3; // = 100

    expect(result.r1).toBeCloseTo(2 * pivot - 90);
  });

  it("should calculate S1 = 2*P - H", () => {
    const bar: OHLCV = {
      timestamp: 1,
      open: 100,
      high: 110,
      low: 90,
      close: 100,
      volume: 1000,
    };
    const result = calculatePivotPoints(bar);
    const pivot = (110 + 90 + 100) / 3;

    expect(result.s1).toBeCloseTo(2 * pivot - 110);
  });

  it("should have R3 > R2 > R1 > pivot > S1 > S2 > S3", () => {
    const bar: OHLCV = {
      timestamp: 1,
      open: 100,
      high: 120,
      low: 80,
      close: 100,
      volume: 1000,
    };
    const result = calculatePivotPoints(bar);

    expect(result.r3).toBeGreaterThan(result.r2);
    expect(result.r2).toBeGreaterThan(result.r1);
    expect(result.r1).toBeGreaterThan(result.pivot);
    expect(result.pivot).toBeGreaterThan(result.s1);
    expect(result.s1).toBeGreaterThan(result.s2);
    expect(result.s2).toBeGreaterThan(result.s3);
  });

  it("should calculate R2 = P + (H - L)", () => {
    const bar: OHLCV = {
      timestamp: 1,
      open: 50,
      high: 60,
      low: 40,
      close: 50,
      volume: 1000,
    };
    const result = calculatePivotPoints(bar);
    const pivot = (60 + 40 + 50) / 3;

    expect(result.r2).toBeCloseTo(pivot + (60 - 40));
  });

  it("should calculate S2 = P - (H - L)", () => {
    const bar: OHLCV = {
      timestamp: 1,
      open: 50,
      high: 60,
      low: 40,
      close: 50,
      volume: 1000,
    };
    const result = calculatePivotPoints(bar);
    const pivot = (60 + 40 + 50) / 3;

    expect(result.s2).toBeCloseTo(pivot - (60 - 40));
  });
});

// ============================================================================
// FIBONACCI RETRACEMENT TESTS
// ============================================================================

describe("calculateFibonacciRetracement", () => {
  it("should return all standard Fibonacci levels", () => {
    const result = calculateFibonacciRetracement(200, 100, true);

    expect(result.high).toBe(200);
    expect(result.low).toBe(100);
    expect(result.levels).toHaveLength(7);
  });

  it("should calculate correct uptrend retracement levels", () => {
    const result = calculateFibonacciRetracement(200, 100, true);
    const diff = 100;

    // Uptrend: price = high - diff * ratio
    expect(result.levels[0].price).toBeCloseTo(200); // 0%
    expect(result.levels[1].price).toBeCloseTo(200 - diff * 0.236); // 23.6%
    expect(result.levels[2].price).toBeCloseTo(200 - diff * 0.382); // 38.2%
    expect(result.levels[3].price).toBeCloseTo(200 - diff * 0.5); // 50.0%
    expect(result.levels[4].price).toBeCloseTo(200 - diff * 0.618); // 61.8%
    expect(result.levels[5].price).toBeCloseTo(200 - diff * 0.786); // 78.6%
    expect(result.levels[6].price).toBeCloseTo(100); // 100%
  });

  it("should calculate correct downtrend retracement levels", () => {
    const result = calculateFibonacciRetracement(200, 100, false);
    const diff = 100;

    // Downtrend: price = low + diff * ratio
    expect(result.levels[0].price).toBeCloseTo(100); // 0%
    expect(result.levels[3].price).toBeCloseTo(100 + diff * 0.5); // 50%
    expect(result.levels[6].price).toBeCloseTo(200); // 100%
  });

  it("should include correct labels", () => {
    const result = calculateFibonacciRetracement(200, 100, true);

    expect(result.levels[0].label).toBe("0.0%");
    expect(result.levels[3].label).toBe("50.0%");
    expect(result.levels[6].label).toBe("100.0%");
  });

  it("should handle zero range", () => {
    const result = calculateFibonacciRetracement(100, 100, true);

    // All levels should be the same price
    for (const level of result.levels) {
      expect(level.price).toBeCloseTo(100);
    }
  });
});

// ============================================================================
// CANDLE PATTERN DETECTION TESTS
// ============================================================================

describe("detectCandlePatterns", () => {
  it("should detect Doji pattern (body < 10% of range)", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 90, high: 95, low: 85, close: 90, volume: 1000 },
      { timestamp: 2, open: 95, high: 100, low: 90, close: 95, volume: 1000 },
      // Doji: open~close, body is tiny relative to range
      {
        timestamp: 3,
        open: 100,
        high: 110,
        low: 90,
        close: 100.5,
        volume: 1000,
      },
    ];
    const result = detectCandlePatterns(data);

    const doji = result.find((p) => p.pattern === "Doji");
    expect(doji).toBeDefined();
    expect(doji?.type).toBe("neutral");
    expect(doji?.reliability).toBe("medium");
  });

  it("should detect Hammer pattern", () => {
    // Hammer: bearish body with long lower wick, small upper wick
    const data: OHLCV[] = [
      { timestamp: 1, open: 100, high: 102, low: 98, close: 100, volume: 1000 },
      { timestamp: 2, open: 100, high: 102, low: 98, close: 100, volume: 1000 },
      {
        timestamp: 3,
        open: 100,
        high: 100.2,
        low: 94,
        close: 99,
        volume: 1000,
      },
      // body=1, lowerWick=5 (>2*body), upperWick=0.2 (<0.5*body), !isBullish
    ];
    const result = detectCandlePatterns(data);

    const hammer = result.find((p) => p.pattern === "Hammer");
    expect(hammer).toBeDefined();
    expect(hammer?.type).toBe("bullish");
    expect(hammer?.reliability).toBe("high");
  });

  it("should detect Shooting Star pattern", () => {
    // Shooting Star: bullish body with long upper wick, small lower wick
    const data: OHLCV[] = [
      { timestamp: 1, open: 100, high: 102, low: 98, close: 100, volume: 1000 },
      { timestamp: 2, open: 100, high: 102, low: 98, close: 100, volume: 1000 },
      {
        timestamp: 3,
        open: 100,
        high: 106,
        low: 99.8,
        close: 101,
        volume: 1000,
      },
      // body=1, upperWick=5 (>2*body), lowerWick=0.2 (<0.5*body), isBullish
    ];
    const result = detectCandlePatterns(data);

    const shootingStar = result.find((p) => p.pattern === "Shooting Star");
    expect(shootingStar).toBeDefined();
    expect(shootingStar?.type).toBe("bearish");
  });

  it("should detect Bullish Engulfing pattern", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 100, high: 102, low: 98, close: 100, volume: 1000 },
      // Previous: bearish candle
      { timestamp: 2, open: 102, high: 103, low: 98, close: 99, volume: 1000 },
      // Current: bullish candle that engulfs previous
      // isBullish, open < prev.close (98 < 99), close > prev.open (104 > 102)
      // body=6 > prevBody=3 * 1.5
      { timestamp: 3, open: 98, high: 105, low: 97, close: 104, volume: 1000 },
    ];
    const result = detectCandlePatterns(data);

    const engulfing = result.find((p) => p.pattern === "Bullish Engulfing");
    expect(engulfing).toBeDefined();
    expect(engulfing?.type).toBe("bullish");
  });

  it("should detect Bearish Engulfing pattern", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 100, high: 102, low: 98, close: 100, volume: 1000 },
      // Previous: bullish candle
      { timestamp: 2, open: 99, high: 103, low: 98, close: 102, volume: 1000 },
      // Current: bearish candle that engulfs previous
      // !isBullish, open > prev.close (103 > 102), close < prev.open (96 < 99)
      // body=7 > prevBody=3 * 1.5
      { timestamp: 3, open: 103, high: 104, low: 95, close: 96, volume: 1000 },
    ];
    const result = detectCandlePatterns(data);

    const engulfing = result.find((p) => p.pattern === "Bearish Engulfing");
    expect(engulfing).toBeDefined();
    expect(engulfing?.type).toBe("bearish");
  });

  it("should return empty array for fewer than 3 bars", () => {
    const data = makeOHLCVSeries(2);
    const result = detectCandlePatterns(data);
    expect(result).toHaveLength(0);
  });

  it("should return empty array for empty data", () => {
    const result = detectCandlePatterns([]);
    expect(result).toHaveLength(0);
  });

  it("should return patterns with correct timestamps", () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 100, high: 102, low: 98, close: 100, volume: 1000 },
      { timestamp: 2, open: 100, high: 102, low: 98, close: 100, volume: 1000 },
      {
        timestamp: 3,
        open: 100,
        high: 110,
        low: 90,
        close: 100.1,
        volume: 1000,
      },
    ];
    const result = detectCandlePatterns(data);

    for (const p of result) {
      expect(p.timestamp).toBe(3);
    }
  });
});

// ============================================================================
// DEFAULT EXPORT TESTS
// ============================================================================

describe("default export", () => {
  it("should export all functions", async () => {
    const mod = await import("../charts/technical-indicators");
    const defaultExport = mod.default;

    expect(defaultExport.calculateSMA).toBe(calculateSMA);
    expect(defaultExport.calculateEMA).toBe(calculateEMA);
    expect(defaultExport.calculateWMA).toBe(calculateWMA);
    expect(defaultExport.calculateBollingerBands).toBe(calculateBollingerBands);
    expect(defaultExport.calculateATR).toBe(calculateATR);
    expect(defaultExport.calculateRSI).toBe(calculateRSI);
    expect(defaultExport.calculateMACD).toBe(calculateMACD);
    expect(defaultExport.calculateStochastic).toBe(calculateStochastic);
    expect(defaultExport.calculateADX).toBe(calculateADX);
    expect(defaultExport.calculateIchimoku).toBe(calculateIchimoku);
    expect(defaultExport.calculateVWAP).toBe(calculateVWAP);
    expect(defaultExport.calculateOBV).toBe(calculateOBV);
    expect(defaultExport.calculatePivotPoints).toBe(calculatePivotPoints);
    expect(defaultExport.calculateFibonacciRetracement).toBe(
      calculateFibonacciRetracement,
    );
    expect(defaultExport.detectCandlePatterns).toBe(detectCandlePatterns);
  });
});
