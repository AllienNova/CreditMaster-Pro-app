/**
 * Investment Intelligence - Core Type Definitions
 *
 * Comprehensive types for multi-asset investment analysis system
 */

// ============================================================================
// ASSET TYPES
// ============================================================================

export type AssetClass =
  | "stock"
  | "etf"
  | "futures"
  | "crypto"
  | "options"
  | "bonds"
  | "commodities"
  | "forex";
export type Timeframe =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "1w"
  | "1M";
export type TrendDirection =
  | "bullish"
  | "bearish"
  | "neutral"
  | "consolidating";
export type SignalStrength =
  | "strong_buy"
  | "buy"
  | "neutral"
  | "sell"
  | "strong_sell";
export type RiskLevel = "very_low" | "low" | "moderate" | "high" | "very_high";

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currency: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
  lastUpdated: Date;
}

export interface PriceData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
  vwap?: number;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  marketCap?: number;
  peRatio?: number;
  dividend?: number;
  dividendYield?: number;
  week52High: number;
  week52Low: number;
  timestamp: Date;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  symbols: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCREENING & FILTERING
// ============================================================================

export type ScreenerOperator =
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "eq"
  | "neq"
  | "between"
  | "in";

export interface ScreenerFilter {
  field: string;
  operator: ScreenerOperator;
  value: number | string | number[] | string[];
}

export interface ScreenerCriteria {
  assetClasses?: AssetClass[];
  sectors?: string[];
  exchanges?: string[];
  marketCapMin?: number;
  marketCapMax?: number;
  priceMin?: number;
  priceMax?: number;
  volumeMin?: number;
  changePercentMin?: number;
  changePercentMax?: number;
  technicalFilters?: ScreenerFilter[];
  fundamentalFilters?: ScreenerFilter[];
}

export interface ScreenerResult {
  symbol: string;
  asset: Asset;
  quote: Quote;
  technicalScore?: number;
  fundamentalScore?: number;
  overallScore?: number;
  signals?: string[];
  matchedCriteria: string[];
}

// ============================================================================
// PORTFOLIO
// ============================================================================

export interface PortfolioHolding {
  id: string;
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  marketValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  realizedGain: number;
  weight: number;
  sector?: string;
  purchaseDate: Date;
  lastUpdated: Date;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  holdings: PortfolioHolding[];
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  cashBalance: number;
  assetAllocation: AssetAllocation[];
  sectorAllocation: SectorAllocation[];
  performanceHistory: PerformancePoint[];
  riskMetrics?: PortfolioRiskMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetAllocation {
  assetClass: AssetClass;
  value: number;
  weight: number;
  targetWeight?: number;
  difference?: number;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  weight: number;
  holdings: string[];
}

export interface PerformancePoint {
  date: Date;
  value: number;
  dayReturn: number;
  cumulativeReturn: number;
  benchmark?: number;
}

// ============================================================================
// PORTFOLIO RISK METRICS
// ============================================================================

export interface PortfolioRiskMetrics {
  portfolioId: string;
  calculatedAt: Date;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  maxDrawdown: number;
  valueAtRisk: VaRMetrics;
  correlation: CorrelationMatrix;
  diversificationRatio: number;
  concentrationRisk: number;
  riskLevel: RiskLevel;
}

export interface VaRMetrics {
  daily95: number;
  daily99: number;
  weekly95: number;
  weekly99: number;
  monthly95: number;
  monthly99: number;
  method: "historical" | "parametric" | "monte_carlo";
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
  avgCorrelation: number;
  highlyCorrelated: Array<{ pair: [string, string]; correlation: number }>;
}

export interface StressTestResult {
  scenario: string;
  description: string;
  portfolioImpact: number;
  portfolioImpactPercent: number;
  holdingImpacts: Array<{
    symbol: string;
    impact: number;
    impactPercent: number;
  }>;
  probability?: number;
  historicalOccurrence?: string;
}

export interface PositionSizingRecommendation {
  symbol: string;
  currentWeight: number;
  recommendedWeight: number;
  maxPositionSize: number;
  riskPerTrade: number;
  suggestedQuantity: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  riskRewardRatio: number;
  reasoning: string;
}

export interface DiversificationAnalysis {
  overallScore: number;
  assetClassDiversity: number;
  sectorDiversity: number;
  geographicDiversity: number;
  correlationDiversity: number;
  recommendations: string[];
  concentrationRisks: Array<{ type: string; exposure: number; risk: string }>;
}
