/**
 * Signal Fusion Service
 * 
 * Combines signals from multiple trading engines:
 * - Rule-based engine
 * - ML engine  
 * - LLM engine
 * - Technical analysis
 * 
 * Uses weighted consensus to generate final trading decisions.
 */

// ============================================================================
// TYPES
// ============================================================================

export type SignalAction = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' | 'no_action';
export type SignalSource = 'rule_based' | 'ml' | 'llm' | 'technical';

export interface RuleSignal {
  ruleId: string;
  ruleName: string;
  type: 'entry' | 'exit';
  symbol: string;
  side: 'buy' | 'sell' | 'close';
  price: number;
  timestamp: Date;
  confidence: number;
}

export interface MLPrediction {
  symbol: string;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  predictedReturn?: number;
  predictedVolatility?: number;
  featureImportance: Record<string, number>;
  modelVersion: string;
}

export interface LLMAnalysis {
  overallSignal: SignalAction;
  confidence: number;
  recommendation: 'execute' | 'wait' | 'skip';
  signalQuality: {
    technical: number;
    fundamental: number;
    sentiment: number;
    overall: number;
  };
  conflicts: { signal1: string; signal2: string; resolution: string }[];
  considerations: string[];
  riskFactors: string[];
  rationale: string;
}

export interface TechnicalSignal {
  symbol: string;
  indicator: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  value: number;
  threshold?: number;
}

export interface FusedSignal {
  id: string;
  symbol: string;
  timestamp: Date;
  
  // Final recommendation
  action: SignalAction;
  confidence: number;
  
  // Component contributions
  contributions: {
    ruleBasedWeight: number;
    ruleBasedSignal: number;
    mlWeight: number;
    mlSignal: number;
    llmWeight: number;
    llmSignal: number;
    technicalWeight: number;
    technicalSignal: number;
  };
  
  // Consensus metrics
  consensus: {
    agreementLevel: number;
    conflictingSignals: boolean;
    dominantSource: SignalSource;
  };
  
  // Trade parameters
  tradeParams?: {
    entryPrice: number;
    stopLoss: number;
    targets: number[];
    positionSizePercent: number;
    trailingStopConfig?: {
      type: string;
      distance: number;
    };
  };
  
  // Metadata
  metadata: {
    processingTimeMs: number;
    sourcesUsed: SignalSource[];
    dataFreshness: Date;
  };
}

export interface AdaptiveWeights {
  ruleBased: number;
  ml: number;
  llm: number;
  technical: number;
}

export interface FusionInput {
  symbol: string;
  ruleBasedSignals?: RuleSignal[];
  mlPrediction?: MLPrediction;
  llmAnalysis?: LLMAnalysis;
  technicalSignals?: TechnicalSignal[];
  currentPrice: number;
}

// ============================================================================
// SIGNAL FUSION SERVICE
// ============================================================================

export class SignalFusionService {
  private weights: AdaptiveWeights = {
    ruleBased: 0.25,
    ml: 0.30,
    llm: 0.25,
    technical: 0.20,
  };

  private recentPerformance: Map<SignalSource, { wins: number; total: number }> = new Map();

  constructor(initialWeights?: Partial<AdaptiveWeights>) {
    if (initialWeights) {
      this.weights = { ...this.weights, ...initialWeights };
    }
    
    // Initialize performance tracking
    this.recentPerformance.set('rule_based', { wins: 0, total: 0 });
    this.recentPerformance.set('ml', { wins: 0, total: 0 });
    this.recentPerformance.set('llm', { wins: 0, total: 0 });
    this.recentPerformance.set('technical', { wins: 0, total: 0 });
  }

  // ============================================================================
  // MAIN FUSION METHOD
  // ============================================================================

  async fuseSignals(input: FusionInput): Promise<FusedSignal> {
    const startTime = Date.now();
    const sourcesUsed: SignalSource[] = [];

    // Normalize all signals to -1 to 1 scale
    let ruleBasedScore = 0;
    let mlScore = 0;
    let llmScore = 0;
    let technicalScore = 0;

    if (input.ruleBasedSignals?.length) {
      ruleBasedScore = this.normalizeRuleSignals(input.ruleBasedSignals);
      sourcesUsed.push('rule_based');
    }

    if (input.mlPrediction) {
      mlScore = this.normalizeMLPrediction(input.mlPrediction);
      sourcesUsed.push('ml');
    }

    if (input.llmAnalysis) {
      llmScore = this.normalizeLLMAnalysis(input.llmAnalysis);
      sourcesUsed.push('llm');
    }

    if (input.technicalSignals?.length) {
      technicalScore = this.normalizeTechnicalSignals(input.technicalSignals);
      sourcesUsed.push('technical');
    }

    // Adjust weights based on available sources
    const activeWeights = this.getActiveWeights(sourcesUsed);

    // Calculate weighted average
    const weightedScore = 
      ruleBasedScore * activeWeights.ruleBased +
      mlScore * activeWeights.ml +
      llmScore * activeWeights.llm +
      technicalScore * activeWeights.technical;

    // Calculate agreement level
    const scores = [ruleBasedScore, mlScore, llmScore, technicalScore].filter((_, i) => {
      const sources: SignalSource[] = ['rule_based', 'ml', 'llm', 'technical'];
      return sourcesUsed.includes(sources[i]);
    });
    const agreementLevel = this.calculateAgreement(scores);

    // Calculate confidence
    const confidence = this.calculateConfidence(weightedScore, agreementLevel);

    // Determine action
    const action = this.scoreToAction(weightedScore, confidence);

    // Find dominant source
    const dominantSource = this.findDominantSource(
      { ruleBased: ruleBasedScore, ml: mlScore, llm: llmScore, technical: technicalScore },
      activeWeights
    );

    // Calculate trade parameters if actionable
    let tradeParams: FusedSignal['tradeParams'];
    if (action !== 'hold' && action !== 'no_action') {
      tradeParams = this.calculateTradeParams(input, action, confidence);
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      id: crypto.randomUUID(),
      symbol: input.symbol,
      timestamp: new Date(),
      action,
      confidence,
      contributions: {
        ruleBasedWeight: activeWeights.ruleBased,
        ruleBasedSignal: ruleBasedScore,
        mlWeight: activeWeights.ml,
        mlSignal: mlScore,
        llmWeight: activeWeights.llm,
        llmSignal: llmScore,
        technicalWeight: activeWeights.technical,
        technicalSignal: technicalScore,
      },
      consensus: {
        agreementLevel,
        conflictingSignals: agreementLevel < 0.5,
        dominantSource,
      },
      tradeParams,
      metadata: {
        processingTimeMs,
        sourcesUsed,
        dataFreshness: new Date(),
      },
    };
  }

  // ============================================================================
  // NORMALIZATION METHODS
  // ============================================================================

  private normalizeRuleSignals(signals: RuleSignal[]): number {
    if (signals.length === 0) return 0;

    let totalScore = 0;
    for (const signal of signals) {
      const direction = signal.side === 'buy' ? 1 : signal.side === 'sell' ? -1 : 0;
      totalScore += direction * signal.confidence;
    }

    return Math.max(-1, Math.min(1, totalScore / signals.length));
  }

  private normalizeMLPrediction(prediction: MLPrediction): number {
    const direction = prediction.signal === 'buy' ? 1 : prediction.signal === 'sell' ? -1 : 0;
    return direction * prediction.confidence;
  }

  private normalizeLLMAnalysis(analysis: LLMAnalysis): number {
    const actionToScore: Record<SignalAction, number> = {
      strong_buy: 1.0,
      buy: 0.5,
      hold: 0,
      sell: -0.5,
      strong_sell: -1.0,
      no_action: 0,
    };

    return actionToScore[analysis.overallSignal] * analysis.confidence;
  }

  private normalizeTechnicalSignals(signals: TechnicalSignal[]): number {
    if (signals.length === 0) return 0;

    let totalScore = 0;
    for (const signal of signals) {
      const direction = signal.signal === 'bullish' ? 1 : signal.signal === 'bearish' ? -1 : 0;
      totalScore += direction * (signal.strength / 100);
    }

    return Math.max(-1, Math.min(1, totalScore / signals.length));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getActiveWeights(sources: SignalSource[]): AdaptiveWeights {
    const activeWeights: AdaptiveWeights = {
      ruleBased: sources.includes('rule_based') ? this.weights.ruleBased : 0,
      ml: sources.includes('ml') ? this.weights.ml : 0,
      llm: sources.includes('llm') ? this.weights.llm : 0,
      technical: sources.includes('technical') ? this.weights.technical : 0,
    };

    // Normalize to sum to 1
    const total = Object.values(activeWeights).reduce((a, b) => a + b, 0);
    if (total > 0) {
      activeWeights.ruleBased /= total;
      activeWeights.ml /= total;
      activeWeights.llm /= total;
      activeWeights.technical /= total;
    }

    return activeWeights;
  }

  private calculateAgreement(scores: number[]): number {
    if (scores.length < 2) return 1;

    // Calculate variance of scores
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;

    // Convert variance to agreement (0-1 scale)
    // Max variance is 1 (when scores are -1 and 1)
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private calculateConfidence(weightedScore: number, agreementLevel: number): number {
    // Confidence is based on:
    // 1. Strength of weighted score (how far from 0)
    // 2. Agreement level between sources
    const scoreStrength = Math.abs(weightedScore);
    return scoreStrength * 0.6 + agreementLevel * 0.4;
  }

  private scoreToAction(score: number, confidence: number): SignalAction {
    // Require minimum confidence for action
    if (confidence < 0.3) return 'no_action';

    if (score >= 0.7) return 'strong_buy';
    if (score >= 0.3) return 'buy';
    if (score <= -0.7) return 'strong_sell';
    if (score <= -0.3) return 'sell';
    return 'hold';
  }

  private findDominantSource(
    scores: Record<string, number>,
    weights: AdaptiveWeights
  ): SignalSource {
    const contributions = {
      rule_based: Math.abs(scores.ruleBased) * weights.ruleBased,
      ml: Math.abs(scores.ml) * weights.ml,
      llm: Math.abs(scores.llm) * weights.llm,
      technical: Math.abs(scores.technical) * weights.technical,
    };

    let maxSource: SignalSource = 'ml';
    let maxContribution = 0;

    for (const [source, contribution] of Object.entries(contributions)) {
      if (contribution > maxContribution) {
        maxContribution = contribution;
        maxSource = source as SignalSource;
      }
    }

    return maxSource;
  }

  private calculateTradeParams(
    input: FusionInput,
    action: SignalAction,
    confidence: number
  ): FusedSignal['tradeParams'] {
    const { currentPrice } = input;
    const isBuy = action === 'buy' || action === 'strong_buy';
    
    // Base ATR estimate (2% of price)
    const atr = currentPrice * 0.02;
    
    // Stop loss: 1.5 ATR
    const stopLoss = isBuy 
      ? currentPrice - atr * 1.5
      : currentPrice + atr * 1.5;
    
    // Targets: 1:2 and 1:3 risk/reward
    const riskAmount = Math.abs(currentPrice - stopLoss);
    const targets = isBuy
      ? [currentPrice + riskAmount * 2, currentPrice + riskAmount * 3]
      : [currentPrice - riskAmount * 2, currentPrice - riskAmount * 3];
    
    // Position size based on confidence (1-5% of portfolio)
    const positionSizePercent = Math.min(5, Math.max(1, confidence * 5));

    return {
      entryPrice: currentPrice,
      stopLoss,
      targets,
      positionSizePercent,
      trailingStopConfig: {
        type: 'atr',
        distance: 2, // 2x ATR
      },
    };
  }

  // ============================================================================
  // WEIGHT ADJUSTMENT
  // ============================================================================

  recordOutcome(source: SignalSource, wasSuccessful: boolean): void {
    const perf = this.recentPerformance.get(source);
    if (perf) {
      perf.total++;
      if (wasSuccessful) perf.wins++;
      
      // Keep only last 100 trades
      if (perf.total > 100) {
        const winRate = perf.wins / perf.total;
        perf.wins = Math.round(winRate * 50);
        perf.total = 50;
      }
    }
  }

  adjustWeights(): void {
    const performances: Record<SignalSource, number> = {
      rule_based: 0.5,
      ml: 0.5,
      llm: 0.5,
      technical: 0.5,
    };

    // Calculate win rates
    for (const [source, perf] of this.recentPerformance) {
      if (perf.total >= 10) {
        performances[source] = perf.wins / perf.total;
      }
    }

    // Adjust weights based on performance
    const total = Object.values(performances).reduce((a, b) => a + b, 0);
    
    this.weights.ruleBased = performances.rule_based / total;
    this.weights.ml = performances.ml / total;
    this.weights.llm = performances.llm / total;
    this.weights.technical = performances.technical / total;
  }

  getWeights(): AdaptiveWeights {
    return { ...this.weights };
  }

  setWeights(weights: Partial<AdaptiveWeights>): void {
    this.weights = { ...this.weights, ...weights };
    
    // Normalize
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    this.weights.ruleBased /= total;
    this.weights.ml /= total;
    this.weights.llm /= total;
    this.weights.technical /= total;
  }
}

// Export singleton
export const signalFusionService = new SignalFusionService();
