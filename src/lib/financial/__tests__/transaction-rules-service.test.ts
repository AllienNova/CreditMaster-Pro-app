/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Tests for TransactionRulesService
 *
 * DB interactions go through supabaseAdmin (mocked).
 * The service also uses supabase.rpc() for incrementing match counts.
 * Many methods (testRule, suggestRules, condition matching, action application)
 * are pure and exercise no DB calls.
 */

jest.mock("@/lib/supabase/server", () => {
  const _admin = { from: jest.fn(), rpc: jest.fn() };
  return { supabaseAdmin: _admin };
});

function sb() {
  return require("@/lib/supabase/server").supabaseAdmin;
}

/** Self-referencing chain mock */
function chainMock(result: { data: any; error: any }) {
  const mock: any = {};
  const handler = () => mock;
  mock.select = jest.fn(handler);
  mock.insert = jest.fn(handler);
  mock.update = jest.fn(handler);
  mock.delete = jest.fn(handler);
  mock.eq = jest.fn(handler);
  mock.gte = jest.fn(handler);
  mock.order = jest.fn(handler);
  mock.limit = jest.fn(handler);
  mock.single = jest.fn(() => Promise.resolve(result));
  mock.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);
  return mock;
}

import {
  transactionRulesService,
  type Transaction,
  type CreateRuleInput,
} from "@/lib/financial/transaction-rules-service";

// Helper: minimal DB row for a rule
function ruleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    user_id: "u1",
    name: "Test Rule",
    description: "A test rule",
    conditions: [{ type: "merchant_contains", value: "coffee" }],
    condition_logic: "AND",
    actions: [{ type: "set_category", value: "Food" }],
    is_active: true,
    priority: 1,
    match_count: 5,
    last_matched_at: "2026-02-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

// Helper: minimal Transaction object
function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    date: new Date("2026-02-15"),
    amount: 4.5,
    merchantName: "Starbucks Coffee",
    description: "Coffee purchase",
    category: "Food",
    accountId: "acc-1",
    tags: [],
    ...overrides,
  };
}

describe("TransactionRulesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getRules
  // ==========================================================================
  describe("getRules", () => {
    it("should return mapped rules ordered by priority", async () => {
      const rows = [ruleRow({ priority: 1 }), ruleRow({ id: "rule-2", priority: 2 })];
      sb().from.mockReturnValue(chainMock({ data: rows, error: null }));

      const result = await transactionRulesService.getRules("u1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("rule-1");
      expect(result[0].userId).toBe("u1");
      expect(result[0].conditionLogic).toBe("AND");
      expect(result[0].isActive).toBe(true);
      expect(result[0].matchCount).toBe(5);
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it("should return empty array when data is null", async () => {
      sb().from.mockReturnValue(chainMock({ data: null, error: null }));

      const result = await transactionRulesService.getRules("u1");
      expect(result).toEqual([]);
    });

    it("should throw on Supabase error", async () => {
      sb().from.mockReturnValue(
        chainMock({ data: null, error: { message: "db fail" } }),
      );

      await expect(transactionRulesService.getRules("u1")).rejects.toThrow(
        "Failed to fetch transaction rules",
      );
    });
  });

  // ==========================================================================
  // getRule
  // ==========================================================================
  describe("getRule", () => {
    it("should return a single mapped rule", async () => {
      const mock = chainMock({ data: ruleRow(), error: null });
      sb().from.mockReturnValue(mock);

      const result = await transactionRulesService.getRule("u1", "rule-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("rule-1");
      expect(result!.name).toBe("Test Rule");
      expect(result!.lastMatchedAt).toBeInstanceOf(Date);
    });

    it("should return null for PGRST116 (not found)", async () => {
      const mock = chainMock({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });
      sb().from.mockReturnValue(mock);

      const result = await transactionRulesService.getRule("u1", "missing");
      expect(result).toBeNull();
    });

    it("should throw on other Supabase errors", async () => {
      const mock = chainMock({
        data: null,
        error: { code: "OTHER", message: "db fail" },
      });
      sb().from.mockReturnValue(mock);

      await expect(
        transactionRulesService.getRule("u1", "rule-1"),
      ).rejects.toThrow("Failed to fetch rule");
    });
  });

  // ==========================================================================
  // createRule
  // ==========================================================================
  describe("createRule", () => {
    const validInput: CreateRuleInput = {
      name: "Coffee Rule",
      conditions: [{ type: "merchant_contains", value: "coffee" }],
      conditionLogic: "AND",
      actions: [{ type: "set_category", value: "Caffeine" }],
    };

    it("should create a rule with auto-assigned priority", async () => {
      // First call: select max priority -> returns priority 3
      // Second call: insert -> returns new rule
      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainMock({ data: { priority: 3 }, error: null });
        }
        return chainMock({ data: ruleRow({ priority: 4 }), error: null });
      });

      const result = await transactionRulesService.createRule("u1", validInput);

      expect(result.id).toBe("rule-1");
      expect(result.name).toBe("Test Rule");
    });

    it("should use provided priority when specified", async () => {
      sb().from.mockReturnValue(
        chainMock({ data: ruleRow({ priority: 10 }), error: null }),
      );

      const result = await transactionRulesService.createRule("u1", {
        ...validInput,
        priority: 10,
      });

      expect(result).toBeDefined();
    });

    it("should default to priority 1 when no existing rules", async () => {
      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // No existing rules, maxPriority = null
          return chainMock({ data: null, error: null });
        }
        return chainMock({ data: ruleRow({ priority: 1 }), error: null });
      });

      const result = await transactionRulesService.createRule("u1", validInput);
      expect(result).toBeDefined();
    });

    it("should throw when conditions are empty", async () => {
      await expect(
        transactionRulesService.createRule("u1", {
          ...validInput,
          conditions: [],
        }),
      ).rejects.toThrow("At least one condition is required");
    });

    it("should throw when actions are empty", async () => {
      await expect(
        transactionRulesService.createRule("u1", {
          ...validInput,
          actions: [],
        }),
      ).rejects.toThrow("At least one action is required");
    });

    it("should throw when condition is missing type", async () => {
      await expect(
        transactionRulesService.createRule("u1", {
          ...validInput,
          conditions: [{ type: "" as any, value: "test" }],
        }),
      ).rejects.toThrow("Each condition must have a type and value");
    });

    it("should throw when amount_between lacks secondaryValue", async () => {
      await expect(
        transactionRulesService.createRule("u1", {
          ...validInput,
          conditions: [{ type: "amount_between", value: 10 }],
        }),
      ).rejects.toThrow("amount_between condition requires secondaryValue");
    });

    it("should throw when action is missing value", async () => {
      await expect(
        transactionRulesService.createRule("u1", {
          ...validInput,
          actions: [{ type: "set_category", value: undefined as any }],
        }),
      ).rejects.toThrow("Each action must have a type and value");
    });

    it("should throw on Supabase insert error", async () => {
      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainMock({ data: { priority: 1 }, error: null });
        }
        return chainMock({ data: null, error: { message: "insert fail" } });
      });

      await expect(
        transactionRulesService.createRule("u1", validInput),
      ).rejects.toThrow("Failed to create rule");
    });
  });

  // ==========================================================================
  // updateRule
  // ==========================================================================
  describe("updateRule", () => {
    it("should update rule fields", async () => {
      sb().from.mockReturnValue(
        chainMock({
          data: ruleRow({ name: "Updated Rule" }),
          error: null,
        }),
      );

      const result = await transactionRulesService.updateRule("u1", "rule-1", {
        name: "Updated Rule",
      });

      expect(result.name).toBe("Updated Rule");
    });

    it("should validate conditions if provided", async () => {
      await expect(
        transactionRulesService.updateRule("u1", "rule-1", {
          conditions: [],
        }),
      ).rejects.toThrow("At least one condition is required");
    });

    it("should validate actions if provided", async () => {
      await expect(
        transactionRulesService.updateRule("u1", "rule-1", {
          actions: [],
        }),
      ).rejects.toThrow("At least one action is required");
    });

    it("should throw on Supabase update error", async () => {
      sb().from.mockReturnValue(
        chainMock({ data: null, error: { message: "update fail" } }),
      );

      await expect(
        transactionRulesService.updateRule("u1", "rule-1", { name: "X" }),
      ).rejects.toThrow("Failed to update rule");
    });
  });

  // ==========================================================================
  // deleteRule
  // ==========================================================================
  describe("deleteRule", () => {
    it("should delete without error", async () => {
      const mock = chainMock({ data: null, error: null });
      sb().from.mockReturnValue(mock);

      await expect(
        transactionRulesService.deleteRule("u1", "rule-1"),
      ).resolves.toBeUndefined();
    });

    it("should throw on Supabase delete error", async () => {
      const mock = chainMock({
        data: null,
        error: { message: "delete fail" },
      });
      sb().from.mockReturnValue(mock);

      await expect(
        transactionRulesService.deleteRule("u1", "rule-1"),
      ).rejects.toThrow("Failed to delete rule");
    });
  });

  // ==========================================================================
  // applyRules
  // ==========================================================================
  describe("applyRules", () => {
    it("should apply matching active rules and return modified transaction", async () => {
      const rules = [
        ruleRow({
          id: "rule-1",
          is_active: true,
          conditions: [{ type: "merchant_contains", value: "coffee" }],
          actions: [{ type: "set_category", value: "Beverages" }],
        }),
      ];
      sb().from.mockReturnValue(chainMock({ data: rules, error: null }));
      sb().rpc.mockResolvedValue({ data: null, error: null });

      const t = txn({ merchantName: "Starbucks Coffee" });
      const result = await transactionRulesService.applyRules("u1", t);

      expect(result.appliedRules).toContain("rule-1");
      expect(result.transaction.category).toBe("Beverages");
      // rpc should have been called to increment match count
      expect(sb().rpc).toHaveBeenCalledWith("increment_rule_match_count", {
        p_rule_id: "rule-1",
        p_user_id: "u1",
      });
    });

    it("should skip inactive rules", async () => {
      const rules = [ruleRow({ is_active: false })];
      sb().from.mockReturnValue(chainMock({ data: rules, error: null }));

      const result = await transactionRulesService.applyRules("u1", txn());

      expect(result.appliedRules).toHaveLength(0);
      expect(sb().rpc).not.toHaveBeenCalled();
    });

    it("should skip rules that don't match", async () => {
      const rules = [
        ruleRow({
          conditions: [{ type: "merchant_contains", value: "walmart" }],
        }),
      ];
      sb().from.mockReturnValue(chainMock({ data: rules, error: null }));

      const t = txn({ merchantName: "Starbucks" });
      const result = await transactionRulesService.applyRules("u1", t);

      expect(result.appliedRules).toHaveLength(0);
    });

    it("should apply multiple matching rules in priority order", async () => {
      const rules = [
        ruleRow({
          id: "rule-1",
          priority: 1,
          conditions: [{ type: "merchant_contains", value: "star" }],
          actions: [{ type: "set_category", value: "Beverages" }],
        }),
        ruleRow({
          id: "rule-2",
          priority: 2,
          conditions: [{ type: "merchant_contains", value: "star" }],
          actions: [{ type: "add_tag", value: "frequent" }],
        }),
      ];
      sb().from.mockReturnValue(chainMock({ data: rules, error: null }));
      sb().rpc.mockResolvedValue({ data: null, error: null });

      const t = txn({ merchantName: "Starbucks" });
      const result = await transactionRulesService.applyRules("u1", t);

      expect(result.appliedRules).toEqual(["rule-1", "rule-2"]);
      expect(result.transaction.category).toBe("Beverages");
      expect(result.transaction.tags).toContain("frequent");
    });
  });

  // ==========================================================================
  // testRule (pure, no DB)
  // ==========================================================================
  describe("testRule", () => {
    it("should return matching transactions", async () => {
      const rule: CreateRuleInput = {
        name: "Test",
        conditions: [{ type: "merchant_contains", value: "star" }],
        conditionLogic: "AND",
        actions: [{ type: "set_category", value: "X" }],
      };

      const transactions = [
        txn({ id: "1", merchantName: "Starbucks" }),
        txn({ id: "2", merchantName: "Walmart" }),
        txn({ id: "3", merchantName: "StarMart" }),
      ];

      const result = await transactionRulesService.testRule(rule, transactions);

      expect(result.matchCount).toBe(2);
      expect(result.matches.map((m) => m.id)).toEqual(["1", "3"]);
    });

    it("should return empty matches when no transactions match", async () => {
      const rule: CreateRuleInput = {
        name: "Test",
        conditions: [{ type: "merchant_equals", value: "nowhere" }],
        conditionLogic: "AND",
        actions: [{ type: "set_category", value: "X" }],
      };

      const result = await transactionRulesService.testRule(rule, [
        txn({ merchantName: "Starbucks" }),
      ]);

      expect(result.matchCount).toBe(0);
      expect(result.matches).toEqual([]);
    });
  });

  // ==========================================================================
  // Condition matching (tested via testRule)
  // ==========================================================================
  describe("condition matching", () => {
    async function matches(
      conditions: any[],
      logic: "AND" | "OR",
      transaction: Transaction,
    ): Promise<boolean> {
      const rule: CreateRuleInput = {
        name: "Test",
        conditions,
        conditionLogic: logic,
        actions: [{ type: "set_category", value: "X" }],
      };
      const result = await transactionRulesService.testRule(rule, [
        transaction,
      ]);
      return result.matchCount === 1;
    }

    it("merchant_contains should be case-insensitive", async () => {
      expect(
        await matches(
          [{ type: "merchant_contains", value: "STAR" }],
          "AND",
          txn({ merchantName: "starbucks" }),
        ),
      ).toBe(true);
    });

    it("merchant_equals should match exact (case-insensitive)", async () => {
      expect(
        await matches(
          [{ type: "merchant_equals", value: "starbucks coffee" }],
          "AND",
          txn({ merchantName: "Starbucks Coffee" }),
        ),
      ).toBe(true);

      expect(
        await matches(
          [{ type: "merchant_equals", value: "starbucks" }],
          "AND",
          txn({ merchantName: "Starbucks Coffee" }),
        ),
      ).toBe(false);
    });

    it("merchant_starts_with should work", async () => {
      expect(
        await matches(
          [{ type: "merchant_starts_with", value: "star" }],
          "AND",
          txn({ merchantName: "Starbucks" }),
        ),
      ).toBe(true);

      expect(
        await matches(
          [{ type: "merchant_starts_with", value: "wal" }],
          "AND",
          txn({ merchantName: "Starbucks" }),
        ),
      ).toBe(false);
    });

    it("amount_equals should match within 0.01 tolerance", async () => {
      expect(
        await matches(
          [{ type: "amount_equals", value: 4.5 }],
          "AND",
          txn({ amount: 4.5 }),
        ),
      ).toBe(true);

      expect(
        await matches(
          [{ type: "amount_equals", value: 4.509 }],
          "AND",
          txn({ amount: 4.5 }),
        ),
      ).toBe(true); // diff = 0.009 < 0.01

      expect(
        await matches(
          [{ type: "amount_equals", value: 5.0 }],
          "AND",
          txn({ amount: 4.5 }),
        ),
      ).toBe(false);
    });

    it("amount_greater_than and amount_less_than", async () => {
      expect(
        await matches(
          [{ type: "amount_greater_than", value: 4 }],
          "AND",
          txn({ amount: 4.5 }),
        ),
      ).toBe(true);

      expect(
        await matches(
          [{ type: "amount_less_than", value: 5 }],
          "AND",
          txn({ amount: 4.5 }),
        ),
      ).toBe(true);

      expect(
        await matches(
          [{ type: "amount_greater_than", value: 10 }],
          "AND",
          txn({ amount: 4.5 }),
        ),
      ).toBe(false);
    });

    it("amount_between should be inclusive", async () => {
      expect(
        await matches(
          [{ type: "amount_between", value: 4, secondaryValue: 5 }],
          "AND",
          txn({ amount: 4.5 }),
        ),
      ).toBe(true);

      expect(
        await matches(
          [{ type: "amount_between", value: 4, secondaryValue: 5 }],
          "AND",
          txn({ amount: 4 }),
        ),
      ).toBe(true); // inclusive lower

      expect(
        await matches(
          [{ type: "amount_between", value: 4, secondaryValue: 5 }],
          "AND",
          txn({ amount: 6 }),
        ),
      ).toBe(false);
    });

    it("category_equals should be case-insensitive", async () => {
      expect(
        await matches(
          [{ type: "category_equals", value: "food" }],
          "AND",
          txn({ category: "Food" }),
        ),
      ).toBe(true);
    });

    it("account_equals should match exact accountId", async () => {
      expect(
        await matches(
          [{ type: "account_equals", value: "acc-1" }],
          "AND",
          txn({ accountId: "acc-1" }),
        ),
      ).toBe(true);

      expect(
        await matches(
          [{ type: "account_equals", value: "acc-2" }],
          "AND",
          txn({ accountId: "acc-1" }),
        ),
      ).toBe(false);
    });

    it("description_contains should search in description", async () => {
      expect(
        await matches(
          [{ type: "description_contains", value: "coffee" }],
          "AND",
          txn({ description: "Coffee purchase at store" }),
        ),
      ).toBe(true);

      expect(
        await matches(
          [{ type: "description_contains", value: "tea" }],
          "AND",
          txn({ description: "Coffee purchase" }),
        ),
      ).toBe(false);
    });

    it("description_contains returns false when description is undefined", async () => {
      expect(
        await matches(
          [{ type: "description_contains", value: "anything" }],
          "AND",
          txn({ description: undefined }),
        ),
      ).toBe(false);
    });

    it("date_range always returns true (not fully implemented)", async () => {
      expect(
        await matches(
          [{ type: "date_range", value: "2026-01-01" }],
          "AND",
          txn(),
        ),
      ).toBe(true);
    });

    it("AND logic requires all conditions to match", async () => {
      expect(
        await matches(
          [
            { type: "merchant_contains", value: "star" },
            { type: "amount_greater_than", value: 100 },
          ],
          "AND",
          txn({ merchantName: "Starbucks", amount: 4.5 }),
        ),
      ).toBe(false); // merchant matches but amount doesn't
    });

    it("OR logic requires at least one condition to match", async () => {
      expect(
        await matches(
          [
            { type: "merchant_contains", value: "star" },
            { type: "amount_greater_than", value: 100 },
          ],
          "OR",
          txn({ merchantName: "Starbucks", amount: 4.5 }),
        ),
      ).toBe(true); // merchant matches
    });

    it("empty conditions array returns false", async () => {
      // We can't use testRule for empty conditions because createRule validates,
      // but testRule doesn't validate. Let's test directly.
      const rule: CreateRuleInput = {
        name: "Test",
        conditions: [],
        conditionLogic: "AND",
        actions: [{ type: "set_category", value: "X" }],
      };
      const result = await transactionRulesService.testRule(rule, [txn()]);
      expect(result.matchCount).toBe(0);
    });
  });

  // ==========================================================================
  // Action application (tested via applyRules)
  // ==========================================================================
  describe("action application", () => {
    function setupRuleForActions(actions: any[]) {
      const rules = [
        ruleRow({
          conditions: [{ type: "merchant_contains", value: "star" }],
          actions,
        }),
      ];
      sb().from.mockReturnValue(chainMock({ data: rules, error: null }));
      sb().rpc.mockResolvedValue({ data: null, error: null });
    }

    it("set_category should update category", async () => {
      setupRuleForActions([{ type: "set_category", value: "Beverages" }]);

      const result = await transactionRulesService.applyRules(
        "u1",
        txn({ merchantName: "Starbucks", category: "Other" }),
      );
      expect(result.transaction.category).toBe("Beverages");
    });

    it("add_tag should append a tag", async () => {
      setupRuleForActions([{ type: "add_tag", value: "coffee" }]);

      const result = await transactionRulesService.applyRules(
        "u1",
        txn({ merchantName: "Starbucks", tags: ["existing"] }),
      );
      expect(result.transaction.tags).toEqual(["existing", "coffee"]);
    });

    it("remove_tag should remove a specific tag", async () => {
      setupRuleForActions([{ type: "remove_tag", value: "unwanted" }]);

      const result = await transactionRulesService.applyRules(
        "u1",
        txn({ merchantName: "Starbucks", tags: ["keep", "unwanted"] }),
      );
      expect(result.transaction.tags).toEqual(["keep"]);
    });

    it("mark_tax_deductible should set the flag", async () => {
      setupRuleForActions([{ type: "mark_tax_deductible", value: true }]);

      const result = await transactionRulesService.applyRules(
        "u1",
        txn({ merchantName: "Starbucks", isTaxDeductible: false }),
      );
      expect(result.transaction.isTaxDeductible).toBe(true);
    });

    it("rename_merchant should change merchantName", async () => {
      setupRuleForActions([{ type: "rename_merchant", value: "Starbucks Corp" }]);

      const result = await transactionRulesService.applyRules(
        "u1",
        txn({ merchantName: "Starbucks Coffee" }),
      );
      expect(result.transaction.merchantName).toBe("Starbucks Corp");
    });

    it("set_note should set note field", async () => {
      setupRuleForActions([{ type: "set_note", value: "Regular purchase" }]);

      const result = await transactionRulesService.applyRules(
        "u1",
        txn({ merchantName: "Starbucks" }),
      );
      expect(result.transaction.note).toBe("Regular purchase");
    });
  });

  // ==========================================================================
  // suggestRules (pure, no DB)
  // ==========================================================================
  describe("suggestRules", () => {
    it("should suggest category rule for merchant with inconsistent categories", async () => {
      const transactions = [
        txn({ id: "1", merchantName: "Walmart", category: "Groceries" }),
        txn({ id: "2", merchantName: "Walmart", category: "Groceries" }),
        txn({ id: "3", merchantName: "Walmart", category: "Shopping" }),
      ];

      const suggestions =
        await transactionRulesService.suggestRules(transactions);

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      const catSuggestion = suggestions.find((s) =>
        s.name.includes("Walmart"),
      );
      expect(catSuggestion).toBeDefined();
      expect(catSuggestion!.actions[0].type).toBe("set_category");
      expect(catSuggestion!.actions[0].value).toBe("Groceries"); // most common
      expect(catSuggestion!.confidence).toBeCloseTo(2 / 3);
    });

    it("should suggest recurring payment tag for same merchant + same amount", async () => {
      const transactions = [
        txn({
          id: "1",
          merchantName: "Netflix",
          amount: 15.99,
          category: undefined,
        }),
        txn({
          id: "2",
          merchantName: "Netflix",
          amount: 15.99,
          category: undefined,
        }),
      ];

      const suggestions =
        await transactionRulesService.suggestRules(transactions);

      const recurSuggestion = suggestions.find((s) =>
        s.name.includes("Recurring"),
      );
      expect(recurSuggestion).toBeDefined();
      expect(recurSuggestion!.actions[0].value).toBe("recurring");
      expect(recurSuggestion!.confidence).toBe(0.9);
    });

    it("should not suggest for merchants with < 3 transactions (category rule)", async () => {
      const transactions = [
        txn({ id: "1", merchantName: "OneOff", category: "A" }),
        txn({ id: "2", merchantName: "OneOff", category: "B" }),
      ];

      const suggestions =
        await transactionRulesService.suggestRules(transactions);

      const catSuggestion = suggestions.find((s) =>
        s.name.includes("OneOff"),
      );
      expect(catSuggestion).toBeUndefined();
    });

    it("should not suggest category rule when all categories are consistent", async () => {
      const transactions = [
        txn({ id: "1", merchantName: "Consistent", category: "Food" }),
        txn({ id: "2", merchantName: "Consistent", category: "Food" }),
        txn({ id: "3", merchantName: "Consistent", category: "Food" }),
      ];

      const suggestions =
        await transactionRulesService.suggestRules(transactions);

      // Only 1 unique category, so categories.size is NOT > 1
      const catSuggestion = suggestions.find((s) =>
        s.name.includes("Consistent"),
      );
      expect(catSuggestion).toBeUndefined();
    });

    it("should sort suggestions by confidence descending", async () => {
      const transactions = [
        // Merchant with 50% confidence
        txn({ id: "1", merchantName: "Mixed", category: "A" }),
        txn({ id: "2", merchantName: "Mixed", category: "A" }),
        txn({ id: "3", merchantName: "Mixed", category: "B" }),
        txn({ id: "4", merchantName: "Mixed", category: "B" }),
        // Recurring with 90% confidence
        txn({
          id: "5",
          merchantName: "Sub",
          amount: 9.99,
          category: undefined,
        }),
        txn({
          id: "6",
          merchantName: "Sub",
          amount: 9.99,
          category: undefined,
        }),
      ];

      const suggestions =
        await transactionRulesService.suggestRules(transactions);

      if (suggestions.length >= 2) {
        expect(suggestions[0].confidence).toBeGreaterThanOrEqual(
          suggestions[1].confidence,
        );
      }
    });

    it("should return empty array for no transactions", async () => {
      const suggestions = await transactionRulesService.suggestRules([]);
      expect(suggestions).toEqual([]);
    });

    it("should skip negative amounts for recurring payment detection", async () => {
      const transactions = [
        txn({ merchantName: "Refund Co", amount: -15.99, category: undefined }),
        txn({ merchantName: "Refund Co", amount: -15.99, category: undefined }),
      ];

      const suggestions =
        await transactionRulesService.suggestRules(transactions);

      const recurSuggestion = suggestions.find((s) =>
        s.name.includes("Recurring"),
      );
      expect(recurSuggestion).toBeUndefined();
    });
  });

  // ==========================================================================
  // reorderRules
  // ==========================================================================
  describe("reorderRules", () => {
    it("should update priorities for each rule in order", async () => {
      const mock = chainMock({ data: null, error: null });
      sb().from.mockReturnValue(mock);

      await transactionRulesService.reorderRules("u1", [
        "rule-a",
        "rule-b",
        "rule-c",
      ]);

      // from() called 3 times
      expect(sb().from).toHaveBeenCalledTimes(3);
      // Each call should update with correct priority index
      expect(mock.update).toHaveBeenCalledTimes(3);
    });

    it("should handle empty ruleIds array", async () => {
      await transactionRulesService.reorderRules("u1", []);

      expect(sb().from).not.toHaveBeenCalled();
    });
  });
});
