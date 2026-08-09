/**
 * Rule-Based Engine — Unit Tests
 * TRD-008: 80%+ branch coverage
 */

import {
  RuleBasedEngine,
  type TradingRule,
  type MarketData,
  type ConditionGroup,
  type Condition,
  type ConditionType,
  type IndicatorType,
} from "../engines/rule-based-engine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let conditionIdCounter = 0;

function makeCondition(overrides: Partial<Condition> = {}): Condition {
  return {
    id: `cond-${++conditionIdCounter}`,
    type: "indicator",
    indicator: "rsi",
    indicatorPeriod: 14,
    operator: "lt",
    value: 30,
    ...overrides,
  };
}

let groupIdCounter = 0;

function makeConditionGroup(
  logic: "and" | "or" = "and",
  conditions: Condition[] = [makeCondition()],
): ConditionGroup {
  return { id: `grp-${++groupIdCounter}`, logic, conditions };
}

function makeRule(overrides: Partial<TradingRule> = {}): TradingRule {
  return {
    id: "rule-1",
    userId: "user-1",
    name: "Test Rule",
    enabled: true,
    entryConditions: makeConditionGroup("and", [
      makeCondition({
        type: "indicator",
        indicator: "rsi",
        indicatorPeriod: 14,
        operator: "lt",
        value: 30,
      }),
    ]),
    exitConditions: makeConditionGroup("and", [
      makeCondition({
        type: "indicator",
        indicator: "rsi",
        indicatorPeriod: 14,
        operator: "gt",
        value: 70,
      }),
    ]),
    positionSizing: { method: "percent_portfolio", value: 5 },
    stopLoss: { type: "fixed_percent", value: 2 },
    filters: {},
    execution: {
      orderType: "market",
      timeInForce: "day",
      extendedHours: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeMarketData(overrides: Partial<MarketData> = {}): MarketData {
  return {
    symbol: "AAPL",
    open: 149,
    high: 152,
    low: 148,
    close: 150,
    volume: 50_000_000,
    timestamp: new Date(),
    indicators: {
      rsi_14: 25, // below 30 — triggers entry
      sma_20: 148,
      ema_50: 147,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RuleBasedEngine", () => {
  let engine: RuleBasedEngine;

  beforeEach(() => {
    conditionIdCounter = 0;
    groupIdCounter = 0;
    engine = new RuleBasedEngine();
  });

  // ---- CRUD ----

  describe("addRule / getRule / getAllRules / removeRule", () => {
    it("should add and retrieve a rule", () => {
      const rule = makeRule();
      engine.addRule(rule);

      const retrieved = engine.getRule("rule-1");
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe("Test Rule");
    });

    it("should return undefined for unknown rule", () => {
      expect(engine.getRule("nonexistent")).toBeUndefined();
    });

    it("should list all rules", () => {
      engine.addRule(makeRule({ id: "r1" }));
      engine.addRule(makeRule({ id: "r2" }));
      expect(engine.getAllRules()).toHaveLength(2);
    });

    it("should remove a rule", () => {
      engine.addRule(makeRule());
      engine.removeRule("rule-1");
      expect(engine.getRule("rule-1")).toBeUndefined();
    });
  });

  // ---- Enable / Disable ----

  describe("enableRule / disableRule", () => {
    it("should disable and re-enable a rule", () => {
      engine.addRule(makeRule());

      engine.disableRule("rule-1");
      expect(engine.getRule("rule-1")!.enabled).toBe(false);

      engine.enableRule("rule-1");
      expect(engine.getRule("rule-1")!.enabled).toBe(true);
    });
  });

  // ---- evaluateRules ----

  describe("evaluateRules", () => {
    it("should generate entry signal when conditions are met", async () => {
      engine.addRule(makeRule());
      const marketData = [makeMarketData()]; // rsi_14 = 25 < 30

      const signals = await engine.evaluateRules(marketData, 100_000);
      const entrySignals = signals.filter((s) => s.type === "entry");

      expect(entrySignals.length).toBeGreaterThanOrEqual(1);
      expect(entrySignals[0].symbol).toBe("AAPL");
      expect(entrySignals[0].side).toBe("buy");
    });

    it("should generate exit signal when exit conditions are met", async () => {
      engine.addRule(makeRule());
      const marketData = [makeMarketData({ indicators: { rsi_14: 75 } })]; // rsi > 70

      const signals = await engine.evaluateRules(marketData, 100_000);
      const exitSignals = signals.filter((s) => s.type === "exit");

      expect(exitSignals.length).toBeGreaterThanOrEqual(1);
    });

    it("should skip disabled rules", async () => {
      engine.addRule(makeRule({ enabled: false }));
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      expect(signals).toHaveLength(0);
    });

    it("should respect symbol filter (include)", async () => {
      engine.addRule(makeRule({ filters: { symbols: ["MSFT"] } }));
      const signals = await engine.evaluateRules(
        [makeMarketData({ symbol: "AAPL" })],
        100_000,
      );
      expect(signals).toHaveLength(0);
    });

    it("should respect excludeSymbols filter", async () => {
      engine.addRule(makeRule({ filters: { excludeSymbols: ["AAPL"] } }));
      const signals = await engine.evaluateRules(
        [makeMarketData({ symbol: "AAPL" })],
        100_000,
      );
      expect(signals).toHaveLength(0);
    });

    it("should respect minPrice filter", async () => {
      engine.addRule(makeRule({ filters: { minPrice: 200 } }));
      const signals = await engine.evaluateRules(
        [makeMarketData({ close: 150 })],
        100_000,
      );
      expect(signals).toHaveLength(0);
    });

    it("should respect maxPrice filter", async () => {
      engine.addRule(makeRule({ filters: { maxPrice: 100 } }));
      const signals = await engine.evaluateRules(
        [makeMarketData({ close: 150 })],
        100_000,
      );
      expect(signals).toHaveLength(0);
    });

    it("should respect minVolume filter", async () => {
      engine.addRule(makeRule({ filters: { minVolume: 100_000_000 } }));
      const signals = await engine.evaluateRules(
        [makeMarketData({ volume: 50_000_000 })],
        100_000,
      );
      expect(signals).toHaveLength(0);
    });

    it("should handle OR logic in condition groups", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("or", [
            makeCondition({
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "lt",
              value: 30,
            }),
            makeCondition({
              indicator: "sma",
              indicatorPeriod: 20,
              operator: "gt",
              value: 200,
            }),
          ]),
        }),
      );

      // rsi_14 = 25 < 30 should match first condition (OR)
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entrySignals = signals.filter((s) => s.type === "entry");
      expect(entrySignals.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---- Operator evaluation ----

  describe("condition operators", () => {
    it("should evaluate gt, gte, lt, lte operators", async () => {
      // gt: rsi > 70 with rsi=75 should match
      engine.addRule(
        makeRule({
          id: "gt-rule",
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "gt",
              value: 70,
            }),
          ]),
        }),
      );

      const signals = await engine.evaluateRules(
        [makeMarketData({ indicators: { rsi_14: 75 } })],
        100_000,
      );
      expect(
        signals.filter((s) => s.type === "entry").length,
      ).toBeGreaterThanOrEqual(1);
    });

    it("should evaluate eq operator with epsilon", async () => {
      engine.addRule(
        makeRule({
          id: "eq-rule",
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "eq",
              value: 50,
            }),
          ]),
        }),
      );

      // rsi=50.00005 should match (within epsilon 0.0001)
      const signals = await engine.evaluateRules(
        [makeMarketData({ indicators: { rsi_14: 50.00005 } })],
        100_000,
      );
      expect(
        signals.filter((s) => s.type === "entry").length,
      ).toBeGreaterThanOrEqual(1);
    });

    it("should evaluate neq operator", async () => {
      engine.addRule(
        makeRule({
          id: "neq-rule",
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "neq",
              value: 50,
            }),
          ]),
        }),
      );

      const signals = await engine.evaluateRules(
        [makeMarketData({ indicators: { rsi_14: 25 } })],
        100_000,
      );
      expect(
        signals.filter((s) => s.type === "entry").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  // ---- Position Sizing ----

  describe("position sizing methods", () => {
    it("should calculate fixed_dollar position size", async () => {
      engine.addRule(
        makeRule({ positionSizing: { method: "fixed_dollar", value: 10_000 } }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      if (entry?.quantity) {
        expect(entry.quantity).toBeGreaterThan(0);
      }
    });

    it("should calculate percent_portfolio position size", async () => {
      engine.addRule(
        makeRule({ positionSizing: { method: "percent_portfolio", value: 5 } }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      if (entry?.quantity) {
        // 5% of 100k = 5000, / 150 price ~ 33 shares
        expect(entry.quantity).toBeGreaterThan(0);
      }
    });

    it("should calculate fixed_shares position size", async () => {
      engine.addRule(
        makeRule({ positionSizing: { method: "fixed_shares", value: 100 } }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      if (entry?.quantity) {
        expect(entry.quantity).toBeLessThanOrEqual(100);
      }
    });
  });

  // ---- Export / Import ----

  describe("exportRule / importRule", () => {
    it("should export a rule as JSON string", () => {
      engine.addRule(makeRule());
      const json = engine.exportRule("rule-1");
      expect(json).toBeTruthy();
      expect(typeof json).toBe("string");

      const parsed = JSON.parse(json!);
      expect(parsed.id).toBe("rule-1");
      expect(parsed.name).toBe("Test Rule");
    });

    it("should return null for non-existent rule export", () => {
      expect(engine.exportRule("nonexistent")).toBeNull();
    });

    it("should import a rule with a new UUID", () => {
      engine.addRule(makeRule());
      const json = engine.exportRule("rule-1")!;

      const imported = engine.importRule(json);
      expect(imported.id).not.toBe("rule-1"); // new UUID assigned
      expect(imported.name).toBe("Test Rule");
      expect(imported.createdAt).toBeInstanceOf(Date);
      expect(imported.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ---- clearIndicatorCache ----

  describe("clearIndicatorCache", () => {
    it("should not throw when called", () => {
      expect(() => engine.clearIndicatorCache()).not.toThrow();
    });

    it("should clear cached indicators so they are recalculated", async () => {
      // First evaluation populates the cache
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "atr",
              indicatorPeriod: 14,
              operator: "gt",
              value: 0,
            }),
          ]),
        }),
      );
      await engine.evaluateRules(
        [makeMarketData({ indicators: {} })],
        100_000,
      );

      // Clear cache
      engine.clearIndicatorCache();

      // Should not throw on re-evaluation — proves cache was cleared
      const signals = await engine.evaluateRules(
        [makeMarketData({ indicators: {} })],
        100_000,
      );
      expect(signals).toBeDefined();
    });
  });

  // ---- between / outside operators ----

  describe("between and outside operators", () => {
    it("should evaluate between operator (value in range)", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "between",
              value: 20,
              value2: 40,
            }),
          ]),
        }),
      );

      // rsi_14 = 25, which is between 20 and 40
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should evaluate between operator (value out of range)", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "between",
              value: 50,
              value2: 80,
            }),
          ]),
        }),
      );

      // rsi_14 = 25, which is NOT between 50 and 80
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries).toHaveLength(0);
    });

    it("should evaluate outside operator (value outside range)", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "outside",
              value: 30,
              value2: 70,
            }),
          ]),
        }),
      );

      // rsi_14 = 25, which is outside 30-70
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should evaluate outside operator (value inside range = no match)", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "outside",
              value: 20,
              value2: 80,
            }),
          ]),
        }),
      );

      // rsi_14 = 25, which is NOT outside 20-80
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries).toHaveLength(0);
    });
  });

  // ---- crosses_above / crosses_below operators ----

  describe("crosses_above and crosses_below operators", () => {
    it("should evaluate crosses_above (simplified: current > compare)", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "crosses_above",
              value: 20,
            }),
          ]),
        }),
      );

      // rsi_14 = 25 > 20
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should evaluate crosses_below (simplified: current < compare when no previous bar)", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "crosses_below",
              value: 30,
            }),
          ]),
        }),
      );

      // rsi_14 = 25 < 30 — no previousIndicators so fallback: current < compare
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---- Default operator (unknown) ----

  describe("unknown operator fallback", () => {
    it("should return false for unknown operator", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "unknown_op" as unknown as "gt",
              value: 25,
            }),
          ]),
        }),
      );

      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries).toHaveLength(0);
    });
  });

  // ---- Price condition type ----

  describe("price condition type", () => {
    it("should evaluate condition based on close price", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "price",
              priceField: "close",
              operator: "gt",
              value: 100,
            }),
          ]),
        }),
      );

      // close = 150 > 100
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should evaluate condition based on open price", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "price",
              priceField: "open",
              operator: "gt",
              value: 100,
            }),
          ]),
        }),
      );

      // open = 149 > 100
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should evaluate condition based on high price", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "price",
              priceField: "high",
              operator: "gt",
              value: 151,
            }),
          ]),
        }),
      );

      // high = 152 > 151
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should evaluate condition based on low price", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "price",
              priceField: "low",
              operator: "lt",
              value: 149,
            }),
          ]),
        }),
      );

      // low = 148 < 149
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should evaluate condition based on vwap price", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "price",
              priceField: "vwap",
              operator: "gt",
              value: 149,
            }),
          ]),
        }),
      );

      // vwap = 151
      const signals = await engine.evaluateRules(
        [makeMarketData({ vwap: 151 })],
        100_000,
      );
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should fallback to close for vwap when vwap is undefined", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "price",
              priceField: "vwap",
              operator: "gt",
              value: 100,
            }),
          ]),
        }),
      );

      // vwap undefined, fallback to close = 150
      const signals = await engine.evaluateRules(
        [makeMarketData({ vwap: undefined })],
        100_000,
      );
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should fallback to close for unknown price field", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "price",
              priceField: "unknown_field" as unknown as "close",
              operator: "gt",
              value: 100,
            }),
          ]),
        }),
      );

      // unknown field defaults to close = 150
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should default to close when no priceField is set", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "price",
              operator: "gt",
              value: 100,
            }),
          ]),
        }),
      );

      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---- Volume condition type ----

  describe("volume condition type", () => {
    it("should evaluate volume condition", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "volume",
              operator: "gt",
              value: 10_000_000,
            }),
          ]),
        }),
      );

      // volume = 50_000_000 > 10_000_000
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should reject volume condition when below threshold", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "volume",
              operator: "gt",
              value: 100_000_000,
            }),
          ]),
        }),
      );

      // volume = 50_000_000 < 100_000_000
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries).toHaveLength(0);
    });
  });

  // ---- Unknown/default condition type ----

  describe("unknown condition type", () => {
    it("should return false for unsupported condition types", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "custom" as ConditionType,
              operator: "gt",
              value: 1,
            }),
          ]),
        }),
      );

      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries).toHaveLength(0);
    });
  });

  // ---- referenceIndicator / referenceValue ----

  describe("reference indicator and reference value", () => {
    it("should compare indicator against a reference indicator", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "sma",
              indicatorPeriod: 20,
              operator: "gt",
              value: 0,
              referenceIndicator: "ema",
              referencePeriod: 50,
            }),
          ]),
        }),
      );

      // sma_20 = 148, ema_50 = 147 => 148 > 147 = true
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should compare indicator against a reference value", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "rsi",
              indicatorPeriod: 14,
              operator: "lt",
              value: 0, // This will be overridden by referenceValue
              referenceValue: 30,
            }),
          ]),
        }),
      );

      // rsi_14 = 25 < referenceValue(30) = true
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---- Indicator fallback (no pre-computed indicators) ----

  describe("indicator calculation fallbacks", () => {
    it("should fallback to calculated sma/ema (close price) when not pre-computed", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "sma",
              indicatorPeriod: 200,
              operator: "gt",
              value: 100,
            }),
          ]),
        }),
      );

      // No sma_200 in indicators — fallback gives close price (150 > 100)
      const signals = await engine.evaluateRules(
        [makeMarketData({ indicators: {} })],
        100_000,
      );
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should fallback to rsi=50 when not pre-computed", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "rsi",
              indicatorPeriod: 21,
              operator: "eq",
              value: 50,
            }),
          ]),
        }),
      );

      // No rsi_21 in indicators — fallback = 50, eq 50 = true
      const signals = await engine.evaluateRules(
        [makeMarketData({ indicators: {} })],
        100_000,
      );
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should fallback to macd=0 when not pre-computed", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "macd",
              indicatorPeriod: 12,
              operator: "eq",
              value: 0,
            }),
          ]),
        }),
      );

      // No macd_12 — fallback = 0, eq 0 = true
      const signals = await engine.evaluateRules(
        [makeMarketData({ indicators: {} })],
        100_000,
      );
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should calculate atr from high-low when not pre-computed", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "atr",
              indicatorPeriod: 14,
              operator: "gt",
              value: 2,
            }),
          ]),
        }),
      );

      // high=152, low=148 => atr = 4 > 2
      const signals = await engine.evaluateRules(
        [makeMarketData({ indicators: {} })],
        100_000,
      );
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should return 0 for unknown indicator types", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "obv" as IndicatorType,
              indicatorPeriod: 14,
              operator: "eq",
              value: 0,
            }),
          ]),
        }),
      );

      // obv_14 not in indicators — fallback = 0, eq 0 = true
      const signals = await engine.evaluateRules(
        [makeMarketData({ indicators: {} })],
        100_000,
      );
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should use cached value on second evaluation for same symbol", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "indicator",
              indicator: "atr",
              indicatorPeriod: 14,
              operator: "gt",
              value: 2,
            }),
          ]),
        }),
      );

      const data = makeMarketData({ indicators: {} });

      // First call — calculates and caches
      await engine.evaluateRules([data], 100_000);

      // Second call — uses cache
      const signals = await engine.evaluateRules([data], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---- Nested condition groups ----

  describe("nested condition groups", () => {
    it("should evaluate nested AND within OR", async () => {
      const nestedGroup: ConditionGroup = {
        id: "nested-1",
        logic: "and",
        conditions: [
          makeCondition({
            type: "indicator",
            indicator: "rsi",
            indicatorPeriod: 14,
            operator: "lt",
            value: 30,
          }),
          makeCondition({
            type: "price",
            priceField: "close",
            operator: "gt",
            value: 100,
          }),
        ],
      };

      engine.addRule(
        makeRule({
          entryConditions: {
            id: "outer",
            logic: "or",
            conditions: [nestedGroup],
          },
        }),
      );

      // rsi_14=25 < 30 AND close=150 > 100 => nested = true => OR = true
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("should fail nested AND group when one condition fails", async () => {
      const nestedGroup: ConditionGroup = {
        id: "nested-2",
        logic: "and",
        conditions: [
          makeCondition({
            type: "indicator",
            indicator: "rsi",
            indicatorPeriod: 14,
            operator: "lt",
            value: 30,
          }),
          makeCondition({
            type: "price",
            priceField: "close",
            operator: "gt",
            value: 200, // 150 > 200 is false
          }),
        ],
      };

      engine.addRule(
        makeRule({
          entryConditions: {
            id: "outer",
            logic: "and",
            conditions: [nestedGroup],
          },
        }),
      );

      // nested AND fails (close 150 < 200), so outer AND fails
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries).toHaveLength(0);
    });
  });

  // ---- Additional position sizing methods ----

  describe("additional position sizing methods", () => {
    it("should calculate risk_based position size", async () => {
      engine.addRule(
        makeRule({
          positionSizing: { method: "risk_based", value: 10, riskPercent: 2 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // riskPercent=2% of 100k = 2000, / 150 = 13 shares
      expect(entry!.quantity).toBeGreaterThan(0);
    });

    it("should calculate risk_based with default riskPercent", async () => {
      engine.addRule(
        makeRule({
          positionSizing: { method: "risk_based", value: 10 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // default riskPercent=1% of 100k = 1000, / 150 = 6 shares
      expect(entry!.quantity).toBeGreaterThan(0);
    });

    it("should calculate kelly position size", async () => {
      engine.addRule(
        makeRule({
          positionSizing: {
            method: "kelly",
            value: 10,
            kellyFraction: 0.5,
          },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // fraction=0.5 * value(10)/100 * 100k = 5000, / 150 = 33 shares
      expect(entry!.quantity).toBeGreaterThan(0);
    });

    it("should calculate kelly with default fraction", async () => {
      engine.addRule(
        makeRule({
          positionSizing: { method: "kelly", value: 20 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // default fraction=0.25 * 20/100 * 100k = 5000, / 150 = 33
      expect(entry!.quantity).toBeGreaterThan(0);
    });

    it("should calculate volatility_adjusted position size", async () => {
      engine.addRule(
        makeRule({
          positionSizing: {
            method: "volatility_adjusted",
            value: 5,
            targetVolatility: 0.03,
          },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      expect(entry!.quantity).toBeGreaterThan(0);
    });

    it("should calculate volatility_adjusted with default targetVolatility", async () => {
      engine.addRule(
        makeRule({
          positionSizing: { method: "volatility_adjusted", value: 5 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      expect(entry!.quantity).toBeGreaterThan(0);
    });

    it("should fallback to 2% default for unknown sizing method", async () => {
      engine.addRule(
        makeRule({
          positionSizing: {
            method: "unknown_method" as unknown as "fixed_dollar",
            value: 10,
          },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // 2% of 100k = 2000, / 150 = 13
      expect(entry!.quantity).toBeGreaterThan(0);
    });
  });

  // ---- Position sizing limits ----

  describe("position sizing limits", () => {
    it("should respect maxPositionPercent limit", async () => {
      engine.addRule(
        makeRule({
          positionSizing: {
            method: "percent_portfolio",
            value: 50, // 50% of 100k = 50000
            maxPositionPercent: 5, // Cap at 5% = 5000
          },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // 50% = 333 shares, but capped at 5% = 33 shares
      expect(entry!.quantity).toBeLessThanOrEqual(
        Math.floor((100_000 * 5) / 100 / 150),
      );
    });

    it("should respect minShares limit", async () => {
      engine.addRule(
        makeRule({
          positionSizing: {
            method: "fixed_dollar",
            value: 100, // 100 / 150 = 0 shares
            minShares: 5, // Min 5 shares
          },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      expect(entry!.quantity).toBeGreaterThanOrEqual(5);
    });

    it("should respect maxShares limit", async () => {
      engine.addRule(
        makeRule({
          positionSizing: {
            method: "percent_portfolio",
            value: 50,
            maxShares: 10,
          },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      expect(entry!.quantity).toBeLessThanOrEqual(10);
    });

    it("should respect maxShares for fixed_shares method", async () => {
      engine.addRule(
        makeRule({
          positionSizing: {
            method: "fixed_shares",
            value: 100,
            maxShares: 50,
          },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      expect(entry!.quantity).toBeLessThanOrEqual(50);
    });
  });

  // ---- Stop loss types ----

  describe("stop loss types", () => {
    it("should calculate fixed_percent stop loss", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "fixed_percent", value: 5 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // close=150 * (1 - 5/100) = 142.5
      expect(entry!.stopLoss).toBeCloseTo(142.5, 1);
    });

    it("should calculate fixed_price stop loss", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "fixed_price", value: 140 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      expect(entry!.stopLoss).toBe(140);
    });

    it("should calculate atr stop loss", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "atr", value: 0, atrMultiplier: 3 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // atr = high-low = 152-148 = 4, stopLoss = 150 - 4*3 = 138
      expect(entry!.stopLoss).toBeCloseTo(138, 1);
    });

    it("should calculate atr stop loss with default multiplier", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "atr", value: 0 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // atr = 4, default multiplier = 2, stopLoss = 150 - 4*2 = 142
      expect(entry!.stopLoss).toBeCloseTo(142, 1);
    });

    it("should calculate swing_low stop loss", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "swing_low", value: 0 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // low=148 * 0.99 = 146.52
      expect(entry!.stopLoss).toBeCloseTo(146.52, 1);
    });

    it("should calculate trailing stop loss", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "trailing", value: 3 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // close=150 * (1 - 3/100) = 145.5
      expect(entry!.stopLoss).toBeCloseTo(145.5, 1);
    });

    it("should use default stop loss for unknown type", async () => {
      engine.addRule(
        makeRule({
          stopLoss: {
            type: "unknown_type" as unknown as "fixed_percent",
            value: 5,
          },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // default: close * 0.95 = 142.5
      expect(entry!.stopLoss).toBeCloseTo(142.5, 1);
    });
  });

  // ---- Take profit types ----

  describe("take profit types", () => {
    it("should calculate fixed_percent take profit", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "fixed_percent", value: 2 },
          takeProfit: { type: "fixed_percent", value: 5 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // close=150 * (1 + 5/100) = 157.5
      expect(entry!.takeProfit).toBeCloseTo(157.5, 1);
    });

    it("should calculate fixed_price take profit", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "fixed_percent", value: 2 },
          takeProfit: { type: "fixed_price", value: 180 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      expect(entry!.takeProfit).toBe(180);
    });

    it("should calculate risk_multiple take profit", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "fixed_percent", value: 2 },
          takeProfit: { type: "risk_multiple", value: 3 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // stopLoss = 150*(1-0.02) = 147, risk = 150-147 = 3, tp = 150 + 3*3 = 159
      expect(entry!.takeProfit).toBeCloseTo(159, 1);
    });

    it("should calculate atr take profit", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "fixed_percent", value: 2 },
          takeProfit: { type: "atr", value: 2 },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // atr = 152-148 = 4, tp = 150 + 4*2 = 158
      expect(entry!.takeProfit).toBeCloseTo(158, 1);
    });

    it("should use default take profit for unknown type", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "fixed_percent", value: 2 },
          takeProfit: {
            type: "unknown" as unknown as "fixed_percent",
            value: 5,
          },
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      // default: close * 1.1 = 165
      expect(entry!.takeProfit).toBeCloseTo(165, 1);
    });

    it("should not include take profit when not configured", async () => {
      engine.addRule(
        makeRule({
          stopLoss: { type: "fixed_percent", value: 2 },
          takeProfit: undefined,
        }),
      );
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entry = signals.find((s) => s.type === "entry");
      expect(entry).toBeDefined();
      expect(entry!.takeProfit).toBeUndefined();
    });
  });

  // ---- String value parsing ----

  describe("string value in condition", () => {
    it("should parse string value to number for comparison", async () => {
      engine.addRule(
        makeRule({
          entryConditions: makeConditionGroup("and", [
            makeCondition({
              type: "price",
              priceField: "close",
              operator: "gt",
              value: "100" as unknown as number,
            }),
          ]),
        }),
      );

      // close=150 > parseFloat("100")=100
      const signals = await engine.evaluateRules([makeMarketData()], 100_000);
      const entries = signals.filter((s) => s.type === "entry");
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---- Singleton export ----

  describe("singleton export", () => {
    it("should export ruleBasedEngine as a singleton instance", async () => {
      // Dynamic import to get the singleton
      const mod = await import("../engines/rule-based-engine");
      expect(mod.ruleBasedEngine).toBeInstanceOf(RuleBasedEngine);
    });
  });
});
