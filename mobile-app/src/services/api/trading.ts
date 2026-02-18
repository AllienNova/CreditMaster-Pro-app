/**
 * Fynvita Mobile Trading API Service
 * Handles all trading-related API calls using the core API client
 */

import api from "./client";
import type { ApiResponse, RequestConfig } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export type OrderSide = "buy" | "sell";
export type OrderType =
  | "market"
  | "limit"
  | "stop"
  | "stop_limit"
  | "trailing_stop";
export type OrderStatus =
  | "new"
  | "pending"
  | "accepted"
  | "filled"
  | "partially_filled"
  | "canceled"
  | "rejected"
  | "expired";
export type TimeInForce = "day" | "gtc" | "opg" | "cls" | "ioc" | "fok";
export type PositionSide = "long" | "short";
export type SignalSource = "pctt" | "rule" | "ml" | "llm" | "fused";
export type SignalStatus = "active" | "triggered" | "expired" | "cancelled";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity?: number;
  limitPrice?: number;
  stopPrice?: number;
  trailPercent?: number;
  status: OrderStatus;
  timeInForce: TimeInForce;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  clientOrderId?: string;
  strategyId?: string;
  signalId?: string;
  avgFilledPrice?: number;
  createdAt: string;
  updatedAt?: string;
  filledAt?: string;
  notes?: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskPercent?: number;
  openedAt: string;
  strategyId?: string;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  timestamp: string;
  source: SignalSource;
  type: "entry" | "exit";
  side: PositionSide;
  strength: number;
  confidence: number;
  entryPrice?: number;
  stopLoss?: number;
  targets?: number[];
  rationale?: string;
  expiresAt?: string;
  status: SignalStatus;
}

export interface RiskMetrics {
  portfolioHeat: number;
  maxHeat: number;
  heatUtilization: number;
  grossExposure: number;
  netExposure: number;
  longExposure: number;
  shortExposure: number;
  largestPosition: {
    symbol: string;
    value: number;
    percent: number;
  } | null;
  currentDrawdown: number;
  maxDrawdown: number;
  drawdownScaleFactor: number;
  dailyPL: number;
  dailyPLPercent: number;
  weeklyPL: number;
  monthlyPL: number;
  openPositions: number;
  correlatedGroups: string[][];
  riskScore: number;
  riskLevel: RiskLevel;
  canTrade: boolean;
  blockReasons: string[];
  killSwitch: {
    active: boolean;
    reason?: string;
    activatedAt?: string;
    activatedBy?: string;
  };
}

export interface RiskSettings {
  maxHeat: number;
  maxPositionSize: number;
  maxGrossExposure: number;
  maxNetExposure: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  correlationThreshold: number;
  maxCorrelatedExposure: number;
  enableKillSwitch: boolean;
}

export interface PositionSummary {
  totalPositions: number;
  longPositions: number;
  shortPositions: number;
  totalValue: number;
  totalUnrealizedPL: number;
  totalRealizedPL: number;
  grossExposure: number;
  netExposure: number;
  dayPL: number;
  weekPL: number;
  monthPL: number;
  largestPosition: { symbol: string; value: number; percent: number } | null;
}

export interface OrderBlotter {
  orders: Order[];
  summary: {
    totalOrders: number;
    openOrders: number;
    filledToday: number;
    canceledToday: number;
    totalFilledValue: number;
  };
}

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  direction: PositionSide;
  entryDate: string;
  entryPrice: number;
  exitDate?: string;
  exitPrice?: number;
  quantity: number;
  profitLoss?: number;
  profitLossPercent?: number;
  outcome?: "win" | "loss" | "breakeven";
  strategy?: string;
  notes?: string;
  holdingPeriodDays?: number;
}

export interface TradeStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPL: number;
  averageWin: number;
  averageLoss: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldingPeriod: number;
  largestDrawdown: number;
  expectancy: number;
}

export interface PaperAccount {
  id: string;
  name: string;
  cashBalance: number;
  balance: number;
  equity: number;
  buyingPower: number;
  portfolioValue: number;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  createdAt: string;
  positions?: PaperPosition[];
  orders?: PaperOrder[];
}

export interface PaperPosition {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  openedAt: string;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  status: OrderStatus;
  createdAt: string;
  filledAt?: string;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  realizedPL: number;
  realizedPLPercent: number;
  strategy?: string;
  notes?: string;
}

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
  type?: OrderType;
  limitPrice?: number;
  stopPrice?: number;
  trailPercent?: number;
  trailAmount?: number;
  timeInForce?: TimeInForce;
  extendedHours?: boolean;
  orderClass?: "simple" | "bracket" | "oco" | "oto";
  takeProfitPrice?: number;
  stopLossPrice?: number;
  stopLossLimitPrice?: number;
  clientOrderId?: string;
  signalId?: string;
  strategyId?: string;
  notes?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

interface OrdersResponse {
  orders: Order[];
  openOrders: Order[];
  totalOpen: number;
}

interface PositionsResponse {
  positions: Position[];
  openPositions: Position[];
  summary: PositionSummary;
}

interface SignalsResponse {
  signals: TradingSignal[];
  count: number;
}

interface SignalSummaryResponse {
  total: number;
  active: number;
  bySource: Record<SignalSource, number>;
  bySide: Record<PositionSide, number>;
  avgConfidence: number;
  topSignals: TradingSignal[];
}

interface CreateOrderResponse {
  order: Order;
  validation: {
    isValid: boolean;
    errors?: Array<{ field: string; message: string }>;
    warnings?: string[];
  };
}

// ============================================================================
// TRADING API SERVICE
// ============================================================================

export const tradingApi = {
  // =========================================================================
  // ORDERS
  // =========================================================================

  /**
   * Get orders with optional filters
   */
  getOrders: (
    params?: {
      status?: OrderStatus[];
      side?: OrderSide;
      symbol?: string;
      limit?: number;
      offset?: number;
    },
    config?: RequestConfig,
  ): Promise<ApiResponse<OrdersResponse>> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status.join(","));
    if (params?.side) queryParams.append("side", params.side);
    if (params?.symbol) queryParams.append("symbol", params.symbol);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());
    const query = queryParams.toString();
    return api.get<OrdersResponse>(
      `/trading/orders${query ? `?${query}` : ""}`,
      config,
    );
  },

  /**
   * Get order by ID
   */
  getOrder: (
    orderId: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ order: Order }>> =>
    api.get<{ order: Order }>(`/trading/orders?id=${orderId}`, config),

  /**
   * Get order blotter
   */
  getBlotter: (config?: RequestConfig): Promise<ApiResponse<OrderBlotter>> =>
    api.get<OrderBlotter>("/trading/orders?action=blotter", config),

  /**
   * Create a new order
   */
  createOrder: (
    order: OrderRequest,
    config?: RequestConfig,
  ): Promise<ApiResponse<CreateOrderResponse>> =>
    api.post<CreateOrderResponse>(
      "/trading/orders",
      { action: "create", ...order },
      config,
    ),

  /**
   * Validate order before submission
   */
  validateOrder: (
    order: OrderRequest,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ validation: CreateOrderResponse["validation"] }>> =>
    api.post<{ validation: CreateOrderResponse["validation"] }>(
      "/trading/orders",
      { action: "validate", ...order },
      config,
    ),

  /**
   * Cancel an order
   */
  cancelOrder: (
    orderId: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> =>
    api.delete<{ success: boolean; message: string }>(
      `/trading/orders?id=${orderId}`,
      config,
    ),

  /**
   * Cancel all open orders
   */
  cancelAllOrders: (
    config?: RequestConfig,
  ): Promise<ApiResponse<{ success: boolean; orderCount: number }>> =>
    api.delete<{ success: boolean; orderCount: number }>(
      "/trading/orders?all=true",
      config,
    ),

  // =========================================================================
  // POSITIONS
  // =========================================================================

  /**
   * Get positions with optional filters
   */
  getPositions: (
    params?: {
      status?: string[];
      side?: PositionSide;
      symbol?: string;
      limit?: number;
    },
    config?: RequestConfig,
  ): Promise<ApiResponse<PositionsResponse>> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status.join(","));
    if (params?.side) queryParams.append("side", params.side);
    if (params?.symbol) queryParams.append("symbol", params.symbol);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const query = queryParams.toString();
    return api.get<PositionsResponse>(
      `/trading/positions${query ? `?${query}` : ""}`,
      config,
    );
  },

  /**
   * Get position by symbol
   */
  getPositionBySymbol: (
    symbol: string,
    config?: RequestConfig,
  ): Promise<
    ApiResponse<{ position: Position | null; hasPosition: boolean }>
  > =>
    api.get<{ position: Position | null; hasPosition: boolean }>(
      `/trading/positions?symbol=${symbol}`,
      config,
    ),

  /**
   * Get position summary
   */
  getPositionSummary: (
    config?: RequestConfig,
  ): Promise<ApiResponse<PositionSummary>> =>
    api.get<PositionSummary>("/trading/positions?action=summary", config),

  /**
   * Close a position
   */
  closePosition: (
    positionId: string,
    closePrice?: number,
    closeQuantity?: number,
    reason?: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ position: Position; realizedPL: number }>> =>
    api.post<{ position: Position; realizedPL: number }>(
      "/trading/positions",
      { action: "close", positionId, closePrice, closeQuantity, reason },
      config,
    ),

  /**
   * Close all positions
   */
  closeAllPositions: (
    config?: RequestConfig,
  ): Promise<ApiResponse<{ closedCount: number; totalRealizedPL: number }>> =>
    api.post<{ closedCount: number; totalRealizedPL: number }>(
      "/trading/positions",
      { action: "closeAll" },
      config,
    ),

  /**
   * Update position prices
   */
  updatePrices: (
    prices: Record<string, number>,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ summary: PositionSummary }>> =>
    api.post<{ summary: PositionSummary }>(
      "/trading/positions",
      { action: "updatePrices", prices },
      config,
    ),

  // =========================================================================
  // SIGNALS
  // =========================================================================

  /**
   * Get active trading signals
   */
  getActiveSignals: (
    params?: {
      symbol?: string;
      source?: SignalSource;
      minConfidence?: number;
      limit?: number;
    },
    config?: RequestConfig,
  ): Promise<ApiResponse<SignalsResponse>> => {
    const queryParams = new URLSearchParams();
    queryParams.append("action", "active");
    if (params?.symbol) queryParams.append("symbol", params.symbol);
    if (params?.source) queryParams.append("source", params.source);
    if (params?.minConfidence)
      queryParams.append("minConfidence", params.minConfidence.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    return api.get<SignalsResponse>(
      `/trading/signals?${queryParams.toString()}`,
      config,
    );
  },

  /**
   * Get signal summary
   */
  getSignalSummary: (
    config?: RequestConfig,
  ): Promise<ApiResponse<SignalSummaryResponse>> =>
    api.get<SignalSummaryResponse>("/trading/signals?action=summary", config),

  /**
   * Analyze symbol for signals
   */
  analyzeSymbol: (
    symbol: string,
    timeframe?: string,
    includeEngines?: {
      pctt?: boolean;
      rule?: boolean;
      ml?: boolean;
      llm?: boolean;
    },
    config?: RequestConfig,
  ): Promise<
    ApiResponse<{
      symbol: string;
      timeframe: string;
      timestamp: string;
      engines: Record<string, unknown>;
      fusedSignal: {
        side: PositionSide;
        confidence: number;
        consensus: number;
      };
    }>
  > =>
    api.post<{
      symbol: string;
      timeframe: string;
      timestamp: string;
      engines: Record<string, unknown>;
      fusedSignal: {
        side: PositionSide;
        confidence: number;
        consensus: number;
      };
    }>(
      "/trading/signals",
      { action: "analyze", symbol, timeframe, includeEngines },
      config,
    ),

  /**
   * Create a manual signal
   */
  createSignal: (
    signal: Omit<TradingSignal, "id" | "timestamp" | "status">,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ signal: TradingSignal }>> =>
    api.post<{ signal: TradingSignal }>(
      "/trading/signals",
      { action: "create", ...signal },
      config,
    ),

  /**
   * Cancel a signal
   */
  cancelSignal: (
    signalId: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ signal: TradingSignal }>> =>
    api.post<{ signal: TradingSignal }>(
      "/trading/signals",
      { action: "cancel", signalId },
      config,
    ),

  // =========================================================================
  // RISK MANAGEMENT
  // =========================================================================

  /**
   * Get risk metrics
   */
  getRiskMetrics: (config?: RequestConfig): Promise<ApiResponse<RiskMetrics>> =>
    api.get<RiskMetrics>("/trading/risk?action=metrics", {
      enableCache: true,
      cacheTime: 5000,
      ...config,
    }),

  /**
   * Get risk settings
   */
  getRiskSettings: (
    config?: RequestConfig,
  ): Promise<ApiResponse<RiskSettings>> =>
    api.get<RiskSettings>("/trading/risk?action=settings", config),

  /**
   * Update risk settings
   */
  updateRiskSettings: (
    settings: Partial<RiskSettings>,
    config?: RequestConfig,
  ): Promise<ApiResponse<RiskSettings>> =>
    api.post<RiskSettings>(
      "/trading/risk",
      { action: "updateSettings", settings },
      config,
    ),

  /**
   * Activate kill switch
   */
  activateKillSwitch: (
    reason: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<RiskMetrics["killSwitch"]>> =>
    api.post<RiskMetrics["killSwitch"]>(
      "/trading/risk",
      { action: "activateKillSwitch", reason },
      config,
    ),

  /**
   * Deactivate kill switch
   */
  deactivateKillSwitch: (
    config?: RequestConfig,
  ): Promise<ApiResponse<RiskMetrics["killSwitch"]>> =>
    api.post<RiskMetrics["killSwitch"]>(
      "/trading/risk",
      { action: "deactivateKillSwitch" },
      config,
    ),

  /**
   * Update account equity
   */
  updateEquity: (
    equity: number,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ equity: number; peakEquity: number }>> =>
    api.post<{ equity: number; peakEquity: number }>(
      "/trading/risk",
      { action: "updateEquity", equity },
      config,
    ),

  // =========================================================================
  // TRADE HISTORY / JOURNAL
  // =========================================================================

  /**
   * Get trade history
   */
  getTradeHistory: (
    params?: {
      startDate?: string;
      endDate?: string;
      symbol?: string;
      outcome?: "win" | "loss" | "breakeven";
      limit?: number;
      offset?: number;
    },
    config?: RequestConfig,
  ): Promise<
    ApiResponse<{ trades: TradeHistoryItem[]; stats: TradeStats }>
  > => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.symbol) queryParams.append("symbol", params.symbol);
    if (params?.outcome) queryParams.append("outcome", params.outcome);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());
    const query = queryParams.toString();
    // Note: This would need a backend route - using mock for now
    return api.get<{ trades: TradeHistoryItem[]; stats: TradeStats }>(
      `/trading/journal${query ? `?${query}` : ""}`,
      config,
    );
  },

  /**
   * Get trading statistics
   */
  getTradingStats: (
    period?: "day" | "week" | "month" | "year" | "all",
    config?: RequestConfig,
  ): Promise<ApiResponse<TradeStats>> =>
    api.get<TradeStats>(
      `/trading/journal/stats${period ? `?period=${period}` : ""}`,
      config,
    ),

  // =========================================================================
  // PAPER TRADING
  // =========================================================================

  /**
   * Get paper trading account
   */
  getPaperAccount: (
    config?: RequestConfig,
  ): Promise<ApiResponse<PaperAccount>> =>
    api.get<PaperAccount>("/trading/paper/account", config),

  /**
   * Reset paper trading account
   */
  resetPaperAccount: (
    initialBalance?: number,
    config?: RequestConfig,
  ): Promise<ApiResponse<PaperAccount>> =>
    api.post<PaperAccount>(
      "/trading/paper/reset",
      { initialBalance: initialBalance ?? 100000 },
      config,
    ),

  /**
   * Close a paper trading position
   */
  closePaperPosition: (
    positionId: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ success: boolean; realizedPL: number }>> =>
    api.post<{ success: boolean; realizedPL: number }>(
      "/trading/paper/positions/close",
      { positionId },
      config,
    ),

  /**
   * Cancel a paper trading order
   */
  cancelPaperOrder: (
    orderId: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ success: boolean }>> =>
    api.delete<{ success: boolean }>(
      `/trading/paper/orders?id=${orderId}`,
      config,
    ),
};

export default tradingApi;
