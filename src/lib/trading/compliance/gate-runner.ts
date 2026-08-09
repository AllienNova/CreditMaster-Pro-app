/**
 * Compliance Gate Runner
 *
 * Executes all 7 regulatory compliance gates sequentially.
 * Gates run in policy-defined order: MWCB before LULD (market-wide checks
 * before symbol-level checks), then all remaining gates.
 *
 * ALL gates run regardless of earlier failures — the runner collects every
 * violation to give the caller a complete picture before blocking.
 *
 * Usage:
 *   const result = runAllGates({ userId, symbol, side, quantity, price,
 *                                accountEquity, spxChangePct, ... });
 *   if (!result.allPassed) {
 *     // result.blockedGates contains every failing gate
 *   }
 */

import type { GateInput, GateResult } from "./gates/gate-types";
import type { AuctionState, OrderType } from "./gates/auction-gate";
import { check as checkPdt, type PdtGateInput } from "./gates/pdt-gate";
import { check as checkSec15c35, type Sec15c35GateInput } from "./gates/sec-15c3-5-gate";
import { check as checkRegSho, type RegShoGateInput } from "./gates/reg-sho-gate";
import { check as checkMwcb, type MwcbGateInput } from "./gates/mwcb-gate";
import { check as checkLuld, type LuldGateInput } from "./gates/luld-gate";
import { check as checkAuction, type AuctionGateInput } from "./gates/auction-gate";
import { check as checkRestrictedList, type RestrictedListGateInput } from "./gates/restricted-list-gate";

// ============================================================================
// TYPES
// ============================================================================

export interface GateRunnerInput extends GateInput {
  // C-01: PDT
  dayTradesInWindow?: number;
  isCashAccount?: boolean;

  // C-02: SEC 15c3-5
  lastKnownPrice?: number;
  existingNotional?: number;

  // C-03: Reg SHO
  locateConfirmed?: boolean;
  priorClose?: number;
  currentBid?: number;

  // C-04: MWCB
  spxChangePct?: number;

  // C-05: LULD
  luldUpperBand?: number;
  luldLowerBand?: number;
  tier?: "tier1" | "tier2";

  // C-06: Auction
  auctionState?: AuctionState;
  orderType?: OrderType;

  // C-07: Restricted List
  restrictedSymbols?: string[];
}

export interface GateRunnerResult {
  allPassed: boolean;
  results: GateResult[];
  blockedGates: GateResult[];
}

// ============================================================================
// RUNNER
// ============================================================================

/**
 * Run all 7 compliance gates against the provided input.
 *
 * Execution order:
 *   1. C-04 MWCB    — market-wide circuit breaker (broadest scope, first)
 *   2. C-05 LULD    — symbol-level price bands (narrower than MWCB)
 *   3. C-06 Auction — session/exchange state
 *   4. C-01 PDT     — account-level day trade count
 *   5. C-02 SEC     — pre-trade risk checks
 *   6. C-03 Reg SHO — short sale locate + SSR
 *   7. C-07 Restricted — symbol restricted list
 *
 * All gates run regardless of failures (no short-circuit).
 */
export function runAllGates(input: GateRunnerInput): GateRunnerResult {
  const base: GateInput = {
    userId: input.userId,
    symbol: input.symbol,
    side: input.side,
    quantity: input.quantity,
    price: input.price,
    accountEquity: input.accountEquity,
  };

  const mwcbInput: MwcbGateInput = { ...base, spxChangePct: input.spxChangePct };
  const luldInput: LuldGateInput = {
    ...base,
    luldUpperBand: input.luldUpperBand,
    luldLowerBand: input.luldLowerBand,
    tier: input.tier,
  };
  const auctionInput: AuctionGateInput = {
    ...base,
    auctionState: input.auctionState,
    orderType: input.orderType,
  };
  const pdtInput: PdtGateInput = {
    ...base,
    dayTradesInWindow: input.dayTradesInWindow ?? 0,
    isCashAccount: input.isCashAccount,
  };
  const secInput: Sec15c35GateInput = {
    ...base,
    lastKnownPrice: input.lastKnownPrice,
    existingNotional: input.existingNotional,
  };
  const regShoInput: RegShoGateInput = {
    ...base,
    locateConfirmed: input.locateConfirmed,
    priorClose: input.priorClose,
    currentBid: input.currentBid,
  };
  const restrictedInput: RestrictedListGateInput = {
    ...base,
    restrictedSymbols: input.restrictedSymbols,
  };

  const results: GateResult[] = [
    checkMwcb(mwcbInput),
    checkLuld(luldInput),
    checkAuction(auctionInput),
    checkPdt(pdtInput),
    checkSec15c35(secInput),
    checkRegSho(regShoInput),
    checkRestrictedList(restrictedInput),
  ];

  const blockedGates = results.filter((r) => !r.passed);

  return {
    allPassed: blockedGates.length === 0,
    results,
    blockedGates,
  };
}
