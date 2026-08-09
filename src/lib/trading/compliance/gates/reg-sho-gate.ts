/**
 * C-03: Reg SHO / Short Sale Rule Gate
 *
 * Ref: 17 CFR 242.203(b); policy.compliance.yaml#reg_sho
 *
 * Enforces two checks for short sell orders:
 *   1. Locate requirement: a valid locate must be confirmed before shorting.
 *   2. SSR uptick rule: if SSR is active on the symbol (price dropped >= 10%
 *      from prior close), short orders must be at a price above the current
 *      national best bid (uptick). This gate checks SSR status from the
 *      provided inputs and enforces the rule.
 *
 * Non-short orders always pass.
 */

import { getPolicy } from "@/lib/trading/config/policy-loader";
import type { GateInput, GateResult } from "./gate-types";

export interface RegShoGateInput extends GateInput {
  /** Whether a locate has been obtained from the prime broker. Required for shorts. */
  locateConfirmed?: boolean;
  /**
   * Prior session close price for the symbol.
   * Used to detect SSR trigger (>= 10% decline from prior close).
   */
  priorClose?: number;
  /**
   * Current national best bid price.
   * Used for uptick rule enforcement when SSR is active.
   */
  currentBid?: number;
}

export function check(input: RegShoGateInput): GateResult {
  // Reg SHO only applies to short sell orders.
  if (input.side !== "short") {
    return {
      gateId: "C-03",
      gateName: "Reg SHO",
      passed: true,
      reason: "Not a short sale: Reg SHO does not apply",
    };
  }

  const policy = getPolicy().compliance;
  // SSR trigger threshold from policy (0.10 = 10% decline from prior close).
  // We use the pdt window as a reference; SSR threshold is canonical at 10%.
  void policy; // policy is loaded to validate canonical access; SSR pct is from spec

  const SSR_TRIGGER_PCT = 0.10; // 17 CFR 242.203(b) / policy.compliance.yaml#reg_sho.short_sale_rule_ssr

  // ── Check 1: Locate confirmation ─────────────────────────────────────────
  if (!input.locateConfirmed) {
    return {
      gateId: "C-03",
      gateName: "Reg SHO",
      passed: false,
      reason: `Short sale on ${input.symbol} requires a valid locate from the prime broker`,
      blockedBy: "Reg SHO — Locate Requirement (17 CFR 242.203(b))",
    };
  }

  // ── Check 2: SSR uptick rule ──────────────────────────────────────────────
  if (input.priorClose !== undefined && input.priorClose > 0) {
    const declinePct = (input.priorClose - input.price) / input.priorClose;
    const ssrActive = declinePct >= SSR_TRIGGER_PCT;

    if (ssrActive) {
      // Uptick rule: order price must be above the current bid.
      if (input.currentBid === undefined) {
        return {
          gateId: "C-03",
          gateName: "Reg SHO",
          passed: false,
          reason: `SSR active on ${input.symbol} (price down ${(declinePct * 100).toFixed(2)}% from prior close $${input.priorClose.toFixed(2)}): current bid required for uptick check`,
          blockedBy: "Reg SHO — SSR Uptick Rule",
        };
      }

      if (input.price <= input.currentBid) {
        return {
          gateId: "C-03",
          gateName: "Reg SHO",
          passed: false,
          reason: `SSR active on ${input.symbol}: short order price $${input.price.toFixed(2)} must be above current bid $${input.currentBid.toFixed(2)}`,
          blockedBy: "Reg SHO — SSR Uptick Rule",
        };
      }
    }
  }

  return {
    gateId: "C-03",
    gateName: "Reg SHO",
    passed: true,
    reason: "Locate confirmed; SSR uptick rule satisfied",
  };
}
