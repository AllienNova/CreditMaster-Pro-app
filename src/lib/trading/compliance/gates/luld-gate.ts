/**
 * C-05: LULD (Limit Up / Limit Down) Gate
 *
 * Ref: SEC Rule 201; FINRA LULD Plan; policy.compliance.yaml#luld
 *
 * Rejects orders whose price falls outside the LULD price bands for the symbol.
 * Bands are provided by the caller (computed from exchange feed) as absolute prices.
 *
 * Tier classification:
 *   Tier 1 (S&P 500 / Russell 1000): ±5% bands (from policy tier1_band_pct)
 *   Tier 2 (all others): ±10% bands (from policy tier2_band_pct)
 *
 * The gate does not compute bands — it validates the order price against
 * `luldUpperBand` and `luldLowerBand` provided as inputs. If neither band is
 * provided, the gate passes (no data = no block).
 *
 * Thresholds are read from `getPolicy().compliance.luld`.
 */

import { getPolicy } from "@/lib/trading/config/policy-loader";
import type { GateInput, GateResult } from "./gate-types";

export interface LuldGateInput extends GateInput {
  /**
   * Upper LULD price band for the symbol (absolute price).
   * Orders to buy above this price are blocked.
   */
  luldUpperBand?: number;
  /**
   * Lower LULD price band for the symbol (absolute price).
   * Orders to sell/short below this price are blocked.
   */
  luldLowerBand?: number;
  /**
   * Tier classification: "tier1" = S&P 500/Russell 1000, "tier2" = all others.
   * Defaults to "tier2" if not provided (more conservative).
   */
  tier?: "tier1" | "tier2";
}

export function check(input: LuldGateInput): GateResult {
  const { luld } = getPolicy().compliance;
  const bandPct =
    input.tier === "tier1" ? luld.tier1_band_pct : luld.tier2_band_pct;

  // If neither band is provided, we cannot enforce LULD — pass through.
  if (input.luldUpperBand === undefined && input.luldLowerBand === undefined) {
    return {
      gateId: "C-05",
      gateName: "LULD",
      passed: true,
      reason: "LULD bands not provided: check skipped",
    };
  }

  const tierLabel = input.tier === "tier1" ? "Tier 1" : "Tier 2";

  // Buy orders must not exceed the upper band.
  if (
    input.side === "buy" &&
    input.luldUpperBand !== undefined &&
    input.price > input.luldUpperBand
  ) {
    return {
      gateId: "C-05",
      gateName: "LULD",
      passed: false,
      reason: `${tierLabel} buy order price $${input.price.toFixed(2)} exceeds LULD upper band $${input.luldUpperBand.toFixed(2)} (±${(bandPct * 100).toFixed(0)}% band)`,
      blockedBy: "SEC Rule 201 — LULD Limit Up",
    };
  }

  // Sell and short orders must not go below the lower band.
  if (
    (input.side === "sell" || input.side === "short") &&
    input.luldLowerBand !== undefined &&
    input.price < input.luldLowerBand
  ) {
    return {
      gateId: "C-05",
      gateName: "LULD",
      passed: false,
      reason: `${tierLabel} ${input.side} order price $${input.price.toFixed(2)} is below LULD lower band $${input.luldLowerBand.toFixed(2)} (±${(bandPct * 100).toFixed(0)}% band)`,
      blockedBy: "SEC Rule 201 — LULD Limit Down",
    };
  }

  return {
    gateId: "C-05",
    gateName: "LULD",
    passed: true,
    reason: `${tierLabel} order price $${input.price.toFixed(2)} is within LULD bands [${input.luldLowerBand?.toFixed(2) ?? "?"}, ${input.luldUpperBand?.toFixed(2) ?? "?"}]`,
  };
}
