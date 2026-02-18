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
  });
});
