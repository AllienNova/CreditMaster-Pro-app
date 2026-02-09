/**
 * AI Stock Analyst - Zod Validation Schemas
 *
 * Runtime validation schemas for AI-powered stock analysis
 * Ensures type safety at runtime for API requests and responses
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const AnalysisTypeEnum = z.enum([
  'technical',
  'fundamental',
  'sentiment',
  'comprehensive',
]);

export const RecommendationEnum = z.enum([
  'strong_buy',
  'buy',
  'hold',
  'sell',
  'strong_sell',
]);

export const SignalStrengthEnum = z.enum(['weak', 'moderate', 'strong']);

export const TrendDirectionEnum = z.enum(['bullish', 'bearish', 'neutral']);

export const RiskLevelEnum = z.enum([
  'very_low',
  'low',
  'moderate',
  'high',
  'very_high',
]);

export const FundamentalRatingEnum = z.enum([
  'excellent',
  'good',
  'fair',
  'poor',
  'very_poor',
]);

export const SentimentLabelEnum = z.enum([
  'very_bearish',
  'bearish',
  'neutral',
  'bullish',
  'very_bullish',
]);

export const TimeHorizonEnum = z.enum([
  'short_term',
  'medium_term',
  'long_term',
]);

// ============================================================================
// TECHNICAL ANALYSIS SCHEMAS
// ============================================================================

export const MACDDataSchema = z.object({
  macd: z.number(),
  signal: z.number(),
  histogram: z.number(),
});

export const StochasticDataSchema = z.object({
  k: z.number(),
  d: z.number(),
});

export const BollingerBandsSchema = z.object({
  upper: z.number(),
  middle: z.number(),
  lower: z.number(),
  bandwidth: z.number(),
});

export const TechnicalIndicatorsSchema = z.object({
  sma20: z.number(),
  sma50: z.number(),
  sma200: z.number(),
  ema12: z.number(),
  ema26: z.number(),
  rsi: z.number(),
  macd: MACDDataSchema,
  stochastic: StochasticDataSchema,
  bollingerBands: BollingerBandsSchema,
  atr: z.number(),
  obv: z.number(),
  vwap: z.number(),
  adx: z.number(),
  cci: z.number(),
});

export const TechnicalSignalSchema = z.object({
  indicator: z.string(),
  signal: RecommendationEnum,
  value: z.number(),
  description: z.string(),
  strength: SignalStrengthEnum,
});

export const TrendAnalysisSchema = z.object({
  shortTerm: TrendDirectionEnum,
  mediumTerm: TrendDirectionEnum,
  longTerm: TrendDirectionEnum,
  strength: z.number().min(0).max(100),
  description: z.string(),
});

export const TechnicalAnalysisSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  indicators: TechnicalIndicatorsSchema,
  signals: z.array(TechnicalSignalSchema),
  trend: TrendAnalysisSchema,
  support: z.array(z.number()),
  resistance: z.array(z.number()),
  overallSignal: RecommendationEnum,
  confidence: z.number().min(0).max(100),
});

// ============================================================================
// FUNDAMENTAL ANALYSIS SCHEMAS
// ============================================================================

export const ValuationMetricsSchema = z.object({
  peRatio: z.number().nullable(),
  forwardPE: z.number().nullable(),
  pegRatio: z.number().nullable(),
  priceToBook: z.number().nullable(),
  priceToSales: z.number().nullable(),
  evToEbitda: z.number().nullable(),
  evToRevenue: z.number().nullable(),
});

export const ProfitabilityMetricsSchema = z.object({
  grossMargin: z.number(),
  operatingMargin: z.number(),
  netMargin: z.number(),
  roe: z.number(),
  roa: z.number(),
  roic: z.number(),
});

export const GrowthMetricsSchema = z.object({
  revenueGrowthYoY: z.number(),
  revenueGrowth3Y: z.number(),
  revenueGrowth5Y: z.number(),
  epsGrowthYoY: z.number(),
  epsGrowth3Y: z.number(),
  epsGrowth5Y: z.number(),
  earningsGrowthEstimate: z.number(),
});

export const FinancialHealthMetricsSchema = z.object({
  currentRatio: z.number(),
  quickRatio: z.number(),
  debtToEquity: z.number(),
  debtToAssets: z.number(),
  interestCoverage: z.number(),
  freeCashFlow: z.number(),
  freeCashFlowYield: z.number(),
});

export const DividendMetricsSchema = z.object({
  dividendYield: z.number(),
  dividendPayoutRatio: z.number(),
  dividendGrowth5Y: z.number(),
  yearsOfDividendGrowth: z.number(),
  exDividendDate: z.date().nullable(),
  dividendFrequency: z.enum([
    'monthly',
    'quarterly',
    'semi-annual',
    'annual',
    'none',
  ]),
});

export const PeerStockSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  marketCap: z.number(),
  peRatio: z.number().nullable(),
  dividendYield: z.number().nullable(),
});

export const PeerComparisonSchema = z.object({
  sector: z.string(),
  industry: z.string(),
  peers: z.array(PeerStockSchema),
  sectorAvgPE: z.number(),
  sectorAvgPB: z.number(),
  sectorAvgDividendYield: z.number(),
  relativeValuation: z.enum(['undervalued', 'fairly_valued', 'overvalued']),
});

export const FairValueEstimateSchema = z.object({
  value: z.number(),
  method: z.enum(['dcf', 'comparable', 'dividend_discount', 'earnings_multiple']),
  upside: z.number(),
  confidence: z.number().min(0).max(100),
});

export const FundamentalAnalysisSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  valuation: ValuationMetricsSchema,
  profitability: ProfitabilityMetricsSchema,
  growth: GrowthMetricsSchema,
  financial: FinancialHealthMetricsSchema,
  dividend: DividendMetricsSchema,
  comparison: PeerComparisonSchema,
  overallRating: FundamentalRatingEnum,
  fairValue: FairValueEstimateSchema,
});

// ============================================================================
// SENTIMENT ANALYSIS SCHEMAS
// ============================================================================

export const SentimentScoreSchema = z.object({
  score: z.number().min(-100).max(100),
  label: SentimentLabelEnum,
  confidence: z.number().min(0).max(100),
});

export const NewsHeadlineSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string().url(),
  publishedAt: z.date(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  relevanceScore: z.number().min(0).max(1),
});

export const NewsSentimentSchema = z.object({
  score: z.number().min(-100).max(100),
  articleCount: z.number().int().nonnegative(),
  positiveCount: z.number().int().nonnegative(),
  negativeCount: z.number().int().nonnegative(),
  neutralCount: z.number().int().nonnegative(),
  topHeadlines: z.array(NewsHeadlineSchema),
  trendingTopics: z.array(z.string()),
});

export const PlatformSentimentSchema = z.object({
  score: z.number().min(-100).max(100),
  mentionCount: z.number().int().nonnegative(),
  bullishPercent: z.number().min(0).max(100),
  bearishPercent: z.number().min(0).max(100),
});

export const SocialSentimentSchema = z.object({
  score: z.number().min(-100).max(100),
  mentionCount: z.number().int().nonnegative(),
  trendingScore: z.number().min(0).max(100),
  platforms: z.object({
    twitter: PlatformSentimentSchema,
    reddit: PlatformSentimentSchema,
    stocktwits: PlatformSentimentSchema,
  }),
});

export const AnalystSentimentSchema = z.object({
  consensusRating: RecommendationEnum,
  targetPrice: z.number().positive(),
  targetPriceHigh: z.number().positive(),
  targetPriceLow: z.number().positive(),
  numberOfAnalysts: z.number().int().nonnegative(),
  ratingDistribution: z.object({
    strongBuy: z.number().int().nonnegative(),
    buy: z.number().int().nonnegative(),
    hold: z.number().int().nonnegative(),
    sell: z.number().int().nonnegative(),
    strongSell: z.number().int().nonnegative(),
  }),
  recentUpgrades: z.number().int().nonnegative(),
  recentDowngrades: z.number().int().nonnegative(),
});

export const InsiderTransactionSchema = z.object({
  name: z.string(),
  title: z.string(),
  transactionType: z.enum(['buy', 'sell', 'exercise']),
  shares: z.number().int(),
  price: z.number().positive(),
  value: z.number(),
  date: z.date(),
});

export const InsiderActivitySchema = z.object({
  netActivity: z.enum(['buying', 'selling', 'neutral']),
  buyCount: z.number().int().nonnegative(),
  sellCount: z.number().int().nonnegative(),
  netShares: z.number().int(),
  netValue: z.number(),
  recentTransactions: z.array(InsiderTransactionSchema),
});

export const InstitutionalHolderSchema = z.object({
  name: z.string(),
  shares: z.number().int().nonnegative(),
  value: z.number().nonnegative(),
  percentOfPortfolio: z.number().min(0).max(100),
  changeInShares: z.number().int(),
});

export const InstitutionalActivitySchema = z.object({
  institutionalOwnership: z.number().min(0).max(100),
  institutionalOwnershipChange: z.number(),
  topHolders: z.array(InstitutionalHolderSchema),
  newPositions: z.number().int().nonnegative(),
  increasedPositions: z.number().int().nonnegative(),
  decreasedPositions: z.number().int().nonnegative(),
  soldOutPositions: z.number().int().nonnegative(),
});

export const SentimentAnalysisSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  overallSentiment: SentimentScoreSchema,
  newsSentiment: NewsSentimentSchema,
  socialSentiment: SocialSentimentSchema,
  analystSentiment: AnalystSentimentSchema,
  insiderActivity: InsiderActivitySchema,
  institutionalActivity: InstitutionalActivitySchema,
});

// ============================================================================
// AI ANALYSIS SCHEMAS
// ============================================================================

export const CatalystSchema = z.object({
  type: z.enum(['earnings', 'product', 'regulatory', 'macro', 'technical', 'other']),
  description: z.string(),
  expectedDate: z.date().optional(),
  potentialImpact: z.enum(['high', 'medium', 'low']),
  direction: z.enum(['positive', 'negative', 'uncertain']),
});

export const PriceTargetSchema = z.object({
  scenario: z.enum(['bull', 'base', 'bear']),
  price: z.number().positive(),
  probability: z.number().min(0).max(100),
  timeframe: z.string(),
  rationale: z.string(),
});

export const AIStockAnalysisSchema = z.object({
  summary: z.string(),
  bullCase: z.array(z.string()),
  bearCase: z.array(z.string()),
  keyRisks: z.array(z.string()),
  catalysts: z.array(CatalystSchema),
  priceTargets: z.array(PriceTargetSchema),
  investmentThesis: z.string(),
  confidenceScore: z.number().min(0).max(100),
  analysisModel: z.string(),
  generatedAt: z.date(),
});

export const RiskFactorSchema = z.object({
  factor: z.string(),
  description: z.string(),
  severity: RiskLevelEnum,
  mitigants: z.array(z.string()),
});

export const RiskAssessmentSchema = z.object({
  overallRisk: RiskLevelEnum,
  volatilityRisk: RiskLevelEnum,
  liquidityRisk: RiskLevelEnum,
  fundamentalRisk: RiskLevelEnum,
  marketRisk: RiskLevelEnum,
  sectorRisk: RiskLevelEnum,
  beta: z.number(),
  sharpeRatio: z.number(),
  maxDrawdown: z.number(),
  valueAtRisk: z.number(),
  riskFactors: z.array(RiskFactorSchema),
});

export const KeyMetricSchema = z.object({
  name: z.string(),
  value: z.union([z.string(), z.number()]),
  interpretation: z.enum(['positive', 'negative', 'neutral']),
  weight: z.number().min(0).max(1),
});

export const StockRecommendationSchema = z.object({
  action: RecommendationEnum,
  confidence: z.number().min(0).max(100),
  timeHorizon: TimeHorizonEnum,
  entryPrice: z.number().positive().optional(),
  targetPrice: z.number().positive(),
  stopLoss: z.number().positive().optional(),
  positionSize: z.number().min(0).max(100).optional(),
  rationale: z.array(z.string()),
  keyMetrics: z.array(KeyMetricSchema),
  warnings: z.array(z.string()),
});

// ============================================================================
// REQUEST/RESPONSE SCHEMAS
// ============================================================================

export const StockAnalysisRequestSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  analysisTypes: z.array(AnalysisTypeEnum).optional(),
  includeAI: z.boolean().optional().default(true),
  timeframe: z.enum(['short', 'medium', 'long']).optional().default('medium'),
  riskTolerance: z
    .enum(['conservative', 'moderate', 'aggressive'])
    .optional()
    .default('moderate'),
});

export const AIRecommendationRequestSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  timeHorizon: TimeHorizonEnum.optional().default('medium_term'),
  riskTolerance: z
    .enum(['conservative', 'moderate', 'aggressive'])
    .optional()
    .default('moderate'),
});

// Export type inference helpers
export type AnalysisType = z.infer<typeof AnalysisTypeEnum>;
export type Recommendation = z.infer<typeof RecommendationEnum>;
export type TechnicalAnalysisInput = z.infer<typeof TechnicalAnalysisSchema>;
export type FundamentalAnalysisInput = z.infer<typeof FundamentalAnalysisSchema>;
export type SentimentAnalysisInput = z.infer<typeof SentimentAnalysisSchema>;
export type AIStockAnalysisInput = z.infer<typeof AIStockAnalysisSchema>;
export type StockRecommendationInput = z.infer<typeof StockRecommendationSchema>;
export type StockAnalysisRequestInput = z.infer<typeof StockAnalysisRequestSchema>;
export type AIRecommendationRequestInput = z.infer<typeof AIRecommendationRequestSchema>;

