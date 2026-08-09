/**
 * Portfolio Database Types
 *
 * TypeScript interfaces and Zod schemas matching the Supabase database schema
 * for investment portfolios, holdings, and transactions.
 */

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export enum PortfolioType {
  MANUAL = "manual",
  LINKED = "linked",
  SIMULATED = "simulated",
  PAPER_TRADING = "paper_trading",
}

export enum RiskLevel {
  CONSERVATIVE = "conservative",
  MODERATE = "moderate",
  AGGRESSIVE = "aggressive",
  VERY_AGGRESSIVE = "very_aggressive",
}

export enum AssetType {
  STOCK = "stock",
  ETF = "etf",
  MUTUAL_FUND = "mutual_fund",
  BOND = "bond",
  CRYPTO = "crypto",
  OPTION = "option",
  FUTURE = "future",
  CASH = "cash",
  OTHER = "other",
}

export enum TransactionType {
  BUY = "buy",
  SELL = "sell",
  DIVIDEND = "dividend",
  SPLIT = "split",
  TRANSFER_IN = "transfer_in",
  TRANSFER_OUT = "transfer_out",
  FEE = "fee",
  INTEREST = "interest",
}

// ============================================================================
// PORTFOLIO INTERFACES
// ============================================================================

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  portfolio_type: PortfolioType;
  linked_account_id?: string;
  total_value: number;
  total_cost_basis: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
  day_change: number;
  day_change_percent: number;
  risk_level?: RiskLevel;
  risk_score?: number; // 1-10
  diversification_score?: number; // 0-100
  target_allocation?: Record<string, number>; // { 'stocks': 60, 'bonds': 40 }
  rebalance_threshold: number; // percentage
  last_rebalance_at?: Date;
  last_updated_at: Date;
  created_at: Date;
}

export interface PortfolioCreateInput {
  name: string;
  description?: string;
  portfolio_type?: PortfolioType;
  linked_account_id?: string;
  risk_level?: RiskLevel;
  target_allocation?: Record<string, number>;
  rebalance_threshold?: number;
}

export interface PortfolioUpdateInput {
  name?: string;
  description?: string;
  risk_level?: RiskLevel;
  target_allocation?: Record<string, number>;
  rebalance_threshold?: number;
}

// ============================================================================
// HOLDING INTERFACES
// ============================================================================

export interface Holding {
  id: string;
  portfolio_id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  quantity: number;
  average_cost: number;
  current_price?: number;
  current_value?: number;
  gain_loss?: number;
  gain_loss_percent?: number;
  day_change?: number;
  day_change_percent?: number;
  allocation_percent?: number;
  sector?: string;
  industry?: string;
  country: string;
  currency: string;
  dividend_yield?: number;
  annual_dividend?: number;
  ex_dividend_date?: Date;
  pe_ratio?: number;
  market_cap?: number;
  ai_analysis?: Record<string, any>;
  last_price_update?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface HoldingCreateInput {
  portfolio_id: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  quantity: number;
  average_cost: number;
  sector?: string;
  industry?: string;
  country?: string;
  currency?: string;
}

export interface HoldingUpdateInput {
  quantity?: number;
  average_cost?: number;
  current_price?: number;
  sector?: string;
  industry?: string;
}

// ============================================================================
// TRANSACTION INTERFACES
// ============================================================================

export interface Transaction {
  id: string;
  portfolio_id: string;
  holding_id?: string;
  user_id: string;
  transaction_type: TransactionType;
  symbol: string;
  quantity: number;
  price: number;
  total_amount: number;
  fees: number;
  realized_gain_loss?: number;
  notes?: string;
  transaction_date: Date;
  settlement_date?: Date;
  external_id?: string;
  created_at: Date;
}

export interface TransactionCreateInput {
  portfolio_id: string;
  holding_id?: string;
  transaction_type: TransactionType;
  symbol: string;
  quantity: number;
  price: number;
  fees?: number;
  realized_gain_loss?: number;
  notes?: string;
  transaction_date: Date;
  settlement_date?: Date;
  external_id?: string;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const PortfolioTypeSchema = z.enum([
  "manual",
  "linked",
  "simulated",
  "paper_trading",
]);
export const RiskLevelSchema = z.enum([
  "conservative",
  "moderate",
  "aggressive",
  "very_aggressive",
]);
export const AssetTypeSchema = z.enum([
  "stock",
  "etf",
  "mutual_fund",
  "bond",
  "crypto",
  "option",
  "future",
  "cash",
  "other",
]);
export const TransactionTypeSchema = z.enum([
  "buy",
  "sell",
  "dividend",
  "split",
  "transfer_in",
  "transfer_out",
  "fee",
  "interest",
]);

export const PortfolioCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  portfolio_type: PortfolioTypeSchema.default("manual"),
  linked_account_id: z.string().optional(),
  risk_level: RiskLevelSchema.optional(),
  target_allocation: z.record(z.string(), z.number()).optional(),
  rebalance_threshold: z.number().min(0).max(100).default(5),
});

export const PortfolioUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  risk_level: RiskLevelSchema.optional(),
  target_allocation: z.record(z.string(), z.number()).optional(),
  rebalance_threshold: z.number().min(0).max(100).optional(),
});

export const HoldingCreateSchema = z.object({
  portfolio_id: z.string().uuid(),
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  asset_type: AssetTypeSchema,
  quantity: z.number().positive(),
  average_cost: z.number().nonnegative(),
  sector: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  country: z.string().length(2).default("US"),
  currency: z.string().length(3).default("USD"),
});

export const HoldingUpdateSchema = z.object({
  quantity: z.number().positive().optional(),
  average_cost: z.number().nonnegative().optional(),
  current_price: z.number().nonnegative().optional(),
  sector: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
});

export const TransactionCreateSchema = z.object({
  portfolio_id: z.string().uuid(),
  holding_id: z.string().uuid().optional(),
  transaction_type: TransactionTypeSchema,
  symbol: z.string().min(1).max(20),
  quantity: z.number(),
  price: z.number().nonnegative(),
  fees: z.number().nonnegative().default(0),
  realized_gain_loss: z.number().optional(),
  notes: z.string().max(1000).optional(),
  transaction_date: z.date(),
  settlement_date: z.date().optional(),
  external_id: z.string().optional(),
});

// ============================================================================
// PORTFOLIO ANALYTICS TYPES
// ============================================================================

export interface PortfolioPerformance {
  portfolio_id: string;
  total_return: number;
  total_return_percent: number;
  annualized_return: number;
  volatility: number; // standard deviation
  sharpe_ratio: number;
  max_drawdown: number;
  max_drawdown_percent: number;
  best_day: { date: Date; return: number };
  worst_day: { date: Date; return: number };
  win_rate: number; // percentage of positive days
  time_period_days: number;
}

export interface AssetAllocation {
  asset_type: AssetType;
  value: number;
  percentage: number;
  target_percentage?: number;
  deviation?: number; // difference from target
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  holdings_count: number;
}

export interface DiversificationMetrics {
  total_holdings: number;
  asset_types_count: number;
  sectors_count: number;
  concentration_risk: number; // 0-100, higher = more concentrated
  diversification_score: number; // 0-100, higher = more diversified
  largest_holding_percent: number;
  top_5_holdings_percent: number;
}

export interface RebalanceRecommendation {
  portfolio_id: string;
  needs_rebalancing: boolean;
  max_deviation: number;
  recommendations: Array<{
    symbol: string;
    current_allocation: number;
    target_allocation: number;
    action: "buy" | "sell" | "hold";
    shares_to_trade?: number;
    amount_to_trade?: number;
  }>;
  estimated_cost: number; // trading fees
  last_rebalance: Date | null;
}
