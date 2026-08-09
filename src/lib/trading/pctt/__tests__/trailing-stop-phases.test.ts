/**
 * Trailing Stop Phase Transitions Tests
 *
 * Tests all 5 phases for long and short positions,
 * and phase transitions at 1R, 2R, 3R boundaries.
 */

import { computeTrailingStopPhase } from "../trailing-stop-phases";
import type { PhaseInput } from "../trailing-stop-phases";

// ============================================================================
// HELPERS
// ============================================================================

function longInput(overrides: Partial<PhaseInput> = {}): PhaseInput {
  return {
    entryPrice: 100,
    currentPrice: 100,
    invalidationPrice: 95, // stop at 95, riskPerShare = 5
    highWaterMark: 100,
    riskPerShare: 5,
    side: "long",
    ...overrides,
  };
}

function shortInput(overrides: Partial<PhaseInput> = {}): PhaseInput {
  return {
    entryPrice: 100,
    currentPrice: 100,
    invalidationPrice: 105, // stop at 105, riskPerShare = 5
    highWaterMark: 100,
    riskPerShare: 5,
    side: "short",
    ...overrides,
  };
}

// ============================================================================
// PHASE 1: INITIAL
// ============================================================================

describe("Phase 1: INITIAL", () => {
  test("long position below 1R stays in phase 1 with invalidation stop", () => {
    const result = computeTrailingStopPhase(longInput({
      currentPrice: 102, // 0.4R
      highWaterMark: 102,
    }));

    expect(result.phase).toBe(1);
    expect(result.phaseName).toBe("INITIAL");
    expect(result.stopPrice).toBe(95);
    expect(result.profitR).toBeCloseTo(0.4);
  });

  test("short position below 1R stays in phase 1 with invalidation stop", () => {
    const result = computeTrailingStopPhase(shortInput({
      currentPrice: 98, // 0.4R
      highWaterMark: 98,
    }));

    expect(result.phase).toBe(1);
    expect(result.phaseName).toBe("INITIAL");
    expect(result.stopPrice).toBe(105);
    expect(result.profitR).toBeCloseTo(0.4);
  });

  test("handles zero risk per share gracefully", () => {
    const result = computeTrailingStopPhase(longInput({
      riskPerShare: 0,
    }));

    expect(result.phase).toBe(1);
    expect(result.profitR).toBe(0);
  });
});

// ============================================================================
// PHASE 2: BREAKEVEN
// ============================================================================

describe("Phase 2: BREAKEVEN", () => {
  test("long position transitions to breakeven at 1R", () => {
    const result = computeTrailingStopPhase(longInput({
      currentPrice: 105, // exactly 1R
      highWaterMark: 105,
    }));

    expect(result.phase).toBe(2);
    expect(result.phaseName).toBe("BREAKEVEN");
    // Stop = entry + buffer (5 * 0.05 = 0.25)
    expect(result.stopPrice).toBeCloseTo(100.25);
    expect(result.profitR).toBeCloseTo(1.0);
  });

  test("short position transitions to breakeven at 1R", () => {
    const result = computeTrailingStopPhase(shortInput({
      currentPrice: 95, // 1R profit for short
      highWaterMark: 95,
    }));

    expect(result.phase).toBe(2);
    expect(result.phaseName).toBe("BREAKEVEN");
    // Stop = entry - buffer (5 * 0.05 = 0.25)
    expect(result.stopPrice).toBeCloseTo(99.75);
    expect(result.profitR).toBeCloseTo(1.0);
  });
});

// ============================================================================
// PHASE 3: LOCK_PROFIT
// ============================================================================

describe("Phase 3: LOCK_PROFIT", () => {
  test("long position transitions to lock profit at 2R", () => {
    const result = computeTrailingStopPhase(longInput({
      currentPrice: 110, // 2R
      highWaterMark: 110,
    }));

    expect(result.phase).toBe(3);
    expect(result.phaseName).toBe("LOCK_PROFIT");
    // MFE = 110 - 100 = 10, stop = 100 + 10 * 0.50 = 105
    expect(result.stopPrice).toBeCloseTo(105);
    expect(result.profitR).toBeCloseTo(2.0);
  });

  test("short position transitions to lock profit at 2R", () => {
    const result = computeTrailingStopPhase(shortInput({
      currentPrice: 90, // 2R
      highWaterMark: 90,
    }));

    expect(result.phase).toBe(3);
    expect(result.phaseName).toBe("LOCK_PROFIT");
    // MFE = 100 - 90 = 10, stop = 100 - 10 * 0.50 = 95
    expect(result.stopPrice).toBeCloseTo(95);
    expect(result.profitR).toBeCloseTo(2.0);
  });
});

// ============================================================================
// PHASE 4: TIGHT_TRAIL
// ============================================================================

describe("Phase 4: TIGHT_TRAIL", () => {
  test("long position transitions to tight trail at 3R", () => {
    const result = computeTrailingStopPhase(longInput({
      currentPrice: 115, // 3R
      highWaterMark: 115,
    }));

    expect(result.phase).toBe(4);
    expect(result.phaseName).toBe("TIGHT_TRAIL");
    // MFE = 115 - 100 = 15, stop = 100 + 15 * 0.75 = 111.25
    expect(result.stopPrice).toBeCloseTo(111.25);
    expect(result.profitR).toBeCloseTo(3.0);
  });

  test("short position transitions to tight trail at 3R", () => {
    const result = computeTrailingStopPhase(shortInput({
      currentPrice: 85, // 3R
      highWaterMark: 85,
    }));

    expect(result.phase).toBe(4);
    expect(result.phaseName).toBe("TIGHT_TRAIL");
    // MFE = 100 - 85 = 15, stop = 100 - 15 * 0.75 = 88.75
    expect(result.stopPrice).toBeCloseTo(88.75);
    expect(result.profitR).toBeCloseTo(3.0);
  });

  test("uses high water mark for MFE even when price retraces", () => {
    const result = computeTrailingStopPhase(longInput({
      currentPrice: 116, // slightly above 3R
      highWaterMark: 120, // price went higher before
    }));

    expect(result.phase).toBe(4);
    // MFE from HWM = 120 - 100 = 20, stop = 100 + 20 * 0.75 = 115
    expect(result.stopPrice).toBeCloseTo(115);
  });
});

// ============================================================================
// PHASE 5: EXIT_SIGNAL
// ============================================================================

describe("Phase 5: EXIT_SIGNAL", () => {
  test("triggers on exit signal with appropriate stop", () => {
    const result = computeTrailingStopPhase(longInput({
      currentPrice: 112,
      highWaterMark: 115,
      exitSignalTriggered: true,
    }));

    expect(result.phase).toBe(5);
    expect(result.phaseName).toBe("EXIT_SIGNAL");
    // At 2.4R, tightest applicable is phase 3 (lock profit)
    // MFE = 15, stop = 100 + 15 * 0.50 = 107.5
    expect(result.stopPrice).toBeCloseTo(107.5);
  });

  test("exit signal at 3R+ uses tight trail stop", () => {
    const result = computeTrailingStopPhase(longInput({
      currentPrice: 120,
      highWaterMark: 120,
      exitSignalTriggered: true,
    }));

    expect(result.phase).toBe(5);
    // MFE = 20, stop = 100 + 20 * 0.75 = 115
    expect(result.stopPrice).toBeCloseTo(115);
  });

  test("exit signal below 1R uses a partial risk stop", () => {
    const result = computeTrailingStopPhase(longInput({
      currentPrice: 102,
      highWaterMark: 103,
      exitSignalTriggered: true,
    }));

    expect(result.phase).toBe(5);
    // Below 1R: entry - 0.5R = 100 - 2.5 = 97.5
    expect(result.stopPrice).toBeCloseTo(97.5);
  });
});
