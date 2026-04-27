/**
 * Transaction Cost Model — Unit Tests
 */

import { estimateTransactionCost, adjustSizeForCosts } from "../transaction-cost-model";
import type { TransactionCost } from "../transaction-cost-model";

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
  execution: {
    slippage_threshold_bps: 10,
  },
};

jest.mock("@/lib/trading/config", () => ({
  getPolicy: () => mockPolicy,
}));

// ============================================================================
// COMMISSION TESTS
// ============================================================================

describe("estimateTransactionCost — commission", () => {
  it("returns zero commission for retail venue", () => {
    const result = estimateTransactionCost({
      price: 100,
      shares: 500,
      side: "buy",
    });
    expect(result.commission).toBe(0);
  });

  it("returns zero commission when venue is not DMA", () => {
    const result = estimateTransactionCost({
      price: 100,
      shares: 500,
      side: "buy",
      venue: "retail",
    });
    expect(result.commission).toBe(0);
  });

  it("charges $0.005/share for DMA venue", () => {
    const result = estimateTransactionCost({
      price: 100,
      shares: 1000,
      side: "buy",
      venue: "dma",
    });
    expect(result.commission).toBe(5); // 1000 * 0.005
  });

  it("charges $0.005/share for DMA venue (uppercase)", () => {
    const result = estimateTransactionCost({
      price: 50,
      shares: 200,
      side: "sell",
      venue: "DMA",
    });
    expect(result.commission).toBe(1); // 200 * 0.005
  });
});

// ============================================================================
// SPREAD COST TESTS
// ============================================================================

describe("estimateTransactionCost — spread cost", () => {
  it("computes half-spread cost with default 5 bps", () => {
    // Half spread = 5/10000/2 = 0.00025
    // Cost = 0.00025 * 100 * 1000 = 25
    const result = estimateTransactionCost({
      price: 100,
      shares: 1000,
      side: "buy",
    });
    expect(result.spreadCost).toBeCloseTo(25, 2);
  });

  it("uses custom spreadBps when provided", () => {
    // Half spread = 10/10000/2 = 0.0005
    // Cost = 0.0005 * 50 * 500 = 12.5
    const result = estimateTransactionCost({
      price: 50,
      shares: 500,
      side: "buy",
      spreadBps: 10,
    });
    expect(result.spreadCost).toBeCloseTo(12.5, 2);
  });

  it("returns zero spread cost for zero spread", () => {
    const result = estimateTransactionCost({
      price: 100,
      shares: 1000,
      side: "buy",
      spreadBps: 0,
    });
    expect(result.spreadCost).toBe(0);
  });
});

// ============================================================================
// SLIPPAGE (SQUARE-ROOT IMPACT) TESTS
// ============================================================================

describe("estimateTransactionCost — slippage", () => {
  it("computes square-root impact model correctly", () => {
    // sigma=0.02, shares=10000, adv=1000000, price=100
    // participation = 10000/1000000 = 0.01
    // slippage_per_share = 0.02 * sqrt(0.01) * 100 = 0.02 * 0.1 * 100 = 0.2
    // total = 0.2 * 10000 = 2000
    const result = estimateTransactionCost({
      price: 100,
      shares: 10_000,
      side: "buy",
      sigma: 0.02,
      adv: 1_000_000,
    });
    expect(result.slippageCost).toBeCloseTo(2000, 0);
  });

  it("slippage increases with sqrt of participation rate", () => {
    const small = estimateTransactionCost({
      price: 100,
      shares: 1000,
      side: "buy",
      sigma: 0.02,
      adv: 1_000_000,
      spreadBps: 0,
    });

    const large = estimateTransactionCost({
      price: 100,
      shares: 4000,
      side: "buy",
      sigma: 0.02,
      adv: 1_000_000,
      spreadBps: 0,
    });

    // 4x shares should produce ~2x slippage per share (sqrt relationship),
    // so total slippage should be ~8x (4x shares * 2x per-share)
    // More precisely: ratio of slippage costs = (4000/1000) * sqrt(4000/1000) = 4 * 2 = 8
    expect(large.slippageCost / small.slippageCost).toBeCloseTo(8, 0);
  });

  it("slippage is zero when shares are zero", () => {
    const result = estimateTransactionCost({
      price: 100,
      shares: 0,
      side: "buy",
      sigma: 0.02,
      adv: 1_000_000,
    });
    expect(result.slippageCost).toBe(0);
  });

  it("slippage increases with higher volatility", () => {
    const lowVol = estimateTransactionCost({
      price: 100,
      shares: 5000,
      side: "buy",
      sigma: 0.01,
      adv: 1_000_000,
      spreadBps: 0,
    });

    const highVol = estimateTransactionCost({
      price: 100,
      shares: 5000,
      side: "buy",
      sigma: 0.03,
      adv: 1_000_000,
      spreadBps: 0,
    });

    // 3x sigma should produce 3x slippage
    expect(highVol.slippageCost / lowVol.slippageCost).toBeCloseTo(3, 1);
  });
});

// ============================================================================
// TOTAL COST & BPS TESTS
// ============================================================================

describe("estimateTransactionCost — totals", () => {
  it("totalCost is sum of commission + spread + slippage", () => {
    const result = estimateTransactionCost({
      price: 100,
      shares: 1000,
      side: "buy",
      venue: "dma",
      sigma: 0.02,
      adv: 1_000_000,
      spreadBps: 5,
    });

    expect(result.totalCost).toBeCloseTo(
      result.commission + result.spreadCost + result.slippageCost,
      6,
    );
  });

  it("totalBps = totalCost / notional * 10000", () => {
    const result = estimateTransactionCost({
      price: 50,
      shares: 2000,
      side: "sell",
      sigma: 0.02,
      adv: 1_000_000,
    });

    const notional = 50 * 2000;
    const expectedBps = (result.totalCost / notional) * 10_000;
    expect(result.totalBps).toBeCloseTo(expectedBps, 6);
  });

  it("returns all zeros for zero price", () => {
    const result = estimateTransactionCost({
      price: 0,
      shares: 1000,
      side: "buy",
    });
    expect(result.totalCost).toBe(0);
    expect(result.totalBps).toBe(0);
  });

  it("returns all zeros for negative shares", () => {
    const result = estimateTransactionCost({
      price: 100,
      shares: -10,
      side: "buy",
    });
    expect(result.totalCost).toBe(0);
  });
});

// ============================================================================
// SIZE ADJUSTMENT TESTS
// ============================================================================

describe("adjustSizeForCosts", () => {
  it("returns rawShares when costs are small relative to risk budget", () => {
    // Risk budget = 100000 * 0.01 = 1000
    // Cost = ~$25 (spread only for 1000 shares at $100)
    // 25/1000 = 2.5% — well within 10%
    const costs = estimateTransactionCost({
      price: 100,
      shares: 1000,
      side: "buy",
    });

    const adjusted = adjustSizeForCosts({
      rawShares: 1000,
      entryPrice: 100,
      targetRiskPct: 0.01,
      equity: 100_000,
      costs,
    });

    expect(adjusted).toBe(1000);
  });

  it("reduces size when costs exceed 10% of risk budget", () => {
    // Simulate expensive trade: DMA + wide spread + high impact
    const costs: TransactionCost = {
      commission: 500,
      spreadCost: 300,
      slippageCost: 700,
      totalCost: 1500,
      totalBps: 150,
    };

    // Risk budget = 10000 * 0.01 = 100
    // 1500/100 = 15x — way over budget
    const adjusted = adjustSizeForCosts({
      rawShares: 1000,
      entryPrice: 100,
      targetRiskPct: 0.01,
      equity: 10_000,
      costs,
    });

    expect(adjusted).toBeLessThan(1000);
    expect(adjusted).toBeGreaterThanOrEqual(1);
  });

  it("returns 0 for zero equity", () => {
    const costs = estimateTransactionCost({ price: 100, shares: 100, side: "buy" });
    const adjusted = adjustSizeForCosts({
      rawShares: 100,
      entryPrice: 100,
      targetRiskPct: 0.01,
      equity: 0,
      costs,
    });
    expect(adjusted).toBe(0);
  });

  it("returns 0 for zero entry price", () => {
    const costs = estimateTransactionCost({ price: 100, shares: 100, side: "buy" });
    const adjusted = adjustSizeForCosts({
      rawShares: 100,
      entryPrice: 0,
      targetRiskPct: 0.01,
      equity: 100_000,
      costs,
    });
    expect(adjusted).toBe(0);
  });
});
