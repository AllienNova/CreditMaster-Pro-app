/**
 * Trading Signal Generator
 *
 * Phase 5.1.2: Enhanced with multi-model AI consensus and Redis caching
 * AI-powered trading signal generation with multi-asset support,
 * technical analysis, and performance tracking
 */

import { getAIMLService } from "@/lib/aiml-service";
import { MarketDataService } from "./services/MarketDataService";
import { PatternRecognitionService } from "./services/PatternRecognitionService";
import { SentimentAnalysisService } from "./services/SentimentAnalysisService";
import { FundamentalAnalysisService } from "./services/FundamentalAnalysisService";
import {
  TradingSignal,
  SignalAnalysis,
  SignalOutcome,
  SignalPerformance,
  SignalType,
  SignalStrength,
  AnalysisType,
  SignalStatus,
  SignalOutcomeType,
  SignalFilters,
  TradingSignalSchema,
  SignalAnalysisSchema,
  SignalOutcomeSchema,
  SignalPerformanceSchema,
} from "./types/trading-signals.types";
import { Timeframe } from "./types/investment.types";
/**
 * Service-role client, NOT the request-scoped `createClient()`.
 *
 * `trading_signals` grants `authenticated` no table privilege (deliberate — see
 * supabase/migrations/20260731000009_financial_accounts_revoke_authenticated.sql:
 * a missing grant fails LOUDLY with 42501 rather than silently returning zero
 * rows), so every query here raised "permission denied for table
 * trading_signals" and GET /api/investments/signals returned 500.
 *
 * This also removes a second, independent bug: three of the five call sites
 * wrote `const supabase = createClient()` with NO `await`, against an `async`
 * function (supabase/server.ts:26). They held a Promise, so `.from()` was
 * undefined — hidden because each was cast `as any`. getServiceRoleClient is
 * synchronous, so the shape is now correct by construction.
 *
 * The service role bypasses RLS. getSignalHistory scopes by its required
 * `userId` argument. evaluateSignalStrength and trackSignalOutcome look up by
 * signal id ALONE and rely on their caller's ownership gate:
 * app/api/investments/signals/[id]/route.ts fetches getSignalHistory(user.id)
 * and confirms the id is in that set before calling either. Do not call them
 * from a path that has not made that check.
 */
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { redisCache, shortRedisCache } from "@/lib/cache/redis-cache-service";

// ============================================================================
// TECHNICAL INDICATORS
// ============================================================================

interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  movingAverages: { ma20: number; ma50: number; ma200: number; price: number };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    price: number;
  };
  volume: {
    current: number;
    average: number;
    trend: "increasing" | "decreasing" | "stable";
  };
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
      process.env.POLYGON_API_KEY,
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
    assetType: "stock" | "etf" | "crypto" | "option" = "stock",
    analysisTypes: AnalysisType[] = [
      AnalysisType.TECHNICAL,
      AnalysisType.FUNDAMENTAL,
      AnalysisType.SENTIMENT,
      AnalysisType.AI_COMBINED,
    ],
    timeframe: Timeframe = "1d",
  ): Promise<TradingSignal> {
    // Check cache first (15 minutes TTL)
    const cacheKey = `signal:${symbol}:${userId}`;
    const cachedSignal = await shortRedisCache.get<TradingSignal>(cacheKey);
    if (cachedSignal) {
      return cachedSignal;
    }

    // Get comprehensive analysis
    const { analysis, factors } = await this.analyzeSymbol(
      symbol,
      assetType,
      analysisTypes,
      timeframe,
    );

    // Calculate signal type and strength
    const { signalType, strength, confidence } = this.calculateSignal(analysis);

    // Get price targets and stop loss
    const { targetPrice, stopLoss, currentPrice } =
      await this.calculatePriceTargets(symbol, signalType, analysis);

    // Calculate risk/reward
    const potentialGain = targetPrice - currentPrice;
    const potentialLoss = currentPrice - stopLoss;
    const riskRewardRatio = Math.abs(potentialGain / potentialLoss);

    // Generate multi-model AI consensus
    const consensus = await this.generateMultiModelConsensus(
      symbol,
      analysis,
      factors,
    );

    // Use consensus signal if AI analysis is requested
    const finalSignalType = analysisTypes.includes(AnalysisType.AI_COMBINED)
      ? consensus.signalType
      : signalType;
    const finalConfidence = analysisTypes.includes(AnalysisType.AI_COMBINED)
      ? consensus.confidence
      : confidence;

    // Create signal
    const signal: TradingSignal = {
      id: crypto.randomUUID(),
      userId,
      symbol,
      assetType,
      signalType: finalSignalType,
      strength: Math.round(finalConfidence * 100), // Convert to 0-100 scale
      confidence: finalConfidence, // 0-1 scale
      analysisTypes,
      currentPrice,
      targetPrice,
      stopLoss,
      potentialGain,
      potentialLoss,
      riskRewardRatio,
      reasoning: this.generateReasoning(analysis, finalSignalType),
      technicalFactors: factors.technical,
      fundamentalFactors: factors.fundamental,
      sentimentFactors: factors.sentiment,
      aiInsights: consensus.aiInsights,
      timeframe: timeframe as "1d" | "1w" | "1m" | "3m" | "6m" | "1y",
      expiresAt: this.calculateExpiration(timeframe),
      generatedAt: new Date(),
      status: SignalStatus.ACTIVE,
      modelVersion: "v2.0.0-multi-model",
      consensusScore: consensus.consensusScore,
      metadata: {
        analysisTimestamp: new Date().toISOString(),
        modelsUsed: ["Claude 4.5", "GPT-4o Mini", "DeepSeek R1"],
      },
    };

    // Save to database
    await this.saveSignal(signal);

    // Cache the signal (15 minutes TTL) - reuse cacheKey from earlier
    await shortRedisCache.set(cacheKey, signal, 900); // 15 minutes

    return signal;
  }

  /**
   * Generate multi-model AI consensus
   * Uses Claude, GPT-4, and DeepSeek for consensus-based signal generation
   */
  private async generateMultiModelConsensus(
    symbol: string,
    analysis: SignalAnalysis,
    factors: {
      technical: string[];
      fundamental: string[];
      sentiment: string[];
    },
  ): Promise<{
    consensusScore: number;
    aiInsights: string[];
    signalType: SignalType;
    confidence: number;
  }> {
    const aiml = getAIMLService();
    const insights: string[] = [];
    const modelPredictions: Array<{
      model: string;
      signalType: SignalType;
      confidence: number;
      reasoning: string;
    }> = [];

    // Prepare analysis context
    const context = `
Symbol: ${symbol}
Technical Score: ${analysis.technicalScore}/100
Fundamental Score: ${analysis.fundamentalScore}/100
Sentiment Score: ${analysis.sentimentScore}/100

Technical Factors:
${factors.technical.join("\n")}

Fundamental Factors:
${factors.fundamental.join("\n")}

Sentiment Factors:
${factors.sentiment.join("\n")}
    `.trim();

    const prompt = `Based on the following analysis, provide a trading signal (BUY, SELL, or HOLD) with confidence level (0-1) and brief reasoning.

${context}

Respond in JSON format:
{
  "signalType": "buy" | "sell" | "hold",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    try {
      // Model 1: Claude 4.5 Sonnet (default)
      const claude = await aiml.chat(
        "anthropic/claude-4.5-sonnet",
        [{ role: "user", content: prompt }],
        { temperature: 0.3 },
      );
      const content = claude.choices[0].message.content || "{}";
      const claudeResponse = JSON.parse(content);
      modelPredictions.push({
        model: "Claude 4.5",
        signalType: claudeResponse.signalType as SignalType,
        confidence: claudeResponse.confidence,
        reasoning: claudeResponse.reasoning,
      });
      insights.push(`Claude 4.5: ${claudeResponse.reasoning}`);
    } catch (error) {
      // SignalGenerator error: Claude model error
    }

    try {
      // Model 2: GPT-4o Mini (fast)
      const gpt = await aiml.chat(
        "openai/gpt-4o-mini",
        [{ role: "user", content: prompt }],
        { temperature: 0.3 },
      );
      const gptContent = gpt.choices[0].message.content || "{}";
      const gptResponse = JSON.parse(gptContent);
      modelPredictions.push({
        model: "GPT-4o Mini",
        signalType: gptResponse.signalType as SignalType,
        confidence: gptResponse.confidence,
        reasoning: gptResponse.reasoning,
      });
      insights.push(`GPT-4o: ${gptResponse.reasoning}`);
    } catch (error) {
      // SignalGenerator error: GPT model error
    }

    try {
      // Model 3: DeepSeek R1 (reasoning)
      const deepseek = await aiml.chat(
        "deepseek/deepseek-r1",
        [{ role: "user", content: prompt }],
        { temperature: 0.3 },
      );
      const deepseekContent = deepseek.choices[0].message.content || "{}";
      const deepseekResponse = JSON.parse(deepseekContent);
      modelPredictions.push({
        model: "DeepSeek R1",
        signalType: deepseekResponse.signalType as SignalType,
        confidence: deepseekResponse.confidence,
        reasoning: deepseekResponse.reasoning,
      });
      insights.push(`DeepSeek: ${deepseekResponse.reasoning}`);
    } catch (error) {
      // SignalGenerator error: DeepSeek model error
    }

    // Calculate consensus
    const buyVotes = modelPredictions.filter(
      (p) =>
        p.signalType === SignalType.BUY ||
        p.signalType === SignalType.STRONG_BUY,
    ).length;
    const sellVotes = modelPredictions.filter(
      (p) =>
        p.signalType === SignalType.SELL ||
        p.signalType === SignalType.STRONG_SELL,
    ).length;
    const holdVotes = modelPredictions.filter(
      (p) => p.signalType === SignalType.HOLD,
    ).length;

    let consensusSignalType: SignalType;
    if (buyVotes > sellVotes && buyVotes > holdVotes) {
      consensusSignalType = SignalType.BUY;
    } else if (sellVotes > buyVotes && sellVotes > holdVotes) {
      consensusSignalType = SignalType.SELL;
    } else {
      consensusSignalType = SignalType.HOLD;
    }

    // Calculate consensus score (0-1)
    const totalVotes = modelPredictions.length;
    const maxVotes = Math.max(buyVotes, sellVotes, holdVotes);
    const consensusScore = totalVotes > 0 ? maxVotes / totalVotes : 0.5;

    // Average confidence from all models
    const avgConfidence =
      modelPredictions.reduce((sum, p) => sum + p.confidence, 0) /
      modelPredictions.length;

    insights.push(
      `Consensus: ${buyVotes} BUY, ${sellVotes} SELL, ${holdVotes} HOLD (${(consensusScore * 100).toFixed(0)}% agreement)`,
    );

    return {
      consensusScore,
      aiInsights: insights,
      signalType: consensusSignalType,
      confidence: avgConfidence,
    };
  }

  /**
   * Analyze symbol across multiple dimensions
   */
  private async analyzeSymbol(
    symbol: string,
    assetType: string,
    analysisTypes: AnalysisType[],
    timeframe: Timeframe,
  ): Promise<{
    analysis: SignalAnalysis;
    factors: {
      technical: string[];
      fundamental: string[];
      sentiment: string[];
    };
  }> {
    const analysis: Partial<SignalAnalysis> = {
      symbol,
      technicalScore: 0,
      fundamentalScore: 0,
      sentimentScore: 0,
      aiConsensusScore: 0,
      riskAssessment: "moderate",
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
    if (
      analysisTypes.includes(AnalysisType.TECHNICAL) ||
      analysisTypes.includes(AnalysisType.AI_COMBINED)
    ) {
      const technicalData = await this.performTechnicalAnalysis(
        symbol,
        timeframe,
      );
      analysis.technicalScore = technicalData.score;
      analysis.technicalIndicators = technicalData.indicators;
      factors.technical = technicalData.factors;
    }

    // Fundamental Analysis
    if (
      analysisTypes.includes(AnalysisType.FUNDAMENTAL) ||
      analysisTypes.includes(AnalysisType.AI_COMBINED)
    ) {
      const fundamentalData = await this.performFundamentalAnalysis(symbol);
      analysis.fundamentalScore = fundamentalData.score;
      analysis.fundamentalMetrics = fundamentalData.metrics;
      factors.fundamental = fundamentalData.factors;
    }

    // Sentiment Analysis
    if (
      analysisTypes.includes(AnalysisType.SENTIMENT) ||
      analysisTypes.includes(AnalysisType.AI_COMBINED)
    ) {
      const sentimentData = await this.performSentimentAnalysis(symbol);
      analysis.sentimentScore = sentimentData.score;
      analysis.sentimentMetrics = sentimentData.metrics;
      factors.sentiment = sentimentData.factors;
    }

    // Calculate AI consensus score
    const scores = [
      analysis.technicalScore || 0,
      analysis.fundamentalScore || 0,
      analysis.sentimentScore || 0,
    ].filter((s) => s > 0);
    analysis.aiConsensusScore =
      scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return { analysis: analysis as SignalAnalysis, factors };
  }

  /**
   * Perform technical analysis
   */
  private async performTechnicalAnalysis(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<{ score: number; indicators: any; factors: string[] }> {
    const historicalData = await this.marketData.getHistoricalData(
      symbol,
      timeframe,
      200,
    );
    const indicators = this.calculateTechnicalIndicators(historicalData);
    const patternScanResult = this.patternRecognition.scanForPatterns(
      historicalData,
      symbol,
      timeframe,
    );
    const patterns = patternScanResult.patterns;

    const factors: string[] = [];
    let score = 50; // Neutral starting point

    // RSI Analysis
    if (indicators.rsi < 30) {
      score += 15;
      factors.push("RSI indicates oversold conditions (bullish)");
    } else if (indicators.rsi > 70) {
      score -= 15;
      factors.push("RSI indicates overbought conditions (bearish)");
    }

    // MACD Analysis
    if (
      indicators.macd.histogram > 0 &&
      indicators.macd.value > indicators.macd.signal
    ) {
      score += 10;
      factors.push("MACD shows bullish momentum");
    } else if (indicators.macd.histogram < 0) {
      score -= 10;
      factors.push("MACD shows bearish momentum");
    }

    // Moving Average Analysis
    const { ma20, ma50, ma200, price } = indicators.movingAverages;
    if (price > ma20 && ma20 > ma50 && ma50 > ma200) {
      score += 15;
      factors.push("Price above all major moving averages (strong uptrend)");
    } else if (price < ma20 && ma20 < ma50 && ma50 < ma200) {
      score -= 15;
      factors.push("Price below all major moving averages (strong downtrend)");
    }

    // Bollinger Bands
    const { upper, lower, price: bbPrice } = indicators.bollingerBands;
    if (bbPrice < lower) {
      score += 10;
      factors.push("Price near lower Bollinger Band (potential bounce)");
    } else if (bbPrice > upper) {
      score -= 10;
      factors.push("Price near upper Bollinger Band (potential pullback)");
    }

    // Volume Analysis
    if (indicators.volume.trend === "increasing") {
      factors.push("Volume trending higher (confirms price action)");
    }

    // Pattern Recognition
    const bullishPatterns = patterns.filter((p) => p.direction === "bullish");
    const bearishPatterns = patterns.filter((p) => p.direction === "bearish");
    if (bullishPatterns.length > 0) {
      score += 10;
      factors.push(
        `Bullish patterns detected: ${bullishPatterns.map((p) => p.type).join(", ")}`,
      );
    }
    if (bearishPatterns.length > 0) {
      score -= 10;
      factors.push(
        `Bearish patterns detected: ${bearishPatterns.map((p) => p.type).join(", ")}`,
      );
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    return { score, indicators, factors };
  }

  /**
   * Perform fundamental analysis
   */
  private async performFundamentalAnalysis(
    symbol: string,
  ): Promise<{ score: number; metrics: any; factors: string[] }> {
    try {
      const fundamentals =
        await this.fundamentalAnalysis.analyzeFundamentals(symbol);
      const factors: string[] = [];
      let score = 50;

      // Valuation metrics
      if (
        fundamentals.valuation.peRatio &&
        fundamentals.valuation.peRatio < 15
      ) {
        score += 10;
        factors.push("P/E ratio below 15 (undervalued)");
      } else if (
        fundamentals.valuation.peRatio &&
        fundamentals.valuation.peRatio > 30
      ) {
        score -= 10;
        factors.push("P/E ratio above 30 (potentially overvalued)");
      }

      // Growth metrics
      if (fundamentals.growth.revenueGrowth3Y > 20) {
        score += 15;
        factors.push(
          `Strong revenue growth: ${fundamentals.growth.revenueGrowth3Y.toFixed(1)}%`,
        );
      }
      if (fundamentals.growth.netIncomeGrowth3Y > 20) {
        score += 15;
        factors.push(
          `Strong earnings growth: ${fundamentals.growth.netIncomeGrowth3Y.toFixed(1)}%`,
        );
      }

      // Profitability
      if (fundamentals.profitability.returnOnEquity > 15) {
        score += 10;
        factors.push(
          `Healthy ROE: ${fundamentals.profitability.returnOnEquity.toFixed(1)}%`,
        );
      }

      // Financial health (using leverage metrics)
      if (fundamentals.leverage.debtToEquity < 0.5) {
        score += 10;
        factors.push("Low debt-to-equity ratio (strong balance sheet)");
      } else if (fundamentals.leverage.debtToEquity > 2) {
        score -= 10;
        factors.push("High debt-to-equity ratio (financial risk)");
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
          rating:
            score > 70
              ? "strong_buy"
              : score > 60
                ? "buy"
                : score > 40
                  ? "hold"
                  : score > 30
                    ? "sell"
                    : "strong_sell",
        },
        factors,
      };
    } catch (error) {
      // SignalGenerator error: Fundamental analysis failed
      return { score: 50, metrics: {}, factors: [] };
    }
  }

  /**
   * Perform sentiment analysis
   */
  private async performSentimentAnalysis(
    symbol: string,
  ): Promise<{ score: number; metrics: any; factors: string[] }> {
    try {
      const sentiment = await this.sentimentAnalysis.analyzeSentiment(symbol);
      const factors: string[] = [];
      let score = 50;

      // News sentiment
      if (sentiment.newsSentiment.averageSentiment > 0.3) {
        score += 15;
        factors.push("Positive news sentiment");
      } else if (sentiment.newsSentiment.averageSentiment < -0.3) {
        score -= 15;
        factors.push("Negative news sentiment");
      }

      // Social sentiment
      if (sentiment.socialSentiment.averageSentiment > 0.3) {
        score += 10;
        factors.push("Positive social media sentiment");
      } else if (sentiment.socialSentiment.averageSentiment < -0.3) {
        score -= 10;
        factors.push("Negative social media sentiment");
      }

      // Analyst ratings
      if (
        sentiment.analystConsensus.consensusRating === "strong_buy" ||
        sentiment.analystConsensus.consensusRating === "buy"
      ) {
        score += 15;
        factors.push(
          `Analyst consensus: ${sentiment.analystConsensus.consensusRating}`,
        );
      } else if (
        sentiment.analystConsensus.consensusRating === "sell" ||
        sentiment.analystConsensus.consensusRating === "strong_sell"
      ) {
        score -= 15;
        factors.push(
          `Analyst consensus: ${sentiment.analystConsensus.consensusRating}`,
        );
      }

      score = Math.max(0, Math.min(100, score));

      return {
        score,
        metrics: {
          newsScore: sentiment.newsSentiment.averageSentiment,
          socialScore: sentiment.socialSentiment.averageSentiment,
          analystRating: sentiment.analystConsensus.consensusRating,
          insiderActivity: sentiment.insiderActivity.insiderSentiment,
          institutionalFlow:
            sentiment.institutionalOwnership.quarterlyChange > 0
              ? "inflow"
              : "outflow",
        },
        factors,
      };
    } catch (error) {
      // SignalGenerator error: Sentiment analysis failed
      return { score: 50, metrics: {}, factors: [] };
    }
  }

  /**
   * Calculate signal type and strength from analysis
   */
  private calculateSignal(analysis: SignalAnalysis): {
    signalType: SignalType;
    strength: number; // 0-100 scale
    confidence: number; // 0-1 scale
  } {
    const score = analysis.aiConsensusScore;
    let signalType: SignalType;

    // Determine signal type
    if (score >= 75) {
      signalType = SignalType.STRONG_BUY;
    } else if (score >= 60) {
      signalType = SignalType.BUY;
    } else if (score <= 25) {
      signalType = SignalType.STRONG_SELL;
    } else if (score <= 40) {
      signalType = SignalType.SELL;
    } else {
      signalType = SignalType.HOLD;
    }

    // Strength is the score itself (0-100)
    const strength = Math.round(score);

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
    analysis: SignalAnalysis,
  ): Promise<{ targetPrice: number; stopLoss: number; currentPrice: number }> {
    const quote = await this.marketData.getQuote(symbol);
    const currentPrice = quote.price;
    const atr = currentPrice * 0.02; // 2% default ATR

    let targetPrice: number;
    let stopLoss: number;

    if (signalType === "buy") {
      // Target: 2-3x ATR above current price
      targetPrice = currentPrice + atr * 2.5;
      // Stop loss: 1-1.5x ATR below current price
      stopLoss = currentPrice - atr * 1.2;
    } else if (signalType === "sell") {
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
    signalType: SignalType,
    factors: {
      technical: string[];
      fundamental: string[];
      sentiment: string[];
    },
  ): Promise<string[]> {
    try {
      const prompt = `Analyze the following trading signal for ${symbol}:

Signal Type: ${signalType.toUpperCase()}
Technical Score: ${analysis.technicalScore}/100
Fundamental Score: ${analysis.fundamentalScore}/100
Sentiment Score: ${analysis.sentimentScore}/100
AI Consensus Score: ${analysis.aiConsensusScore}/100

Technical Factors:
${factors.technical.join("\n") || "N/A"}

Fundamental Factors:
${factors.fundamental.join("\n") || "N/A"}

Sentiment Factors:
${factors.sentiment.join("\n") || "N/A"}

Provide 3-5 key insights about this trading opportunity. Focus on:
1. The strongest supporting factors
2. Key risks to watch
3. Optimal entry/exit strategy
4. Time horizon considerations

Format as a JSON array of strings.`;

      const aimlService = getAIMLService();
      const response = await aimlService.chat(
        "anthropic/claude-4.5-sonnet",
        [
          {
            role: "system",
            content:
              "You are an expert trading analyst. Provide concise, actionable insights.",
          },
          { role: "user", content: prompt },
        ],
        {
          temperature: 0.3,
          max_tokens: 500,
        },
      );

      const content = response.choices[0]?.message?.content || "[]";
      const insights = JSON.parse(content);
      return Array.isArray(insights) ? insights : [];
    } catch (error) {
      // SignalGenerator error: Failed to generate AI insights
      return [
        "AI analysis temporarily unavailable",
        "Rely on technical and fundamental factors",
      ];
    }
  }

  /**
   * Generate reasoning for the signal
   */
  private generateReasoning(
    analysis: SignalAnalysis,
    signalType: SignalType,
  ): string {
    const parts: string[] = [];

    if (signalType === SignalType.BUY || signalType === SignalType.STRONG_BUY) {
      parts.push(
        `BUY signal generated based on AI consensus score of ${analysis.aiConsensusScore.toFixed(1)}/100.`,
      );
    } else if (
      signalType === SignalType.SELL ||
      signalType === SignalType.STRONG_SELL
    ) {
      parts.push(
        `SELL signal generated based on AI consensus score of ${analysis.aiConsensusScore.toFixed(1)}/100.`,
      );
    } else {
      parts.push(
        `HOLD signal generated based on neutral score of ${analysis.aiConsensusScore.toFixed(1)}/100.`,
      );
    }

    if (analysis.technicalScore) {
      parts.push(
        `Technical analysis: ${analysis.technicalScore.toFixed(1)}/100.`,
      );
    }
    if (analysis.fundamentalScore) {
      parts.push(
        `Fundamental analysis: ${analysis.fundamentalScore.toFixed(1)}/100.`,
      );
    }
    if (analysis.sentimentScore) {
      parts.push(
        `Sentiment analysis: ${analysis.sentimentScore.toFixed(1)}/100.`,
      );
    }

    return parts.join(" ");
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
      "1m": 1 * 60 * 60 * 1000, // 1 hour
      "5m": 4 * 60 * 60 * 1000, // 4 hours
      "15m": 12 * 60 * 60 * 1000, // 12 hours
      "30m": 24 * 60 * 60 * 1000, // 1 day
      "1h": 2 * 24 * 60 * 60 * 1000, // 2 days
      "4h": 7 * 24 * 60 * 60 * 1000, // 1 week
      "1d": 30 * 24 * 60 * 60 * 1000, // 1 month
      "1w": 90 * 24 * 60 * 60 * 1000, // 3 months
      "1M": 180 * 24 * 60 * 60 * 1000, // 6 months
    };

    return new Date(
      now.getTime() + (expirationMap[timeframe] || expirationMap["1d"]),
    );
  }

  /**
   * Calculate technical indicators from historical data
   */
  private calculateTechnicalIndicators(candles: any[]): TechnicalIndicators {
    if (candles.length < 200) {
      throw new Error("Insufficient data for technical analysis");
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
        ? "increasing"
        : currentVolume < avgVolume * 0.8
          ? "decreasing"
          : "stable";

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
      volume: {
        current: currentVolume,
        average: avgVolume,
        trend: volumeTrend,
      },
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

    // Build MACD history for each bar starting at index 26, then compute
    // the 9-period EMA of that history to get the signal line.
    const macdHistory: number[] = [];
    for (let i = 26; i < closes.length; i++) {
      const e12 = this.calculateEMA(closes.slice(0, i + 1), 12);
      const e26 = this.calculateEMA(closes.slice(0, i + 1), 26);
      macdHistory.push(e12 - e26);
    }

    const signalLine =
      macdHistory.length >= 9
        ? this.calculateEMA(macdHistory, 9)
        : macdLine;

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
    stdDev: number,
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
    period: number,
  ): number {
    const trueRanges: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      );
      trueRanges.push(tr);
    }

    return this.calculateSMA(trueRanges, period);
  }

  private calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number,
  ): number {
    if (highs.length < period + 1) return 25;

    // Step 1: Compute raw +DM, -DM, and TR for each bar
    const rawPlusDM: number[] = [];
    const rawMinusDM: number[] = [];
    const rawTR: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      rawPlusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      rawMinusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      rawTR.push(
        Math.max(
          highs[i] - lows[i],
          Math.abs(highs[i] - closes[i - 1]),
          Math.abs(lows[i] - closes[i - 1]),
        ),
      );
    }

    if (rawTR.length < period) return 25;

    // Step 2: Wilder's smoothing — seed with simple sum of first `period` values
    let smoothTR = rawTR.slice(0, period).reduce((s, v) => s + v, 0);
    let smoothPlusDM = rawPlusDM.slice(0, period).reduce((s, v) => s + v, 0);
    let smoothMinusDM = rawMinusDM.slice(0, period).reduce((s, v) => s + v, 0);

    // Step 3: Build DX series using Wilder's rolling smoothing
    const dxValues: number[] = [];

    const addDX = (tr: number, plusDM: number, minusDM: number): void => {
      if (tr === 0) return;
      const plusDI = (100 * plusDM) / tr;
      const minusDI = (100 * minusDM) / tr;
      const diSum = plusDI + minusDI;
      if (diSum === 0) return;
      dxValues.push((100 * Math.abs(plusDI - minusDI)) / diSum);
    };

    addDX(smoothTR, smoothPlusDM, smoothMinusDM);

    for (let i = period; i < rawTR.length; i++) {
      smoothTR = smoothTR - smoothTR / period + rawTR[i];
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + rawPlusDM[i];
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + rawMinusDM[i];
      addDX(smoothTR, smoothPlusDM, smoothMinusDM);
    }

    if (dxValues.length === 0) return 25;

    // Step 4: ADX = Wilder's smoothing of DX over `period`
    if (dxValues.length < period) {
      return dxValues.reduce((s, v) => s + v, 0) / dxValues.length;
    }

    let adx = dxValues.slice(0, period).reduce((s, v) => s + v, 0) / period;
    for (let i = period; i < dxValues.length; i++) {
      adx = (adx * (period - 1) + dxValues[i]) / period;
    }

    return adx;
  }

  private calculateStochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number,
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
      const supabase = getServiceRoleClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("trading_signals").insert({
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
      // SignalGenerator error: Failed to save signal
      // Don't throw - signal generation should succeed even if save fails
    }
  }

  /**
   * Evaluate signal strength (for existing signals)
   */
  async evaluateSignalStrength(signalId: string): Promise<{
    currentStrength: number; // 0-100 scale
    strengthChange: "stronger" | "weaker" | "unchanged";
    recommendation: string;
  }> {
    const supabase = getServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: signal, error } = await (supabase as any)
      .from("trading_signals")
      .select("*")
      .eq("id", signalId)
      .single();

    if (error || !signal) {
      throw new Error("Signal not found");
    }

    // Re-analyze the symbol
    const { analysis: newAnalysis } = await this.analyzeSymbol(
      signal.symbol,
      signal.asset_type,
      signal.analysis_types,
      signal.timeframe,
    );

    const { strength: newStrength } = this.calculateSignal(newAnalysis);

    const oldStrength = signal.strength;

    let strengthChange: "stronger" | "weaker" | "unchanged";
    let recommendation: string;

    if (newStrength > oldStrength + 10) {
      strengthChange = "stronger";
      recommendation =
        "Signal has strengthened significantly. Consider increasing position size.";
    } else if (newStrength < oldStrength - 10) {
      strengthChange = "weaker";
      recommendation =
        "Signal has weakened. Consider reducing position or exiting.";
    } else {
      strengthChange = "unchanged";
      recommendation = "Signal strength unchanged. Maintain current position.";
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
      status: "executed" | "expired" | "cancelled";
    },
  ): Promise<SignalOutcome> {
    // Get the signal
    const supabase = getServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: signal, error: signalError } = await (supabase as any)
      .from("trading_signals")
      .select("*")
      .eq("id", signalId)
      .single();

    if (signalError || !signal) {
      throw new Error("Signal not found");
    }

    const now = new Date();
    const entryDate = new Date();
    const exitDate = outcome.exitPrice ? now : undefined;

    let returnAmount = 0;
    let returnPercent = 0;
    let outcomeType: SignalOutcomeType = SignalOutcomeType.PENDING;
    let targetHit = false;
    let stopLossHit = false;

    if (outcome.exitPrice) {
      if (
        signal.signal_type === SignalType.BUY ||
        signal.signal_type === SignalType.STRONG_BUY
      ) {
        returnAmount = outcome.exitPrice - outcome.entryPrice;
        returnPercent = (returnAmount / outcome.entryPrice) * 100;
        targetHit = outcome.exitPrice >= signal.target_price;
        stopLossHit = outcome.exitPrice <= signal.stop_loss;
      } else if (
        signal.signal_type === SignalType.SELL ||
        signal.signal_type === SignalType.STRONG_SELL
      ) {
        returnAmount = outcome.entryPrice - outcome.exitPrice;
        returnPercent = (returnAmount / outcome.entryPrice) * 100;
        targetHit = outcome.exitPrice <= signal.target_price;
        stopLossHit = outcome.exitPrice >= signal.stop_loss;
      }

      if (returnAmount > 0.01) outcomeType = SignalOutcomeType.PROFIT;
      else if (returnAmount < -0.01) outcomeType = SignalOutcomeType.LOSS;
      else outcomeType = SignalOutcomeType.BREAKEVEN;
    }

    const holdingPeriod = exitDate
      ? Math.floor(
          (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;

    const signalOutcome: SignalOutcome = {
      id: crypto.randomUUID(),
      signalId,
      userId: signal.user_id,
      symbol: signal.symbol,
      entryPrice: outcome.entryPrice,
      entryDate,
      exitPrice: outcome.exitPrice,
      exitDate,
      performanceMetrics: {
        returnAmount,
        returnPercent,
        holdingPeriod,
        maxDrawdown: 0, // Would need price history to calculate
        maxGain: 0, // Would need price history to calculate
      },
      trackedUntil: exitDate || now,
      outcome: outcomeType,
      targetHit,
      stopLossHit,
      createdAt: now,
      updatedAt: now,
    };

    // Update signal status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Canonical columns. Three of the six names used before did not exist and
    // had real equivalents (exit_price -> outcome_price, closed_at ->
    // outcome_date, actual_return -> outcome_return_percent); `status` was
    // redundant with `outcome`, set in the same statement, so closing the
    // signal now clears `is_active` — the real column that expresses it.
    // entry_price and executed_at are genuinely new (20260731000170): the table
    // recorded how a signal ENDED but never how it BEGAN.
    //
    // The whole UPDATE failed on the first nonexistent name, so no signal
    // outcome was ever persisted — trackSignalOutcome returned its result
    // object to the caller while the row stayed untouched.
    const { error: outcomeError } = await (supabase as any)
      .from("trading_signals")
      .update({
        is_active: false,
        entry_price: outcome.entryPrice,
        outcome_price: outcome.exitPrice,
        executed_at: entryDate.toISOString(),
        outcome_date: exitDate?.toISOString(),
        outcome: outcomeType,
        outcome_return_percent: returnPercent,
      })
      .eq("id", signalId);

    if (outcomeError) {
      throw new Error(
        `Failed to persist signal outcome for ${signalId}: ${outcomeError.message}`,
      );
    }

    return signalOutcome;
  }

  /**
   * Get signal history for a user with advanced filtering
   */
  async getSignalHistory(
    userId: string,
    filters?: Partial<SignalFilters>,
  ): Promise<TradingSignal[]> {
    // Check cache first
    const cacheKey = `signal-history:${userId}:${JSON.stringify(filters || {})}`;
    const cached = await redisCache.get<TradingSignal[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const supabase = getServiceRoleClient();
    let query = supabase
      .from("trading_signals")
      .select("*")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false });

    // Apply filters
    if (filters?.symbols && filters.symbols.length > 0) {
      query = query.in("symbol", filters.symbols);
    }
    if (filters?.signalTypes && filters.signalTypes.length > 0) {
      query = query.in("signal_type", filters.signalTypes);
    }
    if (filters?.statuses && filters.statuses.length > 0) {
      query = query.in("status", filters.statuses);
    }
    if (filters?.assetTypes && filters.assetTypes.length > 0) {
      query = query.in("asset_type", filters.assetTypes);
    }
    if (filters?.minConfidence !== undefined) {
      query = query.gte("confidence", filters.minConfidence);
    }
    if (filters?.minStrength !== undefined) {
      query = query.gte("strength", filters.minStrength);
    }
    if (filters?.startDate) {
      query = query.gte("generated_at", filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte("generated_at", filters.endDate.toISOString());
    }

    // Pagination
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    const signals = (data || []).map(this.mapDbSignalToType);

    // Cache results for 5 minutes
    await redisCache.set(cacheKey, signals, 300);

    return signals;
  }

  /**
   * Get active signals for a user
   */
  async getActiveSignals(userId: string): Promise<TradingSignal[]> {
    return this.getSignalHistory(userId, {
      statuses: [SignalStatus.ACTIVE],
      limit: 50,
    });
  }

  /**
   * Get signal performance metrics
   */
  async getSignalPerformance(
    userId: string,
    period: "week" | "month" | "quarter" | "year" | "all" = "month",
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
    const supabase = getServiceRoleClient();
    const { data: signals, error } = await supabase
      .from("trading_signals")
      .select("*")
      .eq("user_id", userId)
      .gte("generated_at", startDate.toISOString());

    if (error) throw error;

    const allSignals: TradingSignal[] = (signals || []).map(
      this.mapDbSignalToType,
    );
    const executedSignals = allSignals.filter(
      (s: TradingSignal) =>
        s.status === "executed" && s.actualReturn !== undefined,
    );

    const totalSignals = allSignals.length;
    const activeSignals = allSignals.filter(
      (s: TradingSignal) => s.status === "active",
    ).length;
    const expiredSignals = allSignals.filter(
      (s: TradingSignal) => s.status === "expired",
    ).length;

    const winningTrades = executedSignals.filter(
      (s: TradingSignal) => (s.actualReturn || 0) > 0,
    );
    const losingTrades = executedSignals.filter(
      (s: TradingSignal) => (s.actualReturn || 0) < 0,
    );

    const winRate =
      executedSignals.length > 0
        ? (winningTrades.length / executedSignals.length) * 100
        : 0;
    const avgReturn =
      executedSignals.length > 0
        ? executedSignals.reduce(
            (sum: number, s: TradingSignal) => sum + (s.actualReturn || 0),
            0,
          ) / executedSignals.length
        : 0;
    const totalReturn = executedSignals.reduce(
      (sum: number, s: TradingSignal) => sum + (s.actualReturn || 0),
      0,
    );
    const bestTrade =
      executedSignals.length > 0
        ? Math.max(
            ...executedSignals.map((s: TradingSignal) => s.actualReturn || 0),
          )
        : 0;
    const worstTrade =
      executedSignals.length > 0
        ? Math.min(
            ...executedSignals.map((s: TradingSignal) => s.actualReturn || 0),
          )
        : 0;

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
      successRate: winRate, // Renamed from winRate to successRate
      averageReturn: avgReturn, // Renamed from avgReturn to averageReturn
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
    const groups = { buy: [], sell: [], hold: [] } as Record<
      string,
      TradingSignal[]
    >;
    signals.forEach((s) => groups[s.signalType].push(s));

    return {
      buy: this.calculateGroupStats(groups.buy),
      sell: this.calculateGroupStats(groups.sell),
      hold: this.calculateGroupStats(groups.hold),
    };
  }

  private groupByStrength(signals: TradingSignal[]) {
    const groups = { strong: [], moderate: [], weak: [] } as Record<
      string,
      TradingSignal[]
    >;
    signals.forEach((s) => {
      if (s.strength >= 70) groups.strong.push(s);
      else if (s.strength >= 40) groups.moderate.push(s);
      else groups.weak.push(s);
    });

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

    const result: Record<
      string,
      { count: number; successRate: number; winRate: number; avgReturn: number }
    > = {};
    Object.keys(groups).forEach((type) => {
      result[type] = this.calculateGroupStats(groups[type]);
    });

    return result;
  }

  private calculateGroupStats(signals: TradingSignal[]): {
    count: number;
    successRate: number;
    winRate: number;
    avgReturn: number;
  } {
    const count = signals.length;
    if (count === 0)
      return { count: 0, successRate: 0, winRate: 0, avgReturn: 0 };

    const winners = signals.filter((s) => (s.actualReturn || 0) > 0).length;
    const winRate = (winners / count) * 100;
    const avgReturn =
      signals.reduce((sum, s) => sum + (s.actualReturn || 0), 0) / count;

    return { count, successRate: winRate, winRate, avgReturn };
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
      executedAt: dbSignal.executed_at
        ? new Date(dbSignal.executed_at)
        : undefined,
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
