/**
 * Regime-Aware Heat Budget Adapter
 *
 * Reads base heat ceilings from policy.runtime.risk.portfolio and the
 * per-regime exposure multipliers from policy.portfolio.regime_budgets,
 * then computes the effective heat ceiling and sizing limits for the
 * current market regime.
 *
 * All thresholds come exclusively from the canonical policy (getPolicy()).
 */

import { getPolicy } from "@/lib/trading/config";
import type { MarketRegime } from "@/lib/trading/config";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface RegimeRiskAdjustment {
  regime: MarketRegime;
  /** Effective heat ceiling after applying the regime budget multiplier */
  heatCeiling: number;
  /** Multiplier applied to nominal position sizes */
  sizingMultiplier: number;
  /** Gross exposure budget (fraction of equity allowed) */
  exposureBudget: number;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Returns the regime-adjusted risk parameters for the given market regime.
 *
 * Formula:
 *   heatCeiling    = heat_normal_max_pct × regime_budget_multiplier
 *   sizingMultiplier = regimes[regime].sizing_multiplier
 *   exposureBudget   = portfolio.regime_budgets[regime]
 */
export function getRegimeRiskAdjustment(
  regime: MarketRegime,
): RegimeRiskAdjustment {
  const policy = getPolicy();
  const baseHeat = policy.runtime.risk.portfolio.heat_normal_max_pct;
  const regimeBudget = policy.portfolio.regime_budgets[regime];
  const sizingMultiplier = policy.regimes.regimes[regime].sizing_multiplier;

  return {
    regime,
    heatCeiling: baseHeat * regimeBudget,
    sizingMultiplier,
    exposureBudget: regimeBudget,
  };
}
