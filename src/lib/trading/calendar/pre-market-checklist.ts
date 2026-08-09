/**
 * Pre-Market Validation Checklist — Sprint 9C
 *
 * 12 pre-market checks run before market open to verify system readiness.
 * All thresholds are sourced from getPolicy() — never hardcoded.
 */

import { getPolicy } from "@/lib/trading/config/policy-loader";
import { getMarketSession } from "@/lib/trading/calendar/market-calendar";
import { isInBlackout } from "@/lib/trading/calendar/blackout-windows";

// ============================================================================
// TYPES
// ============================================================================

export interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
  severity: "blocker" | "warning" | "info";
}

export interface ChecklistResult {
  passed: boolean;
  checks: CheckResult[];
  blockers: string[];
}

export interface PreMarketContext {
  /** Current timestamp (defaults to now) */
  timestamp?: Date;
  /** System clock skew in milliseconds (absolute value) */
  clockSkewMs?: number;
  /** Is the data feed currently receiving quotes? */
  dataFeedActive?: boolean;
  /** Seconds since last quote was received */
  lastQuoteAgeSec?: number;
  /** Is the broker connection authenticated and responsive? */
  brokerConnected?: boolean;
  /** Is the kill switch currently active? */
  killSwitchActive?: boolean;
  /** SHA-256 hash of the loaded policy */
  loadedPolicyHash?: string;
  /** Account equity in USD */
  accountEquityUsd?: number;
  /** Whether the account intends to day trade */
  isDayTrading?: boolean;
  /** Current margin utilization as a decimal fraction [0,1] */
  marginUtilization?: number;
  /** Symbol to check for blackout (use a sentinel like "SPY" for market-wide) */
  blackoutCheckSymbol?: string;
  /** Have overnight positions been stress tested? */
  overnightStressTested?: boolean;
  /** Number of open overnight positions */
  overnightPositionCount?: number;
  /** Has the daily risk budget been exhausted? */
  riskBudgetExhausted?: boolean;
  /** Daily loss as a decimal fraction of equity */
  dailyLossPct?: number;
  /** Number of stale pending orders from previous session */
  stalePendingOrderCount?: number;
}

// ============================================================================
// INDIVIDUAL CHECKS
// ============================================================================

function checkMarketCalendar(ctx: PreMarketContext): CheckResult {
  const ts = ctx.timestamp ?? new Date();
  const session = getMarketSession(ts);

  if (session.type === "holiday") {
    return {
      name: "market_calendar",
      passed: false,
      details: `Today (${session.date}) is a market holiday`,
      severity: "blocker",
    };
  }

  if (session.type === "weekend") {
    return {
      name: "market_calendar",
      passed: false,
      details: `Today (${session.date}) is a weekend`,
      severity: "blocker",
    };
  }

  const typeLabel = session.type === "half_day" ? "half day" : "regular";
  return {
    name: "market_calendar",
    passed: true,
    details: `Today (${session.date}) is a ${typeLabel} trading day`,
    severity: "info",
  };
}

function checkSystemClock(ctx: PreMarketContext): CheckResult {
  const policy = getPolicy();
  const maxSkewMs = policy.execution.clock_skew.max_ms;
  const skew = ctx.clockSkewMs ?? 0;

  if (skew > maxSkewMs) {
    return {
      name: "system_clock",
      passed: false,
      details: `Clock skew ${skew}ms exceeds max ${maxSkewMs}ms`,
      severity: "blocker",
    };
  }

  return {
    name: "system_clock",
    passed: true,
    details: `Clock skew ${skew}ms within ${maxSkewMs}ms limit`,
    severity: "info",
  };
}

function checkDataFeed(ctx: PreMarketContext): CheckResult {
  if (ctx.dataFeedActive === false) {
    return {
      name: "data_feed",
      passed: false,
      details: "Data feed is not active — no quotes being received",
      severity: "blocker",
    };
  }

  // Check staleness of last quote (use equities default: 15s)
  const policy = getPolicy();
  const maxStaleSec = policy.dataQuality.staleness.equities?.max_seconds ?? 15;
  const age = ctx.lastQuoteAgeSec ?? 0;

  if (age > maxStaleSec) {
    return {
      name: "data_feed",
      passed: false,
      details: `Last quote ${age}s ago exceeds staleness threshold ${maxStaleSec}s`,
      severity: "blocker",
    };
  }

  return {
    name: "data_feed",
    passed: true,
    details: `Data feed active, last quote ${age}s ago`,
    severity: "info",
  };
}

function checkBrokerConnection(ctx: PreMarketContext): CheckResult {
  if (ctx.brokerConnected === false) {
    return {
      name: "broker_connection",
      passed: false,
      details: "Broker connection is not authenticated or unresponsive",
      severity: "blocker",
    };
  }

  return {
    name: "broker_connection",
    passed: true,
    details: "Broker connection authenticated and responsive",
    severity: "info",
  };
}

function checkKillSwitch(ctx: PreMarketContext): CheckResult {
  if (ctx.killSwitchActive === true) {
    return {
      name: "kill_switch",
      passed: false,
      details: "Kill switch is active — all trading halted",
      severity: "blocker",
    };
  }

  return {
    name: "kill_switch",
    passed: true,
    details: "Kill switch is not active",
    severity: "info",
  };
}

function checkPolicyLoaded(ctx: PreMarketContext): CheckResult {
  const policy = getPolicy();
  const canonicalHash = policy.canonicalHash;

  if (!ctx.loadedPolicyHash) {
    return {
      name: "policy_loaded",
      passed: false,
      details: "No policy hash provided — cannot verify canonical policy",
      severity: "warning",
    };
  }

  if (ctx.loadedPolicyHash !== canonicalHash) {
    return {
      name: "policy_loaded",
      passed: false,
      details: `Policy hash mismatch: loaded=${ctx.loadedPolicyHash.slice(0, 12)}... expected=${canonicalHash.slice(0, 12)}...`,
      severity: "blocker",
    };
  }

  return {
    name: "policy_loaded",
    passed: true,
    details: `Policy hash verified: ${canonicalHash.slice(0, 12)}...`,
    severity: "info",
  };
}

function checkAccountEquity(ctx: PreMarketContext): CheckResult {
  if (!ctx.isDayTrading) {
    return {
      name: "account_equity",
      passed: true,
      details: "Not day trading — PDT equity check skipped",
      severity: "info",
    };
  }

  const policy = getPolicy();
  const pdtThreshold = policy.compliance.pdt.equity_threshold_usd;
  const equity = ctx.accountEquityUsd ?? 0;

  if (equity < pdtThreshold) {
    return {
      name: "account_equity",
      passed: false,
      details: `Account equity $${equity.toFixed(2)} below PDT threshold $${pdtThreshold}`,
      severity: "blocker",
    };
  }

  return {
    name: "account_equity",
    passed: true,
    details: `Account equity $${equity.toFixed(2)} above PDT threshold $${pdtThreshold}`,
    severity: "info",
  };
}

function checkMarginUtilization(ctx: PreMarketContext): CheckResult {
  const policy = getPolicy();
  const maxUtil = policy.runtime.risk.margin.utilization_max_pct;
  const utilization = ctx.marginUtilization ?? 0;

  if (utilization > maxUtil) {
    return {
      name: "margin_utilization",
      passed: false,
      details: `Margin utilization ${(utilization * 100).toFixed(1)}% exceeds limit ${(maxUtil * 100).toFixed(1)}%`,
      severity: "blocker",
    };
  }

  return {
    name: "margin_utilization",
    passed: true,
    details: `Margin utilization ${(utilization * 100).toFixed(1)}% within ${(maxUtil * 100).toFixed(1)}% limit`,
    severity: "info",
  };
}

function checkBlackoutWindows(ctx: PreMarketContext): CheckResult {
  const ts = ctx.timestamp ?? new Date();
  const symbol = ctx.blackoutCheckSymbol ?? "SPY";
  const blackout = isInBlackout(symbol, ts);

  if (blackout) {
    return {
      name: "blackout_windows",
      passed: false,
      details: `Active blackout: ${blackout.reason}`,
      severity: blackout.blockAllTrading ? "blocker" : "warning",
    };
  }

  return {
    name: "blackout_windows",
    passed: true,
    details: "No active blackout windows",
    severity: "info",
  };
}

function checkOvernightPositions(ctx: PreMarketContext): CheckResult {
  const posCount = ctx.overnightPositionCount ?? 0;

  if (posCount === 0) {
    return {
      name: "overnight_positions",
      passed: true,
      details: "No overnight positions to stress test",
      severity: "info",
    };
  }

  if (ctx.overnightStressTested === false) {
    return {
      name: "overnight_positions",
      passed: false,
      details: `${posCount} overnight position(s) not stress tested`,
      severity: "warning",
    };
  }

  return {
    name: "overnight_positions",
    passed: true,
    details: `${posCount} overnight position(s) stress tested`,
    severity: "info",
  };
}

function checkRiskBudgets(ctx: PreMarketContext): CheckResult {
  const policy = getPolicy();
  const dailyLossLimit = policy.runtime.risk.kill_switch.daily_loss_pct;
  const dailyLoss = ctx.dailyLossPct ?? 0;

  if (ctx.riskBudgetExhausted === true || dailyLoss >= dailyLossLimit) {
    return {
      name: "risk_budgets",
      passed: false,
      details: `Daily risk budget exhausted (loss ${(dailyLoss * 100).toFixed(2)}% >= limit ${(dailyLossLimit * 100).toFixed(2)}%)`,
      severity: "blocker",
    };
  }

  return {
    name: "risk_budgets",
    passed: true,
    details: `Daily risk budget available (loss ${(dailyLoss * 100).toFixed(2)}% < limit ${(dailyLossLimit * 100).toFixed(2)}%)`,
    severity: "info",
  };
}

function checkPendingOrders(ctx: PreMarketContext): CheckResult {
  const staleCount = ctx.stalePendingOrderCount ?? 0;

  if (staleCount > 0) {
    return {
      name: "pending_orders",
      passed: false,
      details: `${staleCount} stale pending order(s) from previous session`,
      severity: "warning",
    };
  }

  return {
    name: "pending_orders",
    passed: true,
    details: "No stale pending orders",
    severity: "info",
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Runs all 12 pre-market validation checks.
 * Returns a ChecklistResult with overall pass/fail, individual check results,
 * and a list of blocker descriptions.
 */
export function runPreMarketChecklist(
  context: PreMarketContext,
): ChecklistResult {
  const checks: CheckResult[] = [
    checkMarketCalendar(context),
    checkSystemClock(context),
    checkDataFeed(context),
    checkBrokerConnection(context),
    checkKillSwitch(context),
    checkPolicyLoaded(context),
    checkAccountEquity(context),
    checkMarginUtilization(context),
    checkBlackoutWindows(context),
    checkOvernightPositions(context),
    checkRiskBudgets(context),
    checkPendingOrders(context),
  ];

  const blockers = checks
    .filter((c) => !c.passed && c.severity === "blocker")
    .map((c) => `[${c.name}] ${c.details}`);

  return {
    passed: blockers.length === 0,
    checks,
    blockers,
  };
}
