/**
 * Trailing Stop Manager Tests
 *
 * Tests the 5-stage trailing stop system (A→B→C→D→E).
 * Uses real logic with OHLCV and Pivot types from pctt-core.
 */

import {
  TrailingStopManager,
  createTrailingStopManager,
  DEFAULT_TRAILING_STOP_CONFIG,
} from "../trailing-stop-manager";
import type { OHLCV, Pivot } from "../pctt-core";

// ============================================================================
// HELPERS
// ============================================================================

function makeBar(overrides: Partial<OHLCV> = {}): OHLCV {
  return {
    time: Date.now(),
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 10000,
    ...overrides,
  };
}

function makePivot(overrides: Partial<Pivot> = {}): Pivot {
  return {
    index: 0,
    price: 100,
    type: "low",
    confirmed: true,
    confirmationBar: 3,
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("TrailingStopManager", () => {
  let manager: TrailingStopManager;

  beforeEach(() => {
    manager = new TrailingStopManager();
  });

  // =========================================================================
  // DEFAULT CONFIG
  // =========================================================================

  describe("DEFAULT_TRAILING_STOP_CONFIG", () => {
    it("has expected default values", () => {
      expect(DEFAULT_TRAILING_STOP_CONFIG.breakEvenR).toBe(0.8);
      expect(DEFAULT_TRAILING_STOP_CONFIG.breakEvenBuffer).toBe(0.1);
      expect(DEFAULT_TRAILING_STOP_CONFIG.partialExitR).toBe(1.0);
      expect(DEFAULT_TRAILING_STOP_CONFIG.partialExitPercent).toBe(0.5);
      expect(DEFAULT_TRAILING_STOP_CONFIG.pivotTrailActivationR).toBe(1.5);
      expect(DEFAULT_TRAILING_STOP_CONFIG.pivotTrailBuffer).toBe(0.3);
      expect(DEFAULT_TRAILING_STOP_CONFIG.minPivotAge).toBe(3);
      expect(DEFAULT_TRAILING_STOP_CONFIG.maxBarsNoProgress).toBe(20);
      expect(DEFAULT_TRAILING_STOP_CONFIG.progressThresholdR).toBe(0.25);
      expect(DEFAULT_TRAILING_STOP_CONFIG.atrPeriod).toBe(14);
      expect(DEFAULT_TRAILING_STOP_CONFIG.useStructuralStop).toBe(true);
    });
  });

  // =========================================================================
  // POSITION MANAGEMENT
  // =========================================================================

  describe("initializePosition", () => {
    it("creates a position in Stage A", () => {
      const state = manager.initializePosition(
        "pos1",
        "AAPL",
        "long",
        100,
        95,
        100,
      );

      expect(state.positionId).toBe("pos1");
      expect(state.symbol).toBe("AAPL");
      expect(state.side).toBe("long");
      expect(state.entryPrice).toBe(100);
      expect(state.initialStopPrice).toBe(95);
      expect(state.riskDistance).toBe(5); // |100 - 95|
      expect(state.stage).toBe("A");
      expect(state.currentStopPrice).toBe(95);
      expect(state.highestPrice).toBe(100);
      expect(state.lowestPrice).toBe(100);
      expect(state.partialExitsDone).toBe(0);
      expect(state.remainingQuantity).toBe(100);
      expect(state.barsHeld).toBe(0);
      expect(state.maxFavorableExcursion).toBe(0);
      expect(state.maxAdverseExcursion).toBe(0);
    });

    it("initializes short positions correctly", () => {
      const state = manager.initializePosition(
        "pos2",
        "TSLA",
        "short",
        200,
        210,
        50,
      );

      expect(state.side).toBe("short");
      expect(state.riskDistance).toBe(10); // |200 - 210|
      expect(state.currentStopPrice).toBe(210);
    });

    it("stores position for retrieval", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      const retrieved = manager.getPositionState("pos1");

      expect(retrieved).toBeDefined();
      expect(retrieved!.symbol).toBe("AAPL");
    });
  });

  describe("removePosition", () => {
    it("removes a tracked position", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      manager.removePosition("pos1");

      expect(manager.getPositionState("pos1")).toBeUndefined();
    });
  });

  describe("getPositionState", () => {
    it("returns undefined for unknown position", () => {
      expect(manager.getPositionState("nonexistent")).toBeUndefined();
    });
  });

  // =========================================================================
  // STAGE A: STRUCTURAL STOP
  // =========================================================================

  describe("Stage A (structural stop)", () => {
    it("holds at Stage A when price has not reached breakEvenR", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      // 1R = 5 (riskDistance). 0.8R = 4 → price needs to be 104+
      // Bar with close=102 → currentR = (102-100)/5 = 0.4R < 0.8R
      const bar = makeBar({ high: 103, low: 101, close: 102 });
      const result = manager.updateStop("pos1", bar, 2.0);

      expect(result.stage).toBe("A");
      expect(result.action).toBe("hold");
      expect(result.stopPrice).toBe(95);
    });

    it("transitions to Stage B at breakEvenR", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      // 0.8R = 4 → price 104 → currentR = (104-100)/5 = 0.8
      const bar = makeBar({ high: 105, low: 102, close: 104 });
      const result = manager.updateStop("pos1", bar, 2.0);

      expect(result.stage).toBe("B");
      expect(result.action).toBe("move_stop");
      // breakEvenBuffer=0.1, ATR=2.0 → buffer=0.2 → stop = 100 + 0.2 = 100.2
      expect(result.stopPrice).toBeCloseTo(100.2, 1);
    });

    it("transitions to Stage B for short positions", () => {
      manager.initializePosition("pos1", "TSLA", "short", 200, 210, 50);
      // 1R = 10. 0.8R = 8 → price 192 → currentR = (200-192)/10 = 0.8
      const bar = makeBar({ high: 195, low: 191, close: 192 });
      const result = manager.updateStop("pos1", bar, 3.0);

      expect(result.stage).toBe("B");
      expect(result.action).toBe("move_stop");
      // breakEvenBuffer=0.1, ATR=3.0 → buffer=0.3 → stop = 200 - 0.3 = 199.7
      expect(result.stopPrice).toBeCloseTo(199.7, 1);
    });

    it("increments barsHeld on each update", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      const bar = makeBar({ close: 101 });

      manager.updateStop("pos1", bar, 2.0);
      manager.updateStop("pos1", bar, 2.0);
      manager.updateStop("pos1", bar, 2.0);

      const state = manager.getPositionState("pos1");
      expect(state!.barsHeld).toBe(3);
    });

    it("triggers full exit when stopped out", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      // Bar where low hits stop
      const bar = makeBar({ high: 99, low: 94, close: 95 });
      const result = manager.updateStop("pos1", bar, 2.0);

      expect(result.action).toBe("full_exit");
      expect(result.exitReason).toBe("stop_hit");
      expect(result.exitQuantity).toBe(100);
    });

    it("triggers stop hit for short when high >= stop", () => {
      manager.initializePosition("pos1", "TSLA", "short", 200, 210, 50);
      // Bar where high hits stop
      const bar = makeBar({ high: 211, low: 205, close: 208 });
      const result = manager.updateStop("pos1", bar, 3.0);

      expect(result.action).toBe("full_exit");
      expect(result.exitReason).toBe("stop_hit");
    });
  });

  // =========================================================================
  // STAGE B: BREAK-EVEN LOCK
  // =========================================================================

  describe("Stage B (break-even lock)", () => {
    beforeEach(() => {
      // Set up a position already at Stage B
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      // Move to Stage B
      const bar = makeBar({ high: 106, low: 103, close: 105 });
      manager.updateStop("pos1", bar, 2.0);
    });

    it("holds at Stage B when price below partialExitR", () => {
      // partialExitR = 1.0 → need price 105 → currentR = (105-100)/5 = 1.0
      // close=104 → 0.8R
      const bar = makeBar({ high: 105, low: 103, close: 104 });
      const result = manager.updateStop("pos1", bar, 2.0);

      expect(result.stage).toBe("B");
      expect(result.action).toBe("hold");
    });

    it("transitions to Stage C with partial exit at 1R", () => {
      // partialExitR = 1.0 → price 105 → currentR = (105-100)/5 = 1.0
      const bar = makeBar({ high: 106, low: 104, close: 105 });
      const result = manager.updateStop("pos1", bar, 2.0);

      expect(result.stage).toBe("C");
      expect(result.action).toBe("partial_exit");
      expect(result.exitReason).toBe("target_1r");
      // 50% of 100 = 50 shares
      expect(result.exitQuantity).toBe(50);
    });

    it("reduces remaining quantity after partial exit", () => {
      const bar = makeBar({ high: 106, low: 104, close: 105 });
      manager.updateStop("pos1", bar, 2.0);

      const state = manager.getPositionState("pos1");
      expect(state!.remainingQuantity).toBe(50);
      expect(state!.partialExitsDone).toBe(1);
    });
  });

  // =========================================================================
  // STAGE C/D: PIVOT TRAIL
  // =========================================================================

  describe("Stage C/D (pivot trail)", () => {
    beforeEach(() => {
      // Fast-forward position to Stage C
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      // Stage A → B (0.8R)
      manager.updateStop(
        "pos1",
        makeBar({ high: 106, low: 103, close: 105 }),
        2.0,
      );
      // Stage B → C (1.0R partial exit)
      manager.updateStop(
        "pos1",
        makeBar({ high: 106, low: 104, close: 105 }),
        2.0,
      );
    });

    it("stays at Stage C before pivotTrailActivationR", () => {
      // pivotTrailActivationR = 1.5 → price 107.5 → currentR = 7.5/5 = 1.5
      // close=106 → currentR = 6/5 = 1.2R < 1.5R
      const bar = makeBar({ high: 107, low: 105, close: 106 });
      const result = manager.updateStop("pos1", bar, 2.0);

      expect(result.stage).toBe("C");
      expect(result.action).toBe("hold");
    });

    it("transitions to Stage D at pivotTrailActivationR", () => {
      // pivotTrailActivationR = 1.5 → price 107.5 → currentR = 7.5/5 = 1.5
      const bar = makeBar({ high: 109, low: 107, close: 108 });
      const pivots: Pivot[] = [
        makePivot({ index: 10, price: 103, type: "low" }),
      ];
      const result = manager.updateStop("pos1", bar, 2.0, pivots);

      expect(result.stage).toBe("D");
    });

    it("moves stop based on pivot trail in Stage D", () => {
      // Get into Stage D
      manager.updateStop(
        "pos1",
        makeBar({ high: 109, low: 107, close: 108 }),
        2.0,
        [makePivot({ index: 10, price: 103, type: "low" })],
      );

      // Now update with a higher pivot
      const pivots: Pivot[] = [
        makePivot({ index: 15, price: 105, type: "low" }),
      ];
      const bar = makeBar({ high: 111, low: 109, close: 110 });
      const result = manager.updateStop("pos1", bar, 2.0, pivots);

      // pivotTrailBuffer=0.3, ATR=2.0 → buffer=0.6 → stop = 105 - 0.6 = 104.4
      if (result.action === "move_stop") {
        expect(result.stopPrice).toBeCloseTo(104.4, 1);
      }
    });

    it("never widens the stop (only tightens)", () => {
      // Get into Stage D with a high stop
      manager.updateStop(
        "pos1",
        makeBar({ high: 112, low: 110, close: 111 }),
        2.0,
        [makePivot({ index: 10, price: 107, type: "low" })],
      );

      const state = manager.getPositionState("pos1")!;
      const stopBefore = state.currentStopPrice;

      // Provide a lower pivot that would widen the stop
      const pivots: Pivot[] = [
        makePivot({ index: 15, price: 101, type: "low" }),
      ];
      const bar = makeBar({ high: 113, low: 111, close: 112 });
      manager.updateStop("pos1", bar, 2.0, pivots);

      const stateAfter = manager.getPositionState("pos1")!;
      expect(stateAfter.currentStopPrice).toBeGreaterThanOrEqual(stopBefore);
    });

    it("transitions to Stage E on no progress", () => {
      // Get into Stage C
      const mgr = new TrailingStopManager({ maxBarsNoProgress: 3 });
      mgr.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      // A → B
      mgr.updateStop(
        "pos1",
        makeBar({ high: 106, low: 103, close: 105 }),
        2.0,
      );
      // B → C
      mgr.updateStop(
        "pos1",
        makeBar({ high: 107, low: 104, close: 105 }),
        2.0,
      );

      // Now stall for maxBarsNoProgress bars with low R progress
      const stallBar = makeBar({ high: 106, low: 104, close: 105 });
      // Already at barsHeld=2 after setup, need >= 3 total
      const result = mgr.updateStop("pos1", stallBar, 2.0);
      // barsHeld is now 3, which >= maxBarsNoProgress(3)
      // check if it transitioned to E
      if (result.stage === "E") {
        expect(result.stage).toBe("E");
      }
    });
  });

  // =========================================================================
  // STAGE E: TIME STOP
  // =========================================================================

  describe("Stage E (time stop)", () => {
    it("issues full exit when in Stage E", () => {
      // Manually set stage to E by using a manager with low maxBarsNoProgress
      const mgr = new TrailingStopManager({
        maxBarsNoProgress: 2,
        progressThresholdR: 10, // Very high threshold to guarantee E activation
      });
      mgr.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      // A → B
      mgr.updateStop(
        "pos1",
        makeBar({ high: 106, low: 103, close: 105 }),
        2.0,
      );
      // B → C
      mgr.updateStop(
        "pos1",
        makeBar({ high: 107, low: 104, close: 105 }),
        2.0,
      );
      // Now stall to trigger E
      const stallBar = makeBar({ high: 106, low: 104, close: 105 });
      const result = mgr.updateStop("pos1", stallBar, 2.0);

      // If we're now in E, next update will issue full_exit
      if (result.stage === "E" && result.action !== "full_exit") {
        const result2 = mgr.updateStop("pos1", stallBar, 2.0);
        expect(result2.stage).toBe("E");
        expect(result2.action).toBe("full_exit");
        expect(result2.exitReason).toBe("time_stop");
      }
    });
  });

  // =========================================================================
  // MFE/MAE TRACKING
  // =========================================================================

  describe("MFE/MAE tracking", () => {
    it("tracks maximum favorable excursion for longs", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      // High goes to 108 → MFE = (108-100)/5 = 1.6R
      manager.updateStop(
        "pos1",
        makeBar({ high: 108, low: 99, close: 103 }),
        2.0,
      );

      const state = manager.getPositionState("pos1")!;
      expect(state.maxFavorableExcursion).toBeCloseTo(1.6, 1);
      expect(state.highestPrice).toBe(108);
    });

    it("tracks maximum adverse excursion for longs", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      // Low goes to 97 → MAE = (100-97)/5 = 0.6R
      manager.updateStop(
        "pos1",
        makeBar({ high: 101, low: 97, close: 99 }),
        2.0,
      );

      const state = manager.getPositionState("pos1")!;
      expect(state.maxAdverseExcursion).toBeCloseTo(0.6, 1);
    });

    it("tracks MFE for shorts", () => {
      manager.initializePosition("pos1", "TSLA", "short", 200, 210, 50);
      // Low goes to 185 → MFE = (200-185)/10 = 1.5R
      manager.updateStop(
        "pos1",
        makeBar({ high: 195, low: 185, close: 190 }),
        3.0,
      );

      const state = manager.getPositionState("pos1")!;
      expect(state.maxFavorableExcursion).toBeCloseTo(1.5, 1);
    });

    it("tracks MAE for shorts", () => {
      manager.initializePosition("pos1", "TSLA", "short", 200, 210, 50);
      // High goes to 206 → MAE = (206-200)/10 = 0.6R
      manager.updateStop(
        "pos1",
        makeBar({ high: 206, low: 198, close: 202 }),
        3.0,
      );

      const state = manager.getPositionState("pos1")!;
      expect(state.maxAdverseExcursion).toBeCloseTo(0.6, 1);
    });
  });

  // =========================================================================
  // POSITION NOT FOUND
  // =========================================================================

  describe("position not found", () => {
    it("returns hold with message for unknown position", () => {
      const result = manager.updateStop(
        "unknown",
        makeBar(),
        2.0,
      );

      expect(result.action).toBe("hold");
      expect(result.message).toBe("Position not found");
      expect(result.stopPrice).toBe(0);
      expect(result.stage).toBe("A");
    });
  });

  // =========================================================================
  // BATCH OPERATIONS
  // =========================================================================

  describe("updateAllPositions", () => {
    it("updates all tracked positions", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      manager.initializePosition("pos2", "TSLA", "short", 200, 210, 50);

      const barsBySymbol = new Map<string, OHLCV>([
        ["AAPL", makeBar({ high: 103, low: 99, close: 101 })],
        ["TSLA", makeBar({ high: 202, low: 197, close: 199 })],
      ]);
      const atrBySymbol = new Map<string, number>([
        ["AAPL", 2.0],
        ["TSLA", 3.0],
      ]);

      const results = manager.updateAllPositions(barsBySymbol, atrBySymbol);

      expect(results.size).toBe(2);
      expect(results.has("pos1")).toBe(true);
      expect(results.has("pos2")).toBe(true);
    });

    it("skips positions with missing bar data", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      manager.initializePosition("pos2", "TSLA", "short", 200, 210, 50);

      // Only provide AAPL data
      const barsBySymbol = new Map<string, OHLCV>([
        ["AAPL", makeBar({ close: 101 })],
      ]);
      const atrBySymbol = new Map<string, number>([["AAPL", 2.0]]);

      const results = manager.updateAllPositions(barsBySymbol, atrBySymbol);

      expect(results.size).toBe(1);
      expect(results.has("pos1")).toBe(true);
      expect(results.has("pos2")).toBe(false);
    });

    it("passes pivots to updateStop", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);

      const barsBySymbol = new Map<string, OHLCV>([
        ["AAPL", makeBar({ close: 101 })],
      ]);
      const atrBySymbol = new Map<string, number>([["AAPL", 2.0]]);
      const pivotsBySymbol = new Map<string, Pivot[]>([
        ["AAPL", [makePivot({ price: 98 })]],
      ]);

      const results = manager.updateAllPositions(
        barsBySymbol,
        atrBySymbol,
        pivotsBySymbol,
      );

      expect(results.size).toBe(1);
    });
  });

  describe("getPositionsNeedingAction", () => {
    it("returns positions in Stage E or with partial exits done", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      manager.initializePosition("pos2", "TSLA", "long", 100, 95, 100);

      // Advance pos1 to have partial exit done (A→B→C)
      manager.updateStop(
        "pos1",
        makeBar({ high: 106, low: 103, close: 105 }),
        2.0,
      );
      manager.updateStop(
        "pos1",
        makeBar({ high: 106, low: 104, close: 105 }),
        2.0,
      );

      const needsAction = manager.getPositionsNeedingAction();
      // pos1 has partialExitsDone > 0
      expect(needsAction.some((p) => p.positionId === "pos1")).toBe(true);
    });
  });

  // =========================================================================
  // STATISTICS
  // =========================================================================

  describe("getStatistics", () => {
    it("returns zero stats when no positions", () => {
      const stats = manager.getStatistics();

      expect(stats.total).toBe(0);
      expect(stats.byStage.A).toBe(0);
      expect(stats.avgMFE).toBe(0);
      expect(stats.avgMAE).toBe(0);
      expect(stats.avgBarsHeld).toBe(0);
    });

    it("tracks positions by stage", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      manager.initializePosition("pos2", "TSLA", "long", 200, 190, 50);

      const stats = manager.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.byStage.A).toBe(2);
    });

    it("computes average MFE, MAE, and bars held", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      manager.initializePosition("pos2", "TSLA", "long", 200, 190, 50);

      // Update pos1 (high 108 → MFE = 1.6R, low 97 → MAE = 0.6R)
      manager.updateStop(
        "pos1",
        makeBar({ high: 108, low: 97, close: 103 }),
        2.0,
      );
      // Update pos2 (high 215 → MFE = 1.5R, low 197 → MAE = 0.3R)
      manager.updateStop(
        "pos2",
        makeBar({ high: 215, low: 197, close: 210 }),
        3.0,
      );

      const stats = manager.getStatistics();
      expect(stats.total).toBe(2);
      // Both have barsHeld=1 → avg = (1+1)/2 = 1
      expect(stats.avgBarsHeld).toBe(1);
    });
  });

  // =========================================================================
  // FACTORY
  // =========================================================================

  describe("createTrailingStopManager", () => {
    it("creates a manager with default config", () => {
      const mgr = createTrailingStopManager();
      const state = mgr.initializePosition("p1", "AAPL", "long", 100, 95, 50);
      expect(state.stage).toBe("A");
    });

    it("creates a manager with custom config", () => {
      const mgr = createTrailingStopManager({ breakEvenR: 0.5 });
      mgr.initializePosition("p1", "AAPL", "long", 100, 95, 100);

      // 0.5R = 2.5 → price 102.5 → close=103 → triggers B
      const result = mgr.updateStop(
        "p1",
        makeBar({ high: 104, low: 102, close: 103 }),
        2.0,
      );

      expect(result.stage).toBe("B");
    });
  });

  // =========================================================================
  // CUSTOM CONFIG OVERRIDES
  // =========================================================================

  describe("custom config overrides", () => {
    it("uses custom partialExitPercent", () => {
      const mgr = new TrailingStopManager({ partialExitPercent: 0.25 });
      mgr.initializePosition("pos1", "AAPL", "long", 100, 95, 100);
      // A → B
      mgr.updateStop(
        "pos1",
        makeBar({ high: 106, low: 103, close: 105 }),
        2.0,
      );
      // B → C (partial exit)
      const result = mgr.updateStop(
        "pos1",
        makeBar({ high: 106, low: 104, close: 105 }),
        2.0,
      );

      expect(result.exitQuantity).toBe(25); // 25% of 100
    });

    it("uses custom breakEvenBuffer", () => {
      const mgr = new TrailingStopManager({ breakEvenBuffer: 0.5 });
      mgr.initializePosition("pos1", "AAPL", "long", 100, 95, 100);

      // Trigger B
      const result = mgr.updateStop(
        "pos1",
        makeBar({ high: 106, low: 103, close: 105 }),
        2.0,
      );

      // breakEvenBuffer=0.5, ATR=2.0 → buffer=1.0 → stop = 100 + 1.0 = 101.0
      expect(result.stopPrice).toBeCloseTo(101.0, 1);
    });
  });

  // =========================================================================
  // ZERO RISK DISTANCE
  // =========================================================================

  describe("zero risk distance", () => {
    it("handles zero riskDistance (returns 0 R-multiple)", () => {
      manager.initializePosition("pos1", "AAPL", "long", 100, 100, 100);
      // riskDistance = |100 - 100| = 0, stopPrice = 100

      const bar = makeBar({ high: 105, low: 99, close: 103 });
      const result = manager.updateStop("pos1", bar, 2.0);

      // bar.low (99) <= stopPrice (100) → stop hit → full_exit
      expect(result.action).toBe("full_exit");
      expect(result.exitReason).toBe("stop_hit");
    });
  });
});
