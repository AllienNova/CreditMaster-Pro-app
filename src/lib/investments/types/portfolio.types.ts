/**
 * Investment Portfolio Types
 *
 * Type definitions for portfolio management, holdings, and transactions.
 */

// ============================================================================
// HOLDING TYPES
// ============================================================================

export interface Holding {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  shares: number;
  averageCostBasis: number;
  currentPrice: number;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  sector?: string;
  assetType: AssetType;
  lastUpdated: Date;
  createdAt: Date;
}

export type AssetType =
  | "stock"
  | "etf"
  | "mutual_fund"
  | "bond"
  | "crypto"
  | "option"
  | "other";

export interface HoldingCreateInput {
  symbol: string;
  name?: string;
  shares: number;
  averageCostBasis: number;
  assetType: AssetType;
  sector?: string;
}

export interface HoldingUpdateInput {
  shares?: number;
  averageCostBasis?: number;
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface Transaction {
  id: string;
  holdingId: string;
  userId: string;
  symbol: string;
  type: TransactionType;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fees?: number;
  date: Date;
  notes?: string;
  createdAt: Date;
}

export type TransactionType =
  | "buy"
  | "sell"
  | "dividend"
  | "split"
  | "transfer";

export interface TransactionCreateInput {
  holdingId?: string;
  symbol: string;
  type: TransactionType;
  shares: number;
  pricePerShare: number;
  fees?: number;
  date: Date;
  notes?: string;
}

// ============================================================================
// PORTFOLIO TYPES
// ============================================================================

export interface Portfolio {
  userId: string;
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: Holding[];
  allocation: AllocationItem[];
  performanceHistory: PerformancePoint[];
  lastUpdated: Date;
}

export interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface PerformancePoint {
  date: string;
  value: number;
  change?: number;
  changePercent?: number;
}

// ============================================================================
// PORTFOLIO SUMMARY
// ============================================================================

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdingsCount: number;
  topPerformer?: { symbol: string; gainPercent: number };
  worstPerformer?: { symbol: string; gainPercent: number };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PortfolioResponse {
  success: boolean;
  data: Portfolio;
  error?: string;
}

export interface HoldingsResponse {
  success: boolean;
  data: Holding[];
  total: number;
  error?: string;
}

export interface HoldingResponse {
  success: boolean;
  data: Holding;
  error?: string;
}

export interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
  total: number;
  error?: string;
}

// ============================================================================
// FILTER/SORT OPTIONS
// ============================================================================

export type HoldingSortField =
  | "symbol"
  | "value"
  | "gainLoss"
  | "gainLossPercent"
  | "shares";
export type SortDirection = "asc" | "desc";

export interface HoldingsFilter {
  assetType?: AssetType;
  sector?: string;
  minValue?: number;
  maxValue?: number;
  sortBy?: HoldingSortField;
  sortDirection?: SortDirection;
}
