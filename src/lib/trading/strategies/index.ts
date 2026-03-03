/**
 * Trading Strategies — Barrel Exports
 *
 * Re-exports strategy types, library catalog, lookup utilities,
 * custom strategy builder, and validator.
 */

export * from "./strategy-types";
export {
  STRATEGY_LIBRARY,
  STRATEGY_MAP,
  getStrategyById,
  getStrategiesByCategory,
  getStrategiesByRiskLevel,
  getStrategiesByTimeframe,
  momentumBreakout,
  meanReversion,
  trendFollowing,
  bollingerSqueeze,
  rsiDivergence,
  macdCrossover,
  volumeSpike,
  gapFill,
  openingRangeBreakout,
  pcttBoundaryRetest,
} from "./library";
export {
  StrategyBuilder,
  createStrategyBuilder,
} from "./custom-strategy-builder";
export {
  validateStrategy,
  validateStrategyDefinition,
  VALID_INDICATOR_LIST,
  VALID_OPERATOR_LIST,
  VALID_POSITION_SIZING_LIST,
  VALID_CATEGORY_LIST,
  VALID_RISK_LEVEL_LIST,
  VALID_TIMEFRAME_LIST,
  VALID_MARKET_CONDITION_LIST,
} from "./strategy-validator";
export type { ValidationError, ValidationResult } from "./strategy-validator";
