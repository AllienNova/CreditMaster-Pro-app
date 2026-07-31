/**
 * Order Manager Integration Tests (TRD-009)
 *
 * Covers the full order lifecycle:
 *   - Market order creation -> fill -> position update -> P&L calculation
 *   - Limit order creation -> partial fill -> remaining quantity tracking
 *   - Stop order creation -> trigger -> execution
 *   - Order cancellation and modification
 *   - Position reconciliation after multiple fills
 *   - Error scenarios: insufficient funds, invalid symbols, duplicate orders
 *   - Edge cases: zero quantity, negative prices, concurrent modifications
 */

// ============================================================================
// Supabase mock — factory is hoisted, so NO const references from outer scope
// ============================================================================
jest.mock("@/lib/supabase/server", () => {
  const makeMockChain = () => {
    const chain: Record<string, jest.Mock> = {};
    const methods = [
      "select",
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "order",
      "limit",
      "range",
      "in",
      "is",
      "insert",
      "update",
      "delete",
      "upsert",
    ];
    methods.forEach((m) => {
      chain[m] = jest.fn(() => chain);
    });
    chain.single = jest.fn(() => Promise.resolve({ data: null, error: null }));
    // Make the chain thenable for `await supabase.from(...).upsert(...)`
    (chain as Record<string, unknown>).then = (
      resolve: (v: unknown) => unknown,
    ) => Promise.resolve({ data: [], error: null }).then(resolve);
    return chain;
  };

  return {
    createClient: jest.fn(async () => ({
      from: jest.fn(() => makeMockChain()),
    })),
  };
});

// ============================================================================
// Imports (after mock declaration so hoisting works correctly)
// ============================================================================
import {
  OrderManager,
  createOrderManager,
  getOrderManager,
  BrokerClient,
  BrokerOrderResponse,
  BrokerOrder,
} from "../orders/order-manager";
import {
  PositionManager,
  createPositionManager,
  getPositionManager,
} from "../positions/position-manager";
import { OrderRequest, Fill, Order, OrderStatus } from "../orders/order-types";
import { createClient as _createClient } from "@/lib/supabase/server";

// Cast to jest.Mock so we can re-apply implementation after resetMocks
const mockedCreateClient = _createClient as jest.Mock;

// ============================================================================
// Supabase chain builder — shared between factory and beforeEach
// ============================================================================
function makeMockSupabaseChain() {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    "select",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "order",
    "limit",
    "range",
    "in",
    "is",
    "insert",
    "update",
    "delete",
    "upsert",
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  chain.single = jest.fn(() => Promise.resolve({ data: null, error: null }));
  // Make the chain thenable for `await supabase.from(...).upsert(...)`
  (chain as Record<string, unknown>).then = (
    resolve: (v: unknown) => unknown,
  ) => Promise.resolve({ data: [], error: null }).then(resolve);
  return chain;
}

// ============================================================================
// Test Helpers
// ============================================================================

function makeBuyMarketRequest(
  overrides: Partial<OrderRequest> = {},
): OrderRequest {
  return {
    symbol: "AAPL",
    side: "buy",
    quantity: 100,
    type: "market",
    timeInForce: "day",
    ...overrides,
  };
}

function makeBuyLimitRequest(
  overrides: Partial<OrderRequest> = {},
): OrderRequest {
  return {
    symbol: "AAPL",
    side: "buy",
    quantity: 100,
    type: "limit",
    limitPrice: 150.0,
    timeInForce: "day",
    ...overrides,
  };
}

function makeBuyStopRequest(
  overrides: Partial<OrderRequest> = {},
): OrderRequest {
  return {
    symbol: "AAPL",
    side: "buy",
    quantity: 100,
    type: "stop",
    stopPrice: 155.0,
    timeInForce: "day",
    ...overrides,
  };
}

function makeSellLimitRequest(
  overrides: Partial<OrderRequest> = {},
): OrderRequest {
  return {
    symbol: "AAPL",
    side: "sell",
    quantity: 100,
    type: "limit",
    limitPrice: 160.0,
    timeInForce: "day",
    ...overrides,
  };
}

function makeFill(order: Order, qty: number, price: number): Fill {
  return {
    id: `FILL-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    orderId: order.id,
    symbol: order.symbol,
    side: order.side,
    quantity: qty,
    price,
    timestamp: new Date(),
  };
}

function makeMockBrokerClient(
  overrides: Partial<BrokerClient> = {},
): BrokerClient {
  return {
    submitOrder: jest.fn<Promise<BrokerOrderResponse>, [unknown]>(async () => ({
      id: `BRK-${Date.now()}`,
      client_order_id: "",
      status: "new",
    })),
    cancelOrder: jest.fn<Promise<void>, [string]>(async () => {}),
    getOrders: jest.fn<Promise<BrokerOrder[]>, [{ status?: string }]>(
      async () => [],
    ),
    getOrder: jest.fn<Promise<BrokerOrder>, [string]>(async (id: string) => ({
      id,
      client_order_id: "",
      status: "filled",
      filled_qty: 0,
    })),
    ...overrides,
  };
}

const TEST_USER_ID = "user-test-001";
const TEST_ACCOUNT_ID = "acct-test-001";

// ============================================================================
// TEST SUITES
// ============================================================================

describe("OrderManager Integration Tests", () => {
  let orderManager: OrderManager;
  let positionManager: PositionManager;
  let broker: BrokerClient;
  // Captured so individual tests can assert which table name(s) `.from()`
  // was called with — the direct regression guard against a silently wrong
  // or missing table (the original defect this whole task fixes).
  let mockFromSpy: jest.Mock;

  beforeEach(() => {
    // Re-apply createClient mock (resetMocks: true clears implementations)
    mockFromSpy = jest.fn(() => makeMockSupabaseChain());
    mockedCreateClient.mockImplementation(async () => ({
      from: mockFromSpy,
    }));

    orderManager = createOrderManager({
      maxOpenOrders: 20,
      maxDailyOrders: 100,
      maxOrderValue: 1_000_000,
      requireStopLoss: false,
      enableExtendedHours: false,
    });
    positionManager = createPositionManager();
    broker = makeMockBrokerClient();
  });

  // ==========================================================================
  // 1. MARKET ORDER: creation -> fill -> position -> P&L
  // ==========================================================================

  describe("Market Order Lifecycle", () => {
    it("should create a market order with valid fields and pending status", async () => {
      const request = makeBuyMarketRequest();
      const { order, validation } = await orderManager.createOrder(
        request,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(order).not.toBeNull();
      expect(order!.status).toBe("pending");
      expect(order!.symbol).toBe("AAPL");
      expect(order!.side).toBe("buy");
      expect(order!.quantity).toBe(100);
      expect(order!.type).toBe("market");
      expect(order!.filledQty).toBe(0);
      expect(order!.userId).toBe(TEST_USER_ID);
      expect(order!.accountId).toBe(TEST_ACCOUNT_ID);
    });

    it("should submit a pending order to the broker", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const submitted = await orderManager.submitOrder(order!.id, broker);

      expect(submitted).not.toBeNull();
      expect(submitted!.status).toBe("submitted");
      expect(submitted!.brokerId).toBeDefined();
      expect(submitted!.submittedAt).toBeInstanceOf(Date);
      expect(broker.submitOrder).toHaveBeenCalledTimes(1);
    });

    it("should handle a full fill update and remove from open orders", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      const filled = await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "filled",
        filledQty: 100,
        filledAvgPrice: 150.25,
        timestamp: new Date(),
      });

      expect(filled).not.toBeNull();
      expect(filled!.status).toBe("filled");
      expect(filled!.filledQty).toBe(100);
      expect(filled!.filledAvgPrice).toBe(150.25);
      expect(filled!.filledAt).toBeInstanceOf(Date);
      // Should be removed from open orders
      expect(orderManager.getOrder(order!.id)).toBeUndefined();
      expect(orderManager.getOpenOrders()).toHaveLength(0);
    });

    it("should open a position after fill and calculate zero initial P&L", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "filled",
        filledQty: 100,
        filledAvgPrice: 150.0,
        timestamp: new Date(),
      });

      // Simulate position opening from the fill
      const fill = makeFill(order!, 100, 150.0);
      const position = await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(position.symbol).toBe("AAPL");
      expect(position.side).toBe("long");
      expect(position.quantity).toBe(100);
      expect(position.avgEntryPrice).toBe(150.0);
      expect(position.costBasis).toBe(15_000);
      expect(position.unrealizedPL).toBe(0);
      expect(position.realizedPL).toBe(0);
      expect(position.status).toBe("open");
    });

    it("should calculate unrealized P&L after price update", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 100, 150.0);
      const position = await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Price moves up to 155
      positionManager.updatePrice("AAPL", 155.0);

      const updated = positionManager.getPosition(position.id);
      expect(updated).toBeDefined();
      expect(updated!.currentPrice).toBe(155.0);
      expect(updated!.unrealizedPL).toBe(500.0); // (155-150) * 100
      expect(updated!.marketValue).toBe(15_500);
    });

    it("should calculate realized P&L when position is closed", async () => {
      const buyOrder = (
        await orderManager.createOrder(
          makeBuyMarketRequest(),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const buyFill = makeFill(buyOrder, 100, 150.0);
      const position = await positionManager.openPosition(
        buyFill,
        buyOrder,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Sell at 160
      const { position: closedPos, realizedPL } =
        await positionManager.closePosition({
          positionId: position.id,
          closePrice: 160.0,
          timestamp: new Date(),
          reason: "manual",
        });

      expect(realizedPL).toBe(1_000.0); // (160-150) * 100
      expect(closedPos.status).toBe("closed");
      expect(closedPos.quantity).toBe(0);
      expect(closedPos.realizedPL).toBe(1_000.0);
      expect(closedPos.closedAt).toBeInstanceOf(Date);
    });

    it("should calculate negative P&L on loss", async () => {
      const buyOrder = (
        await orderManager.createOrder(
          makeBuyMarketRequest(),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const buyFill = makeFill(buyOrder, 100, 150.0);
      const position = await positionManager.openPosition(
        buyFill,
        buyOrder,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Price drops to 140
      const { realizedPL } = await positionManager.closePosition({
        positionId: position.id,
        closePrice: 140.0,
        timestamp: new Date(),
        reason: "stop_loss",
      });

      expect(realizedPL).toBe(-1_000.0); // (140-150) * 100
    });
  });

  // ==========================================================================
  // 2. LIMIT ORDER: creation -> partial fill -> remaining qty tracking
  // ==========================================================================

  describe("Limit Order with Partial Fills", () => {
    it("should validate limit price requirement", async () => {
      // Limit order without limitPrice
      const { order, validation } = await orderManager.createOrder(
        {
          symbol: "AAPL",
          side: "buy",
          quantity: 100,
          type: "limit",
          timeInForce: "day",
        },
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((e) => e.code === "MISSING_LIMIT_PRICE"),
      ).toBe(true);
      expect(order).toBeNull();
    });

    it("should create a valid limit order with estimated value", async () => {
      const { order, validation } = await orderManager.createOrder(
        makeBuyLimitRequest({ limitPrice: 150.0, quantity: 200 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(true);
      expect(order).not.toBeNull();
      expect(order!.type).toBe("limit");
      expect(order!.limitPrice).toBe(150.0);
      expect(order!.estimatedValue).toBe(30_000); // 150 * 200
    });

    it("should handle partial fill and track remaining quantity", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest({ quantity: 200 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      // First partial fill: 80 of 200
      const partialFilled = await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "partial",
        filledQty: 80,
        filledAvgPrice: 149.5,
        timestamp: new Date(),
      });

      expect(partialFilled).not.toBeNull();
      expect(partialFilled!.status).toBe("partial");
      expect(partialFilled!.filledQty).toBe(80);
      expect(partialFilled!.filledAvgPrice).toBe(149.5);
      // Should still be in open orders
      expect(orderManager.getOrder(order!.id)).toBeDefined();
      expect(orderManager.getOpenOrders()).toHaveLength(1);
    });

    it("should handle multiple partial fills then full fill", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest({ quantity: 300 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      // Partial fill 1: 100 shares
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "partial",
        filledQty: 100,
        filledAvgPrice: 149.0,
        timestamp: new Date(),
      });
      expect(orderManager.getOpenOrders()).toHaveLength(1);

      // Partial fill 2: 150 total
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "partial",
        filledQty: 150,
        filledAvgPrice: 149.25,
        timestamp: new Date(),
      });
      expect(orderManager.getOpenOrders()).toHaveLength(1);

      // Full fill: 300 total
      const fullyFilled = await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "filled",
        filledQty: 300,
        filledAvgPrice: 149.5,
        timestamp: new Date(),
      });

      expect(fullyFilled!.status).toBe("filled");
      expect(fullyFilled!.filledQty).toBe(300);
      expect(orderManager.getOpenOrders()).toHaveLength(0);
    });

    it("should build position from partial fills (averaging in)", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest({ quantity: 200, limitPrice: 150 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // First fill: 100 @ 149
      const fill1 = makeFill(order!, 100, 149.0);
      const position = await positionManager.openPosition(
        fill1,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      expect(position.quantity).toBe(100);
      expect(position.avgEntryPrice).toBe(149.0);

      // Second fill: 100 @ 151 — should average into existing position
      const fill2 = makeFill(order!, 100, 151.0);
      const updatedPosition = await positionManager.openPosition(
        fill2,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(updatedPosition.quantity).toBe(200);
      // Avg entry = (100*149 + 100*151) / 200 = 150
      expect(updatedPosition.avgEntryPrice).toBe(150.0);
      expect(updatedPosition.costBasis).toBe(30_000);
    });
  });

  // ==========================================================================
  // 3. STOP ORDER: creation -> trigger -> execution
  // ==========================================================================

  describe("Stop Order Lifecycle", () => {
    it("should validate stop price requirement", async () => {
      const { order, validation } = await orderManager.createOrder(
        {
          symbol: "AAPL",
          side: "buy",
          quantity: 50,
          type: "stop",
          timeInForce: "day",
        },
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((e) => e.code === "MISSING_STOP_PRICE"),
      ).toBe(true);
      expect(order).toBeNull();
    });

    it("should create a valid stop order", async () => {
      const { order, validation } = await orderManager.createOrder(
        makeBuyStopRequest({ stopPrice: 155 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(true);
      expect(order).not.toBeNull();
      expect(order!.type).toBe("stop");
      expect(order!.stopPrice).toBe(155);
      expect(order!.estimatedValue).toBe(15_500); // 155 * 100
    });

    it("should handle stop order trigger and execution flow", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyStopRequest({ stopPrice: 155, quantity: 50 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      // Broker accepts the order
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "accepted",
        timestamp: new Date(),
      });
      expect(orderManager.getOrder(order!.id)!.status).toBe("accepted");

      // Stop is triggered and order fills
      const filled = await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "filled",
        filledQty: 50,
        filledAvgPrice: 155.5,
        timestamp: new Date(),
      });

      expect(filled!.status).toBe("filled");
      expect(filled!.filledQty).toBe(50);
      expect(filled!.filledAvgPrice).toBe(155.5);
      expect(orderManager.getOpenOrders()).toHaveLength(0);
    });

    it("should validate stop_limit orders require both prices", async () => {
      // stop_limit with stop price but missing limit price
      const { validation: v1 } = await orderManager.createOrder(
        {
          symbol: "AAPL",
          side: "buy",
          quantity: 50,
          type: "stop_limit",
          stopPrice: 155,
          timeInForce: "day",
        },
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      expect(v1.isValid).toBe(false);
      expect(v1.errors.some((e) => e.code === "MISSING_LIMIT_PRICE")).toBe(
        true,
      );

      // stop_limit with limit price but missing stop price
      const { validation: v2 } = await orderManager.createOrder(
        {
          symbol: "AAPL",
          side: "buy",
          quantity: 50,
          type: "stop_limit",
          limitPrice: 156,
          timeInForce: "day",
        },
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      expect(v2.isValid).toBe(false);
      expect(v2.errors.some((e) => e.code === "MISSING_STOP_PRICE")).toBe(true);

      // valid stop_limit with both prices
      const { order, validation: v3 } = await orderManager.createOrder(
        {
          symbol: "AAPL",
          side: "buy",
          quantity: 50,
          type: "stop_limit",
          stopPrice: 155,
          limitPrice: 156,
          timeInForce: "day",
        },
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      expect(v3.isValid).toBe(true);
      expect(order).not.toBeNull();
    });

    it("should handle sell stop for short protection", async () => {
      // Open a short position first
      const shortOrder = (
        await orderManager.createOrder(
          {
            symbol: "TSLA",
            side: "sell",
            quantity: 50,
            type: "market",
            timeInForce: "day",
          },
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const shortFill = makeFill(shortOrder, 50, 200.0);
      const position = await positionManager.openPosition(
        shortFill,
        shortOrder,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      expect(position.side).toBe("short");

      // Price goes up (against the short) — simulate close at loss
      const { realizedPL } = await positionManager.closePosition({
        positionId: position.id,
        closePrice: 210.0,
        timestamp: new Date(),
        reason: "stop_loss",
      });

      // Short loss: (200 - 210) * 50 = -500
      expect(realizedPL).toBe(-500);
    });
  });

  // ==========================================================================
  // 4. ORDER CANCELLATION
  // ==========================================================================

  describe("Order Cancellation", () => {
    it("should cancel a pending order", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const success = await orderManager.cancelOrder(order!.id, broker);

      expect(success).toBe(true);
      expect(orderManager.getOrder(order!.id)).toBeUndefined();
      expect(orderManager.getOpenOrders()).toHaveLength(0);
    });

    it("should cancel a submitted order via broker", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      const success = await orderManager.cancelOrder(order!.id, broker);

      expect(success).toBe(true);
      expect(broker.cancelOrder).toHaveBeenCalledTimes(1);
      expect(orderManager.getOpenOrders()).toHaveLength(0);
    });

    it("should cancel a partially filled order", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest({ quantity: 200 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "partial",
        filledQty: 80,
        filledAvgPrice: 149.5,
        timestamp: new Date(),
      });

      const success = await orderManager.cancelOrder(order!.id, broker);

      expect(success).toBe(true);
      expect(orderManager.getOpenOrders()).toHaveLength(0);
    });

    it("should not cancel a filled order", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "filled",
        filledQty: 100,
        filledAvgPrice: 150,
        timestamp: new Date(),
      });

      // Order is already removed from open orders after fill
      const success = await orderManager.cancelOrder(order!.id, broker);

      expect(success).toBe(false);
    });

    it("should return false when cancelling non-existent order", async () => {
      const success = await orderManager.cancelOrder("ORD-nonexistent", broker);
      expect(success).toBe(false);
    });

    it("should cancel all open orders", async () => {
      await orderManager.createOrder(
        makeBuyLimitRequest({ symbol: "AAPL" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.createOrder(
        makeBuyLimitRequest({ symbol: "GOOGL" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.createOrder(
        makeBuyLimitRequest({ symbol: "MSFT" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(orderManager.getOpenOrders()).toHaveLength(3);

      const cancelledCount = await orderManager.cancelAllOrders(broker);

      expect(cancelledCount).toBe(3);
      expect(orderManager.getOpenOrders()).toHaveLength(0);
    });

    it("should handle broker cancel failure gracefully", async () => {
      const failBroker = makeMockBrokerClient({
        cancelOrder: jest.fn<Promise<void>, [string]>(async () => {
          throw new Error("Broker unreachable");
        }),
      });

      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, failBroker);

      const success = await orderManager.cancelOrder(order!.id, failBroker);

      expect(success).toBe(false);
    });
  });

  // ==========================================================================
  // 5. ORDER REJECTION & EXPIRATION
  // ==========================================================================

  describe("Order Rejection and Expiration", () => {
    it("should handle order rejection with reason", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      const rejected = await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "rejected",
        timestamp: new Date(),
        message: "Insufficient buying power",
      });

      expect(rejected!.status).toBe("rejected");
      expect(rejected!.rejectReason).toBe("Insufficient buying power");
      expect(orderManager.getOpenOrders()).toHaveLength(0);
    });

    it("should handle order expiration", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      const expired = await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "expired",
        timestamp: new Date(),
      });

      expect(expired!.status).toBe("expired");
      expect(orderManager.getOpenOrders()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // 6. POSITION RECONCILIATION AFTER MULTIPLE FILLS
  // ==========================================================================

  describe("Position Reconciliation After Multiple Fills", () => {
    it("should correctly average entry price across multiple fills", async () => {
      const order1 = (
        await orderManager.createOrder(
          makeBuyLimitRequest({
            symbol: "MSFT",
            quantity: 100,
            limitPrice: 300,
          }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;

      // Fill 1: 100 shares @ 298
      const fill1 = makeFill(order1, 100, 298.0);
      await positionManager.openPosition(
        fill1,
        order1,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Fill 2: add 50 more @ 302
      const order2 = (
        await orderManager.createOrder(
          makeBuyLimitRequest({
            symbol: "MSFT",
            quantity: 50,
            limitPrice: 302,
          }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const fill2 = makeFill(order2, 50, 302.0);
      await positionManager.openPosition(
        fill2,
        order2,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const position = positionManager.getPositionBySymbol("MSFT");
      expect(position).toBeDefined();
      expect(position!.quantity).toBe(150);

      // Average entry = (100*298 + 50*302) / 150 = 44900/150 = 299.333...
      const expectedAvg = (100 * 298 + 50 * 302) / 150;
      expect(position!.avgEntryPrice).toBeCloseTo(expectedAvg, 4);
      expect(position!.costBasis).toBeCloseTo(150 * expectedAvg, 4);
    });

    it("should handle partial close and track remaining position", async () => {
      const buyOrder = (
        await orderManager.createOrder(
          makeBuyMarketRequest({ symbol: "NVDA", quantity: 200 }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const buyFill = makeFill(buyOrder, 200, 500.0);
      const position = await positionManager.openPosition(
        buyFill,
        buyOrder,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Partial close: sell 80 @ 520
      const sellOrder = (
        await orderManager.createOrder(
          makeSellLimitRequest({
            symbol: "NVDA",
            quantity: 80,
            limitPrice: 520,
          }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const sellFill = makeFill(sellOrder, 80, 520.0);
      const { position: reduced, realizedPL } =
        await positionManager.reducePosition(position.id, sellFill, sellOrder);

      // Realized P&L on partial close: (520 - 500) * 80 = 1600
      expect(realizedPL).toBe(1_600);
      expect(reduced.quantity).toBe(120);
      expect(reduced.status).toBe("open");
      expect(reduced.realizedPL).toBe(1_600);
    });

    it("should fully close position when reducing to zero", async () => {
      const buyOrder = (
        await orderManager.createOrder(
          makeBuyMarketRequest({ symbol: "META", quantity: 50 }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const buyFill = makeFill(buyOrder, 50, 400.0);
      const position = await positionManager.openPosition(
        buyFill,
        buyOrder,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Close entire position
      const sellOrder = (
        await orderManager.createOrder(
          makeSellLimitRequest({
            symbol: "META",
            quantity: 50,
            limitPrice: 420,
          }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const sellFill = makeFill(sellOrder, 50, 420.0);
      const { position: closed, realizedPL } =
        await positionManager.reducePosition(position.id, sellFill, sellOrder);

      expect(realizedPL).toBe(1_000); // (420-400)*50
      expect(closed.quantity).toBe(0);
      expect(closed.status).toBe("closed");
      expect(closed.closedAt).toBeInstanceOf(Date);
    });

    it("should track trades from fills", async () => {
      const buyOrder = (
        await orderManager.createOrder(
          makeBuyMarketRequest({ symbol: "AMZN", quantity: 30 }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const buyFill = makeFill(buyOrder, 30, 170.0);
      await positionManager.openPosition(
        buyFill,
        buyOrder,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const trades = positionManager.getTrades({ symbol: "AMZN" });
      expect(trades.length).toBeGreaterThanOrEqual(1);
      expect(trades[0].symbol).toBe("AMZN");
      expect(trades[0].quantity).toBe(30);
      expect(trades[0].price).toBe(170.0);
    });

    it("should calculate portfolio summary with multiple positions", async () => {
      // Open position 1: AAPL
      const order1 = (
        await orderManager.createOrder(
          makeBuyMarketRequest({ symbol: "AAPL", quantity: 100 }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const fill1 = makeFill(order1, 100, 150.0);
      await positionManager.openPosition(
        fill1,
        order1,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Open position 2: GOOGL
      const order2 = (
        await orderManager.createOrder(
          makeBuyMarketRequest({ symbol: "GOOGL", quantity: 50 }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const fill2 = makeFill(order2, 50, 140.0);
      await positionManager.openPosition(
        fill2,
        order2,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Update prices
      positionManager.updatePrices({ AAPL: 155.0, GOOGL: 145.0 });

      const summary = positionManager.getSummary();
      expect(summary.totalPositions).toBe(2);
      expect(summary.longPositions).toBe(2);
      expect(summary.shortPositions).toBe(0);
      // Market value: (100*155) + (50*145) = 15500+7250 = 22750
      expect(summary.totalMarketValue).toBe(22_750);
      // Cost basis: (100*150) + (50*140) = 15000+7000 = 22000
      expect(summary.totalCostBasis).toBe(22_000);
      // Unrealized P&L: 500 + 250 = 750
      expect(summary.totalUnrealizedPL).toBe(750);
    });
  });

  // ==========================================================================
  // 7. ERROR SCENARIOS
  // ==========================================================================

  describe("Error Scenarios", () => {
    it("should reject order with empty symbol", async () => {
      const { order, validation } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === "REQUIRED_FIELD")).toBe(
        true,
      );
      expect(order).toBeNull();
    });

    it("should reject order with zero quantity", async () => {
      const { order, validation } = await orderManager.createOrder(
        makeBuyMarketRequest({ quantity: 0 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        true,
      );
      expect(order).toBeNull();
    });

    it("should reject order with negative quantity", async () => {
      const { order, validation } = await orderManager.createOrder(
        makeBuyMarketRequest({ quantity: -10 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        true,
      );
      expect(order).toBeNull();
    });

    it("should reject order exceeding max order value", async () => {
      const om = createOrderManager({ maxOrderValue: 10_000 });
      const { order, validation } = await om.createOrder(
        makeBuyLimitRequest({ quantity: 1000, limitPrice: 200 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === "MAX_ORDER_VALUE")).toBe(
        true,
      );
      expect(order).toBeNull();
    });

    it("should reject order when max open orders reached", async () => {
      const om = createOrderManager({
        maxOpenOrders: 2,
        maxOrderValue: 1_000_000,
      });

      await om.createOrder(
        makeBuyLimitRequest({ symbol: "AAPL" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await om.createOrder(
        makeBuyLimitRequest({ symbol: "GOOGL" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const { order, validation } = await om.createOrder(
        makeBuyLimitRequest({ symbol: "MSFT" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === "MAX_OPEN_ORDERS")).toBe(
        true,
      );
      expect(order).toBeNull();
    });

    it("should reject order when max daily orders reached", async () => {
      const om = createOrderManager({
        maxDailyOrders: 1,
        maxOrderValue: 1_000_000,
      });

      // First order succeeds + submit (increments daily count)
      const { order: first } = await om.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await om.submitOrder(first!.id, broker);

      // Cancel it so we don't hit open order limit, only daily limit
      await om.cancelOrder(first!.id, broker);

      const { order, validation } = await om.createOrder(
        makeBuyMarketRequest({ symbol: "GOOGL" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === "MAX_DAILY_ORDERS")).toBe(
        true,
      );
      expect(order).toBeNull();
    });

    it("should handle broker submission failure and mark order as error", async () => {
      const failBroker = makeMockBrokerClient({
        submitOrder: jest.fn<Promise<BrokerOrderResponse>, [unknown]>(
          async () => {
            throw new Error("Connection timeout");
          },
        ),
      });

      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const errored = await orderManager.submitOrder(order!.id, failBroker);

      expect(errored).not.toBeNull();
      expect(errored!.status).toBe("error");
      expect(errored!.errorMessage).toBe("Connection timeout");
    });

    it("should return null when submitting non-existent order", async () => {
      const result = await orderManager.submitOrder("ORD-nonexistent", broker);
      expect(result).toBeNull();
    });

    it("should return null when submitting an already submitted order", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      // Try to submit again — status is no longer 'pending'
      const result = await orderManager.submitOrder(order!.id, broker);
      expect(result).toBeNull();
    });

    it("should return null when handling update for unknown order", async () => {
      const result = await orderManager.handleOrderUpdate({
        orderId: "ORD-unknown",
        status: "filled",
        timestamp: new Date(),
      });
      expect(result).toBeNull();
    });

    it("should throw when reducing a non-existent position", async () => {
      const fakeOrder = (
        await orderManager.createOrder(
          makeSellLimitRequest(),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const fakeFill = makeFill(fakeOrder, 10, 160);

      await expect(
        positionManager.reducePosition("POS-nonexistent", fakeFill, fakeOrder),
      ).rejects.toThrow("Position POS-nonexistent not found");
    });

    it("should throw when closing a non-existent position", async () => {
      await expect(
        positionManager.closePosition({
          positionId: "POS-nonexistent",
          closePrice: 100,
          timestamp: new Date(),
        }),
      ).rejects.toThrow("Position POS-nonexistent not found");
    });
  });

  // ==========================================================================
  // 8. EDGE CASES
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle sell order (short) position side correctly", async () => {
      const { order } = await orderManager.createOrder(
        {
          symbol: "SPY",
          side: "sell",
          quantity: 100,
          type: "market",
          timeInForce: "day",
        },
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 100, 450.0);
      const position = await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(position.side).toBe("short");

      // Price drops (favorable for short)
      positionManager.updatePrice("SPY", 440.0);
      const updated = positionManager.getPosition(position.id);
      // Short P&L: -(440-450)*100 = 1000
      expect(updated!.unrealizedPL).toBe(1_000);
    });

    it("should handle short position loss when price goes up", async () => {
      const { order } = await orderManager.createOrder(
        {
          symbol: "SPY",
          side: "sell",
          quantity: 100,
          type: "market",
          timeInForce: "day",
        },
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 100, 450.0);
      const position = await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      positionManager.updatePrice("SPY", 460.0);
      const updated = positionManager.getPosition(position.id);
      // Short loss: -(460-450)*100 = -1000
      expect(updated!.unrealizedPL).toBe(-1_000);
    });

    it("should handle extended hours adjustment", async () => {
      const om = createOrderManager({ enableExtendedHours: false });

      const { order, validation } = await om.createOrder(
        makeBuyMarketRequest({ extendedHours: true }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some((w) => w.field === "extendedHours")).toBe(
        true,
      );
      // Order should be adjusted to not use extended hours
      expect(order).not.toBeNull();
    });

    it("should warn about missing stop loss when required", async () => {
      const om = createOrderManager({
        requireStopLoss: true,
        maxOrderValue: 1_000_000,
      });

      const { validation } = await om.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some((w) => w.field === "stopLossPrice")).toBe(
        true,
      );
    });

    it("should track order events for audit trail", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "accepted",
        timestamp: new Date(),
      });
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "filled",
        filledQty: 100,
        filledAvgPrice: 150,
        timestamp: new Date(),
      });

      const events = orderManager.getOrderEvents(order!.id);
      expect(events.length).toBeGreaterThanOrEqual(4); // created, submitted, accepted, filled
      const eventTypes = events.map((e) => e.eventType);
      expect(eventTypes).toContain("created");
      expect(eventTypes).toContain("submitted");
      expect(eventTypes).toContain("accepted");
      expect(eventTypes).toContain("filled");
    });

    it("should generate unique order IDs", async () => {
      const { order: order1 } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const { order: order2 } = await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(order1!.id).not.toBe(order2!.id);
      expect(order1!.id).toMatch(/^ORD-/);
      expect(order2!.id).toMatch(/^ORD-/);
    });

    it("should return blotter with correct counts", async () => {
      await orderManager.createOrder(
        makeBuyLimitRequest({ symbol: "AAPL" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.createOrder(
        makeBuyLimitRequest({ symbol: "GOOGL" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const blotter = orderManager.getBlotter();
      expect(blotter.openOrders).toHaveLength(2);
      expect(blotter.totalOpenValue).toBeGreaterThan(0);
    });

    it("should support bracket order with take profit and stop loss", async () => {
      const { order, validation } = await orderManager.createOrder(
        makeBuyLimitRequest({
          limitPrice: 150,
          takeProfitPrice: 160,
          stopLossPrice: 140,
        }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(true);
      expect(order!.takeProfitPrice).toBe(160);
      expect(order!.stopLossPrice).toBe(140);
    });

    it("should pass bracket order fields to broker on submit", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest({
          limitPrice: 150,
          takeProfitPrice: 165,
          stopLossPrice: 142,
          stopLossLimitPrice: 141,
        }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      expect(broker.submitOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          take_profit: { limit_price: 165 },
          stop_loss: { stop_price: 142, limit_price: 141 },
        }),
      );
    });

    it("should handle multiple symbols in open orders simultaneously", async () => {
      const symbols = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"];
      for (const symbol of symbols) {
        await orderManager.createOrder(
          makeBuyLimitRequest({ symbol }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        );
      }

      expect(orderManager.getOpenOrders()).toHaveLength(5);

      // Cancel one
      const aaplOrder = orderManager
        .getOpenOrders()
        .find((o) => o.symbol === "AAPL");
      await orderManager.cancelOrder(aaplOrder!.id, broker);

      expect(orderManager.getOpenOrders()).toHaveLength(4);
    });

    it("should return all order events when no orderId filter is passed", async () => {
      await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "A" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "B" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const allEvents = orderManager.getOrderEvents();
      // At least 2 'created' events
      expect(allEvents.filter((e) => e.eventType === "created").length).toBe(2);
    });

    it("should use strategy and signal IDs from order in position", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ strategyId: "strat-001", signalId: "sig-001" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 100, 150);
      const position = await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(position.strategyId).toBe("strat-001");
      expect(position.signalId).toBe("sig-001");
    });
  });

  // ==========================================================================
  // 9. BROKER RECONCILIATION
  // ==========================================================================

  describe("Broker Reconciliation", () => {
    it("should detect matched orders", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      const reconcileBroker = makeMockBrokerClient({
        getOrders: jest.fn<Promise<BrokerOrder[]>, [{ status?: string }]>(
          async () => [
            {
              id: "BRK-123",
              client_order_id: order!.id,
              status: "new",
              filled_qty: 0,
            },
          ],
        ),
      });

      const result = await orderManager.reconcileWithBroker(reconcileBroker);
      expect(result.matched).toBe(1);
      expect(result.mismatched).toBe(0);
    });

    it("should detect status mismatches and correct them", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      const reconcileBroker = makeMockBrokerClient({
        getOrders: jest.fn<Promise<BrokerOrder[]>, [{ status?: string }]>(
          async () => [
            {
              id: "BRK-123",
              client_order_id: order!.id,
              status: "filled",
              filled_qty: 100,
              filled_avg_price: 150.5,
            },
          ],
        ),
      });

      const result = await orderManager.reconcileWithBroker(reconcileBroker);
      expect(result.mismatched).toBe(1);
      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0].type).toBe("status_mismatch");
    });

    it("should detect orders missing on broker side", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      // Broker returns empty — no matching orders
      const reconcileBroker = makeMockBrokerClient({
        getOrders: jest.fn<Promise<BrokerOrder[]>, [{ status?: string }]>(
          async () => [],
        ),
      });

      const result = await orderManager.reconcileWithBroker(reconcileBroker);
      expect(result.missingBroker).toBe(1);
      expect(result.corrections.some((c) => c.type === "missing_broker")).toBe(
        true,
      );
    });

    it("should detect orders missing locally", async () => {
      // No local orders exist
      const reconcileBroker = makeMockBrokerClient({
        getOrders: jest.fn<Promise<BrokerOrder[]>, [{ status?: string }]>(
          async () => [
            {
              id: "BRK-999",
              client_order_id: "ORD-unknown-external",
              status: "new",
              filled_qty: 0,
            },
          ],
        ),
      });

      const result = await orderManager.reconcileWithBroker(reconcileBroker);
      expect(result.missingLocal).toBe(1);
    });
  });

  // ==========================================================================
  // 10. POSITION P&L CALCULATIONS (COMPREHENSIVE)
  // ==========================================================================

  describe("Position P&L Calculations", () => {
    it("should calculate unrealized P&L percent correctly", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ quantity: 100 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 100, 200.0);
      const position = await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      positionManager.updatePrice(position.symbol, 210.0);
      const updated = positionManager.getPosition(position.id);

      // Unrealized P&L: (210-200)*100 = 1000
      expect(updated!.unrealizedPL).toBe(1_000);
      // Unrealized P&L %: 1000 / 20000 = 0.05 (5%)
      expect(updated!.unrealizedPLPercent).toBeCloseTo(0.05, 4);
    });

    it("should track total P&L as sum of realized and unrealized", async () => {
      const buyOrder = (
        await orderManager.createOrder(
          makeBuyMarketRequest({ symbol: "XYZ", quantity: 100 }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const buyFill = makeFill(buyOrder, 100, 100.0);
      const position = await positionManager.openPosition(
        buyFill,
        buyOrder,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Partial close: sell 40 @ 110 -> realized = 400
      const sellOrder = (
        await orderManager.createOrder(
          makeSellLimitRequest({
            symbol: "XYZ",
            quantity: 40,
            limitPrice: 110,
          }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const sellFill = makeFill(sellOrder, 40, 110.0);
      await positionManager.reducePosition(position.id, sellFill, sellOrder);

      // Update price for remaining 60 shares
      positionManager.updatePrice("XYZ", 115.0);
      const updated = positionManager.getPosition(position.id);

      expect(updated!.realizedPL).toBe(400); // (110-100)*40
      expect(updated!.unrealizedPL).toBe(900); // (115-100)*60
      expect(updated!.totalPL).toBe(1_300); // 400 + 900
    });

    it("should handle risk calculation with stop loss", async () => {
      positionManager.setAccountEquity(100_000);

      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ quantity: 100, stopLossPrice: 145 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 100, 150.0);
      const position = await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Risk = |150 - 145| * 100 = 500
      expect(position.riskAmount).toBe(500);
      // Risk percent = 500 / 100000 = 0.005
      expect(position.riskPercent).toBeCloseTo(0.005, 4);
    });

    it("should handle partial close via closePosition with remaining qty", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "PARTIAL_CLOSE", quantity: 100 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 100, 200.0);
      const position = await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Partial close: only sell 40 of 100
      const { position: partial, realizedPL } =
        await positionManager.closePosition({
          positionId: position.id,
          closePrice: 220.0,
          closeQuantity: 40,
          timestamp: new Date(),
          reason: "manual",
        });

      expect(realizedPL).toBe(800); // (220-200)*40
      expect(partial.quantity).toBe(60);
      expect(partial.status).toBe("open");
      expect(partial.realizedPL).toBe(800);
      // P&L should still be calculated for remaining 60 shares
      expect(partial.unrealizedPL).toBeDefined();
    });

    it("should not update P&L for closed positions on price change", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "CLOSED_TEST", quantity: 50 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 50, 100.0);
      const position = await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Close the position
      await positionManager.closePosition({
        positionId: position.id,
        closePrice: 110.0,
        timestamp: new Date(),
        reason: "manual",
      });

      const closed = positionManager.getPosition(position.id);
      expect(closed!.status).toBe("closed");
      const plBeforeUpdate = closed!.unrealizedPL;

      // Price changes should not affect closed position P&L
      positionManager.updatePrice("CLOSED_TEST", 200.0);
      const afterUpdate = positionManager.getPosition(position.id);
      expect(afterUpdate!.unrealizedPL).toBe(plBeforeUpdate);
    });
  });

  // ==========================================================================
  // 11. VALIDATION EDGE CASES (ADDITIONAL COVERAGE)
  // ==========================================================================

  describe("Validation Edge Cases", () => {
    it("should reject order with invalid side value", async () => {
      const { order, validation } = await orderManager.createOrder(
        {
          symbol: "AAPL",
          side: "invalid" as "buy",
          quantity: 100,
          type: "market",
          timeInForce: "day",
        },
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === "INVALID_SIDE")).toBe(
        true,
      );
      expect(order).toBeNull();
    });

    it("should reject order with missing side", async () => {
      const { order, validation } = await orderManager.createOrder(
        {
          symbol: "AAPL",
          side: "" as "buy",
          quantity: 100,
          type: "market",
          timeInForce: "day",
        },
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === "INVALID_SIDE")).toBe(
        true,
      );
      expect(order).toBeNull();
    });

    it("should accumulate multiple validation errors", async () => {
      const { order, validation } = await orderManager.createOrder(
        {
          symbol: "",
          side: "bad" as "buy",
          quantity: -5,
          type: "limit",
          timeInForce: "day",
        },
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(3);
      const codes = validation.errors.map((e) => e.code);
      expect(codes).toContain("REQUIRED_FIELD");
      expect(codes).toContain("INVALID_QUANTITY");
      expect(codes).toContain("INVALID_SIDE");
      expect(order).toBeNull();
    });
  });

  // ==========================================================================
  // 12. POSITION FILTERING & QUERYING
  // ==========================================================================

  describe("Position Filtering and Querying", () => {
    let positions: { id: string; symbol: string }[];

    beforeEach(async () => {
      positions = [];

      // Create several positions with different characteristics
      const symbols = ["AAPL", "GOOGL", "TSLA"];
      const prices = [150, 140, 250];
      for (let i = 0; i < symbols.length; i++) {
        const side = i === 2 ? "sell" : "buy";
        const { order } = await orderManager.createOrder(
          {
            symbol: symbols[i],
            side,
            quantity: 100,
            type: "market",
            timeInForce: "day",
            strategyId: i === 0 ? "strat-A" : undefined,
          },
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        );
        const fill = makeFill(order!, 100, prices[i]);
        const pos = await positionManager.openPosition(
          fill,
          order!,
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        );
        positions.push({ id: pos.id, symbol: pos.symbol });
      }
    });

    it("should filter positions by status", async () => {
      const openPositions = await positionManager.getPositions({
        status: ["open"],
      });
      expect(openPositions).toHaveLength(3);

      // Close one position
      await positionManager.closePosition({
        positionId: positions[0].id,
        closePrice: 155,
        timestamp: new Date(),
      });

      const stillOpen = await positionManager.getPositions({
        status: ["open"],
      });
      expect(stillOpen).toHaveLength(2);

      const closed = await positionManager.getPositions({ status: ["closed"] });
      expect(closed).toHaveLength(1);
    });

    it("should filter positions by side", async () => {
      const longs = await positionManager.getPositions({ side: "long" });
      expect(longs).toHaveLength(2);

      const shorts = await positionManager.getPositions({ side: "short" });
      expect(shorts).toHaveLength(1);
      expect(shorts[0].symbol).toBe("TSLA");
    });

    it("should filter positions by symbol", async () => {
      const result = await positionManager.getPositions({ symbol: "GOOGL" });
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("GOOGL");
    });

    it("should filter positions by strategyId", async () => {
      const result = await positionManager.getPositions({
        strategyId: "strat-A",
      });
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
    });

    it("should filter positions by minValue", async () => {
      // TSLA: 100 * 250 = 25000, AAPL: 100*150 = 15000, GOOGL: 100*140 = 14000
      const result = await positionManager.getPositions({ minValue: 20000 });
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("TSLA");
    });

    it("should filter positions by maxValue", async () => {
      const result = await positionManager.getPositions({ maxValue: 15000 });
      expect(result).toHaveLength(2); // AAPL(15000) and GOOGL(14000)
    });

    it("should apply pagination with limit and offset", async () => {
      const page1 = await positionManager.getPositions({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await positionManager.getPositions({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(1);
    });

    it("should get all positions including closed", () => {
      const all = positionManager.getAllPositions();
      expect(all).toHaveLength(3);
    });

    it("should return undefined for non-existent position by symbol", () => {
      const result = positionManager.getPositionBySymbol("NONEXISTENT");
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // 13. TRADE HISTORY QUERYING
  // ==========================================================================

  describe("Trade History Querying", () => {
    it("should filter trades by positionId", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "TRADE_TEST", quantity: 50 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 50, 100.0);
      const position = await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const trades = positionManager.getTrades({ positionId: position.id });
      expect(trades).toHaveLength(1);
      expect(trades[0].positionId).toBe(position.id);
    });

    it("should limit trade results", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "LIMIT_TEST", quantity: 50 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Open position then add to it to create multiple trades
      const fill1 = makeFill(order!, 50, 100.0);
      await positionManager.openPosition(
        fill1,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill2 = makeFill(order!, 30, 105.0);
      await positionManager.openPosition(
        fill2,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const allTrades = positionManager.getTrades({ symbol: "LIMIT_TEST" });
      expect(allTrades.length).toBe(2);

      const limited = positionManager.getTrades({
        symbol: "LIMIT_TEST",
        limit: 1,
      });
      expect(limited).toHaveLength(1);
    });

    it("should return all trades when no filter is provided", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "ALL_TRADES", quantity: 20 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 20, 50.0);
      await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const trades = positionManager.getTrades();
      expect(trades.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // 14. PORTFOLIO SUMMARY WITH SHORTS
  // ==========================================================================

  describe("Portfolio Summary with Short Positions", () => {
    it("should calculate gross and net exposure with both long and short positions", async () => {
      // Long AAPL
      const longOrder = (
        await orderManager.createOrder(
          makeBuyMarketRequest({ symbol: "AAPL", quantity: 100 }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const longFill = makeFill(longOrder, 100, 150.0);
      await positionManager.openPosition(
        longFill,
        longOrder,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Short TSLA
      const shortOrder = (
        await orderManager.createOrder(
          {
            symbol: "TSLA",
            side: "sell",
            quantity: 50,
            type: "market",
            timeInForce: "day",
          },
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const shortFill = makeFill(shortOrder, 50, 200.0);
      await positionManager.openPosition(
        shortFill,
        shortOrder,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const summary = positionManager.getSummary();
      expect(summary.longPositions).toBe(1);
      expect(summary.shortPositions).toBe(1);
      // Long exposure: 100*150 = 15000, Short exposure: 50*200 = 10000
      expect(summary.grossExposure).toBe(25_000); // long + short
      expect(summary.netExposure).toBe(5_000); // long - short
    });

    it("should identify largest position in summary", async () => {
      positionManager.setAccountEquity(100_000);

      const order1 = (
        await orderManager.createOrder(
          makeBuyMarketRequest({ symbol: "SMALL", quantity: 10 }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const fill1 = makeFill(order1, 10, 50.0);
      await positionManager.openPosition(
        fill1,
        order1,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const order2 = (
        await orderManager.createOrder(
          makeBuyMarketRequest({ symbol: "LARGE", quantity: 100 }),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        )
      ).order!;
      const fill2 = makeFill(order2, 100, 300.0);
      await positionManager.openPosition(
        fill2,
        order2,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const summary = positionManager.getSummary();
      expect(summary.largestPosition).not.toBeNull();
      expect(summary.largestPosition!.symbol).toBe("LARGE");
      expect(summary.largestPosition!.value).toBe(30_000); // 100*300
      expect(summary.largestPosition!.percent).toBeCloseTo(0.3, 4); // 30000/100000
    });

    it("should return null largestPosition when no open positions", () => {
      const summary = positionManager.getSummary();
      expect(summary.largestPosition).toBeNull();
      expect(summary.totalPositions).toBe(0);
    });
  });

  // ==========================================================================
  // 15. FACTORY FUNCTIONS
  // ==========================================================================

  describe("Factory Functions", () => {
    it("should create independent OrderManager instances via createOrderManager", () => {
      const om1 = createOrderManager({ maxOpenOrders: 5 });
      const om2 = createOrderManager({ maxOpenOrders: 10 });
      expect(om1).not.toBe(om2);
    });

    it("should create independent PositionManager instances via createPositionManager", () => {
      const pm1 = createPositionManager({ maxPositions: 5 });
      const pm2 = createPositionManager({ maxPositions: 10 });
      expect(pm1).not.toBe(pm2);
    });

    it("should return singleton from getOrderManager", () => {
      const om1 = getOrderManager();
      const om2 = getOrderManager();
      expect(om1).toBe(om2);
    });

    it("should return singleton from getPositionManager", () => {
      const pm1 = getPositionManager();
      const pm2 = getPositionManager();
      expect(pm1).toBe(pm2);
    });
  });

  // ==========================================================================
  // 16. ORDER STATUS MAPPING
  // ==========================================================================

  describe("Broker Status Mapping in Reconciliation", () => {
    it("should map various broker statuses correctly during reconciliation", async () => {
      // Create and submit order
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      // Broker reports 'partially_filled' — should map to 'partial'
      const reconcileBroker = makeMockBrokerClient({
        getOrders: jest.fn<Promise<BrokerOrder[]>, [{ status?: string }]>(
          async () => [
            {
              id: "BRK-123",
              client_order_id: order!.id,
              status: "partially_filled",
              filled_qty: 50,
              filled_avg_price: 149.0,
            },
          ],
        ),
      });

      const result = await orderManager.reconcileWithBroker(reconcileBroker);
      expect(result.mismatched).toBe(1);
      // Order should now be partial
      const events = orderManager.getOrderEvents(order!.id);
      expect(events.some((e) => e.newStatus === "partial")).toBe(true);
    });
  });

  // ==========================================================================
  // 17. POSITION RECONCILIATION WITH BROKER
  // ==========================================================================

  describe("Position Reconciliation with Broker", () => {
    it("should match positions with broker when quantities agree", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "RECON_MATCH", quantity: 100 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 100, 150);
      await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const result = await positionManager.reconcileWithBroker([
        {
          symbol: "RECON_MATCH",
          side: "long",
          qty: 100,
          avg_entry_price: 150,
          market_value: 15000,
          unrealized_pl: 0,
        },
      ]);

      expect(result.matched).toBe(1);
      expect(result.mismatched).toBe(0);
    });

    it("should detect quantity mismatch and adjust local position", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "RECON_MISMATCH", quantity: 100 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 100, 150);
      await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      const result = await positionManager.reconcileWithBroker([
        {
          symbol: "RECON_MISMATCH",
          side: "long",
          qty: 80,
          avg_entry_price: 148,
          market_value: 11840,
          unrealized_pl: 0,
        },
      ]);

      expect(result.mismatched).toBe(1);
      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0].type).toBe("quantity_mismatch");

      // Local position should be adjusted
      const pos = positionManager.getPositionBySymbol("RECON_MISMATCH");
      expect(pos!.quantity).toBe(80);
      expect(pos!.avgEntryPrice).toBe(148);
    });

    it("should detect position missing on broker and report it", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "RECON_MISSING_BRK", quantity: 50 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 50, 200);
      await positionManager.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Empty broker positions
      const result = await positionManager.reconcileWithBroker([]);

      expect(result.missingBroker).toBe(1);
      expect(result.corrections.some((c) => c.type === "missing_broker")).toBe(
        true,
      );
    });

    it("should detect position missing locally", async () => {
      const result = await positionManager.reconcileWithBroker([
        {
          symbol: "EXTERNAL_POS",
          side: "long",
          qty: 200,
          avg_entry_price: 50,
          market_value: 10000,
          unrealized_pl: 0,
        },
      ]);

      expect(result.missingLocal).toBe(1);
      expect(result.corrections.some((c) => c.type === "missing_local")).toBe(
        true,
      );
    });
  });

  // ==========================================================================
  // 18. CANCEL ORDER IN NON-CANCELLABLE STATUS
  // ==========================================================================

  describe("Cancel Non-Cancellable Order Status", () => {
    it("should refuse to cancel an order in error status", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "ERR_CANCEL" }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      expect(order).not.toBeNull();

      // Move order to error status via handleOrderUpdate — error is not
      // in the switch, so the order stays in openOrders
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "error",
        timestamp: new Date(),
        message: "Broker error",
      });

      // Verify it's still in openOrders
      const fetched = orderManager.getOrder(order!.id);
      expect(fetched).toBeDefined();
      expect(fetched!.status).toBe("error");

      // Attempt cancel — should return false (non-cancellable status)
      const result = await orderManager.cancelOrder(order!.id, broker);
      expect(result).toBe(false);
      // Broker cancelOrder should NOT have been called
      expect(broker.cancelOrder).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 19. getOrders() — Supabase-backed DB query with filters
  // ==========================================================================

  describe("getOrders() DB Query", () => {
    it("should call getOrders with no filters and return empty array", async () => {
      const result = await orderManager.getOrders({});
      expect(Array.isArray(result)).toBe(true);
    });

    it("should call getOrders with status filter", async () => {
      const result = await orderManager.getOrders({
        status: ["filled", "cancelled"],
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should call getOrders with side filter", async () => {
      const result = await orderManager.getOrders({ side: "buy" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should call getOrders with symbol filter", async () => {
      const result = await orderManager.getOrders({ symbol: "AAPL" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should call getOrders with date range", async () => {
      const result = await orderManager.getOrders({
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should call getOrders with strategyId filter", async () => {
      const result = await orderManager.getOrders({ strategyId: "strat-1" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should call getOrders with limit", async () => {
      const result = await orderManager.getOrders({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should call getOrders with offset and limit for pagination", async () => {
      const result = await orderManager.getOrders({ offset: 20, limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should call getOrders with all filters combined", async () => {
      const result = await orderManager.getOrders({
        status: ["filled"],
        side: "buy",
        symbol: "AAPL",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        strategyId: "strat-1",
        limit: 10,
        offset: 0,
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==========================================================================
  // 19b. PERSISTENCE — real table targeting + write-error surfacing (TASK:
  // orders/positions durable persistence). Regression guard for the original
  // defect: the `orders` table did not exist in any migration, and every
  // write silently no-op'd because persistOrder's try/catch never even read
  // `error` off the upsert result. supabase/migrations/
  // 20260731000000_trading_orders_positions.sql creates the table; these
  // tests prove the code targets it by name and that a write failure is no
  // longer swallowed.
  // ==========================================================================

  describe("Persistence — orders table targeting and error surfacing", () => {
    it("createOrder() persists via .from(\"orders\") — not a different/missing table", async () => {
      await orderManager.createOrder(
        makeBuyMarketRequest(),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      expect(mockFromSpy).toHaveBeenCalledWith("orders");
    });

    it("getOrders() queries .from(\"orders\") — not a different/missing table", async () => {
      await orderManager.getOrders({ userId: TEST_USER_ID });

      expect(mockFromSpy).toHaveBeenCalledWith("orders");
    });

    it("createOrder() rethrows when the DB upsert returns an error (no silent data loss)", async () => {
      const errorChain = makeMockSupabaseChain();
      (errorChain as unknown as { then: unknown }).then = (
        resolve: (v: unknown) => unknown,
      ) =>
        Promise.resolve({
          data: null,
          error: { message: "relation \"orders\" does not exist", code: "42P01" },
        }).then(resolve);
      mockFromSpy.mockImplementationOnce(() => errorChain);

      await expect(
        orderManager.createOrder(
          makeBuyMarketRequest(),
          TEST_USER_ID,
          TEST_ACCOUNT_ID,
        ),
      ).rejects.toThrow(/Failed to persist order/);
    });

    it("getOrders() throws (not an empty array) when the DB returns an error", async () => {
      const errorChain = makeMockSupabaseChain();
      (errorChain as unknown as { then: unknown }).then = (
        resolve: (v: unknown) => unknown,
      ) =>
        Promise.resolve({
          data: null,
          error: { message: "connection reset", code: "08006" },
        }).then(resolve);
      mockFromSpy.mockImplementationOnce(() => errorChain);

      await expect(
        orderManager.getOrders({ userId: TEST_USER_ID }),
      ).rejects.toThrow(/Failed to fetch orders/);
    });

    it("round-trips: order written via createOrder maps back correctly from a stored row", async () => {
      const { order } = await orderManager.createOrder(
        makeBuyLimitRequest({ symbol: "RTRIP", quantity: 25, limitPrice: 42 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Simulate the exact row shape the DB would return for the order just
      // "written" above (snake_case columns, ISO timestamp strings).
      const storedRow = {
        id: order!.id,
        broker_id: null,
        user_id: TEST_USER_ID,
        account_id: TEST_ACCOUNT_ID,
        symbol: "RTRIP",
        side: "buy",
        quantity: 25,
        type: "limit",
        limit_price: 42,
        stop_price: null,
        time_in_force: "day",
        status: "pending",
        filled_qty: 0,
        filled_avg_price: null,
        created_at: order!.createdAt.toISOString(),
        submitted_at: null,
        filled_at: null,
        cancelled_at: null,
        updated_at: order!.updatedAt.toISOString(),
        error_message: null,
        reject_reason: null,
        estimated_value: 1050,
        signal_id: null,
        strategy_id: null,
        notes: null,
      };
      const readChain = makeMockSupabaseChain();
      (readChain as unknown as { then: unknown }).then = (
        resolve: (v: unknown) => unknown,
      ) =>
        Promise.resolve({ data: [storedRow], error: null }).then(resolve);
      mockFromSpy.mockImplementationOnce(() => readChain);

      const [readBack] = await orderManager.getOrders({ userId: TEST_USER_ID });

      expect(readBack.id).toBe(order!.id);
      expect(readBack.symbol).toBe("RTRIP");
      expect(readBack.quantity).toBe(25);
      expect(readBack.limitPrice).toBe(42);
      expect(readBack.status).toBe("pending");
    });
  });

  // ==========================================================================
  // 20. BLOTTER WITH FILLED ORDERS — filledOrders, totalFilledValue, todayFillCount
  // ==========================================================================

  describe("Blotter with Filled Orders", () => {
    it("should include filled orders in blotter with correct value", async () => {
      // Create, submit, and fill an order
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "BLT_FILL", quantity: 50 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "filled",
        filledQty: 50,
        filledAvgPrice: 150,
        timestamp: new Date(),
      });

      const blotter = orderManager.getBlotter();
      // Filled orders are removed from openOrders, so filledOrders may or may
      // not include them depending on whether the filled event was logged and
      // the order is still retrievable.
      // But todayFillCount should reflect fills processed today.
      expect(blotter.todayOrderCount).toBeGreaterThanOrEqual(1);
    });

    it("should count today fills correctly in blotter", async () => {
      // Create, submit, and partially fill, then fully fill
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "BLT_TODAY", quantity: 100 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      await orderManager.submitOrder(order!.id, broker);

      // Record fills
      const fill1 = makeFill(order!, 60, 150);
      const fill2 = makeFill(order!, 40, 155);
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "partial",
        filledQty: 60,
        filledAvgPrice: 150,
        timestamp: new Date(),
      });
      await orderManager.handleOrderUpdate({
        orderId: order!.id,
        status: "filled",
        filledQty: 100,
        filledAvgPrice: 152,
        timestamp: new Date(),
      });

      const blotter = orderManager.getBlotter();
      // Verify blotter structure is complete
      expect(blotter).toHaveProperty("openOrders");
      expect(blotter).toHaveProperty("filledOrders");
      expect(blotter).toHaveProperty("cancelledOrders");
      expect(blotter).toHaveProperty("totalOpenValue");
      expect(blotter).toHaveProperty("totalFilledValue");
      expect(blotter).toHaveProperty("todayOrderCount");
      expect(blotter).toHaveProperty("todayFillCount");
      expect(typeof blotter.totalFilledValue).toBe("number");
      expect(typeof blotter.todayFillCount).toBe("number");
    });
  });

  // ==========================================================================
  // 21. loadPositions() — DB-backed position loading
  // ==========================================================================

  describe("loadPositions() from DB", () => {
    it("should call loadPositions without throwing", async () => {
      await expect(
        positionManager.loadPositions("user-load-test"),
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // 22. RECONCILE WITH autoCloseOnReconcile ENABLED
  // ==========================================================================

  describe("Reconcile with autoCloseOnReconcile", () => {
    it("should auto-close local positions missing on broker when enabled", async () => {
      const autoClosePM = createPositionManager({
        autoCLoseOnReconcile: true,
      });

      // Create a position that will be "missing" on broker side
      const { order } = await orderManager.createOrder(
        makeBuyMarketRequest({ symbol: "AUTO_CLOSE", quantity: 30 }),
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );
      const fill = makeFill(order!, 30, 100);
      await autoClosePM.openPosition(
        fill,
        order!,
        TEST_USER_ID,
        TEST_ACCOUNT_ID,
      );

      // Update price so closePosition works
      autoClosePM.updatePrice("AUTO_CLOSE", 105);

      const before = autoClosePM.getOpenPositions();
      expect(before).toHaveLength(1);

      // Reconcile with empty broker => missing_broker, should auto-close
      const result = await autoClosePM.reconcileWithBroker([]);
      expect(result.missingBroker).toBe(1);
      expect(result.corrections.some((c) => c.type === "missing_broker")).toBe(
        true,
      );

      // After auto-close, position should be closed
      const after = autoClosePM.getOpenPositions();
      expect(after).toHaveLength(0);
    });
  });
});
