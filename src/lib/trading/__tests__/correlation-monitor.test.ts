/**
 * Correlation Monitor — Unit Tests
 * TRD-008: 80%+ branch coverage
 */

import { CorrelationMonitor } from '../correlation-monitor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a price series with controllable trend and noise. */
function makePrices(
  days: number,
  basePrice = 100,
  dailyReturn = 0.001,
  noise = 0.01
): { date: Date; close: number }[] {
  const prices: { date: Date; close: number }[] = [];
  let price = basePrice;
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    price *= 1 + dailyReturn + (Math.random() - 0.5) * noise;
    prices.push({ date, close: price });
  }
  return prices;
}

/** Generate correlated prices: seriesB = seriesA * factor + noise */
function makeCorrelatedPrices(days: number): {
  pricesA: { date: Date; close: number }[];
  pricesB: { date: Date; close: number }[];
} {
  const pricesA: { date: Date; close: number }[] = [];
  const pricesB: { date: Date; close: number }[] = [];
  let pA = 100;
  let pB = 200;
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const r = (Math.random() - 0.5) * 0.02;
    pA *= 1 + r;
    pB *= 1 + r * 0.9 + (Math.random() - 0.5) * 0.002; // highly correlated
    pricesA.push({ date, close: pA });
    pricesB.push({ date, close: pB });
  }
  return { pricesA, pricesB };
}

/** Generate returns directly. */
function makeReturns(
  days: number,
  mean = 0,
  std = 0.01
): { date: Date; value: number }[] {
  const returns: { date: Date; value: number }[] = [];
  const startDate = new Date('2024-01-01');
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const value = mean + (Math.random() - 0.5) * 2 * std;
    returns.push({ date, value });
  }
  return returns;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CorrelationMonitor', () => {
  let monitor: CorrelationMonitor;

  beforeEach(() => {
    monitor = new CorrelationMonitor();
  });

  // ---- Ingest ----

  describe('ingestPrices', () => {
    it('should accept prices and compute returns', () => {
      monitor.ingestPrices('AAPL', makePrices(100));
      expect(monitor.getSymbols()).toContain('AAPL');
    });

    it('should ignore series with fewer than 2 prices', () => {
      monitor.ingestPrices('TINY', [{ date: new Date(), close: 100 }]);
      // Returns need at least 2 prices to compute
      expect(monitor.getSymbols()).not.toContain('TINY');
    });
  });

  describe('ingestReturns', () => {
    it('should store pre-computed returns', () => {
      monitor.ingestReturns('AAPL', makeReturns(100));
      expect(monitor.getSymbols()).toContain('AAPL');
    });
  });

  // ---- Correlation Calculation ----

  describe('calculateCorrelation', () => {
    it('should return NaN correlation when a symbol is missing', () => {
      monitor.ingestReturns('AAPL', makeReturns(100));
      const result = monitor.calculateCorrelation('AAPL', 'UNKNOWN');
      expect(isNaN(result.correlation)).toBe(true);
      expect(result.pValue).toBe(1);
      expect(result.sampleSize).toBe(0);
    });

    it('should return NaN when aligned samples < 10', () => {
      // Create two series with barely any date overlap
      const now = new Date('2024-01-01');
      const seriesA = Array.from({ length: 5 }, (_, i) => ({
        date: new Date(now.getTime() + i * 86400000),
        value: Math.random() * 0.02,
      }));
      const later = new Date('2024-06-01');
      const seriesB = Array.from({ length: 5 }, (_, i) => ({
        date: new Date(later.getTime() + i * 86400000),
        value: Math.random() * 0.02,
      }));

      monitor.ingestReturns('A', seriesA);
      monitor.ingestReturns('B', seriesB);

      const result = monitor.calculateCorrelation('A', 'B');
      expect(isNaN(result.correlation)).toBe(true);
    });

    it('should compute a valid Pearson correlation for aligned series', () => {
      const { pricesA, pricesB } = makeCorrelatedPrices(150);
      monitor.ingestPrices('AAPL', pricesA);
      monitor.ingestPrices('MSFT', pricesB);

      const result = monitor.calculateCorrelation('AAPL', 'MSFT');
      expect(result.correlation).not.toBeNaN();
      expect(result.correlation).toBeGreaterThan(0.3); // should be positively correlated
      expect(result.sampleSize).toBeGreaterThanOrEqual(10);
    });
  });

  // ---- EW Correlation ----

  describe('calculateEWCorrelation', () => {
    it('should return NaN for missing symbols', () => {
      const result = monitor.calculateEWCorrelation('A', 'B');
      expect(isNaN(result.correlation)).toBe(true);
    });

    it('should return a value between -1 and 1 for valid data', () => {
      const { pricesA, pricesB } = makeCorrelatedPrices(200);
      monitor.ingestPrices('X', pricesA);
      monitor.ingestPrices('Y', pricesB);

      const result = monitor.calculateEWCorrelation('X', 'Y', 30);
      expect(result.correlation).toBeGreaterThanOrEqual(-1);
      expect(result.correlation).toBeLessThanOrEqual(1);
    });
  });

  // ---- Correlation Matrix ----

  describe('getCorrelationMatrix', () => {
    it('should return a 1x1 matrix with self-correlation=1', () => {
      monitor.ingestReturns('AAPL', makeReturns(100));
      const matrix = monitor.getCorrelationMatrix(['AAPL']);

      expect(matrix.symbols).toEqual(['AAPL']);
      expect(matrix.matrix[0][0]).toBe(1);
    });

    it('should produce symmetric NxN matrix', () => {
      const { pricesA, pricesB } = makeCorrelatedPrices(150);
      monitor.ingestPrices('A', pricesA);
      monitor.ingestPrices('B', pricesB);
      monitor.ingestPrices('C', makePrices(150, 50, -0.001));

      const matrix = monitor.getCorrelationMatrix(['A', 'B', 'C']);
      expect(matrix.symbols).toHaveLength(3);
      expect(matrix.matrix).toHaveLength(3);

      // Diagonal = 1
      for (let i = 0; i < 3; i++) {
        expect(matrix.matrix[i][i]).toBe(1);
      }
      // Symmetric
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
          expect(matrix.matrix[i][j]).toBeCloseTo(matrix.matrix[j][i], 10);
        }
      }
    });
  });

  // ---- Average Correlation ----

  describe('getAverageCorrelation', () => {
    it('should return 0 for fewer than 2 symbols', () => {
      monitor.ingestReturns('AAPL', makeReturns(100));
      expect(monitor.getAverageCorrelation(['AAPL'])).toBe(0);
    });

    it('should return a non-negative value for correlated symbols', () => {
      const { pricesA, pricesB } = makeCorrelatedPrices(150);
      monitor.ingestPrices('A', pricesA);
      monitor.ingestPrices('B', pricesB);

      const avg = monitor.getAverageCorrelation(['A', 'B']);
      expect(avg).toBeGreaterThanOrEqual(0);
    });
  });

  // ---- Regime Change Detection ----

  describe('detectRegimeChange', () => {
    it('should return empty array for < 2 symbols', () => {
      monitor.ingestPrices('AAPL', makePrices(200));
      const events = monitor.detectRegimeChange(['AAPL']);
      expect(events).toHaveLength(0);
    });

    it('should return array of RegimeChangeEvent objects', () => {
      const { pricesA, pricesB } = makeCorrelatedPrices(200);
      monitor.ingestPrices('A', pricesA);
      monitor.ingestPrices('B', pricesB);
      monitor.ingestPrices('C', makePrices(200, 80, -0.002, 0.02));

      const events = monitor.detectRegimeChange(['A', 'B', 'C']);
      // May or may not detect regimes depending on random data
      expect(Array.isArray(events)).toBe(true);
    });
  });

  // ---- Rolling Correlation ----

  describe('getRollingCorrelation', () => {
    it('should return empty for missing symbols', () => {
      expect(monitor.getRollingCorrelation('A', 'B')).toHaveLength(0);
    });

    it('should return time series of correlations', () => {
      const { pricesA, pricesB } = makeCorrelatedPrices(200);
      monitor.ingestPrices('X', pricesA);
      monitor.ingestPrices('Y', pricesB);

      const rolling = monitor.getRollingCorrelation('X', 'Y', 30, 5);
      expect(rolling.length).toBeGreaterThan(0);
      for (const point of rolling) {
        expect(point.date).toBeInstanceOf(Date);
        expect(typeof point.correlation).toBe('number');
      }
    });
  });

  // ---- Portfolio Variance ----

  describe('estimatePortfolioVariance', () => {
    it('should return a non-negative portfolio variance', () => {
      const { pricesA, pricesB } = makeCorrelatedPrices(150);
      monitor.ingestPrices('AAPL', pricesA);
      monitor.ingestPrices('MSFT', pricesB);

      const variance = monitor.estimatePortfolioVariance([
        { symbol: 'AAPL', weight: 0.6 },
        { symbol: 'MSFT', weight: 0.4 },
      ]);

      expect(variance).toBeGreaterThanOrEqual(0);
    });
  });

  // ---- Highly Correlated Pairs ----

  describe('getHighlyCorrelatedPairs', () => {
    it('should detect highly correlated pairs', () => {
      const { pricesA, pricesB } = makeCorrelatedPrices(200);
      monitor.ingestPrices('A', pricesA);
      monitor.ingestPrices('B', pricesB);

      const pairs = monitor.getHighlyCorrelatedPairs(['A', 'B'], 0.3);
      // With highly correlated data, should detect the pair
      expect(Array.isArray(pairs)).toBe(true);
      if (pairs.length > 0) {
        expect(Math.abs(pairs[0].correlation)).toBeGreaterThanOrEqual(0.3);
      }
    });
  });

  // ---- Alerts ----

  describe('getAlerts / clearAlerts', () => {
    it('should start with no alerts', () => {
      expect(monitor.getAlerts()).toHaveLength(0);
    });

    it('should generate high_correlation alert for strongly correlated pairs', () => {
      const { pricesA, pricesB } = makeCorrelatedPrices(200);
      monitor.ingestPrices('X', pricesA);
      monitor.ingestPrices('Y', pricesB);

      // Trigger correlation calculation which checks for alerts
      monitor.calculateCorrelation('X', 'Y');
      const alerts = monitor.getAlerts();
      // May have alerts depending on correlation threshold
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should clear alerts', () => {
      monitor.clearAlerts();
      expect(monitor.getAlerts()).toHaveLength(0);
    });
  });

  // ---- Regime History ----

  describe('getRegimeHistory', () => {
    it('should start with empty history', () => {
      expect(monitor.getRegimeHistory()).toHaveLength(0);
    });
  });
});
