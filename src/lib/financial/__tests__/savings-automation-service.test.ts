/**
 * @jest-environment node
 */

/**
 * Savings Automation Service Unit Tests
 *
 * Tests for savings rules CRUD, goals CRUD, contributions,
 * round-up calculations, summary, insights, and recommendations.
 */

import { savingsAutomationService } from "../savings-automation-service";
import type {
  CreateSavingsRuleInput,
  CreateSavingsGoalInput,
  AddContributionInput,
} from "../types/savings.types";

// ---------------------------------------------------------------------------
// Mock Supabase
//
// savings-automation-service.ts reads/writes financial_goals and the three
// savings_* tables via a lazily constructed service-role client built on
// @supabase/supabase-js's createClient directly (not getSupabase()) — see
// the service's top-of-file comment: none of these tables/columns are in
// the generated Database type, so the shared typed supabaseAdmin can't
// query them without touching types.ts or an `any` cast (same root cause
// as plaid-service.ts's getServiceRoleClient(), mocked the same way there).
// Both mocks below share the SAME underlying spy so this suite doesn't
// depend on which import path the production code actually calls.
// ---------------------------------------------------------------------------
const fromSpy = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({ from: fromSpy }),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: fromSpy }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function supabase() {
  return { from: fromSpy };
}

const NOW = "2026-02-20T12:00:00.000Z";

function makeRuleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    user_id: "user-1",
    name: "Round-Up Rule",
    type: "round_up",
    frequency: "per_transaction",
    status: "active",
    config: { roundUpTo: 1, roundUpMultiplier: 1 },
    goal_id: null,
    source_account_id: "acct-src",
    destination_account_id: "acct-dst",
    total_saved: 100,
    transfer_count: 20,
    last_triggered_at: NOW,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeGoalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "goal-1",
    user_id: "user-1",
    name: "Vacation Fund",
    category: "vacation",
    status: "active",
    target_amount: 5000,
    current_amount: 2000,
    target_date: "2026-12-31T00:00:00.000Z",
    start_date: "2026-01-01T00:00:00.000Z",
    completed_at: null,
    auto_save_enabled: true,
    linked_rule_ids: [],
    priority: 1,
    icon: null,
    color: null,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeContributionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "contrib-1",
    goal_id: "goal-1",
    amount: 50,
    source: "manual",
    rule_id: null,
    transaction_id: null,
    note: null,
    created_at: NOW,
    ...overrides,
  };
}

/**
 * Create a self-referencing chain mock for supabase query builder.
 * Every method (select, eq, order, gte, is, insert, update, delete)
 * returns the SAME object so arbitrary chaining works.
 * `.single()` resolves with the provided result.
 * Without `.single()`, the chain itself resolves to `result` when awaited.
 */
function chainMock(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "order",
    "gte",
    "lte",
    "is",
    "in",
    "limit",
  ];
  for (const m of methods) {
    obj[m] = jest.fn().mockReturnValue(obj);
  }
  obj.single = jest.fn().mockResolvedValue(result);
  // Make the chain itself thenable so `await supabase.from().select().eq().order()`
  // resolves without calling .single()
  obj.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
    return Promise.resolve(result).then(resolve, reject);
  };
  return obj;
}

/** Wire supabase().from to return a chainMock with given result */
function mockFrom(result: { data: unknown; error: unknown }) {
  const mock = chainMock(result);
  supabase().from.mockReturnValue(mock);
  return mock;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SavingsAutomationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== RULES CRUD =====
  describe("getRules", () => {
    it("should return mapped rules for a user", async () => {
      const rows = [makeRuleRow(), makeRuleRow({ id: "rule-2", name: "Fixed Rule", type: "fixed" })];
      mockFrom({ data: rows, error: null });

      const result = await savingsAutomationService.getRules("user-1");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("rule-1");
      expect(result[0].userId).toBe("user-1");
      expect(result[0].name).toBe("Round-Up Rule");
      expect(result[0].type).toBe("round_up");
      expect(result[1].id).toBe("rule-2");
    });

    it("should return empty array on error", async () => {
      mockFrom({ data: null, error: { message: "db error" } });
      const result = await savingsAutomationService.getRules("user-1");
      expect(result).toEqual([]);
    });

    it("should return empty array when data is null with no error", async () => {
      mockFrom({ data: null, error: null });
      const result = await savingsAutomationService.getRules("user-1");
      expect(result).toEqual([]);
    });

    it("should call supabase with correct table", async () => {
      mockFrom({ data: [], error: null });
      await savingsAutomationService.getRules("user-1");
      expect(supabase().from).toHaveBeenCalledWith("savings_rules");
    });
  });

  describe("getRule", () => {
    it("should return a single mapped rule", async () => {
      mockFrom({ data: makeRuleRow(), error: null });
      const result = await savingsAutomationService.getRule("user-1", "rule-1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("rule-1");
      expect(result!.totalSaved).toBe(100);
      expect(result!.transferCount).toBe(20);
    });

    it("should return null on error", async () => {
      mockFrom({ data: null, error: { message: "not found" } });
      const result = await savingsAutomationService.getRule("user-1", "rule-x");
      expect(result).toBeNull();
    });

    it("should return null when data is null", async () => {
      mockFrom({ data: null, error: null });
      const result = await savingsAutomationService.getRule("user-1", "rule-x");
      expect(result).toBeNull();
    });
  });

  describe("createRule", () => {
    it("should create and return a mapped rule", async () => {
      const input: CreateSavingsRuleInput = {
        name: "My Rule",
        type: "round_up",
        frequency: "per_transaction",
        config: { roundUpTo: 1, roundUpMultiplier: 2 },
        goalId: "goal-1",
        sourceAccountId: "acct-src",
        destinationAccountId: "acct-dst",
      };
      mockFrom({ data: makeRuleRow({ name: "My Rule", config: input.config }), error: null });

      const result = await savingsAutomationService.createRule("user-1", input);
      expect(result.name).toBe("My Rule");
      expect(result.config.roundUpMultiplier).toBe(2);
      expect(supabase().from).toHaveBeenCalledWith("savings_rules");
    });

    it("should throw when insert fails", async () => {
      mockFrom({ data: null, error: { message: "insert failed" } });
      const input: CreateSavingsRuleInput = {
        name: "Bad Rule",
        type: "fixed",
        frequency: "monthly",
        config: { fixedAmount: 100 },
      };
      await expect(
        savingsAutomationService.createRule("user-1", input),
      ).rejects.toThrow("Failed to create savings rule");
    });
  });

  describe("updateRule", () => {
    it("should update name and return mapped rule", async () => {
      mockFrom({ data: makeRuleRow({ name: "Updated" }), error: null });
      const result = await savingsAutomationService.updateRule("user-1", "rule-1", {
        name: "Updated",
      });
      expect(result.name).toBe("Updated");
    });

    it("should merge config with existing rule when config is provided", async () => {
      // updateRule calls getRule first when config is provided, then does the update.
      // Both go through supabase().from => same chain mock. getRule uses .single(), update uses .single().
      const existingRow = makeRuleRow({ config: { roundUpTo: 1, roundUpMultiplier: 1 } });
      mockFrom({ data: existingRow, error: null });

      const result = await savingsAutomationService.updateRule("user-1", "rule-1", {
        config: { roundUpMultiplier: 3 },
      });
      expect(result).toBeDefined();
    });

    it("should throw when update fails", async () => {
      // When name-only update (no config), no getRule call — goes straight to update
      mockFrom({ data: null, error: { message: "update error" } });
      await expect(
        savingsAutomationService.updateRule("user-1", "rule-1", { name: "X" }),
      ).rejects.toThrow("Failed to update savings rule");
    });
  });

  describe("deleteRule", () => {
    it("should return true when delete succeeds", async () => {
      mockFrom({ data: null, error: null });
      const result = await savingsAutomationService.deleteRule("user-1", "rule-1");
      expect(result).toBe(true);
    });

    it("should return false when delete fails", async () => {
      mockFrom({ data: null, error: { message: "delete error" } });
      const result = await savingsAutomationService.deleteRule("user-1", "rule-1");
      expect(result).toBe(false);
    });
  });

  describe("toggleRuleStatus", () => {
    it("should toggle active rule to paused", async () => {
      const activeRow = makeRuleRow({ status: "active" });
      const pausedRow = makeRuleRow({ status: "paused" });
      const sb = supabase();
      let callCount = 0;
      sb.from.mockImplementation(() => {
        callCount++;
        // 1st from() = getRule (returns active), 2nd from() = updateRule (returns paused)
        return chainMock({ data: callCount === 1 ? activeRow : pausedRow, error: null });
      });

      const result = await savingsAutomationService.toggleRuleStatus("user-1", "rule-1");
      expect(result.status).toBe("paused");
    });

    it("should toggle paused rule to active", async () => {
      const pausedRow = makeRuleRow({ status: "paused" });
      const activeRow = makeRuleRow({ status: "active" });
      const sb = supabase();
      let callCount = 0;
      sb.from.mockImplementation(() => {
        callCount++;
        return chainMock({ data: callCount === 1 ? pausedRow : activeRow, error: null });
      });

      const result = await savingsAutomationService.toggleRuleStatus("user-1", "rule-1");
      expect(result.status).toBe("active");
    });

    it("should throw when rule not found", async () => {
      mockFrom({ data: null, error: { message: "not found" } });
      await expect(
        savingsAutomationService.toggleRuleStatus("user-1", "rule-x"),
      ).rejects.toThrow("Rule not found");
    });
  });

  // ===== GOALS CRUD =====
  describe("getGoals", () => {
    it("should return mapped goals with contributions", async () => {
      const goalRow = makeGoalRow();
      const contribRow = makeContributionRow();
      const sb = supabase();
      sb.from.mockImplementation((table: string) => {
        if (table === "financial_goals") {
          return chainMock({ data: [goalRow], error: null });
        }
        // savings_contributions
        return chainMock({ data: [contribRow], error: null });
      });

      const result = await savingsAutomationService.getGoals("user-1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("goal-1");
      expect(result[0].name).toBe("Vacation Fund");
      expect(result[0].contributions).toHaveLength(1);
    });

    it("should return empty array on error", async () => {
      mockFrom({ data: null, error: { message: "db error" } });
      const result = await savingsAutomationService.getGoals("user-1");
      expect(result).toEqual([]);
    });
  });

  describe("getGoal", () => {
    it("should return a single mapped goal with contributions", async () => {
      const goalRow = makeGoalRow();
      const contribRow = makeContributionRow();
      const sb = supabase();
      sb.from.mockImplementation((table: string) => {
        if (table === "financial_goals") {
          return chainMock({ data: goalRow, error: null });
        }
        return chainMock({ data: [contribRow], error: null });
      });

      const result = await savingsAutomationService.getGoal("user-1", "goal-1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("goal-1");
      expect(result!.targetAmount).toBe(5000);
      expect(result!.currentAmount).toBe(2000);
      expect(result!.contributions).toHaveLength(1);
    });

    it("should return null on error", async () => {
      mockFrom({ data: null, error: { message: "not found" } });
      const result = await savingsAutomationService.getGoal("user-1", "goal-x");
      expect(result).toBeNull();
    });
  });

  describe("createGoal", () => {
    it("should create and return a mapped goal with empty contributions", async () => {
      const input: CreateSavingsGoalInput = {
        name: "New Car",
        category: "major_purchase",
        targetAmount: 30000,
        targetDate: new Date("2027-06-01"),
        priority: 2,
        autoSaveEnabled: true,
        icon: "car",
        color: "#FF0000",
        notes: "For a Tesla",
      };
      mockFrom({
        data: makeGoalRow({
          id: "goal-new",
          name: "New Car",
          category: "major_purchase",
          target_amount: 30000,
          current_amount: 0,
        }),
        error: null,
      });

      const result = await savingsAutomationService.createGoal("user-1", input);
      expect(result.name).toBe("New Car");
      expect(result.contributions).toEqual([]);
    });

    it("should throw when insert fails", async () => {
      mockFrom({ data: null, error: { message: "insert failed" } });
      await expect(
        savingsAutomationService.createGoal("user-1", {
          name: "X",
          category: "custom",
          targetAmount: 100,
        }),
      ).rejects.toThrow("Failed to create savings goal");
    });
  });

  describe("updateGoal", () => {
    it("should update and return mapped goal with contributions", async () => {
      const goalRow = makeGoalRow({ name: "Updated Goal" });
      const contribRow = makeContributionRow();
      const sb = supabase();
      sb.from.mockImplementation((table: string) => {
        if (table === "savings_contributions") {
          return chainMock({ data: [contribRow], error: null });
        }
        return chainMock({ data: goalRow, error: null });
      });

      const result = await savingsAutomationService.updateGoal("user-1", "goal-1", {
        name: "Updated Goal",
      });
      expect(result.name).toBe("Updated Goal");
    });

    it("should throw when update fails", async () => {
      mockFrom({ data: null, error: { message: "update error" } });
      await expect(
        savingsAutomationService.updateGoal("user-1", "goal-1", { name: "X" }),
      ).rejects.toThrow("Failed to update savings goal");
    });
  });

  describe("deleteGoal", () => {
    it("should return true on success", async () => {
      mockFrom({ data: null, error: null });
      const result = await savingsAutomationService.deleteGoal("user-1", "goal-1");
      expect(result).toBe(true);
    });

    it("should return false on error", async () => {
      mockFrom({ data: null, error: { message: "err" } });
      const result = await savingsAutomationService.deleteGoal("user-1", "goal-1");
      expect(result).toBe(false);
    });
  });

  // ===== CONTRIBUTIONS =====
  describe("addContribution", () => {
    it("should create contribution and update goal amount", async () => {
      const contribRow = makeContributionRow({ amount: 200 });
      const goalRow = makeGoalRow({ current_amount: 2000 });
      const sb = supabase();
      let contribCallCount = 0;
      sb.from.mockImplementation((table: string) => {
        if (table === "savings_contributions") {
          contribCallCount++;
          if (contribCallCount === 1) {
            // insert().select().single() — returns single object
            return chainMock({ data: contribRow, error: null });
          }
          // getContributions — returns array (awaited without .single())
          return chainMock({ data: [contribRow], error: null });
        }
        // financial_goals — both getGoal and update
        return chainMock({ data: goalRow, error: null });
      });

      const input: AddContributionInput = {
        goalId: "goal-1",
        amount: 200,
        source: "manual",
        note: "Birthday money",
      };
      const result = await savingsAutomationService.addContribution("user-1", input);
      expect(result.amount).toBe(200);
      expect(result.goalId).toBe("goal-1");
    });

    it("should throw when contribution insert fails", async () => {
      mockFrom({ data: null, error: { message: "insert error" } });
      await expect(
        savingsAutomationService.addContribution("user-1", {
          goalId: "goal-1",
          amount: 100,
        }),
      ).rejects.toThrow("Failed to add contribution");
    });
  });

  describe("getContributions", () => {
    it("should return mapped contributions", async () => {
      const rows = [makeContributionRow(), makeContributionRow({ id: "contrib-2", amount: 75 })];
      const chain = mockFrom({ data: rows, error: null });

      const result = await savingsAutomationService.getContributions(
        "goal-1",
        "user-1",
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("contrib-1");
      expect(result[1].amount).toBe(75);

      // Scoping by goal_id alone was safe only because every caller happened
      // to owner-check the goal first. The service role bypasses RLS, so the
      // owner filter is what actually prevents a cross-user read here.
      expect(chain.eq).toHaveBeenCalledWith("goal_id", "goal-1");
      expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    });

    it("should return empty array on error", async () => {
      mockFrom({ data: null, error: { message: "err" } });
      const result = await savingsAutomationService.getContributions(
        "goal-1",
        "user-1",
      );
      expect(result).toEqual([]);
    });
  });

  // ===== ROUND-UP CALCULATIONS (pure, synchronous) =====
  describe("calculateRoundUp", () => {
    it("should round up to nearest $1 by default", () => {
      const result = savingsAutomationService.calculateRoundUp(4.25);
      expect(result.originalAmount).toBe(4.25);
      expect(result.roundedAmount).toBe(5);
      expect(result.roundUpAmount).toBe(0.75);
      expect(result.multipliedAmount).toBe(0.75);
    });

    it("should round up to nearest $5", () => {
      const result = savingsAutomationService.calculateRoundUp(4.25, 5);
      expect(result.roundedAmount).toBe(5);
      expect(result.roundUpAmount).toBe(0.75);
    });

    it("should round up to nearest $10", () => {
      const result = savingsAutomationService.calculateRoundUp(4.25, 10);
      expect(result.roundedAmount).toBe(10);
      expect(result.roundUpAmount).toBe(5.75);
    });

    it("should apply multiplier", () => {
      const result = savingsAutomationService.calculateRoundUp(4.25, 1, 3);
      expect(result.roundUpAmount).toBe(0.75);
      expect(result.multipliedAmount).toBe(2.25);
    });

    it("should return zero round-up for whole dollar amounts with roundUpTo=1", () => {
      const result = savingsAutomationService.calculateRoundUp(5.0, 1, 1);
      expect(result.roundUpAmount).toBe(0);
      expect(result.multipliedAmount).toBe(0);
    });

    it("should handle large amounts", () => {
      const result = savingsAutomationService.calculateRoundUp(999.01, 10);
      expect(result.roundedAmount).toBe(1000);
      expect(result.roundUpAmount).toBeCloseTo(0.99, 1);
    });
  });

  // ===== PROCESS ROUND-UP =====
  describe("processRoundUp", () => {
    it("should return null when rule is not found", async () => {
      mockFrom({ data: null, error: { message: "not found" } });
      const result = await savingsAutomationService.processRoundUp("user-1", 4.25, "rule-x");
      expect(result).toBeNull();
    });

    it("should return null when rule is not active", async () => {
      mockFrom({ data: makeRuleRow({ status: "paused" }), error: null });
      const result = await savingsAutomationService.processRoundUp("user-1", 4.25, "rule-1");
      expect(result).toBeNull();
    });

    it("should return null when rule is not round_up type", async () => {
      mockFrom({ data: makeRuleRow({ type: "fixed" }), error: null });
      const result = await savingsAutomationService.processRoundUp("user-1", 4.25, "rule-1");
      expect(result).toBeNull();
    });

    it("should return null when round-up exceeds maxPerTransaction", async () => {
      const ruleRow = makeRuleRow({
        config: { roundUpTo: 10, roundUpMultiplier: 1, maxPerTransaction: 1 },
      });
      mockFrom({ data: ruleRow, error: null });
      // Round-up of $4.25 to $10 = $5.75, which exceeds maxPerTransaction=1
      const result = await savingsAutomationService.processRoundUp("user-1", 4.25, "rule-1");
      expect(result).toBeNull();
    });
  });

  // ===== SUMMARY =====
  describe("getSummary", () => {
    it("should return a complete savings summary", async () => {
      const ruleRow = makeRuleRow({ total_saved: 500, type: "round_up", status: "active" });
      const goalRow = makeGoalRow({ status: "active" });
      const contribRow = makeContributionRow();
      const transferRow = { amount: 100 };
      const sb = supabase();
      sb.from.mockImplementation((table: string) => {
        if (table === "savings_rules") {
          return chainMock({ data: [ruleRow], error: null });
        }
        if (table === "financial_goals") {
          return chainMock({ data: [goalRow], error: null });
        }
        if (table === "savings_contributions") {
          return chainMock({ data: [contribRow], error: null });
        }
        if (table === "savings_transfers") {
          return chainMock({ data: [transferRow], error: null });
        }
        return chainMock({ data: [], error: null });
      });

      const result = await savingsAutomationService.getSummary("user-1");
      expect(result.totalSaved).toBe(500);
      expect(result.activeRules).toBe(1);
      expect(result.activeGoals).toBe(1);
      expect(result.roundUpSavings).toBe(500);
      expect(result.autoSaveSavings).toBe(0);
      expect(typeof result.projectedMonthlySavings).toBe("number");
    });
  });

  // ===== INSIGHTS =====
  describe("getInsights", () => {
    it("should recommend creating a rule when no rules exist", async () => {
      const sb = supabase();
      sb.from.mockImplementation(() => {
        return chainMock({ data: [], error: null });
      });

      const result = await savingsAutomationService.getInsights("user-1");
      const startSaving = result.find((i) => i.title === "Start Saving Automatically");
      expect(startSaving).toBeDefined();
      expect(startSaving!.type).toBe("opportunity");
      expect(startSaving!.actionable).toBe(true);
    });

    it("should recommend round-up when not enabled", async () => {
      const fixedRule = makeRuleRow({ type: "fixed", status: "active", total_saved: 0 });
      const sb = supabase();
      sb.from.mockImplementation((table: string) => {
        if (table === "savings_rules") {
          return chainMock({ data: [fixedRule], error: null });
        }
        return chainMock({ data: [], error: null });
      });

      const result = await savingsAutomationService.getInsights("user-1");
      const roundUpTip = result.find((i) => i.title === "Try Round-Up Savings");
      expect(roundUpTip).toBeDefined();
      expect(roundUpTip!.type).toBe("tip");
    });
  });

  // ===== RECOMMENDATIONS =====
  describe("getRecommendations", () => {
    it("should recommend round-up when not enabled", async () => {
      const sb = supabase();
      sb.from.mockImplementation(() => {
        return chainMock({ data: [], error: null });
      });

      const result = await savingsAutomationService.getRecommendations("user-1");
      const roundUp = result.find((r) => r.id === "rec-roundup");
      expect(roundUp).toBeDefined();
      expect(roundUp!.type).toBe("new_rule");
      expect(roundUp!.confidence).toBe(0.9);
    });

    it("should recommend percentage savings when not enabled", async () => {
      const sb = supabase();
      sb.from.mockImplementation(() => {
        return chainMock({ data: [], error: null });
      });

      const result = await savingsAutomationService.getRecommendations("user-1");
      const pct = result.find((r) => r.id === "rec-percentage");
      expect(pct).toBeDefined();
      expect(pct!.potentialSavings).toBe(300);
    });

    it("should recommend emergency fund when no such goal exists", async () => {
      const sb = supabase();
      sb.from.mockImplementation(() => {
        return chainMock({ data: [], error: null });
      });

      const result = await savingsAutomationService.getRecommendations("user-1");
      const emergency = result.find((r) => r.id === "rec-emergency");
      expect(emergency).toBeDefined();
      expect(emergency!.type).toBe("new_goal");
    });

    it("should NOT recommend round-up when already active", async () => {
      const roundUpRule = makeRuleRow({ type: "round_up", status: "active" });
      const sb = supabase();
      sb.from.mockImplementation((table: string) => {
        if (table === "savings_rules") {
          return chainMock({ data: [roundUpRule], error: null });
        }
        return chainMock({ data: [], error: null });
      });

      const result = await savingsAutomationService.getRecommendations("user-1");
      const roundUp = result.find((r) => r.id === "rec-roundup");
      expect(roundUp).toBeUndefined();
    });
  });

  // ===== DB MAPPING =====
  describe("mapRuleFromDb (via getRule)", () => {
    it("should map all fields including dates", async () => {
      const row = makeRuleRow({
        last_triggered_at: "2026-01-15T10:00:00.000Z",
      });
      mockFrom({ data: row, error: null });

      const result = await savingsAutomationService.getRule("user-1", "rule-1");
      expect(result!.lastTriggeredAt).toBeInstanceOf(Date);
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });

    it("should handle missing optional fields gracefully", async () => {
      const row = makeRuleRow({
        goal_id: null,
        source_account_id: null,
        destination_account_id: null,
        last_triggered_at: null,
        config: null,
      });
      mockFrom({ data: row, error: null });

      const result = await savingsAutomationService.getRule("user-1", "rule-1");
      expect(result!.config).toEqual({});
      expect(result!.lastTriggeredAt).toBeUndefined();
    });
  });

  describe("mapGoalFromDb (via getGoal)", () => {
    it("should calculate progress percentage correctly", async () => {
      const goalRow = makeGoalRow({ current_amount: 2500, target_amount: 5000 });
      const sb = supabase();
      sb.from.mockImplementation((table: string) => {
        if (table === "savings_contributions") {
          return chainMock({ data: [], error: null });
        }
        return chainMock({ data: goalRow, error: null });
      });

      const result = await savingsAutomationService.getGoal("user-1", "goal-1");
      expect(result!.progressPercentage).toBe(50);
    });

    it("should cap progress at 100%", async () => {
      const goalRow = makeGoalRow({ current_amount: 6000, target_amount: 5000 });
      const sb = supabase();
      sb.from.mockImplementation((table: string) => {
        if (table === "savings_contributions") {
          return chainMock({ data: [], error: null });
        }
        return chainMock({ data: goalRow, error: null });
      });

      const result = await savingsAutomationService.getGoal("user-1", "goal-1");
      expect(result!.progressPercentage).toBe(100);
    });
  });
});
