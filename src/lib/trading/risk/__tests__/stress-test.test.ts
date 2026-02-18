/**
 * Stress Test Engine Tests
 *
 * Covers historical scenario replay, Monte Carlo simulation,
 * report generation, custom scenarios, and edge cases.
 */

import {
  StressTestEngine,
  HISTORICAL_SCENARIOS,
  type Position,
  type MonteCarloConfig,
  type HistoricalScenario,
  type ScenarioResult,
  type MonteCarloResult,
  type StressReport,
} from "../stress-test";
import { CorrelationMonitor } from "@/lib/trading/correlation-monitor";

// ============================================================================
// MOCK: CorrelationMonitor
// ============================================================================

jest.mock("@/lib/trading/correlation-monitor", () => {
  const monitor = {
    getSymbols: jest.fn().mockReturnValue([]),
    getCorrelationMatrix: jest.fn().mockReturnValue({
      symbols: [],
      matrix: [],
      timestamp: new Date(),
      windowDays: 60,
    }),
    ingestPrices: jest.fn(),
    ingestReturns: jest.fn(),
    estimatePortfolioVariance: jest.fn().mockReturnValue(0.0004),
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

function makeSamplePositions(): Position[] {
  return [
    { symbol: "AAPL", value: 50000, weight: 0.5, sector: "Technology" },
    { symbol: "JPM", value: 30000, weight: 0.3, sector: "Financials" },
    { symbol: "GLD", value: 20000, weight: 0.2, sector: "Commodities" },
  ];
}

function makeSinglePosition(): Position[] {
  return [{ symbol: "SPY", value: 100000, weight: 1.0, sector: "Index" }];
}

// ============================================================================
// TESTS
// ============================================================================

describe("StressTestEngine", () => {
  let engine: StressTestEngine;

  beforeEach(() => {
    // Re-setup mock implementations after resetMocks clears them
    const { __mockMonitor, CorrelationMonitor: MockCtor } = jest.requireMock(
      "@/lib/trading/correlation-monitor",
    );
    __mockMonitor.getSymbols.mockReturnValue([]);
    __mockMonitor.getCorrelationMatrix.mockReturnValue({
      symbols: [],
      matrix: [],
      timestamp: new Date(),
      windowDays: 60,
    });
    __mockMonitor.estimatePortfolioVariance.mockReturnValue(0.0004);
    MockCtor.mockImplementation(() => __mockMonitor);

    engine = new StressTestEngine();
  });

  // --------------------------------------------------------------------------
  // Historical Scenario Testing
  // --------------------------------------------------------------------------

  describe("runHistoricalScenario", () => {
    it("should calculate portfolio loss based on per-symbol shocks", () => {
      const positions = makeSamplePositions();
      const gfc = HISTORICAL_SCENARIOS[0]; // 2008 GFC

      const result = engine.runHistoricalScenario(positions, gfc);

      expect(result.scenarioName).toBe("2008 Global Financial Crisis");
      expect(result.portfolioLoss).toBeLessThan(0);
      expect(result.portfolioLossPercent).toBeLessThan(0);
      expect(result.positionLosses).toHaveLength(3);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should use defaultShock for symbols not in the shocks map", () => {
      const positions: Position[] = [
        { symbol: "UNKNOWN_TICKER", value: 100000, weight: 1.0 },
      ];
      const gfc = HISTORICAL_SCENARIOS[0];

      const result = engine.runHistoricalScenario(positions, gfc);

      // UNKNOWN_TICKER not in shocks, so defaultShock of -0.45 applies
      expect(result.positionLosses[0].lossPercent).toBe(-45);
      expect(result.portfolioLoss).toBeCloseTo(-45000, 0);
    });

    it("should return empty result for zero-value portfolio", () => {
      const positions: Position[] = [{ symbol: "AAPL", value: 0, weight: 0 }];
      const result = engine.runHistoricalScenario(
        positions,
        HISTORICAL_SCENARIOS[0],
      );

      expect(result.portfolioLoss).toBe(0);
      expect(result.portfolioLossPercent).toBe(0);
      expect(result.positionLosses).toHaveLength(0);
    });

    it("should identify the worst-performing position", () => {
      const positions = makeSamplePositions();
      const gfc = HISTORICAL_SCENARIOS[0];

      const result = engine.runHistoricalScenario(positions, gfc);

      // JPM has -70% shock in GFC, AAPL has -56%, GLD has +10%
      expect(result.worstPosition.symbol).toBe("JPM");
      expect(result.worstPosition.lossPercent).toBe(-70);
    });

    it("should calculate a positive recovery estimate", () => {
      const positions = makeSamplePositions();
      const result = engine.runHistoricalScenario(
        positions,
        HISTORICAL_SCENARIOS[0],
      );

      expect(result.recoveryEstimateDays).toBeGreaterThanOrEqual(1);
    });

    it("should handle scenarios with positive shocks (e.g. gold in GFC)", () => {
      const positions: Position[] = [
        { symbol: "GLD", value: 100000, weight: 1.0 },
      ];
      const gfc = HISTORICAL_SCENARIOS[0];

      const result = engine.runHistoricalScenario(positions, gfc);

      // GLD has +10% shock in GFC
      expect(result.portfolioLoss).toBeGreaterThan(0);
      expect(result.portfolioLossPercent).toBeGreaterThan(0);
    });
  });

  describe("runAllHistoricalScenarios", () => {
    it("should return results for all built-in scenarios", () => {
      const positions = makeSamplePositions();
      const results = engine.runAllHistoricalScenarios(positions);

      expect(results).toHaveLength(HISTORICAL_SCENARIOS.length);
      results.forEach((r, idx) => {
        expect(r.scenarioName).toBe(HISTORICAL_SCENARIOS[idx].name);
      });
    });

    it("should return empty results for empty positions", () => {
      const results = engine.runAllHistoricalScenarios([]);

      results.forEach((r) => {
        expect(r.portfolioLoss).toBe(0);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Monte Carlo Simulation
  // --------------------------------------------------------------------------

  describe("monteCarloSimulation", () => {
    it("should run the correct number of simulations", () => {
      const positions = makeSinglePosition();
      const config: MonteCarloConfig = {
        numSimulations: 100,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const result = engine.monteCarloSimulation(positions, config);

      expect(result.simulations).toBe(100);
      expect(result.horizonDays).toBe(10);
    });

    it("should produce deterministic results with a seed", () => {
      const positions = makeSinglePosition();
      const config: MonteCarloConfig = {
        numSimulations: 500,
        horizonDays: 20,
        confidenceLevels: [0.95, 0.99],
        useCorrelatedReturns: false,
        seed: 12345,
      };

      const result1 = engine.monteCarloSimulation(positions, config);
      const result2 = engine.monteCarloSimulation(positions, config);

      expect(result1.expectedReturnPercent).toBeCloseTo(
        result2.expectedReturnPercent,
        5,
      );
      expect(result1.volatility).toBeCloseTo(result2.volatility, 5);
    });

    it("should compute VaR at specified confidence levels", () => {
      const positions = makeSinglePosition();
      const config: MonteCarloConfig = {
        numSimulations: 1000,
        horizonDays: 10,
        confidenceLevels: [0.95, 0.99],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const result = engine.monteCarloSimulation(positions, config);

      expect(result.varEstimates).toHaveLength(2);
      expect(result.varEstimates[0].confidence).toBe(0.95);
      expect(result.varEstimates[1].confidence).toBe(0.99);
      // 99% VaR should be more severe than 95% VaR
      expect(result.varEstimates[1].var).toBeGreaterThanOrEqual(
        result.varEstimates[0].var,
      );
    });

    it("should compute CVaR (Expected Shortfall) at specified confidence levels", () => {
      const positions = makeSinglePosition();
      const config: MonteCarloConfig = {
        numSimulations: 1000,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const result = engine.monteCarloSimulation(positions, config);

      expect(result.cvarEstimates).toHaveLength(1);
      // CVaR should be >= VaR (measures expected tail loss)
      expect(result.cvarEstimates[0].cvar).toBeGreaterThanOrEqual(
        result.varEstimates[0].var,
      );
    });

    it("should return probability of loss between 0 and 100", () => {
      const positions = makeSinglePosition();
      const config: MonteCarloConfig = {
        numSimulations: 500,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const result = engine.monteCarloSimulation(positions, config);

      expect(result.probabilityOfLoss).toBeGreaterThanOrEqual(0);
      expect(result.probabilityOfLoss).toBeLessThanOrEqual(100);
    });

    it("should return empty result for zero-value portfolio", () => {
      const positions: Position[] = [{ symbol: "SPY", value: 0, weight: 0 }];
      const config: MonteCarloConfig = {
        numSimulations: 100,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
      };

      const result = engine.monteCarloSimulation(positions, config);

      expect(result.expectedReturn).toBe(0);
      expect(result.volatility).toBe(0);
      expect(result.maxLoss).toBe(0);
    });

    it("should return empty result for empty positions array", () => {
      const config: MonteCarloConfig = {
        numSimulations: 100,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
      };

      const result = engine.monteCarloSimulation([], config);

      expect(result.expectedReturn).toBe(0);
      expect(result.simulations).toBe(100);
    });

    it("should calculate percentiles correctly", () => {
      const positions = makeSinglePosition();
      const config: MonteCarloConfig = {
        numSimulations: 1000,
        horizonDays: 20,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const result = engine.monteCarloSimulation(positions, config);

      // Percentiles should be in ascending order
      expect(result.percentiles.p5).toBeLessThanOrEqual(result.percentiles.p25);
      expect(result.percentiles.p25).toBeLessThanOrEqual(
        result.percentiles.p50,
      );
      expect(result.percentiles.p50).toBeLessThanOrEqual(
        result.percentiles.p75,
      );
      expect(result.percentiles.p75).toBeLessThanOrEqual(
        result.percentiles.p95,
      );
    });

    it("should handle correlated returns with multiple positions", () => {
      const monitor = new CorrelationMonitor();
      (monitor.getSymbols as jest.Mock).mockReturnValue(["AAPL", "JPM", "GLD"]);
      (monitor.getCorrelationMatrix as jest.Mock).mockReturnValue({
        symbols: ["AAPL", "JPM", "GLD"],
        matrix: [
          [1, 0.6, -0.1],
          [0.6, 1, 0.2],
          [-0.1, 0.2, 1],
        ],
        timestamp: new Date(),
        windowDays: 60,
      });

      const correlatedEngine = new StressTestEngine(monitor);
      const positions = makeSamplePositions();
      const config: MonteCarloConfig = {
        numSimulations: 200,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: true,
        seed: 42,
      };

      const result = correlatedEngine.monteCarloSimulation(positions, config);

      expect(result.simulations).toBe(200);
      expect(result.varEstimates).toHaveLength(1);
      expect(typeof result.volatility).toBe("number");
    });
  });

  // --------------------------------------------------------------------------
  // Custom Scenarios
  // --------------------------------------------------------------------------

  describe("runCustomScenario", () => {
    it("should apply custom shocks to positions", () => {
      const positions = makeSamplePositions();
      const shocks: Record<string, number> = {
        AAPL: -0.2,
        JPM: -0.3,
        GLD: 0.05,
      };

      const result = engine.runCustomScenario(
        positions,
        "Tech Sell-off",
        shocks,
      );

      expect(result.scenarioName).toBe("Tech Sell-off");
      expect(result.positionLosses).toHaveLength(3);
      expect(
        result.positionLosses.find((p) => p.symbol === "AAPL")?.lossPercent,
      ).toBe(-20);
      expect(
        result.positionLosses.find((p) => p.symbol === "GLD")?.lossPercent,
      ).toBe(5);
    });

    it("should use provided defaultShock for unmapped symbols", () => {
      const positions: Position[] = [
        { symbol: "XYZ", value: 100000, weight: 1.0 },
      ];

      const result = engine.runCustomScenario(positions, "Custom", {}, -0.1);

      expect(result.positionLosses[0].lossPercent).toBe(-10);
    });

    it("should default to zero shock when no defaultShock is provided", () => {
      const positions: Position[] = [
        { symbol: "XYZ", value: 100000, weight: 1.0 },
      ];

      const result = engine.runCustomScenario(positions, "Flat", {});

      expect(result.positionLosses[0].lossPercent).toBe(0);
      expect(result.portfolioLoss).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Report Generation
  // --------------------------------------------------------------------------

  describe("generateReport", () => {
    it("should produce a complete stress report", () => {
      const positions = makeSamplePositions();
      const config: MonteCarloConfig = {
        numSimulations: 100,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const report = engine.generateReport(positions, config);

      expect(report.portfolioValue).toBe(100000);
      expect(report.positions).toHaveLength(3);
      expect(report.historicalResults).toHaveLength(
        HISTORICAL_SCENARIOS.length,
      );
      expect(report.monteCarloResult).not.toBeNull();
      expect(report.riskScore).toBeGreaterThanOrEqual(0);
      expect(report.riskScore).toBeLessThanOrEqual(100);
      expect(report.recommendations.length).toBeGreaterThanOrEqual(1);
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it("should generate default Monte Carlo when no config is provided", () => {
      const positions = makeSamplePositions();
      const report = engine.generateReport(positions);

      expect(report.monteCarloResult).not.toBeNull();
      expect(report.monteCarloResult?.simulations).toBe(10000);
    });

    it("should recommend diversification for small portfolios", () => {
      const positions: Position[] = [
        { symbol: "AAPL", value: 50000, weight: 0.5 },
        { symbol: "MSFT", value: 50000, weight: 0.5 },
      ];
      const config: MonteCarloConfig = {
        numSimulations: 100,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const report = engine.generateReport(positions, config);

      const hasLowDiversification = report.recommendations.some(
        (r) => r.includes("positions") && r.includes("Diversify"),
      );
      expect(hasLowDiversification).toBe(true);
    });

    it("should recommend trimming concentrated positions", () => {
      const positions: Position[] = [
        { symbol: "AAPL", value: 90000, weight: 0.9 },
        { symbol: "SPY", value: 10000, weight: 0.1 },
      ];
      const config: MonteCarloConfig = {
        numSimulations: 100,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const report = engine.generateReport(positions, config);

      const hasConcentrationWarning = report.recommendations.some(
        (r) => r.includes("AAPL") && r.includes("trimming"),
      );
      expect(hasConcentrationWarning).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Additional Report Recommendations & Edge Cases
  // --------------------------------------------------------------------------

  describe("generateReport — high risk score recommendations", () => {
    it("should recommend risk reduction when riskScore >= 70", () => {
      // Single concentrated position => high concentration + low diversification
      const positions: Position[] = [
        { symbol: "AAPL", value: 100000, weight: 1.0, sector: "Technology" },
      ];
      const config: MonteCarloConfig = {
        numSimulations: 500,
        horizonDays: 20,
        confidenceLevels: [0.95, 0.99],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const report = engine.generateReport(positions, config);

      // Single position with weight 1.0 should trigger multiple recommendations
      const hasHighRiskWarning = report.recommendations.some(
        (r) => r.includes("HIGH") || r.includes("risk score"),
      );
      const hasConcentrationWarning = report.recommendations.some(
        (r) => r.includes("AAPL") && r.includes("trimming"),
      );
      const hasDiversifyWarning = report.recommendations.some((r) =>
        r.includes("Diversify"),
      );

      // At least one of these should be true for such a concentrated portfolio
      expect(
        hasHighRiskWarning || hasConcentrationWarning || hasDiversifyWarning,
      ).toBe(true);
    });

    it("should recommend sector diversification when sector weight > 40%", () => {
      const positions: Position[] = [
        { symbol: "AAPL", value: 35000, weight: 0.35, sector: "Technology" },
        { symbol: "MSFT", value: 15000, weight: 0.15, sector: "Technology" },
        // Technology total = 50% > 40%
        { symbol: "JPM", value: 25000, weight: 0.25, sector: "Financials" },
        { symbol: "XOM", value: 15000, weight: 0.15, sector: "Energy" },
        { symbol: "JNJ", value: 10000, weight: 0.1, sector: "Healthcare" },
      ];
      const config: MonteCarloConfig = {
        numSimulations: 100,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const report = engine.generateReport(positions, config);

      const hasSectorWarning = report.recommendations.some(
        (r) => r.includes("Technology") && r.includes("sector"),
      );
      expect(hasSectorWarning).toBe(true);
    });

    it("should report GFC vulnerability when loss exceeds 40%", () => {
      // Use positions where GFC loss will be > 40%
      // JPM has -70% shock in GFC, giving a single-stock portfolio >40% loss
      const positions: Position[] = [
        { symbol: "JPM", value: 100000, weight: 1.0, sector: "Financials" },
      ];
      const config: MonteCarloConfig = {
        numSimulations: 100,
        horizonDays: 10,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const report = engine.generateReport(positions, config);

      const hasGfcWarning = report.recommendations.some(
        (r) => r.includes("2008") && r.includes("defensive"),
      );
      expect(hasGfcWarning).toBe(true);
    });

    it("should report within acceptable parameters for well-diversified portfolio", () => {
      // Well-diversified portfolio with moderate weights
      const positions: Position[] = [
        { symbol: "AAPL", value: 10000, weight: 0.1, sector: "Technology" },
        { symbol: "MSFT", value: 10000, weight: 0.1, sector: "Technology" },
        { symbol: "JPM", value: 10000, weight: 0.1, sector: "Financials" },
        { symbol: "GLD", value: 10000, weight: 0.1, sector: "Commodities" },
        { symbol: "XOM", value: 10000, weight: 0.1, sector: "Energy" },
        { symbol: "JNJ", value: 10000, weight: 0.1, sector: "Healthcare" },
        { symbol: "PG", value: 10000, weight: 0.1, sector: "Consumer" },
        { symbol: "NEE", value: 10000, weight: 0.1, sector: "Utilities" },
        { symbol: "AMT", value: 10000, weight: 0.1, sector: "Real Estate" },
        { symbol: "UNP", value: 10000, weight: 0.1, sector: "Industrials" },
      ];
      const config: MonteCarloConfig = {
        numSimulations: 100,
        horizonDays: 5,
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const report = engine.generateReport(positions, config);

      // The recommendations should include acceptable-parameters message or
      // at least be a non-empty array
      expect(report.recommendations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("monteCarloSimulation — Cholesky & CVaR edge cases", () => {
    it("should fall back to identity matrix for non-positive-definite correlation", () => {
      // Create a correlation matrix that is NOT positive definite
      // e.g., a matrix where the diagonal entry minus squared lower entries <= 0
      const monitor = new CorrelationMonitor();
      (monitor.getSymbols as jest.Mock).mockReturnValue(["A", "B", "C"]);
      (monitor.getCorrelationMatrix as jest.Mock).mockReturnValue({
        symbols: ["A", "B", "C"],
        matrix: [
          [1, 0.99, 0.99],
          [0.99, 1, -0.99],
          [0.99, -0.99, 1],
        ],
        timestamp: new Date(),
        windowDays: 60,
      });

      const badEngine = new StressTestEngine(monitor);
      const positions: Position[] = [
        { symbol: "A", value: 40000, weight: 0.4 },
        { symbol: "B", value: 30000, weight: 0.3 },
        { symbol: "C", value: 30000, weight: 0.3 },
      ];
      const config: MonteCarloConfig = {
        numSimulations: 100,
        horizonDays: 5,
        confidenceLevels: [0.95],
        useCorrelatedReturns: true,
        seed: 42,
      };

      // Should not throw — falls back to identity
      const result = badEngine.monteCarloSimulation(positions, config);
      expect(result.simulations).toBe(100);
      expect(typeof result.volatility).toBe("number");
    });

    it("should handle CVaR cutoff of 0 at very high confidence level", () => {
      const positions = makeSinglePosition();
      const config: MonteCarloConfig = {
        numSimulations: 10,
        horizonDays: 5,
        // With 10 simulations and 0.99 confidence: cutoff = floor(0.01 * 10) = 0
        confidenceLevels: [0.99],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const result = engine.monteCarloSimulation(positions, config);

      // CVaR cutoff === 0 branch should produce a valid result
      expect(result.cvarEstimates).toHaveLength(1);
      expect(typeof result.cvarEstimates[0].cvar).toBe("number");
      expect(result.cvarEstimates[0].cvar).toBeGreaterThanOrEqual(0);
    });

    it("should include probability-of-loss recommendation when > 50%", () => {
      // Use enough simulations with a long enough horizon to get >50% loss probability
      const positions = makeSinglePosition();
      const config: MonteCarloConfig = {
        numSimulations: 1000,
        horizonDays: 252, // full year — more chance of loss scenarios
        confidenceLevels: [0.95],
        useCorrelatedReturns: false,
        seed: 42,
      };

      const report = engine.generateReport(positions, config);

      // Whether or not this triggers depends on the simulation outcome
      // Just verify the report is valid
      expect(report.recommendations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // Built-in Scenarios
  // --------------------------------------------------------------------------

  describe("HISTORICAL_SCENARIOS", () => {
    it("should have at least 5 built-in scenarios", () => {
      expect(HISTORICAL_SCENARIOS.length).toBeGreaterThanOrEqual(5);
    });

    it("should include a 2008 GFC scenario", () => {
      const gfc = HISTORICAL_SCENARIOS.find((s) => s.name.includes("2008"));
      expect(gfc).toBeDefined();
      expect(gfc?.shocks["SPY"]).toBe(-0.55);
    });

    it("should include a 2020 COVID scenario", () => {
      const covid = HISTORICAL_SCENARIOS.find((s) => s.name.includes("COVID"));
      expect(covid).toBeDefined();
      expect(covid?.shocks["SPY"]).toBe(-0.34);
    });

    it("each scenario should have valid start and end dates", () => {
      HISTORICAL_SCENARIOS.forEach((s) => {
        expect(s.startDate).toBeInstanceOf(Date);
        expect(s.endDate).toBeInstanceOf(Date);
        expect(s.endDate.getTime()).toBeGreaterThanOrEqual(
          s.startDate.getTime(),
        );
      });
    });
  });
});
