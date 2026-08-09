/**
 * C-06: Auction State Gate
 *
 * Ref: Exchange rulebooks (NYSE, NASDAQ, CBOE); policy.compliance.yaml#auction_states
 *
 * Controls order admission based on the current auction state of the exchange:
 *
 *   normal:   Regular session — all order types allowed.
 *   opening:  Opening cross window — only limit and MOO orders allowed.
 *             Block market, stop, and stop-limit orders.
 *   closing:  Closing auction window — only limit, MOC, and LOC orders allowed.
 *             Block market, stop, and stop-limit orders.
 *   halted:   Security-specific or market-wide halt — ALL orders blocked.
 *
 * The `orderType` field indicates what kind of order is being submitted.
 * If not provided, the gate assumes a market order (most restrictive check).
 */

import type { GateInput, GateResult } from "./gate-types";

export type AuctionState = "normal" | "opening" | "closing" | "halted";
export type OrderType =
  | "market"
  | "limit"
  | "stop"
  | "stop_limit"
  | "market_on_open"
  | "market_on_close"
  | "limit_on_close";

export interface AuctionGateInput extends GateInput {
  /** Current auction state of the exchange/symbol. Defaults to "normal". */
  auctionState?: AuctionState;
  /** Type of order being submitted. Defaults to "market" for conservative checking. */
  orderType?: OrderType;
}

const OPENING_ALLOWED: ReadonlySet<OrderType> = new Set([
  "limit",
  "market_on_open",
]);

const CLOSING_ALLOWED: ReadonlySet<OrderType> = new Set([
  "limit",
  "market_on_close",
  "limit_on_close",
]);

export function check(input: AuctionGateInput): GateResult {
  const state: AuctionState = input.auctionState ?? "normal";
  const orderType: OrderType = input.orderType ?? "market";

  switch (state) {
    case "normal":
      return {
        gateId: "C-06",
        gateName: "Auction",
        passed: true,
        reason: "Normal session: all order types permitted",
      };

    case "halted":
      return {
        gateId: "C-06",
        gateName: "Auction",
        passed: false,
        reason: `All orders blocked during trading halt on ${input.symbol}`,
        blockedBy: "Exchange Halt — Auction State C-06",
      };

    case "opening":
      if (!OPENING_ALLOWED.has(orderType)) {
        return {
          gateId: "C-06",
          gateName: "Auction",
          passed: false,
          reason: `Order type "${orderType}" not permitted during opening auction — only limit and MOO orders are allowed`,
          blockedBy: "Exchange Opening Auction — Auction State C-06",
        };
      }
      return {
        gateId: "C-06",
        gateName: "Auction",
        passed: true,
        reason: `Order type "${orderType}" is permitted during opening auction`,
      };

    case "closing":
      if (!CLOSING_ALLOWED.has(orderType)) {
        return {
          gateId: "C-06",
          gateName: "Auction",
          passed: false,
          reason: `Order type "${orderType}" not permitted during closing auction — only limit, MOC, and LOC orders are allowed`,
          blockedBy: "Exchange Closing Auction — Auction State C-06",
        };
      }
      return {
        gateId: "C-06",
        gateName: "Auction",
        passed: true,
        reason: `Order type "${orderType}" is permitted during closing auction`,
      };

    default: {
      // Exhaustive check — TypeScript should prevent reaching here.
      const _exhaustive: never = state;
      return {
        gateId: "C-06",
        gateName: "Auction",
        passed: false,
        reason: `Unknown auction state: ${String(_exhaustive)}`,
        blockedBy: "Unknown Auction State — Auction State C-06",
      };
    }
  }
}
