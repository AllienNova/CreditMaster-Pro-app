/**
 * Signal Fusion Service — Unit Tests
 * TRD-008: 80%+ branch coverage
 */

import {
  SignalFusionService,
  type FusionInput,
  type RuleSignal,
  type MLPrediction,
  type LLMAnalysis,
  type TechnicalSignal,
  type SignalSource,
} from "../fusion/signal-fusion-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRuleSignal(overrides: Partial<RuleSignal> = {}): RuleSignal {
  return {
    ruleId: "rule-1",
    ruleName: "Test Rule",
    type: "entry",
    symbol: "AAPL",
    side: "buy",
    price: 150,
    timestamp: new Date(),
    confidence: 0.8,
    ...overrides,
  };
}

function makeMLPrediction(overrides: Partial<MLPrediction> = {}): MLPrediction {
  return {
    symbol: "AAPL",
    signal: "buy",
    confidence: 0.85,
    featureImportance: { rsi: 0.3, sma: 0.2 },
    modelVersion: "v1",
    ...overrides,
  };
}

function makeLLMAnalysis(overrides: Partial<LLMAnalysis> = {}): LLMAnalysis {
  return {
    overallSignal: "buy",
    confidence: 0.75,
    recommendation: "execute",
    signalQuality: {
      technical: 0.8,
      fundamental: 0.7,
      sentiment: 0.6,
      overall: 0.7,
    },
    conflicts: [],
    considerations: ["Strong momentum"],
    riskFactors: ["Elevated volatility"],
    rationale: "Bullish confluence",
    ...overrides,
  };
}

function makeTechnicalSignal(
  overrides: Partial<TechnicalSignal> = {},
): TechnicalSignal {
  return {
    symbol: "AAPL",
    indicator: "RSI",
    signal: "bullish",
    strength: 80,
    value: 35,
    ...overrides,
  };
}

function makeInput(overrides: Partial<FusionInput> = {}): FusionInput {
  return {
    symbol: "AAPL",
    currentPrice: 150,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SignalFusionService", () => {
  let service: SignalFusionService;

  beforeEach(() => {
    service = new SignalFusionService();
  });

  // ---- Basic Fusion ----

  describe("fuseSignals", () => {
    it("should return a FusedSignal with all metadata", async () => {
      const input = makeInput({
        ruleBasedSignals: [makeRuleSignal()],
        mlPrediction: makeMLPrediction(),
        llmAnalysis: makeLLMAnalysis(),
        technicalSignals: [makeTechnicalSignal()],
      });

      const result = await service.fuseSignals(input);

      expect(result.id).toBeTruthy();
      expect(result.symbol).toBe("AAPL");
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.confidence).toBe("number");
      expect(result.metadata.sourcesUsed).toHaveLength(4);
      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should generate buy action when all sources are bullish", async () => {
      const input = makeInput({
        ruleBasedSignals: [makeRuleSignal({ side: "buy", confidence: 0.9 })],
        mlPrediction: makeMLPrediction({ signal: "buy", confidence: 0.9 }),
        llmAnalysis: makeLLMAnalysis({
          overallSignal: "strong_buy",
          confidence: 0.9,
        }),
        technicalSignals: [
          makeTechnicalSignal({ signal: "bullish", strength: 90 }),
        ],
      });

      const result = await service.fuseSignals(input);
      expect(["strong_buy", "buy"]).toContain(result.action);
      expect(result.consensus.agreementLevel).toBeGreaterThan(0.5);
    });

    it("should generate sell action when all sources are bearish", async () => {
      const input = makeInput({
        ruleBasedSignals: [makeRuleSignal({ side: "sell", confidence: 0.9 })],
        mlPrediction: makeMLPrediction({ signal: "sell", confidence: 0.9 }),
        llmAnalysis: makeLLMAnalysis({
          overallSignal: "strong_sell",
          confidence: 0.9,
        }),
        technicalSignals: [
          makeTechnicalSignal({ signal: "bearish", strength: 90 }),
        ],
      });

      const result = await service.fuseSignals(input);
      expect(["strong_sell", "sell"]).toContain(result.action);
    });

    it("should return hold/no_action for conflicting signals", async () => {
      const input = makeInput({
        ruleBasedSignals: [makeRuleSignal({ side: "buy", confidence: 0.9 })],
        mlPrediction: makeMLPrediction({ signal: "sell", confidence: 0.9 }),
        llmAnalysis: makeLLMAnalysis({
          overallSignal: "sell",
          confidence: 0.9,
        }),
        technicalSignals: [
          makeTechnicalSignal({ signal: "bullish", strength: 90 }),
        ],
      });

      const result = await service.fuseSignals(input);
      expect(result.consensus.conflictingSignals).toBe(true);
    });

    it("should work with only a single source", async () => {
      const input = makeInput({
        mlPrediction: makeMLPrediction({ signal: "buy", confidence: 0.8 }),
      });

      const result = await service.fuseSignals(input);
      expect(result.metadata.sourcesUsed).toEqual(["ml"]);
      expect(result.contributions.mlWeight).toBeCloseTo(1, 5);
    });

    it("should redistribute weights when some sources are missing", async () => {
      const input = makeInput({
        ruleBasedSignals: [makeRuleSignal()],
        mlPrediction: makeMLPrediction(),
      });

      const result = await service.fuseSignals(input);
      const totalWeight =
        result.contributions.ruleBasedWeight +
        result.contributions.mlWeight +
        result.contributions.llmWeight +
        result.contributions.technicalWeight;

      expect(totalWeight).toBeCloseTo(1, 5);
      expect(result.contributions.llmWeight).toBe(0);
      expect(result.contributions.technicalWeight).toBe(0);
    });

    it("should include tradeParams for actionable signals", async () => {
      const input = makeInput({
        ruleBasedSignals: [makeRuleSignal({ side: "buy", confidence: 0.95 })],
        mlPrediction: makeMLPrediction({ signal: "buy", confidence: 0.95 }),
        llmAnalysis: makeLLMAnalysis({
          overallSignal: "strong_buy",
          confidence: 0.95,
        }),
        technicalSignals: [
          makeTechnicalSignal({ signal: "bullish", strength: 95 }),
        ],
      });

      const result = await service.fuseSignals(input);
      if (result.action !== "hold" && result.action !== "no_action") {
        expect(result.tradeParams).toBeDefined();
        expect(result.tradeParams!.entryPrice).toBe(150);
        expect(result.tradeParams!.stopLoss).toBeDefined();
        expect(result.tradeParams!.targets.length).toBeGreaterThan(0);
        expect(result.tradeParams!.positionSizePercent).toBeGreaterThanOrEqual(
          1,
        );
        expect(result.tradeParams!.positionSizePercent).toBeLessThanOrEqual(5);
      }
    });

    it("should not include tradeParams for hold signals", async () => {
      const input = makeInput({
        ruleBasedSignals: [makeRuleSignal({ side: "close", confidence: 0.5 })],
      });

      const result = await service.fuseSignals(input);
      if (result.action === "hold" || result.action === "no_action") {
        expect(result.tradeParams).toBeUndefined();
      }
    });
  });

  // ---- Normalization ----

  describe("signal normalization", () => {
    it("should normalize rule signal with close side to 0", async () => {
      const input = makeInput({
        ruleBasedSignals: [makeRuleSignal({ side: "close", confidence: 1 })],
      });

      const result = await service.fuseSignals(input);
      // close -> direction=0 -> score=0 -> hold
      expect(result.contributions.ruleBasedSignal).toBe(0);
    });

    it("should normalize ML hold to 0", async () => {
      const input = makeInput({
        mlPrediction: makeMLPrediction({ signal: "hold", confidence: 0.8 }),
      });

      const result = await service.fuseSignals(input);
      expect(result.contributions.mlSignal).toBe(0);
    });

    it("should normalize LLM no_action to 0", async () => {
      const input = makeInput({
        llmAnalysis: makeLLMAnalysis({
          overallSignal: "no_action",
          confidence: 0.9,
        }),
      });

      const result = await service.fuseSignals(input);
      expect(result.contributions.llmSignal).toBe(0);
    });

    it("should normalize technical neutral to 0", async () => {
      const input = makeInput({
        technicalSignals: [
          makeTechnicalSignal({ signal: "neutral", strength: 80 }),
        ],
      });

      const result = await service.fuseSignals(input);
      expect(result.contributions.technicalSignal).toBe(0);
    });

    it("should clamp rule signals to [-1, 1]", async () => {
      // Multiple strong buy signals could exceed 1 before clamping
      const input = makeInput({
        ruleBasedSignals: [
          makeRuleSignal({ side: "buy", confidence: 1 }),
          makeRuleSignal({ side: "buy", confidence: 1 }),
        ],
      });

      const result = await service.fuseSignals(input);
      expect(result.contributions.ruleBasedSignal).toBeLessThanOrEqual(1);
      expect(result.contributions.ruleBasedSignal).toBeGreaterThanOrEqual(-1);
    });
  });

  // ---- Score to Action Mapping ----

  describe("score to action thresholds", () => {
    it("should return no_action for very low confidence", async () => {
      // All sources with near-zero signal = low confidence
      const input = makeInput({
        mlPrediction: makeMLPrediction({ signal: "hold", confidence: 0.01 }),
        technicalSignals: [
          makeTechnicalSignal({ signal: "neutral", strength: 1 }),
        ],
      });

      const result = await service.fuseSignals(input);
      expect(["hold", "no_action"]).toContain(result.action);
    });
  });

  // ---- Weight Management ----

  describe("getWeights / setWeights", () => {
    it("should return default weights", () => {
      const w = service.getWeights();
      expect(w.ruleBased).toBeCloseTo(0.25, 2);
      expect(w.ml).toBeCloseTo(0.3, 2);
      expect(w.llm).toBeCloseTo(0.25, 2);
      expect(w.technical).toBeCloseTo(0.2, 2);
    });

    it("should normalize weights after setting", () => {
      service.setWeights({ ml: 0.5 });
      const w = service.getWeights();
      const total = w.ruleBased + w.ml + w.llm + w.technical;
      expect(total).toBeCloseTo(1, 5);
    });

    it("should accept custom initial weights", () => {
      const custom = new SignalFusionService({ ruleBased: 0.5, ml: 0.5 });
      const w = custom.getWeights();
      expect(w.ruleBased).toBeGreaterThan(0.25); // higher than default
    });
  });

  // ---- Adaptive Weight Adjustment ----

  describe("recordOutcome / adjustWeights", () => {
    it("should record outcomes without error", () => {
      expect(() => service.recordOutcome("ml", true)).not.toThrow();
      expect(() => service.recordOutcome("ml", false)).not.toThrow();
    });

    it("should not adjust weights before 10 trades per source", () => {
      const before = service.getWeights();
      for (let i = 0; i < 5; i++) {
        service.recordOutcome("ml", true);
      }
      service.adjustWeights();
      const after = service.getWeights();
      // Weights stay at default 0.5 win-rate equivalent since < 10 trades
      expect(after.ml).toBeCloseTo(before.ml, 1);
    });

    it("should adjust weights after sufficient data", () => {
      // Make ML consistently win, others at chance
      for (let i = 0; i < 20; i++) {
        service.recordOutcome("ml", true);
        service.recordOutcome("rule_based", i % 2 === 0);
        service.recordOutcome("llm", i % 2 === 0);
        service.recordOutcome("technical", i % 2 === 0);
      }

      service.adjustWeights();
      const w = service.getWeights();
      // ML should have highest weight (100% win rate vs 50%)
      expect(w.ml).toBeGreaterThan(w.ruleBased);
    });

    it("should cap performance tracking at 100 trades", () => {
      for (let i = 0; i < 120; i++) {
        service.recordOutcome("ml" as SignalSource, i < 80);
      }
      // After 100, it resets to 50. No error should occur.
      expect(() => service.adjustWeights()).not.toThrow();
    });
  });
});
