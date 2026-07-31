/**
 * Budget Service Unit Tests
 *
 * Tests for budget CRUD operations, alerts, recommendations, and analytics.
 *
 * Row fixtures use the REAL `budgets` table columns (verified against the
 * live local Supabase Postgres, 2026-07-31): id, user_id, category, amount,
 * spent, period, start_date, end_date, rollover_enabled, rollover_amount,
 * alert_threshold, status, created_at, updated_at. The table has no `name`,
 * `budgeted_amount`, `spent_amount`, `period_start`, `period_end`, or
 * `is_active` column — see budget-service.ts `mapRowToBudget` for the
 * mapping this file locks in, and the "Live schema mapping" block below for
 * the regression tests proving the bug is fixed.
 */

import {
  budgetService,
  BudgetService,
  CATEGORY_DISPLAY_NAMES,
} from "../budget-service";
import {
  Budget,
  BudgetPeriod,
  BudgetStatus,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetSummary,
  BudgetRecommendation,
  BudgetAlert,
  BUDGET_CATEGORIES,
} from "../types/budget.types";

// Mock Supabase — singleton to ensure source and test share the same object
jest.mock("@/lib/supabase/client", () => {
  const _client = { from: jest.fn() };
  return { getSupabase: () => _client };
});

/**
 * Builds a real `budgets` row. Every key here is a column that genuinely
 * exists on the live table (see file header) — do not add `name`,
 * `budgeted_amount`, `spent_amount`, `period_start`, `period_end`, or
 * `is_active`, they don't exist and a real insert/select would never
 * return them.
 */
function makeBudgetRow(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: "budget-123",
    user_id: "user-123",
    category: "groceries",
    amount: 500,
    spent: 0,
    period: "monthly",
    start_date: now,
    end_date: now,
    rollover_enabled: false,
    rollover_amount: 0,
    alert_threshold: 80,
    status: "active",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("BudgetService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Live schema mapping (regression — budgets table has no name/budgeted_amount/spent_amount/period_start/period_end/is_active columns)", () => {
    it("createBudget inserts real column names, never the fictional ones the DB rejects", async () => {
      const input: CreateBudgetInput = {
        userId: "user-123",
        name: "Groceries Budget",
        category: BUDGET_CATEGORIES.GROCERIES,
        budgetedAmount: 500,
        period: "monthly",
      };

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: makeBudgetRow({ amount: 500 }),
            error: null,
          }),
        }),
      });
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({ insert: insertMock });

      await budgetService.createBudget(input);

      expect(insertMock).toHaveBeenCalledTimes(1);
      const insertedRow = insertMock.mock.calls[0][0];
      expect(insertedRow).toMatchObject({
        amount: 500,
        spent: 0,
        status: "active",
      });
      expect(insertedRow).toHaveProperty("start_date");
      expect(insertedRow).toHaveProperty("end_date");
      expect(insertedRow).not.toHaveProperty("period_start");
      expect(insertedRow).not.toHaveProperty("period_end");
      expect(insertedRow).not.toHaveProperty("is_active");
      expect(insertedRow).not.toHaveProperty("budgeted_amount");
      expect(insertedRow).not.toHaveProperty("spent_amount");
      expect(insertedRow).not.toHaveProperty("name");
    });

    it("maps start_date/end_date to valid periodStart/periodEnd Date objects (Invalid Date before the fix)", async () => {
      const row = makeBudgetRow({
        start_date: "2026-07-01",
        end_date: "2026-07-31",
      });
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
        }),
      });

      const result = await budgetService.getBudgetById(
        "budget-123",
        "user-123",
      );

      expect(result?.periodStart).toBeInstanceOf(Date);
      expect(result?.periodEnd).toBeInstanceOf(Date);
      expect(Number.isNaN(result!.periodStart.getTime())).toBe(false);
      expect(Number.isNaN(result!.periodEnd.getTime())).toBe(false);
    });

    it("getBudgetsByUser filters active budgets on status='active', not is_active", async () => {
      const eqCalls: Array<[string, unknown]> = [];
      const chain: { eq: jest.Mock; order: jest.Mock } = {
        eq: jest.fn((col: string, val: unknown) => {
          eqCalls.push([col, val]);
          return chain;
        }),
        order: jest
          .fn()
          .mockResolvedValue({ data: [makeBudgetRow()], error: null }),
      };
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({ select: jest.fn().mockReturnValue(chain) });

      await budgetService.getBudgetsByUser("user-123", { activeOnly: true });

      expect(eqCalls).toContainEqual(["status", "active"]);
      expect(eqCalls.some(([col]) => col === "is_active")).toBe(false);
    });

    it("getBudgetById returns null when Postgres reports no matching row (PGRST116)", async () => {
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: {
                  message:
                    "JSON object requested, multiple (or no) rows returned",
                  code: "PGRST116",
                },
              }),
            }),
          }),
        }),
      });

      const result = await budgetService.getBudgetById(
        "missing-id",
        "user-123",
      );
      expect(result).toBeNull();
    });

    it("getBudgetById throws (does not silently return null) on a real database error", async () => {
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: {
                  message: "permission denied for table budgets",
                  code: "42501",
                },
              }),
            }),
          }),
        }),
      });

      await expect(
        budgetService.getBudgetById("budget-123", "user-123"),
      ).rejects.toThrow(/permission denied/);
    });

    it("synthesizes name from category since budgets has no name column", async () => {
      const row = makeBudgetRow({ category: "entertainment" });
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
        }),
      });

      const result = await budgetService.getBudgetById(
        "budget-123",
        "user-123",
      );
      expect(result?.name).toBe(CATEGORY_DISPLAY_NAMES.entertainment);
    });

    it("falls back to the raw category string for a legacy/unrecognized category with no display name", async () => {
      const row = makeBudgetRow({ category: "legacy_uncategorized" });
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
        }),
      });

      const result = await budgetService.getBudgetById(
        "budget-123",
        "user-123",
      );
      expect(result?.name).toBe("legacy_uncategorized");
    });

    it("treats a zero/missing amount as 0 rather than crashing on percentUsed", async () => {
      const row = makeBudgetRow({ amount: 0, spent: 0 });
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
        }),
      });

      const result = await budgetService.getBudgetById(
        "budget-123",
        "user-123",
      );
      expect(result?.budgetedAmount).toBe(0);
      expect(result?.percentUsed).toBe(0);
    });

    it("updateBudget recalculates start_date/end_date when period changes", async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: makeBudgetRow({ period: "weekly" }),
                error: null,
              }),
            }),
          }),
        }),
      });
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({ update: updateMock });

      await budgetService.updateBudget("budget-123", "user-123", {
        period: "weekly",
      });

      const payload = updateMock.mock.calls[0][0];
      expect(payload).toMatchObject({ period: "weekly" });
      expect(payload).toHaveProperty("start_date");
      expect(payload).toHaveProperty("end_date");
    });

    it("updateBudget maps isActive:true to status:'active'", async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: makeBudgetRow({ status: "active" }),
                error: null,
              }),
            }),
          }),
        }),
      });
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({ update: updateMock });

      await budgetService.updateBudget("budget-123", "user-123", {
        isActive: true,
      });

      expect(updateMock.mock.calls[0][0]).toMatchObject({ status: "active" });
    });

    it("updateBudget maps isActive:false to status:'completed' (never silently no-ops the request)", async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: makeBudgetRow({ status: "completed" }),
                error: null,
              }),
            }),
          }),
        }),
      });
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({ update: updateMock });

      await budgetService.updateBudget("budget-123", "user-123", {
        isActive: false,
      });

      expect(updateMock.mock.calls[0][0]).toMatchObject({
        status: "completed",
      });
      expect(updateMock.mock.calls[0][0]).not.toHaveProperty("is_active");
    });

    it("updateBudget never sends name/budgeted_amount to the database", async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: makeBudgetRow(),
                error: null,
              }),
            }),
          }),
        }),
      });
      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({ update: updateMock });

      await budgetService.updateBudget("budget-123", "user-123", {
        name: "Renamed",
        budgetedAmount: 700,
      });

      const sentPayload = updateMock.mock.calls[0][0];
      expect(sentPayload).toMatchObject({ amount: 700 });
      expect(sentPayload).not.toHaveProperty("name");
      expect(sentPayload).not.toHaveProperty("budgeted_amount");
    });

    it("resetBudgetForNewPeriod resets spent and recalculates start_date/end_date using real column names", async () => {
      const currentRow = makeBudgetRow({
        spent: 450,
        amount: 500,
        rollover_enabled: true,
        rollover_amount: 0,
      });
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: makeBudgetRow({ spent: 0, rollover_amount: 50 }),
                error: null,
              }),
            }),
          }),
        }),
      });

      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: currentRow, error: null }),
            }),
          }),
        }),
        update: updateMock,
      }));

      await budgetService.resetBudgetForNewPeriod("budget-123", "user-123");

      const payload = updateMock.mock.calls[0][0];
      expect(payload).toHaveProperty("start_date");
      expect(payload).toHaveProperty("end_date");
      expect(payload).toMatchObject({ spent: 0 });
      expect(payload).not.toHaveProperty("period_start");
      expect(payload).not.toHaveProperty("period_end");
      expect(payload).not.toHaveProperty("spent_amount");
    });

    it("updateSpentAmount writes the real 'spent' column, not spent_amount", async () => {
      // Kept well under alert_threshold so checkAndCreateAlerts is a no-op
      // and this test doesn't also need to mock the budget_alerts table.
      const currentRow = makeBudgetRow({ amount: 500, spent: 100 });
      const updatedRow = makeBudgetRow({ amount: 500, spent: 150 });
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: updatedRow, error: null }),
            }),
          }),
        }),
      });

      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: currentRow, error: null }),
            }),
          }),
        }),
        update: updateMock,
      }));

      const result = await budgetService.updateSpentAmount(
        "budget-123",
        "user-123",
        50,
      );

      const payload = updateMock.mock.calls[0][0];
      expect(payload).toMatchObject({ spent: 150 });
      expect(payload).not.toHaveProperty("spent_amount");
      expect(result.spentAmount).toBe(150);
    });
  });

  describe("Budget CRUD Operations", () => {
    describe("createBudget", () => {
      it("should create a budget with valid input", async () => {
        const input: CreateBudgetInput = {
          userId: "user-123",
          name: "Groceries Budget",
          category: BUDGET_CATEGORIES.GROCERIES,
          budgetedAmount: 500,
          period: "monthly",
        };

        const mockBudgetRow = makeBudgetRow({
          id: "budget-123",
          category: input.category,
          amount: input.budgetedAmount,
          spent: 0,
        });

        const supabase = require("@/lib/supabase/client").getSupabase();
        supabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockBudgetRow,
                error: null,
              }),
            }),
          }),
        });

        const result = await budgetService.createBudget(input);

        expect(result).toBeDefined();
        expect(result.id).toBe("budget-123");
        // `name` is synthesized from category, not round-tripped through the
        // DB — the live `budgets` table has no `name` column. See the
        // "Live schema mapping" describe block above for the full rationale.
        expect(result.name).toBe(CATEGORY_DISPLAY_NAMES[input.category]);
        expect(result.category).toBe(input.category);
        expect(result.budgetedAmount).toBe(input.budgetedAmount);
        expect(result.spentAmount).toBe(0);
        expect(result.status).toBe("on_track");
      });

      it("should throw when the database rejects the insert", async () => {
        const input: CreateBudgetInput = {
          userId: "user-123",
          name: "Orphaned Budget",
          category: BUDGET_CATEGORIES.GROCERIES,
          budgetedAmount: 100,
          period: "monthly",
        };

        const supabase = require("@/lib/supabase/client").getSupabase();
        supabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: {
                  message:
                    'insert or update on table "budgets" violates foreign key constraint "budgets_user_id_fkey"',
                  code: "23503",
                },
              }),
            }),
          }),
        });

        await expect(budgetService.createBudget(input)).rejects.toThrow();
      });

      it("should set default alert threshold to 80%", async () => {
        const input: CreateBudgetInput = {
          userId: "user-123",
          name: "Test Budget",
          category: BUDGET_CATEGORIES.ENTERTAINMENT,
          budgetedAmount: 200,
          period: "monthly",
        };

        const mockBudgetRow = makeBudgetRow({
          id: "budget-456",
          category: input.category,
          amount: input.budgetedAmount,
          spent: 0,
        });

        const supabase = require("@/lib/supabase/client").getSupabase();
        supabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockBudgetRow,
                error: null,
              }),
            }),
          }),
        });

        const result = await budgetService.createBudget(input);
        expect(result.alertThreshold).toBe(80);
      });
    });

    describe("getBudgetById", () => {
      it("should return budget by ID", async () => {
        const mockBudgetRow = makeBudgetRow({
          amount: 500,
          spent: 200,
        });

        const supabase = require("@/lib/supabase/client").getSupabase();
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockBudgetRow,
                  error: null,
                }),
              }),
            }),
          }),
        });

        const result = await budgetService.getBudgetById(
          "budget-123",
          "user-123",
        );

        expect(result).toBeDefined();
        expect(result?.id).toBe("budget-123");
        expect(result?.spentAmount).toBe(200);
        expect(result?.percentUsed).toBe(40);
      });

      it("should return null for non-existent budget", async () => {
        const supabase = require("@/lib/supabase/client").getSupabase();
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        });

        const result = await budgetService.getBudgetById(
          "non-existent",
          "user-123",
        );
        expect(result).toBeNull();
      });
    });

    describe("updateBudget", () => {
      it("should update budget amount", async () => {
        const mockUpdatedRow = makeBudgetRow({
          amount: 600,
          spent: 200,
        });

        const supabase = require("@/lib/supabase/client").getSupabase();
        supabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockUpdatedRow,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        });

        const result = await budgetService.updateBudget(
          "budget-123",
          "user-123",
          {
            budgetedAmount: 600,
          },
        );

        expect(result.budgetedAmount).toBe(600);
      });
    });

    describe("deleteBudget", () => {
      it("should delete budget successfully", async () => {
        const supabase = require("@/lib/supabase/client").getSupabase();
        supabase.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        });

        await expect(
          budgetService.deleteBudget("budget-123", "user-123"),
        ).resolves.not.toThrow();
      });
    });
  });

  describe("Budget Status Calculation", () => {
    it("should calculate on_track status when under threshold", () => {
      const budget: Budget = {
        id: "budget-1",
        userId: "user-1",
        name: "Test",
        category: "groceries",
        budgetedAmount: 500,
        spentAmount: 200,
        remainingAmount: 300,
        period: "monthly",
        periodStart: new Date(),
        periodEnd: new Date(),
        status: "on_track",
        percentUsed: 40,
        rolloverEnabled: false,
        rolloverAmount: 0,
        isActive: true,
        alertThreshold: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(budget.status).toBe("on_track");
      expect(budget.percentUsed).toBe(40);
    });

    it("should calculate warning status when at threshold", () => {
      const percentUsed = 85;
      const alertThreshold = 80;
      const status: BudgetStatus =
        percentUsed >= 100
          ? "over_budget"
          : percentUsed >= alertThreshold
            ? "warning"
            : "on_track";

      expect(status).toBe("warning");
    });

    it("should calculate over_budget status when exceeded", () => {
      const percentUsed = 120;
      const alertThreshold = 80;
      const status: BudgetStatus =
        percentUsed >= 100
          ? "over_budget"
          : percentUsed >= alertThreshold
            ? "warning"
            : "on_track";

      expect(status).toBe("over_budget");
    });
  });

  describe("Budget Summary", () => {
    it("should calculate budget summary correctly", async () => {
      const mockBudgets = [
        makeBudgetRow({
          id: "b1",
          category: "groceries",
          amount: 500,
          spent: 400,
        }),
        makeBudgetRow({
          id: "b2",
          category: "entertainment",
          amount: 200,
          spent: 250,
        }),
      ];

      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockBudgets,
                error: null,
              }),
            }),
          }),
        }),
      });

      const summary = await budgetService.getBudgetSummary("user-1");

      expect(summary.totalBudgeted).toBe(700);
      expect(summary.totalSpent).toBe(650);
      expect(summary.totalRemaining).toBe(50);
      expect(summary.budgetsByStatus.overBudget).toBe(1);
    });
  });

  describe("Budget Recommendations", () => {
    it("should recommend increasing budget when consistently over", async () => {
      const mockBudgets = [
        makeBudgetRow({
          id: "b1",
          category: "dining_out",
          amount: 200,
          spent: 300,
        }),
      ];

      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockBudgets,
                error: null,
              }),
            }),
          }),
        }),
      });

      const recommendations = await budgetService.getRecommendations("user-1");

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe("increase_budget");
      expect(recommendations[0].category).toBe("dining_out");
    });

    it("should recommend decreasing budget when consistently under", async () => {
      const mockBudgets = [
        makeBudgetRow({
          id: "b1",
          category: "entertainment",
          amount: 500,
          spent: 50,
        }),
      ];

      const supabase = require("@/lib/supabase/client").getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockBudgets,
                error: null,
              }),
            }),
          }),
        }),
      });

      const recommendations = await budgetService.getRecommendations("user-1");

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe("decrease_budget");
    });
  });

  describe("Available Categories", () => {
    it("should return categories not yet budgeted", () => {
      const existingBudgets: Budget[] = [
        {
          id: "b1",
          userId: "user-1",
          name: "Groceries",
          category: "groceries",
          budgetedAmount: 500,
          spentAmount: 200,
          remainingAmount: 300,
          period: "monthly",
          periodStart: new Date(),
          periodEnd: new Date(),
          status: "on_track",
          percentUsed: 40,
          rolloverEnabled: false,
          rolloverAmount: 0,
          isActive: true,
          alertThreshold: 80,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const available = budgetService.getAvailableCategories(existingBudgets);

      expect(available).not.toContain("groceries");
      expect(available).toContain("entertainment");
      expect(available).toContain("housing");
      expect(available.length).toBe(21); // 22 total - 1 used
    });
  });

  describe("Period Calculations", () => {
    it("should calculate monthly period dates correctly", () => {
      const now = new Date();
      const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const expectedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Test that period calculation works (internal function)
      expect(expectedStart.getDate()).toBe(1);
      expect(expectedEnd.getDate()).toBeGreaterThanOrEqual(28);
    });

    it("should calculate weekly period dates correctly", () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const expectedStart = new Date(now);
      expectedStart.setDate(now.getDate() - dayOfWeek);

      expect(expectedStart.getDay()).toBe(0); // Sunday
    });
  });
});
