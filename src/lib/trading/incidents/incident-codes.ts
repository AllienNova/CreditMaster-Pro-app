/**
 * Incident Codes — Strativion Autonomous Trading Package
 *
 * Canonical incident taxonomy sourced from policy.incidents.yaml.
 * Every code maps to a severity, category, default action, and
 * auto-recoverability flag.
 *
 * DESIGN NOTE (P0-10): FLATTEN is deliberately absent from all
 * default_action assignments. No incident code triggers a flatten.
 * Flattening under ambiguous state is prohibited; the safe default
 * is FREEZE_AND_ALERT. FLATTEN is only authorized under LEVEL_4
 * kill-switch with explicit dual-control and a named incident reference.
 */

import type { IncidentSeverity } from "@/lib/trading/config";

// ============================================================================
// ACTION TYPE
// ============================================================================

export type IncidentAction =
  | "LOG_ONLY"
  | "ALERT_ONLY"
  | "PAUSE_SYMBOL"
  | "PAUSE_STRATEGY"
  | "PAUSE_TENANT"
  | "PAUSE_PLATFORM"
  | "FREEZE_AND_ALERT"
  | "CANCEL_WORKING_ORDERS"
  | "DEGRADE_TO_PAPER"
  | "DEMOTE_PROMOTION_STAGE";

// ============================================================================
// INCIDENT CATEGORY
// ============================================================================

export type IncidentCategory =
  | "DATA"
  | "COMPLIANCE"
  | "EXECUTION"
  | "RISK"
  | "OPS"
  | "SEC"
  | "TENANCY"
  | "CALENDAR"
  | "SUPERVISORY";

// ============================================================================
// CANONICAL INCIDENT DEFINITION
// ============================================================================

export interface CanonicalIncident {
  code: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  description: string;
  default_action: IncidentAction;
  auto_recoverable: boolean;
}

// ============================================================================
// DATA INCIDENTS
// ============================================================================

export const INC_DATA_STALE_EQUITIES: CanonicalIncident = {
  code: "INC_DATA_STALE_EQUITIES",
  category: "DATA",
  severity: "SEV2",
  description:
    "Equities market-data feed exceeds staleness threshold",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: true,
};

export const INC_DATA_STALE_FUTURES: CanonicalIncident = {
  code: "INC_DATA_STALE_FUTURES",
  category: "DATA",
  severity: "SEV2",
  description: "Futures market-data feed exceeds staleness threshold",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: true,
};

export const INC_DATA_STALE_FX: CanonicalIncident = {
  code: "INC_DATA_STALE_FX",
  category: "DATA",
  severity: "SEV2",
  description: "FX spot/forward feed exceeds staleness threshold",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: true,
};

export const INC_DATA_STALE_CRYPTO: CanonicalIncident = {
  code: "INC_DATA_STALE_CRYPTO",
  category: "DATA",
  severity: "SEV2",
  description: "Crypto feed exceeds staleness threshold",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: true,
};

export const INC_DATA_STALE_OPTIONS: CanonicalIncident = {
  code: "INC_DATA_STALE_OPTIONS",
  category: "DATA",
  severity: "SEV1",
  description:
    "Options chain feed stale; greeks and IV surfaces cannot be recomputed reliably",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: false,
};

export const INC_DATA_CROSS_VENUE_DISAGREE: CanonicalIncident = {
  code: "INC_DATA_CROSS_VENUE_DISAGREE",
  category: "DATA",
  severity: "SEV2",
  description:
    "Two or more venues for the same instrument report prices exceeding disagreement threshold",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: true,
};

export const INC_DATA_FEED_DISAGREE: CanonicalIncident = {
  code: "INC_DATA_FEED_DISAGREE",
  category: "DATA",
  severity: "SEV2",
  description:
    "Two independent data vendors for the same symbol disagree beyond acceptable threshold",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: false,
};

export const INC_DATA_GAP_SIGMA: CanonicalIncident = {
  code: "INC_DATA_GAP_SIGMA",
  category: "DATA",
  severity: "SEV2",
  description:
    "Price movement between consecutive bars exceeds sigma standard deviations",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: false,
};

export const INC_DATA_BAD_PRINT_SPIKE: CanonicalIncident = {
  code: "INC_DATA_BAD_PRINT_SPIKE",
  category: "DATA",
  severity: "SEV2",
  description:
    "Last-sale record flagged as erroneous by exchange cancel/bust message or bad-print filter",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: true,
};

export const INC_DATA_CORP_ACTIONS_MISSING: CanonicalIncident = {
  code: "INC_DATA_CORP_ACTIONS_MISSING",
  category: "DATA",
  severity: "SEV1",
  description:
    "A pending or same-day corporate action lacks confirmed handling record",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: false,
};

export const INC_DATA_NBBO_UNAVAILABLE: CanonicalIncident = {
  code: "INC_DATA_NBBO_UNAVAILABLE",
  category: "DATA",
  severity: "SEV1",
  description:
    "National Best Bid/Offer required for a US equity is not available",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: false,
};

export const INC_DATA_TICK_SIZE_INVALID: CanonicalIncident = {
  code: "INC_DATA_TICK_SIZE_INVALID",
  category: "DATA",
  severity: "SEV2",
  description:
    "Quoted or computed price is not a valid multiple of the instrument tick size",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: false,
};

export const INC_DATA_GAP: CanonicalIncident = {
  code: "INC_DATA_GAP",
  category: "DATA",
  severity: "SEV4",
  description:
    "Minor price gap detected in historical or real-time data; within acceptable tolerance",
  default_action: "LOG_ONLY",
  auto_recoverable: true,
};

export const INC_DATA_STALE: CanonicalIncident = {
  code: "INC_DATA_STALE",
  category: "DATA",
  severity: "SEV3",
  description:
    "Market-data feed has not refreshed within the expected staleness window",
  default_action: "ALERT_ONLY",
  auto_recoverable: true,
};

// ============================================================================
// COMPLIANCE INCIDENTS
// ============================================================================

export const INC_PDT_TRIP: CanonicalIncident = {
  code: "INC_PDT_TRIP",
  category: "COMPLIANCE",
  severity: "SEV1",
  description:
    "Pattern Day Trader day-trade count limit tripped or equity threshold breached",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: false,
};

export const INC_MWCB_L1: CanonicalIncident = {
  code: "INC_MWCB_LEVEL1",
  category: "COMPLIANCE",
  severity: "SEV1",
  description:
    "Market-Wide Circuit Breaker Level 1 triggered (S&P 500 -7%); 15-minute trading halt",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

export const INC_MWCB_L2: CanonicalIncident = {
  code: "INC_MWCB_LEVEL2",
  category: "COMPLIANCE",
  severity: "SEV1",
  description:
    "Market-Wide Circuit Breaker Level 2 triggered (S&P 500 -13%); 15-minute halt",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

export const INC_MWCB_L3: CanonicalIncident = {
  code: "INC_MWCB_LEVEL3",
  category: "COMPLIANCE",
  severity: "SEV1",
  description:
    "Market-Wide Circuit Breaker Level 3 triggered (S&P 500 -20%); halt for remainder of session",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

export const INC_LULD_PAUSE: CanonicalIncident = {
  code: "INC_LULD_PAUSE",
  category: "COMPLIANCE",
  severity: "SEV2",
  description: "Limit Up-Limit Down trading pause triggered for a specific symbol",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: true,
};

export const INC_REG_SHO_LOCATE_FAIL: CanonicalIncident = {
  code: "INC_REG_SHO_LOCATE_FAIL",
  category: "COMPLIANCE",
  severity: "SEV1",
  description: "Short-sale locate requirement cannot be confirmed",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: false,
};

export const INC_RESTRICTED_LIST_HIT: CanonicalIncident = {
  code: "INC_RESTRICTED_LIST_HIT",
  category: "COMPLIANCE",
  severity: "SEV1",
  description: "Order target symbol appears on compliance restricted list",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: false,
};

export const INC_CORPORATE_ACTION_UNHANDLED: CanonicalIncident = {
  code: "INC_CORPORATE_ACTION_UNHANDLED",
  category: "COMPLIANCE",
  severity: "SEV1",
  description:
    "A corporate action record exists for the symbol but no handling procedure has been confirmed",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: false,
};

export const INC_COMPLIANCE_VIOLATION: CanonicalIncident = {
  code: "INC_COMPLIANCE_VIOLATION",
  category: "COMPLIANCE",
  severity: "SEV1",
  description: "A pre-trade compliance check returned FAIL",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: false,
};

export const INC_15c3_5_VIOLATION: CanonicalIncident = {
  code: "INC_15c3_5_VIOLATION",
  category: "COMPLIANCE",
  severity: "SEV1",
  description:
    "SEC Rule 15c3-5 pre-trade risk check violated; order submitted without passing required gate",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

// ============================================================================
// EXECUTION INCIDENTS
// ============================================================================

export const INC_BROKER_REJECT: CanonicalIncident = {
  code: "INC_BROKER_REJECT",
  category: "EXECUTION",
  severity: "SEV2",
  description: "Broker returned a FIX order rejection",
  default_action: "ALERT_ONLY",
  auto_recoverable: true,
};

export const INC_BROKER_NO_ACK: CanonicalIncident = {
  code: "INC_BROKER_NO_ACK",
  category: "EXECUTION",
  severity: "SEV2",
  description:
    "Order submitted to broker but no acknowledgement received within timeout",
  default_action: "FREEZE_AND_ALERT",
  auto_recoverable: false,
};

export const INC_BROKER_CIRCUIT_OPEN: CanonicalIncident = {
  code: "INC_BROKER_CIRCUIT_OPEN",
  category: "EXECUTION",
  severity: "SEV1",
  description:
    "Broker circuit breaker opened; venue submissions halted",
  default_action: "FREEZE_AND_ALERT",
  auto_recoverable: false,
};

export const INC_BROKER_DISCONNECTED: CanonicalIncident = {
  code: "INC_BROKER_DISCONNECTED",
  category: "EXECUTION",
  severity: "SEV1",
  description:
    "Broker connection lost and reconnect attempts exhausted; system state is untrusted",
  default_action: "FREEZE_AND_ALERT",
  auto_recoverable: false,
};

export const INC_FIX_SESSION_DOWN: CanonicalIncident = {
  code: "INC_FIX_SESSION_DOWN",
  category: "EXECUTION",
  severity: "SEV1",
  description: "FIX session dropped and reconnect attempts exhausted",
  default_action: "FREEZE_AND_ALERT",
  auto_recoverable: false,
};

export const INC_CLOCK_SKEW: CanonicalIncident = {
  code: "INC_CLOCK_SKEW",
  category: "EXECUTION",
  severity: "SEV2",
  description:
    "System clock diverges from authoritative NTP/exchange-heartbeat beyond threshold",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: true,
};

export const INC_ORDER_ORPHANED: CanonicalIncident = {
  code: "INC_ORDER_ORPHANED",
  category: "EXECUTION",
  severity: "SEV1",
  description:
    "An open order exists at the broker that is not present in local order state",
  default_action: "FREEZE_AND_ALERT",
  auto_recoverable: false,
};

export const INC_RECON_BREAK: CanonicalIncident = {
  code: "INC_RECON_BREAK",
  category: "EXECUTION",
  severity: "SEV1",
  description:
    "End-of-day position reconciliation between local records and broker statement reports a break",
  default_action: "FREEZE_AND_ALERT",
  auto_recoverable: false,
};

export const INC_DUP_EXEC_ID: CanonicalIncident = {
  code: "INC_DUP_EXEC_ID",
  category: "EXECUTION",
  severity: "SEV1",
  description: "Two distinct fills share the same ExecID",
  default_action: "FREEZE_AND_ALERT",
  auto_recoverable: false,
};

export const INC_DEAD_LETTER: CanonicalIncident = {
  code: "INC_DEAD_LETTER",
  category: "EXECUTION",
  severity: "SEV2",
  description:
    "An order message could not be routed or processed and has been moved to the dead-letter queue",
  default_action: "ALERT_ONLY",
  auto_recoverable: false,
};

// ============================================================================
// RISK INCIDENTS
// ============================================================================

export const INC_RISK_VETO: CanonicalIncident = {
  code: "INC_RISK_VETO",
  category: "RISK",
  severity: "SEV2",
  description: "Risk engine vetoed an order that would breach a limit",
  default_action: "ALERT_ONLY",
  auto_recoverable: true,
};

export const INC_DAILY_LOSS_KILL: CanonicalIncident = {
  code: "INC_DAILY_LOSS_KILL",
  category: "RISK",
  severity: "SEV1",
  description:
    "Daily P&L loss reached or exceeded the daily loss kill threshold",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

export const INC_WEEKLY_LOSS_KILL: CanonicalIncident = {
  code: "INC_WEEKLY_LOSS_KILL",
  category: "RISK",
  severity: "SEV1",
  description:
    "Weekly P&L loss reached or exceeded the weekly loss kill threshold",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

export const INC_DRAWDOWN_KILL: CanonicalIncident = {
  code: "INC_DRAWDOWN_KILL",
  category: "RISK",
  severity: "SEV1",
  description: "Peak-to-trough equity drawdown reached the drawdown kill threshold",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

export const INC_HEAT_EXCEEDED: CanonicalIncident = {
  code: "INC_HEAT_EXCEEDED",
  category: "RISK",
  severity: "SEV1",
  description:
    "Portfolio heat exceeded threshold for active regime",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: false,
};

export const INC_CLUSTER_EXCEEDED: CanonicalIncident = {
  code: "INC_CLUSTER_EXCEEDED",
  category: "RISK",
  severity: "SEV2",
  description: "Per-symbol or per-sector cluster cap breached",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: false,
};

export const INC_MARGIN_CRITICAL: CanonicalIncident = {
  code: "INC_MARGIN_CRITICAL",
  category: "RISK",
  severity: "SEV1",
  description:
    "Broker-reported margin utilization approaching or exceeding maximum",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: false,
};

export const INC_CORR_SPIKE: CanonicalIncident = {
  code: "INC_CORR_SPIKE",
  category: "RISK",
  severity: "SEV2",
  description:
    "Realized correlation across portfolio instruments spiked above crisis threshold",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: true,
};

export const INC_LEVERAGE_BREACH: CanonicalIncident = {
  code: "INC_LEVERAGE_BREACH",
  category: "RISK",
  severity: "SEV1",
  description: "Gross exposure / equity ratio breached leverage maximum",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: false,
};

// ============================================================================
// OPS (SYSTEM) INCIDENTS
// ============================================================================

export const INC_HALT_UNKNOWN: CanonicalIncident = {
  code: "INC_HALT_UNKNOWN",
  category: "OPS",
  severity: "SEV1",
  description:
    "Exchange or venue halt detected but halt reason code is unrecognized or absent",
  default_action: "FREEZE_AND_ALERT",
  auto_recoverable: false,
};

export const INC_SPREAD_BLOWOUT: CanonicalIncident = {
  code: "INC_SPREAD_BLOWOUT",
  category: "OPS",
  severity: "SEV2",
  description: "Bid/ask spread for an instrument exceeded thresholds",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: true,
};

export const INC_STATE_UNTRUSTED: CanonicalIncident = {
  code: "INC_STATE_UNTRUSTED",
  category: "OPS",
  severity: "SEV1",
  description:
    "Internal position/order state cannot be verified against broker records. SAFE DEFAULT IS FREEZE_AND_ALERT — NOT flatten. (P0-10)",
  default_action: "FREEZE_AND_ALERT",
  auto_recoverable: false,
};

export const INC_CLOCK_UNSYNCED: CanonicalIncident = {
  code: "INC_CLOCK_UNSYNCED",
  category: "OPS",
  severity: "SEV1",
  description: "NTP or PTP clock synchronization lost; authoritative time source unavailable",
  default_action: "FREEZE_AND_ALERT",
  auto_recoverable: false,
};

export const INC_FEED_OUTAGE: CanonicalIncident = {
  code: "INC_FEED_OUTAGE",
  category: "OPS",
  severity: "SEV1",
  description:
    "One or more market-data feeds are completely unavailable (no heartbeat within timeout)",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: false,
};

export const INC_DEPLOY_HASH_MISMATCH: CanonicalIncident = {
  code: "INC_DEPLOY_HASH_MISMATCH",
  category: "OPS",
  severity: "SEV1",
  description:
    "Runtime canonical_hash does not match the published manifest hash",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

export const INC_CANONICAL_LOAD_FAIL: CanonicalIncident = {
  code: "INC_CANONICAL_LOAD_FAIL",
  category: "OPS",
  severity: "SEV1",
  description:
    "Canonical policy YAML failed to load or schema validation failed at boot",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

// ============================================================================
// SECURITY INCIDENTS
// ============================================================================

export const INC_AUTH_FAIL: CanonicalIncident = {
  code: "INC_AUTH_FAIL",
  category: "SEC",
  severity: "SEV1",
  description:
    "Authentication failure for a platform API, broker connection, or operator console access",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

export const INC_KEY_ROTATION_DUE: CanonicalIncident = {
  code: "INC_KEY_ROTATION_DUE",
  category: "SEC",
  severity: "SEV3",
  description:
    "API key or signing certificate is within rotation warning window and has not been rotated",
  default_action: "ALERT_ONLY",
  auto_recoverable: false,
};

export const INC_ANOMALOUS_API_CALL: CanonicalIncident = {
  code: "INC_ANOMALOUS_API_CALL",
  category: "SEC",
  severity: "SEV2",
  description:
    "An API call pattern deviates significantly from historical baseline",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: false,
};

export const INC_CONFIG_TAMPER: CanonicalIncident = {
  code: "INC_CONFIG_TAMPER",
  category: "SEC",
  severity: "SEV1",
  description:
    "A canonical configuration file hash does not match the artifact manifest; possible unauthorized modification",
  default_action: "PAUSE_PLATFORM",
  auto_recoverable: false,
};

// ============================================================================
// TENANCY INCIDENTS
// ============================================================================

export const INC_TENANT_OVERRIDE_INVALID: CanonicalIncident = {
  code: "INC_TENANT_OVERRIDE_INVALID",
  category: "TENANCY",
  severity: "SEV1",
  description: "A tenant override file failed the override validator",
  default_action: "PAUSE_TENANT",
  auto_recoverable: false,
};

export const INC_TENANT_BUDGET_EXCEEDED: CanonicalIncident = {
  code: "INC_TENANT_BUDGET_EXCEEDED",
  category: "TENANCY",
  severity: "SEV1",
  description: "Sum of active tenant risk_budget_pct values exceeds platform ceiling",
  default_action: "PAUSE_TENANT",
  auto_recoverable: false,
};

export const INC_TENANT_LIMIT_BREACH: CanonicalIncident = {
  code: "INC_TENANT_LIMIT_BREACH",
  category: "TENANCY",
  severity: "SEV1",
  description:
    "A tenant has traded beyond its risk_budget_pct allocation or breached a venue/instrument restriction",
  default_action: "PAUSE_TENANT",
  auto_recoverable: false,
};

// ============================================================================
// CALENDAR INCIDENTS
// ============================================================================

export const INC_MACRO_BLACKOUT_OVERRIDE_ATTEMPT: CanonicalIncident = {
  code: "INC_MACRO_BLACKOUT_OVERRIDE_ATTEMPT",
  category: "CALENDAR",
  severity: "SEV1",
  description:
    "A signal or order was attempted during a Tier-1 macro blackout window",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: false,
};

export const INC_HALT_WAKE_EARLY: CanonicalIncident = {
  code: "INC_HALT_WAKE_EARLY",
  category: "CALENDAR",
  severity: "SEV2",
  description:
    "System attempted to resume trading from a halt before the halt wake-rule criteria were met",
  default_action: "PAUSE_SYMBOL",
  auto_recoverable: false,
};

export const INC_EARNINGS_CALENDAR_STALE: CanonicalIncident = {
  code: "INC_EARNINGS_CALENDAR_STALE",
  category: "CALENDAR",
  severity: "SEV2",
  description:
    "Earnings calendar data has not been refreshed within required interval",
  default_action: "PAUSE_STRATEGY",
  auto_recoverable: false,
};

// ============================================================================
// SUPERVISORY SIGNALS (detect and alert only — never mutate policy or orders)
// ============================================================================

export const SIG_REGIME_SHIFT: CanonicalIncident = {
  code: "SIG_REGIME_SHIFT",
  category: "SUPERVISORY",
  severity: "SEV3",
  description:
    "Detects statistical shift in market regime. DETECT and ALERT only — no policy mutation, no order action.",
  default_action: "ALERT_ONLY",
  auto_recoverable: true,
};

export const SIG_LIQUIDITY_DEGRADATION: CanonicalIncident = {
  code: "SIG_LIQUIDITY_DEGRADATION",
  category: "SUPERVISORY",
  severity: "SEV3",
  description:
    "Detects degradation in market microstructure. DETECT and ALERT only — no policy mutation, no order action.",
  default_action: "ALERT_ONLY",
  auto_recoverable: true,
};

export const SIG_CORRELATION_REGIME_CHANGE: CanonicalIncident = {
  code: "SIG_CORRELATION_REGIME_CHANGE",
  category: "SUPERVISORY",
  severity: "SEV3",
  description:
    "Detects structural change in realized correlation matrix. DETECT and ALERT only — no policy mutation, no order action.",
  default_action: "ALERT_ONLY",
  auto_recoverable: true,
};

export const SIG_DRIFT_FROM_PAPER: CanonicalIncident = {
  code: "SIG_DRIFT_FROM_PAPER",
  category: "SUPERVISORY",
  severity: "SEV3",
  description:
    "Detects material divergence between live P&L and concurrent paper-trading P&L. DETECT and ALERT only.",
  default_action: "ALERT_ONLY",
  auto_recoverable: true,
};

export const SIG_DRAWDOWN_TRAJECTORY: CanonicalIncident = {
  code: "SIG_DRAWDOWN_TRAJECTORY",
  category: "SUPERVISORY",
  severity: "SEV3",
  description:
    "Detects accelerating drawdown trajectory trending toward kill-switch threshold. DETECT and ALERT only.",
  default_action: "ALERT_ONLY",
  auto_recoverable: true,
};

export const SIG_HEAT_TRAJECTORY: CanonicalIncident = {
  code: "SIG_HEAT_TRAJECTORY",
  category: "SUPERVISORY",
  severity: "SEV3",
  description:
    "Detects portfolio heat approaching the active-regime heat ceiling. DETECT and ALERT only.",
  default_action: "ALERT_ONLY",
  auto_recoverable: true,
};

// ============================================================================
// REGISTRY — flat lookup by code
// ============================================================================

export const INCIDENT_REGISTRY: ReadonlyMap<string, CanonicalIncident> =
  new Map([
    [INC_DATA_STALE_EQUITIES.code, INC_DATA_STALE_EQUITIES],
    [INC_DATA_STALE_FUTURES.code, INC_DATA_STALE_FUTURES],
    [INC_DATA_STALE_FX.code, INC_DATA_STALE_FX],
    [INC_DATA_STALE_CRYPTO.code, INC_DATA_STALE_CRYPTO],
    [INC_DATA_STALE_OPTIONS.code, INC_DATA_STALE_OPTIONS],
    [INC_DATA_CROSS_VENUE_DISAGREE.code, INC_DATA_CROSS_VENUE_DISAGREE],
    [INC_DATA_FEED_DISAGREE.code, INC_DATA_FEED_DISAGREE],
    [INC_DATA_GAP_SIGMA.code, INC_DATA_GAP_SIGMA],
    [INC_DATA_BAD_PRINT_SPIKE.code, INC_DATA_BAD_PRINT_SPIKE],
    [INC_DATA_CORP_ACTIONS_MISSING.code, INC_DATA_CORP_ACTIONS_MISSING],
    [INC_DATA_NBBO_UNAVAILABLE.code, INC_DATA_NBBO_UNAVAILABLE],
    [INC_DATA_TICK_SIZE_INVALID.code, INC_DATA_TICK_SIZE_INVALID],
    [INC_DATA_GAP.code, INC_DATA_GAP],
    [INC_DATA_STALE.code, INC_DATA_STALE],
    [INC_PDT_TRIP.code, INC_PDT_TRIP],
    [INC_MWCB_L1.code, INC_MWCB_L1],
    [INC_MWCB_L2.code, INC_MWCB_L2],
    [INC_MWCB_L3.code, INC_MWCB_L3],
    [INC_LULD_PAUSE.code, INC_LULD_PAUSE],
    [INC_REG_SHO_LOCATE_FAIL.code, INC_REG_SHO_LOCATE_FAIL],
    [INC_RESTRICTED_LIST_HIT.code, INC_RESTRICTED_LIST_HIT],
    [INC_CORPORATE_ACTION_UNHANDLED.code, INC_CORPORATE_ACTION_UNHANDLED],
    [INC_COMPLIANCE_VIOLATION.code, INC_COMPLIANCE_VIOLATION],
    [INC_15c3_5_VIOLATION.code, INC_15c3_5_VIOLATION],
    [INC_BROKER_REJECT.code, INC_BROKER_REJECT],
    [INC_BROKER_NO_ACK.code, INC_BROKER_NO_ACK],
    [INC_BROKER_CIRCUIT_OPEN.code, INC_BROKER_CIRCUIT_OPEN],
    [INC_BROKER_DISCONNECTED.code, INC_BROKER_DISCONNECTED],
    [INC_FIX_SESSION_DOWN.code, INC_FIX_SESSION_DOWN],
    [INC_CLOCK_SKEW.code, INC_CLOCK_SKEW],
    [INC_ORDER_ORPHANED.code, INC_ORDER_ORPHANED],
    [INC_RECON_BREAK.code, INC_RECON_BREAK],
    [INC_DUP_EXEC_ID.code, INC_DUP_EXEC_ID],
    [INC_DEAD_LETTER.code, INC_DEAD_LETTER],
    [INC_RISK_VETO.code, INC_RISK_VETO],
    [INC_DAILY_LOSS_KILL.code, INC_DAILY_LOSS_KILL],
    [INC_WEEKLY_LOSS_KILL.code, INC_WEEKLY_LOSS_KILL],
    [INC_DRAWDOWN_KILL.code, INC_DRAWDOWN_KILL],
    [INC_HEAT_EXCEEDED.code, INC_HEAT_EXCEEDED],
    [INC_CLUSTER_EXCEEDED.code, INC_CLUSTER_EXCEEDED],
    [INC_MARGIN_CRITICAL.code, INC_MARGIN_CRITICAL],
    [INC_CORR_SPIKE.code, INC_CORR_SPIKE],
    [INC_LEVERAGE_BREACH.code, INC_LEVERAGE_BREACH],
    [INC_HALT_UNKNOWN.code, INC_HALT_UNKNOWN],
    [INC_SPREAD_BLOWOUT.code, INC_SPREAD_BLOWOUT],
    [INC_STATE_UNTRUSTED.code, INC_STATE_UNTRUSTED],
    [INC_CLOCK_UNSYNCED.code, INC_CLOCK_UNSYNCED],
    [INC_FEED_OUTAGE.code, INC_FEED_OUTAGE],
    [INC_DEPLOY_HASH_MISMATCH.code, INC_DEPLOY_HASH_MISMATCH],
    [INC_CANONICAL_LOAD_FAIL.code, INC_CANONICAL_LOAD_FAIL],
    [INC_AUTH_FAIL.code, INC_AUTH_FAIL],
    [INC_KEY_ROTATION_DUE.code, INC_KEY_ROTATION_DUE],
    [INC_ANOMALOUS_API_CALL.code, INC_ANOMALOUS_API_CALL],
    [INC_CONFIG_TAMPER.code, INC_CONFIG_TAMPER],
    [INC_TENANT_OVERRIDE_INVALID.code, INC_TENANT_OVERRIDE_INVALID],
    [INC_TENANT_BUDGET_EXCEEDED.code, INC_TENANT_BUDGET_EXCEEDED],
    [INC_TENANT_LIMIT_BREACH.code, INC_TENANT_LIMIT_BREACH],
    [INC_MACRO_BLACKOUT_OVERRIDE_ATTEMPT.code, INC_MACRO_BLACKOUT_OVERRIDE_ATTEMPT],
    [INC_HALT_WAKE_EARLY.code, INC_HALT_WAKE_EARLY],
    [INC_EARNINGS_CALENDAR_STALE.code, INC_EARNINGS_CALENDAR_STALE],
    [SIG_REGIME_SHIFT.code, SIG_REGIME_SHIFT],
    [SIG_LIQUIDITY_DEGRADATION.code, SIG_LIQUIDITY_DEGRADATION],
    [SIG_CORRELATION_REGIME_CHANGE.code, SIG_CORRELATION_REGIME_CHANGE],
    [SIG_DRIFT_FROM_PAPER.code, SIG_DRIFT_FROM_PAPER],
    [SIG_DRAWDOWN_TRAJECTORY.code, SIG_DRAWDOWN_TRAJECTORY],
    [SIG_HEAT_TRAJECTORY.code, SIG_HEAT_TRAJECTORY],
  ]);

/** Look up a canonical incident by code. Returns undefined if not found. */
export function getIncidentDefinition(
  code: string,
): CanonicalIncident | undefined {
  return INCIDENT_REGISTRY.get(code);
}
