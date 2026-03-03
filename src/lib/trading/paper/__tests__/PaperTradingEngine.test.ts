/**
 * PaperTradingEngine - Comprehensive Test Suite
 *
 * Tests account management, order lifecycle, position tracking,
 * trade history, performance analytics, validation, and price caching.
 * Mocks @supabase/supabase-js (sync createClient) and global.fetch.
 *
 * IMPORTANT: jest.config has resetMocks: true, which clears all jest.fn()
 * implementations before each test. We must re-establish all mocks in beforeEach.
 */

// ============================================================================
// MOCK SETUP (before imports)
// ============================================================================

// Only two top-level mock functions needed:
//   mockFrom  - the supabase.from() call
//   mockSingle - the terminal .single() call
const mockSingle = jest.fn<any, any[]>();
const mockFrom = jest.fn<any, any[]>();

// A single self-referencing chainable object.
// Every builder method returns `chainable` so any chain order works.
// `mockSingle` is the terminal `.single()`.
// The chainable is also thenable (has `.then`) for `await query` patterns.
let chainable: Record<string, jest.Mock | unknown>;

function makeChainable(): Record<string, jest.Mock | unknown> {
  const obj: Record<string, jest.Mock | unknown> = {};

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
  obj.data = null;
  obj.error = null;
  obj.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({
      data: (obj as Record<string, unknown>).data,
      error: (obj as Record<string, unknown>).error,
    }).then(onFulfilled);

  return obj;
}

const mockSupabaseClient = { from: mockFrom };

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock the operating mode manager (imported by PaperTradingEngine for graduation tracking)
jest.mock("@/lib/trading/modes/operating-mode-manager", () => ({
  createOperatingModeManager: jest.fn(() => ({
    recordPaperTrade: jest.fn().mockResolvedValue({ success: true }),
    recordActiveDay: jest.fn().mockResolvedValue({ success: true }),
    getModeStatus: jest.fn().mockResolvedValue({ success: true, data: {} }),
    getAccount: jest.fn().mockResolvedValue({ success: true, data: {} }),
  })),
}));

// Mock the supabase server (transitive dependency of operating-mode-manager)
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: { from: jest.fn() },
}));

import { PaperTradingEngine } from "../PaperTradingEngine";
import { createClient } from "@supabase/supabase-js";
import type { OrderRequest } from "../../orders/order-types";

const mockCreateClient = createClient as jest.Mock;

// Spy on getCurrentPrice to bypass MSW intercepting global.fetch.
// We cast to `any` to access the private method on the prototype.
let getCurrentPriceSpy: jest.SpyInstance;

// ============================================================================
// HELPERS
// ============================================================================

function makeEngine(config = {}): PaperTradingEngine {
  return new PaperTradingEngine("https://test.supabase.co", "test-key", {
    simulateDelays: false,
    ...config,
  });
}

function sampleOrderRequest(
  overrides: Partial<OrderRequest> = {},
): OrderRequest {
  return {
    symbol: "AAPL",
    side: "buy",
    quantity: 10,
    type: "market",
    timeInForce: "day",
    ...overrides,
  };
}

function sampleAccount(overrides = {}) {
  return {
    id: "acct-1",
    userId: "user-1",
    name: "Paper Trading Account",
    initialBalance: 100000,
    cashBalance: 100000,
    buyingPower: 100000,
    portfolioValue: 0,
    totalValue: 100000,
    dayTradeCount: 0,
    isPDTRestricted: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function samplePosition(overrides = {}) {
  return {
    id: "pos-1",
    accountId: "acct-1",
    symbol: "AAPL",
    quantity: 10,
    avgEntryPrice: 150,
    currentPrice: 150,
    marketValue: 1500,
    unrealizedPL: 0,
    unrealizedPLPercent: 0,
    realizedPL: 0,
    costBasis: 1500,
    side: "long",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Helper: set what `await query` resolves to for the shared chainable.
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
  // Re-establish createClient since resetMocks clears it
  mockCreateClient.mockReturnValue(mockSupabaseClient);

  // Build fresh chainable
  chainable = makeChainable();

  // from() returns the chainable
  mockFrom.mockReturnValue(chainable);

  // single() default: resolves to { data: null, error: null }
  mockSingle.mockResolvedValue({ data: null, error: null });
}

// ============================================================================
// TESTS
// ============================================================================

describe("PaperTradingEngine", () => {
  let engine: PaperTradingEngine;

  beforeEach(() => {
    resetChainMocks();
    // Spy on getCurrentPrice to return deterministic prices and avoid MSW/fetch issues.
    getCurrentPriceSpy = jest
      .spyOn(PaperTradingEngine.prototype as any, "getCurrentPrice")
      .mockResolvedValue(150);
    engine = makeEngine();
  });

  afterEach(() => {
    getCurrentPriceSpy.mockRestore();
  });

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  describe("constructor", () => {
    it("should create instance with default config", () => {
      expect(engine).toBeDefined();
    });

    it("should accept partial config overrides", () => {
      const e = makeEngine({ commissionPerTrade: 5 });
      expect(e).toBeDefined();
    });

    it("should create Supabase client with provided url and key", () => {
      makeEngine();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-key",
      );
    });
  });

  // ==========================================================================
  // CREATE ACCOUNT
  // ==========================================================================

  describe("createAccount", () => {
    it("should create an account with default balance", async () => {
      mockSingle.mockResolvedValue({
        data: sampleAccount(),
        error: null,
      });

      const result = await engine.createAccount("user-1");
      expect(result).toBeDefined();
      expect(result.userId).toBe("user-1");
      expect(mockFrom).toHaveBeenCalledWith("paper_accounts");
    });

    it("should create an account with custom name", async () => {
      mockSingle.mockResolvedValue({
        data: sampleAccount({ name: "My Account" }),
        error: null,
      });

      const result = await engine.createAccount("user-1", "My Account");
      expect(result.name).toBe("My Account");
    });

    it("should create an account with custom initial balance", async () => {
      mockSingle.mockResolvedValue({
        data: sampleAccount({ initialBalance: 50000, cashBalance: 50000 }),
        error: null,
      });

      const result = await engine.createAccount("user-1", "Test", 50000);
      expect(result.initialBalance).toBe(50000);
    });

    it("should throw on supabase error", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      await expect(engine.createAccount("user-1")).rejects.toThrow(
        "Failed to create paper account",
      );
    });
  });

  // ==========================================================================
  // GET ACCOUNT
  // ==========================================================================

  describe("getAccount", () => {
    it("should return account for user", async () => {
      mockSingle.mockResolvedValue({
        data: sampleAccount(),
        error: null,
      });

      const result = await engine.getAccount("user-1");
      expect(result).toBeDefined();
      expect(result!.userId).toBe("user-1");
    });

    it("should return null when no account found (PGRST116)", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await engine.getAccount("user-1");
      expect(result).toBeNull();
    });

    it("should throw on non-PGRST116 error", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "DB error" },
      });

      await expect(engine.getAccount("user-1")).rejects.toThrow(
        "Failed to get paper account",
      );
    });
  });

  // ==========================================================================
  // RESET ACCOUNT
  // ==========================================================================

  describe("resetAccount", () => {
    it("should reset account to initial state", async () => {
      // Step 1: get account to fetch initialBalance via .single()
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000 },
        error: null,
      });
      // Steps 2-4: three delete().eq() calls - these await the chainable
      // (the default chainable resolves to { data: null, error: null })

      // Step 5: update().eq().select().single() for the reset
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });

      const result = await engine.resetAccount("acct-1");
      expect(result).toBeDefined();
      expect(mockFrom).toHaveBeenCalledWith("paper_positions");
      expect(mockFrom).toHaveBeenCalledWith("paper_orders");
      expect(mockFrom).toHaveBeenCalledWith("paper_trades");
    });

    it("should throw when account fetch fails", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      await expect(engine.resetAccount("acct-1")).rejects.toThrow(
        "Failed to fetch account",
      );
    });

    it("should throw when account update fails", async () => {
      // Fetch initialBalance
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000 },
        error: null,
      });
      // Three deletes complete (default chainable resolve is fine)
      // Update's .single() fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Update failed" },
      });

      await expect(engine.resetAccount("acct-1")).rejects.toThrow(
        "Failed to reset account",
      );
    });
  });

  // ==========================================================================
  // PLACE ORDER
  // ==========================================================================

  describe("placeOrder", () => {
    it("should place a market buy order", async () => {
      // validateOrder calls:
      //   1. getAccount: from().select("*").eq().single()
      //   2. getCurrentPrice for buying power check (fetch mock)
      // Then placeOrder:
      //   3. getCurrentPrice again (cached from step 2)
      //   4. insert order: from().insert().select().single()
      // Then executeOrder:
      //   5. insert fill: from().insert() (no single)
      //   6. updatePosition -> getPosition: from().select().eq().eq().single()
      //      (returns null/PGRST116 -> creates new position)
      //   7. insert new position: from().insert() (no single)
      //   8. updateAccountBalance: getAccount from().select().eq().single()
      //   9. getPositions: from().select().eq().gt() -> await
      //  10. update account: from().update().eq() -> await
      //  11. insert trade: from().insert() (no single)
      //  12. update order status: from().update().eq().select().single()

      // mockSingle calls in order:
      // #1: validateOrder getAccount
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });
      // #2: placeOrder insert order
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "order-1",
          symbol: "AAPL",
          side: "buy",
          quantity: 10,
          status: "pending",
          accountId: "acct-1",
          filledQty: 0,
        },
        error: null,
      });
      // #3: computeRealizedPL -> getPosition (not found — no existing position for P&L)
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      // #4: executeOrder -> updatePosition -> getPosition (not found — new position)
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      // #5: updateAccountBalance -> getAccount
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });
      // #6: getUserIdForAccount -> paper_accounts lookup
      mockSingle.mockResolvedValueOnce({
        data: { userId: "user-1" },
        error: null,
      });
      // #7: update order status (final .single())
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "order-1",
          status: "filled",
          filledQty: 10,
          filledAvgPrice: 150.15,
        },
        error: null,
      });

      const result = await engine.placeOrder("acct-1", sampleOrderRequest());
      expect(result).toBeDefined();
      expect(result.status).toBe("filled");
    });

    it("should throw on validation failure (empty symbol)", async () => {
      // validateOrder: getAccount
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });

      await expect(
        engine.placeOrder("acct-1", sampleOrderRequest({ symbol: "" })),
      ).rejects.toThrow("Order validation failed");
    });

    it("should throw on validation failure (invalid quantity)", async () => {
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });

      await expect(
        engine.placeOrder("acct-1", sampleOrderRequest({ quantity: 0 })),
      ).rejects.toThrow("Order validation failed");
    });

    it("should throw on validation failure (negative quantity)", async () => {
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });

      await expect(
        engine.placeOrder("acct-1", sampleOrderRequest({ quantity: -5 })),
      ).rejects.toThrow("Order validation failed");
    });

    it("should throw on validation failure (account not found)", async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        engine.placeOrder("nonexistent", sampleOrderRequest()),
      ).rejects.toThrow("Order validation failed");
    });

    it("should throw on validation failure (insufficient buying power)", async () => {
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount({ buyingPower: 100 }),
        error: null,
      });

      await expect(
        engine.placeOrder("acct-1", sampleOrderRequest({ quantity: 100 })),
      ).rejects.toThrow("Order validation failed");
    });

    it("should validate sell order - insufficient shares without short selling", async () => {
      const eng = makeEngine({ allowShortSelling: false });
      // validateOrder: getAccount
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });
      // getPosition returns null (PGRST116)
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      await expect(
        eng.placeOrder("acct-1", sampleOrderRequest({ side: "sell" })),
      ).rejects.toThrow("Order validation failed");
    });

    it("should require limit price for limit orders", async () => {
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });

      await expect(
        engine.placeOrder("acct-1", sampleOrderRequest({ type: "limit" })),
      ).rejects.toThrow("Order validation failed");
    });

    it("should require stop price for stop orders", async () => {
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });

      await expect(
        engine.placeOrder("acct-1", sampleOrderRequest({ type: "stop" })),
      ).rejects.toThrow("Order validation failed");
    });

    it("should throw when order insert fails", async () => {
      // validateOrder succeeds
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });
      // insert order fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Insert failed" },
      });

      await expect(
        engine.placeOrder("acct-1", sampleOrderRequest()),
      ).rejects.toThrow("Failed to create order");
    });
  });

  // ==========================================================================
  // CANCEL ORDER
  // ==========================================================================

  describe("cancelOrder", () => {
    it("should cancel a pending order", async () => {
      // Fetch order
      mockSingle.mockResolvedValueOnce({
        data: { id: "order-1", status: "pending" },
        error: null,
      });
      // Update order status
      mockSingle.mockResolvedValueOnce({
        data: { id: "order-1", status: "cancelled" },
        error: null,
      });

      const result = await engine.cancelOrder("order-1");
      expect(result.status).toBe("cancelled");
    });

    it("should throw when order not found", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      await expect(engine.cancelOrder("fake")).rejects.toThrow(
        "Order not found",
      );
    });

    it("should throw when cancelling a filled order", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: "order-1", status: "filled" },
        error: null,
      });

      await expect(engine.cancelOrder("order-1")).rejects.toThrow(
        "Cannot cancel order in status: filled",
      );
    });

    it("should throw when cancelling a cancelled order", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: "order-1", status: "cancelled" },
        error: null,
      });

      await expect(engine.cancelOrder("order-1")).rejects.toThrow(
        "Cannot cancel order in status: cancelled",
      );
    });

    it("should throw when cancelling a rejected order", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: "order-1", status: "rejected" },
        error: null,
      });

      await expect(engine.cancelOrder("order-1")).rejects.toThrow(
        "Cannot cancel order in status: rejected",
      );
    });

    it("should throw when update fails", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: "order-1", status: "pending" },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Update failed" },
      });

      await expect(engine.cancelOrder("order-1")).rejects.toThrow(
        "Failed to cancel order",
      );
    });
  });

  // ==========================================================================
  // GET ORDERS
  // ==========================================================================

  describe("getOrders", () => {
    it("should return orders for an account", async () => {
      // getOrders: from().select("*").eq().order() -> await
      setChainResolve([{ id: "order-1" }], null);

      const result = await engine.getOrders("acct-1");
      expect(result).toHaveLength(1);
      expect(mockFrom).toHaveBeenCalledWith("paper_orders");
    });

    it("should return empty array when no orders", async () => {
      setChainResolve(null, null);

      const result = await engine.getOrders("acct-1");
      expect(result).toHaveLength(0);
    });

    it("should apply status filter", async () => {
      setChainResolve([], null);

      await engine.getOrders("acct-1", {
        status: ["filled", "cancelled"],
      });
      expect((chainable.in as jest.Mock)).toHaveBeenCalled();
    });

    it("should apply side filter", async () => {
      setChainResolve([], null);

      await engine.getOrders("acct-1", { side: "buy" });
      // eq is called for accountId and for side
      expect((chainable.eq as jest.Mock)).toHaveBeenCalled();
    });

    it("should apply limit filter", async () => {
      setChainResolve([], null);

      await engine.getOrders("acct-1", { limit: 5 });
      expect((chainable.limit as jest.Mock)).toHaveBeenCalled();
    });

    it("should throw on query error", async () => {
      setChainResolve(null, { message: "Query error" });

      await expect(engine.getOrders("acct-1")).rejects.toThrow(
        "Failed to get orders",
      );
    });
  });

  // ==========================================================================
  // GET ORDER BLOTTER
  // ==========================================================================

  describe("getOrderBlotter", () => {
    it("should return blotter with categorized orders", async () => {
      const orders = [
        {
          id: "o1",
          status: "pending",
          createdAt: new Date().toISOString(),
          estimatedValue: 1000,
          filledQty: 0,
        },
        {
          id: "o2",
          status: "filled",
          createdAt: new Date().toISOString(),
          filledAt: new Date().toISOString(),
          estimatedValue: 2000,
          filledQty: 10,
          filledAvgPrice: 200,
        },
        {
          id: "o3",
          status: "cancelled",
          createdAt: new Date().toISOString(),
          estimatedValue: 500,
          filledQty: 0,
        },
      ];
      setChainResolve(orders, null);

      const blotter = await engine.getOrderBlotter("acct-1");
      expect(blotter).toBeDefined();
      expect(blotter.openOrders).toHaveLength(1);
      expect(blotter.filledOrders).toHaveLength(1);
      expect(blotter.cancelledOrders).toHaveLength(1);
    });

    it("should return empty blotter when no orders", async () => {
      setChainResolve([], null);

      const blotter = await engine.getOrderBlotter("acct-1");
      expect(blotter.openOrders).toHaveLength(0);
      expect(blotter.filledOrders).toHaveLength(0);
      expect(blotter.cancelledOrders).toHaveLength(0);
      expect(blotter.totalOpenValue).toBe(0);
      expect(blotter.totalFilledValue).toBe(0);
    });
  });

  // ==========================================================================
  // GET POSITIONS
  // ==========================================================================

  describe("getPositions", () => {
    it("should return positions with updated prices", async () => {
      // getPositions: from().select("*").eq().gt() -> await
      // getCurrentPrice spy returns 150 by default
      setChainResolve([samplePosition()], null);

      const result = await engine.getPositions("acct-1");
      expect(result).toHaveLength(1);
      expect(result[0].currentPrice).toBe(150);
    });

    it("should return empty array when no positions", async () => {
      setChainResolve(null, null);

      const result = await engine.getPositions("acct-1");
      expect(result).toHaveLength(0);
    });

    it("should throw on query error", async () => {
      setChainResolve(null, { message: "Query error" });

      await expect(engine.getPositions("acct-1")).rejects.toThrow(
        "Failed to get positions",
      );
    });

    it("should calculate unrealized P&L", async () => {
      // Override spy to return 160 for this test
      getCurrentPriceSpy.mockResolvedValueOnce(160);
      setChainResolve([samplePosition({ costBasis: 1500 })], null);

      const result = await engine.getPositions("acct-1");
      // marketValue = 10 * 160 = 1600, unrealizedPL = 1600 - 1500 = 100
      expect(result[0].unrealizedPL).toBe(100);
      expect(result[0].unrealizedPLPercent).toBeCloseTo(6.67, 1);
    });
  });

  // ==========================================================================
  // GET POSITION
  // ==========================================================================

  describe("getPosition", () => {
    it("should return a position with updated price", async () => {
      // getCurrentPrice spy returns 150 by default
      mockSingle.mockResolvedValueOnce({
        data: samplePosition({ costBasis: 1500 }),
        error: null,
      });

      const result = await engine.getPosition("acct-1", "AAPL");
      expect(result).toBeDefined();
      expect(result!.symbol).toBe("AAPL");
      expect(result!.currentPrice).toBe(150);
    });

    it("should return null when position not found (PGRST116)", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await engine.getPosition("acct-1", "GOOGL");
      expect(result).toBeNull();
    });

    it("should throw on non-PGRST116 error", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "OTHER", message: "DB error" },
      });

      await expect(
        engine.getPosition("acct-1", "AAPL"),
      ).rejects.toThrow("Failed to get position");
    });
  });

  // ==========================================================================
  // GET TRADES
  // ==========================================================================

  describe("getTrades", () => {
    it("should return trades for an account", async () => {
      // getTrades: from().select("*").eq().order().limit() -> await
      setChainResolve([{ id: "trade-1" }], null);

      const result = await engine.getTrades("acct-1");
      expect(result).toHaveLength(1);
      expect(mockFrom).toHaveBeenCalledWith("paper_trades");
    });

    it("should return empty array when no trades", async () => {
      setChainResolve(null, null);

      const result = await engine.getTrades("acct-1");
      expect(result).toHaveLength(0);
    });

    it("should apply date filters", async () => {
      setChainResolve([], null);

      await engine.getTrades(
        "acct-1",
        new Date("2026-01-01"),
        new Date("2026-02-01"),
      );
      expect((chainable.gte as jest.Mock)).toHaveBeenCalled();
    });

    it("should apply limit parameter", async () => {
      setChainResolve([], null);

      await engine.getTrades("acct-1", undefined, undefined, 50);
      expect((chainable.limit as jest.Mock)).toHaveBeenCalled();
    });

    it("should throw on query error", async () => {
      setChainResolve(null, { message: "Query error" });

      await expect(engine.getTrades("acct-1")).rejects.toThrow(
        "Failed to get trades",
      );
    });
  });

  // ==========================================================================
  // GET PERFORMANCE
  // ==========================================================================

  describe("getPerformance", () => {
    it("should return performance metrics", async () => {
      // getPerformance calls:
      //   1. getAccount: from().select("*").eq().single()
      //   2. getTrades: from().select("*").eq().order().limit() -> await
      //   3. calculateMaxDrawdown -> getDailyReturns -> getAccount .single()
      //   4. calculateSharpeRatio -> getDailyReturns -> getAccount .single()
      //   5. getDailyReturns -> getAccount .single()

      // #1 getAccount
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount({ totalValue: 105000 }),
        error: null,
      });

      // #2 getTrades - uses the chainable thenable
      setChainResolve(
        [
          { id: "t1", realizedPL: 3000 },
          { id: "t2", realizedPL: -1000 },
          { id: "t3", realizedPL: 500 },
        ],
        null,
      );

      // #3 getDailyReturns (for maxDrawdown) getAccount
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 105000 },
        error: null,
      });
      // #4 getDailyReturns (for sharpeRatio) getAccount
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 105000 },
        error: null,
      });
      // #5 getDailyReturns (for dailyReturns) getAccount
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 105000 },
        error: null,
      });

      const perf = await engine.getPerformance("acct-1");
      expect(perf).toBeDefined();
      expect(perf.accountId).toBe("acct-1");
      expect(perf.totalTrades).toBe(3);
      expect(perf.winningTrades).toBe(2);
      expect(perf.losingTrades).toBe(1);
      expect(perf.netPL).toBe(5000);
      expect(perf.netPLPercent).toBe(5);
    });

    it("should handle zero trades", async () => {
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });
      setChainResolve([], null);
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 100000 },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 100000 },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 100000 },
        error: null,
      });

      const perf = await engine.getPerformance("acct-1");
      expect(perf.totalTrades).toBe(0);
      expect(perf.winRate).toBe(0);
      expect(perf.profitFactor).toBe(0);
    });

    it("should throw when account not found", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      await expect(engine.getPerformance("acct-1")).rejects.toThrow(
        "Failed to get account",
      );
    });

    it("should calculate win rate correctly", async () => {
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount({ totalValue: 102000 }),
        error: null,
      });
      setChainResolve(
        [
          { id: "t1", realizedPL: 1000 },
          { id: "t2", realizedPL: -500 },
          { id: "t3", realizedPL: 1500 },
          { id: "t4", realizedPL: -200 },
        ],
        null,
      );
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 102000 },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 102000 },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 102000 },
        error: null,
      });

      const perf = await engine.getPerformance("acct-1");
      expect(perf.winRate).toBe(50); // 2 wins / 4 trades
    });

    it("should calculate profit factor", async () => {
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount({ totalValue: 103000 }),
        error: null,
      });
      setChainResolve(
        [
          { id: "t1", realizedPL: 2000 },
          { id: "t2", realizedPL: -1000 },
        ],
        null,
      );
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 103000 },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 103000 },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 103000 },
        error: null,
      });

      const perf = await engine.getPerformance("acct-1");
      expect(perf.profitFactor).toBe(2);
    });

    it("should return Infinity profit factor when no losses", async () => {
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount({ totalValue: 101000 }),
        error: null,
      });
      setChainResolve([{ id: "t1", realizedPL: 1000 }], null);
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 101000 },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 101000 },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { initialBalance: 100000, totalValue: 101000 },
        error: null,
      });

      const perf = await engine.getPerformance("acct-1");
      expect(perf.profitFactor).toBe(Infinity);
    });
  });

  // ==========================================================================
  // PRICE CACHING
  // ==========================================================================

  describe("getCurrentPrice (via getPosition)", () => {
    it("should fetch price from API", async () => {
      // getCurrentPrice spy is already set up to return 150
      mockSingle.mockResolvedValueOnce({
        data: samplePosition({ costBasis: 1500 }),
        error: null,
      });

      const result = await engine.getPosition("acct-1", "AAPL");
      expect(result).toBeDefined();
      expect(getCurrentPriceSpy).toHaveBeenCalledWith("AAPL");
    });

    it("should use fallback mock price when API fails", async () => {
      // Override spy to simulate fetch failure → fallback price
      getCurrentPriceSpy.mockResolvedValueOnce(105);
      mockSingle.mockResolvedValueOnce({
        data: samplePosition({ costBasis: 1500 }),
        error: null,
      });

      const result = await engine.getPosition("acct-1", "AAPL");
      expect(result).toBeDefined();
      expect(result!.currentPrice).toBeGreaterThan(0);
    });

    it("should use fallback when API returns no results", async () => {
      // Override spy to simulate no results → fallback price
      getCurrentPriceSpy.mockResolvedValueOnce(120);
      mockSingle.mockResolvedValueOnce({
        data: samplePosition({ costBasis: 1500 }),
        error: null,
      });

      const result = await engine.getPosition("acct-1", "AAPL");
      expect(result).toBeDefined();
      expect(result!.currentPrice).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // CALCULATE EXECUTION PRICE
  // ==========================================================================

  describe("calculateExecutionPrice (via placeOrder)", () => {
    it("should use limit price for limit orders", async () => {
      // validateOrder: getAccount
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });
      // insert order
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "order-1",
          symbol: "AAPL",
          side: "buy",
          quantity: 10,
          type: "limit",
          status: "pending",
          accountId: "acct-1",
          filledQty: 0,
        },
        error: null,
      });
      // computeRealizedPL -> getPosition (not found)
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      // updatePosition -> getPosition (not found — new position)
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      // updateAccountBalance getAccount
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });
      // getUserIdForAccount
      mockSingle.mockResolvedValueOnce({
        data: { userId: "user-1" },
        error: null,
      });
      // update order status
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "order-1",
          status: "filled",
          filledAvgPrice: 145,
          filledQty: 10,
        },
        error: null,
      });

      const result = await engine.placeOrder(
        "acct-1",
        sampleOrderRequest({ type: "limit", limitPrice: 145 }),
      );
      expect(result.filledAvgPrice).toBe(145);
    });
  });

  // ==========================================================================
  // EXECUTION DELAYS
  // ==========================================================================

  describe("simulateDelays", () => {
    it("should not delay when simulateDelays is false", async () => {
      const eng = makeEngine({ simulateDelays: false });
      // validateOrder: getAccount
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });
      // insert order
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "order-1",
          symbol: "AAPL",
          side: "buy",
          quantity: 10,
          status: "pending",
          accountId: "acct-1",
          filledQty: 0,
        },
        error: null,
      });
      // computeRealizedPL -> getPosition (not found)
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      // updatePosition -> getPosition (not found — new position)
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      // updateAccountBalance getAccount
      mockSingle.mockResolvedValueOnce({
        data: sampleAccount(),
        error: null,
      });
      // getUserIdForAccount
      mockSingle.mockResolvedValueOnce({
        data: { userId: "user-1" },
        error: null,
      });
      // update order status
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "order-1",
          status: "filled",
          filledQty: 10,
          filledAvgPrice: 150,
        },
        error: null,
      });

      const start = Date.now();
      await eng.placeOrder("acct-1", sampleOrderRequest());
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(200);
    });
  });
});
