/**
 * PCTT (Pivot-Constrained Trendline Trading) Module
 * 
 * A systematic market-structure methodology that converts discretionary
 * trendline analysis into a deterministic, testable, automatable system.
 */

// Core engine
export {
  PCTTEngine,
  createPCTTEngine,
  DEFAULT_PCTT_CONFIG,
} from './pctt-core';

export type {
  OHLCV,
  Pivot,
  BoundaryLine,
  StructureObject,
  PCTTEvent,
  PCTTSignal,
  PCTTConfig,
} from './pctt-core';

// Validator
export {
  PCTTValidator,
  createPCTTValidator,
} from './pctt-validator';

export type {
  TradeResult,
  ValidationResult,
  BootstrapCI,
  CalibrationResult,
  PerformanceMetrics,
  ValidatorConfig,
} from './pctt-validator';

// Pine Script Generator
export {
  generatePCTTPineScript,
} from './pine-script-generator';

export type {
  PineScriptOptions,
} from './pine-script-generator';

// Webhook Handler (Optional - for TradingView integration)
export {
  PCTTWebhookHandler,
  createPCTTWebhookHandler,
  createWebhookMiddleware,
} from './webhook-handler';

export type {
  PCTTWebhookPayload,
  WebhookValidationResult,
  ExecutionResult as WebhookExecutionResult,
  WebhookConfig,
  SignalLog,
} from './webhook-handler';

// Native Trading Service (Primary execution path)
export {
  PCTTTradingService,
  createPCTTTradingService,
  DEFAULT_TRADING_CONFIG,
} from './pctt-trading-service';

export type {
  PCTTTradingConfig,
  TradeSetup,
  ExecutionResult,
  ActivePosition,
  TradingStats,
} from './pctt-trading-service';

// Portfolio Risk Management
export {
  PortfolioRiskManager,
  createPortfolioRiskManager,
  DEFAULT_PORTFOLIO_RISK_CONFIG,
} from './portfolio-risk';

export type {
  PositionRisk,
  CorrelationPair,
  PortfolioRiskMetrics,
  PortfolioRiskConfig,
  TradeProposal,
  RiskCheckResult,
} from './portfolio-risk';

// Hybrid Trailing Stop System
export {
  TrailingStopManager,
  createTrailingStopManager,
  DEFAULT_TRAILING_STOP_CONFIG,
} from './trailing-stop-manager';

export type {
  TrailingStopStage,
  TrailingStopState,
  TrailingStopConfig,
  StopUpdateResult,
} from './trailing-stop-manager';

// Slippage Model
export {
  SlippageModel,
  createSlippageModel,
  DEFAULT_SLIPPAGE_CONFIG,
} from './slippage-model';

export type {
  SlippageConfig,
  SlippageEstimate,
  MarketConditions,
} from './slippage-model';

// Explainable AI
export {
  PCTTExplainableAI,
  createPCTTExplainableAI,
} from './explainable-ai';

export type {
  DecisionExplanation,
  DecisionFactor,
  ConfidenceBreakdown,
  RiskExplanation,
  VisualCue,
  TradeNarrative,
  LiveCommentary,
} from './explainable-ai';
