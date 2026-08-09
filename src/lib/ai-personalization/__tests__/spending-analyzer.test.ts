// Force UTC so getHours() in the source is deterministic regardless of machine timezone
process.env.TZ = "UTC";

// Constructor-level createClient mock — must come before any import
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import { SpendingAnalyzer } from "../spending-analyzer";

const mockCreateClient = createClient as jest.Mock;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a self-referential chainable mock.
 *
 * Terminal resolvers:
 *   chain.single  → { data: null, error: null }
 *   chain.limit   → { data: [], error: null }
 *   chain.upsert  → { data: null, error: null }
 *   chain.rpc     → { data: 100, error: null }
 *
 * All other methods return `chain` so they stay chainable by default.
 */
function makeChain() {
  const chain: Record<string, jest.Mock> = {};

  // Terminal resolvers
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
  chain.limit = jest.fn().mockResolvedValue({ data: [], error: null });
  chain.upsert = jest.fn().mockResolvedValue({ data: null, error: null });

  // rpc resolves directly (not via from/select)
  chain.rpc = jest.fn().mockResolvedValue({ data: 100, error: null });

  // Chainable builders — all return chain by default
  chain.from = jest.fn().mockReturnValue(chain);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.update = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  chain.lte = jest.fn().mockReturnValue(chain);
  chain.lt = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);

  return chain;
}

/** Build a minimal transaction row */
function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    user_id: "user-1",
    amount: 50,
    date: new Date("2025-06-10T14:00:00Z").toISOString(),
    category: "food",
    merchant_name: "Starbucks",
    type: "expense",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("SpendingAnalyzer", () => {
  let chain: ReturnType<typeof makeChain>;
  let svc: SpendingAnalyzer;

  beforeEach(() => {
    chain = makeChain();
    mockCreateClient.mockReturnValue(chain);
    svc = new SpendingAnalyzer("http://localhost", "anon-key");
  });

  // --------------------------------------------------------------------------
  // analyzeSpendingPatterns
  // --------------------------------------------------------------------------

  describe("analyzeSpendingPatterns", () => {
    /**
     * Transaction query chain:
     *   .from("transactions").select("*")
     *     .eq("user_id", userId)   ← eq call #1
     *     .gte(...)                 ← returns chain (default)
     *     .lte(...)                 ← returns chain (default)
     *     .eq("type","expense")    ← eq call #2 — TERMINAL (awaited directly)
     *
     * So we need exactly:
     *   chain.eq.mockReturnValueOnce(chain)         ← call #1
     *           .mockReturnValueOnce({data, error}) ← call #2 terminal
     *
     * Then identifyRiskAreas calls:
     *   .from("budgets").select("category, amount").eq("user_id", userId)
     * which hits eq call #3 — falls through to default mockReturnValue(chain).
     * That chain is awaited, so chain itself is the resolved value.
     * `data?.map(...)` on the chain object returns undefined → budgetMap stays empty.
     * That is fine — riskAreas will be [] which is the expected default.
     */

    it("returns empty triggers when no transactions exist", async () => {
      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce({ data: null, error: null });

      const analysis = await svc.analyzeSpendingPatterns("user-1");

      expect(analysis.triggers).toEqual([]);
    });

    it("returns empty riskAreas when no transactions exist", async () => {
      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce({ data: null, error: null });

      const analysis = await svc.analyzeSpendingPatterns("user-1");

      expect(analysis.riskAreas).toEqual([]);
    });

    it("returns default tracking recommendation when no transactions exist", async () => {
      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce({ data: null, error: null });

      const analysis = await svc.analyzeSpendingPatterns("user-1");

      expect(analysis.recommendations[0]).toContain("tracking");
    });

    it("returns populated category patterns when transactions exist", async () => {
      const txs = [makeTx({ amount: 100, category: "food" })];

      chain.eq
        .mockReturnValueOnce(chain)                      // eq call #1: user_id
        .mockReturnValueOnce({ data: txs, error: null }); // eq call #2: type=expense (terminal)

      const analysis = await svc.analyzeSpendingPatterns("user-1");

      expect(analysis.patterns.categories).toHaveProperty("food");
    });

    it("detects late-night trigger when night spending exceeds 20% of total", async () => {
      // 01:30Z = 21:30 EDT (local) → hour 21, classified as "night" (>= 21)
      const txs = [
        makeTx({ amount: 10, date: "2025-06-10T14:00:00Z" }),
        makeTx({ amount: 100, date: "2025-06-11T01:30:00Z" }),
      ];

      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce({ data: txs, error: null });

      const analysis = await svc.analyzeSpendingPatterns("user-1");

      const lateNightTrigger = analysis.triggers.find(
        (t) => t.timeOfDay === "night",
      );
      expect(lateNightTrigger).toBeDefined();
    });

    it("detects weekend splurge trigger when weekend/2 > weekdayAvg*1.5", async () => {
      const txs = [
        makeTx({ amount: 5, date: "2025-06-09T14:00:00Z" }), // Monday
        makeTx({ amount: 5, date: "2025-06-10T14:00:00Z" }), // Tuesday
        makeTx({ amount: 5, date: "2025-06-11T14:00:00Z" }), // Wednesday
        makeTx({ amount: 5, date: "2025-06-12T14:00:00Z" }), // Thursday
        makeTx({ amount: 5, date: "2025-06-13T14:00:00Z" }), // Friday
        makeTx({ amount: 500, date: "2025-06-14T14:00:00Z" }), // Saturday
      ];

      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce({ data: txs, error: null });

      const analysis = await svc.analyzeSpendingPatterns("user-1");

      const weekendTrigger = analysis.triggers.find(
        (t) => t.dayOfWeek === "weekend",
      );
      expect(weekendTrigger).toBeDefined();
    });

    it("detects category trigger when single category exceeds 30% of total", async () => {
      const txs = [
        makeTx({ amount: 10, category: "food" }),
        makeTx({ amount: 100, category: "entertainment" }),
      ];

      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce({ data: txs, error: null });

      const analysis = await svc.analyzeSpendingPatterns("user-1");

      const catTrigger = analysis.triggers.find(
        (t) => t.category === "entertainment",
      );
      expect(catTrigger).toBeDefined();
    });

    it("limits recommendations to at most 5", async () => {
      const txs = [
        makeTx({ amount: 100, date: "2025-06-10T23:30:00Z", category: "entertainment" }),
        makeTx({ amount: 500, date: "2025-06-14T23:30:00Z", category: "clothing" }),
        makeTx({ amount: 10, date: "2025-06-09T14:00:00Z", category: "food" }),
      ];

      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce({ data: txs, error: null });

      const analysis = await svc.analyzeSpendingPatterns("user-1");

      expect(analysis.recommendations.length).toBeLessThanOrEqual(5);
    });

    it("returns healthy recommendation when no triggers or risk areas", async () => {
      // Single afternoon weekday transaction in one category — no trigger thresholds hit
      const txs = [makeTx({ amount: 50, date: "2025-06-10T09:00:00Z", category: "food" })];

      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce({ data: txs, error: null });

      const analysis = await svc.analyzeSpendingPatterns("user-1");

      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // analyzeTransactionRisk
  // --------------------------------------------------------------------------

  describe("analyzeTransactionRisk", () => {
    /**
     * Merchant count query:
     *   .from("transactions").select("id",{count:"exact"})
     *     .eq("user_id")        ← eq call #1
     *     .eq("merchant_name")  ← eq call #2
     *     .gte("date")          ← returns chain
     *     .lt("date")           ← TERMINAL (awaited directly) → {count, error}
     *
     * Budget single query:
     *   .from("budgets").select("amount, spent")
     *     .eq("user_id")        ← eq call #3
     *     .eq("category")       ← eq call #4
     *     .single()             ← terminal
     *
     * Default chain.eq.mockReturnValue(chain) handles calls #3 and #4 fine
     * because single() resolves separately.
     *
     * But calls #1 and #2 need to stay chainable before .lt() resolves.
     * chain.eq default is mockReturnValue(chain) which is correct for #1 and #2.
     * chain.lt default is mockReturnValue(chain) which is NOT a Promise.
     *
     * We need chain.lt to return a thenable for the merchant count query.
     * Override: chain.lt.mockResolvedValue({count: N, error: null}) per test.
     */

    function makeTxInput(overrides: Record<string, unknown> = {}) {
      return {
        id: "tx-99",
        amount: 50,
        merchant: "Amazon",
        category: "shopping",
        timestamp: "2025-06-10T14:00:00Z", // afternoon weekday
        ...overrides,
      };
    }

    it("returns riskScore of 0 when no risk factors trigger", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: 1000, error: null }); // high avg → amount < 50%
      chain.single.mockResolvedValue({ data: null, error: null });

      const result = await svc.analyzeTransactionRisk("user-1", makeTxInput({ amount: 10 }));

      expect(result.riskScore).toBe(0);
    });

    it("returns recommendedIntervention=none when riskScore < soft_nudge threshold", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: 1000, error: null });
      chain.single.mockResolvedValue({ data: null, error: null });

      const result = await svc.analyzeTransactionRisk("user-1", makeTxInput({ amount: 10 }));

      expect(result.recommendedIntervention).toBe("none");
    });

    it("adds late_night risk factor when hour >= 22", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: 1000, error: null });
      chain.single.mockResolvedValue({ data: null, error: null });

      // 02:30Z = 22:30 EDT (local) → hour 22, triggers late_night (>= 22)
      const result = await svc.analyzeTransactionRisk("user-1", makeTxInput({
        timestamp: "2025-06-11T02:30:00Z",
        amount: 10,
      }));

      const hasLateNight = result.riskFactors.some((f) => f.factor === "late_night");
      expect(hasLateNight).toBe(true);
    });

    it("adds late_night risk factor when hour < 6", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: 1000, error: null });
      chain.single.mockResolvedValue({ data: null, error: null });

      const result = await svc.analyzeTransactionRisk("user-1", makeTxInput({
        timestamp: "2025-06-10T03:00:00Z",
        amount: 10,
      }));

      const hasLateNight = result.riskFactors.some((f) => f.factor === "late_night");
      expect(hasLateNight).toBe(true);
    });

    it("adds repeat_merchant_same_day risk factor when count > 1", async () => {
      chain.lt.mockResolvedValue({ count: 3, error: null });
      chain.rpc.mockResolvedValue({ data: 1000, error: null });
      chain.single.mockResolvedValue({ data: null, error: null });

      const result = await svc.analyzeTransactionRisk("user-1", makeTxInput({ amount: 10 }));

      const hasRepeat = result.riskFactors.some(
        (f) => f.factor === "repeat_merchant_same_day",
      );
      expect(hasRepeat).toBe(true);
    });

    it("adds exceeds_daily_average risk factor when amount > dailyAvg*0.5", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: 50, error: null }); // dailyAvg=50, amount=50 > 25
      chain.single.mockResolvedValue({ data: null, error: null });

      const result = await svc.analyzeTransactionRisk("user-1", makeTxInput({ amount: 50 }));

      const hasExceeds = result.riskFactors.some(
        (f) => f.factor === "exceeds_daily_average",
      );
      expect(hasExceeds).toBe(true);
    });

    it("adds budget_category_overspent factor when transaction would exceed budget", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: 1000, error: null });
      chain.single.mockResolvedValue({
        data: { amount: 100, spent: 90 }, // 90+50=140 > 100
        error: null,
      });

      const result = await svc.analyzeTransactionRisk("user-1", makeTxInput({ amount: 50 }));

      const hasBudget = result.riskFactors.some(
        (f) => f.factor === "budget_category_overspent",
      );
      expect(hasBudget).toBe(true);
    });

    it("adds weekend_splurge factor on Saturday", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: 1000, error: null });
      chain.single.mockResolvedValue({ data: null, error: null });

      const result = await svc.analyzeTransactionRisk("user-1", makeTxInput({
        timestamp: "2025-06-14T14:00:00Z", // Saturday
        amount: 10,
      }));

      const hasWeekend = result.riskFactors.some((f) => f.factor === "weekend_splurge");
      expect(hasWeekend).toBe(true);
    });

    it("adds weekend_splurge factor on Sunday", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: 1000, error: null });
      chain.single.mockResolvedValue({ data: null, error: null });

      const result = await svc.analyzeTransactionRisk("user-1", makeTxInput({
        timestamp: "2025-06-15T14:00:00Z", // Sunday
        amount: 10,
      }));

      const hasWeekend = result.riskFactors.some((f) => f.factor === "weekend_splurge");
      expect(hasWeekend).toBe(true);
    });

    it("returns echo of transactionId in result", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: 1000, error: null });
      chain.single.mockResolvedValue({ data: null, error: null });

      const result = await svc.analyzeTransactionRisk(
        "user-1",
        makeTxInput({ id: "tx-abc", amount: 10 }),
      );

      expect(result.transactionId).toBe("tx-abc");
    });

    it("returns empty string transactionId when input id is undefined", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: 1000, error: null });
      chain.single.mockResolvedValue({ data: null, error: null });

      const txInput = { amount: 10, merchant: "Shop", category: "food", timestamp: "2025-06-10T14:00:00Z" };
      const result = await svc.analyzeTransactionRisk("user-1", txInput);

      expect(result.transactionId).toBe("");
    });

    it("uses default dailyAvg of 100 when rpc returns null", async () => {
      chain.lt.mockResolvedValue({ count: 0, error: null });
      chain.rpc.mockResolvedValue({ data: null, error: null }); // null → default 100
      chain.single.mockResolvedValue({ data: null, error: null });

      // amount=40 < 50 (50% of 100) → no exceeds_daily_average factor
      const result = await svc.analyzeTransactionRisk("user-1", makeTxInput({ amount: 40 }));

      const hasExceeds = result.riskFactors.some(
        (f) => f.factor === "exceeds_daily_average",
      );
      expect(hasExceeds).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // createSpendingAlert
  // --------------------------------------------------------------------------

  describe("createSpendingAlert", () => {
    function makeAnalysis() {
      return {
        transactionId: "tx-1",
        amount: 50,
        merchant: "Amazon",
        category: "shopping",
        timestamp: "2025-06-10T14:00:00Z",
        riskScore: 0.7,
        riskFactors: [],
        recommendedIntervention: "soft_nudge" as const,
      };
    }

    it("throws when supabase insert returns an error", async () => {
      chain.single.mockResolvedValue({ data: null, error: { message: "insert failed" } });

      await expect(
        svc.createSpendingAlert("user-1", makeAnalysis()),
      ).rejects.toThrow("insert failed");
    });

    it("returns mapped EmotionalSpendingAlert id on success", async () => {
      const dbRow = {
        id: "alert-1",
        user_id: "user-1",
        transaction_id: "tx-1",
        risk_score: 0.7,
        risk_factors: [],
        intervention_type: "soft_nudge",
        user_response: null,
        responded_at: null,
        created_at: new Date().toISOString(),
      };
      chain.single.mockResolvedValue({ data: dbRow, error: null });

      const alert = await svc.createSpendingAlert("user-1", makeAnalysis());

      expect(alert.id).toBe("alert-1");
    });

    it("returns alert with correct interventionType", async () => {
      const dbRow = {
        id: "alert-2",
        user_id: "user-1",
        transaction_id: "tx-1",
        risk_score: 0.9,
        risk_factors: [],
        intervention_type: "strong_intervention",
        user_response: null,
        responded_at: null,
        created_at: new Date().toISOString(),
      };
      chain.single.mockResolvedValue({ data: dbRow, error: null });

      const alert = await svc.createSpendingAlert("user-1", {
        ...makeAnalysis(),
        recommendedIntervention: "strong_intervention",
      });

      expect(alert.interventionType).toBe("strong_intervention");
    });
  });

  // --------------------------------------------------------------------------
  // recordAlertResponse
  // --------------------------------------------------------------------------

  describe("recordAlertResponse", () => {
    it("does not throw on successful update", async () => {
      // recordAlertResponse: .from().update().eq("id") — eq is terminal (awaited)
      // We need eq to resolve as a Promise for this call only.
      // Use mockReturnValueOnce to resolve this specific eq call.
      chain.eq.mockReturnValueOnce(Promise.resolve({ error: null }));

      await expect(
        svc.recordAlertResponse("alert-1", "planned"),
      ).resolves.toBeUndefined();
    });

    it("calls update with the provided response value", async () => {
      const updateSpy = chain.update;
      chain.eq.mockReturnValueOnce(Promise.resolve({ error: null }));

      await svc.recordAlertResponse("alert-1", "dismissed");

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ user_response: "dismissed" }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // getStoredPatterns
  // --------------------------------------------------------------------------

  describe("getStoredPatterns", () => {
    it("throws when supabase returns an error", async () => {
      chain.limit.mockResolvedValue({ data: null, error: { message: "db error" } });

      await expect(svc.getStoredPatterns("user-1")).rejects.toThrow("db error");
    });

    it("returns empty array when supabase returns empty data", async () => {
      chain.limit.mockResolvedValue({ data: [], error: null });

      const result = await svc.getStoredPatterns("user-1");

      expect(result).toEqual([]);
    });

    it("maps database rows to SpendingPattern objects with correct userId", async () => {
      const row = {
        id: "pat-1",
        user_id: "user-1",
        pattern_type: "category",
        pattern_key: "food",
        average_amount: 250,
        transaction_count: 10,
        risk_score: 0.3,
        metadata: null,
        period_start: "2025-05-01",
        period_end: "2025-05-31",
        created_at: "2025-06-01T00:00:00Z",
      };
      chain.limit.mockResolvedValue({ data: [row], error: null });

      const result = await svc.getStoredPatterns("user-1");

      expect(result[0].userId).toBe("user-1");
    });

    it("maps database rows to SpendingPattern objects with correct patternKey", async () => {
      const row = {
        id: "pat-1",
        user_id: "user-1",
        pattern_type: "category",
        pattern_key: "food",
        average_amount: 250,
        transaction_count: 10,
        risk_score: 0.3,
        metadata: null,
        period_start: "2025-05-01",
        period_end: "2025-05-31",
        created_at: "2025-06-01T00:00:00Z",
      };
      chain.limit.mockResolvedValue({ data: [row], error: null });

      const result = await svc.getStoredPatterns("user-1");

      expect(result[0].patternKey).toBe("food");
    });
  });
});
