/**
 * Adaptive Risk & Overnight Stress — Unit Tests
 */

import {
  computeAdaptiveRisk,
  computeRollingSharpe,
} from "../adaptive-risk";
import { assessOvernightRisk } from "../overnight-stress";
import type { OvernightPosition } from "../overnight-stress";

// ============================================================================
// MOCKS
// ============================================================================

const mockPolicy = {
  runtime: {
    risk: {
      per_trade: { hard_max_pct: 0.01, default_pct: 0.0075 },
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
    },
  },
};

jest.mock("@/lib/trading/config", () => ({
  getPolicy: () => mockPolicy,
}));

// ============================================================================
// ROLLING SHARPE TESTS
// ============================================================================

describe("computeRollingSharpe", () => {
  it("returns 0 for insufficient data", () => {
    expect(computeRollingSharpe([])).toBe(0);
    expect(computeRollingSharpe([0.01])).toBe(0);
  });

  it("returns 0 for all-zero returns", () => {
    expect(computeRollingSharpe([0, 0, 0, 0, 0])).toBe(0);
  });

  it("computes positive Sharpe for consistently positive returns", () => {
    // All positive returns should yield positive Sharpe
    const returns = [0.01, 0.015, 0.008, 0.012, 0.009, 0.011, 0.013, 0.010, 0.014, 0.007];
    const sharpe = computeRollingSharpe(returns);
    expect(sharpe).toBeGreaterThan(0);
  });

  it("computes negative Sharpe for consistently negative returns", () => {
    const returns = [-0.01, -0.015, -0.008, -0.012, -0.009];
    const sharpe = computeRollingSharpe(returns);
    expect(sharpe).toBeLessThan(0);
  });

  it("produces higher Sharpe for lower volatility with same mean", () => {
    // Same mean but tighter dispersion
    const lowVol = [0.01, 0.011, 0.009, 0.01, 0.01, 0.011, 0.009, 0.01];
    const highVol = [0.03, -0.01, 0.02, 0.0, 0.04, -0.02, 0.01, 0.01];

    const sharpeLow = computeRollingSharpe(lowVol);
    const sharpeHigh = computeRollingSharpe(highVol);

    expect(sharpeLow).toBeGreaterThan(sharpeHigh);
  });
});

// ============================================================================
// ADAPTIVE RISK — SHARPE-BASED SCALING TESTS
// ============================================================================

describe("computeAdaptiveRisk — Sharpe-based scaling", () => {
  it("scales up when Sharpe > 1.5", () => {
    // High mean with low volatility -> high Sharpe
    // Mean ~0.005, std ~0.001 -> daily Sharpe ~5, annualized ~79
    const returns: number[] = [];
    for (let i = 0; i < 30; i++) {
      returns.push(0.005 + (i % 2 === 0 ? 0.001 : -0.001));
    }
    const result = computeAdaptiveRisk({
      recentReturns: returns,
      windowDays: 30,
      baseRiskPct: 0.005,
    });

    expect(result.multiplier).toBeGreaterThan(1.0);
    expect(result.multiplier).toBeLessThanOrEqual(1.25);
    expect(result.reason).toContain("scaling up");
  });

  it("no change when Sharpe is in 0.5-1.5 range", () => {
    // Mix of positive and negative returns -> moderate Sharpe
    const returns = [0.005, -0.003, 0.004, -0.002, 0.006, -0.001, 0.003, -0.004, 0.002, 0.001];
    const result = computeAdaptiveRisk({
      recentReturns: returns,
      windowDays: 10,
      baseRiskPct: 0.005,
    });

    // Sharpe likely in normal range
    expect(result.adjustedRiskPct).toBeCloseTo(result.multiplier * 0.005, 6);
  });

  it("scales down when Sharpe < 0.5", () => {
    // Noisy with near-zero mean -> low Sharpe
    const returns = [0.01, -0.012, 0.008, -0.011, 0.009, -0.01, 0.007, -0.009, 0.011, -0.013];
    const result = computeAdaptiveRisk({
      recentReturns: returns,
      windowDays: 10,
      baseRiskPct: 0.008,
    });

    expect(result.multiplier).toBeLessThanOrEqual(1.0);
  });

  it("returns base risk for insufficient data", () => {
    const result = computeAdaptiveRisk({
      recentReturns: [0.01],
      windowDays: 20,
      baseRiskPct: 0.005,
    });

    expect(result.multiplier).toBe(1.0);
    expect(result.reason).toContain("insufficient data");
  });

  it("returns base risk for empty returns", () => {
    const result = computeAdaptiveRisk({
      recentReturns: [],
      windowDays: 20,
      baseRiskPct: 0.005,
    });

    expect(result.adjustedRiskPct).toBe(0.005);
    expect(result.multiplier).toBe(1.0);
  });
});

// ============================================================================
// ADAPTIVE RISK — DRAWDOWN OVERRIDE TESTS
// ============================================================================

describe("computeAdaptiveRisk — drawdown override", () => {
  it("reduces to 0.3x when drawdown exceeds 10%", () => {
    // Create a series with a >10% drawdown
    const returns = [0.02, 0.01, -0.05, -0.04, -0.03, -0.02, 0.01, 0.02, 0.01, 0.005];
    const result = computeAdaptiveRisk({
      recentReturns: returns,
      windowDays: 10,
      baseRiskPct: 0.008,
    });

    expect(result.multiplier).toBe(0.3);
    expect(result.reason).toContain("drawdown");
    expect(result.reason).toContain("exceeds 10%");
  });

  it("drawdown overrides high Sharpe", () => {
    // Start with good returns, then crash
    const returns = [0.02, 0.03, 0.02, -0.08, -0.06, -0.04, 0.01, 0.015, 0.02, 0.025];
    const result = computeAdaptiveRisk({
      recentReturns: returns,
      windowDays: 10,
      baseRiskPct: 0.008,
    });

    // Drawdown from peak should exceed 10%
    expect(result.multiplier).toBe(0.3);
    expect(result.reason).toContain("drawdown");
  });
});

// ============================================================================
// ADAPTIVE RISK — POLICY CAP TESTS
// ============================================================================

describe("computeAdaptiveRisk — hard_max_pct cap", () => {
  it("caps adjusted risk at hard_max_pct", () => {
    // Very high Sharpe with high base risk
    const returns = Array(30).fill(0.01);
    const result = computeAdaptiveRisk({
      recentReturns: returns,
      windowDays: 30,
      baseRiskPct: 0.009, // 0.9%, close to max
    });

    // Even with 1.25x multiplier: 0.009 * 1.25 = 0.01125 > hard_max 0.01
    expect(result.adjustedRiskPct).toBeLessThanOrEqual(0.01);
  });

  it("caps at hard_max even for base risk exceeding it", () => {
    const returns = Array(10).fill(0.005);
    const result = computeAdaptiveRisk({
      recentReturns: returns,
      windowDays: 10,
      baseRiskPct: 0.02, // exceeds hard_max of 0.01
    });

    expect(result.adjustedRiskPct).toBeLessThanOrEqual(0.01);
  });
});

// ============================================================================
// OVERNIGHT STRESS TESTS
// ============================================================================

describe("assessOvernightRisk", () => {
  it("returns hold for no positions", () => {
    const result = assessOvernightRisk([]);
    expect(result.recommendation).toBe("hold");
    expect(result.maxLoss).toBe(0);
    expect(result.reason).toContain("no open positions");
  });

  it("computes beta-adjusted losses for long positions", () => {
    const positions: OvernightPosition[] = [
      { symbol: "AAPL", side: "long", notional: 10_000, beta: 1.2 },
    ];

    const result = assessOvernightRisk(positions);

    // Should have 3 scenarios
    expect(result.scenarios.length).toBe(3);

    // -5% gap, beta 1.2: loss = 10000 * 0.05 * 1.2 = 600
    const severeDown = result.scenarios.find((s) => s.gapPct === -0.05);
    expect(severeDown).toBeDefined();
    expect(severeDown!.totalPnl).toBeCloseTo(-600, 0);
  });

  it("computes beta-adjusted gains for short positions on down gaps", () => {
    const positions: OvernightPosition[] = [
      { symbol: "TSLA", side: "short", notional: 10_000, beta: 1.5 },
    ];

    const result = assessOvernightRisk(positions);

    // -2% gap, beta 1.5, short: PnL = 10000 * -0.02 * 1.5 * -1 = +300
    const moderateDown = result.scenarios.find((s) => s.gapPct === -0.02);
    expect(moderateDown).toBeDefined();
    expect(moderateDown!.totalPnl).toBeCloseTo(300, 0);
  });

  it("recommends flatten when max loss exceeds daily_loss_pct", () => {
    // Large high-beta position: 5% gap * 2.0 beta = 10% loss
    // daily_loss_pct = 2%, 10% >> 2%
    const positions: OvernightPosition[] = [
      { symbol: "NVDA", side: "long", notional: 100_000, beta: 2.0 },
    ];

    const result = assessOvernightRisk(positions);
    expect(result.recommendation).toBe("flatten");
    expect(result.reason).toContain("exceeds daily kill switch");
  });

  it("recommends reduce when max loss exceeds 50% of daily_loss_pct", () => {
    // Need maxLossPct between 1% (0.5 * 2%) and 2%
    // notional=100k, -2% gap, beta=0.6: loss = 100k * 0.02 * 0.6 = 1200, pct = 1.2%
    // -5% gap, beta=0.6: loss = 100k * 0.05 * 0.6 = 3000, pct = 3% > 2% -> flatten
    // Use beta=0.3: -5% gap: loss = 100k * 0.05 * 0.3 = 1500, pct = 1.5% > 1%, < 2% -> reduce
    const positions: OvernightPosition[] = [
      { symbol: "XLU", side: "long", notional: 100_000, beta: 0.3 },
    ];

    const result = assessOvernightRisk(positions);
    expect(result.recommendation).toBe("reduce");
    expect(result.reason).toContain("50% of daily kill switch");
  });

  it("recommends hold when losses are small", () => {
    // Low-beta position with small notional
    const positions: OvernightPosition[] = [
      { symbol: "GLD", side: "long", notional: 10_000, beta: 0.1 },
    ];

    const result = assessOvernightRisk(positions);
    expect(result.recommendation).toBe("hold");
    expect(result.maxLossPct).toBeLessThan(0.01); // 0.5 * 2% = 1%
  });

  it("handles mixed long/short portfolio", () => {
    const positions: OvernightPosition[] = [
      { symbol: "AAPL", side: "long", notional: 50_000, beta: 1.1 },
      { symbol: "SPY", side: "short", notional: 30_000, beta: 1.0 },
    ];

    const result = assessOvernightRisk(positions);

    // On a down gap, long loses and short gains (partial hedge)
    const downGap = result.scenarios.find((s) => s.gapPct === -0.02);
    expect(downGap).toBeDefined();

    // AAPL long: -50000 * 0.02 * 1.1 = -1100
    // SPY short: -30000 * (-0.02) * 1.0 * (-1) = +600
    // Net: -500
    const applImpact = downGap!.positionImpacts.find((p) => p.symbol === "AAPL");
    const spyImpact = downGap!.positionImpacts.find((p) => p.symbol === "SPY");

    expect(applImpact!.pnl).toBeCloseTo(-1100, 0);
    expect(spyImpact!.pnl).toBeCloseTo(600, 0);
    expect(downGap!.totalPnl).toBeCloseTo(-500, 0);
  });

  it("totalNotional sums absolute position notionals", () => {
    const positions: OvernightPosition[] = [
      { symbol: "A", side: "long", notional: 50_000, beta: 1.0 },
      { symbol: "B", side: "short", notional: 30_000, beta: 1.0 },
    ];

    const result = assessOvernightRisk(positions);
    expect(result.totalNotional).toBe(80_000);
  });
});
