/**
 * Instrument Selection Engine (ISE)
 * 
 * Universe selection and rotation engine for multi-asset trading.
 * Sits above PCTT to answer:
 * 1. What should I trade right now? (instrument selection)
 * 2. When should I switch from A to B? (instrument rotation)
 */

// Types
export type {
  AssetClass,
  UserTier,
  RegimeType,
  RotationEventType,
  Instrument,
  TradingSession,
  InstrumentFeatures,
  InstrumentPerformance,
  ScoreBreakdown,
  ScoringWeights,
  InstrumentRanking,
  RankingRun,
  ActiveInstrumentSet,
  ActiveInstrumentState,
  RotationConfig,
  RotationEvent,
  RotationDecision,
  UserConstraints,
  RankingsResponse,
  ActiveSetResponse,
} from './types';

export { TIER_WEIGHTS, DEFAULT_ROTATION_CONFIG } from './types';

// Scoring
export {
  scoreInstrument,
  scoreInstruments,
  scoreLiquidity,
  scorePCTTFitness,
  scoreOpportunity,
  scoreRealizedEdge,
  scoreUserFit,
  explainScore,
  DEFAULT_SCORING_CONFIG,
} from './instrument-scoring';

export type { ScoringConfig } from './instrument-scoring';

// Ranking
export {
  InstrumentRankingService,
  createRankingService,
  formatRankingRow,
  generateAgentThoughts,
  DEFAULT_RANKING_CONFIG,
} from './instrument-ranking';

export type { RankingServiceConfig } from './instrument-ranking';

// Rotation
export {
  InstrumentRotationService,
  createRotationService,
  evaluateRotation,
  applyRotation,
  createRotationState,
  explainRotation,
} from './instrument-rotation';

export type { RotationState } from './instrument-rotation';

// Risk Gating
export {
  ISERiskGating,
  createISERiskGating,
  createISETradeValidator,
  DEFAULT_GATING_CONFIG,
} from './ise-risk-gating';

export type {
  TradeGateResult,
  GatingConfig,
  GatingDecision,
} from './ise-risk-gating';
