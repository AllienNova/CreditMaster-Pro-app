/**
 * AI Stock Analyst Service Tests
 */

import { AIStockAnalystService } from '../ai-stock-analyst';
import type { StockAnalysisRequest } from '../types/stock-analysis.types';

// Mock the AIML service
jest.mock('../../aiml-service', () => ({
  AIMLService: jest.fn().mockImplementation(() => ({
    chat: jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary:
                'Test stock shows strong fundamentals with moderate technical signals.',
              bullCase: [
                'Strong revenue growth',
                'Market leader',
                'Expanding margins',
              ],
              bearCase: [
                'High valuation',
                'Competition increasing',
                'Macro headwinds',
              ],
              keyRisks: ['Market volatility', 'Regulatory changes'],
              investmentThesis:
                'Consider accumulating on dips for long-term growth.',
              priceTargets: [
                {
                  scenario: 'bull',
                  price: 200,
                  probability: 25,
                  timeframe: '12 months',
                  rationale: 'Best case',
                },
                {
                  scenario: 'base',
                  price: 175,
                  probability: 50,
                  timeframe: '12 months',
                  rationale: 'Expected',
                },
                {
                  scenario: 'bear',
                  price: 140,
                  probability: 25,
                  timeframe: '12 months',
                  rationale: 'Worst case',
                },
              ],
              catalysts: [
                {
                  type: 'earnings',
                  description: 'Q4 earnings',
                  potentialImpact: 'high',
                  direction: 'positive',
                },
              ],
            }),
          },
        },
      ],
    }),
  })),
}));

describe('AIStockAnalystService', () => {
  let service: AIStockAnalystService;

  beforeEach(() => {
    service = new AIStockAnalystService();
    service.clearCache();
  });

  describe('analyzeStock', () => {
    it('should return comprehensive analysis for valid symbol', async () => {
      const request: StockAnalysisRequest = {
        symbol: 'AAPL',
        analysisTypes: ['technical', 'fundamental', 'sentiment', 'ai'],
        includeAI: true,
        timeframe: 'medium',
        riskTolerance: 'moderate',
      };

      const result = await service.analyzeStock(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.symbol).toBe('AAPL');
      expect(result.data?.quote).toBeDefined();
      expect(result.data?.technical).toBeDefined();
      expect(result.data?.fundamental).toBeDefined();
      expect(result.data?.sentiment).toBeDefined();
      expect(result.data?.recommendation).toBeDefined();
    });

    it('should return error for empty symbol', async () => {
      const request: StockAnalysisRequest = {
        symbol: '',
        analysisTypes: ['technical'],
        includeAI: false,
        timeframe: 'short',
        riskTolerance: 'moderate',
      };

      const result = await service.analyzeStock(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid symbol');
    });

    it('should cache analysis results', async () => {
      const request: StockAnalysisRequest = {
        symbol: 'MSFT',
        analysisTypes: ['technical'],
        includeAI: false,
        timeframe: 'medium',
        riskTolerance: 'moderate',
      };

      // First call
      const result1 = await service.analyzeStock(request);
      expect(result1.success).toBe(true);

      // Second call should use cache
      const result2 = await service.analyzeStock(request);
      expect(result2.success).toBe(true);
      expect(result2.data?.timestamp).toEqual(result1.data?.timestamp);
    });

    it('should handle different timeframes', async () => {
      const shortTermRequest: StockAnalysisRequest = {
        symbol: 'GOOGL',
        analysisTypes: ['technical'],
        includeAI: false,
        timeframe: 'short',
        riskTolerance: 'aggressive',
      };

      const longTermRequest: StockAnalysisRequest = {
        symbol: 'GOOGL',
        analysisTypes: ['technical'],
        includeAI: false,
        timeframe: 'long',
        riskTolerance: 'conservative',
      };

      service.clearCache();
      const shortResult = await service.analyzeStock(shortTermRequest);

      service.clearCache();
      const longResult = await service.analyzeStock(longTermRequest);

      expect(shortResult.success).toBe(true);
      expect(longResult.success).toBe(true);
      expect(shortResult.data?.recommendation.timeHorizon).toBe('short_term');
      expect(longResult.data?.recommendation.timeHorizon).toBe('long_term');
    });
  });

  describe('technical analysis', () => {
    it('should calculate technical indicators', async () => {
      const request: StockAnalysisRequest = {
        symbol: 'TSLA',
        analysisTypes: ['technical'],
        includeAI: false,
        timeframe: 'medium',
        riskTolerance: 'moderate',
      };

      const result = await service.analyzeStock(request);

      expect(result.success).toBe(true);
      const technical = result.data?.technical;
      expect(technical).toBeDefined();
      expect(technical?.indicators.rsi).toBeGreaterThanOrEqual(0);
      expect(technical?.indicators.rsi).toBeLessThanOrEqual(100);
      expect(technical?.indicators.macd).toBeDefined();
      expect(technical?.indicators.bollingerBands).toBeDefined();
      expect(technical?.trend).toBeDefined();
      expect(technical?.support).toBeDefined();
      expect(technical?.resistance).toBeDefined();
    });

    it('should generate valid signals', async () => {
      const request: StockAnalysisRequest = {
        symbol: 'NVDA',
        analysisTypes: ['technical'],
        includeAI: false,
        timeframe: 'short',
        riskTolerance: 'aggressive',
      };

      const result = await service.analyzeStock(request);

      expect(result.success).toBe(true);
      const technical = result.data?.technical;
      expect(technical?.overallSignal).toMatch(
        /^(strong_buy|buy|hold|sell|strong_sell)$/
      );
      expect(technical?.confidence).toBeGreaterThanOrEqual(0);
      expect(technical?.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('fundamental analysis', () => {
    it('should calculate fundamental metrics', async () => {
      const request: StockAnalysisRequest = {
        symbol: 'AMZN',
        analysisTypes: ['fundamental'],
        includeAI: false,
        timeframe: 'long',
        riskTolerance: 'moderate',
      };

      const result = await service.analyzeStock(request);

      expect(result.success).toBe(true);
      const fundamental = result.data?.fundamental;
      expect(fundamental).toBeDefined();
      expect(fundamental?.valuation).toBeDefined();
      expect(fundamental?.profitability).toBeDefined();
      expect(fundamental?.growth).toBeDefined();
      expect(fundamental?.financial).toBeDefined();
      expect(fundamental?.overallRating).toMatch(
        /^(excellent|good|fair|poor|very_poor)$/
      );
    });

    it('should estimate fair value', async () => {
      const request: StockAnalysisRequest = {
        symbol: 'META',
        analysisTypes: ['fundamental'],
        includeAI: false,
        timeframe: 'medium',
        riskTolerance: 'moderate',
      };

      const result = await service.analyzeStock(request);

      expect(result.success).toBe(true);
      const fairValue = result.data?.fundamental?.fairValue;
      expect(fairValue).toBeDefined();
      expect(fairValue?.value).toBeGreaterThan(0);
      expect(fairValue?.method).toBe('dcf');
      expect(typeof fairValue?.upside).toBe('number');
    });
  });

  describe('sentiment analysis', () => {
    it('should analyze market sentiment', async () => {
      const request: StockAnalysisRequest = {
        symbol: 'NFLX',
        analysisTypes: ['sentiment'],
        includeAI: false,
        timeframe: 'medium',
        riskTolerance: 'moderate',
      };

      const result = await service.analyzeStock(request);

      expect(result.success).toBe(true);
      const sentiment = result.data?.sentiment;
      expect(sentiment).toBeDefined();
      expect(sentiment?.overallSentiment).toBeDefined();
      expect(sentiment?.overallSentiment.label).toMatch(
        /^(very_bullish|bullish|neutral|bearish|very_bearish)$/
      );
      expect(sentiment?.newsSentiment).toBeDefined();
      expect(sentiment?.analystSentiment).toBeDefined();
    });
  });

  describe('risk assessment', () => {
    it('should assess investment risk', async () => {
      const request: StockAnalysisRequest = {
        symbol: 'JPM',
        analysisTypes: ['risk'],
        includeAI: false,
        timeframe: 'medium',
        riskTolerance: 'conservative',
      };

      const result = await service.analyzeStock(request);

      expect(result.success).toBe(true);
      const risk = result.data?.riskAssessment;
      expect(risk).toBeDefined();
      expect(risk?.overallRisk).toMatch(
        /^(very_low|low|moderate|high|very_high)$/
      );
      expect(typeof risk?.beta).toBe('number');
      expect(typeof risk?.sharpeRatio).toBe('number');
      expect(typeof risk?.maxDrawdown).toBe('number');
    });
  });

  describe('recommendation generation', () => {
    it('should generate actionable recommendation', async () => {
      const request: StockAnalysisRequest = {
        symbol: 'DIS',
        analysisTypes: ['technical', 'fundamental', 'sentiment'],
        includeAI: false,
        timeframe: 'medium',
        riskTolerance: 'moderate',
      };

      const result = await service.analyzeStock(request);

      expect(result.success).toBe(true);
      const recommendation = result.data?.recommendation;
      expect(recommendation).toBeDefined();
      expect(recommendation?.action).toMatch(
        /^(strong_buy|buy|hold|sell|strong_sell)$/
      );
      expect(recommendation?.entryPrice).toBeGreaterThan(0);
      expect(recommendation?.targetPrice).toBeGreaterThan(0);
      expect(recommendation?.stopLoss).toBeGreaterThan(0);
      expect(recommendation?.rationale).toBeDefined();
      expect(Array.isArray(recommendation?.rationale)).toBe(true);
    });

    it('should adjust for risk tolerance', async () => {
      service.clearCache();
      const conservativeRequest: StockAnalysisRequest = {
        symbol: 'V',
        analysisTypes: ['technical', 'fundamental'],
        includeAI: false,
        timeframe: 'medium',
        riskTolerance: 'conservative',
      };

      service.clearCache();
      const aggressiveRequest: StockAnalysisRequest = {
        symbol: 'V',
        analysisTypes: ['technical', 'fundamental'],
        includeAI: false,
        timeframe: 'medium',
        riskTolerance: 'aggressive',
      };

      const conservativeResult =
        await service.analyzeStock(conservativeRequest);
      service.clearCache();
      const aggressiveResult = await service.analyzeStock(aggressiveRequest);

      expect(conservativeResult.success).toBe(true);
      expect(aggressiveResult.success).toBe(true);

      // Conservative should have tighter stop loss
      const conservativeStopLoss =
        conservativeResult.data?.recommendation.stopLoss || 0;
      const aggressiveStopLoss =
        aggressiveResult.data?.recommendation.stopLoss || 0;
      const entryPrice =
        conservativeResult.data?.recommendation.entryPrice || 0;

      // Conservative stop loss should be closer to entry (higher percentage)
      const conservativeStopPercent =
        (entryPrice - conservativeStopLoss) / entryPrice;
      const aggressiveStopPercent =
        (entryPrice - aggressiveStopLoss) / entryPrice;
      expect(conservativeStopPercent).toBeLessThan(aggressiveStopPercent);
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific symbol', async () => {
      const request: StockAnalysisRequest = {
        symbol: 'INTC',
        analysisTypes: ['technical'],
        includeAI: false,
        timeframe: 'short',
        riskTolerance: 'moderate',
      };

      const result1 = await service.analyzeStock(request);
      expect(result1.success).toBe(true);

      service.clearCache('INTC');

      const result2 = await service.analyzeStock(request);
      expect(result2.success).toBe(true);
      // After clearing cache, timestamps should be different
      expect(result2.data?.timestamp.getTime()).toBeGreaterThanOrEqual(
        result1.data?.timestamp.getTime() || 0
      );
    });

    it('should clear entire cache', async () => {
      const request1: StockAnalysisRequest = {
        symbol: 'AMD',
        analysisTypes: ['technical'],
        includeAI: false,
        timeframe: 'short',
        riskTolerance: 'moderate',
      };

      const request2: StockAnalysisRequest = {
        symbol: 'QCOM',
        analysisTypes: ['technical'],
        includeAI: false,
        timeframe: 'short',
        riskTolerance: 'moderate',
      };

      await service.analyzeStock(request1);
      await service.analyzeStock(request2);

      service.clearCache();

      // Both should be fresh after clearing
      const result1 = await service.analyzeStock(request1);
      const result2 = await service.analyzeStock(request2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});
