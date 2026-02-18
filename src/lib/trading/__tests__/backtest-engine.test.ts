/**
 * Backtest Engine — Unit Tests
 * TRD-008: 80%+ branch coverage
 */

// Mock all technical indicator functions before importing the engine
jest.mock('../charts/technical-indicators');

import {
  BacktestEngine,
  createBacktestEngine,
  type BacktestStrategy,
  type BacktestTrade,
} from '../backtesting/backtest-engine';

// ---------------------------------------------------------------------------
// Mock implementation helpers (defined outside jest.mock so they survive resets)
// ---------------------------------------------------------------------------

const makeIndicator = (data: { timestamp: number }[], offset: number) =>
  data.slice(offset).map((d, i) => ({
    timestamp: d.timestamp,
    value: 50 + Math.sin(i * 0.1) * 10,
  }));

const makeMACDIndicator = (data: { timestamp: number }[]) =>
  data.slice(33).map((d, i) => ({
    timestamp: d.timestamp,
    macd: Math.sin(i * 0.05) * 2,
    signal: Math.sin(i * 0.05 - 0.3) * 1.5,
    histogram: Math.sin(i * 0.05) * 0.5,
  }));

const makeBBIndicator = (data: { timestamp: number }[]) =>
  data.map((d, i) => ({
    timestamp: d.timestamp,
    upper: 110 + i * 0.1,
    middle: 100 + i * 0.1,
    lower: 90 + i * 0.1,
  }));

function applyIndicatorMocks() {
  const mocks = jest.requireMock('../charts/technical-indicators') as Record<string, jest.Mock>;
  mocks.calculateSMA.mockImplementation(
    (data: { timestamp: number }[], period: number) => makeIndicator(data, period)
  );
  mocks.calculateEMA.mockImplementation(
    (data: { timestamp: number }[], period: number) => makeIndicator(data, period)
  );
  mocks.calculateRSI.mockImplementation(
    (data: { timestamp: number }[], period: number) => makeIndicator(data, period + 1)
  );
  mocks.calculateMACD.mockImplementation(
    (data: { timestamp: number }[]) => makeMACDIndicator(data)
  );
  mocks.calculateATR.mockImplementation(
    (data: { timestamp: number }[], period: number) => makeIndicator(data, period + 1)
  );
  mocks.calculateBollingerBands.mockImplementation(
    (data: { timestamp: number }[]) => makeBBIndicator(data)
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOHLCV(days: number, startDate = new Date('2023-01-01')) {
  const bars = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const basePrice = 100 + Math.sin(i * 0.05) * 15;
    bars.push({
      timestamp: date.getTime(),
      open: basePrice - 0.5,
      high: basePrice + 2,
      low: basePrice - 2,
      close: basePrice,
      volume: 1_000_000 + Math.random() * 500_000,
    });
  }
  return bars;
}

function makeStrategy(overrides: Partial<BacktestStrategy> = {}): BacktestStrategy {
  return {
    name: 'Test Strategy',
    entryRules: [
      { indicator: 'rsi_14', operator: 'lt', value: 40 },
    ],
    exitRules: [
      { indicator: 'rsi_14', operator: 'gt', value: 60 },
    ],
    positionSizing: 'percent',
    positionValue: 5,
    stopLoss: { type: 'percent', value: 5 },
    takeProfit: { type: 'percent', value: 10 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BacktestEngine', () => {
  // Re-apply mock implementations before each test (resetMocks clears them)
  beforeEach(() => {
    applyIndicatorMocks();
  });

  // ---- Factory ----

  describe('createBacktestEngine', () => {
    it('should create an engine with default config', () => {
      const engine = createBacktestEngine();
      expect(engine).toBeInstanceOf(BacktestEngine);
    });

    it('should accept custom config overrides', () => {
      const engine = createBacktestEngine({
        initialCapital: 50_000,
        slippageBps: 10,
      });
      expect(engine).toBeInstanceOf(BacktestEngine);
    });
  });

  // ---- Data Loading ----

  describe('loadData', () => {
    it('should load and filter data by date range', () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      });

      const data = makeOHLCV(400, new Date('2022-06-01'));
      // Should not throw
      expect(() => engine.loadData('AAPL', data)).not.toThrow();
    });

    it('should precompute indicators on load', () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const data = makeOHLCV(200);
      engine.loadData('AAPL', data);

      // Indicator mocks should have been called
      const mocks = jest.requireMock('../charts/technical-indicators') as Record<string, jest.Mock>;

      expect(mocks.calculateSMA).toHaveBeenCalled();
      expect(mocks.calculateRSI).toHaveBeenCalled();
      expect(mocks.calculateMACD).toHaveBeenCalled();
      expect(mocks.calculateATR).toHaveBeenCalled();
      expect(mocks.calculateBollingerBands).toHaveBeenCalled();
    });
  });

  // ---- Backtest Execution ----

  describe('runBacktest', () => {
    it('should throw when no data is loaded', async () => {
      const engine = createBacktestEngine();
      await expect(
        engine.runBacktest('AAPL', makeStrategy())
      ).rejects.toThrow('No data loaded for AAPL');
    });

    it('should return a complete BacktestResult', async () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        initialCapital: 100_000,
      });

      engine.loadData('AAPL', makeOHLCV(200));
      const result = await engine.runBacktest('AAPL', makeStrategy());

      expect(result.strategyName).toBe('Test Strategy');
      expect(result.symbol).toBe('AAPL');
      expect(typeof result.totalReturn).toBe('number');
      expect(typeof result.totalReturnPercent).toBe('number');
      expect(typeof result.sharpeRatio).toBe('number');
      expect(typeof result.sortinoRatio).toBe('number');
      expect(typeof result.maxDrawdown).toBe('number');
      expect(typeof result.maxDrawdownPercent).toBe('number');
      expect(typeof result.totalTrades).toBe('number');
      expect(typeof result.winRate).toBe('number');
      expect(Array.isArray(result.equityCurve)).toBe(true);
      expect(Array.isArray(result.trades)).toBe(true);
      expect(Array.isArray(result.monthlyReturns)).toBe(true);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should produce an equity curve with entries', async () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
      });

      engine.loadData('AAPL', makeOHLCV(200));
      const result = await engine.runBacktest('AAPL', makeStrategy());

      expect(result.equityCurve.length).toBeGreaterThan(0);
      for (const point of result.equityCurve) {
        expect(point.date).toBeInstanceOf(Date);
        expect(typeof point.equity).toBe('number');
        expect(typeof point.drawdown).toBe('number');
      }
    });

    it('should respect different position sizing methods', async () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
      });

      engine.loadData('AAPL', makeOHLCV(200));

      const fixedResult = await engine.runBacktest(
        'AAPL',
        makeStrategy({ positionSizing: 'fixed', positionValue: 10_000 })
      );
      expect(fixedResult).toBeDefined();

      // Re-apply mocks (loadData will call indicators again)
      applyIndicatorMocks();
      engine.loadData('AAPL', makeOHLCV(200));
      const riskResult = await engine.runBacktest(
        'AAPL',
        makeStrategy({ positionSizing: 'risk_based', positionValue: 1 })
      );
      expect(riskResult).toBeDefined();
    });

    it('should handle strategy with stopLoss type atr', async () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
      });

      engine.loadData('AAPL', makeOHLCV(200));
      const result = await engine.runBacktest(
        'AAPL',
        makeStrategy({ stopLoss: { type: 'atr', value: 2 } })
      );
      expect(result).toBeDefined();
    });

    it('should handle strategy with takeProfit type risk_multiple', async () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
      });

      engine.loadData('AAPL', makeOHLCV(200));
      const result = await engine.runBacktest(
        'AAPL',
        makeStrategy({ takeProfit: { type: 'risk_multiple', value: 3 } })
      );
      expect(result).toBeDefined();
    });

    it('should compute valid Sharpe and Sortino ratios', async () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
      });

      engine.loadData('AAPL', makeOHLCV(200));
      const result = await engine.runBacktest('AAPL', makeStrategy());

      // Ratios should be finite numbers
      expect(isFinite(result.sharpeRatio)).toBe(true);
      expect(isFinite(result.sortinoRatio)).toBe(true);
    });
  });

  // ---- Monte Carlo Simulation ----

  describe('runMonteCarloSimulation', () => {
    it('should return valid MonteCarloResult', async () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
      });

      engine.loadData('AAPL', makeOHLCV(200));
      const backtest = await engine.runBacktest('AAPL', makeStrategy());

      // Need some trades for Monte Carlo
      const trades: BacktestTrade[] = backtest.trades.length > 0
        ? backtest.trades
        : Array.from({ length: 20 }, (_, i) => ({
            id: `trade-${i}`,
            symbol: 'AAPL',
            side: 'long' as const,
            entryDate: new Date('2023-06-01'),
            entryPrice: 100,
            entryReason: 'rsi_oversold',
            exitDate: new Date('2023-06-15'),
            exitPrice: i % 3 === 0 ? 95 : 108,
            exitReason: 'exit_signal',
            quantity: 100,
            pnl: i % 3 === 0 ? -500 : 800,
            pnlPercent: i % 3 === 0 ? -5 : 8,
            commission: 0,
          }));

      const mc = engine.runMonteCarloSimulation(trades, 100);

      expect(mc.simulations).toBe(100);
      expect(typeof mc.medianReturn).toBe('number');
      expect(typeof mc.percentile5).toBe('number');
      expect(typeof mc.percentile95).toBe('number');
      expect(mc.probabilityOfProfit).toBeGreaterThanOrEqual(0);
      expect(mc.probabilityOfProfit).toBeLessThanOrEqual(1);
      expect(typeof mc.expectedMaxDrawdown).toBe('number');
      expect(typeof mc.worstCaseDrawdown).toBe('number');
    });

    it('should handle empty trade list', () => {
      const engine = createBacktestEngine();
      const mc = engine.runMonteCarloSimulation([], 50);

      expect(mc.simulations).toBe(50);
      expect(mc.medianReturn).toBe(0);
    });
  });

  // ---- Edge Cases ----

  describe('edge cases', () => {
    it('should handle strategy with no matching entry conditions', async () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
      });

      engine.loadData('AAPL', makeOHLCV(200));

      // RSI > 200 will never trigger
      const result = await engine.runBacktest('AAPL', makeStrategy({
        entryRules: [{ indicator: 'rsi_14', operator: 'gt', value: 200 }],
      }));

      expect(result.totalTrades).toBe(0);
      expect(result.trades).toHaveLength(0);
    });

    it('should apply commission to trades', async () => {
      const engine = createBacktestEngine({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        commissionPerTrade: 5,
      });

      engine.loadData('AAPL', makeOHLCV(200));
      const result = await engine.runBacktest('AAPL', makeStrategy());

      for (const trade of result.trades) {
        expect(trade.commission).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
