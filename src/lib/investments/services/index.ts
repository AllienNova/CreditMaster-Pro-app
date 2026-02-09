/**
 * Investment Services Index
 *
 * Central export point for all investment-related services
 */

// Market Data
export {
  MarketDataService,
  type MarketDataProvider,
  type RealtimeUpdate,
} from './MarketDataService';

// Technical Analysis / Pattern Recognition
export {
  PatternRecognitionService,
  PATTERN_INFO,
  type DetectedPattern,
  type PatternType,
  type PatternDirection,
  type PatternStatus,
  type PatternScanResult,
  type PatternPoint,
  type TrendLine,
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
  type AlertCondition,
  type AlertNotification,
  type AlertStats,
} from './PriceAlertService';

// Fundamental Analysis
export {
  FundamentalAnalysisService,
  getFundamentalAnalysisService,
} from './FundamentalAnalysisService';

// Sentiment Analysis
export {
  SentimentAnalysisService,
  getSentimentAnalysisService,
} from './SentimentAnalysisService';

// Portfolio Rebalancing
export {
  PortfolioRebalanceService,
  getPortfolioRebalanceService,
  PORTFOLIO_MODELS,
  type Portfolio,
  type TargetAllocation,
  type CurrentAllocation,
  type RebalanceAlert,
  type RebalanceHistory,
  type RebalanceStrategy,
} from './PortfolioRebalanceService';

// Auto-Rebalance Scheduler
export {
  AutoRebalanceScheduler,
  getAutoRebalanceScheduler,
  createAutoRebalanceScheduler,
  DEFAULT_SCHEDULE_CONFIG,
  type RebalanceScheduleConfig,
  type PendingRebalance,
  type RebalanceApprovalStatus,
  type RebalanceExecutionResult,
  type ScheduleFrequency,
  type TriggerType,
  type RebalanceEvent,
  type SchedulerStatus,
} from './AutoRebalanceScheduler';
