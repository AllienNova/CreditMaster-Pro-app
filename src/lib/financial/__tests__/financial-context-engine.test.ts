/**
 * Financial Context Engine Tests
 *
 * Tests for the FinancialContextEngine class.
 * Note: Integration tests require database connection.
 * These are unit tests for the class structure and exports.
 */

import {
  FinancialContextEngine,
  financialContextEngine,
} from "../financial-context-engine";
import {
  DEFAULT_CONTEXT_OPTIONS,
  FinancialContextOptions,
} from "../types/financial-context.types";

describe("FinancialContextEngine", () => {
  describe("exports", () => {
    it("should export FinancialContextEngine class", () => {
      expect(FinancialContextEngine).toBeDefined();
      expect(typeof FinancialContextEngine).toBe("function");
    });

    it("should export financialContextEngine singleton", () => {
      expect(financialContextEngine).toBeDefined();
      expect(financialContextEngine).toBeInstanceOf(FinancialContextEngine);
    });
  });

  describe("class methods", () => {
    it("should have getFinancialContext method", () => {
      expect(typeof financialContextEngine.getFinancialContext).toBe(
        "function",
      );
    });

    it("should have getEnhancedFinancialContext method", () => {
      expect(typeof financialContextEngine.getEnhancedFinancialContext).toBe(
        "function",
      );
    });

    it("should have getFinancialSummary method", () => {
      expect(typeof financialContextEngine.getFinancialSummary).toBe(
        "function",
      );
    });

    it("should have getRecurringBills method", () => {
      expect(typeof financialContextEngine.getRecurringBills).toBe("function");
    });

    it("should have clearCache method", () => {
      expect(typeof financialContextEngine.clearCache).toBe("function");
    });

    it("should have clearAllCaches method", () => {
      expect(typeof financialContextEngine.clearAllCaches).toBe("function");
    });

    it("should have getCacheStats method", () => {
      expect(typeof financialContextEngine.getCacheStats).toBe("function");
    });
  });

  describe("clearCache", () => {
    it("should not throw when clearing cache for non-existent user", () => {
      expect(() => {
        financialContextEngine.clearCache("non-existent-user");
      }).not.toThrow();
    });
  });

  describe("clearAllCaches", () => {
    it("should not throw when clearing all caches", () => {
      expect(() => {
        financialContextEngine.clearAllCaches();
      }).not.toThrow();
    });
  });

  describe("getCacheStats", () => {
    beforeEach(() => {
      financialContextEngine.clearAllCaches();
    });

    it("should return cache statistics", () => {
      const stats = financialContextEngine.getCacheStats();
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("entries");
      expect(typeof stats.size).toBe("number");
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it("should return empty cache after clearAllCaches", () => {
      financialContextEngine.clearAllCaches();
      const stats = financialContextEngine.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toHaveLength(0);
    });
  });

  describe("DEFAULT_CONTEXT_OPTIONS", () => {
    it("should have all required default options", () => {
      expect(DEFAULT_CONTEXT_OPTIONS).toBeDefined();
      expect(DEFAULT_CONTEXT_OPTIONS.includeTransactions).toBe(true);
      expect(DEFAULT_CONTEXT_OPTIONS.includeInvestments).toBe(true);
      expect(DEFAULT_CONTEXT_OPTIONS.includeCreditProfile).toBe(true);
      expect(DEFAULT_CONTEXT_OPTIONS.includeInsights).toBe(true);
      expect(DEFAULT_CONTEXT_OPTIONS.includeRecommendations).toBe(true);
      expect(DEFAULT_CONTEXT_OPTIONS.includeBills).toBe(true);
      expect(DEFAULT_CONTEXT_OPTIONS.transactionDays).toBe(30);
      expect(DEFAULT_CONTEXT_OPTIONS.forceRefresh).toBe(false);
    });
  });

  describe("FinancialContextOptions type", () => {
    it("should allow partial options", () => {
      const partialOptions: FinancialContextOptions = {
        forceRefresh: true,
      };
      expect(partialOptions.forceRefresh).toBe(true);
      expect(partialOptions.includeTransactions).toBeUndefined();
    });

    it("should allow all options", () => {
      const fullOptions: FinancialContextOptions = {
        includeTransactions: false,
        includeInvestments: false,
        includeCreditProfile: false,
        includeInsights: false,
        includeRecommendations: false,
        includeBills: false,
        transactionDays: 60,
        forceRefresh: true,
      };
      expect(fullOptions.includeTransactions).toBe(false);
      expect(fullOptions.transactionDays).toBe(60);
    });
  });
});
