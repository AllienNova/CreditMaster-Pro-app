/**
 * Edge Decay Detector Tests
 *
 * Tests each detector individually, the 2-of-3 composite trigger,
 * and graduated recommendations.
 */

import {
  isSharpeDeclining,
  isWinRateDecaying,
  isPnlDecaying,
  detectEdgeDecay,
} from "../edge-decay-detector";
import type { EdgeDecayInput } from "../edge-decay-detector";

// ============================================================================
// HELPERS
// ============================================================================

function makeInput(overrides: Partial<EdgeDecayInput> = {}): EdgeDecayInput {
  return {
    returns: Array.from({ length: 40 }, (_, i) => 0.01 - i * 0.0005),
    recentWinRate: 0.55,
    historicalWinRate: 0.55,
    recentAvgPnl: 100,
    historicalAvgPnl: 100,
    ...overrides,
  };
}

// ============================================================================
// 1. isSharpeDeclining
// ============================================================================

describe("isSharpeDeclining", () => {
  test("returns true when second half Sharpe is lower", () => {
    // First half: positive returns with variance, second half: negative with variance
    const returns = [
      0.03, 0.01, 0.04, 0.02, 0.03, 0.01, 0.02, 0.04, 0.01, 0.03,
      -0.01, -0.02, 0.00, -0.03, -0.01, -0.02, 0.00, -0.01, -0.02, -0.03,
    ];
    expect(isSharpeDeclining(returns, 20)).toBe(true);
  });

  test("returns false when Sharpe is stable or improving", () => {
    // Improving: second half better than first
    const returns = [
      0.00, 0.01, 0.00, 0.01, 0.00, 0.01, 0.00, 0.01, 0.00, 0.01,
      0.02, 0.03, 0.02, 0.03, 0.02, 0.03, 0.02, 0.03, 0.02, 0.03,
    ];
    expect(isSharpeDeclining(returns, 20)).toBe(false);
  });

  test("returns false for insufficient data", () => {
    const returns = [0.01, 0.02];
    expect(isSharpeDeclining(returns, 20)).toBe(false);
  });

  test("returns true for strongly declining performance", () => {
    const returns = [
      0.06, 0.04, 0.05, 0.07, 0.03, 0.05, 0.04, 0.06, 0.05, 0.04,
      -0.04, -0.02, -0.03, -0.05, -0.01, -0.03, -0.04, -0.02, -0.03, -0.05,
    ];
    expect(isSharpeDeclining(returns, 20)).toBe(true);
  });
});

// ============================================================================
// 2. isWinRateDecaying
// ============================================================================

describe("isWinRateDecaying", () => {
  test("returns true when win rate drops by more than threshold", () => {
    expect(isWinRateDecaying(0.40, 0.55, 0.10)).toBe(true);
  });

  test("returns false when win rate is within threshold", () => {
    expect(isWinRateDecaying(0.50, 0.55, 0.10)).toBe(false);
  });

  test("returns false when win rate drop is below threshold", () => {
    // Drop = 0.55 - 0.47 = 0.08, threshold = 0.10
    expect(isWinRateDecaying(0.47, 0.55, 0.10)).toBe(false);
  });

  test("returns true with custom threshold", () => {
    expect(isWinRateDecaying(0.50, 0.55, 0.04)).toBe(true);
  });
});

// ============================================================================
// 3. isPnlDecaying
// ============================================================================

describe("isPnlDecaying", () => {
  test("returns true when recent P&L is near zero", () => {
    expect(isPnlDecaying(5, 100, 0.25)).toBe(true);
  });

  test("returns false when recent P&L is healthy", () => {
    expect(isPnlDecaying(80, 100, 0.25)).toBe(false);
  });

  test("returns true for negative recent P&L", () => {
    expect(isPnlDecaying(-10, 100, 0.25)).toBe(true);
  });

  test("handles zero historical P&L gracefully", () => {
    expect(isPnlDecaying(10, 0, 0.25)).toBe(false);
    expect(isPnlDecaying(-5, 0, 0.25)).toBe(true);
  });
});

// ============================================================================
// 4. detectEdgeDecay — composite
// ============================================================================

describe("detectEdgeDecay", () => {
  test("returns continue when no detectors fire", () => {
    const input = makeInput({
      returns: Array.from({ length: 20 }, () => 0.01),
      recentWinRate: 0.60,
      historicalWinRate: 0.55,
      recentAvgPnl: 120,
      historicalAvgPnl: 100,
    });

    const result = detectEdgeDecay(input);
    expect(result.decaying).toBe(false);
    expect(result.recommendation).toBe("continue");
    expect(result.triggeredDetectors).toHaveLength(0);
  });

  test("returns reduce_size when 1 detector fires", () => {
    const input = makeInput({
      returns: Array.from({ length: 20 }, () => 0.01),
      recentWinRate: 0.60,
      historicalWinRate: 0.55,
      recentAvgPnl: 10, // P&L decayed
      historicalAvgPnl: 100,
    });

    const result = detectEdgeDecay(input);
    expect(result.decaying).toBe(false);
    expect(result.recommendation).toBe("reduce_size");
    expect(result.triggeredDetectors).toContain("pnl");
    expect(result.triggeredDetectors).toHaveLength(1);
  });

  test("returns pause when 2 detectors fire (decaying = true)", () => {
    // Sharpe declining + P&L decaying, but win rate fine
    const input = makeInput({
      returns: [
        0.04, 0.02, 0.03, 0.05, 0.01, 0.03, 0.02, 0.04, 0.03, 0.02,
        -0.02, 0.00, -0.01, -0.03, 0.01, -0.01, -0.02, 0.00, -0.01, -0.03,
      ],
      recentWinRate: 0.55,
      historicalWinRate: 0.55,
      recentAvgPnl: 5,
      historicalAvgPnl: 100,
    });

    const result = detectEdgeDecay(input);
    expect(result.decaying).toBe(true);
    expect(result.recommendation).toBe("pause");
    expect(result.triggeredDetectors.length).toBeGreaterThanOrEqual(2);
  });

  test("returns demote when all 3 detectors fire", () => {
    const input = makeInput({
      returns: [
        0.04, 0.02, 0.03, 0.05, 0.01, 0.03, 0.02, 0.04, 0.03, 0.02,
        -0.03, -0.01, -0.02, -0.04, 0.00, -0.02, -0.03, -0.01, -0.02, -0.04,
      ],
      recentWinRate: 0.35,
      historicalWinRate: 0.55,
      recentAvgPnl: 5,
      historicalAvgPnl: 100,
    });

    const result = detectEdgeDecay(input);
    expect(result.decaying).toBe(true);
    expect(result.recommendation).toBe("demote");
    expect(result.triggeredDetectors).toHaveLength(3);
    expect(result.triggeredDetectors).toContain("sharpe");
    expect(result.triggeredDetectors).toContain("winRate");
    expect(result.triggeredDetectors).toContain("pnl");
  });

  test("scores are between 0 and 1 when detectors fire", () => {
    const input = makeInput({
      returns: [
        0.04, 0.02, 0.03, 0.05, 0.01, 0.03, 0.02, 0.04, 0.03, 0.02,
        -0.03, -0.01, -0.02, -0.04, 0.00, -0.02, -0.03, -0.01, -0.02, -0.04,
      ],
      recentWinRate: 0.35,
      historicalWinRate: 0.55,
      recentAvgPnl: 5,
      historicalAvgPnl: 100,
    });

    const result = detectEdgeDecay(input);
    for (const score of Object.values(result.scores)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  test("scores are 0 when detectors do not fire", () => {
    const input = makeInput({
      returns: Array.from({ length: 20 }, () => 0.01),
      recentWinRate: 0.60,
      historicalWinRate: 0.55,
      recentAvgPnl: 120,
      historicalAvgPnl: 100,
    });

    const result = detectEdgeDecay(input);
    for (const score of Object.values(result.scores)) {
      expect(score).toBe(0);
    }
  });

  test("respects custom thresholds", () => {
    const input = makeInput({
      returns: Array.from({ length: 20 }, () => 0.01),
      recentWinRate: 0.52,
      historicalWinRate: 0.55,
      recentAvgPnl: 80,
      historicalAvgPnl: 100,
      winRateThreshold: 0.02, // Very tight threshold
      pnlThreshold: 0.90, // Very tight P&L threshold
    });

    const result = detectEdgeDecay(input);
    expect(result.triggeredDetectors).toContain("winRate");
    expect(result.triggeredDetectors).toContain("pnl");
    expect(result.decaying).toBe(true);
  });
});
