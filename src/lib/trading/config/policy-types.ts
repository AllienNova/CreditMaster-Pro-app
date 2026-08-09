/**
 * Canonical Policy Types
 *
 * TypeScript types for all 62 controls from the Strativion
 * Autonomous Trading Package canonical policy layer.
 *
 * Convention: all _pct fields are decimal fractions [0, 1].
 * All times are IANA America/New_York.
 */

// ============================================================================
// RUNTIME RISK POLICY (policy.runtime.yaml)
// ============================================================================

export interface RuntimeRiskPolicy {
  per_trade: {
    hard_max_pct: number;
    default_pct: number;
  };
  cluster: {
    per_symbol_max_pct: number;
    per_sector_max_pct: number;
    per_corr_cluster_max_pct: number;
  };
  portfolio: {
    heat_normal_max_pct: number;
    heat_shock_max_pct: number;
    heat_crisis_max_pct: number;
  };
  kill_switch: {
    daily_loss_pct: number;
    weekly_loss_pct: number;
    drawdown_pct: number;
  };
  margin: {
    utilization_max_pct: number;
    leverage_max: number;
  };
}

// ============================================================================
// OPERATING MODES (policy.modes.yaml)
// ============================================================================

export type OperatingMode =
  | "autonomous_normal"
  | "autonomous_restricted"
  | "supervised_crisis"
  | "manual_only";

export interface ModeCapabilities {
  can_open_positions: boolean;
  can_close_positions: boolean;
  can_modify_orders: boolean;
  signal_generation: boolean;
  max_position_size_multiplier: number;
}

export interface ModePolicy {
  active: OperatingMode;
  modes: Record<OperatingMode, ModeCapabilities>;
}

// ============================================================================
// REGIMES (policy.regimes.yaml)
// ============================================================================

export type MarketRegime =
  | "trending"
  | "ranging"
  | "transition"
  | "shock"
  | "crisis";

export interface RegimePolicy {
  regimes: Record<
    MarketRegime,
    {
      exposure_budget_multiplier: number;
      sizing_multiplier: number;
    }
  >;
}

// ============================================================================
// COMPLIANCE GATES (policy.compliance.yaml)
// ============================================================================

export interface ComplianceGate {
  id: string;
  name: string;
  locked: boolean;
  description: string;
}

export interface CompliancePolicy {
  gates: ComplianceGate[];
  pdt: {
    equity_threshold_usd: number;
    max_day_trades_in_window: number;
    window_sessions: number;
  };
  mwcb: {
    level1_pct: number;
    level2_pct: number;
    level3_pct: number;
  };
  luld: {
    tier1_band_pct: number;
    tier2_band_pct: number;
  };
}

// ============================================================================
// PORTFOLIO (policy.portfolio.yaml)
// ============================================================================

export interface PortfolioPolicy {
  concentration: {
    max_single_position_pct: number;
    max_single_sector_pct: number;
    max_corr_cluster_pct: number;
  };
  regime_budgets: Record<MarketRegime, number>;
}

// ============================================================================
// PROMOTION LIFECYCLE (policy.promotion.yaml)
// ============================================================================

export type LifecycleStage =
  | "research"
  | "replay"
  | "shadow"
  | "paper"
  | "supervised_live"
  | "autonomous_live";

export interface StageGates {
  min_signals?: number;
  min_sharpe?: number;
  max_drawdown_pct?: number;
  min_hit_rate_pct?: number;
  min_correlation?: number;
  zero_sev1_days?: number;
  max_fill_sim_error_bps?: number;
  min_trades?: number;
  max_slippage_bps?: number;
  zero_violations?: boolean;
  min_dwell_days: number;
  risk_budget_pct: number;
  max_positions: number;
  max_notional_usd: number;
}

export interface PromotionPolicy {
  stages: Record<LifecycleStage, StageGates>;
}

// ============================================================================
// DATA QUALITY (policy.data-quality.yaml)
// ============================================================================

export interface DataQualityPolicy {
  staleness: Record<string, { max_seconds: number; action: string }>;
  nbbo: { max_spread_bps: number };
  gap: { sigma_threshold: number };
}

// ============================================================================
// EXECUTION (policy.execution.yaml + policy.execution-errors.yaml)
// ============================================================================

export interface ExecutionPolicy {
  default_tif: Record<string, string>;
  slippage_threshold_bps: number;
  broker_circuit_breaker: {
    consecutive_rejects: number;
    window_seconds: number;
    cooldown_seconds: number;
    probe_after_seconds: number;
    close_after_successes: number;
  };
  clock_skew: {
    max_ms: number;
    ntp_stratum_max: number;
    measurement_interval_seconds: number;
    consecutive_breach_limit: number;
    resume_after_ok: number;
  };
}

// ============================================================================
// INCIDENTS (policy.incidents.yaml)
// ============================================================================

export type IncidentSeverity = "SEV1" | "SEV2" | "SEV3" | "SEV4";

export interface IncidentDefinition {
  code: string;
  category: string;
  severity: IncidentSeverity;
  action: string;
  auto_recoverable: boolean;
}

// ============================================================================
// CALENDAR (policy.calendar.yaml)
// ============================================================================

export interface CalendarPolicy {
  timezone: string;
  regular_session: { open: string; close: string };
  extended_session: { pre_open: string; post_close: string };
  holidays: string[];
  blackout_types: string[];
}

// ============================================================================
// KILL SWITCH (from policy.dr.yaml)
// ============================================================================

export type KillSwitchLevel =
  | "LEVEL_1_PAUSE_NEW"
  | "LEVEL_2_CANCEL_WORKING"
  | "LEVEL_3_FREEZE"
  | "LEVEL_4_FLATTEN";

// ============================================================================
// COMPOSITE POLICY CONFIG
// ============================================================================

export interface PolicyMeta {
  schema_version: string;
  file_version: string;
  canonical_package_version: string;
}

export interface PolicyConfig {
  meta: PolicyMeta;
  runtime: {
    mode: { active: OperatingMode };
    risk: RuntimeRiskPolicy;
  };
  modes: ModePolicy;
  regimes: RegimePolicy;
  compliance: CompliancePolicy;
  portfolio: PortfolioPolicy;
  promotion: PromotionPolicy;
  dataQuality: DataQualityPolicy;
  execution: ExecutionPolicy;
  calendar: CalendarPolicy;
  incidents: IncidentDefinition[];
  canonicalHash: string;
}
