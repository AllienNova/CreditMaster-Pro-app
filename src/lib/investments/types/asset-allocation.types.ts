/**
 * Asset Allocation Types
 *
 * Type definitions for portfolio asset allocation, optimization, and rebalancing
 */

/**
 * Asset classes for portfolio allocation
 */
export enum AssetClass {
  STOCKS = "stocks",
  BONDS = "bonds",
  CASH = "cash",
  REAL_ESTATE = "real_estate",
  COMMODITIES = "commodities",
  CRYPTO = "crypto",
  ALTERNATIVES = "alternatives",
}

/**
 * Risk tolerance levels
 */
export enum RiskTolerance {
  VERY_CONSERVATIVE = "very_conservative",
  CONSERVATIVE = "conservative",
  MODERATE = "moderate",
  AGGRESSIVE = "aggressive",
  VERY_AGGRESSIVE = "very_aggressive",
}

/**
 * Investment time horizon
 */
export enum TimeHorizon {
  SHORT_TERM = "short_term", // < 3 years
  MEDIUM_TERM = "medium_term", // 3-10 years
  LONG_TERM = "long_term", // > 10 years
}

/**
 * Allocation strategy types
 */
export enum AllocationStrategy {
  STRATEGIC = "strategic", // Long-term, buy-and-hold
  TACTICAL = "tactical", // Active, market-timing
  DYNAMIC = "dynamic", // Adaptive based on market conditions
  RISK_PARITY = "risk_parity", // Equal risk contribution
  TARGET_DATE = "target_date", // Age-based glide path
}

/**
 * Current asset allocation
 */
export interface AssetAllocation {
  assetClass: AssetClass;
  percentage: number;
  value: number;
  targetPercentage?: number;
  deviation?: number; // Difference from target
}

/**
 * Target allocation model
 */
export interface AllocationModel {
  name: string;
  description: string;
  riskTolerance: RiskTolerance;
  timeHorizon: TimeHorizon;
  allocations: {
    assetClass: AssetClass;
    targetPercentage: number;
    minPercentage: number;
    maxPercentage: number;
  }[];
  expectedReturn: number; // Annual expected return
  expectedVolatility: number; // Annual volatility (std dev)
  sharpeRatio: number; // Risk-adjusted return
}

/**
 * Portfolio optimization constraints
 */
export interface OptimizationConstraints {
  minPositionSize?: number; // Minimum % per position
  maxPositionSize?: number; // Maximum % per position
  maxAssetClassConcentration?: number; // Max % in single asset class
  allowShortSelling?: boolean;
  targetReturn?: number;
  maxVolatility?: number;
  transactionCostPerTrade?: number;
  taxRate?: number;
}

/**
 * Rebalancing recommendation
 */
export interface RebalancingRecommendation {
  symbol: string;
  currentShares: number;
  currentValue: number;
  currentPercentage: number;
  targetPercentage: number;
  targetValue: number;
  targetShares: number;
  action: "buy" | "sell" | "hold";
  sharesToTrade: number;
  valueToTrade: number;
  reason: string;
  priority: "high" | "medium" | "low";
  taxImpact?: number; // Estimated tax impact
  transactionCost?: number;
}

/**
 * Rebalancing strategy
 */
export interface RebalancingStrategy {
  type: "threshold" | "calendar" | "hybrid";
  thresholdPercentage?: number; // Rebalance if deviation > threshold
  calendarFrequency?: "monthly" | "quarterly" | "annually";
  minimumTradeSize?: number; // Don't trade if < this amount
  taxLossHarvestingEnabled?: boolean;
  considerTransactionCosts?: boolean;
}

/**
 * Asset allocation analysis result
 */
export interface AssetAllocationAnalysis {
  portfolioId: string;
  analyzedAt: Date;
  currentAllocations: AssetAllocation[];
  recommendedModel: AllocationModel;
  deviationFromTarget: number; // Overall deviation percentage
  needsRebalancing: boolean;
  rebalancingRecommendations: RebalancingRecommendation[];
  diversificationScore: number; // 0-100
  riskMetrics: {
    portfolioVolatility: number;
    portfolioBeta: number;
    valueAtRisk: number; // VaR at 95% confidence
    conditionalVaR: number; // CVaR (expected shortfall)
    maxDrawdown: number;
  };
  performanceMetrics: {
    expectedReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    informationRatio: number;
  };
  correlationMatrix?: Record<string, Record<string, number>>;
  efficientFrontier?: {
    returns: number[];
    volatilities: number[];
    sharpeRatios: number[];
  };
}
