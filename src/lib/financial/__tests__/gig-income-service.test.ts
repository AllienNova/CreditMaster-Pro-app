/**
 * @jest-environment node
 */

/**
 * Gig Economy Income Tracking Service Unit Tests
 *
 * Tests for platform detection, income CRUD, deduction CRUD, tax estimation,
 * quarterly reports, income trend analysis, and multi-platform aggregation.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/server", () => {
  const _admin = {
    from: jest.fn(),
  };
  return { supabaseAdmin: _admin };
});

function sb() {
  return require("@/lib/supabase/server").supabaseAdmin;
}

// Self-referencing chain mock
function chainMock(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "is",
    "in",
    "order",
    "limit",
    "gte",
    "lte",
  ];
  for (const m of methods) {
    obj[m] = jest.fn().mockReturnValue(obj);
  }
  obj.single = jest.fn().mockResolvedValue(result);
  obj.then = (
    resolve: (v: unknown) => void,
    reject: (e: unknown) => void,
  ) => Promise.resolve(result).then(resolve, reject);
  return obj;
}

function mockFrom(result: { data: unknown; error: unknown }) {
  const mock = chainMock(result);
  sb().from.mockReturnValue(mock);
  return mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function platformRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "plat-1",
    user_id: "user-1",
    name: "Uber",
    category: "rideshare",
    connected: true,
    ...overrides,
  };
}

function incomeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "gi-1",
    user_id: "user-1",
    platform_id: "plat-1",
    amount: 150,
    date: "2026-01-15",
    type: "payment",
    description: "Airport ride",
    ...overrides,
  };
}

function deductionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ded-1",
    user_id: "user-1",
    category: "mileage",
    amount: 50,
    date: "2026-01-15",
    description: "50 miles for deliveries",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import SUT
// ---------------------------------------------------------------------------

import { gigIncomeService } from "../gig-income-service";

describe("GigIncomeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // detectPlatformCategory
  // =========================================================================
  describe("detectPlatformCategory", () => {
    it("should detect Uber as rideshare", () => {
      expect(gigIncomeService.detectPlatformCategory("Uber")).toBe("rideshare");
    });

    it("should detect Lyft as rideshare", () => {
      expect(gigIncomeService.detectPlatformCategory("Lyft")).toBe("rideshare");
    });

    it("should detect DoorDash as delivery", () => {
      expect(gigIncomeService.detectPlatformCategory("DoorDash")).toBe("delivery");
    });

    it("should detect Instacart as delivery", () => {
      expect(gigIncomeService.detectPlatformCategory("Instacart")).toBe("delivery");
    });

    it("should detect Fiverr as freelance", () => {
      expect(gigIncomeService.detectPlatformCategory("Fiverr")).toBe("freelance");
    });

    it("should detect Upwork as freelance", () => {
      expect(gigIncomeService.detectPlatformCategory("Upwork")).toBe("freelance");
    });

    it("should detect Etsy as marketplace", () => {
      expect(gigIncomeService.detectPlatformCategory("Etsy")).toBe("marketplace");
    });

    it("should detect TaskRabbit as other", () => {
      expect(gigIncomeService.detectPlatformCategory("TaskRabbit")).toBe("other");
    });

    it("should return 'other' for unknown platforms", () => {
      expect(gigIncomeService.detectPlatformCategory("RandomPlatform")).toBe("other");
    });

    it("should be case-insensitive", () => {
      expect(gigIncomeService.detectPlatformCategory("UBER")).toBe("rideshare");
      expect(gigIncomeService.detectPlatformCategory("doordash")).toBe("delivery");
    });

    it("should handle platform names with special characters", () => {
      expect(gigIncomeService.detectPlatformCategory("Uber Eats")).toBe("delivery");
    });

    it("should detect GrubHub as delivery", () => {
      expect(gigIncomeService.detectPlatformCategory("GrubHub")).toBe("delivery");
    });

    it("should detect eBay as marketplace", () => {
      expect(gigIncomeService.detectPlatformCategory("eBay")).toBe("marketplace");
    });
  });

  // =========================================================================
  // getPlatforms
  // =========================================================================
  describe("getPlatforms", () => {
    it("should return mapped gig platforms", async () => {
      const rows = [
        platformRow(),
        platformRow({ id: "plat-2", name: "DoorDash", category: "delivery" }),
      ];
      mockFrom({ data: rows, error: null });

      const result = await gigIncomeService.getPlatforms("user-1");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("plat-1");
      expect(result[0].name).toBe("Uber");
      expect(result[0].category).toBe("rideshare");
      expect(result[0].connected).toBe(true);
    });

    it("should return empty array when no platforms", async () => {
      mockFrom({ data: null, error: null });
      const result = await gigIncomeService.getPlatforms("user-1");
      expect(result).toEqual([]);
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "db error" } });
      await expect(gigIncomeService.getPlatforms("user-1")).rejects.toThrow(
        "Failed to fetch gig platforms",
      );
    });
  });

  // =========================================================================
  // addPlatform
  // =========================================================================
  describe("addPlatform", () => {
    it("should add a platform with auto-detected category", async () => {
      mockFrom({ data: platformRow(), error: null });

      const result = await gigIncomeService.addPlatform("user-1", "Uber");
      expect(result.name).toBe("Uber");
      expect(result.category).toBe("rideshare");
      expect(sb().from).toHaveBeenCalledWith("gig_platforms");
    });

    it("should add a platform with explicit category", async () => {
      mockFrom({
        data: platformRow({ name: "CustomApp", category: "freelance" }),
        error: null,
      });

      const result = await gigIncomeService.addPlatform("user-1", "CustomApp", "freelance");
      expect(result.category).toBe("freelance");
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "insert fail" } });
      await expect(gigIncomeService.addPlatform("user-1", "Uber")).rejects.toThrow(
        "Failed to add gig platform",
      );
    });
  });

  // =========================================================================
  // getIncome
  // =========================================================================
  describe("getIncome", () => {
    it("should return mapped income entries", async () => {
      const rows = [incomeRow(), incomeRow({ id: "gi-2", amount: 75 })];
      mockFrom({ data: rows, error: null });

      const result = await gigIncomeService.getIncome("user-1");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("gi-1");
      expect(result[0].amount).toBe(150);
      expect(result[0].type).toBe("payment");
    });

    it("should return empty array when no income", async () => {
      mockFrom({ data: null, error: null });
      const result = await gigIncomeService.getIncome("user-1");
      expect(result).toEqual([]);
    });

    it("should apply platform filter", async () => {
      const mock = mockFrom({ data: [incomeRow()], error: null });
      await gigIncomeService.getIncome("user-1", { platformId: "plat-1" });
      expect(mock.eq).toHaveBeenCalledWith("platform_id", "plat-1");
    });

    it("should apply date range filters", async () => {
      const mock = mockFrom({ data: [incomeRow()], error: null });
      await gigIncomeService.getIncome("user-1", {
        startDate: "2026-01-01",
        endDate: "2026-03-31",
      });
      expect(mock.gte).toHaveBeenCalledWith("date", "2026-01-01");
      expect(mock.lte).toHaveBeenCalledWith("date", "2026-03-31");
    });

    it("should apply type filter", async () => {
      const mock = mockFrom({ data: [incomeRow({ type: "tip" })], error: null });
      await gigIncomeService.getIncome("user-1", { type: "tip" });
      expect(mock.eq).toHaveBeenCalledWith("type", "tip");
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "db error" } });
      await expect(gigIncomeService.getIncome("user-1")).rejects.toThrow(
        "Failed to fetch gig income",
      );
    });
  });

  // =========================================================================
  // addIncome
  // =========================================================================
  describe("addIncome", () => {
    it("should add an income entry", async () => {
      mockFrom({ data: incomeRow(), error: null });

      const result = await gigIncomeService.addIncome("user-1", {
        platformId: "plat-1",
        amount: 150,
        date: "2026-01-15",
        type: "payment",
        description: "Airport ride",
      });

      expect(result.id).toBe("gi-1");
      expect(result.amount).toBe(150);
      expect(sb().from).toHaveBeenCalledWith("gig_income");
    });

    it("should add a tip entry", async () => {
      mockFrom({ data: incomeRow({ type: "tip", amount: 20 }), error: null });

      const result = await gigIncomeService.addIncome("user-1", {
        platformId: "plat-1",
        amount: 20,
        date: "2026-01-15",
        type: "tip",
      });

      expect(result.type).toBe("tip");
      expect(result.amount).toBe(20);
    });

    it("should allow negative amounts for refunds", async () => {
      mockFrom({ data: incomeRow({ type: "refund", amount: -30 }), error: null });

      const result = await gigIncomeService.addIncome("user-1", {
        platformId: "plat-1",
        amount: -30,
        date: "2026-01-15",
        type: "refund",
      });

      expect(result.type).toBe("refund");
      expect(result.amount).toBe(-30);
    });

    it("should reject negative amounts for non-refund types", async () => {
      await expect(
        gigIncomeService.addIncome("user-1", {
          platformId: "plat-1",
          amount: -50,
          date: "2026-01-15",
          type: "payment",
        }),
      ).rejects.toThrow("Negative amounts are only allowed for refunds");
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "insert fail" } });
      await expect(
        gigIncomeService.addIncome("user-1", {
          platformId: "plat-1",
          amount: 100,
          date: "2026-01-15",
          type: "payment",
        }),
      ).rejects.toThrow("Failed to add gig income");
    });
  });

  // =========================================================================
  // deleteIncome
  // =========================================================================
  describe("deleteIncome", () => {
    it("should delete an income entry", async () => {
      const mock = chainMock({ data: null, error: null });
      mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: null }).then(r, j);
      sb().from.mockReturnValue(mock);

      await gigIncomeService.deleteIncome("user-1", "gi-1");
      expect(sb().from).toHaveBeenCalledWith("gig_income");
      expect(mock.delete).toHaveBeenCalled();
    });

    it("should throw on Supabase error", async () => {
      const mock = chainMock({ data: null, error: { message: "delete fail" } });
      mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: { message: "delete fail" } }).then(r, j);
      sb().from.mockReturnValue(mock);

      await expect(
        gigIncomeService.deleteIncome("user-1", "gi-1"),
      ).rejects.toThrow("Failed to delete gig income");
    });
  });

  // =========================================================================
  // getDeductions
  // =========================================================================
  describe("getDeductions", () => {
    it("should return mapped deductions", async () => {
      const rows = [deductionRow(), deductionRow({ id: "ded-2", category: "phone" })];
      mockFrom({ data: rows, error: null });

      const result = await gigIncomeService.getDeductions("user-1");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("ded-1");
      expect(result[0].category).toBe("mileage");
    });

    it("should return empty array when no deductions", async () => {
      mockFrom({ data: null, error: null });
      const result = await gigIncomeService.getDeductions("user-1");
      expect(result).toEqual([]);
    });

    it("should apply date range filters", async () => {
      const mock = mockFrom({ data: [], error: null });
      await gigIncomeService.getDeductions("user-1", "2026-01-01", "2026-03-31");
      expect(mock.gte).toHaveBeenCalledWith("date", "2026-01-01");
      expect(mock.lte).toHaveBeenCalledWith("date", "2026-03-31");
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "db error" } });
      await expect(gigIncomeService.getDeductions("user-1")).rejects.toThrow(
        "Failed to fetch gig deductions",
      );
    });
  });

  // =========================================================================
  // addDeduction
  // =========================================================================
  describe("addDeduction", () => {
    it("should add a deduction entry", async () => {
      mockFrom({ data: deductionRow(), error: null });

      const result = await gigIncomeService.addDeduction("user-1", {
        category: "mileage",
        amount: 50,
        date: "2026-01-15",
        description: "50 miles for deliveries",
      });

      expect(result.id).toBe("ded-1");
      expect(result.amount).toBe(50);
      expect(sb().from).toHaveBeenCalledWith("gig_deductions");
    });

    it("should reject zero amount", async () => {
      await expect(
        gigIncomeService.addDeduction("user-1", {
          category: "mileage",
          amount: 0,
          date: "2026-01-15",
          description: "Zero amount",
        }),
      ).rejects.toThrow("Deduction amount must be positive");
    });

    it("should reject negative amount", async () => {
      await expect(
        gigIncomeService.addDeduction("user-1", {
          category: "mileage",
          amount: -10,
          date: "2026-01-15",
          description: "Negative amount",
        }),
      ).rejects.toThrow("Deduction amount must be positive");
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "insert fail" } });
      await expect(
        gigIncomeService.addDeduction("user-1", {
          category: "equipment",
          amount: 200,
          date: "2026-01-15",
          description: "Phone mount",
        }),
      ).rejects.toThrow("Failed to add gig deduction");
    });
  });

  // =========================================================================
  // deleteDeduction
  // =========================================================================
  describe("deleteDeduction", () => {
    it("should delete a deduction entry", async () => {
      const mock = chainMock({ data: null, error: null });
      mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: null }).then(r, j);
      sb().from.mockReturnValue(mock);

      await gigIncomeService.deleteDeduction("user-1", "ded-1");
      expect(sb().from).toHaveBeenCalledWith("gig_deductions");
      expect(mock.delete).toHaveBeenCalled();
    });

    it("should throw on Supabase error", async () => {
      const mock = chainMock({ data: null, error: { message: "delete fail" } });
      mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: { message: "delete fail" } }).then(r, j);
      sb().from.mockReturnValue(mock);

      await expect(
        gigIncomeService.deleteDeduction("user-1", "ded-1"),
      ).rejects.toThrow("Failed to delete gig deduction");
    });
  });

  // =========================================================================
  // estimateSETax
  // =========================================================================
  describe("estimateSETax", () => {
    it("should calculate SE tax correctly", () => {
      // SE tax = netIncome * 0.9235 * 0.153
      const tax = gigIncomeService.estimateSETax(50000);
      // 50000 * 0.9235 * 0.153 = 7064.78 (rounded)
      expect(tax).toBeCloseTo(7064.78, 1);
    });

    it("should return 0 for zero income", () => {
      expect(gigIncomeService.estimateSETax(0)).toBe(0);
    });

    it("should return 0 for negative income", () => {
      expect(gigIncomeService.estimateSETax(-5000)).toBe(0);
    });

    it("should handle small income amounts", () => {
      const tax = gigIncomeService.estimateSETax(100);
      // 100 * 0.9235 * 0.153 = 14.13
      expect(tax).toBeCloseTo(14.13, 1);
    });
  });

  // =========================================================================
  // estimateIncomeTax
  // =========================================================================
  describe("estimateIncomeTax", () => {
    it("should calculate income tax for moderate income", () => {
      const tax = gigIncomeService.estimateIncomeTax(50000);
      // After standard deduction and SE tax deduction, taxable income is lower
      expect(tax).toBeGreaterThan(0);
      expect(tax).toBeLessThan(50000 * 0.37); // Less than max bracket
    });

    it("should return 0 for zero income", () => {
      expect(gigIncomeService.estimateIncomeTax(0)).toBe(0);
    });

    it("should return 0 for negative income", () => {
      expect(gigIncomeService.estimateIncomeTax(-5000)).toBe(0);
    });

    it("should return 0 when income is below standard deduction", () => {
      // With standard deduction of $14,600 + SE deduction, low income = $0 tax
      expect(gigIncomeService.estimateIncomeTax(10000)).toBe(0);
    });

    it("should increase with higher income", () => {
      const tax30k = gigIncomeService.estimateIncomeTax(30000);
      const tax100k = gigIncomeService.estimateIncomeTax(100000);
      expect(tax100k).toBeGreaterThan(tax30k);
    });

    it("should handle very high income", () => {
      const tax = gigIncomeService.estimateIncomeTax(1000000);
      expect(tax).toBeGreaterThan(0);
      // At $1M, effective rate should be significant
      expect(tax).toBeGreaterThan(100000);
    });
  });

  // =========================================================================
  // generateQuarterlyReport
  // =========================================================================
  describe("generateQuarterlyReport", () => {
    it("should generate a quarterly report", async () => {
      let callCount = 0;
      sb().from.mockImplementation((table: string) => {
        callCount++;
        if (table === "gig_income") {
          return chainMock({
            data: [
              incomeRow({ amount: 1000, type: "payment" }),
              incomeRow({ id: "gi-2", amount: 500, type: "tip" }),
            ],
            error: null,
          });
        }
        if (table === "gig_deductions") {
          return chainMock({
            data: [deductionRow({ amount: 200 })],
            error: null,
          });
        }
        if (table === "gig_platforms") {
          return chainMock({
            data: [platformRow()],
            error: null,
          });
        }
        return chainMock({ data: [], error: null });
      });

      const report = await gigIncomeService.generateQuarterlyReport("user-1", 2026, 1);

      expect(report.quarter).toBe("2026-Q1");
      expect(report.totalIncome).toBe(1500);
      expect(report.totalDeductions).toBe(200);
      expect(report.netIncome).toBe(1300);
      expect(report.estimatedSETax).toBeGreaterThan(0);
      expect(report.estimatedIncomeTax).toBeGreaterThanOrEqual(0);
      expect(report.totalEstimatedTax).toBe(
        Math.round((report.estimatedSETax + report.estimatedIncomeTax) * 100) / 100,
      );
      expect(report.platformBreakdown).toHaveLength(1);
    });

    it("should handle refunds in quarterly report", async () => {
      sb().from.mockImplementation((table: string) => {
        if (table === "gig_income") {
          return chainMock({
            data: [
              incomeRow({ amount: 1000, type: "payment" }),
              incomeRow({ id: "gi-2", amount: 200, type: "refund" }),
            ],
            error: null,
          });
        }
        if (table === "gig_deductions") {
          return chainMock({ data: [], error: null });
        }
        if (table === "gig_platforms") {
          return chainMock({ data: [platformRow()], error: null });
        }
        return chainMock({ data: [], error: null });
      });

      const report = await gigIncomeService.generateQuarterlyReport("user-1", 2026, 1);
      expect(report.totalIncome).toBe(800); // 1000 - 200 refund
    });

    it("should throw for invalid quarter", async () => {
      await expect(
        gigIncomeService.generateQuarterlyReport("user-1", 2026, 0),
      ).rejects.toThrow("Quarter must be between 1 and 4");

      await expect(
        gigIncomeService.generateQuarterlyReport("user-1", 2026, 5),
      ).rejects.toThrow("Quarter must be between 1 and 4");
    });

    it("should generate report with no income", async () => {
      sb().from.mockImplementation(() => {
        return chainMock({ data: [], error: null });
      });

      const report = await gigIncomeService.generateQuarterlyReport("user-1", 2026, 1);
      expect(report.totalIncome).toBe(0);
      expect(report.totalDeductions).toBe(0);
      expect(report.netIncome).toBe(0);
      expect(report.estimatedSETax).toBe(0);
      expect(report.estimatedIncomeTax).toBe(0);
      expect(report.totalEstimatedTax).toBe(0);
      expect(report.platformBreakdown).toEqual([]);
    });

    it("should handle multiple platforms in breakdown", async () => {
      sb().from.mockImplementation((table: string) => {
        if (table === "gig_income") {
          return chainMock({
            data: [
              incomeRow({ platform_id: "plat-1", amount: 500, type: "payment" }),
              incomeRow({ id: "gi-2", platform_id: "plat-2", amount: 300, type: "payment" }),
            ],
            error: null,
          });
        }
        if (table === "gig_deductions") {
          return chainMock({ data: [], error: null });
        }
        if (table === "gig_platforms") {
          return chainMock({
            data: [
              platformRow({ id: "plat-1", name: "Uber" }),
              platformRow({ id: "plat-2", name: "DoorDash" }),
            ],
            error: null,
          });
        }
        return chainMock({ data: [], error: null });
      });

      const report = await gigIncomeService.generateQuarterlyReport("user-1", 2026, 2);
      expect(report.platformBreakdown).toHaveLength(2);
      expect(report.platformBreakdown[0].platform).toBe("Uber");
      expect(report.platformBreakdown[0].amount).toBe(500);
      expect(report.platformBreakdown[1].platform).toBe("DoorDash");
      expect(report.platformBreakdown[1].amount).toBe(300);
    });
  });

  // =========================================================================
  // getQuarterDateRange
  // =========================================================================
  describe("getQuarterDateRange", () => {
    it("should return correct range for Q1", () => {
      const range = gigIncomeService.getQuarterDateRange(2026, 1);
      expect(range.startDate).toBe("2026-01-01");
      expect(range.endDate).toBe("2026-03-31");
    });

    it("should return correct range for Q2", () => {
      const range = gigIncomeService.getQuarterDateRange(2026, 2);
      expect(range.startDate).toBe("2026-04-01");
      expect(range.endDate).toBe("2026-06-30");
    });

    it("should return correct range for Q3", () => {
      const range = gigIncomeService.getQuarterDateRange(2026, 3);
      expect(range.startDate).toBe("2026-07-01");
      expect(range.endDate).toBe("2026-09-30");
    });

    it("should return correct range for Q4", () => {
      const range = gigIncomeService.getQuarterDateRange(2026, 4);
      expect(range.startDate).toBe("2026-10-01");
      expect(range.endDate).toBe("2026-12-31");
    });
  });

  // =========================================================================
  // getIncomeTrends
  // =========================================================================
  describe("getIncomeTrends", () => {
    it("should return monthly income trends", async () => {
      mockFrom({
        data: [
          incomeRow({ date: "2026-01-10", amount: 500, type: "payment" }),
          incomeRow({ id: "gi-2", date: "2026-01-20", amount: 300, type: "payment" }),
          incomeRow({ id: "gi-3", date: "2026-02-10", amount: 600, type: "payment" }),
        ],
        error: null,
      });

      const trends = await gigIncomeService.getIncomeTrends(
        "user-1",
        "monthly",
        "2026-01-01",
        "2026-03-31",
      );

      expect(trends).toHaveLength(2);
      expect(trends[0].period).toBe("2026-01");
      expect(trends[0].totalIncome).toBe(800);
      expect(trends[1].period).toBe("2026-02");
      expect(trends[1].totalIncome).toBe(600);
    });

    it("should return weekly income trends", async () => {
      mockFrom({
        data: [
          incomeRow({ date: "2026-01-06", amount: 200, type: "payment" }),
          incomeRow({ id: "gi-2", date: "2026-01-07", amount: 100, type: "payment" }),
          incomeRow({ id: "gi-3", date: "2026-01-13", amount: 300, type: "payment" }),
        ],
        error: null,
      });

      const trends = await gigIncomeService.getIncomeTrends(
        "user-1",
        "weekly",
        "2026-01-01",
        "2026-01-31",
      );

      expect(trends.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty array for no income", async () => {
      mockFrom({ data: [], error: null });

      const trends = await gigIncomeService.getIncomeTrends(
        "user-1",
        "monthly",
        "2026-01-01",
        "2026-03-31",
      );

      expect(trends).toEqual([]);
    });

    it("should handle refunds in trends", async () => {
      mockFrom({
        data: [
          incomeRow({ date: "2026-01-10", amount: 500, type: "payment" }),
          incomeRow({ id: "gi-2", date: "2026-01-20", amount: 100, type: "refund" }),
        ],
        error: null,
      });

      const trends = await gigIncomeService.getIncomeTrends(
        "user-1",
        "monthly",
        "2026-01-01",
        "2026-01-31",
      );

      expect(trends).toHaveLength(1);
      expect(trends[0].totalIncome).toBe(400); // 500 - 100
    });

    it("should calculate average per platform", async () => {
      mockFrom({
        data: [
          incomeRow({ date: "2026-01-10", amount: 500, type: "payment", platform_id: "plat-1" }),
          incomeRow({ id: "gi-2", date: "2026-01-15", amount: 300, type: "payment", platform_id: "plat-2" }),
        ],
        error: null,
      });

      const trends = await gigIncomeService.getIncomeTrends(
        "user-1",
        "monthly",
        "2026-01-01",
        "2026-01-31",
      );

      expect(trends).toHaveLength(1);
      expect(trends[0].platformCount).toBe(2);
      expect(trends[0].averagePerPlatform).toBe(400); // 800 / 2
    });
  });

  // =========================================================================
  // getAggregatedSummary
  // =========================================================================
  describe("getAggregatedSummary", () => {
    it("should return aggregated income summary", async () => {
      sb().from.mockImplementation((table: string) => {
        if (table === "gig_income") {
          return chainMock({
            data: [
              incomeRow({ amount: 1000, type: "payment" }),
              incomeRow({ id: "gi-2", amount: 200, type: "tip" }),
              incomeRow({ id: "gi-3", amount: 50, type: "bonus" }),
            ],
            error: null,
          });
        }
        if (table === "gig_deductions") {
          return chainMock({
            data: [deductionRow({ amount: 150 })],
            error: null,
          });
        }
        if (table === "gig_platforms") {
          return chainMock({
            data: [platformRow()],
            error: null,
          });
        }
        return chainMock({ data: [], error: null });
      });

      const summary = await gigIncomeService.getAggregatedSummary(
        "user-1",
        "2026-01-01",
        "2026-03-31",
      );

      expect(summary.totalIncome).toBe(1250);
      expect(summary.totalDeductions).toBe(150);
      expect(summary.netIncome).toBe(1100);
      expect(summary.incomeByType.payment).toBe(1000);
      expect(summary.incomeByType.tip).toBe(200);
      expect(summary.incomeByType.bonus).toBe(50);
      expect(summary.incomeByType.refund).toBe(0);
      expect(summary.periodStart).toBe("2026-01-01");
      expect(summary.periodEnd).toBe("2026-03-31");
      expect(summary.platformBreakdown).toHaveLength(1);
    });

    it("should handle empty data", async () => {
      sb().from.mockImplementation(() => {
        return chainMock({ data: [], error: null });
      });

      const summary = await gigIncomeService.getAggregatedSummary(
        "user-1",
        "2026-01-01",
        "2026-03-31",
      );

      expect(summary.totalIncome).toBe(0);
      expect(summary.totalDeductions).toBe(0);
      expect(summary.netIncome).toBe(0);
      expect(summary.platformBreakdown).toEqual([]);
    });

    it("should handle refunds in aggregation", async () => {
      sb().from.mockImplementation((table: string) => {
        if (table === "gig_income") {
          return chainMock({
            data: [
              incomeRow({ amount: 1000, type: "payment" }),
              incomeRow({ id: "gi-2", amount: 100, type: "refund" }),
            ],
            error: null,
          });
        }
        if (table === "gig_deductions") {
          return chainMock({ data: [], error: null });
        }
        if (table === "gig_platforms") {
          return chainMock({ data: [platformRow()], error: null });
        }
        return chainMock({ data: [], error: null });
      });

      const summary = await gigIncomeService.getAggregatedSummary(
        "user-1",
        "2026-01-01",
        "2026-03-31",
      );

      expect(summary.totalIncome).toBe(900); // 1000 - 100
    });
  });

  // =========================================================================
  // calculateMileageDeduction
  // =========================================================================
  describe("calculateMileageDeduction", () => {
    it("should calculate mileage deduction at IRS rate", () => {
      // 100 miles * $0.67/mile = $67
      expect(gigIncomeService.calculateMileageDeduction(100)).toBe(67);
    });

    it("should return 0 for zero miles", () => {
      expect(gigIncomeService.calculateMileageDeduction(0)).toBe(0);
    });

    it("should return 0 for negative miles", () => {
      expect(gigIncomeService.calculateMileageDeduction(-10)).toBe(0);
    });

    it("should handle fractional miles", () => {
      // 50.5 miles * $0.67 = $33.84 (rounded)
      const result = gigIncomeService.calculateMileageDeduction(50.5);
      expect(result).toBeCloseTo(33.84, 1);
    });
  });
});
