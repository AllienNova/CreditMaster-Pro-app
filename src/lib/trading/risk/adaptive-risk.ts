/**
 * Adaptive Risk Feedback
 *
 * Dynamically adjusts position risk fraction based on rolling performance.
 * Uses Sharpe ratio and drawdown to scale risk up (during hot streaks)
 * or down (during drawdowns), always bounded by policy hard_max_pct.
 */

import { getPolicy } from "@/lib/trading/config";

// ============================================================================
// TYPES
// ============================================================================

export interface AdaptiveRiskParams {
  recentReturns: number[];
  windowDays: number;
  baseRiskPct: number;
}

export interface AdaptiveRiskResult {
  adjustedRiskPct: number;
  multiplier: number;
  reason: string;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Compute an adaptive risk fraction based on rolling performance.
 *
 * Rules:
 *   - Rolling Sharpe > 1.5  -> up to 1.25x base risk
 *   - Rolling Sharpe 0.5-1.5 -> 1.0x (no change)
 *   - Rolling Sharpe < 0.5  -> 0.5x
 *   - Drawdown > 10%        -> 0.3x (overrides Sharpe)
 *
 * The result never exceeds per_trade.hard_max_pct from policy.
 */
export function computeAdaptiveRisk(params: AdaptiveRiskParams): AdaptiveRiskResult {
  const { recentReturns, windowDays, baseRiskPct } = params;

  const policy = getPolicy();
  const hardMaxPct = policy.runtime.risk.per_trade.hard_max_pct;

  // Not enough data: return base risk
  if (recentReturns.length < 2) {
    return {
      adjustedRiskPct: Math.min(baseRiskPct, hardMaxPct),
      multiplier: 1.0,
      reason: "insufficient data for adaptive adjustment",
    };
  }

  // Use the most recent windowDays of returns
  const window = recentReturns.slice(-windowDays);
  if (window.length < 2) {
    return {
      adjustedRiskPct: Math.min(baseRiskPct, hardMaxPct),
      multiplier: 1.0,
      reason: "insufficient data for adaptive adjustment",
    };
  }

  // Check drawdown first (overrides Sharpe-based scaling)
  const maxDrawdown = computeMaxDrawdown(window);
  if (maxDrawdown > 0.1) {
    const multiplier = 0.3;
    const adjusted = Math.min(baseRiskPct * multiplier, hardMaxPct);
    return {
      adjustedRiskPct: adjusted,
      multiplier,
      reason: `drawdown ${(maxDrawdown * 100).toFixed(1)}% exceeds 10% threshold`,
    };
  }

  // Sharpe-based scaling
  const sharpe = computeRollingSharpe(window);

  let multiplier: number;
  let reason: string;

  if (sharpe > 1.5) {
    // Scale linearly from 1.0 at Sharpe=1.5 to 1.25 at Sharpe=3.0+
    multiplier = Math.min(1.25, 1.0 + (sharpe - 1.5) / 6);
    reason = `rolling Sharpe ${sharpe.toFixed(2)} > 1.5, scaling up`;
  } else if (sharpe < 0.5) {
    multiplier = 0.5;
    reason = `rolling Sharpe ${sharpe.toFixed(2)} < 0.5, scaling down`;
  } else {
    multiplier = 1.0;
    reason = `rolling Sharpe ${sharpe.toFixed(2)} in normal range`;
  }

  const adjusted = Math.min(baseRiskPct * multiplier, hardMaxPct);

  return {
    adjustedRiskPct: adjusted,
    multiplier: adjusted / baseRiskPct,
    reason,
  };
}

/**
 * Compute rolling Sharpe ratio from a return series.
 * Annualized assuming daily returns: (mean / std) * sqrt(252).
 */
export function computeRollingSharpe(returns: number[]): number {
  if (returns.length < 2) return 0;

  const n = returns.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += returns[i];
  }
  const mean = sum / n;

  let sumSqDiff = 0;
  for (let i = 0; i < n; i++) {
    sumSqDiff += (returns[i] - mean) ** 2;
  }
  const std = Math.sqrt(sumSqDiff / (n - 1));

  if (std < 1e-12) return 0;

  return (mean / std) * Math.sqrt(252);
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Compute maximum drawdown from a series of returns.
 * Returns the drawdown as a positive decimal fraction (e.g. 0.12 = 12%).
 */
function computeMaxDrawdown(returns: number[]): number {
  let cumReturn = 1;
  let peak = 1;
  let maxDD = 0;

  for (const r of returns) {
    cumReturn *= (1 + r);
    if (cumReturn > peak) {
      peak = cumReturn;
    }
    const dd = (peak - cumReturn) / peak;
    if (dd > maxDD) {
      maxDD = dd;
    }
  }

  return maxDD;
}
