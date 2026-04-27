/**
 * Law 21 Position Sizer
 *
 * size = (equity * risk_fraction) / |entry - invalidation|
 *
 * Respects per_trade.hard_max_pct as an absolute ceiling from canonical policy.
 * Rounds down to the nearest tick/lot size.
 * Never returns 0 shares for valid inputs (minimum 1 share).
 */

import { getPolicy } from "@/lib/trading/config";

// ============================================================================
// TYPES
// ============================================================================

export interface PositionSizeParams {
  equity: number;
  riskFractionPct: number; // decimal fraction, e.g. 0.01 = 1%
  entryPrice: number;
  invalidationPrice: number;
  tickSize?: number; // minimum price increment for lot rounding
  maxNotional?: number; // optional notional cap from stage gates
}

export interface PositionSizeResult {
  shares: number;
  riskAmount: number;
  notional: number;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Calculate the number of shares to trade using Law 21 position sizing.
 *
 * @param params - Sizing parameters
 * @returns shares (rounded down to tick), dollar risk amount, and notional value
 */
export function calculatePositionSize(params: PositionSizeParams): PositionSizeResult {
  const { equity, riskFractionPct, entryPrice, invalidationPrice, tickSize, maxNotional } = params;

  // Degenerate inputs: return minimum 1 share if prices are valid
  if (equity <= 0 || entryPrice <= 0) {
    return { shares: 0, riskAmount: 0, notional: 0 };
  }

  const policy = getPolicy();
  const hardMaxPct = policy.runtime.risk.per_trade.hard_max_pct;

  // Effective risk fraction: clamp to hard_max_pct ceiling
  const effectiveRisk = Math.min(riskFractionPct, hardMaxPct);

  // Dollar risk budget
  const riskBudget = equity * effectiveRisk;

  // Distance from entry to invalidation (stop)
  const distance = Math.abs(entryPrice - invalidationPrice);

  let rawShares: number;
  if (distance === 0) {
    // Entry === invalidation: risk per share is zero, cap by notional limit
    rawShares = maxNotional ? maxNotional / entryPrice : 1;
  } else {
    rawShares = riskBudget / distance;
  }

  // Round down to tick-aligned lot size
  let shares = roundDownToTick(rawShares, tickSize);

  // Apply notional cap from stage gates
  if (maxNotional !== undefined && maxNotional > 0) {
    const maxSharesByNotional = Math.floor(maxNotional / entryPrice);
    shares = Math.min(shares, maxSharesByNotional);
  }

  // Minimum 1 share for any valid input
  shares = Math.max(1, shares);

  const riskAmount = shares * distance;
  const notional = shares * entryPrice;

  return { shares, riskAmount, notional };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Round a share count down to the nearest lot aligned to tickSize.
 * If no tickSize is provided, floors to the nearest integer.
 */
function roundDownToTick(shares: number, tickSize?: number): number {
  if (!tickSize || tickSize <= 0) {
    return Math.floor(shares);
  }
  return Math.floor(shares / tickSize) * tickSize;
}
