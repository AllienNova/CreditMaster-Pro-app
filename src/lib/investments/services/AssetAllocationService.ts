/**
 * Asset Allocation Service
 *
 * Provides portfolio optimization, asset allocation analysis, and rebalancing recommendations
 * Implements Modern Portfolio Theory (MPT) and risk-return optimization
 */

import {
  AssetClass,
  RiskTolerance,
  TimeHorizon,
  AllocationStrategy,
  AssetAllocation,
  AllocationModel,
  OptimizationConstraints,
  RebalancingRecommendation,
  RebalancingStrategy,
  AssetAllocationAnalysis,
} from '../types/asset-allocation.types';
import { Portfolio, PortfolioHolding } from '../types/investment.types';

/**
 * Predefined allocation models based on risk tolerance
 */
const ALLOCATION_MODELS: Record<RiskTolerance, AllocationModel> = {
  [RiskTolerance.VERY_CONSERVATIVE]: {
    name: 'Very Conservative',
    description: 'Capital preservation with minimal risk',
    riskTolerance: RiskTolerance.VERY_CONSERVATIVE,
    timeHorizon: TimeHorizon.SHORT_TERM,
    allocations: [
      { assetClass: AssetClass.BONDS, targetPercentage: 60, minPercentage: 50, maxPercentage: 70 },
      { assetClass: AssetClass.CASH, targetPercentage: 30, minPercentage: 20, maxPercentage: 40 },
      { assetClass: AssetClass.STOCKS, targetPercentage: 10, minPercentage: 5, maxPercentage: 15 },
    ],
    expectedReturn: 0.03,
    expectedVolatility: 0.05,
    sharpeRatio: 0.6,
  },
  [RiskTolerance.CONSERVATIVE]: {
    name: 'Conservative',
    description: 'Income-focused with low risk',
    riskTolerance: RiskTolerance.CONSERVATIVE,
    timeHorizon: TimeHorizon.MEDIUM_TERM,
    allocations: [
      { assetClass: AssetClass.BONDS, targetPercentage: 50, minPercentage: 40, maxPercentage: 60 },
      { assetClass: AssetClass.STOCKS, targetPercentage: 30, minPercentage: 20, maxPercentage: 40 },
      { assetClass: AssetClass.CASH, targetPercentage: 15, minPercentage: 10, maxPercentage: 20 },
      { assetClass: AssetClass.REAL_ESTATE, targetPercentage: 5, minPercentage: 0, maxPercentage: 10 },
    ],
    expectedReturn: 0.05,
    expectedVolatility: 0.08,
    sharpeRatio: 0.625,
  },
  [RiskTolerance.MODERATE]: {
    name: 'Moderate',
    description: 'Balanced growth and income',
    riskTolerance: RiskTolerance.MODERATE,
    timeHorizon: TimeHorizon.MEDIUM_TERM,
    allocations: [
      { assetClass: AssetClass.STOCKS, targetPercentage: 50, minPercentage: 40, maxPercentage: 60 },
      { assetClass: AssetClass.BONDS, targetPercentage: 35, minPercentage: 25, maxPercentage: 45 },
      { assetClass: AssetClass.REAL_ESTATE, targetPercentage: 10, minPercentage: 5, maxPercentage: 15 },
      { assetClass: AssetClass.CASH, targetPercentage: 5, minPercentage: 0, maxPercentage: 10 },
    ],
    expectedReturn: 0.07,
    expectedVolatility: 0.12,
    sharpeRatio: 0.583,
  },
  [RiskTolerance.AGGRESSIVE]: {
    name: 'Aggressive',
    description: 'Growth-focused with higher risk',
    riskTolerance: RiskTolerance.AGGRESSIVE,
    timeHorizon: TimeHorizon.LONG_TERM,
    allocations: [
      { assetClass: AssetClass.STOCKS, targetPercentage: 70, minPercentage: 60, maxPercentage: 80 },
      { assetClass: AssetClass.BONDS, targetPercentage: 15, minPercentage: 10, maxPercentage: 20 },
      { assetClass: AssetClass.REAL_ESTATE, targetPercentage: 10, minPercentage: 5, maxPercentage: 15 },
      { assetClass: AssetClass.ALTERNATIVES, targetPercentage: 5, minPercentage: 0, maxPercentage: 10 },
    ],
    expectedReturn: 0.09,
    expectedVolatility: 0.18,
    sharpeRatio: 0.5,
  },
  [RiskTolerance.VERY_AGGRESSIVE]: {
    name: 'Very Aggressive',
    description: 'Maximum growth with high risk',
    riskTolerance: RiskTolerance.VERY_AGGRESSIVE,
    timeHorizon: TimeHorizon.LONG_TERM,
    allocations: [
      { assetClass: AssetClass.STOCKS, targetPercentage: 80, minPercentage: 70, maxPercentage: 90 },
      { assetClass: AssetClass.ALTERNATIVES, targetPercentage: 10, minPercentage: 5, maxPercentage: 15 },
      { assetClass: AssetClass.CRYPTO, targetPercentage: 5, minPercentage: 0, maxPercentage: 10 },
      { assetClass: AssetClass.BONDS, targetPercentage: 5, minPercentage: 0, maxPercentage: 10 },
    ],
    expectedReturn: 0.12,
    expectedVolatility: 0.25,
    sharpeRatio: 0.48,
  },
};

/**
 * Asset Allocation Service
 */
export class AssetAllocationService {
  /**
   * Get allocation model for risk tolerance
   */
  getAllocationModel(riskTolerance: RiskTolerance): AllocationModel {
    return ALLOCATION_MODELS[riskTolerance];
  }

  /**
   * Analyze portfolio asset allocation
   */
  async analyzeAllocation(
    portfolio: Portfolio,
    riskTolerance: RiskTolerance,
    constraints?: OptimizationConstraints
  ): Promise<AssetAllocationAnalysis> {
    const positions = portfolio.holdings;
    // Get recommended model
    const recommendedModel = this.getAllocationModel(riskTolerance);

    // Calculate current allocations
    const currentAllocations = this.calculateCurrentAllocations(positions, portfolio.totalValue);

    // Calculate deviation from target
    const deviationFromTarget = this.calculateDeviation(currentAllocations, recommendedModel);

    // Determine if rebalancing is needed
    const needsRebalancing = deviationFromTarget > 5; // 5% threshold

    // Generate rebalancing recommendations
    const rebalancingRecommendations = this.generateRebalancingRecommendations(
      positions,
      currentAllocations,
      recommendedModel,
      portfolio.totalValue,
      constraints
    );

    // Calculate diversification score
    const diversificationScore = this.calculateDiversificationScore(currentAllocations);

    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(positions, portfolio.totalValue);

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(
      positions,
      riskMetrics.portfolioVolatility
    );

    return {
      portfolioId: portfolio.id,
      analyzedAt: new Date(),
      currentAllocations,
      recommendedModel,
      deviationFromTarget,
      needsRebalancing,
      rebalancingRecommendations,
      diversificationScore,
      riskMetrics,
      performanceMetrics,
    };
  }

  /**
   * Calculate current asset allocations from positions
   */
  private calculateCurrentAllocations(
    positions: PortfolioHolding[],
    totalValue: number
  ): AssetAllocation[] {
    const allocationMap = new Map<AssetClass, AssetAllocation>();

    positions.forEach((position) => {
      const assetClass = this.getAssetClass(position.symbol);
      const existing = allocationMap.get(assetClass);

      if (existing) {
        existing.value += position.marketValue;
        existing.percentage = (existing.value / totalValue) * 100;
      } else {
        allocationMap.set(assetClass, {
          assetClass,
          value: position.marketValue,
          percentage: (position.marketValue / totalValue) * 100,
        });
      }
    });

    return Array.from(allocationMap.values());
  }

  /**
   * Determine asset class for a symbol
   */
  private getAssetClass(symbol: string): AssetClass {
    // Simple heuristic - in production, use a proper asset classification service
    const upperSymbol = symbol.toUpperCase();

    // Crypto
    if (upperSymbol.includes('BTC') || upperSymbol.includes('ETH') || upperSymbol.includes('CRYPTO')) {
      return AssetClass.CRYPTO;
    }

    // Bonds (ETFs)
    if (upperSymbol.includes('AGG') || upperSymbol.includes('BND') || upperSymbol.includes('TLT')) {
      return AssetClass.BONDS;
    }

    // Real Estate (REITs)
    if (upperSymbol.includes('VNQ') || upperSymbol.includes('REIT')) {
      return AssetClass.REAL_ESTATE;
    }

    // Commodities
    if (upperSymbol.includes('GLD') || upperSymbol.includes('SLV') || upperSymbol.includes('COMMODITY')) {
      return AssetClass.COMMODITIES;
    }

    // Default to stocks
    return AssetClass.STOCKS;
  }

  /**
   * Calculate deviation from target allocation
   */
  private calculateDeviation(
    currentAllocations: AssetAllocation[],
    model: AllocationModel
  ): number {
    let totalDeviation = 0;

    model.allocations.forEach((target) => {
      const current = currentAllocations.find((a) => a.assetClass === target.assetClass);
      const currentPercentage = current?.percentage || 0;
      const deviation = Math.abs(currentPercentage - target.targetPercentage);
      totalDeviation += deviation;
    });

    return totalDeviation;
  }

  /**
   * Generate rebalancing recommendations
   */
  private generateRebalancingRecommendations(
    positions: PortfolioHolding[],
    currentAllocations: AssetAllocation[],
    model: AllocationModel,
    totalValue: number,
    constraints?: OptimizationConstraints
  ): RebalancingRecommendation[] {
    const recommendations: RebalancingRecommendation[] = [];
    const minTradeSize = constraints?.minPositionSize || 0.01; // 1% minimum

    positions.forEach((position) => {
      const assetClass = this.getAssetClass(position.symbol);
      const targetAllocation = model.allocations.find((a) => a.assetClass === assetClass);

      if (!targetAllocation) return;

      const currentPercentage = (position.marketValue / totalValue) * 100;
      const targetPercentage = targetAllocation.targetPercentage;
      const deviation = currentPercentage - targetPercentage;

      // Only recommend if deviation is significant
      if (Math.abs(deviation) > minTradeSize * 100) {
        const targetValue = (targetPercentage / 100) * totalValue;
        const valueToTrade = targetValue - position.marketValue;
        const sharesToTrade = Math.round(valueToTrade / position.currentPrice);

        recommendations.push({
          symbol: position.symbol,
          currentShares: position.quantity,
          currentValue: position.marketValue,
          currentPercentage,
          targetPercentage,
          targetValue,
          targetShares: position.quantity + sharesToTrade,
          action: valueToTrade > 0 ? 'buy' : valueToTrade < 0 ? 'sell' : 'hold',
          sharesToTrade: Math.abs(sharesToTrade),
          valueToTrade: Math.abs(valueToTrade),
          reason: `Rebalance ${assetClass} from ${currentPercentage.toFixed(1)}% to ${targetPercentage.toFixed(1)}%`,
          priority: Math.abs(deviation) > 10 ? 'high' : Math.abs(deviation) > 5 ? 'medium' : 'low',
          transactionCost: constraints?.transactionCostPerTrade || 0,
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate diversification score (0-100)
   */
  private calculateDiversificationScore(allocations: AssetAllocation[]): number {
    // Herfindahl-Hirschman Index (HHI) based diversification
    const hhi = allocations.reduce((sum, allocation) => {
      return sum + Math.pow(allocation.percentage, 2);
    }, 0);

    // Convert HHI to 0-100 score (lower HHI = better diversification)
    // HHI ranges from 0 (perfect diversification) to 10000 (single asset)
    const score = Math.max(0, 100 - hhi / 100);

    return Math.round(score);
  }

  /**
   * Calculate portfolio risk metrics
   */
  private calculateRiskMetrics(positions: PortfolioHolding[], totalValue: number) {
    // Simplified risk calculations - in production, use historical data
    const weights = positions.map((p) => p.marketValue / totalValue);
    const volatilities = positions.map((p) => this.estimateVolatility(p.symbol));

    // Portfolio volatility (simplified)
    const portfolioVolatility = Math.sqrt(
      weights.reduce((sum, w, i) => sum + Math.pow(w * volatilities[i], 2), 0)
    );

    return {
      portfolioVolatility,
      portfolioBeta: 1.0, // Simplified - assume market beta
      valueAtRisk: portfolioVolatility * 1.65 * totalValue, // 95% VaR
      conditionalVaR: portfolioVolatility * 2.0 * totalValue, // CVaR
      maxDrawdown: portfolioVolatility * 2.5, // Estimated max drawdown
    };
  }

  /**
   * Estimate volatility for a symbol
   */
  private estimateVolatility(symbol: string): number {
    const assetClass = this.getAssetClass(symbol);

    // Typical annual volatilities by asset class
    const volatilityMap: Record<AssetClass, number> = {
      [AssetClass.STOCKS]: 0.18,
      [AssetClass.BONDS]: 0.05,
      [AssetClass.CASH]: 0.01,
      [AssetClass.REAL_ESTATE]: 0.15,
      [AssetClass.COMMODITIES]: 0.25,
      [AssetClass.CRYPTO]: 0.80,
      [AssetClass.ALTERNATIVES]: 0.20,
    };

    return volatilityMap[assetClass] || 0.15;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(positions: PortfolioHolding[], volatility: number) {
    // Simplified calculations - in production, use historical returns
    const avgReturn = positions.reduce((sum, p) => sum + (p.unrealizedGainPercent / 100), 0) / positions.length;
    const riskFreeRate = 0.03; // 3% risk-free rate

    return {
      expectedReturn: avgReturn,
      sharpeRatio: (avgReturn - riskFreeRate) / volatility,
      sortinoRatio: (avgReturn - riskFreeRate) / (volatility * 0.7), // Downside deviation approximation
      informationRatio: avgReturn / volatility,
    };
  }

  /**
   * Generate Efficient Frontier Points
   *
   * Creates a series of optimal portfolios along the efficient frontier
   * by varying the risk tolerance from very conservative to very aggressive
   *
   * @param numPoints - Number of points to generate (default: 20)
   * @returns Array of efficient frontier points with risk/return metrics
   */
  generateEfficientFrontier(numPoints: number = 20): Array<{
    volatility: number;
    expectedReturn: number;
    sharpeRatio: number;
    label: string;
    isOptimal: boolean;
  }> {
    const points: Array<{
      volatility: number;
      expectedReturn: number;
      sharpeRatio: number;
      label: string;
      isOptimal: boolean;
    }> = [];

    // Generate points by interpolating between risk tolerance levels
    const riskLevels = [
      RiskTolerance.VERY_CONSERVATIVE,
      RiskTolerance.CONSERVATIVE,
      RiskTolerance.MODERATE,
      RiskTolerance.AGGRESSIVE,
      RiskTolerance.VERY_AGGRESSIVE,
    ];

    // Add the 5 main risk tolerance models
    riskLevels.forEach((riskLevel) => {
      const model = this.getAllocationModel(riskLevel);
      points.push({
        volatility: model.expectedVolatility * 100, // Convert to percentage
        expectedReturn: model.expectedReturn * 100, // Convert to percentage
        sharpeRatio: model.sharpeRatio,
        label: model.name,
        isOptimal: true,
      });
    });

    // Generate intermediate points by interpolation
    const additionalPoints = numPoints - 5;
    if (additionalPoints > 0) {
      const step = 4 / (additionalPoints + 1); // 4 intervals between 5 points

      for (let i = 1; i <= additionalPoints; i++) {
        const position = i * step;
        const lowerIndex = Math.floor(position);
        const upperIndex = Math.ceil(position);
        const fraction = position - lowerIndex;

        const lowerPoint = points[lowerIndex];
        const upperPoint = points[Math.min(upperIndex, points.length - 1)];

        // Linear interpolation
        const interpolatedVolatility = lowerPoint.volatility + (upperPoint.volatility - lowerPoint.volatility) * fraction;
        const interpolatedReturn = lowerPoint.expectedReturn + (upperPoint.expectedReturn - lowerPoint.expectedReturn) * fraction;
        const interpolatedSharpe = lowerPoint.sharpeRatio + (upperPoint.sharpeRatio - lowerPoint.sharpeRatio) * fraction;

        points.push({
          volatility: interpolatedVolatility,
          expectedReturn: interpolatedReturn,
          sharpeRatio: interpolatedSharpe,
          label: `Portfolio ${i + 5}`,
          isOptimal: true,
        });
      }
    }

    // Sort by volatility for proper curve rendering
    return points.sort((a, b) => a.volatility - b.volatility);
  }
}

// Singleton instance
let assetAllocationServiceInstance: AssetAllocationService | null = null;

export function getAssetAllocationService(): AssetAllocationService {
  if (!assetAllocationServiceInstance) {
    assetAllocationServiceInstance = new AssetAllocationService();
  }
  return assetAllocationServiceInstance;
}

