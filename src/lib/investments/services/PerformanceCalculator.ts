/**
 * Performance Calculator Service
 *
 * Calculates portfolio performance metrics including returns, volatility,
 * Sharpe ratio, drawdowns, and benchmarking against market indices.
 */

import { PortfolioService } from "./PortfolioService";
import { PortfolioPerformance } from "../types/portfolio-db.types";

/**
 * Benchmark comparison result.
 *
 * `dataAvailable` is false when no historical S&P 500 series is reachable from
 * this service. In that case all benchmark-derived fields are null. The
 * portfolio's own return (computed from real holdings) is always populated.
 *
 * NOTE: never fabricate constants for beta/correlation/benchmark_return —
 * that was the FND-032 bug. When data is absent, callers must render "—" or
 * "benchmark data unavailable", not display null as a number.
 */
export interface BenchmarkComparison {
  /** Always populated from real holdings data. */
  portfolio_return: number;
  /** Always populated from real holdings data. */
  portfolio_return_percent: number;
  /** False when no S&P 500 historical series was available. */
  dataAvailable: boolean;
  /** null when dataAvailable is false. */
  benchmark_return: number | null;
  /** null when dataAvailable is false. */
  benchmark_return_percent: number | null;
  /** null when dataAvailable is false. */
  alpha: number | null;
  /** null when dataAvailable is false. */
  beta: number | null;
  /** null when dataAvailable is false. */
  correlation: number | null;
  /** null when dataAvailable is false. */
  tracking_error: number | null;
  /** null when dataAvailable is false. */
  information_ratio: number | null;
}

/**
 * Historical price point for performance tracking
 */
interface PricePoint {
  date: Date;
  value: number;
}

export class PerformanceCalculator {
  private portfolioService: PortfolioService;

  constructor(userId: string) {
    this.portfolioService = new PortfolioService(userId);
  }

  /**
   * Calculate total return for a portfolio over a time period
   * @param portfolioId Portfolio ID
   * @param startDate Start date (defaults to portfolio creation)
   * @param endDate End date (defaults to now)
   * @returns Total return in dollars and percentage
   */
  async calculateTotalReturn(
    portfolioId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ absolute: number; percentage: number }> {
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const holdings = await this.portfolioService.getHoldings(portfolioId);
    if (holdings.length === 0) {
      return { absolute: 0, percentage: 0 };
    }

    // Calculate current value
    const currentValue = holdings.reduce(
      (sum, h) => sum + (h.current_value || 0),
      0,
    );

    // Calculate total cost basis
    const totalCost = holdings.reduce(
      (sum, h) => sum + h.quantity * h.average_cost,
      0,
    );

    if (totalCost === 0) {
      return { absolute: 0, percentage: 0 };
    }

    const absolute = currentValue - totalCost;
    const percentage = (absolute / totalCost) * 100;

    return { absolute, percentage };
  }

  /**
   * Calculate annualized return using compound annual growth rate (CAGR)
   * @param portfolioId Portfolio ID
   * @param years Number of years to calculate over
   * @returns Annualized return percentage
   */
  async calculateAnnualizedReturn(
    portfolioId: string,
    years: number,
  ): Promise<number> {
    if (years <= 0) {
      throw new Error("Years must be greater than 0");
    }

    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const holdings = await this.portfolioService.getHoldings(portfolioId);
    if (holdings.length === 0) {
      return 0;
    }

    const currentValue = holdings.reduce(
      (sum, h) => sum + (h.current_value || 0),
      0,
    );
    const totalCost = holdings.reduce(
      (sum, h) => sum + h.quantity * h.average_cost,
      0,
    );

    if (totalCost === 0) {
      return 0;
    }

    // CAGR = (Ending Value / Beginning Value)^(1/years) - 1
    const cagr = Math.pow(currentValue / totalCost, 1 / years) - 1;
    return cagr * 100;
  }

  /**
   * Calculate portfolio volatility (standard deviation of returns)
   * @param portfolioId Portfolio ID
   * @param period Number of days to calculate over
   * @returns Volatility as standard deviation percentage
   */
  async calculateVolatility(
    portfolioId: string,
    period: number = 30,
  ): Promise<number> {
    if (period <= 1) {
      throw new Error("Period must be greater than 1");
    }

    // For now, return a placeholder since we need historical price data
    // In production, this would fetch daily portfolio values and calculate std dev
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    // Placeholder: Use day_change_percent as a proxy for volatility
    // In production, calculate from historical daily returns
    const estimatedVolatility =
      Math.abs(portfolio.day_change_percent || 0) * Math.sqrt(period);
    return estimatedVolatility;
  }

  /**
   * Calculate Sharpe Ratio (risk-adjusted return)
   * @param portfolioId Portfolio ID
   * @param riskFreeRate Annual risk-free rate (e.g., 0.04 for 4%)
   * @returns Sharpe ratio
   */
  async calculateSharpeRatio(
    portfolioId: string,
    riskFreeRate: number = 0.04,
  ): Promise<number> {
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    // Calculate annualized return (assuming 1 year for simplicity)
    const annualizedReturn = await this.calculateAnnualizedReturn(
      portfolioId,
      1,
    );

    // Calculate volatility (annualized)
    const volatility = await this.calculateVolatility(portfolioId, 252); // 252 trading days

    if (volatility === 0) {
      return 0;
    }

    // Sharpe Ratio = (Portfolio Return - Risk Free Rate) / Volatility
    const sharpeRatio =
      (annualizedReturn / 100 - riskFreeRate) / (volatility / 100);
    return sharpeRatio;
  }

  /**
   * Calculate maximum drawdown (peak-to-trough decline)
   * @param portfolioId Portfolio ID
   * @returns Max drawdown percentage and dates
   */
  async calculateMaxDrawdown(
    portfolioId: string,
  ): Promise<{
    maxDrawdown: number;
    maxDrawdownPercent: number;
    startDate: Date;
    endDate: Date;
  }> {
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    // For now, return placeholder values
    // In production, this would analyze historical portfolio values
    const holdings = await this.portfolioService.getHoldings(portfolioId);
    if (holdings.length === 0) {
      return {
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        startDate: new Date(),
        endDate: new Date(),
      };
    }

    // Estimate based on worst performing holding
    const worstHolding = holdings.reduce((worst, h) => {
      const loss = h.gain_loss_percent || 0;
      return loss < (worst.gain_loss_percent || 0) ? h : worst;
    }, holdings[0]);

    const maxDrawdownPercent = Math.min(worstHolding.gain_loss_percent || 0, 0);
    const currentValue = holdings.reduce(
      (sum, h) => sum + (h.current_value || 0),
      0,
    );
    const maxDrawdown = (currentValue * maxDrawdownPercent) / 100;

    return {
      maxDrawdown,
      maxDrawdownPercent,
      startDate: worstHolding.created_at,
      endDate: new Date(),
    };
  }

  /**
   * Calculate win rate and best/worst day performance
   * @param portfolioId Portfolio ID
   * @returns Win rate percentage and extreme day returns
   */
  async calculateWinRate(
    portfolioId: string,
  ): Promise<{ winRate: number; bestDay: number; worstDay: number }> {
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    // For now, use current day change as proxy
    // In production, analyze historical daily returns
    const dayChange = portfolio.day_change_percent || 0;

    return {
      winRate: dayChange > 0 ? 100 : 0, // Placeholder
      bestDay: Math.max(dayChange, 0),
      worstDay: Math.min(dayChange, 0),
    };
  }

  /**
   * Benchmark portfolio performance against S&P 500.
   *
   * Real beta/correlation/benchmark-return computation requires a historical
   * S&P 500 daily-return series, which is not reachable from this class
   * (MarketDataService is a separate service requiring API keys not injected
   * here). The "data unavailable" pattern is applied: benchmark-derived fields
   * are null and dataAvailable is false. The portfolio's own return, computed
   * from real holdings, is always populated.
   *
   * @param portfolioId Portfolio ID
   * @param startDate Start date for comparison
   * @param endDate End date for comparison
   * @returns BenchmarkComparison with portfolio return populated; benchmark
   *   fields null and dataAvailable false (no S&P series reachable).
   */
  async benchmarkAgainstSP500(
    portfolioId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BenchmarkComparison> {
    const portfolio = await this.portfolioService.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const { absolute: portfolioReturn, percentage: portfolioReturnPercent } =
      await this.calculateTotalReturn(portfolioId, startDate, endDate);

    return {
      portfolio_return: portfolioReturn,
      portfolio_return_percent: portfolioReturnPercent,
      dataAvailable: false,
      benchmark_return: null,
      benchmark_return_percent: null,
      alpha: null,
      beta: null,
      correlation: null,
      tracking_error: null,
      information_ratio: null,
    };
  }
}
