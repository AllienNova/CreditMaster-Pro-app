/**
 * Trading Signals Types
 *
 * Type definitions for AI-powered trading signal generation and tracking
 * Phase 5.1.1: Enhanced with Zod schemas and additional types
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export enum SignalType {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold',
  STRONG_BUY = 'strong_buy',
  STRONG_SELL = 'strong_sell',
}

export enum SignalStrength {
  STRONG = 'strong',
  MODERATE = 'moderate',
  WEAK = 'weak',
}

export enum AnalysisType {
  TECHNICAL = 'technical',
  FUNDAMENTAL = 'fundamental',
  SENTIMENT = 'sentiment',
  AI_COMBINED = 'ai_combined',
  MOMENTUM = 'momentum',
  MEAN_REVERSION = 'mean_reversion',
}

export enum SignalStatus {
  ACTIVE = 'active',
  EXECUTED = 'executed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum SignalOutcomeType {
  PROFIT = 'profit',
  LOSS = 'loss',
  BREAKEVEN = 'breakeven',
  PENDING = 'pending',
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const SignalTypeSchema = z.nativeEnum(SignalType);
export const SignalStrengthSchema = z.nativeEnum(SignalStrength);
export const AnalysisTypeSchema = z.nativeEnum(AnalysisType);
export const SignalStatusSchema = z.nativeEnum(SignalStatus);
export const SignalOutcomeTypeSchema = z.nativeEnum(SignalOutcomeType);

// ============================================================================
// TRADING SIGNAL
// ============================================================================

export const TradingSignalSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  symbol: z.string().min(1).max(10).toUpperCase(),
  assetType: z.enum(['stock', 'etf', 'crypto', 'option']),
  signalType: SignalTypeSchema,
  strength: z.number().min(0).max(100), // Changed to 0-100 scale
  confidence: z.number().min(0).max(1), // Changed to 0-1 scale
  analysisTypes: z.array(AnalysisTypeSchema),

  // Price information
  currentPrice: z.number().positive(),
  targetPrice: z.number().positive(),
  stopLoss: z.number().positive(),
  entryPrice: z.number().positive().optional(),
  exitPrice: z.number().positive().optional(),

  // Risk/Reward
  potentialGain: z.number(),
  potentialLoss: z.number(),
  riskRewardRatio: z.number().positive(),

  // Reasoning
  reasoning: z.string().min(10),
  technicalFactors: z.array(z.string()),
  fundamentalFactors: z.array(z.string()),
  sentimentFactors: z.array(z.string()),
  aiInsights: z.array(z.string()),

  // Timing
  timeframe: z.enum(['1d', '1w', '1m', '3m', '6m', '1y']),
  expiresAt: z.date(),
  generatedAt: z.date(),
  executedAt: z.date().optional(),
  closedAt: z.date().optional(),

  // Status
  status: SignalStatusSchema,
  outcome: SignalOutcomeTypeSchema.optional(),
  actualReturn: z.number().optional(),

  // Metadata
  modelVersion: z.string(),
  consensusScore: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type TradingSignal = z.infer<typeof TradingSignalSchema>;

// ============================================================================
// SIGNAL ANALYSIS
// ============================================================================

export const SignalAnalysisSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  technicalScore: z.number().min(0).max(100),
  fundamentalScore: z.number().min(0).max(100),
  sentimentScore: z.number().min(0).max(100),
  aiConsensusScore: z.number().min(0).max(100),
  riskAssessment: z.enum(['very_low', 'low', 'moderate', 'high', 'very_high']),

  technicalIndicators: z.object({
    rsi: z.number().min(0).max(100),
    macd: z.object({
      value: z.number(),
      signal: z.number(),
      histogram: z.number(),
    }),
    movingAverages: z.object({
      ma50: z.number().positive(),
      ma200: z.number().positive(),
      price: z.number().positive(),
    }),
    volume: z.object({
      current: z.number().nonnegative(),
      average: z.number().nonnegative(),
      trend: z.enum(['increasing', 'decreasing', 'stable']),
    }),
    trend: z.enum(['bullish', 'bearish', 'neutral']),
  }),

  fundamentalMetrics: z.object({
    peRatio: z.number().optional(),
    pbRatio: z.number().optional(),
    debtToEquity: z.number().optional(),
    roe: z.number().optional(),
    revenueGrowth: z.number().optional(),
    earningsGrowth: z.number().optional(),
    rating: z.enum(['strong_buy', 'buy', 'hold', 'sell', 'strong_sell']),
  }),

  sentimentMetrics: z.object({
    newsScore: z.number().min(0).max(100),
    socialScore: z.number().min(0).max(100),
    analystRating: z.number().min(0).max(100),
    insiderActivity: z.enum(['buying', 'selling', 'neutral']),
    institutionalFlow: z.enum(['inflow', 'outflow', 'neutral']),
  }),

  risks: z.array(z.string()),
  catalysts: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type SignalAnalysis = z.infer<typeof SignalAnalysisSchema>;

// ============================================================================
// SIGNAL OUTCOME TRACKING
// ============================================================================

export const SignalOutcomeSchema = z.object({
  id: z.string().uuid(),
  signalId: z.string().uuid(),
  userId: z.string().uuid(),
  symbol: z.string().min(1).max(10).toUpperCase(),

  // Execution details
  entryPrice: z.number().positive(),
  entryDate: z.date(),
  exitPrice: z.number().positive().optional(),
  exitDate: z.date().optional(),

  // Performance metrics
  performanceMetrics: z.object({
    returnAmount: z.number(),
    returnPercent: z.number(),
    holdingPeriod: z.number().nonnegative(), // days
    maxDrawdown: z.number(),
    maxGain: z.number(),
    sharpeRatio: z.number().optional(),
    volatility: z.number().optional(),
  }),

  // Tracked until
  trackedUntil: z.date(),
  outcome: SignalOutcomeTypeSchema,

  // Comparison to signal
  targetHit: z.boolean(),
  stopLossHit: z.boolean(),

  // User feedback
  userRating: z.number().min(1).max(5).optional(),
  userNotes: z.string().optional(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SignalOutcome = z.infer<typeof SignalOutcomeSchema>;

// ============================================================================
// SIGNAL PERFORMANCE
// ============================================================================

const PerformanceBreakdownSchema = z.object({
  count: z.number().nonnegative(),
  winRate: z.number().min(0).max(100),
  avgReturn: z.number(),
  successRate: z.number().min(0).max(100),
});

export const SignalPerformanceSchema = z.object({
  userId: z.string().uuid(),
  period: z.enum(['week', 'month', 'quarter', 'year', 'all']),

  // Overall metrics
  totalSignals: z.number().nonnegative(),
  activeSignals: z.number().nonnegative(),
  executedSignals: z.number().nonnegative(),
  expiredSignals: z.number().nonnegative(),

  // Performance metrics
  successRate: z.number().min(0).max(100), // percentage of profitable signals
  averageReturn: z.number(), // average return percentage
  totalReturn: z.number(), // total return in dollars
  sharpeRatio: z.number().optional(),
  maxDrawdown: z.number().optional(),

  // Best/Worst
  bestTrade: z.number(),
  worstTrade: z.number(),

  // Breakdowns
  bySignalType: z.object({
    buy: PerformanceBreakdownSchema,
    sell: PerformanceBreakdownSchema,
    hold: PerformanceBreakdownSchema,
    strong_buy: PerformanceBreakdownSchema.optional(),
    strong_sell: PerformanceBreakdownSchema.optional(),
  }),

  byStrength: z.record(PerformanceBreakdownSchema),

  byAssetType: z.record(PerformanceBreakdownSchema),

  // Recent activity
  recentSignals: z.array(TradingSignalSchema).optional(),
  topPerformers: z.array(TradingSignalSchema).optional(),
  worstPerformers: z.array(TradingSignalSchema).optional(),
});

export type SignalPerformance = z.infer<typeof SignalPerformanceSchema>;

// ============================================================================
// SIGNAL FILTERS
// ============================================================================

export const SignalFiltersSchema = z.object({
  symbols: z.array(z.string()).optional(),
  signalTypes: z.array(SignalTypeSchema).optional(),
  statuses: z.array(SignalStatusSchema).optional(),
  assetTypes: z.array(z.enum(['stock', 'etf', 'crypto', 'option'])).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  minStrength: z.number().min(0).max(100).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().positive().max(100).default(20),
  offset: z.number().nonnegative().default(0),
});

export type SignalFilters = z.infer<typeof SignalFiltersSchema>;

