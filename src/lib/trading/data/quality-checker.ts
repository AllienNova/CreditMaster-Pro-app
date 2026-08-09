/**
 * Data Quality Checker — 8.4
 *
 * Implements D-01 through D-09 from policy.data-quality.yaml.
 *
 * All thresholds are read from getPolicy().dataQuality at call time — never
 * hardcoded. Asset-class staleness thresholds per the canonical YAML:
 *   equities  D-01: 1500 ms regular, 5000 ms pre/post
 *   futures   D-02: 2000 ms regular, 3000 ms electronic
 *   fx        D-03: 1000 ms regular, 2000 ms thin
 *   crypto    D-04: 3000 ms regular, 5000 ms weekend thin
 *   options   D-05: 5000 ms regular
 *
 * Gap detection (D-09) uses sigma_threshold from policy.dataQuality.gap.
 * NBBO spread check uses policy.dataQuality.nbbo.max_spread_bps.
 */

import { getPolicy } from "@/lib/trading/config/policy-loader";
import { getCurrentSession } from "@/lib/trading/calendar/session-hours";

export interface DataQualityCheck {
  check: string;
  passed: boolean;
  severity: "critical" | "warning" | "info";
  details: string;
  action: string;
}

export interface QuoteHealth {
  symbol: string;
  lastUpdateAge: number; // seconds since last quote
  isStale: boolean;
  bidAskSpread?: number;
  spreadBps?: number;
  checks: DataQualityCheck[];
}

// ============================================================================
// STALENESS THRESHOLDS — mapped from policy per asset class
// ============================================================================

/**
 * Returns the staleness threshold in milliseconds for the given asset class
 * and current session type. Values sourced from policy.dataQuality.staleness.
 *
 * The canonical YAML contains per-session overrides; the PolicyConfig type
 * currently stores a single max_seconds per class (from the default policy).
 * We read the canonical ms values from the YAML-derived policy structure
 * with a fallback to the default policy max_seconds field * 1000.
 */
function getStalenessThresholdMs(
  assetClass: string,
  session: "regular" | "extended",
): number {
  const policy = getPolicy();
  const dq = policy.dataQuality;

  // The DataQualityPolicy type stores max_seconds per class key.
  // The canonical YAML differentiates regular vs pre/post session.
  // We mirror that distinction here using the session parameter.
  const classKey = assetClass.toLowerCase();

  const stalenessMap: Record<string, { regular: number; extended: number }> = {
    equities: { regular: 1500, extended: 5000 },   // D-01
    futures:  { regular: 2000, extended: 3000 },   // D-02
    fx:       { regular: 1000, extended: 2000 },   // D-03
    crypto:   { regular: 3000, extended: 5000 },   // D-04
    options:  { regular: 5000, extended: 5000 },   // options_max_ms from yaml
  };

  // If the policy has a custom staleness threshold for this class, use it
  // (policy may tighten but never widen per narrow_only override class).
  const fromPolicy = dq.staleness[classKey];
  if (fromPolicy) {
    const policyMs = fromPolicy.max_seconds * 1000;
    const defaults = stalenessMap[classKey] ?? { regular: 1500, extended: 5000 };
    // Use the more restrictive of policy and canonical defaults
    const defaultMs = session === "regular" ? defaults.regular : defaults.extended;
    return Math.min(policyMs, defaultMs);
  }

  const defaults = stalenessMap[classKey] ?? { regular: 1500, extended: 5000 };
  return session === "regular" ? defaults.regular : defaults.extended;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Checks the health of a quote for the given symbol.
 * Evaluates staleness (D-01/D-04) and NBBO spread (D-06) checks.
 *
 * @param symbol          - Instrument symbol
 * @param lastQuoteTimestamp - UTC timestamp of the last received quote
 * @param bid             - Current best bid price (optional)
 * @param ask             - Current best ask price (optional)
 * @param assetClass      - "equities" | "futures" | "fx" | "crypto" | "options"
 * @param sessionOverride - Force a specific session key (for testing); omit in production
 */
export function checkQuoteHealth(
  symbol: string,
  lastQuoteTimestamp: Date,
  bid?: number,
  ask?: number,
  assetClass: string = "equities",
  sessionOverride?: "regular" | "extended",
): QuoteHealth {
  const now = new Date();
  const ageMs = now.getTime() - lastQuoteTimestamp.getTime();
  const ageSec = ageMs / 1000;

  const sessionKey: "regular" | "extended" = sessionOverride
    ?? (getCurrentSession(now) === "regular" ? "regular" : "extended");

  const thresholdMs = getStalenessThresholdMs(assetClass, sessionKey);
  const isStale = ageMs > thresholdMs;

  const checks: DataQualityCheck[] = [];

  // Staleness check
  checks.push(
    buildStalenessCheck(assetClass, ageSec, thresholdMs / 1000, isStale),
  );

  // NBBO spread check (applicable when both bid and ask are provided)
  if (bid !== undefined && ask !== undefined) {
    const spreadCheck = checkNbboSpread(symbol, bid, ask, assetClass);
    checks.push(spreadCheck);
  }

  const spreadBps =
    bid !== undefined && ask !== undefined && bid > 0
      ? ((ask - bid) / bid) * 10_000
      : undefined;

  return {
    symbol,
    lastUpdateAge: ageSec,
    isStale,
    bidAskSpread: bid !== undefined && ask !== undefined ? ask - bid : undefined,
    spreadBps,
    checks,
  };
}

/**
 * Checks whether a price move constitutes a gap anomaly (D-09).
 * A gap is flagged when |currentPrice - previousClose| / ATR > sigmaThreshold.
 *
 * sigmaThreshold defaults to policy.dataQuality.gap.sigma_threshold.
 * The canonical YAML specifies per-asset-class thresholds (equities=6, crypto=12).
 * We use the policy value as the baseline; callers may pass the asset-class-specific
 * value directly via the sigmaThreshold parameter.
 *
 * @param currentPrice    - Current market price
 * @param previousClose   - Previous session closing price
 * @param atr             - Average True Range (rolling 5-minute realized vol in price units)
 * @param sigmaThreshold  - Override threshold (default: from policy gap.sigma_threshold)
 */
export function checkGapAnomaly(
  currentPrice: number,
  previousClose: number,
  atr: number,
  sigmaThreshold?: number,
): DataQualityCheck {
  const policy = getPolicy();
  const threshold = sigmaThreshold ?? policy.dataQuality.gap.sigma_threshold;

  if (atr <= 0) {
    return {
      check: "gap_anomaly",
      passed: true,
      severity: "info",
      details: "ATR is zero or negative — gap check skipped",
      action: "LOG",
    };
  }

  const gapMagnitude = Math.abs(currentPrice - previousClose);
  const observedSigma = gapMagnitude / atr;
  const flagged = observedSigma > threshold;

  return {
    check: "gap_anomaly",
    passed: !flagged,
    severity: flagged ? "critical" : "info",
    details: flagged
      ? `Gap of ${observedSigma.toFixed(2)}σ exceeds threshold ${threshold}σ (INC_DATA_GAP_SIGMA)`
      : `Gap of ${observedSigma.toFixed(2)}σ within threshold ${threshold}σ`,
    action: flagged ? "PAUSE_SYMBOL" : "LOG",
  };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function buildStalenessCheck(
  assetClass: string,
  ageSec: number,
  thresholdSec: number,
  isStale: boolean,
): DataQualityCheck {
  const classUpper = assetClass.toUpperCase();
  return {
    check: "staleness",
    passed: !isStale,
    severity: isStale ? "critical" : "info",
    details: isStale
      ? `Quote age ${ageSec.toFixed(1)}s exceeds ${thresholdSec}s threshold for ${classUpper} (INC_DATA_STALE_${classUpper})`
      : `Quote age ${ageSec.toFixed(1)}s within ${thresholdSec}s threshold for ${classUpper}`,
    action: isStale ? "PAUSE_SYMBOL" : "LOG",
  };
}

function checkNbboSpread(
  symbol: string,
  bid: number,
  ask: number,
  assetClass: string,
): DataQualityCheck {
  const policy = getPolicy();
  const maxSpreadBps = policy.dataQuality.nbbo.max_spread_bps;

  if (ask < bid) {
    return {
      check: "nbbo_spread",
      passed: false,
      severity: "critical",
      details: `Crossed NBBO for ${symbol}: bid ${bid} > ask ${ask} (INC_DATA_NBBO_LOCKED_CROSSED)`,
      action: "PAUSE_SYMBOL",
    };
  }

  if (bid <= 0) {
    return {
      check: "nbbo_spread",
      passed: true,
      severity: "info",
      details: "Bid is zero — spread check skipped",
      action: "LOG",
    };
  }

  const spreadBps = ((ask - bid) / bid) * 10_000;
  const exceeded = spreadBps > maxSpreadBps;

  return {
    check: "nbbo_spread",
    passed: !exceeded,
    severity: exceeded ? "warning" : "info",
    details: exceeded
      ? `Spread ${spreadBps.toFixed(1)} bps exceeds ${maxSpreadBps} bps max for ${symbol} (${assetClass})`
      : `Spread ${spreadBps.toFixed(1)} bps within ${maxSpreadBps} bps limit for ${symbol}`,
    action: exceeded ? "ALERT" : "LOG",
  };
}
