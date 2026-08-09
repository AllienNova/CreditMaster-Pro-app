/**
 * Policy Validator
 *
 * Validates loaded policy against cross-field invariants and unit constraints.
 * Must pass at boot time before any trading activity.
 */

import type { PolicyConfig } from "./policy-types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate the full policy config against canonical invariants.
 */
export function validatePolicy(config: PolicyConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const risk = config.runtime.risk;

  // ── Unit constraints: all _pct fields must be in [0, 1] ──
  const pctFields: [string, number][] = [
    ["risk.per_trade.hard_max_pct", risk.per_trade.hard_max_pct],
    ["risk.per_trade.default_pct", risk.per_trade.default_pct],
    ["risk.cluster.per_symbol_max_pct", risk.cluster.per_symbol_max_pct],
    ["risk.cluster.per_sector_max_pct", risk.cluster.per_sector_max_pct],
    ["risk.cluster.per_corr_cluster_max_pct", risk.cluster.per_corr_cluster_max_pct],
    ["risk.portfolio.heat_normal_max_pct", risk.portfolio.heat_normal_max_pct],
    ["risk.portfolio.heat_shock_max_pct", risk.portfolio.heat_shock_max_pct],
    ["risk.portfolio.heat_crisis_max_pct", risk.portfolio.heat_crisis_max_pct],
    ["risk.kill_switch.daily_loss_pct", risk.kill_switch.daily_loss_pct],
    ["risk.kill_switch.weekly_loss_pct", risk.kill_switch.weekly_loss_pct],
    ["risk.kill_switch.drawdown_pct", risk.kill_switch.drawdown_pct],
    ["risk.margin.utilization_max_pct", risk.margin.utilization_max_pct],
  ];

  for (const [name, value] of pctFields) {
    if (typeof value !== "number" || value < 0 || value > 1) {
      errors.push(`${name} must be a decimal fraction in [0, 1], got ${value}`);
    }
  }

  // ── Cross-field invariants ──

  // R-07 < R-06 (shock heat < normal heat)
  if (risk.portfolio.heat_shock_max_pct >= risk.portfolio.heat_normal_max_pct) {
    errors.push(
      `heat_shock_max_pct (${risk.portfolio.heat_shock_max_pct}) must be < heat_normal_max_pct (${risk.portfolio.heat_normal_max_pct})`,
    );
  }

  // R-08 < R-07 (crisis heat < shock heat)
  if (risk.portfolio.heat_crisis_max_pct >= risk.portfolio.heat_shock_max_pct) {
    errors.push(
      `heat_crisis_max_pct (${risk.portfolio.heat_crisis_max_pct}) must be < heat_shock_max_pct (${risk.portfolio.heat_shock_max_pct})`,
    );
  }

  // Default risk < hard max
  if (risk.per_trade.default_pct >= risk.per_trade.hard_max_pct) {
    errors.push(
      `per_trade.default_pct (${risk.per_trade.default_pct}) must be < hard_max_pct (${risk.per_trade.hard_max_pct})`,
    );
  }

  // Daily loss < weekly loss < drawdown
  if (risk.kill_switch.daily_loss_pct >= risk.kill_switch.weekly_loss_pct) {
    warnings.push(
      `daily_loss_pct (${risk.kill_switch.daily_loss_pct}) should be < weekly_loss_pct (${risk.kill_switch.weekly_loss_pct})`,
    );
  }
  if (risk.kill_switch.weekly_loss_pct >= risk.kill_switch.drawdown_pct) {
    warnings.push(
      `weekly_loss_pct (${risk.kill_switch.weekly_loss_pct}) should be < drawdown_pct (${risk.kill_switch.drawdown_pct})`,
    );
  }

  // Leverage must be positive
  if (risk.margin.leverage_max <= 0) {
    errors.push(`leverage_max must be > 0, got ${risk.margin.leverage_max}`);
  }

  // ── Portfolio concentration must be <= 1 ──
  const conc = config.portfolio.concentration;
  if (conc.max_single_position_pct > 1) {
    errors.push(`max_single_position_pct must be <= 1, got ${conc.max_single_position_pct}`);
  }

  // ── Regime budgets: crisis < shock < transition < ranging < trending ──
  const budgets = config.portfolio.regime_budgets;
  if (budgets) {
    if (budgets.crisis >= budgets.shock) {
      warnings.push("regime_budgets: crisis should be < shock");
    }
    if (budgets.shock >= budgets.transition) {
      warnings.push("regime_budgets: shock should be < transition");
    }
  }

  // ── Canonical hash must be present ──
  if (!config.canonicalHash || config.canonicalHash.length < 16) {
    errors.push("canonicalHash is missing or too short");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
