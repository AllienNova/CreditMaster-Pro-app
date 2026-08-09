/**
 * Transaction Cost Model
 *
 * Estimates the full cost of a trade: commission + spread + market impact (slippage).
 * Slippage uses the square-root impact model: slippage = sigma * sqrt(shares / ADV).
 * Provides size adjustment to keep cost + risk within the risk budget.
 */

import { getPolicy } from "@/lib/trading/config";

// ============================================================================
// TYPES
// ============================================================================

export interface TransactionCostParams {
  price: number;
  shares: number;
  side: "buy" | "sell";
  venue?: string;
  /** Daily volatility as decimal fraction (e.g. 0.02 = 2%) */
  sigma?: number;
  /** Average daily volume in shares */
  adv?: number;
  /** Bid-ask spread in basis points */
  spreadBps?: number;
}

export interface TransactionCost {
  commission: number;
  spreadCost: number;
  slippageCost: number;
  totalCost: number;
  totalBps: number;
}

export interface AdjustSizeParams {
  rawShares: number;
  entryPrice: number;
  targetRiskPct: number;
  equity: number;
  costs: TransactionCost;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** DMA commission per share */
const DMA_COMMISSION_PER_SHARE = 0.005;

/** Default bid-ask spread when not provided (basis points) */
const DEFAULT_SPREAD_BPS = 5;

/** Default daily volatility when not provided */
const DEFAULT_SIGMA = 0.02;

/** Default ADV when not provided (shares) */
const DEFAULT_ADV = 1_000_000;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Estimate the total transaction cost for a trade.
 *
 * - Commission: $0 for retail venues, $0.005/share for DMA.
 * - Spread cost: half the bid-ask spread * shares.
 * - Slippage: square-root impact model sigma * sqrt(shares / ADV).
 */
export function estimateTransactionCost(params: TransactionCostParams): TransactionCost {
  const { price, shares, venue } = params;
  const sigma = params.sigma ?? DEFAULT_SIGMA;
  const adv = params.adv ?? DEFAULT_ADV;
  const spreadBps = params.spreadBps ?? DEFAULT_SPREAD_BPS;

  if (price <= 0 || shares <= 0) {
    return { commission: 0, spreadCost: 0, slippageCost: 0, totalCost: 0, totalBps: 0 };
  }

  // Commission: tiered by venue
  const isDMA = venue === "dma" || venue === "DMA";
  const commission = isDMA ? DMA_COMMISSION_PER_SHARE * shares : 0;

  // Spread cost: half the bid-ask spread * shares
  const halfSpreadFraction = (spreadBps / 10_000) / 2;
  const spreadCost = halfSpreadFraction * price * shares;

  // Slippage: square-root impact model
  // slippage_per_share = sigma * sqrt(shares / ADV) * price
  const participationRate = adv > 0 ? shares / adv : 0;
  const slippagePerShare = sigma * Math.sqrt(participationRate) * price;
  const slippageCost = slippagePerShare * shares;

  const totalCost = commission + spreadCost + slippageCost;
  const notional = price * shares;
  const totalBps = notional > 0 ? (totalCost / notional) * 10_000 : 0;

  return { commission, spreadCost, slippageCost, totalCost, totalBps };
}

/**
 * Reduce position size so that cost + risk stays within the risk budget.
 *
 * The risk budget is equity * targetRiskPct. The adjusted size ensures that
 * the total transaction cost does not consume more than 10% of the risk budget
 * (capped by policy slippage_threshold_bps as a sanity check).
 *
 * Returns the adjusted number of shares (always <= rawShares).
 */
export function adjustSizeForCosts(params: AdjustSizeParams): number {
  const { rawShares, entryPrice, targetRiskPct, equity, costs } = params;

  if (rawShares <= 0 || entryPrice <= 0 || equity <= 0) return 0;

  const policy = getPolicy();
  const slippageThresholdBps = policy.execution.slippage_threshold_bps;

  // Risk budget in dollars
  const riskBudget = equity * targetRiskPct;
  if (riskBudget <= 0) return 0;

  // Cost as fraction of risk budget
  const costFraction = costs.totalCost / riskBudget;

  // If costs are within 10% of risk budget, no adjustment needed
  if (costFraction <= 0.1) return rawShares;

  // Also check against policy slippage threshold
  if (costs.totalBps <= slippageThresholdBps) return rawShares;

  // Scale down: find the share count where cost / riskBudget <= 0.1
  // Cost is approximately linear in shares (commission + spread) plus
  // nonlinear (slippage ~ shares^1.5). Use iterative binary search.
  let lo = 1;
  let hi = rawShares;
  let best = 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const trialCost = estimateTransactionCost({
      price: entryPrice,
      shares: mid,
      side: "buy",
      sigma: costs.slippageCost > 0 ? undefined : undefined,
    });
    const trialFraction = trialCost.totalCost / riskBudget;

    if (trialFraction <= 0.1) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return Math.min(best, rawShares);
}
