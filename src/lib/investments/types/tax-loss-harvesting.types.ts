/**
 * Tax-Loss Harvesting Types
 *
 * Type definitions for tax-loss harvesting optimization
 */

import { Holding } from "./portfolio.types";

/**
 * Federal Tax Brackets (2024 IRS rates)
 */
export enum TaxBracket {
  BRACKET_10 = 0.1,
  BRACKET_12 = 0.12,
  BRACKET_22 = 0.22,
  BRACKET_24 = 0.24,
  BRACKET_32 = 0.32,
  BRACKET_35 = 0.35,
  BRACKET_37 = 0.37,
}

/**
 * Capital Gains Tax Treatment
 */
export enum CapitalGainsTreatment {
  SHORT_TERM = "short_term", // Held < 1 year, taxed as ordinary income
  LONG_TERM = "long_term", // Held >= 1 year, preferential rates (0%, 15%, 20%)
}

/**
 * Tax-Loss Opportunity
 * Represents a holding with unrealized losses that can be harvested for tax benefits
 */
export interface TaxLossOpportunity {
  holding: Holding;
  unrealizedLoss: number;
  costBasis: number;
  currentValue: number;
  lossPercentage: number;
  holdingPeriodDays: number;
  capitalGainsTreatment: CapitalGainsTreatment;
  estimatedTaxSavings: number;
  washSaleRisk: "none" | "low" | "medium" | "high";
  washSaleViolations: WashSaleViolation[];
  priority: "high" | "medium" | "low";
  recommendedAction: "sell" | "hold" | "review";
}

/**
 * Wash Sale Violation
 * IRS 30-day wash sale rule violation
 */
export interface WashSaleViolation {
  violationType:
    | "purchase_before"
    | "purchase_after"
    | "substantially_identical";
  symbol: string;
  transactionDate: Date;
  daysFromSale: number;
  description: string;
  severity: "warning" | "error";
}

/**
 * Tax-Optimized Rebalancing Recommendation
 */
export interface TaxOptimizedRecommendation {
  symbol: string;
  action: "sell" | "buy" | "hold";
  quantity: number;
  estimatedProceeds?: number;
  taxImpact: number; // Positive = savings, Negative = liability
  washSaleCompliant: boolean;
  replacementSuggestions?: string[]; // Alternative securities to maintain allocation
  notes: string;
}

/**
 * Tax-Loss Harvesting Analysis Result
 */
export interface TaxLossHarvestingAnalysis {
  portfolioId: string;
  analyzedAt: Date;
  taxBracket: TaxBracket;
  stateTaxRate?: number;
  opportunities: TaxLossOpportunity[];
  totalUnrealizedLosses: number;
  totalEstimatedTaxSavings: number;
  currentYearLossesUsed: number; // Amount applied to current year ($3,000 limit)
  carryforwardLosses: number; // Losses carried forward to future years
  recommendations: TaxOptimizedRecommendation[];
  washSaleWarnings: number;
  summary: {
    opportunitiesCount: number;
    highPriorityCount: number;
    totalPotentialSavings: number;
    averageSavingsPerOpportunity: number;
    estimatedNetBenefit: number; // After transaction costs
  };
}

/**
 * Tax-Loss Harvesting Configuration
 */
export interface TaxLossHarvestingConfig {
  taxBracket: TaxBracket;
  stateTaxRate?: number; // Optional state tax rate (e.g., 0.05 for 5%)
  minLossThreshold: number; // Minimum loss amount to consider (default: $100)
  transactionCostPerTrade: number; // Cost to execute trade (default: $0)
  washSaleLookbackDays: number; // Days to look back for wash sales (default: 30)
  washSaleLookforwardDays: number; // Days to look forward for wash sales (default: 30)
  annualLossDeductionLimit: number; // IRS annual limit (default: $3,000)
  currentYearLossesAlreadyUsed: number; // Losses already harvested this year
  considerStateTax: boolean; // Whether to include state tax in calculations
}

/**
 * Replacement Security Suggestion
 * Alternative securities to maintain asset allocation while avoiding wash sales
 */
export interface ReplacementSecuritySuggestion {
  originalSymbol: string;
  replacementSymbol: string;
  replacementName: string;
  assetClass: string;
  sector?: string;
  correlationScore: number; // 0-1, how similar to original (lower is better for wash sale avoidance)
  expenseRatio?: number;
  reasoning: string;
}

/**
 * Tax-Loss Harvesting Transaction
 * Record of executed tax-loss harvesting trade
 */
export interface TaxLossHarvestingTransaction {
  id: string;
  portfolioId: string;
  executedAt: Date;
  symbol: string;
  quantity: number;
  salePrice: number;
  costBasis: number;
  realizedLoss: number;
  taxSavings: number;
  replacementSymbol?: string;
  washSaleCompliant: boolean;
  notes?: string;
}
