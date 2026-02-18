/**
 * Real-Time Trading Module
 *
 * Exports for WebSocket-based real-time market data and order execution.
 */

// Real-Time Trading Service
export {
  RealtimeTradingService,
  getRealtimeTradingService,
  createRealtimeTradingService,
  DEFAULT_REALTIME_CONFIG,
} from "./realtime-trading-service";

export type {
  ConnectionState,
  MarketDataType,
  RealtimeQuote,
  RealtimeTrade,
  RealtimeBar,
  OrderUpdate,
  OrderUpdateStatus,
  OrderEvent,
  TradeUpdate,
  RealtimeConfig,
  SubscriptionStatus,
} from "./realtime-trading-service";

// Order Execution Engine
export {
  OrderExecutionEngine,
  getOrderExecutionEngine,
  createOrderExecutionEngine,
  DEFAULT_EXECUTION_CONFIG,
} from "./order-execution-engine";

export type {
  ExecutionMode,
  ExecutionConfig,
  ExecutionResult,
  PendingExecution,
  ExecutionEvent,
  LivePriceInfo,
} from "./order-execution-engine";

// Order Status Tracker
export {
  OrderStatusTracker,
  createOrderStatusTracker,
  DEFAULT_TRACKER_CONFIG,
} from "./order-status-tracker";

export type {
  OrderStatusChange,
  TrackedOrder,
  OrderTrackerConfig,
} from "./order-status-tracker";
