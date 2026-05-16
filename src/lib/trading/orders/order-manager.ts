/**
 * Order Management System
 *
 * Handles order lifecycle from creation to fill/cancel:
 * - Order validation and risk checks
 * - Broker submission and status tracking
 * - Partial fill handling
 * - Position reconciliation
 * - Order history and audit logging
 */

import { createClient } from "@/lib/supabase/server";
import {
  Order,
  OrderRequest,
  OrderStatus,
  OrderUpdate,
  OrderEvent,
  OrderFilter,
  OrderBlotter,
  OrderValidationResult,
  OrderValidationError,
  OrderValidationWarning,
  OrderManagerConfig,
  DEFAULT_ORDER_MANAGER_CONFIG,
  Fill,
} from "./order-types";

// ============================================================================
// ORDER MANAGER CLASS
// ============================================================================

export class OrderManager {
  private readonly config: OrderManagerConfig;
  private readonly openOrders: Map<string, Order> = new Map();
  private readonly orderEvents: OrderEvent[] = [];
  private readonly fills: Fill[] = [];
  private dailyOrderCount: number = 0;
  private lastResetDate: string = "";

  constructor(config: Partial<OrderManagerConfig> = {}) {
    this.config = { ...DEFAULT_ORDER_MANAGER_CONFIG, ...config };
  }

  // ==========================================================================
  // ORDER CREATION
  // ==========================================================================

  async createOrder(
    request: OrderRequest,
    userId: string,
    accountId: string,
  ): Promise<{ order: Order | null; validation: OrderValidationResult }> {
    // Reset daily counter if new day
    this.resetDailyCounterIfNeeded();

    // Validate the order
    const validation = await this.validateOrder(request, userId);

    if (!validation.isValid) {
      return { order: null, validation };
    }

    // Use adjusted order if available
    const finalRequest = validation.adjustedOrder || request;

    // Create the order object
    const order: Order = {
      ...finalRequest,
      id: this.generateOrderId(),
      userId,
      accountId,
      status: "pending",
      filledQty: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedValue: this.calculateOrderValue(finalRequest),
    };

    // Store in memory
    this.openOrders.set(order.id, order);

    // Log event
    this.logOrderEvent(order.id, "created", "pending", "pending");

    // Persist to database
    await this.persistOrder(order);

    return { order, validation };
  }

  // ==========================================================================
  // ORDER SUBMISSION
  // ==========================================================================

  async submitOrder(
    orderId: string,
    brokerClient: BrokerClient,
  ): Promise<Order | null> {
    const order = this.openOrders.get(orderId);
    if (!order) {
      // OrderManager error: Order not found
      return null;
    }

    if (order.status !== "pending") {
      // OrderManager error: Order is not in pending status
      return null;
    }

    try {
      // Submit to broker
      const brokerResponse = await brokerClient.submitOrder({
        symbol: order.symbol,
        side: order.side,
        qty: order.quantity,
        type: order.type,
        time_in_force: order.timeInForce,
        limit_price: order.limitPrice,
        stop_price: order.stopPrice,
        client_order_id: order.id,
        take_profit: order.takeProfitPrice
          ? { limit_price: order.takeProfitPrice }
          : undefined,
        stop_loss: order.stopLossPrice
          ? {
              stop_price: order.stopLossPrice,
              limit_price: order.stopLossLimitPrice,
            }
          : undefined,
      });

      // Update order with broker ID
      order.brokerId = brokerResponse.id;
      order.status = "submitted";
      order.submittedAt = new Date();
      order.updatedAt = new Date();

      this.dailyOrderCount++;
      this.logOrderEvent(order.id, "submitted", "pending", "submitted");

      await this.persistOrder(order);

      return order;
    } catch (error) {
      order.status = "error";
      order.errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      order.updatedAt = new Date();

      this.logOrderEvent(order.id, "error", "pending", "error", {
        error: order.errorMessage,
      });

      await this.persistOrder(order);

      return order;
    }
  }

  // ==========================================================================
  // ORDER UPDATES
  // ==========================================================================

  async handleOrderUpdate(update: OrderUpdate): Promise<Order | null> {
    const order =
      this.openOrders.get(update.orderId) ||
      (await this.loadOrderFromDb(update.orderId));

    if (!order) {
      // OrderManager error: Order not found for update
      return null;
    }

    const previousStatus = order.status;

    // Update order fields
    order.status = update.status;
    order.updatedAt = update.timestamp;

    if (update.filledQty !== undefined) {
      order.filledQty = update.filledQty;
    }

    if (update.filledAvgPrice !== undefined) {
      order.filledAvgPrice = update.filledAvgPrice;
    }

    // Handle status-specific updates
    switch (update.status) {
      case "accepted":
        this.logOrderEvent(order.id, "accepted", previousStatus, "accepted");
        break;

      case "partial":
        this.logOrderEvent(
          order.id,
          "partial_fill",
          previousStatus,
          "partial",
          {
            filledQty: order.filledQty,
            filledAvgPrice: order.filledAvgPrice,
          },
        );
        break;

      case "filled":
        order.filledAt = update.timestamp;
        this.logOrderEvent(order.id, "filled", previousStatus, "filled", {
          filledQty: order.filledQty,
          filledAvgPrice: order.filledAvgPrice,
        });
        // Remove from open orders
        this.openOrders.delete(order.id);
        break;

      case "cancelled":
        order.cancelledAt = update.timestamp;
        this.logOrderEvent(order.id, "cancelled", previousStatus, "cancelled");
        this.openOrders.delete(order.id);
        break;

      case "rejected":
        order.rejectReason = update.message;
        this.logOrderEvent(order.id, "rejected", previousStatus, "rejected", {
          reason: update.message,
        });
        this.openOrders.delete(order.id);
        break;

      case "expired":
        this.logOrderEvent(order.id, "expired", previousStatus, "expired");
        this.openOrders.delete(order.id);
        break;
    }

    await this.persistOrder(order);

    return order;
  }

  // ==========================================================================
  // ORDER CANCELLATION
  // ==========================================================================

  async cancelOrder(
    orderId: string,
    brokerClient: BrokerClient,
  ): Promise<boolean> {
    const order = this.openOrders.get(orderId);
    if (!order) {
      // OrderManager error: Order not found
      return false;
    }

    if (
      !["pending", "submitted", "accepted", "partial"].includes(order.status)
    ) {
      // OrderManager error: Order cannot be cancelled in current status
      return false;
    }

    try {
      if (order.brokerId) {
        await brokerClient.cancelOrder(order.brokerId);
      }

      await this.handleOrderUpdate({
        orderId,
        status: "cancelled",
        timestamp: new Date(),
        message: "Cancelled by user",
      });

      return true;
    } catch (_error) {
      // OrderManager error: Failed to cancel order
      return false;
    }
  }

  async cancelAllOrders(brokerClient: BrokerClient): Promise<number> {
    let cancelledCount = 0;

    for (const [orderId] of this.openOrders) {
      const success = await this.cancelOrder(orderId, brokerClient);
      if (success) cancelledCount++;
    }

    return cancelledCount;
  }

  // ==========================================================================
  // ORDER VALIDATION
  // ==========================================================================

  async validateOrder(
    request: OrderRequest,
    userId: string,
  ): Promise<OrderValidationResult> {
    const errors: OrderValidationError[] = [];
    const warnings: OrderValidationWarning[] = [];
    let adjustedOrder: OrderRequest | undefined;

    // Required field validation
    if (!request.symbol || request.symbol.trim() === "") {
      errors.push({
        field: "symbol",
        message: "Symbol is required",
        code: "REQUIRED_FIELD",
      });
    }

    if (!request.quantity || request.quantity <= 0) {
      errors.push({
        field: "quantity",
        message: "Quantity must be greater than 0",
        code: "INVALID_QUANTITY",
      });
    }

    if (!request.side || !["buy", "sell"].includes(request.side)) {
      errors.push({
        field: "side",
        message: "Side must be buy or sell",
        code: "INVALID_SIDE",
      });
    }

    // Limit price validation for limit orders
    if (["limit", "stop_limit"].includes(request.type) && !request.limitPrice) {
      errors.push({
        field: "limitPrice",
        message: "Limit price required for limit orders",
        code: "MISSING_LIMIT_PRICE",
      });
    }

    // Stop price validation for stop orders
    if (["stop", "stop_limit"].includes(request.type) && !request.stopPrice) {
      errors.push({
        field: "stopPrice",
        message: "Stop price required for stop orders",
        code: "MISSING_STOP_PRICE",
      });
    }

    // Check order limits
    if (this.openOrders.size >= this.config.maxOpenOrders) {
      errors.push({
        field: "system",
        message: `Maximum open orders (${this.config.maxOpenOrders}) reached`,
        code: "MAX_OPEN_ORDERS",
      });
    }

    if (this.dailyOrderCount >= this.config.maxDailyOrders) {
      errors.push({
        field: "system",
        message: `Maximum daily orders (${this.config.maxDailyOrders}) reached`,
        code: "MAX_DAILY_ORDERS",
      });
    }

    // Order value check
    const estimatedValue = this.calculateOrderValue(request);
    if (estimatedValue > this.config.maxOrderValue) {
      errors.push({
        field: "quantity",
        message: `Order value ($${estimatedValue.toFixed(2)}) exceeds maximum ($${this.config.maxOrderValue})`,
        code: "MAX_ORDER_VALUE",
      });
    }

    // Stop loss requirement
    if (
      this.config.requireStopLoss &&
      request.side === "buy" &&
      !request.stopLossPrice
    ) {
      warnings.push({
        field: "stopLossPrice",
        message: "Stop loss is recommended for risk management",
        suggestion: "Add a stop loss price to protect against adverse moves",
      });
    }

    // Extended hours warning
    if (request.extendedHours && !this.config.enableExtendedHours) {
      warnings.push({
        field: "extendedHours",
        message: "Extended hours trading is disabled",
        suggestion: "Order will be executed during regular market hours only",
      });
      adjustedOrder = { ...request, extendedHours: false };
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      adjustedOrder,
    };
  }

  // ==========================================================================
  // ORDER QUERIES
  // ==========================================================================

  getOpenOrders(): Order[] {
    return Array.from(this.openOrders.values());
  }

  getOrder(orderId: string): Order | undefined {
    return this.openOrders.get(orderId);
  }

  async getOrders(filter: OrderFilter): Promise<Order[]> {
    const supabase = await createClient();

    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter.userId) {
      query = query.eq("user_id", filter.userId);
    }

    if (filter.status && filter.status.length > 0) {
      query = query.in("status", filter.status);
    }

    if (filter.side) {
      query = query.eq("side", filter.side);
    }

    if (filter.symbol) {
      query = query.eq("symbol", filter.symbol);
    }

    if (filter.startDate) {
      query = query.gte("created_at", filter.startDate.toISOString());
    }

    if (filter.endDate) {
      query = query.lte("created_at", filter.endDate.toISOString());
    }

    if (filter.strategyId) {
      query = query.eq("strategy_id", filter.strategyId);
    }

    if (filter.limit) {
      query = query.limit(filter.limit);
    }

    if (filter.offset) {
      query = query.range(
        filter.offset,
        filter.offset + (filter.limit || 50) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      // OrderManager error: Error fetching orders
      return [];
    }

    return (data || []).map(this.mapDbToOrder);
  }

  getBlotter(): OrderBlotter {
    const openOrders = this.getOpenOrders();
    const filledOrders = this.orderEvents
      .filter((e) => e.eventType === "filled")
      .map((e) => this.openOrders.get(e.orderId))
      .filter((o): o is Order => o !== undefined);

    return {
      openOrders,
      filledOrders,
      cancelledOrders: [],
      totalOpenValue: openOrders.reduce((sum, o) => sum + o.estimatedValue, 0),
      totalFilledValue: filledOrders.reduce(
        (sum, o) => sum + (o.filledAvgPrice || 0) * o.filledQty,
        0,
      ),
      todayOrderCount: this.dailyOrderCount,
      todayFillCount: this.fills.filter((f) => this.isToday(f.timestamp))
        .length,
    };
  }

  getOrderEvents(orderId?: string): OrderEvent[] {
    if (orderId) {
      return this.orderEvents.filter((e) => e.orderId === orderId);
    }
    return [...this.orderEvents];
  }

  // ==========================================================================
  // RECONCILIATION
  // ==========================================================================

  async reconcileWithBroker(
    brokerClient: BrokerClient,
  ): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      matched: 0,
      mismatched: 0,
      missingLocal: 0,
      missingBroker: 0,
      corrections: [],
    };

    try {
      // Get all open orders from broker
      const brokerOrders = await brokerClient.getOrders({ status: "open" });
      const brokerOrderMap = new Map(
        brokerOrders.map((o) => [o.client_order_id, o]),
      );

      // Check local orders against broker
      for (const [orderId, localOrder] of this.openOrders) {
        const brokerOrder = brokerOrderMap.get(orderId);

        if (brokerOrder) {
          // Compare states
          const brokerStatus = this.mapBrokerStatus(brokerOrder.status);
          if (localOrder.status === brokerStatus) {
            result.matched++;
          } else {
            result.mismatched++;
            result.corrections.push({
              orderId,
              type: "status_mismatch",
              action: "update_status",
              details: { local: localOrder.status, broker: brokerStatus },
            });

            await this.handleOrderUpdate({
              orderId,
              status: brokerStatus,
              filledQty: brokerOrder.filled_qty,
              filledAvgPrice: brokerOrder.filled_avg_price,
              timestamp: new Date(),
            });
          }

          brokerOrderMap.delete(orderId);
        } else if (
          ["submitted", "accepted", "partial"].includes(localOrder.status)
        ) {
          // Order missing on broker side
          result.missingBroker++;
          result.corrections.push({
            orderId,
            type: "missing_broker",
            action: "mark_cancelled",
          });

          await this.handleOrderUpdate({
            orderId,
            status: "cancelled",
            timestamp: new Date(),
            message: "Not found on broker - reconciliation",
          });
        }
      }

      // Orders on broker not in local
      for (const [clientOrderId] of brokerOrderMap) {
        result.missingLocal++;
        result.corrections.push({
          orderId: clientOrderId,
          type: "missing_local",
          action: "import",
        });
      }
    } catch (_error) {
      // OrderManager error: Reconciliation failed
    }

    return result;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private calculateOrderValue(request: OrderRequest): number {
    const price = request.limitPrice || request.stopPrice || 0;
    return price * request.quantity;
  }

  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toISOString().split("T")[0];
    if (this.lastResetDate !== today) {
      this.dailyOrderCount = 0;
      this.lastResetDate = today;
    }
  }

  private isToday(date: Date): boolean {
    const today = new Date().toISOString().split("T")[0];
    return date.toISOString().split("T")[0] === today;
  }

  private logOrderEvent(
    orderId: string,
    eventType: OrderEvent["eventType"],
    previousStatus: OrderStatus,
    newStatus: OrderStatus,
    details?: Record<string, unknown>,
  ): void {
    this.orderEvents.push({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      orderId,
      eventType,
      timestamp: new Date(),
      previousStatus,
      newStatus,
      details,
    });
  }

  private async persistOrder(order: Order): Promise<void> {
    try {
      const supabase = await createClient();

      // Using type assertion since 'orders' table schema not yet defined in Supabase types
      await (
        supabase.from("orders") as unknown as {
          upsert: (data: Record<string, unknown>) => Promise<unknown>;
        }
      ).upsert({
        id: order.id,
        broker_id: order.brokerId,
        user_id: order.userId,
        account_id: order.accountId,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        type: order.type,
        limit_price: order.limitPrice,
        stop_price: order.stopPrice,
        time_in_force: order.timeInForce,
        status: order.status,
        filled_qty: order.filledQty,
        filled_avg_price: order.filledAvgPrice,
        created_at: order.createdAt.toISOString(),
        submitted_at: order.submittedAt?.toISOString(),
        filled_at: order.filledAt?.toISOString(),
        cancelled_at: order.cancelledAt?.toISOString(),
        updated_at: order.updatedAt.toISOString(),
        error_message: order.errorMessage,
        reject_reason: order.rejectReason,
        estimated_value: order.estimatedValue,
        signal_id: order.signalId,
        strategy_id: order.strategyId,
        notes: order.notes,
      });
    } catch (_error) {
      // OrderManager error: Failed to persist order
    }
  }

  private async loadOrderFromDb(orderId: string): Promise<Order | null> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error || !data) return null;

      return this.mapDbToOrder(data);
    } catch {
      return null;
    }
  }

  private mapDbToOrder(data: Record<string, unknown>): Order {
    return {
      id: data.id as string,
      brokerId: data.broker_id as string | undefined,
      userId: data.user_id as string,
      accountId: data.account_id as string,
      symbol: data.symbol as string,
      side: data.side as Order["side"],
      quantity: data.quantity as number,
      type: data.type as Order["type"],
      limitPrice: data.limit_price as number | undefined,
      stopPrice: data.stop_price as number | undefined,
      timeInForce: data.time_in_force as Order["timeInForce"],
      status: data.status as OrderStatus,
      filledQty: data.filled_qty as number,
      filledAvgPrice: data.filled_avg_price as number | undefined,
      createdAt: new Date(data.created_at as string),
      submittedAt: data.submitted_at
        ? new Date(data.submitted_at as string)
        : undefined,
      filledAt: data.filled_at ? new Date(data.filled_at as string) : undefined,
      cancelledAt: data.cancelled_at
        ? new Date(data.cancelled_at as string)
        : undefined,
      updatedAt: new Date(data.updated_at as string),
      errorMessage: data.error_message as string | undefined,
      rejectReason: data.reject_reason as string | undefined,
      estimatedValue: data.estimated_value as number,
      signalId: data.signal_id as string | undefined,
      strategyId: data.strategy_id as string | undefined,
      notes: data.notes as string | undefined,
    };
  }

  private mapBrokerStatus(brokerStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      new: "submitted",
      accepted: "accepted",
      pending_new: "submitted",
      partially_filled: "partial",
      filled: "filled",
      done_for_day: "filled",
      canceled: "cancelled",
      cancelled: "cancelled",
      expired: "expired",
      rejected: "rejected",
      pending_cancel: "accepted",
      pending_replace: "accepted",
      replaced: "accepted",
    };
    return statusMap[brokerStatus.toLowerCase()] || "error";
  }
}

// ============================================================================
// BROKER CLIENT INTERFACE
// ============================================================================

export interface BrokerClient {
  submitOrder(params: BrokerOrderParams): Promise<BrokerOrderResponse>;
  cancelOrder(orderId: string): Promise<void>;
  getOrders(params: { status?: string }): Promise<BrokerOrder[]>;
  getOrder(orderId: string): Promise<BrokerOrder>;
}

export interface BrokerOrderParams {
  symbol: string;
  side: string;
  qty: number;
  type: string;
  time_in_force: string;
  limit_price?: number;
  stop_price?: number;
  client_order_id?: string;
  take_profit?: { limit_price: number };
  stop_loss?: { stop_price: number; limit_price?: number };
}

export interface BrokerOrderResponse {
  id: string;
  client_order_id: string;
  status: string;
}

export interface BrokerOrder {
  id: string;
  client_order_id: string;
  status: string;
  filled_qty: number;
  filled_avg_price?: number;
}

// ============================================================================
// RECONCILIATION TYPES
// ============================================================================

export interface ReconciliationResult {
  matched: number;
  mismatched: number;
  missingLocal: number;
  missingBroker: number;
  corrections: ReconciliationCorrection[];
}

export interface ReconciliationCorrection {
  orderId: string;
  type: "status_mismatch" | "missing_broker" | "missing_local";
  action: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// FACTORY
// ============================================================================

let orderManagerInstance: OrderManager | null = null;

export function getOrderManager(
  config?: Partial<OrderManagerConfig>,
): OrderManager {
  orderManagerInstance ??= new OrderManager(config);
  return orderManagerInstance;
}

export function createOrderManager(
  config?: Partial<OrderManagerConfig>,
): OrderManager {
  return new OrderManager(config);
}
