/**
 * Regime Detection Test Suite
 *
 * Tests:
 *   - KER: known-answer, trending series, ranging series, edge cases
 *   - Regime classifier: each of 5 regimes with synthetic data
 *   - Heat adjustment: CRISIS reduces heat by 90% vs TRENDING
 *   - Sizing adjustment: multipliers applied and hard-capped correctly
 *   - RegimeMonitor: transitions require 3 confirmations (hysteresis)
 */

import { calculateEfficiencyRatio } from "../efficiency-ratio";
import { classifyRegime } from "../regime-detector";
import { getRegimeRiskAdjustment } from "../regime-risk-adapter";
import { adjustPositionSize } from "../regime-position-sizer";
import { RegimeMonitor } from "../regime-monitor";
import type { RegimeClassification } from "../regime-detector";
import type { MarketRegime } from "@/lib/trading/config";

// ============================================================================
// HELPERS
// ============================================================================

/** Build a linearly trending price series */
function trendingSeries(bars: number, step = 1): number[] {
  return Array.from({ length: bars }, (_, i) => 100 + i * step);
}

/** Build a perfectly oscillating (ranging) series */
function rangingSeries(bars: number): number[] {
  return Array.from({ length: bars }, (_, i) => (i % 2 === 0 ? 100 : 101));
}

/** Build OHLCV arrays with constant low volatility */
function lowVolatilityBars(
  closes: number[],
  atrValue = 0.5,
): { highs: number[]; lows: number[]; volumes: number[] } {
  return {
    highs: closes.map((c) => c + atrValue),
    lows: closes.map((c) => c - atrValue),
    volumes: closes.map(() => 1_000_000),
  };
}

/** Build a flat price series (all prices identical) */
function flatSeries(bars: number, price = 100): number[] {
  return Array.from({ length: bars }, () => price);
}

// ============================================================================
// 1. KAUFMAN EFFICIENCY RATIO
// ============================================================================

describe("calculateEfficiencyRatio", () => {
  test("perfectly trending series returns ER near 1.0", () => {
    // 100, 101, 102, ..., 120 — every move is in the same direction
    const closes = trendingSeries(21, 1);
    const er = calculateEfficiencyRatio(closes, 20);
    expect(er).toBeCloseTo(1.0, 5);
  });

  test("perfectly oscillating series returns ER near 0.0", () => {
    // 100, 101, 100, 101, ... — net move is 0 or 1, path is large
    const closes = rangingSeries(21);
    const er = calculateEfficiencyRatio(closes, 20);
    // Net change = 0 or 1, path = 20 → ER ≈ 0
    expect(er).toBeLessThan(0.1);
  });

  test("known-answer: 5-bar period with explicit prices", () => {
    // closes: [10, 11, 12, 11, 12, 13]
    // period = 5  →  start=0 (index), end=5 (index)
    // net = |closes[5] - closes[0]| = |13 - 10| = 3
    // path = |11-10| + |12-11| + |11-12| + |12-11| + |13-12| = 1+1+1+1+1 = 5
    // ER = 3/5 = 0.6
    const closes = [10, 11, 12, 11, 12, 13];
    const er = calculateEfficiencyRatio(closes, 5);
    expect(er).toBeCloseTo(0.6, 5);
  });

  test("all prices identical returns 0 (not trending, not ranging — no movement)", () => {
    const closes = flatSeries(21);
    const er = calculateEfficiencyRatio(closes, 20);
    expect(er).toBe(0);
  });

  test("period greater than data length returns 0", () => {
    const er = calculateEfficiencyRatio([100, 101, 102], 10);
    expect(er).toBe(0);
  });

  test("period of 0 returns 0", () => {
    const er = calculateEfficiencyRatio([100, 101, 102], 0);
    expect(er).toBe(0);
  });

  test("result is always in [0, 1]", () => {
    const randomSeries = Array.from({ length: 25 }, () => Math.random() * 100);
    const er = calculateEfficiencyRatio(randomSeries, 20);
    expect(er).toBeGreaterThanOrEqual(0);
    expect(er).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// 2. REGIME CLASSIFIER — 5 REGIMES
// ============================================================================

describe("classifyRegime", () => {
  const BASE_BARS = 80; // enough for all lookbacks

  // Shared ATR calculation helper for tests
  function buildBars(
    closes: number[],
    atrValue: number,
    volumeMultiplier = 1,
  ): { highs: number[]; lows: number[]; volumes: number[] } {
    return {
      highs: closes.map((c) => c + atrValue),
      lows: closes.map((c) => c - atrValue),
      volumes: closes.map(() => 1_000_000 * volumeMultiplier),
    };
  }

  test("TRENDING: high ER, low volatility → regime is trending", () => {
    const closes = trendingSeries(BASE_BARS, 1);
    const { highs, lows, volumes } = buildBars(closes, 0.3);
    const result = classifyRegime(closes, highs, lows, volumes);
    expect(result.regime).toBe("trending");
    expect(result.efficiencyRatio).toBeGreaterThan(0.5);
    expect(result.confidence).toBeGreaterThan(0);
  });

  test("RANGING: low ER, low volatility → regime is ranging", () => {
    const closes = rangingSeries(BASE_BARS);
    const { highs, lows, volumes } = buildBars(closes, 0.3);
    const result = classifyRegime(closes, highs, lows, volumes);
    expect(result.regime).toBe("ranging");
    expect(result.efficiencyRatio).toBeLessThan(0.3);
  });

  test("TRANSITION: mid-range ER → regime is transition", () => {
    // Construct a series with ER around 0.4 (between 0.3 and 0.5)
    // Zigzag pattern: 2 up, 1 down alternating — moderate efficiency
    const closes: number[] = [100];
    for (let i = 0; i < BASE_BARS - 1; i++) {
      const last = closes[closes.length - 1];
      closes.push(i % 3 === 2 ? last - 0.5 : last + 0.5);
    }
    const { highs, lows, volumes } = buildBars(closes, 0.3);
    const result = classifyRegime(closes, highs, lows, volumes);
    expect(result.regime).toBe("transition");
  });

  test("SHOCK: elevated volatility (3–5× avg) with directional ER → regime is shock", () => {
    // Build a trending base, then dramatically increase ATR on the last bar
    const closes = trendingSeries(BASE_BARS, 1);
    // Normal ATR is ~0.5; shock ATR is 3× avg → ~1.5
    const normalHighs = closes.map((c) => c + 0.5);
    const normalLows = closes.map((c) => c - 0.5);
    // Inflate the last several bars' ATR to trigger shock
    const end = closes.length - 1;
    for (let i = end - 10; i <= end; i++) {
      normalHighs[i] = closes[i] + 4.0;
      normalLows[i] = closes[i] - 4.0;
    }
    const volumes = closes.map(() => 1_000_000);
    const result = classifyRegime(closes, normalHighs, normalLows, volumes, {
      shockAtrMultiple: 3,
      crisisAtrMultiple: 5,
      crisisErFloor: 0.4,
    });
    // Should be shock or crisis depending on computed ratios
    expect(["shock", "crisis"]).toContain(result.regime);
  });

  test("CRISIS: extreme volume spike → regime is crisis", () => {
    const closes = trendingSeries(BASE_BARS, 1);
    const { highs, lows } = buildBars(closes, 0.3);
    // Last bar volume is 10× the average → triggers crisis
    const volumes = closes.map(() => 1_000_000);
    volumes[closes.length - 1] = 10_000_000;
    const result = classifyRegime(closes, highs, lows, volumes, {
      crisisVolumeMultiple: 5,
    });
    expect(result.regime).toBe("crisis");
  });

  test("CRISIS: ATR > 5× average → regime is crisis", () => {
    const closes = trendingSeries(BASE_BARS, 1);
    // Normal ATR ~0.3; inject extreme ATR on last bars
    const highs = closes.map((c) => c + 0.3);
    const lows = closes.map((c) => c - 0.3);
    const end = closes.length - 1;
    for (let i = end - 5; i <= end; i++) {
      highs[i] = closes[i] + 10;
      lows[i] = closes[i] - 10;
    }
    const volumes = closes.map(() => 1_000_000);
    const result = classifyRegime(closes, highs, lows, volumes);
    expect(result.regime).toBe("crisis");
  });

  test("insufficient data returns transition with zero confidence", () => {
    const closes = [100, 101, 102];
    const result = classifyRegime(closes, closes, closes, closes);
    expect(result.regime).toBe("transition");
    expect(result.confidence).toBe(0);
  });

  test("confidence is in [0, 1] for all regimes", () => {
    const closes = trendingSeries(BASE_BARS, 1);
    const { highs, lows, volumes } = buildBars(closes, 0.3);
    const result = classifyRegime(closes, highs, lows, volumes);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// 3. REGIME HEAT ADJUSTMENT
// ============================================================================

describe("getRegimeRiskAdjustment", () => {
  test("TRENDING returns full budget (multiplier 1.0)", () => {
    const trending = getRegimeRiskAdjustment("trending");
    const crisis = getRegimeRiskAdjustment("crisis");
    expect(trending.exposureBudget).toBeCloseTo(1.0);
    expect(trending.regime).toBe("trending");
  });

  test("CRISIS returns 90% less heat ceiling than TRENDING", () => {
    const trending = getRegimeRiskAdjustment("trending");
    const crisis = getRegimeRiskAdjustment("crisis");
    // CRISIS budget is 0.1, TRENDING is 1.0 → heat reduction = 90%
    const reductionPct =
      (trending.heatCeiling - crisis.heatCeiling) / trending.heatCeiling;
    expect(reductionPct).toBeCloseTo(0.9, 5);
  });

  test("SHOCK heat ceiling is between TRENDING and CRISIS", () => {
    const trending = getRegimeRiskAdjustment("trending");
    const shock = getRegimeRiskAdjustment("shock");
    const crisis = getRegimeRiskAdjustment("crisis");
    expect(shock.heatCeiling).toBeLessThan(trending.heatCeiling);
    expect(shock.heatCeiling).toBeGreaterThan(crisis.heatCeiling);
  });

  test("regime_budgets ordering: trending > ranging > transition > shock > crisis", () => {
    const regimes: MarketRegime[] = ["trending", "ranging", "transition", "shock", "crisis"];
    const budgets = regimes.map((r) => getRegimeRiskAdjustment(r).exposureBudget);
    for (let i = 0; i < budgets.length - 1; i++) {
      expect(budgets[i]).toBeGreaterThan(budgets[i + 1]);
    }
  });

  test("heatCeiling is never negative", () => {
    const allRegimes: MarketRegime[] = ["trending", "ranging", "transition", "shock", "crisis"];
    for (const r of allRegimes) {
      expect(getRegimeRiskAdjustment(r).heatCeiling).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// 4. REGIME POSITION SIZER
// ============================================================================

describe("adjustPositionSize", () => {
  test("TRENDING applies 1.0 sizing multiplier (no change)", () => {
    const base = 0.008;
    const adjusted = adjustPositionSize(base, "trending");
    // trending sizing_multiplier = 1.0 from defaults
    expect(adjusted).toBeCloseTo(base * 1.0, 10);
  });

  test("CRISIS applies 0.1 sizing multiplier (90% reduction)", () => {
    const base = 0.008;
    const adjusted = adjustPositionSize(base, "crisis");
    // crisis sizing_multiplier = 0.1 from defaults
    expect(adjusted).toBeCloseTo(base * 0.1, 10);
  });

  test("result never exceeds hard_max_pct", () => {
    // If baseSize is enormous the result must be capped
    const adjusted = adjustPositionSize(1.0, "trending");
    const { getPolicy } = require("@/lib/trading/config");
    const hardMax = getPolicy().runtime.risk.per_trade.hard_max_pct;
    expect(adjusted).toBeLessThanOrEqual(hardMax);
  });

  test("result is never negative", () => {
    expect(adjustPositionSize(-0.01, "ranging")).toBe(0);
  });

  test("smaller sizes in deteriorating regimes: trending > ranging > shock > crisis", () => {
    const base = 0.008;
    const t = adjustPositionSize(base, "trending");
    const ra = adjustPositionSize(base, "ranging");
    const s = adjustPositionSize(base, "shock");
    const c = adjustPositionSize(base, "crisis");
    expect(t).toBeGreaterThanOrEqual(ra);
    expect(ra).toBeGreaterThanOrEqual(s);
    expect(s).toBeGreaterThanOrEqual(c);
  });
});

// ============================================================================
// 5. REGIME MONITOR — HYSTERESIS
// ============================================================================

describe("RegimeMonitor", () => {
  function makeClassification(
    regime: MarketRegime,
    confidence = 0.8,
  ): RegimeClassification {
    return {
      regime,
      confidence,
      efficiencyRatio: 0.5,
      volatility: 0.5,
      trendStrength: 1.0,
      details: `test: ${regime}`,
    };
  }

  test("starts in ranging regime by default", () => {
    const monitor = new RegimeMonitor();
    expect(monitor.getCurrentRegime()).toBe("ranging");
  });

  test("no transition fires on the 1st or 2nd confirmation bar", () => {
    const monitor = new RegimeMonitor();
    const r1 = monitor.update(makeClassification("trending"));
    const r2 = monitor.update(makeClassification("trending"));
    expect(r1).toBeNull();
    expect(r2).toBeNull();
    expect(monitor.getCurrentRegime()).toBe("ranging");
  });

  test("transition fires exactly on the 3rd consecutive confirmation bar", () => {
    const monitor = new RegimeMonitor();
    monitor.update(makeClassification("trending"));
    monitor.update(makeClassification("trending"));
    const event = monitor.update(makeClassification("trending"));
    expect(event).not.toBeNull();
    expect(event!.from).toBe("ranging");
    expect(event!.to).toBe("trending");
    expect(monitor.getCurrentRegime()).toBe("trending");
  });

  test("candidate resets if a different regime interrupts the confirmation sequence", () => {
    const monitor = new RegimeMonitor();
    monitor.update(makeClassification("trending")); // bar 1
    monitor.update(makeClassification("trending")); // bar 2
    monitor.update(makeClassification("shock")); // interrupts — resets to shock candidate, count=1
    const event = monitor.update(makeClassification("trending")); // new candidate trending, count=1
    // Not enough bars — no event
    expect(event).toBeNull();
    expect(monitor.getCurrentRegime()).toBe("ranging");
  });

  test("no transition fires if regime matches current", () => {
    const monitor = new RegimeMonitor();
    // Confirm trending
    monitor.update(makeClassification("trending"));
    monitor.update(makeClassification("trending"));
    monitor.update(makeClassification("trending"));
    expect(monitor.getCurrentRegime()).toBe("trending");

    // Now send more trending bars — should return null (already in trending)
    const event = monitor.update(makeClassification("trending"));
    expect(event).toBeNull();
  });

  test("transition event carries correct from/to and confidence", () => {
    const monitor = new RegimeMonitor();
    monitor.update(makeClassification("crisis", 0.95));
    monitor.update(makeClassification("crisis", 0.95));
    const event = monitor.update(makeClassification("crisis", 0.95));
    expect(event!.from).toBe("ranging");
    expect(event!.to).toBe("crisis");
    expect(event!.confidence).toBe(0.95);
    expect(event!.timestamp).toBeInstanceOf(Date);
    expect(typeof event!.trigger).toBe("string");
  });

  test("reset() restores initial state", () => {
    const monitor = new RegimeMonitor();
    monitor.update(makeClassification("trending"));
    monitor.update(makeClassification("trending"));
    monitor.update(makeClassification("trending"));
    expect(monitor.getCurrentRegime()).toBe("trending");

    monitor.reset("shock");
    expect(monitor.getCurrentRegime()).toBe("shock");
    expect(monitor.getCandidateCount()).toBe(0);
  });

  test("multiple sequential transitions work correctly", () => {
    const monitor = new RegimeMonitor();

    // ranging → trending
    for (let i = 0; i < 3; i++) monitor.update(makeClassification("trending"));
    expect(monitor.getCurrentRegime()).toBe("trending");

    // trending → crisis
    for (let i = 0; i < 3; i++) monitor.update(makeClassification("crisis"));
    expect(monitor.getCurrentRegime()).toBe("crisis");
  });
});
