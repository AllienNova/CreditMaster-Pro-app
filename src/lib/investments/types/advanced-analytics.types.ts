/**
 * Advanced Portfolio Analytics Type Definitions
 *
 * Phase 5.2.1: Type definitions for Modern Portfolio Theory implementation
 * Includes risk metrics, diversification scoring, correlation analysis, and rebalancing
 */

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Risk tolerance levels for portfolio optimization
 */
export enum RiskLevel {
  CONSERVATIVE = "conservative",
  MODERATE = "moderate",
  AGGRESSIVE = "aggressive",
  VERY_AGGRESSIVE = "very_aggressive",
}

/**
 * GICS Sector Classification (11 sectors)
 */
export enum SectorType {
  TECHNOLOGY = "technology",
  HEALTHCARE = "healthcare",
  FINANCIALS = "financials",
  ENERGY = "energy",
  CONSUMER_DISCRETIONARY = "consumer_discretionary",
  CONSUMER_STAPLES = "consumer_staples",
  INDUSTRIALS = "industrials",
  MATERIALS = "materials",
  REAL_ESTATE = "real_estate",
  UTILITIES = "utilities",
  COMMUNICATION_SERVICES = "communication_services",
}

/**
 * Reasons for portfolio rebalancing
 */
export enum RebalanceReason {
  DRIFT_THRESHOLD = "drift_threshold",
  RISK_ADJUSTMENT = "risk_adjustment",
  OPPORTUNITY = "opportunity",
  CORRELATION_CHANGE = "correlation_change",
}

/**
 * Time horizons for analytics calculations
 */
export type TimeHorizon = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y";

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const RiskLevelSchema = z.nativeEnum(RiskLevel);
export const SectorTypeSchema = z.nativeEnum(SectorType);
export const RebalanceReasonSchema = z.nativeEnum(RebalanceReason);
export const TimeHorizonSchema = z.enum(["1M", "3M", "6M", "1Y", "3Y", "5Y"]);

// ============================================================================
// RISK METRICS
// ============================================================================

/**
 * Comprehensive risk metrics for portfolio analysis
 */
export const RiskMetricsSchema = z.object({
  portfolioId: z.string().uuid(),
  timeHorizon: TimeHorizonSchema,
  calculatedAt: z.date(),

  // Value at Risk metrics
  valueAtRisk: z.object({
    var95: z.number(), // 95% confidence VaR
    var99: z.number(), // 99% confidence VaR
    confidenceLevel: z.number().min(0).max(1),
    timeHorizonDays: z.number().positive(),
  }),

  // Conditional Value at Risk (Expected Shortfall)
  conditionalVaR: z.object({
    cvar95: z.number(), // 95% confidence CVaR
    cvar99: z.number(), // 99% confidence CVaR
    expectedShortfall: z.number(),
  }),

  // Risk-adjusted return metrics — null when the denominator is 0 (mathematically undefined)
  sharpeRatio: z.number().nullable(), // null when annualizedVolatility = 0
  sortinoRatio: z.number().nullable(), // null when downsideDeviation = 0
  calmarRatio: z.number().nullable(), // null when maxDrawdown = 0

  // Market risk metrics
  beta: z.number(), // Volatility relative to market
  alpha: z.number(), // Excess return over benchmark
  rSquared: z.number().min(0).max(1), // Correlation with benchmark

  // Volatility metrics
  volatility: z.object({
    daily: z.number(),
    annualized: z.number(),
    downside: z.number(), // Downside deviation
  }),

  // Drawdown metrics
  maxDrawdown: z.number(), // Maximum peak-to-trough decline
  currentDrawdown: z.number(), // Current drawdown from peak
  averageDrawdown: z.number(),

  // Additional metrics
  trackingError: z.number(), // Deviation from benchmark
  informationRatio: z.number().nullable(), // null when trackingError = 0

  metadata: z.object({
    riskFreeRate: z.number(),
    benchmark: z.string().optional(),
    monteCarloIterations: z.number().default(10000),
  }),
});

export type RiskMetrics = z.infer<typeof RiskMetricsSchema>;

// ============================================================================
// DIVERSIFICATION SCORING
// ============================================================================

/**
 * Sector allocation and exposure
 */
export const SectorExposureSchema = z.object({
  sector: SectorTypeSchema,
  allocation: z.number().min(0).max(100), // Percentage
  value: z.number().nonnegative(),
  riskWeight: z.number().min(0).max(1), // Risk contribution
  holdings: z.array(
    z.object({
      symbol: z.string(),
      allocation: z.number(),
    }),
  ),
});

export type SectorExposure = z.infer<typeof SectorExposureSchema>;

/**
 * Diversification score across multiple dimensions
 */
export const DiversificationScoreSchema = z.object({
  portfolioId: z.string().uuid(),
  calculatedAt: z.date(),

  // Overall diversification score (0-100)
  overallScore: z.number().min(0).max(100),

  // Sector diversification
  sectorDiversification: z.object({
    score: z.number().min(0).max(100),
    numberOfSectors: z.number().nonnegative(),
    herfindahlIndex: z.number().min(0).max(1), // Concentration measure
    maxSectorAllocation: z.number().min(0).max(100),
    sectorExposures: z.array(SectorExposureSchema),
  }),

  // Geographic diversification
  geographicDiversification: z.object({
    score: z.number().min(0).max(100),
    numberOfCountries: z.number().nonnegative(),
    domesticAllocation: z.number().min(0).max(100),
    internationalAllocation: z.number().min(0).max(100),
    regions: z.array(
      z.object({
        region: z.string(),
        allocation: z.number().min(0).max(100),
      }),
    ),
  }),

  // Asset class diversification
  assetClassDiversification: z.object({
    score: z.number().min(0).max(100),
    numberOfAssetClasses: z.number().nonnegative(),
    assetClasses: z.array(
      z.object({
        assetClass: z.enum([
          "stock",
          "etf",
          "crypto",
          "option",
          "bond",
          "commodity",
        ]),
        allocation: z.number().min(0).max(100),
      }),
    ),
  }),

  // Concentration risk
  concentrationRisk: z.object({
    topHoldingAllocation: z.number().min(0).max(100),
    top5Allocation: z.number().min(0).max(100),
    top10Allocation: z.number().min(0).max(100),
    numberOfHoldings: z.number().nonnegative(),
  }),

  recommendations: z.array(z.string()),
});

export type DiversificationScore = z.infer<typeof DiversificationScoreSchema>;

// ============================================================================
// CORRELATION ANALYSIS
// ============================================================================

/**
 * Correlation matrix for portfolio holdings
 */
export const CorrelationMatrixSchema = z.object({
  portfolioId: z.string().uuid(),
  timeHorizon: TimeHorizonSchema,
  calculatedAt: z.date(),

  // Correlation pairs
  correlations: z.array(
    z.object({
      symbol1: z.string(),
      symbol2: z.string(),
      correlation: z.number().min(-1).max(1), // Pearson correlation coefficient
      covariance: z.number(),
    }),
  ),

  // Summary statistics
  averageCorrelation: z.number().min(-1).max(1),
  maxCorrelation: z.number().min(-1).max(1),
  minCorrelation: z.number().min(-1).max(1),

  // Highly correlated pairs (|correlation| > 0.7)
  highlyCorrelatedPairs: z.array(
    z.object({
      symbol1: z.string(),
      symbol2: z.string(),
      correlation: z.number(),
    }),
  ),

  // Eigenvalues for principal component analysis
  eigenvalues: z.array(z.number()).optional(),

  metadata: z.object({
    dataPoints: z.number().positive(),
    missingDataHandling: z.string(),
  }),
});

export type CorrelationMatrix = z.infer<typeof CorrelationMatrixSchema>;

// ============================================================================
// VOLATILITY ANALYSIS
// ============================================================================

/**
 * Volatility analysis and clustering metrics
 */
export const VolatilityAnalysisSchema = z.object({
  portfolioId: z.string().uuid(),
  timeHorizon: TimeHorizonSchema,
  calculatedAt: z.date(),

  // Historical volatility
  historicalVolatility: z.object({
    daily: z.number().nonnegative(),
    weekly: z.number().nonnegative(),
    monthly: z.number().nonnegative(),
    annualized: z.number().nonnegative(),
  }),

  // Implied volatility (if options data available)
  impliedVolatility: z
    .object({
      average: z.number().nonnegative(),
      vix: z.number().nonnegative().optional(), // Market volatility index
    })
    .optional(),

  // Volatility clustering metrics
  volatilityClustering: z.object({
    garchEffect: z.boolean(), // Presence of GARCH effects
    persistenceParameter: z.number().min(0).max(1),
    meanReversion: z.number(),
  }),

  // Rolling volatility
  rollingVolatility: z.array(
    z.object({
      date: z.date(),
      volatility: z.number().nonnegative(),
    }),
  ),

  // Volatility regime
  currentRegime: z.enum(["low", "normal", "high", "extreme"]),
  regimeThresholds: z.object({
    low: z.number(),
    normal: z.number(),
    high: z.number(),
  }),
});

export type VolatilityAnalysis = z.infer<typeof VolatilityAnalysisSchema>;

// ============================================================================
// REBALANCING RECOMMENDATIONS
// ============================================================================

/**
 * Trade suggestion for rebalancing
 */
export const TradeSuggestionSchema = z.object({
  symbol: z.string(),
  action: z.enum(["buy", "sell", "hold"]),
  currentAllocation: z.number().min(0).max(100),
  targetAllocation: z.number().min(0).max(100),
  currentShares: z.number().nonnegative(),
  targetShares: z.number().nonnegative(),
  sharesToTrade: z.number(), // Positive for buy, negative for sell
  estimatedCost: z.number(),
  priority: z.enum(["high", "medium", "low"]),
  reason: z.string(),
});

export type TradeSuggestion = z.infer<typeof TradeSuggestionSchema>;

/**
 * Rebalancing recommendation with trade suggestions
 */
export const RebalancingRecommendationSchema = z.object({
  portfolioId: z.string().uuid(),
  calculatedAt: z.date(),
  targetRiskLevel: RiskLevelSchema,

  // Current vs optimal allocations
  currentAllocation: z.array(
    z.object({
      symbol: z.string(),
      allocation: z.number().min(0).max(100),
      value: z.number().nonnegative(),
    }),
  ),

  targetAllocation: z.array(
    z.object({
      symbol: z.string(),
      allocation: z.number().min(0).max(100),
      value: z.number().nonnegative(),
    }),
  ),

  // Trade suggestions
  trades: z.array(TradeSuggestionSchema),

  // Rebalancing metrics
  totalTradingCost: z.number().nonnegative(),
  expectedImprovement: z.object({
    sharpeRatio: z.number(),
    expectedReturn: z.number(),
    volatilityReduction: z.number(),
  }),

  // Reasons for rebalancing
  reasons: z.array(RebalanceReasonSchema),

  // Drift analysis
  driftAnalysis: z.object({
    maxDrift: z.number().nonnegative(), // Maximum allocation drift
    averageDrift: z.number().nonnegative(),
    driftedHoldings: z.array(z.string()),
  }),

  // Recommendations
  recommendations: z.array(z.string()),

  metadata: z.object({
    optimizationMethod: z.string(), // 'MPT', 'Black-Litterman', etc.
    constraints: z.array(z.string()),
  }),
});

export type RebalancingRecommendation = z.infer<
  typeof RebalancingRecommendationSchema
>;

// ============================================================================
// PORTFOLIO PERFORMANCE
// ============================================================================

/**
 * Portfolio performance metrics with benchmark comparison
 */
export const PortfolioPerformanceSchema = z.object({
  portfolioId: z.string().uuid(),
  timeHorizon: TimeHorizonSchema,
  calculatedAt: z.date(),

  // Returns
  returns: z.object({
    total: z.number(), // Total return percentage
    annualized: z.number(), // Annualized return
    daily: z.array(
      z.object({
        date: z.date(),
        return: z.number(),
      }),
    ),
    cumulative: z.array(
      z.object({
        date: z.date(),
        cumulativeReturn: z.number(),
      }),
    ),
  }),

  // Risk-adjusted returns — fields are null when denominators are 0 (see RiskMetricsSchema)
  riskAdjustedReturns: z.object({
    sharpeRatio: z.number().nullable(),
    sortinoRatio: z.number().nullable(),
    calmarRatio: z.number().nullable(),
    informationRatio: z.number().nullable(),
  }),

  // Benchmark comparison
  benchmark: z
    .object({
      symbol: z.string(),
      returns: z.object({
        total: z.number(),
        annualized: z.number(),
      }),
      alpha: z.number(), // Excess return vs benchmark
      beta: z.number(), // Volatility vs benchmark
      trackingError: z.number(),
      activeReturn: z.number(), // Portfolio return - Benchmark return
    })
    .optional(),

  // Performance attribution
  attribution: z.object({
    sectorContribution: z.array(
      z.object({
        sector: SectorTypeSchema,
        contribution: z.number(),
      }),
    ),
    topContributors: z.array(
      z.object({
        symbol: z.string(),
        contribution: z.number(),
      }),
    ),
    topDetractors: z.array(
      z.object({
        symbol: z.string(),
        contribution: z.number(),
      }),
    ),
  }),

  // Drawdown analysis
  drawdown: z.object({
    current: z.number(),
    maximum: z.number(),
    averageDrawdown: z.number(),
    recoveryTime: z.number().optional(), // Days to recover from max drawdown
  }),

  metadata: z.object({
    startDate: z.date(),
    endDate: z.date(),
    tradingDays: z.number().positive(),
  }),
});

export type PortfolioPerformance = z.infer<typeof PortfolioPerformanceSchema>;

// ============================================================================
// ANALYTICS FILTERS
// ============================================================================

/**
 * Filters for analytics queries
 */
export const AnalyticsFiltersSchema = z.object({
  portfolioId: z.string().uuid(),
  timeHorizon: TimeHorizonSchema.default("1Y"),
  benchmark: z.string().optional(), // Benchmark symbol (e.g., 'SPY', '^GSPC')
  riskFreeRate: z.number().min(0).max(1).default(0.04), // Default 4% annual
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  includeCache: z.boolean().default(true),
});

export type AnalyticsFilters = z.infer<typeof AnalyticsFiltersSchema>;
