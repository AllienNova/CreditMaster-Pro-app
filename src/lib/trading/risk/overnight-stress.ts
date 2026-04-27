/**
 * Overnight Gap Stress Test
 *
 * Assesses overnight gap risk by running scenario analysis on open positions.
 * Designed to run at 15:55 ET daily before market close to decide whether
 * to hold, reduce, or flatten positions overnight.
 *
 * Scenarios: -2% gap, -5% gap, +3% gap (beta-adjusted per position).
 */

import { getPolicy } from "@/lib/trading/config";

// ============================================================================
// TYPES
// ============================================================================

export interface OvernightPosition {
  symbol: string;
  side: "long" | "short";
  notional: number;
  beta: number;
}

export interface ScenarioResult {
  name: string;
  gapPct: number;
  positionImpacts: PositionImpact[];
  totalPnl: number;
  totalPnlPct: number;
}

export interface PositionImpact {
  symbol: string;
  pnl: number;
  pnlPct: number;
}

export interface OvernightStressResult {
  scenarios: ScenarioResult[];
  maxLoss: number;
  maxLossPct: number;
  totalNotional: number;
  recommendation: "hold" | "reduce" | "flatten";
  reason: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OVERNIGHT_SCENARIOS: { name: string; gapPct: number }[] = [
  { name: "Moderate down gap", gapPct: -0.02 },
  { name: "Severe down gap", gapPct: -0.05 },
  { name: "Moderate up gap", gapPct: 0.03 },
];

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Assess overnight gap risk for the given positions.
 *
 * Each scenario applies a market-wide gap percentage, beta-adjusted per position.
 * A long position loses on down gaps; a short position gains on down gaps.
 *
 * Recommendation logic (based on kill_switch.daily_loss_pct from policy):
 *   - maxLossPct > daily_loss_pct   -> "flatten"
 *   - maxLossPct > 0.5 * daily_loss -> "reduce"
 *   - otherwise                     -> "hold"
 */
export function assessOvernightRisk(positions: OvernightPosition[]): OvernightStressResult {
  const policy = getPolicy();
  const dailyLossPct = policy.runtime.risk.kill_switch.daily_loss_pct;

  const totalNotional = positions.reduce((sum, p) => sum + Math.abs(p.notional), 0);

  if (positions.length === 0 || totalNotional === 0) {
    return {
      scenarios: [],
      maxLoss: 0,
      maxLossPct: 0,
      totalNotional: 0,
      recommendation: "hold",
      reason: "no open positions",
    };
  }

  // Run each scenario
  const scenarios: ScenarioResult[] = OVERNIGHT_SCENARIOS.map((scenario) => {
    const positionImpacts: PositionImpact[] = positions.map((pos) => {
      // Beta-adjusted move for this position
      const adjustedGap = scenario.gapPct * pos.beta;

      // PnL: long positions gain on positive gaps, short positions gain on negative gaps
      const directionMultiplier = pos.side === "long" ? 1 : -1;
      const pnl = pos.notional * adjustedGap * directionMultiplier;
      const pnlPct = pos.notional !== 0 ? pnl / Math.abs(pos.notional) : 0;

      return { symbol: pos.symbol, pnl, pnlPct };
    });

    const totalPnl = positionImpacts.reduce((sum, p) => sum + p.pnl, 0);
    const totalPnlPct = totalNotional > 0 ? totalPnl / totalNotional : 0;

    return {
      name: scenario.name,
      gapPct: scenario.gapPct,
      positionImpacts,
      totalPnl,
      totalPnlPct,
    };
  });

  // Find worst-case loss across all scenarios
  let maxLoss = 0;
  for (const s of scenarios) {
    const loss = -s.totalPnl; // positive loss = negative PnL
    if (loss > maxLoss) {
      maxLoss = loss;
    }
  }

  const maxLossPct = totalNotional > 0 ? maxLoss / totalNotional : 0;

  // Recommendation
  let recommendation: "hold" | "reduce" | "flatten";
  let reason: string;

  if (maxLossPct > dailyLossPct) {
    recommendation = "flatten";
    reason = `max overnight loss ${(maxLossPct * 100).toFixed(2)}% exceeds daily kill switch ${(dailyLossPct * 100).toFixed(2)}%`;
  } else if (maxLossPct > 0.5 * dailyLossPct) {
    recommendation = "reduce";
    reason = `max overnight loss ${(maxLossPct * 100).toFixed(2)}% exceeds 50% of daily kill switch ${(dailyLossPct * 100).toFixed(2)}%`;
  } else {
    recommendation = "hold";
    reason = `max overnight loss ${(maxLossPct * 100).toFixed(2)}% within acceptable range`;
  }

  return {
    scenarios,
    maxLoss,
    maxLossPct,
    totalNotional,
    recommendation,
    reason,
  };
}
