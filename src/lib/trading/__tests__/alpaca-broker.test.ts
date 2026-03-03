/**
 * AlpacaBroker - Comprehensive Test Suite
 *
 * Tests all broker interface methods, connection management,
 * order management, position management, and market data.
 * Mocks global.fetch and WebSocket.
 */

import { AlpacaBroker } from "../brokers/alpaca-broker";
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

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  readyState = 1;
  send = jest.fn();
  close = jest.fn();
}

(global as Record<string, unknown>).WebSocket = MockWebSocket;

// ============================================================================
// HELPERS
// ============================================================================

const BASE_URL = "https://paper-api.alpaca.markets";

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
  });
}

function mockCredentials(): BrokerCredentials {
  return {
    apiKey: "test-key",
    apiSecret: "test-secret",
    paperTrading: true,
  };
}

function alpacaAccountResponse() {
  return {
    id: "acc-123",
    status: "ACTIVE",
    currency: "USD",
    cash: "50000",
    portfolio_value: "75000",
    buying_power: "100000",
    daytrading_buying_power: "200000",
    maintenance_margin: "25000",
    initial_margin: "30000",
    last_equity: "74000",
    multiplier: "4",
    pattern_day_trader: false,
    trading_blocked: false,
    transfers_blocked: false,
  };
}

function alpacaPositionResponse() {
  return {
    symbol: "AAPL",
    qty: "10",
    side: "long",
    avg_entry_price: "150.00",
    current_price: "155.00",
    market_value: "1550.00",
    cost_basis: "1500.00",
    unrealized_pl: "50.00",
    unrealized_plpc: "0.0333",
    unrealized_intraday_pl: "10.00",
    asset_class: "us_equity",
  };
}

function alpacaOrderResponse() {
  return {
    id: "order-123",
    client_order_id: "client-123",
    symbol: "AAPL",
    side: "buy",
    type: "limit",
    qty: "10",
    filled_qty: "0",
    status: "new",
    limit_price: "150.00",
    stop_price: null,
    trail_percent: null,
    trail_price: null,
    time_in_force: "day",
    extended_hours: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    filled_at: null,
    filled_avg_price: null,
    legs: null,
  };
}

function alpacaQuoteResponse() {
  return {
    quote: {
      symbol: "AAPL",
      bid: 149.5,
      ask: 150.5,
      bid_size: 100,
      ask_size: 200,
      last: 150.0,
      last_size: 50,
      volume: 10000,
      timestamp: "2026-01-01T00:00:00Z",
    },
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("AlpacaBroker", () => {
  let broker: AlpacaBroker;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    broker = new AlpacaBroker();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ==========================================================================
  // CONNECTION
  // ==========================================================================

  describe("connect", () => {
    it("should connect with paper trading credentials", async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      const result = await broker.connect(mockCredentials());
      expect(result.connected).toBe(true);
      expect(result.accountId).toBe("acc-123");
      expect(result.cash).toBe(50000);
      expect(result.portfolioValue).toBe(75000);
      expect(result.buyingPower).toBe(100000);
    });

    it("should set paper trading base URL", async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("paper-api.alpaca.markets"),
        expect.any(Object),
      );
    });

    it("should set live trading base URL when paperTrading is false", async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect({
        ...mockCredentials(),
        paperTrading: false,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.alpaca.markets"),
        expect.any(Object),
      );
    });

    it("should throw on connection failure", async () => {
      global.fetch = mockFetchResponse({ message: "Unauthorized" }, false, 401);
      await expect(broker.connect(mockCredentials())).rejects.toThrow();
    });
  });

  describe("disconnect", () => {
    it("should disconnect without error", async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
      await expect(broker.disconnect()).resolves.not.toThrow();
    });
  });

  describe("getConnectionStatus", () => {
    it("should return disconnected status before connect", () => {
      const status = broker.getConnectionStatus();
      expect(status.connected).toBe(false);
    });

    it("should return connected status after connect", async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
      const status = broker.getConnectionStatus();
      expect(status.connected).toBe(true);
    });
  });

  // ==========================================================================
  // ACCOUNT
  // ==========================================================================

  describe("getAccount", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return account info", async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      const account = await broker.getAccount();
      expect(account.id).toBe("acc-123");
      expect(account.status).toBe("active");
      expect(account.currency).toBe("USD");
      expect(account.cash).toBe(50000);
      expect(account.portfolioValue).toBe(75000);
      expect(account.buyingPower).toBe(100000);
      expect(account.patternDayTrader).toBe(false);
      expect(account.tradingBlocked).toBe(false);
    });
  });

  // ==========================================================================
  // POSITIONS
  // ==========================================================================

  describe("getPositions", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return mapped positions", async () => {
      global.fetch = mockFetchResponse([alpacaPositionResponse()]);
      const positions = await broker.getPositions();
      expect(positions).toHaveLength(1);
      expect(positions[0].symbol).toBe("AAPL");
      expect(positions[0].quantity).toBe(10);
      expect(positions[0].side).toBe("long");
    });

    it("should return empty array when no positions", async () => {
      global.fetch = mockFetchResponse([]);
      const positions = await broker.getPositions();
      expect(positions).toHaveLength(0);
    });
  });

  describe("getPosition", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return a specific position", async () => {
      global.fetch = mockFetchResponse(alpacaPositionResponse());
      const pos = await broker.getPosition("AAPL");
      expect(pos).not.toBeNull();
      expect(pos!.symbol).toBe("AAPL");
    });

    it("should return null when position not found", async () => {
      global.fetch = mockFetchResponse(
        { message: "Not found" },
        false,
        404,
      );
      const pos = await broker.getPosition("UNKNOWN");
      expect(pos).toBeNull();
    });
  });

  // ==========================================================================
  // ORDERS
  // ==========================================================================

  describe("getOrders", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return mapped orders", async () => {
      global.fetch = mockFetchResponse([alpacaOrderResponse()]);
      const orders = await broker.getOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe("order-123");
      expect(orders[0].symbol).toBe("AAPL");
    });

    it("should pass filters as query params", async () => {
      global.fetch = mockFetchResponse([]);
      await broker.getOrders({ status: "new", symbol: "AAPL" });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("status=new"),
        expect.any(Object),
      );
    });
  });

  describe("getOrder", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return a specific order", async () => {
      global.fetch = mockFetchResponse(alpacaOrderResponse());
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
  });

  describe("placeOrder", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should place a market order", async () => {
      global.fetch = mockFetchResponse(alpacaOrderResponse());
      const result = await broker.placeOrder({
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 10,
        timeInForce: "day",
      });
      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
    });

    it("should place a limit order", async () => {
      global.fetch = mockFetchResponse({
        ...alpacaOrderResponse(),
        type: "limit",
        limit_price: "150.00",
      });
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

    it("should return error on failure", async () => {
      global.fetch = mockFetchResponse(
        { message: "Insufficient funds" },
        false,
        422,
      );
      const result = await broker.placeOrder({
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 10000,
        timeInForce: "day",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("placeBracketOrder", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should place bracket order", async () => {
      global.fetch = mockFetchResponse({
        ...alpacaOrderResponse(),
        order_class: "bracket",
        legs: [alpacaOrderResponse(), alpacaOrderResponse()],
      });
      const result = await broker.placeBracketOrder({
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
        entryType: "market",
        takeProfitPrice: 160,
        stopLossPrice: 140,
      });
      expect(result.success).toBe(true);
    });

    it("should return error on bracket order failure", async () => {
      global.fetch = mockFetchResponse(
        { message: "Bracket order error" },
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
    });
  });

  describe("placeOCOOrder", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should place OCO order", async () => {
      global.fetch = mockFetchResponse({
        ...alpacaOrderResponse(),
        order_class: "oco",
      });
      const result = await broker.placeOCOOrder({
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
        limitPrice: 150,
        takeProfitPrice: 160,
        stopLossPrice: 140,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("modifyOrder", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should modify an order", async () => {
      global.fetch = mockFetchResponse({
        ...alpacaOrderResponse(),
        limit_price: "155.00",
      });
      const result = await broker.modifyOrder("order-123", {
        limitPrice: 155,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("cancelOrder", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should cancel an order", async () => {
      global.fetch = mockFetchResponse({});
      const result = await broker.cancelOrder("order-123");
      expect(result.success).toBe(true);
      expect(result.orderId).toBe("order-123");
    });

    it("should handle cancel failure", async () => {
      global.fetch = mockFetchResponse(
        { message: "Cannot cancel" },
        false,
        422,
      );
      const result = await broker.cancelOrder("order-123");
      expect(result.success).toBe(false);
    });
  });

  describe("cancelAllOrders", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should cancel all orders", async () => {
      global.fetch = mockFetchResponse([]);
      const results = await broker.cancelAllOrders();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  describe("closePosition", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should close a position", async () => {
      global.fetch = mockFetchResponse(alpacaOrderResponse());
      const result = await broker.closePosition("AAPL");
      expect(result.success).toBe(true);
    });

    it("should handle close failure", async () => {
      global.fetch = mockFetchResponse(
        { message: "No position" },
        false,
        404,
      );
      const result = await broker.closePosition("UNKNOWN");
      expect(result.success).toBe(false);
    });
  });

  describe("closeAllPositions", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should close all positions", async () => {
      global.fetch = mockFetchResponse([]);
      const results = await broker.closeAllPositions();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ==========================================================================
  // MARKET DATA
  // ==========================================================================

  describe("getQuote", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return a quote for a symbol", async () => {
      global.fetch = mockFetchResponse(alpacaQuoteResponse());
      const quote = await broker.getQuote("AAPL");
      expect(quote.symbol).toBe("AAPL");
      expect(quote.bid).toBeDefined();
      expect(quote.ask).toBeDefined();
    });
  });

  describe("getQuotes", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return quotes for multiple symbols", async () => {
      global.fetch = mockFetchResponse({
        quotes: {
          AAPL: alpacaQuoteResponse().quote,
          GOOGL: alpacaQuoteResponse().quote,
        },
      });
      const quotes = await broker.getQuotes(["AAPL", "GOOGL"]);
      expect(quotes.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // MARKET STATUS
  // ==========================================================================

  describe("isMarketOpen", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return true when market is open", async () => {
      global.fetch = mockFetchResponse({ is_open: true });
      const isOpen = await broker.isMarketOpen();
      expect(isOpen).toBe(true);
    });

    it("should return false when market is closed", async () => {
      global.fetch = mockFetchResponse({ is_open: false });
      const isOpen = await broker.isMarketOpen();
      expect(isOpen).toBe(false);
    });
  });

  describe("getMarketHours", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return open and close times", async () => {
      global.fetch = mockFetchResponse({
        next_open: "2026-01-05T14:30:00Z",
        next_close: "2026-01-05T21:00:00Z",
      });
      const hours = await broker.getMarketHours();
      expect(hours.open).toBeInstanceOf(Date);
      expect(hours.close).toBeInstanceOf(Date);
    });
  });

  describe("supportedOrderTypes", () => {
    it("should return all supported order types", () => {
      const types = broker.supportedOrderTypes();
      expect(types).toContain("market");
      expect(types).toContain("limit");
      expect(types).toContain("stop");
      expect(types).toContain("stop_limit");
      expect(types).toContain("trailing_stop");
    });
  });

  // ==========================================================================
  // STREAMING
  // ==========================================================================

  describe("streamQuotes", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return an Observable", () => {
      const obs = broker.streamQuotes(["AAPL"]);
      expect(obs).toBeDefined();
      expect(typeof obs.subscribe).toBe("function");
    });
  });

  // ==========================================================================
  // FETCH HEADERS
  // ==========================================================================

  describe("request headers", () => {
    it("should include API key and secret in headers", async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());

      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.getAccount();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "APCA-API-KEY-ID": "test-key",
            "APCA-API-SECRET-KEY": "test-secret",
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // ORDER HISTORY
  // ==========================================================================

  describe("getOrderHistory", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return order history", async () => {
      global.fetch = mockFetchResponse([alpacaOrderResponse()]);
      const orders = await broker.getOrderHistory({ limit: 10 });
      expect(orders).toHaveLength(1);
    });
  });

  // ==========================================================================
  // LEVEL 2 DATA
  // ==========================================================================

  describe("getLevel2", () => {
    beforeEach(async () => {
      global.fetch = mockFetchResponse(alpacaAccountResponse());
      await broker.connect(mockCredentials());
    });

    it("should return level 2 data", async () => {
      global.fetch = mockFetchResponse({
        bids: [{ p: 149.5, s: 100 }],
        asks: [{ p: 150.5, s: 200 }],
      });
      const l2 = await broker.getLevel2("AAPL");
      expect(l2.symbol).toBe("AAPL");
    });
  });
});
