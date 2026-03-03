/**
 * Tests for PCTT Explainable AI Module
 *
 * Tests structure explanation, signal explanation, live commentary,
 * factor analysis, confidence breakdown, risk identification, and visual cues.
 */

import {
  PCTTExplainableAI,
  createPCTTExplainableAI,
  type DecisionExplanation,
  type TradeNarrative,
  type LiveCommentary,
} from "../explainable-ai";

// Import types we need for building mock data.
// explainable-ai.ts only imports TYPE references from pctt-core so no
// runtime module resolution is triggered at import time.
import type {
  StructureObject,
  PCTTSignal,
  BoundaryLine,
  PCTTEvent,
} from "../pctt-core";

// ============================================================================
// HELPERS
// ============================================================================

function makeBoundaryLine(
  overrides: Partial<BoundaryLine> = {},
): BoundaryLine {
  return {
    slope: 0.01,
    intercept: 100,
    startIndex: 0,
    pivots: [
      {
        index: 0,
        price: 100,
        type: "low",
        confirmed: true,
        confirmationBar: 5,
      },
      {
        index: 10,
        price: 101,
        type: "low",
        confirmed: true,
        confirmationBar: 15,
      },
    ],
    qScore: 0.75,
    touches: 3,
    violations: 0,
    frozen: false,
    ...overrides,
  };
}

function makeStructure(
  overrides: Partial<StructureObject> = {},
): StructureObject {
  return {
    support: makeBoundaryLine({ qScore: 0.75 }),
    resistance: makeBoundaryLine({
      qScore: 0.70,
      pivots: [
        {
          index: 5,
          price: 110,
          type: "high",
          confirmed: true,
          confirmationBar: 10,
        },
      ],
    }),
    regime: "trend_up",
    event: "idle",
    atr: 2.5,
    efficiencyRatio: 0.6,
    crossingCount: 2,
    distanceToSupport: 0.8,
    distanceToResistance: 1.5,
    ...overrides,
  };
}

function makeSignal(overrides: Partial<PCTTSignal> = {}): PCTTSignal {
  return {
    type: "long",
    event: "entry_long",
    actionLine: 100,
    safetyLine: 97,
    qScore: 0.75,
    entryPrice: 100,
    stopPrice: 97,
    targetPrices: [106, 112, 118],
    riskReward: 2.0,
    confidence: 0.72,
    regime: "trend_up",
    timestamp: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// FACTORY
// ============================================================================

describe("createPCTTExplainableAI", () => {
  it("should create an instance", () => {
    const ai = createPCTTExplainableAI();
    expect(ai).toBeInstanceOf(PCTTExplainableAI);
  });
});

// ============================================================================
// explainStructure
// ============================================================================

describe("PCTTExplainableAI - explainStructure", () => {
  let ai: PCTTExplainableAI;

  beforeEach(() => {
    ai = new PCTTExplainableAI();
  });

  it("should return a valid DecisionExplanation", () => {
    const result = ai.explainStructure(makeStructure());
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("narrative");
    expect(result).toHaveProperty("factors");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("risks");
    expect(result).toHaveProperty("visualCues");
    expect(result).toHaveProperty("timestamp");
  });

  it("should include regime in the summary", () => {
    const result = ai.explainStructure(makeStructure({ regime: "trend_up" }));
    expect(result.summary.toLowerCase()).toContain("trend up");
  });

  it("should include confidence % in the summary", () => {
    const result = ai.explainStructure(makeStructure());
    expect(result.summary).toMatch(/Confidence:\s+\d+%/);
  });

  it("should include event description in the narrative", () => {
    const result = ai.explainStructure(makeStructure({ event: "break_up" }));
    expect(result.narrative.toLowerCase()).toContain("broken above resistance");
  });

  it("should include regime description in the narrative", () => {
    const result = ai.explainStructure(makeStructure({ regime: "range" }));
    expect(result.narrative.toLowerCase()).toContain("range-bound");
  });

  it("should return timestamp as a Date", () => {
    const result = ai.explainStructure(makeStructure());
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});

// ============================================================================
// FACTOR ANALYSIS
// ============================================================================

describe("PCTTExplainableAI - Factor Analysis (via explainStructure)", () => {
  let ai: PCTTExplainableAI;

  beforeEach(() => {
    ai = new PCTTExplainableAI();
  });

  it("should include support quality factor when support exists", () => {
    const result = ai.explainStructure(makeStructure());
    const supportFactor = result.factors.find(
      (f) => f.name === "Support Quality",
    );
    expect(supportFactor).toBeDefined();
    expect(supportFactor!.weight).toBe(0.25);
  });

  it("should include resistance quality factor when resistance exists", () => {
    const result = ai.explainStructure(makeStructure());
    const resFactor = result.factors.find(
      (f) => f.name === "Resistance Quality",
    );
    expect(resFactor).toBeDefined();
    expect(resFactor!.weight).toBe(0.25);
  });

  it("should not include support quality factor when support is null", () => {
    const result = ai.explainStructure(makeStructure({ support: null }));
    const supportFactor = result.factors.find(
      (f) => f.name === "Support Quality",
    );
    expect(supportFactor).toBeUndefined();
  });

  it("should include Market Regime factor", () => {
    const result = ai.explainStructure(makeStructure());
    const regimeFactor = result.factors.find(
      (f) => f.name === "Market Regime",
    );
    expect(regimeFactor).toBeDefined();
    expect(regimeFactor!.weight).toBe(0.2);
  });

  it("should include Trend Efficiency factor", () => {
    const result = ai.explainStructure(makeStructure());
    const effFactor = result.factors.find(
      (f) => f.name === "Trend Efficiency",
    );
    expect(effFactor).toBeDefined();
    expect(effFactor!.weight).toBe(0.15);
  });

  it("should mark high efficiency as positive", () => {
    const result = ai.explainStructure(
      makeStructure({ efficiencyRatio: 0.7 }),
    );
    const effFactor = result.factors.find(
      (f) => f.name === "Trend Efficiency",
    );
    expect(effFactor!.impact).toBe("positive");
  });

  it("should mark low efficiency as negative", () => {
    const result = ai.explainStructure(
      makeStructure({ efficiencyRatio: 0.2 }),
    );
    const effFactor = result.factors.find(
      (f) => f.name === "Trend Efficiency",
    );
    expect(effFactor!.impact).toBe("negative");
  });

  it("should include distance factors", () => {
    const result = ai.explainStructure(makeStructure());
    const distSupport = result.factors.find(
      (f) => f.name === "Distance to Support",
    );
    const distResistance = result.factors.find(
      (f) => f.name === "Distance to Resistance",
    );
    expect(distSupport).toBeDefined();
    expect(distResistance).toBeDefined();
  });

  it("should mark close to support as positive for distance factor", () => {
    const result = ai.explainStructure(
      makeStructure({ distanceToSupport: 0.5 }),
    );
    const distSupport = result.factors.find(
      (f) => f.name === "Distance to Support",
    );
    expect(distSupport!.impact).toBe("positive");
  });

  it("should mark support qScore >= 0.65 as positive", () => {
    const result = ai.explainStructure(
      makeStructure({
        support: makeBoundaryLine({ qScore: 0.75 }),
      }),
    );
    const supportFactor = result.factors.find(
      (f) => f.name === "Support Quality",
    );
    expect(supportFactor!.impact).toBe("positive");
  });

  it("should mark support qScore < 0.5 as negative", () => {
    const result = ai.explainStructure(
      makeStructure({
        support: makeBoundaryLine({ qScore: 0.4 }),
      }),
    );
    const supportFactor = result.factors.find(
      (f) => f.name === "Support Quality",
    );
    expect(supportFactor!.impact).toBe("negative");
  });

  it("should mark transition regime as negative", () => {
    const result = ai.explainStructure(
      makeStructure({ regime: "transition" }),
    );
    const regimeFactor = result.factors.find(
      (f) => f.name === "Market Regime",
    );
    expect(regimeFactor!.impact).toBe("negative");
  });

  it("should mark range regime as neutral", () => {
    const result = ai.explainStructure(makeStructure({ regime: "range" }));
    const regimeFactor = result.factors.find(
      (f) => f.name === "Market Regime",
    );
    expect(regimeFactor!.impact).toBe("neutral");
  });
});

// ============================================================================
// CONFIDENCE BREAKDOWN
// ============================================================================

describe("PCTTExplainableAI - Confidence Breakdown (via explainStructure)", () => {
  let ai: PCTTExplainableAI;

  beforeEach(() => {
    ai = new PCTTExplainableAI();
  });

  it("should return overall confidence 0-100", () => {
    const result = ai.explainStructure(makeStructure());
    expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
    expect(result.confidence.overall).toBeLessThanOrEqual(100);
  });

  it("should have all component fields", () => {
    const result = ai.explainStructure(makeStructure());
    expect(result.confidence.components).toHaveProperty("structureQuality");
    expect(result.confidence.components).toHaveProperty("regimeAlignment");
    expect(result.confidence.components).toHaveProperty("eventTiming");
    expect(result.confidence.components).toHaveProperty("riskReward");
  });

  it("should give higher regime alignment for trending regimes", () => {
    const trendUp = ai.explainStructure(makeStructure({ regime: "trend_up" }));
    const transition = ai.explainStructure(
      makeStructure({ regime: "transition" }),
    );
    expect(trendUp.confidence.components.regimeAlignment).toBeGreaterThan(
      transition.confidence.components.regimeAlignment,
    );
  });

  it("should give higher event timing for entry events", () => {
    const entry = ai.explainStructure(makeStructure({ event: "entry_long" }));
    const idle = ai.explainStructure(makeStructure({ event: "idle" }));
    expect(entry.confidence.components.eventTiming).toBeGreaterThan(
      idle.confidence.components.eventTiming,
    );
  });

  it("should add adjustment for transition regime", () => {
    const result = ai.explainStructure(
      makeStructure({ regime: "transition" }),
    );
    expect(result.confidence.adjustments.length).toBeGreaterThan(0);
    const transitionAdj = result.confidence.adjustments.find((a) =>
      a.factor.includes("Transition"),
    );
    expect(transitionAdj).toBeDefined();
    expect(transitionAdj!.adjustment).toBe(-20);
  });

  it("should not add transition adjustment for trending regime", () => {
    const result = ai.explainStructure(makeStructure({ regime: "trend_up" }));
    const transitionAdj = result.confidence.adjustments.find((a) =>
      a.factor.includes("Transition"),
    );
    expect(transitionAdj).toBeUndefined();
  });

  it("should calculate structure quality from average Q-scores", () => {
    const result = ai.explainStructure(
      makeStructure({
        support: makeBoundaryLine({ qScore: 0.8 }),
        resistance: makeBoundaryLine({ qScore: 0.6 }),
      }),
    );
    // structureQuality = round(((0.8 + 0.6) / 2) * 100) = round(70) = 70
    expect(result.confidence.components.structureQuality).toBe(70);
  });

  it("should handle null support/resistance in confidence", () => {
    const result = ai.explainStructure(
      makeStructure({ support: null, resistance: null }),
    );
    // Both Q-scores default to 0
    expect(result.confidence.components.structureQuality).toBe(0);
    // Should still return valid overall
    expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
  });

  it("should clamp overall confidence between 0 and 100", () => {
    // Transition regime applies -20 adjustment which could push below 0
    // with very poor structure
    const result = ai.explainStructure(
      makeStructure({
        support: null,
        resistance: null,
        regime: "transition",
        event: "idle",
        efficiencyRatio: 0.1,
        distanceToSupport: 5,
        distanceToResistance: 5,
      }),
    );
    expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
    expect(result.confidence.overall).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// RISK IDENTIFICATION
// ============================================================================

describe("PCTTExplainableAI - Risk Identification (via explainStructure)", () => {
  let ai: PCTTExplainableAI;

  beforeEach(() => {
    ai = new PCTTExplainableAI();
  });

  it("should identify weak support risk", () => {
    const result = ai.explainStructure(
      makeStructure({
        support: makeBoundaryLine({ qScore: 0.3 }),
      }),
    );
    const supportRisk = result.risks.find(
      (r) => r.type === "structural" && r.description.includes("Support"),
    );
    expect(supportRisk).toBeDefined();
    expect(supportRisk!.level).toBe("high");
  });

  it("should identify null support as structural risk", () => {
    const result = ai.explainStructure(makeStructure({ support: null }));
    const supportRisk = result.risks.find(
      (r) => r.type === "structural" && r.description.includes("Support"),
    );
    expect(supportRisk).toBeDefined();
  });

  it("should identify weak resistance risk", () => {
    const result = ai.explainStructure(
      makeStructure({
        resistance: makeBoundaryLine({ qScore: 0.4 }),
      }),
    );
    const resRisk = result.risks.find(
      (r) => r.type === "structural" && r.description.includes("Resistance"),
    );
    expect(resRisk).toBeDefined();
  });

  it("should identify transition regime as timing risk", () => {
    const result = ai.explainStructure(
      makeStructure({ regime: "transition" }),
    );
    const timingRisk = result.risks.find(
      (r) => r.type === "timing" && r.description.includes("transition"),
    );
    expect(timingRisk).toBeDefined();
    expect(timingRisk!.level).toBe("high");
  });

  it("should identify idle event as timing risk", () => {
    const result = ai.explainStructure(makeStructure({ event: "idle" }));
    const idleRisk = result.risks.find(
      (r) => r.type === "timing" && r.description.includes("premature"),
    );
    expect(idleRisk).toBeDefined();
    expect(idleRisk!.level).toBe("medium");
  });

  it("should identify low efficiency as market risk", () => {
    const result = ai.explainStructure(
      makeStructure({ efficiencyRatio: 0.2 }),
    );
    const marketRisk = result.risks.find(
      (r) => r.type === "market" && r.description.includes("efficiency"),
    );
    expect(marketRisk).toBeDefined();
  });

  it("should identify execution risk when far from both levels", () => {
    const result = ai.explainStructure(
      makeStructure({ distanceToSupport: 4, distanceToResistance: 4 }),
    );
    const execRisk = result.risks.find(
      (r) => r.type === "execution" && r.description.includes("far from"),
    );
    expect(execRisk).toBeDefined();
  });

  it("should not flag execution risk when close to support", () => {
    const result = ai.explainStructure(
      makeStructure({ distanceToSupport: 0.5, distanceToResistance: 5 }),
    );
    const execRisk = result.risks.find(
      (r) => r.type === "execution" && r.description.includes("far from"),
    );
    expect(execRisk).toBeUndefined();
  });

  it("should not identify risks for good structure in trending regime", () => {
    const result = ai.explainStructure(
      makeStructure({
        support: makeBoundaryLine({ qScore: 0.8 }),
        resistance: makeBoundaryLine({ qScore: 0.8 }),
        regime: "trend_up",
        event: "entry_long",
        efficiencyRatio: 0.7,
        distanceToSupport: 0.5,
        distanceToResistance: 2,
      }),
    );
    expect(result.risks.length).toBe(0);
  });

  it("should include mitigation suggestions in risks", () => {
    const result = ai.explainStructure(
      makeStructure({ regime: "transition", event: "idle" }),
    );
    for (const risk of result.risks) {
      // Not all risks have mitigation, but timing ones should
      if (risk.type === "timing") {
        expect(risk.mitigation).toBeDefined();
        expect(risk.mitigation!.length).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// VISUAL CUES
// ============================================================================

describe("PCTTExplainableAI - Visual Cues (via explainStructure)", () => {
  let ai: PCTTExplainableAI;

  beforeEach(() => {
    ai = new PCTTExplainableAI();
  });

  it("should include support zone cue when support exists", () => {
    const result = ai.explainStructure(makeStructure());
    const supportCue = result.visualCues.find(
      (c) => c.type === "zone" && c.label?.includes("Support"),
    );
    expect(supportCue).toBeDefined();
  });

  it("should include resistance zone cue when resistance exists", () => {
    const result = ai.explainStructure(makeStructure());
    const resCue = result.visualCues.find(
      (c) => c.type === "zone" && c.label?.includes("Resistance"),
    );
    expect(resCue).toBeDefined();
  });

  it("should not include support cue when support is null", () => {
    const result = ai.explainStructure(makeStructure({ support: null }));
    const supportCue = result.visualCues.find(
      (c) => c.type === "zone" && c.label?.includes("Support"),
    );
    expect(supportCue).toBeUndefined();
  });

  it("should use green color for high-quality support", () => {
    const result = ai.explainStructure(
      makeStructure({
        support: makeBoundaryLine({ qScore: 0.75 }),
      }),
    );
    const supportCue = result.visualCues.find(
      (c) => c.type === "zone" && c.label?.includes("Support"),
    );
    expect(supportCue!.color).toBe("#26a69a");
  });

  it("should use gray color for low-quality support", () => {
    const result = ai.explainStructure(
      makeStructure({
        support: makeBoundaryLine({ qScore: 0.5 }),
      }),
    );
    const supportCue = result.visualCues.find(
      (c) => c.type === "zone" && c.label?.includes("Support"),
    );
    expect(supportCue!.color).toBe("#9e9e9e");
  });

  it("should include event text cue when event is not idle", () => {
    const result = ai.explainStructure(makeStructure({ event: "break_up" }));
    const eventCue = result.visualCues.find((c) => c.type === "text");
    expect(eventCue).toBeDefined();
    expect(eventCue!.label).toContain("BREAK UP");
  });

  it("should not include event text cue when event is idle", () => {
    const result = ai.explainStructure(makeStructure({ event: "idle" }));
    const eventCue = result.visualCues.find((c) => c.type === "text");
    expect(eventCue).toBeUndefined();
  });

  it("should include regime highlight cue", () => {
    const result = ai.explainStructure(makeStructure());
    const highlightCue = result.visualCues.find(
      (c) => c.type === "highlight",
    );
    expect(highlightCue).toBeDefined();
  });

  it("should use green-tinted highlight for trend_up", () => {
    const result = ai.explainStructure(makeStructure({ regime: "trend_up" }));
    const highlightCue = result.visualCues.find(
      (c) => c.type === "highlight",
    );
    expect(highlightCue!.color).toContain("38, 166, 154");
  });

  it("should use red-tinted highlight for trend_down", () => {
    const result = ai.explainStructure(
      makeStructure({ regime: "trend_down" }),
    );
    const highlightCue = result.visualCues.find(
      (c) => c.type === "highlight",
    );
    expect(highlightCue!.color).toContain("239, 83, 80");
  });

  it("should use gray-tinted highlight for range", () => {
    const result = ai.explainStructure(makeStructure({ regime: "range" }));
    const highlightCue = result.visualCues.find(
      (c) => c.type === "highlight",
    );
    expect(highlightCue!.color).toContain("158, 158, 158");
  });

  it("should color entry events green", () => {
    const result = ai.explainStructure(
      makeStructure({ event: "entry_long" }),
    );
    const eventCue = result.visualCues.find((c) => c.type === "text");
    expect(eventCue!.color).toBe("#4caf50");
  });

  it("should color non-entry, non-idle events orange", () => {
    const result = ai.explainStructure(makeStructure({ event: "freeze_up" }));
    const eventCue = result.visualCues.find((c) => c.type === "text");
    expect(eventCue!.color).toBe("#ff9800");
  });
});

// ============================================================================
// explainSignal
// ============================================================================

describe("PCTTExplainableAI - explainSignal", () => {
  let ai: PCTTExplainableAI;

  beforeEach(() => {
    ai = new PCTTExplainableAI();
  });

  it("should return a valid TradeNarrative", () => {
    const narrative = ai.explainSignal(makeSignal(), makeStructure());
    expect(narrative).toHaveProperty("setup");
    expect(narrative).toHaveProperty("trigger");
    expect(narrative).toHaveProperty("execution");
    expect(narrative).toHaveProperty("management");
    expect(narrative).toHaveProperty("invalidation");
  });

  it("should describe bullish setup for long signal", () => {
    const narrative = ai.explainSignal(
      makeSignal({ type: "long" }),
      makeStructure(),
    );
    expect(narrative.setup.toLowerCase()).toContain("bullish");
    expect(narrative.setup.toLowerCase()).toContain("support");
  });

  it("should describe bearish setup for short signal", () => {
    const narrative = ai.explainSignal(
      makeSignal({ type: "short", event: "entry_short" }),
      makeStructure(),
    );
    expect(narrative.setup.toLowerCase()).toContain("bearish");
    expect(narrative.setup.toLowerCase()).toContain("resistance");
  });

  it("should include entry price in execution", () => {
    const signal = makeSignal({ entryPrice: 150.5 });
    const narrative = ai.explainSignal(signal, makeStructure());
    expect(narrative.execution).toContain("150.50");
  });

  it("should include stop price in management", () => {
    const signal = makeSignal({ stopPrice: 97.25 });
    const narrative = ai.explainSignal(signal, makeStructure());
    expect(narrative.management).toContain("97.25");
  });

  it("should include first target in management", () => {
    const signal = makeSignal({ targetPrices: [110, 120, 130] });
    const narrative = ai.explainSignal(signal, makeStructure());
    expect(narrative.management).toContain("110.00");
  });

  it("should include Q-score percentage in setup", () => {
    const signal = makeSignal({ qScore: 0.82 });
    const narrative = ai.explainSignal(signal, makeStructure());
    expect(narrative.setup).toContain("82%");
  });

  it("should include risk/reward ratio in setup", () => {
    const signal = makeSignal({ riskReward: 2.5 });
    const narrative = ai.explainSignal(signal, makeStructure());
    expect(narrative.setup).toContain("2.5");
  });

  it("should describe long invalidation as below stop", () => {
    const narrative = ai.explainSignal(
      makeSignal({ type: "long" }),
      makeStructure(),
    );
    expect(narrative.invalidation.toLowerCase()).toContain("below");
  });

  it("should describe short invalidation as above stop", () => {
    const narrative = ai.explainSignal(
      makeSignal({ type: "short", event: "entry_short" }),
      makeStructure(),
    );
    expect(narrative.invalidation.toLowerCase()).toContain("above");
  });

  it("should describe long trigger as bullish rejection", () => {
    const narrative = ai.explainSignal(
      makeSignal({ type: "long" }),
      makeStructure(),
    );
    expect(narrative.trigger.toLowerCase()).toContain("bullish");
    expect(narrative.trigger.toLowerCase()).toContain("rejection");
  });

  it("should describe short trigger as bearish rejection", () => {
    const narrative = ai.explainSignal(
      makeSignal({ type: "short" }),
      makeStructure(),
    );
    expect(narrative.trigger.toLowerCase()).toContain("bearish");
    expect(narrative.trigger.toLowerCase()).toContain("rejection");
  });
});

// ============================================================================
// generateLiveCommentary
// ============================================================================

describe("PCTTExplainableAI - generateLiveCommentary", () => {
  let ai: PCTTExplainableAI;

  beforeEach(() => {
    ai = new PCTTExplainableAI();
  });

  it("should return a valid LiveCommentary", () => {
    const commentary = ai.generateLiveCommentary(makeStructure());
    expect(commentary).toHaveProperty("currentState");
    expect(commentary).toHaveProperty("watchingFor");
    expect(commentary).toHaveProperty("recentEvents");
    expect(commentary).toHaveProperty("nextActions");
  });

  it("should describe current state with event and regime", () => {
    const commentary = ai.generateLiveCommentary(
      makeStructure({ event: "idle", regime: "trend_up" }),
    );
    expect(commentary.currentState.toLowerCase()).toContain("trend up");
  });

  it("should include efficiency in current state", () => {
    const commentary = ai.generateLiveCommentary(
      makeStructure({ efficiencyRatio: 0.65 }),
    );
    expect(commentary.currentState).toContain("65%");
  });

  it("should suggest watch items for idle state", () => {
    const commentary = ai.generateLiveCommentary(
      makeStructure({ event: "idle" }),
    );
    expect(commentary.watchingFor.length).toBeGreaterThan(0);
    const joined = commentary.watchingFor.join(" ").toLowerCase();
    expect(joined).toContain("break");
  });

  it("should suggest watch items for break events", () => {
    const commentary = ai.generateLiveCommentary(
      makeStructure({ event: "break_up" }),
    );
    const joined = commentary.watchingFor.join(" ").toLowerCase();
    expect(joined).toContain("confirmation");
  });

  it("should suggest watch items for freeze events", () => {
    const commentary = ai.generateLiveCommentary(
      makeStructure({ event: "freeze_up" }),
    );
    const joined = commentary.watchingFor.join(" ").toLowerCase();
    expect(joined).toContain("retest");
  });

  it("should suggest watch items for retest events", () => {
    const commentary = ai.generateLiveCommentary(
      makeStructure({ event: "retest_up" }),
    );
    const joined = commentary.watchingFor.join(" ").toLowerCase();
    expect(joined).toContain("rejection");
  });

  it("should suggest next actions for idle", () => {
    const commentary = ai.generateLiveCommentary(
      makeStructure({ event: "idle" }),
    );
    expect(commentary.nextActions.length).toBeGreaterThan(0);
    const joined = commentary.nextActions.join(" ").toLowerCase();
    expect(joined).toContain("alert");
  });

  it("should suggest next actions for entry events", () => {
    const commentary = ai.generateLiveCommentary(
      makeStructure({ event: "entry_long" }),
    );
    const joined = commentary.nextActions.join(" ").toLowerCase();
    expect(joined).toContain("entry");
  });

  it("should suggest next actions for retest events", () => {
    const commentary = ai.generateLiveCommentary(
      makeStructure({ event: "retest_down" }),
    );
    const joined = commentary.nextActions.join(" ").toLowerCase();
    expect(joined).toContain("rejection");
  });

  it("should suggest next actions for freeze events", () => {
    const commentary = ai.generateLiveCommentary(
      makeStructure({ event: "freeze_up" }),
    );
    const joined = commentary.nextActions.join(" ").toLowerCase();
    expect(joined).toContain("retest");
  });

  it("should track state changes in recentEvents", () => {
    ai.generateLiveCommentary(makeStructure({ event: "idle" }));
    const commentary2 = ai.generateLiveCommentary(
      makeStructure({ event: "break_up" }),
    );
    expect(commentary2.recentEvents.length).toBeGreaterThan(0);
    expect(commentary2.recentEvents[0].event).toContain("idle");
    expect(commentary2.recentEvents[0].event).toContain("break_up");
  });

  it("should not add event when state hasn't changed", () => {
    ai.generateLiveCommentary(makeStructure({ event: "idle" }));
    const commentary2 = ai.generateLiveCommentary(
      makeStructure({ event: "idle" }),
    );
    // No state change, so no recent event added
    expect(commentary2.recentEvents.length).toBe(0);
  });

  it("should limit recent events to last 5", () => {
    const events: PCTTEvent[] = [
      "idle",
      "break_up",
      "freeze_up",
      "retest_up",
      "entry_long",
      "failure",
      "idle",
    ];
    for (const event of events) {
      ai.generateLiveCommentary(makeStructure({ event }));
    }
    const commentary = ai.generateLiveCommentary(
      makeStructure({ event: "break_down" }),
    );
    expect(commentary.recentEvents.length).toBeLessThanOrEqual(5);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("PCTTExplainableAI - Edge Cases", () => {
  let ai: PCTTExplainableAI;

  beforeEach(() => {
    ai = new PCTTExplainableAI();
  });

  it("should handle structure with no support and no resistance", () => {
    const result = ai.explainStructure(
      makeStructure({ support: null, resistance: null }),
    );
    expect(result.summary).toBeDefined();
    expect(result.narrative).toBeDefined();
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it("should handle zero efficiency ratio", () => {
    const result = ai.explainStructure(
      makeStructure({ efficiencyRatio: 0 }),
    );
    expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
  });

  it("should handle zero distances", () => {
    const result = ai.explainStructure(
      makeStructure({ distanceToSupport: 0, distanceToResistance: 0 }),
    );
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it("should handle all PCTTEvent types in explainStructure", () => {
    const events: PCTTEvent[] = [
      "idle",
      "break_up",
      "break_down",
      "freeze_up",
      "freeze_down",
      "retest_up",
      "retest_down",
      "entry_long",
      "entry_short",
      "failure",
    ];
    for (const event of events) {
      const result = ai.explainStructure(makeStructure({ event }));
      expect(result.summary).toBeDefined();
      expect(result.narrative.length).toBeGreaterThan(0);
    }
  });

  it("should handle all regime types", () => {
    const regimes: StructureObject["regime"][] = [
      "trend_up",
      "trend_down",
      "range",
      "transition",
    ];
    for (const regime of regimes) {
      const result = ai.explainStructure(makeStructure({ regime }));
      expect(result.summary).toBeDefined();
    }
  });

  it("should throw when signal has empty targetPrices array", () => {
    // The source code accesses signal.targetPrices[0].toFixed(2) without a
    // guard, so an empty array causes a TypeError.
    const signal = makeSignal({ targetPrices: [] });
    expect(() => ai.explainSignal(signal, makeStructure())).toThrow();
  });

  it("should handle signal with very high Q-score", () => {
    const signal = makeSignal({ qScore: 1.0 });
    const narrative = ai.explainSignal(signal, makeStructure());
    expect(narrative.setup).toContain("100%");
  });

  it("should handle signal with zero Q-score", () => {
    const signal = makeSignal({ qScore: 0 });
    const narrative = ai.explainSignal(signal, makeStructure());
    expect(narrative.setup).toContain("0%");
  });
});
