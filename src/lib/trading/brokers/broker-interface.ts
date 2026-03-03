/**
 * Broker Interface
 *
 * Unified interface for all broker integrations.
 * Supports Alpaca, Interactive Brokers, and Paper Trading.
 */

import { Observable } from "rxjs";

// ============================================================================
// ENUMS & TYPES
// ============================================================================

export type OrderSide = "buy" | "sell";
export type OrderType =
  | "market"
  | "limit"
  | "stop"
  | "stop_limit"
  | "trailing_stop";
export type TimeInForce = "day" | "gtc" | "ioc" | "fok" | "opg" | "cls";
export type OrderStatus =
  | "new"
  | "pending"
  | "accepted"
  | "filled"
  | "partially_filled"
  | "canceled"
  | "rejected"
  | "expired";
export type PositionSide = "long" | "short";

// ============================================================================
// INTERFACES
// ============================================================================

export interface BrokerCredentials {
  apiKey: string;
  apiSecret: string;
  paperTrading?: boolean;
  baseUrl?: string;
}

export interface BrokerConnection {
  connected: boolean;
  accountId: string;
  buyingPower: number;
  cash: number;
  portfolioValue: number;
  dayTradesRemaining?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  lastHeartbeat: Date;
  latencyMs: number;
  marketStatus: "open" | "closed" | "pre_market" | "after_hours";
}

export interface AccountInfo {
  id: string;
  status: "active" | "restricted" | "disabled";
  currency: string;
  cash: number;
  portfolioValue: number;
  buyingPower: number;
  dayTradingBuyingPower?: number;
  maintenanceMargin?: number;
  initialMargin?: number;
  lastEquity: number;
  multiplier: number;
  patternDayTrader: boolean;
  tradingBlocked: boolean;
  transfersBlocked: boolean;
}

export interface Position {
  symbol: string;
  quantity: number;
  side: PositionSide;
  entryPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  assetClass: "stock" | "crypto" | "option";
}

export interface Order {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  status: OrderStatus;
  limitPrice?: number;
  stopPrice?: number;
  trailPercent?: number;
  trailPrice?: number;
  timeInForce: TimeInForce;
  extendedHours: boolean;
  createdAt: Date;
  updatedAt: Date;
  filledAt?: Date;
  filledAvgPrice?: number;
  legs?: Order[]; // For bracket/OCO orders
}

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  trailingPercent?: number;
  trailingAmount?: number;
  timeInForce?: TimeInForce;
  extendedHours?: boolean;
  clientOrderId?: string;
}

export interface OrderResult {
  success: boolean;
  order?: Order;
  error?: string;
  errorCode?: string;
}

export interface BracketOrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryType: "market" | "limit";
  entryPrice?: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  stopLossLimitPrice?: number;
  timeInForce?: TimeInForce;
}

export interface BracketOrderResult {
  success: boolean;
  entryOrder?: Order;
  takeProfitOrder?: Order;
  stopLossOrder?: Order;
  error?: string;
}

export interface OCOOrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
  limitPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  timeInForce?: TimeInForce;
}

export interface OCOOrderResult {
  success: boolean;
  orders?: Order[];
  error?: string;
}

export interface OrderModification {
  quantity?: number;
  limitPrice?: number;
  stopPrice?: number;
  trailPercent?: number;
  timeInForce?: TimeInForce;
}

export interface CancelResult {
  success: boolean;
  orderId: string;
  error?: string;
}

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  last: number;
  lastSize: number;
  volume: number;
  timestamp: Date;
}

export interface Level2Data {
  symbol: string;
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
  timestamp: Date;
}

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  side?: OrderSide;
  symbol?: string;
  after?: Date;
  until?: Date;
  limit?: number;
}

// ============================================================================
// BROKER INTERFACE
// ============================================================================

export interface BrokerInterface {
  // Connection management
  connect(credentials: BrokerCredentials): Promise<BrokerConnection>;
  disconnect(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;

  // Account information
  getAccount(): Promise<AccountInfo>;
  getPositions(): Promise<Position[]>;
  getPosition(symbol: string): Promise<Position | null>;
  getOrders(filters?: OrderFilters): Promise<Order[]>;
  getOrder(orderId: string): Promise<Order | null>;
  getOrderHistory(params: {
    after?: Date;
    until?: Date;
    limit?: number;
  }): Promise<Order[]>;

  // Order management
  placeOrder(order: OrderRequest): Promise<OrderResult>;
  placeBracketOrder(bracket: BracketOrderRequest): Promise<BracketOrderResult>;
  placeOCOOrder(oco: OCOOrderRequest): Promise<OCOOrderResult>;
  modifyOrder(
    orderId: string,
    modifications: OrderModification,
  ): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<CancelResult>;
  cancelAllOrders(symbol?: string): Promise<CancelResult[]>;

  // Position management
  closePosition(symbol: string, percent?: number): Promise<OrderResult>;
  closeAllPositions(): Promise<OrderResult[]>;

  // Market data
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  streamQuotes(symbols: string[]): Observable<Quote>;
  getLevel2(symbol: string): Promise<Level2Data>;

  // Utility
  isMarketOpen(): Promise<boolean>;
  getMarketHours(): Promise<{ open: Date; close: Date }>;
  supportedOrderTypes(): OrderType[];
}

// ============================================================================
// BROKER EVENTS
// ============================================================================

export interface BrokerEvents {
  onConnect: () => void;
  onDisconnect: (reason?: string) => void;
  onError: (error: Error) => void;
  onOrderUpdate: (order: Order) => void;
  onPositionUpdate: (position: Position) => void;
  onQuote: (quote: Quote) => void;
  onTrade: (trade: {
    symbol: string;
    price: number;
    size: number;
    timestamp: Date;
  }) => void;
}

// ============================================================================
// FACTORY
// ============================================================================

export type SupportedBroker =
  | "alpaca"
  | "interactive_brokers"
  | "schwab"
  | "paper"
  | "drivewealth";

export interface BrokerConfig {
  broker: SupportedBroker;
  credentials: BrokerCredentials;
  events?: Partial<BrokerEvents>;
}
