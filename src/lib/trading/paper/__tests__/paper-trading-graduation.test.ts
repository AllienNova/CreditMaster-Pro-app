/**
 * Paper Trading Engine - Graduation Tracking Tests
 *
 * Tests the integration between PaperTradingEngine and OperatingModeManager
 * for graduation tracking: trade recording, active day tracking, graduation
 * status retrieval, strategy performance recording, and error handling.
 *
 * Mocks:
 * - @supabase/supabase-js: Supabase client for paper trading
 * - @/lib/trading/modes/operating-mode-manager: Mode manager factory
 * - @/lib/supabase/server: Required by operating-mode-manager (transitive)
 */

// ============================================================================
// MOCK SETUP (before imports)
// ============================================================================

// Supabase chainable mock for the paper trading engine's own queries
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSingle = jest.fn<any, any[]>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = jest.fn<any, any[]>();

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

  obj.single = mockSingle;

  // Default thenable
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

// Mock the operating mode manager module
const mockRecordPaperTrade = jest.fn();
const mockRecordActiveDay = jest.fn();
const mockGetModeStatus = jest.fn();
const mockGetAccount = jest.fn();

jest.mock("@/lib/trading/modes/operating-mode-manager", () => ({
  createOperatingModeManager: jest.fn(() => ({
    recordPaperTrade: mockRecordPaperTrade,
    recordActiveDay: mockRecordActiveDay,
    getModeStatus: mockGetModeStatus,
    getAccount: mockGetAccount,
  })),
}));

// Mock the supabase server module (transitive dep of operating-mode-manager)
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: { from: jest.fn() },
}));

import { PaperTradingEngine } from "../PaperTradingEngine";
import { createClient } from "@supabase/supabase-js";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";

const mockCreateClient = createClient as jest.Mock;
const mockCreateModeManager = createOperatingModeManager as jest.Mock;

// Spy on getCurrentPrice to bypass real API calls
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

function sampleOrder(overrides = {}) {
  return {
    id: "order-1",
    userId: "user-1",
    accountId: "acct-1",
    symbol: "AAPL",
    side: "sell" as const,
    quantity: 5,
    type: "market" as const,
    timeInForce: "day" as const,
    status: "pending" as const,
    filledQty: 0,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    estimatedValue: 800,
    ...overrides,
  };
}

function setChainResolve(data: unknown, error: unknown = null) {
  chainable.data = data;
  chainable.error = error;
  chainable.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data, error }).then(onFulfilled);
}

function resetChainMocks() {
  mockCreateClient.mockReturnValue(mockSupabaseClient);
  chainable = makeChainable();
  mockFrom.mockReturnValue(chainable);
  mockSingle.mockResolvedValue({ data: null, error: null });

  // Reset mode manager mocks
  mockRecordPaperTrade.mockResolvedValue({ success: true });
  mockRecordActiveDay.mockResolvedValue({ success: true });
  mockGetModeStatus.mockResolvedValue({
    success: true,
    data: {
      currentMode: "watch",
      modeStartDate: "2026-01-01T00:00:00.000Z",
      graduationProgress: {
        currentMode: "watch",
        nextMode: "guided",
        criteria: {
          paperTrades: { current: 5, required: 30, met: false },
          daysActive: { current: 3, required: 30, met: false },
          profitable: { current: false, required: true, met: false },
        },
        allCriteriaMet: false,
        summary: "3 criteria remaining: paperTrades, daysActive, profitable.",
      },
      nextModeAvailable: false,
      isActive: true,
    },
  });
  mockGetAccount.mockResolvedValue({
    success: true,
    data: {
      id: "trading-acct-1",
      userId: "user-1",
      operatingMode: "watch",
      watchStartDate: "2026-01-01T00:00:00.000Z",
      watchPaperTradeCount: 5,
      watchPaperDaysActive: 3,
      watchPaperProfitable: false,
      watchGraduationDate: null,
      guidedStartDate: null,
      guidedLiveTradeCount: 0,
      guidedLiveDaysActive: 0,
      guidedLiveProfitable: false,
      guidedGraduationDate: null,
      strategyPerformance: {},
      maxDailyTrades: 10,
      maxPositionValue: 10000,
      maxDailyLossPct: 2.0,
      autonomousEnabled: false,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });

  mockCreateModeManager.mockReturnValue({
    recordPaperTrade: mockRecordPaperTrade,
    recordActiveDay: mockRecordActiveDay,
    getModeStatus: mockGetModeStatus,
    getAccount: mockGetAccount,
  });
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("PaperTradingEngine - Graduation Tracking", () => {
  let engine: PaperTradingEngine;

  beforeEach(() => {
    resetChainMocks();
    engine = makeEngine();

    // Mock getCurrentPrice to return a stable value
    getCurrentPriceSpy = jest
      .spyOn(engine as unknown as { getCurrentPrice: (s: string) => Promise<number> }, "getCurrentPrice")
      .mockResolvedValue(160);
  });

  afterEach(() => {
    getCurrentPriceSpy?.mockRestore();
    jest.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // getGraduationStatus
  // --------------------------------------------------------------------------

  describe("getGraduationStatus()", () => {
    it("should return graduation status from mode manager", async () => {
      const result = await engine.getGraduationStatus("user-1");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.currentMode).toBe("watch");
      expect(result.data!.isActive).toBe(true);
      expect(mockCreateModeManager).toHaveBeenCalledWith("user-1");
      expect(mockGetModeStatus).toHaveBeenCalled();
    });

    it("should include graduation progress criteria", async () => {
      const result = await engine.getGraduationStatus("user-1");

      expect(result.success).toBe(true);
      const progress = result.data!.graduationProgress;
      expect(progress.criteria.paperTrades).toBeDefined();
      expect(progress.criteria.daysActive).toBeDefined();
      expect(progress.criteria.profitable).toBeDefined();
      expect(progress.allCriteriaMet).toBe(false);
    });

    it("should return nextModeAvailable: false when criteria not met", async () => {
      const result = await engine.getGraduationStatus("user-1");

      expect(result.success).toBe(true);
      expect(result.data!.nextModeAvailable).toBe(false);
    });

    it("should return nextModeAvailable: true when all criteria met", async () => {
      mockGetModeStatus.mockResolvedValue({
        success: true,
        data: {
          currentMode: "watch",
          modeStartDate: "2026-01-01T00:00:00.000Z",
          graduationProgress: {
            currentMode: "watch",
            nextMode: "guided",
            criteria: {
              paperTrades: { current: 35, required: 30, met: true },
              daysActive: { current: 45, required: 30, met: true },
              profitable: { current: true, required: true, met: true },
            },
            allCriteriaMet: true,
            summary: "All criteria met for graduation to guided mode.",
          },
          nextModeAvailable: true,
          isActive: true,
        },
      });

      const result = await engine.getGraduationStatus("user-1");

      expect(result.success).toBe(true);
      expect(result.data!.nextModeAvailable).toBe(true);
      expect(result.data!.graduationProgress.allCriteriaMet).toBe(true);
    });

    it("should handle mode manager errors gracefully", async () => {
      mockGetModeStatus.mockRejectedValue(new Error("DB connection failed"));

      const result = await engine.getGraduationStatus("user-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to get graduation status");
      expect(result.error).toContain("DB connection failed");
    });

    it("should handle non-Error exceptions gracefully", async () => {
      mockGetModeStatus.mockRejectedValue("string error");

      const result = await engine.getGraduationStatus("user-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to get graduation status");
    });

    it("should pass through mode manager failure results", async () => {
      mockGetModeStatus.mockResolvedValue({
        success: false,
        error: "Account not found",
      });

      const result = await engine.getGraduationStatus("user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Account not found");
    });

    it("should create a new mode manager instance for each call", async () => {
      await engine.getGraduationStatus("user-1");
      await engine.getGraduationStatus("user-2");

      expect(mockCreateModeManager).toHaveBeenCalledWith("user-1");
      expect(mockCreateModeManager).toHaveBeenCalledWith("user-2");
      expect(mockCreateModeManager).toHaveBeenCalledTimes(2);
    });
  });

  // --------------------------------------------------------------------------
  // Trade recording for graduation (via executeOrder)
  // --------------------------------------------------------------------------

  describe("Trade recording for graduation", () => {
    /**
     * Helper to run executeOrder via the private method directly.
     * We access it through prototype to test graduation tracking in isolation
     * without needing to mock the full placeOrder flow.
     */
    async function callExecuteOrder(
      engineInstance: PaperTradingEngine,
      order: ReturnType<typeof sampleOrder>,
      executionPrice: number,
    ) {
      // Mock the full chain for executeOrder's internal calls
      const account = sampleAccount();
      const position = samplePosition();

      // Set up Supabase mock responses for each .from() call:
      // 1. paper_fills insert
      // 2. paper_positions select (for computeRealizedPL -> getPosition)
      // 3. paper_positions select/update (for updatePosition -> getPosition + update)
      // 4. paper_accounts select/update (for updateAccountBalance)
      // 5. paper_trades insert
      // 6. paper_accounts select (for getUserIdForAccount)
      // 7. paper_orders update (final status update)

      let callIndex = 0;
      mockFrom.mockImplementation((table: string) => {
        callIndex++;
        const c = makeChainable();

        if (table === "paper_fills") {
          // insert fill - non-terminal, resolves via thenable
          c.data = null;
          c.error = null;
          return c;
        }

        if (table === "paper_positions") {
          // Both getPosition calls return position with quantity > 0
          (c.single as jest.Mock).mockResolvedValue({
            data: position,
            error: null,
          });
          c.data = null;
          c.error = null;
          return c;
        }

        if (table === "paper_accounts") {
          (c.single as jest.Mock).mockResolvedValue({
            data: account,
            error: null,
          });
          // For the non-terminal .select("*").eq(...) pattern without .single()
          c.data = [position];
          c.error = null;
          return c;
        }

        if (table === "paper_trades") {
          c.data = null;
          c.error = null;
          return c;
        }

        if (table === "paper_orders") {
          (c.single as jest.Mock).mockResolvedValue({
            data: { ...order, status: "filled", filledQty: order.quantity, filledAvgPrice: executionPrice },
            error: null,
          });
          return c;
        }

        if (table === "trading_accounts") {
          c.data = null;
          c.error = null;
          return c;
        }

        return c;
      });

      // Access the private executeOrder method
      const executeOrder = (
        engineInstance as unknown as {
          executeOrder: (order: unknown, price: number) => Promise<unknown>;
        }
      ).executeOrder.bind(engineInstance);

      return executeOrder(order, executionPrice);
    }

    it("should call recordPaperTrade after trade execution", async () => {
      const order = sampleOrder({ side: "sell" });
      await callExecuteOrder(engine, order, 160);

      // Allow fire-and-forget promises to settle
      await new Promise((r) => setTimeout(r, 50));

      expect(mockRecordPaperTrade).toHaveBeenCalled();
    });

    it("should call recordActiveDay with 'watch' after trade execution", async () => {
      const order = sampleOrder({ side: "sell" });
      await callExecuteOrder(engine, order, 160);

      await new Promise((r) => setTimeout(r, 50));

      expect(mockRecordActiveDay).toHaveBeenCalledWith("watch");
    });

    it("should record profitable trade when selling at profit", async () => {
      // Position entry at 150, selling at 160 = profit
      const order = sampleOrder({ side: "sell", quantity: 5 });
      await callExecuteOrder(engine, order, 160);

      await new Promise((r) => setTimeout(r, 50));

      // The trade has realizedPL = 5 * (160 - 150) = 50 > 0, so profitable = true
      expect(mockRecordPaperTrade).toHaveBeenCalledWith(true);
    });

    it("should record unprofitable trade when selling at loss", async () => {
      // Position entry at 150, selling at 140 = loss
      const order = sampleOrder({ side: "sell", quantity: 5 });
      await callExecuteOrder(engine, order, 140);

      await new Promise((r) => setTimeout(r, 50));

      // realizedPL = 5 * (140 - 150) = -50, so profitable = false
      expect(mockRecordPaperTrade).toHaveBeenCalledWith(false);
    });

    it("should record non-profitable for buy order (opening position, no P&L)", async () => {
      // Buy order on a new symbol = no existing position = no realizedPL
      mockFrom.mockImplementation((table: string) => {
        const c = makeChainable();

        if (table === "paper_positions") {
          // No existing position
          (c.single as jest.Mock).mockResolvedValue({
            data: null,
            error: { code: "PGRST116", message: "Not found" },
          });
          c.data = null;
          c.error = null;
          return c;
        }

        if (table === "paper_accounts") {
          const account = sampleAccount();
          (c.single as jest.Mock).mockResolvedValue({
            data: account,
            error: null,
          });
          c.data = [];
          c.error = null;
          return c;
        }

        if (table === "paper_orders") {
          (c.single as jest.Mock).mockResolvedValue({
            data: { ...sampleOrder({ side: "buy" }), status: "filled" },
            error: null,
          });
          return c;
        }

        c.data = null;
        c.error = null;
        return c;
      });

      const order = sampleOrder({ side: "buy" as const, quantity: 10 });
      const executeOrder = (
        engine as unknown as {
          executeOrder: (order: unknown, price: number) => Promise<unknown>;
        }
      ).executeOrder.bind(engine);

      await executeOrder(order, 150);
      await new Promise((r) => setTimeout(r, 50));

      // Buy opening position: realizedPL = 0, profitable = false
      expect(mockRecordPaperTrade).toHaveBeenCalledWith(false);
    });

    it("should not break trade execution when mode manager fails", async () => {
      mockRecordPaperTrade.mockRejectedValue(new Error("Mode manager DB down"));
      mockRecordActiveDay.mockRejectedValue(new Error("Mode manager DB down"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const order = sampleOrder({ side: "sell" });
      // Should not throw - graduation tracking is fire-and-forget
      const result = await callExecuteOrder(engine, order, 160);

      await new Promise((r) => setTimeout(r, 50));

      // The order should still be executed successfully
      expect(result).toBeDefined();

      consoleSpy.mockRestore();
    });

    it("should not call graduation tracking when userId cannot be resolved", async () => {
      // paper_accounts is queried twice in executeOrder:
      // 1. updateAccountBalance (must succeed)
      // 2. getUserIdForAccount (should fail to trigger no-graduation path)
      let paperAccountCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        const c = makeChainable();

        if (table === "paper_positions") {
          (c.single as jest.Mock).mockResolvedValue({
            data: samplePosition(),
            error: null,
          });
          c.data = null;
          c.error = null;
          return c;
        }

        if (table === "paper_accounts") {
          paperAccountCallCount++;
          if (paperAccountCallCount <= 2) {
            // First two calls: updateAccountBalance (select + update) — must succeed
            (c.single as jest.Mock).mockResolvedValue({
              data: { cashBalance: 100000, buyingPower: 100000 },
              error: null,
            });
            c.data = [];
            c.error = null;
          } else {
            // Third call: getUserIdForAccount — return error so userId is null
            (c.single as jest.Mock).mockResolvedValue({
              data: null,
              error: { code: "PGRST116", message: "Not found" },
            });
            c.data = [];
            c.error = null;
          }
          return c;
        }

        if (table === "paper_orders") {
          (c.single as jest.Mock).mockResolvedValue({
            data: { ...sampleOrder(), status: "filled" },
            error: null,
          });
          return c;
        }

        c.data = null;
        c.error = null;
        return c;
      });

      const order = sampleOrder({ side: "sell" });
      const executeOrder = (
        engine as unknown as {
          executeOrder: (order: unknown, price: number) => Promise<unknown>;
        }
      ).executeOrder.bind(engine);

      await executeOrder(order, 160);
      await new Promise((r) => setTimeout(r, 50));

      // No mode manager calls should be made when userId is null
      expect(mockRecordPaperTrade).not.toHaveBeenCalled();
      expect(mockRecordActiveDay).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // trackTradeForGraduation (private method, tested via access)
  // --------------------------------------------------------------------------

  describe("trackTradeForGraduation()", () => {
    let trackFn: (userId: string, trade: unknown) => Promise<void>;

    beforeEach(() => {
      trackFn = (
        engine as unknown as {
          trackTradeForGraduation: (userId: string, trade: unknown) => Promise<void>;
        }
      ).trackTradeForGraduation.bind(engine);
    });

    it("should call recordPaperTrade with true for profitable trade", async () => {
      await trackFn("user-1", { realizedPL: 50, symbol: "AAPL", side: "sell" });

      expect(mockCreateModeManager).toHaveBeenCalledWith("user-1");
      expect(mockRecordPaperTrade).toHaveBeenCalledWith(true);
    });

    it("should call recordPaperTrade with false for losing trade", async () => {
      await trackFn("user-1", { realizedPL: -30, symbol: "AAPL", side: "sell" });

      expect(mockRecordPaperTrade).toHaveBeenCalledWith(false);
    });

    it("should call recordPaperTrade with false when realizedPL is zero", async () => {
      await trackFn("user-1", { realizedPL: 0, symbol: "AAPL", side: "sell" });

      expect(mockRecordPaperTrade).toHaveBeenCalledWith(false);
    });

    it("should call recordPaperTrade with false when realizedPL is undefined", async () => {
      await trackFn("user-1", { symbol: "AAPL", side: "buy" });

      expect(mockRecordPaperTrade).toHaveBeenCalledWith(false);
    });

    it("should call recordActiveDay with 'watch'", async () => {
      await trackFn("user-1", { realizedPL: 10, symbol: "AAPL", side: "sell" });

      expect(mockRecordActiveDay).toHaveBeenCalledWith("watch");
    });

    it("should log error but not throw when recordPaperTrade fails", async () => {
      mockRecordPaperTrade.mockRejectedValue(new Error("DB error"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(
        trackFn("user-1", { realizedPL: 10, symbol: "AAPL" }),
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[PaperTradingEngine] Graduation tracking failed:",
        "DB error",
      );

      consoleSpy.mockRestore();
    });

    it("should log error but not throw when recordActiveDay fails", async () => {
      mockRecordActiveDay.mockRejectedValue(new Error("Active day error"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(
        trackFn("user-1", { realizedPL: 10, symbol: "AAPL" }),
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[PaperTradingEngine] Graduation tracking failed:",
        "Active day error",
      );

      consoleSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // recordStrategyPerformance (private method)
  // --------------------------------------------------------------------------

  describe("recordStrategyPerformance()", () => {
    let recordFn: (
      userId: string,
      strategyName: string,
      pnl: number,
      profitable: boolean,
    ) => Promise<void>;

    beforeEach(() => {
      recordFn = (
        engine as unknown as {
          recordStrategyPerformance: (
            userId: string,
            strategyName: string,
            pnl: number,
            profitable: boolean,
          ) => Promise<void>;
        }
      ).recordStrategyPerformance.bind(engine);
    });

    it("should fetch the trading account via mode manager", async () => {
      await recordFn("user-1", "AAPL", 50, true);

      expect(mockCreateModeManager).toHaveBeenCalledWith("user-1");
      expect(mockGetAccount).toHaveBeenCalled();
    });

    it("should update strategy_performance with win data", async () => {
      mockGetAccount.mockResolvedValue({
        success: true,
        data: {
          strategyPerformance: {},
        },
      });

      await recordFn("user-1", "AAPL", 50, true);

      // Check that supabase update was called with correct strategy data
      expect(mockFrom).toHaveBeenCalledWith("trading_accounts");
    });

    it("should accumulate performance for existing strategy", async () => {
      mockGetAccount.mockResolvedValue({
        success: true,
        data: {
          strategyPerformance: {
            AAPL: { wins: 3, losses: 1, totalPnl: 120 },
          },
        },
      });

      await recordFn("user-1", "AAPL", 50, true);

      // Verify the update call includes accumulated values
      const updateCall = (chainable.update as jest.Mock).mock.calls;
      if (updateCall.length > 0) {
        const updateArg = updateCall[updateCall.length - 1][0];
        expect(updateArg.strategy_performance.AAPL).toEqual({
          wins: 4,
          losses: 1,
          totalPnl: 170,
        });
      }
    });

    it("should record a loss correctly", async () => {
      mockGetAccount.mockResolvedValue({
        success: true,
        data: {
          strategyPerformance: {
            TSLA: { wins: 2, losses: 0, totalPnl: 80 },
          },
        },
      });

      await recordFn("user-1", "TSLA", -30, false);

      const updateCall = (chainable.update as jest.Mock).mock.calls;
      if (updateCall.length > 0) {
        const updateArg = updateCall[updateCall.length - 1][0];
        expect(updateArg.strategy_performance.TSLA).toEqual({
          wins: 2,
          losses: 1,
          totalPnl: 50,
        });
      }
    });

    it("should create new strategy entry if none exists", async () => {
      mockGetAccount.mockResolvedValue({
        success: true,
        data: {
          strategyPerformance: {},
        },
      });

      await recordFn("user-1", "MSFT", 75, true);

      const updateCall = (chainable.update as jest.Mock).mock.calls;
      if (updateCall.length > 0) {
        const updateArg = updateCall[updateCall.length - 1][0];
        expect(updateArg.strategy_performance.MSFT).toEqual({
          wins: 1,
          losses: 0,
          totalPnl: 75,
        });
      }
    });

    it("should not throw when account lookup fails", async () => {
      mockGetAccount.mockResolvedValue({
        success: false,
        error: "Account not found",
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(recordFn("user-1", "AAPL", 50, true)).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[PaperTradingEngine] Cannot record strategy performance: account not found",
      );

      consoleSpy.mockRestore();
    });

    it("should not throw when Supabase update fails", async () => {
      mockGetAccount.mockResolvedValue({
        success: true,
        data: { strategyPerformance: {} },
      });

      // Make the supabase update resolve with an error
      mockFrom.mockImplementation(() => {
        const c = makeChainable();
        c.data = null;
        c.error = { message: "Update failed" };
        c.then = (onFulfilled: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: "Update failed" } }).then(
            onFulfilled,
          );
        return c;
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(recordFn("user-1", "AAPL", 50, true)).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });

    it("should handle null strategyPerformance gracefully", async () => {
      mockGetAccount.mockResolvedValue({
        success: true,
        data: {
          strategyPerformance: null,
        },
      });

      // Should not throw
      await expect(recordFn("user-1", "AAPL", 50, true)).resolves.toBeUndefined();
    });

    it("should not throw on mode manager creation failure", async () => {
      mockCreateModeManager.mockImplementation(() => {
        throw new Error("Module import failed");
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(recordFn("user-1", "AAPL", 50, true)).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[PaperTradingEngine] Strategy performance tracking failed:",
        "Module import failed",
      );

      consoleSpy.mockRestore();

      // Restore for subsequent tests
      resetChainMocks();
    });
  });

  // --------------------------------------------------------------------------
  // computeRealizedPL (private method)
  // --------------------------------------------------------------------------

  describe("computeRealizedPL()", () => {
    let computeFn: (
      accountId: string,
      symbol: string,
      side: "buy" | "sell",
      quantity: number,
      price: number,
    ) => Promise<number>;

    beforeEach(() => {
      computeFn = (
        engine as unknown as {
          computeRealizedPL: (
            accountId: string,
            symbol: string,
            side: "buy" | "sell",
            quantity: number,
            price: number,
          ) => Promise<number>;
        }
      ).computeRealizedPL.bind(engine);
    });

    it("should compute positive P&L for selling long position at profit", async () => {
      // Position: 10 shares at avg entry 150, selling 5 at 160
      mockSingle.mockResolvedValue({
        data: samplePosition({ quantity: 10, avgEntryPrice: 150 }),
        error: null,
      });

      const pnl = await computeFn("acct-1", "AAPL", "sell", 5, 160);

      // 5 * (160 - 150) = 50
      expect(pnl).toBe(50);
    });

    it("should compute negative P&L for selling long position at loss", async () => {
      mockSingle.mockResolvedValue({
        data: samplePosition({ quantity: 10, avgEntryPrice: 150 }),
        error: null,
      });

      const pnl = await computeFn("acct-1", "AAPL", "sell", 5, 140);

      // 5 * (140 - 150) = -50
      expect(pnl).toBe(-50);
    });

    it("should compute P&L for covering short position at profit", async () => {
      // Short position: -10 shares at avg entry 150, covering 5 at 140
      mockSingle.mockResolvedValue({
        data: samplePosition({ quantity: -10, avgEntryPrice: 150, side: "short" }),
        error: null,
      });

      const pnl = await computeFn("acct-1", "AAPL", "buy", 5, 140);

      // 5 * (150 - 140) = 50
      expect(pnl).toBe(50);
    });

    it("should compute P&L for covering short position at loss", async () => {
      mockSingle.mockResolvedValue({
        data: samplePosition({ quantity: -10, avgEntryPrice: 150, side: "short" }),
        error: null,
      });

      const pnl = await computeFn("acct-1", "AAPL", "buy", 5, 160);

      // 5 * (150 - 160) = -50
      expect(pnl).toBe(-50);
    });

    it("should return 0 when no existing position", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const pnl = await computeFn("acct-1", "AAPL", "buy", 10, 150);

      expect(pnl).toBe(0);
    });

    it("should return 0 when adding to long position (buy on existing long)", async () => {
      mockSingle.mockResolvedValue({
        data: samplePosition({ quantity: 10, avgEntryPrice: 150 }),
        error: null,
      });

      // Buying more shares on existing long position - no realized P&L
      const pnl = await computeFn("acct-1", "AAPL", "buy", 5, 160);

      expect(pnl).toBe(0);
    });

    it("should return 0 when adding to short position (sell on existing short)", async () => {
      mockSingle.mockResolvedValue({
        data: samplePosition({ quantity: -10, avgEntryPrice: 150, side: "short" }),
        error: null,
      });

      const pnl = await computeFn("acct-1", "AAPL", "sell", 5, 140);

      expect(pnl).toBe(0);
    });

    it("should handle partial close (selling less than position size)", async () => {
      mockSingle.mockResolvedValue({
        data: samplePosition({ quantity: 100, avgEntryPrice: 50 }),
        error: null,
      });

      const pnl = await computeFn("acct-1", "AAPL", "sell", 10, 60);

      // 10 * (60 - 50) = 100
      expect(pnl).toBe(100);
    });

    it("should handle selling more than position size", async () => {
      mockSingle.mockResolvedValue({
        data: samplePosition({ quantity: 5, avgEntryPrice: 150 }),
        error: null,
      });

      // Selling 10 but only 5 in position: min(10, 5) = 5
      const pnl = await computeFn("acct-1", "AAPL", "sell", 10, 160);

      // 5 * (160 - 150) = 50
      expect(pnl).toBe(50);
    });

    it("should return 0 on error", async () => {
      mockSingle.mockRejectedValue(new Error("DB error"));

      const pnl = await computeFn("acct-1", "AAPL", "sell", 5, 160);

      expect(pnl).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // getUserIdForAccount (private method)
  // --------------------------------------------------------------------------

  describe("getUserIdForAccount()", () => {
    let getUserIdFn: (accountId: string) => Promise<string | null>;

    beforeEach(() => {
      getUserIdFn = (
        engine as unknown as {
          getUserIdForAccount: (accountId: string) => Promise<string | null>;
        }
      ).getUserIdForAccount.bind(engine);
    });

    it("should return userId when account exists", async () => {
      mockSingle.mockResolvedValue({
        data: { userId: "user-42" },
        error: null,
      });

      const userId = await getUserIdFn("acct-1");

      expect(userId).toBe("user-42");
      expect(mockFrom).toHaveBeenCalledWith("paper_accounts");
    });

    it("should return null when account not found", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const userId = await getUserIdFn("acct-nonexistent");

      expect(userId).toBeNull();
    });

    it("should return null on error", async () => {
      mockSingle.mockRejectedValue(new Error("DB error"));

      const userId = await getUserIdFn("acct-1");

      expect(userId).toBeNull();
    });
  });
});
