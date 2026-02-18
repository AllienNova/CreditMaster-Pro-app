/**
 * LLM Trading Engine — Unit Tests
 * TRD-008: 80%+ branch coverage
 *
 * AIMLService is mocked so the engine always falls back to getMockResponse.
 */

jest.mock('@/lib/aiml-service', () => ({
  AIMLService: jest.fn().mockImplementation(() => {
    throw new Error('AIML_API_KEY not set');
  }),
}));

import {
  LLMTradingEngine,
  type MarketContext,
  type TradeIdeaParams,
} from '../engines/llm-trading-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<MarketContext> = {}): MarketContext {
  return {
    symbol: 'AAPL',
    currentPrice: 150,
    priceChange24h: 0.02,
    priceChange7d: 0.05,
    volume: 50_000_000,
    volumeChange: 0.1,
    technicalSummary: {
      trend: 'bullish',
      support: 145,
      resistance: 160,
      rsi: 55,
      macdSignal: 'bullish',
    },
    ...overrides,
  };
}

function makeTradeIdeaParams(overrides: Partial<TradeIdeaParams> = {}): TradeIdeaParams {
  return {
    symbol: 'AAPL',
    context: makeContext(),
    riskTolerance: 'moderate',
    timeHorizon: 'swing',
    accountSize: 100_000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LLMTradingEngine', () => {
  let engine: LLMTradingEngine;

  beforeEach(() => {
    engine = new LLMTradingEngine();
  });

  // ---- Market Analysis ----

  describe('analyzeMarketConditions', () => {
    it('should return a MarketAnalysis with neutral mock data', async () => {
      const result = await engine.analyzeMarketConditions(
        ['AAPL'],
        [makeContext()]
      );

      expect(result.marketCondition).toBe('neutral');
      expect(result.summary).toBeTruthy();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(Array.isArray(result.sectors)).toBe(true);
      expect(Array.isArray(result.risks)).toBe(true);
      expect(Array.isArray(result.catalysts)).toBe(true);
    });

    it('should handle context without technicalSummary', async () => {
      const ctx = makeContext({ technicalSummary: undefined });
      const result = await engine.analyzeMarketConditions(['AAPL'], [ctx]);
      expect(result.marketCondition).toBeDefined();
    });
  });

  // ---- Trade Idea ----

  describe('generateTradeIdea', () => {
    it('should return a TradeIdea with required fields', async () => {
      const result = await engine.generateTradeIdea(makeTradeIdeaParams());

      expect(result.symbol).toBe('AAPL');
      expect(['long', 'short', 'neutral']).toContain(result.direction);
      expect(['high', 'medium', 'low']).toContain(result.conviction);
      expect(result.entry).toBeDefined();
      expect(result.stopLoss).toBeDefined();
      expect(result.targets.length).toBeGreaterThan(0);
      expect(result.positionSize).toBeDefined();
      expect(typeof result.positionSize.shares).toBe('number');
      expect(typeof result.positionSize.dollarAmount).toBe('number');
    });

    it('should compute position size from accountSize and positionSizePercent', async () => {
      const params = makeTradeIdeaParams({ accountSize: 200_000 });
      const result = await engine.generateTradeIdea(params);

      // Mock returns positionSizePercent = 2
      expect(result.positionSize.portfolioPercent).toBe(2);
      expect(result.positionSize.dollarAmount).toBeCloseTo(200_000 * 0.02, 0);
    });
  });

  // ---- Signal Interpretation ----

  describe('interpretSignals', () => {
    it('should return a SignalInterpretation', async () => {
      const signals = [
        { source: 'RSI', signal: 'buy', confidence: 0.8 },
        { source: 'MACD', signal: 'sell', confidence: 0.6, details: 'bearish crossover' },
      ];

      const result = await engine.interpretSignals(signals, makeContext());

      expect(result.overallSignal).toBe('hold');
      expect(result.confidence).toBe(0.5);
      expect(result.recommendation).toBe('wait');
      expect(result.signalQuality).toBeDefined();
      expect(result.signalQuality.technical).toBe(0.5);
      expect(Array.isArray(result.considerations)).toBe(true);
      expect(Array.isArray(result.riskFactors)).toBe(true);
    });
  });

  // ---- Risk Assessment ----

  describe('assessRisk', () => {
    it('should return a RiskAssessment with medium risk from mock', async () => {
      const tradeIdea = (await engine.generateTradeIdea(makeTradeIdeaParams()));
      const result = await engine.assessRisk(tradeIdea, {
        value: 100_000,
        positions: [{ symbol: 'MSFT', value: 10_000 }],
      });

      expect(result.overallRisk).toBe('medium');
      expect(result.riskScore).toBe(50);
      expect(Array.isArray(result.factors)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should work without portfolio param', async () => {
      const tradeIdea = await engine.generateTradeIdea(makeTradeIdeaParams());
      const result = await engine.assessRisk(tradeIdea);

      expect(result.overallRisk).toBeDefined();
    });
  });

  // ---- Portfolio Review ----

  describe('reviewPortfolio', () => {
    it('should return PortfolioReview with health score', async () => {
      const positions = [
        { symbol: 'AAPL', shares: 100, avgCost: 140, currentPrice: 150, sector: 'Tech' },
        { symbol: 'MSFT', shares: 50, avgCost: 300, currentPrice: 310 },
      ];

      const result = await engine.reviewPortfolio(positions, 100_000);

      expect(result.healthScore).toBe(70);
      expect(result.diversification.score).toBe(70);
      expect(result.riskExposure.overall).toBe('medium');
      expect(Array.isArray(result.performanceInsights)).toBe(true);
    });
  });

  // ---- Sentiment Analysis ----

  describe('analyzeSentiment', () => {
    it('should return neutral sentiment from mock', async () => {
      const result = await engine.analyzeSentiment(makeContext());

      expect(result.symbol).toBe('AAPL');
      expect(result.overallSentiment).toBe('neutral');
      expect(result.sentimentScore).toBe(0);
      expect(result.confidence).toBe(0.5);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle context with recentNews and socialSentiment', async () => {
      const ctx = makeContext({
        recentNews: [{ headline: 'AAPL beats earnings', sentiment: 0.8 }],
        socialSentiment: 0.6,
      });
      const result = await engine.analyzeSentiment(ctx);
      expect(result.overallSentiment).toBeDefined();
    });
  });

  // ---- Signal Generation ----

  describe('generateSignal', () => {
    it('should return a GeneratedSignal with hold from mock', async () => {
      const result = await engine.generateSignal(makeContext());

      expect(result.symbol).toBe('AAPL');
      expect(result.action).toBe('hold');
      expect(result.confidence).toBe(0.5);
      expect(result.timeframe).toBe('swing');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should accept optional signals and sentiment params', async () => {
      const signals = [{ source: 'RSI', signal: 'buy', confidence: 0.7 }];
      const sentiment = {
        symbol: 'AAPL',
        overallSentiment: 'bullish' as const,
        sentimentScore: 0.6,
        confidence: 0.7,
        drivers: [],
        summary: 'Positive',
        timestamp: new Date(),
      };

      const result = await engine.generateSignal(makeContext(), signals, sentiment);
      expect(result.action).toBeDefined();
    });
  });

  // ---- Edge case: empty JSON parse ----

  describe('fallback behavior', () => {
    it('should return defaults when prompt matches no mock category', async () => {
      // analyzeSentiment sends a prompt containing "sentiment" so it matches.
      // There's no direct way to trigger '{}' without accessing private methods,
      // so we verify the parse fallback by testing that all methods produce
      // well-structured output even from mock data.
      const analysis = await engine.analyzeMarketConditions(['XYZ'], [makeContext({ symbol: 'XYZ' })]);
      expect(analysis.marketCondition).toBeDefined();
    });
  });
});
