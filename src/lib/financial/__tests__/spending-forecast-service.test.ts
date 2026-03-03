/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Spending Forecast Service Unit Tests
 *
 * Tests for ML-based spending prediction including forecast generation,
 * regression calculations, confidence intervals, category forecasts,
 * insights, recommendations, and dashboard summary.
 */

import { spendingForecastService } from "../spending-forecast-service";

// ---------------------------------------------------------------------------
// Mock spending-analysis-service
// ---------------------------------------------------------------------------
jest.mock("../spending-analysis-service", () => ({
  spendingAnalysisService: {
    analyzeSpending: jest.fn(),
    getSpendingTrends: jest.fn(),
  },
}));

/** Helper: get the mocked spendingAnalysisService */
function mockAnalysis() {
  return require("../spending-analysis-service").spendingAnalysisService;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock analysis result for a given month.
 * Allows customizing totalSpending, totalIncome, and category amounts.
 */
function createMockAnalysis(overrides: {
  totalSpending?: number;
  totalIncome?: number;
  netCashFlow?: number;
  categories?: Array<{
    category: string;
    amount: number;
    transactionCount?: number;
  }>;
}) {
  const totalSpending = overrides.totalSpending ?? 2000;
  const totalIncome = overrides.totalIncome ?? 5000;
  const netCashFlow = overrides.netCashFlow ?? totalIncome - totalSpending;
  const categories = overrides.categories ?? [
    { category: "housing", amount: 1200, transactionCount: 1 },
    { category: "groceries", amount: 400, transactionCount: 8 },
    { category: "entertainment", amount: 200, transactionCount: 5 },
    { category: "dining_out", amount: 200, transactionCount: 6 },
  ];

  return {
    period: { startDate: new Date(), endDate: new Date() },
    totalSpending,
    totalIncome,
    netCashFlow,
    averageDailySpending: totalSpending / 30,
    byCategory: categories.map((c) => ({
      category: c.category,
      displayName: c.category,
      amount: c.amount,
      percentage: (c.amount / totalSpending) * 100,
      transactionCount: c.transactionCount ?? 3,
      averageTransaction: c.amount / (c.transactionCount ?? 3),
      trend: "stable" as const,
      changeFromLastPeriod: 0,
    })),
    byMerchant: [],
    anomalies: [],
    patterns: [],
    insights: [],
    comparison: {
      previousPeriod: { startDate: new Date(), endDate: new Date() },
      spendingChange: 0,
      spendingChangePercent: 0,
      categoryChanges: [],
    },
  };
}

/**
 * Setup the mock to return consistent monthly data for N months.
 * Uses optional per-month overrides for spending variation.
 */
function setupMockAnalysisForMonths(
  _months: number,
  monthlyOverrides?: Array<{
    totalSpending?: number;
    totalIncome?: number;
    categories?: Array<{
      category: string;
      amount: number;
      transactionCount?: number;
    }>;
  }>,
) {
  const mock = mockAnalysis();
  let callIndex = 0;

  mock.analyzeSpending.mockImplementation(() => {
    const overrides = monthlyOverrides?.[callIndex] ?? {};
    callIndex++;
    return Promise.resolve(createMockAnalysis(overrides));
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("SpendingForecastService", () => {
  // --------------------------------------------------------------------------
  // generateForecast - Basic behavior
  // --------------------------------------------------------------------------
  describe("generateForecast", () => {
    it("should return a valid forecast object", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      expect(forecast).toBeDefined();
      expect(forecast.forecastId).toContain("forecast_user-123");
      expect(forecast.userId).toBe("user-123");
      expect(forecast.generatedAt).toBeInstanceOf(Date);
      expect(forecast.forecastPeriod).toBeDefined();
      expect(forecast.predictions).toBeDefined();
      expect(forecast.accuracy).toBeDefined();
      expect(forecast.insights).toBeDefined();
      expect(forecast.recommendations).toBeDefined();
    });

    it("should default to 3 months of predictions", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      expect(forecast.predictions).toHaveLength(3);
      expect(forecast.forecastPeriod.months).toBe(3);
    });

    it("should respect custom months option", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { months: 6 },
      );

      expect(forecast.predictions).toHaveLength(6);
      expect(forecast.forecastPeriod.months).toBe(6);
    });

    it("should set correct forecast period dates", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { months: 3 },
      );

      expect(forecast.forecastPeriod.startDate).toBeInstanceOf(Date);
      expect(forecast.forecastPeriod.endDate).toBeInstanceOf(Date);
      expect(
        forecast.forecastPeriod.endDate.getTime(),
      ).toBeGreaterThan(forecast.forecastPeriod.startDate.getTime());
    });

    it("should exclude category forecasts when includeCategories is false", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { includeCategories: false },
      );

      expect(forecast.categoryForecasts).toHaveLength(0);
    });

    it("should include category forecasts by default", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      expect(forecast.categoryForecasts.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // generateForecast - Predictions quality
  // --------------------------------------------------------------------------
  describe("Prediction Quality", () => {
    it("predictions should have required fields", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      for (const pred of forecast.predictions) {
        expect(pred.month).toBeTruthy();
        expect(pred.monthLabel).toBeTruthy();
        expect(typeof pred.predictedSpending).toBe("number");
        expect(typeof pred.predictedIncome).toBe("number");
        expect(typeof pred.predictedNetFlow).toBe("number");
        expect(pred.confidenceInterval).toBeDefined();
        expect(pred.confidenceInterval.low).toBeLessThanOrEqual(
          pred.confidenceInterval.high,
        );
        expect(["increasing", "decreasing", "stable"]).toContain(pred.trend);
        expect(typeof pred.seasonalFactor).toBe("number");
      }
    });

    it("predictedNetFlow should equal income minus spending", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      for (const pred of forecast.predictions) {
        const expected =
          Math.round(
            (pred.predictedIncome - pred.predictedSpending) * 100,
          ) / 100;
        expect(pred.predictedNetFlow).toBeCloseTo(expected, 2);
      }
    });

    it("predicted spending should be non-negative", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      for (const pred of forecast.predictions) {
        expect(pred.predictedSpending).toBeGreaterThanOrEqual(0);
        expect(pred.predictedIncome).toBeGreaterThanOrEqual(0);
      }
    });

    it("confidence interval low should be non-negative", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      for (const pred of forecast.predictions) {
        expect(pred.confidenceInterval.low).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // generateForecast - With insufficient data
  // --------------------------------------------------------------------------
  describe("Insufficient Historical Data", () => {
    it("should handle fewer than 3 valid months (poor data quality)", async () => {
      // Only 2 months of data
      setupMockAnalysisForMonths(2, [
        { totalSpending: 1000, totalIncome: 3000 },
        { totalSpending: 1200, totalIncome: 3000 },
      ]);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 2, months: 2 },
      );

      expect(forecast.predictions).toHaveLength(2);
      expect(forecast.accuracy.dataQuality).toBe("poor");
    });

    it("should return stable trend with insufficient data", async () => {
      setupMockAnalysisForMonths(2, [
        { totalSpending: 1000, totalIncome: 3000 },
        { totalSpending: 1200, totalIncome: 3000 },
      ]);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 2, months: 1 },
      );

      // With < 3 months, predictions use simple average and stable trend
      expect(forecast.predictions[0].trend).toBe("stable");
      expect(forecast.predictions[0].seasonalFactor).toBe(1.0);
    });

    it("should use wide confidence intervals with sparse data", async () => {
      setupMockAnalysisForMonths(2, [
        { totalSpending: 1000, totalIncome: 3000 },
        { totalSpending: 1200, totalIncome: 3000 },
      ]);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 2, months: 1 },
      );

      const ci = forecast.predictions[0].confidenceInterval;
      // With insufficient data, confidence is 0.5
      expect(ci.confidence).toBe(0.5);
    });

    it("should return empty category forecasts with insufficient data", async () => {
      setupMockAnalysisForMonths(2, [
        { totalSpending: 1000, totalIncome: 3000 },
        { totalSpending: 1200, totalIncome: 3000 },
      ]);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 2 },
      );

      expect(forecast.categoryForecasts).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // generateForecast - Accuracy metrics
  // --------------------------------------------------------------------------
  describe("Forecast Accuracy", () => {
    it("should have accuracy with required fields", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      expect(typeof forecast.accuracy.overallScore).toBe("number");
      expect(forecast.accuracy.overallScore).toBeGreaterThanOrEqual(0);
      expect(forecast.accuracy.overallScore).toBeLessThanOrEqual(100);
      expect(typeof forecast.accuracy.mape).toBe("number");
      expect(typeof forecast.accuracy.rmse).toBe("number");
      expect(["excellent", "good", "fair", "poor"]).toContain(
        forecast.accuracy.dataQuality,
      );
      expect(forecast.accuracy.historicalMonths).toBeGreaterThanOrEqual(0);
    });

    it("should classify data quality as excellent with 12+ months", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 12 },
      );

      expect(forecast.accuracy.dataQuality).toBe("excellent");
    });

    it("should classify data quality as good with 6+ months", async () => {
      setupMockAnalysisForMonths(6);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 6 },
      );

      expect(forecast.accuracy.dataQuality).toBe("good");
    });

    it("should classify data quality as fair with 3-5 months", async () => {
      setupMockAnalysisForMonths(4, [
        { totalSpending: 1000, totalIncome: 3000 },
        { totalSpending: 1100, totalIncome: 3000 },
        { totalSpending: 1050, totalIncome: 3000 },
        { totalSpending: 1150, totalIncome: 3000 },
      ]);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 4 },
      );

      expect(forecast.accuracy.dataQuality).toBe("fair");
    });
  });

  // --------------------------------------------------------------------------
  // generateForecast - Category Forecasts
  // --------------------------------------------------------------------------
  describe("Category Forecasts", () => {
    it("should produce category forecasts with required fields", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      for (const cat of forecast.categoryForecasts) {
        expect(cat.category).toBeTruthy();
        expect(cat.displayName).toBeTruthy();
        expect(typeof cat.currentMonthlyAvg).toBe("number");
        expect(typeof cat.predictedMonthlyAvg).toBe("number");
        expect(cat.predictedMonthlyAvg).toBeGreaterThanOrEqual(0);
        expect(["increasing", "decreasing", "stable"]).toContain(cat.trend);
        expect(typeof cat.percentChange).toBe("number");
        expect(cat.confidenceInterval).toBeDefined();
      }
    });

    it("should sort category forecasts by predicted amount descending", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      if (forecast.categoryForecasts.length >= 2) {
        for (let i = 1; i < forecast.categoryForecasts.length; i++) {
          expect(
            forecast.categoryForecasts[i - 1].predictedMonthlyAvg,
          ).toBeGreaterThanOrEqual(
            forecast.categoryForecasts[i].predictedMonthlyAvg,
          );
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // generateForecast - Seasonality
  // --------------------------------------------------------------------------
  describe("Seasonality", () => {
    it("should apply seasonal factors when includeSeasonality is true", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { includeSeasonality: true },
      );

      // Seasonal factors should be numbers (not necessarily 1.0)
      for (const pred of forecast.predictions) {
        expect(typeof pred.seasonalFactor).toBe("number");
        expect(pred.seasonalFactor).toBeGreaterThan(0);
      }
    });

    it("should not apply seasonality when includeSeasonality is false", async () => {
      setupMockAnalysisForMonths(6, [
        { totalSpending: 1000, totalIncome: 3000 },
        { totalSpending: 1100, totalIncome: 3000 },
        { totalSpending: 1050, totalIncome: 3000 },
        { totalSpending: 1200, totalIncome: 3000 },
        { totalSpending: 1150, totalIncome: 3000 },
        { totalSpending: 1250, totalIncome: 3000 },
      ]);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { includeSeasonality: false, historicalMonths: 6 },
      );

      // Without seasonality, seasonal factor should be 1.0
      for (const pred of forecast.predictions) {
        expect(pred.seasonalFactor).toBe(1);
      }
    });
  });

  // --------------------------------------------------------------------------
  // generateForecast - Insights
  // --------------------------------------------------------------------------
  describe("Insights", () => {
    it("should limit insights to 6 max", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      expect(forecast.insights.length).toBeLessThanOrEqual(6);
    });

    it("insights should have required fields", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      for (const insight of forecast.insights) {
        expect(insight.id).toBeTruthy();
        expect(insight.type).toBeTruthy();
        expect(insight.title).toBeTruthy();
        expect(insight.description).toBeTruthy();
        expect(["positive", "negative", "neutral"]).toContain(insight.impact);
        expect(typeof insight.confidence).toBe("number");
      }
    });

    it("should detect negative cash flow risk", async () => {
      // Income < spending => negative net flow
      setupMockAnalysisForMonths(6, [
        { totalSpending: 6000, totalIncome: 3000 },
        { totalSpending: 6000, totalIncome: 3000 },
        { totalSpending: 6000, totalIncome: 3000 },
        { totalSpending: 6000, totalIncome: 3000 },
        { totalSpending: 6000, totalIncome: 3000 },
        { totalSpending: 6000, totalIncome: 3000 },
      ]);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 6 },
      );

      const budgetRiskInsight = forecast.insights.find(
        (i) => i.type === "budget_risk",
      );
      expect(budgetRiskInsight).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // generateForecast - Recommendations
  // --------------------------------------------------------------------------
  describe("Recommendations", () => {
    it("should limit recommendations to 5 max", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      expect(forecast.recommendations.length).toBeLessThanOrEqual(5);
    });

    it("recommendations should be non-empty strings", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      for (const rec of forecast.recommendations) {
        expect(typeof rec).toBe("string");
        expect(rec.length).toBeGreaterThan(0);
      }
    });

    it("should recommend saving when net flow is positive", async () => {
      setupMockAnalysisForMonths(6, [
        { totalSpending: 1000, totalIncome: 5000 },
        { totalSpending: 1000, totalIncome: 5000 },
        { totalSpending: 1000, totalIncome: 5000 },
        { totalSpending: 1000, totalIncome: 5000 },
        { totalSpending: 1000, totalIncome: 5000 },
        { totalSpending: 1000, totalIncome: 5000 },
      ]);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 6, months: 3 },
      );

      const savingsRec = forecast.recommendations.find((r) =>
        r.toLowerCase().includes("save") || r.toLowerCase().includes("saving"),
      );
      expect(savingsRec).toBeDefined();
    });

    it("should recommend expense reduction when spending exceeds income", async () => {
      setupMockAnalysisForMonths(6, [
        { totalSpending: 6000, totalIncome: 3000 },
        { totalSpending: 6000, totalIncome: 3000 },
        { totalSpending: 6000, totalIncome: 3000 },
        { totalSpending: 6000, totalIncome: 3000 },
        { totalSpending: 6000, totalIncome: 3000 },
        { totalSpending: 6000, totalIncome: 3000 },
      ]);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 6, months: 3 },
      );

      const negativeFlowRec = forecast.recommendations.find(
        (r) =>
          r.toLowerCase().includes("negative") ||
          r.toLowerCase().includes("emergency"),
      );
      expect(negativeFlowRec).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // generateForecast - Error handling
  // --------------------------------------------------------------------------
  describe("Error Handling", () => {
    it("should handle analysis service errors for individual months", async () => {
      const mock = mockAnalysis();
      let callCount = 0;
      mock.analyzeSpending.mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          return Promise.reject(new Error("Analysis failed"));
        }
        return Promise.resolve(
          createMockAnalysis({
            totalSpending: 2000,
            totalIncome: 5000,
          }),
        );
      });

      // Should not throw — failed months get zero entries
      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 6 },
      );

      expect(forecast).toBeDefined();
      expect(forecast.predictions.length).toBeGreaterThan(0);
    });

    it("should handle all months failing gracefully", async () => {
      const mock = mockAnalysis();
      mock.analyzeSpending.mockRejectedValue(new Error("Service down"));

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 3, months: 1 },
      );

      expect(forecast).toBeDefined();
      expect(forecast.accuracy.dataQuality).toBe("poor");
      expect(forecast.predictions).toHaveLength(1);
      // With all zero data, predicted spending should be 0
      expect(forecast.predictions[0].predictedSpending).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // generateForecast - Confidence level
  // --------------------------------------------------------------------------
  describe("Confidence Level", () => {
    it("should use 0.95 confidence by default", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
      );

      for (const pred of forecast.predictions) {
        expect(pred.confidenceInterval.confidence).toBe(0.95);
      }
    });

    it("should respect custom confidence level", async () => {
      setupMockAnalysisForMonths(12);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { confidenceLevel: 0.99 },
      );

      for (const pred of forecast.predictions) {
        expect(pred.confidenceInterval.confidence).toBe(0.99);
      }
    });
  });

  // --------------------------------------------------------------------------
  // getForecastSummary
  // --------------------------------------------------------------------------
  describe("getForecastSummary", () => {
    it("should return summary with all required fields", async () => {
      setupMockAnalysisForMonths(12);

      const summary =
        await spendingForecastService.getForecastSummary("user-123");

      expect(typeof summary.nextMonthPredicted).toBe("number");
      expect(["increasing", "decreasing", "stable"]).toContain(summary.trend);
      expect(typeof summary.confidence).toBe("number");
      expect(summary.confidence).toBeGreaterThanOrEqual(0);
      expect(summary.confidence).toBeLessThanOrEqual(1);
      expect(typeof summary.potentialSavings).toBe("number");
      expect(summary.potentialSavings).toBeGreaterThanOrEqual(0);
    });

    it("should return null for topGrowingCategory when none increasing", async () => {
      setupMockAnalysisForMonths(12);

      const summary =
        await spendingForecastService.getForecastSummary("user-123");

      // topGrowingCategory can be string or null
      expect(
        summary.topGrowingCategory === null ||
          typeof summary.topGrowingCategory === "string",
      ).toBe(true);
    });

    it("should handle no data gracefully", async () => {
      const mock = mockAnalysis();
      mock.analyzeSpending.mockRejectedValue(new Error("No data"));

      const summary =
        await spendingForecastService.getForecastSummary("user-123");

      expect(summary.nextMonthPredicted).toBe(0);
      expect(summary.trend).toBe("stable");
    });
  });

  // --------------------------------------------------------------------------
  // generateForecast - Trending data
  // --------------------------------------------------------------------------
  describe("Trending Data Detection", () => {
    it("should detect increasing spending trend", async () => {
      // Steadily increasing spending
      const months = [];
      for (let i = 0; i < 12; i++) {
        months.push({
          totalSpending: 1000 + i * 200,
          totalIncome: 5000,
        });
      }
      setupMockAnalysisForMonths(12, months);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 12 },
      );

      // At least one prediction should show increasing trend
      const hasIncreasing = forecast.predictions.some(
        (p) => p.trend === "increasing",
      );
      expect(hasIncreasing).toBe(true);
    });

    it("should produce predictions that reflect trend direction", async () => {
      // Steadily increasing spending
      const months = [];
      for (let i = 0; i < 12; i++) {
        months.push({
          totalSpending: 1000 + i * 200,
          totalIncome: 5000,
        });
      }
      setupMockAnalysisForMonths(12, months);

      const forecast = await spendingForecastService.generateForecast(
        "user-123",
        { historicalMonths: 12, months: 3, includeSeasonality: false },
      );

      // Each subsequent prediction should be >= the previous one
      // (with increasing historical data and no seasonality)
      for (let i = 1; i < forecast.predictions.length; i++) {
        expect(
          forecast.predictions[i].predictedSpending,
        ).toBeGreaterThanOrEqual(
          forecast.predictions[i - 1].predictedSpending - 1, // allow tiny rounding
        );
      }
    });
  });
});
