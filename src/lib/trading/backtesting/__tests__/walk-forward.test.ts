/**
 * Tests for Walk-Forward Optimization
 *
 * Validates the walk-forward analysis extension to the BacktestEngine.
 */

import type { OHLCV } from "../../charts/technical-indicators";
import {
  BacktestEngine,
  createBacktestEngine,
  type BacktestStrategy,
  type WalkForwardResult,
} from "../backtest-engine";

// ============================================================================
// TEST DATA GENERATOR
// ============================================================================

function generateOHLCV(days: number, startPrice: number = 100): OHLCV[] {
  const data: OHLCV[] = [];
  let price = startPrice;
  // Use a recent base date so data falls within the engine's default date range
  const baseDate = new Date("2025-01-01").getTime();

  for (let i = 0; i < days; i++) {
    // Simple random walk with slight upward bias
    const change = (Math.random() - 0.48) * 2;
    price = Math.max(10, price + change);
    const high = price + Math.random() * 2;
    const low = price - Math.random() * 2;
    const open = price + (Math.random() - 0.5);

    data.push({
      timestamp: baseDate + i * 24 * 60 * 60 * 1000,
      open,
      high,
      low,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    });
  }

  return data;
}

// ============================================================================
// SIMPLE TEST STRATEGY
// ============================================================================

const testStrategy: BacktestStrategy = {
  name: "Test SMA Crossover",
  entryRules: [
    {
      indicator: "close",
      operator: "gt",
      value: "sma_20",
    },
  ],
  exitRules: [
    {
      indicator: "close",
      operator: "lt",
      value: "sma_20",
    },
  ],
  positionSizing: "percent",
  stopLoss: { type: "percent", value: 5 },
};

// ============================================================================
// TESTS
// ============================================================================

describe("BacktestEngine Walk-Forward Optimization", () => {
  let engine: BacktestEngine;

  beforeEach(() => {
    engine = createBacktestEngine({
      initialCapital: 100000,
      commissionPerTrade: 1,
      slippageBps: 5,
      // Wide date range to accept all generated test data
      startDate: new Date("2020-01-01"),
      endDate: new Date("2030-01-01"),
    });
  });

  describe("runWalkForward", () => {
    it("returns WalkForwardResult with correct structure", async () => {
      const data = generateOHLCV(1000);
      engine.loadData("TEST", data);

      const result = await engine.runWalkForward("TEST", testStrategy, 3);

      expect(result).toBeDefined();
      expect(result.inSampleResults).toBeDefined();
      expect(result.outOfSampleResults).toBeDefined();
      expect(typeof result.robustnessScore).toBe("number");
      expect(result.optimizedParams).toBeDefined();
    });

    it("produces the correct number of windows", async () => {
      const data = generateOHLCV(1000);
      engine.loadData("TEST", data);

      const result = await engine.runWalkForward("TEST", testStrategy, 5);

      expect(result.inSampleResults).toHaveLength(5);
      // Out-of-sample may be 4-5 depending on data length alignment
      expect(result.outOfSampleResults.length).toBeGreaterThanOrEqual(4);
      expect(result.outOfSampleResults.length).toBeLessThanOrEqual(5);
    });

    it("throws on missing symbol data", async () => {
      await expect(
        engine.runWalkForward("MISSING", testStrategy),
      ).rejects.toThrow("No data loaded");
    });

    it("throws on insufficient data for requested windows", async () => {
      const data = generateOHLCV(100); // Too few for 5 windows of 100+ bars
      engine.loadData("TEST", data);

      await expect(
        engine.runWalkForward("TEST", testStrategy, 5),
      ).rejects.toThrow("Insufficient data");
    });

    it("robustness score is between 0 and 100", async () => {
      const data = generateOHLCV(1000);
      engine.loadData("TEST", data);

      const result = await engine.runWalkForward("TEST", testStrategy, 3);

      expect(result.robustnessScore).toBeGreaterThanOrEqual(0);
      expect(result.robustnessScore).toBeLessThanOrEqual(100);
    });

    it("in-sample results are valid BacktestResults", async () => {
      const data = generateOHLCV(1000);
      engine.loadData("TEST", data);

      const result = await engine.runWalkForward("TEST", testStrategy, 3);

      result.inSampleResults.forEach((r) => {
        expect(r.strategyName).toBe("Test SMA Crossover");
        expect(r.symbol).toBe("TEST");
        expect(typeof r.totalReturn).toBe("number");
        expect(typeof r.sharpeRatio).toBe("number");
        expect(typeof r.maxDrawdown).toBe("number");
        expect(typeof r.totalTrades).toBe("number");
        expect(r.trades).toBeDefined();
        expect(Array.isArray(r.equityCurve)).toBe(true);
      });
    });

    it("out-of-sample results are valid BacktestResults", async () => {
      const data = generateOHLCV(1000);
      engine.loadData("TEST", data);

      const result = await engine.runWalkForward("TEST", testStrategy, 3);

      result.outOfSampleResults.forEach((r) => {
        expect(r.strategyName).toBe("Test SMA Crossover");
        expect(r.symbol).toBe("TEST");
        expect(typeof r.totalReturn).toBe("number");
        expect(typeof r.sharpeRatio).toBe("number");
        expect(r.trades).toBeDefined();
      });
    });

    it("uses default parameters when called with minimal args", async () => {
      const data = generateOHLCV(1500);
      engine.loadData("TEST", data);

      // Default: 5 windows, 0.7 in-sample ratio
      const result = await engine.runWalkForward("TEST", testStrategy);

      expect(result.inSampleResults).toHaveLength(5);
    });

    it("respects custom in-sample ratio", async () => {
      const data = generateOHLCV(1000);
      engine.loadData("TEST", data);

      // 80% in-sample means smaller out-of-sample windows
      const result = await engine.runWalkForward("TEST", testStrategy, 3, 0.8);

      expect(result.inSampleResults).toHaveLength(3);
      expect(result.outOfSampleResults.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("parameter optimization", () => {
    it("optimizes parameters when paramRanges provided", async () => {
      const data = generateOHLCV(1000);
      engine.loadData("TEST", data);

      const paramRanges = {
        period: { min: 10, max: 30, step: 10 },
      };

      const result = await engine.runWalkForward(
        "TEST",
        testStrategy,
        3,
        0.7,
        paramRanges,
      );

      expect(result).toBeDefined();
      expect(result.optimizedParams).toBeDefined();
      // Should have attempted optimization
      expect(result.inSampleResults).toHaveLength(3);
    });
  });

  describe("edge cases", () => {
    it("handles strategy with no trades gracefully", async () => {
      const data = generateOHLCV(600);
      engine.loadData("TEST", data);

      // Strategy with impossible conditions
      const impossibleStrategy: BacktestStrategy = {
        name: "Impossible",
        entryRules: [
          { indicator: "rsi_14", operator: "gt", value: 200 }, // RSI never > 200
        ],
        exitRules: [{ indicator: "rsi_14", operator: "lt", value: -100 }],
        positionSizing: "percent",
      };

      const result = await engine.runWalkForward(
        "TEST",
        impossibleStrategy,
        3,
      );
      expect(result).toBeDefined();
      expect(result.robustnessScore).toBeGreaterThanOrEqual(0);
    });

    it("handles 2 windows (minimum useful configuration)", async () => {
      const data = generateOHLCV(500);
      engine.loadData("TEST", data);

      const result = await engine.runWalkForward("TEST", testStrategy, 2);

      expect(result.inSampleResults).toHaveLength(2);
      expect(result.outOfSampleResults.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("createBacktestEngine factory", () => {
  it("creates an engine with default config", () => {
    const engine = createBacktestEngine();
    expect(engine).toBeInstanceOf(BacktestEngine);
  });

  it("creates an engine with custom config", () => {
    const engine = createBacktestEngine({ initialCapital: 50000 });
    expect(engine).toBeInstanceOf(BacktestEngine);
  });
});
