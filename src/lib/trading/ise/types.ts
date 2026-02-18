/**
 * Instrument Selection Engine (ISE) Types
 *
 * Types for universe selection, scoring, ranking, and rotation
 * across multiple asset classes (stocks, crypto, forex, futures, options).
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type AssetClass = "stocks" | "crypto" | "forex" | "futures" | "options";

export type UserTier = "beginner" | "pro" | "quant";

export type RegimeType = "trend_up" | "trend_down" | "range" | "transition";

export type RotationEventType =
  | "enter"
  | "exit"
  | "promote"
  | "demote"
  | "cooldown_start"
  | "cooldown_end";

// ============================================================================
// INSTRUMENT TYPES
// ============================================================================

/**
 * Base instrument metadata
 */
export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange?: string;

  // Trading constraints
  minNotional?: number; // Minimum trade value
  lotSize?: number; // Minimum lot/share increment
  tickSize?: number; // Minimum price increment
  multiplier?: number; // Contract multiplier (futures/options)

  // Margin requirements
  marginRequirement?: number; // % margin required
  maxLeverage?: number; // Max allowed leverage

  // Session info (for FX/futures)
  tradingSessions?: TradingSession[];

  // Metadata
  sector?: string;
  industry?: string;
  tags?: string[];

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradingSession {
  name: string; // 'london', 'new_york', 'asia'
  startHourUTC: number;
  endHourUTC: number;
  liquidityScore: number; // 0-1
}

// ============================================================================
// FEATURE TYPES (Time-series data per instrument)
// ============================================================================

/**
 * Snapshot of instrument features at a point in time
 */
export interface InstrumentFeatures {
  id: string;
  instrumentId: string;
  symbol: string;
  timestamp: Date;
  timeframe: string; // '1m', '5m', '1h', '1D', etc.

  // Price data
  price: number;
  priceChange24h: number;
  priceChange7d: number;

  // Volatility & momentum
  atr: number; // Average True Range
  atrPercent: number; // ATR as % of price
  volatility: number; // Rolling volatility
  momentum: number; // Momentum indicator
  momentumZ: number; // Z-scored momentum

  // Trend quality
  efficiencyRatio: number; // 0-1, higher = cleaner trend
  chopIndex: number; // Choppiness index
  trendStrength: number; // ADX or similar

  // PCTT-specific
  qScore: number; // Structure quality score
  regime: RegimeType;
  event: string; // PCTT event state
  distanceToSupport: number; // In ATR units
  distanceToResistance: number;

  // Liquidity
  volume: number;
  volumeZ: number; // Z-scored volume
  adv20: number; // 20-day average daily volume
  spreadEstimate?: number; // Estimated spread as % of price
  spreadAtr?: number; // Spread / ATR

  // Options-specific (if applicable)
  ivRank?: number; // IV percentile
  ivPercentile?: number;

  // Futures-specific
  openInterest?: number;
  rollDays?: number; // Days until roll

  createdAt: Date;
}

// ============================================================================
// PERFORMANCE TYPES (Trade history per instrument)
// ============================================================================

/**
 * Rolling performance metrics per instrument
 */
export interface InstrumentPerformance {
  id: string;
  instrumentId: string;
  symbol: string;
  userId: string;
  strategyId?: string;

  // Trade counts
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;

  // R-multiple metrics
  expectancyR: number; // E[R] - expected R per trade
  averageWinR: number;
  averageLossR: number;
  largestWinR: number;
  largestLossR: number;
  stdDevR: number; // Volatility of R

  // Win rate
  winRate: number; // 0-1
  profitFactor: number; // Gross profit / gross loss

  // Risk metrics
  maxDrawdownR: number; // Max drawdown in R
  calmarRatio: number; // Expectancy / MaxDD
  sharpeR: number; // Sharpe ratio on R

  // Time-based
  avgHoldingPeriod: number; // Minutes
  avgBarsInTrade: number;

  // Streaks
  currentStreak: number; // Positive = wins, negative = losses
  maxWinStreak: number;
  maxLossStreak: number;

  // Recency weighting
  recentExpectancyR: number; // Last N trades expectancy
  recentWinRate: number;

  periodStart: Date;
  periodEnd: Date;
  updatedAt: Date;
}

// ============================================================================
// SCORING TYPES
// ============================================================================

/**
 * Score breakdown for an instrument
 */
export interface ScoreBreakdown {
  instrumentId: string;
  symbol: string;

  // Component scores (0-1)
  liquidity: number; // L_i: Tradability score
  pcttFitness: number; // P_i: PCTT structure quality
  opportunity: number; // O_i: Momentum/opportunity
  realizedEdge: number; // R_i: Historical performance
  userFit: number; // U_i: User constraints fit

  // Weighted total
  total: number;

  // Component details for explainability
  liquidityDetails: {
    volumeScore: number;
    spreadScore: number;
    slippageScore: number;
  };

  pcttDetails: {
    qScore: number;
    regimeScore: number;
    geometryScore: number;
    mtfAlignment?: number;
  };

  opportunityDetails: {
    momentumScore: number;
    trendScore: number;
    breakoutProb?: number;
  };

  edgeDetails: {
    expectancy: number;
    stability: number;
    recency: number;
    confidence: number; // Based on sample size
  };

  timestamp: Date;
}

/**
 * Tier-specific scoring weights
 */
export interface ScoringWeights {
  liquidity: number;
  pcttFitness: number;
  opportunity: number;
  realizedEdge: number;
  userFit: number;
}

export const TIER_WEIGHTS: Record<UserTier, ScoringWeights> = {
  beginner: {
    liquidity: 0.35,
    pcttFitness: 0.25,
    opportunity: 0.2,
    realizedEdge: 0.05,
    userFit: 0.15,
  },
  pro: {
    liquidity: 0.2,
    pcttFitness: 0.35,
    opportunity: 0.25,
    realizedEdge: 0.1,
    userFit: 0.1,
  },
  quant: {
    liquidity: 0.15,
    pcttFitness: 0.25,
    opportunity: 0.2,
    realizedEdge: 0.3,
    userFit: 0.1,
  },
};

// ============================================================================
// RANKING TYPES
// ============================================================================

/**
 * Ranked instrument from a scoring run
 */
export interface InstrumentRanking {
  id: string;
  runId: string; // Batch ID for this ranking run
  instrumentId: string;
  symbol: string;
  assetClass: AssetClass;

  rank: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;

  // Flags
  isPCTTReady: boolean; // Has active PCTT setup
  isLiquidEnough: boolean;
  meetsUserConstraints: boolean;

  // Context
  regime: RegimeType;
  event: string;

  timestamp: Date;
}

/**
 * Ranking run metadata
 */
export interface RankingRun {
  id: string;
  userId: string;
  tier: UserTier;
  assetClasses: AssetClass[];
  timeframe: string;

  totalInstruments: number;
  rankedInstruments: number;
  filteredOut: number;

  duration: number; // Milliseconds
  timestamp: Date;
}

// ============================================================================
// ACTIVE SET & ROTATION TYPES
// ============================================================================

/**
 * Active Trading Set - instruments currently allowed for trading
 */
export interface ActiveInstrumentSet {
  id: string;
  userId: string;
  strategyId?: string;

  // Active instruments (by symbol for quick lookup)
  activeSymbols: string[];
  maxSize: number; // K - max instruments in set

  // Mode
  tier: UserTier;
  autoRotateEnabled: boolean;
  switchAffectsNewTradesOnly: boolean;

  // State tracking per instrument
  instrumentStates: Map<string, ActiveInstrumentState>;

  updatedAt: Date;
}

export interface ActiveInstrumentState {
  symbol: string;
  enteredAt: Date;
  lastScore: number;
  consecutiveRankings: number; // How many times in top K

  // Cooldown tracking
  inCooldown: boolean;
  cooldownUntil?: Date;
  exitReason?: string;
}

/**
 * Rotation configuration
 */
export interface RotationConfig {
  // Hysteresis
  deltaEnter: number; // Score delta to enter (prevent thrashing)
  deltaExit: number; // Score delta to exit

  // Timing
  minDwellMs: number; // Minimum time in active set
  cooldownMs: number; // Cooldown after exit
  evaluationIntervalMs: number;

  // Limits
  maxEntriesPerCycle: number;
  maxExitsPerCycle: number;

  // Behavior
  switchAffectsNewTradesOnly: boolean;
  forceExitOnCriticalRisk: boolean;
}

export const DEFAULT_ROTATION_CONFIG: RotationConfig = {
  deltaEnter: 0.05,
  deltaExit: 0.03,
  minDwellMs: 5 * 60 * 1000, // 5 minutes
  cooldownMs: 15 * 60 * 1000, // 15 minutes
  evaluationIntervalMs: 60 * 1000, // 1 minute
  maxEntriesPerCycle: 2,
  maxExitsPerCycle: 1,
  switchAffectsNewTradesOnly: true,
  forceExitOnCriticalRisk: false,
};

/**
 * Rotation event for audit trail
 */
export interface RotationEvent {
  id: string;
  userId: string;
  symbol: string;
  instrumentId: string;

  eventType: RotationEventType;

  // Context
  scoreBefore?: number;
  scoreAfter?: number;
  rankBefore?: number;
  rankAfter?: number;

  // Reason
  reason: string;
  triggerSource: "auto" | "manual" | "risk_override";

  // State
  activeSetBefore: string[];
  activeSetAfter: string[];

  timestamp: Date;
}

// ============================================================================
// USER CONSTRAINTS
// ============================================================================

/**
 * User-specific trading constraints
 */
export interface UserConstraints {
  userId: string;

  // Capital
  totalBudget: number;
  maxPositionSize: number; // % of portfolio
  maxPositionValue: number; // Absolute $

  // Risk
  maxDailyLoss: number; // %
  maxDrawdown: number; // %
  maxLeverage: number;

  // Instrument filters
  allowedAssetClasses: AssetClass[];
  excludedSymbols: string[];
  excludedSectors?: string[];

  // Liquidity
  minVolume: number;
  maxSpreadPercent: number;

  // Options-specific
  optionsDteMin?: number;
  optionsDteMax?: number;
  optionsDeltaMin?: number;
  optionsDeltaMax?: number;

  // Session preferences (for FX)
  preferredSessions?: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface RankingsResponse {
  rankings: InstrumentRanking[];
  run: RankingRun;
  activeSet: string[];
  timestamp: Date;
}

export interface ActiveSetResponse {
  activeSymbols: string[];
  maxSize: number;
  tier: UserTier;
  autoRotateEnabled: boolean;
  lastRotation?: RotationEvent;
}

export interface RotationDecision {
  shouldRotate: boolean;
  entries: { symbol: string; score: number; reason: string }[];
  exits: { symbol: string; score: number; reason: string }[];
  holds: { symbol: string; score: number }[];
}
