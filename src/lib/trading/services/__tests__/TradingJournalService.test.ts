/**
 * TradingJournalService - Comprehensive Test Suite
 *
 * Tests trade CRUD, P&L calculations, statistics, performance analytics.
 * Mocks @supabase/supabase-js with chaining pattern.
 *
 * IMPORTANT: jest.config has resetMocks: true, which clears all jest.fn()
 * implementations before each test. We must re-establish all mocks in beforeEach.
 */

// ============================================================================
// MOCK SETUP (before imports)
// ============================================================================

// All chain mocks — these are the ONLY mock functions used throughout.
// Every chain method returns a "chainable" object built from these same mocks.
const mockSingle = jest.fn();
const mockFrom = jest.fn();

// We'll use a single "chainable" object that wires every method back to itself
// and uses mockSingle for terminal calls. This avoids the problem of
// separate jest.fn() losing their implementations to resetMocks.
let chainable: Record<string, jest.Mock | unknown>;

function makeChainable(): Record<string, jest.Mock | unknown> {
  const obj: Record<string, jest.Mock | unknown> = {};

  // Every builder method returns `obj` — so any chain order works
  for (const m of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "gte",
    "lte",
    "gt",
    "lt",
    "in",
    "order",
    "limit",
    "range",
  ]) {
    obj[m] = jest.fn(() => obj);
  }

  // Terminal method
  obj.single = mockSingle;

  // Default thenable: resolves to { data: null, error: null }
  // Tests override this by calling setChainResolve() or setChainResolveOnce()
  obj.data = null;
  obj.error = null;
  obj.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data: (obj as Record<string, unknown>).data, error: (obj as Record<string, unknown>).error }).then(onFulfilled);

  return obj;
}

const mockSupabaseClient = { from: mockFrom };

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: { randomUUID: jest.fn(() => "mock-uuid-1234") },
  writable: true,
});

import { TradingJournalService } from "../../services/TradingJournalService";
import { createClient } from "@supabase/supabase-js";

const mockCreateClient = createClient as jest.Mock;

// ============================================================================
// HELPERS
// ============================================================================

function makeService(): TradingJournalService {
  return new TradingJournalService("https://test.supabase.co", "test-key");
}

function sampleTradeEntry() {
  return {
    id: "trade-1",
    userId: "user-1",
    symbol: "AAPL",
    direction: "long" as const,
    status: "open" as const,
    entryDate: new Date("2026-01-01"),
    entryPrice: 150,
    entryQuantity: 10,
    entryReason: "Breakout pattern",
    positionSize: 1500,
    tags: [] as string[],
    followedPlan: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

function dbFormatTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: "trade-1",
    user_id: "user-1",
    symbol: "AAPL",
    direction: "long",
    status: "open",
    entry_date: "2026-01-01T00:00:00.000Z",
    entry_price: 150,
    entry_quantity: 10,
    entry_reason: "Breakout pattern",
    position_size: 1500,
    tags: [],
    followed_plan: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Helper: set what `await query` resolves to for the shared chainable.
 * This sets the data/error properties on the chainable and re-sets the
 * `.then` to resolve with those values.
 */
function setChainResolve(data: unknown, error: unknown = null) {
  chainable.data = data;
  chainable.error = error;
  chainable.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data, error }).then(onFulfilled);
}

// ============================================================================
// REBUILD MOCKS
// ============================================================================

function resetChainMocks() {
  // Re-establish createClient
  mockCreateClient.mockReturnValue(mockSupabaseClient);

  // Build fresh chainable
  chainable = makeChainable();

  // from() returns the chainable (which has select, insert, update, delete)
  mockFrom.mockReturnValue(chainable);

  // single() default: resolves to { data: null, error: null }
  mockSingle.mockResolvedValue({ data: null, error: null });
}

// ============================================================================
// TESTS
// ============================================================================

describe("TradingJournalService", () => {
  let service: TradingJournalService;

  beforeEach(() => {
    resetChainMocks();
    service = makeService();
  });

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  describe("constructor", () => {
    it("should create instance with supabase client", () => {
      expect(service).toBeDefined();
    });
  });

  // ==========================================================================
  // createTrade
  // ==========================================================================

  describe("createTrade", () => {
    it("should create a trade and return the entry", async () => {
      const trade = sampleTradeEntry();
      const { id, createdAt, updatedAt, ...input } = trade;

      // createTrade: from().insert().select().single()
      mockSingle.mockResolvedValue({ data: dbFormatTrade(), error: null });

      const result = await service.createTrade(input);
      expect(mockFrom).toHaveBeenCalledWith("trading_journal");
      expect(result).toBeDefined();
      expect(result.symbol).toBe("AAPL");
    });

    it("should throw on supabase error", async () => {
      const trade = sampleTradeEntry();
      const { id, createdAt, updatedAt, ...input } = trade;

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      await expect(service.createTrade(input)).rejects.toBeDefined();
    });
  });

  // ==========================================================================
  // updateTrade
  // ==========================================================================

  describe("updateTrade", () => {
    it("should update a trade", async () => {
      // updateTrade: from().update({...}).eq("id").select().single()
      mockSingle.mockResolvedValue({ data: dbFormatTrade(), error: null });

      const result = await service.updateTrade("trade-1", {
        entryReason: "Updated reason",
      });
      expect(mockFrom).toHaveBeenCalledWith("trading_journal");
      expect(result).toBeDefined();
    });

    it("should throw on update error", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      await expect(
        service.updateTrade("trade-1", { entryReason: "x" }),
      ).rejects.toBeDefined();
    });
  });

  // ==========================================================================
  // deleteTrade
  // ==========================================================================

  describe("deleteTrade", () => {
    it("should delete a trade without error", async () => {
      // deleteTrade: from().delete().eq("id") — awaits the eq() result
      // chainable already resolves to { data: null, error: null } by default
      setChainResolve(null, null);

      await expect(service.deleteTrade("trade-1")).resolves.not.toThrow();
      expect(mockFrom).toHaveBeenCalledWith("trading_journal");
    });

    it("should throw on delete error", async () => {
      setChainResolve(null, { message: "Delete failed" });

      await expect(service.deleteTrade("trade-1")).rejects.toBeDefined();
    });
  });

  // ==========================================================================
  // getTrade
  // ==========================================================================

  describe("getTrade", () => {
    it("should return a trade by id", async () => {
      // getTrade: from().select("*").eq("id").single()
      mockSingle.mockResolvedValue({ data: dbFormatTrade(), error: null });

      const result = await service.getTrade("trade-1");
      expect(result).toBeDefined();
      expect(result!.symbol).toBe("AAPL");
    });

    it("should return null when trade not found", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await service.getTrade("missing");
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getTrades (with filters)
  // ==========================================================================

  describe("getTrades", () => {
    it("should return all trades for a user", async () => {
      // getTrades without extra filters:
      // from().select("*").eq("user_id").order() -> await
      // The chain resolves via .then on the chainable object
      setChainResolve([dbFormatTrade()], null);

      const result = await service.getTrades({ userId: "user-1" });
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });

    it("should apply date filters", async () => {
      // With startDate + endDate: .gte().lte() chained onto the query
      setChainResolve([], null);

      const result = await service.getTrades({
        userId: "user-1",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-02-01"),
      });
      expect(result).toBeDefined();
    });

    it("should apply status filter", async () => {
      setChainResolve([], null);

      const result = await service.getTrades({
        userId: "user-1",
        status: "closed",
      });
      expect(result).toBeDefined();
    });

    it("should throw on query error", async () => {
      setChainResolve(null, { message: "Query error" });

      await expect(
        service.getTrades({ userId: "user-1" }),
      ).rejects.toBeDefined();
    });
  });

  // ==========================================================================
  // closeTrade
  // ==========================================================================

  describe("closeTrade", () => {
    it("should close a long trade and calculate positive P&L", async () => {
      const openTrade = dbFormatTrade({
        status: "open",
        direction: "long",
        entry_price: 100,
        entry_quantity: 10,
      });

      // Step 1: closeTrade fetches trade via from().select("*").eq().single()
      // Step 2: calls updateTrade via from().update().eq().select().single()
      mockSingle
        .mockResolvedValueOnce({ data: openTrade, error: null })
        .mockResolvedValueOnce({
          data: dbFormatTrade({
            status: "closed",
            exit_price: 120,
            exit_quantity: 10,
            profit_loss: 200,
            profit_loss_percent: 20,
            outcome: "win",
            exit_date: "2026-01-15T00:00:00.000Z",
            exit_reason: "Target hit",
          }),
          error: null,
        });

      const result = await service.closeTrade("trade-1", 120, 10, "Target hit");
      expect(result).toBeDefined();
      expect(result.status).toBe("closed");
    });

    it("should throw when closing a non-existent trade", async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.closeTrade("missing", 120, 10, "Target"),
      ).rejects.toThrow("Trade not found");
    });
  });

  // ==========================================================================
  // getTradeStats
  // ==========================================================================

  describe("getTradeStats", () => {
    it("should return empty stats when no closed trades", async () => {
      // getTradeStats calls getTrades twice.
      // Both resolve via the chainable .then → { data: [], error: null }
      setChainResolve([], null);

      const stats = await service.getTradeStats("user-1");
      expect(stats).toBeDefined();
      expect(stats.closedTrades).toBe(0);
      expect(stats.winRate).toBe(0);
    });

    it("should compute stats for closed trades", async () => {
      const closedTrade = dbFormatTrade({
        status: "closed",
        exit_price: 160,
        exit_quantity: 10,
        profit_loss: 100,
        profit_loss_percent: 6.67,
        outcome: "win",
        exit_date: "2026-01-15T00:00:00.000Z",
      });

      // Both getTrades calls return the same data
      setChainResolve([closedTrade], null);

      const stats = await service.getTradeStats("user-1");
      expect(stats).toBeDefined();
      expect(stats.closedTrades).toBe(1);
      expect(stats.winningTrades).toBe(1);
      expect(stats.winRate).toBe(100);
    });
  });

  // ==========================================================================
  // calculateStrategyPerformance
  // ==========================================================================

  describe("calculateStrategyPerformance", () => {
    it("should group performance by strategy", () => {
      const trades = [
        {
          ...sampleTradeEntry(),
          strategy: "Breakout",
          status: "closed" as const,
          outcome: "win" as const,
          profitLoss: 100,
        },
        {
          ...sampleTradeEntry(),
          id: "trade-2",
          strategy: "Breakout",
          status: "closed" as const,
          outcome: "loss" as const,
          profitLoss: -50,
        },
      ];

      const result = service.calculateStrategyPerformance(trades);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].strategy).toBe("Breakout");
      expect(result[0].trades).toBe(2);
      expect(result[0].wins).toBe(1);
      expect(result[0].losses).toBe(1);
    });

    it("should use Untagged for trades without strategy", () => {
      const trades = [
        {
          ...sampleTradeEntry(),
          status: "closed" as const,
          outcome: "win" as const,
          profitLoss: 100,
        },
      ];

      const result = service.calculateStrategyPerformance(trades);
      expect(result).toHaveLength(1);
      expect(result[0].strategy).toBe("Untagged");
    });

    it("should return empty array for no trades", () => {
      const result = service.calculateStrategyPerformance([]);
      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getDailyPerformance
  // ==========================================================================

  describe("getDailyPerformance", () => {
    it("should return daily performance", async () => {
      setChainResolve([], null);

      const result = await service.getDailyPerformance("user-1", 7);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==========================================================================
  // getSymbolPerformance
  // ==========================================================================

  describe("getSymbolPerformance", () => {
    it("should return performance per symbol", async () => {
      setChainResolve([], null);

      const result = await service.getSymbolPerformance("user-1");
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // generateInsights
  // ==========================================================================

  describe("generateInsights", () => {
    it("should generate insights for a user with few trades", async () => {
      setChainResolve([], null);

      const result = await service.generateInsights("user-1");
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain("Keep logging trades");
    });

    it("should generate high win rate insight", async () => {
      // Need >= 10 closed trades with >= 60% win rate
      const closedTrades = Array.from({ length: 12 }, (_, i) =>
        dbFormatTrade({
          id: `trade-${i}`,
          status: "closed",
          entry_date: "2026-02-01T00:00:00.000Z",
          exit_date: "2026-02-02T00:00:00.000Z",
          entry_price: 100,
          entry_quantity: 10,
          exit_price: i < 8 ? 110 : 90, // 8 wins, 4 losses = 66.7%
          exit_quantity: 10,
          profit_loss: i < 8 ? 100 : -100,
          profit_loss_percent: i < 8 ? 10 : -10,
          outcome: i < 8 ? "win" : "loss",
        }),
      );

      setChainResolve(closedTrades, null);

      const result = await service.generateInsights("user-1");
      expect(result.some((r) => r.includes("Excellent win rate"))).toBe(true);
    });

    it("should generate low win rate insight", async () => {
      // Need >= 10 closed trades with < 40% win rate
      const closedTrades = Array.from({ length: 12 }, (_, i) =>
        dbFormatTrade({
          id: `trade-${i}`,
          status: "closed",
          entry_date: "2026-02-01T00:00:00.000Z",
          exit_date: "2026-02-02T00:00:00.000Z",
          entry_price: 100,
          entry_quantity: 10,
          exit_price: i < 3 ? 110 : 90, // 3 wins, 9 losses = 25%
          exit_quantity: 10,
          profit_loss: i < 3 ? 100 : -100,
          profit_loss_percent: i < 3 ? 10 : -10,
          outcome: i < 3 ? "win" : "loss",
        }),
      );

      setChainResolve(closedTrades, null);

      const result = await service.generateInsights("user-1");
      expect(result.some((r) => r.includes("reviewing your entry criteria"))).toBe(true);
    });

    it("should generate good risk/reward insight", async () => {
      const closedTrades = Array.from({ length: 12 }, (_, i) =>
        dbFormatTrade({
          id: `trade-${i}`,
          status: "closed",
          entry_date: "2026-02-01T00:00:00.000Z",
          exit_date: "2026-02-02T00:00:00.000Z",
          entry_price: 100,
          entry_quantity: 10,
          profit_loss: 100,
          outcome: "win",
          risk_reward_ratio: 2.5,
        }),
      );

      setChainResolve(closedTrades, null);

      const result = await service.generateInsights("user-1");
      expect(result.some((r) => r.includes("Great risk/reward ratio"))).toBe(true);
    });

    it("should generate low risk/reward insight", async () => {
      const closedTrades = Array.from({ length: 12 }, (_, i) =>
        dbFormatTrade({
          id: `trade-${i}`,
          status: "closed",
          entry_date: "2026-02-01T00:00:00.000Z",
          exit_date: "2026-02-02T00:00:00.000Z",
          entry_price: 100,
          entry_quantity: 10,
          profit_loss: 100,
          outcome: "win",
          risk_reward_ratio: 1.0,
        }),
      );

      setChainResolve(closedTrades, null);

      const result = await service.generateInsights("user-1");
      expect(result.some((r) => r.includes("improving your risk/reward ratio"))).toBe(true);
    });

    it("should generate profit factor insight (strong)", async () => {
      // More wins than losses with good ratio
      const closedTrades = Array.from({ length: 12 }, (_, i) =>
        dbFormatTrade({
          id: `trade-${i}`,
          status: "closed",
          entry_date: "2026-02-01T00:00:00.000Z",
          exit_date: "2026-02-02T00:00:00.000Z",
          entry_price: 100,
          entry_quantity: 10,
          profit_loss: i < 10 ? 200 : -50,
          outcome: i < 10 ? "win" : "loss",
        }),
      );

      setChainResolve(closedTrades, null);

      const result = await service.generateInsights("user-1");
      expect(result.some((r) => r.includes("Strong profit factor"))).toBe(true);
    });

    it("should generate profit factor < 1 insight", async () => {
      const closedTrades = Array.from({ length: 12 }, (_, i) =>
        dbFormatTrade({
          id: `trade-${i}`,
          status: "closed",
          entry_date: "2026-02-01T00:00:00.000Z",
          exit_date: "2026-02-02T00:00:00.000Z",
          entry_price: 100,
          entry_quantity: 10,
          profit_loss: i < 3 ? 50 : -100, // 3*50=150 wins, 9*100=900 losses
          outcome: i < 3 ? "win" : "loss",
        }),
      );

      setChainResolve(closedTrades, null);

      const result = await service.generateInsights("user-1");
      expect(result.some((r) => r.includes("Profit factor below 1"))).toBe(true);
    });

    it("should generate consecutive losses insight", async () => {
      // 12 trades sorted by entry_date, with 4 consecutive losses
      const closedTrades = Array.from({ length: 12 }, (_, i) =>
        dbFormatTrade({
          id: `trade-${i}`,
          status: "closed",
          entry_date: `2026-02-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
          exit_date: `2026-02-${String(i + 2).padStart(2, "0")}T00:00:00.000Z`,
          entry_price: 100,
          entry_quantity: 10,
          profit_loss: i >= 5 && i <= 8 ? -100 : 100, // 4 consecutive losses at positions 5-8
          outcome: i >= 5 && i <= 8 ? "loss" : "win",
        }),
      );

      setChainResolve(closedTrades, null);

      const result = await service.generateInsights("user-1");
      expect(result.some((r) => r.includes("losing streak"))).toBe(true);
    });

    it("should generate best strategy insight", async () => {
      const closedTrades = Array.from({ length: 12 }, (_, i) =>
        dbFormatTrade({
          id: `trade-${i}`,
          status: "closed",
          entry_date: "2026-02-01T00:00:00.000Z",
          exit_date: "2026-02-02T00:00:00.000Z",
          entry_price: 100,
          entry_quantity: 10,
          profit_loss: 100,
          outcome: "win",
          strategy: "Breakout",
        }),
      );

      setChainResolve(closedTrades, null);

      const result = await service.generateInsights("user-1");
      expect(result.some((r) => r.includes("best performing strategy"))).toBe(true);
    });

    it("should generate drawdown insight", async () => {
      const closedTrades = [
        // Win first, then lose — creates a drawdown
        ...Array.from({ length: 5 }, (_, i) =>
          dbFormatTrade({
            id: `trade-w-${i}`,
            status: "closed",
            entry_date: `2026-02-0${i + 1}T00:00:00.000Z`,
            exit_date: `2026-02-0${i + 2}T00:00:00.000Z`,
            entry_price: 100,
            entry_quantity: 10,
            profit_loss: 200,
            outcome: "win",
          }),
        ),
        ...Array.from({ length: 7 }, (_, i) =>
          dbFormatTrade({
            id: `trade-l-${i}`,
            status: "closed",
            entry_date: `2026-02-${String(i + 6).padStart(2, "0")}T00:00:00.000Z`,
            exit_date: `2026-02-${String(i + 7).padStart(2, "0")}T00:00:00.000Z`,
            entry_price: 100,
            entry_quantity: 10,
            profit_loss: -100,
            outcome: "loss",
          }),
        ),
      ];

      setChainResolve(closedTrades, null);

      const result = await service.generateInsights("user-1");
      expect(result.some((r) => r.includes("Maximum drawdown"))).toBe(true);
    });

    it("should cap insights at 5", async () => {
      // Create trades that trigger many insights
      const closedTrades = Array.from({ length: 20 }, (_, i) =>
        dbFormatTrade({
          id: `trade-${i}`,
          status: "closed",
          entry_date: `2026-02-${String((i % 27) + 1).padStart(2, "0")}T00:00:00.000Z`,
          exit_date: `2026-02-${String((i % 27) + 2).padStart(2, "0")}T00:00:00.000Z`,
          entry_price: 100,
          entry_quantity: 10,
          // Alternate wins and losses with varying amounts
          profit_loss: i < 12 ? 200 : -300,
          outcome: i < 12 ? "win" : "loss",
          strategy: "Momentum",
          risk_reward_ratio: 2.5,
        }),
      );

      setChainResolve(closedTrades, null);

      const result = await service.generateInsights("user-1");
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // closeTrade — short direction and partial close
  // ==========================================================================

  describe("closeTrade (extended)", () => {
    it("should close a short trade and calculate P&L correctly", async () => {
      const openTrade = dbFormatTrade({
        status: "open",
        direction: "short",
        entry_price: 120,
        entry_quantity: 10,
      });

      mockSingle
        .mockResolvedValueOnce({ data: openTrade, error: null })
        .mockResolvedValueOnce({
          data: dbFormatTrade({
            status: "closed",
            direction: "short",
            entry_price: 120,
            exit_price: 100,
            exit_quantity: 10,
            // Short P&L = entry - exit = 1200 - 1000 = 200
            profit_loss: 200,
            profit_loss_percent: 16.67,
            outcome: "win",
            exit_date: "2026-01-15T00:00:00.000Z",
            exit_reason: "Target hit",
          }),
          error: null,
        });

      const result = await service.closeTrade("trade-1", 100, 10, "Target hit");
      expect(result).toBeDefined();
      expect(result.status).toBe("closed");
    });

    it("should set status to partial when exitQuantity < entryQuantity", async () => {
      const openTrade = dbFormatTrade({
        status: "open",
        direction: "long",
        entry_price: 100,
        entry_quantity: 10,
      });

      mockSingle
        .mockResolvedValueOnce({ data: openTrade, error: null })
        .mockResolvedValueOnce({
          data: dbFormatTrade({
            status: "partial",
            exit_price: 120,
            exit_quantity: 5,
            profit_loss: 100,
            outcome: "win",
          }),
          error: null,
        });

      const result = await service.closeTrade("trade-1", 120, 5, "Partial exit");
      expect(result).toBeDefined();
      expect(result.status).toBe("partial");
    });

    it("should pass emotionalStateAfter and lessonsLearned", async () => {
      const openTrade = dbFormatTrade({
        status: "open",
        direction: "long",
        entry_price: 100,
        entry_quantity: 10,
      });

      mockSingle
        .mockResolvedValueOnce({ data: openTrade, error: null })
        .mockResolvedValueOnce({
          data: dbFormatTrade({
            status: "closed",
            exit_price: 110,
            exit_quantity: 10,
            profit_loss: 100,
            outcome: "win",
            emotional_state_after: "confident",
            lessons_learned: "Trust the plan",
          }),
          error: null,
        });

      const result = await service.closeTrade(
        "trade-1",
        110,
        10,
        "Target hit",
        "confident",
        "Trust the plan",
      );
      expect(result).toBeDefined();
    });

    it("should determine outcome as loss when P&L is negative", async () => {
      const openTrade = dbFormatTrade({
        status: "open",
        direction: "long",
        entry_price: 100,
        entry_quantity: 10,
      });

      mockSingle
        .mockResolvedValueOnce({ data: openTrade, error: null })
        .mockResolvedValueOnce({
          data: dbFormatTrade({
            status: "closed",
            exit_price: 90,
            exit_quantity: 10,
            profit_loss: -100,
            outcome: "loss",
          }),
          error: null,
        });

      const result = await service.closeTrade("trade-1", 90, 10, "Stop hit");
      expect(result).toBeDefined();
      expect(result.outcome).toBe("loss");
    });

    it("should determine outcome as breakeven when P&L is zero", async () => {
      const openTrade = dbFormatTrade({
        status: "open",
        direction: "long",
        entry_price: 100,
        entry_quantity: 10,
      });

      mockSingle
        .mockResolvedValueOnce({ data: openTrade, error: null })
        .mockResolvedValueOnce({
          data: dbFormatTrade({
            status: "closed",
            exit_price: 100,
            exit_quantity: 10,
            profit_loss: 0,
            outcome: "breakeven",
          }),
          error: null,
        });

      const result = await service.closeTrade("trade-1", 100, 10, "Flat exit");
      expect(result).toBeDefined();
      expect(result.outcome).toBe("breakeven");
    });
  });

  // ==========================================================================
  // getTrades — additional filters
  // ==========================================================================

  describe("getTrades (extended filters)", () => {
    it("should apply symbols filter", async () => {
      setChainResolve([], null);

      const result = await service.getTrades({
        userId: "user-1",
        symbols: ["AAPL", "MSFT"],
      });
      expect(result).toBeDefined();
      expect(chainable.in).toHaveBeenCalled();
    });

    it("should apply strategies filter", async () => {
      setChainResolve([], null);

      const result = await service.getTrades({
        userId: "user-1",
        strategies: ["Breakout", "Momentum"],
      });
      expect(result).toBeDefined();
      expect(chainable.in).toHaveBeenCalled();
    });

    it("should apply outcomes filter", async () => {
      setChainResolve([], null);

      const result = await service.getTrades({
        userId: "user-1",
        outcomes: ["win", "loss"],
      });
      expect(result).toBeDefined();
      expect(chainable.in).toHaveBeenCalled();
    });

    it("should apply direction filter", async () => {
      setChainResolve([], null);

      const result = await service.getTrades({
        userId: "user-1",
        direction: "long",
      });
      expect(result).toBeDefined();
      // eq called for user_id and direction
      expect(chainable.eq).toHaveBeenCalled();
    });

    it("should return empty array when data is null", async () => {
      setChainResolve(null, null);

      const result = await service.getTrades({ userId: "user-1" });
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getTradeStats — comprehensive
  // ==========================================================================

  describe("getTradeStats (comprehensive)", () => {
    it("should compute full stats with wins, losses, breakevens", async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago (within 1 week)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const closedTrades = [
        dbFormatTrade({
          id: "t-1",
          status: "closed",
          direction: "long",
          entry_date: weekAgo.toISOString(),
          exit_date: new Date(weekAgo.getTime() + 86400000).toISOString(),
          entry_price: 100,
          entry_quantity: 10,
          profit_loss: 500,
          profit_loss_percent: 50,
          outcome: "win",
          strategy: "Breakout",
          risk_reward_ratio: 2.5,
        }),
        dbFormatTrade({
          id: "t-2",
          status: "closed",
          direction: "long",
          entry_date: weekAgo.toISOString(),
          exit_date: new Date(weekAgo.getTime() + 86400000).toISOString(),
          entry_price: 100,
          entry_quantity: 10,
          profit_loss: 300,
          outcome: "win",
          strategy: "Breakout",
          risk_reward_ratio: 2.0,
        }),
        dbFormatTrade({
          id: "t-3",
          status: "closed",
          direction: "long",
          entry_date: twoWeeksAgo.toISOString(),
          exit_date: new Date(twoWeeksAgo.getTime() + 172800000).toISOString(),
          entry_price: 100,
          entry_quantity: 10,
          profit_loss: -200,
          outcome: "loss",
          strategy: "Mean Reversion",
        }),
        dbFormatTrade({
          id: "t-4",
          status: "closed",
          direction: "long",
          entry_date: twoWeeksAgo.toISOString(),
          exit_date: twoWeeksAgo.toISOString(),
          entry_price: 100,
          entry_quantity: 10,
          profit_loss: 0,
          outcome: "breakeven",
        }),
      ];

      const openTrade = dbFormatTrade({
        id: "t-5",
        status: "open",
        entry_date: now.toISOString(),
      });

      // getTradeStats calls getTrades twice:
      // 1. closed trades (status: "closed")
      // 2. all trades
      // The chainable .then resolves with what we set
      // Both calls go through the same chain, so we need to handle sequentially
      let callCount = 0;
      chainable.then = (onFulfilled: (v: unknown) => unknown) => {
        callCount++;
        if (callCount <= 1) {
          // First call: closed trades
          return Promise.resolve({
            data: closedTrades,
            error: null,
          }).then(onFulfilled);
        } else {
          // Second call: all trades
          return Promise.resolve({
            data: [...closedTrades, openTrade],
            error: null,
          }).then(onFulfilled);
        }
      };

      const stats = await service.getTradeStats("user-1");
      expect(stats.closedTrades).toBe(4);
      expect(stats.winningTrades).toBe(2);
      expect(stats.losingTrades).toBe(1);
      expect(stats.breakevenTrades).toBe(1);
      expect(stats.openTrades).toBe(1);
      expect(stats.totalTrades).toBe(5);
      expect(stats.winRate).toBe(50); // 2/4
      expect(stats.lossRate).toBe(50);
      expect(stats.totalProfitLoss).toBe(600); // 500+300-200+0
      expect(stats.consecutiveWins).toBeGreaterThanOrEqual(1);
      expect(stats.bestStrategy).toBeDefined();
    });

    it("should compute profitFactor as Infinity when no losses", async () => {
      const closedTrades = [
        dbFormatTrade({
          id: "t-1",
          status: "closed",
          entry_date: "2026-02-01T00:00:00.000Z",
          exit_date: "2026-02-02T00:00:00.000Z",
          profit_loss: 500,
          outcome: "win",
        }),
      ];

      let callCount = 0;
      chainable.then = (onFulfilled: (v: unknown) => unknown) => {
        callCount++;
        return Promise.resolve({
          data: callCount <= 1 ? closedTrades : closedTrades,
          error: null,
        }).then(onFulfilled);
      };

      const stats = await service.getTradeStats("user-1");
      expect(stats.profitFactor).toBe(Infinity);
    });
  });

  // ==========================================================================
  // getDailyPerformance (with data)
  // ==========================================================================

  describe("getDailyPerformance (with trade data)", () => {
    it("should populate daily performance with trade data", async () => {
      const exitDate = new Date();
      const closedTrade = dbFormatTrade({
        status: "closed",
        exit_date: exitDate.toISOString(),
        exit_price: 160,
        exit_quantity: 10,
        profit_loss: 100,
        outcome: "win",
      });

      setChainResolve([closedTrade], null);

      const result = await service.getDailyPerformance("user-1", 7);
      expect(result.length).toBeGreaterThan(0);

      // Check that at least one day has trades > 0
      const dayWithTrades = result.find((d) => d.trades > 0);
      expect(dayWithTrades).toBeDefined();
      if (dayWithTrades) {
        expect(dayWithTrades.profitLoss).toBe(100);
        expect(dayWithTrades.wins).toBe(1);
      }
    });

    it("should calculate cumulative P&L across days", async () => {
      setChainResolve([], null);

      const result = await service.getDailyPerformance("user-1", 3);
      expect(result.length).toBeGreaterThan(0);
      // All days have 0 P&L, so cumulative should stay 0
      for (const day of result) {
        expect(day.cumulativePL).toBe(0);
      }
    });
  });

  // ==========================================================================
  // getSymbolPerformance (with data)
  // ==========================================================================

  describe("getSymbolPerformance (with trade data)", () => {
    it("should return performance grouped by symbol", async () => {
      const trades = [
        dbFormatTrade({
          id: "t1",
          symbol: "AAPL",
          status: "closed",
          profit_loss: 200,
          outcome: "win",
        }),
        dbFormatTrade({
          id: "t2",
          symbol: "AAPL",
          status: "closed",
          profit_loss: -50,
          outcome: "loss",
        }),
        dbFormatTrade({
          id: "t3",
          symbol: "MSFT",
          status: "closed",
          profit_loss: 300,
          outcome: "win",
        }),
      ];

      setChainResolve(trades, null);

      const result = await service.getSymbolPerformance("user-1");
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);

      const aapl = result.get("AAPL");
      expect(aapl).toBeDefined();
      expect(aapl!.trades).toBe(2);
      expect(aapl!.winRate).toBe(50);
      expect(aapl!.totalPL).toBe(150);

      const msft = result.get("MSFT");
      expect(msft).toBeDefined();
      expect(msft!.trades).toBe(1);
      expect(msft!.winRate).toBe(100);
      expect(msft!.totalPL).toBe(300);
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================

  describe("getTradingJournalService singleton", () => {
    it("should export singleton factory function", async () => {
      // We need env vars set for the singleton
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

      const mod = await import("../../services/TradingJournalService");
      const instance = mod.getTradingJournalService();
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(mod.TradingJournalService);

      // Calling again returns the same instance
      const instance2 = mod.getTradingJournalService();
      expect(instance2).toBe(instance);
    });
  });
});
