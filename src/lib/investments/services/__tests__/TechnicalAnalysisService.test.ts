/**
 * TechnicalAnalysisService Tests
 *
 * Comprehensive test suite for technical analysis calculations
 */

import { TechnicalAnalysisService } from '../TechnicalAnalysisService';
import type { Timeframe } from '../../types/investment.types';

describe('TechnicalAnalysisService', () => {
  let service: TechnicalAnalysisService;

  // Sample historical data for testing
  const createHistoricalData = (length: number = 200) => {
    const data = [];
    let basePrice = 100;

    for (let i = 0; i < length; i++) {
      // Create realistic price movement
      const change = (Math.random() - 0.5) * 4;
      basePrice += change;

      data.push({
        close: basePrice,
        high: basePrice + Math.random() * 2,
        low: basePrice - Math.random() * 2,
        volume: 1000000 + Math.random() * 500000,
        timestamp: new Date(Date.now() - (length - i) * 24 * 60 * 60 * 1000),
      });
    }

    return data;
  };

  // Create trending data (bullish)
  const createBullishData = (length: number = 200) => {
    const data = [];
    let basePrice = 100;

    for (let i = 0; i < length; i++) {
      basePrice += 0.5 + Math.random() * 0.5; // Consistent upward movement

      data.push({
        close: basePrice,
        high: basePrice + Math.random() * 1,
        low: basePrice - Math.random() * 0.5,
        volume: 1000000 + Math.random() * 500000,
        timestamp: new Date(Date.now() - (length - i) * 24 * 60 * 60 * 1000),
      });
    }

    return data;
  };

  // Create trending data (bearish)
  const createBearishData = (length: number = 200) => {
    const data = [];
    let basePrice = 200;

    for (let i = 0; i < length; i++) {
      basePrice -= 0.5 + Math.random() * 0.5; // Consistent downward movement

      data.push({
        close: basePrice,
        high: basePrice + Math.random() * 0.5,
        low: basePrice - Math.random() * 1,
        volume: 1000000 + Math.random() * 500000,
        timestamp: new Date(Date.now() - (length - i) * 24 * 60 * 60 * 1000),
      });
    }

    return data;
  };

  beforeEach(() => {
    service = new TechnicalAnalysisService();
  });

  describe('analyzeTechnical', () => {
    it('should perform comprehensive technical analysis', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
      expect(result.timeframe).toBe('1d');
      expect(result.analyzedAt).toBeInstanceOf(Date);
      expect(result.trend).toBeDefined();
      expect(result.momentum).toBeDefined();
      expect(result.volatility).toBeDefined();
      expect(result.volume).toBeDefined();
      expect(result.supportResistance).toBeDefined();
      expect(result.signals).toBeInstanceOf(Array);
      expect(result.overallSignal).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.summary).toBeDefined();
    });

    it('should detect bullish trend in upward trending data', async () => {
      const historicalData = createBullishData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.trend.shortTerm).toBe('bullish');
      expect(result.trend.mediumTerm).toBe('bullish');
      expect(result.trend.longTerm).toBe('bullish');
      expect(result.overallSignal).toMatch(/buy|strong_buy/);
    });

    it('should detect bearish trend in downward trending data', async () => {
      const historicalData = createBearishData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.trend.shortTerm).toBe('bearish');
      expect(result.trend.mediumTerm).toBe('bearish');
      expect(result.trend.longTerm).toBe('bearish');
      expect(result.overallSignal).toMatch(/sell|strong_sell/);
    });

    it('should generate signals when includeSignals is true', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData, {
        includeSignals: true,
      });

      expect(result.signals).toBeInstanceOf(Array);
      // Signals may or may not be present depending on market conditions
    });

    it('should not generate signals when includeSignals is false', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData, {
        includeSignals: false,
      });

      expect(result.signals).toEqual([]);
    });
  });

  describe('Trend Analysis', () => {
    it('should correctly identify moving average positions', async () => {
      const historicalData = createBullishData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.trend.movingAverages).toBeDefined();
      expect(result.trend.movingAverages.ma20).toBeGreaterThan(0);
      expect(result.trend.movingAverages.ma50).toBeGreaterThan(0);
      expect(result.trend.movingAverages.ma200).toBeGreaterThan(0);
      expect(result.trend.movingAverages.priceVs20).toMatch(/above|below/);
      expect(result.trend.movingAverages.priceVs50).toMatch(/above|below/);
      expect(result.trend.movingAverages.priceVs200).toMatch(/above|below/);
    });

    it('should calculate ADX for trend strength', async () => {
      const historicalData = createBullishData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.trend.adx).toBeGreaterThanOrEqual(0);
      expect(result.trend.adx).toBeLessThanOrEqual(100);
      expect(result.trend.strength).toBe(result.trend.adx);
    });
  });

  describe('Momentum Analysis', () => {
    it('should calculate RSI correctly', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.momentum.rsi).toBeGreaterThanOrEqual(0);
      expect(result.momentum.rsi).toBeLessThanOrEqual(100);
    });

    it('should identify RSI overbought zone', async () => {
      // Create data that will result in high RSI
      const data = [];
      let basePrice = 100;
      for (let i = 0; i < 200; i++) {
        basePrice += 1; // Consistent upward movement
        data.push({
          close: basePrice,
          high: basePrice + 0.5,
          low: basePrice - 0.2,
          volume: 1000000,
          timestamp: new Date(Date.now() - (200 - i) * 24 * 60 * 60 * 1000),
        });
      }

      const result = await service.analyzeTechnical('AAPL', '1d', data);
      expect(result.momentum.rsi).toBeGreaterThan(70);
      expect(result.momentum.rsiZone).toBe('overbought');
    });

    it('should identify RSI oversold zone', async () => {
      // Create data that will result in low RSI
      const data = [];
      let basePrice = 200;
      for (let i = 0; i < 200; i++) {
        basePrice -= 1; // Consistent downward movement
        data.push({
          close: basePrice,
          high: basePrice + 0.2,
          low: basePrice - 0.5,
          volume: 1000000,
          timestamp: new Date(Date.now() - (200 - i) * 24 * 60 * 60 * 1000),
        });
      }

      const result = await service.analyzeTechnical('AAPL', '1d', data);
      expect(result.momentum.rsi).toBeLessThan(30);
      expect(result.momentum.rsiZone).toBe('oversold');
    });

    it('should calculate MACD components', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.momentum.macd).toBeDefined();
      expect(result.momentum.macdSignal).toBeDefined();
      expect(result.momentum.macdHistogram).toBeDefined();
      expect(typeof result.momentum.macd).toBe('number');
      expect(typeof result.momentum.macdSignal).toBe('number');
      expect(typeof result.momentum.macdHistogram).toBe('number');
    });

    it('should calculate Stochastic oscillator', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.momentum.stochK).toBeGreaterThanOrEqual(0);
      expect(result.momentum.stochK).toBeLessThanOrEqual(100);
      expect(result.momentum.stochD).toBeGreaterThanOrEqual(0);
      expect(result.momentum.stochD).toBeLessThanOrEqual(100);
    });

    it('should determine overall momentum', async () => {
      const historicalData = createBullishData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.momentum.overallMomentum).toMatch(
        /strong_bullish|bullish|neutral|bearish|strong_bearish/
      );
    });
  });

  describe('Volatility Analysis', () => {
    it('should calculate ATR', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.volatility.atr).toBeGreaterThan(0);
      expect(result.volatility.atrPercent).toBeGreaterThan(0);
    });

    it('should calculate Bollinger Bands', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.volatility.bollingerBandwidth).toBeGreaterThan(0);
      // %B can be negative (price below lower band) or >1 (price above upper band)
      expect(result.volatility.bollingerPercentB).toBeDefined();
      expect(typeof result.volatility.bollingerPercentB).toBe('number');
      expect(isFinite(result.volatility.bollingerPercentB)).toBe(true);
    });

    it('should identify volatility levels', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.volatility.volatilityLevel).toMatch(/low|normal|high|extreme/);
    });

    it('should detect Bollinger Band squeeze', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(typeof result.volatility.isSqueezing).toBe('boolean');
    });
  });

  describe('Volume Analysis', () => {
    it('should calculate volume metrics', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.volume.currentVolume).toBeGreaterThan(0);
      expect(result.volume.avgVolume).toBeGreaterThan(0);
      expect(result.volume.volumeRatio).toBeGreaterThan(0);
    });

    it('should determine volume trend', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.volume.volumeTrend).toMatch(/bullish|bearish|neutral/);
    });

    it('should calculate OBV', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(typeof result.volume.onBalanceVolume).toBe('number');
      expect(result.volume.obvTrend).toMatch(/bullish|bearish|neutral/);
    });

    it('should identify accumulation/distribution', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.volume.accumulationDistribution).toMatch(/accumulation|distribution|neutral/);
    });
  });


  describe('Support and Resistance', () => {
    it('should identify support and resistance levels', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.supportResistance).toBeDefined();
      expect(result.supportResistance.symbol).toBe('AAPL');
      expect(result.supportResistance.timeframe).toBe('1d');
      expect(result.supportResistance.supports).toBeInstanceOf(Array);
      expect(result.supportResistance.resistances).toBeInstanceOf(Array);
    });

    it('should classify support/resistance strength', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      if (result.supportResistance.supports.length > 0) {
        const support = result.supportResistance.supports[0];
        expect(support.type).toBe('support');
        expect(support.strength).toMatch(/weak|moderate|strong/);
        expect(support.price).toBeGreaterThan(0);
        expect(support.touchCount).toBeGreaterThan(0);
        expect(support.lastTouched).toBeInstanceOf(Date);
      }

      if (result.supportResistance.resistances.length > 0) {
        const resistance = result.supportResistance.resistances[0];
        expect(resistance.type).toBe('resistance');
        expect(resistance.strength).toMatch(/weak|moderate|strong/);
        expect(resistance.price).toBeGreaterThan(0);
        expect(resistance.touchCount).toBeGreaterThan(0);
        expect(resistance.lastTouched).toBeInstanceOf(Date);
      }
    });

    it('should return at most 3 support and 3 resistance levels', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.supportResistance.supports.length).toBeLessThanOrEqual(3);
      expect(result.supportResistance.resistances.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Signal Generation', () => {
    it('should generate RSI oversold signal', async () => {
      // Create data that will result in low RSI
      const data = [];
      let basePrice = 200;
      for (let i = 0; i < 200; i++) {
        basePrice -= 1;
        data.push({
          close: basePrice,
          high: basePrice + 0.2,
          low: basePrice - 0.5,
          volume: 1000000,
          timestamp: new Date(Date.now() - (200 - i) * 24 * 60 * 60 * 1000),
        });
      }

      const result = await service.analyzeTechnical('AAPL', '1d', data, {
        includeSignals: true,
      });

      const rsiSignal = result.signals.find((s) => s.name.includes('RSI'));
      if (rsiSignal) {
        expect(rsiSignal.type).toBe('indicator');
        expect(rsiSignal.signal).toMatch(/buy|strong_buy/);
        expect(rsiSignal.reliability).toBeGreaterThan(0);
        expect(rsiSignal.reliability).toBeLessThanOrEqual(100);
        expect(rsiSignal.description).toContain('oversold');
      }
    });

    it('should generate RSI overbought signal', async () => {
      // Create data that will result in high RSI
      const data = [];
      let basePrice = 100;
      for (let i = 0; i < 200; i++) {
        basePrice += 1;
        data.push({
          close: basePrice,
          high: basePrice + 0.5,
          low: basePrice - 0.2,
          volume: 1000000,
          timestamp: new Date(Date.now() - (200 - i) * 24 * 60 * 60 * 1000),
        });
      }

      const result = await service.analyzeTechnical('AAPL', '1d', data, {
        includeSignals: true,
      });

      const rsiSignal = result.signals.find((s) => s.name.includes('RSI'));
      if (rsiSignal) {
        expect(rsiSignal.type).toBe('indicator');
        expect(rsiSignal.signal).toMatch(/sell|strong_sell/);
        expect(rsiSignal.reliability).toBeGreaterThan(0);
        expect(rsiSignal.reliability).toBeLessThanOrEqual(100);
        expect(rsiSignal.description).toContain('overbought');
      }
    });

    it('should include signal metadata', async () => {
      const historicalData = createBullishData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData, {
        includeSignals: true,
      });

      if (result.signals.length > 0) {
        const signal = result.signals[0];
        expect(signal.id).toBeDefined();
        expect(signal.id).toContain('AAPL');
        expect(signal.type).toMatch(/indicator|pattern|crossover|divergence|breakout/);
        expect(signal.name).toBeDefined();
        expect(signal.signal).toMatch(/strong_buy|buy|neutral|sell|strong_sell/);
        expect(signal.price).toBeGreaterThan(0);
        expect(signal.timestamp).toBeInstanceOf(Date);
        expect(signal.description).toBeDefined();
        expect(signal.reliability).toBeGreaterThan(0);
        expect(signal.reliability).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Overall Signal Calculation', () => {
    it('should calculate overall score between 0 and 100', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should generate strong_buy signal for strong bullish conditions', async () => {
      const historicalData = createBullishData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      // With strong bullish trend, should get buy or strong_buy
      expect(result.overallSignal).toMatch(/buy|strong_buy/);
      expect(result.overallScore).toBeGreaterThan(50);
    });

    it('should generate strong_sell signal for strong bearish conditions', async () => {
      const historicalData = createBearishData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      // With strong bearish trend, should get sell or strong_sell
      expect(result.overallSignal).toMatch(/sell|strong_sell/);
      expect(result.overallScore).toBeLessThan(50);
    });
  });

  describe('Summary Generation', () => {
    it('should generate human-readable summary', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should include trend information in summary', async () => {
      const historicalData = createBullishData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.summary).toContain('bullish');
    });

    it('should include momentum information in summary', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.summary).toMatch(/momentum/i);
    });

    it('should include volatility information in summary', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.summary).toMatch(/volatility/i);
    });

    it('should include overall signal in summary', async () => {
      const historicalData = createHistoricalData();
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result.summary).toMatch(/signal/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum data length', async () => {
      const historicalData = createHistoricalData(50);
      const result = await service.analyzeTechnical('AAPL', '1d', historicalData);

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
    });

    it('should handle flat price data', async () => {
      const data = [];
      const flatPrice = 100;

      for (let i = 0; i < 200; i++) {
        data.push({
          close: flatPrice,
          high: flatPrice,
          low: flatPrice,
          volume: 1000000,
          timestamp: new Date(Date.now() - (200 - i) * 24 * 60 * 60 * 1000),
        });
      }

      const result = await service.analyzeTechnical('AAPL', '1d', data);

      expect(result).toBeDefined();
      expect(result.trend.shortTerm).toBe('neutral');
      expect(result.trend.mediumTerm).toBe('neutral');
      expect(result.trend.longTerm).toBe('neutral');
    });

    it('should handle zero volume data', async () => {
      const data = [];
      let basePrice = 100;

      for (let i = 0; i < 200; i++) {
        basePrice += (Math.random() - 0.5) * 2;
        data.push({
          close: basePrice,
          high: basePrice + 1,
          low: basePrice - 1,
          volume: 0,
          timestamp: new Date(Date.now() - (200 - i) * 24 * 60 * 60 * 1000),
        });
      }

      const result = await service.analyzeTechnical('AAPL', '1d', data);

      expect(result).toBeDefined();
      expect(result.volume.currentVolume).toBe(0);
      expect(result.volume.avgVolume).toBe(0);
    });

    it('should handle different timeframes', async () => {
      const historicalData = createHistoricalData();
      const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '1d', '1w'];

      for (const timeframe of timeframes) {
        const result = await service.analyzeTechnical('AAPL', timeframe, historicalData);
        expect(result.timeframe).toBe(timeframe);
      }
    });

    it('should handle very high volatility', async () => {
      const data = [];
      let basePrice = 100;

      for (let i = 0; i < 200; i++) {
        basePrice += (Math.random() - 0.5) * 20; // High volatility
        data.push({
          close: basePrice,
          high: basePrice + Math.random() * 10,
          low: basePrice - Math.random() * 10,
          volume: 1000000,
          timestamp: new Date(Date.now() - (200 - i) * 24 * 60 * 60 * 1000),
        });
      }

      const result = await service.analyzeTechnical('AAPL', '1d', data);

      expect(result.volatility.volatilityLevel).toMatch(/high|extreme/);
    });

    it('should handle very low volatility', async () => {
      const data = [];
      let basePrice = 100;

      for (let i = 0; i < 200; i++) {
        basePrice += (Math.random() - 0.5) * 0.1; // Low volatility
        data.push({
          close: basePrice,
          high: basePrice + 0.05,
          low: basePrice - 0.05,
          volume: 1000000,
          timestamp: new Date(Date.now() - (200 - i) * 24 * 60 * 60 * 1000),
        });
      }

      const result = await service.analyzeTechnical('AAPL', '1d', data);

      expect(result.volatility.volatilityLevel).toMatch(/low|normal/);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance from getTechnicalAnalysisService', async () => {
      const { getTechnicalAnalysisService } = await import('../TechnicalAnalysisService');
      const instance1 = getTechnicalAnalysisService();
      const instance2 = getTechnicalAnalysisService();

      expect(instance1).toBe(instance2);
    });
  });
});
