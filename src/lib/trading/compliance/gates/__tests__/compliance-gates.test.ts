/**
 * Compliance Gates — Unit Tests
 *
 * Tests each gate individually with pass/fail scenarios, then tests the
 * gate runner with combined scenarios.
 *
 * The policy loader is mocked so gates never hit the filesystem in tests.
 */

import type { PolicyConfig } from "@/lib/trading/config/policy-types";

// ── Mock policy-loader before any gate imports ────────────────────────────────

const mockPolicy: Pick<PolicyConfig, "compliance" | "runtime"> = {
  compliance: {
    gates: [],
    pdt: {
      equity_threshold_usd: 25000,
      max_day_trades_in_window: 3,
      window_sessions: 5,
    },
    mwcb: {
      level1_pct: 0.07,
      level2_pct: 0.13,
      level3_pct: 0.20,
    },
    luld: {
      tier1_band_pct: 0.05,
      tier2_band_pct: 0.10,
    },
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
      margin: {
        utilization_max_pct: 0.75,
        leverage_max: 2.0,
      },
    },
  },
};

jest.mock("@/lib/trading/config/policy-loader", () => ({
  getPolicy: () => mockPolicy,
}));

// ── Imports (after mock) ──────────────────────────────────────────────────────

import { check as checkPdt } from "../pdt-gate";
import { check as checkSec } from "../sec-15c3-5-gate";
import { check as checkRegSho } from "../reg-sho-gate";
import { check as checkMwcb } from "../mwcb-gate";
import { check as checkLuld } from "../luld-gate";
import { check as checkAuction } from "../auction-gate";
import { check as checkRestricted } from "../restricted-list-gate";
import { runAllGates } from "../../gate-runner";

// ── Shared base input ─────────────────────────────────────────────────────────

const baseInput = {
  userId: "user-001",
  symbol: "AAPL",
  side: "buy" as const,
  quantity: 100,
  price: 150.0,
  accountEquity: 50000,
};

// =============================================================================
// C-01: PDT Gate
// =============================================================================

describe("C-01: PDT Gate", () => {
  describe("cash account", () => {
    it("passes when account is cash (PDT exempt)", () => {
      const result = checkPdt({
        ...baseInput,
        accountEquity: 10000, // below threshold
        dayTradesInWindow: 5, // would normally block
        isCashAccount: true,
      });
      expect(result.passed).toBe(true);
      expect(result.gateId).toBe("C-01");
    });
  });

  describe("sell-to-close", () => {
    it("passes for sell orders regardless of day trade count", () => {
      const result = checkPdt({
        ...baseInput,
        side: "sell",
        accountEquity: 5000,
        dayTradesInWindow: 10,
        isCashAccount: false,
      });
      expect(result.passed).toBe(true);
    });
  });

  describe("equity above threshold", () => {
    it("passes when equity meets the $25,000 threshold", () => {
      const result = checkPdt({
        ...baseInput,
        accountEquity: 25000,
        dayTradesInWindow: 5,
      });
      expect(result.passed).toBe(true);
    });

    it("passes when equity is well above threshold", () => {
      const result = checkPdt({
        ...baseInput,
        accountEquity: 100000,
        dayTradesInWindow: 3,
      });
      expect(result.passed).toBe(true);
    });
  });

  describe("equity below threshold", () => {
    it("passes when day trades < limit (2 trades, limit 3)", () => {
      const result = checkPdt({
        ...baseInput,
        accountEquity: 10000,
        dayTradesInWindow: 2,
      });
      expect(result.passed).toBe(true);
    });

    it("blocks at exactly 3 day trades (boundary: limit reached)", () => {
      const result = checkPdt({
        ...baseInput,
        accountEquity: 10000,
        dayTradesInWindow: 3,
      });
      expect(result.passed).toBe(false);
      expect(result.blockedBy).toMatch(/FINRA Rule 4210/);
      expect(result.reason).toContain("3 trades");
    });

    it("blocks when day trades exceed limit (4 trades)", () => {
      const result = checkPdt({
        ...baseInput,
        accountEquity: 15000,
        dayTradesInWindow: 4,
      });
      expect(result.passed).toBe(false);
    });
  });
});

// =============================================================================
// C-02: SEC 15c3-5 Gate
// =============================================================================

describe("C-02: SEC 15c3-5 Gate", () => {
  describe("price reasonability", () => {
    it("passes when price is within 10% of last known", () => {
      const result = checkSec({
        ...baseInput,
        price: 155,
        lastKnownPrice: 150,
      });
      expect(result.passed).toBe(true);
    });

    it("passes when price exactly equals last known", () => {
      const result = checkSec({
        ...baseInput,
        price: 150,
        lastKnownPrice: 150,
      });
      expect(result.passed).toBe(true);
    });

    it("blocks when price deviates more than 10% above last known", () => {
      const result = checkSec({
        ...baseInput,
        price: 170, // 13.3% above 150
        lastKnownPrice: 150,
      });
      expect(result.passed).toBe(false);
      expect(result.blockedBy).toMatch(/15c3-5/);
    });

    it("blocks when price deviates more than 10% below last known", () => {
      const result = checkSec({
        ...baseInput,
        price: 134, // ~10.7% below 150
        lastKnownPrice: 150,
      });
      expect(result.passed).toBe(false);
    });

    it("passes when no lastKnownPrice is provided (price check skipped, notional within limit)", () => {
      // accountEquity=50000, leverage_max=2.0 → max notional=100000
      // 100 shares * $150 = $15,000 — well within limit; only price check is skipped
      const result = checkSec({
        ...baseInput,
        price: 150,
        lastKnownPrice: undefined,
      });
      expect(result.passed).toBe(true);
    });
  });

  describe("gross notional check", () => {
    it("passes when order notional is within equity * leverage_max", () => {
      // accountEquity=50000, leverage_max=2.0 → max=100000
      // 100 shares * $150 = $15,000 → well within limit
      const result = checkSec({
        ...baseInput,
        price: 150,
        quantity: 100,
        accountEquity: 50000,
        existingNotional: 0,
      });
      expect(result.passed).toBe(true);
    });

    it("blocks when order notional + existing notional exceeds limit", () => {
      // accountEquity=50000, leverage_max=2.0 → max=100000
      // existingNotional=90000 + orderNotional=15000 = 105000 > 100000
      const result = checkSec({
        ...baseInput,
        price: 150,
        quantity: 100,
        accountEquity: 50000,
        existingNotional: 90000,
      });
      expect(result.passed).toBe(false);
      expect(result.blockedBy).toMatch(/Credit\/Capital/);
    });

    it("blocks when a single order exceeds equity * leverage", () => {
      // accountEquity=50000, leverage_max=2.0 → max=100000
      // 1000 shares * $200 = $200,000 > $100,000
      const result = checkSec({
        ...baseInput,
        price: 200,
        quantity: 1000,
        accountEquity: 50000,
      });
      expect(result.passed).toBe(false);
    });
  });
});

// =============================================================================
// C-03: Reg SHO Gate
// =============================================================================

describe("C-03: Reg SHO Gate", () => {
  const shortBase = { ...baseInput, side: "short" as const };

  it("passes for buy orders (Reg SHO does not apply)", () => {
    const result = checkRegSho({ ...baseInput, side: "buy" });
    expect(result.passed).toBe(true);
  });

  it("passes for sell orders (Reg SHO does not apply)", () => {
    const result = checkRegSho({ ...baseInput, side: "sell" });
    expect(result.passed).toBe(true);
  });

  describe("short orders — locate requirement", () => {
    it("blocks when locate is not confirmed", () => {
      const result = checkRegSho({ ...shortBase, locateConfirmed: false });
      expect(result.passed).toBe(false);
      expect(result.blockedBy).toMatch(/Locate Requirement/);
    });

    it("blocks when locateConfirmed is undefined", () => {
      const result = checkRegSho({ ...shortBase });
      expect(result.passed).toBe(false);
    });

    it("passes when locate is confirmed and no SSR", () => {
      const result = checkRegSho({
        ...shortBase,
        locateConfirmed: true,
        priorClose: 150,
        price: 148, // 1.3% below prior close — no SSR
      });
      expect(result.passed).toBe(true);
    });
  });

  describe("SSR uptick rule", () => {
    it("blocks when SSR is active and no currentBid provided", () => {
      const result = checkRegSho({
        ...shortBase,
        locateConfirmed: true,
        priorClose: 150,
        price: 130, // 13.3% below prior close — SSR active
        currentBid: undefined,
      });
      expect(result.passed).toBe(false);
      expect(result.blockedBy).toMatch(/SSR Uptick Rule/);
    });

    it("blocks when SSR is active and short price is at or below bid", () => {
      const result = checkRegSho({
        ...shortBase,
        locateConfirmed: true,
        priorClose: 150,
        price: 130,    // 13.3% decline — SSR active
        currentBid: 131, // short at 130 ≤ bid 131 — violates uptick
      });
      expect(result.passed).toBe(false);
    });

    it("passes when SSR active and short price is above current bid (uptick)", () => {
      const result = checkRegSho({
        ...shortBase,
        locateConfirmed: true,
        priorClose: 150,
        price: 132,    // 12% decline — SSR active
        currentBid: 131, // short at 132 > bid 131 — satisfies uptick
      });
      expect(result.passed).toBe(true);
    });

    it("passes when decline is exactly at SSR threshold (10%)", () => {
      // Prior close 150, current price 135 = 10% decline — SSR triggers
      const result = checkRegSho({
        ...shortBase,
        locateConfirmed: true,
        priorClose: 150,
        price: 135,
        currentBid: 134,
      });
      // 10% decline means SSR is active; price 135 > bid 134 = uptick satisfied
      expect(result.passed).toBe(true);
    });

    it("passes when decline is below SSR threshold (9%)", () => {
      // Prior close 150, current price 136.5 = 9% decline — no SSR
      const result = checkRegSho({
        ...shortBase,
        locateConfirmed: true,
        priorClose: 150,
        price: 136.5,
        currentBid: 140, // even below bid is fine since SSR not active
      });
      expect(result.passed).toBe(true);
    });
  });
});

// =============================================================================
// C-04: MWCB Gate
// =============================================================================

describe("C-04: MWCB Gate", () => {
  it("passes when no spxChangePct is provided (check skipped)", () => {
    const result = checkMwcb({ ...baseInput });
    expect(result.passed).toBe(true);
    expect(result.reason).toMatch(/skipped/);
  });

  it("passes when market is up", () => {
    const result = checkMwcb({ ...baseInput, spxChangePct: 0.02 });
    expect(result.passed).toBe(true);
  });

  it("passes when decline is below Level 1 (6% — below 7% threshold)", () => {
    const result = checkMwcb({ ...baseInput, spxChangePct: -0.06 });
    expect(result.passed).toBe(true);
  });

  it("blocks at exactly Level 1 boundary (7% decline)", () => {
    const result = checkMwcb({ ...baseInput, spxChangePct: -0.07 });
    expect(result.passed).toBe(false);
    expect(result.blockedBy).toMatch(/Level 1/);
    expect(result.reason).toMatch(/Level 1/);
  });

  it("blocks between Level 1 and Level 2 (10% decline)", () => {
    const result = checkMwcb({ ...baseInput, spxChangePct: -0.10 });
    expect(result.passed).toBe(false);
    expect(result.blockedBy).toMatch(/Level 1/);
  });

  it("blocks at exactly Level 2 boundary (13% decline)", () => {
    const result = checkMwcb({ ...baseInput, spxChangePct: -0.13 });
    expect(result.passed).toBe(false);
    expect(result.blockedBy).toMatch(/Level 2/);
  });

  it("blocks between Level 2 and Level 3 (15% decline)", () => {
    const result = checkMwcb({ ...baseInput, spxChangePct: -0.15 });
    expect(result.passed).toBe(false);
    expect(result.blockedBy).toMatch(/Level 2/);
  });

  it("blocks at exactly Level 3 boundary (20% decline)", () => {
    const result = checkMwcb({ ...baseInput, spxChangePct: -0.20 });
    expect(result.passed).toBe(false);
    expect(result.blockedBy).toMatch(/Level 3/);
  });

  it("blocks beyond Level 3 (25% decline)", () => {
    const result = checkMwcb({ ...baseInput, spxChangePct: -0.25 });
    expect(result.passed).toBe(false);
    expect(result.blockedBy).toMatch(/Level 3/);
  });
});

// =============================================================================
// C-05: LULD Gate
// =============================================================================

describe("C-05: LULD Gate", () => {
  it("passes when no bands are provided (check skipped)", () => {
    const result = checkLuld({ ...baseInput });
    expect(result.passed).toBe(true);
    expect(result.reason).toMatch(/skipped/);
  });

  describe("buy orders", () => {
    it("passes when buy price is below upper band", () => {
      const result = checkLuld({
        ...baseInput,
        side: "buy",
        price: 149,
        luldUpperBand: 157.5, // 5% above 150
        luldLowerBand: 142.5,
        tier: "tier1",
      });
      expect(result.passed).toBe(true);
    });

    it("passes when buy price equals upper band (edge: at band)", () => {
      const result = checkLuld({
        ...baseInput,
        side: "buy",
        price: 157.5,
        luldUpperBand: 157.5,
        luldLowerBand: 142.5,
        tier: "tier1",
      });
      // At-band is not > band, so passes
      expect(result.passed).toBe(true);
    });

    it("blocks when buy price exceeds upper band (Tier 1)", () => {
      const result = checkLuld({
        ...baseInput,
        side: "buy",
        price: 158, // above 157.5 upper band
        luldUpperBand: 157.5,
        luldLowerBand: 142.5,
        tier: "tier1",
      });
      expect(result.passed).toBe(false);
      expect(result.blockedBy).toMatch(/Limit Up/);
    });

    it("blocks when buy price exceeds upper band (Tier 2)", () => {
      const result = checkLuld({
        ...baseInput,
        side: "buy",
        price: 166, // above 165 upper band (10% of 150)
        luldUpperBand: 165,
        luldLowerBand: 135,
        tier: "tier2",
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toMatch(/Tier 2/);
    });
  });

  describe("sell orders", () => {
    it("passes when sell price is above lower band", () => {
      const result = checkLuld({
        ...baseInput,
        side: "sell",
        price: 145,
        luldUpperBand: 157.5,
        luldLowerBand: 142.5,
        tier: "tier1",
      });
      expect(result.passed).toBe(true);
    });

    it("blocks when sell price is below lower band", () => {
      const result = checkLuld({
        ...baseInput,
        side: "sell",
        price: 141, // below 142.5 lower band
        luldUpperBand: 157.5,
        luldLowerBand: 142.5,
        tier: "tier1",
      });
      expect(result.passed).toBe(false);
      expect(result.blockedBy).toMatch(/Limit Down/);
    });
  });

  describe("short orders", () => {
    it("blocks when short price is below lower band", () => {
      const result = checkLuld({
        ...baseInput,
        side: "short",
        price: 130, // below 135 lower band (10% of 150)
        luldUpperBand: 165,
        luldLowerBand: 135,
        tier: "tier2",
      });
      expect(result.passed).toBe(false);
      expect(result.blockedBy).toMatch(/Limit Down/);
    });
  });
});

// =============================================================================
// C-06: Auction Gate
// =============================================================================

describe("C-06: Auction Gate", () => {
  it("passes for any order type in normal session", () => {
    const result = checkAuction({
      ...baseInput,
      auctionState: "normal",
      orderType: "market",
    });
    expect(result.passed).toBe(true);
  });

  it("passes when no auctionState provided (defaults to normal)", () => {
    const result = checkAuction({ ...baseInput });
    expect(result.passed).toBe(true);
  });

  describe("halted state", () => {
    it("blocks all orders during a halt", () => {
      const result = checkAuction({
        ...baseInput,
        auctionState: "halted",
        orderType: "limit",
      });
      expect(result.passed).toBe(false);
      expect(result.blockedBy).toMatch(/Halt/);
    });
  });

  describe("opening auction", () => {
    it("allows limit orders during opening auction", () => {
      const result = checkAuction({
        ...baseInput,
        auctionState: "opening",
        orderType: "limit",
      });
      expect(result.passed).toBe(true);
    });

    it("allows market_on_open orders during opening auction", () => {
      const result = checkAuction({
        ...baseInput,
        auctionState: "opening",
        orderType: "market_on_open",
      });
      expect(result.passed).toBe(true);
    });

    it("blocks market orders during opening auction", () => {
      const result = checkAuction({
        ...baseInput,
        auctionState: "opening",
        orderType: "market",
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toMatch(/opening auction/);
    });

    it("blocks stop orders during opening auction", () => {
      const result = checkAuction({
        ...baseInput,
        auctionState: "opening",
        orderType: "stop",
      });
      expect(result.passed).toBe(false);
    });
  });

  describe("closing auction", () => {
    it("allows limit orders during closing auction", () => {
      const result = checkAuction({
        ...baseInput,
        auctionState: "closing",
        orderType: "limit",
      });
      expect(result.passed).toBe(true);
    });

    it("allows market_on_close orders during closing auction", () => {
      const result = checkAuction({
        ...baseInput,
        auctionState: "closing",
        orderType: "market_on_close",
      });
      expect(result.passed).toBe(true);
    });

    it("allows limit_on_close orders during closing auction", () => {
      const result = checkAuction({
        ...baseInput,
        auctionState: "closing",
        orderType: "limit_on_close",
      });
      expect(result.passed).toBe(true);
    });

    it("blocks market orders during closing auction", () => {
      const result = checkAuction({
        ...baseInput,
        auctionState: "closing",
        orderType: "market",
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toMatch(/closing auction/);
    });

    it("blocks market_on_open during closing auction", () => {
      const result = checkAuction({
        ...baseInput,
        auctionState: "closing",
        orderType: "market_on_open",
      });
      expect(result.passed).toBe(false);
    });
  });
});

// =============================================================================
// C-07: Restricted List Gate
// =============================================================================

describe("C-07: Restricted List Gate", () => {
  it("passes when no restricted list is provided", () => {
    const result = checkRestricted({ ...baseInput });
    expect(result.passed).toBe(true);
    expect(result.reason).toMatch(/skipped/);
  });

  it("passes when restricted list is empty", () => {
    const result = checkRestricted({
      ...baseInput,
      restrictedSymbols: [],
    });
    expect(result.passed).toBe(true);
  });

  it("passes when symbol is not on the restricted list", () => {
    const result = checkRestricted({
      ...baseInput,
      symbol: "AAPL",
      restrictedSymbols: ["GOOG", "META", "TSLA"],
    });
    expect(result.passed).toBe(true);
  });

  it("blocks when symbol is on the restricted list", () => {
    const result = checkRestricted({
      ...baseInput,
      symbol: "TSLA",
      restrictedSymbols: ["GOOG", "META", "TSLA"],
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toMatch(/TSLA/);
    expect(result.blockedBy).toMatch(/Restricted List/);
  });

  it("performs case-sensitive comparison (AAPL != aapl)", () => {
    const result = checkRestricted({
      ...baseInput,
      symbol: "aapl",
      restrictedSymbols: ["AAPL"],
    });
    // Lowercase symbol not in restricted list (which has uppercase)
    expect(result.passed).toBe(true);
  });
});

// =============================================================================
// Gate Runner
// =============================================================================

describe("Gate Runner", () => {
  const cleanInput = {
    userId: "user-001",
    symbol: "MSFT",
    side: "buy" as const,
    quantity: 10,
    price: 350,
    accountEquity: 100000,
    dayTradesInWindow: 0,
    spxChangePct: -0.01, // flat market
    luldUpperBand: 385,  // 10% above 350
    luldLowerBand: 315,  // 10% below 350
    tier: "tier2" as const,
    auctionState: "normal" as const,
    orderType: "limit" as const,
    restrictedSymbols: ["BADTICKER"],
    locateConfirmed: false, // not a short, so irrelevant
  };

  it("returns allPassed=true when all gates pass", () => {
    const result = runAllGates(cleanInput);
    expect(result.allPassed).toBe(true);
    expect(result.blockedGates).toHaveLength(0);
    expect(result.results).toHaveLength(7);
  });

  it("returns results for all 7 gates regardless of failures", () => {
    const result = runAllGates({
      ...cleanInput,
      spxChangePct: -0.20, // Level 3 MWCB
    });
    expect(result.results).toHaveLength(7);
  });

  it("reports single gate failure correctly", () => {
    const result = runAllGates({
      ...cleanInput,
      spxChangePct: -0.07, // Level 1 MWCB
    });
    expect(result.allPassed).toBe(false);
    expect(result.blockedGates).toHaveLength(1);
    expect(result.blockedGates[0]?.gateId).toBe("C-04");
  });

  it("reports multiple gate failures (does not short-circuit)", () => {
    const result = runAllGates({
      ...cleanInput,
      spxChangePct: -0.20, // MWCB Level 3
      auctionState: "halted", // Auction also blocked
      symbol: "BADTICKER", // Restricted list blocked
    });
    expect(result.allPassed).toBe(false);
    const blockedIds = result.blockedGates.map((g) => g.gateId);
    expect(blockedIds).toContain("C-04");
    expect(blockedIds).toContain("C-06");
    expect(blockedIds).toContain("C-07");
  });

  it("runs MWCB (C-04) before LULD (C-05) in result order", () => {
    const result = runAllGates(cleanInput);
    const gateIds = result.results.map((r) => r.gateId);
    const mwcbIdx = gateIds.indexOf("C-04");
    const luldIdx = gateIds.indexOf("C-05");
    expect(mwcbIdx).toBeLessThan(luldIdx);
  });

  it("blocks for PDT (C-01) when below equity threshold with max day trades", () => {
    const result = runAllGates({
      ...cleanInput,
      accountEquity: 10000,
      dayTradesInWindow: 3,
    });
    expect(result.allPassed).toBe(false);
    const blockedIds = result.blockedGates.map((g) => g.gateId);
    expect(blockedIds).toContain("C-01");
  });

  it("includes all 7 gate IDs in results", () => {
    const result = runAllGates(cleanInput);
    const gateIds = result.results.map((r) => r.gateId);
    expect(gateIds).toContain("C-01");
    expect(gateIds).toContain("C-02");
    expect(gateIds).toContain("C-03");
    expect(gateIds).toContain("C-04");
    expect(gateIds).toContain("C-05");
    expect(gateIds).toContain("C-06");
    expect(gateIds).toContain("C-07");
  });

  it("defaults dayTradesInWindow to 0 when not provided", () => {
    const { dayTradesInWindow: _omit, ...withoutDayTrades } = cleanInput;
    const result = runAllGates(withoutDayTrades);
    const pdtResult = result.results.find((r) => r.gateId === "C-01");
    expect(pdtResult?.passed).toBe(true);
  });
});
