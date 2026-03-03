/**
 * InstrumentRotationService - Comprehensive Test Suite
 *
 * Tests rotation logic, hysteresis, cooldowns, dwell time,
 * force add/remove, state persistence, and the factory/explanation helpers.
 * Pure logic class - no external mocks required.
 */

import {
  InstrumentRotationService,
  createRotationService,
  evaluateRotation,
  applyRotation,
  explainRotation,
  createRotationState,
} from "../instrument-rotation";
import type {
  InstrumentRanking,
  RotationConfig,
  RotationDecision,
  ScoreBreakdown,
} from "../types";
import { DEFAULT_ROTATION_CONFIG } from "../types";

// ============================================================================
// HELPERS
// ============================================================================

let idCounter = 0;

function makeRanking(
  symbol: string,
  score: number,
  rank: number = 1,
): InstrumentRanking {
  idCounter++;
  return {
    id: `r_${idCounter}`,
    runId: "run_1",
    instrumentId: `inst_${symbol}`,
    symbol,
    assetClass: "stocks",
    rank,
    score,
    scoreBreakdown: makeScoreBreakdown(symbol, score),
    isPCTTReady: true,
    isLiquidEnough: true,
    meetsUserConstraints: true,
    regime: "trend_up",
    event: "entry_long",
    timestamp: new Date(),
  };
}

function makeScoreBreakdown(symbol: string, total: number): ScoreBreakdown {
  return {
    instrumentId: `inst_${symbol}`,
    symbol,
    liquidity: 0.8,
    pcttFitness: 0.7,
    opportunity: 0.6,
    realizedEdge: 0.5,
    userFit: 0.9,
    total,
    liquidityDetails: { volumeScore: 0.8, spreadScore: 0.9, slippageScore: 0.7 },
    pcttDetails: { qScore: 0.7, regimeScore: 0.8, geometryScore: 0.6 },
    opportunityDetails: { momentumScore: 0.6, trendScore: 0.7 },
    edgeDetails: { expectancy: 0.5, stability: 0.6, recency: 0.5, confidence: 0.7 },
    timestamp: new Date(),
  };
}

function makeRankings(items: [string, number][]): InstrumentRanking[] {
  return items
    .sort((a, b) => b[1] - a[1])
    .map(([sym, score], idx) => makeRanking(sym, score, idx + 1));
}

// ============================================================================
// createRotationState()
// ============================================================================

describe("createRotationState", () => {
  it("should return empty initial state", () => {
    const state = createRotationState();
    expect(state.activeSet.size).toBe(0);
    expect(state.instrumentStates.size).toBe(0);
    expect(state.cooldowns.size).toBe(0);
    expect(state.rotationCount).toBe(0);
    expect(state.lastRotationAt).toBeLessThanOrEqual(Date.now());
  });
});

// ============================================================================
// evaluateRotation()
// ============================================================================

describe("evaluateRotation", () => {
  const config: RotationConfig = {
    ...DEFAULT_ROTATION_CONFIG,
    minDwellMs: 0, // disable dwell for easier testing
    deltaEnter: 0.05,
    deltaExit: 0.03,
    maxEntriesPerCycle: 2,
    maxExitsPerCycle: 1,
  };

  it("should recommend entries when active set is empty", () => {
    const rankings = makeRankings([
      ["AAPL", 0.9],
      ["GOOG", 0.8],
      ["TSLA", 0.7],
    ]);
    const state = createRotationState();

    const decision = evaluateRotation({
      rankings,
      state,
      maxActiveSize: 3,
      config,
    });

    expect(decision.shouldRotate).toBe(true);
    // worstActiveScore = 0 (empty set), deltaEnter = 0.05
    // All scores > 0 + 0.05, but maxEntriesPerCycle = 2
    expect(decision.entries.length).toBeLessThanOrEqual(2);
    expect(decision.entries.length).toBeGreaterThan(0);
    expect(decision.exits).toHaveLength(0);
  });

  it("should not recommend entries if no instruments beat threshold", () => {
    const rankings = makeRankings([
      ["AAPL", 0.9],
      ["GOOG", 0.85],
    ]);
    // State: AAPL already active with score 0.9
    const state = createRotationState();
    state.activeSet.add("AAPL");
    state.instrumentStates.set("AAPL", {
      symbol: "AAPL",
      enteredAt: new Date(Date.now() - 600000),
      lastScore: 0.9,
      consecutiveRankings: 5,
      inCooldown: false,
    });

    const decision = evaluateRotation({
      rankings,
      state,
      maxActiveSize: 2,
      config,
    });

    // GOOG score 0.85, worstActive = 0.9, threshold = 0.9 + 0.05 = 0.95
    // 0.85 < 0.95, so no entry
    const googEntry = decision.entries.find((e) => e.symbol === "GOOG");
    expect(googEntry).toBeUndefined();
  });

  it("should recommend exit for instruments not in desired set past dwell time", () => {
    const rankings = makeRankings([
      ["GOOG", 0.95],
      ["TSLA", 0.90],
      ["META", 0.85],
    ]);

    // AAPL is active but not in top 3
    const state = createRotationState();
    state.activeSet.add("AAPL");
    state.instrumentStates.set("AAPL", {
      symbol: "AAPL",
      enteredAt: new Date(Date.now() - 600000), // 10 min ago
      lastScore: 0.5,
      consecutiveRankings: 3,
      inCooldown: false,
    });

    const decision = evaluateRotation({
      rankings,
      state,
      maxActiveSize: 3,
      config: { ...config, minDwellMs: 0 },
    });

    expect(decision.exits.some((e) => e.symbol === "AAPL")).toBe(true);
  });

  it("should hold instruments still within dwell time even if not in desired set", () => {
    const rankings = makeRankings([
      ["GOOG", 0.95],
      ["TSLA", 0.90],
    ]);

    const now = Date.now();
    const state = createRotationState();
    state.activeSet.add("AAPL");
    state.instrumentStates.set("AAPL", {
      symbol: "AAPL",
      enteredAt: new Date(now - 1000), // 1 second ago
      lastScore: 0.5,
      consecutiveRankings: 1,
      inCooldown: false,
    });

    const decision = evaluateRotation({
      rankings,
      state,
      maxActiveSize: 2,
      config: { ...config, minDwellMs: 300000 }, // 5 min dwell
      nowMs: now,
    });

    // AAPL should be held, not exited, because dwell time not met
    expect(decision.exits.some((e) => e.symbol === "AAPL")).toBe(false);
    expect(decision.holds.some((h) => h.symbol === "AAPL")).toBe(true);
  });

  it("should respect maxExitsPerCycle", () => {
    const rankings = makeRankings([
      ["META", 0.95],
    ]);

    const state = createRotationState();
    state.activeSet.add("AAPL");
    state.activeSet.add("GOOG");
    state.instrumentStates.set("AAPL", {
      symbol: "AAPL",
      enteredAt: new Date(Date.now() - 600000),
      lastScore: 0.3,
      consecutiveRankings: 1,
      inCooldown: false,
    });
    state.instrumentStates.set("GOOG", {
      symbol: "GOOG",
      enteredAt: new Date(Date.now() - 600000),
      lastScore: 0.3,
      consecutiveRankings: 1,
      inCooldown: false,
    });

    const decision = evaluateRotation({
      rankings,
      state,
      maxActiveSize: 1,
      config: { ...config, maxExitsPerCycle: 1 },
    });

    expect(decision.exits.length).toBeLessThanOrEqual(1);
  });

  it("should skip instruments in cooldown for entry", () => {
    const rankings = makeRankings([
      ["AAPL", 0.95],
    ]);

    const now = Date.now();
    const state = createRotationState();
    state.cooldowns.set("AAPL", now + 600000); // cooldown ends in 10 min

    const decision = evaluateRotation({
      rankings,
      state,
      maxActiveSize: 3,
      config,
      nowMs: now,
    });

    expect(decision.entries.some((e) => e.symbol === "AAPL")).toBe(false);
  });

  it("should hold instruments that are in desired set", () => {
    const rankings = makeRankings([
      ["AAPL", 0.9],
      ["GOOG", 0.8],
    ]);

    const state = createRotationState();
    state.activeSet.add("AAPL");
    state.instrumentStates.set("AAPL", {
      symbol: "AAPL",
      enteredAt: new Date(Date.now() - 600000),
      lastScore: 0.85,
      consecutiveRankings: 5,
      inCooldown: false,
    });

    const decision = evaluateRotation({
      rankings,
      state,
      maxActiveSize: 2,
      config,
    });

    expect(decision.holds.some((h) => h.symbol === "AAPL")).toBe(true);
  });

  it("should return shouldRotate=false when no entries or exits", () => {
    const rankings = makeRankings([
      ["AAPL", 0.9],
    ]);

    const state = createRotationState();
    state.activeSet.add("AAPL");
    state.instrumentStates.set("AAPL", {
      symbol: "AAPL",
      enteredAt: new Date(Date.now() - 600000),
      lastScore: 0.9,
      consecutiveRankings: 5,
      inCooldown: false,
    });

    const decision = evaluateRotation({
      rankings,
      state,
      maxActiveSize: 1,
      config,
    });

    expect(decision.shouldRotate).toBe(false);
    expect(decision.entries).toHaveLength(0);
    expect(decision.exits).toHaveLength(0);
  });

  it("should respect maxEntriesPerCycle", () => {
    const rankings = makeRankings([
      ["AAPL", 0.95],
      ["GOOG", 0.90],
      ["TSLA", 0.85],
      ["META", 0.80],
    ]);

    const state = createRotationState();

    const decision = evaluateRotation({
      rankings,
      state,
      maxActiveSize: 4,
      config: { ...config, maxEntriesPerCycle: 2 },
    });

    expect(decision.entries.length).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// applyRotation()
// ============================================================================

describe("applyRotation", () => {
  const config = { ...DEFAULT_ROTATION_CONFIG, minDwellMs: 0 };

  it("should add entries to active set", () => {
    const state = createRotationState();
    const decision: RotationDecision = {
      shouldRotate: true,
      entries: [{ symbol: "AAPL", score: 0.9, reason: "High score" }],
      exits: [],
      holds: [],
    };

    const { newState, events } = applyRotation({ decision, state, config });

    expect(newState.activeSet.has("AAPL")).toBe(true);
    expect(newState.instrumentStates.has("AAPL")).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("enter");
  });

  it("should remove exits from active set and add cooldowns", () => {
    const now = Date.now();
    const state = createRotationState();
    state.activeSet.add("AAPL");
    state.instrumentStates.set("AAPL", {
      symbol: "AAPL",
      enteredAt: new Date(now - 600000),
      lastScore: 0.5,
      consecutiveRankings: 3,
      inCooldown: false,
    });

    const decision: RotationDecision = {
      shouldRotate: true,
      entries: [],
      exits: [{ symbol: "AAPL", score: 0.3, reason: "Score dropped" }],
      holds: [],
    };

    const { newState, events } = applyRotation({
      decision,
      state,
      config,
      nowMs: now,
    });

    expect(newState.activeSet.has("AAPL")).toBe(false);
    expect(newState.instrumentStates.has("AAPL")).toBe(false);
    expect(newState.cooldowns.has("AAPL")).toBe(true);
    expect(newState.cooldowns.get("AAPL")).toBe(now + config.cooldownMs);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("exit");
  });

  it("should update scores for held instruments", () => {
    const state = createRotationState();
    state.activeSet.add("AAPL");
    state.instrumentStates.set("AAPL", {
      symbol: "AAPL",
      enteredAt: new Date(Date.now() - 600000),
      lastScore: 0.7,
      consecutiveRankings: 2,
      inCooldown: false,
    });

    const decision: RotationDecision = {
      shouldRotate: false,
      entries: [],
      exits: [],
      holds: [{ symbol: "AAPL", score: 0.85 }],
    };

    const { newState } = applyRotation({ decision, state, config });

    const instState = newState.instrumentStates.get("AAPL");
    expect(instState?.lastScore).toBe(0.85);
    expect(instState?.consecutiveRankings).toBe(3);
  });

  it("should increment rotationCount only when shouldRotate is true", () => {
    const state = createRotationState();
    state.rotationCount = 5;

    const noRotateDecision: RotationDecision = {
      shouldRotate: false,
      entries: [],
      exits: [],
      holds: [],
    };

    const { newState: s1 } = applyRotation({
      decision: noRotateDecision,
      state,
      config,
    });
    expect(s1.rotationCount).toBe(5);

    const rotateDecision: RotationDecision = {
      shouldRotate: true,
      entries: [{ symbol: "AAPL", score: 0.9, reason: "test" }],
      exits: [],
      holds: [],
    };

    const { newState: s2 } = applyRotation({
      decision: rotateDecision,
      state,
      config,
    });
    expect(s2.rotationCount).toBe(6);
  });

  it("should clean up expired cooldowns", () => {
    const now = Date.now();
    const state = createRotationState();
    state.cooldowns.set("EXPIRED", now - 1000); // already expired

    const decision: RotationDecision = {
      shouldRotate: false,
      entries: [],
      exits: [],
      holds: [],
    };

    const { newState } = applyRotation({
      decision,
      state,
      config,
      nowMs: now,
    });

    expect(newState.cooldowns.has("EXPIRED")).toBe(false);
  });

  it("should generate events with correct activeSetBefore/After", () => {
    const state = createRotationState();
    state.activeSet.add("AAPL");
    state.instrumentStates.set("AAPL", {
      symbol: "AAPL",
      enteredAt: new Date(Date.now() - 600000),
      lastScore: 0.5,
      consecutiveRankings: 1,
      inCooldown: false,
    });

    const decision: RotationDecision = {
      shouldRotate: true,
      entries: [{ symbol: "GOOG", score: 0.9, reason: "test" }],
      exits: [],
      holds: [],
    };

    const { events } = applyRotation({ decision, state, config });

    expect(events[0].activeSetBefore).toContain("AAPL");
    expect(events[0].activeSetAfter).toContain("AAPL");
    expect(events[0].activeSetAfter).toContain("GOOG");
  });
});

// ============================================================================
// InstrumentRotationService
// ============================================================================

describe("InstrumentRotationService", () => {
  let service: InstrumentRotationService;

  beforeEach(() => {
    service = new InstrumentRotationService(3, { minDwellMs: 0 });
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe("constructor", () => {
    it("should create with default config", () => {
      const s = new InstrumentRotationService();
      expect(s.getActiveSymbols()).toHaveLength(0);
    });

    it("should accept custom max active size", () => {
      const s = new InstrumentRotationService(10);
      expect(s).toBeDefined();
    });

    it("should accept custom config", () => {
      const s = new InstrumentRotationService(3, { cooldownMs: 1000 });
      expect(s).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // rotate()
  // --------------------------------------------------------------------------

  describe("rotate", () => {
    it("should populate active set from rankings", () => {
      const rankings = makeRankings([
        ["AAPL", 0.9],
        ["GOOG", 0.8],
        ["TSLA", 0.7],
      ]);

      service.rotate(rankings);

      const active = service.getActiveSymbols();
      expect(active.length).toBeGreaterThan(0);
    });

    it("should not exceed maxActiveSize", () => {
      const rankings = makeRankings([
        ["AAPL", 0.9],
        ["GOOG", 0.85],
        ["TSLA", 0.8],
        ["META", 0.75],
        ["AMZN", 0.7],
      ]);

      // Rotate multiple times to fill up
      service.rotate(rankings);
      service.rotate(rankings);
      service.rotate(rankings);

      expect(service.getActiveSymbols().length).toBeLessThanOrEqual(3);
    });

    it("should return RotationDecision object", () => {
      const rankings = makeRankings([["AAPL", 0.9]]);
      const decision = service.rotate(rankings);

      expect(decision).toHaveProperty("shouldRotate");
      expect(decision).toHaveProperty("entries");
      expect(decision).toHaveProperty("exits");
      expect(decision).toHaveProperty("holds");
    });

    it("should return shouldRotate=false when active set is stable", () => {
      const rankings = makeRankings([
        ["AAPL", 0.9],
        ["GOOG", 0.85],
      ]);

      // First rotation adds instruments
      service.rotate(rankings);

      // Second rotation with same rankings should be stable
      const decision = service.rotate(rankings);

      expect(decision.shouldRotate).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // forceAdd()
  // --------------------------------------------------------------------------

  describe("forceAdd", () => {
    it("should add symbol to active set", () => {
      const result = service.forceAdd("AAPL");
      expect(result).toBe(true);
      expect(service.isActive("AAPL")).toBe(true);
    });

    it("should return false when active set is full", () => {
      service.forceAdd("AAPL");
      service.forceAdd("GOOG");
      service.forceAdd("TSLA");

      const result = service.forceAdd("META");
      expect(result).toBe(false);
      expect(service.isActive("META")).toBe(false);
    });

    it("should create instrument state with lastScore 0", () => {
      service.forceAdd("AAPL");
      const instState = service.getInstrumentState("AAPL");
      expect(instState).toBeDefined();
      expect(instState!.lastScore).toBe(0);
      expect(instState!.consecutiveRankings).toBe(0);
    });

    it("should log an event with manual trigger source", () => {
      service.forceAdd("AAPL", "Testing manual add");
      const events = service.getRecentEvents(10);
      const addEvent = events.find(
        (e) => e.symbol === "AAPL" && e.eventType === "enter",
      );
      expect(addEvent).toBeDefined();
      expect(addEvent!.triggerSource).toBe("manual");
      expect(addEvent!.reason).toBe("Testing manual add");
    });
  });

  // --------------------------------------------------------------------------
  // forceRemove()
  // --------------------------------------------------------------------------

  describe("forceRemove", () => {
    it("should remove symbol from active set", () => {
      service.forceAdd("AAPL");
      const result = service.forceRemove("AAPL");
      expect(result).toBe(true);
      expect(service.isActive("AAPL")).toBe(false);
    });

    it("should return false if symbol is not active", () => {
      const result = service.forceRemove("AAPL");
      expect(result).toBe(false);
    });

    it("should set cooldown after removal", () => {
      service.forceAdd("AAPL");
      service.forceRemove("AAPL");
      expect(service.isInCooldown("AAPL")).toBe(true);
    });

    it("should log an event with manual trigger source", () => {
      service.forceAdd("AAPL");
      service.forceRemove("AAPL", "No longer needed");
      const events = service.getRecentEvents(10);
      const removeEvent = events.find(
        (e) => e.symbol === "AAPL" && e.eventType === "exit",
      );
      expect(removeEvent).toBeDefined();
      expect(removeEvent!.triggerSource).toBe("manual");
      expect(removeEvent!.reason).toBe("No longer needed");
    });
  });

  // --------------------------------------------------------------------------
  // isActive()
  // --------------------------------------------------------------------------

  describe("isActive", () => {
    it("should return false for unknown symbols", () => {
      expect(service.isActive("UNKNOWN")).toBe(false);
    });

    it("should return true for active symbols", () => {
      service.forceAdd("AAPL");
      expect(service.isActive("AAPL")).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // isInCooldown() / getCooldownRemaining()
  // --------------------------------------------------------------------------

  describe("isInCooldown", () => {
    it("should return false for symbols not in cooldown", () => {
      expect(service.isInCooldown("AAPL")).toBe(false);
    });

    it("should return true after forced removal", () => {
      service.forceAdd("AAPL");
      service.forceRemove("AAPL");
      expect(service.isInCooldown("AAPL")).toBe(true);
    });
  });

  describe("getCooldownRemaining", () => {
    it("should return 0 for symbols not in cooldown", () => {
      expect(service.getCooldownRemaining("AAPL")).toBe(0);
    });

    it("should return positive value for symbols in cooldown", () => {
      service.forceAdd("AAPL");
      service.forceRemove("AAPL");
      expect(service.getCooldownRemaining("AAPL")).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // getActiveSymbols()
  // --------------------------------------------------------------------------

  describe("getActiveSymbols", () => {
    it("should return empty array initially", () => {
      expect(service.getActiveSymbols()).toEqual([]);
    });

    it("should return all active symbols", () => {
      service.forceAdd("AAPL");
      service.forceAdd("GOOG");
      const symbols = service.getActiveSymbols();
      expect(symbols).toContain("AAPL");
      expect(symbols).toContain("GOOG");
      expect(symbols).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // getInstrumentState()
  // --------------------------------------------------------------------------

  describe("getInstrumentState", () => {
    it("should return undefined for unknown symbols", () => {
      expect(service.getInstrumentState("UNKNOWN")).toBeUndefined();
    });

    it("should return state for active instruments", () => {
      service.forceAdd("AAPL");
      const state = service.getInstrumentState("AAPL");
      expect(state).toBeDefined();
      expect(state!.symbol).toBe("AAPL");
    });
  });

  // --------------------------------------------------------------------------
  // getRecentEvents()
  // --------------------------------------------------------------------------

  describe("getRecentEvents", () => {
    it("should return empty array initially", () => {
      expect(service.getRecentEvents()).toEqual([]);
    });

    it("should return events after operations", () => {
      service.forceAdd("AAPL");
      service.forceRemove("AAPL");
      const events = service.getRecentEvents();
      expect(events).toHaveLength(2);
    });

    it("should respect limit parameter", () => {
      service.forceAdd("AAPL");
      service.forceAdd("GOOG");
      service.forceAdd("TSLA");
      const events = service.getRecentEvents(2);
      expect(events).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // getState() / restoreState()
  // --------------------------------------------------------------------------

  describe("getState / restoreState", () => {
    it("should return current state", () => {
      service.forceAdd("AAPL");
      const state = service.getState();
      expect(state.activeSet.has("AAPL")).toBe(true);
    });

    it("should restore state from saved state", () => {
      service.forceAdd("AAPL");
      service.forceAdd("GOOG");
      const savedState = service.getState();

      // Create new service and restore
      const newService = new InstrumentRotationService(3, { minDwellMs: 0 });
      newService.restoreState(savedState);

      expect(newService.isActive("AAPL")).toBe(true);
      expect(newService.isActive("GOOG")).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // updateConfig() / setMaxActiveSize()
  // --------------------------------------------------------------------------

  describe("updateConfig", () => {
    it("should update config values", () => {
      service.updateConfig({ cooldownMs: 1000 });
      // Verify indirectly: force remove and check cooldown is shorter
      service.forceAdd("AAPL");
      service.forceRemove("AAPL");
      const remaining = service.getCooldownRemaining("AAPL");
      // Should be roughly 1000ms (not default 15min)
      expect(remaining).toBeLessThanOrEqual(1000);
    });
  });

  describe("setMaxActiveSize", () => {
    it("should update max active size", () => {
      service.setMaxActiveSize(10);
      // Now we can add more than 3
      for (let i = 0; i < 6; i++) {
        service.forceAdd(`SYM${i}`);
      }
      expect(service.getActiveSymbols().length).toBe(6);
    });
  });

  // --------------------------------------------------------------------------
  // reset()
  // --------------------------------------------------------------------------

  describe("reset", () => {
    it("should clear all state", () => {
      service.forceAdd("AAPL");
      service.forceAdd("GOOG");

      service.reset();

      expect(service.getActiveSymbols()).toHaveLength(0);
      expect(service.getRecentEvents()).toHaveLength(0);
    });
  });
});

// ============================================================================
// createRotationService() factory
// ============================================================================

describe("createRotationService", () => {
  it("should create a new service with defaults", () => {
    const service = createRotationService();
    expect(service).toBeInstanceOf(InstrumentRotationService);
    expect(service.getActiveSymbols()).toHaveLength(0);
  });

  it("should accept maxActiveSize", () => {
    const service = createRotationService(10);
    expect(service).toBeInstanceOf(InstrumentRotationService);
  });

  it("should accept custom config", () => {
    const service = createRotationService(5, { cooldownMs: 5000 });
    expect(service).toBeInstanceOf(InstrumentRotationService);
  });
});

// ============================================================================
// explainRotation()
// ============================================================================

describe("explainRotation", () => {
  it("should explain no rotation when shouldRotate is false", () => {
    const decision: RotationDecision = {
      shouldRotate: false,
      entries: [],
      exits: [],
      holds: [{ symbol: "AAPL", score: 0.9 }],
    };

    const explanation = explainRotation(decision);
    expect(explanation).toContain("No rotation needed");
  });

  it("should explain entries", () => {
    const decision: RotationDecision = {
      shouldRotate: true,
      entries: [{ symbol: "AAPL", score: 0.9, reason: "High score" }],
      exits: [],
      holds: [],
    };

    const explanation = explainRotation(decision);
    expect(explanation).toContain("Adding");
    expect(explanation).toContain("AAPL");
    expect(explanation).toContain("90%");
  });

  it("should explain exits", () => {
    const decision: RotationDecision = {
      shouldRotate: true,
      entries: [],
      exits: [{ symbol: "TSLA", score: 0.3, reason: "Score dropped" }],
      holds: [],
    };

    const explanation = explainRotation(decision);
    expect(explanation).toContain("Removing");
    expect(explanation).toContain("TSLA");
    expect(explanation).toContain("Score dropped");
  });

  it("should explain both entries and exits", () => {
    const decision: RotationDecision = {
      shouldRotate: true,
      entries: [{ symbol: "AAPL", score: 0.9, reason: "High" }],
      exits: [{ symbol: "TSLA", score: 0.3, reason: "Low" }],
      holds: [{ symbol: "GOOG", score: 0.8 }],
    };

    const explanation = explainRotation(decision);
    expect(explanation).toContain("Adding");
    expect(explanation).toContain("Removing");
    expect(explanation).toContain("Holding 1 instruments");
  });
});

// ============================================================================
// DEFAULT_ROTATION_CONFIG
// ============================================================================

describe("DEFAULT_ROTATION_CONFIG", () => {
  it("should have expected defaults", () => {
    expect(DEFAULT_ROTATION_CONFIG.deltaEnter).toBe(0.05);
    expect(DEFAULT_ROTATION_CONFIG.deltaExit).toBe(0.03);
    expect(DEFAULT_ROTATION_CONFIG.minDwellMs).toBe(5 * 60 * 1000);
    expect(DEFAULT_ROTATION_CONFIG.cooldownMs).toBe(15 * 60 * 1000);
    expect(DEFAULT_ROTATION_CONFIG.maxEntriesPerCycle).toBe(2);
    expect(DEFAULT_ROTATION_CONFIG.maxExitsPerCycle).toBe(1);
  });
});
