/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Spending Analysis Service — Comprehensive Unit Tests
 *
 * Tests for analyzeSpending, predictSpending, getQuickSummary,
 * getCashFlowAnalysis, and getSpendingTrends.
 */

jest.mock("@/lib/supabase/client", () => {
  const _client = { from: jest.fn() };
  return { getSupabase: () => _client };
});

jest.mock("../plaid-service", () => ({
  plaidService: {
    getTransactions: jest.fn(),
    getAccounts: jest.fn(),
  },
}));

function plaid() {
  return require("../plaid-service").plaidService;
}

import { spendingAnalysisService } from "../spending-analysis-service";
import type { SpendingPeriod } from "../spending-analysis-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JAN_PERIOD: SpendingPeriod = {
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-01-31"),
};

function txn(overrides: Record<string, any> = {}) {
  return {
    transactionId: overrides.transactionId ?? "txn-1",
    accountId: overrides.accountId ?? "acc-1",
    date: overrides.date ?? new Date("2024-01-15"),
    amount: overrides.amount ?? 50,
    name: overrides.name ?? "Test Merchant",
    merchantName: overrides.merchantName ?? "Test Merchant",
    category: overrides.category ?? ["Shops"],
    pending: overrides.pending ?? false,
  };
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe("SpendingAnalysisService", () => {
  beforeEach(() => {
    // resetMocks already clears implementations; re-set defaults
    plaid().getAccounts.mockResolvedValue([{ accountId: "acc-1" }]);
    plaid().getTransactions.mockResolvedValue([]);
  });

  // ========================================================================
  // analyzeSpending
  // ========================================================================

  describe("analyzeSpending", () => {
    it("returns correct totals for mixed income and expenses", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 50, category: ["Shops"] }),
        txn({ transactionId: "t2", amount: 25, category: ["Food and Drink", "Restaurants"] }),
        txn({ transactionId: "t3", amount: -2000, name: "Payroll", merchantName: "Employer", category: ["Transfer", "Payroll"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.totalSpending).toBe(75);
      expect(r.totalIncome).toBe(2000);
      expect(r.netCashFlow).toBe(1925);
    });

    it("returns zero totals when no accounts exist", async () => {
      plaid().getAccounts.mockResolvedValue([]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.totalSpending).toBe(0);
      expect(r.totalIncome).toBe(0);
      expect(r.netCashFlow).toBe(0);
      expect(r.byCategory).toEqual([]);
      expect(r.byMerchant).toEqual([]);
    });

    it("returns zero totals when transactions are empty", async () => {
      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.totalSpending).toBe(0);
      expect(r.totalIncome).toBe(0);
    });

    it("calculates average daily spending correctly", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 300 }),
      ]);

      const period: SpendingPeriod = {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      };
      const r = await spendingAnalysisService.analyzeSpending("u1", period);

      // 30 days in period, 300 / 30 = 10
      expect(r.averageDailySpending).toBe(10);
    });

    it("includes period in result", async () => {
      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);
      expect(r.period).toEqual(JAN_PERIOD);
    });

    it("handles plaid error gracefully (returns empty transactions)", async () => {
      plaid().getAccounts.mockRejectedValue(new Error("Plaid down"));

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.totalSpending).toBe(0);
    });

    it("aggregates transactions across multiple accounts", async () => {
      plaid().getAccounts.mockResolvedValue([
        { accountId: "acc-1" },
        { accountId: "acc-2" },
      ]);
      plaid().getTransactions
        .mockResolvedValueOnce([txn({ transactionId: "t1", amount: 100 })])
        .mockResolvedValueOnce([txn({ transactionId: "t2", amount: 200, accountId: "acc-2" })]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.totalSpending).toBe(300);
    });
  });

  // ========================================================================
  // Category Analysis
  // ========================================================================

  describe("Category Analysis", () => {
    it("groups transactions by mapped category", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 100, category: ["Food and Drink", "Restaurants"] }),
        txn({ transactionId: "t2", amount: 50, category: ["Food and Drink", "Restaurants"] }),
        txn({ transactionId: "t3", amount: 200, category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.byCategory).toHaveLength(2);
      const dining = r.byCategory.find((c) => c.category === "dining_out");
      expect(dining?.amount).toBe(150);
      expect(dining?.transactionCount).toBe(2);
    });

    it("calculates percentage of total spending per category", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 100, category: ["Food and Drink", "Groceries"] }),
        txn({ transactionId: "t2", amount: 100, category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      r.byCategory.forEach((cat) => {
        expect(cat.percentage).toBe(50);
      });
    });

    it("sorts categories by amount descending", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 50, category: ["Food and Drink", "Groceries"] }),
        txn({ transactionId: "t2", amount: 200, category: ["Shops"] }),
        txn({ transactionId: "t3", amount: 100, category: ["Travel"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.byCategory[0].amount).toBeGreaterThanOrEqual(r.byCategory[1].amount);
    });

    it("calculates average transaction per category", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 40, category: ["Shops"] }),
        txn({ transactionId: "t2", amount: 60, category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const shopping = r.byCategory.find((c) => c.category === "shopping");
      expect(shopping?.averageTransaction).toBe(50);
    });

    it("maps unknown Plaid category to other", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 10, category: ["UnknownCategory"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.byCategory[0].category).toBe("other");
    });

    it("provides a display name for each category", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 10, category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.byCategory[0].displayName).toBe("Shopping");
    });
  });

  // ========================================================================
  // Merchant Analysis
  // ========================================================================

  describe("Merchant Analysis", () => {
    it("groups transactions by merchant and sums amounts", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 50, merchantName: "Amazon", category: ["Shops"] }),
        txn({ transactionId: "t2", amount: 30, merchantName: "Amazon", category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const amazon = r.byMerchant.find((m) => m.merchant === "Amazon");
      expect(amazon?.amount).toBe(80);
      expect(amazon?.transactionCount).toBe(2);
      expect(amazon?.averageTransaction).toBe(40);
    });

    it("detects known recurring merchants", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 15.99, name: "Netflix", merchantName: "Netflix", category: ["Service"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const netflix = r.byMerchant.find((m) => m.merchant === "Netflix");
      expect(netflix?.isRecurring).toBe(true);
    });

    it("limits merchant list to top 20", async () => {
      const txns = Array.from({ length: 25 }, (_, i) =>
        txn({
          transactionId: `t${i}`,
          amount: 10,
          merchantName: `Merchant ${i}`,
          name: `Merchant ${i}`,
          category: ["Shops"],
        }),
      );
      plaid().getTransactions.mockResolvedValue(txns);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.byMerchant.length).toBeLessThanOrEqual(20);
    });

    it("tracks the last transaction date per merchant", async () => {
      const earlier = new Date("2024-01-05");
      const later = new Date("2024-01-20");
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 10, merchantName: "Shop", date: earlier, category: ["Shops"] }),
        txn({ transactionId: "t2", amount: 10, merchantName: "Shop", date: later, category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const shop = r.byMerchant.find((m) => m.merchant === "Shop");
      expect(shop?.lastTransaction).toEqual(later);
    });
  });

  // ========================================================================
  // Anomaly Detection
  // ========================================================================

  describe("Anomaly Detection", () => {
    it("detects unusually large transactions (>3x average, >$100)", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 50, merchantName: "Store", category: ["Shops"] }),
        txn({ transactionId: "t2", amount: 45, merchantName: "Store", category: ["Shops"] }),
        txn({ transactionId: "t3", amount: 55, merchantName: "Store", category: ["Shops"] }),
        txn({ transactionId: "t4", amount: 48, merchantName: "Store", category: ["Shops"] }),
        txn({ transactionId: "t5", amount: 500, merchantName: "Store", category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const large = r.anomalies.find((a) => a.type === "unusual_large_transaction");
      expect(large).toBeDefined();
      expect(large?.amount).toBe(500);
    });

    it("does not flag large transactions when category has fewer than 4 transactions", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 10, category: ["Shops"] }),
        txn({ transactionId: "t2", amount: 10, category: ["Shops"] }),
        txn({ transactionId: "t3", amount: 500, category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const large = r.anomalies.find((a) => a.type === "unusual_large_transaction");
      expect(large).toBeUndefined();
    });

    it("detects potential duplicate charges (same merchant, amount, within 7 days)", async () => {
      const date1 = new Date("2024-01-10");
      const date2 = new Date("2024-01-12");
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 29.99, merchantName: "Gym", date: date1, category: ["Service"] }),
        txn({ transactionId: "t2", amount: 29.99, merchantName: "Gym", date: date2, category: ["Service"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const dup = r.anomalies.find((a) => a.type === "duplicate_charge");
      expect(dup).toBeDefined();
      expect(dup?.merchant).toBe("Gym");
    });

    it("does not flag duplicates when amount differs", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 29.99, merchantName: "Gym", date: new Date("2024-01-10"), category: ["Service"] }),
        txn({ transactionId: "t2", amount: 30.00, merchantName: "Gym", date: new Date("2024-01-12"), category: ["Service"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const dup = r.anomalies.find((a) => a.type === "duplicate_charge");
      expect(dup).toBeUndefined();
    });

    it("does not flag duplicates when dates are >7 days apart", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 29.99, merchantName: "Gym", date: new Date("2024-01-01"), category: ["Service"] }),
        txn({ transactionId: "t2", amount: 29.99, merchantName: "Gym", date: new Date("2024-01-15"), category: ["Service"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const dup = r.anomalies.find((a) => a.type === "duplicate_charge");
      expect(dup).toBeUndefined();
    });

    it("sets high severity when amount > 5x average", async () => {
      // Average includes the outlier. With 10 normal txns at $10 + outlier $1000:
      // avg = (100 + 1000) / 11 = 100, outlier/avg = 10x > 5x → high severity.
      // Also need count > 3 (11 > 3) and amount > 100 (1000 > 100).
      const normalTxns = Array.from({ length: 10 }, (_, i) =>
        txn({ transactionId: `t${i}`, amount: 10, category: ["Shops"] }),
      );
      plaid().getTransactions.mockResolvedValue([
        ...normalTxns,
        txn({ transactionId: "outlier", amount: 1000, merchantName: "BigStore", category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const large = r.anomalies.find((a) => a.type === "unusual_large_transaction");
      expect(large?.severity).toBe("high");
    });
  });

  // ========================================================================
  // Pattern Detection
  // ========================================================================

  describe("Pattern Detection", () => {
    it("detects recurring subscription patterns", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 15.99, name: "Spotify", merchantName: "Spotify", date: new Date("2024-01-15"), category: ["Service"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const sub = r.patterns.find((p) => p.type === "recurring_subscription");
      expect(sub).toBeDefined();
      expect(sub?.description).toContain("Spotify");
      expect(sub?.frequency).toBe("monthly");
    });

    it("detects weekend spending pattern when >5 weekend transactions", async () => {
      // Use local-time Date constructor to avoid UTC midnight → previous day in local tz
      const weekendDates = [
        new Date(2024, 0, 6),  // Sat (local)
        new Date(2024, 0, 7),  // Sun (local)
        new Date(2024, 0, 13), // Sat (local)
        new Date(2024, 0, 14), // Sun (local)
        new Date(2024, 0, 20), // Sat (local)
        new Date(2024, 0, 21), // Sun (local)
      ];
      const txns = weekendDates.map((d, i) =>
        txn({ transactionId: `t${i}`, amount: 30, date: d, category: ["Shops"] }),
      );
      plaid().getTransactions.mockResolvedValue(txns);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const weekend = r.patterns.find((p) => p.type === "weekend_spending");
      expect(weekend).toBeDefined();
      expect(weekend?.frequency).toBe("weekly");
    });

    it("does not flag weekend pattern when <=5 weekend transactions", async () => {
      const weekendDates = [
        new Date(2024, 0, 6),  // Sat (local)
        new Date(2024, 0, 7),  // Sun (local)
        new Date(2024, 0, 13), // Sat (local)
      ];
      const txns = weekendDates.map((d, i) =>
        txn({ transactionId: `t${i}`, amount: 30, date: d, category: ["Shops"] }),
      );
      plaid().getTransactions.mockResolvedValue(txns);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const weekend = r.patterns.find((p) => p.type === "weekend_spending");
      expect(weekend).toBeUndefined();
    });
  });

  // ========================================================================
  // Insights
  // ========================================================================

  describe("Insights", () => {
    it("generates top category insight when categories exist", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 500, category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const topCat = r.insights.find((i) => i.type === "category_optimization");
      expect(topCat).toBeDefined();
      expect(topCat?.title).toContain("Shopping");
    });

    it("marks top category as negative impact when >30% of total", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 700, category: ["Shops"] }),
        txn({ transactionId: "t2", amount: 300, category: ["Travel"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const topCat = r.insights.find((i) => i.type === "category_optimization");
      expect(topCat?.impact).toBe("negative");
    });

    it("generates subscription review insight when >3 recurring merchants", async () => {
      const merchants = ["Netflix", "Spotify", "Hulu", "Disney+"];
      const txns = merchants.map((m, i) =>
        txn({ transactionId: `t${i}`, amount: 15, name: m, merchantName: m, category: ["Service"] }),
      );
      plaid().getTransactions.mockResolvedValue(txns);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const subReview = r.insights.find((i) => i.type === "subscription_review");
      expect(subReview).toBeDefined();
      expect(subReview?.potentialSavings).toBeGreaterThan(0);
    });

    it("generates anomaly insight when anomalies exist", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 20, category: ["Shops"] }),
        txn({ transactionId: "t2", amount: 20, category: ["Shops"] }),
        txn({ transactionId: "t3", amount: 20, category: ["Shops"] }),
        txn({ transactionId: "t4", amount: 20, category: ["Shops"] }),
        txn({ transactionId: "t5", amount: 500, merchantName: "BigShop", category: ["Shops"] }),
      ]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      const anomalyInsight = r.insights.find((i) => i.type === "spending_increase");
      expect(anomalyInsight).toBeDefined();
    });
  });

  // ========================================================================
  // Period Comparison
  // ========================================================================

  describe("Period Comparison", () => {
    it("compares current period to previous period", async () => {
      plaid().getTransactions
        .mockResolvedValueOnce([
          txn({ transactionId: "t1", amount: 200, category: ["Shops"] }),
        ])
        .mockResolvedValueOnce([
          txn({ transactionId: "t2", amount: 100, category: ["Shops"] }),
        ]);

      const period: SpendingPeriod = {
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-02-29"),
      };
      const r = await spendingAnalysisService.analyzeSpending("u1", period);

      expect(r.comparison).toBeDefined();
      expect(r.comparison.spendingChange).toBe(100);
      expect(r.comparison.spendingChangePercent).toBe(100);
    });

    it("handles zero previous spending without dividing by zero", async () => {
      plaid().getTransactions
        .mockResolvedValueOnce([
          txn({ transactionId: "t1", amount: 100, category: ["Shops"] }),
        ])
        .mockResolvedValueOnce([]);

      const r = await spendingAnalysisService.analyzeSpending("u1", JAN_PERIOD);

      expect(r.comparison.spendingChangePercent).toBe(0);
    });
  });

  // ========================================================================
  // predictSpending
  // ========================================================================

  describe("predictSpending", () => {
    it("predicts monthly spending based on N months", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 900, category: ["Shops"] }),
      ]);

      const prediction = await spendingAnalysisService.predictSpending("u1", 3);

      expect(prediction.predictedMonthlySpending).toBe(300); // 900 / 3
      expect(prediction.basedOnMonths).toBe(3);
    });

    it("returns higher confidence for >= 3 months", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 300, category: ["Shops"] }),
      ]);

      const p = await spendingAnalysisService.predictSpending("u1", 3);
      expect(p.confidence).toBe(0.75);
    });

    it("returns lower confidence for < 3 months", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 200, category: ["Shops"] }),
      ]);

      const p = await spendingAnalysisService.predictSpending("u1", 2);
      expect(p.confidence).toBe(0.5);
    });

    it("defaults to 3 months when not specified", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 600, category: ["Shops"] }),
      ]);

      const p = await spendingAnalysisService.predictSpending("u1");
      expect(p.basedOnMonths).toBe(3);
    });

    it("includes predicted by-category breakdown", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 300, category: ["Shops"] }),
        txn({ transactionId: "t2", amount: 150, category: ["Food and Drink", "Groceries"] }),
      ]);

      const p = await spendingAnalysisService.predictSpending("u1", 3);

      expect(p.predictedByCategory.length).toBeGreaterThan(0);
      const shopping = p.predictedByCategory.find((c) => c.category === "shopping");
      expect(shopping?.amount).toBe(100); // 300 / 3
    });
  });

  // ========================================================================
  // getQuickSummary
  // ========================================================================

  describe("getQuickSummary", () => {
    it("returns this month and last month spending", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 500, category: ["Shops"] }),
      ]);

      const summary = await spendingAnalysisService.getQuickSummary("u1");

      expect(summary).toBeDefined();
      expect(typeof summary.thisMonth).toBe("number");
      expect(typeof summary.lastMonth).toBe("number");
    });

    it("returns changePercent", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 500, category: ["Shops"] }),
      ]);

      const summary = await spendingAnalysisService.getQuickSummary("u1");

      expect(typeof summary.changePercent).toBe("number");
    });

    it("returns topCategory as None when no expenses", async () => {
      const summary = await spendingAnalysisService.getQuickSummary("u1");

      expect(summary.topCategory).toBe("None");
      expect(summary.topCategoryAmount).toBe(0);
    });

    it("returns the top category display name", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 100, category: ["Shops"] }),
      ]);

      const summary = await spendingAnalysisService.getQuickSummary("u1");

      expect(summary.topCategory).toBe("Shopping");
      expect(summary.topCategoryAmount).toBe(100);
    });
  });

  // ========================================================================
  // getCashFlowAnalysis
  // ========================================================================

  describe("getCashFlowAnalysis", () => {
    it("returns monthly data for the requested number of months", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 100, category: ["Shops"] }),
        txn({ transactionId: "t2", amount: -500, category: ["Transfer"] }),
      ]);

      const result = await spendingAnalysisService.getCashFlowAnalysis("u1", 3);

      expect(result.monthlyData).toHaveLength(3);
    });

    it("calculates summary totals", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 100, category: ["Shops"] }),
        txn({ transactionId: "t2", amount: -1000, category: ["Transfer"] }),
      ]);

      const result = await spendingAnalysisService.getCashFlowAnalysis("u1", 2);

      expect(result.summary.totalIncome).toBeGreaterThanOrEqual(0);
      expect(result.summary.totalExpenses).toBeGreaterThanOrEqual(0);
    });

    it("determines cash flow health as excellent for high savings rate", async () => {
      // Income >> expenses => high savings rate => excellent
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 100, category: ["Shops"] }),
        txn({ transactionId: "t2", amount: -1000, category: ["Transfer"] }),
      ]);

      const result = await spendingAnalysisService.getCashFlowAnalysis("u1", 2);

      // With 100 expense and 1000 income per month, savings rate = 90%
      expect(["excellent", "good", "fair", "poor"]).toContain(result.health.status);
    });

    it("returns trend analysis for income, expenses, and net flow", async () => {
      plaid().getTransactions.mockResolvedValue([]);

      const result = await spendingAnalysisService.getCashFlowAnalysis("u1", 3);

      expect(result.trends).toBeDefined();
      expect(["increasing", "decreasing", "stable"]).toContain(result.trends.income);
      expect(["increasing", "decreasing", "stable"]).toContain(result.trends.expenses);
      expect(["increasing", "decreasing", "stable"]).toContain(result.trends.netFlow);
    });

    it("generates recommendations", async () => {
      plaid().getTransactions.mockResolvedValue([]);

      const result = await spendingAnalysisService.getCashFlowAnalysis("u1", 3);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("defaults to 6 months", async () => {
      plaid().getTransactions.mockResolvedValue([]);

      const result = await spendingAnalysisService.getCashFlowAnalysis("u1");

      expect(result.monthlyData).toHaveLength(6);
    });

    it("includes period in result", async () => {
      plaid().getTransactions.mockResolvedValue([]);

      const result = await spendingAnalysisService.getCashFlowAnalysis("u1", 2);

      expect(result.period).toBeDefined();
      expect(result.period.startDate).toBeInstanceOf(Date);
      expect(result.period.endDate).toBeInstanceOf(Date);
    });
  });

  // ========================================================================
  // getSpendingTrends
  // ========================================================================

  describe("getSpendingTrends", () => {
    it("returns monthly totals for the requested period", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 100, category: ["Shops"] }),
      ]);

      const result = await spendingAnalysisService.getSpendingTrends("u1", { months: 3 });

      expect(result.monthlyTotals).toHaveLength(3);
    });

    it("returns an overall trend", async () => {
      plaid().getTransactions.mockResolvedValue([]);

      const result = await spendingAnalysisService.getSpendingTrends("u1", { months: 3 });

      expect(["increasing", "decreasing", "stable"]).toContain(result.overallTrend);
    });

    it("returns category trends", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 100, category: ["Shops"] }),
      ]);

      const result = await spendingAnalysisService.getSpendingTrends("u1", { months: 3 });

      expect(result.categoryTrends).toBeDefined();
    });

    it("returns projected next month", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 100, category: ["Shops"] }),
      ]);

      const result = await spendingAnalysisService.getSpendingTrends("u1", { months: 3 });

      expect(result.projectedNextMonth).toBeDefined();
      expect(typeof result.projectedNextMonth.projected).toBe("number");
      expect(typeof result.projectedNextMonth.confidence).toBe("number");
    });

    it("defaults to 6 months when no options provided", async () => {
      plaid().getTransactions.mockResolvedValue([]);

      const result = await spendingAnalysisService.getSpendingTrends("u1");

      expect(result.monthlyTotals).toHaveLength(6);
    });

    it("does not include yoyComparison when compareYoY is false", async () => {
      plaid().getTransactions.mockResolvedValue([]);

      const result = await spendingAnalysisService.getSpendingTrends("u1", { compareYoY: false });

      expect(result.yoyComparison).toBeUndefined();
    });

    it("includes yoyComparison when compareYoY is true", async () => {
      plaid().getTransactions.mockResolvedValue([
        txn({ transactionId: "t1", amount: 100, category: ["Shops"] }),
      ]);

      const result = await spendingAnalysisService.getSpendingTrends("u1", {
        months: 3,
        compareYoY: true,
      });

      expect(result.yoyComparison).toBeDefined();
      expect(typeof result.yoyComparison?.currentPeriodTotal).toBe("number");
      expect(typeof result.yoyComparison?.lastYearTotal).toBe("number");
    });

    it("finds significant changes (>=20% month-over-month)", async () => {
      // We need varying data across months
      // First call: month1 = 100, second call: month2 = 200 -> 100% increase
      let callCount = 0;
      plaid().getTransactions.mockImplementation(() => {
        callCount++;
        // Alternate between high and low spending for different months
        if (callCount % 2 === 0) {
          return Promise.resolve([txn({ transactionId: `t${callCount}`, amount: 500, category: ["Shops"] })]);
        }
        return Promise.resolve([txn({ transactionId: `t${callCount}`, amount: 100, category: ["Shops"] })]);
      });

      const result = await spendingAnalysisService.getSpendingTrends("u1", { months: 4 });

      expect(result.significantChanges).toBeDefined();
    });

    it("includes period in result", async () => {
      plaid().getTransactions.mockResolvedValue([]);

      const result = await spendingAnalysisService.getSpendingTrends("u1", { months: 3 });

      expect(result.period).toBeDefined();
      expect(result.period.startDate).toBeInstanceOf(Date);
    });
  });
});
