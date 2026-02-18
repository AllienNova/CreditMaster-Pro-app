/**
 * Trading System Module
 *
 * Hybrid Rule-Based/ML/LLM Automated Trading System
 *
 * Components:
 * - Broker integrations (Alpaca, Interactive Brokers, Paper)
 * - Trailing stop service (5 strategies)
 * - Rule-based trading engine
 * - ML trading engine
 * - LLM trading engine
 * - Signal fusion layer
 * - Risk management gateway
 * - Order management system
 * - Backtesting engine
 */

// Broker layer
export * from "./brokers/broker-interface";
export * from "./brokers/alpaca-broker";

// Risk management
export * from "./risk/trailing-stop-service";
export * from "./risk/risk-gateway";

// Signal fusion
export {
  SignalFusionService,
  signalFusionService,
  type SignalAction,
  type SignalSource,
  type RuleSignal as FusionRuleSignal,
  type MLPrediction as FusionMLPrediction,
  type LLMAnalysis,
  type TechnicalSignal,
  type FusedSignal,
  type AdaptiveWeights,
  type FusionInput,
} from "./fusion/signal-fusion-service";

// Trading engines
export {
  RuleBasedEngine,
  ruleBasedEngine,
  type TradingRule,
  type RuleSignal,
  type Condition,
  type ConditionGroup,
  type PositionSizing,
  type StopLossConfig,
  type TakeProfitConfig,
  type RuleFilters,
  type ExecutionSettings,
  type MarketData,
} from "./engines/rule-based-engine";

export {
  MLTradingEngine,
  mlTradingEngine,
  type MLModelConfig,
  type MLPrediction,
  type FeatureConfig,
  type TargetConfig,
  type TrainingConfig,
  type ModelEvaluation,
  type FeatureVector,
} from "./engines/ml-trading-engine";

export {
  LLMTradingEngine,
  llmTradingEngine,
  type MarketContext,
  type TradeIdea,
  type TradeIdeaParams,
  type SignalInterpretation,
  type RiskAssessment,
  type PortfolioReview,
  type MarketAnalysis,
} from "./engines/llm-trading-engine";

// LLM Guardrails (Prompt Injection Protection & Risk Management)
export {
  LLMGuardrails,
  createLLMGuardrails,
  DEFAULT_GUARDRAIL_CONFIG,
  type GuardrailConfig,
  type PromptValidationResult,
  type PromptThreat,
  type TradeValidationResult,
  type TradeAdjustment,
  type AuditLog,
  type CircuitBreakerState,
} from "./engines/llm-guardrails";

// Technical Analysis
export * from "./charts/technical-indicators";

// Backtesting
export * from "./backtesting/backtest-engine";

// PCTT (Pivot-Constrained Trendline Trading)
export {
  PCTTEngine,
  createPCTTEngine,
  DEFAULT_PCTT_CONFIG,
  PCTTValidator,
  createPCTTValidator,
  generatePCTTPineScript,
  PCTTWebhookHandler,
  createPCTTWebhookHandler,
  createWebhookMiddleware,
  type OHLCV as PCTTCandle,
  type Pivot,
  type BoundaryLine,
  type StructureObject,
  type PCTTEvent,
  type PCTTSignal,
  type PCTTConfig,
  type TradeResult,
  type ValidationResult,
  type BootstrapCI,
  type CalibrationResult,
  type PerformanceMetrics,
  type ValidatorConfig,
  type PineScriptOptions,
  type PCTTWebhookPayload,
  type WebhookConfig,
  type SignalLog,
} from "./pctt";

// Instrument Selection Engine (ISE)
export {
  // Scoring
  scoreInstrument,
  scoreInstruments,
  explainScore,
  DEFAULT_SCORING_CONFIG,
  // Ranking
  InstrumentRankingService,
  createRankingService,
  formatRankingRow,
  generateAgentThoughts,
  DEFAULT_RANKING_CONFIG,
  // Rotation
  InstrumentRotationService,
  createRotationService,
  explainRotation,
  DEFAULT_ROTATION_CONFIG,
  TIER_WEIGHTS,
} from "./ise";

export {
  ISERiskGating,
  createISERiskGating,
  createISETradeValidator,
  DEFAULT_GATING_CONFIG,
} from "./ise";

export type {
  AssetClass,
  UserTier,
  RegimeType,
  Instrument,
  InstrumentFeatures,
  InstrumentPerformance,
  ScoreBreakdown,
  InstrumentRanking,
  RankingRun,
  ActiveInstrumentSet,
  RotationConfig,
  RotationEvent,
  RotationDecision,
  UserConstraints,
  ScoringConfig,
  RankingServiceConfig,
  RotationState,
  TradeGateResult,
  GatingConfig,
  GatingDecision,
} from "./ise";

// Order Management
export {
  OrderManager,
  getOrderManager,
  createOrderManager,
  DEFAULT_ORDER_MANAGER_CONFIG,
} from "./orders";

export type {
  Order,
  OrderRequest,
  OrderStatus,
  OrderSide,
  OrderType,
  OrderUpdate,
  OrderEvent,
  OrderFilter,
  OrderBlotter,
  OrderValidationResult,
  OrderManagerConfig,
  Fill,
  TimeInForce,
  OrderClass,
} from "./orders";

// Position Management
export {
  PositionManager,
  getPositionManager,
  createPositionManager,
  DEFAULT_POSITION_MANAGER_CONFIG,
} from "./positions";

export type {
  Position,
  PositionSide,
  PositionStatus,
  PositionUpdate,
  PositionClose,
  PositionSummary,
  PositionFilter,
  TradeRecord,
  PositionManagerConfig,
} from "./positions";

// Trading Notifications
export {
  TradingNotificationService,
  getTradingNotificationService,
  createTradingNotificationService,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "./notifications";

export type {
  TradingNotificationType,
  TradingNotification,
  NotificationPreferences,
} from "./notifications";

// Trading Journal
export {
  TradingJournalService,
  getTradingJournalService,
  type TradeEntry,
  type TradeStats,
  type TradeDirection,
  type TradeStatus,
  type TradeOutcome,
  type EmotionalState,
  type TimeFrame,
  type StrategyPerformance,
  type DailyPerformance,
  type TradeFilter,
} from "./services/TradingJournalService";

// Note: Paper broker has interface compatibility issues - use standalone
// export * from './brokers/paper-broker';

// Real-Time Trading (WebSocket-based)
export {
  RealtimeTradingService,
  getRealtimeTradingService,
  createRealtimeTradingService,
  DEFAULT_REALTIME_CONFIG,
  OrderExecutionEngine,
  getOrderExecutionEngine,
  createOrderExecutionEngine,
  DEFAULT_EXECUTION_CONFIG,
  OrderStatusTracker,
  createOrderStatusTracker,
  DEFAULT_TRACKER_CONFIG,
} from "./realtime";

export type {
  ConnectionState,
  MarketDataType,
  RealtimeQuote,
  RealtimeTrade,
  RealtimeBar,
  OrderUpdate as RealtimeOrderUpdate,
  OrderUpdateStatus,
  OrderEvent as RealtimeOrderEvent,
  TradeUpdate,
  RealtimeConfig,
  SubscriptionStatus,
  ExecutionMode,
  ExecutionConfig,
  ExecutionResult,
  PendingExecution,
  ExecutionEvent,
  LivePriceInfo,
  OrderStatusChange,
  TrackedOrder,
  OrderTrackerConfig,
} from "./realtime";
