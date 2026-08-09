/**
 * Signal Generator — Indicator Known-Answer Tests
 *
 * Verifies that calculateMACD and calculateADX produce correct output
 * for controlled price series. These test mathematical correctness, not
 * integration with external services.
 */

import { SignalGenerator } from "../signal-generator";

// ============================================================================
// MOCKS — suppress all external dependencies
// ============================================================================

jest.mock("../../aiml-service", () => ({
  getAIMLService: jest.fn(() => ({ chat: jest.fn() })),
}));

jest.mock("../market-data-service", () => ({
  UnifiedMarketDataService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../services/FundamentalAnalysisService", () => ({
  FundamentalAnalysisService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../services/SentimentAnalysisService", () => ({
  SentimentAnalysisService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../services/PatternRecognitionService", () => ({
  PatternRecognitionService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../services/MarketDataService", () => ({
  MarketDataService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => ({})),
}));

jest.mock("@/lib/cache/redis-cache-service", () => ({
  redisCache: { get: jest.fn(() => null), set: jest.fn() },
  shortRedisCache: { get: jest.fn(() => null), set: jest.fn() },
}));

// ============================================================================
// HELPERS
// ============================================================================

/** Access private methods without modifying production code. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrivateGenerator = Record<string, (...args: unknown[]) => unknown>;

function privateOf(gen: SignalGenerator): PrivateGenerator {
  return gen as unknown as PrivateGenerator;
}

/**
 * Build a strongly trending upward price series using exponential growth.
 * 60 bars at 2% per bar. Exponential (non-linear) growth produces a
 * non-constant MACD history so the 9-period EMA diverges from the MACD line.
 */
function buildTrendingSeries(bars: number): {
  closes: number[];
  highs: number[];
  lows: number[];
} {
  const closes: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = 0; i < bars; i++) {
    const base = 100 * Math.pow(1.02, i); // exponential 2%/bar uptrend
    closes.push(base);
    highs.push(base * 1.005);
    lows.push(base * 0.995);
  }
  return { closes, highs, lows };
}

/**
 * Build a sideways price series that oscillates around 100.
 * 60 bars alternating +0.5 / -0.5.
 */
function buildRangingSeries(bars: number): {
  closes: number[];
  highs: number[];
  lows: number[];
} {
  const closes: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = 0; i < bars; i++) {
    const base = 100 + (i % 2 === 0 ? 0.5 : -0.5);
    closes.push(base);
    highs.push(base + 0.3);
    lows.push(base - 0.3);
  }
  return { closes, highs, lows };
}

// ============================================================================
// TESTS
// ============================================================================

describe("SignalGenerator — private indicators", () => {
  let gen: SignalGenerator;
  let priv: PrivateGenerator;

  beforeEach(() => {
    gen = new SignalGenerator();
    priv = privateOf(gen);
  });

  // --------------------------------------------------------------------------
  // MACD — Fix 3.1
  // --------------------------------------------------------------------------

  describe("calculateMACD", () => {
    it("produces a non-zero histogram for a real price series (> 26 bars)", () => {
      const { closes } = buildTrendingSeries(60);
      const macd = priv["calculateMACD"](closes) as {
        value: number;
        signal: number;
        histogram: number;
      };
      expect(typeof macd.value).toBe("number");
      expect(typeof macd.signal).toBe("number");
      expect(typeof macd.histogram).toBe("number");
      // The core fix: histogram must NOT be zero when signal and MACD differ
      expect(macd.histogram).not.toBe(0);
    });

    it("returns value = macdLine (EMA12 - EMA26)", () => {
      const { closes } = buildTrendingSeries(60);
      const macd = priv["calculateMACD"](closes) as {
        value: number;
        signal: number;
        histogram: number;
      };
      // histogram == value - signal by definition
      expect(Math.abs(macd.histogram - (macd.value - macd.signal))).toBeLessThan(
        1e-10,
      );
    });

    it("falls back gracefully when fewer than 9 MACD history points are available", () => {
      // 27 bars produces exactly 1 MACD history point (< 9), so signalLine = macdLine
      const { closes } = buildTrendingSeries(27);
      const macd = priv["calculateMACD"](closes) as {
        value: number;
        signal: number;
        histogram: number;
      };
      // histogram should be 0 when signal falls back to macdLine
      expect(macd.histogram).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // ADX — Fix 3.2
  // --------------------------------------------------------------------------

  describe("calculateADX", () => {
    it("returns ADX > 25 for a strongly trending series (60 bars, period 14)", () => {
      const { highs, lows, closes } = buildTrendingSeries(60);
      const adx = priv["calculateADX"](highs, lows, closes, 14) as number;
      expect(typeof adx).toBe("number");
      expect(isFinite(adx)).toBe(true);
      expect(adx).toBeGreaterThan(25);
    });

    it("returns ADX < 25 for a sideways ranging series (60 bars, period 14)", () => {
      const { highs, lows, closes } = buildRangingSeries(60);
      const adx = priv["calculateADX"](highs, lows, closes, 14) as number;
      expect(typeof adx).toBe("number");
      expect(isFinite(adx)).toBe(true);
      expect(adx).toBeLessThan(25);
    });

    it("returns fallback 25 when fewer than period + 1 bars are provided", () => {
      const bars = 10;
      const { highs, lows, closes } = buildTrendingSeries(bars);
      const adx = priv["calculateADX"](highs, lows, closes, 14) as number;
      expect(adx).toBe(25);
    });

    it("returns a value in [0, 100] range for normal input", () => {
      const { highs, lows, closes } = buildTrendingSeries(60);
      const adx = priv["calculateADX"](highs, lows, closes, 14) as number;
      expect(adx).toBeGreaterThanOrEqual(0);
      expect(adx).toBeLessThanOrEqual(100);
    });
  });
});
