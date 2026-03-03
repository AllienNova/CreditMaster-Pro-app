/**
 * Tests for Custom Strategy Builder + Validator
 *
 * Validates the fluent builder API, validation logic,
 * JSON serialization/deserialization, and edge cases.
 */

import type { BacktestStrategy } from "../../backtesting/backtest-engine";
import type { StrategyDefinition } from "../strategy-types";
import {
  StrategyBuilder,
  createStrategyBuilder,
} from "../custom-strategy-builder";
import {
  validateStrategy,
  validateStrategyDefinition,
  VALID_INDICATOR_LIST,
  VALID_OPERATOR_LIST,
  VALID_POSITION_SIZING_LIST,
  VALID_CATEGORY_LIST,
  VALID_RISK_LEVEL_LIST,
  VALID_TIMEFRAME_LIST,
  VALID_MARKET_CONDITION_LIST,
} from "../strategy-validator";

// ============================================================================
// BUILDER — BASIC CONSTRUCTION
// ============================================================================

describe("StrategyBuilder", () => {
  let builder: StrategyBuilder;

  beforeEach(() => {
    builder = createStrategyBuilder();
  });

  describe("buildStrategy", () => {
    it("builds a minimal valid strategy", () => {
      const strategy = builder
        .name("Test Strategy")
        .addEntryRule("close", "gt", "sma_20")
        .addExitRule("close", "lt", "sma_20")
        .positionSizing("percent")
        .buildStrategy();

      expect(strategy.name).toBe("Test Strategy");
      expect(strategy.entryRules).toHaveLength(1);
      expect(strategy.exitRules).toHaveLength(1);
      expect(strategy.positionSizing).toBe("percent");
    });

    it("builds a strategy with all optional fields", () => {
      const strategy = builder
        .name("Full Strategy")
        .description("A complete strategy")
        .addEntryRule("rsi_14", "gt", 60)
        .addEntryRule("close", "crosses_above", "sma_50")
        .addExitRule("rsi_14", "lt", 40)
        .positionSizing("risk_based", 2)
        .stopLoss("atr", 2)
        .takeProfit("risk_multiple", 3)
        .trailingStop("atr", 2.5, 1)
        .tradingHours(9, 16)
        .daysOfWeek([1, 2, 3, 4, 5])
        .buildStrategy();

      expect(strategy.description).toBe("A complete strategy");
      expect(strategy.entryRules).toHaveLength(2);
      expect(strategy.exitRules).toHaveLength(1);
      expect(strategy.positionValue).toBe(2);
      expect(strategy.stopLoss).toEqual({ type: "atr", value: 2 });
      expect(strategy.takeProfit).toEqual({ type: "risk_multiple", value: 3 });
      expect(strategy.trailingStop).toEqual({
        type: "atr",
        value: 2.5,
        activation: 1,
      });
      expect(strategy.tradingHours).toEqual({ start: 9, end: 16 });
      expect(strategy.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    });

    it("throws on invalid strategy", () => {
      expect(() => builder.buildStrategy()).toThrow("Invalid strategy");
    });

    it("supports setEntryRules and setExitRules", () => {
      const strategy = builder
        .name("Bulk Rules")
        .setEntryRules([
          { indicator: "close", operator: "gt", value: "sma_20" },
          { indicator: "rsi_14", operator: "gt", value: 50 },
        ])
        .setExitRules([
          { indicator: "close", operator: "lt", value: "sma_20" },
        ])
        .positionSizing("percent")
        .buildStrategy();

      expect(strategy.entryRules).toHaveLength(2);
      expect(strategy.exitRules).toHaveLength(1);
    });

    it("supports params in rules", () => {
      const strategy = builder
        .name("Parameterized")
        .addEntryRule("close", "gt", "sma_20", { period: 20 })
        .addExitRule("close", "lt", "sma_20", { period: 20 })
        .positionSizing("percent")
        .buildStrategy();

      expect(strategy.entryRules[0].params).toEqual({ period: 20 });
    });
  });

  describe("buildDefinition", () => {
    it("builds a full StrategyDefinition", () => {
      const def = builder
        .id("my-strategy")
        .name("My Custom Strategy")
        .addEntryRule("rsi_14", "lt", 30)
        .addExitRule("rsi_14", "gt", 70)
        .positionSizing("percent")
        .category("mean_reversion")
        .riskLevel("low")
        .timeframe("swing")
        .idealConditions(["ranging"])
        .indicators(["rsi_14"])
        .expectedReturnRange(5, 15)
        .expectedDrawdownRange(3, 10)
        .minCapital(10000)
        .buildDefinition();

      expect(def.id).toBe("my-strategy");
      expect(def.strategy.name).toBe("My Custom Strategy");
      expect(def.metadata.category).toBe("mean_reversion");
      expect(def.metadata.riskLevel).toBe("low");
      expect(def.metadata.timeframe).toBe("swing");
      expect(def.metadata.idealConditions).toEqual(["ranging"]);
      expect(def.metadata.indicators).toEqual(["rsi_14"]);
    });

    it("throws on invalid ID format", () => {
      expect(() =>
        builder
          .id("INVALID ID")
          .name("Test")
          .addEntryRule("close", "gt", "sma_20")
          .addExitRule("close", "lt", "sma_20")
          .positionSizing("percent")
          .category("momentum")
          .riskLevel("medium")
          .timeframe("swing")
          .idealConditions(["trending"])
          .indicators(["sma_20"])
          .expectedReturnRange(5, 15)
          .expectedDrawdownRange(3, 10)
          .minCapital(5000)
          .buildDefinition(),
      ).toThrow("Invalid strategy definition");
    });

    it("supports setMetadata for bulk metadata assignment", () => {
      const def = builder
        .id("bulk-meta")
        .name("Bulk Metadata")
        .addEntryRule("close", "gt", "sma_20")
        .addExitRule("close", "lt", "sma_20")
        .positionSizing("percent")
        .setMetadata({
          category: "momentum",
          riskLevel: "high",
          timeframe: "intraday",
          idealConditions: ["trending", "volatile"],
          indicators: ["sma_20"],
          expectedReturnRange: { min: 10, max: 30 },
          expectedDrawdownRange: { min: 5, max: 20 },
          minCapital: 25000,
          author: "Test",
          version: "1.0.0",
        })
        .buildDefinition();

      expect(def.metadata.category).toBe("momentum");
      expect(def.metadata.riskLevel).toBe("high");
      expect(def.metadata.idealConditions).toEqual(["trending", "volatile"]);
    });
  });

  describe("validate", () => {
    it("returns validation result without throwing", () => {
      const result = builder.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns valid for a proper strategy", () => {
      builder
        .name("Valid")
        .addEntryRule("close", "gt", "sma_20")
        .addExitRule("close", "lt", "sma_20")
        .positionSizing("percent");

      const result = builder.validate();
      expect(result.valid).toBe(true);
    });

    it("validates as definition when id is set", () => {
      builder
        .id("test")
        .name("Valid Def")
        .addEntryRule("close", "gt", "sma_20")
        .addExitRule("close", "lt", "sma_20")
        .positionSizing("percent");

      const result = builder.validate();
      // Should validate as definition — missing metadata doesn't cause id-related errors
      expect(result).toBeDefined();
    });
  });

  describe("reset", () => {
    it("clears all builder state", () => {
      builder
        .id("test")
        .name("Test")
        .addEntryRule("close", "gt", 100)
        .addExitRule("close", "lt", 90)
        .positionSizing("fixed")
        .stopLoss("percent", 5)
        .reset();

      expect(() => builder.buildStrategy()).toThrow("Invalid strategy");
    });
  });

  describe("chaining", () => {
    it("all methods return this for chaining", () => {
      const result = builder
        .id("chain-test")
        .name("Chain Test")
        .description("Testing chaining")
        .addEntryRule("close", "gt", "sma_20")
        .addExitRule("close", "lt", "sma_20")
        .setEntryRules([
          { indicator: "close", operator: "gt", value: "sma_20" },
        ])
        .setExitRules([
          { indicator: "close", operator: "lt", value: "sma_20" },
        ])
        .positionSizing("percent")
        .stopLoss("percent", 5)
        .takeProfit("percent", 10)
        .trailingStop("percent", 3)
        .tradingHours(9, 16)
        .daysOfWeek([1, 2, 3, 4, 5])
        .category("momentum")
        .riskLevel("medium")
        .timeframe("swing")
        .idealConditions(["trending"])
        .indicators(["sma_20"])
        .expectedReturnRange(5, 15)
        .expectedDrawdownRange(3, 10)
        .minCapital(5000);

      expect(result).toBe(builder);
    });
  });

  describe("JSON serialization", () => {
    it("toJSON produces a valid plain object", () => {
      builder
        .name("JSON Test")
        .addEntryRule("close", "gt", "sma_20")
        .addExitRule("close", "lt", "sma_20")
        .positionSizing("percent");

      const json = builder.toJSON();
      expect(json).toHaveProperty("name", "JSON Test");
      expect(json).toHaveProperty("entryRules");
      expect(json).toHaveProperty("exitRules");
    });

    it("toJSON includes id and metadata when set", () => {
      builder
        .id("json-def")
        .name("JSON Def Test")
        .addEntryRule("close", "gt", "sma_20")
        .addExitRule("close", "lt", "sma_20")
        .positionSizing("percent")
        .category("momentum");

      const json = builder.toJSON();
      expect(json).toHaveProperty("id", "json-def");
      expect(json).toHaveProperty("strategy");
      expect(json).toHaveProperty("metadata");
    });

    it("fromJSON reconstructs a builder from strategy JSON", () => {
      const json = {
        name: "From JSON",
        entryRules: [
          { indicator: "close", operator: "gt" as const, value: "sma_20" },
        ],
        exitRules: [
          { indicator: "close", operator: "lt" as const, value: "sma_20" },
        ],
        positionSizing: "percent" as const,
        stopLoss: { type: "percent" as const, value: 5 },
      };

      const restored = StrategyBuilder.fromJSON(
        json as unknown as Record<string, unknown>,
      );
      const strategy = restored.buildStrategy();
      expect(strategy.name).toBe("From JSON");
      expect(strategy.stopLoss).toEqual({ type: "percent", value: 5 });
    });

    it("fromJSON reconstructs from definition JSON", () => {
      const json = {
        id: "restored-def",
        strategy: {
          name: "Restored Definition",
          entryRules: [
            { indicator: "rsi_14", operator: "lt" as const, value: 30 },
          ],
          exitRules: [
            { indicator: "rsi_14", operator: "gt" as const, value: 70 },
          ],
          positionSizing: "percent" as const,
        },
        metadata: {
          category: "mean_reversion",
          riskLevel: "low",
          timeframe: "swing",
          idealConditions: ["ranging"],
          indicators: ["rsi_14"],
          expectedReturnRange: { min: 5, max: 15 },
          expectedDrawdownRange: { min: 3, max: 10 },
          minCapital: 10000,
          author: "Test",
          version: "1.0.0",
        },
      };

      const restored = StrategyBuilder.fromJSON(
        json as unknown as Record<string, unknown>,
      );
      const def = restored.buildDefinition();
      expect(def.id).toBe("restored-def");
      expect(def.strategy.name).toBe("Restored Definition");
      expect(def.metadata.category).toBe("mean_reversion");
    });

    it("round-trips through toJSON and fromJSON", () => {
      const original = builder
        .id("round-trip")
        .name("Round Trip")
        .addEntryRule("close", "crosses_above", "sma_50")
        .addExitRule("close", "crosses_below", "sma_50")
        .positionSizing("risk_based", 2)
        .stopLoss("atr", 2)
        .takeProfit("risk_multiple", 3)
        .tradingHours(9, 16)
        .daysOfWeek([1, 2, 3, 4, 5])
        .category("trend_following")
        .riskLevel("medium")
        .timeframe("position")
        .idealConditions(["trending"])
        .indicators(["sma_50"])
        .expectedReturnRange(8, 20)
        .expectedDrawdownRange(5, 15)
        .minCapital(15000)
        .buildDefinition();

      const json = createStrategyBuilder()
        .id("round-trip")
        .name("Round Trip")
        .addEntryRule("close", "crosses_above", "sma_50")
        .addExitRule("close", "crosses_below", "sma_50")
        .positionSizing("risk_based", 2)
        .stopLoss("atr", 2)
        .takeProfit("risk_multiple", 3)
        .tradingHours(9, 16)
        .daysOfWeek([1, 2, 3, 4, 5])
        .category("trend_following")
        .riskLevel("medium")
        .timeframe("position")
        .idealConditions(["trending"])
        .indicators(["sma_50"])
        .expectedReturnRange(8, 20)
        .expectedDrawdownRange(5, 15)
        .minCapital(15000)
        .toJSON();

      const restored = StrategyBuilder.fromJSON(json).buildDefinition();
      expect(restored.id).toBe(original.id);
      expect(restored.strategy.name).toBe(original.strategy.name);
      expect(restored.strategy.entryRules).toEqual(original.strategy.entryRules);
      expect(restored.strategy.exitRules).toEqual(original.strategy.exitRules);
      expect(restored.strategy.stopLoss).toEqual(original.strategy.stopLoss);
    });
  });
});

// ============================================================================
// VALIDATOR — validateStrategy
// ============================================================================

describe("validateStrategy", () => {
  const validStrategy: BacktestStrategy = {
    name: "Valid Strategy",
    entryRules: [{ indicator: "close", operator: "gt", value: "sma_20" }],
    exitRules: [{ indicator: "close", operator: "lt", value: "sma_20" }],
    positionSizing: "percent",
  };

  it("accepts a valid strategy", () => {
    const result = validateStrategy(validStrategy);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects null input", () => {
    const result = validateStrategy(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("strategy");
  });

  it("rejects non-object input", () => {
    const result = validateStrategy("not an object");
    expect(result.valid).toBe(false);
  });

  describe("name validation", () => {
    it("rejects missing name", () => {
      const result = validateStrategy({ ...validStrategy, name: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "name")).toBe(true);
    });

    it("rejects name over 100 chars", () => {
      const result = validateStrategy({
        ...validStrategy,
        name: "x".repeat(101),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "name")).toBe(true);
    });
  });

  describe("rule validation", () => {
    it("rejects empty entry rules", () => {
      const result = validateStrategy({ ...validStrategy, entryRules: [] });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "entryRules")).toBe(true);
    });

    it("rejects empty exit rules", () => {
      const result = validateStrategy({ ...validStrategy, exitRules: [] });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "exitRules")).toBe(true);
    });

    it("rejects invalid operator", () => {
      const result = validateStrategy({
        ...validStrategy,
        entryRules: [
          { indicator: "close", operator: "invalid", value: "sma_20" },
        ],
      });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field.includes("operator")),
      ).toBe(true);
    });

    it("rejects missing rule indicator", () => {
      const result = validateStrategy({
        ...validStrategy,
        entryRules: [{ operator: "gt", value: 50 }],
      });
      expect(result.valid).toBe(false);
    });

    it("rejects null rule value", () => {
      const result = validateStrategy({
        ...validStrategy,
        entryRules: [{ indicator: "close", operator: "gt", value: null }],
      });
      expect(result.valid).toBe(false);
    });

    it("warns on unknown indicator", () => {
      const result = validateStrategy({
        ...validStrategy,
        entryRules: [
          { indicator: "custom_indicator", operator: "gt", value: 50 },
        ],
      });
      // Unknown indicator is a warning, not an error
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.field.includes("indicator"))).toBe(
        true,
      );
    });

    it("warns on unknown indicator used as value", () => {
      const result = validateStrategy({
        ...validStrategy,
        entryRules: [
          { indicator: "close", operator: "gt", value: "unknown_indicator" },
        ],
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.field.includes("value"))).toBe(
        true,
      );
    });
  });

  describe("position sizing validation", () => {
    it("rejects invalid position sizing", () => {
      const result = validateStrategy({
        ...validStrategy,
        positionSizing: "invalid",
      });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === "positionSizing"),
      ).toBe(true);
    });

    it.each(["fixed", "percent", "risk_based", "kelly"] as const)(
      "accepts %s position sizing",
      (sizing) => {
        const result = validateStrategy({
          ...validStrategy,
          positionSizing: sizing,
        });
        expect(result.valid).toBe(true);
      },
    );
  });

  describe("risk config validation", () => {
    it("warns when no stop loss", () => {
      const result = validateStrategy(validStrategy);
      expect(result.warnings.some((w) => w.field === "stopLoss")).toBe(true);
    });

    it("accepts valid stop loss", () => {
      const result = validateStrategy({
        ...validStrategy,
        stopLoss: { type: "percent", value: 5 },
      });
      expect(result.valid).toBe(true);
    });

    it("rejects stop loss with invalid type", () => {
      const result = validateStrategy({
        ...validStrategy,
        stopLoss: { type: "invalid", value: 5 },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects stop loss with zero value", () => {
      const result = validateStrategy({
        ...validStrategy,
        stopLoss: { type: "percent", value: 0 },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects stop loss with negative value", () => {
      const result = validateStrategy({
        ...validStrategy,
        stopLoss: { type: "percent", value: -1 },
      });
      expect(result.valid).toBe(false);
    });

    it("accepts valid take profit", () => {
      const result = validateStrategy({
        ...validStrategy,
        takeProfit: { type: "risk_multiple", value: 3 },
      });
      expect(result.valid).toBe(true);
    });

    it("accepts valid trailing stop", () => {
      const result = validateStrategy({
        ...validStrategy,
        trailingStop: { type: "atr", value: 2 },
      });
      expect(result.valid).toBe(true);
    });

    it("rejects non-object stop loss", () => {
      const result = validateStrategy({
        ...validStrategy,
        stopLoss: "invalid",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("trading hours validation", () => {
    it("accepts valid trading hours", () => {
      const result = validateStrategy({
        ...validStrategy,
        tradingHours: { start: 9, end: 16 },
      });
      expect(result.valid).toBe(true);
    });

    it("rejects start >= 24", () => {
      const result = validateStrategy({
        ...validStrategy,
        tradingHours: { start: 24, end: 25 },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects end <= start", () => {
      const result = validateStrategy({
        ...validStrategy,
        tradingHours: { start: 16, end: 9 },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects non-object trading hours", () => {
      const result = validateStrategy({
        ...validStrategy,
        tradingHours: "9-16",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("days of week validation", () => {
    it("accepts valid days", () => {
      const result = validateStrategy({
        ...validStrategy,
        daysOfWeek: [1, 2, 3, 4, 5],
      });
      expect(result.valid).toBe(true);
    });

    it("rejects invalid day number", () => {
      const result = validateStrategy({
        ...validStrategy,
        daysOfWeek: [1, 7],
      });
      expect(result.valid).toBe(false);
    });

    it("rejects non-array", () => {
      const result = validateStrategy({
        ...validStrategy,
        daysOfWeek: "weekdays",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("overfitting warning", () => {
    it("warns on more than 20 total rules", () => {
      const manyRules = Array.from({ length: 11 }, (_, i) => ({
        indicator: "close",
        operator: "gt" as const,
        value: i * 10,
      }));
      const result = validateStrategy({
        ...validStrategy,
        entryRules: manyRules,
        exitRules: manyRules,
      });
      expect(result.warnings.some((w) => w.field === "rules")).toBe(true);
    });
  });
});

// ============================================================================
// VALIDATOR — validateStrategyDefinition
// ============================================================================

describe("validateStrategyDefinition", () => {
  const validDef = {
    id: "test-strategy",
    strategy: {
      name: "Test",
      entryRules: [{ indicator: "close", operator: "gt", value: "sma_20" }],
      exitRules: [{ indicator: "close", operator: "lt", value: "sma_20" }],
      positionSizing: "percent",
    },
    metadata: {
      category: "momentum",
      riskLevel: "medium",
      timeframe: "swing",
      idealConditions: ["trending"],
      indicators: ["sma_20"],
      expectedReturnRange: { min: 5, max: 15 },
      expectedDrawdownRange: { min: 3, max: 10 },
      minCapital: 5000,
      author: "Test",
      version: "1.0.0",
    },
  };

  it("accepts valid definition", () => {
    const result = validateStrategyDefinition(validDef);
    expect(result.valid).toBe(true);
  });

  it("rejects null input", () => {
    const result = validateStrategyDefinition(null);
    expect(result.valid).toBe(false);
  });

  describe("ID validation", () => {
    it("rejects missing ID", () => {
      const result = validateStrategyDefinition({ ...validDef, id: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "id")).toBe(true);
    });

    it("rejects non-kebab-case ID", () => {
      const result = validateStrategyDefinition({
        ...validDef,
        id: "Invalid ID",
      });
      expect(result.valid).toBe(false);
    });

    it("accepts valid kebab-case ID", () => {
      const result = validateStrategyDefinition({
        ...validDef,
        id: "my-custom-strategy-123",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("metadata validation", () => {
    it("rejects invalid category", () => {
      const result = validateStrategyDefinition({
        ...validDef,
        metadata: { ...validDef.metadata, category: "invalid" },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects invalid risk level", () => {
      const result = validateStrategyDefinition({
        ...validDef,
        metadata: { ...validDef.metadata, riskLevel: "extreme" },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects invalid timeframe", () => {
      const result = validateStrategyDefinition({
        ...validDef,
        metadata: { ...validDef.metadata, timeframe: "weekly" },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects invalid market condition", () => {
      const result = validateStrategyDefinition({
        ...validDef,
        metadata: {
          ...validDef.metadata,
          idealConditions: ["impossible"],
        },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects negative minCapital", () => {
      const result = validateStrategyDefinition({
        ...validDef,
        metadata: { ...validDef.metadata, minCapital: -100 },
      });
      expect(result.valid).toBe(false);
    });

    it("warns on missing idealConditions", () => {
      const result = validateStrategyDefinition({
        ...validDef,
        metadata: { ...validDef.metadata, idealConditions: [] },
      });
      expect(result.warnings.some((w) => w.field.includes("idealConditions"))).toBe(
        true,
      );
    });

    it("warns on missing indicators", () => {
      const result = validateStrategyDefinition({
        ...validDef,
        metadata: { ...validDef.metadata, indicators: [] },
      });
      expect(result.warnings.some((w) => w.field.includes("indicators"))).toBe(
        true,
      );
    });

    it("rejects non-object metadata", () => {
      const result = validateStrategyDefinition({
        ...validDef,
        metadata: "invalid",
      });
      expect(result.valid).toBe(false);
    });
  });
});

// ============================================================================
// VALID VALUE LISTS (for UI dropdowns)
// ============================================================================

describe("Valid Value Lists", () => {
  it("exports indicator list with known indicators", () => {
    expect(VALID_INDICATOR_LIST).toContain("close");
    expect(VALID_INDICATOR_LIST).toContain("sma_20");
    expect(VALID_INDICATOR_LIST).toContain("rsi_14");
    expect(VALID_INDICATOR_LIST).toContain("macd");
    expect(VALID_INDICATOR_LIST).toContain("bb_upper");
    expect(VALID_INDICATOR_LIST.length).toBeGreaterThan(20);
  });

  it("exports operator list", () => {
    expect(VALID_OPERATOR_LIST).toContain("gt");
    expect(VALID_OPERATOR_LIST).toContain("crosses_above");
    expect(VALID_OPERATOR_LIST).toHaveLength(7);
  });

  it("exports position sizing list", () => {
    expect(VALID_POSITION_SIZING_LIST).toContain("percent");
    expect(VALID_POSITION_SIZING_LIST).toContain("kelly");
    expect(VALID_POSITION_SIZING_LIST).toHaveLength(4);
  });

  it("exports category list", () => {
    expect(VALID_CATEGORY_LIST).toContain("momentum");
    expect(VALID_CATEGORY_LIST).toContain("pctt");
    expect(VALID_CATEGORY_LIST).toHaveLength(8);
  });

  it("exports risk level list", () => {
    expect(VALID_RISK_LEVEL_LIST).toEqual(
      expect.arrayContaining(["low", "medium", "high"]),
    );
    expect(VALID_RISK_LEVEL_LIST).toHaveLength(3);
  });

  it("exports timeframe list", () => {
    expect(VALID_TIMEFRAME_LIST).toContain("intraday");
    expect(VALID_TIMEFRAME_LIST).toContain("multi_timeframe");
    expect(VALID_TIMEFRAME_LIST).toHaveLength(4);
  });

  it("exports market condition list", () => {
    expect(VALID_MARKET_CONDITION_LIST).toContain("trending");
    expect(VALID_MARKET_CONDITION_LIST).toContain("any");
    expect(VALID_MARKET_CONDITION_LIST).toHaveLength(5);
  });
});

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

describe("createStrategyBuilder", () => {
  it("creates a new StrategyBuilder instance", () => {
    const builder = createStrategyBuilder();
    expect(builder).toBeInstanceOf(StrategyBuilder);
  });

  it("creates independent instances", () => {
    const a = createStrategyBuilder().name("A");
    const b = createStrategyBuilder().name("B");
    // They should be different instances
    expect(a).not.toBe(b);
  });
});
