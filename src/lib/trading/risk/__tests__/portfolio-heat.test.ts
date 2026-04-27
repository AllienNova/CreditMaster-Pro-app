/**
 * Portfolio Heat Model — Unit Tests
 *
 * Tests covariance matrix computation, portfolio heat calculation,
 * regime-based heat budget enforcement, and Law 21 position sizing.
 */

import { computeCovarianceMatrix } from "../covariance";
import { computePortfolioHeat, checkHeatBudget } from "../portfolio-heat";
import { calculatePositionSize } from "../position-sizer";
import type { MarketRegime } from "@/lib/trading/config";

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
};

jest.mock("@/lib/trading/config", () => ({
  getPolicy: () => mockPolicy,
}));

// ============================================================================
// COVARIANCE MATRIX TESTS
// ============================================================================

describe("computeCovarianceMatrix", () => {
  it("returns empty array for empty input", () => {
    expect(computeCovarianceMatrix([])).toEqual([]);
  });

  it("returns variance for single asset", () => {
    // Returns: [0.01, -0.01, 0.02, -0.02, 0.03]
    // Mean = 0.006, Var = Σ(r-μ)² / (n-1)
    const returns = [0.01, -0.01, 0.02, -0.02, 0.03];
    const result = computeCovarianceMatrix([returns]);

    expect(result.length).toBe(1);
    expect(result[0].length).toBe(1);

    // Manual: mean = 0.006
    // deviations: [0.004, -0.016, 0.014, -0.026, 0.024]
    // sum of squares: 0.000016 + 0.000256 + 0.000196 + 0.000676 + 0.000576 = 0.00172
    // variance = 0.00172 / 4 = 0.00043
    expect(result[0][0]).toBeCloseTo(0.00043, 5);
  });

  it("produces identity-like matrix for uncorrelated series", () => {
    // Two assets with orthogonal return patterns
    const a = [0.01, 0, -0.01, 0, 0.01, 0, -0.01, 0];
    const b = [0, 0.01, 0, -0.01, 0, 0.01, 0, -0.01];

    const cov = computeCovarianceMatrix([a, b]);

    expect(cov.length).toBe(2);
    // Diagonal: positive variance
    expect(cov[0][0]).toBeGreaterThan(0);
    expect(cov[1][1]).toBeGreaterThan(0);
    // Off-diagonal: near zero (orthogonal)
    expect(Math.abs(cov[0][1])).toBeLessThan(0.0001);
    expect(cov[0][1]).toBe(cov[1][0]); // symmetric
  });

  it("produces correct known covariance for perfectly correlated series", () => {
    const a = [0.01, 0.02, 0.03, 0.04, 0.05];
    const b = [0.02, 0.04, 0.06, 0.08, 0.10]; // b = 2a

    const cov = computeCovarianceMatrix([a, b]);

    // Var(a) = 0.0000025, Var(b) = 0.00001, Cov(a,b) = 0.000005
    // Cov(a,b) / sqrt(Var(a)*Var(b)) = 1.0 (perfect correlation)
    expect(cov[0][1]).toBeCloseTo(cov[1][0], 10);
    const correlation = cov[0][1] / Math.sqrt(cov[0][0] * cov[1][1]);
    expect(correlation).toBeCloseTo(1.0, 8);
  });

  it("produces symmetric matrix", () => {
    const a = [0.01, -0.02, 0.015, -0.005];
    const b = [0.005, -0.01, 0.02, -0.015];
    const c = [-0.01, 0.03, -0.005, 0.01];

    const cov = computeCovarianceMatrix([a, b, c]);

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(cov[i][j]).toBe(cov[j][i]);
      }
    }
  });

  it("throws on mismatched series lengths", () => {
    expect(() =>
      computeCovarianceMatrix([[0.01, 0.02], [0.01]]),
    ).toThrow("length mismatch");
  });

  it("returns zero matrix for single observation", () => {
    const cov = computeCovarianceMatrix([[0.01], [0.02]]);
    expect(cov).toEqual([[0, 0], [0, 0]]);
  });

  it("handles NaN values gracefully (treats as 0)", () => {
    const a = [0.01, NaN, 0.03];
    const b = [0.02, 0.04, NaN];

    const cov = computeCovarianceMatrix([a, b]);
    // Should not throw or return NaN
    expect(Number.isFinite(cov[0][0])).toBe(true);
    expect(Number.isFinite(cov[0][1])).toBe(true);
    expect(Number.isFinite(cov[1][1])).toBe(true);
  });

  it("handles zero returns correctly", () => {
    const zeros = [0, 0, 0, 0, 0];
    const cov = computeCovarianceMatrix([zeros, zeros]);
    expect(cov[0][0]).toBe(0);
    expect(cov[0][1]).toBe(0);
    expect(cov[1][1]).toBe(0);
  });
});

// ============================================================================
// PORTFOLIO HEAT TESTS
// ============================================================================

describe("computePortfolioHeat", () => {
  it("returns 0 for empty weights", () => {
    expect(computePortfolioHeat([], [], 100_000)).toBe(0);
  });

  it("returns 0 for zero equity", () => {
    expect(computePortfolioHeat([1000], [[0.0001]], 0)).toBe(0);
  });

  it("computes heat for single position", () => {
    // weight = $10,000, variance = 0.0004 (2% daily vol)
    // heat = sqrt(10000² * 0.0004) / 100000 = sqrt(40000) / 100000 = 200 / 100000 = 0.002
    const weights = [10_000];
    const cov = [[0.0004]];
    const equity = 100_000;

    const heat = computePortfolioHeat(weights, cov, equity);
    expect(heat).toBeCloseTo(0.002, 5);
  });

  it("computes heat for two uncorrelated positions", () => {
    // Two equal positions, each $50k, uncorrelated
    // Cov = [[0.0004, 0], [0, 0.0004]]
    // σ²_p = 50k² * 0.0004 + 50k² * 0.0004 = 2 * 1_000_000 = 2_000_000
    // σ_p = sqrt(2_000_000) ≈ 1414.21
    // heat = 1414.21 / 100000 ≈ 0.01414
    const weights = [50_000, 50_000];
    const cov = [
      [0.0004, 0],
      [0, 0.0004],
    ];
    const equity = 100_000;

    const heat = computePortfolioHeat(weights, cov, equity);
    expect(heat).toBeCloseTo(0.01414, 4);
  });

  it("computes higher heat for perfectly correlated positions", () => {
    // Same positions but perfectly correlated
    const weights = [50_000, 50_000];
    const covCorrelated = [
      [0.0004, 0.0004],
      [0.0004, 0.0004],
    ];
    const covUncorrelated = [
      [0.0004, 0],
      [0, 0.0004],
    ];
    const equity = 100_000;

    const heatCorr = computePortfolioHeat(weights, covCorrelated, equity);
    const heatUncorr = computePortfolioHeat(weights, covUncorrelated, equity);

    // Perfectly correlated should have higher heat (no diversification)
    expect(heatCorr).toBeGreaterThan(heatUncorr);

    // For perfect correlation: σ_p = |w1 + w2| * σ = 100000 * 0.02 = 2000
    // heat = 2000 / 100000 = 0.02
    expect(heatCorr).toBeCloseTo(0.02, 5);
  });

  it("throws on dimension mismatch", () => {
    expect(() => computePortfolioHeat([1, 2, 3], [[1, 0], [0, 1]], 100_000)).toThrow(
      "Dimension mismatch",
    );
  });

  it("handles negative equity by returning 0", () => {
    expect(computePortfolioHeat([1000], [[0.0001]], -50_000)).toBe(0);
  });
});

// ============================================================================
// HEAT BUDGET TESTS
// ============================================================================

describe("checkHeatBudget", () => {
  it("allows heat below trending ceiling", () => {
    const result = checkHeatBudget(0.04, "trending");
    expect(result.allowed).toBe(true);
    expect(result.ceiling).toBe(0.06);
    expect(result.utilization).toBeCloseTo(0.04 / 0.06, 5);
  });

  it("allows heat below ranging ceiling (same as normal)", () => {
    const result = checkHeatBudget(0.05, "ranging");
    expect(result.allowed).toBe(true);
    expect(result.ceiling).toBe(0.06);
  });

  it("allows heat below transition ceiling (same as normal)", () => {
    const result = checkHeatBudget(0.059, "transition");
    expect(result.allowed).toBe(true);
    expect(result.ceiling).toBe(0.06);
  });

  it("blocks heat above shock ceiling", () => {
    // shock ceiling = 0.03
    const result = checkHeatBudget(0.04, "shock");
    expect(result.allowed).toBe(false);
    expect(result.ceiling).toBe(0.03);
    expect(result.utilization).toBeGreaterThan(1);
  });

  it("allows heat at exactly shock ceiling", () => {
    const result = checkHeatBudget(0.03, "shock");
    expect(result.allowed).toBe(true);
    expect(result.utilization).toBeCloseTo(1.0, 5);
  });

  it("blocks heat above crisis ceiling", () => {
    // crisis ceiling = 0.01
    const result = checkHeatBudget(0.02, "crisis");
    expect(result.allowed).toBe(false);
    expect(result.ceiling).toBe(0.01);
    expect(result.utilization).toBeCloseTo(2.0, 5);
  });

  it("allows zero heat in any regime", () => {
    const regimes: MarketRegime[] = ["trending", "ranging", "transition", "shock", "crisis"];
    for (const regime of regimes) {
      const result = checkHeatBudget(0, regime);
      expect(result.allowed).toBe(true);
      expect(result.utilization).toBe(0);
    }
  });

  it("returns correct ceiling per regime", () => {
    expect(checkHeatBudget(0, "trending").ceiling).toBe(0.06);
    expect(checkHeatBudget(0, "ranging").ceiling).toBe(0.06);
    expect(checkHeatBudget(0, "transition").ceiling).toBe(0.06);
    expect(checkHeatBudget(0, "shock").ceiling).toBe(0.03);
    expect(checkHeatBudget(0, "crisis").ceiling).toBe(0.01);
  });
});

// ============================================================================
// POSITION SIZER TESTS
// ============================================================================

describe("calculatePositionSize", () => {
  it("computes basic position size from risk fraction and distance", () => {
    // equity=100k, risk=1%, entry=50, stop=48 (distance=2)
    // shares = (100000 * 0.01) / 2 = 500
    const result = calculatePositionSize({
      equity: 100_000,
      riskFractionPct: 0.01,
      entryPrice: 50,
      invalidationPrice: 48,
    });

    expect(result.shares).toBe(500);
    expect(result.riskAmount).toBe(1000); // 500 * 2
    expect(result.notional).toBe(25_000); // 500 * 50
  });

  it("caps at hard_max_pct when risk fraction exceeds policy", () => {
    // hard_max_pct = 0.01 (1%), requesting 5% risk
    // Effective: 100000 * 0.01 / 2 = 500
    const result = calculatePositionSize({
      equity: 100_000,
      riskFractionPct: 0.05,
      entryPrice: 50,
      invalidationPrice: 48,
    });

    expect(result.shares).toBe(500);
  });

  it("rounds down to tick size", () => {
    // shares = (100000 * 0.01) / 3 = 333.33 → floor to 330 (tick=10)
    const result = calculatePositionSize({
      equity: 100_000,
      riskFractionPct: 0.01,
      entryPrice: 50,
      invalidationPrice: 47,
      tickSize: 10,
    });

    expect(result.shares).toBe(330);
  });

  it("returns minimum 1 share for valid inputs with wide stop", () => {
    // equity=1000, risk=0.01, distance=50
    // raw = (1000 * 0.01) / 50 = 0.2 → floor = 0 → clamp to 1
    const result = calculatePositionSize({
      equity: 1000,
      riskFractionPct: 0.01,
      entryPrice: 100,
      invalidationPrice: 50,
    });

    expect(result.shares).toBe(1);
  });

  it("returns 0 shares for zero equity", () => {
    const result = calculatePositionSize({
      equity: 0,
      riskFractionPct: 0.01,
      entryPrice: 50,
      invalidationPrice: 48,
    });

    expect(result.shares).toBe(0);
    expect(result.riskAmount).toBe(0);
    expect(result.notional).toBe(0);
  });

  it("returns 0 shares for zero entry price", () => {
    const result = calculatePositionSize({
      equity: 100_000,
      riskFractionPct: 0.01,
      entryPrice: 0,
      invalidationPrice: 48,
    });

    expect(result.shares).toBe(0);
  });

  it("handles identical entry and invalidation prices", () => {
    // distance=0, should still return at least 1 share
    const result = calculatePositionSize({
      equity: 100_000,
      riskFractionPct: 0.01,
      entryPrice: 50,
      invalidationPrice: 50,
    });

    expect(result.shares).toBeGreaterThanOrEqual(1);
    expect(result.riskAmount).toBe(0); // no risk when distance=0
  });

  it("respects maxNotional cap", () => {
    // Without cap: 500 shares at $50 = $25,000
    // With cap: max 100 shares = $5,000
    const result = calculatePositionSize({
      equity: 100_000,
      riskFractionPct: 0.01,
      entryPrice: 50,
      invalidationPrice: 48,
      maxNotional: 5000,
    });

    expect(result.shares).toBe(100);
    expect(result.notional).toBe(5000);
  });

  it("works with short position (invalidation above entry)", () => {
    // entry=50, stop=52 (short), distance=2
    // shares = (100000 * 0.01) / 2 = 500
    const result = calculatePositionSize({
      equity: 100_000,
      riskFractionPct: 0.01,
      entryPrice: 50,
      invalidationPrice: 52,
    });

    expect(result.shares).toBe(500);
    expect(result.riskAmount).toBe(1000);
  });

  it("handles very small risk fractions", () => {
    // 0.1% risk on $100k = $100, distance=$2 → 50 shares
    const result = calculatePositionSize({
      equity: 100_000,
      riskFractionPct: 0.001,
      entryPrice: 50,
      invalidationPrice: 48,
    });

    expect(result.shares).toBe(50);
  });
});

// ============================================================================
// INTEGRATION: COVARIANCE → HEAT → BUDGET
// ============================================================================

describe("covariance → heat → budget integration", () => {
  it("computes heat from raw returns through the full pipeline", () => {
    // Two assets with known return series
    const returnsA = [0.01, -0.01, 0.02, -0.02, 0.015, -0.005, 0.01, -0.01, 0.005, 0.02];
    const returnsB = [0.005, -0.005, 0.01, -0.01, 0.008, -0.003, 0.005, -0.005, 0.003, 0.01];

    const cov = computeCovarianceMatrix([returnsA, returnsB]);

    // Weights: $60k in A, $40k in B
    const weights = [60_000, 40_000];
    const equity = 100_000;

    const heat = computePortfolioHeat(weights, cov, equity);

    // Heat should be a small positive number
    expect(heat).toBeGreaterThan(0);
    expect(heat).toBeLessThan(0.1); // sanity bound

    // Check budget in trending regime (ceiling = 6%)
    const budget = checkHeatBudget(heat, "trending");
    expect(budget.allowed).toBe(true);
    expect(budget.ceiling).toBe(0.06);
    expect(budget.utilization).toBeLessThan(1);
  });

  it("detects when heat exceeds crisis ceiling from real returns", () => {
    // High-volatility series to generate substantial heat
    const highVol = [0.05, -0.08, 0.06, -0.07, 0.04, -0.09, 0.07, -0.06, 0.05, -0.08];

    const cov = computeCovarianceMatrix([highVol]);
    const weights = [100_000]; // 100% concentrated
    const equity = 100_000;

    const heat = computePortfolioHeat(weights, cov, equity);

    // Crisis ceiling is 1%, high vol should exceed it
    const crisisBudget = checkHeatBudget(heat, "crisis");
    expect(crisisBudget.ceiling).toBe(0.01);
    // With ~6-8% daily vol, heat >> 1%
    expect(heat).toBeGreaterThan(0.01);
    expect(crisisBudget.allowed).toBe(false);
  });
});
