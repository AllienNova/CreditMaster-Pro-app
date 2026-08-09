/**
 * @jest-environment node
 */

/**
 * Auto-Save Rules Service Unit Tests
 *
 * Comprehensive tests for rule CRUD, transfer management,
 * rule evaluation logic (round-up, percentage, windfall),
 * scheduled rule evaluation, and analytics/summary.
 */

// ---------------------------------------------------------------------------
// Mock Setup — must come before imports
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockCreateClient = jest.fn(() => ({
  from: mockFrom,
  rpc: mockRpc,
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

import { AutoSaveRulesService } from "../auto-save-rules-service";
import type { AutoSaveRule } from "../auto-save-rules-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_URL = "https://test.supabase.co";
const TEST_KEY = "test-key";
const FIXED_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const NOW_ISO = "2026-02-23T12:00:00.000Z";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDbRule(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    user_id: "user-1",
    name: "Round-up rule",
    description: "Round up to nearest dollar",
    type: "round_up",
    status: "active",
    source_account_id: "acct-src",
    destination_account_id: "acct-dst",
    destination_goal_id: null,
    config: { type: "round_up", roundTo: 1, multiplier: 1 },
    trigger_type: "transaction",
    trigger_conditions: null,
    min_transfer_amount: null,
    max_transfer_amount: null,
    monthly_limit: null,
    total_saved: 0,
    transfer_count: 0,
    last_triggered: null,
    priority: 1,
    tags: ["savings"],
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...overrides,
  };
}

function makeDbTransfer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    rule_id: "rule-1",
    user_id: "user-1",
    amount: 0.50,
    source_account_id: "acct-src",
    destination_account_id: "acct-dst",
    trigger_transaction_id: "txn-1",
    status: "pending",
    failure_reason: null,
    scheduled_date: NOW_ISO,
    executed_date: null,
    created_at: NOW_ISO,
    ...overrides,
  };
}

/**
 * Build a fluent chain mock for `supabase.from(table)` calls.
 *
 * Because jest resets mocks between tests (resetMocks: true),
 * every test must call this or set up its own chain.
 */
function setupChain(opts: {
  selectResult?: { data: unknown; error: unknown };
  insertResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
  deleteResult?: { data: unknown; error: unknown };
}) {
  const singleResolve = (result: { data: unknown; error: unknown }) =>
    jest.fn().mockResolvedValue(result);

  const chain: Record<string, jest.Mock> = {};

  // select chain: .select() -> .eq() -> .single() or .order() -> .limit()
  if (opts.selectResult) {
    const eqMock: jest.Mock = jest.fn().mockImplementation(() => ({
      eq: eqMock,
      single: singleResolve(opts.selectResult!),
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(opts.selectResult!),
        // direct resolve (no limit)
        then: (opts.selectResult! as unknown as PromiseLike<unknown>)?.then ?? undefined,
        ...opts.selectResult!,
      }),
      gte: jest.fn().mockResolvedValue(opts.selectResult!),
      // direct resolve for queries that end with eq
      then: undefined,
    }));

    chain.select = jest.fn().mockReturnValue({
      eq: eqMock,
      single: singleResolve(opts.selectResult),
      gte: jest.fn().mockResolvedValue(opts.selectResult),
    });
  }

  if (opts.insertResult) {
    chain.insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: singleResolve(opts.insertResult),
      }),
    });
  }

  if (opts.updateResult) {
    const eqMock: jest.Mock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: singleResolve(opts.updateResult),
      }),
    });
    chain.update = jest.fn().mockReturnValue({
      eq: eqMock,
    });
  }

  if (opts.deleteResult) {
    chain.delete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue(opts.deleteResult),
    });
  }

  mockFrom.mockReturnValue(chain);
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AutoSaveRulesService", () => {
  let service: AutoSaveRulesService;

  beforeEach(() => {
    // Re-set mockCreateClient implementation (resetMocks strips it each test)
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    } as any);
    service = new AutoSaveRulesService(TEST_URL, TEST_KEY);
    jest.spyOn(crypto, "randomUUID").mockReturnValue(FIXED_UUID);
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe("constructor", () => {
    it("calls createClient with the provided url and key", () => {
      expect(mockCreateClient).toHaveBeenCalledWith(TEST_URL, TEST_KEY);
    });
  });

  // =========================================================================
  // createRule
  // =========================================================================

  describe("createRule", () => {
    const ruleInput: Omit<
      AutoSaveRule,
      "id" | "totalSaved" | "transferCount" | "createdAt" | "updatedAt"
    > = {
      userId: "user-1",
      name: "Round-up rule",
      type: "round_up",
      status: "active",
      sourceAccountId: "acct-src",
      destinationAccountId: "acct-dst",
      config: { type: "round_up", roundTo: 1, multiplier: 1 },
      triggerType: "transaction",
      priority: 1,
      tags: ["savings"],
    };

    it("inserts a new rule and returns the mapped result", async () => {
      const dbRow = makeDbRule();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.createRule(ruleInput);

      expect(result.id).toBe(FIXED_UUID);
      expect(result.userId).toBe("user-1");
      expect(result.name).toBe("Round-up rule");
      expect(result.totalSaved).toBe(0);
      expect(result.transferCount).toBe(0);
      expect(mockFrom).toHaveBeenCalledWith("auto_save_rules");
    });

    it("throws when supabase returns an error", async () => {
      setupChain({
        insertResult: { data: null, error: { message: "Insert failed" } },
      });

      await expect(service.createRule(ruleInput)).rejects.toEqual({
        message: "Insert failed",
      });
    });

    it("assigns a crypto.randomUUID id to the new rule", async () => {
      const dbRow = makeDbRule();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.createRule(ruleInput);
      expect(result.id).toBe(FIXED_UUID);
    });

    it("initializes totalSaved and transferCount to zero", async () => {
      const dbRow = makeDbRule({ total_saved: 0, transfer_count: 0 });
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.createRule(ruleInput);
      expect(result.totalSaved).toBe(0);
      expect(result.transferCount).toBe(0);
    });
  });

  // =========================================================================
  // updateRule
  // =========================================================================

  describe("updateRule", () => {
    it("updates a rule and returns the mapped result", async () => {
      const dbRow = makeDbRule({ name: "Updated" });
      setupChain({ updateResult: { data: dbRow, error: null } });

      const result = await service.updateRule("rule-1", { name: "Updated" });
      expect(result.name).toBe("Updated");
      expect(mockFrom).toHaveBeenCalledWith("auto_save_rules");
    });

    it("throws when supabase returns an error", async () => {
      setupChain({
        updateResult: { data: null, error: { message: "Update failed" } },
      });

      await expect(
        service.updateRule("rule-1", { name: "fail" }),
      ).rejects.toEqual({ message: "Update failed" });
    });
  });

  // =========================================================================
  // toggleRuleStatus
  // =========================================================================

  describe("toggleRuleStatus", () => {
    it("delegates to updateRule with the given status", async () => {
      const dbRow = makeDbRule({ status: "paused" });
      setupChain({ updateResult: { data: dbRow, error: null } });

      const result = await service.toggleRuleStatus("rule-1", "paused");
      expect(result.status).toBe("paused");
    });

    it("can set status to disabled", async () => {
      const dbRow = makeDbRule({ status: "disabled" });
      setupChain({ updateResult: { data: dbRow, error: null } });

      const result = await service.toggleRuleStatus("rule-1", "disabled");
      expect(result.status).toBe("disabled");
    });
  });

  // =========================================================================
  // deleteRule
  // =========================================================================

  describe("deleteRule", () => {
    it("deletes a rule by id", async () => {
      setupChain({ deleteResult: { data: null, error: null } });

      await expect(service.deleteRule("rule-1")).resolves.toBeUndefined();
      expect(mockFrom).toHaveBeenCalledWith("auto_save_rules");
    });

    it("throws when supabase returns an error", async () => {
      setupChain({
        deleteResult: { data: null, error: { message: "Delete failed" } },
      });

      await expect(service.deleteRule("rule-1")).rejects.toEqual({
        message: "Delete failed",
      });
    });
  });

  // =========================================================================
  // getRule
  // =========================================================================

  describe("getRule", () => {
    it("returns a mapped rule when found", async () => {
      const dbRow = makeDbRule();
      setupChain({ selectResult: { data: dbRow, error: null } });

      const result = await service.getRule(FIXED_UUID);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(FIXED_UUID);
      expect(result!.userId).toBe("user-1");
    });

    it("returns null when no data is found", async () => {
      setupChain({ selectResult: { data: null, error: null } });

      const result = await service.getRule("nonexistent");
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // getUserRules
  // =========================================================================

  describe("getUserRules", () => {
    it("returns all rules for a user", async () => {
      const rows = [makeDbRule(), makeDbRule({ id: "rule-2", name: "Second" })];

      // getUserRules uses: .from().select().eq().order() then optionally .eq() then awaits
      const orderMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock, eq: jest.fn().mockResolvedValue({ data: rows, error: null }) });
      const selectMock = jest.fn().mockReturnValue({ eq: eqUserMock });
      mockFrom.mockReturnValue({ select: selectMock });

      const result = await service.getUserRules("user-1");
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Round-up rule");
    });

    it("filters by status when provided", async () => {
      const rows = [makeDbRule({ status: "active" })];

      const eqStatusMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqStatusMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqUserMock });
      mockFrom.mockReturnValue({ select: selectMock });

      const result = await service.getUserRules("user-1", "active");
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("active");
    });

    it("throws on supabase error", async () => {
      const orderMock = jest.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ select: selectMock });

      await expect(service.getUserRules("user-1")).rejects.toEqual({
        message: "Query failed",
      });
    });

    it("returns empty array when no rules exist", async () => {
      const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ select: selectMock });

      const result = await service.getUserRules("user-1");
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // evaluateTransaction — round-up rules
  // =========================================================================

  describe("evaluateTransaction", () => {
    function setupGetUserRulesAndTransferInsert(
      rules: Record<string, unknown>[],
      transferDbRow: Record<string, unknown> = makeDbTransfer(),
      monthlyTransferData: Record<string, unknown>[] = [],
    ) {
      // We need mockFrom to handle two tables: auto_save_rules and save_transfers
      mockFrom.mockImplementation((table: string) => {
        if (table === "auto_save_rules") {
          // getUserRules chain: .select("*").eq("user_id", userId).order("priority", {...})
          // If status is passed: .order(...).eq("status", status) -> await
          const eqStatusMock = jest.fn().mockResolvedValue({ data: rules, error: null });
          const orderMock = jest.fn().mockReturnValue({
            eq: eqStatusMock,
            then: (resolve: (v: unknown) => unknown) => resolve({ data: rules, error: null }),
          });
          const eqUserMock = jest.fn().mockReturnValue({
            order: orderMock,
          });
          return { select: jest.fn().mockReturnValue({ eq: eqUserMock }) };
        }
        if (table === "save_transfers") {
          // Used for both createTransfer (insert) and getMonthlyTotalForRule (select)
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: transferDbRow,
                  error: null,
                }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({
                    data: monthlyTransferData,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });
    }

    it("creates a transfer for a round-up rule that matches", async () => {
      const roundUpRule = makeDbRule({
        trigger_type: "transaction",
        config: { type: "round_up", roundTo: 1, multiplier: 1 },
        status: "active",
      });

      setupGetUserRulesAndTransferInsert([roundUpRule]);

      // $4.50 transaction → rounds to $5 → $0.50 round-up
      const transfers = await service.evaluateTransaction("user-1", "txn-1", 4.5, "groceries");
      expect(transfers).toHaveLength(1);
      expect(transfers[0].id).toBe(FIXED_UUID);
    });

    it("skips rules with non-transaction trigger type", async () => {
      const scheduleRule = makeDbRule({
        trigger_type: "schedule",
        config: { type: "fixed_amount", amount: 50, frequency: "daily" },
        status: "active",
      });

      setupGetUserRulesAndTransferInsert([scheduleRule]);

      const transfers = await service.evaluateTransaction("user-1", "txn-1", 4.5, "groceries");
      expect(transfers).toHaveLength(0);
    });

    it("skips round-up when category is excluded", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: {
          type: "round_up",
          roundTo: 1,
          multiplier: 1,
          excludeCategories: ["groceries"],
        },
        status: "active",
      });

      setupGetUserRulesAndTransferInsert([rule]);

      const transfers = await service.evaluateTransaction("user-1", "txn-1", 4.5, "groceries");
      expect(transfers).toHaveLength(0);
    });

    it("skips round-up when include categories do not match", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: {
          type: "round_up",
          roundTo: 1,
          multiplier: 1,
          includeCategories: ["dining"],
        },
        status: "active",
      });

      setupGetUserRulesAndTransferInsert([rule]);

      const transfers = await service.evaluateTransaction("user-1", "txn-1", 4.5, "groceries");
      expect(transfers).toHaveLength(0);
    });

    it("applies multiplier to round-up amount", async () => {
      // $4.50 rounds to $5 → $0.50 * 3 = $1.50
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: { type: "round_up", roundTo: 1, multiplier: 3 },
        status: "active",
      });

      const transferRow = makeDbTransfer({ amount: 1.5 });
      setupGetUserRulesAndTransferInsert([rule], transferRow);

      const transfers = await service.evaluateTransaction("user-1", "txn-1", 4.5, "groceries");
      expect(transfers).toHaveLength(1);
    });

    it("returns zero transfer amount when transaction is exactly round number", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: { type: "round_up", roundTo: 1, multiplier: 1 },
        status: "active",
      });

      setupGetUserRulesAndTransferInsert([rule]);

      // $5.00 rounds to $5 → $0 round-up → skipped
      const transfers = await service.evaluateTransaction("user-1", "txn-1", 5.0, "groceries");
      expect(transfers).toHaveLength(0);
    });

    // percentage rules
    it("creates transfer for percentage-based rule on transaction", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: { type: "percentage", percentage: 10, basedOn: "transaction" },
        status: "active",
      });

      const transferRow = makeDbTransfer({ amount: 10 });
      setupGetUserRulesAndTransferInsert([rule], transferRow);

      // 10% of $100 = $10
      const transfers = await service.evaluateTransaction("user-1", "txn-1", 100, "groceries");
      expect(transfers).toHaveLength(1);
    });

    it("creates transfer for percentage rule based on category_spending matching category", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: {
          type: "percentage",
          percentage: 5,
          basedOn: "category_spending",
          category: "dining",
        },
        status: "active",
      });

      const transferRow = makeDbTransfer({ amount: 2.5 });
      setupGetUserRulesAndTransferInsert([rule], transferRow);

      const transfers = await service.evaluateTransaction("user-1", "txn-1", 50, "dining");
      expect(transfers).toHaveLength(1);
    });

    it("skips percentage category_spending rule when category does not match", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: {
          type: "percentage",
          percentage: 5,
          basedOn: "category_spending",
          category: "dining",
        },
        status: "active",
      });

      setupGetUserRulesAndTransferInsert([rule]);

      const transfers = await service.evaluateTransaction("user-1", "txn-1", 50, "groceries");
      expect(transfers).toHaveLength(0);
    });

    it("skips percentage income-based rule for transaction trigger", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: { type: "percentage", percentage: 10, basedOn: "income" },
        status: "active",
      });

      setupGetUserRulesAndTransferInsert([rule]);

      const transfers = await service.evaluateTransaction("user-1", "txn-1", 100, "groceries");
      expect(transfers).toHaveLength(0);
    });

    // windfall rules
    it("creates transfer for windfall capture rule when conditions match", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: {
          type: "windfall_capture",
          minAmount: 500,
          capturePercentage: 20,
          windfallCategories: ["bonus"],
        },
        status: "active",
      });

      const transferRow = makeDbTransfer({ amount: 200 });
      setupGetUserRulesAndTransferInsert([rule], transferRow);

      // $1000 bonus → 20% = $200
      const transfers = await service.evaluateTransaction("user-1", "txn-1", 1000, "bonus");
      expect(transfers).toHaveLength(1);
    });

    it("skips windfall rule when amount below minimum", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: {
          type: "windfall_capture",
          minAmount: 500,
          capturePercentage: 20,
          windfallCategories: ["bonus"],
        },
        status: "active",
      });

      setupGetUserRulesAndTransferInsert([rule]);

      const transfers = await service.evaluateTransaction("user-1", "txn-1", 100, "bonus");
      expect(transfers).toHaveLength(0);
    });

    it("skips windfall rule when category does not match", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: {
          type: "windfall_capture",
          minAmount: 100,
          capturePercentage: 20,
          windfallCategories: ["bonus"],
        },
        status: "active",
      });

      setupGetUserRulesAndTransferInsert([rule]);

      const transfers = await service.evaluateTransaction("user-1", "txn-1", 1000, "groceries");
      expect(transfers).toHaveLength(0);
    });

    // min/max transfer limits
    it("skips transfer when amount below minTransferAmount", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: { type: "round_up", roundTo: 1, multiplier: 1 },
        status: "active",
        min_transfer_amount: 1.00,
      });

      setupGetUserRulesAndTransferInsert([rule]);

      // $4.50 → $0.50 round-up < $1.00 min
      const transfers = await service.evaluateTransaction("user-1", "txn-1", 4.5, "groceries");
      expect(transfers).toHaveLength(0);
    });

    it("skips transfer when amount exceeds maxTransferAmount", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: { type: "percentage", percentage: 50, basedOn: "transaction" },
        status: "active",
        max_transfer_amount: 10,
      });

      setupGetUserRulesAndTransferInsert([rule]);

      // 50% of $100 = $50 > $10 max
      const transfers = await service.evaluateTransaction("user-1", "txn-1", 100, "groceries");
      expect(transfers).toHaveLength(0);
    });

    it("skips transfer when monthly limit would be exceeded", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: { type: "percentage", percentage: 10, basedOn: "transaction" },
        status: "active",
        monthly_limit: 50,
      });

      // Already saved $45 this month
      setupGetUserRulesAndTransferInsert(
        [rule],
        makeDbTransfer(),
        [{ amount: 45 }],
      );

      // 10% of $100 = $10, but $45 + $10 = $55 > $50 limit
      const transfers = await service.evaluateTransaction("user-1", "txn-1", 100, "groceries");
      expect(transfers).toHaveLength(0);
    });
  });

  // =========================================================================
  // evaluateScheduledRules
  // =========================================================================

  describe("evaluateScheduledRules", () => {
    function setupScheduleTest(
      rules: Record<string, unknown>[],
      transferDbRow: Record<string, unknown> = makeDbTransfer(),
    ) {
      mockFrom.mockImplementation((table: string) => {
        if (table === "auto_save_rules") {
          const eqStatusMock = jest.fn().mockResolvedValue({ data: rules, error: null });
          const orderMock = jest.fn().mockReturnValue({
            eq: eqStatusMock,
            then: (resolve: (v: unknown) => unknown) => resolve({ data: rules, error: null }),
          });
          const eqUserMock = jest.fn().mockReturnValue({
            order: orderMock,
          });
          return { select: jest.fn().mockReturnValue({ eq: eqUserMock }) };
        }
        if (table === "save_transfers") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: transferDbRow,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });
    }

    it("creates transfer for daily fixed_amount schedule rule", async () => {
      const rule = makeDbRule({
        trigger_type: "schedule",
        config: { type: "fixed_amount", amount: 25, frequency: "daily" },
        status: "active",
      });

      setupScheduleTest([rule]);

      const transfers = await service.evaluateScheduledRules("user-1");
      expect(transfers).toHaveLength(1);
    });

    it("skips non-schedule rules", async () => {
      const rule = makeDbRule({
        trigger_type: "transaction",
        config: { type: "round_up", roundTo: 1, multiplier: 1 },
        status: "active",
      });

      setupScheduleTest([rule]);

      const transfers = await service.evaluateScheduledRules("user-1");
      expect(transfers).toHaveLength(0);
    });

    it("handles surplus_sweep rules without creating transfers (framework only)", async () => {
      const now = new Date();
      const rule = makeDbRule({
        trigger_type: "schedule",
        config: {
          type: "surplus_sweep",
          targetBalance: 1000,
          sweepPercentage: 50,
          sweepDay: now.getDate(), // today
        },
        status: "active",
      });

      setupScheduleTest([rule]);

      const transfers = await service.evaluateScheduledRules("user-1");
      // surplus_sweep doesn't create transfers yet (framework only)
      expect(transfers).toHaveLength(0);
    });
  });

  // =========================================================================
  // createTransfer
  // =========================================================================

  describe("createTransfer", () => {
    it("creates a transfer and returns the mapped result", async () => {
      const dbRow = makeDbTransfer();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.createTransfer({
        ruleId: "rule-1",
        userId: "user-1",
        amount: 0.5,
        sourceAccountId: "acct-src",
        destinationAccountId: "acct-dst",
        triggerTransactionId: "txn-1",
        status: "pending",
        scheduledDate: new Date(NOW_ISO),
      });

      expect(result.id).toBe(FIXED_UUID);
      expect(result.ruleId).toBe("rule-1");
      expect(result.status).toBe("pending");
      expect(mockFrom).toHaveBeenCalledWith("save_transfers");
    });

    it("throws when supabase returns an error", async () => {
      setupChain({
        insertResult: { data: null, error: { message: "Insert failed" } },
      });

      await expect(
        service.createTransfer({
          ruleId: "rule-1",
          userId: "user-1",
          amount: 0.5,
          sourceAccountId: "acct-src",
          destinationAccountId: "acct-dst",
          status: "pending",
          scheduledDate: new Date(),
        }),
      ).rejects.toEqual({ message: "Insert failed" });
    });
  });

  // =========================================================================
  // executeTransfer
  // =========================================================================

  describe("executeTransfer", () => {
    it("marks transfer as completed and updates rule stats", async () => {
      const pendingTransfer = makeDbTransfer({ status: "pending" });
      const completedTransfer = makeDbTransfer({
        status: "completed",
        executed_date: NOW_ISO,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "save_transfers") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: pendingTransfer,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: completedTransfer,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockRpc.mockResolvedValue({ error: null });

      const result = await service.executeTransfer(FIXED_UUID);
      expect(result.status).toBe("completed");
      expect(mockRpc).toHaveBeenCalledWith("increment_rule_stats", {
        rule_id: pendingTransfer.rule_id,
        amount: pendingTransfer.amount,
      });
    });

    it("throws when transfer is not found", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      await expect(service.executeTransfer("nonexistent")).rejects.toThrow(
        "Transfer not found",
      );
    });

    it("throws when update fails", async () => {
      const pendingTransfer = makeDbTransfer({ status: "pending" });

      mockFrom.mockImplementation((table: string) => {
        if (table === "save_transfers") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: pendingTransfer,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Update failed" },
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(service.executeTransfer(FIXED_UUID)).rejects.toEqual({
        message: "Update failed",
      });
    });
  });

  // =========================================================================
  // getTransferHistory
  // =========================================================================

  describe("getTransferHistory", () => {
    it("returns mapped transfer history", async () => {
      const rows = [makeDbTransfer(), makeDbTransfer({ id: "transfer-2" })];

      const limitMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ select: selectMock });

      const result = await service.getTransferHistory("user-1");
      expect(result).toHaveLength(2);
      expect(mockFrom).toHaveBeenCalledWith("save_transfers");
    });

    it("uses default limit of 50", async () => {
      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ select: selectMock });

      await service.getTransferHistory("user-1");
      expect(limitMock).toHaveBeenCalledWith(50);
    });

    it("accepts a custom limit", async () => {
      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ select: selectMock });

      await service.getTransferHistory("user-1", 10);
      expect(limitMock).toHaveBeenCalledWith(10);
    });

    it("throws on supabase error", async () => {
      const limitMock = jest.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ select: selectMock });

      await expect(service.getTransferHistory("user-1")).rejects.toEqual({
        message: "Query failed",
      });
    });
  });

  // =========================================================================
  // getRuleSummary
  // =========================================================================

  describe("getRuleSummary", () => {
    it("returns a complete summary with active/inactive rules", async () => {
      const rules = [
        makeDbRule({ name: "Active Rule", status: "active", total_saved: 100, config: { type: "fixed_amount", amount: 50, frequency: "monthly" } }),
        makeDbRule({ id: "r2", name: "Paused Rule", status: "paused", total_saved: 50, config: { type: "round_up", roundTo: 1, multiplier: 1 } }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "auto_save_rules") {
          const orderMock = jest.fn().mockResolvedValue({ data: rules, error: null });
          const eqMock = jest.fn().mockReturnValue({ order: orderMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        if (table === "save_transfers") {
          const gteMock = jest.fn().mockResolvedValue({ data: [{ amount: 25 }], error: null });
          const eqStatusMock = jest.fn().mockReturnValue({ gte: gteMock });
          const eqUserMock = jest.fn().mockReturnValue({ eq: eqStatusMock });
          return { select: jest.fn().mockReturnValue({ eq: eqUserMock }) };
        }
        return {};
      });

      const summary = await service.getRuleSummary("user-1");
      expect(summary.totalRules).toBe(2);
      expect(summary.activeRules).toBe(1);
      expect(summary.totalSavedThisMonth).toBe(25);
      expect(summary.totalSavedAllTime).toBe(150);
      expect(summary.topPerformingRule).toEqual({ name: "Active Rule", amount: 100 });
    });

    it("returns zero projected savings when no active rules", async () => {
      const rules = [
        makeDbRule({ status: "paused", total_saved: 50, config: { type: "round_up", roundTo: 1, multiplier: 1 } }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "auto_save_rules") {
          const orderMock = jest.fn().mockResolvedValue({ data: rules, error: null });
          const eqMock = jest.fn().mockReturnValue({ order: orderMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        if (table === "save_transfers") {
          const gteMock = jest.fn().mockResolvedValue({ data: [], error: null });
          const eqStatusMock = jest.fn().mockReturnValue({ gte: gteMock });
          const eqUserMock = jest.fn().mockReturnValue({ eq: eqStatusMock });
          return { select: jest.fn().mockReturnValue({ eq: eqUserMock }) };
        }
        return {};
      });

      const summary = await service.getRuleSummary("user-1");
      expect(summary.projectedMonthlySavings).toBe(0);
    });

    it("handles undefined top performing rule when no rules exist", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "auto_save_rules") {
          const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
          const eqMock = jest.fn().mockReturnValue({ order: orderMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        if (table === "save_transfers") {
          const gteMock = jest.fn().mockResolvedValue({ data: [], error: null });
          const eqStatusMock = jest.fn().mockReturnValue({ gte: gteMock });
          const eqUserMock = jest.fn().mockReturnValue({ eq: eqStatusMock });
          return { select: jest.fn().mockReturnValue({ eq: eqUserMock }) };
        }
        return {};
      });

      const summary = await service.getRuleSummary("user-1");
      expect(summary.topPerformingRule).toBeUndefined();
      expect(summary.totalRules).toBe(0);
    });
  });
});
