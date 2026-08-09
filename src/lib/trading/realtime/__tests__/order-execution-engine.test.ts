/**
 * Order Execution Engine Tests
 *
 * Comprehensive tests covering construction, initialization, order execution,
 * price management, event handling, validation, status, and shutdown.
 */

import { Subject, BehaviorSubject } from "rxjs";

// ============================================================================
// MOCKS
// ============================================================================

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock realtime-trading-service
jest.mock("../../realtime/realtime-trading-service");

// Mock alpaca-broker
jest.mock("../../brokers/alpaca-broker");

// Mock order-manager
jest.mock("../../orders/order-manager");

import {
  OrderExecutionEngine,
  createOrderExecutionEngine,
  getOrderExecutionEngine,
  DEFAULT_EXECUTION_CONFIG,
} from "../order-execution-engine";

import { createRealtimeTradingService } from "../../realtime/realtime-trading-service";
import { createAlpacaBroker } from "../../brokers/alpaca-broker";
import { createOrderManager } from "../../orders/order-manager";

// ============================================================================
// HELPERS
// ============================================================================

function makeOrderRequest(overrides: Record<string, unknown> = {}) {
  return {
    symbol: "AAPL",
    side: "buy" as const,
    type: "market" as const,
    quantity: 10,
    timeInForce: "day" as const,
    ...overrides,
  };
}

// Shared mock references (reassigned in beforeEach after jest resets)
let mockBrokerConnect: jest.Mock;
let mockBrokerDisconnect: jest.Mock;
let mockBrokerPlaceOrder: jest.Mock;
let mockBrokerCancelOrder: jest.Mock;
let mockBrokerGetOrder: jest.Mock;
let mockBrokerGetOrders: jest.Mock;
let mockBrokerGetQuote: jest.Mock;
let mockBrokerGetConnectionStatus: jest.Mock;

let mockRealtimeConnect: jest.Mock;
let mockRealtimeDisconnect: jest.Mock;
let mockSubscribeQuotes: jest.Mock;
let mockUnsubscribeQuotes: jest.Mock;
let mockRealtimeGetStatus: jest.Mock;
let mockQuotes$: Subject<unknown>;
let mockOrderUpdates$: Subject<unknown>;
let mockTradeUpdates$: Subject<unknown>;
let mockDataConnection$: BehaviorSubject<string>;
let mockTradingConnection$: BehaviorSubject<string>;

let mockCreateOrder: jest.Mock;
let mockSubmitOrder: jest.Mock;
let mockHandleOrderUpdate: jest.Mock;
let mockCancelOrderMgr: jest.Mock;
let mockCancelAllOrdersMgr: jest.Mock;
let mockGetOpenOrders: jest.Mock;

async function createInitializedEngine(
  configOverrides: Record<string, unknown> = {},
) {
  const engine = new OrderExecutionEngine({
    mode: "paper",
    apiKey: "test-key",
    apiSecret: "test-secret",
    orderConfirmation: false,
    ...configOverrides,
  });
  await engine.initialize();
  return engine;
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrderExecutionEngine", () => {
  beforeEach(() => {
    // Rebuild RxJS subjects each test (resetMocks destroys mock state)
    mockQuotes$ = new Subject();
    mockOrderUpdates$ = new Subject();
    mockTradeUpdates$ = new Subject();
    mockDataConnection$ = new BehaviorSubject<string>("disconnected");
    mockTradingConnection$ = new BehaviorSubject<string>("disconnected");

    // Realtime service mocks
    mockRealtimeConnect = jest.fn().mockResolvedValue(undefined);
    mockRealtimeDisconnect = jest.fn();
    mockSubscribeQuotes = jest.fn();
    mockUnsubscribeQuotes = jest.fn();
    mockRealtimeGetStatus = jest.fn().mockReturnValue({
      dataConnection: "connected",
      tradingConnection: "connected",
      subscribedSymbols: [],
    });

    (createRealtimeTradingService as jest.Mock).mockReturnValue({
      connect: mockRealtimeConnect,
      disconnect: mockRealtimeDisconnect,
      subscribeQuotes: mockSubscribeQuotes,
      unsubscribeQuotes: mockUnsubscribeQuotes,
      getStatus: mockRealtimeGetStatus,
      quotes$: mockQuotes$,
      orderUpdates$: mockOrderUpdates$,
      tradeUpdates$: mockTradeUpdates$,
      dataConnection$: mockDataConnection$,
      tradingConnection$: mockTradingConnection$,
    });

    // Broker mocks
    mockBrokerConnect = jest.fn().mockResolvedValue(undefined);
    mockBrokerDisconnect = jest.fn();
    mockBrokerPlaceOrder = jest.fn();
    mockBrokerCancelOrder = jest.fn();
    mockBrokerGetOrder = jest.fn();
    mockBrokerGetOrders = jest.fn().mockResolvedValue([]);
    mockBrokerGetQuote = jest.fn();
    mockBrokerGetConnectionStatus = jest
      .fn()
      .mockReturnValue({ connected: true });

    (createAlpacaBroker as jest.Mock).mockReturnValue({
      connect: mockBrokerConnect,
      disconnect: mockBrokerDisconnect,
      placeOrder: mockBrokerPlaceOrder,
      cancelOrder: mockBrokerCancelOrder,
      getOrder: mockBrokerGetOrder,
      getOrders: mockBrokerGetOrders,
      getQuote: mockBrokerGetQuote,
      getConnectionStatus: mockBrokerGetConnectionStatus,
    });

    // Order manager mocks
    mockCreateOrder = jest.fn();
    mockSubmitOrder = jest.fn();
    mockHandleOrderUpdate = jest.fn();
    mockCancelOrderMgr = jest.fn();
    mockCancelAllOrdersMgr = jest.fn();
    mockGetOpenOrders = jest.fn().mockReturnValue([]);

    (createOrderManager as jest.Mock).mockReturnValue({
      createOrder: mockCreateOrder,
      submitOrder: mockSubmitOrder,
      handleOrderUpdate: mockHandleOrderUpdate,
      cancelOrder: mockCancelOrderMgr,
      cancelAllOrders: mockCancelAllOrdersMgr,
      getOpenOrders: mockGetOpenOrders,
    });
  });

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  describe("DEFAULT_EXECUTION_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_EXECUTION_CONFIG).toEqual({
        mode: "paper",
        apiKey: "",
        apiSecret: "",
        dataFeed: "iex",
        autoReconnect: true,
        priceValidation: true,
        maxPriceDeviation: 0.02,
        orderConfirmation: true,
        preTradeRiskCheck: true,
      });
    });

    it("should have valid mode values", () => {
      expect(["live", "paper", "simulation"]).toContain(
        DEFAULT_EXECUTION_CONFIG.mode,
      );
    });

    it("should have valid data feed values", () => {
      expect(["iex", "sip"]).toContain(DEFAULT_EXECUTION_CONFIG.dataFeed);
    });
  });

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  describe("Constructor", () => {
    it("should create engine with default config", () => {
      const engine = new OrderExecutionEngine();
      expect(engine).toBeDefined();
      expect(createRealtimeTradingService).toHaveBeenCalled();
      expect(createAlpacaBroker).toHaveBeenCalled();
      expect(createOrderManager).toHaveBeenCalled();
    });

    it("should merge custom config with defaults", () => {
      const engine = new OrderExecutionEngine({
        mode: "live",
        dataFeed: "sip",
      });
      expect(engine).toBeDefined();
      expect(createRealtimeTradingService).toHaveBeenCalledWith({
        paperTrading: false,
        dataFeed: "sip",
      });
    });
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe("initialize()", () => {
    it("should initialize with constructor credentials", async () => {
      const engine = new OrderExecutionEngine({
        apiKey: "ctor-key",
        apiSecret: "ctor-secret",
        mode: "paper",
      });
      await engine.initialize();

      expect(mockBrokerConnect).toHaveBeenCalledWith({
        apiKey: "ctor-key",
        apiSecret: "ctor-secret",
        paperTrading: true,
      });
      expect(mockRealtimeConnect).toHaveBeenCalledWith({
        apiKey: "ctor-key",
        apiSecret: "ctor-secret",
      });
    });

    it("should initialize with passed credentials", async () => {
      const engine = new OrderExecutionEngine({ mode: "paper" });
      await engine.initialize({
        apiKey: "passed-key",
        apiSecret: "passed-secret",
      });

      expect(mockBrokerConnect).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: "passed-key" }),
      );
    });

    it("should throw when no credentials are provided", async () => {
      const engine = new OrderExecutionEngine();
      await expect(engine.initialize()).rejects.toThrow(
        "API credentials required",
      );
    });

    it("should throw if broker connection fails", async () => {
      mockBrokerConnect.mockRejectedValue(new Error("Broker down"));
      const engine = new OrderExecutionEngine({
        apiKey: "k",
        apiSecret: "s",
      });
      await expect(engine.initialize()).rejects.toThrow("Broker down");
    });

    it("should throw if realtime connection fails", async () => {
      mockRealtimeConnect.mockRejectedValue(new Error("WS fail"));
      const engine = new OrderExecutionEngine({
        apiKey: "k",
        apiSecret: "s",
      });
      await expect(engine.initialize()).rejects.toThrow("WS fail");
    });

    it("should set paperTrading=false for live mode", async () => {
      const engine = new OrderExecutionEngine({
        mode: "live",
        apiKey: "k",
        apiSecret: "s",
      });
      await engine.initialize();

      expect(mockBrokerConnect).toHaveBeenCalledWith(
        expect.objectContaining({ paperTrading: false }),
      );
    });
  });

  // ==========================================================================
  // ORDER EXECUTION
  // ==========================================================================

  describe("executeOrder()", () => {
    it("should fail if engine is not initialized", async () => {
      const engine = new OrderExecutionEngine();
      const result = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("not initialized");
    });

    it("should return pending confirmation when confirmation is required", async () => {
      const engine = await createInitializedEngine({
        orderConfirmation: true,
      });

      const result = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(true);
      expect(result.executionId).toBeDefined();
    });

    it("should skip confirmation when skipConfirmation=true", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });
      mockSubmitOrder.mockResolvedValue({
        id: "ord-1",
        symbol: "AAPL",
        status: "submitted",
      });

      const engine = await createInitializedEngine({
        orderConfirmation: true,
      });
      const result = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
        true,
      );
      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
    });

    it("should execute immediately when confirmation is disabled", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });
      mockSubmitOrder.mockResolvedValue({
        id: "ord-1",
        symbol: "AAPL",
        status: "submitted",
      });

      const engine = await createInitializedEngine({
        orderConfirmation: false,
      });
      const result = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(true);
      expect(mockCreateOrder).toHaveBeenCalled();
      expect(mockSubmitOrder).toHaveBeenCalled();
    });

    it("should fail when order validation fails", async () => {
      mockCreateOrder.mockResolvedValue({
        order: null,
        validation: { valid: false, errors: ["bad order"] },
      });

      const engine = await createInitializedEngine();
      const result = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("validation failed");
    });

    it("should fail when broker submission fails", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });
      mockSubmitOrder.mockResolvedValue({
        id: "ord-1",
        status: "error",
        errorMessage: "Broker rejected",
      });

      const engine = await createInitializedEngine();
      const result = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("Broker rejected");
    });

    it("should fail when submitOrder returns null", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });
      mockSubmitOrder.mockResolvedValue(null);

      const engine = await createInitializedEngine();
      const result = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Submission failed");
    });

    it("should handle exceptions during execution", async () => {
      mockCreateOrder.mockRejectedValue(new Error("DB crash"));

      const engine = await createInitializedEngine();
      const result = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("DB crash");
    });

    it("should handle non-Error exceptions", async () => {
      mockCreateOrder.mockRejectedValue("string error");

      const engine = await createInitializedEngine();
      const result = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("should calculate slippage when quote and limit price available", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });
      mockSubmitOrder.mockResolvedValue({
        id: "ord-1",
        symbol: "AAPL",
        status: "submitted",
        limitPrice: 152,
      });

      const engine = await createInitializedEngine({
        priceValidation: false,
      });

      // Simulate a live price for AAPL
      mockBrokerGetQuote.mockResolvedValue({
        bid: 149,
        ask: 151,
        timestamp: new Date(),
      });
      await engine.getQuote("AAPL");

      const result = await engine.executeOrder(
        makeOrderRequest({ side: "buy" }),
        "user-1",
        "acct-1",
      );

      expect(result.success).toBe(true);
      expect(result.slippage).toBeDefined();
      expect(typeof result.slippage).toBe("number");
    });
  });

  // ==========================================================================
  // PRICE VALIDATION
  // ==========================================================================

  describe("Price Validation", () => {
    it("should reject market order when spread is zero (market closed)", async () => {
      const engine = await createInitializedEngine({
        priceValidation: true,
      });

      // Inject a zero-spread price
      mockBrokerGetQuote.mockResolvedValue({
        bid: 150,
        ask: 150,
        timestamp: new Date(),
      });
      await engine.getQuote("AAPL");

      const result = await engine.executeOrder(
        makeOrderRequest({ type: "market" }),
        "user-1",
        "acct-1",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Market appears closed");
    });

    it("should reject limit order with excessive price deviation", async () => {
      const engine = await createInitializedEngine({
        priceValidation: true,
        maxPriceDeviation: 0.02,
      });

      // Inject a live price
      mockBrokerGetQuote.mockResolvedValue({
        bid: 149,
        ask: 151,
        timestamp: new Date(),
      });
      await engine.getQuote("AAPL");

      // Limit price 10% away from ask
      const result = await engine.executeOrder(
        makeOrderRequest({
          type: "limit",
          limitPrice: 166, // >2% from ask of 151
          side: "buy",
        }),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("deviates");
    });

    it("should accept limit order within price deviation", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });
      mockSubmitOrder.mockResolvedValue({
        id: "ord-1",
        symbol: "AAPL",
        status: "submitted",
      });

      const engine = await createInitializedEngine({
        priceValidation: true,
        maxPriceDeviation: 0.02,
      });

      // Inject price
      mockBrokerGetQuote.mockResolvedValue({
        bid: 149,
        ask: 151,
        timestamp: new Date(),
      });
      await engine.getQuote("AAPL");

      // Limit price 0.6% from ask
      const result = await engine.executeOrder(
        makeOrderRequest({
          type: "limit",
          limitPrice: 152,
          side: "buy",
        }),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // CONFIRM / CANCEL EXECUTION
  // ==========================================================================

  describe("confirmExecution()", () => {
    it("should fail if execution not found", async () => {
      const engine = await createInitializedEngine();
      const result = await engine.confirmExecution(
        "no-such-id",
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Execution not found");
    });

    it("should confirm and submit a pending execution", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });
      mockSubmitOrder.mockResolvedValue({
        id: "ord-1",
        symbol: "AAPL",
        status: "submitted",
      });

      const engine = await createInitializedEngine({
        orderConfirmation: true,
      });
      const execResult = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      const eid = execResult.executionId!;
      expect(eid).toBeDefined();

      const confirmResult = await engine.confirmExecution(
        eid,
        "user-1",
        "acct-1",
      );
      expect(confirmResult.success).toBe(true);
      expect(confirmResult.order).toBeDefined();
    });

    it("should fail for already-executed execution", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });
      mockSubmitOrder.mockResolvedValue({
        id: "ord-1",
        symbol: "AAPL",
        status: "submitted",
      });

      const engine = await createInitializedEngine({
        orderConfirmation: true,
      });
      const execResult = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      const eid = execResult.executionId!;

      // Confirm once
      await engine.confirmExecution(eid, "user-1", "acct-1");
      // Confirm again
      const secondConfirm = await engine.confirmExecution(
        eid,
        "user-1",
        "acct-1",
      );
      expect(secondConfirm.success).toBe(false);
      expect(secondConfirm.error).toContain("Invalid status");
    });
  });

  describe("cancelPendingExecution()", () => {
    it("should cancel a pending execution", async () => {
      const engine = await createInitializedEngine({
        orderConfirmation: true,
      });
      const execResult = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      const eid = execResult.executionId!;

      const cancelled = engine.cancelPendingExecution(eid);
      expect(cancelled).toBe(true);
    });

    it("should return false for non-existent execution", () => {
      const engine = new OrderExecutionEngine();
      expect(engine.cancelPendingExecution("no-such-id")).toBe(false);
    });

    it("should return false for already-submitted execution", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });
      mockSubmitOrder.mockResolvedValue({
        id: "ord-1",
        symbol: "AAPL",
        status: "submitted",
      });

      const engine = await createInitializedEngine({
        orderConfirmation: true,
      });
      const execResult = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      const eid = execResult.executionId!;

      await engine.confirmExecution(eid, "user-1", "acct-1");

      // Now the execution is no longer pending_confirmation
      const cancelled = engine.cancelPendingExecution(eid);
      expect(cancelled).toBe(false);
    });
  });

  // ==========================================================================
  // CANCEL ORDERS
  // ==========================================================================

  describe("cancelOrder()", () => {
    it("should return false when not initialized", async () => {
      const engine = new OrderExecutionEngine();
      const result = await engine.cancelOrder("ord-1");
      expect(result).toBe(false);
    });

    it("should delegate to order manager", async () => {
      mockCancelOrderMgr.mockResolvedValue(true);
      const engine = await createInitializedEngine();
      const result = await engine.cancelOrder("ord-1");
      expect(result).toBe(true);
      expect(mockCancelOrderMgr).toHaveBeenCalledWith(
        "ord-1",
        expect.any(Object),
      );
    });
  });

  describe("cancelAllOrders()", () => {
    it("should return 0 when not initialized", async () => {
      const engine = new OrderExecutionEngine();
      const result = await engine.cancelAllOrders();
      expect(result).toBe(0);
    });

    it("should delegate to order manager", async () => {
      mockCancelAllOrdersMgr.mockResolvedValue(3);
      const engine = await createInitializedEngine();
      const result = await engine.cancelAllOrders();
      expect(result).toBe(3);
      expect(mockCancelAllOrdersMgr).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  // ==========================================================================
  // PRICE MANAGEMENT
  // ==========================================================================

  describe("watchSymbols()", () => {
    it("should subscribe to new symbols", async () => {
      const engine = await createInitializedEngine();
      engine.watchSymbols(["AAPL", "MSFT"]);
      expect(mockSubscribeQuotes).toHaveBeenCalledWith(["AAPL", "MSFT"]);
    });

    it("should not re-subscribe already watched symbols", async () => {
      const engine = await createInitializedEngine();
      engine.watchSymbols(["AAPL"]);
      engine.watchSymbols(["AAPL"]);
      expect(mockSubscribeQuotes).toHaveBeenCalledTimes(1);
    });

    it("should only subscribe to new symbols in mixed list", async () => {
      const engine = await createInitializedEngine();
      engine.watchSymbols(["AAPL"]);
      engine.watchSymbols(["AAPL", "MSFT"]);
      expect(mockSubscribeQuotes).toHaveBeenCalledTimes(2);
      expect(mockSubscribeQuotes).toHaveBeenLastCalledWith(["MSFT"]);
    });
  });

  describe("unwatchSymbols()", () => {
    it("should unsubscribe from symbols and clear price cache", async () => {
      const engine = await createInitializedEngine();
      engine.watchSymbols(["AAPL", "MSFT"]);

      // Simulate a price so it gets cached
      mockBrokerGetQuote.mockResolvedValue({
        bid: 149,
        ask: 151,
        timestamp: new Date(),
      });
      await engine.getQuote("AAPL");
      expect(engine.getLivePrice("AAPL")).toBeDefined();

      engine.unwatchSymbols(["AAPL"]);
      expect(mockUnsubscribeQuotes).toHaveBeenCalledWith(["AAPL"]);
      expect(engine.getLivePrice("AAPL")).toBeUndefined();
    });
  });

  describe("getLivePrice()", () => {
    it("should return undefined for unwatched symbol", () => {
      const engine = new OrderExecutionEngine();
      expect(engine.getLivePrice("XYZ")).toBeUndefined();
    });

    it("should return live price after quote update", async () => {
      const engine = await createInitializedEngine();

      // Simulate quote via the realtime stream
      mockQuotes$.next({
        symbol: "AAPL",
        bid: 149,
        ask: 151,
        bidSize: 100,
        askSize: 200,
        timestamp: new Date(),
      });

      const price = engine.getLivePrice("AAPL");
      expect(price).toBeDefined();
      expect(price!.symbol).toBe("AAPL");
      expect(price!.bid).toBe(149);
      expect(price!.ask).toBe(151);
      expect(price!.mid).toBe(150);
      expect(price!.spread).toBe(2);
    });
  });

  describe("getAllLivePrices()", () => {
    it("should return a copy of all live prices", async () => {
      const engine = await createInitializedEngine();

      mockQuotes$.next({
        symbol: "AAPL",
        bid: 149,
        ask: 151,
        bidSize: 100,
        askSize: 200,
        timestamp: new Date(),
      });
      mockQuotes$.next({
        symbol: "MSFT",
        bid: 410,
        ask: 412,
        bidSize: 50,
        askSize: 75,
        timestamp: new Date(),
      });

      const prices = engine.getAllLivePrices();
      expect(prices.size).toBe(2);
      expect(prices.get("AAPL")).toBeDefined();
      expect(prices.get("MSFT")).toBeDefined();

      // Verify it's a copy
      prices.delete("AAPL");
      expect(engine.getAllLivePrices().size).toBe(2);
    });
  });

  describe("getQuote()", () => {
    it("should fetch fresh quote from broker and cache it", async () => {
      mockBrokerGetQuote.mockResolvedValue({
        bid: 149,
        ask: 151,
        timestamp: new Date(),
      });

      const engine = await createInitializedEngine();
      const quote = await engine.getQuote("AAPL");

      expect(quote).not.toBeNull();
      expect(quote!.symbol).toBe("AAPL");
      expect(quote!.mid).toBe(150);
      expect(quote!.spread).toBe(2);
      expect(quote!.spreadPercent).toBeCloseTo(1.333, 2);
      expect(engine.getLivePrice("AAPL")).toBeDefined();
    });

    it("should return null on quote failure", async () => {
      mockBrokerGetQuote.mockRejectedValue(new Error("No data"));

      const engine = await createInitializedEngine();
      const quote = await engine.getQuote("AAPL");
      expect(quote).toBeNull();
    });

    it("should handle zero mid price correctly", async () => {
      mockBrokerGetQuote.mockResolvedValue({
        bid: 0,
        ask: 0,
        timestamp: new Date(),
      });

      const engine = await createInitializedEngine();
      const quote = await engine.getQuote("AAPL");
      expect(quote).not.toBeNull();
      expect(quote!.spreadPercent).toBe(0);
    });
  });

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  describe("Event Handlers", () => {
    it("should process quote updates and emit events", async () => {
      const engine = await createInitializedEngine();
      const events: unknown[] = [];
      engine.events$.subscribe((e) => events.push(e));

      mockQuotes$.next({
        symbol: "AAPL",
        bid: 149,
        ask: 151,
        bidSize: 100,
        askSize: 200,
        timestamp: new Date(),
      });

      expect(events.length).toBe(1);
      expect((events[0] as Record<string, unknown>).type).toBe("quote_update");
    });

    it("should process order updates and map statuses", async () => {
      const engine = await createInitializedEngine();
      const events: unknown[] = [];
      engine.events$.subscribe((e) => events.push(e));

      mockOrderUpdates$.next({
        orderId: "brok-1",
        clientOrderId: "cli-1",
        symbol: "AAPL",
        status: "filled",
        filledQuantity: 10,
        filledAvgPrice: 150.5,
        timestamp: new Date(),
      });

      expect(mockHandleOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "cli-1",
          status: "filled",
        }),
      );
      expect(events.length).toBe(1);
      expect((events[0] as Record<string, unknown>).type).toBe("order_filled");
    });

    it("should handle trade updates without error", async () => {
      const engine = await createInitializedEngine();

      // Just verifying it doesn't throw
      expect(() => {
        mockTradeUpdates$.next({
          symbol: "AAPL",
          price: 150,
          qty: 10,
          timestamp: new Date(),
        });
      }).not.toThrow();
    });

    it("should handle order update with unmapped status", async () => {
      const engine = await createInitializedEngine();
      const events: unknown[] = [];
      engine.events$.subscribe((e) => events.push(e));

      mockOrderUpdates$.next({
        orderId: "brok-1",
        clientOrderId: "cli-1",
        symbol: "AAPL",
        status: "unknown_status_xyz",
        filledQuantity: 0,
        filledAvgPrice: 0,
        timestamp: new Date(),
      });

      expect(mockHandleOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: "error" }),
      );
    });

    it("should map all known order statuses correctly", async () => {
      const engine = await createInitializedEngine();

      const statusMap: Record<string, string> = {
        new: "submitted",
        accepted: "accepted",
        partially_filled: "partial",
        filled: "filled",
        canceled: "cancelled",
        expired: "expired",
        rejected: "rejected",
      };

      for (const [incoming, expected] of Object.entries(statusMap)) {
        mockHandleOrderUpdate.mockClear();
        mockOrderUpdates$.next({
          orderId: "ord-1",
          clientOrderId: "cli-1",
          symbol: "AAPL",
          status: incoming,
          filledQuantity: 0,
          filledAvgPrice: 0,
          timestamp: new Date(),
        });
        expect(mockHandleOrderUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ status: expected }),
        );
      }
    });
  });

  // ==========================================================================
  // OBSERVABLES
  // ==========================================================================

  describe("Observables", () => {
    it("should provide events$ observable", async () => {
      const engine = await createInitializedEngine();
      expect(engine.events$).toBeDefined();
      expect(typeof engine.events$.subscribe).toBe("function");
    });

    it("should provide livePrices$ observable", async () => {
      const engine = await createInitializedEngine();
      expect(engine.livePrices$).toBeDefined();

      const prices: unknown[] = [];
      engine.livePrices$.subscribe((p) => prices.push(p));

      mockQuotes$.next({
        symbol: "AAPL",
        bid: 149,
        ask: 151,
        bidSize: 100,
        askSize: 200,
        timestamp: new Date(),
      });

      expect(prices.length).toBe(1);
    });

    it("should provide connectionState$ observable", () => {
      const engine = new OrderExecutionEngine();
      expect(engine.connectionState$).toBeDefined();
    });

    it("getPriceUpdates should filter by symbol", async () => {
      const engine = await createInitializedEngine();
      const aaplPrices: unknown[] = [];
      engine.getPriceUpdates("AAPL").subscribe((p) => aaplPrices.push(p));

      mockQuotes$.next({
        symbol: "MSFT",
        bid: 410,
        ask: 412,
        bidSize: 50,
        askSize: 75,
        timestamp: new Date(),
      });
      mockQuotes$.next({
        symbol: "AAPL",
        bid: 149,
        ask: 151,
        bidSize: 100,
        askSize: 200,
        timestamp: new Date(),
      });

      expect(aaplPrices.length).toBe(1);
    });

    it("getOrderEvents should filter by orderId", async () => {
      const engine = await createInitializedEngine();
      const ord1Events: unknown[] = [];
      engine.getOrderEvents("brok-1").subscribe((e) => ord1Events.push(e));

      // "filled" triggers an event with orderId
      mockOrderUpdates$.next({
        orderId: "brok-1",
        clientOrderId: "cli-1",
        symbol: "AAPL",
        status: "filled",
        filledQuantity: 10,
        filledAvgPrice: 150.5,
        timestamp: new Date(),
      });

      mockOrderUpdates$.next({
        orderId: "brok-2",
        clientOrderId: "cli-2",
        symbol: "MSFT",
        status: "filled",
        filledQuantity: 5,
        filledAvgPrice: 411,
        timestamp: new Date(),
      });

      expect(ord1Events.length).toBe(1);
    });
  });

  // ==========================================================================
  // STATUS
  // ==========================================================================

  describe("getStatus()", () => {
    it("should return full status object", async () => {
      const engine = await createInitializedEngine();
      engine.watchSymbols(["AAPL"]);

      const status = engine.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.mode).toBe("paper");
      expect(status.connections).toEqual({
        data: "connected",
        trading: "connected",
        broker: true,
      });
      expect(status.watchedSymbols).toEqual(["AAPL"]);
      expect(status.pendingExecutions).toBe(0);
      expect(status.openOrders).toEqual([]);
    });
  });

  describe("isReady()", () => {
    it("should return false when not initialized", () => {
      const engine = new OrderExecutionEngine();
      expect(engine.isReady()).toBe(false);
    });

    it("should return true when everything is connected", async () => {
      const engine = await createInitializedEngine();
      expect(engine.isReady()).toBe(true);
    });

    it("should return false when data is disconnected", async () => {
      const engine = await createInitializedEngine();
      mockRealtimeGetStatus.mockReturnValue({
        dataConnection: "disconnected",
        tradingConnection: "connected",
        subscribedSymbols: [],
      });
      expect(engine.isReady()).toBe(false);
    });

    it("should return false when broker is disconnected", async () => {
      const engine = await createInitializedEngine();
      mockBrokerGetConnectionStatus.mockReturnValue({ connected: false });
      expect(engine.isReady()).toBe(false);
    });
  });

  // ==========================================================================
  // SHUTDOWN
  // ==========================================================================

  describe("shutdown()", () => {
    it("should clean up all resources", async () => {
      const engine = await createInitializedEngine();
      engine.watchSymbols(["AAPL"]);

      mockQuotes$.next({
        symbol: "AAPL",
        bid: 149,
        ask: 151,
        bidSize: 100,
        askSize: 200,
        timestamp: new Date(),
      });

      engine.shutdown();

      expect(mockRealtimeDisconnect).toHaveBeenCalled();
      expect(mockBrokerDisconnect).toHaveBeenCalled();
      expect(engine.isReady()).toBe(false);
      expect(engine.getLivePrice("AAPL")).toBeUndefined();
      expect(engine.getAllLivePrices().size).toBe(0);
    });
  });

  // ==========================================================================
  // FACTORY FUNCTIONS
  // ==========================================================================

  describe("Factory functions", () => {
    it("createOrderExecutionEngine should create a new instance", () => {
      const engine = createOrderExecutionEngine({ mode: "paper" });
      expect(engine).toBeInstanceOf(OrderExecutionEngine);
    });

    it("getOrderExecutionEngine should return singleton", () => {
      const engine1 = getOrderExecutionEngine({ mode: "paper" });
      const engine2 = getOrderExecutionEngine();
      expect(engine1).toBe(engine2);
    });
  });

  // ==========================================================================
  // BROKER CLIENT ADAPTER
  // ==========================================================================

  describe("BrokerClient adapter (via submitExecution)", () => {
    it("should call broker.placeOrder through the adapter", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });

      mockBrokerPlaceOrder.mockResolvedValue({
        success: true,
        order: {
          id: "brok-ord-1",
          clientOrderId: "ord-1",
          status: "accepted",
        },
      });

      mockSubmitOrder.mockImplementation(
        async (
          _orderId: string,
          client: {
            submitOrder: (order: {
              symbol: string;
              side: string;
              qty: number;
              type: string;
              time_in_force: string;
            }) => Promise<unknown>;
          },
        ) => {
          await client.submitOrder({
            symbol: "AAPL",
            side: "buy",
            qty: 10,
            type: "market",
            time_in_force: "day",
          });
          return {
            id: "ord-1",
            symbol: "AAPL",
            status: "submitted",
          };
        },
      );

      const engine = await createInitializedEngine();
      await engine.executeOrder(makeOrderRequest(), "user-1", "acct-1");

      expect(mockBrokerPlaceOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: "AAPL",
          side: "buy",
          quantity: 10,
        }),
      );
    });

    it("should throw when placeOrder fails", async () => {
      mockCreateOrder.mockResolvedValue({
        order: {
          id: "ord-1",
          symbol: "AAPL",
          side: "buy",
          status: "pending",
        },
        validation: { valid: true },
      });

      mockBrokerPlaceOrder.mockResolvedValue({
        success: false,
        error: "Insufficient funds",
      });

      mockSubmitOrder.mockImplementation(
        async (
          _orderId: string,
          client: {
            submitOrder: (order: {
              symbol: string;
              side: string;
              qty: number;
              type: string;
              time_in_force: string;
            }) => Promise<unknown>;
          },
        ) => {
          try {
            await client.submitOrder({
              symbol: "AAPL",
              side: "buy",
              qty: 10,
              type: "market",
              time_in_force: "day",
            });
          } catch {
            return { id: "ord-1", status: "error", errorMessage: "Rejected" };
          }
          return { id: "ord-1", status: "submitted" };
        },
      );

      const engine = await createInitializedEngine();
      const result = await engine.executeOrder(
        makeOrderRequest(),
        "user-1",
        "acct-1",
      );
      expect(result.success).toBe(false);
    });
  });
});
