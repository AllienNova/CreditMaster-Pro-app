/**
 * Financial Context Engine Tests
 *
 * Tests for the FinancialContextEngine class.
 * Note: Integration tests require database connection.
 * These are unit tests for the class structure and exports.
 */

// Mock Supabase — singleton to ensure source and test share the same object
// (matches budget-service.test.ts's established pattern for this repo).
jest.mock("@/lib/supabase/service-role", () => {
  const _client = { from: jest.fn() };
  return { getServiceRoleClient: () => _client };
});

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

  describe("getFinancialAlerts (financial_alerts table — regression)", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      // jest.config.js sets restoreMocks: true, which fully detaches a
      // jest.spyOn before every test — must be re-created fresh here, not
      // declared once at describe-scope.
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    });

    function getAlerts(userId: string) {
      // getFinancialAlerts is private; the engine under test is the class
      // itself so this exercises the real query-building/mapping logic.
      return (
        financialContextEngine as unknown as {
          getFinancialAlerts: (userId: string) => Promise<unknown[]>;
        }
      ).getFinancialAlerts(userId);
    }

    it("maps a real row into a FinancialAlert without logging an error", async () => {
      const row = {
        id: "alert-1",
        type: "bill_due",
        severity: "warning",
        title: "Rent due soon",
        message: "Your rent is due in 3 days",
        action_required: true,
        action_type: "pay_bill",
        action_data: { billId: "bill-1" },
        dismissed: false,
        expires_at: null,
        created_at: "2026-07-01T00:00:00Z",
      };
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [row], error: null }),
      };
      const supabase = require("@/lib/supabase/service-role").getServiceRoleClient();
      supabase.from.mockReturnValue(chain);

      const alerts = await getAlerts("user-123");

      expect(alerts).toEqual([
        expect.objectContaining({
          id: "alert-1",
          type: "bill_due",
          severity: "warning",
          title: "Rent due soon",
          actionRequired: true,
          actionType: "pay_bill",
        }),
      ]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("returns [] without logging when the user genuinely has no alerts", async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      const supabase = require("@/lib/supabase/service-role").getServiceRoleClient();
      supabase.from.mockReturnValue(chain);

      const alerts = await getAlerts("user-123");

      expect(alerts).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("logs the failure and still returns [] on a query error — a broken read must not read as 'no alerts'", async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "permission denied for table financial_alerts" },
        }),
      };
      const supabase = require("@/lib/supabase/service-role").getServiceRoleClient();
      supabase.from.mockReturnValue(chain);

      const alerts = await getAlerts("user-123");

      expect(alerts).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "getFinancialAlerts failed",
        expect.objectContaining({
          userId: "user-123",
          error: "permission denied for table financial_alerts",
        }),
      );
    });
  });
});
