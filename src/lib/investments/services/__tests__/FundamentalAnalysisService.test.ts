/**
 * FundamentalAnalysisService Tests
 *
 * Comprehensive test suite for fundamental analysis engine
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  FundamentalAnalysisService,
  getFundamentalAnalysisService,
} from "../FundamentalAnalysisService";

// Mock AlphaVantageClient to prevent real network calls in unit tests.
jest.mock("@/lib/integrations/alpha-vantage", () => ({
  AlphaVantageClient: jest.fn().mockImplementation(() => ({
    getCompanyOverview: jest.fn().mockRejectedValue(new Error("no API key in test")),
    getOverviewRaw: jest.fn().mockRejectedValue(new Error("no API key in test")),
  })),
}));

describe("FundamentalAnalysisService", () => {
  let service: FundamentalAnalysisService;

  beforeEach(() => {
    service = new FundamentalAnalysisService();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe("Initialization", () => {
    it("should create a new instance", () => {
      expect(service).toBeInstanceOf(FundamentalAnalysisService);
    });

    it("should return singleton instance from getFundamentalAnalysisService", () => {
      const instance1 = getFundamentalAnalysisService();
      const instance2 = getFundamentalAnalysisService();
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(FundamentalAnalysisService);
    });
  });

  // ============================================================================
  // VALUATION METRICS TESTS
  // ============================================================================

  describe("getValuationMetrics", () => {
    it("should return valuation metrics for a symbol", async () => {
      const metrics = await service.getValuationMetrics("AAPL");

      expect(metrics).toHaveProperty("symbol", "AAPL");
      expect(metrics).toHaveProperty("calculatedAt");
      expect(metrics).toHaveProperty("peRatio");
      expect(metrics).toHaveProperty("forwardPE");
      expect(metrics).toHaveProperty("pegRatio");
      expect(metrics).toHaveProperty("pbRatio");
      expect(metrics).toHaveProperty("psRatio");
      expect(metrics).toHaveProperty("evToEbitda");
      expect(metrics).toHaveProperty("marketCap");
      expect(metrics).toHaveProperty("eps");
      expect(metrics).toHaveProperty("dividendYield");
    });

    it("should return positive numbers for valuation ratios", async () => {
      const metrics = await service.getValuationMetrics("MSFT");

      expect(metrics.peRatio).toBeGreaterThan(0);
      expect(metrics.marketCap).toBeGreaterThan(0);
      expect(metrics.eps).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PROFITABILITY METRICS TESTS
  // ============================================================================

  describe("getProfitabilityMetrics", () => {
    it("should return profitability metrics", async () => {
      const metrics = await service.getProfitabilityMetrics("GOOGL");

      expect(metrics).toHaveProperty("grossMargin");
      expect(metrics).toHaveProperty("operatingMargin");
      expect(metrics).toHaveProperty("netMargin");
      expect(metrics).toHaveProperty("returnOnEquity");
      expect(metrics).toHaveProperty("returnOnAssets");
      expect(metrics).toHaveProperty("returnOnInvestedCapital");
    });

    it("should return margins as percentages", async () => {
      const metrics = await service.getProfitabilityMetrics("META");

      expect(metrics.grossMargin).toBeGreaterThan(0);
      expect(metrics.grossMargin).toBeLessThan(100);
      expect(metrics.netMargin).toBeGreaterThan(0);
      expect(metrics.netMargin).toBeLessThan(metrics.grossMargin); // Net margin < Gross margin
    });
  });

  // ============================================================================
  // GROWTH METRICS TESTS
  // ============================================================================

  describe("getGrowthMetrics", () => {
    it("should return growth metrics", async () => {
      const metrics = await service.getGrowthMetrics("TSLA");

      expect(metrics).toHaveProperty("revenueGrowthYoY");
      expect(metrics).toHaveProperty("revenueGrowth3Y");
      expect(metrics).toHaveProperty("revenueGrowth5Y");
      expect(metrics).toHaveProperty("epsGrowthYoY");
      expect(metrics).toHaveProperty("fcfGrowthYoY");
    });

    it("should have growth rates in reasonable range", async () => {
      const metrics = await service.getGrowthMetrics("NVDA");

      expect(metrics.revenueGrowthYoY).toBeGreaterThanOrEqual(-50);
      expect(metrics.revenueGrowthYoY).toBeLessThanOrEqual(200);
    });
  });

  // ============================================================================
  // LEVERAGE METRICS TESTS
  // ============================================================================

  describe("getLeverageMetrics", () => {
    it("should return leverage metrics", async () => {
      const metrics = await service.getLeverageMetrics("AMD");

      expect(metrics).toHaveProperty("debtToEquity");
      expect(metrics).toHaveProperty("debtToAssets");
      expect(metrics).toHaveProperty("interestCoverage");
      expect(metrics).toHaveProperty("currentRatio");
      expect(metrics).toHaveProperty("quickRatio");
    });

    it("should have valid debt ratios", async () => {
      const metrics = await service.getLeverageMetrics("INTC");

      expect(metrics.debtToEquity).toBeGreaterThanOrEqual(0);
      expect(metrics.currentRatio).toBeGreaterThan(0);
      expect(metrics.interestCoverage).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // DCF VALUATION TESTS
  // ============================================================================

  describe("calculateDCF", () => {
    it("should calculate DCF valuation", async () => {
      const dcf = await service.calculateDCF("AAPL");

      expect(dcf).toHaveProperty("symbol", "AAPL");
      expect(dcf).toHaveProperty("freeCashFlow");
      expect(dcf).toHaveProperty("growthRate");
      expect(dcf).toHaveProperty("discountRate");
      expect(dcf).toHaveProperty("projectedCashFlows");
      expect(dcf).toHaveProperty("terminalValue");
      expect(dcf).toHaveProperty("fairValue");
      expect(dcf).toHaveProperty("upside");
    });

    it("should have projected cash flows for 5 years", async () => {
      const dcf = await service.calculateDCF("MSFT");

      expect(dcf.projectedCashFlows).toHaveLength(5);
      expect(dcf.projectedCashFlows[0]).toHaveProperty("year", 1);
      expect(dcf.projectedCashFlows[0]).toHaveProperty("fcf");
      expect(dcf.projectedCashFlows[0]).toHaveProperty("discountedFcf");
    });

    it("should have sensitivity analysis", async () => {
      const dcf = await service.calculateDCF("GOOGL");

      expect(dcf.sensitivity).toHaveProperty("growthRates");
      expect(dcf.sensitivity).toHaveProperty("discountRates");
      expect(dcf.sensitivity).toHaveProperty("fairValues");
      expect(dcf.sensitivity.growthRates).toHaveLength(5);
      expect(dcf.sensitivity.discountRates).toHaveLength(5);
      expect(dcf.sensitivity.fairValues).toHaveLength(5);
      expect(dcf.sensitivity.fairValues[0]).toHaveLength(5);
    });

    it("should calculate terminal value correctly", async () => {
      const dcf = await service.calculateDCF("META");

      expect(dcf.terminalValue).toBeGreaterThan(0);
      expect(dcf.discountedTerminalValue).toBeLessThan(dcf.terminalValue);
      expect(dcf.enterpriseValue).toBeGreaterThan(dcf.discountedTerminalValue);
    });
  });

  // ============================================================================
  // COMPARABLE ANALYSIS TESTS
  // ============================================================================

  describe("performComparableAnalysis", () => {
    it("should perform comparable company analysis", async () => {
      const analysis = await service.performComparableAnalysis("AAPL");

      expect(analysis).toHaveProperty("symbol", "AAPL");
      expect(analysis).toHaveProperty("peers");
      expect(analysis).toHaveProperty("metrics");
      expect(analysis).toHaveProperty("impliedValues");
      expect(analysis).toHaveProperty("averageFairValue");
      expect(analysis).toHaveProperty("upside");
    });

    it("should have peer companies", async () => {
      const analysis = await service.performComparableAnalysis("MSFT");

      expect(analysis.peers).toBeInstanceOf(Array);
      expect(analysis.peers.length).toBeGreaterThan(0);
    });

    it("should calculate implied values from multiple metrics", async () => {
      const analysis = await service.performComparableAnalysis("GOOGL");

      expect(analysis.impliedValues).toBeInstanceOf(Array);
      expect(analysis.impliedValues.length).toBeGreaterThan(0);

      const firstImplied = analysis.impliedValues[0];
      expect(firstImplied).toHaveProperty("metric");
      expect(firstImplied).toHaveProperty("peerMultiple");
      expect(firstImplied).toHaveProperty("impliedPrice");
      expect(firstImplied).toHaveProperty("weight");
    });

    it("should have peer comparison metrics", async () => {
      const analysis = await service.performComparableAnalysis("META");

      expect(analysis.metrics).toHaveProperty("subject");
      expect(analysis.metrics).toHaveProperty("peerAverage");
      expect(analysis.metrics).toHaveProperty("peerMedian");
      expect(analysis.metrics).toHaveProperty("percentiles");

      expect(analysis.metrics.subject).toHaveProperty("peRatio");
      expect(analysis.metrics.subject).toHaveProperty("pbRatio");
      expect(analysis.metrics.subject).toHaveProperty("roe");
    });
  });

  // ============================================================================
  // EARNINGS HISTORY TESTS
  // ============================================================================

  describe("getEarningsHistory", () => {
    it("should return earnings history", async () => {
      const history = await service.getEarningsHistory("TSLA");

      expect(history).toHaveProperty("symbol", "TSLA");
      expect(history).toHaveProperty("earnings");
      expect(history).toHaveProperty("beatRate");
      expect(history).toHaveProperty("avgSurprise");
      expect(history).toHaveProperty("trend");
    });

    it("should have earnings data points", async () => {
      const history = await service.getEarningsHistory("NVDA");

      expect(history.earnings).toBeInstanceOf(Array);
      expect(history.earnings.length).toBeGreaterThan(0);

      const firstEarning = history.earnings[0];
      expect(firstEarning).toHaveProperty("eps");
      expect(firstEarning).toHaveProperty("epsEstimate");
      expect(firstEarning).toHaveProperty("epsSurprise");
      expect(firstEarning).toHaveProperty("revenue");
    });

    it("should calculate beat rate correctly", async () => {
      const history = await service.getEarningsHistory("AMD");

      expect(history.beatRate).toBeGreaterThanOrEqual(0);
      expect(history.beatRate).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // SECTOR ANALYSIS TESTS
  // ============================================================================

  describe("performSectorAnalysis", () => {
    it("should perform sector comparison", async () => {
      const analysis = await service.performSectorAnalysis("AAPL");

      expect(analysis).toHaveProperty("symbol", "AAPL");
      expect(analysis).toHaveProperty("sector");
      expect(analysis).toHaveProperty("industry");
      expect(analysis).toHaveProperty("sectorRank");
      expect(analysis).toHaveProperty("metrics");
      expect(analysis).toHaveProperty("strengths");
      expect(analysis).toHaveProperty("weaknesses");
    });

    it("should have comparison metrics", async () => {
      const analysis = await service.performSectorAnalysis("MSFT");

      expect(analysis.metrics).toBeInstanceOf(Array);
      expect(analysis.metrics.length).toBeGreaterThan(0);

      const firstMetric = analysis.metrics[0];
      expect(firstMetric).toHaveProperty("metric");
      expect(firstMetric).toHaveProperty("value");
      expect(firstMetric).toHaveProperty("sectorAvg");
      expect(firstMetric).toHaveProperty("industryAvg");
      expect(firstMetric).toHaveProperty("percentileVsSector");
    });
  });

  // ============================================================================
  // COMPREHENSIVE ANALYSIS TESTS
  // ============================================================================

  describe("analyzeFundamentals", () => {
    it("should perform comprehensive fundamental analysis", async () => {
      const analysis = await service.analyzeFundamentals("AAPL");

      expect(analysis).toHaveProperty("symbol", "AAPL");
      expect(analysis).toHaveProperty("analyzedAt");
      expect(analysis).toHaveProperty("valuation");
      expect(analysis).toHaveProperty("profitability");
      expect(analysis).toHaveProperty("growth");
      expect(analysis).toHaveProperty("leverage");
      expect(analysis).toHaveProperty("efficiency");
    });

    it("should calculate all scores", async () => {
      const analysis = await service.analyzeFundamentals("MSFT");

      expect(analysis).toHaveProperty("qualityScore");
      expect(analysis).toHaveProperty("valueScore");
      expect(analysis).toHaveProperty("growthScore");
      expect(analysis).toHaveProperty("financialHealthScore");
      expect(analysis).toHaveProperty("overallScore");

      expect(analysis.qualityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.qualityScore).toBeLessThanOrEqual(100);
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
    });

    it("should determine signal strength", async () => {
      const analysis = await service.analyzeFundamentals("GOOGL");

      expect(analysis).toHaveProperty("signal");
      expect(["strong_buy", "buy", "hold", "sell", "strong_sell"]).toContain(
        analysis.signal,
      );
    });

    it("should estimate fair value", async () => {
      const analysis = await service.analyzeFundamentals("META");

      expect(analysis).toHaveProperty("fairValueEstimate");
      expect(analysis).toHaveProperty("upside");
      expect(analysis.fairValueEstimate).toBeGreaterThan(0);
    });

    it("should determine risk level", async () => {
      const analysis = await service.analyzeFundamentals("TSLA");

      expect(analysis).toHaveProperty("riskLevel");
      expect(["low", "medium", "high", "very_high"]).toContain(
        analysis.riskLevel,
      );
    });

    it("should generate summary and key metrics", async () => {
      const analysis = await service.analyzeFundamentals("NVDA");

      expect(analysis).toHaveProperty("summary");
      expect(analysis.summary).toBeTruthy();
      expect(typeof analysis.summary).toBe("string");

      expect(analysis).toHaveProperty("keyMetrics");
      expect(analysis.keyMetrics).toBeInstanceOf(Array);
      expect(analysis.keyMetrics.length).toBeGreaterThan(0);

      const firstMetric = analysis.keyMetrics[0];
      expect(firstMetric).toHaveProperty("name");
      expect(firstMetric).toHaveProperty("value");
      expect(firstMetric).toHaveProperty("status");
      expect(["good", "neutral", "concern"]).toContain(firstMetric.status);
    });

    it("should include optional analyses when requested", async () => {
      const analysisWithAll = await service.analyzeFundamentals("AAPL", {
        includeDCF: true,
        includeComparables: true,
        includeEarnings: true,
        includeSector: true,
      });

      expect(analysisWithAll.dcfValuation).toBeDefined();
      expect(analysisWithAll.comparableAnalysis).toBeDefined();
      expect(analysisWithAll.earningsHistory).toBeDefined();
      expect(analysisWithAll.sectorAnalysis).toBeDefined();
    });

    it("should exclude optional analyses when not requested", async () => {
      const analysisBasic = await service.analyzeFundamentals("MSFT", {
        includeDCF: false,
        includeComparables: false,
        includeEarnings: false,
        includeSector: false,
      });

      expect(analysisBasic.dcfValuation).toBeUndefined();
      expect(analysisBasic.comparableAnalysis).toBeUndefined();
      expect(analysisBasic.earningsHistory.earnings).toHaveLength(0);
      expect(analysisBasic.sectorAnalysis).toBeUndefined();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle symbols with different formats", async () => {
      const symbols = ["AAPL", "BRK.B", "GOOGL"];

      for (const symbol of symbols) {
        const metrics = await service.getValuationMetrics(symbol);
        expect(metrics.symbol).toBe(symbol);
      }
    });

    it("should handle concurrent requests", async () => {
      const promises = [
        service.getValuationMetrics("AAPL"),
        service.getProfitabilityMetrics("MSFT"),
        service.getGrowthMetrics("GOOGL"),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty("peRatio");
      expect(results[1]).toHaveProperty("netMargin");
      expect(results[2]).toHaveProperty("revenueGrowthYoY");
    });
  });
});
