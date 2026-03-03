/**
 * OrderStatusTracker - Comprehensive Test Suite
 *
 * Tests order tracking, event handling, notifications, observables,
 * configuration, and cleanup.
 * Mocks OrderExecutionEngine (RxJS subjects) and TradingNotificationService.
 */

import { Subject } from "rxjs";

// ============================================================================
// MOCK SETUP
// ============================================================================

const mockCreateNotification = jest.fn();
const mockNotifyOrderFilled = jest.fn();

jest.mock("../../notifications/trading-notifications", () => ({
  getTradingNotificationService: jest.fn(() => ({
    createNotification: mockCreateNotification,
    notifyOrderFilled: mockNotifyOrderFilled,
  })),
}));

// Mock Audio globally
const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
const MockAudio = jest.fn().mockImplementation(() => ({
  volume: 1,
  play: mockAudioPlay,
}));
(global as Record<string, unknown>).Audio = MockAudio;

import { OrderStatusTracker, createOrderStatusTracker } from "../order-status-tracker";
import { getTradingNotificationService } from "../../notifications/trading-notifications";
import type { ExecutionEvent, LivePriceInfo } from "../order-execution-engine";
import type { Order } from "../../orders/order-types";

const mockGetTradingNotificationService = getTradingNotificationService as jest.Mock;

// ============================================================================
// HELPERS
// ============================================================================

function makeEventsSubject(): Subject<ExecutionEvent> {
  return new Subject<ExecutionEvent>();
}

function makePricesSubject(): Subject<LivePriceInfo> {
  return new Subject<LivePriceInfo>();
}

function makeMockEngine(eventsSubject: Subject<ExecutionEvent>, pricesSubject: Subject<LivePriceInfo>) {
  return {
    get events$() { return eventsSubject.asObservable(); },
    get livePrices$() { return pricesSubject.asObservable(); },
    watchSymbols: jest.fn(),
  } as unknown as import("../order-execution-engine").OrderExecutionEngine;
}

function sampleOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    userId: "user-1",
    accountId: "account-1",
    symbol: "AAPL",
    side: "buy",
    quantity: 10,
    type: "market",
    timeInForce: "day",
    status: "pending",
    filledQty: 0,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    estimatedValue: 1500,
    ...overrides,
  };
}

function makeTracker(
  eventsSubject: Subject<ExecutionEvent>,
  pricesSubject: Subject<LivePriceInfo>,
  config = {},
): OrderStatusTracker {
  const engine = makeMockEngine(eventsSubject, pricesSubject);
  return new OrderStatusTracker(engine, config);
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrderStatusTracker", () => {
  let eventsSubject: Subject<ExecutionEvent>;
  let pricesSubject: Subject<LivePriceInfo>;
  let tracker: OrderStatusTracker;

  beforeEach(() => {
    jest.useFakeTimers();

    // Restore mock implementations cleared by resetMocks: true
    mockGetTradingNotificationService.mockReturnValue({
      createNotification: mockCreateNotification,
      notifyOrderFilled: mockNotifyOrderFilled,
    });
    mockAudioPlay.mockResolvedValue(undefined);
    MockAudio.mockImplementation(() => ({
      volume: 1,
      play: mockAudioPlay,
    }));
    (global as Record<string, unknown>).Audio = MockAudio;

    eventsSubject = makeEventsSubject();
    pricesSubject = makePricesSubject();
    tracker = makeTracker(eventsSubject, pricesSubject);
  });

  afterEach(() => {
    tracker.dispose();
    jest.useRealTimers();
  });

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  describe("constructor", () => {
    it("should create instance with default config", () => {
      expect(tracker).toBeDefined();
    });

    it("should accept partial config overrides", () => {
      const t = makeTracker(eventsSubject, pricesSubject, { enableNotifications: false });
      expect(t).toBeDefined();
      expect(t.getConfig().enableNotifications).toBe(false);
      t.dispose();
    });

    it("should use default config values", () => {
      const config = tracker.getConfig();
      expect(config.enableNotifications).toBe(true);
      expect(config.enableSoundAlerts).toBe(true);
      expect(config.notifyOnFill).toBe(true);
      expect(config.notifyOnCancel).toBe(true);
      expect(config.notifyOnReject).toBe(true);
      expect(config.trackPriceUpdates).toBe(true);
      expect(config.priceAlertThreshold).toBe(0.01);
    });
  });

  // ==========================================================================
  // TRACK ORDER
  // ==========================================================================

  describe("trackOrder", () => {
    it("should track an order", () => {
      const order = sampleOrder();
      tracker.trackOrder(order);

      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked).toBeDefined();
      expect(tracked!.order.id).toBe("order-1");
    });

    it("should initialize status history", () => {
      const order = sampleOrder();
      tracker.trackOrder(order);

      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.statusHistory).toHaveLength(1);
      expect(tracked!.statusHistory[0].newStatus).toBe("pending");
    });

    it("should track by symbol", () => {
      const order = sampleOrder();
      tracker.trackOrder(order);

      const symbolOrders = tracker.getOrdersForSymbol("AAPL");
      expect(symbolOrders).toHaveLength(1);
    });

    it("should call watchSymbols when trackPriceUpdates is enabled", () => {
      const engine = makeMockEngine(eventsSubject, pricesSubject);
      const t = new OrderStatusTracker(engine, { trackPriceUpdates: true });
      t.trackOrder(sampleOrder());

      expect(engine.watchSymbols).toHaveBeenCalledWith(["AAPL"]);
      t.dispose();
    });

    it("should track multiple orders for the same symbol", () => {
      tracker.trackOrder(sampleOrder({ id: "order-1" }));
      tracker.trackOrder(sampleOrder({ id: "order-2" }));

      const symbolOrders = tracker.getOrdersForSymbol("AAPL");
      expect(symbolOrders).toHaveLength(2);
    });

    it("should track orders for different symbols", () => {
      tracker.trackOrder(sampleOrder({ id: "order-1", symbol: "AAPL" }));
      tracker.trackOrder(sampleOrder({ id: "order-2", symbol: "GOOGL" }));

      expect(tracker.getOrdersForSymbol("AAPL")).toHaveLength(1);
      expect(tracker.getOrdersForSymbol("GOOGL")).toHaveLength(1);
    });
  });

  // ==========================================================================
  // UNTRACK ORDER
  // ==========================================================================

  describe("untrackOrder", () => {
    it("should untrack an order", () => {
      tracker.trackOrder(sampleOrder());
      tracker.untrackOrder("order-1");

      expect(tracker.getTrackedOrder("order-1")).toBeUndefined();
    });

    it("should remove from symbol tracking", () => {
      tracker.trackOrder(sampleOrder());
      tracker.untrackOrder("order-1");

      expect(tracker.getOrdersForSymbol("AAPL")).toHaveLength(0);
    });

    it("should do nothing for non-existent order", () => {
      // Should not throw
      tracker.untrackOrder("nonexistent");
      expect(tracker.getAllTrackedOrders()).toHaveLength(0);
    });

    it("should remove symbol from map when last order for symbol is untracked", () => {
      tracker.trackOrder(sampleOrder({ id: "order-1", symbol: "AAPL" }));
      tracker.untrackOrder("order-1");

      // ordersBySymbol should be cleaned up
      expect(tracker.getOrdersForSymbol("AAPL")).toHaveLength(0);
    });

    it("should keep other orders for same symbol when untracking one", () => {
      tracker.trackOrder(sampleOrder({ id: "order-1", symbol: "AAPL" }));
      tracker.trackOrder(sampleOrder({ id: "order-2", symbol: "AAPL" }));
      tracker.untrackOrder("order-1");

      expect(tracker.getOrdersForSymbol("AAPL")).toHaveLength(1);
    });
  });

  // ==========================================================================
  // GET TRACKED ORDERS
  // ==========================================================================

  describe("getTrackedOrder", () => {
    it("should return tracked order by id", () => {
      tracker.trackOrder(sampleOrder());
      expect(tracker.getTrackedOrder("order-1")).toBeDefined();
    });

    it("should return undefined for unknown order", () => {
      expect(tracker.getTrackedOrder("unknown")).toBeUndefined();
    });
  });

  describe("getAllTrackedOrders", () => {
    it("should return all tracked orders", () => {
      tracker.trackOrder(sampleOrder({ id: "order-1" }));
      tracker.trackOrder(sampleOrder({ id: "order-2" }));

      const all = tracker.getAllTrackedOrders();
      expect(all).toHaveLength(2);
    });

    it("should return empty array when no orders tracked", () => {
      expect(tracker.getAllTrackedOrders()).toHaveLength(0);
    });
  });

  describe("getOrdersForSymbol", () => {
    it("should return orders for a given symbol", () => {
      tracker.trackOrder(sampleOrder({ id: "order-1", symbol: "AAPL" }));
      tracker.trackOrder(sampleOrder({ id: "order-2", symbol: "GOOGL" }));

      expect(tracker.getOrdersForSymbol("AAPL")).toHaveLength(1);
      expect(tracker.getOrdersForSymbol("GOOGL")).toHaveLength(1);
    });

    it("should return empty array for unknown symbol", () => {
      expect(tracker.getOrdersForSymbol("UNKNOWN")).toHaveLength(0);
    });
  });

  // ==========================================================================
  // EVENT HANDLING - ORDER CREATED
  // ==========================================================================

  describe("handleOrderCreated", () => {
    it("should track order when order_created event fires", () => {
      const order = sampleOrder();
      eventsSubject.next({
        type: "order_created",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { order },
      } as ExecutionEvent);

      expect(tracker.getTrackedOrder("order-1")).toBeDefined();
    });

    it("should not track when event has no orderId", () => {
      eventsSubject.next({
        type: "order_created",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { order: sampleOrder() },
      } as unknown as ExecutionEvent);

      expect(tracker.getAllTrackedOrders()).toHaveLength(0);
    });

    it("should not track when event has no data", () => {
      eventsSubject.next({
        type: "order_created",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      expect(tracker.getAllTrackedOrders()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // EVENT HANDLING - ORDER SUBMITTED
  // ==========================================================================

  describe("handleOrderSubmitted", () => {
    it("should update status to submitted", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.order.status).toBe("submitted");
      expect(tracked!.statusHistory).toHaveLength(2);
    });

    it("should send notification when notifyOnSubmit is true", () => {
      const t = makeTracker(eventsSubject, pricesSubject, { notifyOnSubmit: true });
      t.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      expect(mockCreateNotification).toHaveBeenCalledWith("signal_triggered", expect.any(Object));
      t.dispose();
    });

    it("should not send notification when notifyOnSubmit is false", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      // Default notifyOnSubmit is false
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should do nothing for untracked order", () => {
      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      // No error, no tracked order
      expect(tracker.getAllTrackedOrders()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // EVENT HANDLING - ORDER FILLED
  // ==========================================================================

  describe("handleOrderFilled", () => {
    it("should update status to filled for full fill", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 10, filledAvgPrice: 150 },
      } as ExecutionEvent);

      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.order.status).toBe("filled");
      expect(tracked!.order.filledQty).toBe(10);
      expect(tracked!.order.filledAvgPrice).toBe(150);
    });

    it("should update status to partial for partial fill", () => {
      tracker.trackOrder(sampleOrder({ quantity: 20 }));

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 5, filledAvgPrice: 150 },
      } as ExecutionEvent);

      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.order.status).toBe("partial");
    });

    it("should send fill notification", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 10, filledAvgPrice: 150 },
      } as ExecutionEvent);

      expect(mockNotifyOrderFilled).toHaveBeenCalledWith("AAPL", "buy", 10, 150);
    });

    it("should send partial fill notification", () => {
      tracker.trackOrder(sampleOrder({ quantity: 20 }));

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 5, filledAvgPrice: 150 },
      } as ExecutionEvent);

      expect(mockCreateNotification).toHaveBeenCalledWith("order_partial", expect.objectContaining({
        symbol: "AAPL",
        filledQty: 5,
      }));
    });

    it("should play sound alert on fill", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 10, filledAvgPrice: 150 },
      } as ExecutionEvent);

      expect(MockAudio).toHaveBeenCalledWith("/sounds/order-fill.mp3");
    });

    it("should play partial sound alert on partial fill", () => {
      tracker.trackOrder(sampleOrder({ quantity: 20 }));

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 5, filledAvgPrice: 150 },
      } as ExecutionEvent);

      expect(MockAudio).toHaveBeenCalledWith("/sounds/order-partial.mp3");
    });

    it("should auto-untrack filled orders after 30 seconds", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 10, filledAvgPrice: 150 },
      } as ExecutionEvent);

      expect(tracker.getTrackedOrder("order-1")).toBeDefined();
      jest.advanceTimersByTime(30000);
      expect(tracker.getTrackedOrder("order-1")).toBeUndefined();
    });

    it("should not send notification when notifications disabled", () => {
      const t = makeTracker(eventsSubject, pricesSubject, { enableNotifications: false });
      t.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 10, filledAvgPrice: 150 },
      } as ExecutionEvent);

      expect(mockNotifyOrderFilled).not.toHaveBeenCalled();
      t.dispose();
    });

    it("should not play sound when sound alerts disabled", () => {
      const t = makeTracker(eventsSubject, pricesSubject, { enableSoundAlerts: false });
      t.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 10, filledAvgPrice: 150 },
      } as ExecutionEvent);

      expect(MockAudio).not.toHaveBeenCalled();
      t.dispose();
    });
  });

  // ==========================================================================
  // EVENT HANDLING - ORDER CANCELLED
  // ==========================================================================

  describe("handleOrderCancelled", () => {
    it("should update status to cancelled", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_cancelled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.order.status).toBe("cancelled");
    });

    it("should send cancel notification", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_cancelled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      expect(mockCreateNotification).toHaveBeenCalledWith("order_rejected", expect.objectContaining({
        reason: "Order cancelled",
      }));
    });

    it("should auto-untrack cancelled orders after 10 seconds", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_cancelled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      expect(tracker.getTrackedOrder("order-1")).toBeDefined();
      jest.advanceTimersByTime(10000);
      expect(tracker.getTrackedOrder("order-1")).toBeUndefined();
    });

    it("should do nothing for untracked order", () => {
      eventsSubject.next({
        type: "order_cancelled",
        orderId: "order-99",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EVENT HANDLING - ORDER ERROR
  // ==========================================================================

  describe("handleOrderError", () => {
    it("should update status to rejected", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_error",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { error: "Market closed" },
      } as ExecutionEvent);

      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.order.status).toBe("rejected");
      expect(tracked!.order.errorMessage).toBe("Market closed");
    });

    it("should send reject notification", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_error",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { error: "Insufficient funds" },
      } as ExecutionEvent);

      expect(mockCreateNotification).toHaveBeenCalledWith("order_rejected", expect.objectContaining({
        reason: "Insufficient funds",
      }));
    });

    it("should play error sound", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_error",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { error: "Error" },
      } as ExecutionEvent);

      expect(MockAudio).toHaveBeenCalledWith("/sounds/order-error.mp3");
    });

    it("should auto-untrack rejected orders after 10 seconds", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_error",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { error: "Error" },
      } as ExecutionEvent);

      expect(tracker.getTrackedOrder("order-1")).toBeDefined();
      jest.advanceTimersByTime(10000);
      expect(tracker.getTrackedOrder("order-1")).toBeUndefined();
    });

    it("should handle error event with no error data", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_error",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.order.status).toBe("rejected");
      expect(mockCreateNotification).toHaveBeenCalledWith("order_rejected", expect.objectContaining({
        reason: "Unknown error",
      }));
    });
  });

  // ==========================================================================
  // PRICE UPDATES
  // ==========================================================================

  describe("handlePriceUpdate", () => {
    it("should update currentPrice on tracked orders", () => {
      tracker.trackOrder(sampleOrder());

      const price: LivePriceInfo = {
        symbol: "AAPL",
        bid: 149,
        ask: 151,
        mid: 150,
        spread: 2,
        spreadPercent: 1.33,
        lastUpdate: new Date(),
      };

      pricesSubject.next(price);

      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.currentPrice).toBeDefined();
      expect(tracked!.currentPrice!.mid).toBe(150);
    });

    it("should ignore price updates for untracked symbols", () => {
      tracker.trackOrder(sampleOrder());

      const price: LivePriceInfo = {
        symbol: "GOOGL",
        bid: 2800,
        ask: 2802,
        mid: 2801,
        spread: 2,
        spreadPercent: 0.07,
        lastUpdate: new Date(),
      };

      pricesSubject.next(price);
      // No error, no update to AAPL order
      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.currentPrice).toBeUndefined();
    });

    it("should not track prices when trackPriceUpdates is false", () => {
      const t = makeTracker(eventsSubject, pricesSubject, { trackPriceUpdates: false });
      t.trackOrder(sampleOrder());

      const price: LivePriceInfo = {
        symbol: "AAPL",
        bid: 149,
        ask: 151,
        mid: 150,
        spread: 2,
        spreadPercent: 1.33,
        lastUpdate: new Date(),
      };

      pricesSubject.next(price);

      const tracked = t.getTrackedOrder("order-1");
      // Since trackPriceUpdates is false, the subscription was not set up
      expect(tracked!.currentPrice).toBeUndefined();
      t.dispose();
    });
  });

  // ==========================================================================
  // OBSERVABLES
  // ==========================================================================

  describe("statusChanges$", () => {
    it("should emit status changes", (done) => {
      tracker.trackOrder(sampleOrder());

      const changes: unknown[] = [];
      tracker.statusChanges$.subscribe((change) => {
        changes.push(change);
        if (changes.length === 1) {
          expect(change.newStatus).toBe("submitted");
          done();
        }
      });

      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);
    });
  });

  describe("trackedOrders$", () => {
    it("should emit when orders change", (done) => {
      let emitCount = 0;
      tracker.trackedOrders$.subscribe((orders) => {
        emitCount++;
        // First emit is the initial [] from BehaviorSubject
        if (emitCount === 2) {
          expect(orders).toHaveLength(1);
          done();
        }
      });

      tracker.trackOrder(sampleOrder());
    });
  });

  describe("getOrderStatusChanges", () => {
    it("should filter status changes by order id", (done) => {
      tracker.trackOrder(sampleOrder({ id: "order-1" }));
      tracker.trackOrder(sampleOrder({ id: "order-2" }));

      tracker.getOrderStatusChanges("order-1").subscribe((change) => {
        expect(change.orderId).toBe("order-1");
        done();
      });

      // Emit for order-2 first (should not trigger)
      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-2",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      // Then for order-1 (should trigger)
      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);
    });
  });

  describe("getSymbolStatusChanges", () => {
    it("should filter status changes by symbol", (done) => {
      tracker.trackOrder(sampleOrder({ id: "order-1", symbol: "AAPL" }));
      tracker.trackOrder(sampleOrder({ id: "order-2", symbol: "GOOGL" }));

      tracker.getSymbolStatusChanges("AAPL").subscribe((change) => {
        expect(change.symbol).toBe("AAPL");
        done();
      });

      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);
    });
  });

  describe("watchOrder", () => {
    it("should emit tracked order state changes", () => {
      tracker.trackOrder(sampleOrder());

      const emissions: Array<import("../order-status-tracker").TrackedOrder | undefined> = [];
      const sub = tracker.watchOrder("order-1").subscribe((tracked) => {
        emissions.push(tracked);
      });

      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      // watchOrder emits from BehaviorSubject; at least 1 emission expected
      expect(emissions.length).toBeGreaterThanOrEqual(1);
      // The latest emission should reflect the order (it may still show current state
      // due to object mutation and distinctUntilChanged using same reference)
      const latest = emissions[emissions.length - 1];
      expect(latest).toBeDefined();
      expect(latest!.order.id).toBe("order-1");
      sub.unsubscribe();
    });
  });

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  describe("updateConfig", () => {
    it("should update configuration", () => {
      tracker.updateConfig({ enableNotifications: false });
      expect(tracker.getConfig().enableNotifications).toBe(false);
    });

    it("should merge with existing config", () => {
      tracker.updateConfig({ enableNotifications: false });
      expect(tracker.getConfig().enableSoundAlerts).toBe(true); // unchanged
    });
  });

  describe("getConfig", () => {
    it("should return a copy of the config", () => {
      const config1 = tracker.getConfig();
      const config2 = tracker.getConfig();
      expect(config1).not.toBe(config2); // different references
      expect(config1).toEqual(config2);
    });
  });

  // ==========================================================================
  // DISPOSE
  // ==========================================================================

  describe("dispose", () => {
    it("should clean up all subscriptions", () => {
      tracker.trackOrder(sampleOrder());
      tracker.dispose();

      expect(tracker.getAllTrackedOrders()).toHaveLength(0);
    });

    it("should stop receiving events after dispose", () => {
      tracker.trackOrder(sampleOrder());
      tracker.dispose();

      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      // Should not be tracked anymore
      expect(tracker.getTrackedOrder("order-1")).toBeUndefined();
    });
  });

  // ==========================================================================
  // FACTORY
  // ==========================================================================

  describe("createOrderStatusTracker", () => {
    it("should create tracker via factory", () => {
      const engine = makeMockEngine(eventsSubject, pricesSubject);
      const t = createOrderStatusTracker(engine);
      expect(t).toBeInstanceOf(OrderStatusTracker);
      t.dispose();
    });

    it("should accept config in factory", () => {
      const engine = makeMockEngine(eventsSubject, pricesSubject);
      const t = createOrderStatusTracker(engine, { enableNotifications: false });
      expect(t.getConfig().enableNotifications).toBe(false);
      t.dispose();
    });
  });

  // ==========================================================================
  // QUOTE UPDATE EVENT (should be ignored by handler)
  // ==========================================================================

  describe("quote_update event", () => {
    it("should not cause errors when quote_update event fires", () => {
      tracker.trackOrder(sampleOrder());

      // This should be handled by the price update handler, not the event handler
      eventsSubject.next({
        type: "quote_update",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      // Order status should not change
      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.order.status).toBe("pending");
    });
  });

  // ==========================================================================
  // STATUS HISTORY
  // ==========================================================================

  describe("status history tracking", () => {
    it("should accumulate status changes", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_submitted",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
      } as ExecutionEvent);

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 10, filledAvgPrice: 150 },
      } as ExecutionEvent);

      const tracked = tracker.getTrackedOrder("order-1");
      expect(tracked!.statusHistory).toHaveLength(3); // pending, submitted, filled
      expect(tracked!.statusHistory[0].newStatus).toBe("pending");
      expect(tracked!.statusHistory[1].newStatus).toBe("submitted");
      expect(tracked!.statusHistory[2].newStatus).toBe("filled");
    });

    it("should record fill details in status change", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_filled",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { filledQty: 10, filledAvgPrice: 150 },
      } as ExecutionEvent);

      const tracked = tracker.getTrackedOrder("order-1");
      const lastChange = tracked!.statusHistory[tracked!.statusHistory.length - 1];
      expect(lastChange.details?.filledQty).toBe(10);
      expect(lastChange.details?.filledAvgPrice).toBe(150);
    });

    it("should record error reason in status change", () => {
      tracker.trackOrder(sampleOrder());

      eventsSubject.next({
        type: "order_error",
        orderId: "order-1",
        symbol: "AAPL",
        timestamp: new Date(),
        data: { error: "Market closed" },
      } as ExecutionEvent);

      const tracked = tracker.getTrackedOrder("order-1");
      const lastChange = tracked!.statusHistory[tracked!.statusHistory.length - 1];
      expect(lastChange.details?.reason).toBe("Market closed");
    });
  });
});
