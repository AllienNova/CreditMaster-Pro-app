/**
 * FractionalOrderService — Comprehensive Test Suite
 *
 * Tests dollar-to-share conversion, dollar-based orders, share-based orders,
 * lot splitting, and validation logic. All broker interactions are mocked.
 */

import {
  FractionalOrderService,
  FractionalOrderError,
  createFractionalOrderService,
} from "../fractional-order-service";
import type { BrokerRouter, RoutingPreference } from "@/lib/trading/brokers/broker-router";
import type {
  BrokerInterface,
  Quote,
  OrderResult,
} from "@/lib/trading/brokers/broker-interface";

// ============================================================================
// MOCK HELPERS
// ============================================================================

function createMockQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    symbol: "AAPL",
    bid: 149.5,
    ask: 150.0,
    bidSize: 100,
    askSize: 200,
    last: 149.75,
    lastSize: 50,
    volume: 5_000_000,
    timestamp: new Date(),
    ...overrides,
  };
}

function createMockOrderResult(overrides: Partial<OrderResult> = {}): OrderResult {
  return {
    success: true,
    order: {
      id: "order-123",
      symbol: "AAPL",
      side: "buy",
      type: "market",
      quantity: 1.5,
      filledQuantity: 0,
      status: "new",
      timeInForce: "day",
      extendedHours: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

function createMockBroker(overrides: Partial<BrokerInterface> = {}): BrokerInterface {
  return {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getConnectionStatus: jest.fn(),
    getAccount: jest.fn(),
    getPositions: jest.fn(),
    getPosition: jest.fn(),
    getOrders: jest.fn(),
    getOrder: jest.fn(),
    getOrderHistory: jest.fn(),
    placeOrder: jest.fn().mockResolvedValue(createMockOrderResult()),
    placeBracketOrder: jest.fn(),
    placeOCOOrder: jest.fn(),
    modifyOrder: jest.fn(),
    cancelOrder: jest.fn(),
    cancelAllOrders: jest.fn(),
    closePosition: jest.fn(),
    closeAllPositions: jest.fn(),
    getQuote: jest.fn().mockResolvedValue(createMockQuote()),
    getQuotes: jest.fn(),
    streamQuotes: jest.fn(),
    getLevel2: jest.fn(),
    isMarketOpen: jest.fn(),
    getMarketHours: jest.fn(),
    supportedOrderTypes: jest.fn(),
    ...overrides,
  } as unknown as BrokerInterface;
}

function createMockRouter(
  broker: BrokerInterface = createMockBroker(),
): BrokerRouter {
  return {
    getBroker: jest.fn().mockReturnValue(broker),
    connectBroker: jest.fn(),
    disconnectBroker: jest.fn(),
    disconnectAll: jest.fn(),
    getConnectedBrokers: jest.fn().mockReturnValue(["alpaca"]),
    getSession: jest.fn(),
    hasConnectedBrokers: jest.fn().mockReturnValue(true),
    getBrokerForCapability: jest.fn().mockReturnValue(broker),
    getAllPositions: jest.fn(),
    getAllOrders: jest.fn(),
    getAggregateAccount: jest.fn(),
  } as unknown as BrokerRouter;
}

// ============================================================================
// TESTS
// ============================================================================

describe("FractionalOrderService", () => {
  let service: FractionalOrderService;
  let mockBroker: BrokerInterface;
  let mockRouter: BrokerRouter;

  beforeEach(() => {
    mockBroker = createMockBroker();
    mockRouter = createMockRouter(mockBroker);
    service = new FractionalOrderService(mockRouter);
  });

  // ==========================================================================
  // FACTORY
  // ==========================================================================

  describe("createFractionalOrderService", () => {
    it("creates a service instance", () => {
      const svc = createFractionalOrderService(mockRouter);
      expect(svc).toBeInstanceOf(FractionalOrderService);
    });
  });

  // ==========================================================================
  // calculateShareQuantity
  // ==========================================================================

  describe("calculateShareQuantity", () => {
    it("converts $100 at $50/share to 2 shares", () => {
      expect(service.calculateShareQuantity("AAPL", 100, 50)).toBe(2);
    });

    it("converts $100 at $150/share to fractional quantity", () => {
      const result = service.calculateShareQuantity("AAPL", 100, 150);
      // 100 / 150 = 0.666666... rounded down
      expect(result).toBeCloseTo(0.666666666, 8);
    });

    it("converts $1 at $500/share to a small fraction", () => {
      const result = service.calculateShareQuantity("TSLA", 1, 500);
      expect(result).toBe(0.002);
    });

    it("converts exact multiples correctly", () => {
      expect(service.calculateShareQuantity("XYZ", 1000, 100)).toBe(10);
    });

    it("handles very small dollar amounts", () => {
      const result = service.calculateShareQuantity("AAPL", 0.01, 150);
      expect(result).toBeGreaterThan(0);
    });

    it("throws on zero dollar amount", () => {
      expect(() => service.calculateShareQuantity("AAPL", 0, 150)).toThrow(
        FractionalOrderError,
      );
    });

    it("throws on negative dollar amount", () => {
      expect(() => service.calculateShareQuantity("AAPL", -50, 150)).toThrow(
        "Dollar amount must be greater than 0",
      );
    });

    it("throws on zero price", () => {
      expect(() => service.calculateShareQuantity("AAPL", 100, 0)).toThrow(
        "Current price must be greater than 0",
      );
    });

    it("throws on negative price", () => {
      expect(() => service.calculateShareQuantity("AAPL", 100, -50)).toThrow(
        FractionalOrderError,
      );
    });
  });

  // ==========================================================================
  // placeDollarOrder
  // ==========================================================================

  describe("placeDollarOrder", () => {
    it("places a dollar-based buy order successfully", async () => {
      const result = await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 100,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(result.sharesOrdered).toBeDefined();
      expect(result.sharesOrdered).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeDefined();
      expect(mockBroker.getQuote).toHaveBeenCalledWith("AAPL");
      expect(mockBroker.placeOrder).toHaveBeenCalled();
    });

    it("uses ask price when available for buy orders", async () => {
      (mockBroker.getQuote as jest.Mock).mockResolvedValue(
        createMockQuote({ ask: 150, last: 149 }),
      );

      const result = await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 150,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      // 150 / 150 = 1.0 share
      expect(result.sharesOrdered).toBe(1);
    });

    it("falls back to last price when ask is 0", async () => {
      (mockBroker.getQuote as jest.Mock).mockResolvedValue(
        createMockQuote({ ask: 0, last: 100 }),
      );

      const result = await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 100,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(result.sharesOrdered).toBe(1);
    });

    it("returns error when quote fetch fails", async () => {
      (mockBroker.getQuote as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 100,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to fetch quote");
    });

    it("returns error when both last and ask prices are zero", async () => {
      (mockBroker.getQuote as jest.Mock).mockResolvedValue(
        createMockQuote({ ask: 0, last: 0 }),
      );

      const result = await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 100,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid price data");
    });

    it("returns error for zero dollar amount", async () => {
      const result = await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 0,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("greater than 0");
    });

    it("returns error for negative dollar amount", async () => {
      const result = await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: -50,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
    });

    it("returns error when order placement throws", async () => {
      (mockBroker.placeOrder as jest.Mock).mockRejectedValue(
        new Error("Broker unavailable"),
      );

      const result = await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 100,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Order placement failed");
    });

    it("returns error when broker order returns failure", async () => {
      (mockBroker.placeOrder as jest.Mock).mockResolvedValue(
        createMockOrderResult({ success: false, error: "Insufficient funds" }),
      );

      const result = await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 100,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insufficient funds");
    });

    it("passes broker preference with fractionalShares capability", async () => {
      const preference: RoutingPreference = { preferredBroker: "alpaca" };

      await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 100,
        side: "buy",
        brokerPreference: preference,
        userId: "user-1",
      });

      expect(mockRouter.getBroker).toHaveBeenCalledWith(
        expect.objectContaining({ requireCapability: "fractionalShares" }),
      );
    });

    it("generates correct client order ID format", async () => {
      await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 100,
        side: "buy",
        userId: "user-42",
      });

      const orderCall = (mockBroker.placeOrder as jest.Mock).mock.calls[0][0];
      expect(orderCall.clientOrderId).toMatch(/^FRAC-user-42-\d+$/);
    });

    it("places sell orders correctly", async () => {
      await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 50,
        side: "sell",
        userId: "user-1",
      });

      const orderCall = (mockBroker.placeOrder as jest.Mock).mock.calls[0][0];
      expect(orderCall.side).toBe("sell");
    });

    it("handles very large dollar amounts", async () => {
      (mockBroker.getQuote as jest.Mock).mockResolvedValue(
        createMockQuote({ ask: 100, last: 100 }),
      );

      const result = await service.placeDollarOrder({
        symbol: "AAPL",
        dollarAmount: 1_000_000,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(result.sharesOrdered).toBe(10_000);
    });
  });

  // ==========================================================================
  // placeShareOrder
  // ==========================================================================

  describe("placeShareOrder", () => {
    it("places a fractional share buy order", async () => {
      const result = await service.placeShareOrder({
        symbol: "AAPL",
        quantity: 0.5,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(result.sharesOrdered).toBe(0.5);
      expect(mockBroker.placeOrder).toHaveBeenCalled();
    });

    it("returns estimated cost from current quote", async () => {
      (mockBroker.getQuote as jest.Mock).mockResolvedValue(
        createMockQuote({ ask: 200, last: 199 }),
      );

      const result = await service.placeShareOrder({
        symbol: "AAPL",
        quantity: 2.5,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(result.estimatedCost).toBe(500); // 2.5 * 200
    });

    it("proceeds without cost estimate if quote fails", async () => {
      (mockBroker.getQuote as jest.Mock).mockRejectedValue(new Error("No data"));

      const result = await service.placeShareOrder({
        symbol: "AAPL",
        quantity: 1,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(result.estimatedCost).toBeUndefined();
    });

    it("returns error for zero quantity", async () => {
      const result = await service.placeShareOrder({
        symbol: "AAPL",
        quantity: 0,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("greater than 0");
    });

    it("returns error for negative quantity", async () => {
      const result = await service.placeShareOrder({
        symbol: "AAPL",
        quantity: -1,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
    });

    it("returns error when order placement throws", async () => {
      (mockBroker.placeOrder as jest.Mock).mockRejectedValue(
        new Error("Connection lost"),
      );

      const result = await service.placeShareOrder({
        symbol: "AAPL",
        quantity: 1,
        side: "buy",
        userId: "user-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Order placement failed");
    });

    it("rounds quantity to maximum decimal places", async () => {
      await service.placeShareOrder({
        symbol: "AAPL",
        quantity: 0.123456789012345,
        side: "buy",
        userId: "user-1",
      });

      const orderCall = (mockBroker.placeOrder as jest.Mock).mock.calls[0][0];
      // Should be rounded to 9 decimal places
      expect(String(orderCall.quantity).split(".")[1]?.length || 0).toBeLessThanOrEqual(9);
    });
  });

  // ==========================================================================
  // splitIntoLots
  // ==========================================================================

  describe("splitIntoLots", () => {
    it("splits $100 into 4 equal lots", () => {
      const lots = service.splitIntoLots("AAPL", 100, 4, 50);

      expect(lots).toHaveLength(4);
      expect(lots[0].lotNumber).toBe(1);
      expect(lots[0].amount).toBe(25);
      expect(lots[0].shares).toBe(0.5);
    });

    it("handles uneven splits by distributing remainder to last lot", () => {
      const lots = service.splitIntoLots("AAPL", 100, 3);

      expect(lots).toHaveLength(3);
      // 100 / 3 = 33.33 per lot, last lot gets remainder
      const total = lots.reduce((sum, l) => sum + l.amount, 0);
      expect(total).toBeCloseTo(100, 2);
    });

    it("calculates shares when price is provided", () => {
      const lots = service.splitIntoLots("AAPL", 200, 2, 100);

      expect(lots[0].shares).toBe(1);
      expect(lots[1].shares).toBe(1);
    });

    it("returns 0 shares when no price is provided", () => {
      const lots = service.splitIntoLots("AAPL", 200, 2);

      expect(lots[0].shares).toBe(0);
      expect(lots[1].shares).toBe(0);
    });

    it("creates a single lot when lotCount is 1", () => {
      const lots = service.splitIntoLots("AAPL", 500, 1, 250);

      expect(lots).toHaveLength(1);
      expect(lots[0].amount).toBe(500);
      expect(lots[0].shares).toBe(2);
    });

    it("throws for zero total amount", () => {
      expect(() => service.splitIntoLots("AAPL", 0, 4)).toThrow(
        "Total amount must be greater than 0",
      );
    });

    it("throws for negative total amount", () => {
      expect(() => service.splitIntoLots("AAPL", -100, 4)).toThrow(
        FractionalOrderError,
      );
    });

    it("throws for zero lot count", () => {
      expect(() => service.splitIntoLots("AAPL", 100, 0)).toThrow(
        "Lot count must be a positive integer",
      );
    });

    it("throws for negative lot count", () => {
      expect(() => service.splitIntoLots("AAPL", 100, -2)).toThrow(
        FractionalOrderError,
      );
    });

    it("throws for non-integer lot count", () => {
      expect(() => service.splitIntoLots("AAPL", 100, 2.5)).toThrow(
        "Lot count must be a positive integer",
      );
    });

    it("throws for zero price", () => {
      expect(() => service.splitIntoLots("AAPL", 100, 4, 0)).toThrow(
        "Current price must be greater than 0",
      );
    });

    it("throws for negative price", () => {
      expect(() => service.splitIntoLots("AAPL", 100, 4, -50)).toThrow(
        FractionalOrderError,
      );
    });

    it("handles large number of lots", () => {
      const lots = service.splitIntoLots("AAPL", 1000, 100, 100);

      expect(lots).toHaveLength(100);
      const total = lots.reduce((sum, l) => sum + l.amount, 0);
      expect(total).toBeCloseTo(1000, 1);
    });

    it("lot numbers are 1-based and sequential", () => {
      const lots = service.splitIntoLots("AAPL", 100, 5);

      expect(lots.map((l) => l.lotNumber)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  // ==========================================================================
  // validateFractionalOrder
  // ==========================================================================

  describe("validateFractionalOrder", () => {
    it("passes for valid dollar amount", () => {
      const result = service.validateFractionalOrder({
        dollarAmount: 50,
        symbol: "AAPL",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails for zero dollar amount", () => {
      const result = service.validateFractionalOrder({
        dollarAmount: 0,
        symbol: "AAPL",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("fails for negative dollar amount", () => {
      const result = service.validateFractionalOrder({
        dollarAmount: -10,
        symbol: "AAPL",
      });

      expect(result.valid).toBe(false);
    });

    it("fails for dollar amount below minimum ($1)", () => {
      const result = service.validateFractionalOrder({
        dollarAmount: 0.5,
        symbol: "AAPL",
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("at least $1");
    });

    it("fails for empty symbol", () => {
      const result = service.validateFractionalOrder({
        dollarAmount: 50,
        symbol: "",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Symbol is required");
    });

    it("fails for whitespace-only symbol", () => {
      const result = service.validateFractionalOrder({
        dollarAmount: 50,
        symbol: "   ",
      });

      expect(result.valid).toBe(false);
    });

    it("fails when no broker supports fractional shares", () => {
      (mockRouter.getBroker as jest.Mock).mockImplementation(() => {
        throw new Error("No brokers connected");
      });

      const result = service.validateFractionalOrder({
        dollarAmount: 50,
        symbol: "AAPL",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "No connected broker supports fractional share trading",
      );
    });

    it("warns for international symbol with dot notation", () => {
      const result = service.validateFractionalOrder({
        dollarAmount: 50,
        symbol: "RDSA.L",
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("International");
    });

    it("warns for international symbol with colon notation", () => {
      const result = service.validateFractionalOrder({
        dollarAmount: 50,
        symbol: "XETRA:SAP",
      });

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("validates share quantity when provided", () => {
      const result = service.validateFractionalOrder({
        quantity: -1,
        symbol: "AAPL",
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("greater than 0");
    });

    it("passes with valid quantity", () => {
      const result = service.validateFractionalOrder({
        quantity: 0.5,
        symbol: "AAPL",
      });

      expect(result.valid).toBe(true);
    });
  });
});
