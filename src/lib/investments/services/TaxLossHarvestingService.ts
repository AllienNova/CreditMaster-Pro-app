/**
 * Tax-Loss Harvesting Service
 *
 * Identifies tax-loss harvesting opportunities and generates tax-optimized rebalancing recommendations
 * Implements IRS wash sale rule validation and multi-year tax benefit projections
 */

import {
  TaxBracket,
  CapitalGainsTreatment,
  TaxLossOpportunity,
  WashSaleViolation,
  TaxOptimizedRecommendation,
  TaxLossHarvestingAnalysis,
  TaxLossHarvestingConfig,
  ReplacementSecuritySuggestion,
} from "../types/tax-loss-harvesting.types";
import { Holding, Transaction } from "../types/portfolio.types";

/**
 * Default configuration for tax-loss harvesting
 */
const DEFAULT_CONFIG: TaxLossHarvestingConfig = {
  taxBracket: TaxBracket.BRACKET_24,
  minLossThreshold: 100,
  transactionCostPerTrade: 0,
  washSaleLookbackDays: 30,
  washSaleLookforwardDays: 30,
  annualLossDeductionLimit: 3000,
  currentYearLossesAlreadyUsed: 0,
  considerStateTax: false,
};

/**
 * Tax-Loss Harvesting Service
 */
export class TaxLossHarvestingService {
  private config: TaxLossHarvestingConfig;

  constructor(config?: Partial<TaxLossHarvestingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze portfolio for tax-loss harvesting opportunities
   */
  async analyzeTaxLossOpportunities(
    holdings: Holding[],
    transactions: Transaction[] = [],
    portfolioId: string = "default",
  ): Promise<TaxLossHarvestingAnalysis> {
    const opportunities = this.identifyTaxLossOpportunities(
      holdings,
      transactions,
    );
    const totalUnrealizedLosses = opportunities.reduce(
      (sum, opp) => sum + opp.unrealizedLoss,
      0,
    );
    const totalEstimatedTaxSavings = opportunities.reduce(
      (sum, opp) => sum + opp.estimatedTaxSavings,
      0,
    );

    // Calculate current year usage and carryforward
    const currentYearLossesUsed = Math.min(
      totalUnrealizedLosses,
      this.config.annualLossDeductionLimit -
        this.config.currentYearLossesAlreadyUsed,
    );
    const carryforwardLosses = Math.max(
      0,
      totalUnrealizedLosses - currentYearLossesUsed,
    );

    // Generate tax-optimized recommendations
    const recommendations = this.generateTaxOptimizedRebalancing(opportunities);

    // Count wash sale warnings
    const washSaleWarnings = opportunities.reduce(
      (count, opp) => count + opp.washSaleViolations.length,
      0,
    );

    return {
      portfolioId,
      analyzedAt: new Date(),
      taxBracket: this.config.taxBracket,
      stateTaxRate: this.config.stateTaxRate,
      opportunities,
      totalUnrealizedLosses,
      totalEstimatedTaxSavings,
      currentYearLossesUsed,
      carryforwardLosses,
      recommendations,
      washSaleWarnings,
      summary: {
        opportunitiesCount: opportunities.length,
        highPriorityCount: opportunities.filter((o) => o.priority === "high")
          .length,
        totalPotentialSavings: totalEstimatedTaxSavings,
        averageSavingsPerOpportunity:
          opportunities.length > 0
            ? totalEstimatedTaxSavings / opportunities.length
            : 0,
        estimatedNetBenefit:
          totalEstimatedTaxSavings -
          opportunities.length * this.config.transactionCostPerTrade,
      },
    };
  }

  /**
   * Identify holdings with unrealized losses
   */
  private identifyTaxLossOpportunities(
    holdings: Holding[],
    transactions: Transaction[],
  ): TaxLossOpportunity[] {
    const opportunities: TaxLossOpportunity[] = [];

    for (const holding of holdings) {
      // Holding type has: shares, averageCostBasis, currentPrice, totalValue, totalCost
      const costBasis = holding.totalCost;
      const currentValue = holding.totalValue;
      const unrealizedLoss = costBasis - currentValue;

      // Skip if not a loss or below threshold
      if (unrealizedLoss <= this.config.minLossThreshold) {
        continue;
      }

      // Calculate holding period (use createdAt as purchase date)
      const purchaseDate = new Date(holding.createdAt);
      const holdingPeriodDays = Math.floor(
        (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Determine capital gains treatment
      const capitalGainsTreatment =
        holdingPeriodDays >= 365
          ? CapitalGainsTreatment.LONG_TERM
          : CapitalGainsTreatment.SHORT_TERM;

      // Calculate tax savings
      const estimatedTaxSavings = this.calculateTaxSavings(
        unrealizedLoss,
        capitalGainsTreatment,
      );

      // Check for wash sale violations
      const washSaleViolations = this.validateWashSaleRules(
        holding,
        transactions,
      );
      const washSaleRisk = this.assessWashSaleRisk(washSaleViolations);

      // Determine priority
      const priority = this.determinePriority(
        unrealizedLoss,
        estimatedTaxSavings,
        washSaleRisk,
      );

      // Determine recommended action
      const recommendedAction = this.determineRecommendedAction(
        washSaleRisk,
        priority,
      );

      opportunities.push({
        holding,
        unrealizedLoss,
        costBasis,
        currentValue,
        lossPercentage: (unrealizedLoss / costBasis) * 100,
        holdingPeriodDays,
        capitalGainsTreatment,
        estimatedTaxSavings,
        washSaleRisk,
        washSaleViolations,
        priority,
        recommendedAction,
      });
    }

    // Sort by priority and tax savings
    return opportunities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.estimatedTaxSavings - a.estimatedTaxSavings;
    });
  }

  /**
   * Calculate tax savings from harvesting a loss
   */
  calculateTaxSavings(
    unrealizedLoss: number,
    capitalGainsTreatment: CapitalGainsTreatment,
  ): number {
    // For short-term losses, use ordinary income tax rate
    // For long-term losses, use long-term capital gains rate (typically lower)
    const federalRate =
      capitalGainsTreatment === CapitalGainsTreatment.SHORT_TERM
        ? this.config.taxBracket
        : this.getLongTermCapitalGainsRate(this.config.taxBracket);

    let taxSavings = unrealizedLoss * federalRate;

    // Add state tax if applicable
    if (this.config.considerStateTax && this.config.stateTaxRate) {
      taxSavings += unrealizedLoss * this.config.stateTaxRate;
    }

    return taxSavings;
  }

  /**
   * Get long-term capital gains rate based on tax bracket
   */
  private getLongTermCapitalGainsRate(taxBracket: TaxBracket): number {
    // 2024 long-term capital gains rates
    if (taxBracket <= TaxBracket.BRACKET_12) {
      return 0.0; // 0% for lower brackets
    } else if (taxBracket <= TaxBracket.BRACKET_35) {
      return 0.15; // 15% for middle brackets
    } else {
      return 0.2; // 20% for highest bracket
    }
  }

  /**
   * Validate wash sale rules (IRS 30-day rule)
   */
  validateWashSaleRules(
    holding: Holding,
    transactions: Transaction[],
  ): WashSaleViolation[] {
    const violations: WashSaleViolation[] = [];
    const saleDate = new Date(); // Assume selling today

    // Check for purchases of the same security within 30 days before/after
    for (const transaction of transactions) {
      if (transaction.symbol !== holding.symbol) {
        continue;
      }

      const transactionDate = new Date(transaction.date);
      const daysDiff = Math.floor(
        (saleDate.getTime() - transactionDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Check 30 days before
      if (
        daysDiff >= 0 &&
        daysDiff <= this.config.washSaleLookbackDays &&
        transaction.type === "buy"
      ) {
        violations.push({
          violationType: "purchase_before",
          symbol: transaction.symbol,
          transactionDate,
          daysFromSale: daysDiff,
          description: `Purchased ${transaction.shares} shares ${daysDiff} days before planned sale`,
          severity: "error",
        });
      }

      // Check 30 days after (for planned future purchases)
      if (
        daysDiff < 0 &&
        Math.abs(daysDiff) <= this.config.washSaleLookforwardDays &&
        transaction.type === "buy"
      ) {
        violations.push({
          violationType: "purchase_after",
          symbol: transaction.symbol,
          transactionDate,
          daysFromSale: Math.abs(daysDiff),
          description: `Planned purchase ${Math.abs(daysDiff)} days after sale may trigger wash sale`,
          severity: "warning",
        });
      }
    }

    return violations;
  }

  /**
   * Assess wash sale risk level
   */
  private assessWashSaleRisk(
    violations: WashSaleViolation[],
  ): "none" | "low" | "medium" | "high" {
    if (violations.length === 0) return "none";

    const errorCount = violations.filter((v) => v.severity === "error").length;
    const warningCount = violations.filter(
      (v) => v.severity === "warning",
    ).length;

    if (errorCount > 0) return "high";
    if (warningCount > 2) return "medium";
    if (warningCount > 0) return "low";
    return "none";
  }

  /**
   * Determine priority for tax-loss harvesting opportunity
   */
  private determinePriority(
    unrealizedLoss: number,
    estimatedTaxSavings: number,
    washSaleRisk: "none" | "low" | "medium" | "high",
  ): "high" | "medium" | "low" {
    // High priority: Large losses, high savings, no wash sale risk
    if (
      unrealizedLoss > 1000 &&
      estimatedTaxSavings > 300 &&
      washSaleRisk === "none"
    ) {
      return "high";
    }

    // Low priority: Small losses or high wash sale risk
    if (unrealizedLoss < 500 || washSaleRisk === "high") {
      return "low";
    }

    return "medium";
  }

  /**
   * Determine recommended action
   */
  private determineRecommendedAction(
    washSaleRisk: "none" | "low" | "medium" | "high",
    priority: "high" | "medium" | "low",
  ): "sell" | "hold" | "review" {
    if (washSaleRisk === "high") return "hold";
    if (washSaleRisk === "medium") return "review";
    if (priority === "high" || priority === "medium") return "sell";
    return "review";
  }

  /**
   * Generate tax-optimized rebalancing recommendations
   */
  generateTaxOptimizedRebalancing(
    opportunities: TaxLossOpportunity[],
  ): TaxOptimizedRecommendation[] {
    const recommendations: TaxOptimizedRecommendation[] = [];

    for (const opportunity of opportunities) {
      if (opportunity.recommendedAction === "hold") {
        continue; // Skip high wash sale risk positions
      }

      const recommendation: TaxOptimizedRecommendation = {
        symbol: opportunity.holding.symbol,
        action: opportunity.recommendedAction === "sell" ? "sell" : "hold",
        quantity: opportunity.holding.shares,
        estimatedProceeds: opportunity.currentValue,
        taxImpact: opportunity.estimatedTaxSavings,
        washSaleCompliant: opportunity.washSaleRisk === "none",
        replacementSuggestions: this.getReplacementSuggestions(
          opportunity.holding,
        ),
        notes: this.generateRecommendationNotes(opportunity),
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * Get replacement security suggestions to avoid wash sales
   */
  private getReplacementSuggestions(holding: Holding): string[] {
    // Simplified replacement suggestions based on asset type
    const suggestions: Record<string, string[]> = {
      stock: ["VTI", "VOO", "SPY"], // Broad market ETFs
      etf: ["VTI", "VOO", "SPY"], // Broad market ETFs
      bond: ["AGG", "BND", "TLT"], // Bond ETFs
      mutual_fund: ["VTSAX", "VFIAX", "FXAIX"], // Index funds
      crypto: ["BTC", "ETH"], // Major cryptocurrencies
      other: ["VTI", "VOO", "SPY"], // Default to broad market
    };

    const assetType = holding.assetType || "stock";
    return suggestions[assetType] || suggestions.stock;
  }

  /**
   * Generate notes for recommendation
   */
  private generateRecommendationNotes(opportunity: TaxLossOpportunity): string {
    const notes: string[] = [];

    notes.push(
      `Unrealized loss: $${opportunity.unrealizedLoss.toFixed(2)} (${opportunity.lossPercentage.toFixed(1)}%)`,
    );
    notes.push(
      `Estimated tax savings: $${opportunity.estimatedTaxSavings.toFixed(2)}`,
    );
    notes.push(
      `Holding period: ${opportunity.holdingPeriodDays} days (${opportunity.capitalGainsTreatment})`,
    );

    if (opportunity.washSaleViolations.length > 0) {
      notes.push(
        `${opportunity.washSaleViolations.length} wash sale warning(s) - review before executing`,
      );
    }

    if (opportunity.recommendedAction === "sell") {
      notes.push("Recommended for immediate tax-loss harvesting");
    } else if (opportunity.recommendedAction === "review") {
      notes.push("Review wash sale implications before proceeding");
    }

    return notes.join(" | ");
  }
}

// Singleton instance
let taxLossHarvestingServiceInstance: TaxLossHarvestingService | null = null;

export function getTaxLossHarvestingService(
  config?: Partial<TaxLossHarvestingConfig>,
): TaxLossHarvestingService {
  if (!taxLossHarvestingServiceInstance || config) {
    taxLossHarvestingServiceInstance = new TaxLossHarvestingService(config);
  }
  return taxLossHarvestingServiceInstance;
}
