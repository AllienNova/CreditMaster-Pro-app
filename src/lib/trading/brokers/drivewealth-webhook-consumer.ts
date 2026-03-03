/**
 * DriveWealth Webhook Consumer
 *
 * Processes order status update webhooks from DriveWealth.
 * Maps DriveWealth event types to BrokerInterface OrderStatus updates.
 */

import type { Order, OrderStatus, OrderSide, TimeInForce } from "./broker-interface";

// ============================================================================
// WEBHOOK EVENT TYPES
// ============================================================================

export type DriveWealthEventType =
  | "ORDER_CREATED"
  | "ORDER_FILLED"
  | "ORDER_PARTIALLY_FILLED"
  | "ORDER_CANCELED"
  | "ORDER_REJECTED";

export interface DriveWealthWebhookEvent {
  type: DriveWealthEventType;
  timestamp: string;
  accountID: string;
  order: {
    id: string;
    refID?: string;
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    filledQty: number;
    status: string;
    limitPrice?: number;
    stopPrice?: number;
    timeInForce: string;
    extendedHours: boolean;
    createdAt: string;
    updatedAt: string;
    filledAt?: string;
    avgFillPrice?: number;
  };
}

export interface WebhookProcessingResult {
  success: boolean;
  eventType: string;
  order?: Order;
  error?: string;
}

export type OrderUpdateHandler = (order: Order, eventType: DriveWealthEventType) => void;

// ============================================================================
// WEBHOOK CONSUMER CLASS
// ============================================================================

export class DriveWealthWebhookConsumer {
  private handlers: OrderUpdateHandler[] = [];

  onOrderUpdate(handler: OrderUpdateHandler): void {
    this.handlers.push(handler);
  }

  removeHandler(handler: OrderUpdateHandler): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  processEvent(event: DriveWealthWebhookEvent): WebhookProcessingResult {
    if (!event || !event.type || !event.order) {
      return {
        success: false,
        eventType: event?.type || "UNKNOWN",
        error: "Invalid event: missing required fields",
      };
    }

    if (!this.isValidEventType(event.type)) {
      return {
        success: false,
        eventType: event.type,
        error: `Unknown event type: ${event.type}`,
      };
    }

    try {
      const order = this.mapEventToOrder(event);

      for (const handler of this.handlers) {
        handler(order, event.type);
      }

      return {
        success: true,
        eventType: event.type,
        order,
      };
    } catch (error) {
      return {
        success: false,
        eventType: event.type,
        error: error instanceof Error ? error.message : "Unknown processing error",
      };
    }
  }

  processBatch(events: DriveWealthWebhookEvent[]): WebhookProcessingResult[] {
    return events.map((event) => this.processEvent(event));
  }

  private isValidEventType(type: string): type is DriveWealthEventType {
    const validTypes: string[] = [
      "ORDER_CREATED",
      "ORDER_FILLED",
      "ORDER_PARTIALLY_FILLED",
      "ORDER_CANCELED",
      "ORDER_REJECTED",
    ];
    return validTypes.includes(type);
  }

  private mapEventToOrder(event: DriveWealthWebhookEvent): Order {
    const orderData = event.order;

    return {
      id: orderData.id,
      clientOrderId: orderData.refID,
      symbol: orderData.symbol,
      side: orderData.side.toLowerCase() as OrderSide,
      type: this.reverseMapOrderType(orderData.type),
      quantity: orderData.quantity,
      filledQuantity: orderData.filledQty,
      status: this.mapEventTypeToStatus(event.type, orderData.status),
      limitPrice: orderData.limitPrice,
      stopPrice: orderData.stopPrice,
      timeInForce: this.reverseMapTimeInForce(orderData.timeInForce),
      extendedHours: orderData.extendedHours,
      createdAt: new Date(orderData.createdAt),
      updatedAt: new Date(orderData.updatedAt),
      filledAt: orderData.filledAt ? new Date(orderData.filledAt) : undefined,
      filledAvgPrice: orderData.avgFillPrice,
    };
  }

  private mapEventTypeToStatus(
    eventType: DriveWealthEventType,
    rawStatus: string,
  ): OrderStatus {
    const eventMapping: Record<DriveWealthEventType, OrderStatus> = {
      ORDER_CREATED: "new",
      ORDER_FILLED: "filled",
      ORDER_PARTIALLY_FILLED: "partially_filled",
      ORDER_CANCELED: "canceled",
      ORDER_REJECTED: "rejected",
    };

    return eventMapping[eventType] || this.mapRawStatus(rawStatus);
  }

  private mapRawStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      NEW: "new",
      PENDING: "pending",
      ACCEPTED: "accepted",
      FILLED: "filled",
      PARTIALLY_FILLED: "partially_filled",
      CANCELED: "canceled",
      CANCELLED: "canceled",
      REJECTED: "rejected",
      EXPIRED: "expired",
    };
    return mapping[status] || "pending";
  }

  private reverseMapOrderType(
    type: string,
  ): "market" | "limit" | "stop" | "stop_limit" | "trailing_stop" {
    const mapping: Record<string, "market" | "limit" | "stop" | "stop_limit" | "trailing_stop"> = {
      MARKET: "market",
      LIMIT: "limit",
      STOP: "stop",
      STOP_LIMIT: "stop_limit",
      TRAILING_STOP: "trailing_stop",
    };
    return mapping[type] || "market";
  }

  private reverseMapTimeInForce(tif: string): TimeInForce {
    const mapping: Record<string, TimeInForce> = {
      DAY: "day",
      GTC: "gtc",
      IOC: "ioc",
      FOK: "fok",
      OPG: "opg",
      CLS: "cls",
    };
    return mapping[tif] || "day";
  }
}
