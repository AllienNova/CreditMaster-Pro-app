/**
 * Strategy Library — Barrel Exports
 *
 * 10 pre-built trading strategies implementing the BacktestStrategy interface.
 * Each strategy includes backtestable rules and catalog metadata.
 */

import type { StrategyDefinition } from "../strategy-types";
import momentumBreakout from "./momentum-breakout";
import meanReversion from "./mean-reversion";
import trendFollowing from "./trend-following";
import bollingerSqueeze from "./bollinger-squeeze";
import rsiDivergence from "./rsi-divergence";
import macdCrossover from "./macd-crossover";
import volumeSpike from "./volume-spike";
import gapFill from "./gap-fill";
import openingRangeBreakout from "./opening-range-breakout";
import pcttBoundaryRetest from "./pctt-boundary-retest";

// ============================================================================
// STRATEGY CATALOG
// ============================================================================

export const STRATEGY_LIBRARY: readonly StrategyDefinition[] = [
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
] as const;

/** Map of strategy ID to definition for O(1) lookup */
export const STRATEGY_MAP: ReadonlyMap<string, StrategyDefinition> = new Map(
  STRATEGY_LIBRARY.map((s) => [s.id, s]),
);

/** Get a strategy definition by ID */
export function getStrategyById(id: string): StrategyDefinition | undefined {
  return STRATEGY_MAP.get(id);
}

/** Get all strategies matching a category */
export function getStrategiesByCategory(
  category: StrategyDefinition["metadata"]["category"],
): StrategyDefinition[] {
  return STRATEGY_LIBRARY.filter((s) => s.metadata.category === category);
}

/** Get all strategies matching a risk level */
export function getStrategiesByRiskLevel(
  riskLevel: StrategyDefinition["metadata"]["riskLevel"],
): StrategyDefinition[] {
  return STRATEGY_LIBRARY.filter((s) => s.metadata.riskLevel === riskLevel);
}

/** Get all strategies matching a timeframe */
export function getStrategiesByTimeframe(
  timeframe: StrategyDefinition["metadata"]["timeframe"],
): StrategyDefinition[] {
  return STRATEGY_LIBRARY.filter((s) => s.metadata.timeframe === timeframe);
}

// ============================================================================
// INDIVIDUAL EXPORTS
// ============================================================================

export {
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
};
