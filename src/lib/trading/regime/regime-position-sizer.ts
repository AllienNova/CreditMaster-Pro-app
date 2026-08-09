/**
 * Regime-Aware Position Sizer
 *
 * Adjusts a nominal base position size by the sizing multiplier for the
 * current market regime, then hard-caps the result at the policy's
 * per_trade.hard_max_pct ceiling.
 *
 * All thresholds come exclusively from the canonical policy (getPolicy()).
 */

import { getPolicy } from "@/lib/trading/config";
import type { MarketRegime } from "@/lib/trading/config";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Apply the regime sizing multiplier to a base position size fraction.
 *
 * @param baseSize - Nominal size as a decimal fraction of equity (e.g. 0.01 = 1%)
 * @param regime   - Current market regime
 * @returns Adjusted size, clamped to [0, hard_max_pct]
 */
export function adjustPositionSize(
  baseSize: number,
  regime: MarketRegime,
): number {
  const policy = getPolicy();
  const sizingMultiplier = policy.regimes.regimes[regime].sizing_multiplier;
  const hardMax = policy.runtime.risk.per_trade.hard_max_pct;

  const adjusted = baseSize * sizingMultiplier;
  return Math.min(hardMax, Math.max(0, adjusted));
}
