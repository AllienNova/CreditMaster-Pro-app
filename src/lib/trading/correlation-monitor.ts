/**
 * Correlation Monitoring Service
 *
 * Tracks pairwise and portfolio-level correlations to detect:
 * - Correlation spikes (diversification breakdown)
 * - Regime changes (structural market shifts)
 * - Concentration risk from correlated positions
 *
 * Uses Pearson correlation on rolling return windows with
 * exponential weighting for recency bias.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CorrelationPair {
  symbolA: string;
  symbolB: string;
  correlation: number;
  pValue: number;
  sampleSize: number;
  updatedAt: Date;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
  timestamp: Date;
  windowDays: number;
}

export interface RegimeChangeEvent {
  type: 'correlation_spike' | 'correlation_breakdown' | 'structural_shift';
  affectedPairs: { symbolA: string; symbolB: string; before: number; after: number }[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  description: string;
}

export interface CorrelationAlert {
  pair: CorrelationPair;
  alertType: 'high_correlation' | 'correlation_reversal' | 'spike';
  threshold: number;
  message: string;
  timestamp: Date;
}

export interface ReturnSeries {
  symbol: string;
  returns: { date: Date; value: number }[];
}

// ============================================================================
// CORRELATION MONITOR
// ============================================================================

export class CorrelationMonitor {
  private returnHistory: Map<string, { date: Date; value: number }[]> = new Map();
  private correlationCache: Map<string, CorrelationPair> = new Map();
  private regimeHistory: RegimeChangeEvent[] = [];
  private alerts: CorrelationAlert[] = [];

  // Configuration
  private readonly defaultWindow = 60; // trading days
  private readonly shortWindow = 20;
  private readonly longWindow = 120;
  private readonly spikeThreshold = 0.3; // absolute change to flag
  private readonly highCorrelationThreshold = 0.7;
  private readonly regimeShiftZScore = 2.5;

  // ============================================================================
  // RETURN DATA MANAGEMENT
  // ============================================================================

  /**
   * Ingest price data and compute daily returns for a symbol.
   */
  ingestPrices(
    symbol: string,
    prices: { date: Date; close: number }[]
  ): void {
    if (prices.length < 2) return;

    const sorted = [...prices].sort((a, b) => a.date.getTime() - b.date.getTime());
    const returns: { date: Date; value: number }[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].close;
      if (prev === 0) continue;
      returns.push({
        date: sorted[i].date,
        value: (sorted[i].close - prev) / prev,
      });
    }

    this.returnHistory.set(symbol, returns);
  }

  /**
   * Ingest pre-computed returns directly.
   */
  ingestReturns(symbol: string, returns: { date: Date; value: number }[]): void {
    this.returnHistory.set(symbol, returns);
  }

  getSymbols(): string[] {
    return Array.from(this.returnHistory.keys());
  }

  // ============================================================================
  // CORRELATION CALCULATION
  // ============================================================================

  /**
   * Calculate Pearson correlation between two symbols over a rolling window.
   * Returns NaN if insufficient overlapping data.
   */
  calculateCorrelation(
    symbolA: string,
    symbolB: string,
    windowDays: number = this.defaultWindow
  ): CorrelationPair {
    const cacheKey = `${symbolA}:${symbolB}:${windowDays}`;
    const returnsA = this.returnHistory.get(symbolA);
    const returnsB = this.returnHistory.get(symbolB);

    if (!returnsA || !returnsB) {
      return { symbolA, symbolB, correlation: NaN, pValue: 1, sampleSize: 0, updatedAt: new Date() };
    }

    // Align return series by date
    const { alignedA, alignedB } = this.alignSeries(returnsA, returnsB, windowDays);

    if (alignedA.length < 10) {
      return { symbolA, symbolB, correlation: NaN, pValue: 1, sampleSize: alignedA.length, updatedAt: new Date() };
    }

    const corr = this.pearsonCorrelation(alignedA, alignedB);
    const pValue = this.correlationPValue(corr, alignedA.length);

    const result: CorrelationPair = {
      symbolA,
      symbolB,
      correlation: corr,
      pValue,
      sampleSize: alignedA.length,
      updatedAt: new Date(),
    };

    this.correlationCache.set(cacheKey, result);
    this.checkForAlerts(result);

    return result;
  }

  /**
   * Calculate exponentially-weighted correlation giving more weight to recent observations.
   */
  calculateEWCorrelation(
    symbolA: string,
    symbolB: string,
    halfLife: number = 30
  ): CorrelationPair {
    const returnsA = this.returnHistory.get(symbolA);
    const returnsB = this.returnHistory.get(symbolB);

    if (!returnsA || !returnsB) {
      return { symbolA, symbolB, correlation: NaN, pValue: 1, sampleSize: 0, updatedAt: new Date() };
    }

    const { alignedA, alignedB } = this.alignSeries(returnsA, returnsB, this.longWindow);

    if (alignedA.length < 10) {
      return { symbolA, symbolB, correlation: NaN, pValue: 1, sampleSize: alignedA.length, updatedAt: new Date() };
    }

    // Exponential decay weights
    const lambda = Math.log(2) / halfLife;
    const n = alignedA.length;
    const weights = alignedA.map((_, i) => Math.exp(-lambda * (n - 1 - i)));
    const wSum = weights.reduce((a, b) => a + b, 0);

    // Weighted means
    let wMeanA = 0, wMeanB = 0;
    for (let i = 0; i < n; i++) {
      wMeanA += weights[i] * alignedA[i];
      wMeanB += weights[i] * alignedB[i];
    }
    wMeanA /= wSum;
    wMeanB /= wSum;

    // Weighted covariance and variances
    let wCov = 0, wVarA = 0, wVarB = 0;
    for (let i = 0; i < n; i++) {
      const dA = alignedA[i] - wMeanA;
      const dB = alignedB[i] - wMeanB;
      wCov += weights[i] * dA * dB;
      wVarA += weights[i] * dA * dA;
      wVarB += weights[i] * dB * dB;
    }

    const denom = Math.sqrt(wVarA * wVarB);
    const corr = denom === 0 ? 0 : wCov / denom;

    return {
      symbolA,
      symbolB,
      correlation: Math.max(-1, Math.min(1, corr)),
      pValue: this.correlationPValue(corr, n),
      sampleSize: n,
      updatedAt: new Date(),
    };
  }

  // ============================================================================
  // CORRELATION MATRIX
  // ============================================================================

  /**
   * Compute full NxN correlation matrix for given symbols.
   */
  getCorrelationMatrix(
    symbols?: string[],
    windowDays: number = this.defaultWindow
  ): CorrelationMatrix {
    const syms = symbols || this.getSymbols();
    const n = syms.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1; // Self-correlation
      for (let j = i + 1; j < n; j++) {
        const pair = this.calculateCorrelation(syms[i], syms[j], windowDays);
        matrix[i][j] = pair.correlation;
        matrix[j][i] = pair.correlation;
      }
    }

    return {
      symbols: syms,
      matrix,
      timestamp: new Date(),
      windowDays,
    };
  }

  /**
   * Get the average pairwise correlation across the matrix (diversification measure).
   * Lower values = better diversification.
   */
  getAverageCorrelation(symbols?: string[], windowDays?: number): number {
    const cm = this.getCorrelationMatrix(symbols, windowDays);
    const n = cm.symbols.length;
    if (n < 2) return 0;

    let sum = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const c = cm.matrix[i][j];
        if (!isNaN(c)) {
          sum += Math.abs(c);
          count++;
        }
      }
    }

    return count === 0 ? 0 : sum / count;
  }

  // ============================================================================
  // REGIME CHANGE DETECTION
  // ============================================================================

  /**
   * Detect regime changes by comparing short-window vs long-window correlations.
   * A regime change occurs when recent correlations diverge significantly
   * from historical norms (z-score based detection).
   */
  detectRegimeChange(symbols?: string[]): RegimeChangeEvent[] {
    const syms = symbols || this.getSymbols();
    const events: RegimeChangeEvent[] = [];

    if (syms.length < 2) return events;

    const shortMatrix = this.getCorrelationMatrix(syms, this.shortWindow);
    const longMatrix = this.getCorrelationMatrix(syms, this.longWindow);
    const n = syms.length;

    // Collect all pairwise changes
    const changes: { i: number; j: number; shortCorr: number; longCorr: number; delta: number }[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const shortCorr = shortMatrix.matrix[i][j];
        const longCorr = longMatrix.matrix[i][j];
        if (isNaN(shortCorr) || isNaN(longCorr)) continue;

        const delta = shortCorr - longCorr;
        changes.push({ i, j, shortCorr, longCorr, delta });
      }
    }

    if (changes.length === 0) return events;

    // Compute z-scores of delta
    const deltas = changes.map(c => c.delta);
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const std = Math.sqrt(
      deltas.reduce((sum, d) => sum + (d - mean) ** 2, 0) / deltas.length
    );

    if (std === 0) return events;

    // Find outlier pairs
    const spikePairs: { symbolA: string; symbolB: string; before: number; after: number }[] = [];
    const breakdownPairs: { symbolA: string; symbolB: string; before: number; after: number }[] = [];

    for (const change of changes) {
      const zScore = (change.delta - mean) / std;

      if (Math.abs(zScore) >= this.regimeShiftZScore && Math.abs(change.delta) >= this.spikeThreshold) {
        const pair = {
          symbolA: syms[change.i],
          symbolB: syms[change.j],
          before: change.longCorr,
          after: change.shortCorr,
        };

        if (change.delta > 0) {
          spikePairs.push(pair);
        } else {
          breakdownPairs.push(pair);
        }
      }
    }

    // Emit correlation spike event
    if (spikePairs.length > 0) {
      const severity = this.assessSeverity(spikePairs.length, n);
      const event: RegimeChangeEvent = {
        type: 'correlation_spike',
        affectedPairs: spikePairs,
        severity,
        detectedAt: new Date(),
        description: `Correlation spike detected in ${spikePairs.length} pair(s): ${spikePairs.map(p => `${p.symbolA}/${p.symbolB} (${p.before.toFixed(2)} → ${p.after.toFixed(2)})`).join(', ')}`,
      };
      events.push(event);
      this.regimeHistory.push(event);
    }

    // Emit correlation breakdown event
    if (breakdownPairs.length > 0) {
      const severity = this.assessSeverity(breakdownPairs.length, n);
      const event: RegimeChangeEvent = {
        type: 'correlation_breakdown',
        affectedPairs: breakdownPairs,
        severity,
        detectedAt: new Date(),
        description: `Correlation breakdown in ${breakdownPairs.length} pair(s): ${breakdownPairs.map(p => `${p.symbolA}/${p.symbolB} (${p.before.toFixed(2)} → ${p.after.toFixed(2)})`).join(', ')}`,
      };
      events.push(event);
      this.regimeHistory.push(event);
    }

    // Structural shift: majority of pairs moved in the same direction
    const positiveShifts = changes.filter(c => c.delta > this.spikeThreshold * 0.5).length;
    const totalPairs = changes.length;
    if (totalPairs >= 3 && positiveShifts / totalPairs > 0.6) {
      const event: RegimeChangeEvent = {
        type: 'structural_shift',
        affectedPairs: changes
          .filter(c => c.delta > this.spikeThreshold * 0.5)
          .map(c => ({
            symbolA: syms[c.i],
            symbolB: syms[c.j],
            before: c.longCorr,
            after: c.shortCorr,
          })),
        severity: 'high',
        detectedAt: new Date(),
        description: `Structural regime shift detected: ${positiveShifts}/${totalPairs} pairs showing increased correlation (risk-on/risk-off convergence)`,
      };
      events.push(event);
      this.regimeHistory.push(event);
    }

    return events;
  }

  /**
   * Get rolling correlation time series for a pair.
   * Useful for visualizing correlation stability over time.
   */
  getRollingCorrelation(
    symbolA: string,
    symbolB: string,
    windowDays: number = this.defaultWindow,
    stepDays: number = 1
  ): { date: Date; correlation: number }[] {
    const returnsA = this.returnHistory.get(symbolA);
    const returnsB = this.returnHistory.get(symbolB);
    if (!returnsA || !returnsB) return [];

    const { alignedA, alignedB, dates } = this.alignSeriesWithDates(returnsA, returnsB);
    if (alignedA.length < windowDays) return [];

    const results: { date: Date; correlation: number }[] = [];

    for (let end = windowDays; end <= alignedA.length; end += stepDays) {
      const sliceA = alignedA.slice(end - windowDays, end);
      const sliceB = alignedB.slice(end - windowDays, end);
      const corr = this.pearsonCorrelation(sliceA, sliceB);
      results.push({ date: dates[end - 1], correlation: corr });
    }

    return results;
  }

  // ============================================================================
  // PORTFOLIO RISK FROM CORRELATIONS
  // ============================================================================

  /**
   * Estimate portfolio variance using correlation matrix and position weights.
   */
  estimatePortfolioVariance(
    positions: { symbol: string; weight: number }[],
    windowDays: number = this.defaultWindow
  ): number {
    const symbols = positions.map(p => p.symbol);
    const weights = positions.map(p => p.weight);
    const cm = this.getCorrelationMatrix(symbols, windowDays);

    // Need individual volatilities
    const vols = symbols.map(s => {
      const returns = this.returnHistory.get(s);
      if (!returns || returns.length < windowDays) return 0.02; // default 2% daily vol
      const recent = returns.slice(-windowDays).map(r => r.value);
      return this.standardDeviation(recent);
    });

    // Portfolio variance = sum_i sum_j w_i * w_j * sigma_i * sigma_j * rho_ij
    let variance = 0;
    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        const rho = cm.matrix[i][j];
        const c = isNaN(rho) ? (i === j ? 1 : 0) : rho;
        variance += weights[i] * weights[j] * vols[i] * vols[j] * c;
      }
    }

    return variance;
  }

  /**
   * Find the most correlated pairs above a threshold.
   * Useful for identifying concentration risk.
   */
  getHighlyCorrelatedPairs(
    symbols?: string[],
    threshold: number = this.highCorrelationThreshold,
    windowDays: number = this.defaultWindow
  ): CorrelationPair[] {
    const cm = this.getCorrelationMatrix(symbols, windowDays);
    const pairs: CorrelationPair[] = [];

    for (let i = 0; i < cm.symbols.length; i++) {
      for (let j = i + 1; j < cm.symbols.length; j++) {
        const corr = cm.matrix[i][j];
        if (!isNaN(corr) && Math.abs(corr) >= threshold) {
          pairs.push({
            symbolA: cm.symbols[i],
            symbolB: cm.symbols[j],
            correlation: corr,
            pValue: this.correlationPValue(corr, this.defaultWindow),
            sampleSize: this.defaultWindow,
            updatedAt: new Date(),
          });
        }
      }
    }

    return pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  // ============================================================================
  // ALERTS & HISTORY
  // ============================================================================

  getAlerts(): CorrelationAlert[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  getRegimeHistory(): RegimeChangeEvent[] {
    return [...this.regimeHistory];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private alignSeries(
    seriesA: { date: Date; value: number }[],
    seriesB: { date: Date; value: number }[],
    windowDays: number
  ): { alignedA: number[]; alignedB: number[] } {
    // Build date-keyed maps
    const mapA = new Map(seriesA.map(r => [this.dateKey(r.date), r.value]));
    const mapB = new Map(seriesB.map(r => [this.dateKey(r.date), r.value]));

    // Find common dates
    const commonDates: string[] = [];
    for (const key of mapA.keys()) {
      if (mapB.has(key)) commonDates.push(key);
    }
    commonDates.sort();

    // Take last windowDays
    const sliced = commonDates.slice(-windowDays);

    return {
      alignedA: sliced.map(d => mapA.get(d)!),
      alignedB: sliced.map(d => mapB.get(d)!),
    };
  }

  private alignSeriesWithDates(
    seriesA: { date: Date; value: number }[],
    seriesB: { date: Date; value: number }[]
  ): { alignedA: number[]; alignedB: number[]; dates: Date[] } {
    const mapA = new Map(seriesA.map(r => [this.dateKey(r.date), r]));
    const mapB = new Map(seriesB.map(r => [this.dateKey(r.date), r]));

    const commonDates: string[] = [];
    for (const key of mapA.keys()) {
      if (mapB.has(key)) commonDates.push(key);
    }
    commonDates.sort();

    return {
      alignedA: commonDates.map(d => mapA.get(d)!.value),
      alignedB: commonDates.map(d => mapB.get(d)!.value),
      dates: commonDates.map(d => mapA.get(d)!.date),
    };
  }

  private dateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    if (denominator === 0) return 0;
    return Math.max(-1, Math.min(1, numerator / denominator));
  }

  /**
   * Approximate p-value for Pearson correlation using t-distribution.
   * Uses Fisher transformation for better approximation.
   */
  private correlationPValue(r: number, n: number): number {
    if (n <= 2 || isNaN(r)) return 1;
    const absR = Math.abs(r);
    if (absR >= 1) return 0;

    const t = absR * Math.sqrt((n - 2) / (1 - absR * absR));
    const df = n - 2;

    // Approximate two-tailed p-value using incomplete beta
    // For df > 30, use normal approximation
    if (df > 30) {
      // Normal approximation of t-distribution
      const z = t;
      return 2 * (1 - this.normalCDF(z));
    }

    // For smaller df, use a rougher but reasonable approximation
    const x = df / (df + t * t);
    return this.incompleteBetaApprox(df / 2, 0.5, x);
  }

  /**
   * Standard normal CDF approximation (Abramowitz & Stegun).
   */
  private normalCDF(z: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1 + sign * y);
  }

  /**
   * Rough approximation of incomplete beta function for p-value estimation.
   */
  private incompleteBetaApprox(a: number, b: number, x: number): number {
    // Use a simple series expansion approximation
    if (x <= 0) return 1;
    if (x >= 1) return 0;

    // For our use case (correlation p-values), a reasonable approximation:
    const logBeta = this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
    const factor = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - logBeta) / a;

    // Continued fraction approximation (first few terms)
    let sum = 1;
    let term = 1;
    for (let i = 1; i <= 50; i++) {
      term *= x * (a + b + i - 1) * (a + i - 1) / ((a + 2 * i - 1) * (a + 2 * i));
      sum += term;
      if (Math.abs(term) < 1e-10) break;
    }

    return Math.max(0, Math.min(1, 1 - factor * sum));
  }

  private logGamma(z: number): number {
    // Stirling's approximation for log(Gamma(z))
    if (z <= 0) return 0;
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let x = z;
    let y = z;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) {
      y += 1;
      ser += c[j] / y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private assessSeverity(affectedCount: number, totalSymbols: number): RegimeChangeEvent['severity'] {
    const totalPairs = (totalSymbols * (totalSymbols - 1)) / 2;
    if (totalPairs === 0) return 'low';
    const ratio = affectedCount / totalPairs;

    if (ratio > 0.5) return 'critical';
    if (ratio > 0.3) return 'high';
    if (ratio > 0.1) return 'medium';
    return 'low';
  }

  private checkForAlerts(pair: CorrelationPair): void {
    // High correlation alert
    if (Math.abs(pair.correlation) >= this.highCorrelationThreshold && !isNaN(pair.correlation)) {
      this.alerts.push({
        pair,
        alertType: 'high_correlation',
        threshold: this.highCorrelationThreshold,
        message: `High correlation (${pair.correlation.toFixed(3)}) between ${pair.symbolA} and ${pair.symbolB}`,
        timestamp: new Date(),
      });
    }

    // Check for correlation reversal vs cached value
    const cacheKey = `${pair.symbolA}:${pair.symbolB}:${this.defaultWindow}`;
    const prev = this.correlationCache.get(cacheKey);
    if (prev && !isNaN(prev.correlation) && !isNaN(pair.correlation)) {
      const delta = Math.abs(pair.correlation - prev.correlation);
      if (delta >= this.spikeThreshold) {
        this.alerts.push({
          pair,
          alertType: 'spike',
          threshold: this.spikeThreshold,
          message: `Correlation spike for ${pair.symbolA}/${pair.symbolB}: ${prev.correlation.toFixed(3)} → ${pair.correlation.toFixed(3)} (Δ${delta.toFixed(3)})`,
          timestamp: new Date(),
        });
      }

      if (Math.sign(prev.correlation) !== Math.sign(pair.correlation) && Math.abs(pair.correlation) > 0.2) {
        this.alerts.push({
          pair,
          alertType: 'correlation_reversal',
          threshold: 0,
          message: `Correlation reversal for ${pair.symbolA}/${pair.symbolB}: ${prev.correlation.toFixed(3)} → ${pair.correlation.toFixed(3)}`,
          timestamp: new Date(),
        });
      }
    }
  }
}

// Export singleton
export const correlationMonitor = new CorrelationMonitor();
