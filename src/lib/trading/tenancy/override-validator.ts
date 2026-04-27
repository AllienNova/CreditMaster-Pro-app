/**
 * Narrow-Only Override Validator
 *
 * Tenants can override policy values only to make them stricter (narrower).
 * Widening limits (making them more permissive) is rejected.
 *
 * Rule: for every limit field, the override value must be <= the base value.
 * For kill switch thresholds, lower values trigger sooner (stricter).
 */

import type { PolicyConfig, RuntimeRiskPolicy } from "@/lib/trading/config";

export interface OverrideResult {
  valid: boolean;
  violations: string[];
  applied: Partial<RuntimeRiskPolicy>;
}

/**
 * Validate that a tenant override only narrows (tightens) the base policy.
 * Returns violations for any field that would widen limits.
 */
export function validateOverride(
  basePolicy: PolicyConfig,
  tenantOverride: Partial<RuntimeRiskPolicy>,
): OverrideResult {
  const violations: string[] = [];
  const applied: Partial<RuntimeRiskPolicy> = {};
  const baseRisk = basePolicy.runtime.risk;

  if (tenantOverride.per_trade) {
    const pt: RuntimeRiskPolicy["per_trade"] = { ...baseRisk.per_trade };
    if (tenantOverride.per_trade.hard_max_pct !== undefined) {
      if (tenantOverride.per_trade.hard_max_pct > baseRisk.per_trade.hard_max_pct) {
        violations.push(
          `per_trade.hard_max_pct: override ${tenantOverride.per_trade.hard_max_pct} > base ${baseRisk.per_trade.hard_max_pct}`,
        );
      } else {
        pt.hard_max_pct = tenantOverride.per_trade.hard_max_pct;
      }
    }
    if (tenantOverride.per_trade.default_pct !== undefined) {
      if (tenantOverride.per_trade.default_pct > baseRisk.per_trade.default_pct) {
        violations.push(
          `per_trade.default_pct: override ${tenantOverride.per_trade.default_pct} > base ${baseRisk.per_trade.default_pct}`,
        );
      } else {
        pt.default_pct = tenantOverride.per_trade.default_pct;
      }
    }
    applied.per_trade = pt;
  }

  if (tenantOverride.cluster) {
    const cl: RuntimeRiskPolicy["cluster"] = { ...baseRisk.cluster };
    const clusterFields: (keyof RuntimeRiskPolicy["cluster"])[] = [
      "per_symbol_max_pct",
      "per_sector_max_pct",
      "per_corr_cluster_max_pct",
    ];
    for (const field of clusterFields) {
      if (tenantOverride.cluster[field] !== undefined) {
        if (tenantOverride.cluster[field] > baseRisk.cluster[field]) {
          violations.push(
            `cluster.${field}: override ${tenantOverride.cluster[field]} > base ${baseRisk.cluster[field]}`,
          );
        } else {
          cl[field] = tenantOverride.cluster[field];
        }
      }
    }
    applied.cluster = cl;
  }

  if (tenantOverride.portfolio) {
    const pf: RuntimeRiskPolicy["portfolio"] = { ...baseRisk.portfolio };
    const portfolioFields: (keyof RuntimeRiskPolicy["portfolio"])[] = [
      "heat_normal_max_pct",
      "heat_shock_max_pct",
      "heat_crisis_max_pct",
    ];
    for (const field of portfolioFields) {
      if (tenantOverride.portfolio[field] !== undefined) {
        if (tenantOverride.portfolio[field] > baseRisk.portfolio[field]) {
          violations.push(
            `portfolio.${field}: override ${tenantOverride.portfolio[field]} > base ${baseRisk.portfolio[field]}`,
          );
        } else {
          pf[field] = tenantOverride.portfolio[field];
        }
      }
    }
    applied.portfolio = pf;
  }

  if (tenantOverride.kill_switch) {
    const ks: RuntimeRiskPolicy["kill_switch"] = { ...baseRisk.kill_switch };
    const killFields: (keyof RuntimeRiskPolicy["kill_switch"])[] = [
      "daily_loss_pct",
      "weekly_loss_pct",
      "drawdown_pct",
    ];
    for (const field of killFields) {
      if (tenantOverride.kill_switch[field] !== undefined) {
        if (tenantOverride.kill_switch[field] > baseRisk.kill_switch[field]) {
          violations.push(
            `kill_switch.${field}: override ${tenantOverride.kill_switch[field]} > base ${baseRisk.kill_switch[field]}`,
          );
        } else {
          ks[field] = tenantOverride.kill_switch[field];
        }
      }
    }
    applied.kill_switch = ks;
  }

  if (tenantOverride.margin) {
    const mg: RuntimeRiskPolicy["margin"] = { ...baseRisk.margin };
    if (tenantOverride.margin.leverage_max !== undefined) {
      if (tenantOverride.margin.leverage_max > baseRisk.margin.leverage_max) {
        violations.push(
          `margin.leverage_max: override ${tenantOverride.margin.leverage_max} > base ${baseRisk.margin.leverage_max}`,
        );
      } else {
        mg.leverage_max = tenantOverride.margin.leverage_max;
      }
    }
    if (tenantOverride.margin.utilization_max_pct !== undefined) {
      if (tenantOverride.margin.utilization_max_pct > baseRisk.margin.utilization_max_pct) {
        violations.push(
          `margin.utilization_max_pct: override ${tenantOverride.margin.utilization_max_pct} > base ${baseRisk.margin.utilization_max_pct}`,
        );
      } else {
        mg.utilization_max_pct = tenantOverride.margin.utilization_max_pct;
      }
    }
    applied.margin = mg;
  }

  return {
    valid: violations.length === 0,
    violations,
    applied,
  };
}

/**
 * Apply narrow-only override to a base policy, producing a new PolicyConfig
 * with the stricter (Math.min) of each limit.
 */
export function applyNarrowOverride(
  basePolicy: PolicyConfig,
  tenantOverride: Partial<RuntimeRiskPolicy>,
): PolicyConfig {
  const baseRisk = basePolicy.runtime.risk;

  const narrowedRisk: RuntimeRiskPolicy = {
    per_trade: {
      hard_max_pct: tenantOverride.per_trade?.hard_max_pct !== undefined
        ? Math.min(baseRisk.per_trade.hard_max_pct, tenantOverride.per_trade.hard_max_pct)
        : baseRisk.per_trade.hard_max_pct,
      default_pct: tenantOverride.per_trade?.default_pct !== undefined
        ? Math.min(baseRisk.per_trade.default_pct, tenantOverride.per_trade.default_pct)
        : baseRisk.per_trade.default_pct,
    },
    cluster: {
      per_symbol_max_pct: tenantOverride.cluster?.per_symbol_max_pct !== undefined
        ? Math.min(baseRisk.cluster.per_symbol_max_pct, tenantOverride.cluster.per_symbol_max_pct)
        : baseRisk.cluster.per_symbol_max_pct,
      per_sector_max_pct: tenantOverride.cluster?.per_sector_max_pct !== undefined
        ? Math.min(baseRisk.cluster.per_sector_max_pct, tenantOverride.cluster.per_sector_max_pct)
        : baseRisk.cluster.per_sector_max_pct,
      per_corr_cluster_max_pct: tenantOverride.cluster?.per_corr_cluster_max_pct !== undefined
        ? Math.min(baseRisk.cluster.per_corr_cluster_max_pct, tenantOverride.cluster.per_corr_cluster_max_pct)
        : baseRisk.cluster.per_corr_cluster_max_pct,
    },
    portfolio: {
      heat_normal_max_pct: tenantOverride.portfolio?.heat_normal_max_pct !== undefined
        ? Math.min(baseRisk.portfolio.heat_normal_max_pct, tenantOverride.portfolio.heat_normal_max_pct)
        : baseRisk.portfolio.heat_normal_max_pct,
      heat_shock_max_pct: tenantOverride.portfolio?.heat_shock_max_pct !== undefined
        ? Math.min(baseRisk.portfolio.heat_shock_max_pct, tenantOverride.portfolio.heat_shock_max_pct)
        : baseRisk.portfolio.heat_shock_max_pct,
      heat_crisis_max_pct: tenantOverride.portfolio?.heat_crisis_max_pct !== undefined
        ? Math.min(baseRisk.portfolio.heat_crisis_max_pct, tenantOverride.portfolio.heat_crisis_max_pct)
        : baseRisk.portfolio.heat_crisis_max_pct,
    },
    kill_switch: {
      daily_loss_pct: tenantOverride.kill_switch?.daily_loss_pct !== undefined
        ? Math.min(baseRisk.kill_switch.daily_loss_pct, tenantOverride.kill_switch.daily_loss_pct)
        : baseRisk.kill_switch.daily_loss_pct,
      weekly_loss_pct: tenantOverride.kill_switch?.weekly_loss_pct !== undefined
        ? Math.min(baseRisk.kill_switch.weekly_loss_pct, tenantOverride.kill_switch.weekly_loss_pct)
        : baseRisk.kill_switch.weekly_loss_pct,
      drawdown_pct: tenantOverride.kill_switch?.drawdown_pct !== undefined
        ? Math.min(baseRisk.kill_switch.drawdown_pct, tenantOverride.kill_switch.drawdown_pct)
        : baseRisk.kill_switch.drawdown_pct,
    },
    margin: {
      utilization_max_pct: tenantOverride.margin?.utilization_max_pct !== undefined
        ? Math.min(baseRisk.margin.utilization_max_pct, tenantOverride.margin.utilization_max_pct)
        : baseRisk.margin.utilization_max_pct,
      leverage_max: tenantOverride.margin?.leverage_max !== undefined
        ? Math.min(baseRisk.margin.leverage_max, tenantOverride.margin.leverage_max)
        : baseRisk.margin.leverage_max,
    },
  };

  return {
    ...basePolicy,
    runtime: {
      ...basePolicy.runtime,
      risk: narrowedRisk,
    },
  };
}
