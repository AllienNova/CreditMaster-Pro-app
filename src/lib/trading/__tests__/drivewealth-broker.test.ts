/**
 * DriveWealthBroker - Comprehensive Test Suite
 *
 * Tests all 29 broker interface methods, connection management,
 * authentication, order management, position management, market data,
 * mapping functions, and error handling.
 * Mocks global.fetch.
 */

import { DriveWealthBroker, createDriveWealthBroker } from "../brokers/drivewealth-broker";
import type {
  BrokerCredentials,
  OrderRequest,
  BracketOrderRequest,
  OCOOrderRequest,
  OrderModification,
} from "../brokers/broker-interface";

// ============================================================================
// MOCK SETUP
// ============================================================================

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
  });
}

function mockFetchSequence(responses: { data: unknown; ok?: boolean; status?: number }[]) {
  const mockFn = jest.fn();
  for (const response of responses) {
    mockFn.mockResolvedValueOnce({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: jest.fn().mockResolvedValue(response.data),
    });
  }
  return mockFn;
}

// ============================================================================
// HELPERS
// ============================================================================

function mockCredentials(): BrokerCredentials {
  return {
    apiKey: "test-app-key",
    apiSecret: "test-secret",
    paperTrading: true,
  };
}

function dwAuthResponse() {
  return {
    access_token: "jwt-token-123",
    token_type: "Bearer",
    expires_in: 3600,
  };
}

function dwAccountResponse() {
  return {
    id: "dw-acc-123",
    accountNo: "DW00123456",
    status: "ACTIVE",
    currency: "USD",
    cash: 50000,
    equity: 75000,
    buyingPower: 100000,
    goodFaithViolations: 0,
    patternDayTrader: false,
    tradingBlocked: false,
    transfersBlocked: false,
  };
}

function dwPositionResponse() {
  return {
    id: "pos-123",
    symbol: "AAPL",
    qty: 10,
    side: "LONG",
    avgPrice: 150.0,
    marketPrice: 155.0,
    marketValue: 1550.0,
    costBasis: 1500.0,
    unrealizedPL: 50.0,
    unrealizedPLPercent: 3.33,
    realizedPL: 0,
    instrumentType: "EQUITY",
  };
}

function dwOrderResponse(overrides?: Record<string, unknown>) {
  return {
    id: "order-123",
    refID: "client-123",
    symbol: "AAPL",
    side: "BUY",
    type: "LIMIT",
    quantity: 10,
    filledQty: 0,
    status: "NEW",
    limitPrice: 150.0,
    stopPrice: null,
    trailPercent: null,
    trailAmount: null,
    timeInForce: "DAY",
    extendedHours: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    filledAt: null,
    avgFillPrice: null,
    legs: null,
    ...overrides,
  };
}

function dwQuoteResponse() {
  return {
    symbol: "AAPL",
    bid: 149.5,
    ask: 150.5,
    bidSize: 100,
    askSize: 200,
    lastTrade: 150.0,
    lastTradeSize: 50,
    volume: 10000,
    timestamp: "2026-01-01T00:00:00Z",
  };
}

function dwMarketHoursResponse(isOpen = true) {
  return {
    isOpen,
    openTime: "2026-01-05T14:30:00Z",
    closeTime: "2026-01-05T21:00:00Z",
    status: isOpen ? "OPEN" : "CLOSED",
  };
}

/**
 * Helper to connect the broker with mocked auth + account responses,
 * then replace fetch with a new mock for the subsequent test assertion.
 */
async function connectBroker(broker: DriveWealthBroker): Promise<void> {
  global.fetch = mockFetchSequence([
    { data: dwAuthResponse() },       // auth
    { data: [dwAccountResponse()] },   // getAccount (returns array)
  ]);
  await broker.connect(mockCredentials());
}

// ============================================================================
// TESTS
// ============================================================================

describe("DriveWealthBroker", () => {
  let broker: DriveWealthBroker;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    broker = new DriveWealthBroker();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // FACTORY
  // ==========================================================================

  describe("createDriveWealthBroker", () => {
    it("should create a new broker instance", () => {
      const instance = createDriveWealthBroker();
      expect(instance).toBeInstanceOf(DriveWealthBroker);
    });
  });

  // ==========================================================================
  // CONNECTION
  // ==========================================================================

  describe("connect", () => {
    it("should connect with sandbox credentials", async () => {
      global.fetch = mockFetchSequence([
        { data: dwAuthResponse() },
        { data: [dwAccountResponse()] },
      ]);

      const result = await broker.connect(mockCredentials());
      expect(result.connected).toBe(true);
      expect(result.accountId).toBe("dw-acc-123");
      expect(result.cash).toBe(50000);
      expect(result.portfolioValue).toBe(75000);
      expect(result.buyingPower).toBe(100000);
    });

    it("should use sandbox base URL for paper trading", async () => {
      global.fetch = mockFetchSequence([
        { data: dwAuthResponse() },
        { data: [dwAccountResponse()] },
      ]);

      await broker.connect(mockCredentials());
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("bo-api.drivewealth.io"),
        expect.any(Object),
      );
    });

    it("should use production base URL when paperTrading is false", async () => {
      global.fetch = mockFetchSequence([
        { data: dwAuthResponse() },
        { data: [dwAccountResponse()] },
      ]);

      await broker.connect({ ...mockCredentials(), paperTrading: false });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.drivewealth.io"),
        expect.any(Object),
      );
    });

    it("should use custom base URL when provided", async () => {
      global.fetch = mockFetchSequence([
        { data: dwAuthResponse() },
        { data: [dwAccountResponse()] },
      ]);

      await broker.connect({
        ...mockCredentials(),
        baseUrl: "https://custom-api.example.com",
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("custom-api.example.com"),
        expect.any(Object),
      );
    });

    it("should throw on authentication failure", async () => {
      global.fetch = mockFetchResponse(
        { message: "Invalid credentials" },
        false,
        401,
      );

      await expect(broker.connect(mockCredentials())).rejects.toThrow(
        "Invalid credentials",
      );
    });

    it("should include app key in auth request headers", async () => {
      global.fetch = mockFetchSequence([
        { data: dwAuthResponse() },
        { data: [dwAccountResponse()] },
      ]);

      await broker.connect(mockCredentials());
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/back-office/auth/tokens"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "dw-client-app-key": "test-app-key",
          }),
        }),
      );
    });

    it("should set dayTradesRemaining for non-PDT accounts", async () => {
      global.fetch = mockFetchSequence([
        { data: dwAuthResponse() },
        { data: [dwAccountResponse()] },
      ]);

      const result = await broker.connect(mockCredentials());
      expect(result.dayTradesRemaining).toBe(3);
    });

    it("should not set dayTradesRemaining for PDT accounts", async () => {
      global.fetch = mockFetchSequence([
        { data: dwAuthResponse() },
        { data: [{ ...dwAccountResponse(), patternDayTrader: true }] },
      ]);

      const result = await broker.connect(mockCredentials());
      expect(result.dayTradesRemaining).toBeUndefined();
    });
  });

  describe("disconnect", () => {
    it("should disconnect without error", async () => {
      await connectBroker(broker);
      await expect(broker.disconnect()).resolves.not.toThrow();
    });

    it("should set connected to false", async () => {
      await connectBroker(broker);
      await broker.disconnect();
      const status = broker.getConnectionStatus();
      expect(status.connected).toBe(false);
    });
  });

  describe("getConnectionStatus", () => {
    it("should return disconnected status before connect", () => {
      const status = broker.getConnectionStatus();
      expect(status.connected).toBe(false);
    });

    it("should return connected status after connect", async () => {
      await connectBroker(broker);
      const status = broker.getConnectionStatus();
      expect(status.connected).toBe(true);
    });

    it("should return lastHeartbeat as a Date", async () => {
      await connectBroker(broker);
      const status = broker.getConnectionStatus();
      expect(status.lastHeartbeat).toBeInstanceOf(Date);
    });

    it("should cap latency at 10 seconds", () => {
      const status = broker.getConnectionStatus();
      expect(status.latencyMs).toBeLessThanOrEqual(10000);
    });

    it("should return a valid market status", () => {
      const status = broker.getConnectionStatus();
      expect(["open", "closed", "pre_market", "after_hours"]).toContain(
        status.marketStatus,
      );
    });
  });

  // ==========================================================================
  // ACCOUNT
  // ==========================================================================

  describe("getAccount", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return account info", async () => {
      global.fetch = mockFetchResponse([dwAccountResponse()]);
      const account = await broker.getAccount();
      expect(account.id).toBe("dw-acc-123");
      expect(account.status).toBe("active");
      expect(account.currency).toBe("USD");
      expect(account.cash).toBe(50000);
      expect(account.portfolioValue).toBe(75000);
      expect(account.buyingPower).toBe(100000);
      expect(account.patternDayTrader).toBe(false);
      expect(account.tradingBlocked).toBe(false);
    });

    it("should throw when no accounts exist", async () => {
      global.fetch = mockFetchResponse([]);
      await expect(broker.getAccount()).rejects.toThrow(
        "No DriveWealth account found",
      );
    });

    it("should map RESTRICTED status", async () => {
      global.fetch = mockFetchResponse([
        { ...dwAccountResponse(), status: "RESTRICTED" },
      ]);
      const account = await broker.getAccount();
      expect(account.status).toBe("restricted");
    });

    it("should map SUSPENDED to restricted", async () => {
      global.fetch = mockFetchResponse([
        { ...dwAccountResponse(), status: "SUSPENDED" },
      ]);
      const account = await broker.getAccount();
      expect(account.status).toBe("restricted");
    });

    it("should map unknown status to disabled", async () => {
      global.fetch = mockFetchResponse([
        { ...dwAccountResponse(), status: "CLOSED" },
      ]);
      const account = await broker.getAccount();
      expect(account.status).toBe("disabled");
    });
  });

  // ==========================================================================
  // POSITIONS
  // ==========================================================================

  describe("getPositions", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return mapped positions", async () => {
      global.fetch = mockFetchResponse([dwPositionResponse()]);
      const positions = await broker.getPositions();
      expect(positions).toHaveLength(1);
      expect(positions[0].symbol).toBe("AAPL");
      expect(positions[0].quantity).toBe(10);
      expect(positions[0].side).toBe("long");
      expect(positions[0].entryPrice).toBe(150.0);
      expect(positions[0].currentPrice).toBe(155.0);
      expect(positions[0].marketValue).toBe(1550.0);
      expect(positions[0].costBasis).toBe(1500.0);
      expect(positions[0].unrealizedPL).toBe(50.0);
    });

    it("should return empty array when no positions", async () => {
      global.fetch = mockFetchResponse([]);
      const positions = await broker.getPositions();
      expect(positions).toHaveLength(0);
    });

    it("should map short positions", async () => {
      global.fetch = mockFetchResponse([
        { ...dwPositionResponse(), side: "SHORT" },
      ]);
      const positions = await broker.getPositions();
      expect(positions[0].side).toBe("short");
    });

    it("should map asset class CRYPTO", async () => {
      global.fetch = mockFetchResponse([
        { ...dwPositionResponse(), instrumentType: "CRYPTO" },
      ]);
      const positions = await broker.getPositions();
      expect(positions[0].assetClass).toBe("crypto");
    });

    it("should map asset class OPTION", async () => {
      global.fetch = mockFetchResponse([
        { ...dwPositionResponse(), instrumentType: "OPTION" },
      ]);
      const positions = await broker.getPositions();
      expect(positions[0].assetClass).toBe("option");
    });

    it("should default asset class to stock", async () => {
      global.fetch = mockFetchResponse([
        { ...dwPositionResponse(), instrumentType: "EQUITY" },
      ]);
      const positions = await broker.getPositions();
      expect(positions[0].assetClass).toBe("stock");
    });
  });

  describe("getPosition", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return a specific position by symbol", async () => {
      global.fetch = mockFetchResponse([dwPositionResponse()]);
      const pos = await broker.getPosition("AAPL");
      expect(pos).not.toBeNull();
      expect(pos!.symbol).toBe("AAPL");
    });

    it("should return null when position not found", async () => {
      global.fetch = mockFetchResponse([]);
      const pos = await broker.getPosition("UNKNOWN");
      expect(pos).toBeNull();
    });

    it("should return null on API error", async () => {
      global.fetch = mockFetchResponse(
        { message: "Server error" },
        false,
        500,
      );
      const pos = await broker.getPosition("AAPL");
      expect(pos).toBeNull();
    });
  });

  // ==========================================================================
  // ORDERS
  // ==========================================================================

  describe("getOrders", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return mapped orders", async () => {
      global.fetch = mockFetchResponse([dwOrderResponse()]);
      const orders = await broker.getOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe("order-123");
      expect(orders[0].symbol).toBe("AAPL");
      expect(orders[0].side).toBe("buy");
      expect(orders[0].type).toBe("limit");
    });

    it("should return empty array when no orders", async () => {
      global.fetch = mockFetchResponse([]);
      const orders = await broker.getOrders();
      expect(orders).toHaveLength(0);
    });

    it("should pass status filter", async () => {
      global.fetch = mockFetchResponse([]);
      await broker.getOrders({ status: "new" });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("status=NEW"),
        expect.any(Object),
      );
    });

    it("should pass symbol filter", async () => {
      global.fetch = mockFetchResponse([]);
      await broker.getOrders({ symbol: "AAPL" });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("symbol=AAPL"),
        expect.any(Object),
      );
    });

    it("should pass multiple status filters", async () => {
      global.fetch = mockFetchResponse([]);
      await broker.getOrders({ status: ["new", "filled"] });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("status=NEW%2CFILLED"),
        expect.any(Object),
      );
    });
  });

  describe("getOrder", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return a specific order", async () => {
      global.fetch = mockFetchResponse(dwOrderResponse());
      const order = await broker.getOrder("order-123");
      expect(order).not.toBeNull();
      expect(order!.id).toBe("order-123");
    });

    it("should return null when order not found", async () => {
      global.fetch = mockFetchResponse(
        { message: "Not found" },
        false,
        404,
      );
      const order = await broker.getOrder("unknown");
      expect(order).toBeNull();
    });

    it("should map order with filled data", async () => {
      global.fetch = mockFetchResponse(
        dwOrderResponse({
          status: "FILLED",
          filledQty: 10,
          filledAt: "2026-01-01T12:00:00Z",
          avgFillPrice: 151.5,
        }),
      );
      const order = await broker.getOrder("order-123");
      expect(order!.status).toBe("filled");
      expect(order!.filledQuantity).toBe(10);
      expect(order!.filledAt).toBeInstanceOf(Date);
      expect(order!.filledAvgPrice).toBe(151.5);
    });
  });

  describe("getOrderHistory", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return order history", async () => {
      global.fetch = mockFetchResponse([dwOrderResponse({ status: "FILLED" })]);
      const orders = await broker.getOrderHistory({ limit: 10 });
      expect(orders).toHaveLength(1);
    });

    it("should pass date filters", async () => {
      global.fetch = mockFetchResponse([]);
      const after = new Date("2026-01-01");
      const until = new Date("2026-01-31");
      await broker.getOrderHistory({ after, until });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("from="),
        expect.any(Object),
      );
    });
  });

  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================

  describe("placeOrder", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should place a market order", async () => {
      global.fetch = mockFetchResponse(dwOrderResponse({ type: "MARKET" }));
      const result = await broker.placeOrder({
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 10,
        timeInForce: "day",
      });
      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order!.symbol).toBe("AAPL");
    });

    it("should place a limit order", async () => {
      global.fetch = mockFetchResponse(dwOrderResponse());
      const result = await broker.placeOrder({
        symbol: "AAPL",
        side: "buy",
        type: "limit",
        quantity: 10,
        limitPrice: 150,
        timeInForce: "gtc",
      });
      expect(result.success).toBe(true);
    });

    it("should place a stop order", async () => {
      global.fetch = mockFetchResponse(dwOrderResponse({ type: "STOP" }));
      const result = await broker.placeOrder({
        symbol: "AAPL",
        side: "sell",
        type: "stop",
        quantity: 5,
        stopPrice: 140,
      });
      expect(result.success).toBe(true);
    });

    it("should place a stop-limit order", async () => {
      global.fetch = mockFetchResponse(dwOrderResponse({ type: "STOP_LIMIT" }));
      const result = await broker.placeOrder({
        symbol: "AAPL",
        side: "sell",
        type: "stop_limit",
        quantity: 5,
        limitPrice: 139,
        stopPrice: 140,
      });
      expect(result.success).toBe(true);
    });

    it("should include client order ID when provided", async () => {
      global.fetch = mockFetchResponse(dwOrderResponse());
      await broker.placeOrder({
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 10,
        clientOrderId: "my-ref-123",
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("my-ref-123"),
        }),
      );
    });

    it("should return error on API failure", async () => {
      global.fetch = mockFetchResponse(
        { message: "Insufficient buying power" },
        false,
        422,
      );
      const result = await broker.placeOrder({
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 100000,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Insufficient buying power");
    });

    it("should handle network errors", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network timeout"));
      const result = await broker.placeOrder({
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 10,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network timeout");
    });

    it("should send correct body structure", async () => {
      global.fetch = mockFetchResponse(dwOrderResponse());
      await broker.placeOrder({
        symbol: "TSLA",
        side: "sell",
        type: "limit",
        quantity: 5,
        limitPrice: 200,
        timeInForce: "gtc",
        extendedHours: true,
      });
      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(callBody.symbol).toBe("TSLA");
      expect(callBody.side).toBe("SELL");
      expect(callBody.type).toBe("LIMIT");
      expect(callBody.quantity).toBe(5);
      expect(callBody.limitPrice).toBe(200);
      expect(callBody.timeInForce).toBe("GTC");
      expect(callBody.extendedHours).toBe(true);
    });
  });

  describe("placeBracketOrder", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should place bracket order with three legs", async () => {
      global.fetch = mockFetchSequence([
        { data: dwOrderResponse({ type: "MARKET" }) },     // entry
        { data: dwOrderResponse({ type: "LIMIT" }) },      // take-profit
        { data: dwOrderResponse({ type: "STOP" }) },       // stop-loss
      ]);
      const result = await broker.placeBracketOrder({
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
        entryType: "market",
        takeProfitPrice: 160,
        stopLossPrice: 140,
      });
      expect(result.success).toBe(true);
      expect(result.entryOrder).toBeDefined();
      expect(result.takeProfitOrder).toBeDefined();
      expect(result.stopLossOrder).toBeDefined();
    });

    it("should place bracket order with limit entry", async () => {
      global.fetch = mockFetchSequence([
        { data: dwOrderResponse({ type: "LIMIT" }) },
        { data: dwOrderResponse({ type: "LIMIT" }) },
        { data: dwOrderResponse({ type: "STOP" }) },
      ]);
      const result = await broker.placeBracketOrder({
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
        entryType: "limit",
        entryPrice: 150,
        takeProfitPrice: 160,
        stopLossPrice: 140,
      });
      expect(result.success).toBe(true);
    });

    it("should place bracket order with stop-loss limit price", async () => {
      global.fetch = mockFetchSequence([
        { data: dwOrderResponse() },
        { data: dwOrderResponse() },
        { data: dwOrderResponse({ type: "STOP_LIMIT" }) },
      ]);
      const result = await broker.placeBracketOrder({
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
        entryType: "market",
        takeProfitPrice: 160,
        stopLossPrice: 140,
        stopLossLimitPrice: 139,
      });
      expect(result.success).toBe(true);
    });

    it("should return error on bracket order failure", async () => {
      global.fetch = mockFetchResponse(
        { message: "Order rejected" },
        false,
        422,
      );
      const result = await broker.placeBracketOrder({
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
        entryType: "market",
        takeProfitPrice: 160,
        stopLossPrice: 140,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Order rejected");
    });

    it("should use opposite side for exit orders (buy entry → sell exit)", async () => {
      global.fetch = mockFetchSequence([
        { data: dwOrderResponse() },
        { data: dwOrderResponse() },
        { data: dwOrderResponse() },
      ]);
      await broker.placeBracketOrder({
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
        entryType: "market",
        takeProfitPrice: 160,
        stopLossPrice: 140,
      });
      // Take-profit call (2nd fetch call)
      const tpBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[1][1].body,
      );
      expect(tpBody.side).toBe("SELL");
    });
  });

  describe("placeOCOOrder", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should place OCO order with two legs", async () => {
      global.fetch = mockFetchSequence([
        { data: dwOrderResponse({ type: "LIMIT" }) },
        { data: dwOrderResponse({ type: "STOP" }) },
      ]);
      const result = await broker.placeOCOOrder({
        symbol: "AAPL",
        side: "sell",
        quantity: 10,
        limitPrice: 150,
        takeProfitPrice: 160,
        stopLossPrice: 140,
      });
      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(2);
    });

    it("should return error on OCO failure", async () => {
      global.fetch = mockFetchResponse(
        { message: "OCO rejected" },
        false,
        422,
      );
      const result = await broker.placeOCOOrder({
        symbol: "AAPL",
        side: "sell",
        quantity: 10,
        limitPrice: 150,
        takeProfitPrice: 160,
        stopLossPrice: 140,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("modifyOrder", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should modify an order's limit price", async () => {
      global.fetch = mockFetchResponse(
        dwOrderResponse({ limitPrice: 155.0 }),
      );
      const result = await broker.modifyOrder("order-123", {
        limitPrice: 155,
      });
      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
    });

    it("should modify quantity", async () => {
      global.fetch = mockFetchResponse(dwOrderResponse({ quantity: 20 }));
      const result = await broker.modifyOrder("order-123", { quantity: 20 });
      expect(result.success).toBe(true);
    });

    it("should modify stop price", async () => {
      global.fetch = mockFetchResponse(dwOrderResponse({ stopPrice: 145 }));
      const result = await broker.modifyOrder("order-123", { stopPrice: 145 });
      expect(result.success).toBe(true);
    });

    it("should modify time in force", async () => {
      global.fetch = mockFetchResponse(
        dwOrderResponse({ timeInForce: "GTC" }),
      );
      const result = await broker.modifyOrder("order-123", {
        timeInForce: "gtc",
      });
      expect(result.success).toBe(true);
    });

    it("should return error on modify failure", async () => {
      global.fetch = mockFetchResponse(
        { message: "Cannot modify" },
        false,
        422,
      );
      const result = await broker.modifyOrder("order-123", { limitPrice: 155 });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot modify");
    });
  });

  describe("cancelOrder", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should cancel an order", async () => {
      global.fetch = mockFetchResponse({});
      const result = await broker.cancelOrder("order-123");
      expect(result.success).toBe(true);
      expect(result.orderId).toBe("order-123");
    });

    it("should handle cancel failure", async () => {
      global.fetch = mockFetchResponse(
        { message: "Cannot cancel filled order" },
        false,
        422,
      );
      const result = await broker.cancelOrder("order-123");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot cancel filled order");
    });

    it("should use DELETE method", async () => {
      global.fetch = mockFetchResponse({});
      await broker.cancelOrder("order-123");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/back-office/orders/order-123"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("cancelAllOrders", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should cancel all open orders", async () => {
      // First call returns open orders, then cancels each
      global.fetch = mockFetchSequence([
        { data: [dwOrderResponse(), dwOrderResponse({ id: "order-456" })] },
        { data: {} },
        { data: {} },
      ]);
      const results = await broker.cancelAllOrders();
      expect(results).toHaveLength(2);
    });

    it("should return empty array when no orders to cancel", async () => {
      global.fetch = mockFetchResponse([]);
      const results = await broker.cancelAllOrders();
      expect(results).toHaveLength(0);
    });

    it("should return empty array on error", async () => {
      global.fetch = mockFetchResponse(
        { message: "Server error" },
        false,
        500,
      );
      const results = await broker.cancelAllOrders();
      expect(results).toHaveLength(0);
    });
  });

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  describe("closePosition", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should close a position", async () => {
      global.fetch = mockFetchSequence([
        { data: [dwPositionResponse()] },      // getPositions
        { data: dwOrderResponse({ type: "MARKET", side: "SELL" }) },  // placeOrder
      ]);
      const result = await broker.closePosition("AAPL");
      expect(result.success).toBe(true);
    });

    it("should return error when position not found", async () => {
      global.fetch = mockFetchResponse([]);
      const result = await broker.closePosition("UNKNOWN");
      expect(result.success).toBe(false);
      expect(result.error).toContain("No position found");
    });

    it("should close partial position when percent is specified", async () => {
      global.fetch = mockFetchSequence([
        { data: [dwPositionResponse()] },
        { data: dwOrderResponse() },
      ]);
      const result = await broker.closePosition("AAPL", 50);
      expect(result.success).toBe(true);
      // 50% of 10 shares = 5
      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[1][1].body,
      );
      expect(callBody.quantity).toBe(5);
    });

    it("should use sell side for long positions", async () => {
      global.fetch = mockFetchSequence([
        { data: [dwPositionResponse()] },
        { data: dwOrderResponse() },
      ]);
      await broker.closePosition("AAPL");
      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[1][1].body,
      );
      expect(callBody.side).toBe("SELL");
    });

    it("should use buy side for short positions", async () => {
      global.fetch = mockFetchSequence([
        { data: [{ ...dwPositionResponse(), side: "SHORT" }] },
        { data: dwOrderResponse() },
      ]);
      await broker.closePosition("AAPL");
      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[1][1].body,
      );
      expect(callBody.side).toBe("BUY");
    });
  });

  describe("closeAllPositions", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should close all positions", async () => {
      global.fetch = mockFetchSequence([
        { data: [dwPositionResponse()] },     // getPositions
        { data: [dwPositionResponse()] },     // getPositions (from closePosition -> getPosition)
        { data: dwOrderResponse() },           // placeOrder
      ]);
      const results = await broker.closeAllPositions();
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty results when no positions", async () => {
      global.fetch = mockFetchResponse([]);
      const results = await broker.closeAllPositions();
      expect(results).toHaveLength(0);
    });

    it("should handle errors gracefully", async () => {
      global.fetch = mockFetchResponse(
        { message: "Server error" },
        false,
        500,
      );
      const results = await broker.closeAllPositions();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  // ==========================================================================
  // MARKET DATA
  // ==========================================================================

  describe("getQuote", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return a quote for a symbol", async () => {
      global.fetch = mockFetchResponse(dwQuoteResponse());
      const quote = await broker.getQuote("AAPL");
      expect(quote.symbol).toBe("AAPL");
      expect(quote.bid).toBe(149.5);
      expect(quote.ask).toBe(150.5);
      expect(quote.last).toBe(150.0);
      expect(quote.volume).toBe(10000);
      expect(quote.timestamp).toBeInstanceOf(Date);
    });

    it("should include bid/ask sizes", async () => {
      global.fetch = mockFetchResponse(dwQuoteResponse());
      const quote = await broker.getQuote("AAPL");
      expect(quote.bidSize).toBe(100);
      expect(quote.askSize).toBe(200);
    });
  });

  describe("getQuotes", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return quotes for multiple symbols", async () => {
      global.fetch = mockFetchSequence([
        { data: dwQuoteResponse() },
        { data: { ...dwQuoteResponse(), symbol: "GOOGL" } },
      ]);
      const quotes = await broker.getQuotes(["AAPL", "GOOGL"]);
      expect(quotes).toHaveLength(2);
    });

    it("should return empty array for empty symbols", async () => {
      const quotes = await broker.getQuotes([]);
      expect(quotes).toHaveLength(0);
    });
  });

  describe("streamQuotes", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return an Observable", () => {
      const obs = broker.streamQuotes(["AAPL"]);
      expect(obs).toBeDefined();
      expect(typeof obs.subscribe).toBe("function");
    });

    afterEach(async () => {
      await broker.disconnect();
    });
  });

  describe("getLevel2", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return level 2 data structure", async () => {
      const l2 = await broker.getLevel2("AAPL");
      expect(l2.symbol).toBe("AAPL");
      expect(l2.bids).toEqual([]);
      expect(l2.asks).toEqual([]);
      expect(l2.timestamp).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // MARKET STATUS
  // ==========================================================================

  describe("isMarketOpen", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return true when market is open", async () => {
      global.fetch = mockFetchResponse(dwMarketHoursResponse(true));
      const isOpen = await broker.isMarketOpen();
      expect(isOpen).toBe(true);
    });

    it("should return false when market is closed", async () => {
      global.fetch = mockFetchResponse(dwMarketHoursResponse(false));
      const isOpen = await broker.isMarketOpen();
      expect(isOpen).toBe(false);
    });
  });

  describe("getMarketHours", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should return open and close times", async () => {
      global.fetch = mockFetchResponse(dwMarketHoursResponse());
      const hours = await broker.getMarketHours();
      expect(hours.open).toBeInstanceOf(Date);
      expect(hours.close).toBeInstanceOf(Date);
    });

    it("should parse ISO timestamps correctly", async () => {
      global.fetch = mockFetchResponse(dwMarketHoursResponse());
      const hours = await broker.getMarketHours();
      expect(hours.open.toISOString()).toBe("2026-01-05T14:30:00.000Z");
      expect(hours.close.toISOString()).toBe("2026-01-05T21:00:00.000Z");
    });
  });

  // ==========================================================================
  // SUPPORTED ORDER TYPES
  // ==========================================================================

  describe("supportedOrderTypes", () => {
    it("should return supported order types", () => {
      const types = broker.supportedOrderTypes();
      expect(types).toContain("market");
      expect(types).toContain("limit");
      expect(types).toContain("stop");
      expect(types).toContain("stop_limit");
    });

    it("should not include trailing_stop (not supported by DriveWealth)", () => {
      const types = broker.supportedOrderTypes();
      expect(types).not.toContain("trailing_stop");
    });
  });

  // ==========================================================================
  // TOKEN REFRESH
  // ==========================================================================

  describe("token refresh on 401", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should auto-refresh token on 401 response", async () => {
      global.fetch = mockFetchSequence([
        { data: { message: "Token expired" }, ok: false, status: 401 },  // initial 401
        { data: dwAuthResponse() },                                      // re-auth
        { data: [dwAccountResponse()] },                                 // retry
      ]);
      const account = await broker.getAccount();
      expect(account.id).toBe("dw-acc-123");
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // ORDER MAPPING EDGE CASES
  // ==========================================================================

  describe("order mapping", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should map order with legs", async () => {
      global.fetch = mockFetchResponse(
        dwOrderResponse({
          legs: [
            dwOrderResponse({ id: "leg-1", type: "LIMIT" }),
            dwOrderResponse({ id: "leg-2", type: "STOP" }),
          ],
        }),
      );
      const order = await broker.getOrder("order-123");
      expect(order!.legs).toHaveLength(2);
      expect(order!.legs![0].id).toBe("leg-1");
      expect(order!.legs![1].id).toBe("leg-2");
    });

    it("should map CANCELLED (British spelling) to canceled", async () => {
      global.fetch = mockFetchResponse(
        dwOrderResponse({ status: "CANCELLED" }),
      );
      const order = await broker.getOrder("order-123");
      expect(order!.status).toBe("canceled");
    });

    it("should map unknown order type to market", async () => {
      global.fetch = mockFetchResponse(
        dwOrderResponse({ type: "UNKNOWN_TYPE" }),
      );
      const order = await broker.getOrder("order-123");
      expect(order!.type).toBe("market");
    });

    it("should map unknown time in force to day", async () => {
      global.fetch = mockFetchResponse(
        dwOrderResponse({ timeInForce: "UNKNOWN" }),
      );
      const order = await broker.getOrder("order-123");
      expect(order!.timeInForce).toBe("day");
    });

    it("should map unknown status to pending", async () => {
      global.fetch = mockFetchResponse(
        dwOrderResponse({ status: "PROCESSING" }),
      );
      const order = await broker.getOrder("order-123");
      expect(order!.status).toBe("pending");
    });
  });

  // ==========================================================================
  // REQUEST HEADERS
  // ==========================================================================

  describe("request headers", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should include Bearer token in request headers", async () => {
      global.fetch = mockFetchResponse([dwAccountResponse()]);
      await broker.getAccount();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer jwt-token-123",
          }),
        }),
      );
    });

    it("should include dw-client-app-key in request headers", async () => {
      global.fetch = mockFetchResponse([dwAccountResponse()]);
      await broker.getAccount();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "dw-client-app-key": "test-app-key",
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe("error handling", () => {
    beforeEach(async () => {
      await connectBroker(broker);
    });

    it("should handle non-JSON error responses", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error("Not JSON")),
      });
      const result = await broker.placeOrder({
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 10,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("should handle non-Error thrown objects", async () => {
      global.fetch = jest.fn().mockRejectedValue("string error");
      const result = await broker.placeOrder({
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 10,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });
});
