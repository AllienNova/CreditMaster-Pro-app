/**
 * AI Investment Recommendations Type Definitions
 *
 * Types for AI-powered investment analysis and recommendations
 */

import {
  AssetClass,
  SignalStrength,
  RiskLevel,
  Timeframe,
} from "./investment.types";
import { TechnicalAnalysis } from "./technical-analysis.types";
import { FundamentalAnalysis } from "./fundamental-analysis.types";
import { SentimentAnalysis } from "./sentiment-analysis.types";

// ============================================================================
// AI ANALYSIS
// ============================================================================

export interface AIAnalysis {
  symbol: string;
  analyzedAt: Date;
  technical: TechnicalAnalysis;
  fundamental: FundamentalAnalysis;
  sentiment: SentimentAnalysis;
  compositeScore: CompositeScore;
  prediction: PricePrediction;
  recommendation: InvestmentRecommendation;
  risks: RiskAssessment[];
  catalysts: Catalyst[];
  summary: string;
}

export interface CompositeScore {
  overall: number;
  technical: number;
  fundamental: number;
  sentiment: number;
  risk: number;
  weights: {
    technical: number;
    fundamental: number;
    sentiment: number;
    risk: number;
  };
  confidence: number;
  signal: SignalStrength;
}

export interface PricePrediction {
  symbol: string;
  currentPrice: number;
  predictions: {
    timeframe: "1d" | "1w" | "1m" | "3m" | "6m" | "1y";
    targetPrice: number;
    confidence: number;
    upside: number;
    method: "ml_ensemble" | "technical" | "fundamental" | "hybrid";
  }[];
  supportLevels: number[];
  resistanceLevels: number[];
  volatilityForecast: number;
  probabilityUp: number;
  probabilityDown: number;
}

// ============================================================================
// INVESTMENT RECOMMENDATIONS
// ============================================================================

export type RecommendationAction =
  | "strong_buy"
  | "buy"
  | "hold"
  | "sell"
  | "strong_sell"
  | "avoid";
export type PositionType =
  | "long"
  | "short"
  | "options_call"
  | "options_put"
  | "covered_call";

export interface InvestmentRecommendation {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  action: RecommendationAction;
  positionType: PositionType;
  confidence: number;
  timeHorizon:
    | "day_trade"
    | "swing"
    | "short_term"
    | "medium_term"
    | "long_term";
  entryPrice: number;
  entryZone: { low: number; high: number };
  targetPrices: TargetPrice[];
  stopLoss: number;
  stopLossPercent: number;
  riskRewardRatio: number;
  positionSize: PositionSizeRecommendation;
  rationale: string[];
  technicalRationale: string[];
  fundamentalRationale: string[];
  sentimentRationale: string[];
  risks: string[];
  catalysts: string[];
  similarSetups: SimilarSetup[];
  createdAt: Date;
  expiresAt: Date;
  status:
    | "active"
    | "triggered"
    | "stopped"
    | "target_hit"
    | "expired"
    | "cancelled";
}

export interface TargetPrice {
  level: number;
  probability: number;
  percentGain: number;
  takePartialProfit?: boolean;
  profitPercent?: number;
}

export interface PositionSizeRecommendation {
  suggestedSize: number;
  maxSize: number;
  percentOfPortfolio: number;
  dollarRisk: number;
  shares: number;
  reasoning: string;
}

export interface SimilarSetup {
  symbol: string;
  date: Date;
  outcome: "success" | "failure" | "partial";
  returnPercent: number;
  timeToTarget: number;
  similarity: number;
}

// ============================================================================
// RISK ASSESSMENT
// ============================================================================

export interface RiskAssessment {
  type:
    | "market"
    | "company"
    | "sector"
    | "technical"
    | "liquidity"
    | "volatility"
    | "regulatory"
    | "macro";
  level: RiskLevel;
  description: string;
  impact: "low" | "medium" | "high";
  probability: number;
  mitigations: string[];
}

export interface Catalyst {
  type:
    | "earnings"
    | "product"
    | "regulatory"
    | "merger"
    | "macro"
    | "technical"
    | "sentiment";
  description: string;
  expectedDate?: Date;
  impact: "positive" | "negative" | "uncertain";
  magnitude: "low" | "medium" | "high";
  probability: number;
}

// ============================================================================
// PORTFOLIO RECOMMENDATIONS
// ============================================================================

export interface PortfolioRecommendation {
  userId: string;
  generatedAt: Date;
  currentAllocation: AllocationRecommendation[];
  recommendedAllocation: AllocationRecommendation[];
  rebalanceTrades: RebalanceTrade[];
  totalTradesNeeded: number;
  estimatedCost: number;
  taxImplications: TaxImplication[];
  improvementMetrics: {
    expectedReturnChange: number;
    riskChange: number;
    sharpeChange: number;
    diversificationChange: number;
  };
  reasoning: string[];
}

export interface AllocationRecommendation {
  assetClass: AssetClass;
  sector?: string;
  currentWeight: number;
  targetWeight: number;
  difference: number;
  action: "increase" | "decrease" | "maintain";
}

export interface RebalanceTrade {
  symbol: string;
  action: "buy" | "sell";
  quantity: number;
  estimatedPrice: number;
  estimatedValue: number;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface TaxImplication {
  symbol: string;
  gainType: "short_term" | "long_term";
  gainAmount: number;
  estimatedTax: number;
  recommendation: string;
}
