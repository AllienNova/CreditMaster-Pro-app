/**
 * AI Stock Analyst Types
 *
 * Comprehensive type definitions for AI-powered stock analysis
 * including technical, fundamental, and sentiment analysis.
 */

// ============================================================================
// STOCK DATA TYPES
// ============================================================================

export interface StockQuote {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  peRatio: number | null;
  eps: number | null;
  dividend: number | null;
  dividendYield: number | null;
  week52High: number;
  week52Low: number;
  timestamp: Date;
}

export interface StockHistoricalData {
  symbol: string;
  interval: DataInterval;
  data: OHLCV[];
}

export interface OHLCV {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export type DataInterval =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '1d'
  | '1w'
  | '1M';

// ============================================================================
// TECHNICAL ANALYSIS TYPES
// ============================================================================

export interface TechnicalAnalysis {
  symbol: string;
  timestamp: Date;
  indicators: TechnicalIndicators;
  signals: TechnicalSignal[];
  trend: TrendAnalysis;
  support: number[];
  resistance: number[];
  overallSignal: SignalType;
  confidence: number;
}

export interface TechnicalIndicators {
  // Moving Averages
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;

  // Momentum Indicators
  rsi: number;
  macd: MACDData;
  stochastic: StochasticData;

  // Volatility Indicators
  bollingerBands: BollingerBands;
  atr: number;

  // Volume Indicators
  obv: number;
  vwap: number;

  // Trend Indicators
  adx: number;
  cci: number;
}

export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
}

export interface StochasticData {
  k: number;
  d: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export interface TechnicalSignal {
  indicator: string;
  signal: SignalType;
  value: number;
  description: string;
  strength: SignalStrength;
}

export interface TrendAnalysis {
  shortTerm: TrendDirection;
  mediumTerm: TrendDirection;
  longTerm: TrendDirection;
  strength: number;
  description: string;
}

export type SignalType = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
export type SignalStrength = 'weak' | 'moderate' | 'strong';
export type TrendDirection = 'bullish' | 'bearish' | 'neutral';

// ============================================================================
// FUNDAMENTAL ANALYSIS TYPES
// ============================================================================

export interface FundamentalAnalysis {
  symbol: string;
  timestamp: Date;
  valuation: ValuationMetrics;
  profitability: ProfitabilityMetrics;
  growth: GrowthMetrics;
  financial: FinancialHealthMetrics;
  dividend: DividendMetrics;
  comparison: PeerComparison;
  overallRating: FundamentalRating;
  fairValue: FairValueEstimate;
}

export interface ValuationMetrics {
  peRatio: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  evToEbitda: number | null;
  evToRevenue: number | null;
}

export interface ProfitabilityMetrics {
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roa: number;
  roic: number;
}

export interface GrowthMetrics {
  revenueGrowthYoY: number;
  revenueGrowth3Y: number;
  revenueGrowth5Y: number;
  epsGrowthYoY: number;
  epsGrowth3Y: number;
  epsGrowth5Y: number;
  earningsGrowthEstimate: number;
}

export interface FinancialHealthMetrics {
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  debtToAssets: number;
  interestCoverage: number;
  freeCashFlow: number;
  freeCashFlowYield: number;
}

export interface DividendMetrics {
  dividendYield: number;
  dividendPayoutRatio: number;
  dividendGrowth5Y: number;
  yearsOfDividendGrowth: number;
  exDividendDate: Date | null;
  dividendFrequency:
    | 'monthly'
    | 'quarterly'
    | 'semi-annual'
    | 'annual'
    | 'none';
}

export interface PeerComparison {
  sector: string;
  industry: string;
  peers: PeerStock[];
  sectorAvgPE: number;
  sectorAvgPB: number;
  sectorAvgDividendYield: number;
  relativeValuation: 'undervalued' | 'fairly_valued' | 'overvalued';
}

export interface PeerStock {
  symbol: string;
  name: string;
  marketCap: number;
  peRatio: number | null;
  dividendYield: number | null;
}

export type FundamentalRating =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'very_poor';

export interface FairValueEstimate {
  value: number;
  method: 'dcf' | 'comparable' | 'dividend_discount' | 'earnings_multiple';
  upside: number;
  confidence: number;
}

// ============================================================================
// SENTIMENT ANALYSIS TYPES
// ============================================================================

export interface SentimentAnalysis {
  symbol: string;
  timestamp: Date;
  overallSentiment: SentimentScore;
  newsSentiment: NewsSentiment;
  socialSentiment: SocialSentiment;
  analystSentiment: AnalystSentiment;
  insiderActivity: InsiderActivity;
  institutionalActivity: InstitutionalActivity;
}

export interface SentimentScore {
  score: number; // -100 to 100
  label: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
  confidence: number;
}

export interface NewsSentiment {
  score: number;
  articleCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topHeadlines: NewsHeadline[];
  trendingTopics: string[];
}

export interface NewsHeadline {
  title: string;
  source: string;
  url: string;
  publishedAt: Date;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number;
}

export interface SocialSentiment {
  score: number;
  mentionCount: number;
  trendingScore: number;
  platforms: {
    twitter: PlatformSentiment;
    reddit: PlatformSentiment;
    stocktwits: PlatformSentiment;
  };
}

export interface PlatformSentiment {
  score: number;
  mentionCount: number;
  bullishPercent: number;
  bearishPercent: number;
}

export interface AnalystSentiment {
  consensusRating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  targetPrice: number;
  targetPriceHigh: number;
  targetPriceLow: number;
  numberOfAnalysts: number;
  ratingDistribution: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  };
  recentUpgrades: number;
  recentDowngrades: number;
}

export interface InsiderActivity {
  netActivity: 'buying' | 'selling' | 'neutral';
  buyCount: number;
  sellCount: number;
  netShares: number;
  netValue: number;
  recentTransactions: InsiderTransaction[];
}

export interface InsiderTransaction {
  name: string;
  title: string;
  transactionType: 'buy' | 'sell' | 'exercise';
  shares: number;
  price: number;
  value: number;
  date: Date;
}

export interface InstitutionalActivity {
  institutionalOwnership: number;
  institutionalOwnershipChange: number;
  topHolders: InstitutionalHolder[];
  newPositions: number;
  increasedPositions: number;
  decreasedPositions: number;
  soldOutPositions: number;
}

export interface InstitutionalHolder {
  name: string;
  shares: number;
  value: number;
  percentOfPortfolio: number;
  changeInShares: number;
}

// ============================================================================
// COMPREHENSIVE STOCK ANALYSIS
// ============================================================================

export interface ComprehensiveStockAnalysis {
  symbol: string;
  name: string;
  timestamp: Date;
  quote: StockQuote;
  technical: TechnicalAnalysis;
  fundamental: FundamentalAnalysis;
  sentiment: SentimentAnalysis;
  aiAnalysis: AIStockAnalysis;
  riskAssessment: RiskAssessment;
  recommendation: StockRecommendation;
}

export interface AIStockAnalysis {
  summary: string;
  bullCase: string[];
  bearCase: string[];
  keyRisks: string[];
  catalysts: Catalyst[];
  priceTargets: PriceTarget[];
  investmentThesis: string;
  confidenceScore: number;
  analysisModel: string;
  generatedAt: Date;
}

export interface Catalyst {
  type: 'earnings' | 'product' | 'regulatory' | 'macro' | 'technical' | 'other';
  description: string;
  expectedDate?: Date;
  potentialImpact: 'high' | 'medium' | 'low';
  direction: 'positive' | 'negative' | 'uncertain';
}

export interface PriceTarget {
  scenario: 'bull' | 'base' | 'bear';
  price: number;
  probability: number;
  timeframe: string;
  rationale: string;
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  volatilityRisk: RiskLevel;
  liquidityRisk: RiskLevel;
  fundamentalRisk: RiskLevel;
  marketRisk: RiskLevel;
  sectorRisk: RiskLevel;
  beta: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
  riskFactors: RiskFactor[];
}

export type RiskLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

export interface RiskFactor {
  factor: string;
  description: string;
  severity: RiskLevel;
  mitigants: string[];
}

export interface StockRecommendation {
  action: SignalType;
  confidence: number;
  timeHorizon: 'short_term' | 'medium_term' | 'long_term';
  entryPrice?: number;
  targetPrice: number;
  stopLoss?: number;
  positionSize?: number;
  rationale: string[];
  keyMetrics: KeyMetric[];
  warnings: string[];
}

export interface KeyMetric {
  name: string;
  value: string | number;
  interpretation: 'positive' | 'negative' | 'neutral';
  weight: number;
}

// ============================================================================
// MARKET DATA SERVICE TYPES
// ============================================================================

export interface MarketDataProvider {
  name: string;
  priority: number;
  rateLimit: number;
  isAvailable: boolean;
}

export interface MarketDataRequest {
  symbol: string;
  dataType: 'quote' | 'historical' | 'fundamentals' | 'news' | 'options';
  interval?: DataInterval;
  startDate?: Date;
  endDate?: Date;
}

export interface MarketDataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  provider: string;
  timestamp: Date;
  cached: boolean;
}

// ============================================================================
// ANALYSIS REQUEST/RESPONSE TYPES
// ============================================================================

export interface StockAnalysisRequest {
  symbol: string;
  analysisTypes?: AnalysisType[];
  includeAI?: boolean;
  timeframe?: 'short' | 'medium' | 'long';
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
}

export type AnalysisType =
  | 'technical'
  | 'fundamental'
  | 'sentiment'
  | 'risk'
  | 'ai';

export interface StockAnalysisResponse {
  success: boolean;
  data?: ComprehensiveStockAnalysis;
  error?: string;
  processingTime: number;
  dataFreshness: {
    quote: Date;
    technical: Date;
    fundamental: Date;
    sentiment: Date;
  };
}

// ============================================================================
// WATCHLIST AND ALERTS
// ============================================================================

export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  addedAt: Date;
  notes?: string;
  targetPrice?: number;
  alerts: StockAlert[];
  lastAnalysis?: ComprehensiveStockAnalysis;
}

export interface StockAlert {
  id: string;
  type: AlertType;
  condition: AlertCondition;
  value: number;
  isActive: boolean;
  triggeredAt?: Date;
  notificationSent: boolean;
}

export type AlertType =
  | 'price_above'
  | 'price_below'
  | 'percent_change'
  | 'volume_spike'
  | 'rsi_overbought'
  | 'rsi_oversold'
  | 'macd_crossover'
  | 'earnings_date'
  | 'analyst_upgrade'
  | 'analyst_downgrade';

export interface AlertCondition {
  operator: '>' | '<' | '>=' | '<=' | '==' | 'crosses_above' | 'crosses_below';
  threshold: number;
  timeframe?: string;
}
