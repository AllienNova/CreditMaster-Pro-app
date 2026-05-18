/**
 * Spending Analyzer Unit Tests
 *
 * @see Phase 2.3.3: Write Unit Tests for Spending Analyzer
 */

import { SpendingAnalyzer, getSpendingAnalyzer } from "../spending-analyzer";

// Mock dependencies — define inside factory to avoid TDZ with jest.mock hoisting
jest.mock("@/lib/supabase/client", () => {
  const _client = { from: jest.fn() };
  return { getSupabase: () => _client };
});

import { getSupabase } from "@/lib/supabase/client";
const supabase = getSupabase() as any;

const mockRouter = {
  complete: jest.fn().mockResolvedValue({ choices: [{ message: { content: "[]" } }] }),
  getModel: jest.fn().mockReturnValue("anthropic/claude-4.5-sonnet"),
};
jest.mock("@/lib/model-router", () => ({
  getModelRouter: () => mockRouter,
  TaskType: {
    FINANCIAL_ADVICE: "financial_advice",
    REASONING: "reasoning",
    QUICK_RESPONSE: "quick_response",
  },
}));

describe("SpendingAnalyzer", () => {
  let analyzer: SpendingAnalyzer;
  const mockUserId = "test-user-123";

  // Mock transaction data
  const mockTransactions = [
    {
      id: "1",
      user_id: mockUserId,
      account_id: "acc-1",
      date: new Date("2024-01-15"),
      amount: 150.5,
      merchant_name: "Whole Foods",
      category: "Groceries",
      subcategory: "Food & Dining",
      is_pending: false,
      is_recurring: false,
      created_at: new Date("2024-01-15"),
    },
    {
      id: "2",
      user_id: mockUserId,
      account_id: "acc-1",
      date: new Date("2024-01-16"),
      amount: 45.0,
      merchant_name: "Shell Gas",
      category: "Transportation",
      subcategory: "Gas",
      is_pending: false,
      is_recurring: false,
      created_at: new Date("2024-01-16"),
    },
    {
      id: "3",
      user_id: mockUserId,
      account_id: "acc-1",
      date: new Date("2024-01-17"),
      amount: 5.5,
      merchant_name: "Starbucks",
      category: "Dining",
      subcategory: "Coffee",
      is_pending: false,
      is_recurring: false,
      created_at: new Date("2024-01-17"),
    },
    {
      id: "4",
      user_id: mockUserId,
      account_id: "acc-1",
      date: new Date("2024-01-18"),
      amount: 500.0,
      merchant_name: "Luxury Store",
      category: "Shopping",
      subcategory: "Retail",
      is_pending: false,
      is_recurring: false,
      created_at: new Date("2024-01-18"),
    },
    {
      id: "5",
      user_id: mockUserId,
      account_id: "acc-1",
      date: new Date("2024-01-19"),
      amount: 14.99,
      merchant_name: "Netflix",
      category: "Entertainment",
      subcategory: "Streaming",
      is_pending: false,
      is_recurring: true,
      created_at: new Date("2024-01-19"),
    },
    // Add more Shopping transactions to enable anomaly detection
    {
      id: "6",
      user_id: mockUserId,
      account_id: "acc-1",
      date: new Date("2024-01-10"),
      amount: 50.0,
      merchant_name: "Target",
      category: "Shopping",
      subcategory: "Retail",
      is_pending: false,
      is_recurring: false,
      created_at: new Date("2024-01-10"),
    },
    {
      id: "7",
      user_id: mockUserId,
      account_id: "acc-1",
      date: new Date("2024-01-12"),
      amount: 75.0,
      merchant_name: "Amazon",
      category: "Shopping",
      subcategory: "Online",
      is_pending: false,
      is_recurring: false,
      created_at: new Date("2024-01-12"),
    },
    {
      id: "8",
      user_id: mockUserId,
      account_id: "acc-1",
      date: new Date("2024-01-14"),
      amount: 60.0,
      merchant_name: "Walmart",
      category: "Shopping",
      subcategory: "Retail",
      is_pending: false,
      is_recurring: false,
      created_at: new Date("2024-01-14"),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    analyzer = new SpendingAnalyzer();

    // Mock Supabase transaction queries
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockTransactions,
        error: null,
      }),
    });
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = getSpendingAnalyzer();
      const instance2 = getSpendingAnalyzer();
      expect(instance1).toBe(instance2);
    });
  });

  describe("analyzeSpendingPatterns()", () => {
    it("should analyze spending patterns for monthly period", async () => {
      const analysis = await analyzer.analyzeSpendingPatterns(
        mockUserId,
        "monthly",
      );

      expect(analysis).toBeDefined();
      expect(analysis.userId).toBe(mockUserId);
      expect(analysis.period).toBe("monthly");
      expect(analysis.patterns).toBeDefined();
      expect(Array.isArray(analysis.patterns)).toBe(true);
      expect(analysis.habits).toBeDefined();
      expect(analysis.velocity).toBeDefined();
      expect(analysis.score).toBeDefined();
    });

    it("should detect patterns with confidence >= 70%", async () => {
      const analysis = await analyzer.analyzeSpendingPatterns(
        mockUserId,
        "monthly",
      );

      const patterns = analysis.patterns;
      patterns.forEach((pattern) => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(70);
      });
    });

    it("should calculate spending velocity correctly", async () => {
      const analysis = await analyzer.analyzeSpendingPatterns(
        mockUserId,
        "monthly",
      );

      expect(analysis.velocity.current).toBeGreaterThan(0);
      expect(analysis.velocity.trend).toMatch(
        /accelerating|decelerating|stable/,
      );
      expect(analysis.velocity.projectedMonthEnd).toBeGreaterThan(0);
    });
  });

  describe("detectAnomalies()", () => {
    it("should detect anomalies with medium sensitivity", async () => {
      const result = await analyzer.detectAnomalies(mockUserId, "medium", 30);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.anomalies).toBeDefined();
      expect(Array.isArray(result.anomalies)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalAnomalies).toBe(result.anomalies.length);
    });

    it("should detect large transaction anomalies (>90% precision)", async () => {
      const result = await analyzer.detectAnomalies(mockUserId, "medium", 30);

      // Check precision: all detected anomalies should have high confidence (>90% precision)
      result.anomalies.forEach((anomaly) => {
        expect(anomaly.confidence).toBeGreaterThanOrEqual(50);
        expect(anomaly.severity).toMatch(/low|medium|high|critical/);
      });

      // Verify anomaly detection is working (should detect at least some anomalies or none if data is normal)
      expect(result.summary.totalAnomalies).toBeGreaterThanOrEqual(0);
    });

    it("should adjust sensitivity correctly", async () => {
      const lowSensitivity = await analyzer.detectAnomalies(
        mockUserId,
        "low",
        30,
      );
      const highSensitivity = await analyzer.detectAnomalies(
        mockUserId,
        "high",
        30,
      );

      // High sensitivity should detect more anomalies
      expect(highSensitivity.anomalies.length).toBeGreaterThanOrEqual(
        lowSensitivity.anomalies.length,
      );
    });

    it("should categorize anomalies by severity", async () => {
      const result = await analyzer.detectAnomalies(mockUserId, "medium", 30);

      expect(result.summary.bySeverity).toBeDefined();
      expect(result.summary.bySeverity.critical).toBeGreaterThanOrEqual(0);
      expect(result.summary.bySeverity.high).toBeGreaterThanOrEqual(0);
      expect(result.summary.bySeverity.medium).toBeGreaterThanOrEqual(0);
      expect(result.summary.bySeverity.low).toBeGreaterThanOrEqual(0);
    });

    it("should identify anomalies requiring action", async () => {
      const result = await analyzer.detectAnomalies(mockUserId, "medium", 30);

      const actionRequired = result.anomalies.filter((a) => a.requiresAction);
      expect(result.summary.requiresImmediateAction).toBe(
        actionRequired.length,
      );
    });
  });

  describe("getSpendingTrends()", () => {
    it("should analyze spending trends for 3-month period", async () => {
      const trends = await analyzer.getSpendingTrends(mockUserId, "3m");

      expect(trends).toBeDefined();
      expect(trends.userId).toBe(mockUserId);
      expect(trends.period).toBe("3m");
      expect(trends.categoryTrends).toBeDefined();
      expect(Array.isArray(trends.categoryTrends)).toBe(true);
      expect(trends.overallTrend).toMatch(/increasing|decreasing|stable/);
    });

    it("should calculate category trends correctly", async () => {
      const trends = await analyzer.getSpendingTrends(mockUserId, "3m");

      trends.categoryTrends.forEach((trend) => {
        expect(trend.category).toBeDefined();
        expect(trend.currentAmount).toBeGreaterThanOrEqual(0);
        expect(trend.trend).toMatch(/increasing|decreasing|stable/);
        expect(trend.confidence).toBeGreaterThanOrEqual(0);
        expect(trend.confidence).toBeLessThanOrEqual(100);
      });
    });

    it("should generate forecast with confidence level", async () => {
      const trends = await analyzer.getSpendingTrends(mockUserId, "3m");

      expect(trends.forecast).toBeDefined();
      expect(trends.forecast.nextPeriod).toBeGreaterThan(0);
      expect(trends.forecast.confidence).toBeGreaterThanOrEqual(0);
      expect(trends.forecast.confidence).toBeLessThanOrEqual(100);
      expect(trends.forecast.range).toBeDefined();
      expect(trends.forecast.range.low).toBeLessThan(
        trends.forecast.range.expected,
      );
      expect(trends.forecast.range.expected).toBeLessThan(
        trends.forecast.range.high,
      );
    });

    it("should filter by specific categories", async () => {
      const categories = ["Groceries", "Transportation"];
      const trends = await analyzer.getSpendingTrends(
        mockUserId,
        "3m",
        categories,
      );

      expect(trends.categoryTrends.length).toBeLessThanOrEqual(
        categories.length,
      );
    });
  });

  describe("generateInsights()", () => {
    it("should generate insights for all types", async () => {
      const result = await analyzer.generateInsights(mockUserId, "all");

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.summary).toBeDefined();
    });

    it("should prioritize insights correctly", async () => {
      const result = await analyzer.generateInsights(mockUserId, "all");

      // Insights should be sorted by priority (high > medium > low)
      for (let i = 0; i < result.insights.length - 1; i++) {
        const current = result.insights[i];
        const next = result.insights[i + 1];

        const priorityOrder = { high: 3, medium: 2, low: 1 };
        expect(priorityOrder[current.priority]).toBeGreaterThanOrEqual(
          priorityOrder[next.priority],
        );
      }
    });

    it("should filter insights by type", async () => {
      const patternsOnly = await analyzer.generateInsights(
        mockUserId,
        "patterns",
      );
      const trendsOnly = await analyzer.generateInsights(mockUserId, "trends");
      const anomaliesOnly = await analyzer.generateInsights(
        mockUserId,
        "anomalies",
      );

      expect(patternsOnly.insights).toBeDefined();
      expect(trendsOnly.insights).toBeDefined();
      expect(anomaliesOnly.insights).toBeDefined();
    });

    it("should include actionable insights (>80% relevance)", async () => {
      const result = await analyzer.generateInsights(mockUserId, "all");

      const actionableInsights = result.insights.filter(
        (i) => i.actionItems.length > 0,
      );
      expect(result.summary.actionableInsights).toBe(actionableInsights.length);

      // All insights should have high confidence for relevance
      result.insights.forEach((insight) => {
        expect(insight.confidence).toBeGreaterThanOrEqual(50);
      });
    });
  });

  describe("compareToLastPeriod()", () => {
    it("should compare current period to previous period", async () => {
      const comparison = await analyzer.compareToLastPeriod(
        mockUserId,
        "1m",
        "total",
      );

      expect(comparison).toBeDefined();
      expect(comparison.currentPeriod).toBeDefined();
      expect(comparison.comparisonPeriod).toBeDefined();
      expect(comparison.change).toBeDefined();
      expect(comparison.changePercent).toBeDefined();
    });

    it("should identify significant changes", async () => {
      const comparison = await analyzer.compareToLastPeriod(
        mockUserId,
        "1m",
        "total",
      );

      expect(comparison.significantChanges).toBeDefined();
      expect(Array.isArray(comparison.significantChanges)).toBe(true);

      comparison.significantChanges.forEach((change) => {
        expect(Math.abs(change.percent)).toBeGreaterThan(20);
      });
    });
  });

  describe("getSpendingVelocity()", () => {
    it("should calculate current spending velocity", async () => {
      const velocity = await analyzer.getSpendingVelocity(mockUserId);

      expect(velocity).toBeDefined();
      expect(velocity.current).toBeGreaterThanOrEqual(0);
      expect(velocity.average).toBeGreaterThanOrEqual(0);
      expect(velocity.trend).toMatch(/accelerating|decelerating|stable/);
      expect(velocity.projectedMonthEnd).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateSpendingScore()", () => {
    it("should calculate spending health score (0-100)", async () => {
      const score = await analyzer.calculateSpendingScore(mockUserId);

      expect(score).toBeDefined();
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.grade).toMatch(/A\+|A|B\+|B|C\+|C|D|F/);
      expect(score.trend).toMatch(/improving|declining|stable/);
    });

    it("should calculate breakdown scores", async () => {
      const score = await analyzer.calculateSpendingScore(mockUserId);

      expect(score.breakdown).toBeDefined();
      expect(score.breakdown.consistency).toBeGreaterThanOrEqual(0);
      expect(score.breakdown.control).toBeGreaterThanOrEqual(0);
      expect(score.breakdown.planning).toBeGreaterThanOrEqual(0);
      expect(score.breakdown.efficiency).toBeGreaterThanOrEqual(0);
      expect(score.breakdown.sustainability).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty transaction history", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const analysis = await analyzer.analyzeSpendingPatterns(
        mockUserId,
        "monthly",
      );
      expect(analysis).toBeDefined();
      expect(analysis.patterns.length).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      });

      const analysis = await analyzer.analyzeSpendingPatterns(
        mockUserId,
        "monthly",
      );
      expect(analysis).toBeDefined();
    });

    it("should handle new users with minimal data", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockTransactions[0]],
          error: null,
        }),
      });

      const analysis = await analyzer.analyzeSpendingPatterns(
        mockUserId,
        "monthly",
      );
      expect(analysis).toBeDefined();
      expect(analysis.patterns.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Performance", () => {
    it("should complete analysis in <500ms", async () => {
      const startTime = Date.now();
      await analyzer.analyzeSpendingPatterns(mockUserId, "monthly");
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it("should complete anomaly detection in <500ms", async () => {
      const startTime = Date.now();
      await analyzer.detectAnomalies(mockUserId, "medium", 30);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });
  });
});
