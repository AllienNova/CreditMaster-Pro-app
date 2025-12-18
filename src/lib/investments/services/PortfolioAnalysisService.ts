/**
 * Portfolio Analysis Service
 * 
 * Comprehensive portfolio risk and performance analysis:
 * - Risk metrics (VaR, Sharpe, Beta, Correlation)
 * - Position sizing recommendations
 * - Diversification analysis
 * - Stress testing and scenario analysis
 * - Rebalancing recommendations
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PortfolioHolding {
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  sector?: string;
  assetClass?: AssetClass;
  weight?: number;
}

export type AssetClass = 'stock' | 'etf' | 'bond' | 'crypto' | 'commodity' | 'cash' | 'option' | 'reit';

export interface PortfolioMetrics {
  // Value metrics
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;

  // Risk metrics
  beta: number;
  alpha: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  valueAtRisk: VaRMetrics;

  // Correlation
  correlationToMarket: number;
  correlationMatrix?: Record<string, Record<string, number>>;

  // Diversification
  diversificationScore: number;
  concentrationRisk: number;
  sectorExposure: Record<string, number>;
  assetClassAllocation: Record<AssetClass, number>;

  // Performance
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  ytdReturn: number;
  annualizedReturn: number;
}

export interface VaRMetrics {
  daily95: number;
  daily99: number;
  weekly95: number;
  monthly95: number;
}

export interface PositionSizeRecommendation {
  symbol: string;
  recommendedShares: number;
  recommendedValue: number;
  maxPositionSize: number;
  riskPerShare: number;
  reasoning: string;
}

export interface DiversificationAnalysis {
  score: number;  // 0-100
  sectorDiversification: number;
  assetClassDiversification: number;
  geographicDiversification: number;
  recommendations: string[];
  overweightedSectors: string[];
  underweightedSectors: string[];
}

export interface StressTestResult {
  scenario: string;
  portfolioImpact: number;  // percentage change
  affectedHoldings: { symbol: string; impact: number }[];
  recommendation: string;
}

export interface RebalanceRecommendation {
  trades: RebalanceTrade[];
  currentRisk: number;
  projectedRisk: number;
  estimatedCost: number;
  taxImplications: TaxImplication[];
}

export interface RebalanceTrade {
  symbol: string;
  action: 'buy' | 'sell';
  shares: number;
  value: number;
  currentWeight: number;
  targetWeight: number;
}

export interface TaxImplication {
  symbol: string;
  gainLoss: number;
  holdingPeriod: 'short_term' | 'long_term';
  estimatedTax: number;
}

// ============================================================================
// PORTFOLIO ANALYSIS SERVICE
// ============================================================================

export class PortfolioAnalysisService {
  private riskFreeRate = 0.05;  // 5% annual risk-free rate

  // ============================================================================
  // MAIN ANALYSIS METHOD
  // ============================================================================

  analyzePortfolio(holdings: PortfolioHolding[]): PortfolioMetrics {
    const totalValue = this.calculateTotalValue(holdings);
    const totalCostBasis = holdings.reduce((sum, h) => sum + (h.shares * h.costBasis), 0);

    // Add weights to holdings
    const weightedHoldings = holdings.map(h => ({
      ...h,
      weight: (h.shares * h.currentPrice) / totalValue,
    }));

    // Calculate all metrics
    const returns = this.estimateReturns(weightedHoldings);
    const riskMetrics = this.calculateRiskMetrics(weightedHoldings, returns);
    const diversification = this.analyzeDiversification(weightedHoldings);

    return {
      totalValue,
      totalCostBasis,
      totalGainLoss: totalValue - totalCostBasis,
      totalGainLossPercent: ((totalValue - totalCostBasis) / totalCostBasis) * 100,
      ...riskMetrics,
      diversificationScore: diversification.score,
      concentrationRisk: this.calculateConcentrationRisk(weightedHoldings),
      sectorExposure: this.calculateSectorExposure(weightedHoldings),
      assetClassAllocation: this.calculateAssetClassAllocation(weightedHoldings),
      ...returns,
    };
  }

  private calculateTotalValue(holdings: PortfolioHolding[]): number {
    return holdings.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
  }

  // ============================================================================
  // RETURNS ESTIMATION
  // ============================================================================

  private estimateReturns(holdings: PortfolioHolding[]): {
    dailyReturn: number;
    weeklyReturn: number;
    monthlyReturn: number;
    ytdReturn: number;
    annualizedReturn: number;
  } {
    // Calculate weighted average return based on cost basis vs current
    const totalCost = holdings.reduce((sum, h) => sum + (h.shares * h.costBasis), 0);
    const totalValue = holdings.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
    const totalReturn = ((totalValue - totalCost) / totalCost) * 100;

    // Estimate periodic returns (simplified - in production use historical data)
    return {
      dailyReturn: totalReturn / 252,
      weeklyReturn: totalReturn / 52,
      monthlyReturn: totalReturn / 12,
      ytdReturn: totalReturn * 0.8,  // Approximation
      annualizedReturn: totalReturn,
    };
  }

  // ============================================================================
  // RISK METRICS
  // ============================================================================

  private calculateRiskMetrics(
    holdings: PortfolioHolding[],
    returns: { annualizedReturn: number }
  ): {
    beta: number;
    alpha: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    volatility: number;
    valueAtRisk: VaRMetrics;
    correlationToMarket: number;
  } {
    // Estimate portfolio volatility based on asset classes
    const volatility = this.estimatePortfolioVolatility(holdings);

    // Beta estimation based on asset class mix
    const beta = this.estimatePortfolioBeta(holdings);

    // Market return assumption
    const marketReturn = 0.10;  // 10% annual market return

    // Alpha = Portfolio Return - (Risk-Free + Beta * (Market - Risk-Free))
    const alpha = returns.annualizedReturn - (this.riskFreeRate + beta * (marketReturn - this.riskFreeRate));

    // Sharpe Ratio = (Return - Risk-Free) / Volatility
    const sharpeRatio = volatility > 0 ? (returns.annualizedReturn - this.riskFreeRate) / volatility : 0;

    // Sortino Ratio (using downside volatility approximation)
    const downsideVolatility = volatility * 0.7;
    const sortinoRatio = downsideVolatility > 0 ? (returns.annualizedReturn - this.riskFreeRate) / downsideVolatility : 0;

    // Value at Risk calculations
    const valueAtRisk = this.calculateVaR(holdings, volatility);

    return {
      beta,
      alpha,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown: volatility * 2.5,  // Approximation
      volatility,
      valueAtRisk,
      correlationToMarket: beta * 0.85,  // Approximation
    };
  }

  private estimatePortfolioVolatility(holdings: PortfolioHolding[]): number {
    // Volatility estimates by asset class
    const volatilityByClass: Record<AssetClass, number> = {
      stock: 0.20,
      etf: 0.15,
      bond: 0.05,
      crypto: 0.60,
      commodity: 0.25,
      cash: 0.01,
      option: 0.40,
      reit: 0.18,
    };

    let weightedVolatility = 0;
    const totalValue = this.calculateTotalValue(holdings);

    holdings.forEach(h => {
      const weight = (h.shares * h.currentPrice) / totalValue;
      const assetVol = volatilityByClass[h.assetClass || 'stock'];
      weightedVolatility += weight * assetVol;
    });

    return weightedVolatility;
  }

  private estimatePortfolioBeta(holdings: PortfolioHolding[]): number {
    const betaByClass: Record<AssetClass, number> = {
      stock: 1.0,
      etf: 0.9,
      bond: 0.2,
      crypto: 1.5,
      commodity: 0.5,
      cash: 0.0,
      option: 1.3,
      reit: 0.8,
    };

    let weightedBeta = 0;
    const totalValue = this.calculateTotalValue(holdings);

    holdings.forEach(h => {
      const weight = (h.shares * h.currentPrice) / totalValue;
      const assetBeta = betaByClass[h.assetClass || 'stock'];
      weightedBeta += weight * assetBeta;
    });

    return weightedBeta;
  }

  private calculateVaR(holdings: PortfolioHolding[], volatility: number): VaRMetrics {
    const totalValue = this.calculateTotalValue(holdings);

    // VaR = Portfolio Value * Volatility * Z-score * sqrt(time)
    const z95 = 1.645;
    const z99 = 2.326;

    return {
      daily95: totalValue * volatility * z95 * Math.sqrt(1 / 252),
      daily99: totalValue * volatility * z99 * Math.sqrt(1 / 252),
      weekly95: totalValue * volatility * z95 * Math.sqrt(5 / 252),
      monthly95: totalValue * volatility * z95 * Math.sqrt(21 / 252),
    };
  }

  // ============================================================================
  // DIVERSIFICATION ANALYSIS
  // ============================================================================

  analyzeDiversification(holdings: PortfolioHolding[]): DiversificationAnalysis {
    const totalValue = this.calculateTotalValue(holdings);
    const weightedHoldings = holdings.map(h => ({
      ...h,
      weight: (h.shares * h.currentPrice) / totalValue,
    }));

    // Sector diversification (0-100)
    const sectorExposure = this.calculateSectorExposure(weightedHoldings);
    const sectorCount = Object.keys(sectorExposure).length;
    const sectorDiversification = Math.min(100, sectorCount * 10);

    // Asset class diversification
    const assetClassAllocation = this.calculateAssetClassAllocation(weightedHoldings);
    const assetClassCount = Object.values(assetClassAllocation).filter(v => v > 0).length;
    const assetClassDiversification = Math.min(100, assetClassCount * 15);

    // Geographic diversification (simplified - assume US for now)
    const geographicDiversification = 50;

    // Overall score
    const score = Math.round(
      sectorDiversification * 0.4 +
      assetClassDiversification * 0.4 +
      geographicDiversification * 0.2
    );

    // Identify over/underweighted sectors
    const avgSectorWeight = 100 / Math.max(sectorCount, 1);
    const overweightedSectors = Object.entries(sectorExposure)
      .filter(([_, weight]) => weight > avgSectorWeight * 1.5)
      .map(([sector]) => sector);
    const underweightedSectors = Object.entries(sectorExposure)
      .filter(([_, weight]) => weight < avgSectorWeight * 0.5)
      .map(([sector]) => sector);

    // Generate recommendations
    const recommendations: string[] = [];
    if (score < 50) {
      recommendations.push('Portfolio is poorly diversified - consider adding different asset classes');
    }
    if (overweightedSectors.length > 0) {
      recommendations.push(`Consider reducing exposure to: ${overweightedSectors.join(', ')}`);
    }
    if (assetClassCount < 3) {
      recommendations.push('Add exposure to bonds or alternative assets for better diversification');
    }

    return {
      score,
      sectorDiversification,
      assetClassDiversification,
      geographicDiversification,
      recommendations,
      overweightedSectors,
      underweightedSectors,
    };
  }

  private calculateSectorExposure(holdings: PortfolioHolding[]): Record<string, number> {
    const exposure: Record<string, number> = {};

    holdings.forEach(h => {
      const sector = h.sector || 'Unknown';
      exposure[sector] = (exposure[sector] || 0) + ((h.weight || 0) * 100);
    });

    return exposure;
  }

  private calculateAssetClassAllocation(holdings: PortfolioHolding[]): Record<AssetClass, number> {
    const allocation: Record<AssetClass, number> = {
      stock: 0,
      etf: 0,
      bond: 0,
      crypto: 0,
      commodity: 0,
      cash: 0,
      option: 0,
      reit: 0,
    };

    holdings.forEach(h => {
      const assetClass = h.assetClass || 'stock';
      allocation[assetClass] += (h.weight || 0) * 100;
    });

    return allocation;
  }

  private calculateConcentrationRisk(holdings: PortfolioHolding[]): number {
    // Herfindahl-Hirschman Index (HHI) style calculation
    const hhi = holdings.reduce((sum, h) => {
      const weight = (h.weight || 0) * 100;
      return sum + weight * weight;
    }, 0);

    // Normalize to 0-100 scale (10000 = max concentration)
    return Math.min(100, hhi / 100);
  }

  // ============================================================================
  // POSITION SIZING
  // ============================================================================

  calculatePositionSize(
    portfolioValue: number,
    entryPrice: number,
    stopLossPrice: number,
    riskPercentage: number = 2  // Default 2% risk per trade
  ): PositionSizeRecommendation {
    const riskAmount = portfolioValue * (riskPercentage / 100);
    const riskPerShare = Math.abs(entryPrice - stopLossPrice);

    const recommendedShares = Math.floor(riskAmount / riskPerShare);
    const recommendedValue = recommendedShares * entryPrice;
    const maxPositionSize = portfolioValue * 0.10;  // Max 10% in single position

    const actualShares = recommendedValue > maxPositionSize
      ? Math.floor(maxPositionSize / entryPrice)
      : recommendedShares;

    return {
      symbol: '',
      recommendedShares: actualShares,
      recommendedValue: actualShares * entryPrice,
      maxPositionSize,
      riskPerShare,
      reasoning: recommendedValue > maxPositionSize
        ? 'Position sized to max 10% of portfolio due to concentration limits'
        : `Position sized for ${riskPercentage}% portfolio risk`,
    };
  }

  // ============================================================================
  // STRESS TESTING
  // ============================================================================

  runStressTests(holdings: PortfolioHolding[]): StressTestResult[] {
    const scenarios = [
      { name: 'Market Crash (-20%)', stockImpact: -0.20, bondImpact: 0.05, cryptoImpact: -0.40 },
      { name: 'Interest Rate Hike', stockImpact: -0.08, bondImpact: -0.10, cryptoImpact: -0.15 },
      { name: 'Recession', stockImpact: -0.30, bondImpact: 0.08, cryptoImpact: -0.50 },
      { name: 'Tech Correction', stockImpact: -0.15, bondImpact: 0.02, cryptoImpact: -0.25 },
      { name: 'Inflation Surge', stockImpact: -0.05, bondImpact: -0.15, cryptoImpact: 0.10 },
    ];

    return scenarios.map(scenario => {
      let totalImpact = 0;
      const affectedHoldings: { symbol: string; impact: number }[] = [];

      holdings.forEach(h => {
        const value = h.shares * h.currentPrice;
        let impact = 0;

        switch (h.assetClass) {
          case 'stock':
          case 'etf':
            impact = scenario.stockImpact;
            break;
          case 'bond':
            impact = scenario.bondImpact;
            break;
          case 'crypto':
            impact = scenario.cryptoImpact;
            break;
          default:
            impact = scenario.stockImpact * 0.5;
        }

        const holdingImpact = value * impact;
        totalImpact += holdingImpact;
        affectedHoldings.push({ symbol: h.symbol, impact: impact * 100 });
      });

      const totalValue = this.calculateTotalValue(holdings);
      const portfolioImpact = (totalImpact / totalValue) * 100;

      return {
        scenario: scenario.name,
        portfolioImpact,
        affectedHoldings: affectedHoldings.sort((a, b) => a.impact - b.impact),
        recommendation: portfolioImpact < -15
          ? 'Consider hedging strategies or increasing bond allocation'
          : 'Portfolio risk within acceptable limits',
      };
    });
  }

  // ============================================================================
  // REBALANCING
  // ============================================================================

  generateRebalanceRecommendation(
    holdings: PortfolioHolding[],
    targetAllocation: Record<string, number>
  ): RebalanceRecommendation {
    const totalValue = this.calculateTotalValue(holdings);
    const trades: RebalanceTrade[] = [];
    const taxImplications: TaxImplication[] = [];

    // Calculate current weights
    const currentWeights: Record<string, number> = {};
    holdings.forEach(h => {
      currentWeights[h.symbol] = ((h.shares * h.currentPrice) / totalValue) * 100;
    });

    // Generate trades to reach target allocation
    Object.entries(targetAllocation).forEach(([symbol, targetWeight]) => {
      const currentWeight = currentWeights[symbol] || 0;
      const weightDiff = targetWeight - currentWeight;

      if (Math.abs(weightDiff) > 1) {  // Only rebalance if >1% difference
        const holding = holdings.find(h => h.symbol === symbol);
        const price = holding?.currentPrice || 100;
        const tradeValue = (weightDiff / 100) * totalValue;
        const shares = Math.abs(Math.floor(tradeValue / price));

        trades.push({
          symbol,
          action: weightDiff > 0 ? 'buy' : 'sell',
          shares,
          value: Math.abs(tradeValue),
          currentWeight,
          targetWeight,
        });

        // Calculate tax implications for sells
        if (weightDiff < 0 && holding) {
          const gainLoss = (holding.currentPrice - holding.costBasis) * shares;
          if (gainLoss > 0) {
            taxImplications.push({
              symbol,
              gainLoss,
              holdingPeriod: 'long_term',  // Simplified assumption
              estimatedTax: gainLoss * 0.15,
            });
          }
        }
      }
    });

    const estimatedCost = trades.reduce((sum, t) => sum + t.value * 0.001, 0);  // 0.1% trading cost
    const currentRisk = this.estimatePortfolioVolatility(holdings) * 100;
    const projectedRisk = currentRisk * 0.95;  // Assume rebalancing reduces risk slightly

    return {
      trades,
      currentRisk,
      projectedRisk,
      estimatedCost,
      taxImplications,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let portfolioServiceInstance: PortfolioAnalysisService | null = null;

export function getPortfolioAnalysisService(): PortfolioAnalysisService {
  if (!portfolioServiceInstance) {
    portfolioServiceInstance = new PortfolioAnalysisService();
  }
  return portfolioServiceInstance;
}
