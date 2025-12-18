/**
 * Investment Services Index
 * 
 * Central export point for all investment-related services
 */

// Market Data
export { 
  MarketDataService,
  type MarketDataConfig,
  type CandleData,
  type MarketDataResult,
  type HistoricalDataOptions,
  type QuoteData,
} from './MarketDataService';

// Technical Analysis / Pattern Recognition
export {
  PatternRecognitionService,
  PATTERN_INFO,
  type DetectedPattern,
  type ChartPattern,
  type PatternScanResult,
  type PivotPoint,
} from './PatternRecognitionService';

// AI Recommendations
export {
  AIRecommendationEngine,
  getAIRecommendationEngine,
  type InvestmentRecommendation,
  type RecommendationAction,
  type TimeHorizon,
  type RiskLevel,
  type UserProfile,
  type PricePrediction,
  type PortfolioRebalanceRecommendation,
  type RecommendationReason,
} from './AIRecommendationEngine';

// Portfolio Analysis
export {
  PortfolioAnalysisService,
  getPortfolioAnalysisService,
  type PortfolioHolding,
  type PortfolioMetrics,
  type AssetClass,
  type VaRMetrics,
  type PositionSizeRecommendation,
  type DiversificationAnalysis,
  type StressTestResult,
  type RebalanceRecommendation,
  type RebalanceTrade,
  type TaxImplication,
} from './PortfolioAnalysisService';

// Price Alerts
export {
  PriceAlertService,
  getPriceAlertService,
  type PriceAlert,
  type AlertType,
  type AlertPriority,
  type AlertStatus,
  type CreateAlertOptions,
  type AlertNotification,
  type AlertStats,
} from './PriceAlertService';

