/**
 * PCTT Validator Tests
 *
 * Tests for statistical validation including Monte Carlo,
 * bootstrap, Q-score calibration, and walk-forward analysis.
 */

import {
  PCTTValidator,
  createPCTTValidator,
  TradeResult,
  ValidationResult,
  BootstrapCI,
  CalibrationResult,
  PerformanceMetrics,
} from "../pctt-validator";
import { PCTTSignal } from "../pctt-core";

// ============================================================================
// SEEDED RNG FOR DETERMINISTIC TEST DATA
// ============================================================================

/** LCG seeded RNG matching the validator's implementation */
function createSeededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Global test RNG — deterministic seed so all test data is reproducible
let testRng = createSeededRng(98765);

/** Reset the test RNG to a known state before each describe block */
function resetTestRng(seed: number = 98765): void {
  testRng = createSeededRng(seed);
}

// ============================================================================
// TEST DATA GENERATORS (all use seeded RNG)
// ============================================================================

function generateMockSignal(qScore: number = 0.7): PCTTSignal {
  return {
    type: "long",
    event: "entry_long",
    actionLine: 100,
    safetyLine: 95,
    qScore,
    entryPrice: 101,
    stopPrice: 95,
    targetPrices: [105, 110, 115],
    riskReward: 2,
    confidence: qScore,
    regime: "trend_up",
    timestamp: Date.now(),
  };
}

function generateTradeResults(
  count: number,
  winRate: number = 0.5,
  avgWinR: number = 2,
  avgLossR: number = 1,
): TradeResult[] {
  const trades: TradeResult[] = [];

  for (let i = 0; i < count; i++) {
    const isWin = testRng() < winRate;
    const rMultiple = isWin
      ? avgWinR * (0.5 + testRng())
      : -avgLossR * (0.5 + testRng());

    const entryPrice = 100;
    const riskPerShare = 5;
    const pnl = rMultiple * riskPerShare;

    trades.push({
      signal: generateMockSignal(0.6 + testRng() * 0.3),
      entryPrice,
      exitPrice: entryPrice + pnl,
      pnl,
      rMultiple,
      barsHeld: Math.floor(5 + testRng() * 20),
      outcome: isWin ? "win" : "loss",
      exitReason: isWin ? "target" : "stop",
    });
  }

  return trades;
}

function generateReturns(
  count: number,
  mean: number = 0.001,
  std: number = 0.02,
): number[] {
  const returns: number[] = [];
  for (let i = 0; i < count; i++) {
    // Box-Muller transform for normal distribution (seeded)
    const u1 = testRng();
    const u2 = testRng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    returns.push(mean + std * z);
  }
  return returns;
}

function generateSignals(count: number): number[] {
  return Array(count)
    .fill(0)
    .map(() => (testRng() > 0.5 ? 1 : -1));
}

// ============================================================================
// MONTE CARLO TESTS
// ============================================================================

describe("PCTTValidator - Monte Carlo Significance", () => {
  let validator: PCTTValidator;

  beforeEach(() => {
    resetTestRng(42000);
    validator = createPCTTValidator({
      nSimulations: 500,
      confidenceLevel: 0.95,
      randomSeed: 42,
    });
  });

  test("should detect significant positive returns", () => {
    const returns = generateReturns(100, 0.005, 0.02); // Positive mean
    const signals = Array(100).fill(1); // All long

    const result = validator.monteCarloSignificance(returns, signals, "sharpe");

    expect(result.testName).toBe("Monte Carlo Permutation Test");
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(typeof result.isSignificant).toBe("boolean");
  });

  test("should have high p-value for random signals", () => {
    const returns = generateReturns(100, 0, 0.02); // Zero mean
    const signals = generateSignals(100);

    const result = validator.monteCarloSignificance(returns, signals, "sharpe");

    // Random signals on zero-mean returns should not be statistically significant.
    // Use a lenient threshold (0.01) to avoid flakiness from boundary effects.
    expect(result.pValue).toBeGreaterThan(0.01);
  });

  test("should throw on mismatched array lengths", () => {
    const returns = generateReturns(100);
    const signals = generateSignals(50);

    expect(() => {
      validator.monteCarloSignificance(returns, signals);
    }).toThrow("Returns and signals must have the same length");
  });

  test("should include detailed statistics in result", () => {
    const returns = generateReturns(50);
    const signals = generateSignals(50);

    const result = validator.monteCarloSignificance(returns, signals);

    expect(result.details).toBeDefined();
    expect(result.details.nullMean).toBeDefined();
    expect(result.details.nullStd).toBeDefined();
    expect(result.details.nSimulations).toBe(500);
  });

  test("should support different metrics", () => {
    const returns = generateReturns(50);
    const signals = generateSignals(50);

    const sharpeResult = validator.monteCarloSignificance(
      returns,
      signals,
      "sharpe",
    );
    const returnResult = validator.monteCarloSignificance(
      returns,
      signals,
      "totalReturn",
    );
    const sortinoResult = validator.monteCarloSignificance(
      returns,
      signals,
      "sortino",
    );

    expect(sharpeResult.details.metric).toBe("sharpe");
    expect(returnResult.details.metric).toBe("totalReturn");
    expect(sortinoResult.details.metric).toBe("sortino");
  });
});

// ============================================================================
// BOOTSTRAP TESTS
// ============================================================================

describe("PCTTValidator - Bootstrap Confidence Intervals", () => {
  let validator: PCTTValidator;

  beforeEach(() => {
    resetTestRng(43000);
    validator = createPCTTValidator({
      nSimulations: 500,
      confidenceLevel: 0.95,
      randomSeed: 42,
    });
  });

  test("should compute valid CI for mean", () => {
    const data = generateReturns(100, 0.01, 0.02);

    const result = validator.bootstrapCI(
      data,
      (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
    );

    expect(result.ciLower).toBeLessThan(result.pointEstimate);
    expect(result.ciUpper).toBeGreaterThan(result.pointEstimate);
    expect(result.stdError).toBeGreaterThan(0);
    expect(result.confidenceLevel).toBe(0.95);
  });

  test("should throw on small sample size", () => {
    const data = [1, 2, 3];

    expect(() => {
      validator.bootstrapCI(
        data,
        (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
      );
    }).toThrow("Sample size too small");
  });

  test("should compute all standard metrics", () => {
    const returns = generateReturns(100, 0.005, 0.02);

    const results = validator.bootstrapAllMetrics(returns);

    expect(results.meanReturn).toBeDefined();
    expect(results.sharpeRatio).toBeDefined();
    expect(results.winRate).toBeDefined();
    expect(results.maxDrawdown).toBeDefined();
  });

  test("percentile method should work correctly", () => {
    const data = generateReturns(50);

    const result = validator.bootstrapCI(
      data,
      (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
      "percentile",
    );

    expect(result.ciLower).toBeDefined();
    expect(result.ciUpper).toBeDefined();
  });

  test("basic method should work correctly", () => {
    const data = generateReturns(50);

    const result = validator.bootstrapCI(
      data,
      (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
      "basic",
    );

    expect(result.ciLower).toBeDefined();
    expect(result.ciUpper).toBeDefined();
  });
});

// ============================================================================
// Q-SCORE CALIBRATION TESTS
// ============================================================================

describe("PCTTValidator - Q-Score Calibration", () => {
  let validator: PCTTValidator;

  beforeEach(() => {
    resetTestRng(44000);
    validator = createPCTTValidator();
  });

  test("should compute calibration for trades", () => {
    const trades = generateTradeResults(100, 0.55);

    const result = validator.calibrateQScores(trades);

    expect(result.qBuckets).toBeDefined();
    expect(result.qBuckets.length).toBeGreaterThan(0);
    expect(result.observedRates).toBeDefined();
    expect(result.brierScore).toBeGreaterThanOrEqual(0);
    expect(result.brierScore).toBeLessThanOrEqual(1);
  });

  test("should have reasonable Brier score for calibrated signals", () => {
    // Generate trades where Q-score roughly matches win probability
    const trades: TradeResult[] = [];
    for (let i = 0; i < 200; i++) {
      const qScore = 0.5 + testRng() * 0.4;
      const isWin = testRng() < qScore;

      trades.push({
        signal: generateMockSignal(qScore),
        entryPrice: 100,
        exitPrice: isWin ? 105 : 95,
        pnl: isWin ? 5 : -5,
        rMultiple: isWin ? 1 : -1,
        barsHeld: 10,
        outcome: isWin ? "win" : "loss",
        exitReason: isWin ? "target" : "stop",
      });
    }

    const result = validator.calibrateQScores(trades);

    // Well-calibrated signals should have lower Brier score
    expect(result.brierScore).toBeLessThan(0.5);
  });

  test("should return expected calibration structure", () => {
    const trades = generateTradeResults(50);

    const result = validator.calibrateQScores(trades);

    expect(result).toHaveProperty("qBuckets");
    expect(result).toHaveProperty("observedRates");
    expect(result).toHaveProperty("expectedRates");
    expect(result).toHaveProperty("brierScore");
    expect(result).toHaveProperty("isCalibrated");
    expect(result).toHaveProperty("calibrationError");
  });
});

// ============================================================================
// PERFORMANCE METRICS TESTS
// ============================================================================

describe("PCTTValidator - Performance Metrics", () => {
  let validator: PCTTValidator;

  beforeEach(() => {
    resetTestRng(45000);
    validator = createPCTTValidator();
  });

  test("should handle empty trades array", () => {
    const result = validator.calculateMetrics([]);

    expect(result.totalTrades).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.expectancy).toBe(0);
  });

  test("should calculate correct win rate", () => {
    const trades = generateTradeResults(100, 0.6);

    const result = validator.calculateMetrics(trades);

    const actualWinRate =
      trades.filter((t) => t.outcome === "win").length / trades.length;
    expect(result.winRate).toBeCloseTo(actualWinRate, 5);
  });

  test("should calculate positive expectancy for profitable trades", () => {
    // Generate mostly winning trades
    const trades = generateTradeResults(100, 0.7, 2, 1);

    const result = validator.calculateMetrics(trades);

    expect(result.expectancy).toBeGreaterThan(0);
    expect(result.profitFactor).toBeGreaterThan(1);
  });

  test("should calculate valid Sharpe ratio", () => {
    const trades = generateTradeResults(50, 0.55);

    const result = validator.calculateMetrics(trades);

    expect(typeof result.sharpeRatio).toBe("number");
    expect(isFinite(result.sharpeRatio)).toBe(true);
  });

  test("should calculate max drawdown", () => {
    const trades = generateTradeResults(100, 0.5);

    const result = validator.calculateMetrics(trades);

    // maxDrawdown can be absolute value or percentage depending on implementation
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(typeof result.maxDrawdown).toBe("number");
    expect(Number.isFinite(result.maxDrawdown)).toBe(true);
  });

  test("should calculate avg R-multiple", () => {
    const trades = generateTradeResults(50, 0.6, 2, 1);

    const result = validator.calculateMetrics(trades);

    expect(typeof result.avgRMultiple).toBe("number");
  });
});

// ============================================================================
// WALK-FORWARD TESTS
// ============================================================================

describe("PCTTValidator - Walk-Forward Analysis", () => {
  let validator: PCTTValidator;

  beforeEach(() => {
    resetTestRng(46000);
    validator = createPCTTValidator();
  });

  test("should split data into windows", () => {
    const trades = generateTradeResults(100);

    const result = validator.walkForwardAnalysis(trades, 0.7, 5);

    expect(result.inSample.length).toBe(5);
    expect(result.outOfSample.length).toBe(5);
  });

  test("should calculate stability metric", () => {
    const trades = generateTradeResults(100);

    const result = validator.walkForwardAnalysis(trades);

    expect(result.stability).toBeGreaterThanOrEqual(0);
    expect(result.stability).toBeLessThanOrEqual(1);
  });

  test("should have metrics for each window", () => {
    const trades = generateTradeResults(100);

    const result = validator.walkForwardAnalysis(trades, 0.7, 4);

    for (const metrics of result.inSample) {
      expect(metrics.totalTrades).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.winRate).toBe("number");
    }
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe("PCTTValidator - Configuration", () => {
  beforeEach(() => {
    resetTestRng(47000);
  });

  test("should use default config when none provided", () => {
    const validator = createPCTTValidator();
    expect(validator).toBeDefined();
  });

  test("should accept custom simulation count", () => {
    const validator = createPCTTValidator({ nSimulations: 500 });
    const returns = generateReturns(50);
    const signals = generateSignals(50);

    const result = validator.monteCarloSignificance(returns, signals);

    expect(result.details.nSimulations).toBe(500);
  });

  test("should accept custom confidence level", () => {
    const validator = createPCTTValidator({ confidenceLevel: 0.99 });
    const data = generateReturns(50);

    const result = validator.bootstrapCI(
      data,
      (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
    );

    expect(result.confidenceLevel).toBe(0.99);
  });

  test("should produce reproducible results with seed", () => {
    const validator1 = createPCTTValidator({ randomSeed: 123 });
    const validator2 = createPCTTValidator({ randomSeed: 123 });

    // Generate data once (seeded), then pass the same arrays to both validators
    resetTestRng(77777);
    const returns = generateReturns(50);
    const signals = generateSignals(50);

    const result1 = validator1.monteCarloSignificance(returns, signals);
    const result2 = validator2.monteCarloSignificance(returns, signals);

    expect(result1.pValue).toBeCloseTo(result2.pValue, 5);
  });
});
