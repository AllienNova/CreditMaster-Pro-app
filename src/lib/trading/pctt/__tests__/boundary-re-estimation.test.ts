/**
 * Boundary Re-estimation Protocol Tests
 *
 * Tests freeze behavior between pivots, re-estimation on new pivot,
 * and boundary consistency.
 */

import { shouldReEstimateBoundary } from "../boundary-re-estimation";
import type { Pivot } from "../pctt-core";

// ============================================================================
// HELPERS
// ============================================================================

function makePivot(
  index: number,
  price: number,
  type: "high" | "low",
): Pivot {
  return {
    index,
    price,
    type,
    confirmed: true,
    confirmationBar: index + 5,
  };
}

// ============================================================================
// FREEZE BEHAVIOR
// ============================================================================

describe("boundary freeze behavior", () => {
  test("freezes when no new pivots since last estimation", () => {
    const pivots = [
      makePivot(10, 95, "low"),
      makePivot(20, 96, "low"),
    ];

    const result = shouldReEstimateBoundary({
      currentPivots: pivots,
      lastEstimationPivots: pivots, // same set
      currentPrice: 100,
      boundaryPrice: 95.5,
    });

    expect(result.reEstimate).toBe(false);
    expect(result.reason).toContain("frozen");
  });

  test("freezes when no pivots exist", () => {
    const result = shouldReEstimateBoundary({
      currentPivots: [],
      lastEstimationPivots: [],
      currentPrice: 100,
      boundaryPrice: 95,
    });

    expect(result.reEstimate).toBe(false);
    expect(result.reason).toContain("No pivots");
  });

  test("freezes when new pivot is consistent with boundary", () => {
    const lastPivots = [
      makePivot(10, 95, "low"),
      makePivot(20, 96, "low"),
    ];

    const currentPivots = [
      ...lastPivots,
      makePivot(30, 96.5, "low"), // new pivot above boundary — consistent
    ];

    const result = shouldReEstimateBoundary({
      currentPivots,
      lastEstimationPivots: lastPivots,
      currentPrice: 100,
      boundaryPrice: 95.5,
      atr: 2,
    });

    expect(result.reEstimate).toBe(false);
    expect(result.reason).toContain("consistent");
  });
});

// ============================================================================
// RE-ESTIMATION TRIGGERS
// ============================================================================

describe("boundary re-estimation triggers", () => {
  test("re-estimates when new pivot violates boundary (low pivot breaks support)", () => {
    const lastPivots = [
      makePivot(10, 95, "low"),
      makePivot(20, 96, "low"),
    ];

    const currentPivots = [
      ...lastPivots,
      makePivot(30, 92, "low"), // new pivot far below boundary
    ];

    const result = shouldReEstimateBoundary({
      currentPivots,
      lastEstimationPivots: lastPivots,
      currentPrice: 93,
      boundaryPrice: 95.5,
      atr: 2,
      violationTolerance: 0.5,
    });

    expect(result.reEstimate).toBe(true);
    expect(result.reason).toContain("invalidates");
    expect(result.newBoundary).toBeDefined();
  });

  test("re-estimates when high pivot breaks resistance", () => {
    const lastPivots = [
      makePivot(10, 105, "high"),
      makePivot(20, 104, "high"),
    ];

    const currentPivots = [
      ...lastPivots,
      makePivot(30, 110, "high"), // new pivot far above boundary
    ];

    const result = shouldReEstimateBoundary({
      currentPivots,
      lastEstimationPivots: lastPivots,
      currentPrice: 108,
      boundaryPrice: 104.5,
      atr: 2,
      violationTolerance: 0.5,
    });

    expect(result.reEstimate).toBe(true);
    expect(result.reason).toContain("invalidates");
  });

  test("provides new boundary estimate from recent pivots", () => {
    const lastPivots = [
      makePivot(10, 95, "low"),
    ];

    const currentPivots = [
      ...lastPivots,
      makePivot(20, 90, "low"), // violating pivot
    ];

    const result = shouldReEstimateBoundary({
      currentPivots,
      lastEstimationPivots: lastPivots,
      currentPrice: 91,
      boundaryPrice: 95,
      atr: 2,
    });

    expect(result.reEstimate).toBe(true);
    // New boundary should be estimated from the low pivots
    expect(result.newBoundary).toBeDefined();
    expect(typeof result.newBoundary).toBe("number");
  });
});
