/**
 * Tests for calendar/pre-market-checklist.ts — Sprint 9C
 */

import {
  runPreMarketChecklist,
  type PreMarketContext,
  type ChecklistResult,
} from "../pre-market-checklist";
import { getPolicy } from "@/lib/trading/config/policy-loader";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a context where all checks pass.
 * Uses a known regular trading day (Wednesday 2026-03-04, well outside holidays).
 * Timestamp is set to 08:00 ET (pre-market).
 * Reads the actual canonical hash from the loaded policy at test time.
 */
function passingContext(overrides?: Partial<PreMarketContext>): PreMarketContext {
  const policy = getPolicy();
  return {
    // 2026-03-04 13:00 UTC = 08:00 ET (pre-market on a Wednesday)
    timestamp: new Date("2026-03-04T13:00:00.000Z"),
    clockSkewMs: 50,
    dataFeedActive: true,
    lastQuoteAgeSec: 2,
    brokerConnected: true,
    killSwitchActive: false,
    loadedPolicyHash: policy.canonicalHash,
    accountEquityUsd: 50000,
    isDayTrading: true,
    marginUtilization: 0.30,
    blackoutCheckSymbol: "SPY",
    overnightStressTested: true,
    overnightPositionCount: 2,
    riskBudgetExhausted: false,
    dailyLossPct: 0.005,
    stalePendingOrderCount: 0,
    ...overrides,
  };
}

function findCheck(result: ChecklistResult, name: string) {
  return result.checks.find((c) => c.name === name);
}

// ============================================================================
// ALL CHECKS PASSING
// ============================================================================

describe("runPreMarketChecklist — all passing", () => {
  it("passes when all conditions are met", () => {
    const result = runPreMarketChecklist(passingContext());
    expect(result.passed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.checks).toHaveLength(12);
  });

  it("returns 12 checks", () => {
    const result = runPreMarketChecklist(passingContext());
    const names = result.checks.map((c) => c.name);
    expect(names).toEqual([
      "market_calendar",
      "system_clock",
      "data_feed",
      "broker_connection",
      "kill_switch",
      "policy_loaded",
      "account_equity",
      "margin_utilization",
      "blackout_windows",
      "overnight_positions",
      "risk_budgets",
      "pending_orders",
    ]);
  });
});

// ============================================================================
// INDIVIDUAL BLOCKER SCENARIOS
// ============================================================================

describe("runPreMarketChecklist — market calendar blocker", () => {
  it("fails on a holiday", () => {
    // 2026-01-01 is New Year's Day (holiday)
    const result = runPreMarketChecklist(
      passingContext({ timestamp: new Date("2026-01-01T14:00:00.000Z") }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "market_calendar");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("blocker");
    expect(check?.details).toContain("holiday");
  });

  it("fails on a weekend", () => {
    // 2026-03-07 is a Saturday
    const result = runPreMarketChecklist(
      passingContext({ timestamp: new Date("2026-03-07T14:00:00.000Z") }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "market_calendar");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("blocker");
    expect(check?.details).toContain("weekend");
  });
});

describe("runPreMarketChecklist — system clock blocker", () => {
  it("fails when clock skew exceeds policy threshold", () => {
    // Default policy max_ms = 500
    const result = runPreMarketChecklist(
      passingContext({ clockSkewMs: 1000 }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "system_clock");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("blocker");
  });
});

describe("runPreMarketChecklist — data feed blocker", () => {
  it("fails when data feed is inactive", () => {
    const result = runPreMarketChecklist(
      passingContext({ dataFeedActive: false }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "data_feed");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("blocker");
    expect(check?.details).toContain("not active");
  });

  it("fails when last quote is stale", () => {
    const result = runPreMarketChecklist(
      passingContext({ lastQuoteAgeSec: 60 }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "data_feed");
    expect(check?.passed).toBe(false);
  });
});

describe("runPreMarketChecklist — broker connection blocker", () => {
  it("fails when broker is not connected", () => {
    const result = runPreMarketChecklist(
      passingContext({ brokerConnected: false }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "broker_connection");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("blocker");
  });
});

describe("runPreMarketChecklist — kill switch blocker", () => {
  it("fails when kill switch is active", () => {
    const result = runPreMarketChecklist(
      passingContext({ killSwitchActive: true }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "kill_switch");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("blocker");
  });
});

describe("runPreMarketChecklist — policy hash blocker", () => {
  it("fails when policy hash mismatches", () => {
    const result = runPreMarketChecklist(
      passingContext({ loadedPolicyHash: "wrong-hash-abc123" }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "policy_loaded");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("blocker");
  });

  it("warns when no policy hash is provided", () => {
    const result = runPreMarketChecklist(
      passingContext({ loadedPolicyHash: undefined }),
    );
    // Warning, not blocker — so overall may still pass
    const check = findCheck(result, "policy_loaded");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("warning");
  });
});

describe("runPreMarketChecklist — account equity blocker", () => {
  it("fails when equity is below PDT threshold while day trading", () => {
    // PDT threshold = $25,000
    const result = runPreMarketChecklist(
      passingContext({ accountEquityUsd: 20000, isDayTrading: true }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "account_equity");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("blocker");
  });

  it("passes when not day trading even with low equity", () => {
    const result = runPreMarketChecklist(
      passingContext({ accountEquityUsd: 5000, isDayTrading: false }),
    );
    const check = findCheck(result, "account_equity");
    expect(check?.passed).toBe(true);
  });
});

describe("runPreMarketChecklist — margin utilization blocker", () => {
  it("fails when margin utilization exceeds limit", () => {
    // Default policy: 75%
    const result = runPreMarketChecklist(
      passingContext({ marginUtilization: 0.90 }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "margin_utilization");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("blocker");
  });
});

describe("runPreMarketChecklist — risk budgets blocker", () => {
  it("fails when risk budget is exhausted", () => {
    const result = runPreMarketChecklist(
      passingContext({ riskBudgetExhausted: true, dailyLossPct: 0.03 }),
    );
    expect(result.passed).toBe(false);
    const check = findCheck(result, "risk_budgets");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("blocker");
  });
});

// ============================================================================
// WARNING SCENARIOS (do not block)
// ============================================================================

describe("runPreMarketChecklist — warnings vs blockers", () => {
  it("stale pending orders are a warning, not a blocker", () => {
    const result = runPreMarketChecklist(
      passingContext({ stalePendingOrderCount: 3 }),
    );
    // Overall should still pass (warnings don't block)
    expect(result.passed).toBe(true);
    const check = findCheck(result, "pending_orders");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("warning");
  });

  it("untested overnight positions are a warning, not a blocker", () => {
    const result = runPreMarketChecklist(
      passingContext({
        overnightStressTested: false,
        overnightPositionCount: 5,
      }),
    );
    expect(result.passed).toBe(true);
    const check = findCheck(result, "overnight_positions");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("warning");
  });
});

// ============================================================================
// MULTIPLE FAILURES
// ============================================================================

describe("runPreMarketChecklist — multiple failures", () => {
  it("reports all blockers when multiple checks fail", () => {
    const result = runPreMarketChecklist(
      passingContext({
        brokerConnected: false,
        killSwitchActive: true,
        clockSkewMs: 2000,
      }),
    );
    expect(result.passed).toBe(false);
    expect(result.blockers.length).toBeGreaterThanOrEqual(3);
    expect(result.blockers.some((b) => b.includes("broker_connection"))).toBe(true);
    expect(result.blockers.some((b) => b.includes("kill_switch"))).toBe(true);
    expect(result.blockers.some((b) => b.includes("system_clock"))).toBe(true);
  });
});
