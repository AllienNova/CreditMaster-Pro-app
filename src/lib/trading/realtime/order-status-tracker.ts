/**
 * Order Status Tracker Service
 *
 * Real-time order status tracking with notifications integration.
 * Connects OrderExecutionEngine events to TradingNotificationService.
 */

import { Subject, Observable, BehaviorSubject, Subscription } from "rxjs";
import { filter, map, takeUntil, distinctUntilChanged } from "rxjs/operators";
import {
  OrderExecutionEngine,
  ExecutionEvent,
  LivePriceInfo,
} from "./order-execution-engine";
import {
  TradingNotificationService,
  getTradingNotificationService,
  TradingNotification,
} from "../notifications/trading-notifications";
import { Order, OrderStatus } from "../orders/order-types";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderStatusChange {
  orderId: string;
  symbol: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  timestamp: Date;
  details?: {
    filledQty?: number;
    filledAvgPrice?: number;
    reason?: string;
  };
}

export interface TrackedOrder {
  order: Order;
  statusHistory: OrderStatusChange[];
  lastUpdate: Date;
  estimatedFillTime?: Date;
  currentPrice?: LivePriceInfo;
}

export interface OrderTrackerConfig {
  enableNotifications: boolean;
  enableSoundAlerts: boolean;
  notifyOnSubmit: boolean;
  notifyOnPartialFill: boolean;
  notifyOnFill: boolean;
  notifyOnCancel: boolean;
  notifyOnReject: boolean;
  trackPriceUpdates: boolean;
  priceAlertThreshold: number;
}

export const DEFAULT_TRACKER_CONFIG: OrderTrackerConfig = {
  enableNotifications: true,
  enableSoundAlerts: true,
  notifyOnSubmit: false,
  notifyOnPartialFill: true,
  notifyOnFill: true,
  notifyOnCancel: true,
  notifyOnReject: true,
  trackPriceUpdates: true,
  priceAlertThreshold: 0.01, // 1% price change alert
};

// ============================================================================
// ORDER STATUS TRACKER
// ============================================================================

export class OrderStatusTracker {
  private config: OrderTrackerConfig;
  private executionEngine: OrderExecutionEngine;
  private notificationService: TradingNotificationService;

  // Tracked orders
  private trackedOrders = new Map<string, TrackedOrder>();
  private ordersBySymbol = new Map<string, Set<string>>();

  // Event subjects
  private statusChangeSubject = new Subject<OrderStatusChange>();
  private trackedOrderSubject = new BehaviorSubject<TrackedOrder[]>([]);

  // Subscriptions
  private subscriptions: Subscription[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    executionEngine: OrderExecutionEngine,
    config: Partial<OrderTrackerConfig> = {},
  ) {
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...config };
    this.executionEngine = executionEngine;
    this.notificationService = getTradingNotificationService();

    this.setupEventListeners();
  }

  // ============================================================================
  // SETUP
  // ============================================================================

  private setupEventListeners(): void {
    // Listen to execution engine events
    const eventSub = this.executionEngine.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.handleExecutionEvent(event));
    this.subscriptions.push(eventSub);

    // Listen to price updates for tracked symbols
    if (this.config.trackPriceUpdates) {
      const priceSub = this.executionEngine.livePrices$
        .pipe(takeUntil(this.destroy$))
        .subscribe((price) => this.handlePriceUpdate(price));
      this.subscriptions.push(priceSub);
    }
  }

  // ============================================================================
  // ORDER TRACKING
  // ============================================================================

  /**
   * Start tracking an order
   */
  trackOrder(order: Order): void {
    const tracked: TrackedOrder = {
      order,
      statusHistory: [
        {
          orderId: order.id,
          symbol: order.symbol,
          previousStatus: "pending",
          newStatus: order.status,
          timestamp: order.createdAt,
        },
      ],
      lastUpdate: new Date(),
    };

    this.trackedOrders.set(order.id, tracked);

    // Track by symbol
    if (!this.ordersBySymbol.has(order.symbol)) {
      this.ordersBySymbol.set(order.symbol, new Set());
    }
    this.ordersBySymbol.get(order.symbol)!.add(order.id);

    // Subscribe to price updates for this symbol
    if (this.config.trackPriceUpdates) {
      this.executionEngine.watchSymbols([order.symbol]);
    }

    this.emitTrackedOrders();
  }

  /**
   * Stop tracking an order
   */
  untrackOrder(orderId: string): void {
    const tracked = this.trackedOrders.get(orderId);
    if (!tracked) return;

    const symbol = tracked.order.symbol;
    this.trackedOrders.delete(orderId);

    // Remove from symbol tracking
    const symbolOrders = this.ordersBySymbol.get(symbol);
    if (symbolOrders) {
      symbolOrders.delete(orderId);
      if (symbolOrders.size === 0) {
        this.ordersBySymbol.delete(symbol);
        // Optionally unwatch symbol if no more orders
      }
    }

    this.emitTrackedOrders();
  }

  /**
   * Get a tracked order
   */
  getTrackedOrder(orderId: string): TrackedOrder | undefined {
    return this.trackedOrders.get(orderId);
  }

  /**
   * Get all tracked orders
   */
  getAllTrackedOrders(): TrackedOrder[] {
    return Array.from(this.trackedOrders.values());
  }

  /**
   * Get tracked orders for a symbol
   */
  getOrdersForSymbol(symbol: string): TrackedOrder[] {
    const orderIds = this.ordersBySymbol.get(symbol);
    if (!orderIds) return [];

    return Array.from(orderIds)
      .map((id) => this.trackedOrders.get(id))
      .filter((o): o is TrackedOrder => o !== undefined);
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleExecutionEvent(event: ExecutionEvent): void {
    switch (event.type) {
      case "order_created":
        this.handleOrderCreated(event);
        break;
      case "order_submitted":
        this.handleOrderSubmitted(event);
        break;
      case "order_filled":
        this.handleOrderFilled(event);
        break;
      case "order_cancelled":
        this.handleOrderCancelled(event);
        break;
      case "order_error":
        this.handleOrderError(event);
        break;
      case "quote_update":
        // Handled by price update handler
        break;
    }
  }

  private handleOrderCreated(event: ExecutionEvent): void {
    if (!event.orderId || !event.data) return;

    const orderData = event.data as { order?: Order };
    if (orderData.order) {
      this.trackOrder(orderData.order);
    }
  }

  private handleOrderSubmitted(event: ExecutionEvent): void {
    if (!event.orderId) return;

    const tracked = this.trackedOrders.get(event.orderId);
    if (!tracked) return;

    const previousStatus = tracked.order.status;
    tracked.order.status = "submitted";
    tracked.lastUpdate = event.timestamp;

    const change: OrderStatusChange = {
      orderId: event.orderId,
      symbol: tracked.order.symbol,
      previousStatus,
      newStatus: "submitted",
      timestamp: event.timestamp,
    };

    tracked.statusHistory.push(change);
    this.statusChangeSubject.next(change);
    this.emitTrackedOrders();

    // Send notification if enabled
    if (this.config.enableNotifications && this.config.notifyOnSubmit) {
      this.notificationService.createNotification("signal_triggered", {
        symbol: tracked.order.symbol,
        side: tracked.order.side,
        message: `Order submitted: ${tracked.order.side} ${tracked.order.quantity} ${tracked.order.symbol}`,
      });
    }
  }

  private handleOrderFilled(event: ExecutionEvent): void {
    if (!event.orderId) return;

    const tracked = this.trackedOrders.get(event.orderId);
    if (!tracked) return;

    const fillData = event.data as
      | {
          filledQty?: number;
          filledAvgPrice?: number;
        }
      | undefined;

    const previousStatus = tracked.order.status;
    const isPartialFill =
      fillData?.filledQty && fillData.filledQty < tracked.order.quantity;

    tracked.order.status = isPartialFill ? "partial" : "filled";
    tracked.order.filledQty = fillData?.filledQty || tracked.order.quantity;
    tracked.order.filledAvgPrice = fillData?.filledAvgPrice;
    tracked.lastUpdate = event.timestamp;

    const change: OrderStatusChange = {
      orderId: event.orderId,
      symbol: tracked.order.symbol,
      previousStatus,
      newStatus: tracked.order.status,
      timestamp: event.timestamp,
      details: {
        filledQty: tracked.order.filledQty,
        filledAvgPrice: tracked.order.filledAvgPrice,
      },
    };

    tracked.statusHistory.push(change);
    this.statusChangeSubject.next(change);
    this.emitTrackedOrders();

    // Send notification
    if (this.config.enableNotifications) {
      if (isPartialFill && this.config.notifyOnPartialFill) {
        this.notificationService.createNotification("order_partial", {
          symbol: tracked.order.symbol,
          side: tracked.order.side,
          quantity: tracked.order.quantity,
          filledQty: tracked.order.filledQty,
          price: tracked.order.filledAvgPrice,
        });
      } else if (!isPartialFill && this.config.notifyOnFill) {
        this.notificationService.notifyOrderFilled(
          tracked.order.symbol,
          tracked.order.side,
          tracked.order.filledQty,
          tracked.order.filledAvgPrice || 0,
        );
      }

      // Play sound alert
      if (this.config.enableSoundAlerts) {
        this.playAlertSound(isPartialFill ? "partial" : "fill");
      }
    }

    // Auto-untrack completed orders after delay
    if (tracked.order.status === "filled") {
      setTimeout(() => this.untrackOrder(event.orderId!), 30000);
    }
  }

  private handleOrderCancelled(event: ExecutionEvent): void {
    if (!event.orderId) return;

    const tracked = this.trackedOrders.get(event.orderId);
    if (!tracked) return;

    const previousStatus = tracked.order.status;
    tracked.order.status = "cancelled";
    tracked.lastUpdate = event.timestamp;

    const change: OrderStatusChange = {
      orderId: event.orderId,
      symbol: tracked.order.symbol,
      previousStatus,
      newStatus: "cancelled",
      timestamp: event.timestamp,
    };

    tracked.statusHistory.push(change);
    this.statusChangeSubject.next(change);
    this.emitTrackedOrders();

    // Send notification
    if (this.config.enableNotifications && this.config.notifyOnCancel) {
      this.notificationService.createNotification("order_rejected", {
        symbol: tracked.order.symbol,
        reason: "Order cancelled",
      });
    }

    // Auto-untrack after delay
    setTimeout(() => this.untrackOrder(event.orderId!), 10000);
  }

  private handleOrderError(event: ExecutionEvent): void {
    if (!event.orderId) return;

    const tracked = this.trackedOrders.get(event.orderId);
    if (!tracked) return;

    const errorData = event.data as { error?: string } | undefined;
    const previousStatus = tracked.order.status;
    tracked.order.status = "rejected";
    tracked.order.errorMessage = errorData?.error;
    tracked.lastUpdate = event.timestamp;

    const change: OrderStatusChange = {
      orderId: event.orderId,
      symbol: tracked.order.symbol,
      previousStatus,
      newStatus: "rejected",
      timestamp: event.timestamp,
      details: { reason: errorData?.error },
    };

    tracked.statusHistory.push(change);
    this.statusChangeSubject.next(change);
    this.emitTrackedOrders();

    // Send notification
    if (this.config.enableNotifications && this.config.notifyOnReject) {
      this.notificationService.createNotification("order_rejected", {
        symbol: tracked.order.symbol,
        reason: errorData?.error || "Unknown error",
      });

      if (this.config.enableSoundAlerts) {
        this.playAlertSound("error");
      }
    }

    // Auto-untrack after delay
    setTimeout(() => this.untrackOrder(event.orderId!), 10000);
  }

  private handlePriceUpdate(price: LivePriceInfo): void {
    const ordersForSymbol = this.ordersBySymbol.get(price.symbol);
    if (!ordersForSymbol) return;

    ordersForSymbol.forEach((orderId) => {
      const tracked = this.trackedOrders.get(orderId);
      if (tracked) {
        const previousPrice = tracked.currentPrice;
        tracked.currentPrice = price;

        // Check for significant price change alert
        if (previousPrice && this.config.priceAlertThreshold > 0) {
          const priceChange =
            Math.abs(price.mid - previousPrice.mid) / previousPrice.mid;
          if (priceChange >= this.config.priceAlertThreshold) {
            this.handlePriceAlert(tracked, previousPrice, price);
          }
        }
      }
    });

    this.emitTrackedOrders();
  }

  private handlePriceAlert(
    tracked: TrackedOrder,
    previousPrice: LivePriceInfo,
    newPrice: LivePriceInfo,
  ): void {
    const changePercent =
      ((newPrice.mid - previousPrice.mid) / previousPrice.mid) * 100;
    const direction = changePercent > 0 ? "up" : "down";

    // Only alert for unfilled orders
    if (!["pending", "submitted", "accepted"].includes(tracked.order.status)) {
      return;
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private emitTrackedOrders(): void {
    this.trackedOrderSubject.next(this.getAllTrackedOrders());
  }

  private playAlertSound(type: "fill" | "partial" | "error"): void {
    try {
      const soundMap = {
        fill: "/sounds/order-fill.mp3",
        partial: "/sounds/order-partial.mp3",
        error: "/sounds/order-error.mp3",
      };

      if (typeof Audio !== "undefined") {
        const audio = new Audio(soundMap[type]);
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Ignore autoplay restrictions
        });
      }
    } catch {
      // Ignore audio errors
    }
  }

  // ============================================================================
  // OBSERVABLES
  // ============================================================================

  /**
   * Observable for status changes
   */
  get statusChanges$(): Observable<OrderStatusChange> {
    return this.statusChangeSubject.asObservable();
  }

  /**
   * Observable for all tracked orders (emits on any change)
   */
  get trackedOrders$(): Observable<TrackedOrder[]> {
    return this.trackedOrderSubject.asObservable();
  }

  /**
   * Get status changes for a specific order
   */
  getOrderStatusChanges(orderId: string): Observable<OrderStatusChange> {
    return this.statusChangeSubject.pipe(
      filter((change) => change.orderId === orderId),
    );
  }

  /**
   * Get status changes for a specific symbol
   */
  getSymbolStatusChanges(symbol: string): Observable<OrderStatusChange> {
    return this.statusChangeSubject.pipe(
      filter((change) => change.symbol === symbol),
    );
  }

  /**
   * Observable for a specific order's current state
   */
  watchOrder(orderId: string): Observable<TrackedOrder | undefined> {
    return this.trackedOrderSubject.pipe(
      map((orders) => orders.find((o) => o.order.id === orderId)),
      distinctUntilChanged(
        (a, b) =>
          a?.order.status === b?.order.status &&
          a?.lastUpdate === b?.lastUpdate,
      ),
    );
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  updateConfig(config: Partial<OrderTrackerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): OrderTrackerConfig {
    return { ...this.config };
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  dispose(): void {
    this.destroy$.next();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
    this.trackedOrders.clear();
    this.ordersBySymbol.clear();
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createOrderStatusTracker(
  executionEngine: OrderExecutionEngine,
  config?: Partial<OrderTrackerConfig>,
): OrderStatusTracker {
  return new OrderStatusTracker(executionEngine, config);
}
