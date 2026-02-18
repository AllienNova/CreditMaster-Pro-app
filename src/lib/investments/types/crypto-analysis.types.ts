/**
 * Cryptocurrency Analysis Type Definitions
 *
 * Phase 5.3.1: Crypto Analysis Module
 * Comprehensive type definitions for cryptocurrency-specific analysis
 * including on-chain metrics, DeFi analytics, tokenomics, and sentiment
 */

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Cryptocurrency categories
 */
export enum CryptoCategory {
  LAYER1 = "layer1",
  LAYER2 = "layer2",
  DEFI = "defi",
  NFT = "nft",
  MEME = "meme",
  STABLECOIN = "stablecoin",
  EXCHANGE = "exchange",
  GAMING = "gaming",
}

/**
 * On-chain data sources
 */
export enum OnChainDataSource {
  ETHEREUM = "ethereum",
  BITCOIN = "bitcoin",
  POLYGON = "polygon",
  BSC = "bsc",
  AVALANCHE = "avalanche",
}

/**
 * DeFi protocol types
 */
export enum DeFiProtocolType {
  DEX = "dex",
  LENDING = "lending",
  YIELD_FARMING = "yield_farming",
  DERIVATIVES = "derivatives",
  INSURANCE = "insurance",
}

// ============================================================================
// ON-CHAIN METRICS
// ============================================================================

/**
 * On-chain network and transaction metrics
 */
export const OnChainMetricsSchema = z.object({
  coinId: z.string(),
  dataSource: z.nativeEnum(OnChainDataSource),
  timestamp: z.date(),

  // Network activity
  networkActivity: z.object({
    activeAddresses24h: z.number().nonnegative(),
    activeAddresses7d: z.number().nonnegative(),
    activeAddresses30d: z.number().nonnegative(),
    newAddresses24h: z.number().nonnegative(),
    addressGrowthRate: z.number(), // Percentage
  }),

  // Transaction metrics
  transactionMetrics: z.object({
    transactionCount24h: z.number().nonnegative(),
    transactionVolume24h: z.number().nonnegative(), // USD value
    averageTransactionValue: z.number().nonnegative(),
    transactionFees24h: z.number().nonnegative(),
    averageFee: z.number().nonnegative(),
  }),

  // Network security (for PoW chains)
  networkSecurity: z
    .object({
      hashRate: z.number().nonnegative().optional(), // For PoW chains
      difficulty: z.number().nonnegative().optional(),
      blockTime: z.number().positive().optional(), // Seconds
      blockHeight: z.number().nonnegative().optional(),
    })
    .optional(),

  // Validator metrics (for PoS chains)
  validatorMetrics: z
    .object({
      totalValidators: z.number().nonnegative().optional(),
      activeValidators: z.number().nonnegative().optional(),
      stakingRatio: z.number().min(0).max(100).optional(), // Percentage
      averageStakingReward: z.number().nonnegative().optional(), // APY
    })
    .optional(),
});

export type OnChainMetrics = z.infer<typeof OnChainMetricsSchema>;

// ============================================================================
// DEFI METRICS
// ============================================================================

/**
 * DeFi protocol specific metrics
 */
export const DeFiMetricsSchema = z.object({
  coinId: z.string(),
  protocolType: z.nativeEnum(DeFiProtocolType).optional(),
  timestamp: z.date(),

  // Total Value Locked
  tvl: z.object({
    current: z.number().nonnegative(),
    change24h: z.number(),
    change7d: z.number(),
    change30d: z.number(),
    rank: z.number().positive().optional(),
  }),

  // Liquidity metrics
  liquidityMetrics: z.object({
    totalLiquidity: z.number().nonnegative(),
    liquidityPools: z.number().nonnegative(),
    topPoolTVL: z.number().nonnegative().optional(),
    averagePoolSize: z.number().nonnegative(),
  }),

  // Yield farming data
  yieldFarming: z
    .object({
      averageAPY: z.number().nonnegative(),
      maxAPY: z.number().nonnegative(),
      totalFarms: z.number().nonnegative(),
      activeFarmers: z.number().nonnegative().optional(),
    })
    .optional(),

  // Protocol revenue
  protocolRevenue: z
    .object({
      revenue24h: z.number().nonnegative(),
      revenue7d: z.number().nonnegative(),
      revenue30d: z.number().nonnegative(),
      fees24h: z.number().nonnegative(),
      protocolFeeShare: z.number().min(0).max(100), // Percentage
    })
    .optional(),
});

export type DeFiMetrics = z.infer<typeof DeFiMetricsSchema>;

// ============================================================================
// TOKENOMICS ANALYSIS
// ============================================================================

/**
 * Token supply and distribution analysis
 */
export const TokenomicsAnalysisSchema = z.object({
  coinId: z.string(),
  timestamp: z.date(),

  // Supply mechanics
  supplyMechanics: z.object({
    totalSupply: z.number().nonnegative(),
    circulatingSupply: z.number().nonnegative(),
    maxSupply: z.number().nonnegative().optional(),
    supplyRatio: z.number().min(0).max(100), // Circulating / Max
    inflationRate: z.number(), // Annual percentage
    burnRate: z.number().nonnegative().optional(), // Tokens burned per year
  }),

  // Distribution
  distribution: z.object({
    top10HoldersPercentage: z.number().min(0).max(100),
    top100HoldersPercentage: z.number().min(0).max(100),
    whaleConcentration: z.number().min(0).max(100), // Percentage held by whales
    retailHolders: z.number().nonnegative(),
    giniCoefficient: z.number().min(0).max(1).optional(), // Wealth inequality
  }),

  // Vesting schedules
  vestingSchedule: z
    .object({
      totalVested: z.number().nonnegative(),
      totalUnlocked: z.number().nonnegative(),
      nextUnlockDate: z.date().optional(),
      nextUnlockAmount: z.number().nonnegative().optional(),
      vestingPeriodMonths: z.number().nonnegative().optional(),
    })
    .optional(),

  // Token utility
  tokenUtility: z.object({
    hasGovernance: z.boolean(),
    hasStaking: z.boolean(),
    hasYieldFarming: z.boolean(),
    hasBuyback: z.boolean(),
    utilityScore: z.number().min(0).max(100), // Overall utility rating
  }),
});

export type TokenomicsAnalysis = z.infer<typeof TokenomicsAnalysisSchema>;

// ============================================================================
// CRYPTO SENTIMENT
// ============================================================================

/**
 * Social and market sentiment analysis
 */
export const CryptoSentimentSchema = z.object({
  coinId: z.string(),
  timestamp: z.date(),

  // Overall sentiment
  overallSentiment: z.enum([
    "very_bearish",
    "bearish",
    "neutral",
    "bullish",
    "very_bullish",
  ]),
  sentimentScore: z.number().min(0).max(100), // 0 = very bearish, 100 = very bullish

  // Fear & Greed Index
  fearGreedIndex: z.object({
    value: z.number().min(0).max(100),
    classification: z.enum([
      "extreme_fear",
      "fear",
      "neutral",
      "greed",
      "extreme_greed",
    ]),
    change24h: z.number(),
  }),

  // Social metrics
  socialMetrics: z.object({
    twitterFollowers: z.number().nonnegative().optional(),
    twitterMentions24h: z.number().nonnegative(),
    redditSubscribers: z.number().nonnegative().optional(),
    redditActiveUsers: z.number().nonnegative().optional(),
    telegramMembers: z.number().nonnegative().optional(),
    githubStars: z.number().nonnegative().optional(),
    githubCommits30d: z.number().nonnegative().optional(),
  }),

  // News sentiment
  newsSentiment: z.object({
    positiveNews: z.number().nonnegative(),
    negativeNews: z.number().nonnegative(),
    neutralNews: z.number().nonnegative(),
    sentimentRatio: z.number(), // Positive / (Positive + Negative)
    topHeadlines: z.array(z.string()).max(5),
  }),

  // Community engagement
  communityEngagement: z.object({
    engagementScore: z.number().min(0).max(100),
    communityGrowth7d: z.number(), // Percentage
    communityGrowth30d: z.number(), // Percentage
    developerActivity: z.enum([
      "very_low",
      "low",
      "moderate",
      "high",
      "very_high",
    ]),
  }),
});

export type CryptoSentiment = z.infer<typeof CryptoSentimentSchema>;

// ============================================================================
// MAIN CRYPTO ANALYSIS
// ============================================================================

/**
 * Complete cryptocurrency analysis result
 */
export const CryptoAnalysisSchema = z.object({
  coinId: z.string(),
  symbol: z.string(),
  name: z.string(),
  category: z.nativeEnum(CryptoCategory),
  timestamp: z.date(),

  // Overall assessment
  overallScore: z.number().min(0).max(100),
  riskLevel: z.enum(["very_low", "low", "moderate", "high", "very_high"]),
  investmentGrade: z.enum([
    "A+",
    "A",
    "A-",
    "B+",
    "B",
    "B-",
    "C+",
    "C",
    "C-",
    "D",
    "F",
  ]),

  // Price and market data
  priceData: z.object({
    currentPrice: z.number().positive(),
    marketCap: z.number().nonnegative(),
    volume24h: z.number().nonnegative(),
    priceChange24h: z.number(),
    priceChange7d: z.number(),
    priceChange30d: z.number(),
    allTimeHigh: z.number().positive(),
    allTimeLow: z.number().positive(),
    athDate: z.date().optional(),
    atlDate: z.date().optional(),
  }),

  // Component analyses
  onChainMetrics: OnChainMetricsSchema.optional(),
  defiMetrics: DeFiMetricsSchema.optional(),
  tokenomics: TokenomicsAnalysisSchema,
  sentiment: CryptoSentimentSchema,

  // Recommendations
  recommendations: z.array(z.string()),
  warnings: z.array(z.string()),

  // Metadata
  metadata: z.object({
    dataQuality: z.number().min(0).max(100), // Percentage of available data
    lastUpdated: z.date(),
    sources: z.array(z.string()),
  }),
});

export type CryptoAnalysis = z.infer<typeof CryptoAnalysisSchema>;
