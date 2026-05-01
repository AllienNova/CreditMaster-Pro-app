import type { CreditAction } from "../types";

// Build mock infrastructure inside jest.mock factory (hoisted by babel).
// We expose the fns via a shared holder that tests can reference.
const holder: Record<string, jest.Mock> = {};

jest.mock("@/lib/supabase/server", () => {
  const fns: Record<string, jest.Mock> = {};
  const names = [
    "select",
    "eq",
    "single",
    "insert",
    "update",
    "order",
    "range",
    "gte",
    "gt",
    "rpc",
    "from",
  ];
  for (const n of names) {
    fns[n] = jest.fn();
  }

  // chainable: every query method returns the chainable object
  const chainable: Record<string, jest.Mock> = {};
  for (const n of names) {
    if (n !== "rpc" && n !== "from") chainable[n] = fns[n];
  }
  for (const fn of Object.values(chainable)) {
    fn.mockReturnValue(chainable);
  }

  fns.from.mockReturnValue(chainable);

  // Expose to test scope
  Object.assign(holder, fns, { chainable });

  return {
    supabaseAdmin: {
      from: fns.from,
      rpc: fns.rpc,
    },
  };
});

// Import after mock
import { CreditService } from "../credit-service";

describe("CreditService", () => {
  let service: CreditService;

  // Shorthand refs
  const h = () => holder;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreditService();

    // Re-wire chainable returns after clearAllMocks
    const ch = holder.chainable as unknown as Record<string, jest.Mock>;
    for (const fn of Object.values(ch)) {
      fn.mockReturnValue(ch);
    }
    holder.from.mockReturnValue(ch);
  });

  describe("getBalance", () => {
    it("returns correct balance structure for existing user", async () => {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      h().single
        .mockResolvedValueOnce({
          data: {
            user_id: "user-1",
            credit_balance: 4500,
            subscription_allowance: 5000,
            purchased_credits: 500,
            period_start: now.toISOString(),
            period_end: periodEnd.toISOString(),
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { period_start: now.toISOString() },
          error: null,
        });

      h().gt.mockResolvedValueOnce({
        data: [{ credits_consumed: 200 }, { credits_consumed: 300 }],
        error: null,
      });

      const balance = await service.getBalance("user-1");

      expect(balance.userId).toBe("user-1");
      expect(balance.creditBalance).toBe(4500);
      expect(balance.subscriptionAllowance).toBe(5000);
      expect(balance.purchasedCredits).toBe(500);
      expect(balance.usedThisPeriod).toBe(500);
    });

    it("auto-creates record when user not found", async () => {
      h().single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Row not found" },
      });

      h().insert.mockResolvedValueOnce({ data: null, error: null });

      h().single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const balance = await service.getBalance("new-user");

      expect(balance.userId).toBe("new-user");
      expect(balance.creditBalance).toBe(500);
      expect(balance.subscriptionAllowance).toBe(500);
      expect(balance.purchasedCredits).toBe(0);
      expect(balance.usedThisPeriod).toBe(0);
    });

    it("throws on unexpected database error", async () => {
      h().single.mockResolvedValueOnce({
        data: null,
        error: { code: "UNEXPECTED", message: "Connection failed" },
      });

      await expect(service.getBalance("user-1")).rejects.toThrow(
        "Failed to fetch credit balance: Connection failed",
      );
    });
  });

  describe("deductCredits", () => {
    it("calls RPC and returns success with remaining", async () => {
      h().rpc.mockResolvedValueOnce({
        data: [{ success: true, remaining: 4450 }],
        error: null,
      });

      const result = await service.deductCredits("user-1", "signal_analysis", {
        symbol: "AAPL",
      });

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4450);
      expect(h().rpc).toHaveBeenCalledWith("deduct_credits", {
        p_user_id: "user-1",
        p_amount: 50,
        p_action: "signal_analysis",
        p_metadata: { symbol: "AAPL" },
      });
    });

    it("returns failure when insufficient credits", async () => {
      h().rpc.mockResolvedValueOnce({
        data: [{ success: false, remaining: 10 }],
        error: null,
      });

      const result = await service.deductCredits("user-1", "backtest_ai");

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(10);
    });

    it("skips deduction for free actions", async () => {
      h().single
        .mockResolvedValueOnce({
          data: {
            user_id: "user-1",
            credit_balance: 5000,
            subscription_allowance: 5000,
            purchased_credits: 0,
            period_start: new Date().toISOString(),
            period_end: new Date().toISOString(),
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { period_start: new Date().toISOString() },
          error: null,
        });

      h().gt.mockResolvedValueOnce({ data: [], error: null });

      const result = await service.deductCredits("user-1", "monthly_reset");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(5000);
      expect(h().rpc).not.toHaveBeenCalled();
    });

    it("throws on RPC error", async () => {
      h().rpc.mockResolvedValueOnce({
        data: null,
        error: { message: "RPC failed" },
      });

      await expect(
        service.deductCredits("user-1", "chat_message"),
      ).rejects.toThrow("Failed to deduct credits: RPC failed");
    });

    it("handles non-array RPC response", async () => {
      h().rpc.mockResolvedValueOnce({
        data: { success: true, remaining: 100 },
        error: null,
      });

      const result = await service.deductCredits("user-1", "trade_execution");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(100);
    });
  });

  describe("addCredits", () => {
    it("calls the atomic add_credits RPC and returns the new balance", async () => {
      h().rpc.mockResolvedValueOnce({
        data: [{ new_balance: 2000, already_fulfilled: false }],
        error: null,
      });

      const result = await service.addCredits(
        "user-1",
        1000,
        "addon_credit",
        { pack: "starter" },
      );

      expect(result.newBalance).toBe(2000);
      expect(result.alreadyFulfilled).toBe(false);
      expect(h().rpc).toHaveBeenCalledWith("add_credits", {
        p_user_id: "user-1",
        p_amount: 1000,
        p_source: "addon_credit",
        p_metadata: { pack: "starter" },
        p_payment_intent_id: null,
        p_pack_type: null,
        p_amount_paid_cents: null,
      });
    });

    it("forwards fulfillment fields for credit_purchase source", async () => {
      h().rpc.mockResolvedValueOnce({
        data: [{ new_balance: 5500, already_fulfilled: false }],
        error: null,
      });

      await service.addCredits(
        "user-1",
        5000,
        "credit_purchase",
        { pack: "value" },
        {
          paymentIntentId: "pi_123",
          packType: "value",
          amountPaidCents: 1999,
        },
      );

      expect(h().rpc).toHaveBeenCalledWith(
        "add_credits",
        expect.objectContaining({
          p_source: "credit_purchase",
          p_amount: 5000,
          p_payment_intent_id: "pi_123",
          p_pack_type: "value",
          p_amount_paid_cents: 1999,
        }),
      );
    });

    it("returns alreadyFulfilled=true when RPC reports a duplicate", async () => {
      h().rpc.mockResolvedValueOnce({
        data: [{ new_balance: 6000, already_fulfilled: true }],
        error: null,
      });

      const result = await service.addCredits(
        "user-1",
        1000,
        "credit_purchase",
        {},
        {
          paymentIntentId: "pi_dup",
          packType: "starter",
          amountPaidCents: 499,
        },
      );

      expect(result.alreadyFulfilled).toBe(true);
      expect(result.newBalance).toBe(6000);
    });

    it("handles non-array RPC response", async () => {
      h().rpc.mockResolvedValueOnce({
        data: { new_balance: 750, already_fulfilled: false },
        error: null,
      });

      const result = await service.addCredits(
        "user-1",
        250,
        "addon_credit",
      );

      expect(result.newBalance).toBe(750);
    });

    it("rejects non-positive amounts before touching the database", async () => {
      await expect(
        service.addCredits("user-1", 0, "addon_credit"),
      ).rejects.toThrow("addCredits requires amount > 0");

      await expect(
        service.addCredits("user-1", -50, "addon_credit"),
      ).rejects.toThrow("addCredits requires amount > 0");

      expect(h().rpc).not.toHaveBeenCalled();
    });

    it("throws on RPC error", async () => {
      h().rpc.mockResolvedValueOnce({
        data: null,
        error: { message: "RPC failed" },
      });

      await expect(
        service.addCredits("user-1", 1000, "addon_credit"),
      ).rejects.toThrow("Failed to add credits: RPC failed");
    });

    it("throws when RPC returns a row without new_balance", async () => {
      h().rpc.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        service.addCredits("user-1", 1000, "addon_credit"),
      ).rejects.toThrow("add_credits RPC returned no balance");
    });
  });

  describe("checkSufficientCredits", () => {
    it("returns true when balance is sufficient", async () => {
      h().single
        .mockResolvedValueOnce({
          data: {
            user_id: "user-1",
            credit_balance: 5000,
            subscription_allowance: 5000,
            purchased_credits: 0,
            period_start: new Date().toISOString(),
            period_end: new Date().toISOString(),
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { period_start: new Date().toISOString() },
          error: null,
        });

      h().gt.mockResolvedValueOnce({ data: [], error: null });

      const result = await service.checkSufficientCredits("user-1", 50);
      expect(result).toBe(true);
    });

    it("returns false when balance is insufficient", async () => {
      h().single
        .mockResolvedValueOnce({
          data: {
            user_id: "user-1",
            credit_balance: 10,
            subscription_allowance: 500,
            purchased_credits: 0,
            period_start: new Date().toISOString(),
            period_end: new Date().toISOString(),
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { period_start: new Date().toISOString() },
          error: null,
        });

      h().gt.mockResolvedValueOnce({ data: [], error: null });

      const result = await service.checkSufficientCredits("user-1", 500);
      expect(result).toBe(false);
    });

    it("returns true when balance equals required amount", async () => {
      h().single
        .mockResolvedValueOnce({
          data: {
            user_id: "user-1",
            credit_balance: 50,
            subscription_allowance: 500,
            purchased_credits: 0,
            period_start: new Date().toISOString(),
            period_end: new Date().toISOString(),
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { period_start: new Date().toISOString() },
          error: null,
        });

      h().gt.mockResolvedValueOnce({ data: [], error: null });

      const result = await service.checkSufficientCredits("user-1", 50);
      expect(result).toBe(true);
    });
  });

  describe("resetMonthlyAllowance", () => {
    it("sets correct balance combining tier credits and purchased", async () => {
      const ch = holder.chainable as unknown as Record<string, jest.Mock>;

      h().single.mockResolvedValueOnce({
        data: { purchased_credits: 300 },
        error: null,
      });

      const updateEq = jest.fn().mockResolvedValueOnce({ error: null });
      h().update.mockReturnValueOnce({ ...ch, eq: updateEq });

      h().insert.mockResolvedValueOnce({ error: null });

      await service.resetMonthlyAllowance("user-1", 5000);

      expect(h().update).toHaveBeenCalled();
    });

    it("handles user with 0 purchased credits", async () => {
      const ch = holder.chainable as unknown as Record<string, jest.Mock>;

      h().single.mockResolvedValueOnce({
        data: { purchased_credits: 0 },
        error: null,
      });

      const updateEq = jest.fn().mockResolvedValueOnce({ error: null });
      h().update.mockReturnValueOnce({ ...ch, eq: updateEq });

      h().insert.mockResolvedValueOnce({ error: null });

      await service.resetMonthlyAllowance("user-1", 500);

      expect(h().update).toHaveBeenCalled();
    });

    it("throws on update error", async () => {
      const ch = holder.chainable as unknown as Record<string, jest.Mock>;

      h().single.mockResolvedValueOnce({
        data: { purchased_credits: 0 },
        error: null,
      });

      const updateEq = jest
        .fn()
        .mockResolvedValueOnce({ error: { message: "Update failed" } });
      h().update.mockReturnValueOnce({ ...ch, eq: updateEq });

      await expect(
        service.resetMonthlyAllowance("user-1", 5000),
      ).rejects.toThrow("Failed to reset monthly allowance: Update failed");
    });
  });

  describe("getTransactionHistory", () => {
    it("returns paginated results mapped to CreditTransaction", async () => {
      const mockTransactions = [
        {
          id: "tx-1",
          user_id: "user-1",
          action_type: "signal_analysis",
          credits_consumed: 50,
          credits_added: 0,
          balance_after: 4950,
          ai_model: undefined,
          tokens_input: undefined,
          tokens_output: undefined,
          raw_cost_usd: undefined,
          metadata: {},
          created_at: "2026-04-25T10:00:00Z",
        },
        {
          id: "tx-2",
          user_id: "user-1",
          action_type: "credit_purchase",
          credits_consumed: 0,
          credits_added: 1000,
          balance_after: 5950,
          ai_model: undefined,
          tokens_input: undefined,
          tokens_output: undefined,
          raw_cost_usd: undefined,
          metadata: { pack: "starter" },
          created_at: "2026-04-24T15:00:00Z",
        },
      ];

      h().range.mockResolvedValueOnce({
        data: mockTransactions,
        error: null,
      });

      const history = await service.getTransactionHistory("user-1", 10, 0);

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe("tx-1");
      expect(history[0].actionType).toBe("signal_analysis");
      expect(history[0].creditsConsumed).toBe(50);
      expect(history[1].creditsAdded).toBe(1000);
    });

    it("returns empty array when no transactions exist", async () => {
      h().range.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const history = await service.getTransactionHistory("user-1");

      expect(history).toEqual([]);
    });

    it("throws on query error", async () => {
      h().range.mockResolvedValueOnce({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(
        service.getTransactionHistory("user-1"),
      ).rejects.toThrow("Failed to fetch transaction history: Query failed");
    });
  });

  describe("getUsageThisPeriod", () => {
    it("sums consumed credits for the current period", async () => {
      h().single.mockResolvedValueOnce({
        data: { period_start: "2026-04-01T00:00:00Z" },
        error: null,
      });

      h().gt.mockResolvedValueOnce({
        data: [
          { credits_consumed: 50 },
          { credits_consumed: 15 },
          { credits_consumed: 100 },
        ],
        error: null,
      });

      const usage = await service.getUsageThisPeriod("user-1");

      expect(usage).toBe(165);
    });

    it("returns 0 when no user row exists", async () => {
      h().single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const usage = await service.getUsageThisPeriod("user-1");

      expect(usage).toBe(0);
    });
  });
});
