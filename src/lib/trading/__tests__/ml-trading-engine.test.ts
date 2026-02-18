/**
 * ML Trading Engine — Unit Tests
 * TRD-008: 80%+ branch coverage
 */

import {
  MLTradingEngine,
  type MLModelConfig,
  type FeatureVector,
} from '../engines/ml-trading-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModelConfig(overrides: Partial<MLModelConfig> = {}): MLModelConfig {
  return {
    id: 'test-model',
    name: 'Test Model',
    type: 'classification',
    architecture: 'random_forest',
    features: [
      { name: 'sma_20', category: 'technical', indicator: 'sma', period: 20 },
      { name: 'rsi_14', category: 'technical', indicator: 'rsi', period: 14 },
    ],
    target: { type: 'direction', horizon: 5, threshold: 0.001 },
    training: {
      trainSplit: 0.7,
      validationSplit: 0.15,
      epochs: 50,
      learningRate: 0.01,
      earlyStoppingPatience: 5,
    },
    ...overrides,
  };
}

function makeHistoricalData(count: number) {
  const data: { timestamp: Date; open: number; high: number; low: number; close: number; volume: number }[] = [];
  const baseDate = new Date('2024-01-01');
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const price = 100 + Math.sin(i * 0.1) * 10 + i * 0.05;
    data.push({
      timestamp: new Date(date),
      open: price - 0.5,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    });
  }
  return data;
}

function makeFeatureVector(symbol = 'AAPL'): FeatureVector {
  return {
    symbol,
    timestamp: new Date(),
    features: {
      sma_20: 150.5,
      rsi_14: 55,
      ema_50: 148.2,
      macd_signal: 0.5,
      atr_14: 2.3,
      returns_1: 0.01,
      volatility_20: 0.02,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MLTradingEngine', () => {
  let engine: MLTradingEngine;

  beforeEach(() => {
    engine = new MLTradingEngine();
  });

  // ---- Model CRUD ----

  describe('registerModel / getModel / listModels', () => {
    it('should register and retrieve a model', () => {
      const config = makeModelConfig();
      engine.registerModel(config);

      const retrieved = engine.getModel('test-model');
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('test-model');
      expect(retrieved!.name).toBe('Test Model');
    });

    it('should return undefined for unknown model', () => {
      expect(engine.getModel('nonexistent')).toBeUndefined();
    });

    it('should list all registered models', () => {
      engine.registerModel(makeModelConfig({ id: 'model-a', name: 'A' }));
      engine.registerModel(makeModelConfig({ id: 'model-b', name: 'B' }));

      const models = engine.listModels();
      expect(models).toHaveLength(2);
      const ids = models.map(m => m.id);
      expect(ids).toContain('model-a');
      expect(ids).toContain('model-b');
    });
  });

  // ---- Feature Extraction ----

  describe('extractFeatures', () => {
    it('should extract features from sufficient historical data (>=50 bars)', async () => {
      const data = makeHistoricalData(80);
      const config = makeModelConfig();
      engine.registerModel(config);

      const features = await engine.extractFeatures('AAPL', data, config.features);

      // Features start from index 50
      expect(features.length).toBeGreaterThan(0);
      expect(features.length).toBeLessThanOrEqual(data.length - 50);
      expect(features[0].symbol).toBe('AAPL');
      expect(typeof features[0].features).toBe('object');
    });

    it('should return empty array for fewer than 51 bars', async () => {
      const data = makeHistoricalData(30);
      const config = makeModelConfig();

      const features = await engine.extractFeatures('AAPL', data, config.features);
      expect(features).toHaveLength(0);
    });
  });

  // ---- Prediction ----

  describe('predict', () => {
    it('should throw for unregistered model', async () => {
      const fv = makeFeatureVector();
      await expect(engine.predict('nonexistent', fv)).rejects.toThrow(
        'Model nonexistent not found'
      );
    });

    it('should return hold/0.5 for random_forest without trained weights', async () => {
      engine.registerModel(makeModelConfig({ architecture: 'random_forest' }));
      const prediction = await engine.predict('test-model', makeFeatureVector());

      expect(prediction.signal).toBe('hold');
      expect(prediction.confidence).toBe(0.5);
      expect(prediction.symbol).toBe('AAPL');
      expect(prediction.modelVersion).toBeTruthy();
    });

    it('should return hold/0.5 for gradient_boosting without trained weights', async () => {
      engine.registerModel(makeModelConfig({ architecture: 'gradient_boosting' }));
      const prediction = await engine.predict('test-model', makeFeatureVector());

      expect(prediction.signal).toBe('hold');
      expect(prediction.confidence).toBe(0.5);
    });

    it('should return hold/0.5 for neural_network without trained weights', async () => {
      engine.registerModel(makeModelConfig({ architecture: 'neural_network' }));
      const prediction = await engine.predict('test-model', makeFeatureVector());

      expect(prediction.signal).toBe('hold');
      expect(prediction.confidence).toBe(0.5);
    });

    it('should return hold/0.5 for lstm without trained weights', async () => {
      engine.registerModel(makeModelConfig({ architecture: 'lstm' }));
      const prediction = await engine.predict('test-model', makeFeatureVector());

      expect(prediction.signal).toBe('hold');
      expect(prediction.confidence).toBe(0.5);
    });

    it('should fall back to hold/0.5 for unknown architecture', async () => {
      engine.registerModel(
        makeModelConfig({ architecture: 'transformer' as MLModelConfig['architecture'] })
      );
      const prediction = await engine.predict('test-model', makeFeatureVector());

      expect(prediction.signal).toBe('hold');
      expect(prediction.confidence).toBe(0.5);
    });

    it('should record last prediction per symbol', async () => {
      engine.registerModel(makeModelConfig());
      await engine.predict('test-model', makeFeatureVector('AAPL'));

      const last = engine.getLastPrediction('AAPL');
      expect(last).toBeDefined();
      expect(last!.symbol).toBe('AAPL');
    });

    it('should return undefined for symbol with no prediction', () => {
      expect(engine.getLastPrediction('UNKNOWN')).toBeUndefined();
    });
  });

  // ---- Training ----

  describe('train', () => {
    it('should throw for unregistered model', async () => {
      await expect(engine.train('nonexistent', [])).rejects.toThrow(
        'Model nonexistent not found'
      );
    });

    it('should throw for insufficient training data (<10 samples)', async () => {
      engine.registerModel(makeModelConfig());
      const smallData: FeatureVector[] = Array.from({ length: 5 }, (_, i) => ({
        symbol: 'AAPL',
        timestamp: new Date(),
        features: { sma_20: 100 + i, rsi_14: 50 + i },
        target: i % 2 === 0 ? 1 : -1,
      }));

      await expect(engine.train('test-model', smallData)).rejects.toThrow(
        /insufficient training data/i
      );
    });

    it('should throw for feature vectors with 0 features', async () => {
      engine.registerModel(makeModelConfig());
      const emptyFeatures: FeatureVector[] = Array.from({ length: 20 }, () => ({
        symbol: 'AAPL',
        timestamp: new Date(),
        features: {},
        target: 1,
      }));

      await expect(engine.train('test-model', emptyFeatures)).rejects.toThrow();
    });

    it('should train successfully with valid data and return evaluation', async () => {
      engine.registerModel(makeModelConfig({ architecture: 'random_forest' }));

      const trainingData: FeatureVector[] = Array.from({ length: 50 }, (_, i) => ({
        symbol: 'AAPL',
        timestamp: new Date(Date.now() + i * 86400000),
        features: {
          sma_20: 100 + i * 0.5,
          rsi_14: 40 + (i % 30),
        },
        target: i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0,
      }));

      const evaluation = await engine.train('test-model', trainingData);

      expect(evaluation).toBeDefined();
      expect(typeof evaluation.trainScore).toBe('number');
      expect(typeof evaluation.validationScore).toBe('number');
      expect(evaluation.featureImportance).toBeDefined();
    });

    it('should allow prediction with trained weights', async () => {
      engine.registerModel(makeModelConfig({ architecture: 'gradient_boosting' }));

      const trainingData: FeatureVector[] = Array.from({ length: 50 }, (_, i) => ({
        symbol: 'AAPL',
        timestamp: new Date(Date.now() + i * 86400000),
        features: {
          sma_20: 100 + i * 0.5,
          rsi_14: 40 + (i % 30),
        },
        target: i < 25 ? 1 : -1,
      }));

      await engine.train('test-model', trainingData);

      const prediction = await engine.predict('test-model', makeFeatureVector());
      expect(['buy', 'sell', 'hold']).toContain(prediction.signal);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ---- Batch Prediction ----

  describe('predictBatch', () => {
    it('should skip symbols with fewer than 50 data points', async () => {
      engine.registerModel(makeModelConfig());

      const historicalDataMap = new Map<string, ReturnType<typeof makeHistoricalData>>();
      historicalDataMap.set('AAPL', makeHistoricalData(80));
      historicalDataMap.set('TINY', makeHistoricalData(20)); // too few

      const predictions = await engine.predictBatch(
        'test-model',
        ['AAPL', 'TINY'],
        historicalDataMap
      );

      // AAPL should have prediction, TINY should be skipped
      const symbols = predictions.map(p => p.symbol);
      expect(symbols).toContain('AAPL');
      expect(symbols).not.toContain('TINY');
    });

    it('should throw for unregistered model', async () => {
      await expect(
        engine.predictBatch('nonexistent', ['AAPL'], new Map())
      ).rejects.toThrow();
    });
  });

  // ---- Ensemble architecture ----

  describe('ensemble architecture', () => {
    it('should handle ensemble with sub-models', async () => {
      engine.registerModel(makeModelConfig({ id: 'sub-rf', architecture: 'random_forest' }));
      engine.registerModel(makeModelConfig({ id: 'sub-nn', architecture: 'neural_network' }));
      engine.registerModel(
        makeModelConfig({
          id: 'ensemble-model',
          architecture: 'ensemble',
          ensembleModels: ['sub-rf', 'sub-nn'],
          ensembleWeights: [0.6, 0.4],
        })
      );

      const prediction = await engine.predict('ensemble-model', makeFeatureVector());
      expect(['buy', 'sell', 'hold']).toContain(prediction.signal);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });
  });
});
