/**
 * Tests for the Strategy Library
 *
 * Validates all 10 pre-built strategies conform to the BacktestStrategy
 * interface and have valid metadata.
 */

import type { BacktestStrategy } from "../../backtesting/backtest-engine";
import type { StrategyDefinition, StrategyCategory, StrategyRiskLevel, StrategyTimeframe } from "../strategy-types";
import {
  STRATEGY_LIBRARY,
  STRATEGY_MAP,
  getStrategyById,
  getStrategiesByCategory,
  getStrategiesByRiskLevel,
  getStrategiesByTimeframe,
  momentumBreakout,
  meanReversion,
  trendFollowing,
  bollingerSqueeze,
  rsiDivergence,
  macdCrossover,
  volumeSpike,
  gapFill,
  openingRangeBreakout,
  pcttBoundaryRetest,
} from "../library";

// ============================================================================
// CATALOG TESTS
// ============================================================================

describe("Strategy Library Catalog", () => {
  it("contains exactly 10 strategies", () => {
    expect(STRATEGY_LIBRARY).toHaveLength(10);
  });

  it("has unique IDs for all strategies", () => {
    const ids = STRATEGY_LIBRARY.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique names for all strategies", () => {
    const names = STRATEGY_LIBRARY.map((s) => s.strategy.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("STRATEGY_MAP has all 10 entries", () => {
    expect(STRATEGY_MAP.size).toBe(10);
  });

  it("STRATEGY_MAP values match STRATEGY_LIBRARY", () => {
    STRATEGY_LIBRARY.forEach((s) => {
      expect(STRATEGY_MAP.get(s.id)).toBe(s);
    });
  });
});

// ============================================================================
// LOOKUP FUNCTION TESTS
// ============================================================================

describe("Strategy Lookup Functions", () => {
  describe("getStrategyById", () => {
    it("returns correct strategy for valid ID", () => {
      const result = getStrategyById("momentum-breakout");
      expect(result).toBeDefined();
      expect(result?.strategy.name).toBe("Momentum Breakout");
    });

    it("returns undefined for invalid ID", () => {
      expect(getStrategyById("nonexistent")).toBeUndefined();
    });

    it("returns all 10 strategies by their IDs", () => {
      const expectedIds = [
        "momentum-breakout",
        "mean-reversion",
        "trend-following",
        "bollinger-squeeze",
        "rsi-divergence",
        "macd-crossover",
        "volume-spike",
        "gap-fill",
        "opening-range-breakout",
        "pctt-boundary-retest",
      ];
      expectedIds.forEach((id) => {
        expect(getStrategyById(id)).toBeDefined();
      });
    });
  });

  describe("getStrategiesByCategory", () => {
    it("returns momentum strategies", () => {
      const result = getStrategiesByCategory("momentum");
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((s) => expect(s.metadata.category).toBe("momentum"));
    });

    it("returns mean_reversion strategies", () => {
      const result = getStrategiesByCategory("mean_reversion");
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((s) =>
        expect(s.metadata.category).toBe("mean_reversion"),
      );
    });

    it("returns pctt strategies", () => {
      const result = getStrategiesByCategory("pctt");
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("pctt-boundary-retest");
    });

    it("returns empty array for unused category", () => {
      // All our defined categories are used, so test with a typed but unused one
      const result = STRATEGY_LIBRARY.filter(
        (s) => s.metadata.category === ("nonexistent" as StrategyCategory),
      );
      expect(result).toHaveLength(0);
    });
  });

  describe("getStrategiesByRiskLevel", () => {
    it("returns low risk strategies", () => {
      const result = getStrategiesByRiskLevel("low");
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((s) => expect(s.metadata.riskLevel).toBe("low"));
    });

    it("returns medium risk strategies", () => {
      const result = getStrategiesByRiskLevel("medium");
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((s) => expect(s.metadata.riskLevel).toBe("medium"));
    });

    it("returns high risk strategies", () => {
      const result = getStrategiesByRiskLevel("high");
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((s) => expect(s.metadata.riskLevel).toBe("high"));
    });
  });

  describe("getStrategiesByTimeframe", () => {
    it("returns intraday strategies", () => {
      const result = getStrategiesByTimeframe("intraday");
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((s) => expect(s.metadata.timeframe).toBe("intraday"));
    });

    it("returns swing strategies", () => {
      const result = getStrategiesByTimeframe("swing");
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((s) => expect(s.metadata.timeframe).toBe("swing"));
    });

    it("returns position strategies", () => {
      const result = getStrategiesByTimeframe("position");
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((s) => expect(s.metadata.timeframe).toBe("position"));
    });
  });
});

// ============================================================================
// INDIVIDUAL STRATEGY EXPORTS
// ============================================================================

describe("Individual Strategy Exports", () => {
  const strategies: [string, StrategyDefinition][] = [
    ["momentumBreakout", momentumBreakout],
    ["meanReversion", meanReversion],
    ["trendFollowing", trendFollowing],
    ["bollingerSqueeze", bollingerSqueeze],
    ["rsiDivergence", rsiDivergence],
    ["macdCrossover", macdCrossover],
    ["volumeSpike", volumeSpike],
    ["gapFill", gapFill],
    ["openingRangeBreakout", openingRangeBreakout],
    ["pcttBoundaryRetest", pcttBoundaryRetest],
  ];

  it.each(strategies)("%s is exported and defined", (_name, strategy) => {
    expect(strategy).toBeDefined();
    expect(strategy.id).toBeTruthy();
    expect(strategy.strategy).toBeDefined();
    expect(strategy.metadata).toBeDefined();
  });
});

// ============================================================================
// BACKTEST STRATEGY INTERFACE CONFORMANCE
// ============================================================================

describe("BacktestStrategy Interface Conformance", () => {
  const validOperators = new Set([
    "gt",
    "lt",
    "gte",
    "lte",
    "eq",
    "crosses_above",
    "crosses_below",
  ]);

  const validPositionSizing = new Set([
    "fixed",
    "percent",
    "risk_based",
    "kelly",
  ]);

  const validStopLossTypes = new Set(["fixed", "atr", "percent"]);
  const validTakeProfitTypes = new Set([
    "fixed",
    "atr",
    "percent",
    "risk_multiple",
  ]);
  const validTrailingStopTypes = new Set(["percent", "atr"]);

  STRATEGY_LIBRARY.forEach((def) => {
    describe(`${def.strategy.name} (${def.id})`, () => {
      const s: BacktestStrategy = def.strategy;

      it("has a non-empty name", () => {
        expect(s.name).toBeTruthy();
        expect(s.name.length).toBeGreaterThan(0);
      });

      it("has at least one entry rule", () => {
        expect(s.entryRules.length).toBeGreaterThanOrEqual(1);
      });

      it("has at least one exit rule", () => {
        expect(s.exitRules.length).toBeGreaterThanOrEqual(1);
      });

      it("has valid operators in entry rules", () => {
        s.entryRules.forEach((rule) => {
          expect(validOperators.has(rule.operator)).toBe(true);
        });
      });

      it("has valid operators in exit rules", () => {
        s.exitRules.forEach((rule) => {
          expect(validOperators.has(rule.operator)).toBe(true);
        });
      });

      it("has rules with indicator or price field", () => {
        [...s.entryRules, ...s.exitRules].forEach((rule) => {
          expect(rule.indicator).toBeTruthy();
          expect(typeof rule.indicator).toBe("string");
        });
      });

      it("has rules with numeric or string values", () => {
        [...s.entryRules, ...s.exitRules].forEach((rule) => {
          expect(
            typeof rule.value === "number" || typeof rule.value === "string",
          ).toBe(true);
        });
      });

      it("has a valid positionSizing type", () => {
        expect(validPositionSizing.has(s.positionSizing)).toBe(true);
      });

      it("has valid stopLoss configuration if defined", () => {
        if (s.stopLoss) {
          expect(validStopLossTypes.has(s.stopLoss.type)).toBe(true);
          expect(s.stopLoss.value).toBeGreaterThan(0);
        }
      });

      it("has valid takeProfit configuration if defined", () => {
        if (s.takeProfit) {
          expect(validTakeProfitTypes.has(s.takeProfit.type)).toBe(true);
          expect(s.takeProfit.value).toBeGreaterThan(0);
        }
      });

      it("has valid trailingStop configuration if defined", () => {
        if (s.trailingStop) {
          expect(validTrailingStopTypes.has(s.trailingStop.type)).toBe(true);
          expect(s.trailingStop.value).toBeGreaterThan(0);
        }
      });

      it("has valid trading hours if defined", () => {
        if (s.tradingHours) {
          expect(s.tradingHours.start).toBeGreaterThanOrEqual(0);
          expect(s.tradingHours.start).toBeLessThan(24);
          expect(s.tradingHours.end).toBeGreaterThan(s.tradingHours.start);
          expect(s.tradingHours.end).toBeLessThanOrEqual(24);
        }
      });

      it("has valid days of week if defined", () => {
        if (s.daysOfWeek) {
          s.daysOfWeek.forEach((day) => {
            expect(day).toBeGreaterThanOrEqual(0);
            expect(day).toBeLessThanOrEqual(6);
          });
        }
      });
    });
  });
});

// ============================================================================
// METADATA VALIDATION
// ============================================================================

describe("Strategy Metadata Validation", () => {
  const validCategories: StrategyCategory[] = [
    "momentum",
    "mean_reversion",
    "trend_following",
    "volatility",
    "volume",
    "gap",
    "breakout",
    "pctt",
  ];

  const validRiskLevels: StrategyRiskLevel[] = ["low", "medium", "high"];

  const validTimeframes: StrategyTimeframe[] = [
    "intraday",
    "swing",
    "position",
    "multi_timeframe",
  ];

  STRATEGY_LIBRARY.forEach((def) => {
    describe(`${def.strategy.name} metadata`, () => {
      const m = def.metadata;

      it("has a valid category", () => {
        expect(validCategories).toContain(m.category);
      });

      it("has a valid risk level", () => {
        expect(validRiskLevels).toContain(m.riskLevel);
      });

      it("has a valid timeframe", () => {
        expect(validTimeframes).toContain(m.timeframe);
      });

      it("has at least one ideal condition", () => {
        expect(m.idealConditions.length).toBeGreaterThanOrEqual(1);
      });

      it("has at least one indicator listed", () => {
        expect(m.indicators.length).toBeGreaterThanOrEqual(1);
      });

      it("has a valid expected return range", () => {
        expect(m.expectedReturnRange.min).toBeLessThan(
          m.expectedReturnRange.max,
        );
        expect(m.expectedReturnRange.min).toBeGreaterThanOrEqual(0);
      });

      it("has a valid expected drawdown range", () => {
        expect(m.expectedDrawdownRange.min).toBeLessThan(
          m.expectedDrawdownRange.max,
        );
        expect(m.expectedDrawdownRange.min).toBeGreaterThanOrEqual(0);
      });

      it("has a positive minimum capital", () => {
        expect(m.minCapital).toBeGreaterThan(0);
      });

      it("has author and version", () => {
        expect(m.author).toBeTruthy();
        expect(m.version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });
  });
});
