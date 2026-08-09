/**
 * Shared types for regulatory compliance gates.
 *
 * All 7 gates (C-01 through C-07) share the same input/output contract.
 * Each gate is a pure function: no side effects, no DB calls.
 */

export interface GateInput {
  userId: string;
  symbol: string;
  side: "buy" | "sell" | "short";
  quantity: number;
  price: number;
  accountEquity: number;
}

export interface GateResult {
  gateId: string;
  gateName: string;
  passed: boolean;
  reason?: string;
  blockedBy?: string;
}
