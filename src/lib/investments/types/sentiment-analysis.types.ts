/**
 * Sentiment Analysis Type Definitions
 *
 * Types for news, social media, analyst ratings, and market sentiment
 */

import { SignalStrength } from "./investment.types";

// ============================================================================
// NEWS SENTIMENT
// ============================================================================

export type SentimentScore = -1 | -0.5 | 0 | 0.5 | 1;
export type SentimentLabel =
  | "very_negative"
  | "negative"
  | "neutral"
  | "positive"
  | "very_positive";

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: Date;
  symbols: string[];
  sentiment: SentimentScore;
  sentimentLabel: SentimentLabel;
  relevanceScore: number;
  topics: string[];
  impactLevel: "low" | "medium" | "high";
}

export interface NewsSentiment {
  symbol: string;
  analyzedAt: Date;
  articleCount: number;
  averageSentiment: number;
  sentimentLabel: SentimentLabel;
  sentimentChange24h: number;
  sentimentChange7d: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topPositiveNews: NewsArticle[];
  topNegativeNews: NewsArticle[];
  recentNews: NewsArticle[];
  sentimentTrend: "improving" | "stable" | "declining";
  signal: SignalStrength;
}

// ============================================================================
// SOCIAL MEDIA SENTIMENT
// ============================================================================

export interface SocialMention {
  id: string;
  platform: "twitter" | "reddit" | "stocktwits" | "youtube" | "other";
  content: string;
  author: string;
  authorFollowers?: number;
  publishedAt: Date;
  symbols: string[];
  sentiment: SentimentScore;
  engagement: number;
  reach: number;
  url?: string;
}

export interface SocialSentiment {
  symbol: string;
  analyzedAt: Date;
  mentionCount24h: number;
  mentionCount7d: number;
  mentionChange: number;
  averageSentiment: number;
  sentimentLabel: SentimentLabel;
  platformBreakdown: {
    platform: string;
    mentions: number;
    sentiment: number;
  }[];
  influencerMentions: SocialMention[];
  viralPosts: SocialMention[];
  trendingTopics: string[];
  sentimentTrend: "improving" | "stable" | "declining";
  signal: SignalStrength;
}

// ============================================================================
// ANALYST RATINGS
// ============================================================================

export type AnalystRating =
  | "strong_buy"
  | "buy"
  | "hold"
  | "sell"
  | "strong_sell";

export interface AnalystRecommendation {
  id: string;
  symbol: string;
  firm: string;
  analyst?: string;
  rating: AnalystRating;
  previousRating?: AnalystRating;
  priceTarget: number;
  previousPriceTarget?: number;
  date: Date;
  summary?: string;
}

export interface AnalystConsensus {
  symbol: string;
  calculatedAt: Date;
  totalAnalysts: number;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensusRating: AnalystRating;
  averagePriceTarget: number;
  highPriceTarget: number;
  lowPriceTarget: number;
  medianPriceTarget: number;
  currentPrice: number;
  upside: number;
  recentChanges: AnalystRecommendation[];
  ratingTrend: "upgrading" | "stable" | "downgrading";
  signal: SignalStrength;
}

// ============================================================================
// MARKET SENTIMENT INDICATORS
// ============================================================================

export interface FearGreedIndex {
  value: number;
  label: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
  previousClose: number;
  oneWeekAgo: number;
  oneMonthAgo: number;
  oneYearAgo: number;
  components: {
    name: string;
    value: number;
    weight: number;
    signal: "fear" | "neutral" | "greed";
  }[];
  updatedAt: Date;
}

export interface MarketBreadth {
  advancers: number;
  decliners: number;
  unchanged: number;
  advanceDeclineRatio: number;
  advanceDeclineLine: number;
  newHighs: number;
  newLows: number;
  highLowRatio: number;
  percentAbove50MA: number;
  percentAbove200MA: number;
  mcclellanOscillator: number;
  mcclellanSummation: number;
  breadthSignal: "bullish" | "neutral" | "bearish";
}

export interface VIXData {
  currentValue: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  avg30Day: number;
  percentile: number;
  level: "low" | "normal" | "elevated" | "high" | "extreme";
  signal: SignalStrength;
}

// ============================================================================
// INSIDER TRADING
// ============================================================================

export type InsiderTransactionType = "buy" | "sell" | "exercise" | "gift";

export interface InsiderTransaction {
  id: string;
  symbol: string;
  filingDate: Date;
  transactionDate: Date;
  insiderName: string;
  insiderTitle: string;
  transactionType: InsiderTransactionType;
  shares: number;
  pricePerShare: number;
  totalValue: number;
  sharesOwned: number;
  ownershipChange: number;
}

export interface InsiderActivity {
  symbol: string;
  analyzedAt: Date;
  transactions90Days: InsiderTransaction[];
  totalBuys: number;
  totalSells: number;
  netBuyValue: number;
  netSellValue: number;
  buyersCount: number;
  sellersCount: number;
  insiderSentiment: "bullish" | "neutral" | "bearish";
  significantTransactions: InsiderTransaction[];
  clusterBuying: boolean;
  clusterSelling: boolean;
  signal: SignalStrength;
}

// ============================================================================
// INSTITUTIONAL OWNERSHIP
// ============================================================================

export interface InstitutionalHolder {
  name: string;
  shares: number;
  value: number;
  percentOwnership: number;
  changeShares: number;
  changePercent: number;
  reportDate: Date;
}

export interface InstitutionalOwnership {
  symbol: string;
  totalInstitutionalShares: number;
  totalInstitutionalValue: number;
  institutionalOwnershipPercent: number;
  institutionsCount: number;
  quarterlyChange: number;
  topHolders: InstitutionalHolder[];
  newPositions: InstitutionalHolder[];
  increasedPositions: InstitutionalHolder[];
  decreasedPositions: InstitutionalHolder[];
  soldOut: InstitutionalHolder[];
  ownershipTrend: "increasing" | "stable" | "decreasing";
  signal: SignalStrength;
}

// ============================================================================
// COMPREHENSIVE SENTIMENT ANALYSIS
// ============================================================================

export interface SentimentAnalysis {
  symbol: string;
  analyzedAt: Date;
  newsSentiment: NewsSentiment;
  socialSentiment: SocialSentiment;
  analystConsensus: AnalystConsensus;
  insiderActivity: InsiderActivity;
  institutionalOwnership: InstitutionalOwnership;
  marketSentiment: {
    fearGreed: FearGreedIndex;
    vix: VIXData;
    marketBreadth: MarketBreadth;
  };
  compositeSentiment: {
    score: number;
    label: SentimentLabel;
    components: {
      source: string;
      score: number;
      weight: number;
    }[];
  };
  overallSignal: SignalStrength;
  summary: string;
  keyInsights: string[];
  risks: string[];
  opportunities: string[];
}
