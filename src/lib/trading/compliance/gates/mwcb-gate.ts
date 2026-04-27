/**
 * C-04: Market-Wide Circuit Breaker (MWCB) Gate
 *
 * Ref: SEC Rule 80B; policy.compliance.yaml#mwcb
 *
 * Measures the percentage decline of the S&P 500 from the prior calendar-day
 * close and enforces the three halt levels:
 *
 *   Level 1 (7%):  15-minute trading halt — block all new orders.
 *   Level 2 (13%): 15-minute trading halt — block all new orders.
 *   Level 3 (20%): Halt for remainder of session — block all new orders.
 *
 * The caller provides `spxChangePct` as a signed percentage (negative = decline).
 * If `spxChangePct` is not provided, the gate passes (no market data = no block).
 *
 * Thresholds are read from `getPolicy().compliance.mwcb`.
 */

import { getPolicy } from "@/lib/trading/config/policy-loader";
import type { GateInput, GateResult } from "./gate-types";

export interface MwcbGateInput extends GateInput {
  /**
   * S&P 500 percentage change from the prior session close.
   * Negative values indicate a decline (e.g., -0.08 = down 8%).
   * If omitted, no MWCB check is performed.
   */
  spxChangePct?: number;
}

export function check(input: MwcbGateInput): GateResult {
  if (input.spxChangePct === undefined) {
    return {
      gateId: "C-04",
      gateName: "MWCB",
      passed: true,
      reason: "S&P 500 reference data not provided: MWCB check skipped",
    };
  }

  const { mwcb } = getPolicy().compliance;
  const { level1_pct, level2_pct, level3_pct } = mwcb;

  // Convert signed change to a positive decline for comparison.
  const declinePct = -input.spxChangePct;

  if (declinePct >= level3_pct) {
    return {
      gateId: "C-04",
      gateName: "MWCB",
      passed: false,
      reason: `S&P 500 down ${(declinePct * 100).toFixed(2)}% — MWCB Level 3 (≥${(level3_pct * 100).toFixed(0)}%): session closed for remainder of day`,
      blockedBy: "SEC Rule 80B — MWCB Level 3",
    };
  }

  if (declinePct >= level2_pct) {
    return {
      gateId: "C-04",
      gateName: "MWCB",
      passed: false,
      reason: `S&P 500 down ${(declinePct * 100).toFixed(2)}% — MWCB Level 2 (≥${(level2_pct * 100).toFixed(0)}%): 15-minute trading halt`,
      blockedBy: "SEC Rule 80B — MWCB Level 2",
    };
  }

  if (declinePct >= level1_pct) {
    return {
      gateId: "C-04",
      gateName: "MWCB",
      passed: false,
      reason: `S&P 500 down ${(declinePct * 100).toFixed(2)}% — MWCB Level 1 (≥${(level1_pct * 100).toFixed(0)}%): 15-minute trading halt`,
      blockedBy: "SEC Rule 80B — MWCB Level 1",
    };
  }

  return {
    gateId: "C-04",
    gateName: "MWCB",
    passed: true,
    reason: `S&P 500 change ${(input.spxChangePct * 100).toFixed(2)}% — no circuit breaker triggered`,
  };
}
