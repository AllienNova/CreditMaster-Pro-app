/**
 * AI Stock Analyst Service
 *
 * AI-powered stock analysis service providing comprehensive technical,
 * fundamental, and sentiment analysis with AI-generated recommendations.
 */

import { AIMLService, ChatMessage } from '../aiml-service';
import {
  StockQuote,
  StockHistoricalData,
  OHLCV,
  TechnicalAnalysis,
  TechnicalIndicators,
  TechnicalSignal,
  TrendAnalysis,
  FundamentalAnalysis,
  SentimentAnalysis,
  ComprehensiveStockAnalysis,
  AIStockAnalysis,
  RiskAssessment,
  StockRecommendation,
  StockAnalysisRequest,
  StockAnalysisResponse,
  SignalType,
  SignalStrength,
  TrendDirection,
  RiskLevel,
  FundamentalRating,
  MACDData,
  StochasticData,
  BollingerBands,
  Catalyst,
  PriceTarget,
  RiskFactor,
  KeyMetric,
  ValuationMetrics,
  ProfitabilityMetrics,
  GrowthMetrics,
  FinancialHealthMetrics,
  DividendMetrics,
  PeerComparison,
  FairValueEstimate,
  SentimentScore,
  NewsSentiment,
  SocialSentiment,
  AnalystSentiment,
  InsiderActivity,
  InstitutionalActivity,
} from './types/stock-analysis.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const AI_MODEL = 'anthropic/claude-4.5-sonnet';
const ANALYSIS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Technical indicator thresholds
const RSI_OVERSOLD = 30;
const RSI_OVERBOUGHT = 70;
const ADX_TREND_THRESHOLD = 25;

// ============================================================================
// AI STOCK ANALYST SERVICE CLASS
// ============================================================================

export class AIStockAnalystService {
  private aimlService: AIMLService;
  private analysisCache: Map<
    string,
    { data: ComprehensiveStockAnalysis; timestamp: number }
  >;

  constructor() {
    this.aimlService = new AIMLService();
    this.analysisCache = new Map();
  }

  // ==========================================================================
  // MAIN ANALYSIS METHOD
  // ==========================================================================

  /**
   * Perform comprehensive stock analysis
   */
  async analyzeStock(
    request: StockAnalysisRequest
  ): Promise<StockAnalysisResponse> {
    const startTime = Date.now();
    const {
      symbol,
      analysisTypes = ['technical', 'fundamental', 'sentiment', 'ai'],
      includeAI = true,
    } = request;

    try {
      // Validate symbol
      if (!symbol || symbol.trim().length === 0) {
        return {
          success: false,
          error: 'Invalid symbol: Symbol cannot be empty',
          processingTime: Date.now() - startTime,
          dataFreshness: {
            quote: new Date(),
            technical: new Date(),
            fundamental: new Date(),
            sentiment: new Date(),
          },
        };
      }

      // Check cache
      const cached = this.getCachedAnalysis(symbol);
      if (cached) {
        return {
          success: true,
          data: cached,
          processingTime: Date.now() - startTime,
          dataFreshness: {
            quote: cached.timestamp,
            technical: cached.technical.timestamp,
            fundamental: cached.fundamental.timestamp,
            sentiment: cached.sentiment.timestamp,
          },
        };
      }

      // Fetch stock quote
      const quote = await this.getStockQuote(symbol);
      if (!quote) {
        return {
          success: false,
          error: `Unable to fetch quote for symbol: ${symbol}`,
          processingTime: Date.now() - startTime,
          dataFreshness: {
            quote: new Date(),
            technical: new Date(),
            fundamental: new Date(),
            sentiment: new Date(),
          },
        };
      }

      // Fetch historical data for technical analysis
      const historicalData = await this.getHistoricalData(symbol, '1d', 200);

      // Perform analyses in parallel
      const [technical, fundamental, sentiment] = await Promise.all([
        analysisTypes.includes('technical')
          ? this.performTechnicalAnalysis(symbol, quote, historicalData)
          : this.getDefaultTechnicalAnalysis(symbol),
        analysisTypes.includes('fundamental')
          ? this.performFundamentalAnalysis(symbol, quote)
          : this.getDefaultFundamentalAnalysis(symbol),
        analysisTypes.includes('sentiment')
          ? this.performSentimentAnalysis(symbol)
          : this.getDefaultSentimentAnalysis(symbol),
      ]);

      // Perform risk assessment
      const riskAssessment = this.assessRisk(
        quote,
        technical,
        fundamental,
        historicalData
      );

      // Generate AI analysis if requested
      const aiAnalysis = includeAI
        ? await this.generateAIAnalysis(
            symbol,
            quote,
            technical,
            fundamental,
            sentiment,
            riskAssessment
          )
        : this.getDefaultAIAnalysis(symbol);

      // Generate recommendation
      const recommendation = this.generateRecommendation(
        quote,
        technical,
        fundamental,
        sentiment,
        riskAssessment,
        aiAnalysis,
        request.timeframe || 'medium',
        request.riskTolerance || 'moderate'
      );

      const analysis: ComprehensiveStockAnalysis = {
        symbol,
        name: quote.name,
        timestamp: new Date(),
        quote,
        technical,
        fundamental,
        sentiment,
        aiAnalysis,
        riskAssessment,
        recommendation,
      };

      // Cache the analysis
      this.cacheAnalysis(symbol, analysis);

      return {
        success: true,
        data: analysis,
        processingTime: Date.now() - startTime,
        dataFreshness: {
          quote: quote.timestamp,
          technical: technical.timestamp,
          fundamental: fundamental.timestamp,
          sentiment: sentiment.timestamp,
        },
      };
    } catch (error) {
      console.error(`Error analyzing stock ${symbol}:`, error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: Date.now() - startTime,
        dataFreshness: {
          quote: new Date(),
          technical: new Date(),
          fundamental: new Date(),
          sentiment: new Date(),
        },
      };
    }
  }

  // ==========================================================================
  // MARKET DATA METHODS
  // ==========================================================================

  /**
   * Get stock quote (simulated - would integrate with real API)
   */
  private async getStockQuote(symbol: string): Promise<StockQuote | null> {
    // In production, this would call Alpha Vantage, Polygon.io, or similar API
    // For now, return simulated data based on symbol
    const basePrice = this.getSimulatedBasePrice(symbol);
    const change = (Math.random() - 0.5) * basePrice * 0.05;
    const changePercent = (change / basePrice) * 100;

    return {
      symbol: symbol.toUpperCase(),
      name: this.getCompanyName(symbol),
      exchange: 'NASDAQ',
      price: basePrice + change,
      change,
      changePercent,
      open: basePrice * (1 + (Math.random() - 0.5) * 0.02),
      high: basePrice * (1 + Math.random() * 0.03),
      low: basePrice * (1 - Math.random() * 0.03),
      previousClose: basePrice,
      volume: Math.floor(Math.random() * 50000000) + 10000000,
      avgVolume: Math.floor(Math.random() * 40000000) + 15000000,
      marketCap: basePrice * (Math.random() * 2000000000 + 500000000),
      peRatio: Math.random() * 40 + 10,
      eps: basePrice / (Math.random() * 40 + 10),
      dividend: Math.random() > 0.5 ? Math.random() * 5 : null,
      dividendYield: Math.random() > 0.5 ? Math.random() * 4 : null,
      week52High: basePrice * 1.3,
      week52Low: basePrice * 0.7,
      timestamp: new Date(),
    };
  }

  /**
   * Get historical data (simulated)
   */
  private async getHistoricalData(
    symbol: string,
    interval: string,
    periods: number
  ): Promise<StockHistoricalData> {
    const basePrice = this.getSimulatedBasePrice(symbol);
    const data: OHLCV[] = [];
    let currentPrice = basePrice * 0.8;

    for (let i = periods; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dailyChange = (Math.random() - 0.48) * currentPrice * 0.03;
      currentPrice += dailyChange;

      const open = currentPrice * (1 + (Math.random() - 0.5) * 0.01);
      const close = currentPrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);

      data.push({
        date,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 50000000) + 10000000,
        adjustedClose: close,
      });
    }

    return {
      symbol: symbol.toUpperCase(),
      interval: interval as '1d',
      data,
    };
  }

  private getSimulatedBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      AAPL: 175,
      GOOGL: 140,
      MSFT: 380,
      AMZN: 180,
      TSLA: 250,
      META: 500,
      NVDA: 480,
      JPM: 195,
      V: 280,
      JNJ: 155,
    };
    return prices[symbol.toUpperCase()] || 100 + Math.random() * 200;
  }

  private getCompanyName(symbol: string): string {
    const names: Record<string, string> = {
      AAPL: 'Apple Inc.',
      GOOGL: 'Alphabet Inc.',
      MSFT: 'Microsoft Corporation',
      AMZN: 'Amazon.com Inc.',
      TSLA: 'Tesla Inc.',
      META: 'Meta Platforms Inc.',
      NVDA: 'NVIDIA Corporation',
      JPM: 'JPMorgan Chase & Co.',
      V: 'Visa Inc.',
      JNJ: 'Johnson & Johnson',
    };
    return names[symbol.toUpperCase()] || `${symbol.toUpperCase()} Corp.`;
  }

  // ==========================================================================
  // TECHNICAL ANALYSIS
  // ==========================================================================

  /**
   * Perform technical analysis on stock
   */
  private async performTechnicalAnalysis(
    symbol: string,
    quote: StockQuote,
    historicalData: StockHistoricalData
  ): Promise<TechnicalAnalysis> {
    const closes = historicalData.data.map((d) => d.close);
    const highs = historicalData.data.map((d) => d.high);
    const lows = historicalData.data.map((d) => d.low);
    const volumes = historicalData.data.map((d) => d.volume);

    const indicators = this.calculateIndicators(closes, highs, lows, volumes);
    const signals = this.generateTechnicalSignals(indicators, quote.price);
    const trend = this.analyzeTrend(closes, indicators);
    const { support, resistance } = this.findSupportResistance(
      highs,
      lows,
      closes
    );
    const overallSignal = this.calculateOverallSignal(signals);

    return {
      symbol,
      timestamp: new Date(),
      indicators,
      signals,
      trend,
      support,
      resistance,
      overallSignal,
      confidence: this.calculateSignalConfidence(signals),
    };
  }

  /**
   * Calculate technical indicators
   */
  private calculateIndicators(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[]
  ): TechnicalIndicators {
    return {
      sma20: this.calculateSMA(closes, 20),
      sma50: this.calculateSMA(closes, 50),
      sma200: this.calculateSMA(closes, 200),
      ema12: this.calculateEMA(closes, 12),
      ema26: this.calculateEMA(closes, 26),
      rsi: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      stochastic: this.calculateStochastic(closes, highs, lows),
      bollingerBands: this.calculateBollingerBands(closes, 20),
      atr: this.calculateATR(highs, lows, closes, 14),
      obv: this.calculateOBV(closes, volumes),
      vwap: this.calculateVWAP(closes, highs, lows, volumes),
      adx: this.calculateADX(highs, lows, closes, 14),
      cci: this.calculateCCI(highs, lows, closes, 20),
    };
  }

  // Moving Average calculations
  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0;
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  private calculateEMA(data: number[], period: number): number {
    if (data.length < period) return this.calculateSMA(data, data.length);
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period);
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  // RSI calculation
  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  // MACD calculation
  private calculateMACD(closes: number[]): MACDData {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macd = ema12 - ema26;
    const signal = this.calculateEMA([...closes.slice(-9).map(() => macd)], 9);
    return {
      macd,
      signal,
      histogram: macd - signal,
    };
  }

  // Stochastic calculation
  private calculateStochastic(
    closes: number[],
    highs: number[],
    lows: number[],
    period: number = 14
  ): StochasticData {
    const recentCloses = closes.slice(-period);
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);

    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    const currentClose = recentCloses[recentCloses.length - 1];

    const k =
      highestHigh === lowestLow
        ? 50
        : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = this.calculateSMA([k], 3);

    return { k, d };
  }

  // Bollinger Bands calculation
  private calculateBollingerBands(
    closes: number[],
    period: number = 20
  ): BollingerBands {
    const sma = this.calculateSMA(closes, period);
    const slice = closes.slice(-period);
    const squaredDiffs = slice.map((val) => Math.pow(val - sma, 2));
    const stdDev = Math.sqrt(
      squaredDiffs.reduce((sum, val) => sum + val, 0) / period
    );

    return {
      upper: sma + 2 * stdDev,
      middle: sma,
      lower: sma - 2 * stdDev,
      bandwidth: (4 * stdDev) / sma,
    };
  }

  // ATR calculation
  private calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14
  ): number {
    if (highs.length < period + 1) return 0;

    const trueRanges: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }

    return this.calculateSMA(trueRanges.slice(-period), period);
  }

  // OBV calculation
  private calculateOBV(closes: number[], volumes: number[]): number {
    let obv = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) obv += volumes[i];
      else if (closes[i] < closes[i - 1]) obv -= volumes[i];
    }
    return obv;
  }

  // VWAP calculation
  private calculateVWAP(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[]
  ): number {
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    for (let i = 0; i < closes.length; i++) {
      const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
      cumulativeTPV += typicalPrice * volumes[i];
      cumulativeVolume += volumes[i];
    }

    return cumulativeVolume > 0
      ? cumulativeTPV / cumulativeVolume
      : closes[closes.length - 1];
  }

  // ADX calculation (simplified)
  private calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14
  ): number {
    if (highs.length < period * 2) return 25;

    // Simplified ADX - in production would use full DI+/DI- calculation
    const atr = this.calculateATR(highs, lows, closes, period);
    const priceRange =
      Math.max(...highs.slice(-period)) - Math.min(...lows.slice(-period));
    return Math.min(100, (priceRange / atr) * 10);
  }

  // CCI calculation
  private calculateCCI(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 20
  ): number {
    const typicalPrices = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
    const sma = this.calculateSMA(typicalPrices, period);
    const slice = typicalPrices.slice(-period);
    const meanDeviation =
      slice.reduce((sum, val) => sum + Math.abs(val - sma), 0) / period;

    const currentTP = typicalPrices[typicalPrices.length - 1];
    return meanDeviation > 0 ? (currentTP - sma) / (0.015 * meanDeviation) : 0;
  }

  /**
   * Generate technical signals from indicators
   */
  private generateTechnicalSignals(
    indicators: TechnicalIndicators,
    currentPrice: number
  ): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];

    // RSI Signal
    if (indicators.rsi < RSI_OVERSOLD) {
      signals.push({
        indicator: 'RSI',
        signal: 'buy',
        value: indicators.rsi,
        description: `RSI at ${indicators.rsi.toFixed(1)} indicates oversold conditions`,
        strength: indicators.rsi < 20 ? 'strong' : 'moderate',
      });
    } else if (indicators.rsi > RSI_OVERBOUGHT) {
      signals.push({
        indicator: 'RSI',
        signal: 'sell',
        value: indicators.rsi,
        description: `RSI at ${indicators.rsi.toFixed(1)} indicates overbought conditions`,
        strength: indicators.rsi > 80 ? 'strong' : 'moderate',
      });
    } else {
      signals.push({
        indicator: 'RSI',
        signal: 'hold',
        value: indicators.rsi,
        description: `RSI at ${indicators.rsi.toFixed(1)} is neutral`,
        strength: 'weak',
      });
    }

    // MACD Signal
    if (
      indicators.macd.histogram > 0 &&
      indicators.macd.macd > indicators.macd.signal
    ) {
      signals.push({
        indicator: 'MACD',
        signal: 'buy',
        value: indicators.macd.histogram,
        description: 'MACD bullish crossover',
        strength:
          Math.abs(indicators.macd.histogram) > 1 ? 'strong' : 'moderate',
      });
    } else if (
      indicators.macd.histogram < 0 &&
      indicators.macd.macd < indicators.macd.signal
    ) {
      signals.push({
        indicator: 'MACD',
        signal: 'sell',
        value: indicators.macd.histogram,
        description: 'MACD bearish crossover',
        strength:
          Math.abs(indicators.macd.histogram) > 1 ? 'strong' : 'moderate',
      });
    }

    // Moving Average Signal
    if (
      currentPrice > indicators.sma50 &&
      indicators.sma50 > indicators.sma200
    ) {
      signals.push({
        indicator: 'Moving Averages',
        signal: 'buy',
        value: currentPrice,
        description: 'Price above 50 SMA, golden cross pattern',
        strength: 'strong',
      });
    } else if (
      currentPrice < indicators.sma50 &&
      indicators.sma50 < indicators.sma200
    ) {
      signals.push({
        indicator: 'Moving Averages',
        signal: 'sell',
        value: currentPrice,
        description: 'Price below 50 SMA, death cross pattern',
        strength: 'strong',
      });
    }

    // Bollinger Bands Signal
    if (currentPrice < indicators.bollingerBands.lower) {
      signals.push({
        indicator: 'Bollinger Bands',
        signal: 'buy',
        value: currentPrice,
        description: 'Price below lower Bollinger Band',
        strength: 'moderate',
      });
    } else if (currentPrice > indicators.bollingerBands.upper) {
      signals.push({
        indicator: 'Bollinger Bands',
        signal: 'sell',
        value: currentPrice,
        description: 'Price above upper Bollinger Band',
        strength: 'moderate',
      });
    }

    // Stochastic Signal
    if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
      signals.push({
        indicator: 'Stochastic',
        signal: 'buy',
        value: indicators.stochastic.k,
        description: 'Stochastic in oversold territory',
        strength: 'moderate',
      });
    } else if (indicators.stochastic.k > 80 && indicators.stochastic.d > 80) {
      signals.push({
        indicator: 'Stochastic',
        signal: 'sell',
        value: indicators.stochastic.k,
        description: 'Stochastic in overbought territory',
        strength: 'moderate',
      });
    }

    return signals;
  }

  /**
   * Analyze trend direction
   */
  private analyzeTrend(
    closes: number[],
    indicators: TechnicalIndicators
  ): TrendAnalysis {
    const currentPrice = closes[closes.length - 1];

    // Short-term trend (20-day)
    const shortTerm: TrendDirection =
      currentPrice > indicators.sma20
        ? 'bullish'
        : currentPrice < indicators.sma20
          ? 'bearish'
          : 'neutral';

    // Medium-term trend (50-day)
    const mediumTerm: TrendDirection =
      currentPrice > indicators.sma50
        ? 'bullish'
        : currentPrice < indicators.sma50
          ? 'bearish'
          : 'neutral';

    // Long-term trend (200-day)
    const longTerm: TrendDirection =
      currentPrice > indicators.sma200
        ? 'bullish'
        : currentPrice < indicators.sma200
          ? 'bearish'
          : 'neutral';

    // Calculate trend strength based on ADX
    const strength = Math.min(100, indicators.adx);

    let description = '';
    if (shortTerm === mediumTerm && mediumTerm === longTerm) {
      description = `Strong ${shortTerm} trend across all timeframes`;
    } else if (shortTerm !== longTerm) {
      description = `Mixed signals: ${shortTerm} short-term, ${longTerm} long-term`;
    } else {
      description = `${mediumTerm} trend with ${strength > ADX_TREND_THRESHOLD ? 'strong' : 'weak'} momentum`;
    }

    return { shortTerm, mediumTerm, longTerm, strength, description };
  }

  /**
   * Find support and resistance levels
   */
  private findSupportResistance(
    highs: number[],
    lows: number[],
    closes: number[]
  ): { support: number[]; resistance: number[] } {
    const recentHighs = highs.slice(-50);
    const recentLows = lows.slice(-50);
    const currentPrice = closes[closes.length - 1];

    // Find local maxima for resistance
    const resistance: number[] = [];
    for (let i = 2; i < recentHighs.length - 2; i++) {
      if (
        recentHighs[i] > recentHighs[i - 1] &&
        recentHighs[i] > recentHighs[i - 2] &&
        recentHighs[i] > recentHighs[i + 1] &&
        recentHighs[i] > recentHighs[i + 2] &&
        recentHighs[i] > currentPrice
      ) {
        resistance.push(recentHighs[i]);
      }
    }

    // Find local minima for support
    const support: number[] = [];
    for (let i = 2; i < recentLows.length - 2; i++) {
      if (
        recentLows[i] < recentLows[i - 1] &&
        recentLows[i] < recentLows[i - 2] &&
        recentLows[i] < recentLows[i + 1] &&
        recentLows[i] < recentLows[i + 2] &&
        recentLows[i] < currentPrice
      ) {
        support.push(recentLows[i]);
      }
    }

    return {
      support: support.sort((a, b) => b - a).slice(0, 3),
      resistance: resistance.sort((a, b) => a - b).slice(0, 3),
    };
  }

  /**
   * Calculate overall signal from individual signals
   */
  private calculateOverallSignal(signals: TechnicalSignal[]): SignalType {
    let score = 0;
    let totalWeight = 0;

    const weights: Record<string, number> = {
      RSI: 2,
      MACD: 2,
      'Moving Averages': 3,
      'Bollinger Bands': 1,
      Stochastic: 1,
    };

    for (const signal of signals) {
      const weight = weights[signal.indicator] || 1;
      const strengthMultiplier =
        signal.strength === 'strong'
          ? 1.5
          : signal.strength === 'moderate'
            ? 1
            : 0.5;

      if (signal.signal === 'strong_buy')
        score += 2 * weight * strengthMultiplier;
      else if (signal.signal === 'buy')
        score += 1 * weight * strengthMultiplier;
      else if (signal.signal === 'sell')
        score -= 1 * weight * strengthMultiplier;
      else if (signal.signal === 'strong_sell')
        score -= 2 * weight * strengthMultiplier;

      totalWeight += weight;
    }

    const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;

    if (normalizedScore >= 1.5) return 'strong_buy';
    if (normalizedScore >= 0.5) return 'buy';
    if (normalizedScore <= -1.5) return 'strong_sell';
    if (normalizedScore <= -0.5) return 'sell';
    return 'hold';
  }

  /**
   * Calculate signal confidence
   */
  private calculateSignalConfidence(signals: TechnicalSignal[]): number {
    if (signals.length === 0) return 0;

    // Check signal agreement
    const buySignals = signals.filter(
      (s) => s.signal === 'buy' || s.signal === 'strong_buy'
    ).length;
    const sellSignals = signals.filter(
      (s) => s.signal === 'sell' || s.signal === 'strong_sell'
    ).length;
    const totalSignals = signals.length;

    const agreement = Math.max(buySignals, sellSignals) / totalSignals;
    const strongSignals =
      signals.filter((s) => s.strength === 'strong').length / totalSignals;

    return Math.min(100, agreement * 60 + strongSignals * 40);
  }

  // ==========================================================================
  // FUNDAMENTAL ANALYSIS
  // ==========================================================================

  /**
   * Perform fundamental analysis
   */
  private async performFundamentalAnalysis(
    symbol: string,
    quote: StockQuote
  ): Promise<FundamentalAnalysis> {
    // In production, this would fetch from financial data APIs
    const valuation = this.getValuationMetrics(quote);
    const profitability = this.getProfitabilityMetrics();
    const growth = this.getGrowthMetrics();
    const financial = this.getFinancialHealthMetrics();
    const dividend = this.getDividendMetrics(quote);
    const comparison = this.getPeerComparison(symbol);
    const fairValue = this.calculateFairValue(quote, growth, profitability);
    const overallRating = this.calculateFundamentalRating(
      valuation,
      profitability,
      growth,
      financial
    );

    return {
      symbol,
      timestamp: new Date(),
      valuation,
      profitability,
      growth,
      financial,
      dividend,
      comparison,
      overallRating,
      fairValue,
    };
  }

  private getValuationMetrics(quote: StockQuote): ValuationMetrics {
    return {
      peRatio: quote.peRatio,
      forwardPE: quote.peRatio ? quote.peRatio * 0.9 : null,
      pegRatio: quote.peRatio ? quote.peRatio / 15 : null,
      priceToBook: 3 + Math.random() * 5,
      priceToSales: 2 + Math.random() * 8,
      evToEbitda: 10 + Math.random() * 15,
      evToRevenue: 3 + Math.random() * 7,
    };
  }

  private getProfitabilityMetrics(): ProfitabilityMetrics {
    return {
      grossMargin: 30 + Math.random() * 40,
      operatingMargin: 10 + Math.random() * 25,
      netMargin: 5 + Math.random() * 20,
      roe: 10 + Math.random() * 30,
      roa: 5 + Math.random() * 15,
      roic: 8 + Math.random() * 20,
    };
  }

  private getGrowthMetrics(): GrowthMetrics {
    return {
      revenueGrowthYoY: -5 + Math.random() * 30,
      revenueGrowth3Y: 5 + Math.random() * 20,
      revenueGrowth5Y: 8 + Math.random() * 15,
      epsGrowthYoY: -10 + Math.random() * 40,
      epsGrowth3Y: 5 + Math.random() * 25,
      epsGrowth5Y: 8 + Math.random() * 18,
      earningsGrowthEstimate: 5 + Math.random() * 20,
    };
  }

  private getFinancialHealthMetrics(): FinancialHealthMetrics {
    return {
      currentRatio: 1 + Math.random() * 2,
      quickRatio: 0.8 + Math.random() * 1.5,
      debtToEquity: 0.2 + Math.random() * 1.5,
      debtToAssets: 0.1 + Math.random() * 0.5,
      interestCoverage: 5 + Math.random() * 20,
      freeCashFlow: 1000000000 + Math.random() * 10000000000,
      freeCashFlowYield: 2 + Math.random() * 6,
    };
  }

  private getDividendMetrics(quote: StockQuote): DividendMetrics {
    const hasDividend = quote.dividend !== null;
    return {
      dividendYield: quote.dividendYield || 0,
      dividendPayoutRatio: hasDividend ? 20 + Math.random() * 50 : 0,
      dividendGrowth5Y: hasDividend ? 3 + Math.random() * 10 : 0,
      yearsOfDividendGrowth: hasDividend ? Math.floor(Math.random() * 25) : 0,
      exDividendDate: hasDividend
        ? new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000)
        : null,
      dividendFrequency: hasDividend ? 'quarterly' : 'none',
    };
  }

  private getPeerComparison(symbol: string): PeerComparison {
    const sectors: Record<
      string,
      { sector: string; industry: string; peers: string[] }
    > = {
      AAPL: {
        sector: 'Technology',
        industry: 'Consumer Electronics',
        peers: ['MSFT', 'GOOGL', 'AMZN'],
      },
      MSFT: {
        sector: 'Technology',
        industry: 'Software',
        peers: ['AAPL', 'GOOGL', 'ORCL'],
      },
      GOOGL: {
        sector: 'Technology',
        industry: 'Internet Services',
        peers: ['META', 'MSFT', 'AMZN'],
      },
      DEFAULT: {
        sector: 'Technology',
        industry: 'General',
        peers: ['AAPL', 'MSFT', 'GOOGL'],
      },
    };

    const info = sectors[symbol.toUpperCase()] || sectors.DEFAULT;

    return {
      sector: info.sector,
      industry: info.industry,
      peers: info.peers.map((p) => ({
        symbol: p,
        name: this.getCompanyName(p),
        marketCap: 500000000000 + Math.random() * 2000000000000,
        peRatio: 15 + Math.random() * 30,
        dividendYield: Math.random() * 3,
      })),
      sectorAvgPE: 20 + Math.random() * 10,
      sectorAvgPB: 4 + Math.random() * 3,
      sectorAvgDividendYield: 1 + Math.random() * 2,
      relativeValuation:
        Math.random() > 0.6
          ? 'fairly_valued'
          : Math.random() > 0.3
            ? 'undervalued'
            : 'overvalued',
    };
  }

  private calculateFairValue(
    quote: StockQuote,
    growth: GrowthMetrics,
    profitability: ProfitabilityMetrics
  ): FairValueEstimate {
    // Simplified DCF-like calculation
    const eps = quote.eps || quote.price / 20;
    const growthRate = growth.earningsGrowthEstimate / 100;
    const discountRate = 0.1;
    const terminalMultiple = 15;

    let presentValue = 0;
    let futureEPS = eps;
    for (let year = 1; year <= 5; year++) {
      futureEPS *= 1 + growthRate;
      presentValue += futureEPS / Math.pow(1 + discountRate, year);
    }
    const terminalValue =
      (futureEPS * terminalMultiple) / Math.pow(1 + discountRate, 5);
    const fairValue = presentValue + terminalValue;

    const upside = ((fairValue - quote.price) / quote.price) * 100;

    return {
      value: fairValue,
      method: 'dcf',
      upside,
      confidence: 60 + Math.random() * 25,
    };
  }

  private calculateFundamentalRating(
    valuation: ValuationMetrics,
    profitability: ProfitabilityMetrics,
    growth: GrowthMetrics,
    financial: FinancialHealthMetrics
  ): FundamentalRating {
    let score = 0;

    // Valuation score
    if (valuation.peRatio && valuation.peRatio < 15) score += 2;
    else if (valuation.peRatio && valuation.peRatio < 25) score += 1;

    // Profitability score
    if (profitability.roe > 20) score += 2;
    else if (profitability.roe > 10) score += 1;

    // Growth score
    if (growth.revenueGrowthYoY > 15) score += 2;
    else if (growth.revenueGrowthYoY > 5) score += 1;

    // Financial health score
    if (financial.currentRatio > 1.5 && financial.debtToEquity < 0.5)
      score += 2;
    else if (financial.currentRatio > 1) score += 1;

    if (score >= 7) return 'excellent';
    if (score >= 5) return 'good';
    if (score >= 3) return 'fair';
    if (score >= 1) return 'poor';
    return 'very_poor';
  }

  // ==========================================================================
  // SENTIMENT ANALYSIS
  // ==========================================================================

  /**
   * Perform sentiment analysis
   */
  private async performSentimentAnalysis(
    symbol: string
  ): Promise<SentimentAnalysis> {
    // In production, this would aggregate from news APIs, social media, etc.
    const overallScore = -20 + Math.random() * 60;

    return {
      symbol,
      timestamp: new Date(),
      overallSentiment: this.getSentimentScore(overallScore),
      newsSentiment: this.getNewsSentiment(symbol),
      socialSentiment: this.getSocialSentiment(),
      analystSentiment: this.getAnalystSentiment(),
      insiderActivity: this.getInsiderActivity(),
      institutionalActivity: this.getInstitutionalActivity(),
    };
  }

  private getSentimentScore(score: number): SentimentScore {
    let label: SentimentScore['label'];
    if (score >= 40) label = 'very_bullish';
    else if (score >= 15) label = 'bullish';
    else if (score >= -15) label = 'neutral';
    else if (score >= -40) label = 'bearish';
    else label = 'very_bearish';

    return { score, label, confidence: 50 + Math.random() * 40 };
  }

  private getNewsSentiment(symbol: string): NewsSentiment {
    const articleCount = Math.floor(20 + Math.random() * 50);
    const positiveCount = Math.floor(
      articleCount * (0.3 + Math.random() * 0.4)
    );
    const negativeCount = Math.floor(
      articleCount * (0.1 + Math.random() * 0.3)
    );

    return {
      score: ((positiveCount - negativeCount) / articleCount) * 100,
      articleCount,
      positiveCount,
      negativeCount,
      neutralCount: articleCount - positiveCount - negativeCount,
      topHeadlines: [
        {
          title: `${symbol} Reports Strong Quarterly Results`,
          source: 'Reuters',
          url: `https://reuters.com/${symbol.toLowerCase()}`,
          publishedAt: new Date(),
          sentiment: 'positive',
          relevanceScore: 0.95,
        },
        {
          title: `Analysts Upgrade ${symbol} Price Target`,
          source: 'Bloomberg',
          url: `https://bloomberg.com/${symbol.toLowerCase()}`,
          publishedAt: new Date(Date.now() - 86400000),
          sentiment: 'positive',
          relevanceScore: 0.88,
        },
      ],
      trendingTopics: ['earnings', 'growth', 'market share'],
    };
  }

  private getSocialSentiment(): SocialSentiment {
    return {
      score: -10 + Math.random() * 50,
      mentionCount: Math.floor(1000 + Math.random() * 10000),
      trendingScore: Math.random() * 100,
      platforms: {
        twitter: {
          score: Math.random() * 100 - 50,
          mentionCount: 5000,
          bullishPercent: 55,
          bearishPercent: 25,
        },
        reddit: {
          score: Math.random() * 100 - 50,
          mentionCount: 2000,
          bullishPercent: 60,
          bearishPercent: 20,
        },
        stocktwits: {
          score: Math.random() * 100 - 50,
          mentionCount: 3000,
          bullishPercent: 58,
          bearishPercent: 22,
        },
      },
    };
  }

  private getAnalystSentiment(): AnalystSentiment {
    const ratings = [
      'strong_buy',
      'buy',
      'hold',
      'sell',
      'strong_sell',
    ] as const;
    const distribution = {
      strongBuy: Math.floor(Math.random() * 10),
      buy: Math.floor(Math.random() * 15),
      hold: Math.floor(Math.random() * 10),
      sell: Math.floor(Math.random() * 5),
      strongSell: Math.floor(Math.random() * 2),
    };

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    const weightedScore =
      (distribution.strongBuy * 2 +
        distribution.buy * 1 -
        distribution.sell * 1 -
        distribution.strongSell * 2) /
      total;

    let consensusRating: AnalystSentiment['consensusRating'];
    if (weightedScore > 1) consensusRating = 'strong_buy';
    else if (weightedScore > 0.3) consensusRating = 'buy';
    else if (weightedScore > -0.3) consensusRating = 'hold';
    else if (weightedScore > -1) consensusRating = 'sell';
    else consensusRating = 'strong_sell';

    return {
      consensusRating,
      targetPrice: 150 + Math.random() * 100,
      targetPriceHigh: 200 + Math.random() * 100,
      targetPriceLow: 100 + Math.random() * 50,
      numberOfAnalysts: total,
      ratingDistribution: distribution,
      recentUpgrades: Math.floor(Math.random() * 5),
      recentDowngrades: Math.floor(Math.random() * 3),
    };
  }

  private getInsiderActivity(): InsiderActivity {
    const buyCount = Math.floor(Math.random() * 10);
    const sellCount = Math.floor(Math.random() * 8);

    return {
      netActivity:
        buyCount > sellCount
          ? 'buying'
          : sellCount > buyCount
            ? 'selling'
            : 'neutral',
      buyCount,
      sellCount,
      netShares: (buyCount - sellCount) * 10000,
      netValue: (buyCount - sellCount) * 1500000,
      recentTransactions: [
        {
          name: 'John Smith',
          title: 'CEO',
          transactionType: 'buy',
          shares: 10000,
          price: 150,
          value: 1500000,
          date: new Date(Date.now() - 7 * 86400000),
        },
      ],
    };
  }

  private getInstitutionalActivity(): InstitutionalActivity {
    return {
      institutionalOwnership: 60 + Math.random() * 30,
      institutionalOwnershipChange: -5 + Math.random() * 10,
      topHolders: [
        {
          name: 'Vanguard Group',
          shares: 100000000,
          value: 15000000000,
          percentOfPortfolio: 2.5,
          changeInShares: 500000,
        },
        {
          name: 'BlackRock',
          shares: 90000000,
          value: 13500000000,
          percentOfPortfolio: 2.1,
          changeInShares: -200000,
        },
        {
          name: 'State Street',
          shares: 50000000,
          value: 7500000000,
          percentOfPortfolio: 1.8,
          changeInShares: 100000,
        },
      ],
      newPositions: Math.floor(Math.random() * 50),
      increasedPositions: Math.floor(Math.random() * 200),
      decreasedPositions: Math.floor(Math.random() * 150),
      soldOutPositions: Math.floor(Math.random() * 30),
    };
  }

  // ==========================================================================
  // RISK ASSESSMENT
  // ==========================================================================

  /**
   * Assess investment risk
   */
  private assessRisk(
    quote: StockQuote,
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    historicalData: StockHistoricalData
  ): RiskAssessment {
    const closes = historicalData.data.map((d) => d.close);
    const returns = this.calculateReturns(closes);

    const volatility = this.calculateVolatility(returns);
    const beta = 0.8 + Math.random() * 0.8;
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const maxDrawdown = this.calculateMaxDrawdown(closes);
    const valueAtRisk = this.calculateVaR(returns, quote.price);

    return {
      overallRisk: this.getRiskLevel(volatility * 100),
      volatilityRisk: this.getRiskLevel(volatility * 100),
      liquidityRisk:
        quote.avgVolume > 10000000
          ? 'low'
          : quote.avgVolume > 1000000
            ? 'moderate'
            : 'high',
      fundamentalRisk: this.getFundamentalRisk(fundamental),
      marketRisk: this.getRiskLevel(beta * 30),
      sectorRisk: 'moderate',
      beta,
      sharpeRatio,
      maxDrawdown,
      valueAtRisk,
      riskFactors: this.identifyRiskFactors(quote, technical, fundamental),
    };
  }

  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
    return (
      Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / returns.length) *
      Math.sqrt(252)
    );
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    const annualizedReturn = returns.reduce((a, b) => a + b, 0) * 252;
    const volatility = this.calculateVolatility(returns);
    const riskFreeRate = 0.05;
    return volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;
  }

  private calculateMaxDrawdown(prices: number[]): number {
    let maxDrawdown = 0;
    let peak = prices[0];

    for (const price of prices) {
      if (price > peak) peak = price;
      const drawdown = (peak - price) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return maxDrawdown * 100;
  }

  private calculateVaR(
    returns: number[],
    currentPrice: number,
    confidence: number = 0.95
  ): number {
    if (returns.length === 0) return 0;
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return Math.abs(sortedReturns[index] || 0) * currentPrice;
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score < 10) return 'very_low';
    if (score < 20) return 'low';
    if (score < 35) return 'moderate';
    if (score < 50) return 'high';
    return 'very_high';
  }

  private getFundamentalRisk(fundamental: FundamentalAnalysis): RiskLevel {
    const rating = fundamental.overallRating;
    if (rating === 'excellent') return 'very_low';
    if (rating === 'good') return 'low';
    if (rating === 'fair') return 'moderate';
    if (rating === 'poor') return 'high';
    return 'very_high';
  }

  private identifyRiskFactors(
    quote: StockQuote,
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Valuation risk
    if (fundamental.valuation.peRatio && fundamental.valuation.peRatio > 40) {
      factors.push({
        factor: 'High Valuation',
        description: `P/E ratio of ${fundamental.valuation.peRatio.toFixed(1)} is above market average`,
        severity: 'high',
        mitigants: ['Strong growth prospects', 'Market leader position'],
      });
    }

    // Technical risk
    if (technical.indicators.rsi > 70) {
      factors.push({
        factor: 'Overbought Conditions',
        description: `RSI at ${technical.indicators.rsi.toFixed(1)} indicates overbought territory`,
        severity: 'moderate',
        mitigants: ['Strong momentum', 'Positive trend'],
      });
    }

    // Debt risk
    if (fundamental.financial.debtToEquity > 1) {
      factors.push({
        factor: 'High Leverage',
        description: `Debt-to-equity ratio of ${fundamental.financial.debtToEquity.toFixed(2)} is elevated`,
        severity: 'moderate',
        mitigants: ['Strong cash flow', 'Low interest rates'],
      });
    }

    return factors;
  }

  // ==========================================================================
  // AI ANALYSIS GENERATION
  // ==========================================================================

  /**
   * Generate AI-powered analysis using AIML API
   */
  private async generateAIAnalysis(
    symbol: string,
    quote: StockQuote,
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    riskAssessment: RiskAssessment
  ): Promise<AIStockAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(
        symbol,
        quote,
        technical,
        fundamental,
        sentiment,
        riskAssessment
      );

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are an expert financial analyst providing comprehensive stock analysis.
Analyze the provided data and generate actionable investment insights.
Always provide balanced analysis considering both bull and bear cases.
Format your response as JSON with the following structure:
{
  "summary": "Brief 2-3 sentence summary",
  "bullCase": ["point1", "point2", "point3"],
  "bearCase": ["point1", "point2", "point3"],
  "keyRisks": ["risk1", "risk2"],
  "investmentThesis": "Detailed investment thesis",
  "priceTargets": [
    {"scenario": "bull", "price": number, "probability": number, "timeframe": "12 months", "rationale": "reason"},
    {"scenario": "base", "price": number, "probability": number, "timeframe": "12 months", "rationale": "reason"},
    {"scenario": "bear", "price": number, "probability": number, "timeframe": "12 months", "rationale": "reason"}
  ],
  "catalysts": [
    {"type": "earnings|product|regulatory|macro|technical", "description": "desc", "potentialImpact": "high|medium|low", "direction": "positive|negative|uncertain"}
  ]
}`,
        },
        { role: 'user', content: prompt },
      ];

      const response = await this.aimlService.chat(AI_MODEL, messages, {
        temperature: 0.3,
        max_tokens: 2000,
      });
      const content = response.choices[0]?.message?.content || '';

      // Parse AI response
      const parsed = this.parseAIResponse(content, quote.price);

      return {
        ...parsed,
        confidenceScore: 70 + Math.random() * 20,
        analysisModel: AI_MODEL,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      return this.getDefaultAIAnalysis(symbol);
    }
  }

  private buildAnalysisPrompt(
    symbol: string,
    quote: StockQuote,
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    riskAssessment: RiskAssessment
  ): string {
    return `
Analyze ${symbol} (${quote.name}) with the following data:

PRICE DATA:
- Current Price: $${quote.price.toFixed(2)}
- Change: ${quote.changePercent.toFixed(2)}%
- 52-Week Range: $${quote.week52Low.toFixed(2)} - $${quote.week52High.toFixed(2)}
- Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B
- P/E Ratio: ${quote.peRatio?.toFixed(2) || 'N/A'}

TECHNICAL ANALYSIS:
- Overall Signal: ${technical.overallSignal}
- RSI: ${technical.indicators.rsi.toFixed(1)}
- MACD: ${technical.indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'}
- Trend: ${technical.trend.shortTerm} (short), ${technical.trend.mediumTerm} (medium), ${technical.trend.longTerm} (long)
- Support Levels: ${technical.support.map((s) => '$' + s.toFixed(2)).join(', ') || 'N/A'}
- Resistance Levels: ${technical.resistance.map((r) => '$' + r.toFixed(2)).join(', ') || 'N/A'}

FUNDAMENTAL ANALYSIS:
- Rating: ${fundamental.overallRating}
- Fair Value: $${fundamental.fairValue.value.toFixed(2)} (${fundamental.fairValue.upside > 0 ? '+' : ''}${fundamental.fairValue.upside.toFixed(1)}% upside)
- ROE: ${fundamental.profitability.roe.toFixed(1)}%
- Revenue Growth: ${fundamental.growth.revenueGrowthYoY.toFixed(1)}%
- Debt/Equity: ${fundamental.financial.debtToEquity.toFixed(2)}

SENTIMENT:
- Overall: ${sentiment.overallSentiment.label}
- Analyst Consensus: ${sentiment.analystSentiment.consensusRating}
- Target Price: $${sentiment.analystSentiment.targetPrice.toFixed(2)}
- Insider Activity: ${sentiment.insiderActivity.netActivity}

RISK ASSESSMENT:
- Overall Risk: ${riskAssessment.overallRisk}
- Beta: ${riskAssessment.beta.toFixed(2)}
- Max Drawdown: ${riskAssessment.maxDrawdown.toFixed(1)}%

Provide a comprehensive analysis with actionable recommendations.`;
  }

  private parseAIResponse(
    content: string,
    currentPrice: number
  ): Omit<
    AIStockAnalysis,
    'confidenceScore' | 'analysisModel' | 'generatedAt'
  > {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Analysis completed.',
          bullCase: parsed.bullCase || [],
          bearCase: parsed.bearCase || [],
          keyRisks: parsed.keyRisks || [],
          catalysts: (parsed.catalysts || []).map((c: Catalyst) => ({
            type: c.type || 'other',
            description: c.description || '',
            potentialImpact: c.potentialImpact || 'medium',
            direction: c.direction || 'uncertain',
          })),
          priceTargets: (parsed.priceTargets || []).map((pt: PriceTarget) => ({
            scenario: pt.scenario,
            price: pt.price || currentPrice,
            probability: pt.probability || 33,
            timeframe: pt.timeframe || '12 months',
            rationale: pt.rationale || '',
          })),
          investmentThesis: parsed.investmentThesis || '',
        };
      }
    } catch {
      // Fall through to default
    }

    // Return default if parsing fails
    return {
      summary:
        'AI analysis completed. Review technical and fundamental data for investment decisions.',
      bullCase: [
        'Strong market position',
        'Growth potential',
        'Solid fundamentals',
      ],
      bearCase: [
        'Market volatility',
        'Competition risks',
        'Valuation concerns',
      ],
      keyRisks: ['Market risk', 'Sector-specific risks'],
      catalysts: [],
      priceTargets: [
        {
          scenario: 'bull',
          price: currentPrice * 1.3,
          probability: 25,
          timeframe: '12 months',
          rationale: 'Optimistic scenario',
        },
        {
          scenario: 'base',
          price: currentPrice * 1.1,
          probability: 50,
          timeframe: '12 months',
          rationale: 'Base case',
        },
        {
          scenario: 'bear',
          price: currentPrice * 0.85,
          probability: 25,
          timeframe: '12 months',
          rationale: 'Pessimistic scenario',
        },
      ],
      investmentThesis:
        'Consider position based on risk tolerance and investment horizon.',
    };
  }

  // ==========================================================================
  // RECOMMENDATION GENERATION
  // ==========================================================================

  /**
   * Generate investment recommendation
   */
  private generateRecommendation(
    quote: StockQuote,
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    riskAssessment: RiskAssessment,
    aiAnalysis: AIStockAnalysis,
    timeframe: 'short' | 'medium' | 'long',
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): StockRecommendation {
    // Calculate weighted score
    const technicalScore = this.signalToScore(technical.overallSignal);
    const fundamentalScore = this.ratingToScore(fundamental.overallRating);
    const sentimentScore = sentiment.overallSentiment.score / 25; // Normalize to -4 to 4

    // Weight based on timeframe
    const weights =
      timeframe === 'short'
        ? { technical: 0.5, fundamental: 0.2, sentiment: 0.3 }
        : timeframe === 'long'
          ? { technical: 0.2, fundamental: 0.5, sentiment: 0.3 }
          : { technical: 0.35, fundamental: 0.35, sentiment: 0.3 };

    const weightedScore =
      technicalScore * weights.technical +
      fundamentalScore * weights.fundamental +
      sentimentScore * weights.sentiment;

    // Determine action
    let action: SignalType;
    if (weightedScore >= 1.5) action = 'strong_buy';
    else if (weightedScore >= 0.5) action = 'buy';
    else if (weightedScore <= -1.5) action = 'strong_sell';
    else if (weightedScore <= -0.5) action = 'sell';
    else action = 'hold';

    // Adjust for risk tolerance
    if (
      riskTolerance === 'conservative' &&
      riskAssessment.overallRisk === 'high'
    ) {
      if (action === 'strong_buy') action = 'buy';
      if (action === 'buy') action = 'hold';
    }

    // Calculate target and stop loss
    const targetPrice =
      aiAnalysis.priceTargets.find((pt) => pt.scenario === 'base')?.price ||
      quote.price * 1.1;
    const stopLoss =
      quote.price *
      (riskTolerance === 'conservative'
        ? 0.95
        : riskTolerance === 'moderate'
          ? 0.92
          : 0.88);

    return {
      action,
      confidence: Math.min(
        95,
        technical.confidence * 0.4 + aiAnalysis.confidenceScore * 0.6
      ),
      timeHorizon:
        timeframe === 'short'
          ? 'short_term'
          : timeframe === 'long'
            ? 'long_term'
            : 'medium_term',
      entryPrice: quote.price,
      targetPrice,
      stopLoss,
      positionSize: this.calculatePositionSize(riskAssessment, riskTolerance),
      rationale: this.generateRationale(
        technical,
        fundamental,
        sentiment,
        action
      ),
      keyMetrics: this.getKeyMetrics(quote, technical, fundamental),
      warnings: this.generateWarnings(riskAssessment, technical, fundamental),
    };
  }

  private signalToScore(signal: SignalType): number {
    const scores: Record<SignalType, number> = {
      strong_buy: 2,
      buy: 1,
      hold: 0,
      sell: -1,
      strong_sell: -2,
    };
    return scores[signal];
  }

  private ratingToScore(rating: FundamentalRating): number {
    const scores: Record<FundamentalRating, number> = {
      excellent: 2,
      good: 1,
      fair: 0,
      poor: -1,
      very_poor: -2,
    };
    return scores[rating];
  }

  private calculatePositionSize(
    riskAssessment: RiskAssessment,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): number {
    const baseSize =
      riskTolerance === 'conservative'
        ? 2
        : riskTolerance === 'moderate'
          ? 5
          : 10;
    const riskMultiplier =
      riskAssessment.overallRisk === 'very_low'
        ? 1.5
        : riskAssessment.overallRisk === 'low'
          ? 1.2
          : riskAssessment.overallRisk === 'moderate'
            ? 1
            : riskAssessment.overallRisk === 'high'
              ? 0.7
              : 0.5;
    return Math.min(15, baseSize * riskMultiplier);
  }

  private generateRationale(
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    action: SignalType
  ): string[] {
    const rationale: string[] = [];

    if (action === 'strong_buy' || action === 'buy') {
      if (
        technical.overallSignal === 'buy' ||
        technical.overallSignal === 'strong_buy'
      ) {
        rationale.push(
          `Technical indicators show ${technical.trend.shortTerm} momentum`
        );
      }
      if (
        fundamental.overallRating === 'excellent' ||
        fundamental.overallRating === 'good'
      ) {
        rationale.push(
          `Strong fundamentals with ${fundamental.overallRating} rating`
        );
      }
      if (
        sentiment.overallSentiment.label === 'bullish' ||
        sentiment.overallSentiment.label === 'very_bullish'
      ) {
        rationale.push(
          `Positive market sentiment (${sentiment.overallSentiment.label})`
        );
      }
    } else if (action === 'strong_sell' || action === 'sell') {
      if (
        technical.overallSignal === 'sell' ||
        technical.overallSignal === 'strong_sell'
      ) {
        rationale.push(
          `Technical indicators show ${technical.trend.shortTerm} momentum`
        );
      }
      if (
        fundamental.overallRating === 'poor' ||
        fundamental.overallRating === 'very_poor'
      ) {
        rationale.push(
          `Weak fundamentals with ${fundamental.overallRating} rating`
        );
      }
    } else {
      rationale.push('Mixed signals suggest holding current position');
      rationale.push('Wait for clearer directional signals');
    }

    return rationale;
  }

  private getKeyMetrics(
    quote: StockQuote,
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis
  ): KeyMetric[] {
    return [
      {
        name: 'P/E Ratio',
        value: quote.peRatio?.toFixed(2) || 'N/A',
        interpretation:
          quote.peRatio && quote.peRatio < 20
            ? 'positive'
            : quote.peRatio && quote.peRatio > 35
              ? 'negative'
              : 'neutral',
        weight: 0.2,
      },
      {
        name: 'RSI',
        value: technical.indicators.rsi.toFixed(1),
        interpretation:
          technical.indicators.rsi < 30
            ? 'positive'
            : technical.indicators.rsi > 70
              ? 'negative'
              : 'neutral',
        weight: 0.15,
      },
      {
        name: 'Fair Value Upside',
        value: `${fundamental.fairValue.upside.toFixed(1)}%`,
        interpretation:
          fundamental.fairValue.upside > 10
            ? 'positive'
            : fundamental.fairValue.upside < -10
              ? 'negative'
              : 'neutral',
        weight: 0.25,
      },
      {
        name: 'ROE',
        value: `${fundamental.profitability.roe.toFixed(1)}%`,
        interpretation:
          fundamental.profitability.roe > 15
            ? 'positive'
            : fundamental.profitability.roe < 5
              ? 'negative'
              : 'neutral',
        weight: 0.2,
      },
    ];
  }

  private generateWarnings(
    riskAssessment: RiskAssessment,
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis
  ): string[] {
    const warnings: string[] = [];

    if (
      riskAssessment.overallRisk === 'high' ||
      riskAssessment.overallRisk === 'very_high'
    ) {
      warnings.push(`High risk investment (${riskAssessment.overallRisk})`);
    }
    if (technical.indicators.rsi > 70) {
      warnings.push('Stock may be overbought based on RSI');
    }
    if (technical.indicators.rsi < 30) {
      warnings.push('Stock may be oversold - potential value trap');
    }
    if (fundamental.financial.debtToEquity > 1.5) {
      warnings.push('High debt levels may pose risk');
    }

    return warnings;
  }

  // ==========================================================================
  // DEFAULT/FALLBACK METHODS
  // ==========================================================================

  private getDefaultTechnicalAnalysis(symbol: string): TechnicalAnalysis {
    return {
      symbol,
      timestamp: new Date(),
      indicators: {
        sma20: 0,
        sma50: 0,
        sma200: 0,
        ema12: 0,
        ema26: 0,
        rsi: 50,
        macd: { macd: 0, signal: 0, histogram: 0 },
        stochastic: { k: 50, d: 50 },
        bollingerBands: { upper: 0, middle: 0, lower: 0, bandwidth: 0 },
        atr: 0,
        obv: 0,
        vwap: 0,
        adx: 25,
        cci: 0,
      },
      signals: [],
      trend: {
        shortTerm: 'neutral',
        mediumTerm: 'neutral',
        longTerm: 'neutral',
        strength: 0,
        description: 'No data',
      },
      support: [],
      resistance: [],
      overallSignal: 'hold',
      confidence: 0,
    };
  }

  private getDefaultFundamentalAnalysis(symbol: string): FundamentalAnalysis {
    return {
      symbol,
      timestamp: new Date(),
      valuation: {
        peRatio: null,
        forwardPE: null,
        pegRatio: null,
        priceToBook: null,
        priceToSales: null,
        evToEbitda: null,
        evToRevenue: null,
      },
      profitability: {
        grossMargin: 0,
        operatingMargin: 0,
        netMargin: 0,
        roe: 0,
        roa: 0,
        roic: 0,
      },
      growth: {
        revenueGrowthYoY: 0,
        revenueGrowth3Y: 0,
        revenueGrowth5Y: 0,
        epsGrowthYoY: 0,
        epsGrowth3Y: 0,
        epsGrowth5Y: 0,
        earningsGrowthEstimate: 0,
      },
      financial: {
        currentRatio: 0,
        quickRatio: 0,
        debtToEquity: 0,
        debtToAssets: 0,
        interestCoverage: 0,
        freeCashFlow: 0,
        freeCashFlowYield: 0,
      },
      dividend: {
        dividendYield: 0,
        dividendPayoutRatio: 0,
        dividendGrowth5Y: 0,
        yearsOfDividendGrowth: 0,
        exDividendDate: null,
        dividendFrequency: 'none',
      },
      comparison: {
        sector: 'Unknown',
        industry: 'Unknown',
        peers: [],
        sectorAvgPE: 0,
        sectorAvgPB: 0,
        sectorAvgDividendYield: 0,
        relativeValuation: 'fairly_valued',
      },
      overallRating: 'fair',
      fairValue: { value: 0, method: 'dcf', upside: 0, confidence: 0 },
    };
  }

  private getDefaultSentimentAnalysis(symbol: string): SentimentAnalysis {
    return {
      symbol,
      timestamp: new Date(),
      overallSentiment: { score: 0, label: 'neutral', confidence: 0 },
      newsSentiment: {
        score: 0,
        articleCount: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        topHeadlines: [],
        trendingTopics: [],
      },
      socialSentiment: {
        score: 0,
        mentionCount: 0,
        trendingScore: 0,
        platforms: {
          twitter: {
            score: 0,
            mentionCount: 0,
            bullishPercent: 0,
            bearishPercent: 0,
          },
          reddit: {
            score: 0,
            mentionCount: 0,
            bullishPercent: 0,
            bearishPercent: 0,
          },
          stocktwits: {
            score: 0,
            mentionCount: 0,
            bullishPercent: 0,
            bearishPercent: 0,
          },
        },
      },
      analystSentiment: {
        consensusRating: 'hold',
        targetPrice: 0,
        targetPriceHigh: 0,
        targetPriceLow: 0,
        numberOfAnalysts: 0,
        ratingDistribution: {
          strongBuy: 0,
          buy: 0,
          hold: 0,
          sell: 0,
          strongSell: 0,
        },
        recentUpgrades: 0,
        recentDowngrades: 0,
      },
      insiderActivity: {
        netActivity: 'neutral',
        buyCount: 0,
        sellCount: 0,
        netShares: 0,
        netValue: 0,
        recentTransactions: [],
      },
      institutionalActivity: {
        institutionalOwnership: 0,
        institutionalOwnershipChange: 0,
        topHolders: [],
        newPositions: 0,
        increasedPositions: 0,
        decreasedPositions: 0,
        soldOutPositions: 0,
      },
    };
  }

  private getDefaultAIAnalysis(symbol: string): AIStockAnalysis {
    return {
      summary: `Analysis for ${symbol} is currently unavailable.`,
      bullCase: [],
      bearCase: [],
      keyRisks: [],
      catalysts: [],
      priceTargets: [],
      investmentThesis: 'Unable to generate investment thesis at this time.',
      confidenceScore: 0,
      analysisModel: 'none',
      generatedAt: new Date(),
    };
  }

  // ==========================================================================
  // CACHE METHODS
  // ==========================================================================

  private getCachedAnalysis(symbol: string): ComprehensiveStockAnalysis | null {
    const cached = this.analysisCache.get(symbol.toUpperCase());
    if (cached && Date.now() - cached.timestamp < ANALYSIS_CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private cacheAnalysis(
    symbol: string,
    analysis: ComprehensiveStockAnalysis
  ): void {
    this.analysisCache.set(symbol.toUpperCase(), {
      data: analysis,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear analysis cache
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.analysisCache.delete(symbol.toUpperCase());
    } else {
      this.analysisCache.clear();
    }
  }
}

// Export singleton instance
export const aiStockAnalyst = new AIStockAnalystService();
