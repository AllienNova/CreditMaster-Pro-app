/**
 * Position Management Types
 *
 * Type definitions for position tracking and P&L calculation.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type PositionSide = "long" | "short" | "flat";
export type PositionStatus = "open" | "closed" | "liquidated";

// ============================================================================
// POSITION INTERFACES
// ============================================================================

export interface Position {
  id: string;
  userId: string;
  accountId: string;
  symbol: string;

  // Position details
  side: PositionSide;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;

  // Cost basis
  costBasis: number;
  marketValue: number;

  // P&L
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  totalPL: number;

  // Risk metrics
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskAmount?: number;
  riskPercent?: number;

  // Strategy info
  strategyId?: string;
  signalId?: string;

  // Timestamps
  openedAt: Date;
  lastUpdatedAt: Date;
  closedAt?: Date;

  // Status
  status: PositionStatus;

  // Metadata
  exchange?: string;
  assetClass?: string;
  notes?: string;
}

export interface PositionUpdate {
  positionId: string;
  currentPrice: number;
  timestamp: Date;
}

export interface PositionClose {
  positionId: string;
  closePrice: number;
  closeQuantity?: number; // For partial closes
  timestamp: Date;
  reason?: "manual" | "stop_loss" | "take_profit" | "signal" | "liquidation";
}

// ============================================================================
// POSITION SUMMARY
// ============================================================================

export interface PositionSummary {
  totalPositions: number;
  longPositions: number;
  shortPositions: number;

  totalMarketValue: number;
  totalCostBasis: number;

  totalUnrealizedPL: number;
  totalRealizedPL: number;
  totalPL: number;

  dayPL: number;
  weekPL: number;
  monthPL: number;

  grossExposure: number;
  netExposure: number;

  largestPosition: {
    symbol: string;
    value: number;
    percent: number;
  } | null;

  sectorExposure: Record<string, number>;
}

export interface PositionFilter {
  status?: PositionStatus[];
  side?: PositionSide;
  symbol?: string;
  strategyId?: string;
  minValue?: number;
  maxValue?: number;
  limit?: number;
  offset?: number;
}

// ============================================================================
// TRADE RECORD
// ============================================================================

export interface TradeRecord {
  id: string;
  positionId: string;
  userId: string;
  symbol: string;

  // Trade details
  side: "buy" | "sell";
  quantity: number;
  price: number;
  value: number;

  // Execution
  orderId: string;
  fillId?: string;

  // Costs
  commission: number;
  fees: number;
  slippage: number;

  // P&L (for closes)
  realizedPL?: number;

  // Timestamps
  executedAt: Date;

  // Strategy
  strategyId?: string;
  signalId?: string;
}

// ============================================================================
// POSITION MANAGER CONFIG
// ============================================================================

export interface PositionManagerConfig {
  // Limits
  maxPositions: number;
  maxPositionSize: number; // % of portfolio
  maxSectorExposure: number;

  // P&L tracking
  enableRealTimePL: boolean;
  plUpdateIntervalMs: number;

  // Risk
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;

  // Reconciliation
  reconcileIntervalMs: number;
  autoCLoseOnReconcile: boolean;
}

export const DEFAULT_POSITION_MANAGER_CONFIG: PositionManagerConfig = {
  maxPositions: 20,
  maxPositionSize: 0.2,
  maxSectorExposure: 0.4,
  enableRealTimePL: true,
  plUpdateIntervalMs: 1000,
  defaultStopLossPercent: 0.02,
  defaultTakeProfitPercent: 0.04,
  reconcileIntervalMs: 60000,
  autoCLoseOnReconcile: false,
};
