/**
 * Trading Signals Types
 * 
 * Type definitions for AI-powered trading signal generation and tracking
 */

// ============================================================================
// SIGNAL TYPES
// ============================================================================

export type SignalType = 'buy' | 'sell' | 'hold';

export type SignalStrength = 'strong' | 'moderate' | 'weak';

export type AnalysisType = 'technical' | 'fundamental' | 'sentiment' | 'ai_combined';

export type SignalStatus = 'active' | 'executed' | 'expired' | 'cancelled';

export type SignalOutcomeType = 'profit' | 'loss' | 'breakeven' | 'pending';

// ============================================================================
// TRADING SIGNAL
// ============================================================================

export interface TradingSignal {
  id: string;
  userId: string;
  symbol: string;
  assetType: 'stock' | 'etf' | 'crypto' | 'option';
  signalType: SignalType;
  strength: SignalStrength;
  confidence: number; // 0-100
  analysisTypes: AnalysisType[];
  
  // Price information
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  entryPrice?: number;
  exitPrice?: number;
  
  // Risk/Reward
  potentialGain: number;
  potentialLoss: number;
  riskRewardRatio: number;
  
  // Reasoning
  reasoning: string;
  technicalFactors: string[];
  fundamentalFactors: string[];
  sentimentFactors: string[];
  aiInsights: string[];
  
  // Timing
  timeframe: '1d' | '1w' | '1m' | '3m' | '6m' | '1y';
  expiresAt: Date;
  generatedAt: Date;
  executedAt?: Date;
  closedAt?: Date;
  
  // Status
  status: SignalStatus;
  outcome?: SignalOutcomeType;
  actualReturn?: number;
  
  // Metadata
  modelVersion: string;
  consensusScore?: number; // If using multi-model consensus
}

// ============================================================================
// SIGNAL ANALYSIS
// ============================================================================

export interface SignalAnalysis {
  symbol: string;
  technicalScore: number; // 0-100
  fundamentalScore: number; // 0-100
  sentimentScore: number; // 0-100
  overallScore: number; // 0-100
  
  technicalIndicators: {
    rsi: number;
    macd: { value: number; signal: number; histogram: number };
    movingAverages: { ma50: number; ma200: number; price: number };
    volume: { current: number; average: number; trend: 'increasing' | 'decreasing' | 'stable' };
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  
  fundamentalMetrics: {
    peRatio?: number;
    pbRatio?: number;
    debtToEquity?: number;
    roe?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
    rating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  };
  
  sentimentMetrics: {
    newsScore: number;
    socialScore: number;
    analystRating: number;
    insiderActivity: 'buying' | 'selling' | 'neutral';
    institutionalFlow: 'inflow' | 'outflow' | 'neutral';
  };
  
  risks: string[];
  catalysts: string[];
  warnings: string[];
}

// ============================================================================
// SIGNAL OUTCOME TRACKING
// ============================================================================

export interface SignalOutcome {
  signalId: string;
  userId: string;
  symbol: string;
  
  // Execution details
  entryPrice: number;
  entryDate: Date;
  exitPrice?: number;
  exitDate?: Date;
  
  // Performance
  returnAmount: number;
  returnPercent: number;
  holdingPeriod: number; // days
  outcome: SignalOutcomeType;
  
  // Comparison to signal
  targetHit: boolean;
  stopLossHit: boolean;
  maxDrawdown: number;
  maxGain: number;
  
  // User feedback
  userRating?: number; // 1-5
  userNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SIGNAL PERFORMANCE
// ============================================================================

export interface SignalPerformance {
  userId: string;
  period: 'week' | 'month' | 'quarter' | 'year' | 'all';
  
  totalSignals: number;
  activeSignals: number;
  executedSignals: number;
  expiredSignals: number;
  
  winRate: number; // percentage
  avgReturn: number; // percentage
  totalReturn: number; // dollars
  bestTrade: number; // percentage
  worstTrade: number; // percentage
  
  bySignalType: {
    buy: { count: number; winRate: number; avgReturn: number };
    sell: { count: number; winRate: number; avgReturn: number };
    hold: { count: number; winRate: number; avgReturn: number };
  };
  
  byStrength: {
    strong: { count: number; winRate: number; avgReturn: number };
    moderate: { count: number; winRate: number; avgReturn: number };
    weak: { count: number; winRate: number; avgReturn: number };
  };
  
  byAssetType: Record<string, { count: number; winRate: number; avgReturn: number }>;
  
  recentSignals: TradingSignal[];
  topPerformers: TradingSignal[];
  worstPerformers: TradingSignal[];
}

