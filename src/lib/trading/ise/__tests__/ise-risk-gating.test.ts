/**
 * ISE Risk Gating Tests
 *
 * Tests for the ISERiskGating service which controls which instruments
 * are allowed for new trades based on the active rotation set.
 *
 * Uses mock objects for InstrumentRotationService and InstrumentRankingService
 * since they are injected via constructor (no jest.mock needed).
 */

import {
  ISERiskGating,
  createISERiskGating,
  createISETradeValidator,
  DEFAULT_GATING_CONFIG,
  type GatingConfig,
  type TradeGateResult,
  type GatingDecision,
} from "../ise-risk-gating";

// ============================================================================
// MOCK HELPERS
// ============================================================================

/** Create a mock InstrumentRotationService */
function createMockRotationService(overrides: {
  isActive?: (symbol: string) => boolean;
  isInCooldown?: (symbol: string) => boolean;
  getCooldownRemaining?: (symbol: string) => number;
  getActiveSymbols?: () => string[];
} = {}) {
  return {
    isActive: overrides.isActive ?? jest.fn().mockReturnValue(false),
    isInCooldown: overrides.isInCooldown ?? jest.fn().mockReturnValue(false),
    getCooldownRemaining:
      overrides.getCooldownRemaining ?? jest.fn().mockReturnValue(0),
    getActiveSymbols:
      overrides.getActiveSymbols ?? jest.fn().mockReturnValue([]),
    // Other methods that may be accessed but aren't used in gating
    rotate: jest.fn(),
    forceAdd: jest.fn(),
    forceRemove: jest.fn(),
    getInstrumentState: jest.fn(),
    getRecentEvents: jest.fn(),
    getState: jest.fn(),
    restoreState: jest.fn(),
    updateConfig: jest.fn(),
    setMaxActiveSize: jest.fn(),
    reset: jest.fn(),
  } as any;
}

/** Create a mock InstrumentRankingService */
function createMockRankingService(overrides: {
  getTopN?: (n: number) => any[];
} = {}) {
  return {
    getTopN: overrides.getTopN ?? jest.fn().mockReturnValue([]),
    getByAssetClass: jest.fn().mockReturnValue([]),
    getBySymbol: jest.fn(),
    getPCTTReady: jest.fn().mockReturnValue([]),
    getByRegime: jest.fn().mockReturnValue([]),
    getLastRun: jest.fn().mockReturnValue(null),
    getAllRankings: jest.fn().mockReturnValue([]),
    getSummary: jest.fn(),
    updateConfig: jest.fn(),
    rank: jest.fn(),
  } as any;
}

// ============================================================================
// canOpenNewPosition TESTS
// ============================================================================

describe("ISERiskGating - canOpenNewPosition", () => {
  test("should allow trade for symbol in active set", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(true),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canOpenNewPosition("AAPL");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("active trading set");
  });

  test("should allow trade with manual override even if not active", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    gating.setManualOverride("TSLA", true);
    const result = gating.canOpenNewPosition("TSLA");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("Manual override");
  });

  test("should block trade for symbol not in active set", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(false),
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canOpenNewPosition("XYZ");

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("not in the active trading set");
    expect(result.suggestions).toBeDefined();
  });

  test("should block trade for symbol in cooldown", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(true),
      getCooldownRemaining: jest.fn().mockReturnValue(300000), // 5 minutes
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canOpenNewPosition("MSFT");

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("cooldown");
    expect(result.reason).toContain("5 minutes");
  });

  test("should allow all symbols when gating is disabled", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking, {
      blockNewTradesOutsideActiveSet: false,
    });

    const result = gating.canOpenNewPosition("ANY");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("Gating disabled");
  });

  test("should check manual override before isActive", () => {
    const isActiveFn = jest.fn().mockReturnValue(true);
    const rotation = createMockRotationService({ isActive: isActiveFn });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    gating.setManualOverride("AAPL", true);
    const result = gating.canOpenNewPosition("AAPL");

    // Manual override short-circuits, so isActive should NOT be called
    expect(isActiveFn).not.toHaveBeenCalled();
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("Manual override");
  });

  test("should include suggestions with active alternatives", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(false),
      getActiveSymbols: jest.fn().mockReturnValue(["AAPL", "MSFT", "GOOG"]),
    });
    const ranking = createMockRankingService({
      getTopN: jest.fn().mockReturnValue([
        { symbol: "AAPL" },
        { symbol: "NVDA" },
        { symbol: "AMZN" },
      ]),
    });
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canOpenNewPosition("TSLA");

    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.length).toBeGreaterThan(0);

    const allSuggestions = result.suggestions!.join(" ");
    expect(allSuggestions).toContain("Active alternatives");
    expect(allSuggestions).toContain("AAPL");
  });

  test("should include top opportunity suggestions from ranking service", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(false),
      getActiveSymbols: jest.fn().mockReturnValue(["AAPL"]),
    });
    const ranking = createMockRankingService({
      getTopN: jest.fn().mockReturnValue([
        { symbol: "AAPL" },
        { symbol: "NVDA" },
        { symbol: "AMZN" },
      ]),
    });
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canOpenNewPosition("TSLA");

    const allSuggestions = result.suggestions!.join(" ");
    // NVDA and AMZN are not active, so they should appear as top opportunities
    expect(allSuggestions).toContain("Top opportunities");
    expect(allSuggestions).toContain("NVDA");
  });

  test("should include manual override suggestion when allowed", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(false),
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking, {
      allowManualOverride: true,
    });

    const result = gating.canOpenNewPosition("TSLA");

    const allSuggestions = result.suggestions!.join(" ");
    expect(allSuggestions).toContain("manual override");
  });

  test("should NOT include manual override suggestion when disallowed", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(false),
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking, {
      allowManualOverride: false,
    });

    const result = gating.canOpenNewPosition("TSLA");

    const allSuggestions = result.suggestions!.join(" ");
    expect(allSuggestions).not.toContain("manual override");
  });
});

// ============================================================================
// canScaleIn TESTS
// ============================================================================

describe("ISERiskGating - canScaleIn", () => {
  test("should allow scale-in for active symbol", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(true),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canScaleIn("AAPL");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("Scale-in allowed");
  });

  test("should allow scale-in with manual override", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    gating.setManualOverride("TSLA", true);
    const result = gating.canScaleIn("TSLA");

    expect(result.allowed).toBe(true);
  });

  test("should allow scale-in for inactive symbol when position management is enabled", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking, {
      allowExistingPositionManagement: true,
    });

    const result = gating.canScaleIn("MSFT");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("not recommended");
  });

  test("should block scale-in when position management is disabled and symbol inactive", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking, {
      allowExistingPositionManagement: false,
    });

    const result = gating.canScaleIn("MSFT");

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("blocked");
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions![0]).toContain("exiting position");
  });
});

// ============================================================================
// canExit TESTS
// ============================================================================

describe("ISERiskGating - canExit", () => {
  test("should always allow exits for active symbols", () => {
    const rotation = createMockRotationService();
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canExit("AAPL");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("always allowed");
  });

  test("should always allow exits for inactive symbols", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canExit("UNKNOWN");

    expect(result.allowed).toBe(true);
  });

  test("should always allow exits even when gating is strict", () => {
    const rotation = createMockRotationService();
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking, {
      blockNewTradesOutsideActiveSet: true,
      allowExistingPositionManagement: false,
    });

    const result = gating.canExit("XYZ");

    expect(result.allowed).toBe(true);
  });
});

// ============================================================================
// canAdjustStop TESTS
// ============================================================================

describe("ISERiskGating - canAdjustStop", () => {
  test("should always allow stop adjustments", () => {
    const rotation = createMockRotationService();
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canAdjustStop("AAPL");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("always allowed");
  });

  test("should allow stop adjustments for any symbol regardless of active set", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canAdjustStop("NONEXISTENT");

    expect(result.allowed).toBe(true);
  });
});

// ============================================================================
// MANUAL OVERRIDE TESTS
// ============================================================================

describe("ISERiskGating - Manual Overrides", () => {
  let rotation: any;
  let ranking: any;
  let gating: ISERiskGating;

  beforeEach(() => {
    rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    ranking = createMockRankingService();
    gating = new ISERiskGating(rotation, ranking);
  });

  test("should enable manual override for a symbol", () => {
    gating.setManualOverride("TSLA", true);

    expect(gating.hasManualOverride("TSLA")).toBe(true);
  });

  test("should disable manual override for a symbol", () => {
    gating.setManualOverride("TSLA", true);
    gating.setManualOverride("TSLA", false);

    expect(gating.hasManualOverride("TSLA")).toBe(false);
  });

  test("should return false for non-overridden symbols", () => {
    expect(gating.hasManualOverride("AAPL")).toBe(false);
  });

  test("should return list of all manual overrides", () => {
    gating.setManualOverride("TSLA", true);
    gating.setManualOverride("AAPL", true);
    gating.setManualOverride("GOOG", true);

    const overrides = gating.getManualOverrides();

    expect(overrides).toHaveLength(3);
    expect(overrides).toContain("TSLA");
    expect(overrides).toContain("AAPL");
    expect(overrides).toContain("GOOG");
  });

  test("should clear all manual overrides", () => {
    gating.setManualOverride("TSLA", true);
    gating.setManualOverride("AAPL", true);

    gating.clearManualOverrides();

    expect(gating.getManualOverrides()).toHaveLength(0);
    expect(gating.hasManualOverride("TSLA")).toBe(false);
    expect(gating.hasManualOverride("AAPL")).toBe(false);
  });

  test("should return empty array when no overrides set", () => {
    expect(gating.getManualOverrides()).toHaveLength(0);
  });
});

// ============================================================================
// DECISION LOG TESTS
// ============================================================================

describe("ISERiskGating - Decision Logging", () => {
  test("should log gating decisions when logging is enabled", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(true),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking, {
      logAllGatingDecisions: true,
    });

    gating.canOpenNewPosition("AAPL");

    const decisions = gating.getRecentDecisions();
    expect(decisions).toHaveLength(1);
    expect(decisions[0].symbol).toBe("AAPL");
    expect(decisions[0].action).toBe("new_entry");
    expect(decisions[0].allowed).toBe(true);
    expect(decisions[0].overridden).toBe(false);
    expect(decisions[0].timestamp).toBeInstanceOf(Date);
  });

  test("should NOT log decisions when logging is disabled", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(true),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking, {
      logAllGatingDecisions: false,
    });

    gating.canOpenNewPosition("AAPL");

    expect(gating.getRecentDecisions()).toHaveLength(0);
  });

  test("should log overridden decision correctly", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    gating.setManualOverride("TSLA", true);
    gating.canOpenNewPosition("TSLA");

    const decisions = gating.getRecentDecisions();
    expect(decisions[0].overridden).toBe(true);
    expect(decisions[0].allowed).toBe(true);
  });

  test("should respect limit in getRecentDecisions", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(true),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    for (let i = 0; i < 10; i++) {
      gating.canOpenNewPosition(`SYM${i}`);
    }

    expect(gating.getRecentDecisions(3)).toHaveLength(3);
    expect(gating.getRecentDecisions(10)).toHaveLength(10);
    expect(gating.getRecentDecisions()).toHaveLength(10);
  });

  test("should return most recent decisions when using limit", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(true),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    gating.canOpenNewPosition("FIRST");
    gating.canOpenNewPosition("MIDDLE");
    gating.canOpenNewPosition("LAST");

    const recent = gating.getRecentDecisions(2);
    expect(recent[0].symbol).toBe("MIDDLE");
    expect(recent[1].symbol).toBe("LAST");
  });

  test("should log different action types correctly", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(true),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    gating.canOpenNewPosition("A");
    gating.canScaleIn("B");
    gating.canExit("C");
    gating.canAdjustStop("D");

    const decisions = gating.getRecentDecisions();
    expect(decisions[0].action).toBe("new_entry");
    expect(decisions[1].action).toBe("scale_in");
    expect(decisions[2].action).toBe("exit");
    expect(decisions[3].action).toBe("stop_adjust");
  });

  test("should cap decision log at 500 entries", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(true),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    for (let i = 0; i < 510; i++) {
      gating.canOpenNewPosition(`SYM${i}`);
    }

    const all = gating.getRecentDecisions(600);
    expect(all.length).toBe(500);
    // Should keep the most recent 500
    expect(all[all.length - 1].symbol).toBe("SYM509");
  });
});

// ============================================================================
// STATS TESTS
// ============================================================================

describe("ISERiskGating - getStats", () => {
  test("should return zero stats initially", () => {
    const rotation = createMockRotationService({
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const stats = gating.getStats();

    expect(stats.totalDecisions).toBe(0);
    expect(stats.allowed).toBe(0);
    expect(stats.blocked).toBe(0);
    expect(stats.overridden).toBe(0);
    expect(stats.activeSetSize).toBe(0);
  });

  test("should track allowed and blocked counts", () => {
    const isActiveFn = jest.fn();
    isActiveFn.mockReturnValueOnce(true); // first call = allowed
    isActiveFn.mockReturnValueOnce(false); // second call = blocked

    const rotation = createMockRotationService({
      isActive: isActiveFn,
      isInCooldown: jest.fn().mockReturnValue(false),
      getActiveSymbols: jest.fn().mockReturnValue(["AAPL"]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    gating.canOpenNewPosition("AAPL"); // allowed
    gating.canOpenNewPosition("BLOCKED"); // blocked

    const stats = gating.getStats();
    expect(stats.totalDecisions).toBe(2);
    expect(stats.allowed).toBe(1);
    expect(stats.blocked).toBe(1);
  });

  test("should track overridden count", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    gating.setManualOverride("TSLA", true);
    gating.canOpenNewPosition("TSLA");

    const stats = gating.getStats();
    expect(stats.overridden).toBe(1);
    expect(stats.allowed).toBe(1);
  });

  test("should report active set size from rotation service", () => {
    const rotation = createMockRotationService({
      getActiveSymbols: jest.fn().mockReturnValue(["AAPL", "MSFT", "GOOG"]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const stats = gating.getStats();
    expect(stats.activeSetSize).toBe(3);
  });
});

// ============================================================================
// CONFIG TESTS
// ============================================================================

describe("ISERiskGating - Configuration", () => {
  test("should use default config when none provided", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(false),
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    // Default: blockNewTradesOutsideActiveSet = true
    const result = gating.canOpenNewPosition("TSLA");
    expect(result.allowed).toBe(false);
  });

  test("should merge partial config with defaults", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking, {
      blockNewTradesOutsideActiveSet: false,
    });

    // blockNewTradesOutsideActiveSet = false → allows all
    const result = gating.canOpenNewPosition("ANY");
    expect(result.allowed).toBe(true);
  });

  test("should update config dynamically", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(false),
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    // Initially blocked
    expect(gating.canOpenNewPosition("SYM").allowed).toBe(false);

    // Update config to disable gating
    gating.updateConfig({ blockNewTradesOutsideActiveSet: false });

    // Now allowed
    expect(gating.canOpenNewPosition("SYM").allowed).toBe(true);
  });

  test("should update only specified config fields", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking, {
      allowExistingPositionManagement: true,
    });

    // Update only one field, others should remain
    gating.updateConfig({ logAllGatingDecisions: false });

    // allowExistingPositionManagement should still be true
    const result = gating.canScaleIn("SYM");
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("not recommended");

    // logging is now disabled
    expect(gating.getRecentDecisions()).toHaveLength(0);
  });
});

// ============================================================================
// DEFAULT_GATING_CONFIG TESTS
// ============================================================================

describe("DEFAULT_GATING_CONFIG", () => {
  test("should have expected default values", () => {
    expect(DEFAULT_GATING_CONFIG.blockNewTradesOutsideActiveSet).toBe(true);
    expect(DEFAULT_GATING_CONFIG.allowExistingPositionManagement).toBe(true);
    expect(DEFAULT_GATING_CONFIG.allowManualOverride).toBe(true);
    expect(DEFAULT_GATING_CONFIG.requireConfirmationForOverride).toBe(true);
    expect(DEFAULT_GATING_CONFIG.logAllGatingDecisions).toBe(true);
  });
});

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe("createISERiskGating", () => {
  test("should create an ISERiskGating instance", () => {
    const rotation = createMockRotationService();
    const ranking = createMockRankingService();

    const gating = createISERiskGating(rotation, ranking);

    expect(gating).toBeInstanceOf(ISERiskGating);
  });

  test("should accept optional config", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
    });
    const ranking = createMockRankingService();

    const gating = createISERiskGating(rotation, ranking, {
      blockNewTradesOutsideActiveSet: false,
    });

    const result = gating.canOpenNewPosition("ANY");
    expect(result.allowed).toBe(true);
  });
});

// ============================================================================
// createISETradeValidator TESTS
// ============================================================================

describe("createISETradeValidator", () => {
  test("should create a validator with all 4 methods", () => {
    const rotation = createMockRotationService();
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const validator = createISETradeValidator(gating);

    expect(validator.validateNewTrade).toBeDefined();
    expect(validator.validateScaleIn).toBeDefined();
    expect(validator.validateExit).toBeDefined();
    expect(validator.validateStopAdjust).toBeDefined();
  });

  test("validateNewTrade should delegate to canOpenNewPosition", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(true),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);
    const validator = createISETradeValidator(gating);

    const result = validator.validateNewTrade("AAPL");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("active trading set");
  });

  test("validateScaleIn should delegate to canScaleIn", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(true),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);
    const validator = createISETradeValidator(gating);

    const result = validator.validateScaleIn("AAPL");

    expect(result.allowed).toBe(true);
  });

  test("validateExit should delegate to canExit", () => {
    const rotation = createMockRotationService();
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);
    const validator = createISETradeValidator(gating);

    const result = validator.validateExit("AAPL");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("always allowed");
  });

  test("validateStopAdjust should delegate to canAdjustStop", () => {
    const rotation = createMockRotationService();
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);
    const validator = createISETradeValidator(gating);

    const result = validator.validateStopAdjust("AAPL");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("always allowed");
  });
});

// ============================================================================
// INTEGRATION-LIKE SCENARIOS
// ============================================================================

describe("ISERiskGating - Integration Scenarios", () => {
  test("full workflow: block → override → clear → block again", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(false),
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    // 1. Initially blocked
    expect(gating.canOpenNewPosition("TSLA").allowed).toBe(false);

    // 2. Set override → allowed
    gating.setManualOverride("TSLA", true);
    expect(gating.canOpenNewPosition("TSLA").allowed).toBe(true);

    // 3. Clear overrides → blocked again
    gating.clearManualOverrides();
    expect(gating.canOpenNewPosition("TSLA").allowed).toBe(false);
  });

  test("mixed actions produce correct decision log", () => {
    const isActiveFn = jest
      .fn()
      .mockReturnValueOnce(true)   // canOpenNewPosition("A") → active
      .mockReturnValueOnce(false)  // canScaleIn("B") → not active, falls through
      .mockReturnValueOnce(false); // unused (canExit doesn't check isActive)

    const rotation = createMockRotationService({
      isActive: isActiveFn,
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    gating.canOpenNewPosition("A");
    gating.canScaleIn("B");
    gating.canExit("C");
    gating.canAdjustStop("D");

    const decisions = gating.getRecentDecisions();
    expect(decisions).toHaveLength(4);

    expect(decisions[0]).toMatchObject({
      symbol: "A",
      action: "new_entry",
      allowed: true,
    });
    expect(decisions[1]).toMatchObject({
      symbol: "B",
      action: "scale_in",
      allowed: true, // allowed because allowExistingPositionManagement defaults to true
    });
    expect(decisions[2]).toMatchObject({
      symbol: "C",
      action: "exit",
      allowed: true,
    });
    expect(decisions[3]).toMatchObject({
      symbol: "D",
      action: "stop_adjust",
      allowed: true,
    });
  });

  test("cooldown calculation uses correct minute rounding", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(true),
      getCooldownRemaining: jest.fn().mockReturnValue(61000), // 61 seconds = 1.017 min → ceil = 2 min
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canOpenNewPosition("MSFT");

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("2 minutes");
  });

  test("cooldown calculation for exact minute boundary", () => {
    const rotation = createMockRotationService({
      isActive: jest.fn().mockReturnValue(false),
      isInCooldown: jest.fn().mockReturnValue(true),
      getCooldownRemaining: jest.fn().mockReturnValue(60000), // exactly 1 minute
      getActiveSymbols: jest.fn().mockReturnValue([]),
    });
    const ranking = createMockRankingService();
    const gating = new ISERiskGating(rotation, ranking);

    const result = gating.canOpenNewPosition("MSFT");

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("1 minutes");
  });
});
