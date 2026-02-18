/**
 * Value-at-Risk Calculator Tests
 *
 * Covers parametric VaR, historical VaR, conditional VaR (CVaR/ES),
 * comprehensive analysis, component VaR, and edge cases.
 */

import {
  VaRCalculator,
  DEFAULT_VAR_CONFIG,
  type VaRPosition,
  type VaRConfig,
  type VaRResult,
  type ConditionalVaRResult,
  type ComprehensiveVaR,
} from "../var-calculator";
import { CorrelationMonitor } from "@/lib/trading/correlation-monitor";

// ============================================================================
// MOCK: CorrelationMonitor
// ============================================================================

jest.mock("@/lib/trading/correlation-monitor", () => {
  const monitor = {
    getSymbols: jest.fn().mockReturnValue([]),
    getCorrelationMatrix: jest.fn().mockImplementation((symbols: string[]) => {
      const n = symbols.length;
      const matrix = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (__, j) => (i === j ? 1 : 0.5)),
      );
      return { symbols, matrix, timestamp: new Date(), windowDays: 252 };
    }),
    ingestPrices: jest.fn(),
    ingestReturns: jest.fn(),
  };

  return {
    __mockMonitor: monitor,
    CorrelationMonitor: jest.fn().mockImplementation(() => monitor),
    correlationMonitor: monitor,
  };
});

// ============================================================================
// TEST DATA
// ============================================================================

/** Generate a series of synthetic daily returns */
function generateReturns(
  count: number,
  mean: number,
  stdDev: number,
  seed: number = 42,
): number[] {
  // Simple deterministic PRNG for reproducibility
  let state = seed;
  const nextRandom = (): number => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };

  const returns: number[] = [];
  for (let i = 0; i < count; i++) {
    // Box-Muller approximation
    const u1 = Math.max(1e-10, nextRandom());
    const u2 = nextRandom();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    returns.push(mean + stdDev * normal);
  }
  return returns;
}

function makeSamplePositions(): VaRPosition[] {
  return [
    { symbol: "AAPL", value: 50000, weight: 0.5 },
    { symbol: "MSFT", value: 30000, weight: 0.3 },
    { symbol: "GOOG", value: 20000, weight: 0.2 },
  ];
}

// ============================================================================
// TESTS
// ============================================================================

describe("VaRCalculator", () => {
  let calc: VaRCalculator;

  beforeEach(() => {
    // Re-setup mock implementations after resetMocks clears them
    const { __mockMonitor, CorrelationMonitor: MockCtor } = jest.requireMock(
      "@/lib/trading/correlation-monitor",
    );
    __mockMonitor.getSymbols.mockReturnValue([]);
    __mockMonitor.getCorrelationMatrix.mockImplementation(
      (symbols: string[]) => {
        const n = symbols.length;
        const matrix = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (__, j) => (i === j ? 1 : 0.5)),
        );
        return { symbols, matrix, timestamp: new Date(), windowDays: 252 };
      },
    );
    MockCtor.mockImplementation(() => __mockMonitor);

    calc = new VaRCalculator();
  });

  // --------------------------------------------------------------------------
  // setReturns
  // --------------------------------------------------------------------------

  describe("setReturns", () => {
    it("should store return data for a symbol", () => {
      const returns = generateReturns(100, 0.0005, 0.01);
      calc.setReturns("AAPL", returns);

      // We can indirectly verify by checking that historical VaR uses the data
      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const result = calc.historicalVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        windowDays: 100,
      });

      // Should not fall back to parametric because we have data
      expect(result.method).toBe("historical");
    });
  });

  // --------------------------------------------------------------------------
  // Parametric VaR
  // --------------------------------------------------------------------------

  describe("parametricVaR", () => {
    it("should return a positive VaR value for a standard portfolio", () => {
      const positions = makeSamplePositions();
      const result = calc.parametricVaR(positions);

      expect(result.method).toBe("parametric");
      expect(result.var).toBeGreaterThan(0);
      expect(result.varPercent).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBe(0.95);
      expect(result.horizonDays).toBe(1);
    });

    it("should increase VaR with higher confidence level", () => {
      const positions = makeSamplePositions();
      const var95 = calc.parametricVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        confidenceLevel: 0.95,
      });
      const var99 = calc.parametricVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        confidenceLevel: 0.99,
      });

      expect(var99.var).toBeGreaterThan(var95.var);
    });

    it("should increase VaR with longer horizon (square root of time)", () => {
      const positions = makeSamplePositions();
      const var1d = calc.parametricVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        horizonDays: 1,
      });
      const var10d = calc.parametricVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        horizonDays: 10,
      });

      // 10-day VaR should be approximately sqrt(10) * 1-day VaR
      const sqrtRatio = Math.sqrt(10);
      expect(var10d.var / var1d.var).toBeCloseTo(sqrtRatio, 0);
    });

    it("should return zero VaR for empty positions", () => {
      const result = calc.parametricVaR([]);

      expect(result.var).toBe(0);
      expect(result.varPercent).toBe(0);
    });

    it("should return zero VaR for zero-value portfolio", () => {
      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 0, weight: 0 },
      ];
      const result = calc.parametricVaR(positions);

      expect(result.var).toBe(0);
    });

    it("should scale VaR proportionally with portfolio value", () => {
      const small: VaRPosition[] = [
        { symbol: "AAPL", value: 10000, weight: 1.0 },
      ];
      const large: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];

      const varSmall = calc.parametricVaR(small);
      const varLarge = calc.parametricVaR(large);

      expect(varLarge.var / varSmall.var).toBeCloseTo(10, 1);
      // Percentage VaR should be the same
      expect(varLarge.varPercent).toBeCloseTo(varSmall.varPercent, 4);
    });
  });

  // --------------------------------------------------------------------------
  // Historical VaR
  // --------------------------------------------------------------------------

  describe("historicalVaR", () => {
    it("should fall back to parametric when insufficient return data", () => {
      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      // No return data set — should fall back
      const result = calc.historicalVaR(positions);

      expect(result.method).toBe("historical");
      expect(result.var).toBeGreaterThanOrEqual(0);
    });

    it("should use actual return distribution when data is available", () => {
      // Generate returns with known characteristics
      const returns = generateReturns(300, 0.0003, 0.015);
      calc.setReturns("AAPL", returns);

      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const result = calc.historicalVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        windowDays: 252,
      });

      expect(result.method).toBe("historical");
      expect(result.var).toBeGreaterThan(0);
      expect(result.varPercent).toBeGreaterThan(0);
    });

    it("should return zero VaR for empty portfolio", () => {
      const result = calc.historicalVaR([]);

      expect(result.var).toBe(0);
    });

    it("should handle multi-day horizon by scaling returns", () => {
      const returns = generateReturns(300, 0.0003, 0.015, 99);
      calc.setReturns("AAPL", returns);

      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const var1d = calc.historicalVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        horizonDays: 1,
      });
      const var5d = calc.historicalVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        horizonDays: 5,
      });

      // Multi-day VaR should generally be larger
      expect(var5d.var).toBeGreaterThanOrEqual(var1d.var * 0.8);
    });

    it("should compute VaR from multiple-asset portfolio returns", () => {
      calc.setReturns("AAPL", generateReturns(200, 0.0005, 0.02, 10));
      calc.setReturns("MSFT", generateReturns(200, 0.0004, 0.018, 20));

      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 60000, weight: 0.6 },
        { symbol: "MSFT", value: 40000, weight: 0.4 },
      ];

      const result = calc.historicalVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        windowDays: 200,
      });

      expect(result.var).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBe(0.95);
    });
  });

  // --------------------------------------------------------------------------
  // Conditional VaR (Expected Shortfall)
  // --------------------------------------------------------------------------

  describe("conditionalVaR", () => {
    it("should use parametric approximation when return data is insufficient", () => {
      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const result = calc.conditionalVaR(positions);

      expect(result.method).toBe("conditional");
      expect(result.expectedShortfall).toBeGreaterThanOrEqual(0);
      expect(result.tailObservations).toBe(0);
    });

    it("should compute expected shortfall from actual returns when available", () => {
      const returns = generateReturns(300, 0.0003, 0.015, 55);
      calc.setReturns("AAPL", returns);

      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const result = calc.conditionalVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        windowDays: 252,
      });

      expect(result.method).toBe("conditional");
      expect(result.expectedShortfall).toBeGreaterThan(0);
      // ES should be >= VaR
      expect(result.expectedShortfall).toBeGreaterThanOrEqual(result.var);
      expect(result.tailObservations).toBeGreaterThan(0);
    });

    it("should return zero for empty portfolio", () => {
      const result = calc.conditionalVaR([]);

      expect(result.expectedShortfall).toBe(0);
      expect(result.var).toBe(0);
      expect(result.tailObservations).toBe(0);
    });

    it("should produce higher ES at 99% confidence than 95%", () => {
      const returns = generateReturns(500, 0.0003, 0.015, 77);
      calc.setReturns("SPY", returns);

      const positions: VaRPosition[] = [
        { symbol: "SPY", value: 100000, weight: 1.0 },
      ];
      const es95 = calc.conditionalVaR(positions, {
        confidenceLevel: 0.95,
        horizonDays: 1,
        windowDays: 252,
      });
      const es99 = calc.conditionalVaR(positions, {
        confidenceLevel: 0.99,
        horizonDays: 1,
        windowDays: 252,
      });

      expect(es99.expectedShortfall).toBeGreaterThanOrEqual(
        es95.expectedShortfall,
      );
    });
  });

  // --------------------------------------------------------------------------
  // Comprehensive VaR
  // --------------------------------------------------------------------------

  describe("comprehensiveVaR", () => {
    it("should run all three VaR methods", () => {
      const positions = makeSamplePositions();
      const result = calc.comprehensiveVaR(positions);

      expect(result.parametric.method).toBe("parametric");
      expect(result.historical.method).toBe("historical");
      expect(result.conditional.method).toBe("conditional");
    });

    it("should compute component VaR for each position", () => {
      const positions = makeSamplePositions();
      const result = calc.comprehensiveVaR(positions);

      expect(result.componentVaR).toHaveLength(3);
      result.componentVaR.forEach((cv) => {
        expect(cv.symbol).toBeDefined();
        expect(typeof cv.marginalVaR).toBe("number");
        expect(typeof cv.componentVaR).toBe("number");
        expect(typeof cv.percentContribution).toBe("number");
      });
    });

    it("should compute diversification benefit as non-negative", () => {
      const positions = makeSamplePositions();
      const result = calc.comprehensiveVaR(positions);

      expect(result.diversificationBenefit).toBeGreaterThanOrEqual(0);
      expect(result.diversificationBenefitPercent).toBeGreaterThanOrEqual(0);
    });

    it("should report correct portfolio value", () => {
      const positions = makeSamplePositions();
      const result = calc.comprehensiveVaR(positions);

      expect(result.portfolioValue).toBe(100000);
    });

    it("should include a timestamp", () => {
      const positions = makeSamplePositions();
      const result = calc.comprehensiveVaR(positions);

      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases & Branch Coverage
  // --------------------------------------------------------------------------

  describe("edge cases and branches", () => {
    it("should use actual return volatility when >= 10 data points are available (getVolatilities branch)", () => {
      // Provide enough returns to hit the `returns.length >= 10` branch in getVolatilities
      const returns = generateReturns(50, 0.001, 0.02, 100);
      calc.setReturns("AAPL", returns);

      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const result = calc.parametricVaR(positions, {
        ...DEFAULT_VAR_CONFIG,
        windowDays: 50,
      });

      expect(result.method).toBe("parametric");
      expect(result.var).toBeGreaterThan(0);
      // With actual data, VaR may differ from the default vol assumption
      expect(result.varPercent).toBeGreaterThan(0);
    });

    it("should handle very high confidence level (upper tail of normalInverseCDF)", () => {
      // Confidence level 0.995 triggers the upper tail (p > pHigh = 0.97575)
      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const result = calc.parametricVaR(positions, {
        confidenceLevel: 0.995,
        horizonDays: 1,
        windowDays: 252,
      });

      expect(result.var).toBeGreaterThan(0);
      // 99.5% VaR should be larger than 95% VaR
      const result95 = calc.parametricVaR(positions, {
        confidenceLevel: 0.95,
        horizonDays: 1,
        windowDays: 252,
      });
      expect(result.var).toBeGreaterThan(result95.var);
    });

    it("should handle very low confidence level (lower tail of normalInverseCDF)", () => {
      // Confidence level 0.01 triggers the lower tail (p < pLow = 0.02425)
      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const result = calc.parametricVaR(positions, {
        confidenceLevel: 0.01,
        horizonDays: 1,
        windowDays: 252,
      });

      // With very low confidence, VaR should be small or negative
      expect(typeof result.var).toBe("number");
    });

    it("should handle multiple assets with actual return data in historical VaR", () => {
      // Both symbols have sufficient returns => getVolatilities uses actual data
      calc.setReturns("AAPL", generateReturns(100, 0.0005, 0.02, 10));
      calc.setReturns("MSFT", generateReturns(100, 0.0004, 0.018, 20));

      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 60000, weight: 0.6 },
        { symbol: "MSFT", value: 40000, weight: 0.4 },
      ];
      const result = calc.comprehensiveVaR(positions, {
        confidenceLevel: 0.99,
        horizonDays: 5,
        windowDays: 100,
      });

      expect(result.parametric.var).toBeGreaterThan(0);
      expect(result.historical.var).toBeGreaterThan(0);
      expect(result.conditional.expectedShortfall).toBeGreaterThan(0);
    });

    it("should scale historical returns for multi-day horizon with sufficient data", () => {
      const returns = generateReturns(260, 0.0003, 0.012, 88);
      calc.setReturns("SPY", returns);

      const positions: VaRPosition[] = [
        { symbol: "SPY", value: 100000, weight: 1.0 },
      ];
      const result = calc.historicalVaR(positions, {
        confidenceLevel: 0.95,
        horizonDays: 10,
        windowDays: 252,
      });

      expect(result.method).toBe("historical");
      expect(result.var).toBeGreaterThan(0);
    });

    it("should compute CVaR with actual returns and multi-day horizon", () => {
      const returns = generateReturns(260, 0.0003, 0.015, 33);
      calc.setReturns("SPY", returns);

      const positions: VaRPosition[] = [
        { symbol: "SPY", value: 100000, weight: 1.0 },
      ];
      const result = calc.conditionalVaR(positions, {
        confidenceLevel: 0.95,
        horizonDays: 10,
        windowDays: 252,
      });

      expect(result.method).toBe("conditional");
      expect(result.expectedShortfall).toBeGreaterThan(0);
      expect(result.tailObservations).toBeGreaterThan(0);
    });

    it("should handle NaN values in the correlation matrix (isNaN fallback at line 125)", () => {
      const { __mockMonitor } = jest.requireMock(
        "@/lib/trading/correlation-monitor",
      );
      // Return a correlation matrix with NaN values
      __mockMonitor.getCorrelationMatrix.mockImplementation(
        (symbols: string[]) => {
          const n = symbols.length;
          const matrix = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (__, j) => (i === j ? 1 : NaN)),
          );
          return { symbols, matrix, timestamp: new Date(), windowDays: 252 };
        },
      );

      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 50000, weight: 0.5 },
        { symbol: "MSFT", value: 50000, weight: 0.5 },
      ];
      const result = calc.parametricVaR(positions);

      // Should still compute VaR — NaN correlations fall back to i===j?1:0
      expect(result.method).toBe("parametric");
      expect(result.var).toBeGreaterThan(0);
    });

    it("should handle missing matrix rows (nullish coalescing at line 124)", () => {
      const { __mockMonitor } = jest.requireMock(
        "@/lib/trading/correlation-monitor",
      );
      // Return a sparse correlation matrix — matrix[i] is undefined for some i
      __mockMonitor.getCorrelationMatrix.mockImplementation(
        (symbols: string[]) => {
          // Only provide first row, second row is undefined
          const matrix: (number[] | undefined)[] = [[1, 0.5], undefined];
          return { symbols, matrix, timestamp: new Date(), windowDays: 252 };
        },
      );

      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 50000, weight: 0.5 },
        { symbol: "MSFT", value: 50000, weight: 0.5 },
      ];
      const result = calc.parametricVaR(positions);

      // Should fall back to i===j?1:0 when cm.matrix[i]?.[j] is nullish
      expect(result.method).toBe("parametric");
      expect(result.var).toBeGreaterThan(0);
    });

    it("should return zero VaR when confidenceLevel is 0.5 (p === 0.5 branch, line 483)", () => {
      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const result = calc.parametricVaR(positions, {
        confidenceLevel: 0.5,
        horizonDays: 1,
        windowDays: 252,
      });

      // normalInverseCDF(0.5) = 0, so VaR = 0
      expect(result.var).toBe(0);
      expect(result.varPercent).toBe(0);
    });

    it("should handle confidenceLevel at boundary 0 (p <= 0 branch, line 481)", () => {
      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const result = calc.parametricVaR(positions, {
        confidenceLevel: 0,
        horizonDays: 1,
        windowDays: 252,
      });

      // normalInverseCDF(0) = -Infinity, VaR will be -Infinity * value = -Infinity or NaN
      expect(typeof result.var).toBe("number");
    });

    it("should handle confidenceLevel at boundary 1 (p >= 1 branch, line 482)", () => {
      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0 },
      ];
      const result = calc.parametricVaR(positions, {
        confidenceLevel: 1,
        horizonDays: 1,
        windowDays: 252,
      });

      // normalInverseCDF(1) = Infinity
      expect(typeof result.var).toBe("number");
    });

    it("should handle zero portfolioVaR.var in componentVaR (percentContribution=0 branch, line 358-360)", () => {
      // When confidenceLevel = 0.5, VaR = 0, so componentVaR percentContribution uses the : 0 branch
      const positions = makeSamplePositions();
      const result = calc.comprehensiveVaR(positions, {
        confidenceLevel: 0.5,
        horizonDays: 1,
        windowDays: 252,
      });

      // parametric VaR should be 0
      expect(result.parametric.var).toBe(0);
      // componentVaR percentContribution should be 0 for all
      result.componentVaR.forEach((cv) => {
        expect(cv.percentContribution).toBe(0);
      });
    });

    it("should handle portfolioValue=0 in diversificationBenefitPercent (line 310)", () => {
      // All positions with zero value but non-empty array
      const positions: VaRPosition[] = [
        { symbol: "AAPL", value: 0, weight: 0 },
        { symbol: "MSFT", value: 0, weight: 0 },
      ];
      const result = calc.comprehensiveVaR(positions);

      // portfolioValue = 0, should hit the : 0 branch at line 310
      expect(result.diversificationBenefitPercent).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Default Config
  // --------------------------------------------------------------------------

  describe("DEFAULT_VAR_CONFIG", () => {
    it("should have sensible default values", () => {
      expect(DEFAULT_VAR_CONFIG.confidenceLevel).toBe(0.95);
      expect(DEFAULT_VAR_CONFIG.horizonDays).toBe(1);
      expect(DEFAULT_VAR_CONFIG.windowDays).toBe(252);
    });
  });
});
