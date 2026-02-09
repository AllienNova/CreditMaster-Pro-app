/**
 * Investment Analysis Engine Tests
 *
 * Comprehensive test suite for the unified investment analysis engine
 */

import { getInvestmentAnalysisEngine } from '../InvestmentAnalysisEngine';
import type { PortfolioHolding } from '../PortfolioAnalysisService';

describe('InvestmentAnalysisEngine', () => {
  let engine: ReturnType<typeof getInvestmentAnalysisEngine>;

  beforeEach(() => {
    engine = getInvestmentAnalysisEngine();
  });

  // ============================================================================
  // SINGLETON PATTERN
  // ============================================================================

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getInvestmentAnalysisEngine();
      const instance2 = getInvestmentAnalysisEngine();
      expect(instance1).toBe(instance2);
    });
  });

  // ============================================================================
  // COMPREHENSIVE ANALYSIS
  // ============================================================================

  describe('analyzeInvestment', () => {
    const mockHistoricalData = Array.from({ length: 100 }, (_, i) => ({
      close: 100 + Math.random() * 20 - 10,
      high: 105 + Math.random() * 20 - 10,
      low: 95 + Math.random() * 20 - 10,
      volume: 1000000 + Math.random() * 500000,
      timestamp: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
    }));

    it('should perform comprehensive analysis', async () => {
      const result = await engine.analyzeInvestment('AAPL', 150.0, mockHistoricalData);

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
      expect(result.currentPrice).toBe(150.0);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it('should include all analysis components', async () => {
      const result = await engine.analyzeInvestment('TSLA', 200.0, mockHistoricalData);

      expect(result.technical).toBeDefined();
      expect(result.fundamental).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it('should calculate composite score', async () => {
      const result = await engine.analyzeInvestment('NVDA', 300.0, mockHistoricalData);

      expect(result.compositeScore).toBeDefined();
      expect(result.compositeScore.overall).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore.overall).toBeLessThanOrEqual(100);
      expect(result.compositeScore.confidence).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore.confidence).toBeLessThanOrEqual(100);
    });

    it('should include correlation analysis', async () => {
      const result = await engine.analyzeInvestment('MSFT', 250.0, mockHistoricalData);

      expect(result.correlationAnalysis).toBeDefined();
      expect(result.correlationAnalysis.overallAlignment).toBeGreaterThanOrEqual(0);
      expect(result.correlationAnalysis.overallAlignment).toBeLessThanOrEqual(100);
      expect(result.correlationAnalysis.alignmentLevel).toMatch(
        /strong|moderate|weak|conflicting/
      );
    });

    it('should determine overall signal', async () => {
      const result = await engine.analyzeInvestment('GOOGL', 120.0, mockHistoricalData);

      expect(result.overallSignal).toMatch(/strong_buy|buy|neutral|sell|strong_sell/);
      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(100);
    });

    it('should assess risk level', async () => {
      const result = await engine.analyzeInvestment('AMZN', 180.0, mockHistoricalData);

      expect(result.riskLevel).toMatch(/low|moderate|high|very_high/);
    });

    it('should generate insights', async () => {
      const result = await engine.analyzeInvestment('META', 350.0, mockHistoricalData);

      expect(result.keyInsights).toBeDefined();
      expect(Array.isArray(result.keyInsights)).toBe(true);
      expect(result.risks).toBeDefined();
      expect(Array.isArray(result.risks)).toBe(true);
      expect(result.opportunities).toBeDefined();
      expect(Array.isArray(result.opportunities)).toBe(true);
    });

    it('should generate summary', async () => {
      const result = await engine.analyzeInvestment('NFLX', 400.0, mockHistoricalData);

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should handle custom timeframe', async () => {
      const result = await engine.analyzeInvestment('AMD', 100.0, mockHistoricalData, {
        timeframe: '1h',
      });

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AMD');
    });

    it('should handle user profile', async () => {
      const result = await engine.analyzeInvestment('INTC', 50.0, mockHistoricalData, {
        userProfile: {
          riskTolerance: 'conservative',
          investmentHorizon: 'long_term',
          portfolioSize: 100000,
          preferredSectors: ['Technology'],
          goals: [{ type: 'growth' }],
        },
      });

      expect(result).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });
  });




  // ============================================================================
  // PORTFOLIO ANALYSIS
  // ============================================================================

  describe('analyzePortfolio', () => {
    const mockHoldings: PortfolioHolding[] = [
      {
        symbol: 'AAPL',
        shares: 10,
        costBasis: 140.0,
        currentPrice: 150.0,
        assetClass: 'stock',
        sector: 'Technology',
      },
      {
        symbol: 'MSFT',
        shares: 5,
        costBasis: 240.0,
        currentPrice: 250.0,
        assetClass: 'stock',
        sector: 'Technology',
      },
      {
        symbol: 'JNJ',
        shares: 8,
        costBasis: 160.0,
        currentPrice: 165.0,
        assetClass: 'stock',
        sector: 'Healthcare',
      },
    ];

    const mockHistoricalData = new Map([
      [
        'AAPL',
        Array.from({ length: 50 }, (_, i) => ({
          close: 150 + Math.random() * 10 - 5,
          high: 155 + Math.random() * 10 - 5,
          low: 145 + Math.random() * 10 - 5,
          volume: 1000000,
          timestamp: new Date(Date.now() - (50 - i) * 24 * 60 * 60 * 1000),
        })),
      ],
      [
        'MSFT',
        Array.from({ length: 50 }, (_, i) => ({
          close: 250 + Math.random() * 10 - 5,
          high: 255 + Math.random() * 10 - 5,
          low: 245 + Math.random() * 10 - 5,
          volume: 800000,
          timestamp: new Date(Date.now() - (50 - i) * 24 * 60 * 60 * 1000),
        })),
      ],
      [
        'JNJ',
        Array.from({ length: 50 }, (_, i) => ({
          close: 165 + Math.random() * 5 - 2.5,
          high: 167 + Math.random() * 5 - 2.5,
          low: 163 + Math.random() * 5 - 2.5,
          volume: 500000,
          timestamp: new Date(Date.now() - (50 - i) * 24 * 60 * 60 * 1000),
        })),
      ],
    ]);

    it('should analyze portfolio', async () => {
      const result = await engine.analyzePortfolio('test-portfolio', mockHoldings, mockHistoricalData);

      expect(result).toBeDefined();
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it('should include portfolio metrics', async () => {
      const result = await engine.analyzePortfolio('test-portfolio', mockHoldings, mockHistoricalData);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalValue).toBeGreaterThan(0);
      expect(result.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(result.diversificationScore).toBeLessThanOrEqual(100);
    });

    it('should analyze individual holdings', async () => {
      const result = await engine.analyzePortfolio('test-portfolio', mockHoldings, mockHistoricalData);

      expect(result.holdingAnalyses).toBeDefined();
      expect(result.holdingAnalyses.size).toBe(3);
      expect(result.holdingAnalyses.has('AAPL')).toBe(true);
      expect(result.holdingAnalyses.has('MSFT')).toBe(true);
      expect(result.holdingAnalyses.has('JNJ')).toBe(true);
    });

    it('should calculate portfolio health', async () => {
      const result = await engine.analyzePortfolio('test-portfolio', mockHoldings, mockHistoricalData);

      expect(result.portfolioHealth).toBeGreaterThanOrEqual(0);
      expect(result.portfolioHealth).toBeLessThanOrEqual(100);
    });

    it('should calculate portfolio risk score', async () => {
      const result = await engine.analyzePortfolio('test-portfolio', mockHoldings, mockHistoricalData);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should generate position adjustments', async () => {
      const result = await engine.analyzePortfolio('test-portfolio', mockHoldings, mockHistoricalData);

      expect(result.positionAdjustments).toBeDefined();
      expect(Array.isArray(result.positionAdjustments)).toBe(true);
    });

    it('should generate rebalance recommendations', async () => {
      const result = await engine.analyzePortfolio('test-portfolio', mockHoldings, mockHistoricalData);

      expect(result.rebalanceRecommendations).toBeDefined();
      expect(Array.isArray(result.rebalanceRecommendations)).toBe(true);
    });

    it('should generate portfolio summary', async () => {
      const result = await engine.analyzePortfolio('test-portfolio', mockHoldings, mockHistoricalData);

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // COMPOSITE SCORING
  // ============================================================================

  describe('Composite Scoring', () => {
    const mockData = Array.from({ length: 100 }, (_, i) => ({
      close: 100 + Math.random() * 20 - 10,
      high: 105 + Math.random() * 20 - 10,
      low: 95 + Math.random() * 20 - 10,
      volume: 1000000 + Math.random() * 500000,
      timestamp: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
    }));

    it('should weight technical analysis at 30%', async () => {
      const result = await engine.analyzeInvestment('TEST', 100.0, mockData);

      expect(result.compositeScore.weights.technical).toBe(0.30);
    });

    it('should weight fundamental analysis at 35%', async () => {
      const result = await engine.analyzeInvestment('TEST', 100.0, mockData);

      expect(result.compositeScore.weights.fundamental).toBe(0.35);
    });

    it('should weight sentiment analysis at 20%', async () => {
      const result = await engine.analyzeInvestment('TEST', 100.0, mockData);

      expect(result.compositeScore.weights.sentiment).toBe(0.20);
    });

    it('should weight pattern recognition at 15%', async () => {
      const result = await engine.analyzeInvestment('TEST', 100.0, mockData);

      expect(result.compositeScore.weights.pattern).toBe(0.15);
    });
  });
});
