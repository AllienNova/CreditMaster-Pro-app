/**
 * Boundary Re-estimation Protocol
 *
 * Controls when trendline boundaries should be recalculated.
 * Core principle: FREEZE between pivots, only re-estimate when
 * a new confirmed pivot forms that invalidates the current trendline.
 *
 * This prevents premature boundary adjustments that cause whipsaw
 * entries/exits on noisy intrabar movements.
 */

import type { Pivot } from "./pctt-core";

// ============================================================================
// TYPES
// ============================================================================

export interface BoundaryInput {
  /** Currently active pivots (most recent set) */
  currentPivots: Pivot[];
  /** Pivots used in the last boundary estimation */
  lastEstimationPivots: Pivot[];
  /** Current market price */
  currentPrice: number;
  /** Current boundary price (projected to current bar) */
  boundaryPrice: number;
  /** ATR for tolerance computation (optional) */
  atr?: number;
  /** Violation tolerance in ATR multiples (default: 0.5) */
  violationTolerance?: number;
}

export interface BoundaryResult {
  /** Whether boundary should be re-estimated */
  reEstimate: boolean;
  /** Human-readable reason */
  reason: string;
  /** New boundary price estimate (only present when reEstimate is true) */
  newBoundary?: number;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Determine whether a boundary (support or resistance trendline)
 * should be re-estimated given current pivot state.
 *
 * Rules:
 * 1. If no new pivots have formed since last estimation -> FREEZE
 * 2. If a new confirmed pivot has formed -> check if it invalidates the boundary
 * 3. A pivot invalidates the boundary if it falls on the wrong side by more
 *    than the violation tolerance
 * 4. Between pivots: always FREEZE (no adjustments)
 */
export function shouldReEstimateBoundary(params: BoundaryInput): BoundaryResult {
  const {
    currentPivots,
    lastEstimationPivots,
    currentPrice,
    boundaryPrice,
    atr = 0,
    violationTolerance = 0.5,
  } = params;

  // No pivots at all — nothing to estimate from
  if (currentPivots.length === 0) {
    return {
      reEstimate: false,
      reason: "No pivots available — boundary frozen",
    };
  }

  // Check if there are new confirmed pivots since last estimation
  const newPivots = findNewPivots(currentPivots, lastEstimationPivots);

  if (newPivots.length === 0) {
    return {
      reEstimate: false,
      reason: "No new pivots since last estimation — boundary frozen",
    };
  }

  // A new pivot exists — check if it invalidates the current boundary
  const latestNewPivot = newPivots[newPivots.length - 1];
  const tolerance = atr > 0 ? atr * violationTolerance : 0;

  const violates = pivotViolatesBoundary(latestNewPivot, boundaryPrice, tolerance);

  if (violates) {
    // Compute a simple new boundary from the latest 2 pivots of the same type
    const sametype = currentPivots.filter((p) => p.type === latestNewPivot.type);
    const newBoundary = estimateFromPivots(sametype);

    return {
      reEstimate: true,
      reason: `New ${latestNewPivot.type} pivot at ${latestNewPivot.price.toFixed(2)} invalidates boundary at ${boundaryPrice.toFixed(2)}`,
      newBoundary,
    };
  }

  // New pivot exists but doesn't invalidate — still freeze
  return {
    reEstimate: false,
    reason: `New pivot at ${latestNewPivot.price.toFixed(2)} is consistent with boundary — frozen`,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Find pivots in `current` that were not present in `last`.
 * Comparison is by index + price (identity).
 */
function findNewPivots(current: Pivot[], last: Pivot[]): Pivot[] {
  const lastSet = new Set(
    last.map((p) => `${p.index}:${p.price}:${p.type}`),
  );
  return current.filter(
    (p) => !lastSet.has(`${p.index}:${p.price}:${p.type}`),
  );
}

/**
 * Check if a pivot price violates the boundary.
 *
 * For a LOW pivot (support candidate): violation = pivot is significantly
 * below the boundary (boundary should have held as support).
 * For a HIGH pivot (resistance candidate): violation = pivot is significantly
 * above the boundary (boundary should have held as resistance).
 */
function pivotViolatesBoundary(
  pivot: Pivot,
  boundaryPrice: number,
  tolerance: number,
): boolean {
  if (pivot.type === "low") {
    // A low pivot below boundary - tolerance means the support has broken
    return pivot.price < boundaryPrice - tolerance;
  }
  // A high pivot above boundary + tolerance means the resistance has broken
  return pivot.price > boundaryPrice + tolerance;
}

/**
 * Simple linear estimate from the two most recent pivots of the same type.
 * Projects the line to the latest pivot's index.
 */
function estimateFromPivots(pivots: Pivot[]): number | undefined {
  if (pivots.length < 2) {
    return pivots.length === 1 ? pivots[0].price : undefined;
  }

  const p1 = pivots[pivots.length - 2];
  const p2 = pivots[pivots.length - 1];

  if (p1.index === p2.index) return p2.price;

  const slope = (p2.price - p1.price) / (p2.index - p1.index);
  return p2.price + slope * 0; // projected at the latest pivot itself
}
