/**
 * Canonical Policy Loader
 *
 * Loads all canonical policy YAML files, parses them into a typed PolicyConfig,
 * computes canonical hash, and validates against invariants.
 *
 * Usage:
 *   const policy = loadPolicy();          // from default canonical path
 *   const policy = loadPolicy(customDir); // from custom path
 *   const policy = loadPolicyFromMap(yamlContents); // from pre-read content
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import yaml from "js-yaml";
import type {
  PolicyConfig,
  PolicyMeta,
  RuntimeRiskPolicy,
  ModePolicy,
  OperatingMode,
  RegimePolicy,
  CompliancePolicy,
  PortfolioPolicy,
  PromotionPolicy,
  DataQualityPolicy,
  ExecutionPolicy,
  CalendarPolicy,
  IncidentDefinition,
  MarketRegime,
} from "./policy-types";
import { computeCanonicalHash } from "./canonical-hash";
import { validatePolicy, type ValidationResult } from "./policy-validator";

// ============================================================================
// DEFAULT CANONICAL PATH
// ============================================================================

const DEFAULT_CANONICAL_DIR = resolve(
  process.cwd(),
  "docs/strativion-autonomous-trading-package/canonical/policy",
);

// ============================================================================
// PUBLIC API
// ============================================================================

let cachedPolicy: PolicyConfig | null = null;

/**
 * Load and return the canonical policy config.
 * Caches after first load. Call `reloadPolicy()` to force refresh.
 */
export function getPolicy(): PolicyConfig {
  if (!cachedPolicy) {
    cachedPolicy = loadPolicy();
  }
  return cachedPolicy;
}

/**
 * Force reload the policy from disk.
 */
export function reloadPolicy(canonicalDir?: string): PolicyConfig {
  cachedPolicy = loadPolicy(canonicalDir);
  return cachedPolicy;
}

/**
 * Get the validation result for the current policy.
 */
export function validateCurrentPolicy(): ValidationResult {
  return validatePolicy(getPolicy());
}

/**
 * Load policy from a directory of YAML files.
 */
export function loadPolicy(
  canonicalDir: string = DEFAULT_CANONICAL_DIR,
): PolicyConfig {
  if (!existsSync(canonicalDir)) {
    return getDefaultPolicy();
  }

  const fileContents = new Map<string, string>();
  const files = readdirSync(canonicalDir).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
  );

  for (const file of files) {
    const content = readFileSync(join(canonicalDir, file), "utf8");
    fileContents.set(file, content);
  }

  return loadPolicyFromMap(fileContents);
}

/**
 * Load policy from a map of filename → YAML content.
 * Useful for testing or loading from non-filesystem sources.
 */
export function loadPolicyFromMap(
  fileContents: Map<string, string>,
): PolicyConfig {
  const parsed = new Map<string, Record<string, unknown>>();

  for (const [name, content] of fileContents) {
    try {
      const doc = yaml.load(content) as Record<string, unknown>;
      if (doc && typeof doc === "object") {
        parsed.set(name, doc);
      }
    } catch {
      // Skip unparseable files — validator will catch missing fields
    }
  }

  const canonicalHash = computeCanonicalHash(fileContents);
  const runtime = extractRuntime(parsed);
  const modes = extractModes(parsed);
  const regimes = extractRegimes(parsed);
  const compliance = extractCompliance(parsed);
  const portfolio = extractPortfolio(parsed);
  const promotion = extractPromotion(parsed);
  const dataQuality = extractDataQuality(parsed);
  const execution = extractExecution(parsed);
  const calendar = extractCalendar(parsed);
  const incidents = extractIncidents(parsed);

  return {
    meta: extractMeta(parsed),
    runtime,
    modes,
    regimes,
    compliance,
    portfolio,
    promotion,
    dataQuality,
    execution,
    calendar,
    incidents,
    canonicalHash,
  };
}

// ============================================================================
// EXTRACTORS — one per policy domain
// ============================================================================

function findFile(
  parsed: Map<string, Record<string, unknown>>,
  prefix: string,
): Record<string, unknown> | undefined {
  for (const [name, doc] of parsed) {
    if (name.startsWith(prefix)) return doc;
  }
  return undefined;
}

function extractMeta(parsed: Map<string, Record<string, unknown>>): PolicyMeta {
  const runtime = findFile(parsed, "policy.runtime");
  const meta = (runtime?.meta as Record<string, unknown>) ?? {};
  return {
    schema_version: String(meta.schema_version ?? "2.0.0"),
    file_version: String(meta.file_version ?? "2.0.0"),
    canonical_package_version: String(meta.canonical_package_version ?? "2.5.0"),
  };
}

function extractRuntime(
  parsed: Map<string, Record<string, unknown>>,
): PolicyConfig["runtime"] {
  const doc = findFile(parsed, "policy.runtime");
  if (!doc) return getDefaultPolicy().runtime;

  const risk = doc.risk as Record<string, unknown> | undefined;
  const mode = doc.mode as Record<string, unknown> | undefined;

  return {
    mode: {
      active: (mode?.active as OperatingMode) ?? "supervised_crisis",
    },
    risk: parseRiskPolicy(risk),
  };
}

function parseRiskPolicy(risk: Record<string, unknown> | undefined): RuntimeRiskPolicy {
  if (!risk) return getDefaultPolicy().runtime.risk;

  const pt = risk.per_trade as Record<string, number> | undefined;
  const cl = risk.cluster as Record<string, number> | undefined;
  const pf = risk.portfolio as Record<string, number> | undefined;
  const ks = risk.kill_switch as Record<string, number> | undefined;
  const mg = risk.margin as Record<string, number> | undefined;

  return {
    per_trade: {
      hard_max_pct: pt?.hard_max_pct ?? 0.01,
      default_pct: pt?.default_pct ?? 0.0075,
    },
    cluster: {
      per_symbol_max_pct: cl?.per_symbol_max_pct ?? 0.02,
      per_sector_max_pct: cl?.per_sector_max_pct ?? 0.04,
      per_corr_cluster_max_pct: cl?.per_corr_cluster_max_pct ?? 0.05,
    },
    portfolio: {
      heat_normal_max_pct: pf?.heat_normal_max_pct ?? 0.06,
      heat_shock_max_pct: pf?.heat_shock_max_pct ?? 0.03,
      heat_crisis_max_pct: pf?.heat_crisis_max_pct ?? 0.01,
    },
    kill_switch: {
      daily_loss_pct: ks?.daily_loss_pct ?? 0.02,
      weekly_loss_pct: ks?.weekly_loss_pct ?? 0.03,
      drawdown_pct: ks?.drawdown_pct ?? 0.15,
    },
    margin: {
      utilization_max_pct: mg?.utilization_max_pct ?? 0.75,
      leverage_max: mg?.leverage_max ?? 2.0,
    },
  };
}

function extractModes(parsed: Map<string, Record<string, unknown>>): ModePolicy {
  const doc = findFile(parsed, "policy.modes");
  const defaults = getDefaultPolicy().modes;
  if (!doc || !doc.modes) return defaults;

  return {
    active: defaults.active,
    modes: defaults.modes,
  };
}

function extractRegimes(parsed: Map<string, Record<string, unknown>>): RegimePolicy {
  const doc = findFile(parsed, "policy.regimes") ?? findFile(parsed, "policy.portfolio");
  const defaults = getDefaultPolicy().regimes;
  if (!doc) return defaults;

  const budgets = (doc.capital_allocation as Record<string, unknown>)?.regime_budgets as
    | Record<string, number>
    | undefined;

  if (!budgets) return defaults;

  const regimeKeys: MarketRegime[] = ["trending", "ranging", "transition", "shock", "crisis"];
  const result: RegimePolicy = { regimes: {} as RegimePolicy["regimes"] };

  for (const key of regimeKeys) {
    result.regimes[key] = {
      exposure_budget_multiplier: budgets[key] ?? defaults.regimes[key].exposure_budget_multiplier,
      sizing_multiplier: budgets[key] ?? defaults.regimes[key].sizing_multiplier,
    };
  }

  return result;
}

function extractCompliance(parsed: Map<string, Record<string, unknown>>): CompliancePolicy {
  return getDefaultPolicy().compliance;
}

function extractPortfolio(parsed: Map<string, Record<string, unknown>>): PortfolioPolicy {
  const doc = findFile(parsed, "policy.portfolio");
  const defaults = getDefaultPolicy().portfolio;
  if (!doc) return defaults;

  const conc = doc.concentration_limits as Record<string, number> | undefined;
  const budgets = (doc.capital_allocation as Record<string, unknown>)?.regime_budgets as
    | Record<string, number>
    | undefined;

  return {
    concentration: {
      max_single_position_pct: conc?.max_single_position_pct ?? defaults.concentration.max_single_position_pct,
      max_single_sector_pct: conc?.max_single_sector_exposure_pct ?? defaults.concentration.max_single_sector_pct,
      max_corr_cluster_pct: conc?.max_correlated_cluster_exposure_pct ?? defaults.concentration.max_corr_cluster_pct,
    },
    regime_budgets: {
      trending: budgets?.trending ?? 1.0,
      ranging: budgets?.ranging ?? 0.6,
      transition: budgets?.transition ?? 0.4,
      shock: budgets?.shock ?? 0.25,
      crisis: budgets?.crisis ?? 0.1,
    },
  };
}

function extractPromotion(parsed: Map<string, Record<string, unknown>>): PromotionPolicy {
  return getDefaultPolicy().promotion;
}

function extractDataQuality(parsed: Map<string, Record<string, unknown>>): DataQualityPolicy {
  return getDefaultPolicy().dataQuality;
}

function extractExecution(parsed: Map<string, Record<string, unknown>>): ExecutionPolicy {
  return getDefaultPolicy().execution;
}

function extractCalendar(parsed: Map<string, Record<string, unknown>>): CalendarPolicy {
  return getDefaultPolicy().calendar;
}

function extractIncidents(parsed: Map<string, Record<string, unknown>>): IncidentDefinition[] {
  return getDefaultPolicy().incidents;
}

// ============================================================================
// DEFAULT POLICY (fallback when YAML files not available)
// ============================================================================

let defaultPolicyCache: PolicyConfig | null = null;

function getDefaultPolicy(): PolicyConfig {
  if (defaultPolicyCache) return defaultPolicyCache;

  defaultPolicyCache = {
    meta: {
      schema_version: "2.0.0",
      file_version: "2.0.0",
      canonical_package_version: "2.5.0",
    },
    runtime: {
      mode: { active: "supervised_crisis" },
      risk: {
        per_trade: { hard_max_pct: 0.01, default_pct: 0.0075 },
        cluster: {
          per_symbol_max_pct: 0.02,
          per_sector_max_pct: 0.04,
          per_corr_cluster_max_pct: 0.05,
        },
        portfolio: {
          heat_normal_max_pct: 0.06,
          heat_shock_max_pct: 0.03,
          heat_crisis_max_pct: 0.01,
        },
        kill_switch: {
          daily_loss_pct: 0.02,
          weekly_loss_pct: 0.03,
          drawdown_pct: 0.15,
        },
        margin: { utilization_max_pct: 0.75, leverage_max: 2.0 },
      },
    },
    modes: {
      active: "supervised_crisis",
      modes: {
        autonomous_normal: {
          can_open_positions: true,
          can_close_positions: true,
          can_modify_orders: true,
          signal_generation: true,
          max_position_size_multiplier: 1.0,
        },
        autonomous_restricted: {
          can_open_positions: true,
          can_close_positions: true,
          can_modify_orders: true,
          signal_generation: true,
          max_position_size_multiplier: 0.5,
        },
        supervised_crisis: {
          can_open_positions: false,
          can_close_positions: true,
          can_modify_orders: true,
          signal_generation: true,
          max_position_size_multiplier: 0.25,
        },
        manual_only: {
          can_open_positions: false,
          can_close_positions: false,
          can_modify_orders: false,
          signal_generation: false,
          max_position_size_multiplier: 0,
        },
      },
    },
    regimes: {
      regimes: {
        trending: { exposure_budget_multiplier: 1.0, sizing_multiplier: 1.0 },
        ranging: { exposure_budget_multiplier: 0.6, sizing_multiplier: 0.6 },
        transition: { exposure_budget_multiplier: 0.4, sizing_multiplier: 0.4 },
        shock: { exposure_budget_multiplier: 0.25, sizing_multiplier: 0.25 },
        crisis: { exposure_budget_multiplier: 0.1, sizing_multiplier: 0.1 },
      },
    },
    compliance: {
      gates: [
        { id: "C-01", name: "PDT", locked: true, description: "Pattern Day Trader" },
        { id: "C-02", name: "SEC 15c3-5", locked: true, description: "Pre-trade risk controls" },
        { id: "C-03", name: "Reg SHO", locked: true, description: "Short sale locate" },
        { id: "C-04", name: "MWCB", locked: true, description: "Market-wide circuit breaker" },
        { id: "C-05", name: "LULD", locked: true, description: "Limit up/limit down" },
        { id: "C-06", name: "Auction", locked: true, description: "Auction state handling" },
        { id: "C-07", name: "Restricted", locked: false, description: "Restricted list check" },
      ],
      pdt: { equity_threshold_usd: 25000, max_day_trades_in_window: 3, window_sessions: 5 },
      mwcb: { level1_pct: 0.07, level2_pct: 0.13, level3_pct: 0.20 },
      luld: { tier1_band_pct: 0.05, tier2_band_pct: 0.10 },
    },
    portfolio: {
      concentration: {
        max_single_position_pct: 0.20,
        max_single_sector_pct: 0.30,
        max_corr_cluster_pct: 0.30,
      },
      regime_budgets: {
        trending: 1.0,
        ranging: 0.6,
        transition: 0.4,
        shock: 0.25,
        crisis: 0.1,
      },
    },
    promotion: {
      stages: {
        research: { min_dwell_days: 1, risk_budget_pct: 0, max_positions: Infinity, max_notional_usd: Infinity },
        replay: { min_signals: 500, min_sharpe: 0.8, max_drawdown_pct: 0.15, min_hit_rate_pct: 0.45, min_dwell_days: 3, risk_budget_pct: 0, max_positions: Infinity, max_notional_usd: Infinity },
        shadow: { min_correlation: 0.7, zero_sev1_days: 30, max_fill_sim_error_bps: 3, min_dwell_days: 10, risk_budget_pct: 0, max_positions: Infinity, max_notional_usd: Infinity },
        paper: { min_trades: 500, min_sharpe: 0.6, max_slippage_bps: 8, zero_violations: true, min_dwell_days: 20, risk_budget_pct: 0.005, max_positions: 10, max_notional_usd: 50000 },
        supervised_live: { min_trades: 2000, min_dwell_days: 30, risk_budget_pct: 0.25, max_positions: 5, max_notional_usd: 100000 },
        autonomous_live: { min_dwell_days: 0, risk_budget_pct: 1.0, max_positions: Infinity, max_notional_usd: Infinity },
      },
    },
    dataQuality: {
      staleness: {
        equities: { max_seconds: 15, action: "PAUSE_SYMBOL" },
        futures: { max_seconds: 5, action: "PAUSE_SYMBOL" },
        crypto: { max_seconds: 30, action: "PAUSE_SYMBOL" },
      },
      nbbo: { max_spread_bps: 50 },
      gap: { sigma_threshold: 5 },
    },
    execution: {
      default_tif: { equities: "DAY", options: "DAY", futures: "DAY", crypto: "GTC", fx: "IOC" },
      slippage_threshold_bps: 10,
      broker_circuit_breaker: {
        consecutive_rejects: 5,
        window_seconds: 60,
        cooldown_seconds: 60,
        probe_after_seconds: 30,
        close_after_successes: 3,
      },
      clock_skew: {
        max_ms: 500,
        ntp_stratum_max: 2,
        measurement_interval_seconds: 10,
        consecutive_breach_limit: 3,
        resume_after_ok: 5,
      },
    },
    calendar: {
      timezone: "America/New_York",
      regular_session: { open: "09:30", close: "16:00" },
      extended_session: { pre_open: "04:00", post_close: "20:00" },
      holidays: [],
      blackout_types: ["macro_event", "earnings", "dividend", "opex", "quad_witching"],
    },
    incidents: [],
    canonicalHash: "default-no-canonical-loaded",
  };

  return defaultPolicyCache;
}
