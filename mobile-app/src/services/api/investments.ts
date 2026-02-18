/**
 * Fynvita Mobile Investment API Service
 * Handles all investment-related API calls using the core API client
 */

import api from "./client";
import type { ApiResponse, RequestConfig } from "./types";

// Investment Types
export type AssetType =
  | "stock"
  | "etf"
  | "mutual_fund"
  | "bond"
  | "crypto"
  | "option"
  | "other";

export interface Holding {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  quantity: number;
  average_cost: number;
  current_price: number;
  current_value: number;
  total_cost: number;
  gain_loss: number;
  gain_loss_percent: number;
  day_change: number;
  day_change_percent: number;
  sector?: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdingsCount: number;
}

export interface AllocationItem {
  type: string;
  value: number;
  percentage: number;
  count: number;
}

export interface PerformancePoint {
  date: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface PortfolioResponse {
  summary: PortfolioSummary;
  holdings: Holding[];
  allocations: AllocationItem[];
  performanceHistory: PerformancePoint[];
}

// Stock Analysis Types (matching web API response)
export interface StockAnalysis {
  symbol: string;
  company_name: string;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  high_52_week: number;
  low_52_week: number;
  market_cap: number;
  pe_ratio: number | null;
  dividend_yield: number | null;
  volume: number;
  avg_volume: number;
  recommendation: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  confidence_score: number;
  target_price: number;
  analysis_summary: string;
  bullish_factors: string[];
  bearish_factors: string[];
  technical_indicators: {
    rsi: number;
    macd_signal: string;
    moving_average_signal: string;
  };
}

export interface StockAnalysisApiResponse {
  analysis: StockAnalysis;
}

export interface CreateHoldingInput {
  symbol: string;
  name: string;
  asset_type: AssetType;
  quantity: number;
  purchase_price: number;
  purchase_date?: string;
  sector?: string;
}

export interface UpdateHoldingInput {
  quantity?: number;
  average_cost?: number;
  sector?: string;
}

// Investment API Methods
export const investmentsApi = {
  /**
   * Get user's portfolio with summary, holdings, and allocations
   */
  getPortfolio: (
    period?: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<PortfolioResponse>> =>
    api.get<PortfolioResponse>(
      `/investments/portfolio${period ? `?period=${period}` : ""}`,
      {
        enableCache: true,
        cacheTime: 60000, // Cache for 1 minute
        ...config,
      },
    ),

  /**
   * Get all holdings for the user
   */
  getHoldings: (
    params?: { sortBy?: string; sortOrder?: "asc" | "desc"; type?: AssetType },
    config?: RequestConfig,
  ): Promise<ApiResponse<{ holdings: Holding[] }>> => {
    const queryParams = new URLSearchParams();
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);
    if (params?.type) queryParams.append("type", params.type);
    const query = queryParams.toString();
    return api.get<{ holdings: Holding[] }>(
      `/investments/holdings${query ? `?${query}` : ""}`,
      config,
    );
  },

  /**
   * Get a single holding by ID
   */
  getHolding: (
    id: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ holding: Holding }>> =>
    api.get<{ holding: Holding }>(`/investments/holdings/${id}`, config),

  /**
   * Create a new holding
   */
  createHolding: (
    data: CreateHoldingInput,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ holding: Holding }>> =>
    api.post<{ holding: Holding }>("/investments/holdings", data, config),

  /**
   * Update an existing holding
   */
  updateHolding: (
    id: string,
    data: UpdateHoldingInput,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ holding: Holding }>> =>
    api.patch<{ holding: Holding }>(
      `/investments/holdings/${id}`,
      data,
      config,
    ),

  /**
   * Delete a holding
   */
  deleteHolding: (
    id: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<{ success: boolean }>> =>
    api.delete<{ success: boolean }>(`/investments/holdings/${id}`, config),

  /**
   * Get stock analysis for a symbol
   */
  analyzeStock: (
    symbol: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<StockAnalysisApiResponse>> =>
    api.get<StockAnalysisApiResponse>(`/investments/analyze/${symbol}`, {
      enableCache: true,
      cacheTime: 300000, // Cache for 5 minutes
      ...config,
    }),

  /**
   * Get AI-powered investment recommendation
   */
  getRecommendation: (
    symbol: string,
    includePrice?: boolean,
    config?: RequestConfig,
  ): Promise<ApiResponse<RecommendationResponse>> =>
    api.post<RecommendationResponse>(
      "/investments/recommendations",
      {
        symbol,
        includePrice: includePrice ?? true,
      },
      config,
    ),

  /**
   * Scan for chart patterns on a symbol
   */
  scanPatterns: (
    symbol: string,
    timeframe?: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<PatternScanResponse>> =>
    api.post<PatternScanResponse>(
      "/investments/patterns",
      {
        symbol,
        timeframe: timeframe ?? "1d",
      },
      config,
    ),

  /**
   * Get pattern information
   */
  getPatternInfo: (
    patternType?: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<PatternInfoResponse>> =>
    api.get<PatternInfoResponse>(
      `/investments/patterns${patternType ? `?type=${patternType}` : ""}`,
      config,
    ),

  /**
   * Analyze portfolio with risk metrics
   */
  analyzePortfolio: (
    holdings: PortfolioHoldingInput[],
    options?: {
      includeStressTest?: boolean;
      includeRebalance?: boolean;
      targetAllocation?: Record<string, number>;
    },
    config?: RequestConfig,
  ): Promise<ApiResponse<PortfolioAnalysisResponse>> =>
    api.post<PortfolioAnalysisResponse>(
      "/investments/portfolio/analyze",
      {
        holdings,
        ...options,
      },
      config,
    ),

  /**
   * Get user's portfolio analysis
   */
  getUserPortfolioAnalysis: (
    config?: RequestConfig,
  ): Promise<ApiResponse<PortfolioAnalysisResponse>> =>
    api.get<PortfolioAnalysisResponse>("/investments/portfolio/analyze", {
      enableCache: true,
      cacheTime: 60000, // Cache for 1 minute
      ...config,
    }),
};

// Extended Types for new endpoints
export interface RecommendationResponse {
  recommendation: {
    id: string;
    symbol: string;
    action: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
    confidence: number;
    priceTarget: number;
    currentPrice: number;
    expectedReturn: number;
    riskScore: number;
    timeHorizon: "short_term" | "medium_term" | "long_term";
    entryPrice: number;
    stopLoss: number;
    takeProfit: number[];
    technicalScore: number;
    fundamentalScore: number;
    sentimentScore: number;
    reasons: Array<{
      category: string;
      description: string;
      impact: "positive" | "negative" | "neutral";
      weight: number;
    }>;
    risks: string[];
    catalysts: string[];
  };
  pricePrediction?: {
    symbol: string;
    currentPrice: number;
    predictions: Record<
      string,
      { price: number; confidence: number; range: [number, number] }
    >;
    trend: "bullish" | "bearish" | "neutral";
    modelAccuracy: number;
  };
  technicalSummary: {
    price: number;
    rsi?: number;
    trend: string;
  };
}

export interface PatternScanResponse {
  symbol: string;
  timeframe: string;
  scannedAt: string;
  patterns: Array<{
    type: string;
    direction: "bullish" | "bearish" | "neutral";
    reliability: number;
    priceTarget?: number;
    startIndex: number;
    endIndex: number;
    breakoutPrice?: number;
    stopLoss?: number;
    description?: string;
  }>;
  pivotPoints: Array<{
    index: number;
    price: number;
    type: "high" | "low";
    strength: number;
  }>;
  supportLevels: number[];
  resistanceLevels: number[];
  summary: {
    totalPatterns: number;
    bullishPatterns: number;
    bearishPatterns: number;
    highReliabilityPatterns: number;
  };
}

export interface PatternInfoResponse {
  patterns?: Array<{
    type: string;
    name: string;
    description: string;
    direction: string;
    avgReliability: number;
    successRate: number;
  }>;
  pattern?: {
    type: string;
    name: string;
    description: string;
    direction: string;
    avgReliability: number;
    successRate: number;
  };
  total?: number;
}

export interface PortfolioHoldingInput {
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  sector?: string;
  assetClass?:
    | "stock"
    | "etf"
    | "bond"
    | "crypto"
    | "commodity"
    | "cash"
    | "option"
    | "reit";
}

export interface PortfolioAnalysisResponse {
  metrics: {
    totalValue: number;
    totalCostBasis: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    beta: number;
    alpha: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    volatility: number;
    valueAtRisk: {
      daily95: number;
      daily99: number;
      weekly95: number;
      monthly95: number;
    };
    correlationToMarket: number;
    diversificationScore: number;
    concentrationRisk: number;
    sectorExposure: Record<string, number>;
    assetClassAllocation: Record<string, number>;
    dailyReturn: number;
    weeklyReturn: number;
    monthlyReturn: number;
    ytdReturn: number;
    annualizedReturn: number;
  };
  diversification: {
    score: number;
    sectorDiversification: number;
    assetClassDiversification: number;
    geographicDiversification: number;
    recommendations: string[];
    overweightedSectors: string[];
    underweightedSectors: string[];
  };
  stressTests?: Array<{
    scenario: string;
    portfolioImpact: number;
    affectedHoldings: Array<{ symbol: string; impact: number }>;
    recommendation: string;
  }>;
  rebalanceRecommendation?: {
    trades: Array<{
      symbol: string;
      action: "buy" | "sell";
      shares: number;
      value: number;
      currentWeight: number;
      targetWeight: number;
    }>;
    currentRisk: number;
    projectedRisk: number;
    estimatedCost: number;
    taxImplications: Array<{
      symbol: string;
      gainLoss: number;
      holdingPeriod: "short_term" | "long_term";
      estimatedTax: number;
    }>;
  };
  summary: {
    totalValue: number;
    totalGainLoss: number;
    sharpeRatio: number;
    diversificationScore: number;
    riskLevel?: "low" | "moderate" | "high";
  };
}

export default investmentsApi;
