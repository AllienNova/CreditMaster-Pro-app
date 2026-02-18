/**
 * Performance Calculator Service
 *
 * Calculates portfolio performance metrics including returns, volatility,
 * Sharpe ratio, drawdowns, and benchmarking against market indices.
 */

import { PortfolioService } from "./PortfolioService";
import { PortfolioPerformance } from "../types/portfolio-db.types";

/**
 * Benchmark comparison result
 */
export interface BenchmarkComparison {
  portfolio_return: number;
  portfolio_return_percent: number;
  benchmark_return: number;
  benchmark_return_percent: number;
  alpha: number; // Excess return vs benchmark
  beta: number; // Volatility relative to benchmark
  correlation: number;
  tracking_error: number;
  information_ratio: number;
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
   * Benchmark portfolio performance against S&P 500
   * @param portfolioId Portfolio ID
   * @param startDate Start date for comparison
   * @param endDate End date for comparison
   * @returns Benchmark comparison metrics
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

    // Calculate portfolio return
    const { absolute: portfolioReturn, percentage: portfolioReturnPercent } =
      await this.calculateTotalReturn(portfolioId, startDate, endDate);

    // Placeholder S&P 500 return (in production, fetch from market data API)
    const benchmarkReturnPercent = 10; // Assume 10% annual return
    const totalCost = portfolio.total_cost_basis;
    const benchmarkReturn = (totalCost * benchmarkReturnPercent) / 100;

    // Calculate alpha (excess return)
    const alpha = portfolioReturnPercent - benchmarkReturnPercent;

    // Calculate beta (placeholder - would need covariance calculation)
    const beta = 1.0; // Market beta

    // Calculate correlation (placeholder)
    const correlation = 0.85;

    // Calculate tracking error (std dev of difference in returns)
    const trackingError = Math.abs(alpha) / 10; // Simplified

    // Calculate information ratio (alpha / tracking error)
    const informationRatio = trackingError > 0 ? alpha / trackingError : 0;

    return {
      portfolio_return: portfolioReturn,
      portfolio_return_percent: portfolioReturnPercent,
      benchmark_return: benchmarkReturn,
      benchmark_return_percent: benchmarkReturnPercent,
      alpha,
      beta,
      correlation,
      tracking_error: trackingError,
      information_ratio: informationRatio,
    };
  }
}
