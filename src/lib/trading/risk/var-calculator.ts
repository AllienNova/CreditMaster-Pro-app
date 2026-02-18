/**
 * Value-at-Risk (VaR) Calculator
 *
 * Three VaR methodologies:
 * 1. Parametric (Variance-Covariance) — assumes normal distribution
 * 2. Historical Simulation — uses actual return distribution
 * 3. Conditional VaR (CVaR / Expected Shortfall) — expected loss beyond VaR
 *
 * Integrates with CorrelationMonitor for portfolio covariance estimation.
 */

import {
  CorrelationMonitor,
  correlationMonitor,
} from '@/lib/trading/correlation-monitor';

// ============================================================================
// TYPES
// ============================================================================

export interface VaRPosition {
  symbol: string;
  value: number;
  weight: number;
}

export interface VaRConfig {
  confidenceLevel: number;   // e.g. 0.95, 0.99
  horizonDays: number;       // holding period
  windowDays: number;        // lookback for historical data
}

export interface VaRResult {
  method: 'parametric' | 'historical' | 'conditional';
  var: number;               // dollar VaR (positive = potential loss)
  varPercent: number;        // VaR as % of portfolio
  confidenceLevel: number;
  horizonDays: number;
  timestamp: Date;
}

export interface ConditionalVaRResult extends VaRResult {
  method: 'conditional';
  expectedShortfall: number;
  expectedShortfallPercent: number;
  tailObservations: number;
}

export interface ComprehensiveVaR {
  portfolioValue: number;
  parametric: VaRResult;
  historical: VaRResult;
  conditional: ConditionalVaRResult;
  componentVaR: { symbol: string; marginalVaR: number; componentVaR: number; percentContribution: number }[];
  diversificationBenefit: number;
  diversificationBenefitPercent: number;
  timestamp: Date;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_VAR_CONFIG: VaRConfig = {
  confidenceLevel: 0.95,
  horizonDays: 1,
  windowDays: 252,
};

// ============================================================================
// VAR CALCULATOR
// ============================================================================

export class VaRCalculator {
  private monitor: CorrelationMonitor;
  private returnData: Map<string, number[]> = new Map();

  constructor(monitor?: CorrelationMonitor) {
    this.monitor = monitor || correlationMonitor;
  }

  /**
   * Provide historical returns directly for VaR calculations.
   * Each entry in the array is a daily return (e.g. 0.01 = +1%).
   */
  setReturns(symbol: string, returns: number[]): void {
    this.returnData.set(symbol, returns);
  }

  // ============================================================================
  // PARAMETRIC VaR (Variance-Covariance Method)
  // ============================================================================

  /**
   * Parametric VaR assumes portfolio returns are normally distributed.
   *
   * VaR = Z(α) × σ_portfolio × √(horizon) × portfolio_value
   *
   * Where σ_portfolio accounts for correlations via the covariance matrix.
   */
  parametricVaR(
    positions: VaRPosition[],
    config: VaRConfig = DEFAULT_VAR_CONFIG
  ): VaRResult {
    const portfolioValue = positions.reduce((sum, p) => sum + p.value, 0);
    if (portfolioValue === 0 || positions.length === 0) {
      return this.emptyResult('parametric', config);
    }

    const symbols = positions.map(p => p.symbol);
    const weights = positions.map(p => p.value / portfolioValue);

    // Get individual volatilities
    const vols = this.getVolatilities(symbols, config.windowDays);

    // Get correlation matrix
    const cm = this.monitor.getCorrelationMatrix(symbols, config.windowDays);

    // Build covariance matrix: Cov(i,j) = σ_i × σ_j × ρ_ij
    const n = symbols.length;
    let portfolioVariance = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const rho = cm.matrix[i]?.[j] ?? (i === j ? 1 : 0);
        const covIJ = vols[i] * vols[j] * (isNaN(rho) ? (i === j ? 1 : 0) : rho);
        portfolioVariance += weights[i] * weights[j] * covIJ;
      }
    }

    const portfolioVol = Math.sqrt(Math.max(0, portfolioVariance));

    // Z-score for confidence level
    const z = this.normalInverseCDF(config.confidenceLevel);

    // Scale by square root of time horizon
    const scaledVol = portfolioVol * Math.sqrt(config.horizonDays);

    const varDollars = z * scaledVol * portfolioValue;

    return {
      method: 'parametric',
      var: varDollars,
      varPercent: (varDollars / portfolioValue) * 100,
      confidenceLevel: config.confidenceLevel,
      horizonDays: config.horizonDays,
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // HISTORICAL VaR
  // ============================================================================

  /**
   * Historical VaR uses the actual distribution of past portfolio returns.
   * No distributional assumptions needed.
   *
   * Sorts portfolio returns and picks the (1-α) percentile.
   */
  historicalVaR(
    positions: VaRPosition[],
    config: VaRConfig = DEFAULT_VAR_CONFIG
  ): VaRResult {
    const portfolioValue = positions.reduce((sum, p) => sum + p.value, 0);
    if (portfolioValue === 0 || positions.length === 0) {
      return this.emptyResult('historical', config);
    }

    // Get portfolio return series
    const portfolioReturns = this.computePortfolioReturns(positions, config.windowDays);

    if (portfolioReturns.length < 10) {
      // Insufficient data — fall back to parametric
      return {
        ...this.parametricVaR(positions, config),
        method: 'historical',
      };
    }

    // Scale returns to horizon if needed
    const scaledReturns = config.horizonDays === 1
      ? portfolioReturns
      : this.scaleReturnsToHorizon(portfolioReturns, config.horizonDays);

    // Sort ascending (worst losses first)
    const sorted = [...scaledReturns].sort((a, b) => a - b);

    // VaR = negative of the (1-α) percentile
    const idx = Math.floor((1 - config.confidenceLevel) * sorted.length);
    const varReturn = -sorted[Math.max(0, idx)];

    return {
      method: 'historical',
      var: varReturn * portfolioValue,
      varPercent: varReturn * 100,
      confidenceLevel: config.confidenceLevel,
      horizonDays: config.horizonDays,
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // CONDITIONAL VaR (Expected Shortfall)
  // ============================================================================

  /**
   * CVaR (Expected Shortfall) = average of all losses beyond VaR.
   * More sensitive to tail shape than VaR and is sub-additive (coherent risk measure).
   */
  conditionalVaR(
    positions: VaRPosition[],
    config: VaRConfig = DEFAULT_VAR_CONFIG
  ): ConditionalVaRResult {
    const portfolioValue = positions.reduce((sum, p) => sum + p.value, 0);
    if (portfolioValue === 0 || positions.length === 0) {
      return this.emptyConditionalResult(config);
    }

    // Get portfolio return series
    const portfolioReturns = this.computePortfolioReturns(positions, config.windowDays);

    if (portfolioReturns.length < 10) {
      // Insufficient data — use parametric approximation
      // For normal distribution: CVaR = μ + σ × φ(z) / (1-α)
      const parametric = this.parametricVaR(positions, config);
      const z = this.normalInverseCDF(config.confidenceLevel);
      const pdfZ = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
      const cvarMultiplier = pdfZ / (1 - config.confidenceLevel);
      const vols = this.getVolatilities(
        positions.map(p => p.symbol),
        config.windowDays
      );
      const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;
      const cvarDollars = cvarMultiplier * avgVol * Math.sqrt(config.horizonDays) * portfolioValue;

      return {
        method: 'conditional',
        var: parametric.var,
        varPercent: parametric.varPercent,
        expectedShortfall: cvarDollars,
        expectedShortfallPercent: (cvarDollars / portfolioValue) * 100,
        confidenceLevel: config.confidenceLevel,
        horizonDays: config.horizonDays,
        tailObservations: 0,
        timestamp: new Date(),
      };
    }

    // Scale returns to horizon
    const scaledReturns = config.horizonDays === 1
      ? portfolioReturns
      : this.scaleReturnsToHorizon(portfolioReturns, config.horizonDays);

    // Sort ascending
    const sorted = [...scaledReturns].sort((a, b) => a - b);

    // VaR cutoff index
    const cutoff = Math.floor((1 - config.confidenceLevel) * sorted.length);
    const varIdx = Math.max(0, cutoff);
    const varReturn = -sorted[varIdx];

    // CVaR = average of all returns below VaR
    const tailReturns = sorted.slice(0, Math.max(1, cutoff));
    const avgTailLoss = -(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length);

    return {
      method: 'conditional',
      var: varReturn * portfolioValue,
      varPercent: varReturn * 100,
      expectedShortfall: avgTailLoss * portfolioValue,
      expectedShortfallPercent: avgTailLoss * 100,
      confidenceLevel: config.confidenceLevel,
      horizonDays: config.horizonDays,
      tailObservations: tailReturns.length,
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // COMPREHENSIVE ANALYSIS
  // ============================================================================

  /**
   * Run all three VaR methods and compute component VaR and diversification benefit.
   */
  comprehensiveVaR(
    positions: VaRPosition[],
    config: VaRConfig = DEFAULT_VAR_CONFIG
  ): ComprehensiveVaR {
    const portfolioValue = positions.reduce((sum, p) => sum + p.value, 0);

    const parametric = this.parametricVaR(positions, config);
    const historical = this.historicalVaR(positions, config);
    const conditional = this.conditionalVaR(positions, config);

    // Component VaR: marginal contribution of each position
    const componentVaR = this.computeComponentVaR(positions, config);

    // Diversification benefit: undiversified VaR - diversified VaR
    const undiversifiedVaR = this.computeUndiversifiedVaR(positions, config);
    const diversificationBenefit = Math.max(0, undiversifiedVaR - parametric.var);

    return {
      portfolioValue,
      parametric,
      historical,
      conditional,
      componentVaR,
      diversificationBenefit,
      diversificationBenefitPercent: portfolioValue > 0
        ? (diversificationBenefit / portfolioValue) * 100
        : 0,
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // COMPONENT VaR
  // ============================================================================

  /**
   * Compute marginal and component VaR for each position.
   *
   * Marginal VaR: change in portfolio VaR from a small increase in position i
   * Component VaR: position's contribution to total portfolio VaR
   */
  private computeComponentVaR(
    positions: VaRPosition[],
    config: VaRConfig
  ): ComprehensiveVaR['componentVaR'] {
    const portfolioVaR = this.parametricVaR(positions, config);

    return positions.map(pos => {
      // Marginal VaR via numerical derivative
      const delta = pos.value * 0.01; // 1% shift
      const shiftedPositions = positions.map(p =>
        p.symbol === pos.symbol
          ? { ...p, value: p.value + delta, weight: p.weight }
          : p
      );
      // Recalculate weights for shifted portfolio
      const shiftedTotal = shiftedPositions.reduce((s, p) => s + p.value, 0);
      const shiftedWeighted = shiftedPositions.map(p => ({
        ...p,
        weight: p.value / shiftedTotal,
      }));

      const shiftedVaR = this.parametricVaR(shiftedWeighted, config);
      const marginalVaR = (shiftedVaR.var - portfolioVaR.var) / delta;

      // Component VaR = marginalVaR × position value
      const componentVar = marginalVaR * pos.value;

      return {
        symbol: pos.symbol,
        marginalVaR,
        componentVaR: componentVar,
        percentContribution: portfolioVaR.var > 0
          ? (componentVar / portfolioVaR.var) * 100
          : 0,
      };
    });
  }

  /**
   * Undiversified VaR: sum of individual position VaRs (ignores correlations).
   */
  private computeUndiversifiedVaR(
    positions: VaRPosition[],
    config: VaRConfig
  ): number {
    const z = this.normalInverseCDF(config.confidenceLevel);
    const vols = this.getVolatilities(
      positions.map(p => p.symbol),
      config.windowDays
    );

    let sum = 0;
    for (let i = 0; i < positions.length; i++) {
      const posVaR = z * vols[i] * Math.sqrt(config.horizonDays) * positions[i].value;
      sum += posVaR;
    }

    return sum;
  }

  // ============================================================================
  // RETURN COMPUTATION
  // ============================================================================

  /**
   * Build a portfolio return series from individual asset returns.
   * Aligned by date, weighted by position values.
   */
  private computePortfolioReturns(
    positions: VaRPosition[],
    windowDays: number
  ): number[] {
    const portfolioValue = positions.reduce((sum, p) => sum + p.value, 0);
    if (portfolioValue === 0) return [];

    // Collect per-symbol returns
    const allReturns: { symbol: string; weight: number; returns: number[] }[] = [];
    for (const pos of positions) {
      const returns = this.returnData.get(pos.symbol);
      if (returns && returns.length > 0) {
        allReturns.push({
          symbol: pos.symbol,
          weight: pos.value / portfolioValue,
          returns: returns.slice(-windowDays),
        });
      }
    }

    if (allReturns.length === 0) return [];

    // Use shortest common length
    const minLen = Math.min(...allReturns.map(r => r.returns.length));
    if (minLen === 0) return [];

    // Build portfolio returns
    const portfolioReturns: number[] = new Array(minLen).fill(0);
    for (const asset of allReturns) {
      const offset = asset.returns.length - minLen;
      for (let i = 0; i < minLen; i++) {
        portfolioReturns[i] += asset.weight * asset.returns[offset + i];
      }
    }

    return portfolioReturns;
  }

  /**
   * Scale daily returns to multi-day horizon using overlapping windows.
   * Uses sum of log returns for accuracy.
   */
  private scaleReturnsToHorizon(dailyReturns: number[], horizonDays: number): number[] {
    if (dailyReturns.length < horizonDays) return dailyReturns;

    const scaled: number[] = [];
    for (let i = 0; i <= dailyReturns.length - horizonDays; i++) {
      let logReturn = 0;
      for (let j = 0; j < horizonDays; j++) {
        logReturn += Math.log(1 + dailyReturns[i + j]);
      }
      scaled.push(Math.exp(logReturn) - 1);
    }

    return scaled;
  }

  // ============================================================================
  // VOLATILITY ESTIMATION
  // ============================================================================

  /**
   * Get daily volatility for each symbol.
   * Uses provided return data if available, otherwise defaults.
   */
  private getVolatilities(symbols: string[], windowDays: number): number[] {
    return symbols.map(symbol => {
      const returns = this.returnData.get(symbol);
      if (returns && returns.length >= 10) {
        const recent = returns.slice(-windowDays);
        return this.standardDeviation(recent);
      }
      // Default: ~20% annualized vol ≈ 1.26% daily
      return 0.0126;
    });
  }

  // ============================================================================
  // STATISTICAL HELPERS
  // ============================================================================

  /**
   * Inverse normal CDF (quantile function).
   * Rational approximation by Peter Acklam.
   */
  private normalInverseCDF(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    // Coefficients for rational approximation
    const a = [
      -3.969683028665376e+01,
       2.209460984245205e+02,
      -2.759285104469687e+02,
       1.383577518672690e+02,
      -3.066479806614716e+01,
       2.506628277459239e+00,
    ];
    const b = [
      -5.447609879822406e+01,
       1.615858368580409e+02,
      -1.556989798598866e+02,
       6.680131188771972e+01,
      -1.328068155288572e+01,
    ];
    const c = [
      -7.784894002430293e-03,
      -3.223964580411365e-01,
      -2.400758277161838e+00,
      -2.549732539343734e+00,
       4.374664141464968e+00,
       2.938163982698783e+00,
    ];
    const d = [
       7.784695709041462e-03,
       3.224671290700398e-01,
       2.445134137142996e+00,
       3.754408661907416e+00,
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q: number;
    let r: number;

    if (p < pLow) {
      // Lower tail
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
      // Central region
      q = p - 0.5;
      r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      // Upper tail
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -((((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1));
    }
  }

  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  // ============================================================================
  // EMPTY RESULTS
  // ============================================================================

  private emptyResult(method: VaRResult['method'], config: VaRConfig): VaRResult {
    return {
      method,
      var: 0,
      varPercent: 0,
      confidenceLevel: config.confidenceLevel,
      horizonDays: config.horizonDays,
      timestamp: new Date(),
    };
  }

  private emptyConditionalResult(config: VaRConfig): ConditionalVaRResult {
    return {
      method: 'conditional',
      var: 0,
      varPercent: 0,
      expectedShortfall: 0,
      expectedShortfallPercent: 0,
      confidenceLevel: config.confidenceLevel,
      horizonDays: config.horizonDays,
      tailObservations: 0,
      timestamp: new Date(),
    };
  }
}

// Export singleton
export const varCalculator = new VaRCalculator();
