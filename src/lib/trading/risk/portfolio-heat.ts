/**
 * Portfolio Heat Model
 *
 * Measures real portfolio risk using the covariance matrix of position returns.
 *
 * Portfolio heat = sqrt(w^T * Cov * w) / equity
 *
 * Heat ceilings are regime-aware, sourced from canonical policy:
 *   - trending / ranging / transition → heat_normal_max_pct  (R-06)
 *   - shock                          → heat_shock_max_pct   (R-07)
 *   - crisis                         → heat_crisis_max_pct  (R-08)
 */

import { getPolicy } from "@/lib/trading/config";
import type { MarketRegime } from "@/lib/trading/config";

// ============================================================================
// TYPES
// ============================================================================

export interface HeatBudgetResult {
  allowed: boolean;
  ceiling: number;
  utilization: number;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Compute portfolio heat from weights and covariance matrix.
 *
 * heat = sqrt(w^T * Cov * w) / equity
 *
 * @param weights   - Array of position weights (dollar values or fractions)
 * @param covMatrix - NxN covariance matrix (from computeCovarianceMatrix)
 * @param equity    - Total account equity (positive)
 * @returns Portfolio heat as a decimal fraction (e.g. 0.04 = 4%)
 */
export function computePortfolioHeat(
  weights: number[],
  covMatrix: number[][],
  equity: number,
): number {
  if (equity <= 0) return 0;
  if (weights.length === 0) return 0;

  const n = weights.length;
  if (covMatrix.length !== n) {
    throw new Error(
      `Dimension mismatch: ${n} weights but ${covMatrix.length}x covariance matrix`,
    );
  }

  // σ²_p = w^T * Cov * w = Σ_i Σ_j w_i * w_j * Cov[i][j]
  let portfolioVariance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const covIJ = covMatrix[i]?.[j] ?? 0;
      portfolioVariance += weights[i] * weights[j] * (Number.isFinite(covIJ) ? covIJ : 0);
    }
  }

  // Guard against floating-point noise producing a tiny negative
  const portfolioStdDev = Math.sqrt(Math.max(0, portfolioVariance));

  return portfolioStdDev / equity;
}

/**
 * Check whether the current portfolio heat is within the regime-based ceiling.
 *
 * @param heat   - Current portfolio heat (decimal fraction from computePortfolioHeat)
 * @param regime - Current market regime
 * @returns Whether heat is allowed, the ceiling, and utilization ratio
 */
export function checkHeatBudget(
  heat: number,
  regime: MarketRegime,
): HeatBudgetResult {
  const ceiling = getHeatCeiling(regime);
  const utilization = ceiling > 0 ? heat / ceiling : (heat > 0 ? Infinity : 0);

  return {
    allowed: heat <= ceiling,
    ceiling,
    utilization,
  };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Map a market regime to the appropriate heat ceiling from canonical policy.
 */
function getHeatCeiling(regime: MarketRegime): number {
  const policy = getPolicy();
  const heatLimits = policy.runtime.risk.portfolio;

  switch (regime) {
    case "trending":
    case "ranging":
    case "transition":
      return heatLimits.heat_normal_max_pct;
    case "shock":
      return heatLimits.heat_shock_max_pct;
    case "crisis":
      return heatLimits.heat_crisis_max_pct;
  }
}
