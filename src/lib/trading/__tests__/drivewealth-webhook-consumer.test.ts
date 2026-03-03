/**
 * DriveWealthWebhookConsumer - Test Suite
 *
 * Tests webhook event processing for all DriveWealth order event types,
 * handler management, batch processing, and error handling.
 */

import {
  DriveWealthWebhookConsumer,
  DriveWealthWebhookEvent,
  DriveWealthEventType,
  OrderUpdateHandler,
} from "../brokers/drivewealth-webhook-consumer";
import type { Order } from "../brokers/broker-interface";

// ============================================================================
// HELPERS
// ============================================================================

function createEvent(
  type: DriveWealthEventType,
  overrides?: Partial<DriveWealthWebhookEvent["order"]>,
): DriveWealthWebhookEvent {
  return {
    type,
    timestamp: "2026-01-01T12:00:00Z",
    accountID: "acc-123",
    order: {
      id: "order-123",
      refID: "client-ref-123",
      symbol: "AAPL",
      side: "BUY",
      type: "LIMIT",
      quantity: 10,
      filledQty: 0,
      status: type.replace("ORDER_", ""),
      limitPrice: 150.0,
      stopPrice: undefined,
      timeInForce: "DAY",
      extendedHours: false,
      createdAt: "2026-01-01T10:00:00Z",
      updatedAt: "2026-01-01T12:00:00Z",
      filledAt: undefined,
      avgFillPrice: undefined,
      ...overrides,
    },
  };
}

function createFilledEvent(): DriveWealthWebhookEvent {
  return createEvent("ORDER_FILLED", {
    status: "FILLED",
    filledQty: 10,
    filledAt: "2026-01-01T12:00:00Z",
    avgFillPrice: 150.5,
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("DriveWealthWebhookConsumer", () => {
  let consumer: DriveWealthWebhookConsumer;

  beforeEach(() => {
    consumer = new DriveWealthWebhookConsumer();
  });

  // ==========================================================================
  // EVENT PROCESSING
  // ==========================================================================

  describe("processEvent", () => {
    it("should process ORDER_CREATED event", () => {
      const result = consumer.processEvent(createEvent("ORDER_CREATED"));
      expect(result.success).toBe(true);
      expect(result.eventType).toBe("ORDER_CREATED");
      expect(result.order).toBeDefined();
      expect(result.order!.status).toBe("new");
    });

    it("should process ORDER_FILLED event", () => {
      const result = consumer.processEvent(createFilledEvent());
      expect(result.success).toBe(true);
      expect(result.eventType).toBe("ORDER_FILLED");
      expect(result.order!.status).toBe("filled");
      expect(result.order!.filledQuantity).toBe(10);
      expect(result.order!.filledAvgPrice).toBe(150.5);
      expect(result.order!.filledAt).toBeInstanceOf(Date);
    });

    it("should process ORDER_PARTIALLY_FILLED event", () => {
      const result = consumer.processEvent(
        createEvent("ORDER_PARTIALLY_FILLED", {
          filledQty: 5,
          avgFillPrice: 150.25,
        }),
      );
      expect(result.success).toBe(true);
      expect(result.order!.status).toBe("partially_filled");
      expect(result.order!.filledQuantity).toBe(5);
    });

    it("should process ORDER_CANCELED event", () => {
      const result = consumer.processEvent(createEvent("ORDER_CANCELED"));
      expect(result.success).toBe(true);
      expect(result.order!.status).toBe("canceled");
    });

    it("should process ORDER_REJECTED event", () => {
      const result = consumer.processEvent(createEvent("ORDER_REJECTED"));
      expect(result.success).toBe(true);
      expect(result.order!.status).toBe("rejected");
    });

    it("should map order fields correctly", () => {
      const result = consumer.processEvent(createEvent("ORDER_CREATED"));
      const order = result.order!;
      expect(order.id).toBe("order-123");
      expect(order.clientOrderId).toBe("client-ref-123");
      expect(order.symbol).toBe("AAPL");
      expect(order.side).toBe("buy");
      expect(order.type).toBe("limit");
      expect(order.quantity).toBe(10);
      expect(order.limitPrice).toBe(150.0);
      expect(order.timeInForce).toBe("day");
      expect(order.extendedHours).toBe(false);
      expect(order.createdAt).toBeInstanceOf(Date);
      expect(order.updatedAt).toBeInstanceOf(Date);
    });

    it("should reject invalid event (null)", () => {
      const result = consumer.processEvent(null as unknown as DriveWealthWebhookEvent);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid event");
    });

    it("should reject event with missing type", () => {
      const event = { order: {}, timestamp: "" } as unknown as DriveWealthWebhookEvent;
      const result = consumer.processEvent(event);
      expect(result.success).toBe(false);
    });

    it("should reject event with missing order", () => {
      const event = { type: "ORDER_CREATED", timestamp: "" } as unknown as DriveWealthWebhookEvent;
      const result = consumer.processEvent(event);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid event");
    });

    it("should reject unknown event type", () => {
      const event = createEvent("ORDER_CREATED");
      (event as { type: string }).type = "ORDER_UNKNOWN_TYPE";
      const result = consumer.processEvent(event);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown event type");
    });

    it("should map MARKET order type", () => {
      const result = consumer.processEvent(
        createEvent("ORDER_CREATED", { type: "MARKET" }),
      );
      expect(result.order!.type).toBe("market");
    });

    it("should map STOP order type", () => {
      const result = consumer.processEvent(
        createEvent("ORDER_CREATED", { type: "STOP", stopPrice: 140 }),
      );
      expect(result.order!.type).toBe("stop");
      expect(result.order!.stopPrice).toBe(140);
    });

    it("should map STOP_LIMIT order type", () => {
      const result = consumer.processEvent(
        createEvent("ORDER_CREATED", { type: "STOP_LIMIT" }),
      );
      expect(result.order!.type).toBe("stop_limit");
    });

    it("should default unknown order type to market", () => {
      const result = consumer.processEvent(
        createEvent("ORDER_CREATED", { type: "EXOTIC" }),
      );
      expect(result.order!.type).toBe("market");
    });

    it("should map GTC time in force", () => {
      const result = consumer.processEvent(
        createEvent("ORDER_CREATED", { timeInForce: "GTC" }),
      );
      expect(result.order!.timeInForce).toBe("gtc");
    });

    it("should default unknown time in force to day", () => {
      const result = consumer.processEvent(
        createEvent("ORDER_CREATED", { timeInForce: "UNKNOWN" }),
      );
      expect(result.order!.timeInForce).toBe("day");
    });
  });

  // ==========================================================================
  // HANDLER MANAGEMENT
  // ==========================================================================

  describe("onOrderUpdate", () => {
    it("should call handler when event is processed", () => {
      const handler = jest.fn();
      consumer.onOrderUpdate(handler);
      consumer.processEvent(createEvent("ORDER_CREATED"));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ id: "order-123" }),
        "ORDER_CREATED",
      );
    });

    it("should call multiple handlers", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      consumer.onOrderUpdate(handler1);
      consumer.onOrderUpdate(handler2);
      consumer.processEvent(createEvent("ORDER_FILLED", {
        filledQty: 10,
        avgFillPrice: 150.5,
        filledAt: "2026-01-01T12:00:00Z",
      }));
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should not call handler for invalid events", () => {
      const handler = jest.fn();
      consumer.onOrderUpdate(handler);
      consumer.processEvent(null as unknown as DriveWealthWebhookEvent);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("removeHandler", () => {
    it("should remove a handler", () => {
      const handler = jest.fn();
      consumer.onOrderUpdate(handler);
      consumer.removeHandler(handler);
      consumer.processEvent(createEvent("ORDER_CREATED"));
      expect(handler).not.toHaveBeenCalled();
    });

    it("should only remove the specified handler", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      consumer.onOrderUpdate(handler1);
      consumer.onOrderUpdate(handler2);
      consumer.removeHandler(handler1);
      consumer.processEvent(createEvent("ORDER_CREATED"));
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // BATCH PROCESSING
  // ==========================================================================

  describe("processBatch", () => {
    it("should process multiple events", () => {
      const events = [
        createEvent("ORDER_CREATED"),
        createFilledEvent(),
        createEvent("ORDER_CANCELED"),
      ];
      const results = consumer.processBatch(events);
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });

    it("should handle mixed valid and invalid events", () => {
      const events = [
        createEvent("ORDER_CREATED"),
        null as unknown as DriveWealthWebhookEvent,
        createEvent("ORDER_FILLED", {
          filledQty: 10,
          avgFillPrice: 150.5,
          filledAt: "2026-01-01T12:00:00Z",
        }),
      ];
      const results = consumer.processBatch(events);
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it("should return empty array for empty batch", () => {
      const results = consumer.processBatch([]);
      expect(results).toHaveLength(0);
    });

    it("should call handlers for each valid event in batch", () => {
      const handler = jest.fn();
      consumer.onOrderUpdate(handler);
      const events = [
        createEvent("ORDER_CREATED"),
        createEvent("ORDER_FILLED", {
          filledQty: 10,
          avgFillPrice: 150.5,
          filledAt: "2026-01-01T12:00:00Z",
        }),
      ];
      consumer.processBatch(events);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
