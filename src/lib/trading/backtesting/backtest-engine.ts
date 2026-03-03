/**
 * Backtesting Engine
 *
 * Historical strategy testing with detailed performance metrics.
 * Supports walk-forward optimization and Monte Carlo simulation.
 */

import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateATR,
  calculateBollingerBands,
  type OHLCV,
} from "../charts/technical-indicators";

// ============================================================================
// TYPES
// ============================================================================

export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  commissionPerTrade: number;
  slippageBps: number;
  marginEnabled: boolean;
  marginMultiplier: number;
  maxPositionSize: number; // Percent of portfolio
  maxOpenPositions: number;
  riskPerTrade: number; // Percent risk per trade
}

export interface BacktestStrategy {
  name: string;
  description?: string;

  // Entry conditions
  entryRules: StrategyRule[];

  // Exit conditions
  exitRules: StrategyRule[];

  // Position sizing
  positionSizing: "fixed" | "percent" | "risk_based" | "kelly";
  positionValue?: number;

  // Risk management
  stopLoss?: { type: "fixed" | "atr" | "percent"; value: number };
  takeProfit?: {
    type: "fixed" | "atr" | "percent" | "risk_multiple";
    value: number;
  };
  trailingStop?: {
    type: "percent" | "atr";
    value: number;
    activation?: number;
  };

  // Filters
  tradingHours?: { start: number; end: number };
  daysOfWeek?: number[];
}

export interface StrategyRule {
  indicator: string;
  operator:
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "eq"
    | "crosses_above"
    | "crosses_below";
  value: number | string; // Number or another indicator name
  params?: Record<string, number>;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  side: "long" | "short";
  entryDate: Date;
  entryPrice: number;
  entryReason: string;
  exitDate?: Date;
  exitPrice?: number;
  exitReason?: string;
  quantity: number;
  pnl?: number;
  pnlPercent?: number;
  commission: number;
  maxDrawdown?: number;
  maxProfit?: number;
  holdingPeriodDays?: number;
}

export interface BacktestResult {
  strategyName: string;
  symbol: string;
  config: BacktestConfig;

  // Summary metrics
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;

  // Risk metrics
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number; // Days
  volatility: number;

  // Trade metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  expectancy: number;
  avgHoldingPeriod: number;

  // Equity curve
  equityCurve: { date: Date; equity: number; drawdown: number }[];

  // Monthly returns
  monthlyReturns: { month: string; return: number }[];

  // All trades
  trades: BacktestTrade[];

  // Execution time
  executionTimeMs: number;
}

export interface WalkForwardResult {
  inSampleResults: BacktestResult[];
  outOfSampleResults: BacktestResult[];
  robustnessScore: number;
  optimizedParams: Record<string, number>;
}

export interface MonteCarloResult {
  simulations: number;
  medianReturn: number;
  percentile5: number;
  percentile95: number;
  probabilityOfProfit: number;
  expectedMaxDrawdown: number;
  worstCaseDrawdown: number;
}

// ============================================================================
// BACKTEST ENGINE
// ============================================================================

export class BacktestEngine {
  private config: BacktestConfig;
  private data: Map<string, OHLCV[]> = new Map();
  private indicators: Map<string, Map<string, number[]>> = new Map();

  constructor(config: Partial<BacktestConfig> = {}) {
    this.config = {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      initialCapital: 100000,
      commissionPerTrade: 0,
      slippageBps: 5,
      marginEnabled: false,
      marginMultiplier: 1,
      maxPositionSize: 10,
      maxOpenPositions: 10,
      riskPerTrade: 1,
      ...config,
    };
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  loadData(symbol: string, data: OHLCV[]): void {
    // Filter data by date range
    const filtered = data.filter((d) => {
      const date = new Date(d.timestamp);
      return date >= this.config.startDate && date <= this.config.endDate;
    });

    this.data.set(symbol, filtered);
    this.precomputeIndicators(symbol, filtered);
  }

  private precomputeIndicators(symbol: string, data: OHLCV[]): void {
    const indicators = new Map<string, number[]>();

    // Moving averages — skip periods that exceed data length
    [10, 20, 50, 100, 200].forEach((period) => {
      if (data.length >= period) {
        const sma = calculateSMA(data, period);
        const ema = calculateEMA(data, period);
        indicators.set(`sma_${period}`, this.alignIndicator(data, sma, period));
        indicators.set(`ema_${period}`, this.alignIndicator(data, ema, period));
      } else {
        indicators.set(`sma_${period}`, new Array(data.length).fill(NaN));
        indicators.set(`ema_${period}`, new Array(data.length).fill(NaN));
      }
    });

    // RSI — skip periods that exceed data length
    [7, 14, 21].forEach((period) => {
      if (data.length >= period + 1) {
        const rsi = calculateRSI(data, period);
        indicators.set(
          `rsi_${period}`,
          this.alignIndicator(data, rsi, period + 1),
        );
      } else {
        indicators.set(`rsi_${period}`, new Array(data.length).fill(NaN));
      }
    });

    // MACD — needs at least 26 bars (slow period)
    if (data.length >= 26) {
      const macd = calculateMACD(data, 12, 26, 9);
      indicators.set("macd", this.alignMACDIndicator(data, macd, "macd"));
      indicators.set(
        "macd_signal",
        this.alignMACDIndicator(data, macd, "signal"),
      );
      indicators.set(
        "macd_histogram",
        this.alignMACDIndicator(data, macd, "histogram"),
      );
    } else {
      const nanArr = new Array(data.length).fill(NaN);
      indicators.set("macd", nanArr);
      indicators.set("macd_signal", [...nanArr]);
      indicators.set("macd_histogram", [...nanArr]);
    }

    // ATR — skip periods that exceed data length
    [7, 14, 21].forEach((period) => {
      if (data.length >= period + 1) {
        const atr = calculateATR(data, period);
        indicators.set(
          `atr_${period}`,
          this.alignIndicator(data, atr, period + 1),
        );
      } else {
        indicators.set(`atr_${period}`, new Array(data.length).fill(NaN));
      }
    });

    // Bollinger Bands — needs at least 20 bars
    if (data.length >= 20) {
      const bb = calculateBollingerBands(data, 20, 2);
      indicators.set(
        "bb_upper",
        bb.map((b) => b.upper),
      );
      indicators.set(
        "bb_middle",
        bb.map((b) => b.middle),
      );
      indicators.set(
        "bb_lower",
        bb.map((b) => b.lower),
      );
    } else {
      const nanArr = new Array(data.length).fill(NaN);
      indicators.set("bb_upper", nanArr);
      indicators.set("bb_middle", [...nanArr]);
      indicators.set("bb_lower", [...nanArr]);
    }

    this.indicators.set(symbol, indicators);
  }

  private alignIndicator(
    data: OHLCV[],
    indicator: { timestamp: number; value: number }[],
    offset: number,
  ): number[] {
    const result = new Array(data.length).fill(NaN);
    indicator.forEach((val, i) => {
      result[i + offset - 1] = val.value;
    });
    return result;
  }

  private alignMACDIndicator(
    data: OHLCV[],
    macd: {
      timestamp: number;
      macd: number;
      signal: number;
      histogram: number;
    }[],
    field: "macd" | "signal" | "histogram",
  ): number[] {
    const result = new Array(data.length).fill(NaN);
    const offset = data.length - macd.length;
    macd.forEach((val, i) => {
      result[i + offset] = val[field];
    });
    return result;
  }

  // ============================================================================
  // BACKTESTING
  // ============================================================================

  async runBacktest(
    symbol: string,
    strategy: BacktestStrategy,
  ): Promise<BacktestResult> {
    const startTime = Date.now();

    const data = this.data.get(symbol);
    if (!data || data.length === 0) {
      throw new Error(`No data loaded for ${symbol}`);
    }

    const indicators = this.indicators.get(symbol);
    if (!indicators) {
      throw new Error(`No indicators computed for ${symbol}`);
    }

    // Initialize state
    let capital = this.config.initialCapital;
    let position: BacktestTrade | null = null;
    const trades: BacktestTrade[] = [];
    const equityCurve: { date: Date; equity: number; drawdown: number }[] = [];
    let peakEquity = capital;
    let maxDrawdown = 0;

    // Walk through each bar
    for (let i = 50; i < data.length; i++) {
      const bar = data[i];
      const date = new Date(bar.timestamp);

      // Update position P&L
      if (position) {
        const currentPnl =
          position.side === "long"
            ? (bar.close - position.entryPrice) * position.quantity
            : (position.entryPrice - bar.close) * position.quantity;

        // Check stop loss
        if (strategy.stopLoss) {
          const stopPrice = this.calculateStopPrice(
            position,
            strategy.stopLoss,
            data,
            i,
          );
          if (
            (position.side === "long" && bar.low <= stopPrice) ||
            (position.side === "short" && bar.high >= stopPrice)
          ) {
            position = this.closePosition(
              position,
              stopPrice,
              date,
              "Stop Loss",
              trades,
            );
          }
        }

        // Check take profit
        if (position && strategy.takeProfit) {
          const targetPrice = this.calculateTargetPrice(
            position,
            strategy.takeProfit,
            data,
            i,
          );
          if (
            (position.side === "long" && bar.high >= targetPrice) ||
            (position.side === "short" && bar.low <= targetPrice)
          ) {
            position = this.closePosition(
              position,
              targetPrice,
              date,
              "Take Profit",
              trades,
            );
          }
        }

        // Check exit rules
        if (
          position &&
          this.evaluateRules(strategy.exitRules, data, indicators, i)
        ) {
          position = this.closePosition(
            position,
            bar.close,
            date,
            "Exit Signal",
            trades,
          );
        }
      }

      // Check entry if no position
      if (
        !position &&
        this.evaluateRules(strategy.entryRules, data, indicators, i)
      ) {
        const quantity = this.calculatePositionSize(
          capital,
          bar.close,
          strategy,
        );
        const commission = this.config.commissionPerTrade;
        const slippage = bar.close * (this.config.slippageBps / 10000);

        position = {
          id: `bt_${i}`,
          symbol,
          side: "long", // Simplified - would determine from rules
          entryDate: date,
          entryPrice: bar.close + slippage,
          entryReason: "Entry Signal",
          quantity,
          commission,
          maxDrawdown: 0,
          maxProfit: 0,
        };

        capital -= commission;
      }

      // Calculate equity
      const positionValue = position ? position.quantity * bar.close : 0;
      const equity = capital + positionValue;

      // Track drawdown
      if (equity > peakEquity) {
        peakEquity = equity;
      }
      const drawdown = (peakEquity - equity) / peakEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      equityCurve.push({ date, equity, drawdown });
    }

    // Close any remaining position
    if (position) {
      const lastBar = data[data.length - 1];
      this.closePosition(
        position,
        lastBar.close,
        new Date(lastBar.timestamp),
        "End of Test",
        trades,
      );
    }

    // Calculate final capital
    const finalCapital = trades.reduce(
      (cap, t) => cap + (t.pnl || 0) - t.commission,
      this.config.initialCapital,
    );

    // Calculate metrics
    const result = this.calculateMetrics(
      symbol,
      strategy.name,
      trades,
      equityCurve,
      finalCapital,
      maxDrawdown,
      Date.now() - startTime,
    );

    return result;
  }

  private evaluateRules(
    rules: StrategyRule[],
    data: OHLCV[],
    indicators: Map<string, number[]>,
    index: number,
  ): boolean {
    if (rules.length === 0) return false;

    return rules.every((rule) => {
      const leftValue = this.getIndicatorValue(
        rule.indicator,
        data,
        indicators,
        index,
        rule.params,
      );

      let rightValue: number;
      if (typeof rule.value === "number") {
        rightValue = rule.value;
      } else {
        rightValue = this.getIndicatorValue(
          rule.value,
          data,
          indicators,
          index,
        );
      }

      if (isNaN(leftValue) || isNaN(rightValue)) return false;

      switch (rule.operator) {
        case "gt":
          return leftValue > rightValue;
        case "lt":
          return leftValue < rightValue;
        case "gte":
          return leftValue >= rightValue;
        case "lte":
          return leftValue <= rightValue;
        case "eq":
          return Math.abs(leftValue - rightValue) < 0.0001;
        case "crosses_above":
          const prevLeft = this.getIndicatorValue(
            rule.indicator,
            data,
            indicators,
            index - 1,
            rule.params,
          );
          const prevRight =
            typeof rule.value === "number"
              ? rule.value
              : this.getIndicatorValue(rule.value, data, indicators, index - 1);
          return prevLeft <= prevRight && leftValue > rightValue;
        case "crosses_below":
          const prevL = this.getIndicatorValue(
            rule.indicator,
            data,
            indicators,
            index - 1,
            rule.params,
          );
          const prevR =
            typeof rule.value === "number"
              ? rule.value
              : this.getIndicatorValue(rule.value, data, indicators, index - 1);
          return prevL >= prevR && leftValue < rightValue;
        default:
          return false;
      }
    });
  }

  private getIndicatorValue(
    indicator: string,
    data: OHLCV[],
    indicators: Map<string, number[]>,
    index: number,
    params?: Record<string, number>,
  ): number {
    // Price values
    if (indicator === "close") return data[index].close;
    if (indicator === "open") return data[index].open;
    if (indicator === "high") return data[index].high;
    if (indicator === "low") return data[index].low;
    if (indicator === "volume") return data[index].volume;

    // Indicator with optional period
    const match = indicator.match(/^(\w+)(?:_(\d+))?$/);
    if (match) {
      const [, name, period] = match;
      const key = period
        ? `${name}_${period}`
        : `${name}_${params?.period || 14}`;
      const values = indicators.get(key);
      if (values && values[index] !== undefined) {
        return values[index];
      }
    }

    return NaN;
  }

  private calculatePositionSize(
    capital: number,
    price: number,
    strategy: BacktestStrategy,
  ): number {
    const maxPositionValue = capital * (this.config.maxPositionSize / 100);

    switch (strategy.positionSizing) {
      case "fixed":
        return Math.floor((strategy.positionValue || 10000) / price);
      case "percent":
        return Math.floor(maxPositionValue / price);
      case "risk_based":
        // Risk a fixed % of capital per trade
        const riskAmount = capital * (this.config.riskPerTrade / 100);
        const stopDistance = price * 0.02; // Assume 2% stop
        return Math.floor(riskAmount / stopDistance);
      case "kelly":
        // Simplified Kelly - would need win rate and avg win/loss
        return Math.floor((maxPositionValue * 0.25) / price);
      default:
        return Math.floor(maxPositionValue / price);
    }
  }

  private calculateStopPrice(
    position: BacktestTrade,
    stopLoss: NonNullable<BacktestStrategy["stopLoss"]>,
    data: OHLCV[],
    index: number,
  ): number {
    const multiplier = position.side === "long" ? -1 : 1;

    switch (stopLoss.type) {
      case "fixed":
        return position.entryPrice + multiplier * stopLoss.value;
      case "percent":
        return position.entryPrice * (1 + (multiplier * stopLoss.value) / 100);
      case "atr":
        const atr =
          this.indicators.get(position.symbol)?.get("atr_14")?.[index] || 0;
        return position.entryPrice + multiplier * atr * stopLoss.value;
      default:
        return position.entryPrice * (1 + multiplier * 0.02);
    }
  }

  private calculateTargetPrice(
    position: BacktestTrade,
    takeProfit: NonNullable<BacktestStrategy["takeProfit"]>,
    data: OHLCV[],
    index: number,
  ): number {
    const multiplier = position.side === "long" ? 1 : -1;

    switch (takeProfit.type) {
      case "fixed":
        return position.entryPrice + multiplier * takeProfit.value;
      case "percent":
        return (
          position.entryPrice * (1 + (multiplier * takeProfit.value) / 100)
        );
      case "atr":
        const atr =
          this.indicators.get(position.symbol)?.get("atr_14")?.[index] || 0;
        return position.entryPrice + multiplier * atr * takeProfit.value;
      case "risk_multiple":
        const stopDistance = Math.abs(
          position.entryPrice -
            this.calculateStopPrice(
              position,
              { type: "percent", value: 2 },
              data,
              index,
            ),
        );
        return (
          position.entryPrice + multiplier * stopDistance * takeProfit.value
        );
      default:
        return position.entryPrice * (1 + multiplier * 0.04);
    }
  }

  private closePosition(
    position: BacktestTrade,
    exitPrice: number,
    exitDate: Date,
    reason: string,
    trades: BacktestTrade[],
  ): null {
    const slippage = exitPrice * (this.config.slippageBps / 10000);
    const actualExitPrice =
      position.side === "long" ? exitPrice - slippage : exitPrice + slippage;

    const pnl =
      position.side === "long"
        ? (actualExitPrice - position.entryPrice) * position.quantity
        : (position.entryPrice - actualExitPrice) * position.quantity;

    const pnlPercent = (pnl / (position.entryPrice * position.quantity)) * 100;
    const holdingPeriod =
      (exitDate.getTime() - position.entryDate.getTime()) /
      (1000 * 60 * 60 * 24);

    trades.push({
      ...position,
      exitDate,
      exitPrice: actualExitPrice,
      exitReason: reason,
      pnl: pnl - position.commission,
      pnlPercent,
      holdingPeriodDays: holdingPeriod,
    });

    return null;
  }

  // ============================================================================
  // METRICS CALCULATION
  // ============================================================================

  private calculateMetrics(
    symbol: string,
    strategyName: string,
    trades: BacktestTrade[],
    equityCurve: { date: Date; equity: number; drawdown: number }[],
    finalCapital: number,
    maxDrawdown: number,
    executionTimeMs: number,
  ): BacktestResult {
    const initial = this.config.initialCapital;
    const totalReturn = finalCapital - initial;
    const totalReturnPercent = (totalReturn / initial) * 100;

    // Calculate time period
    const days =
      equityCurve.length > 0
        ? (equityCurve[equityCurve.length - 1].date.getTime() -
            equityCurve[0].date.getTime()) /
          (1000 * 60 * 60 * 24)
        : 365;
    const years = days / 365;
    const annualizedReturn =
      (Math.pow(finalCapital / initial, 1 / years) - 1) * 100;

    // Trade statistics
    const winningTrades = trades.filter((t) => (t.pnl || 0) > 0);
    const losingTrades = trades.filter((t) => (t.pnl || 0) <= 0);
    const winRate =
      trades.length > 0 ? winningTrades.length / trades.length : 0;

    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce((s, t) => s + (t.pnl || 0), 0) /
          winningTrades.length
        : 0;
    const avgLoss =
      losingTrades.length > 0
        ? Math.abs(
            losingTrades.reduce((s, t) => s + (t.pnl || 0), 0) /
              losingTrades.length,
          )
        : 0;

    const largestWin = Math.max(0, ...trades.map((t) => t.pnl || 0));
    const largestLoss = Math.min(0, ...trades.map((t) => t.pnl || 0));

    const grossProfit = winningTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const grossLoss = Math.abs(
      losingTrades.reduce((s, t) => s + (t.pnl || 0), 0),
    );
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const expectancy =
      trades.length > 0 ? winRate * avgWin - (1 - winRate) * avgLoss : 0;

    const avgHoldingPeriod =
      trades.length > 0
        ? trades.reduce((s, t) => s + (t.holdingPeriodDays || 0), 0) /
          trades.length
        : 0;

    // Calculate daily returns for risk metrics
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prevEquity = equityCurve[i - 1].equity;
      const currentEquity = equityCurve[i].equity;
      dailyReturns.push((currentEquity - prevEquity) / prevEquity);
    }

    const avgDailyReturn =
      dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((s, r) => s + Math.pow(r - avgDailyReturn, 2), 0) /
      dailyReturns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized

    const riskFreeRate = 0.04; // 4% annual
    const sharpeRatio =
      volatility > 0 ? (annualizedReturn / 100 - riskFreeRate) / volatility : 0;

    // Sortino (downside deviation only)
    const negativeReturns = dailyReturns.filter((r) => r < 0);
    const downsideVariance =
      negativeReturns.reduce((s, r) => s + Math.pow(r, 2), 0) /
      negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252);
    const sortinoRatio =
      downsideDeviation > 0
        ? (annualizedReturn / 100 - riskFreeRate) / downsideDeviation
        : 0;

    // Calmar ratio
    const calmarRatio =
      maxDrawdown > 0 ? annualizedReturn / (maxDrawdown * 100) : 0;

    // Monthly returns
    const monthlyReturns = this.calculateMonthlyReturns(equityCurve);

    // Max drawdown duration
    const maxDrawdownDuration = this.calculateMaxDrawdownDuration(equityCurve);

    return {
      strategyName,
      symbol,
      config: this.config,
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown: maxDrawdown * 100,
      maxDrawdownPercent: maxDrawdown * 100,
      maxDrawdownDuration,
      volatility: volatility * 100,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      profitFactor,
      expectancy,
      avgHoldingPeriod,
      equityCurve,
      monthlyReturns,
      trades,
      executionTimeMs,
    };
  }

  private calculateMonthlyReturns(
    equityCurve: { date: Date; equity: number }[],
  ): { month: string; return: number }[] {
    const monthly: Map<string, { start: number; end: number }> = new Map();

    equityCurve.forEach((point) => {
      const month = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthly.get(month);
      if (!existing) {
        monthly.set(month, { start: point.equity, end: point.equity });
      } else {
        existing.end = point.equity;
      }
    });

    return Array.from(monthly.entries()).map(([month, { start, end }]) => ({
      month,
      return: ((end - start) / start) * 100,
    }));
  }

  private calculateMaxDrawdownDuration(
    equityCurve: { date: Date; equity: number; drawdown: number }[],
  ): number {
    let maxDuration = 0;
    let drawdownStart: Date | null = null;

    equityCurve.forEach((point) => {
      if (point.drawdown > 0) {
        if (!drawdownStart) {
          drawdownStart = point.date;
        }
      } else {
        if (drawdownStart) {
          const duration =
            (point.date.getTime() - drawdownStart.getTime()) /
            (1000 * 60 * 60 * 24);
          if (duration > maxDuration) {
            maxDuration = duration;
          }
          drawdownStart = null;
        }
      }
    });

    return Math.round(maxDuration);
  }

  // ============================================================================
  // WALK-FORWARD OPTIMIZATION
  // ============================================================================

  /**
   * Run walk-forward analysis by splitting data into in-sample (training)
   * and out-of-sample (validation) windows. Tests parameter stability
   * across multiple time periods and computes a robustness score.
   *
   * @param symbol - The symbol to test
   * @param strategy - Base strategy definition
   * @param windows - Number of walk-forward windows (default 5)
   * @param inSampleRatio - Fraction of each window used for in-sample (default 0.7)
   * @param paramRanges - Optional parameter ranges to optimize over
   */
  async runWalkForward(
    symbol: string,
    strategy: BacktestStrategy,
    windows: number = 5,
    inSampleRatio: number = 0.7,
    paramRanges?: Record<string, { min: number; max: number; step: number }>,
  ): Promise<WalkForwardResult> {
    const data = this.data.get(symbol);
    if (!data || data.length === 0) {
      throw new Error(`No data loaded for ${symbol}`);
    }

    const totalBars = data.length;
    const windowSize = Math.floor(totalBars / windows);
    const inSampleSize = Math.floor(windowSize * inSampleRatio);
    const outOfSampleSize = windowSize - inSampleSize;

    const MIN_WINDOW_SIZE = 100;
    if (windowSize < MIN_WINDOW_SIZE) {
      throw new Error(
        `Insufficient data for ${windows} walk-forward windows (need at least ${windows * MIN_WINDOW_SIZE} bars, got ${totalBars})`,
      );
    }

    const inSampleResults: BacktestResult[] = [];
    const outOfSampleResults: BacktestResult[] = [];
    let bestParams: Record<string, number> = {};

    for (let w = 0; w < windows; w++) {
      const windowStart = w * windowSize;
      const inSampleEnd = windowStart + inSampleSize;
      const outOfSampleEnd = Math.min(windowStart + windowSize, totalBars);

      // Create in-sample engine with sliced data
      const inSampleData = data.slice(windowStart, inSampleEnd);
      const inSampleEngine = new BacktestEngine({
        ...this.config,
        startDate: new Date(inSampleData[0].timestamp),
        endDate: new Date(inSampleData[inSampleData.length - 1].timestamp),
      });
      inSampleEngine.loadData(symbol, inSampleData);

      // If paramRanges provided, find best params on in-sample data
      let bestStrategy = strategy;
      if (paramRanges && Object.keys(paramRanges).length > 0) {
        const optimized = await this.optimizeParams(
          inSampleEngine,
          symbol,
          strategy,
          paramRanges,
        );
        bestStrategy = optimized.strategy;
        bestParams = { ...bestParams, ...optimized.params };
      }

      // Run in-sample backtest
      const inSampleResult = await inSampleEngine.runBacktest(
        symbol,
        bestStrategy,
      );
      inSampleResults.push(inSampleResult);

      // Run out-of-sample backtest with the same params
      const outOfSampleData = data.slice(inSampleEnd, outOfSampleEnd);
      if (outOfSampleData.length >= 50) {
        const outOfSampleEngine = new BacktestEngine({
          ...this.config,
          startDate: new Date(outOfSampleData[0].timestamp),
          endDate: new Date(
            outOfSampleData[outOfSampleData.length - 1].timestamp,
          ),
        });
        outOfSampleEngine.loadData(symbol, outOfSampleData);
        const outOfSampleResult = await outOfSampleEngine.runBacktest(
          symbol,
          bestStrategy,
        );
        outOfSampleResults.push(outOfSampleResult);
      }
    }

    // Calculate robustness score: how well out-of-sample tracks in-sample
    const robustnessScore = this.calculateRobustness(
      inSampleResults,
      outOfSampleResults,
    );

    return {
      inSampleResults,
      outOfSampleResults,
      robustnessScore,
      optimizedParams: bestParams,
    };
  }

  /**
   * Grid-search parameter optimization over in-sample data.
   * Maximizes Sharpe ratio to balance return and risk.
   */
  private async optimizeParams(
    engine: BacktestEngine,
    symbol: string,
    strategy: BacktestStrategy,
    paramRanges: Record<string, { min: number; max: number; step: number }>,
  ): Promise<{ strategy: BacktestStrategy; params: Record<string, number> }> {
    let bestSharpe = -Infinity;
    let bestStrategy = strategy;
    let bestParams: Record<string, number> = {};

    // Generate parameter combinations (limited to prevent combinatorial explosion)
    const paramNames = Object.keys(paramRanges);
    const paramValues: number[][] = paramNames.map((name) => {
      const range = paramRanges[name];
      const values: number[] = [];
      for (let v = range.min; v <= range.max; v += range.step) {
        values.push(v);
      }
      return values;
    });

    // Cap total combinations at 100 to keep runtime reasonable
    const totalCombinations = paramValues.reduce(
      (acc, vals) => acc * vals.length,
      1,
    );
    const stride = Math.max(1, Math.floor(totalCombinations / 100));

    const combos = this.generateCombinations(paramValues);
    for (let i = 0; i < combos.length; i += stride) {
      const combo = combos[i];
      const params: Record<string, number> = {};
      paramNames.forEach((name, idx) => {
        params[name] = combo[idx];
      });

      // Apply params to strategy rules
      const modifiedStrategy = this.applyParamsToStrategy(strategy, params);

      try {
        const result = await engine.runBacktest(symbol, modifiedStrategy);
        if (
          result.sharpeRatio > bestSharpe &&
          result.totalTrades >= 5 // Minimum trade filter
        ) {
          bestSharpe = result.sharpeRatio;
          bestStrategy = modifiedStrategy;
          bestParams = params;
        }
      } catch {
        // Skip invalid parameter combinations
      }
    }

    return { strategy: bestStrategy, params: bestParams };
  }

  /** Generate cartesian product of parameter value arrays */
  private generateCombinations(arrays: number[][]): number[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restCombos = this.generateCombinations(rest);
    const result: number[][] = [];
    for (const val of first) {
      for (const combo of restCombos) {
        result.push([val, ...combo]);
      }
    }
    return result;
  }

  /** Apply numeric params to strategy rule params fields */
  private applyParamsToStrategy(
    strategy: BacktestStrategy,
    params: Record<string, number>,
  ): BacktestStrategy {
    const applyToRules = (rules: StrategyRule[]): StrategyRule[] =>
      rules.map((rule) => ({
        ...rule,
        params: { ...rule.params, ...params },
        value:
          typeof rule.value === "number" && params[rule.indicator] !== undefined
            ? params[rule.indicator]
            : rule.value,
      }));

    return {
      ...strategy,
      entryRules: applyToRules(strategy.entryRules),
      exitRules: applyToRules(strategy.exitRules),
    };
  }

  /**
   * Calculate robustness score (0-100) measuring out-of-sample consistency.
   * Considers return degradation, Sharpe degradation, and win rate stability.
   */
  private calculateRobustness(
    inSample: BacktestResult[],
    outOfSample: BacktestResult[],
  ): number {
    if (outOfSample.length === 0) return 0;

    const count = Math.min(inSample.length, outOfSample.length);
    let returnDegradation = 0;
    let sharpeDegradation = 0;
    let winRateStability = 0;

    for (let i = 0; i < count; i++) {
      const inR = inSample[i];
      const outR = outOfSample[i];

      // Return degradation: ratio of out-of-sample to in-sample return
      const retRatio =
        inR.annualizedReturn !== 0
          ? outR.annualizedReturn / inR.annualizedReturn
          : outR.annualizedReturn >= 0
            ? 1
            : 0;
      returnDegradation += Math.min(retRatio, 1.5); // Cap at 1.5 to avoid outlier skew

      // Sharpe degradation
      const sharpeRatio =
        inR.sharpeRatio !== 0
          ? outR.sharpeRatio / inR.sharpeRatio
          : outR.sharpeRatio >= 0
            ? 1
            : 0;
      sharpeDegradation += Math.min(sharpeRatio, 1.5);

      // Win rate stability (absolute difference)
      winRateStability += 1 - Math.abs(inR.winRate - outR.winRate);
    }

    // Average across windows
    returnDegradation /= count;
    sharpeDegradation /= count;
    winRateStability /= count;

    // Weighted composite: 40% return, 40% Sharpe, 20% win rate
    const rawScore =
      returnDegradation * 0.4 +
      sharpeDegradation * 0.4 +
      winRateStability * 0.2;

    // Scale to 0-100
    return Math.max(0, Math.min(100, rawScore * 100));
  }

  // ============================================================================
  // MONTE CARLO SIMULATION
  // ============================================================================

  runMonteCarloSimulation(
    trades: BacktestTrade[],
    simulations: number = 1000,
  ): MonteCarloResult {
    const returns = trades.map((t) => t.pnlPercent || 0);
    const simulatedReturns: number[] = [];
    const simulatedDrawdowns: number[] = [];

    for (let sim = 0; sim < simulations; sim++) {
      // Shuffle returns
      const shuffled = [...returns].sort(() => Math.random() - 0.5);

      // Calculate cumulative return
      let equity = 100;
      let peak = 100;
      let maxDrawdown = 0;

      shuffled.forEach((ret) => {
        equity *= 1 + ret / 100;
        if (equity > peak) peak = equity;
        const dd = (peak - equity) / peak;
        if (dd > maxDrawdown) maxDrawdown = dd;
      });

      simulatedReturns.push(((equity - 100) / 100) * 100);
      simulatedDrawdowns.push(maxDrawdown * 100);
    }

    // Sort results
    simulatedReturns.sort((a, b) => a - b);
    simulatedDrawdowns.sort((a, b) => a - b);

    const profitableCount = simulatedReturns.filter((r) => r > 0).length;

    return {
      simulations,
      medianReturn: simulatedReturns[Math.floor(simulations / 2)],
      percentile5: simulatedReturns[Math.floor(simulations * 0.05)],
      percentile95: simulatedReturns[Math.floor(simulations * 0.95)],
      probabilityOfProfit: profitableCount / simulations,
      expectedMaxDrawdown:
        simulatedDrawdowns.reduce((s, d) => s + d, 0) / simulations,
      worstCaseDrawdown: simulatedDrawdowns[Math.floor(simulations * 0.95)],
    };
  }
}

// Export factory
export function createBacktestEngine(
  config?: Partial<BacktestConfig>,
): BacktestEngine {
  return new BacktestEngine(config);
}
