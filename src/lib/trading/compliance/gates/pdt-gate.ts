/**
 * C-01: Pattern Day Trader (PDT) Gate
 *
 * Ref: FINRA Rule 4210; policy.compliance.yaml#pdt
 *
 * Blocks new opening trades when:
 *   - Account equity is below the equity_threshold_usd, AND
 *   - The number of day trades in the rolling window >= max_day_trades_in_window
 *
 * A "day trade" is defined as opening and closing the same symbol within
 * the same session (round trip). The caller is responsible for tracking and
 * passing `dayTradesInWindow` — this gate does not persist state.
 *
 * Cash accounts are exempt from PDT (cash_account_exempt: true).
 */

import { getPolicy } from "@/lib/trading/config/policy-loader";
import type { GateInput, GateResult } from "./gate-types";

export interface PdtGateInput extends GateInput {
  /** Number of completed round-trip day trades in the rolling 5-session window. */
  dayTradesInWindow: number;
  /** Set to true if account is a cash account (exempt from PDT). */
  isCashAccount?: boolean;
}

export function check(input: PdtGateInput): GateResult {
  const { pdt } = getPolicy().compliance;
  const { equity_threshold_usd, max_day_trades_in_window } = pdt;

  // Cash accounts are exempt from PDT restrictions.
  if (input.isCashAccount) {
    return {
      gateId: "C-01",
      gateName: "PDT",
      passed: true,
      reason: "Cash account: PDT rule does not apply",
    };
  }

  // Only applies to opening trades (buy or short sell to open).
  // Closing trades (sell to close) are never blocked by PDT.
  if (input.side === "sell") {
    return {
      gateId: "C-01",
      gateName: "PDT",
      passed: true,
      reason: "Sell-to-close order: PDT check not required",
    };
  }

  // Account is above equity threshold — PDT restrictions do not apply.
  if (input.accountEquity >= equity_threshold_usd) {
    return {
      gateId: "C-01",
      gateName: "PDT",
      passed: true,
      reason: `Account equity $${input.accountEquity.toFixed(2)} meets $${equity_threshold_usd} threshold`,
    };
  }

  // Equity is below threshold — enforce the day trade limit.
  if (input.dayTradesInWindow >= max_day_trades_in_window) {
    return {
      gateId: "C-01",
      gateName: "PDT",
      passed: false,
      reason: `Day trade limit reached: ${input.dayTradesInWindow} trades in rolling window (max ${max_day_trades_in_window}) with equity $${input.accountEquity.toFixed(2)} below $${equity_threshold_usd} threshold`,
      blockedBy: "FINRA Rule 4210 — Pattern Day Trader",
    };
  }

  return {
    gateId: "C-01",
    gateName: "PDT",
    passed: true,
    reason: `${input.dayTradesInWindow}/${max_day_trades_in_window} day trades used in rolling window`,
  };
}
