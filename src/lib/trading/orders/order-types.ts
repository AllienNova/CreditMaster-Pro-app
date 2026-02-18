/**
 * Order Management Types
 *
 * Comprehensive type definitions for order lifecycle management.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type OrderSide = "buy" | "sell";
export type OrderType =
  | "market"
  | "limit"
  | "stop"
  | "stop_limit"
  | "trailing_stop";
export type OrderStatus =
  | "pending" // Created but not submitted
  | "submitted" // Sent to broker
  | "accepted" // Acknowledged by broker
  | "partial" // Partially filled
  | "filled" // Fully filled
  | "cancelled" // Cancelled by user
  | "rejected" // Rejected by broker
  | "expired" // Time expired
  | "error"; // Error state

export type TimeInForce = "day" | "gtc" | "ioc" | "fok" | "opg" | "cls";
export type OrderClass = "simple" | "bracket" | "oco" | "oto";

// ============================================================================
// ORDER INTERFACES
// ============================================================================

export interface OrderRequest {
  // Required fields
  symbol: string;
  side: OrderSide;
  quantity: number;
  type: OrderType;

  // Optional price fields
  limitPrice?: number;
  stopPrice?: number;
  trailPercent?: number;
  trailAmount?: number;

  // Time and validity
  timeInForce: TimeInForce;
  extendedHours?: boolean;

  // Order class for complex orders
  orderClass?: OrderClass;

  // Bracket order fields
  takeProfitPrice?: number;
  stopLossPrice?: number;
  stopLossLimitPrice?: number;

  // Metadata
  clientOrderId?: string;
  signalId?: string;
  strategyId?: string;
  notes?: string;
}

export interface Order extends OrderRequest {
  id: string;
  brokerId?: string; // ID from broker (e.g., Alpaca)
  userId: string;
  accountId: string;

  status: OrderStatus;

  // Fill information
  filledQty: number;
  filledAvgPrice?: number;

  // Timestamps
  createdAt: Date;
  submittedAt?: Date;
  filledAt?: Date;
  cancelledAt?: Date;
  updatedAt: Date;

  // Error handling
  errorMessage?: string;
  rejectReason?: string;

  // Legs for complex orders
  legs?: OrderLeg[];

  // Fees and costs
  commission?: number;
  fees?: number;

  // Risk metrics
  estimatedValue: number;
  estimatedRisk?: number;
}

export interface OrderLeg {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  status: OrderStatus;
  filledQty: number;
  filledAvgPrice?: number;
}

// ============================================================================
// ORDER UPDATE & EVENTS
// ============================================================================

export interface OrderUpdate {
  orderId: string;
  status: OrderStatus;
  filledQty?: number;
  filledAvgPrice?: number;
  timestamp: Date;
  message?: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  eventType:
    | "created"
    | "submitted"
    | "accepted"
    | "partial_fill"
    | "filled"
    | "cancelled"
    | "rejected"
    | "expired"
    | "error";
  timestamp: Date;
  previousStatus?: OrderStatus;
  newStatus: OrderStatus;
  details?: Record<string, unknown>;
}

// ============================================================================
// FILL INFORMATION
// ============================================================================

export interface Fill {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  timestamp: Date;
  venue?: string;
  commission?: number;
  fees?: number;
}

// ============================================================================
// ORDER BOOK / BLOTTER
// ============================================================================

export interface OrderBlotter {
  openOrders: Order[];
  filledOrders: Order[];
  cancelledOrders: Order[];
  totalOpenValue: number;
  totalFilledValue: number;
  todayOrderCount: number;
  todayFillCount: number;
}

export interface OrderFilter {
  status?: OrderStatus[];
  side?: OrderSide;
  symbol?: string;
  startDate?: Date;
  endDate?: Date;
  strategyId?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// ORDER VALIDATION
// ============================================================================

export interface OrderValidationResult {
  isValid: boolean;
  errors: OrderValidationError[];
  warnings: OrderValidationWarning[];
  adjustedOrder?: OrderRequest;
}

export interface OrderValidationError {
  field: string;
  message: string;
  code: string;
}

export interface OrderValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// ORDER MANAGER CONFIG
// ============================================================================

export interface OrderManagerConfig {
  // Limits
  maxOpenOrders: number;
  maxDailyOrders: number;
  maxOrderValue: number;
  maxPositionSize: number;

  // Defaults
  defaultTimeInForce: TimeInForce;
  defaultOrderType: OrderType;

  // Risk checks
  requireStopLoss: boolean;
  maxSlippagePercent: number;

  // Features
  enableBracketOrders: boolean;
  enableExtendedHours: boolean;

  // Reconciliation
  reconcileIntervalMs: number;
  maxReconcileAttempts: number;
}

export const DEFAULT_ORDER_MANAGER_CONFIG: OrderManagerConfig = {
  maxOpenOrders: 20,
  maxDailyOrders: 100,
  maxOrderValue: 100000,
  maxPositionSize: 0.2,
  defaultTimeInForce: "day",
  defaultOrderType: "limit",
  requireStopLoss: true,
  maxSlippagePercent: 0.5,
  enableBracketOrders: true,
  enableExtendedHours: false,
  reconcileIntervalMs: 30000,
  maxReconcileAttempts: 3,
};
