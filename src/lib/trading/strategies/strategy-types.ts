/**
 * Strategy Library Types
 *
 * Metadata and configuration types for the pre-built strategy library.
 * Each strategy wraps a BacktestStrategy with additional catalog metadata.
 */

import type { BacktestStrategy } from "../backtesting/backtest-engine";

// ============================================================================
// STRATEGY METADATA
// ============================================================================

export type StrategyCategory =
  | "momentum"
  | "mean_reversion"
  | "trend_following"
  | "volatility"
  | "volume"
  | "gap"
  | "breakout"
  | "pctt";

export type StrategyRiskLevel = "low" | "medium" | "high";

export type StrategyTimeframe =
  | "intraday"
  | "swing"
  | "position"
  | "multi_timeframe";

export type MarketCondition =
  | "trending"
  | "ranging"
  | "volatile"
  | "low_volatility"
  | "any";

// ============================================================================
// STRATEGY DEFINITION
// ============================================================================

export interface StrategyDefinition {
  /** Unique strategy identifier (kebab-case) */
  id: string;

  /** Strategy configuration compatible with BacktestEngine */
  strategy: BacktestStrategy;

  /** Catalog metadata */
  metadata: StrategyMetadata;
}

export interface StrategyMetadata {
  category: StrategyCategory;
  riskLevel: StrategyRiskLevel;
  timeframe: StrategyTimeframe;

  /** Market conditions this strategy performs best in */
  idealConditions: MarketCondition[];

  /** Suggested symbols/sectors for this strategy */
  suggestedSymbols?: string[];

  /** Key indicators used (for UI display) */
  indicators: string[];

  /** Expected annual return range (for UI display, not guaranteed) */
  expectedReturnRange: { min: number; max: number };

  /** Expected max drawdown range */
  expectedDrawdownRange: { min: number; max: number };

  /** Minimum recommended capital */
  minCapital: number;

  /** Author/source attribution */
  author: string;

  /** Version tag */
  version: string;
}
