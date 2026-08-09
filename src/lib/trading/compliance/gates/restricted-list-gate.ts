/**
 * C-07: Restricted List Gate
 *
 * Ref: policy.compliance.yaml#restricted_list
 *
 * Checks whether the order symbol appears on the restricted list.
 * The restricted list is provided as an array of symbols by the caller
 * (sourced externally — e.g., refreshed hourly from an internal API).
 *
 * This is a hard pre-trade gate: any symbol on the restricted list
 * results in an immediate block for all order sides.
 *
 * If no restricted list is provided, the gate passes (fail-open — no list
 * means no restriction, as opposed to the spec's fail-safe mode which is
 * handled at the infrastructure layer with list staleness detection).
 */

import type { GateInput, GateResult } from "./gate-types";

export interface RestrictedListGateInput extends GateInput {
  /**
   * Current restricted symbols list. Case-sensitive symbol comparison.
   * Source: external compliance feed (refreshed every 3600s per spec).
   */
  restrictedSymbols?: string[];
}

export function check(input: RestrictedListGateInput): GateResult {
  if (!input.restrictedSymbols || input.restrictedSymbols.length === 0) {
    return {
      gateId: "C-07",
      gateName: "Restricted List",
      passed: true,
      reason: "No restricted list provided: check skipped",
    };
  }

  const restrictedSet = new Set(input.restrictedSymbols);

  if (restrictedSet.has(input.symbol)) {
    return {
      gateId: "C-07",
      gateName: "Restricted List",
      passed: false,
      reason: `Symbol ${input.symbol} is on the restricted list`,
      blockedBy: "Restricted List — C-07",
    };
  }

  return {
    gateId: "C-07",
    gateName: "Restricted List",
    passed: true,
    reason: `Symbol ${input.symbol} is not on the restricted list`,
  };
}
