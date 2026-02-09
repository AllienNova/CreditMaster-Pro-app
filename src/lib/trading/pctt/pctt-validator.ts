/**
 * PCTT Strategy Validator
 * 
 * Statistical validation for PCTT trading signals including:
 * - Monte Carlo permutation testing
 * - Bootstrap confidence intervals
 * - Q-Score calibration
 * - Walk-forward analysis
 */

import { PCTTSignal } from './pctt-core';

// ============================================================================
// TYPES
// ============================================================================

export interface TradeResult {
  signal: PCTTSignal;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  rMultiple: number;
  barsHeld: number;
  outcome: 'win' | 'loss' | 'breakeven';
  exitReason: 'target' | 'stop' | 'time' | 'manual';
}

export interface ValidationResult {
  testName: string;
  statistic: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
  details: Record<string, unknown>;
}

export interface BootstrapCI {
  pointEstimate: number;
  ciLower: number;
  ciUpper: number;
  stdError: number;
  confidenceLevel: number;
  nSamples: number;
}

export interface CalibrationResult {
  qBuckets: number[];
  observedRates: number[];
  expectedRates: number[];
  brierScore: number;
  isCalibrated: boolean;
  calibrationError: number;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  avgRMultiple: number;
  avgBarsHeld: number;
}

export interface ValidatorConfig {
  nSimulations: number;
  confidenceLevel: number;
  randomSeed?: number;
  minSampleSize: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_VALIDATOR_CONFIG: ValidatorConfig = {
  nSimulations: 10000,
  confidenceLevel: 0.95,
  minSampleSize: 30,
};

// ============================================================================
// PCTT VALIDATOR
// ============================================================================

export class PCTTValidator {
  private config: ValidatorConfig;
  private rng: () => number;

  constructor(config: Partial<ValidatorConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATOR_CONFIG, ...config };
    
    // Simple seeded random for reproducibility
    if (this.config.randomSeed !== undefined) {
      let seed = this.config.randomSeed;
      this.rng = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
    } else {
      this.rng = Math.random;
    }
  }

  // ==========================================================================
  // MONTE CARLO SIGNIFICANCE TEST
  // ==========================================================================

  /**
   * Test if strategy returns are statistically significant using
   * Monte Carlo permutation testing.
   */
  monteCarloSignificance(
    returns: number[],
    signals: number[],
    metric: 'sharpe' | 'totalReturn' | 'sortino' = 'sharpe'
  ): ValidationResult {
    if (returns.length !== signals.length) {
      throw new Error('Returns and signals must have the same length');
    }

    if (returns.length < this.config.minSampleSize) {
      // PCTTValidator warning: Sample size is small. Results may be unreliable.
    }

    const metricFunc = this.getMetricFunction(metric);

    // Calculate actual strategy performance
    const strategyReturns = returns.map((r, i) => r * signals[i]);
    const actualMetric = metricFunc(strategyReturns);

    // Generate null distribution via permutation
    const nullMetrics: number[] = [];

    for (let i = 0; i < this.config.nSimulations; i++) {
      const permutedSignals = this.shuffle([...signals]);
      const nullReturns = returns.map((r, j) => r * permutedSignals[j]);
      nullMetrics.push(metricFunc(nullReturns));
    }

    // Calculate p-value (one-tailed)
    const pValue = nullMetrics.filter(m => m >= actualMetric).length / this.config.nSimulations;
    const alpha = 1 - this.config.confidenceLevel;
    const isSignificant = pValue < alpha;

    return {
      testName: 'Monte Carlo Permutation Test',
      statistic: actualMetric,
      pValue,
      isSignificant,
      confidenceLevel: this.config.confidenceLevel,
      details: {
        metric,
        actualValue: actualMetric,
        nullMean: this.mean(nullMetrics),
        nullStd: this.std(nullMetrics),
        nullMedian: this.median(nullMetrics),
        nullPercentile95: this.percentile(nullMetrics, 95),
        nSimulations: this.config.nSimulations,
        sampleSize: returns.length,
      },
    };
  }

  // ==========================================================================
  // BOOTSTRAP CONFIDENCE INTERVALS
  // ==========================================================================

  /**
   * Compute bootstrap confidence interval for a metric
   */
  bootstrapCI(
    data: number[],
    metricFunc: (arr: number[]) => number,
    method: 'percentile' | 'basic' = 'percentile'
  ): BootstrapCI {
    if (data.length < 10) {
      throw new Error('Sample size too small for bootstrap');
    }

    const pointEstimate = metricFunc(data);
    const bootStats: number[] = [];

    for (let i = 0; i < this.config.nSimulations; i++) {
      const bootSample = this.resampleWithReplacement(data);
      bootStats.push(metricFunc(bootSample));
    }

    const alpha = 1 - this.config.confidenceLevel;
    let ciLower: number;
    let ciUpper: number;

    if (method === 'percentile') {
      ciLower = this.percentile(bootStats, (alpha / 2) * 100);
      ciUpper = this.percentile(bootStats, (1 - alpha / 2) * 100);
    } else {
      ciLower = 2 * pointEstimate - this.percentile(bootStats, (1 - alpha / 2) * 100);
      ciUpper = 2 * pointEstimate - this.percentile(bootStats, (alpha / 2) * 100);
    }

    return {
      pointEstimate,
      ciLower,
      ciUpper,
      stdError: this.std(bootStats),
      confidenceLevel: this.config.confidenceLevel,
      nSamples: this.config.nSimulations,
    };
  }

  /**
   * Compute bootstrap CIs for all standard trading metrics
   */
  bootstrapAllMetrics(tradeReturns: number[]): Record<string, BootstrapCI> {
    const metrics: Record<string, (arr: number[]) => number> = {
      meanReturn: this.mean.bind(this),
      medianReturn: this.median.bind(this),
      stdReturn: this.std.bind(this),
      sharpeRatio: (arr) => this.sharpeRatio(arr),
      sortinoRatio: (arr) => this.sortinoRatio(arr),
      winRate: (arr) => arr.filter(x => x > 0).length / arr.length,
      profitFactor: (arr) => this.profitFactor(arr),
      maxDrawdown: (arr) => this.maxDrawdown(arr),
      expectancy: this.mean.bind(this),
    };

    const results: Record<string, BootstrapCI> = {};

    for (const [name, func] of Object.entries(metrics)) {
      try {
        results[name] = this.bootstrapCI(tradeReturns, func);
      } catch (_e) {
        // PCTTValidator warning: Could not compute metric
        void _e;
      }
    }

    return results;
  }

  // ==========================================================================
  // Q-SCORE CALIBRATION
  // ==========================================================================

  /**
   * Calibrate Q-scores against observed win rates
   */
  calibrateQScores(trades: TradeResult[]): CalibrationResult {
    // Group trades by Q-score buckets
    const buckets = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const bucketTrades: TradeResult[][] = buckets.map(() => []);

    for (const trade of trades) {
      const q = trade.signal.qScore;
      for (let i = 0; i < buckets.length; i++) {
        if (q <= buckets[i]) {
          bucketTrades[i].push(trade);
          break;
        }
      }
    }

    // Calculate observed vs expected rates
    const observedRates: number[] = [];
    const expectedRates: number[] = [];

    for (let i = 0; i < buckets.length; i++) {
      const bt = bucketTrades[i];
      if (bt.length > 0) {
        const winRate = bt.filter(t => t.outcome === 'win').length / bt.length;
        observedRates.push(winRate);
        expectedRates.push(buckets[i] - (i > 0 ? buckets[i - 1] : 0) / 2 + (i > 0 ? buckets[i - 1] : 0));
      } else {
        observedRates.push(0);
        expectedRates.push(buckets[i]);
      }
    }

    // Calculate Brier score
    let brierSum = 0;
    for (const trade of trades) {
      const predicted = trade.signal.qScore;
      const actual = trade.outcome === 'win' ? 1 : 0;
      brierSum += (predicted - actual) ** 2;
    }
    const brierScore = trades.length > 0 ? brierSum / trades.length : 1;

    // Calculate calibration error
    let calibrationError = 0;
    for (let i = 0; i < buckets.length; i++) {
      if (bucketTrades[i].length > 0) {
        calibrationError += Math.abs(observedRates[i] - expectedRates[i]);
      }
    }
    calibrationError /= buckets.length;

    return {
      qBuckets: buckets,
      observedRates,
      expectedRates,
      brierScore,
      isCalibrated: brierScore < 0.25 && calibrationError < 0.15,
      calibrationError,
    };
  }

  // ==========================================================================
  // PERFORMANCE METRICS
  // ==========================================================================

  /**
   * Calculate comprehensive performance metrics
   */
  calculateMetrics(trades: TradeResult[]): PerformanceMetrics {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        avgRMultiple: 0,
        avgBarsHeld: 0,
      };
    }

    const wins = trades.filter(t => t.outcome === 'win');
    const losses = trades.filter(t => t.outcome === 'loss');
    const returns = trades.map(t => t.pnl);
    const rMultiples = trades.map(t => t.rMultiple);

    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

    return {
      totalTrades: trades.length,
      winRate: wins.length / trades.length,
      avgWin: wins.length > 0 ? grossProfit / wins.length : 0,
      avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      expectancy: this.mean(returns),
      sharpeRatio: this.sharpeRatio(returns),
      sortinoRatio: this.sortinoRatio(returns),
      maxDrawdown: this.maxDrawdown(returns),
      avgRMultiple: this.mean(rMultiples),
      avgBarsHeld: this.mean(trades.map(t => t.barsHeld)),
    };
  }

  // ==========================================================================
  // WHITE'S REALITY CHECK
  // ==========================================================================

  /**
   * White's Reality Check for data-mining bias
   * Tests if the best strategy is significantly better than random
   * after accounting for multiple testing
   */
  whitesRealityCheck(
    strategies: { returns: number[]; signals: number[]; name: string }[],
    benchmarkReturns: number[],
    metric: 'sharpe' | 'totalReturn' | 'sortino' = 'sharpe'
  ): ValidationResult {
    if (strategies.length === 0) {
      throw new Error('At least one strategy required');
    }

    const metricFunc = this.getMetricFunction(metric);

    // Calculate actual performance for each strategy
    const strategyMetrics = strategies.map(s => {
      const stratReturns = s.returns.map((r, i) => r * s.signals[i]);
      return {
        name: s.name,
        metric: metricFunc(stratReturns),
        returns: stratReturns,
      };
    });

    // Find best strategy
    const bestStrategy = strategyMetrics.reduce((best, curr) => 
      curr.metric > best.metric ? curr : best
    );

    // Calculate benchmark metric
    const benchmarkMetric = metricFunc(benchmarkReturns);

    // Generate null distribution under hypothesis that strategies have no edge
    const nullMaxMetrics: number[] = [];

    for (let sim = 0; sim < this.config.nSimulations; sim++) {
      // For each simulation, calculate max metric across all strategies
      // using bootstrapped returns under null hypothesis
      const bootReturns = this.resampleWithReplacement(benchmarkReturns);
      
      let maxMetric = -Infinity;
      for (const strategy of strategies) {
        // Apply strategy signals to bootstrapped returns
        const stratReturns = bootReturns.map((r, i) => 
          r * (strategy.signals[i % strategy.signals.length] || 1)
        );
        const simMetric = metricFunc(stratReturns);
        maxMetric = Math.max(maxMetric, simMetric);
      }
      
      nullMaxMetrics.push(maxMetric);
    }

    // Calculate adjusted p-value
    // How often does the null max exceed our best strategy?
    const adjustedPValue = nullMaxMetrics.filter(
      m => m >= bestStrategy.metric
    ).length / this.config.nSimulations;

    const alpha = 1 - this.config.confidenceLevel;
    const isSignificant = adjustedPValue < alpha;

    return {
      testName: "White's Reality Check",
      statistic: bestStrategy.metric,
      pValue: adjustedPValue,
      isSignificant,
      confidenceLevel: this.config.confidenceLevel,
      details: {
        bestStrategyName: bestStrategy.name,
        bestStrategyMetric: bestStrategy.metric,
        benchmarkMetric,
        excessReturn: bestStrategy.metric - benchmarkMetric,
        numStrategies: strategies.length,
        nullDistMean: this.mean(nullMaxMetrics),
        nullDistStd: this.std(nullMaxMetrics),
        nullDist95: this.percentile(nullMaxMetrics, 95),
        allStrategyMetrics: strategyMetrics.map(s => ({ name: s.name, metric: s.metric })),
      },
    };
  }

  /**
   * Block bootstrap for time series data
   * Preserves autocorrelation structure
   */
  blockBootstrapCI(
    data: number[],
    metricFunc: (arr: number[]) => number,
    blockSize: number = 10
  ): BootstrapCI {
    if (data.length < blockSize * 2) {
      throw new Error('Data length must be at least 2x block size');
    }

    const pointEstimate = metricFunc(data);
    const bootStats: number[] = [];
    const numBlocks = Math.ceil(data.length / blockSize);

    for (let sim = 0; sim < this.config.nSimulations; sim++) {
      // Sample blocks with replacement
      const bootSample: number[] = [];
      
      for (let b = 0; b < numBlocks; b++) {
        // Random block start
        const start = Math.floor(this.rng() * (data.length - blockSize + 1));
        for (let i = 0; i < blockSize && bootSample.length < data.length; i++) {
          bootSample.push(data[start + i]);
        }
      }
      
      bootStats.push(metricFunc(bootSample.slice(0, data.length)));
    }

    const alpha = 1 - this.config.confidenceLevel;
    const ciLower = this.percentile(bootStats, (alpha / 2) * 100);
    const ciUpper = this.percentile(bootStats, (1 - alpha / 2) * 100);

    return {
      pointEstimate,
      ciLower,
      ciUpper,
      stdError: this.std(bootStats),
      confidenceLevel: this.config.confidenceLevel,
      nSamples: this.config.nSimulations,
    };
  }

  // ==========================================================================
  // WALK-FORWARD ANALYSIS
  // ==========================================================================

  /**
   * Perform walk-forward analysis on trades
   */
  walkForwardAnalysis(
    trades: TradeResult[],
    trainRatio: number = 0.7,
    windows: number = 5
  ): { inSample: PerformanceMetrics[]; outOfSample: PerformanceMetrics[]; stability: number } {
    const windowSize = Math.floor(trades.length / windows);
    const trainSize = Math.floor(windowSize * trainRatio);
    
    const inSample: PerformanceMetrics[] = [];
    const outOfSample: PerformanceMetrics[] = [];

    for (let i = 0; i < windows; i++) {
      const start = i * windowSize;
      const trainEnd = start + trainSize;
      const testEnd = Math.min(start + windowSize, trades.length);

      const trainTrades = trades.slice(start, trainEnd);
      const testTrades = trades.slice(trainEnd, testEnd);

      if (trainTrades.length > 0) {
        inSample.push(this.calculateMetrics(trainTrades));
      }
      if (testTrades.length > 0) {
        outOfSample.push(this.calculateMetrics(testTrades));
      }
    }

    // Calculate stability (correlation between in-sample and out-of-sample Sharpe)
    const isReturns = inSample.map(m => m.expectancy);
    const oosReturns = outOfSample.map(m => m.expectancy);
    
    const minLen = Math.min(isReturns.length, oosReturns.length);
    let stability = 0;
    
    if (minLen >= 3) {
      const correlation = this.correlation(
        isReturns.slice(0, minLen),
        oosReturns.slice(0, minLen)
      );
      stability = Math.max(0, correlation);
    }

    return { inSample, outOfSample, stability };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private getMetricFunction(metric: string): (arr: number[]) => number {
    switch (metric) {
      case 'sharpe':
        return (arr) => this.sharpeRatio(arr);
      case 'totalReturn':
        return (arr) => arr.reduce((a, b) => a * (1 + b), 1) - 1;
      case 'sortino':
        return (arr) => this.sortinoRatio(arr);
      default:
        return (arr) => this.sharpeRatio(arr);
    }
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private resampleWithReplacement<T>(array: T[]): T[] {
    return Array.from({ length: array.length }, () => 
      array[Math.floor(this.rng() * array.length)]
    );
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private std(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = this.mean(arr);
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1));
  }

  private median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  private sharpeRatio(returns: number[], periodsPerYear: number = 252): number {
    const m = this.mean(returns);
    const s = this.std(returns);
    if (s === 0) return 0;
    return (m / s) * Math.sqrt(periodsPerYear);
  }

  private sortinoRatio(returns: number[], periodsPerYear: number = 252): number {
    const m = this.mean(returns);
    const downside = returns.filter(r => r < 0);
    const downsideStd = this.std(downside);
    if (downsideStd === 0) return 0;
    return (m / downsideStd) * Math.sqrt(periodsPerYear);
  }

  private profitFactor(returns: number[]): number {
    const gains = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const losses = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
    if (losses === 0) return gains > 0 ? Infinity : 0;
    return gains / losses;
  }

  private maxDrawdown(returns: number[]): number {
    let peak = 1;
    let maxDD = 0;
    let equity = 1;

    for (const r of returns) {
      equity *= (1 + r);
      peak = Math.max(peak, equity);
      const dd = (peak - equity) / peak;
      maxDD = Math.max(maxDD, dd);
    }

    return maxDD;
  }

  private correlation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const mx = this.mean(x);
    const my = this.mean(y);
    const sx = this.std(x);
    const sy = this.std(y);

    if (sx === 0 || sy === 0) return 0;

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += ((x[i] - mx) / sx) * ((y[i] - my) / sy);
    }

    return sum / (n - 1);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createPCTTValidator(config?: Partial<ValidatorConfig>): PCTTValidator {
  return new PCTTValidator(config);
}
