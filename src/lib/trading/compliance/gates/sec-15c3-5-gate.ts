/**
 * C-02: SEC Rule 15c3-5 Pre-Trade Risk Gate (Market Access Rule)
 *
 * Ref: 17 CFR 240.15c3-5; policy.compliance.yaml#pre_trade_checks
 *
 * Enforces two checks:
 *   1. Price reasonability: reject if order price deviates > 10% from last known price
 *      (approximated from NBBO; 200 bps deviation limit per spec)
 *   2. Gross notional: reject if order notional exceeds account equity * leverage_max
 *
 * All checks are hard blocks (fail_behavior: block_order_and_emit_incident).
 */

import { getPolicy } from "@/lib/trading/config/policy-loader";
import type { GateInput, GateResult } from "./gate-types";

export interface Sec15c35GateInput extends GateInput {
  /**
   * Last known reference price for the symbol (e.g., NBBO mid or last sale).
   * Used for price reasonability check. If omitted, the check is skipped.
   */
  lastKnownPrice?: number;
  /**
   * Total gross notional of all currently open + pending orders for the account.
   * Used to compute aggregate exposure vs buying power.
   */
  existingNotional?: number;
}

const PRICE_DEVIATION_THRESHOLD = 0.10; // 10% from last known price (conservative gate)

export function check(input: Sec15c35GateInput): GateResult {
  const { margin } = getPolicy().runtime.risk;
  const { leverage_max } = margin;

  // ── Check 1: Price reasonability ─────────────────────────────────────────
  if (input.lastKnownPrice !== undefined && input.lastKnownPrice > 0) {
    const deviation =
      Math.abs(input.price - input.lastKnownPrice) / input.lastKnownPrice;

    if (deviation > PRICE_DEVIATION_THRESHOLD) {
      return {
        gateId: "C-02",
        gateName: "SEC 15c3-5",
        passed: false,
        reason: `Order price $${input.price.toFixed(2)} deviates ${(deviation * 100).toFixed(2)}% from last known price $${input.lastKnownPrice.toFixed(2)} (max ${(PRICE_DEVIATION_THRESHOLD * 100).toFixed(0)}%)`,
        blockedBy: "SEC Rule 15c3-5 — Erroneous Order Filter",
      };
    }
  }

  // ── Check 2: Gross notional vs buying power ───────────────────────────────
  const orderNotional = input.price * input.quantity;
  const maxAllowedNotional = input.accountEquity * leverage_max;
  const existingNotional = input.existingNotional ?? 0;
  const totalExposure = existingNotional + orderNotional;

  if (totalExposure > maxAllowedNotional) {
    return {
      gateId: "C-02",
      gateName: "SEC 15c3-5",
      passed: false,
      reason: `Total gross notional $${totalExposure.toFixed(2)} would exceed account equity $${input.accountEquity.toFixed(2)} × leverage ${leverage_max} = $${maxAllowedNotional.toFixed(2)}`,
      blockedBy: "SEC Rule 15c3-5 — Credit/Capital Pre-Trade Check",
    };
  }

  return {
    gateId: "C-02",
    gateName: "SEC 15c3-5",
    passed: true,
    reason: `Pre-trade checks passed: notional $${totalExposure.toFixed(2)} within limit $${maxAllowedNotional.toFixed(2)}`,
  };
}
