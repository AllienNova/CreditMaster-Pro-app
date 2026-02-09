/**
 * Investment Analysis Engine
 *
 * Unified service that integrates all 6 investment analysis services into a single cohesive API.
 * Provides comprehensive investment analysis by combining technical, fundamental, sentiment,
 * pattern recognition, AI recommendations, and portfolio analysis.
 *
 * @module InvestmentAnalysisEngine
 */

import { getTechnicalAnalysisService } from './TechnicalAnalysisService';
import { getFundamentalAnalysisService } from './FundamentalAnalysisService';
import { getSentimentAnalysisService } from './SentimentAnalysisService';
import { getPatternRecognitionService } from './PatternRecognitionService';
import { getAIRecommendationEngine } from './AIRecommendationEngine';
import { getPortfolioAnalysisService } from './PortfolioAnalysisService';

import type { TechnicalAnalysis } from '../types/technical-analysis.types';
import type { FundamentalAnalysis } from '../types/fundamental-analysis.types';
import type { SentimentAnalysis } from '../types/sentiment-analysis.types';
import type { PatternScanResult } from './PatternRecognitionService';
import type {
  InvestmentRecommendation,
  UserProfile,
  RecommendationAction,
} from './AIRecommendationEngine';
import type { PortfolioHolding, PortfolioMetrics } from './PortfolioAnalysisService';
import type { Timeframe, SignalStrength } from '../types/investment.types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ComprehensiveAnalysis {
  symbol: string;
  analyzedAt: Date;
  currentPrice: number;

  // Individual analysis results
  technical: TechnicalAnalysis;
  fundamental: FundamentalAnalysis;
  sentiment: SentimentAnalysis;
  patterns: PatternScanResult;

  // AI-powered recommendation
  recommendation: InvestmentRecommendation;

  // Composite scoring
  compositeScore: CompositeScore;

  // Correlation analysis
  correlationAnalysis: CorrelationAnalysis;

  // Overall assessment
  overallSignal: SignalStrength;
  overallConfidence: number; // 0-100
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';

  // Actionable insights
  keyInsights: string[];
  risks: string[];
  opportunities: string[];
  summary: string;
}

export interface CompositeScore {
  overall: number; // 0-100
  technical: number; // 0-100
  fundamental: number; // 0-100
  sentiment: number; // 0-100
  pattern: number; // 0-100

  weights: {
    technical: number;
    fundamental: number;
    sentiment: number;
    pattern: number;
  };

  confidence: number; // 0-100
  signal: SignalStrength;
}

export interface CorrelationAnalysis {
  technicalFundamentalAlignment: number; // -1 to 1
  technicalSentimentAlignment: number; // -1 to 1
  fundamentalSentimentAlignment: number; // -1 to 1

  overallAlignment: number; // 0-100
  alignmentLevel: 'strong' | 'moderate' | 'weak' | 'conflicting';

  conflicts: AnalysisConflict[];
  agreements: AnalysisAgreement[];
}

export interface AnalysisConflict {
  sources: string[];
  description: string;
  severity: 'low' | 'medium' | 'high';
  resolution: string;
}

export interface AnalysisAgreement {
  sources: string[];
  description: string;
  strength: 'weak' | 'moderate' | 'strong';
}

export interface PortfolioComprehensiveAnalysis {
  portfolioId: string;
  analyzedAt: Date;

  // Portfolio metrics
  metrics: PortfolioMetrics;

  // Individual holding analyses
  holdingAnalyses: Map<string, ComprehensiveAnalysis>;

  // Portfolio-level insights
  portfolioHealth: number; // 0-100
  diversificationScore: number; // 0-100
  riskScore: number; // 0-100

  // Recommendations
  rebalanceRecommendations: string[];
  positionAdjustments: PositionAdjustment[];

  summary: string;
}

export interface PositionAdjustment {
  symbol: string;
  action: 'increase' | 'decrease' | 'hold' | 'exit';
  currentWeight: number;
  targetWeight: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AnalysisOptions {
  includePatterns?: boolean;
  includeSignals?: boolean;
  includeDCF?: boolean;
  includeComparables?: boolean;
  includeNews?: boolean;
  includeSocial?: boolean;
  userProfile?: UserProfile;
  timeframe?: Timeframe;
}

// ============================================================================
// INVESTMENT ANALYSIS ENGINE
// ============================================================================

/**
 * Unified Investment Analysis Engine
 * Integrates all 6 analysis services into a single cohesive API
 */
export class InvestmentAnalysisEngine {
  // Service instances
  private technicalService = getTechnicalAnalysisService();
  private fundamentalService = getFundamentalAnalysisService();
  private sentimentService = getSentimentAnalysisService();
  private patternService = getPatternRecognitionService();
  private aiEngine = getAIRecommendationEngine();
  private portfolioService = getPortfolioAnalysisService();

  // Default weights for composite scoring
  private readonly defaultWeights = {
    technical: 0.30,
    fundamental: 0.35,
    sentiment: 0.20,
    pattern: 0.15,
  };

  // ============================================================================
  // MAIN ANALYSIS METHOD
  // ============================================================================

  /**
   * Perform comprehensive investment analysis on a symbol
   * Integrates all 6 analysis services into a unified report
   */
  async analyzeInvestment(
    symbol: string,
    currentPrice: number,
    historicalData: { close: number; high: number; low: number; volume: number; timestamp: Date }[],
    options?: AnalysisOptions
  ): Promise<ComprehensiveAnalysis> {
    const {
      includePatterns = true,
      includeSignals = true,
      includeDCF = true,
      includeComparables = true,
      includeNews = true,
      includeSocial = true,
      userProfile,
      timeframe = '1d',
    } = options || {};

    // Run all analyses in parallel for performance
    const [technical, fundamental, sentiment] = await Promise.all([
      this.technicalService.analyzeTechnical(symbol, timeframe, historicalData, {
        includePatterns,
        includeSignals,
      }),
      this.fundamentalService.analyzeFundamentals(symbol, {
        includeDCF,
        includeComparables,
        includeEarnings: true,
        includeSector: true,
      }),
      this.sentimentService.analyzeSentiment(symbol, {
        includeNews,
        includeSocial,
        includeAnalysts: true,
        includeInsiders: true,
        includeInstitutional: true,
        includeMarket: true,
      }),
    ]);

    // Pattern recognition (synchronous)
    const candleData = historicalData.map((d) => ({
      timestamp: d.timestamp.getTime(),
      open: d.close, // Approximation
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));
    const patterns = this.patternService.scanForPatterns(candleData, symbol, timeframe);

    // Generate AI recommendation
    const recommendation = await this.aiEngine.generateRecommendation(
      symbol,
      currentPrice,
      technical,
      {
        peRatio: fundamental.valuation.peRatio,
        pbRatio: fundamental.valuation.pbRatio,
        psRatio: fundamental.valuation.psRatio,
        evToEbitda: fundamental.valuation.evToEbitda,
        evToRevenue: fundamental.valuation.evToRevenue,
        grossMargin: fundamental.profitability.grossMargin,
        operatingMargin: fundamental.profitability.operatingMargin,
        netMargin: fundamental.profitability.netMargin,
        roe: fundamental.profitability.returnOnEquity,
        roic: fundamental.profitability.returnOnInvestedCapital,
      },
      sentiment,
      userProfile
    );

    // Calculate composite score
    const compositeScore = this.calculateCompositeScore(
      technical,
      fundamental,
      sentiment,
      patterns
    );

    // Perform correlation analysis
    const correlationAnalysis = this.analyzeCorrelations(
      technical,
      fundamental,
      sentiment,
      patterns
    );

    // Determine overall signal and confidence
    const { overallSignal, overallConfidence } = this.determineOverallSignal(
      compositeScore,
      correlationAnalysis,
      recommendation
    );

    // Assess risk level
    const riskLevel = this.assessRiskLevel(
      technical,
      fundamental,
      sentiment,
      correlationAnalysis
    );

    // Generate insights
    const keyInsights = this.generateKeyInsights(
      technical,
      fundamental,
      sentiment,
      patterns,
      recommendation
    );

    const risks = this.identifyRisks(technical, fundamental, sentiment, correlationAnalysis);
    const opportunities = this.identifyOpportunities(
      technical,
      fundamental,
      sentiment,
      patterns
    );

    // Generate comprehensive summary
    const summary = this.generateComprehensiveSummary(
      symbol,
      currentPrice,
      compositeScore,
      overallSignal,
      riskLevel,
      keyInsights
    );

    return {
      symbol,
      analyzedAt: new Date(),
      currentPrice,
      technical,
      fundamental,
      sentiment,
      patterns,
      recommendation,
      compositeScore,
      correlationAnalysis,
      overallSignal,
      overallConfidence,
      riskLevel,
      keyInsights,
      risks,
      opportunities,
      summary,
    };
  }

  // ============================================================================
  // PORTFOLIO ANALYSIS
  // ============================================================================

  /**
   * Analyze an entire portfolio with comprehensive analysis for each holding
   */
  async analyzePortfolio(
    portfolioId: string,
    holdings: PortfolioHolding[],
    historicalDataMap: Map<string, { close: number; high: number; low: number; volume: number; timestamp: Date }[]>,
    options?: AnalysisOptions
  ): Promise<PortfolioComprehensiveAnalysis> {
    // Analyze portfolio metrics
    const metrics = this.portfolioService.analyzePortfolio(holdings);

    // Analyze each holding
    const holdingAnalyses = new Map<string, ComprehensiveAnalysis>();

    for (const holding of holdings) {
      const historicalData = historicalDataMap.get(holding.symbol);
      if (historicalData && historicalData.length > 0) {
        try {
          const analysis = await this.analyzeInvestment(
            holding.symbol,
            holding.currentPrice,
            historicalData,
            options
          );
          holdingAnalyses.set(holding.symbol, analysis);
        } catch (_error) {
          // Error logged
        }
      }
    }

    // Calculate portfolio-level scores
    const portfolioHealth = this.calculatePortfolioHealth(metrics, holdingAnalyses);
    const diversificationScore = metrics.diversificationScore;
    const riskScore = this.calculatePortfolioRiskScore(metrics);

    // Generate position adjustments
    const positionAdjustments = this.generatePositionAdjustments(
      holdings,
      holdingAnalyses,
      metrics
    );

    // Generate rebalance recommendations
    const rebalanceRecommendations = this.generateRebalanceRecommendations(
      metrics,
      positionAdjustments
    );

    // Generate portfolio summary
    const summary = this.generatePortfolioSummary(
      portfolioHealth,
      diversificationScore,
      riskScore,
      positionAdjustments
    );

    return {
      portfolioId,
      analyzedAt: new Date(),
      metrics,
      holdingAnalyses,
      portfolioHealth,
      diversificationScore,
      riskScore,
      rebalanceRecommendations,
      positionAdjustments,
      summary,
    };
  }

  // ============================================================================
  // COMPOSITE SCORING
  // ============================================================================

  /**
   * Calculate composite score from all analysis sources
   */
  private calculateCompositeScore(
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    patterns: PatternScanResult
  ): CompositeScore {
    // Convert each analysis to 0-100 score
    const technicalScore = technical.overallScore;
    const fundamentalScore = fundamental.overallScore;
    const sentimentScore = sentiment.compositeSentiment.score;

    // Calculate pattern score based on detected patterns
    const patternScore = this.calculatePatternScore(patterns);

    // Calculate weighted composite
    const overall =
      technicalScore * this.defaultWeights.technical +
      fundamentalScore * this.defaultWeights.fundamental +
      sentimentScore * this.defaultWeights.sentiment +
      patternScore * this.defaultWeights.pattern;

    // Determine signal from composite score
    const signal = this.scoreToSignal(overall);

    // Calculate confidence based on score distribution
    const scores = [technicalScore, fundamentalScore, sentimentScore, patternScore];
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher confidence
    const confidence = Math.max(0, Math.min(100, 100 - stdDev));

    return {
      overall,
      technical: technicalScore,
      fundamental: fundamentalScore,
      sentiment: sentimentScore,
      pattern: patternScore,
      weights: this.defaultWeights,
      confidence,
      signal,
    };
  }

  /**
   * Calculate pattern score from pattern scan results
   */
  private calculatePatternScore(patterns: PatternScanResult): number {
    if (patterns.patterns.length === 0) return 50; // Neutral

    let bullishScore = 0;
    let bearishScore = 0;
    let totalWeight = 0;

    for (const pattern of patterns.patterns) {
      const weight = pattern.reliability / 100;
      totalWeight += weight;

      if (pattern.direction === 'bullish') {
        bullishScore += weight * 100;
      } else if (pattern.direction === 'bearish') {
        bearishScore += weight * 100;
      }
    }

    if (totalWeight === 0) return 50;

    const netScore = (bullishScore - bearishScore) / totalWeight;
    // Convert from -100 to 100 range to 0 to 100 range
    return 50 + netScore / 2;
  }

  /**
   * Convert numeric score to signal strength
   */
  private scoreToSignal(score: number): SignalStrength {
    if (score >= 80) return 'strong_buy';
    if (score >= 60) return 'buy';
    if (score >= 40) return 'neutral';
    if (score >= 20) return 'sell';
    return 'strong_sell';
  }


  // ============================================================================
  // CORRELATION ANALYSIS
  // ============================================================================

  /**
   * Analyze correlations and alignments between different analysis types
   */
  private analyzeCorrelations(
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    patterns: PatternScanResult
  ): CorrelationAnalysis {
    // Calculate pairwise alignments
    const techFundAlignment = this.calculateAlignment(
      technical.overallScore,
      fundamental.overallScore
    );
    const techSentAlignment = this.calculateAlignment(
      technical.overallScore,
      sentiment.compositeSentiment.score
    );
    const fundSentAlignment = this.calculateAlignment(
      fundamental.overallScore,
      sentiment.compositeSentiment.score
    );

    // Calculate overall alignment (average of pairwise alignments)
    const overallAlignment =
      ((techFundAlignment + 1) / 2) * 100 * 0.4 +
      ((techSentAlignment + 1) / 2) * 100 * 0.3 +
      ((fundSentAlignment + 1) / 2) * 100 * 0.3;

    // Determine alignment level
    let alignmentLevel: 'strong' | 'moderate' | 'weak' | 'conflicting';
    if (overallAlignment >= 75) alignmentLevel = 'strong';
    else if (overallAlignment >= 50) alignmentLevel = 'moderate';
    else if (overallAlignment >= 25) alignmentLevel = 'weak';
    else alignmentLevel = 'conflicting';

    // Identify conflicts
    const conflicts = this.identifyConflicts(technical, fundamental, sentiment, patterns);

    // Identify agreements
    const agreements = this.identifyAgreements(technical, fundamental, sentiment, patterns);

    return {
      technicalFundamentalAlignment: techFundAlignment,
      technicalSentimentAlignment: techSentAlignment,
      fundamentalSentimentAlignment: fundSentAlignment,
      overallAlignment,
      alignmentLevel,
      conflicts,
      agreements,
    };
  }

  /**
   * Calculate alignment between two scores (-1 to 1)
   */
  private calculateAlignment(score1: number, score2: number): number {
    // Normalize scores to -1 to 1 range (50 = 0)
    const norm1 = (score1 - 50) / 50;
    const norm2 = (score2 - 50) / 50;

    // Calculate correlation
    return norm1 * norm2;
  }

  /**
   * Identify conflicts between different analyses
   */
  private identifyConflicts(
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    patterns: PatternScanResult
  ): AnalysisConflict[] {
    const conflicts: AnalysisConflict[] = [];

    // Technical vs Fundamental conflict
    if (
      (technical.overallSignal === 'strong_buy' || technical.overallSignal === 'buy') &&
      (fundamental.signal === 'strong_sell' || fundamental.signal === 'sell')
    ) {
      conflicts.push({
        sources: ['Technical Analysis', 'Fundamental Analysis'],
        description: 'Technical indicators suggest buying while fundamentals suggest selling',
        severity: 'high',
        resolution:
          'Consider fundamental analysis for long-term decisions and technical for entry timing',
      });
    }

    // Technical vs Sentiment conflict
    if (
      (technical.overallSignal === 'strong_buy' || technical.overallSignal === 'buy') &&
      sentiment.overallSignal === 'strong_sell'
    ) {
      conflicts.push({
        sources: ['Technical Analysis', 'Sentiment Analysis'],
        description: 'Technical indicators are bullish but market sentiment is very bearish',
        severity: 'medium',
        resolution: 'Negative sentiment may be temporary; monitor for sentiment shifts',
      });
    }

    // Fundamental vs Sentiment conflict
    if (fundamental.signal === 'strong_buy' && sentiment.overallSignal === 'strong_sell') {
      conflicts.push({
        sources: ['Fundamental Analysis', 'Sentiment Analysis'],
        description: 'Strong fundamentals but very negative market sentiment',
        severity: 'medium',
        resolution: 'May present a contrarian opportunity if fundamentals are solid',
      });
    }

    return conflicts;
  }

  /**
   * Identify agreements between different analyses
   */
  private identifyAgreements(
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    patterns: PatternScanResult
  ): AnalysisAgreement[] {
    const agreements: AnalysisAgreement[] = [];

    // All bullish
    if (
      technical.overallScore > 60 &&
      fundamental.overallScore > 60 &&
      sentiment.compositeSentiment.score > 60
    ) {
      agreements.push({
        sources: ['Technical', 'Fundamental', 'Sentiment'],
        description: 'All analyses indicate bullish conditions',
        strength: 'strong',
      });
    }

    // All bearish
    if (
      technical.overallScore < 40 &&
      fundamental.overallScore < 40 &&
      sentiment.compositeSentiment.score < 40
    ) {
      agreements.push({
        sources: ['Technical', 'Fundamental', 'Sentiment'],
        description: 'All analyses indicate bearish conditions',
        strength: 'strong',
      });
    }

    // Technical and patterns agree
    const bullishPatterns = patterns.patterns.filter((p) => p.direction === 'bullish').length;
    const bearishPatterns = patterns.patterns.filter((p) => p.direction === 'bearish').length;

    if (technical.overallScore > 60 && bullishPatterns > bearishPatterns) {
      agreements.push({
        sources: ['Technical', 'Patterns'],
        description: 'Technical indicators and chart patterns both suggest bullish momentum',
        strength: 'moderate',
      });
    }

    return agreements;
  }

  // ============================================================================
  // SIGNAL AND RISK ASSESSMENT
  // ============================================================================

  /**
   * Determine overall signal and confidence
   */
  private determineOverallSignal(
    compositeScore: CompositeScore,
    correlationAnalysis: CorrelationAnalysis,
    recommendation: InvestmentRecommendation
  ): { overallSignal: SignalStrength; overallConfidence: number } {
    // Start with composite signal
    let overallSignal = compositeScore.signal;

    // Adjust confidence based on correlation alignment
    let confidenceAdjustment = 0;
    if (correlationAnalysis.alignmentLevel === 'strong') confidenceAdjustment = 20;
    else if (correlationAnalysis.alignmentLevel === 'moderate') confidenceAdjustment = 10;
    else if (correlationAnalysis.alignmentLevel === 'weak') confidenceAdjustment = -10;
    else confidenceAdjustment = -20; // conflicting

    // Combine composite confidence with AI recommendation confidence
    const baseConfidence = (compositeScore.confidence + recommendation.confidence) / 2;
    const overallConfidence = Math.max(
      0,
      Math.min(100, baseConfidence + confidenceAdjustment)
    );

    // If AI recommendation differs significantly, use the more conservative signal
    // Map RecommendationAction to SignalStrength
    const aiSignal = this.mapRecommendationToSignal(recommendation.action);
    if (aiSignal !== overallSignal) {
      const signals: SignalStrength[] = [
        'strong_sell',
        'sell',
        'neutral',
        'buy',
        'strong_buy',
      ];
      const compositeIndex = signals.indexOf(overallSignal);
      const aiIndex = signals.indexOf(aiSignal);

      // Use the average (more conservative)
      const avgIndex = Math.round((compositeIndex + aiIndex) / 2);
      overallSignal = signals[avgIndex];
    }

    return { overallSignal, overallConfidence };
  }

  /**
   * Map RecommendationAction to SignalStrength
   */
  private mapRecommendationToSignal(action: RecommendationAction): SignalStrength {
    if (action === 'hold') return 'neutral';
    // RecommendationAction and SignalStrength are compatible except for 'hold'
    return action as SignalStrength;
  }

  /**
   * Assess overall risk level
   */
  private assessRiskLevel(
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    correlationAnalysis: CorrelationAnalysis
  ): 'low' | 'moderate' | 'high' | 'very_high' {
    let riskScore = 0;

    // Technical risk (volatility)
    if (technical.volatility.volatilityLevel === 'extreme') riskScore += 30;
    else if (technical.volatility.volatilityLevel === 'high') riskScore += 20;
    else if (technical.volatility.volatilityLevel === 'normal') riskScore += 10;

    // Fundamental risk
    if (fundamental.riskLevel === 'very_high') riskScore += 30;
    else if (fundamental.riskLevel === 'high') riskScore += 20;
    else if (fundamental.riskLevel === 'moderate') riskScore += 10;

    // Sentiment risk (extreme sentiment can be risky)
    const sentScore = sentiment.compositeSentiment.score;
    if (sentScore > 80 || sentScore < 20) riskScore += 20; // Extreme sentiment
    else if (sentScore > 70 || sentScore < 30) riskScore += 10;

    // Correlation risk (conflicting signals increase risk)
    if (correlationAnalysis.alignmentLevel === 'conflicting') riskScore += 20;
    else if (correlationAnalysis.alignmentLevel === 'weak') riskScore += 10;

    // Determine risk level
    if (riskScore >= 60) return 'very_high';
    if (riskScore >= 40) return 'high';
    if (riskScore >= 20) return 'moderate';
    return 'low';
  }


  // ============================================================================
  // INSIGHT GENERATION
  // ============================================================================

  /**
   * Generate key insights from all analyses
   */
  private generateKeyInsights(
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    patterns: PatternScanResult,
    recommendation: InvestmentRecommendation
  ): string[] {
    const insights: string[] = [];

    // Technical insights
    if (technical.trend.shortTerm === 'bullish' && technical.trend.mediumTerm === 'bullish') {
      insights.push('Strong bullish technical trend across multiple timeframes');
    }
    if (technical.momentum.rsiZone === 'oversold') {
      insights.push(`RSI at ${technical.momentum.rsi.toFixed(1)} indicates oversold conditions`);
    }
    if (technical.momentum.rsiZone === 'overbought') {
      insights.push(`RSI at ${technical.momentum.rsi.toFixed(1)} indicates overbought conditions`);
    }

    // Fundamental insights
    if (fundamental.upside > 20) {
      insights.push(
        `Fair value estimate suggests ${fundamental.upside.toFixed(1)}% upside potential`
      );
    }
    if (fundamental.qualityScore > 80) {
      insights.push('High-quality company with strong fundamentals');
    }
    if (fundamental.growthScore > 80) {
      insights.push('Strong growth metrics indicate expanding business');
    }
    if (fundamental.profitability.returnOnEquity > 20) {
      insights.push(`Strong ROE of ${fundamental.profitability.returnOnEquity.toFixed(1)}%`);
    }

    // Sentiment insights
    if (sentiment.compositeSentiment.score > 70) {
      insights.push('Positive market sentiment with bullish investor outlook');
    }
    if (sentiment.compositeSentiment.score < 30) {
      insights.push('Negative market sentiment may present contrarian opportunity');
    }
    if (sentiment.analystConsensus.consensusRating === 'strong_buy') {
      insights.push(
        `Analyst consensus: ${sentiment.analystConsensus.consensusRating.toUpperCase()}`
      );
    }

    // Pattern insights
    const highReliabilityPatterns = patterns.patterns.filter((p) => p.reliability > 70);
    if (highReliabilityPatterns.length > 0) {
      const pattern = highReliabilityPatterns[0];
      insights.push(
        `${pattern.type.replace(/_/g, ' ')} pattern detected with ${pattern.reliability}% reliability`
      );
    }

    // AI recommendation insights
    if (recommendation.confidence > 80) {
      insights.push(
        `AI recommendation: ${recommendation.action.toUpperCase()} with ${recommendation.confidence}% confidence`
      );
    }

    return insights.slice(0, 5); // Return top 5 insights
  }

  /**
   * Identify risks from all analyses
   */
  private identifyRisks(
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    correlationAnalysis: CorrelationAnalysis
  ): string[] {
    const risks: string[] = [];

    // Technical risks
    if (technical.volatility.volatilityLevel === 'extreme') {
      risks.push('Extremely high volatility increases price uncertainty');
    }
    if (technical.trend.strength < 25) {
      risks.push('Weak trend strength suggests indecisive market direction');
    }

    // Fundamental risks
    if (fundamental.leverage.debtToEquity > 2.0) {
      risks.push(`High debt-to-equity ratio of ${fundamental.leverage.debtToEquity.toFixed(2)}`);
    }
    if (fundamental.profitability.netMargin < 0) {
      risks.push('Company is currently unprofitable');
    }
    if (fundamental.riskLevel === 'very_high' || fundamental.riskLevel === 'high') {
      risks.push(`Fundamental risk level: ${fundamental.riskLevel.replace('_', ' ')}`);
    }

    // Sentiment risks
    if (sentiment.compositeSentiment.score > 85) {
      risks.push('Extremely positive sentiment may indicate overenthusiasm');
    }

    // Correlation risks
    if (correlationAnalysis.conflicts.length > 0) {
      risks.push(
        `Conflicting signals between ${correlationAnalysis.conflicts[0].sources.join(' and ')}`
      );
    }

    return risks.slice(0, 5); // Return top 5 risks
  }

  /**
   * Identify opportunities from all analyses
   */
  private identifyOpportunities(
    technical: TechnicalAnalysis,
    fundamental: FundamentalAnalysis,
    sentiment: SentimentAnalysis,
    patterns: PatternScanResult
  ): string[] {
    const opportunities: string[] = [];

    // Technical opportunities
    if (technical.momentum.rsiZone === 'oversold' && technical.trend.longTerm === 'bullish') {
      opportunities.push('Oversold conditions in a long-term uptrend may offer entry opportunity');
    }
    if (technical.supportResistance.supports.length > 0) {
      const strongSupport = technical.supportResistance.supports.find(
        (s) => s.strength === 'strong'
      );
      if (strongSupport) {
        opportunities.push(`Strong support at $${strongSupport.price.toFixed(2)}`);
      }
    }

    // Fundamental opportunities
    if (fundamental.upside > 30 && fundamental.qualityScore > 70) {
      opportunities.push('High-quality stock trading below fair value');
    }
    if (fundamental.growth.revenueGrowthYoY > 20 && fundamental.valuation.peRatio < 20) {
      opportunities.push('Strong growth at reasonable valuation (PEG opportunity)');
    }

    // Sentiment opportunities
    if (sentiment.compositeSentiment.score < 30 && fundamental.overallScore > 70) {
      opportunities.push('Negative sentiment on fundamentally strong company (contrarian play)');
    }

    // Pattern opportunities
    const bullishPatterns = patterns.patterns.filter(
      (p) => p.direction === 'bullish' && p.reliability > 60
    );
    if (bullishPatterns.length > 0 && bullishPatterns[0].priceTarget) {
      opportunities.push(
        `Bullish pattern suggests price target of $${bullishPatterns[0].priceTarget.toFixed(2)}`
      );
    }

    return opportunities.slice(0, 5); // Return top 5 opportunities
  }

  /**
   * Generate comprehensive summary
   */
  private generateComprehensiveSummary(
    symbol: string,
    currentPrice: number,
    compositeScore: CompositeScore,
    overallSignal: SignalStrength,
    riskLevel: string,
    keyInsights: string[]
  ): string {
    const signalText = overallSignal.replace('_', ' ').toUpperCase();
    const scoreText = compositeScore.overall.toFixed(1);

    let summary = `${symbol} is currently trading at $${currentPrice.toFixed(2)}. `;
    summary += `Our comprehensive analysis yields an overall score of ${scoreText}/100, `;
    summary += `indicating a ${signalText} signal with ${riskLevel.replace('_', ' ')} risk. `;

    if (compositeScore.confidence > 70) {
      summary += `We have high confidence (${compositeScore.confidence.toFixed(0)}%) in this assessment. `;
    } else if (compositeScore.confidence < 50) {
      summary += `Confidence is moderate (${compositeScore.confidence.toFixed(0)}%) due to mixed signals. `;
    }

    if (keyInsights.length > 0) {
      summary += `Key insight: ${keyInsights[0]}`;
    }

    return summary;
  }


  // ============================================================================
  // PORTFOLIO HELPER METHODS
  // ============================================================================

  /**
   * Calculate overall portfolio health score
   */
  private calculatePortfolioHealth(
    metrics: PortfolioMetrics,
    holdingAnalyses: Map<string, ComprehensiveAnalysis>
  ): number {
    let healthScore = 50; // Start neutral

    // Performance contribution (+/- 20 points)
    if (metrics.totalGainLossPercent > 20) healthScore += 20;
    else if (metrics.totalGainLossPercent > 10) healthScore += 10;
    else if (metrics.totalGainLossPercent < -20) healthScore -= 20;
    else if (metrics.totalGainLossPercent < -10) healthScore -= 10;

    // Risk-adjusted returns (+/- 15 points)
    if (metrics.sharpeRatio > 2.0) healthScore += 15;
    else if (metrics.sharpeRatio > 1.0) healthScore += 10;
    else if (metrics.sharpeRatio < 0) healthScore -= 15;

    // Diversification (+/- 15 points)
    if (metrics.diversificationScore > 80) healthScore += 15;
    else if (metrics.diversificationScore > 60) healthScore += 10;
    else if (metrics.diversificationScore < 40) healthScore -= 15;

    // Holdings quality (+/- 10 points)
    const avgHoldingScore =
      Array.from(holdingAnalyses.values()).reduce(
        (sum, analysis) => sum + analysis.compositeScore.overall,
        0
      ) / holdingAnalyses.size;

    if (avgHoldingScore > 70) healthScore += 10;
    else if (avgHoldingScore < 40) healthScore -= 10;

    return Math.max(0, Math.min(100, healthScore));
  }

  /**
   * Calculate portfolio risk score
   */
  private calculatePortfolioRiskScore(metrics: PortfolioMetrics): number {
    let riskScore = 0;

    // Volatility risk
    if (metrics.volatility > 0.30) riskScore += 30;
    else if (metrics.volatility > 0.20) riskScore += 20;
    else if (metrics.volatility > 0.15) riskScore += 10;

    // Concentration risk
    if (metrics.concentrationRisk > 0.50) riskScore += 25;
    else if (metrics.concentrationRisk > 0.30) riskScore += 15;

    // Drawdown risk
    if (Math.abs(metrics.maxDrawdown) > 0.30) riskScore += 25;
    else if (Math.abs(metrics.maxDrawdown) > 0.20) riskScore += 15;

    // Diversification (inverse - low diversification = high risk)
    if (metrics.diversificationScore < 40) riskScore += 20;
    else if (metrics.diversificationScore < 60) riskScore += 10;

    return Math.min(100, riskScore);
  }

  /**
   * Generate position adjustment recommendations
   */
  private generatePositionAdjustments(
    holdings: PortfolioHolding[],
    holdingAnalyses: Map<string, ComprehensiveAnalysis>,
    metrics: PortfolioMetrics
  ): PositionAdjustment[] {
    const adjustments: PositionAdjustment[] = [];
    const totalValue = metrics.totalValue;

    for (const holding of holdings) {
      const analysis = holdingAnalyses.get(holding.symbol);
      if (!analysis) continue;

      const currentWeight = (holding.shares * holding.currentPrice) / totalValue;
      let targetWeight = currentWeight;
      let action: 'increase' | 'decrease' | 'hold' | 'exit' = 'hold';
      let reason = '';
      let priority: 'high' | 'medium' | 'low' = 'low';

      // Determine action based on analysis
      if (analysis.overallSignal === 'strong_sell') {
        action = 'exit';
        targetWeight = 0;
        reason = 'Strong sell signal across multiple analyses';
        priority = 'high';
      } else if (analysis.overallSignal === 'sell') {
        action = 'decrease';
        targetWeight = currentWeight * 0.5;
        reason = 'Sell signal suggests reducing exposure';
        priority = 'medium';
      } else if (analysis.overallSignal === 'strong_buy' && currentWeight < 0.15) {
        action = 'increase';
        targetWeight = Math.min(0.15, currentWeight * 1.5);
        reason = 'Strong buy signal with room to increase position';
        priority = 'high';
      } else if (analysis.overallSignal === 'buy' && currentWeight < 0.10) {
        action = 'increase';
        targetWeight = Math.min(0.10, currentWeight * 1.25);
        reason = 'Buy signal suggests increasing position';
        priority = 'medium';
      }

      // Check for concentration risk
      if (currentWeight > 0.20) {
        action = 'decrease';
        targetWeight = 0.15;
        reason = 'Position exceeds 20% concentration limit';
        priority = 'high';
      }

      if (action !== 'hold') {
        adjustments.push({
          symbol: holding.symbol,
          action,
          currentWeight,
          targetWeight,
          reason,
          priority,
        });
      }
    }

    // Sort by priority
    return adjustments.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate rebalance recommendations
   */
  private generateRebalanceRecommendations(
    metrics: PortfolioMetrics,
    positionAdjustments: PositionAdjustment[]
  ): string[] {
    const recommendations: string[] = [];

    // Diversification recommendations
    if (metrics.diversificationScore < 60) {
      recommendations.push(
        'Consider adding holdings in different sectors to improve diversification'
      );
    }

    // Concentration recommendations
    if (metrics.concentrationRisk > 0.30) {
      recommendations.push('Reduce concentration risk by rebalancing overweight positions');
    }

    // Risk recommendations
    if (metrics.volatility > 0.25) {
      recommendations.push('High portfolio volatility - consider adding defensive positions');
    }

    // Position-specific recommendations
    const highPriorityAdjustments = positionAdjustments.filter((a) => a.priority === 'high');
    if (highPriorityAdjustments.length > 0) {
      recommendations.push(
        `${highPriorityAdjustments.length} high-priority position adjustments recommended`
      );
    }

    // Performance recommendations
    if (metrics.sharpeRatio < 0.5) {
      recommendations.push('Low risk-adjusted returns - review underperforming positions');
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Generate portfolio summary
   */
  private generatePortfolioSummary(
    portfolioHealth: number,
    diversificationScore: number,
    riskScore: number,
    positionAdjustments: PositionAdjustment[]
  ): string {
    let summary = `Portfolio health score: ${portfolioHealth.toFixed(0)}/100. `;

    if (portfolioHealth > 75) {
      summary += 'Your portfolio is in excellent condition. ';
    } else if (portfolioHealth > 50) {
      summary += 'Your portfolio is performing adequately. ';
    } else {
      summary += 'Your portfolio needs attention. ';
    }

    summary += `Diversification: ${diversificationScore.toFixed(0)}/100. `;
    summary += `Risk level: ${riskScore.toFixed(0)}/100. `;

    if (positionAdjustments.length > 0) {
      summary += `${positionAdjustments.length} position adjustments recommended.`;
    } else {
      summary += 'No immediate adjustments needed.';
    }

    return summary;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let investmentAnalysisEngineInstance: InvestmentAnalysisEngine | null = null;

/**
 * Get singleton instance of InvestmentAnalysisEngine
 */
export function getInvestmentAnalysisEngine(): InvestmentAnalysisEngine {
  if (!investmentAnalysisEngineInstance) {
    investmentAnalysisEngineInstance = new InvestmentAnalysisEngine();
  }
  return investmentAnalysisEngineInstance;
}



