/**
 * Multi-Asset Analysis Types
 *
 * Type definitions for Forex, Crypto, Options, and Commodities analysis
 */

// ============================================================================
// FOREX TYPES
// ============================================================================

export type ForexPair = string; // e.g., 'EUR/USD', 'GBP/JPY'
export type ForexSession = "sydney" | "tokyo" | "london" | "new_york";
export type EconomicImpact = "low" | "medium" | "high";

export interface ForexAnalysis {
  pair: ForexPair;
  currentRate: number;
  change24h: number;
  changePercent24h: number;
  bid: number;
  ask: number;
  spread: number;

  // Technical analysis
  technicalScore: number; // 0-100
  trend: "bullish" | "bearish" | "neutral";
  support: number[];
  resistance: number[];
  pivotPoints: PivotPoints;

  // Fundamental factors
  economicCalendar: EconomicEvent[];
  centralBankSentiment: CentralBankSentiment;
  interestRateDifferential: number;

  // Market conditions
  volatility: number;
  liquidity: "high" | "medium" | "low";
  activeSession: ForexSession;

  // AI insights
  aiRecommendation: "buy" | "sell" | "hold";
  confidence: number;
  reasoning: string[];

  analyzedAt: Date;
}

export interface PivotPoints {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface EconomicEvent {
  id: string;
  country: string;
  currency: string;
  event: string;
  impact: EconomicImpact;
  forecast?: number;
  previous?: number;
  actual?: number;
  scheduledAt: Date;
}

export interface CentralBankSentiment {
  bank: string;
  stance: "hawkish" | "dovish" | "neutral";
  interestRate: number;
  nextMeetingDate: Date;
  recentStatements: string[];
}

// ============================================================================
// CRYPTO TYPES
// ============================================================================

export type CryptoCategory =
  | "layer1"
  | "layer2"
  | "defi"
  | "nft"
  | "meme"
  | "exchange"
  | "stablecoin";

export interface CryptoAnalysis {
  coinId: string;
  symbol: string;
  name: string;
  category: CryptoCategory;

  // Price data
  currentPrice: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;

  // Performance
  change1h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  ath: number;
  athDate: Date;
  athChangePercent: number;

  // On-chain metrics
  onChainMetrics: OnChainMetrics;

  // DeFi metrics (if applicable)
  defiMetrics?: DeFiMetrics;

  // Tokenomics
  tokenomics: TokenomicsAnalysis;

  // Sentiment
  sentiment: CryptoSentiment;

  // AI analysis
  aiScore: number; // 0-100
  aiRecommendation: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  risks: string[];
  opportunities: string[];

  analyzedAt: Date;
}

export interface OnChainMetrics {
  activeAddresses: number;
  transactionCount: number;
  averageTransactionValue: number;
  hashRate?: number; // For PoW coins
  stakingRatio?: number; // For PoS coins
  whaleConcentration: number; // % held by top 100 addresses
  exchangeInflow: number;
  exchangeOutflow: number;
  netExchangeFlow: number;
}

export interface DeFiMetrics {
  tvl: number; // Total Value Locked
  tvlChange24h: number;
  volume24h: number;
  fees24h: number;
  revenue24h: number;
  users24h: number;
  protocolRevenue: number;
}

export interface OptionsAnalysis {
  symbol: string;
  underlyingSymbol: string;
  underlyingPrice: number;
  optionType: OptionType;
  style: OptionStyle;

  // Contract details
  strikePrice: number;
  expirationDate: Date;
  daysToExpiration: number;
  contractSize: number;

  // Pricing
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;

  // Greeks
  greeks: OptionGreeks;

  // Implied volatility
  impliedVolatility: number;
  ivRank: number; // 0-100
  ivPercentile: number; // 0-100

  // Probability analysis
  probabilityITM: number; // In The Money
  probabilityOTM: number; // Out of The Money
  probabilityProfit: number;

  // Unusual activity
  unusualActivity: UnusualOptionsActivity;

  // AI analysis
  aiRecommendation: "buy" | "sell" | "hold";
  strategy: string; // e.g., 'covered call', 'protective put', 'iron condor'
  riskReward: number;

  analyzedAt: Date;
}

export interface OptionGreeks {
  delta: number; // Price sensitivity to underlying
  gamma: number; // Rate of change of delta
  theta: number; // Time decay
  vega: number; // Volatility sensitivity
  rho: number; // Interest rate sensitivity
}

export interface UnusualOptionsActivity {
  volumeToOIRatio: number; // Volume / Open Interest
  isUnusual: boolean;
  sweepDetected: boolean;
  blockTradesCount: number;
  sentiment: "bullish" | "bearish" | "neutral";
  institutionalFlow: number; // Net premium flow
}

// ============================================================================
// COMMODITIES TYPES
// ============================================================================

export type CommodityType = "energy" | "metals" | "agriculture" | "livestock";
export type CommoditySubtype =
  | "crude_oil"
  | "natural_gas"
  | "gasoline"
  | "gold"
  | "silver"
  | "copper"
  | "platinum"
  | "wheat"
  | "corn"
  | "soybeans"
  | "coffee"
  | "sugar"
  | "cattle"
  | "hogs";

export interface CommodityAnalysis {
  symbol: string;
  name: string;
  type: CommodityType;
  subtype: CommoditySubtype;

  // Price data
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  volume: number;

  // Supply & Demand
  supplyDemand: SupplyDemandAnalysis;

  // Seasonal patterns
  seasonality: SeasonalityAnalysis;

  // Geopolitical factors
  geopoliticalRisks: GeopoliticalRisk[];

  // Technical analysis
  technicalScore: number;
  trend: "bullish" | "bearish" | "neutral";

  // Fundamental factors
  inventoryLevels: number;
  productionRate: number;
  consumptionRate: number;

  // AI insights
  aiRecommendation: "buy" | "sell" | "hold";
  confidence: number;
  priceTarget: number;
  timeframe: "1w" | "1m" | "3m" | "6m";

  analyzedAt: Date;
}

export interface SupplyDemandAnalysis {
  supplyScore: number; // 0-100 (higher = oversupply)
  demandScore: number; // 0-100 (higher = high demand)
  balance: "surplus" | "balanced" | "deficit";
  majorProducers: string[];
  majorConsumers: string[];
  supplyDisruptions: string[];
}

export interface SeasonalityAnalysis {
  currentSeason: string;
  seasonalTrend: "bullish" | "bearish" | "neutral";
  historicalPattern: string;
  peakMonths: string[];
  troughMonths: string[];
}

export interface GeopoliticalRisk {
  region: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  description: string;
  impact: string;
  probability: number; // 0-100
}

// ============================================================================
// UNIFIED MULTI-ASSET ANALYSIS
// ============================================================================

export type MultiAssetType =
  | "stock"
  | "forex"
  | "crypto"
  | "options"
  | "commodity";

export interface MultiAssetAnalysis {
  assetType: MultiAssetType;
  symbol: string;

  // Type-specific analysis (only one will be populated)
  forexAnalysis?: ForexAnalysis;
  cryptoAnalysis?: CryptoAnalysis;
  optionsAnalysis?: OptionsAnalysis;
  commodityAnalysis?: CommodityAnalysis;

  // Common fields
  overallScore: number; // 0-100
  recommendation: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  confidence: number; // 0-100
  riskLevel: "low" | "medium" | "high";

  analyzedAt: Date;
}

export interface TokenomicsAnalysis {
  inflationRate: number;
  emissionSchedule: string;
  vestingSchedule?: VestingSchedule[];
  burnMechanism: boolean;
  stakingRewards?: number;
  distributionFairness: "fair" | "moderate" | "centralized";
}

export interface VestingSchedule {
  beneficiary: string;
  amount: number;
  unlockDate: Date;
  percentOfSupply: number;
}

export interface CryptoSentiment {
  socialScore: number; // 0-100
  twitterMentions24h: number;
  redditPosts24h: number;
  githubCommits30d: number;
  developerActivity: "high" | "medium" | "low";
  communityGrowth: number; // % change in followers
  fearGreedIndex: number; // 0-100
}

// ============================================================================
// OPTIONS TYPES
// ============================================================================

export type OptionType = "call" | "put";
export type OptionStyle = "american" | "european";
