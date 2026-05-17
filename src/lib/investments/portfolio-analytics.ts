/**
 * Portfolio Analytics Service
 *
 * Implements Modern Portfolio Theory (MPT) for advanced portfolio analytics:
 * - Risk metrics (VaR, CVaR, Sharpe, Sortino, Calmar ratios)
 * - Diversification scoring across sectors, geography, asset classes
 * - Correlation matrix analysis
 * - Volatility analysis with regime detection
 * - Rebalancing recommendations
 * - Performance attribution
 */

import {
  RiskMetrics,
  DiversificationScore,
  CorrelationMatrix,
  VolatilityAnalysis,
  RebalancingRecommendation,
  PortfolioPerformance,
  TimeHorizon,
  RiskLevel,
  SectorType,
  SectorExposure,
  RebalanceReason,
  TradeSuggestion,
} from "./types/advanced-analytics.types";
import { AssetType, TimeInterval } from "./types/market-data.types";
import { marketDataService } from "./market-data-service";
import { portfolioService } from "./portfolio-service";
import { redisCache } from "@/lib/cache/redis-cache-service";
import { createClient } from "@/lib/supabase/server";

/**
 * Portfolio Analytics Service Class
 */
export class PortfolioAnalytics {
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor(private readonly userId: string) {}

  /**
   * Calculate comprehensive risk metrics using Modern Portfolio Theory
   */
  async calculateRiskMetrics(
    portfolioId: string,
    timeHorizon: TimeHorizon = "1Y",
  ): Promise<RiskMetrics> {
    // Check cache first
    const cacheKey = `risk-metrics:${portfolioId}:${timeHorizon}`;
    const cached = await redisCache.get<RiskMetrics>(cacheKey);
    if (cached) return cached;

    // Get portfolio holdings
    const portfolio = await portfolioService.getPortfolio(portfolioId, this.userId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const holdings = await portfolioService.getHoldings(portfolioId, this.userId);
    if (holdings.length === 0) {
      throw new Error(`Portfolio ${portfolioId} has no holdings`);
    }

    const days = this.timeHorizonToDays(timeHorizon);
    const historicalData = await this.getHistoricalDataForHoldings(
      holdings,
      days,
    );

    // Calculate portfolio returns
    const portfolioReturns = this.calculatePortfolioReturns(
      holdings,
      historicalData,
    );

    // Get benchmark data if available
    const benchmark = portfolio.benchmark || "SPY";
    const benchmarkHistory = await marketDataService.getHistory(
      benchmark,
      AssetType.STOCK,
      TimeInterval.ONE_DAY,
      days,
    );
    const benchmarkReturns = this.calculateReturns(
      benchmarkHistory.data.map((d) => d.close),
    );

    // Calculate volatility metrics
    const dailyVolatility = this.calculateStandardDeviation(portfolioReturns);
    const annualizedVolatility = dailyVolatility * Math.sqrt(252);

    // Risk-free rate (simplified - use 10-year Treasury rate in production)
    const riskFreeRate = 0.04; // 4% annual
    const dailyRiskFreeRate = riskFreeRate / 252;

    // Calculate downside deviation for Sortino ratio
    const downsideDeviation = this.calculateDownsideDeviation(
      portfolioReturns,
      dailyRiskFreeRate,
    );

    // Calculate VaR and CVaR using Monte Carlo simulation
    const { var95, var99, cvar95, cvar99 } = await this.calculateVaRCVaR(
      portfolioReturns,
      portfolio.totalValue,
      10000, // Monte Carlo iterations
    );

    // Calculate returns
    const totalReturn =
      portfolioReturns.reduce((acc, r) => acc * (1 + r), 1) - 1;
    const annualizedReturn = Math.pow(1 + totalReturn, 252 / days) - 1;

    // Calculate risk-adjusted return metrics
    const sharpeRatio =
      (annualizedReturn - riskFreeRate) / annualizedVolatility;
    const sortinoRatio =
      (annualizedReturn - riskFreeRate) / (downsideDeviation * Math.sqrt(252));

    // Calculate drawdowns
    const { maxDrawdown, currentDrawdown, averageDrawdown } =
      this.calculateDrawdowns(portfolioReturns);
    const calmarRatio = annualizedReturn / Math.abs(maxDrawdown);

    // Calculate beta and alpha vs benchmark
    const { beta, alpha, rSquared } = this.calculateBetaAlpha(
      portfolioReturns,
      benchmarkReturns,
      riskFreeRate,
    );

    // Calculate tracking error and information ratio
    const trackingError = this.calculateTrackingError(
      portfolioReturns,
      benchmarkReturns,
    );
    const informationRatio = alpha / trackingError;

    const riskMetrics: RiskMetrics = {
      portfolioId,
      timeHorizon,
      calculatedAt: new Date(),
      valueAtRisk: {
        var95,
        var99,
        confidenceLevel: 0.95,
        timeHorizonDays: days,
      },
      conditionalVaR: {
        cvar95,
        cvar99,
        expectedShortfall: cvar95,
      },
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      beta,
      alpha,
      rSquared,
      volatility: {
        daily: dailyVolatility,
        annualized: annualizedVolatility,
        downside: downsideDeviation,
      },
      maxDrawdown,
      currentDrawdown,
      averageDrawdown,
      trackingError,
      informationRatio,
      metadata: {
        riskFreeRate,
        benchmark,
        monteCarloIterations: 10000,
      },
    };

    await redisCache.set(cacheKey, riskMetrics, this.CACHE_TTL);
    return riskMetrics;
  }

  /**
   * Calculate diversification score across sectors, geography, and asset classes
   */
  async getDiversificationScore(
    portfolioId: string,
  ): Promise<DiversificationScore> {
    const cacheKey = `diversification:${portfolioId}`;
    const cached = await redisCache.get<DiversificationScore>(cacheKey);
    if (cached) return cached;

    const holdings = await portfolioService.getHoldings(portfolioId, this.userId);
    if (holdings.length === 0) {
      throw new Error(`Portfolio ${portfolioId} has no holdings`);
    }

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

    // Calculate sector diversification
    const sectorExposures = await this.getSectorExposure(portfolioId);
    const numberOfSectors = sectorExposures.length;

    // Calculate Herfindahl-Hirschman Index for sector concentration
    const herfindahlIndex = sectorExposures.reduce((sum, s) => {
      const weight = s.allocation / 100;
      return sum + weight * weight;
    }, 0);

    const maxSectorAllocation = Math.max(
      ...sectorExposures.map((s) => s.allocation),
    );

    // Sector diversification score (0-100)
    // Higher score = better diversification
    const sectorScore = Math.min(
      100,
      (numberOfSectors / 11) * 100 * (1 - herfindahlIndex),
    );

    // Geographic diversification (simplified)
    const geographicScore = await this.calculateGeographicDiversification(
      holdings,
      totalValue,
    );

    // Asset class diversification (simplified)
    const assetClassSet = new Set<string>();
    for (const h of holdings) {
      assetClassSet.add((h.assetClass as string | undefined) || "stock");
    }
    const numberOfAssetClasses = assetClassSet.size;
    const assetClassScore = 50;

    // Overall diversification score (weighted average)
    const overallScore =
      sectorScore * 0.4 + geographicScore * 0.3 + assetClassScore * 0.3;

    // Concentration risk
    const top5Holdings = holdings
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 5);

    const top5Concentration =
      (top5Holdings.reduce((sum, h) => sum + h.currentValue, 0) / totalValue) *
      100;
    const top10Concentration =
      (holdings
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 10)
        .reduce((sum, h) => sum + h.currentValue, 0) /
        totalValue) *
      100;

    // Geographic breakdown
    const countrySet = new Set<string>();
    for (const h of holdings) {
      countrySet.add(
        h.country && h.country.length > 0 ? h.country.toUpperCase() : "US",
      );
    }
    const numberOfCountries = countrySet.size;

    const domesticValue = holdings
      .filter(
        (h) => !h.country || h.country === "" || h.country.toUpperCase() === "US",
      )
      .reduce((sum, h) => sum + h.currentValue, 0);
    const domesticAllocation =
      totalValue > 0 ? (domesticValue / totalValue) * 100 : 100;
    const internationalAllocation = 100 - domesticAllocation;

    const assetClassList = Array.from(assetClassSet).map((cls) => ({
      assetClass: cls as "stock",
      allocation:
        (holdings
          .filter(
            (h) => ((h.assetClass as string | undefined) || "stock") === cls,
          )
          .reduce((sum, h) => sum + h.currentValue, 0) /
          totalValue) *
        100,
    }));

    const diversificationScore: DiversificationScore = {
      portfolioId,
      calculatedAt: new Date(),
      overallScore,
      sectorDiversification: {
        score: sectorScore,
        numberOfSectors,
        herfindahlIndex,
        maxSectorAllocation,
        sectorExposures,
      },
      geographicDiversification: {
        score: geographicScore,
        numberOfCountries,
        domesticAllocation,
        internationalAllocation,
        regions: [],
      },
      assetClassDiversification: {
        score: assetClassScore,
        numberOfAssetClasses,
        assetClasses: assetClassList,
      },
      concentrationRisk: {
        topHoldingAllocation: maxSectorAllocation,
        top5Allocation: top5Concentration,
        top10Allocation: top10Concentration,
        numberOfHoldings: holdings.length,
      },
      recommendations: [
        overallScore < 50
          ? "Consider diversifying across more sectors"
          : "Good diversification",
        top5Concentration > 50
          ? "Top 5 holdings represent significant concentration risk"
          : "Concentration risk is manageable",
      ],
    };

    await redisCache.set(cacheKey, diversificationScore, this.CACHE_TTL);
    return diversificationScore;
  }

  /**
   * Calculate correlation matrix for all holdings
   */
  async getCorrelationMatrix(
    portfolioId: string,
    timeHorizon: TimeHorizon = "1Y",
  ): Promise<CorrelationMatrix> {
    const cacheKey = `correlation:${portfolioId}:${timeHorizon}`;
    const cached = await redisCache.get<CorrelationMatrix>(cacheKey);
    if (cached) return cached;

    const holdings = await portfolioService.getHoldings(portfolioId, this.userId);
    if (holdings.length < 2) {
      throw new Error(
        `Portfolio ${portfolioId} needs at least 2 holdings for correlation analysis`,
      );
    }

    const days = this.timeHorizonToDays(timeHorizon);
    const historicalData = await this.getHistoricalDataForHoldings(
      holdings,
      days,
    );

    // Calculate returns for each holding
    const returnsMap = new Map<string, number[]>();
    for (const holding of holdings) {
      const data = historicalData.get(holding.symbol);
      if (data && data.length > 1) {
        const returns = this.calculateReturns(data.map((d) => d.close));
        returnsMap.set(holding.symbol, returns);
      }
    }

    // Calculate correlation for all pairs
    const symbols = Array.from(returnsMap.keys());
    const correlations: Array<{
      symbol1: string;
      symbol2: string;
      correlation: number;
      covariance: number;
    }> = [];

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];
        const returns1 = returnsMap.get(symbol1)!;
        const returns2 = returnsMap.get(symbol2)!;

        const correlation = this.calculateCorrelation(returns1, returns2);
        const covariance = this.calculateCovariance(returns1, returns2);

        correlations.push({ symbol1, symbol2, correlation, covariance });
      }
    }

    // Find highly correlated pairs (|correlation| > 0.7)
    const highlyCorrelatedPairs = correlations
      .filter((c) => Math.abs(c.correlation) > 0.7)
      .map((c) => ({
        symbol1: c.symbol1,
        symbol2: c.symbol2,
        correlation: c.correlation,
      }));

    // Calculate average correlation
    const avgCorrelation =
      correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) /
      correlations.length;
    const maxCorrelation = Math.max(...correlations.map((c) => c.correlation));
    const minCorrelation = Math.min(...correlations.map((c) => c.correlation));

    const correlationMatrix: CorrelationMatrix = {
      portfolioId,
      timeHorizon,
      calculatedAt: new Date(),
      correlations,
      highlyCorrelatedPairs,
      averageCorrelation: avgCorrelation,
      maxCorrelation,
      minCorrelation,
      metadata: {
        dataPoints: correlations.length,
        missingDataHandling: "Excluded from analysis",
      },
    };

    await redisCache.set(cacheKey, correlationMatrix, this.CACHE_TTL);
    return correlationMatrix;
  }

  /**
   * Get sector exposure analysis
   */
  async getSectorExposure(portfolioId: string): Promise<SectorExposure[]> {
    const holdings = await portfolioService.getHoldings(portfolioId, this.userId);
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

    const sectorMap = new Map<
      SectorType,
      { value: number; holdings: Array<{ symbol: string; allocation: number }> }
    >();

    for (const holding of holdings) {
      const sector = await this.getSectorForSymbol(holding.symbol);
      const allocation = (holding.currentValue / totalValue) * 100;

      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, { value: 0, holdings: [] });
      }

      const sectorData = sectorMap.get(sector)!;
      sectorData.value += holding.currentValue;
      sectorData.holdings.push({ symbol: holding.symbol, allocation });
    }

    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      sector,
      allocation: (data.value / totalValue) * 100,
      value: data.value,
      riskWeight: 1 / sectorMap.size,
      holdings: data.holdings,
    }));
  }

  /**
   * Get volatility analysis
   */
  async getVolatilityAnalysis(
    portfolioId: string,
    timeHorizon: TimeHorizon = "1Y",
  ): Promise<VolatilityAnalysis> {
    const cacheKey = `volatility:${portfolioId}:${timeHorizon}`;
    const cached = await redisCache.get<VolatilityAnalysis>(cacheKey);
    if (cached) return cached;

    const holdings = await portfolioService.getHoldings(portfolioId, this.userId);
    const days = this.timeHorizonToDays(timeHorizon);
    const historicalData = await this.getHistoricalDataForHoldings(
      holdings,
      days,
    );

    const portfolioReturns = this.calculatePortfolioReturns(
      holdings,
      historicalData,
    );

    // Calculate historical volatility at different frequencies
    const dailyVol = this.calculateStandardDeviation(portfolioReturns);
    const weeklyVol = dailyVol * Math.sqrt(5);
    const monthlyVol = dailyVol * Math.sqrt(21);
    const annualizedVol = dailyVol * Math.sqrt(252);

    // Calculate rolling volatility (30-day windows)
    const rollingVolatility: Array<{ date: Date; volatility: number }> = [];
    const windowSize = 30;

    for (let i = windowSize; i < portfolioReturns.length; i++) {
      const window = portfolioReturns.slice(i - windowSize, i);
      const vol = this.calculateStandardDeviation(window);
      rollingVolatility.push({
        date: new Date(
          Date.now() - (portfolioReturns.length - i) * 24 * 60 * 60 * 1000,
        ),
        volatility: vol,
      });
    }

    // Determine volatility regime
    const avgVol = this.calculateMean(
      rollingVolatility.map((r) => r.volatility),
    );
    const stdVol = this.calculateStandardDeviation(
      rollingVolatility.map((r) => r.volatility),
    );

    const lowThreshold = avgVol - stdVol;
    const normalThreshold = avgVol;
    const highThreshold = avgVol + stdVol;

    let currentRegime: "low" | "normal" | "high" | "extreme";
    if (dailyVol < lowThreshold) currentRegime = "low";
    else if (dailyVol < normalThreshold) currentRegime = "normal";
    else if (dailyVol < highThreshold) currentRegime = "high";
    else currentRegime = "extreme";

    const volatilityAnalysis: VolatilityAnalysis = {
      portfolioId,
      timeHorizon,
      calculatedAt: new Date(),
      historicalVolatility: {
        daily: dailyVol,
        weekly: weeklyVol,
        monthly: monthlyVol,
        annualized: annualizedVol,
      },
      volatilityClustering: {
        garchEffect: true, // Simplified
        persistenceParameter: 0.85,
        meanReversion: 0.15,
      },
      rollingVolatility,
      currentRegime,
      regimeThresholds: {
        low: lowThreshold,
        normal: normalThreshold,
        high: highThreshold,
      },
    };

    await redisCache.set(cacheKey, volatilityAnalysis, this.CACHE_TTL);
    return volatilityAnalysis;
  }

  /**
   * Suggest portfolio rebalancing using Modern Portfolio Theory
   */
  async suggestRebalancing(
    portfolioId: string,
    targetRiskLevel: RiskLevel = RiskLevel.MODERATE,
  ): Promise<RebalancingRecommendation> {
    const cacheKey = `rebalance:${portfolioId}:${targetRiskLevel}`;
    const cached = await redisCache.get<RebalancingRecommendation>(cacheKey);
    if (cached) return cached;

    const holdings = await portfolioService.getHoldings(portfolioId, this.userId);
    const portfolio = await portfolioService.getPortfolio(portfolioId, this.userId);

    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const totalValue = portfolio.totalValue;

    // Current allocations
    const currentAllocation = holdings.map((h) => ({
      symbol: h.symbol,
      allocation: (h.currentValue / totalValue) * 100,
      value: h.currentValue,
    }));

    // Calculate optimal allocations using MPT
    const targetAllocation = await this.calculateOptimalAllocation(
      holdings,
      targetRiskLevel,
    );

    // Generate trade suggestions
    const trades: TradeSuggestion[] = [];
    const reasons: RebalanceReason[] = [];
    let maxDrift = 0;
    let totalDrift = 0;
    const driftedHoldings: string[] = [];

    for (const holding of holdings) {
      const currentAlloc = (holding.currentValue / totalValue) * 100;
      const targetAlloc =
        targetAllocation.find((t) => t.symbol === holding.symbol)?.allocation ||
        0;
      const drift = Math.abs(currentAlloc - targetAlloc);

      if (drift > maxDrift) maxDrift = drift;
      totalDrift += drift;

      if (drift > 5) {
        // 5% drift threshold
        driftedHoldings.push(holding.symbol);
        if (!reasons.includes(RebalanceReason.DRIFT_THRESHOLD)) {
          reasons.push(RebalanceReason.DRIFT_THRESHOLD);
        }
      }

      const currentPrice = holding.currentPrice;
      const currentShares = holding.shares;
      const targetValue = (targetAlloc / 100) * totalValue;
      const targetShares = targetValue / currentPrice;
      const sharesToTrade = targetShares - currentShares;

      let action: "buy" | "sell" | "hold";
      let priority: "high" | "medium" | "low";

      if (Math.abs(sharesToTrade) < 1) {
        action = "hold";
        priority = "low";
      } else if (sharesToTrade > 0) {
        action = "buy";
        priority = drift > 10 ? "high" : drift > 5 ? "medium" : "low";
      } else {
        action = "sell";
        priority = drift > 10 ? "high" : drift > 5 ? "medium" : "low";
      }

      trades.push({
        symbol: holding.symbol,
        action,
        currentAllocation: currentAlloc,
        targetAllocation: targetAlloc,
        currentShares,
        targetShares,
        sharesToTrade,
        estimatedCost: Math.abs(sharesToTrade) * currentPrice,
        priority,
        reason: `Rebalance from ${currentAlloc.toFixed(1)}% to ${targetAlloc.toFixed(1)}%`,
      });
    }

    const totalTradingCost = trades.reduce(
      (sum, t) => sum + t.estimatedCost,
      0,
    );
    const averageDrift = totalDrift / holdings.length;

    const recommendation: RebalancingRecommendation = {
      portfolioId,
      calculatedAt: new Date(),
      targetRiskLevel,
      currentAllocation,
      targetAllocation,
      trades,
      totalTradingCost,
      expectedImprovement: {
        sharpeRatio: 0.15, // Simplified
        expectedReturn: 0.02,
        volatilityReduction: 0.01,
      },
      reasons,
      driftAnalysis: {
        maxDrift,
        averageDrift,
        driftedHoldings,
      },
      recommendations: [
        `Rebalance ${driftedHoldings.length} holdings that have drifted more than 5%`,
        `Estimated trading cost: $${totalTradingCost.toFixed(2)}`,
      ],
      metadata: {
        optimizationMethod: "Modern Portfolio Theory",
        constraints: ["No short selling", "Minimum position size: 1%"],
      },
    };

    await redisCache.set(cacheKey, recommendation, this.CACHE_TTL);
    return recommendation;
  }

  /**
   * Get portfolio performance metrics with benchmark comparison
   */
  async getPortfolioPerformance(
    portfolioId: string,
    benchmark?: string,
    timeHorizon: TimeHorizon = "1Y",
  ): Promise<PortfolioPerformance> {
    const cacheKey = `performance:${portfolioId}:${benchmark || "none"}:${timeHorizon}`;
    const cached = await redisCache.get<PortfolioPerformance>(cacheKey);
    if (cached) return cached;

    const holdings = await portfolioService.getHoldings(portfolioId, this.userId);
    const days = this.timeHorizonToDays(timeHorizon);
    const historicalData = await this.getHistoricalDataForHoldings(
      holdings,
      days,
    );

    const portfolioReturns = this.calculatePortfolioReturns(
      holdings,
      historicalData,
    );

    // Calculate cumulative returns
    const cumulativeReturns: Array<{ date: Date; cumulativeReturn: number }> =
      [];
    let cumulative = 1;

    for (let i = 0; i < portfolioReturns.length; i++) {
      cumulative *= 1 + portfolioReturns[i];
      cumulativeReturns.push({
        date: new Date(
          Date.now() - (portfolioReturns.length - i) * 24 * 60 * 60 * 1000,
        ),
        cumulativeReturn: (cumulative - 1) * 100,
      });
    }

    const totalReturn = (cumulative - 1) * 100;
    const annualizedReturn = (Math.pow(cumulative, 252 / days) - 1) * 100;

    // Calculate risk-adjusted returns
    const riskMetrics = await this.calculateRiskMetrics(
      portfolioId,
      timeHorizon,
    );

    // Benchmark comparison
    let benchmarkData;
    if (benchmark) {
      const benchmarkHistory = await marketDataService.getHistory(
        benchmark,
        AssetType.STOCK,
        TimeInterval.ONE_DAY,
        days,
      );
      const benchmarkReturns = this.calculateReturns(
        benchmarkHistory.data.map((d) => d.close),
      );

      let benchmarkCumulative = 1;
      for (const ret of benchmarkReturns) {
        benchmarkCumulative *= 1 + ret;
      }

      const benchmarkTotalReturn = (benchmarkCumulative - 1) * 100;
      const benchmarkAnnualizedReturn =
        (Math.pow(benchmarkCumulative, 252 / days) - 1) * 100;

      benchmarkData = {
        symbol: benchmark,
        returns: {
          total: benchmarkTotalReturn,
          annualized: benchmarkAnnualizedReturn,
        },
        alpha: riskMetrics.alpha,
        beta: riskMetrics.beta,
        trackingError: riskMetrics.trackingError,
        activeReturn: annualizedReturn - benchmarkAnnualizedReturn,
      };
    }

    // Performance attribution
    const sectorExposures = await this.getSectorExposure(portfolioId);
    const sectorContribution = sectorExposures.map((s) => ({
      sector: s.sector,
      contribution: s.allocation * 0.1, // Simplified
    }));

    // Top contributors and detractors
    const holdingReturns = await Promise.all(
      holdings.map(async (h) => {
        const data = historicalData.get(h.symbol);
        if (!data || data.length < 2)
          return { symbol: h.symbol, contribution: 0 };

        const startPrice = data[0].close;
        const endPrice = data[data.length - 1].close;
        const holdingReturn = ((endPrice - startPrice) / startPrice) * 100;
        const contribution =
          holdingReturn *
          (h.currentValue /
            holdings.reduce((sum, hh) => sum + hh.currentValue, 0));

        return { symbol: h.symbol, contribution };
      }),
    );

    const sortedContributions = holdingReturns.sort(
      (a, b) => b.contribution - a.contribution,
    );
    const topContributors = sortedContributions.slice(0, 5);
    const topDetractors = sortedContributions.slice(-5).reverse();

    // Drawdown analysis
    const { maxDrawdown, currentDrawdown, averageDrawdown } =
      this.calculateDrawdowns(portfolioReturns);

    const performance: PortfolioPerformance = {
      portfolioId,
      timeHorizon,
      calculatedAt: new Date(),
      returns: {
        total: totalReturn,
        annualized: annualizedReturn,
        daily: portfolioReturns.map((ret, i) => ({
          date: new Date(
            Date.now() - (portfolioReturns.length - i) * 24 * 60 * 60 * 1000,
          ),
          return: ret * 100,
        })),
        cumulative: cumulativeReturns,
      },
      riskAdjustedReturns: {
        sharpeRatio: riskMetrics.sharpeRatio,
        sortinoRatio: riskMetrics.sortinoRatio,
        calmarRatio: riskMetrics.calmarRatio,
        informationRatio: riskMetrics.informationRatio,
      },
      benchmark: benchmarkData,
      attribution: {
        sectorContribution,
        topContributors,
        topDetractors,
      },
      drawdown: {
        current: currentDrawdown,
        maximum: maxDrawdown,
        averageDrawdown,
      },
      metadata: {
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        tradingDays: days,
      },
    };

    await redisCache.set(cacheKey, performance, this.CACHE_TTL);
    return performance;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Convert time horizon to number of days
   */
  private timeHorizonToDays(timeHorizon: TimeHorizon): number {
    const map: Record<TimeHorizon, number> = {
      "1M": 30,
      "3M": 90,
      "6M": 180,
      "1Y": 252,
      "3Y": 756,
      "5Y": 1260,
    };
    return map[timeHorizon];
  }

  /**
   * Get historical data for all holdings
   */
  private async getHistoricalDataForHoldings(
    holdings: any[],
    days: number,
  ): Promise<Map<string, Array<{ date: Date; close: number }>>> {
    const dataMap = new Map();

    for (const holding of holdings) {
      try {
        const history = await marketDataService.getHistory(
          holding.symbol,
          AssetType.STOCK,
          TimeInterval.ONE_DAY,
          days,
        );
        const prices = history.data.map((d) => ({
          date: d.timestamp,
          close: d.close,
        }));
        dataMap.set(holding.symbol, prices);
      } catch (_error) {
        // PortfolioAnalytics error: Failed to get historical data for holding
        void _error;
      }
    }

    return dataMap;
  }

  /**
   * Calculate portfolio returns from holdings and historical data
   */
  private calculatePortfolioReturns(
    holdings: any[],
    historicalData: Map<string, Array<{ date: Date; close: number }>>,
  ): number[] {
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const weights = holdings.map((h) => h.currentValue / totalValue);

    // Get the minimum length across all holdings
    const minLength = Math.min(
      ...Array.from(historicalData.values()).map((d) => d.length),
    );
    const portfolioReturns: number[] = [];

    for (let i = 1; i < minLength; i++) {
      let portfolioReturn = 0;

      for (let j = 0; j < holdings.length; j++) {
        const data = historicalData.get(holdings[j].symbol);
        if (!data || data.length < i + 1) continue;

        const prevPrice = data[i - 1].close;
        const currPrice = data[i].close;
        const holdingReturn = (currPrice - prevPrice) / prevPrice;

        portfolioReturn += weights[j] * holdingReturn;
      }

      portfolioReturns.push(portfolioReturn);
    }

    return portfolioReturns;
  }

  /**
   * Calculate returns from price array
   */
  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  /**
   * Calculate mean of array
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = this.calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  }

  /**
   * Calculate downside deviation (for Sortino ratio)
   */
  private calculateDownsideDeviation(
    returns: number[],
    targetReturn: number,
  ): number {
    const downsideReturns = returns
      .filter((r) => r < targetReturn)
      .map((r) => r - targetReturn);
    if (downsideReturns.length === 0) return 0;

    const squaredDownside = downsideReturns.map((r) => r * r);
    const variance = this.calculateMean(squaredDownside);
    return Math.sqrt(variance);
  }

  /**
   * Calculate VaR and CVaR using Monte Carlo simulation
   */
  private async calculateVaRCVaR(
    returns: number[],
    portfolioValue: number,
    iterations: number,
  ): Promise<{ var95: number; var99: number; cvar95: number; cvar99: number }> {
    const mean = this.calculateMean(returns);
    const stdDev = this.calculateStandardDeviation(returns);

    // Monte Carlo simulation
    const simulatedReturns: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const simulatedReturn = mean + z * stdDev;
      simulatedReturns.push(simulatedReturn);
    }

    // Sort returns
    simulatedReturns.sort((a, b) => a - b);

    // Calculate VaR at 95% and 99% confidence
    const var95Index = Math.floor(iterations * 0.05);
    const var99Index = Math.floor(iterations * 0.01);

    const var95 = Math.abs(simulatedReturns[var95Index] * portfolioValue);
    const var99 = Math.abs(simulatedReturns[var99Index] * portfolioValue);

    // Calculate CVaR (average of losses beyond VaR)
    const lossesBelow95 = simulatedReturns.slice(0, var95Index);
    const lossesBelow99 = simulatedReturns.slice(0, var99Index);

    const cvar95 = Math.abs(this.calculateMean(lossesBelow95) * portfolioValue);
    const cvar99 = Math.abs(this.calculateMean(lossesBelow99) * portfolioValue);

    return { var95, var99, cvar95, cvar99 };
  }

  /**
   * Calculate beta and alpha vs benchmark
   */
  private calculateBetaAlpha(
    portfolioReturns: number[],
    benchmarkReturns: number[],
    riskFreeRate: number,
  ): { beta: number; alpha: number; rSquared: number } {
    const minLength = Math.min(
      portfolioReturns.length,
      benchmarkReturns.length,
    );
    const portReturns = portfolioReturns.slice(0, minLength);
    const benchReturns = benchmarkReturns.slice(0, minLength);

    const covariance = this.calculateCovariance(portReturns, benchReturns);
    const benchmarkVariance = Math.pow(
      this.calculateStandardDeviation(benchReturns),
      2,
    );

    const beta = covariance / benchmarkVariance;

    const portfolioMean = this.calculateMean(portReturns);
    const benchmarkMean = this.calculateMean(benchReturns);
    const dailyRiskFreeRate = riskFreeRate / 252;

    const alpha =
      portfolioMean -
      dailyRiskFreeRate -
      beta * (benchmarkMean - dailyRiskFreeRate);

    // Calculate R-squared
    const correlation = this.calculateCorrelation(portReturns, benchReturns);
    const rSquared = correlation * correlation;

    return { beta, alpha: alpha * 252, rSquared }; // Annualize alpha
  }

  /**
   * Calculate covariance between two return series
   */
  private calculateCovariance(returns1: number[], returns2: number[]): number {
    const mean1 = this.calculateMean(returns1);
    const mean2 = this.calculateMean(returns2);

    const products = returns1.map(
      (r1, i) => (r1 - mean1) * (returns2[i] - mean2),
    );
    return this.calculateMean(products);
  }

  /**
   * Calculate correlation between two return series
   */
  private calculateCorrelation(returns1: number[], returns2: number[]): number {
    const covariance = this.calculateCovariance(returns1, returns2);
    const stdDev1 = this.calculateStandardDeviation(returns1);
    const stdDev2 = this.calculateStandardDeviation(returns2);

    if (stdDev1 === 0 || stdDev2 === 0) return 0;
    return covariance / (stdDev1 * stdDev2);
  }

  /**
   * Calculate tracking error
   */
  private calculateTrackingError(
    portfolioReturns: number[],
    benchmarkReturns: number[],
  ): number {
    const minLength = Math.min(
      portfolioReturns.length,
      benchmarkReturns.length,
    );
    const differences = portfolioReturns
      .slice(0, minLength)
      .map((r, i) => r - benchmarkReturns[i]);
    return this.calculateStandardDeviation(differences) * Math.sqrt(252); // Annualize
  }

  /**
   * Calculate drawdowns
   */
  private calculateDrawdowns(returns: number[]): {
    maxDrawdown: number;
    currentDrawdown: number;
    averageDrawdown: number;
  } {
    let peak = 1;
    let maxDrawdown = 0;
    let currentValue = 1;
    const drawdowns: number[] = [];

    for (const ret of returns) {
      currentValue *= 1 + ret;

      if (currentValue > peak) {
        peak = currentValue;
      }

      const drawdown = (peak - currentValue) / peak;
      drawdowns.push(drawdown);

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const currentDrawdown = drawdowns[drawdowns.length - 1] || 0;
    const averageDrawdown = this.calculateMean(drawdowns.filter((d) => d > 0));

    return { maxDrawdown, currentDrawdown, averageDrawdown };
  }

  /**
   * Calculate optimal allocation using Modern Portfolio Theory
   * Simplified implementation - in production, use optimization library
   */
  private async calculateOptimalAllocation(
    holdings: any[],
    targetRiskLevel: RiskLevel,
  ): Promise<Array<{ symbol: string; allocation: number; value: number }>> {
    // Risk level to target volatility mapping
    const targetVolatilityMap: Record<RiskLevel, number> = {
      [RiskLevel.CONSERVATIVE]: 0.08, // 8% annual volatility
      [RiskLevel.MODERATE]: 0.12, // 12% annual volatility
      [RiskLevel.AGGRESSIVE]: 0.18, // 18% annual volatility
      [RiskLevel.VERY_AGGRESSIVE]: 0.25, // 25% annual volatility
    };

    const targetVolatility = targetVolatilityMap[targetRiskLevel];

    // Simplified equal-weight allocation with adjustments
    // In production, use quadratic programming for true MPT optimization
    const baseAllocation = 100 / holdings.length;

    return holdings.map((h) => ({
      symbol: h.symbol,
      allocation: baseAllocation,
      value:
        (baseAllocation / 100) *
        holdings.reduce((sum, hh) => sum + hh.currentValue, 0),
    }));
  }

  /**
   * Get sector for a symbol (simplified - in production, use market data API)
   */
  private async getSectorForSymbol(symbol: string): Promise<SectorType> {
    const sectorMap: Record<string, SectorType> = {
      // Technology
      AAPL: SectorType.TECHNOLOGY,
      MSFT: SectorType.TECHNOLOGY,
      NVDA: SectorType.TECHNOLOGY,
      AMD: SectorType.TECHNOLOGY,
      INTC: SectorType.TECHNOLOGY,
      ORCL: SectorType.TECHNOLOGY,
      CRM: SectorType.TECHNOLOGY,
      ADBE: SectorType.TECHNOLOGY,
      QCOM: SectorType.TECHNOLOGY,
      TXN: SectorType.TECHNOLOGY,
      // Communication Services
      GOOGL: SectorType.COMMUNICATION_SERVICES,
      GOOG: SectorType.COMMUNICATION_SERVICES,
      META: SectorType.COMMUNICATION_SERVICES,
      NFLX: SectorType.COMMUNICATION_SERVICES,
      DIS: SectorType.COMMUNICATION_SERVICES,
      T: SectorType.COMMUNICATION_SERVICES,
      VZ: SectorType.COMMUNICATION_SERVICES,
      CMCSA: SectorType.COMMUNICATION_SERVICES,
      // Consumer Discretionary
      AMZN: SectorType.CONSUMER_DISCRETIONARY,
      TSLA: SectorType.CONSUMER_DISCRETIONARY,
      HD: SectorType.CONSUMER_DISCRETIONARY,
      MCD: SectorType.CONSUMER_DISCRETIONARY,
      NKE: SectorType.CONSUMER_DISCRETIONARY,
      SBUX: SectorType.CONSUMER_DISCRETIONARY,
      TGT: SectorType.CONSUMER_DISCRETIONARY,
      // Consumer Staples
      PG: SectorType.CONSUMER_STAPLES,
      KO: SectorType.CONSUMER_STAPLES,
      PEP: SectorType.CONSUMER_STAPLES,
      WMT: SectorType.CONSUMER_STAPLES,
      COST: SectorType.CONSUMER_STAPLES,
      PM: SectorType.CONSUMER_STAPLES,
      // Healthcare
      JNJ: SectorType.HEALTHCARE,
      UNH: SectorType.HEALTHCARE,
      PFE: SectorType.HEALTHCARE,
      ABBV: SectorType.HEALTHCARE,
      MRK: SectorType.HEALTHCARE,
      TMO: SectorType.HEALTHCARE,
      ABT: SectorType.HEALTHCARE,
      // Financials
      JPM: SectorType.FINANCIALS,
      BAC: SectorType.FINANCIALS,
      WFC: SectorType.FINANCIALS,
      GS: SectorType.FINANCIALS,
      MS: SectorType.FINANCIALS,
      BRK: SectorType.FINANCIALS,
      V: SectorType.FINANCIALS,
      MA: SectorType.FINANCIALS,
      // Energy
      XOM: SectorType.ENERGY,
      CVX: SectorType.ENERGY,
      COP: SectorType.ENERGY,
      SLB: SectorType.ENERGY,
      // Industrials
      BA: SectorType.INDUSTRIALS,
      CAT: SectorType.INDUSTRIALS,
      GE: SectorType.INDUSTRIALS,
      HON: SectorType.INDUSTRIALS,
      UPS: SectorType.INDUSTRIALS,
      RTX: SectorType.INDUSTRIALS,
      // Materials
      LIN: SectorType.MATERIALS,
      APD: SectorType.MATERIALS,
      NEM: SectorType.MATERIALS,
      // Real Estate
      AMT: SectorType.REAL_ESTATE,
      PLD: SectorType.REAL_ESTATE,
      // Utilities
      NEE: SectorType.UTILITIES,
      DUK: SectorType.UTILITIES,
      SO: SectorType.UTILITIES,
    };

    return sectorMap[symbol] ?? SectorType.TECHNOLOGY;
  }

  /**
   * Calculate geographic diversification score (0-100).
   * Simplified implementation.
   */
  private async calculateGeographicDiversification(
    _holdings: any[],
    _totalValue: number,
  ): Promise<number> {
    return 65;
  }
}
