/**
 * @jest-environment node
 */

/**
 * Savings Goal Service Unit Tests
 *
 * Tests for goal CRUD, contributions, milestones, progress tracking,
 * linear regression projections, aggregate summaries, and currency conversion.
 */

import type { CurrencyCode } from "@/lib/financial/currency-service";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/server", () => {
  const _admin = { from: jest.fn() };
  return { supabaseAdmin: _admin };
});

jest.mock("@/lib/financial/currency-service", () => ({
  currencyService: { convertAndRound: jest.fn() },
}));

function sb() {
  return require("@/lib/supabase/server").supabaseAdmin;
}

function currency() {
  return require("@/lib/financial/currency-service").currencyService;
}

// Chain mock — every method returns the same object so any Supabase chain works
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
  // Thenable for awaiting without .single()
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
// Helpers — row factories
// ---------------------------------------------------------------------------

const NOW = "2026-02-15T12:00:00.000Z";
const PAST = "2026-01-01T00:00:00.000Z";
const FUTURE = "2026-12-31T23:59:59.000Z";

function goalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "goal-1",
    user_id: "user-1",
    name: "Vacation Fund",
    description: "Trip to Bali",
    target_amount: 5000,
    current_amount: 1500,
    currency: "USD",
    status: "active",
    target_date: FUTURE,
    icon: "piggy-bank",
    color: "#4F46E5",
    created_at: PAST,
    updated_at: NOW,
    deleted_at: null,
    ...overrides,
  };
}

function contribRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "contrib-1",
    goal_id: "goal-1",
    amount: 100,
    source: "manual",
    note: "",
    created_at: NOW,
    ...overrides,
  };
}

function milestoneRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ms-1",
    goal_id: "goal-1",
    threshold: 25,
    amount_at_milestone: 1250,
    reached_at: NOW,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import service under test (after mocks are registered)
// ---------------------------------------------------------------------------

import { savingsGoalService, SavingsGoalService } from "../savings-goal-service";

describe("SavingsGoalService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // createGoal
  // =========================================================================
  describe("createGoal", () => {
    it("should create a goal with default currency/icon/color", async () => {
      const row = goalRow({ current_amount: 0 });
      mockFrom({ data: row, error: null });

      const result = await savingsGoalService.createGoal("user-1", {
        name: "Vacation Fund",
        targetAmount: 5000,
        targetDate: FUTURE,
      });

      expect(result.id).toBe("goal-1");
      expect(result.name).toBe("Vacation Fund");
      expect(result.targetAmount).toBe(5000);
      expect(result.currentAmount).toBe(0);
      expect(result.currency).toBe("USD");
      expect(result.status).toBe("active");
      expect(result.icon).toBe("piggy-bank");
      expect(result.color).toBe("#4F46E5");

      expect(sb().from).toHaveBeenCalledWith("savings_goals");
    });

    it("should accept custom currency, icon, and color", async () => {
      const row = goalRow({ currency: "EUR", icon: "plane", color: "#FF0000" });
      mockFrom({ data: row, error: null });

      const result = await savingsGoalService.createGoal("user-1", {
        name: "Euro Trip",
        targetAmount: 3000,
        targetDate: new Date(FUTURE),
        currency: "EUR" as CurrencyCode,
        icon: "plane",
        color: "#FF0000",
      });

      expect(result.currency).toBe("EUR");
      expect(result.icon).toBe("plane");
      expect(result.color).toBe("#FF0000");
    });

    it("should throw when targetAmount is zero", async () => {
      await expect(
        savingsGoalService.createGoal("user-1", {
          name: "Bad",
          targetAmount: 0,
          targetDate: FUTURE,
        }),
      ).rejects.toThrow("Target amount must be a positive number");
    });

    it("should throw when targetAmount is negative", async () => {
      await expect(
        savingsGoalService.createGoal("user-1", {
          name: "Bad",
          targetAmount: -100,
          targetDate: FUTURE,
        }),
      ).rejects.toThrow("Target amount must be a positive number");
    });

    it("should propagate Supabase insert errors", async () => {
      mockFrom({ data: null, error: { message: "insert fail" } });

      await expect(
        savingsGoalService.createGoal("user-1", {
          name: "Test",
          targetAmount: 100,
          targetDate: FUTURE,
        }),
      ).rejects.toThrow("Failed to create savings goal: insert fail");
    });
  });

  // =========================================================================
  // getGoals
  // =========================================================================
  describe("getGoals", () => {
    it("should return mapped goals for a user", async () => {
      const rows = [goalRow(), goalRow({ id: "goal-2", name: "Emergency" })];
      mockFrom({ data: rows, error: null });

      const goals = await savingsGoalService.getGoals("user-1");
      expect(goals).toHaveLength(2);
      expect(goals[0].id).toBe("goal-1");
      expect(goals[1].id).toBe("goal-2");
    });

    it("should return empty array when data is null", async () => {
      mockFrom({ data: null, error: null });
      const goals = await savingsGoalService.getGoals("user-1");
      expect(goals).toEqual([]);
    });

    it("should return empty array when data is not an array", async () => {
      mockFrom({ data: "not-array", error: null });
      const goals = await savingsGoalService.getGoals("user-1");
      expect(goals).toEqual([]);
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "db fail" } });
      await expect(savingsGoalService.getGoals("user-1")).rejects.toThrow(
        "Failed to fetch savings goals: db fail",
      );
    });
  });

  // =========================================================================
  // getGoal (with parallel queries)
  // =========================================================================
  describe("getGoal", () => {
    it("should return goal with milestones and contributions", async () => {
      const gRow = goalRow();
      const mRows = [milestoneRow()];
      const cRows = [contribRow()];

      sb().from.mockImplementation((table: string) => {
        switch (table) {
          case "savings_goals":
            return chainMock({ data: gRow, error: null });
          case "goal_milestones":
            return chainMock({ data: mRows, error: null });
          case "goal_contributions":
            return chainMock({ data: cRows, error: null });
          default:
            return chainMock({ data: null, error: null });
        }
      });

      const result = await savingsGoalService.getGoal("goal-1");

      expect(result.goal.id).toBe("goal-1");
      expect(result.milestones).toHaveLength(1);
      expect(result.milestones[0].threshold).toBe(25);
      expect(result.contributions).toHaveLength(1);
      expect(result.contributions[0].amount).toBe(100);
    });

    it("should throw when goal query fails", async () => {
      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals")
          return chainMock({ data: null, error: { message: "not found" } });
        return chainMock({ data: [], error: null });
      });

      await expect(savingsGoalService.getGoal("goal-x")).rejects.toThrow(
        "Failed to fetch savings goal: not found",
      );
    });

    it("should handle empty milestones and contributions", async () => {
      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals")
          return chainMock({ data: goalRow(), error: null });
        return chainMock({ data: null, error: null });
      });

      const result = await savingsGoalService.getGoal("goal-1");
      expect(result.milestones).toEqual([]);
      expect(result.contributions).toEqual([]);
    });
  });

  // =========================================================================
  // updateGoal
  // =========================================================================
  describe("updateGoal", () => {
    it("should update goal fields", async () => {
      const updated = goalRow({ name: "Updated Name", target_amount: 8000 });
      mockFrom({ data: updated, error: null });

      const result = await savingsGoalService.updateGoal("goal-1", {
        name: "Updated Name",
        targetAmount: 8000,
      });

      expect(result.name).toBe("Updated Name");
      expect(result.targetAmount).toBe(8000);
    });

    it("should throw for negative targetAmount", async () => {
      await expect(
        savingsGoalService.updateGoal("goal-1", { targetAmount: -5 }),
      ).rejects.toThrow("Target amount must be a positive number");
    });

    it("should throw for zero targetAmount", async () => {
      await expect(
        savingsGoalService.updateGoal("goal-1", { targetAmount: 0 }),
      ).rejects.toThrow("Target amount must be a positive number");
    });

    it("should propagate Supabase update errors", async () => {
      mockFrom({ data: null, error: { message: "update fail" } });

      await expect(
        savingsGoalService.updateGoal("goal-1", { name: "x" }),
      ).rejects.toThrow("Failed to update savings goal: update fail");
    });

    it("should accept a Date object for targetDate", async () => {
      mockFrom({ data: goalRow(), error: null });
      const result = await savingsGoalService.updateGoal("goal-1", {
        targetDate: new Date("2027-01-01"),
      });
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // deleteGoal (soft delete)
  // =========================================================================
  describe("deleteGoal", () => {
    it("should soft-delete a goal", async () => {
      const mock = chainMock({ data: null, error: null });
      sb().from.mockReturnValue(mock);

      await savingsGoalService.deleteGoal("goal-1");

      expect(sb().from).toHaveBeenCalledWith("savings_goals");
      expect(mock.update).toHaveBeenCalled();
    });

    it("should throw on Supabase error", async () => {
      const mock = chainMock({ data: null, error: { message: "delete fail" } });
      // deleteGoal does NOT call .single(), it awaits chain directly
      // Override the thenable
      mock.then = (
        resolve: (v: unknown) => void,
        reject: (e: unknown) => void,
      ) =>
        Promise.resolve({ data: null, error: { message: "delete fail" } }).then(
          resolve,
          reject,
        );
      sb().from.mockReturnValue(mock);

      await expect(savingsGoalService.deleteGoal("goal-1")).rejects.toThrow(
        "Failed to delete savings goal: delete fail",
      );
    });
  });

  // =========================================================================
  // recordContribution
  // =========================================================================
  describe("recordContribution", () => {
    it("should record a contribution and return it", async () => {
      const gRow = goalRow({ current_amount: 1000, target_amount: 5000 });
      const cRow = contribRow({ amount: 200 });
      // No existing milestones (25% = 1250, we go from 1000 to 1200, below 25%)
      let savingsGoalsCallCount = 0;
      let goalContribCallCount = 0;

      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals") {
          savingsGoalsCallCount++;
          if (savingsGoalsCallCount === 1) {
            // fetch goal
            return chainMock({ data: gRow, error: null });
          }
          // update goal amount (no .single())
          const mock = chainMock({ data: null, error: null });
          mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
            Promise.resolve({ data: null, error: null }).then(r, j);
          return mock;
        }
        if (table === "goal_contributions") {
          goalContribCallCount++;
          if (goalContribCallCount === 1) {
            // insert contribution
            return chainMock({ data: cRow, error: null });
          }
          // subsequent: getContributions in checkMilestonesInternal -> getMilestones won't query this
          return chainMock({ data: [], error: null });
        }
        if (table === "goal_milestones") {
          // getMilestones in checkMilestonesInternal — no existing milestones
          return chainMock({ data: [], error: null });
        }
        return chainMock({ data: null, error: null });
      });

      const result = await savingsGoalService.recordContribution(
        "goal-1",
        200,
        "manual",
        "Extra cash",
      );

      expect(result.contribution.amount).toBe(200);
      expect(result.newMilestones).toEqual([]); // 1200/5000 = 24%, no milestone
    });

    it("should trigger 25% milestone when threshold is crossed", async () => {
      // current_amount = 1200, contributing 100 → 1300/5000 = 26% (crosses 25%)
      const gRow = goalRow({ current_amount: 1200, target_amount: 5000 });
      const cRow = contribRow({ amount: 100 });
      const newMs = milestoneRow({ threshold: 25, amount_at_milestone: 1300 });

      let savingsGoalsCallCount = 0;
      let goalMilestonesCallCount = 0;

      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals") {
          savingsGoalsCallCount++;
          if (savingsGoalsCallCount === 1) {
            return chainMock({ data: gRow, error: null });
          }
          // update
          const mock = chainMock({ data: null, error: null });
          mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
            Promise.resolve({ data: null, error: null }).then(r, j);
          return mock;
        }
        if (table === "goal_contributions") {
          return chainMock({ data: cRow, error: null });
        }
        if (table === "goal_milestones") {
          goalMilestonesCallCount++;
          if (goalMilestonesCallCount === 1) {
            // getMilestones — no existing
            return chainMock({ data: [], error: null });
          }
          // insertMilestone
          return chainMock({ data: newMs, error: null });
        }
        return chainMock({ data: null, error: null });
      });

      const result = await savingsGoalService.recordContribution("goal-1", 100);
      expect(result.newMilestones).toHaveLength(1);
      expect(result.newMilestones[0].threshold).toBe(25);
    });

    it("should auto-complete goal when target is reached", async () => {
      // current = 4900, contributing 200 → 5100 >= 5000, should set status=completed
      const gRow = goalRow({ current_amount: 4900, target_amount: 5000, status: "active" });
      const cRow = contribRow({ amount: 200 });

      let savingsGoalsCallCount = 0;
      let goalMilestonesCallCount = 0;

      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals") {
          savingsGoalsCallCount++;
          if (savingsGoalsCallCount === 1) {
            return chainMock({ data: gRow, error: null });
          }
          const mock = chainMock({ data: null, error: null });
          mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
            Promise.resolve({ data: null, error: null }).then(r, j);
          return mock;
        }
        if (table === "goal_contributions") {
          return chainMock({ data: cRow, error: null });
        }
        if (table === "goal_milestones") {
          goalMilestonesCallCount++;
          if (goalMilestonesCallCount === 1) {
            // existing milestones — 25, 50, 75, 90 already reached
            return chainMock({
              data: [
                milestoneRow({ threshold: 25 }),
                milestoneRow({ threshold: 50 }),
                milestoneRow({ threshold: 75 }),
                milestoneRow({ threshold: 90 }),
              ],
              error: null,
            });
          }
          // insert 100% milestone
          return chainMock({
            data: milestoneRow({ threshold: 100, amount_at_milestone: 5100 }),
            error: null,
          });
        }
        return chainMock({ data: null, error: null });
      });

      const result = await savingsGoalService.recordContribution("goal-1", 200);
      // 100% milestone should be triggered (from 98% to 102%)
      expect(result.newMilestones).toHaveLength(1);
      expect(result.newMilestones[0].threshold).toBe(100);
    });

    it("should throw for zero contribution amount", async () => {
      await expect(
        savingsGoalService.recordContribution("goal-1", 0),
      ).rejects.toThrow("Contribution amount must be a positive number");
    });

    it("should throw for negative contribution amount", async () => {
      await expect(
        savingsGoalService.recordContribution("goal-1", -50),
      ).rejects.toThrow("Contribution amount must be a positive number");
    });

    it("should throw when goal fetch fails during contribution", async () => {
      mockFrom({ data: null, error: { message: "no goal" } });

      await expect(
        savingsGoalService.recordContribution("goal-1", 100),
      ).rejects.toThrow("Failed to fetch goal for contribution: no goal");
    });

    it("should throw when contribution insert fails", async () => {
      let savingsGoalsCallCount = 0;
      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals") {
          savingsGoalsCallCount++;
          if (savingsGoalsCallCount === 1) {
            return chainMock({ data: goalRow(), error: null });
          }
          const mock = chainMock({ data: null, error: null });
          mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
            Promise.resolve({ data: null, error: null }).then(r, j);
          return mock;
        }
        if (table === "goal_contributions") {
          return chainMock({ data: null, error: { message: "insert fail" } });
        }
        return chainMock({ data: null, error: null });
      });

      await expect(
        savingsGoalService.recordContribution("goal-1", 100),
      ).rejects.toThrow("Failed to record contribution: insert fail");
    });
  });

  // =========================================================================
  // trackProgress
  // =========================================================================
  describe("trackProgress", () => {
    it("should calculate progress for an active goal", async () => {
      // Goal created 30 days ago, target 60 days from now, 1500/5000 saved
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysOut = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

      mockFrom({
        data: goalRow({
          created_at: thirtyDaysAgo,
          target_date: sixtyDaysOut,
          current_amount: 1500,
          target_amount: 5000,
        }),
        error: null,
      });

      const result = await savingsGoalService.trackProgress("goal-1");

      expect(result.goalId).toBe("goal-1");
      expect(result.currentAmount).toBe(1500);
      expect(result.targetAmount).toBe(5000);
      expect(result.progressPercent).toBe(30);
      expect(result.daysElapsed).toBeGreaterThanOrEqual(29);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(59);
      expect(typeof result.onTrack).toBe("boolean");
      expect(typeof result.requiredDailyRate).toBe("number");
      expect(typeof result.actualDailyRate).toBe("number");
    });

    it("should return progressPercent capped at 100", async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      mockFrom({
        data: goalRow({
          created_at: thirtyDaysAgo,
          target_date: FUTURE,
          current_amount: 6000,
          target_amount: 5000,
        }),
        error: null,
      });

      const result = await savingsGoalService.trackProgress("goal-1");
      expect(result.progressPercent).toBe(100);
    });

    it("should handle zero target amount (returns 0 progress)", async () => {
      mockFrom({
        data: goalRow({ target_amount: 0, current_amount: 0, created_at: PAST }),
        error: null,
      });

      const result = await savingsGoalService.trackProgress("goal-1");
      expect(result.progressPercent).toBe(0);
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "db error" } });
      await expect(
        savingsGoalService.trackProgress("goal-1"),
      ).rejects.toThrow("Failed to fetch goal for progress: db error");
    });

    it("should be on track when actual rate meets 90% tolerance", async () => {
      // Make a scenario where onTrack should be true
      // actualDailyRate >= requiredDailyRate * 0.9
      const now = Date.now();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
      const tenDaysOut = new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString();
      // saved 500 in 10 days (50/day), need 500 more in 10 days (50/day), 50 >= 50*0.9 = 45
      mockFrom({
        data: goalRow({
          created_at: tenDaysAgo,
          target_date: tenDaysOut,
          current_amount: 500,
          target_amount: 1000,
        }),
        error: null,
      });

      const result = await savingsGoalService.trackProgress("goal-1");
      expect(result.onTrack).toBe(true);
    });
  });

  // =========================================================================
  // getProjectedDate (linear regression)
  // =========================================================================
  describe("getProjectedDate", () => {
    it("should return null projection with fewer than 2 contributions", async () => {
      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals")
          return chainMock({ data: goalRow(), error: null });
        if (table === "goal_contributions")
          return chainMock({ data: [contribRow()], error: null }); // only 1
        return chainMock({ data: null, error: null });
      });

      const result = await savingsGoalService.getProjectedDate("goal-1");
      expect(result.projectedDate).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.daysUntilProjected).toBeNull();
      expect(result.slope).toBe(0);
    });

    it("should project a date given multiple contributions", async () => {
      const base = new Date("2026-01-01T00:00:00.000Z");
      const contribs = [
        contribRow({ id: "c1", amount: 100, created_at: base.toISOString() }),
        contribRow({
          id: "c2",
          amount: 100,
          created_at: new Date(base.getTime() + 10 * 86400000).toISOString(),
        }),
        contribRow({
          id: "c3",
          amount: 100,
          created_at: new Date(base.getTime() + 20 * 86400000).toISOString(),
        }),
      ];

      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals")
          return chainMock({
            data: goalRow({ target_amount: 1000, current_amount: 300 }),
            error: null,
          });
        if (table === "goal_contributions")
          return chainMock({ data: contribs, error: null });
        return chainMock({ data: null, error: null });
      });

      const result = await savingsGoalService.getProjectedDate("goal-1");
      expect(result.goalId).toBe("goal-1");
      expect(result.slope).toBeGreaterThan(0);
      expect(result.projectedDate).not.toBeNull();
      expect(result.daysUntilProjected).not.toBeNull();
      expect(result.rSquared).toBeGreaterThan(0);
    });

    it("should return null projected date when slope is zero or negative", async () => {
      // All contributions on the same day → slope = 0
      const contribs = [
        contribRow({ id: "c1", amount: 100, created_at: NOW }),
        contribRow({ id: "c2", amount: 100, created_at: NOW }),
      ];

      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals")
          return chainMock({ data: goalRow(), error: null });
        if (table === "goal_contributions")
          return chainMock({ data: contribs, error: null });
        return chainMock({ data: null, error: null });
      });

      const result = await savingsGoalService.getProjectedDate("goal-1");
      expect(result.projectedDate).toBeNull();
      expect(result.daysUntilProjected).toBeNull();
    });

    it("should throw when goal query fails", async () => {
      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals")
          return chainMock({ data: null, error: { message: "fail" } });
        return chainMock({ data: [], error: null });
      });

      await expect(
        savingsGoalService.getProjectedDate("goal-1"),
      ).rejects.toThrow("Failed to fetch goal for projection: fail");
    });
  });

  // =========================================================================
  // getMilestones
  // =========================================================================
  describe("getMilestones", () => {
    it("should return milestones for a goal", async () => {
      const rows = [
        milestoneRow({ threshold: 25 }),
        milestoneRow({ id: "ms-2", threshold: 50 }),
      ];
      mockFrom({ data: rows, error: null });

      const result = await savingsGoalService.getMilestones("goal-1");
      expect(result).toHaveLength(2);
      expect(result[0].threshold).toBe(25);
      expect(result[1].threshold).toBe(50);
    });

    it("should return empty array when data is null", async () => {
      mockFrom({ data: null, error: null });
      const result = await savingsGoalService.getMilestones("goal-1");
      expect(result).toEqual([]);
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "ms fail" } });
      await expect(
        savingsGoalService.getMilestones("goal-1"),
      ).rejects.toThrow("Failed to fetch milestones: ms fail");
    });
  });

  // =========================================================================
  // checkMilestones (public)
  // =========================================================================
  describe("checkMilestones", () => {
    it("should detect newly reached milestones", async () => {
      // Goal is at 60% — should record 25% and 50% if not already recorded
      const gRow = goalRow({ current_amount: 3000, target_amount: 5000 });
      let goalMilestonesCallCount = 0;

      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals") {
          return chainMock({ data: gRow, error: null });
        }
        if (table === "goal_milestones") {
          goalMilestonesCallCount++;
          if (goalMilestonesCallCount === 1) {
            // getMilestones — no existing
            return chainMock({ data: [], error: null });
          }
          // insertMilestone calls — return a milestone row for each threshold
          const threshold = goalMilestonesCallCount === 2 ? 25 : 50;
          return chainMock({
            data: milestoneRow({ threshold, amount_at_milestone: 3000 }),
            error: null,
          });
        }
        return chainMock({ data: null, error: null });
      });

      const result = await savingsGoalService.checkMilestones("goal-1");
      // 60% should trigger 25% and 50%
      expect(result).toHaveLength(2);
    });

    it("should skip already recorded milestones", async () => {
      const gRow = goalRow({ current_amount: 3000, target_amount: 5000 });

      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals") {
          return chainMock({ data: gRow, error: null });
        }
        if (table === "goal_milestones") {
          // Already has 25% milestone
          return chainMock({
            data: [milestoneRow({ threshold: 25 })],
            error: null,
          });
        }
        return chainMock({ data: null, error: null });
      });

      // The test needs to handle both getMilestones and insertMilestone calls
      let goalMilestonesCallCount = 0;
      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals") {
          return chainMock({ data: gRow, error: null });
        }
        if (table === "goal_milestones") {
          goalMilestonesCallCount++;
          if (goalMilestonesCallCount === 1) {
            // getMilestones — 25% already exists
            return chainMock({
              data: [milestoneRow({ threshold: 25 })],
              error: null,
            });
          }
          // insertMilestone for 50%
          return chainMock({
            data: milestoneRow({ threshold: 50, amount_at_milestone: 3000 }),
            error: null,
          });
        }
        return chainMock({ data: null, error: null });
      });

      const result = await savingsGoalService.checkMilestones("goal-1");
      // Only 50% should be new (25% already exists)
      expect(result).toHaveLength(1);
      expect(result[0].threshold).toBe(50);
    });

    it("should throw when goal fetch fails", async () => {
      sb().from.mockImplementation((table: string) => {
        if (table === "savings_goals")
          return chainMock({ data: null, error: { message: "fail" } });
        if (table === "goal_milestones")
          return chainMock({ data: [], error: null });
        return chainMock({ data: null, error: null });
      });

      await expect(
        savingsGoalService.checkMilestones("goal-1"),
      ).rejects.toThrow("Failed to fetch goal for milestone check: fail");
    });
  });

  // =========================================================================
  // getGoalSummary
  // =========================================================================
  describe("getGoalSummary", () => {
    it("should aggregate summary across multiple goals", async () => {
      const now = Date.now();
      const tenDaysAgo = new Date(now - 10 * 86400000).toISOString();
      const thirtyDaysOut = new Date(now + 30 * 86400000).toISOString();

      const rows = [
        goalRow({
          id: "g1",
          status: "active",
          current_amount: 500,
          target_amount: 1000,
          created_at: tenDaysAgo,
          target_date: thirtyDaysOut,
        }),
        goalRow({
          id: "g2",
          status: "completed",
          current_amount: 2000,
          target_amount: 2000,
          created_at: tenDaysAgo,
          target_date: thirtyDaysOut,
        }),
        goalRow({
          id: "g3",
          status: "paused",
          current_amount: 300,
          target_amount: 1000,
          created_at: tenDaysAgo,
          target_date: thirtyDaysOut,
        }),
      ];
      mockFrom({ data: rows, error: null });

      // Mock currency conversion as identity (same currency)
      currency().convertAndRound.mockImplementation(
        (amount: number) => amount,
      );

      const summary = await savingsGoalService.getGoalSummary("user-1");

      expect(summary.totalGoals).toBe(3);
      expect(summary.activeGoals).toBe(1);
      expect(summary.completedGoals).toBe(1);
      expect(summary.pausedGoals).toBe(1);
      expect(summary.cancelledGoals).toBe(0);
      expect(summary.totalSaved).toBe(2800);
      expect(summary.totalTargets).toBe(4000);
      expect(summary.currency).toBe("USD");
    });

    it("should use currency conversion for multi-currency goals", async () => {
      const rows = [
        goalRow({ current_amount: 100, target_amount: 500, currency: "EUR" }),
      ];
      mockFrom({ data: rows, error: null });

      // EUR → USD conversion at 1.1
      currency().convertAndRound.mockImplementation(
        (amount: number, from: string, to: string) => {
          if (from === "EUR" && to === "USD") return amount * 1.1;
          return amount;
        },
      );

      const summary = await savingsGoalService.getGoalSummary("user-1", "USD" as CurrencyCode);
      expect(summary.totalSaved).toBe(110);
      expect(summary.totalTargets).toBe(550);
    });

    it("should return zeros for user with no goals", async () => {
      mockFrom({ data: [], error: null });
      currency().convertAndRound.mockImplementation((a: number) => a);

      const summary = await savingsGoalService.getGoalSummary("user-1");
      expect(summary.totalGoals).toBe(0);
      expect(summary.totalSaved).toBe(0);
      expect(summary.totalTargets).toBe(0);
      expect(summary.overallProgressPercent).toBe(0);
    });

    it("should cap overallProgressPercent at 100", async () => {
      const rows = [
        goalRow({ current_amount: 6000, target_amount: 5000, status: "completed" }),
      ];
      mockFrom({ data: rows, error: null });
      currency().convertAndRound.mockImplementation((a: number) => a);

      const summary = await savingsGoalService.getGoalSummary("user-1");
      expect(summary.overallProgressPercent).toBe(100);
    });
  });

  // =========================================================================
  // convertGoalCurrency
  // =========================================================================
  describe("convertGoalCurrency", () => {
    it("should convert goal amounts to new currency", async () => {
      let savingsGoalsCallCount = 0;
      const originalRow = goalRow({ currency: "USD", target_amount: 1000, current_amount: 500 });
      const convertedRow = goalRow({
        currency: "EUR",
        target_amount: 900,
        current_amount: 450,
      });

      sb().from.mockImplementation(() => {
        savingsGoalsCallCount++;
        if (savingsGoalsCallCount === 1) {
          return chainMock({ data: originalRow, error: null });
        }
        // second call: update
        return chainMock({ data: convertedRow, error: null });
      });

      currency().convertAndRound.mockImplementation(
        (amount: number) => amount * 0.9,
      );

      const result = await savingsGoalService.convertGoalCurrency(
        "goal-1",
        "EUR" as CurrencyCode,
      );
      expect(result.currency).toBe("EUR");
      expect(result.targetAmount).toBe(900);
      expect(result.currentAmount).toBe(450);
    });

    it("should return goal unchanged when currency is same", async () => {
      mockFrom({ data: goalRow({ currency: "USD" }), error: null });

      const result = await savingsGoalService.convertGoalCurrency(
        "goal-1",
        "USD" as CurrencyCode,
      );
      expect(result.currency).toBe("USD");
      // convertAndRound should NOT have been called
      expect(currency().convertAndRound).not.toHaveBeenCalled();
    });

    it("should throw when fetch fails", async () => {
      mockFrom({ data: null, error: { message: "fetch fail" } });

      await expect(
        savingsGoalService.convertGoalCurrency("goal-1", "EUR" as CurrencyCode),
      ).rejects.toThrow("Failed to fetch goal for currency conversion: fetch fail");
    });

    it("should throw when update fails", async () => {
      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainMock({ data: goalRow({ currency: "USD" }), error: null });
        }
        return chainMock({ data: null, error: { message: "update fail" } });
      });

      currency().convertAndRound.mockImplementation((a: number) => a);

      await expect(
        savingsGoalService.convertGoalCurrency("goal-1", "EUR" as CurrencyCode),
      ).rejects.toThrow("Failed to convert goal currency: update fail");
    });
  });

  // =========================================================================
  // Factory export
  // =========================================================================
  describe("createSavingsGoalService factory", () => {
    it("should create a new instance", () => {
      const { createSavingsGoalService } = require("../savings-goal-service");
      const instance = createSavingsGoalService();
      expect(instance).toBeInstanceOf(SavingsGoalService);
      expect(instance).not.toBe(savingsGoalService);
    });
  });
});
