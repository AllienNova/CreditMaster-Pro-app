/**
 * Trading Signal Generator
 *
 * AI-powered trading signal generation with multi-asset support,
 * technical analysis, and performance tracking
 */

import { getAIMLService } from '@/lib/aiml-service';
import { MarketDataService } from './services/MarketDataService';
import { PatternRecognitionService } from './services/PatternRecognitionService';
import { SentimentAnalysisService } from './services/SentimentAnalysisService';
import { FundamentalAnalysisService } from './services/FundamentalAnalysisService';
import {
  TradingSignal,
  SignalAnalysis,
  SignalOutcome,
  SignalPerformance,
  SignalType,
  SignalStrength,
  AnalysisType,
  SignalStatus,
} from './types/trading-signals.types';
import { Timeframe } from './types/investment.types';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TECHNICAL INDICATORS
// ============================================================================

interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  movingAverages: { ma20: number; ma50: number; ma200: number; price: number };
  bollingerBands: { upper: number; middle: number; lower: number; price: number };
  volume: { current: number; average: number; trend: 'increasing' | 'decreasing' | 'stable' };
  atr: number; // Average True Range
  adx: number; // Average Directional Index
  stochastic: { k: number; d: number };
}

// ============================================================================
// SIGNAL GENERATOR CLASS
// ============================================================================

export class SignalGenerator {
  private marketData: MarketDataService;
  private patternRecognition: PatternRecognitionService;
  private sentimentAnalysis: SentimentAnalysisService;
  private fundamentalAnalysis: FundamentalAnalysisService;

  constructor() {
    this.marketData = new MarketDataService(
      process.env.ALPHA_VANTAGE_API_KEY,
      process.env.POLYGON_API_KEY
    );
    this.patternRecognition = new PatternRecognitionService();
    this.sentimentAnalysis = new SentimentAnalysisService();
    this.fundamentalAnalysis = new FundamentalAnalysisService();
  }

  /**
   * Generate trading signal for a symbol
   */
  async generateSignal(
    userId: string,
    symbol: string,
    assetType: 'stock' | 'etf' | 'crypto' | 'option' = 'stock',
    analysisTypes: AnalysisType[] = ['technical', 'fundamental', 'sentiment', 'ai_combined'],
    timeframe: Timeframe = '1d'
  ): Promise<TradingSignal> {
    // Get comprehensive analysis
    const { analysis, factors } = await this.analyzeSymbol(symbol, assetType, analysisTypes, timeframe);

    // Calculate signal type and strength
    const { signalType, strength, confidence } = this.calculateSignal(analysis);

    // Get price targets and stop loss
    const { targetPrice, stopLoss, currentPrice } = await this.calculatePriceTargets(
      symbol,
      signalType,
      analysis
    );

    // Calculate risk/reward
    const potentialGain = targetPrice - currentPrice;
    const potentialLoss = currentPrice - stopLoss;
    const riskRewardRatio = Math.abs(potentialGain / potentialLoss);

    // Generate AI insights
    const aiInsights = await this.generateAIInsights(symbol, analysis, signalType);

    // Create signal
    const signal: TradingSignal = {
      id: crypto.randomUUID(),
      userId,
      symbol,
      assetType,
      signalType,
      strength,
      confidence,
      analysisTypes,
      currentPrice,
      targetPrice,
      stopLoss,
      potentialGain,
      potentialLoss,
      riskRewardRatio,
      reasoning: this.generateReasoning(analysis, signalType),
      technicalFactors: factors.technical,
      fundamentalFactors: factors.fundamental,
      sentimentFactors: factors.sentiment,
      aiInsights,
      timeframe: timeframe as '1d' | '1w' | '1m' | '3m' | '6m' | '1y',
      expiresAt: this.calculateExpiration(timeframe),
      generatedAt: new Date(),
      status: 'active',
      modelVersion: 'v1.0.0',
      consensusScore: this.calculateConsensusScore(analysis),
    };

    // Save to database
    await this.saveSignal(signal);

    return signal;
  }

  /**
   * Analyze symbol across multiple dimensions
   */
  private async analyzeSymbol(
    symbol: string,
    assetType: string,
    analysisTypes: AnalysisType[],
    timeframe: Timeframe
  ): Promise<{ analysis: SignalAnalysis; factors: { technical: string[]; fundamental: string[]; sentiment: string[] } }> {
    const analysis: Partial<SignalAnalysis> = {
      symbol,
      technicalScore: 0,
      fundamentalScore: 0,
      sentimentScore: 0,
      overallScore: 0,
      risks: [],
      catalysts: [],
      warnings: [],
    };

    const factors = {
      technical: [] as string[],
      fundamental: [] as string[],
      sentiment: [] as string[],
    };

    // Technical Analysis
    if (analysisTypes.includes('technical') || analysisTypes.includes('ai_combined')) {
      const technicalData = await this.performTechnicalAnalysis(symbol, timeframe);
      analysis.technicalScore = technicalData.score;
      analysis.technicalIndicators = technicalData.indicators;
      factors.technical = technicalData.factors;
    }

    // Sentiment Analysis
    if (analysisTypes.includes('sentiment') || analysisTypes.includes('ai_combined')) {
      const sentimentData = await this.performSentimentAnalysis(symbol);
      analysis.sentimentScore = sentimentData.score;
      analysis.sentimentMetrics = sentimentData.metrics;
      factors.sentiment = sentimentData.factors;
    }

    // Calculate overall score
    const scores = [
      analysis.technicalScore || 0,
      analysis.fundamentalScore || 0,
      analysis.sentimentScore || 0,
    ].filter((s) => s > 0);
    analysis.overallScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return { analysis: analysis as SignalAnalysis, factors };
  }

  /**
   * Perform technical analysis
   */
  private async performTechnicalAnalysis(
    symbol: string,
    timeframe: Timeframe
  ): Promise<{ score: number; indicators: any; factors: string[] }> {
    const historicalData = await this.marketData.getHistoricalData(symbol, timeframe, 200);
    const indicators = this.calculateTechnicalIndicators(historicalData);
    const patternScanResult = this.patternRecognition.scanForPatterns(historicalData, symbol, timeframe);
    const patterns = patternScanResult.patterns;

    const factors: string[] = [];
    let score = 50; // Neutral starting point

    // RSI Analysis
    if (indicators.rsi < 30) {
      score += 15;
      factors.push('RSI indicates oversold conditions (bullish)');
    } else if (indicators.rsi > 70) {
      score -= 15;
      factors.push('RSI indicates overbought conditions (bearish)');
    }

    // MACD Analysis
    if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
      score += 10;
      factors.push('MACD shows bullish momentum');
    } else if (indicators.macd.histogram < 0) {
      score -= 10;
      factors.push('MACD shows bearish momentum');
    }

    // Moving Average Analysis
    const { ma20, ma50, ma200, price } = indicators.movingAverages;
    if (price > ma20 && ma20 > ma50 && ma50 > ma200) {
      score += 15;
      factors.push('Price above all major moving averages (strong uptrend)');
    } else if (price < ma20 && ma20 < ma50 && ma50 < ma200) {
      score -= 15;
      factors.push('Price below all major moving averages (strong downtrend)');
    }

    // Bollinger Bands
    const { upper, lower, price: bbPrice } = indicators.bollingerBands;
    if (bbPrice < lower) {
      score += 10;
      factors.push('Price near lower Bollinger Band (potential bounce)');
    } else if (bbPrice > upper) {
      score -= 10;
      factors.push('Price near upper Bollinger Band (potential pullback)');
    }

    // Volume Analysis
    if (indicators.volume.trend === 'increasing') {
      factors.push('Volume trending higher (confirms price action)');
    }

    // Pattern Recognition
    if (patterns.bullishPatterns.length > 0) {
      score += 10;
      factors.push(`Bullish patterns detected: ${patterns.bullishPatterns.join(', ')}`);
    }
    if (patterns.bearishPatterns.length > 0) {
      score -= 10;
      factors.push(`Bearish patterns detected: ${patterns.bearishPatterns.join(', ')}`);
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    return { score, indicators, factors };
  }

  /**
   * Perform fundamental analysis
   */
  private async performFundamentalAnalysis(
    symbol: string
  ): Promise<{ score: number; metrics: any; factors: string[] }> {
    try {
      const fundamentals = await this.fundamentalAnalysis.analyzeFundamentals(symbol);
      const factors: string[] = [];
      let score = 50;

      // Valuation metrics
      if (fundamentals.valuation.peRatio && fundamentals.valuation.peRatio < 15) {
        score += 10;
        factors.push('P/E ratio below 15 (undervalued)');
      } else if (fundamentals.valuation.peRatio && fundamentals.valuation.peRatio > 30) {
        score -= 10;
        factors.push('P/E ratio above 30 (potentially overvalued)');
      }

      // Growth metrics
      if (fundamentals.growth.revenueGrowth3Y > 20) {
        score += 15;
        factors.push(`Strong revenue growth: ${fundamentals.growth.revenueGrowth3Y.toFixed(1)}%`);
      }
      if (fundamentals.growth.netIncomeGrowth3Y > 20) {
        score += 15;
        factors.push(`Strong earnings growth: ${fundamentals.growth.netIncomeGrowth3Y.toFixed(1)}%`);
      }

      // Profitability
      if (fundamentals.profitability.returnOnEquity > 15) {
        score += 10;
        factors.push(`Healthy ROE: ${fundamentals.profitability.returnOnEquity.toFixed(1)}%`);
      }

      // Financial health (using leverage metrics)
      if (fundamentals.leverage.debtToEquity < 0.5) {
        score += 10;
        factors.push('Low debt-to-equity ratio (strong balance sheet)');
      } else if (fundamentals.leverage.debtToEquity > 2) {
        score -= 10;
        factors.push('High debt-to-equity ratio (financial risk)');
      }

      score = Math.max(0, Math.min(100, score));

      return {
        score,
        metrics: {
          peRatio: fundamentals.valuation.peRatio,
          pbRatio: fundamentals.valuation.pbRatio,
          debtToEquity: fundamentals.leverage.debtToEquity,
          roe: fundamentals.profitability.returnOnEquity,
          revenueGrowth: fundamentals.growth.revenueGrowth3Y,
          earningsGrowth: fundamentals.growth.netIncomeGrowth3Y,
          rating: score > 70 ? 'strong_buy' : score > 60 ? 'buy' : score > 40 ? 'hold' : score > 30 ? 'sell' : 'strong_sell',
        },
        factors,
      };
    } catch (error) {
      console.error('Fundamental analysis failed:', error);
      return { score: 50, metrics: {}, factors: [] };
    }
  }

  /**
   * Perform sentiment analysis
   */
  private async performSentimentAnalysis(
    symbol: string
  ): Promise<{ score: number; metrics: any; factors: string[] }> {
    try {
      const sentiment = await this.sentimentAnalysis.analyzeSentiment(symbol);
      const factors: string[] = [];
      let score = 50;

      // News sentiment
      if (sentiment.news.score > 0.3) {
        score += 15;
        factors.push('Positive news sentiment');
      } else if (sentiment.news.score < -0.3) {
        score -= 15;
        factors.push('Negative news sentiment');
      }

      // Social sentiment
      if (sentiment.social.score > 0.3) {
        score += 10;
        factors.push('Positive social media sentiment');
      } else if (sentiment.social.score < -0.3) {
        score -= 10;
        factors.push('Negative social media sentiment');
      }

      // Analyst ratings
      if (sentiment.analysts.consensusRating === 'strong_buy' || sentiment.analysts.consensusRating === 'buy') {
        score += 15;
        factors.push(`Analyst consensus: ${sentiment.analysts.consensusRating}`);
      } else if (sentiment.analysts.consensusRating === 'sell' || sentiment.analysts.consensusRating === 'strong_sell') {
        score -= 15;
        factors.push(`Analyst consensus: ${sentiment.analysts.consensusRating}`);
      }

      score = Math.max(0, Math.min(100, score));

      return {
        score,
        metrics: {
          newsScore: sentiment.news.score,
          socialScore: sentiment.social.score,
          analystRating: sentiment.analysts.consensusRating,
          insiderActivity: sentiment.insiders?.activity || 'neutral',
          institutionalFlow: sentiment.institutional?.flow || 'neutral',
        },
        factors,
      };
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return { score: 50, metrics: {}, factors: [] };
    }
  }

  /**
   * Calculate signal type and strength from analysis
   */
  private calculateSignal(analysis: SignalAnalysis): {
    signalType: SignalType;
    strength: SignalStrength;
    confidence: number;
  } {
    const score = analysis.overallScore;
    let signalType: SignalType;
    let strength: SignalStrength;

    // Determine signal type
    if (score >= 60) {
      signalType = 'buy';
    } else if (score <= 40) {
      signalType = 'sell';
    } else {
      signalType = 'hold';
    }

    // Determine strength
    if (score >= 80 || score <= 20) {
      strength = 'strong';
    } else if (score >= 70 || score <= 30) {
      strength = 'moderate';
    } else {
      strength = 'weak';
    }

    // Calculate confidence (based on consensus across analysis types)
    const confidence = this.calculateConsensusScore(analysis);

    return { signalType, strength, confidence };
  }

  /**
   * Calculate price targets and stop loss
   */
  private async calculatePriceTargets(
    symbol: string,
    signalType: SignalType,
    analysis: SignalAnalysis
  ): Promise<{ targetPrice: number; stopLoss: number; currentPrice: number }> {
    const quote = await this.marketData.getQuote(symbol);
    const currentPrice = quote.price;
    const atr = analysis.technicalIndicators?.atr || currentPrice * 0.02; // 2% default

    let targetPrice: number;
    let stopLoss: number;

    if (signalType === 'buy') {
      // Target: 2-3x ATR above current price
      targetPrice = currentPrice + atr * 2.5;
      // Stop loss: 1-1.5x ATR below current price
      stopLoss = currentPrice - atr * 1.2;
    } else if (signalType === 'sell') {
      // Target: 2-3x ATR below current price
      targetPrice = currentPrice - atr * 2.5;
      // Stop loss: 1-1.5x ATR above current price
      stopLoss = currentPrice + atr * 1.2;
    } else {
      // Hold signal
      targetPrice = currentPrice;
      stopLoss = currentPrice - atr;
    }

    return { targetPrice, stopLoss, currentPrice };
  }

  /**
   * Generate AI insights using AIML API
   */
  private async generateAIInsights(
    symbol: string,
    analysis: SignalAnalysis,
    signalType: SignalType
  ): Promise<string[]> {
    try {
      const prompt = `Analyze the following trading signal for ${symbol}:

Signal Type: ${signalType.toUpperCase()}
Technical Score: ${analysis.technicalScore}/100
Fundamental Score: ${analysis.fundamentalScore}/100
Sentiment Score: ${analysis.sentimentScore}/100
Overall Score: ${analysis.overallScore}/100

Technical Factors:
${analysis.technicalFactors?.join('\n') || 'N/A'}

Fundamental Factors:
${analysis.fundamentalFactors?.join('\n') || 'N/A'}

Sentiment Factors:
${analysis.sentimentFactors?.join('\n') || 'N/A'}

Provide 3-5 key insights about this trading opportunity. Focus on:
1. The strongest supporting factors
2. Key risks to watch
3. Optimal entry/exit strategy
4. Time horizon considerations

Format as a JSON array of strings.`;

      const response = await aimlService.chat({
        model: 'anthropic/claude-4.5-sonnet',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert trading analyst. Provide concise, actionable insights.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const insights = JSON.parse(content);
      return Array.isArray(insights) ? insights : [];
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      return [
        'AI analysis temporarily unavailable',
        'Rely on technical and fundamental factors',
      ];
    }
  }

  /**
   * Generate reasoning for the signal
   */
  private generateReasoning(analysis: SignalAnalysis, signalType: SignalType): string {
    const parts: string[] = [];

    if (signalType === 'buy') {
      parts.push(
        `BUY signal generated based on overall score of ${analysis.overallScore.toFixed(1)}/100.`
      );
    } else if (signalType === 'sell') {
      parts.push(
        `SELL signal generated based on overall score of ${analysis.overallScore.toFixed(1)}/100.`
      );
    } else {
      parts.push(
        `HOLD signal generated based on neutral score of ${analysis.overallScore.toFixed(1)}/100.`
      );
    }

    if (analysis.technicalScore) {
      parts.push(`Technical analysis: ${analysis.technicalScore.toFixed(1)}/100.`);
    }
    if (analysis.fundamentalScore) {
      parts.push(`Fundamental analysis: ${analysis.fundamentalScore.toFixed(1)}/100.`);
    }
    if (analysis.sentimentScore) {
      parts.push(`Sentiment analysis: ${analysis.sentimentScore.toFixed(1)}/100.`);
    }

    return parts.join(' ');
  }

  /**
   * Calculate consensus score across analysis types
   */
  private calculateConsensusScore(analysis: SignalAnalysis): number {
    const scores = [
      analysis.technicalScore || 0,
      analysis.fundamentalScore || 0,
      analysis.sentimentScore || 0,
    ].filter((s) => s > 0);

    if (scores.length === 0) return 50;

    // Calculate standard deviation
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Lower std dev = higher consensus = higher confidence
    // Normalize to 0-100 scale
    const consensus = Math.max(0, Math.min(100, 100 - stdDev));

    return consensus;
  }

  /**
   * Calculate expiration date based on timeframe
   */
  private calculateExpiration(timeframe: Timeframe): Date {
    const now = new Date();
    const expirationMap: Record<Timeframe, number> = {
      '1m': 1 * 60 * 60 * 1000, // 1 hour
      '5m': 4 * 60 * 60 * 1000, // 4 hours
      '15m': 12 * 60 * 60 * 1000, // 12 hours
      '30m': 24 * 60 * 60 * 1000, // 1 day
      '1h': 2 * 24 * 60 * 60 * 1000, // 2 days
      '4h': 7 * 24 * 60 * 60 * 1000, // 1 week
      '1d': 30 * 24 * 60 * 60 * 1000, // 1 month
      '1w': 90 * 24 * 60 * 60 * 1000, // 3 months
      '1M': 180 * 24 * 60 * 60 * 1000, // 6 months
    };

    return new Date(now.getTime() + (expirationMap[timeframe] || expirationMap['1d']));
  }

  /**
   * Calculate technical indicators from historical data
   */
  private calculateTechnicalIndicators(candles: any[]): TechnicalIndicators {
    if (candles.length < 200) {
      throw new Error('Insufficient data for technical analysis');
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);
    const currentPrice = closes[closes.length - 1];

    // RSI
    const rsi = this.calculateRSI(closes, 14);

    // MACD
    const macd = this.calculateMACD(closes);

    // Moving Averages
    const ma20 = this.calculateSMA(closes, 20);
    const ma50 = this.calculateSMA(closes, 50);
    const ma200 = this.calculateSMA(closes, 200);

    // Bollinger Bands
    const bollingerBands = this.calculateBollingerBands(closes, 20, 2);

    // Volume
    const avgVolume = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];
    const volumeTrend =
      currentVolume > avgVolume * 1.2
        ? 'increasing'
        : currentVolume < avgVolume * 0.8
        ? 'decreasing'
        : 'stable';

    // ATR (Average True Range)
    const atr = this.calculateATR(highs, lows, closes, 14);

    // ADX (Average Directional Index)
    const adx = this.calculateADX(highs, lows, closes, 14);

    // Stochastic
    const stochastic = this.calculateStochastic(highs, lows, closes, 14);

    return {
      rsi,
      macd,
      movingAverages: { ma20, ma50, ma200, price: currentPrice },
      bollingerBands: { ...bollingerBands, price: currentPrice },
      volume: { current: currentVolume, average: avgVolume, trend: volumeTrend },
      atr,
      adx,
      stochastic,
    };
  }

  // Technical Indicator Calculations
  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateMACD(closes: number[]): {
    value: number;
    signal: number;
    histogram: number;
  } {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdLine = ema12 - ema26;

    // For simplicity, using SMA for signal line (should be EMA of MACD)
    const macdValues = [macdLine]; // In production, calculate for multiple periods
    const signalLine = macdLine; // Simplified

    return {
      value: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine,
    };
  }

  private calculateSMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1];
    const slice = values.slice(-period);
    return slice.reduce((sum, v) => sum + v, 0) / period;
  }

  private calculateEMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(values.slice(0, period), period);

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  private calculateBollingerBands(
    closes: number[],
    period: number,
    stdDev: number
  ): { upper: number; middle: number; lower: number } {
    const middle = this.calculateSMA(closes, period);
    const slice = closes.slice(-period);
    const variance =
      slice.reduce((sum, v) => sum + Math.pow(v - middle, 2), 0) / period;
    const sd = Math.sqrt(variance);

    return {
      upper: middle + sd * stdDev,
      middle,
      lower: middle - sd * stdDev,
    };
  }

  private calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): number {
    const trueRanges: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }

    return this.calculateSMA(trueRanges, period);
  }

  private calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): number {
    // Simplified ADX calculation
    // In production, implement full +DI, -DI, and ADX calculation
    return 25; // Placeholder
  }

  private calculateStochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): { k: number; d: number } {
    const slice = closes.length - period;
    const periodHighs = highs.slice(slice);
    const periodLows = lows.slice(slice);
    const currentClose = closes[closes.length - 1];

    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);

    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = k; // Simplified (should be SMA of %K)

    return { k, d };
  }

  /**
   * Save signal to database
   */
  private async saveSignal(signal: TradingSignal): Promise<void> {
    try {
      const { error } = await supabase.from('trading_signals').insert({
        id: signal.id,
        user_id: signal.userId,
        symbol: signal.symbol,
        asset_type: signal.assetType,
        signal_type: signal.signalType,
        strength: signal.strength,
        confidence: signal.confidence,
        analysis_types: signal.analysisTypes,
        current_price: signal.currentPrice,
        target_price: signal.targetPrice,
        stop_loss: signal.stopLoss,
        potential_gain: signal.potentialGain,
        potential_loss: signal.potentialLoss,
        risk_reward_ratio: signal.riskRewardRatio,
        reasoning: signal.reasoning,
        technical_factors: signal.technicalFactors,
        fundamental_factors: signal.fundamentalFactors,
        sentiment_factors: signal.sentimentFactors,
        ai_insights: signal.aiInsights,
        timeframe: signal.timeframe,
        expires_at: signal.expiresAt.toISOString(),
        status: signal.status,
        model_version: signal.modelVersion,
        consensus_score: signal.consensusScore,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save signal:', error);
      // Don't throw - signal generation should succeed even if save fails
    }
  }

  /**
   * Evaluate signal strength (for existing signals)
   */
  async evaluateSignalStrength(signalId: string): Promise<{
    currentStrength: SignalStrength;
    strengthChange: 'stronger' | 'weaker' | 'unchanged';
    recommendation: string;
  }> {
    const { data: signal, error } = await supabase
      .from('trading_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (error || !signal) {
      throw new Error('Signal not found');
    }

    // Re-analyze the symbol
    const newAnalysis = await this.analyzeSymbol(
      signal.symbol,
      signal.asset_type,
      signal.analysis_types,
      signal.timeframe
    );

    const { strength: newStrength } = this.calculateSignal(newAnalysis);

    const strengthOrder: SignalStrength[] = ['weak', 'moderate', 'strong'];
    const oldIndex = strengthOrder.indexOf(signal.strength);
    const newIndex = strengthOrder.indexOf(newStrength);

    let strengthChange: 'stronger' | 'weaker' | 'unchanged';
    let recommendation: string;

    if (newIndex > oldIndex) {
      strengthChange = 'stronger';
      recommendation = 'Signal has strengthened. Consider increasing position size.';
    } else if (newIndex < oldIndex) {
      strengthChange = 'weaker';
      recommendation = 'Signal has weakened. Consider reducing position or exiting.';
    } else {
      strengthChange = 'unchanged';
      recommendation = 'Signal strength unchanged. Maintain current position.';
    }

    return { currentStrength: newStrength, strengthChange, recommendation };
  }

  /**
   * Track signal outcome
   */
  async trackSignalOutcome(
    signalId: string,
    outcome: {
      entryPrice: number;
      exitPrice?: number;
      status: 'executed' | 'expired' | 'cancelled';
    }
  ): Promise<SignalOutcome> {
    // Get the signal
    const { data: signal, error: signalError } = await supabase
      .from('trading_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (signalError || !signal) {
      throw new Error('Signal not found');
    }

    const now = new Date();
    const entryDate = new Date();
    const exitDate = outcome.exitPrice ? now : undefined;

    let returnAmount = 0;
    let returnPercent = 0;
    let outcomeType: 'profit' | 'loss' | 'breakeven' | 'pending' = 'pending';
    let targetHit = false;
    let stopLossHit = false;

    if (outcome.exitPrice) {
      if (signal.signal_type === 'buy') {
        returnAmount = outcome.exitPrice - outcome.entryPrice;
        returnPercent = (returnAmount / outcome.entryPrice) * 100;
        targetHit = outcome.exitPrice >= signal.target_price;
        stopLossHit = outcome.exitPrice <= signal.stop_loss;
      } else if (signal.signal_type === 'sell') {
        returnAmount = outcome.entryPrice - outcome.exitPrice;
        returnPercent = (returnAmount / outcome.entryPrice) * 100;
        targetHit = outcome.exitPrice <= signal.target_price;
        stopLossHit = outcome.exitPrice >= signal.stop_loss;
      }

      if (returnAmount > 0.01) outcomeType = 'profit';
      else if (returnAmount < -0.01) outcomeType = 'loss';
      else outcomeType = 'breakeven';
    }

    const holdingPeriod = exitDate
      ? Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const signalOutcome: SignalOutcome = {
      signalId,
      userId: signal.user_id,
      symbol: signal.symbol,
      entryPrice: outcome.entryPrice,
      entryDate,
      exitPrice: outcome.exitPrice,
      exitDate,
      returnAmount,
      returnPercent,
      holdingPeriod,
      outcome: outcomeType,
      targetHit,
      stopLossHit,
      maxDrawdown: 0, // Would need price history to calculate
      maxGain: 0, // Would need price history to calculate
      createdAt: now,
      updatedAt: now,
    };

    // Update signal status
    await supabase
      .from('trading_signals')
      .update({
        status: outcome.status,
        entry_price: outcome.entryPrice,
        exit_price: outcome.exitPrice,
        executed_at: entryDate.toISOString(),
        closed_at: exitDate?.toISOString(),
        outcome: outcomeType,
        actual_return: returnPercent,
      })
      .eq('id', signalId);

    return signalOutcome;
  }

  /**
   * Get signal history for a user
   */
  async getSignalHistory(
    userId: string,
    filters?: {
      symbol?: string;
      assetType?: string;
      status?: SignalStatus;
      limit?: number;
    }
  ): Promise<TradingSignal[]> {
    let query = supabase
      .from('trading_signals')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false });

    if (filters?.symbol) {
      query = query.eq('symbol', filters.symbol);
    }
    if (filters?.assetType) {
      query = query.eq('asset_type', filters.assetType);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(this.mapDbSignalToType);
  }

  /**
   * Get active signals for a user
   */
  async getActiveSignals(userId: string): Promise<TradingSignal[]> {
    return this.getSignalHistory(userId, { status: 'active', limit: 50 });
  }

  /**
   * Get signal performance metrics
   */
  async getSignalPerformance(
    userId: string,
    period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month'
  ): Promise<SignalPerformance> {
    // Calculate date range
    const now = new Date();
    const periodMap = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
      all: 36500,
    };
    const daysAgo = periodMap[period];
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Get all signals in period
    const { data: signals, error } = await supabase
      .from('trading_signals')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', startDate.toISOString());

    if (error) throw error;

    const allSignals = (signals || []).map(this.mapDbSignalToType);
    const executedSignals = allSignals.filter((s) => s.status === 'executed' && s.actualReturn !== undefined);

    const totalSignals = allSignals.length;
    const activeSignals = allSignals.filter((s) => s.status === 'active').length;
    const expiredSignals = allSignals.filter((s) => s.status === 'expired').length;

    const winningTrades = executedSignals.filter((s) => (s.actualReturn || 0) > 0);
    const losingTrades = executedSignals.filter((s) => (s.actualReturn || 0) < 0);

    const winRate = executedSignals.length > 0 ? (winningTrades.length / executedSignals.length) * 100 : 0;
    const avgReturn = executedSignals.length > 0
      ? executedSignals.reduce((sum, s) => sum + (s.actualReturn || 0), 0) / executedSignals.length
      : 0;
    const totalReturn = executedSignals.reduce((sum, s) => sum + (s.actualReturn || 0), 0);
    const bestTrade = executedSignals.length > 0 ? Math.max(...executedSignals.map((s) => s.actualReturn || 0)) : 0;
    const worstTrade = executedSignals.length > 0 ? Math.min(...executedSignals.map((s) => s.actualReturn || 0)) : 0;

    // Group by signal type
    const bySignalType = this.groupBySignalType(executedSignals);
    const byStrength = this.groupByStrength(executedSignals);
    const byAssetType = this.groupByAssetType(executedSignals);

    // Get recent and top performers
    const recentSignals = allSignals.slice(0, 10);
    const topPerformers = [...executedSignals]
      .sort((a, b) => (b.actualReturn || 0) - (a.actualReturn || 0))
      .slice(0, 5);
    const worstPerformers = [...executedSignals]
      .sort((a, b) => (a.actualReturn || 0) - (b.actualReturn || 0))
      .slice(0, 5);

    return {
      userId,
      period,
      totalSignals,
      activeSignals,
      executedSignals: executedSignals.length,
      expiredSignals,
      winRate,
      avgReturn,
      totalReturn,
      bestTrade,
      worstTrade,
      bySignalType,
      byStrength,
      byAssetType,
      recentSignals,
      topPerformers,
      worstPerformers,
    };
  }

  // Helper methods for performance grouping
  private groupBySignalType(signals: TradingSignal[]) {
    const groups = { buy: [], sell: [], hold: [] } as Record<string, TradingSignal[]>;
    signals.forEach((s) => groups[s.signalType].push(s));

    return {
      buy: this.calculateGroupStats(groups.buy),
      sell: this.calculateGroupStats(groups.sell),
      hold: this.calculateGroupStats(groups.hold),
    };
  }

  private groupByStrength(signals: TradingSignal[]) {
    const groups = { strong: [], moderate: [], weak: [] } as Record<string, TradingSignal[]>;
    signals.forEach((s) => groups[s.strength].push(s));

    return {
      strong: this.calculateGroupStats(groups.strong),
      moderate: this.calculateGroupStats(groups.moderate),
      weak: this.calculateGroupStats(groups.weak),
    };
  }

  private groupByAssetType(signals: TradingSignal[]) {
    const groups: Record<string, TradingSignal[]> = {};
    signals.forEach((s) => {
      if (!groups[s.assetType]) groups[s.assetType] = [];
      groups[s.assetType].push(s);
    });

    const result: Record<string, { count: number; winRate: number; avgReturn: number }> = {};
    Object.keys(groups).forEach((type) => {
      result[type] = this.calculateGroupStats(groups[type]);
    });

    return result;
  }

  private calculateGroupStats(signals: TradingSignal[]): {
    count: number;
    winRate: number;
    avgReturn: number;
  } {
    const count = signals.length;
    if (count === 0) return { count: 0, winRate: 0, avgReturn: 0 };

    const winners = signals.filter((s) => (s.actualReturn || 0) > 0).length;
    const winRate = (winners / count) * 100;
    const avgReturn = signals.reduce((sum, s) => sum + (s.actualReturn || 0), 0) / count;

    return { count, winRate, avgReturn };
  }

  private mapDbSignalToType(dbSignal: any): TradingSignal {
    return {
      id: dbSignal.id,
      userId: dbSignal.user_id,
      symbol: dbSignal.symbol,
      assetType: dbSignal.asset_type,
      signalType: dbSignal.signal_type,
      strength: dbSignal.strength,
      confidence: dbSignal.confidence,
      analysisTypes: dbSignal.analysis_types,
      currentPrice: dbSignal.current_price,
      targetPrice: dbSignal.target_price,
      stopLoss: dbSignal.stop_loss,
      entryPrice: dbSignal.entry_price,
      exitPrice: dbSignal.exit_price,
      potentialGain: dbSignal.potential_gain,
      potentialLoss: dbSignal.potential_loss,
      riskRewardRatio: dbSignal.risk_reward_ratio,
      reasoning: dbSignal.reasoning,
      technicalFactors: dbSignal.technical_factors || [],
      fundamentalFactors: dbSignal.fundamental_factors || [],
      sentimentFactors: dbSignal.sentiment_factors || [],
      aiInsights: dbSignal.ai_insights || [],
      timeframe: dbSignal.timeframe,
      expiresAt: new Date(dbSignal.expires_at),
      generatedAt: new Date(dbSignal.generated_at),
      executedAt: dbSignal.executed_at ? new Date(dbSignal.executed_at) : undefined,
      closedAt: dbSignal.closed_at ? new Date(dbSignal.closed_at) : undefined,
      status: dbSignal.status,
      outcome: dbSignal.outcome,
      actualReturn: dbSignal.actual_return,
      modelVersion: dbSignal.model_version,
      consensusScore: dbSignal.consensus_score,
    };
  }
}

// Export singleton instance
export const signalGenerator = new SignalGenerator();


