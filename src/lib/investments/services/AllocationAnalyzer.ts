/**
 * Asset Allocation Analyzer Service
 *
 * Analyzes portfolio asset allocation, diversification, concentration risk,
 * and generates rebalancing recommendations.
 */

import { PortfolioService } from "./PortfolioService";
import { AssetType } from "../types/portfolio-db.types";

/**
 * Asset allocation breakdown by type
 */
export interface AssetAllocationBreakdown {
  stocks: number;
  bonds: number;
  cash: number;
  crypto: number;
  other: number;
}

/**
 * Sector allocation breakdown
 */
export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  holdings_count: number;
}

/**
 * Diversification metrics with Herfindahl index
 */
export interface DiversificationMetrics {
  herfindahl_index: number;
  effective_holdings: number;
  concentration_score: number;
  diversification_score: number;
}

/**
 * Rebalancing recommendation for asset type
 */
export interface RebalanceRecommendation {
  asset_type: string;
  current_allocation: number;
  target_allocation: number;
  deviation: number;
  action: "buy" | "sell";
  amount: number;
  priority: "high" | "medium" | "low";
}

/**
 * Concentration risk assessment
 */
export interface ConcentrationRisk {
  symbol: string;
  name: string;
  percentage: number;
  risk_level: "low" | "medium" | "high" | "critical";
  recommendation: string;
}

export class AllocationAnalyzer {
  private portfolioService: PortfolioService;

  constructor(userId: string) {
    this.portfolioService = new PortfolioService(userId);
  }

  /**
   * Calculate asset allocation breakdown by asset type
   * @param portfolioId Portfolio ID
   * @returns Asset allocation by type
   */
  async calculateAssetAllocation(
    portfolioId: string,
  ): Promise<AssetAllocationBreakdown> {
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const holdings = await this.portfolioService.getHoldings(portfolioId);
    if (holdings.length === 0) {
      return {
        stocks: 0,
        bonds: 0,
        cash: 0,
        crypto: 0,
        other: 0,
      };
    }

    const totalValue = holdings.reduce(
      (sum, h) => sum + (h.current_value || 0),
      0,
    );

    if (totalValue === 0) {
      return {
        stocks: 0,
        bonds: 0,
        cash: 0,
        crypto: 0,
        other: 0,
      };
    }

    // Group by asset type
    const allocation: Record<string, number> = {};

    holdings.forEach((holding) => {
      const assetType = holding.asset_type || AssetType.OTHER;
      const value = holding.current_value || 0;

      if (!allocation[assetType]) {
        allocation[assetType] = 0;
      }
      allocation[assetType] += value;
    });

    // Convert to percentages
    const result: AssetAllocationBreakdown = {
      stocks:
        (((allocation[AssetType.STOCK] || 0) +
          (allocation[AssetType.ETF] || 0)) /
          totalValue) *
        100,
      bonds: ((allocation[AssetType.BOND] || 0) / totalValue) * 100,
      cash: ((allocation[AssetType.CASH] || 0) / totalValue) * 100,
      crypto: ((allocation[AssetType.CRYPTO] || 0) / totalValue) * 100,
      other:
        (((allocation[AssetType.MUTUAL_FUND] || 0) +
          (allocation[AssetType.OPTION] || 0) +
          (allocation[AssetType.FUTURE] || 0) +
          (allocation[AssetType.OTHER] || 0)) /
          totalValue) *
        100,
    };

    return result;
  }

  /**
   * Calculate sector allocation breakdown
   * @param portfolioId Portfolio ID
   * @returns Sector allocation array
   */
  async calculateSectorAllocation(
    portfolioId: string,
  ): Promise<SectorAllocation[]> {
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const holdings = await this.portfolioService.getHoldings(portfolioId);
    if (holdings.length === 0) {
      return [];
    }

    const totalValue = holdings.reduce(
      (sum, h) => sum + (h.current_value || 0),
      0,
    );

    if (totalValue === 0) {
      return [];
    }

    // Group by sector
    const sectorMap = new Map<string, { value: number; count: number }>();

    holdings.forEach((holding) => {
      const sector = holding.sector || "Unknown";
      const value = holding.current_value || 0;

      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, { value: 0, count: 0 });
      }

      const current = sectorMap.get(sector)!;
      current.value += value;
      current.count += 1;
    });

    // Convert to array and sort by value
    const sectorAllocations: SectorAllocation[] = Array.from(
      sectorMap.entries(),
    )
      .map(([sector, data]) => ({
        sector,
        value: data.value,
        percentage: (data.value / totalValue) * 100,
        holdings_count: data.count,
      }))
      .sort((a, b) => b.value - a.value);

    return sectorAllocations;
  }

  /**
   * Calculate diversification score and metrics
   * @param portfolioId Portfolio ID
   * @returns Diversification metrics including Herfindahl index
   */
  async calculateDiversificationScore(
    portfolioId: string,
  ): Promise<DiversificationMetrics> {
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const holdings = await this.portfolioService.getHoldings(portfolioId);
    if (holdings.length === 0) {
      return {
        herfindahl_index: 0,
        effective_holdings: 0,
        concentration_score: 0,
        diversification_score: 0,
      };
    }

    const totalValue = holdings.reduce(
      (sum, h) => sum + (h.current_value || 0),
      0,
    );

    if (totalValue === 0) {
      return {
        herfindahl_index: 0,
        effective_holdings: 0,
        concentration_score: 0,
        diversification_score: 0,
      };
    }

    // Calculate Herfindahl-Hirschman Index (HHI)
    // HHI = sum of squared market shares (0 to 10,000)
    let hhi = 0;
    holdings.forEach((holding) => {
      const percentage = ((holding.current_value || 0) / totalValue) * 100;
      hhi += percentage * percentage;
    });

    // Effective number of holdings (1/HHI normalized)
    const effectiveHoldings = hhi > 0 ? 10000 / hhi : 0;

    // Concentration score (0-100, higher = more concentrated)
    const concentrationScore = Math.min(hhi / 100, 100);

    // Diversification score (0-100, higher = more diversified)
    const diversificationScore = 100 - concentrationScore;

    return {
      herfindahl_index: hhi,
      effective_holdings: effectiveHoldings,
      concentration_score: concentrationScore,
      diversification_score: diversificationScore,
    };
  }

  /**
   * Assess concentration risk for individual holdings
   * @param portfolioId Portfolio ID
   * @returns Array of concentration risk assessments
   */
  async assessConcentrationRisk(
    portfolioId: string,
  ): Promise<ConcentrationRisk[]> {
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const holdings = await this.portfolioService.getHoldings(portfolioId);
    if (holdings.length === 0) {
      return [];
    }

    const totalValue = holdings.reduce(
      (sum, h) => sum + (h.current_value || 0),
      0,
    );

    if (totalValue === 0) {
      return [];
    }

    const risks: ConcentrationRisk[] = holdings
      .map((holding) => {
        const percentage = ((holding.current_value || 0) / totalValue) * 100;

        // Determine risk level based on percentage
        let riskLevel: "low" | "medium" | "high" | "critical";
        let recommendation: string;

        if (percentage < 5) {
          riskLevel = "low";
          recommendation = "Position size is well-balanced.";
        } else if (percentage < 10) {
          riskLevel = "medium";
          recommendation = "Consider monitoring this position closely.";
        } else if (percentage < 20) {
          riskLevel = "high";
          recommendation =
            "Position is concentrated. Consider reducing exposure.";
        } else {
          riskLevel = "critical";
          recommendation =
            "Position is highly concentrated. Strongly recommend diversifying.";
        }

        return {
          symbol: holding.symbol,
          name: holding.name,
          percentage,
          risk_level: riskLevel,
          recommendation,
        };
      })
      .filter((risk) => risk.risk_level !== "low") // Only return medium+ risks
      .sort((a, b) => b.percentage - a.percentage);

    return risks;
  }

  /**
   * Generate rebalancing recommendations
   * @param portfolioId Portfolio ID
   * @returns Array of rebalancing recommendations
   */
  async generateRebalancingRecommendations(
    portfolioId: string,
  ): Promise<RebalanceRecommendation[]> {
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const holdings = await this.portfolioService.getHoldings(portfolioId);
    if (holdings.length === 0) {
      return [];
    }

    const targetAllocation = portfolio.target_allocation || {};
    const rebalanceThreshold = portfolio.rebalance_threshold || 5;

    // If no target allocation is set, return empty
    if (Object.keys(targetAllocation).length === 0) {
      return [];
    }

    const currentAllocation = await this.calculateAssetAllocation(portfolioId);
    const totalValue = holdings.reduce(
      (sum, h) => sum + (h.current_value || 0),
      0,
    );

    const recommendations: RebalanceRecommendation[] = [];

    // Check each asset type
    const assetTypes: Array<keyof AssetAllocationBreakdown> = [
      "stocks",
      "bonds",
      "cash",
      "crypto",
      "other",
    ];

    assetTypes.forEach((assetType) => {
      const currentPercent = currentAllocation[assetType] || 0;
      const targetPercent = targetAllocation[assetType] || 0;
      const deviation = currentPercent - targetPercent;

      // Only recommend if deviation exceeds threshold
      if (Math.abs(deviation) > rebalanceThreshold) {
        const action = deviation > 0 ? "sell" : "buy";
        const amount = Math.abs((deviation / 100) * totalValue);

        recommendations.push({
          asset_type: assetType,
          current_allocation: currentPercent,
          target_allocation: targetPercent,
          deviation,
          action,
          amount,
          priority:
            Math.abs(deviation) > rebalanceThreshold * 2 ? "high" : "medium",
        });
      }
    });

    // Sort by absolute deviation (highest priority first)
    recommendations.sort(
      (a, b) => Math.abs(b.deviation) - Math.abs(a.deviation),
    );

    return recommendations;
  }
}
