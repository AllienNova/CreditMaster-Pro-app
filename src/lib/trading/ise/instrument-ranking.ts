/**
 * Instrument Ranking Service
 *
 * Orchestrates the scoring and ranking of instruments across asset classes.
 * Runs on a schedule to produce ranked lists for the rotation engine.
 */

import type {
  Instrument,
  InstrumentFeatures,
  InstrumentPerformance,
  InstrumentRanking,
  RankingRun,
  ScoreBreakdown,
  UserConstraints,
  UserTier,
  AssetClass,
  RegimeType,
} from "./types";
import {
  scoreInstruments,
  explainScore,
  ScoringConfig,
  DEFAULT_SCORING_CONFIG,
} from "./instrument-scoring";

// ============================================================================
// RANKING SERVICE
// ============================================================================

export interface RankingServiceConfig {
  scoringConfig: ScoringConfig;

  // Filters
  minLiquidityScore: number; // Filter out illiquid instruments
  minPCTTReadinessScore: number; // Filter if no PCTT structure

  // Limits
  maxInstrumentsPerClass: number; // Max to rank per asset class
  maxTotalInstruments: number; // Max total to return
}

export const DEFAULT_RANKING_CONFIG: RankingServiceConfig = {
  scoringConfig: DEFAULT_SCORING_CONFIG,
  minLiquidityScore: 0.2,
  minPCTTReadinessScore: 0.3,
  maxInstrumentsPerClass: 50,
  maxTotalInstruments: 100,
};

export class InstrumentRankingService {
  private config: RankingServiceConfig;
  private lastRun: RankingRun | null = null;
  private lastRankings: InstrumentRanking[] = [];

  constructor(config: Partial<RankingServiceConfig> = {}) {
    this.config = { ...DEFAULT_RANKING_CONFIG, ...config };
  }

  /**
   * Run a full ranking cycle
   */
  async rank(params: {
    instruments: Instrument[];
    featuresMap: Map<string, InstrumentFeatures>;
    performanceMap: Map<string, InstrumentPerformance>;
    constraints: UserConstraints;
    tier: UserTier;
    assetClasses?: AssetClass[];
    timeframe?: string;
  }): Promise<{ rankings: InstrumentRanking[]; run: RankingRun }> {
    const startTime = Date.now();
    const {
      instruments,
      featuresMap,
      performanceMap,
      constraints,
      tier,
      assetClasses = constraints.allowedAssetClasses,
      timeframe = "1h",
    } = params;

    // Filter instruments by asset class
    const filteredInstruments = instruments.filter(
      (inst) => assetClasses.includes(inst.assetClass) && inst.isActive,
    );

    // Score all instruments
    const scores = scoreInstruments(
      filteredInstruments,
      featuresMap,
      performanceMap,
      constraints,
      tier,
      this.config.scoringConfig,
    );

    // Apply filters and convert to rankings
    const rankings: InstrumentRanking[] = [];
    let rank = 0;
    let filteredOut = 0;

    for (const score of scores) {
      // Skip if filtered out by user fit (score = 0)
      if (score.total === 0) {
        filteredOut++;
        continue;
      }

      // Apply liquidity filter
      if (score.liquidity < this.config.minLiquidityScore) {
        filteredOut++;
        continue;
      }

      // Apply PCTT readiness filter (for pro/quant tiers)
      if (
        tier !== "beginner" &&
        score.pcttFitness < this.config.minPCTTReadinessScore
      ) {
        filteredOut++;
        continue;
      }

      // Get features for additional context
      const features = featuresMap.get(score.symbol);
      const instrument = filteredInstruments.find(
        (i) => i.symbol === score.symbol,
      );

      if (!features || !instrument) {
        filteredOut++;
        continue;
      }

      rank++;

      rankings.push({
        id: `rank_${Date.now()}_${score.symbol}`,
        runId: `run_${startTime}`,
        instrumentId: score.instrumentId,
        symbol: score.symbol,
        assetClass: instrument.assetClass,
        rank,
        score: score.total,
        scoreBreakdown: score,
        isPCTTReady: this.isPCTTReady(features),
        isLiquidEnough: score.liquidity >= this.config.minLiquidityScore,
        meetsUserConstraints: score.userFit > 0,
        regime: features.regime,
        event: features.event,
        timestamp: new Date(),
      });

      // Enforce max limits
      if (rankings.length >= this.config.maxTotalInstruments) {
        break;
      }
    }

    // Create run metadata
    const run: RankingRun = {
      id: `run_${startTime}`,
      userId: constraints.userId,
      tier,
      assetClasses,
      timeframe,
      totalInstruments: filteredInstruments.length,
      rankedInstruments: rankings.length,
      filteredOut,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };

    // Store for quick access
    this.lastRun = run;
    this.lastRankings = rankings;

    return { rankings, run };
  }

  /**
   * Check if instrument has active PCTT setup
   */
  private isPCTTReady(features: InstrumentFeatures): boolean {
    // Has good Q-score and not in idle state
    return features.qScore >= 0.5 && features.event !== "idle";
  }

  /**
   * Get top N instruments by score
   */
  getTopN(n: number, assetClass?: AssetClass): InstrumentRanking[] {
    let rankings = this.lastRankings;

    if (assetClass) {
      rankings = rankings.filter((r) => r.assetClass === assetClass);
    }

    return rankings.slice(0, n);
  }

  /**
   * Get rankings for specific asset class
   */
  getByAssetClass(assetClass: AssetClass): InstrumentRanking[] {
    return this.lastRankings.filter((r) => r.assetClass === assetClass);
  }

  /**
   * Get ranking for specific symbol
   */
  getBySymbol(symbol: string): InstrumentRanking | undefined {
    return this.lastRankings.find((r) => r.symbol === symbol);
  }

  /**
   * Get PCTT-ready instruments
   */
  getPCTTReady(): InstrumentRanking[] {
    return this.lastRankings.filter((r) => r.isPCTTReady);
  }

  /**
   * Get instruments in specific regime
   */
  getByRegime(regime: RegimeType): InstrumentRanking[] {
    return this.lastRankings.filter((r) => r.regime === regime);
  }

  /**
   * Get last run metadata
   */
  getLastRun(): RankingRun | null {
    return this.lastRun;
  }

  /**
   * Get all rankings from last run
   */
  getAllRankings(): InstrumentRanking[] {
    return [...this.lastRankings];
  }

  /**
   * Generate summary of rankings
   */
  getSummary(): {
    total: number;
    byAssetClass: Record<AssetClass, number>;
    byRegime: Record<RegimeType, number>;
    pcttReady: number;
    topSymbols: string[];
  } {
    const byAssetClass: Record<AssetClass, number> = {
      stocks: 0,
      crypto: 0,
      forex: 0,
      futures: 0,
      options: 0,
    };

    const byRegime: Record<RegimeType, number> = {
      trend_up: 0,
      trend_down: 0,
      range: 0,
      transition: 0,
    };

    for (const r of this.lastRankings) {
      byAssetClass[r.assetClass]++;
      byRegime[r.regime]++;
    }

    return {
      total: this.lastRankings.length,
      byAssetClass,
      byRegime,
      pcttReady: this.lastRankings.filter((r) => r.isPCTTReady).length,
      topSymbols: this.lastRankings.slice(0, 5).map((r) => r.symbol),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RankingServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createRankingService(
  config?: Partial<RankingServiceConfig>,
): InstrumentRankingService {
  return new InstrumentRankingService(config);
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format ranking as table row for display
 */
export function formatRankingRow(ranking: InstrumentRanking): {
  rank: number;
  symbol: string;
  score: string;
  liquidity: string;
  pctt: string;
  opportunity: string;
  regime: string;
  ready: boolean;
} {
  const { scoreBreakdown } = ranking;

  return {
    rank: ranking.rank,
    symbol: ranking.symbol,
    score: `${(ranking.score * 100).toFixed(0)}%`,
    liquidity: `${(scoreBreakdown.liquidity * 100).toFixed(0)}%`,
    pctt: `${(scoreBreakdown.pcttFitness * 100).toFixed(0)}%`,
    opportunity: `${(scoreBreakdown.opportunity * 100).toFixed(0)}%`,
    regime: ranking.regime.replace("_", " "),
    ready: ranking.isPCTTReady,
  };
}

/**
 * Generate agent thoughts for UI
 */
export function generateAgentThoughts(
  rankings: InstrumentRanking[],
  previousActive: string[],
  newActive: string[],
): string[] {
  const thoughts: string[] = [];

  // Identify promotions
  const promoted = newActive.filter((s) => !previousActive.includes(s));
  for (const symbol of promoted) {
    const ranking = rankings.find((r) => r.symbol === symbol);
    if (ranking) {
      const { scoreBreakdown } = ranking;
      thoughts.push(
        `${symbol} promoted → ` +
          `${ranking.regime.replace("_", " ")}, ` +
          `Q:${(scoreBreakdown.pcttDetails.qScore * 100).toFixed(0)}%, ` +
          `Score:${(ranking.score * 100).toFixed(0)}%`,
      );
    }
  }

  // Identify demotions
  const demoted = previousActive.filter((s) => !newActive.includes(s));
  for (const symbol of demoted) {
    thoughts.push(`${symbol} demoted → dropped from active set`);
  }

  // Top opportunity
  if (rankings.length > 0 && thoughts.length === 0) {
    const top = rankings[0];
    thoughts.push(
      `Top opportunity: ${top.symbol} ` +
        `(${top.regime.replace("_", " ")}, ` +
        `Score:${(top.score * 100).toFixed(0)}%)`,
    );
  }

  return thoughts;
}
