/**
 * Tests for Slippage Model
 *
 * Tests slippage estimation, position size adjustment, time-of-day effects,
 * asset class multipliers, and configuration management.
 */

import {
  SlippageModel,
  createSlippageModel,
  DEFAULT_SLIPPAGE_CONFIG,
  type SlippageEstimate,
  type MarketConditions,
  type SlippageConfig,
} from "../slippage-model";

// ============================================================================
// HELPERS
// ============================================================================

function makeConditions(
  overrides: Partial<MarketConditions> = {},
): MarketConditions {
  return {
    atr: 2.0,
    price: 100,
    volume: 1_000_000,
    adv: 5_000_000,
    spreadBps: 5,
    assetClass: "stock",
    ...overrides,
  };
}

// ============================================================================
// FACTORY
// ============================================================================

describe("createSlippageModel", () => {
  it("should create an instance with default config", () => {
    const sm = createSlippageModel();
    expect(sm).toBeInstanceOf(SlippageModel);
  });

  it("should create an instance with partial config overrides", () => {
    const sm = createSlippageModel({ baseSlippage: 0.05 });
    const config = sm.getConfig();
    expect(config.baseSlippage).toBe(0.05);
  });
});

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

describe("DEFAULT_SLIPPAGE_CONFIG", () => {
  it("should have expected default values", () => {
    expect(DEFAULT_SLIPPAGE_CONFIG.baseSlippage).toBe(0.01);
    expect(DEFAULT_SLIPPAGE_CONFIG.volatilityMultiplier).toBe(0.1);
    expect(DEFAULT_SLIPPAGE_CONFIG.sizeImpactCoeff).toBe(0.05);
    expect(DEFAULT_SLIPPAGE_CONFIG.maxSizeImpact).toBe(0.005);
    expect(DEFAULT_SLIPPAGE_CONFIG.openingMultiplier).toBe(2.0);
    expect(DEFAULT_SLIPPAGE_CONFIG.closingMultiplier).toBe(1.5);
    expect(DEFAULT_SLIPPAGE_CONFIG.lunchMultiplier).toBe(1.3);
    expect(DEFAULT_SLIPPAGE_CONFIG.useSpreadEstimate).toBe(true);
    expect(DEFAULT_SLIPPAGE_CONFIG.defaultSpreadBps).toBe(5);
    expect(DEFAULT_SLIPPAGE_CONFIG.cryptoMultiplier).toBe(1.5);
    expect(DEFAULT_SLIPPAGE_CONFIG.forexMultiplier).toBe(0.8);
    expect(DEFAULT_SLIPPAGE_CONFIG.futuresMultiplier).toBe(1.0);
  });
});

// ============================================================================
// SLIPPAGE ESTIMATION - CORE
// ============================================================================

describe("SlippageModel - estimateSlippage (core)", () => {
  let sm: SlippageModel;
  // Store the original Date so we can restore it
  const OriginalDate = global.Date;

  beforeEach(() => {
    // Mock Date to return a "normal" trading hour (2:00 PM EST = multiplier 1.0)
    // This avoids time-of-day test variability
    const mockDate = new OriginalDate("2026-02-23T14:00:00");
    jest.spyOn(global, "Date").mockImplementation(
      (...args: unknown[]) => {
        if (args.length === 0) {
          return mockDate;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new OriginalDate(...(args as [any]));
      },
    );
    // Also mock Date.now()
    jest.spyOn(OriginalDate, "now").mockReturnValue(mockDate.getTime());

    sm = new SlippageModel();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return a valid SlippageEstimate object", () => {
    const est = sm.estimateSlippage("buy", 100, makeConditions());
    expect(est).toHaveProperty("expectedSlippage");
    expect(est).toHaveProperty("expectedSlippageBps");
    expect(est).toHaveProperty("worstCaseSlippage");
    expect(est).toHaveProperty("components");
    expect(est).toHaveProperty("adjustedEntryPrice");
    expect(est).toHaveProperty("adjustedStopPrice");
  });

  it("should have all component fields", () => {
    const est = sm.estimateSlippage("buy", 100, makeConditions());
    expect(est.components).toHaveProperty("base");
    expect(est.components).toHaveProperty("volatility");
    expect(est.components).toHaveProperty("sizeImpact");
    expect(est.components).toHaveProperty("timeOfDay");
    expect(est.components).toHaveProperty("spread");
  });

  it("should produce positive slippage", () => {
    const est = sm.estimateSlippage("buy", 100, makeConditions());
    expect(est.expectedSlippage).toBeGreaterThan(0);
    expect(est.expectedSlippageBps).toBeGreaterThan(0);
  });

  it("should produce worst case = 2x expected", () => {
    const est = sm.estimateSlippage("buy", 100, makeConditions());
    expect(est.worstCaseSlippage).toBeCloseTo(est.expectedSlippage * 2);
  });

  it("should adjust buy entry price upward", () => {
    const cond = makeConditions({ price: 100 });
    const est = sm.estimateSlippage("buy", 100, cond);
    expect(est.adjustedEntryPrice).toBeGreaterThan(100);
  });

  it("should adjust sell entry price downward", () => {
    const cond = makeConditions({ price: 100 });
    const est = sm.estimateSlippage("sell", 100, cond);
    expect(est.adjustedEntryPrice).toBeLessThan(100);
  });

  it("should set buy stop price below current price", () => {
    const cond = makeConditions({ price: 100 });
    const est = sm.estimateSlippage("buy", 100, cond);
    expect(est.adjustedStopPrice).toBeLessThan(100);
  });

  it("should set sell stop price above current price", () => {
    const cond = makeConditions({ price: 100 });
    const est = sm.estimateSlippage("sell", 100, cond);
    expect(est.adjustedStopPrice).toBeGreaterThan(100);
  });
});

// ============================================================================
// SLIPPAGE ESTIMATION - COMPONENTS
// ============================================================================

describe("SlippageModel - estimateSlippage (components)", () => {
  const OriginalDate = global.Date;

  beforeEach(() => {
    // Mock to 2:00 PM (normal trading hours, multiplier 1.0)
    const mockDate = new OriginalDate("2026-02-23T14:00:00");
    jest.spyOn(global, "Date").mockImplementation(
      (...args: unknown[]) => {
        if (args.length === 0) {
          return mockDate;
        }
        return new OriginalDate(...(args as [any]));
      },
    );
    jest.spyOn(OriginalDate, "now").mockReturnValue(mockDate.getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should include base slippage component", () => {
    const sm = new SlippageModel({ baseSlippage: 0.05, useSpreadEstimate: false });
    const est = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ atr: 0, adv: undefined }),
    );
    // base = 0.05, volatility = 0.1 * 0 = 0, sizeImpact = 0, timeOfDay = 0, spread = 0
    expect(est.components.base).toBeCloseTo(0.05);
  });

  it("should include volatility component proportional to ATR", () => {
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const cond1 = makeConditions({ atr: 1.0, adv: undefined });
    const cond2 = makeConditions({ atr: 3.0, adv: undefined });

    const est1 = sm.estimateSlippage("buy", 100, cond1);
    const est2 = sm.estimateSlippage("buy", 100, cond2);

    expect(est2.components.volatility).toBeGreaterThan(
      est1.components.volatility,
    );
  });

  it("should include size impact when ADV is provided", () => {
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const cond = makeConditions({ atr: 0, price: 100, adv: 1_000_000 });
    // quantity * price / (adv * price) = 100 * 100 / (1000000 * 100) = 0.0001
    // sizeImpact = 0.05 * 0.0001 * 100 = 0.0005
    const est = sm.estimateSlippage("buy", 100, cond);
    expect(est.components.sizeImpact).toBeGreaterThan(0);
  });

  it("should cap size impact at maxSizeImpact", () => {
    const sm = new SlippageModel({
      useSpreadEstimate: false,
      maxSizeImpact: 0.005,
    });
    // Very large order relative to ADV
    const cond = makeConditions({ atr: 0, price: 100, adv: 100 });
    const est = sm.estimateSlippage("buy", 10_000, cond);
    // sizeImpact capped at 0.005 * 100 = 0.5
    expect(est.components.sizeImpact).toBeLessThanOrEqual(0.5 + 0.001); // tolerance
  });

  it("should have 0 size impact when ADV is undefined", () => {
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const cond = makeConditions({ atr: 0, adv: undefined });
    const est = sm.estimateSlippage("buy", 100, cond);
    expect(est.components.sizeImpact).toBe(0);
  });

  it("should have 0 size impact when ADV is 0", () => {
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const cond = makeConditions({ atr: 0, adv: 0 });
    const est = sm.estimateSlippage("buy", 100, cond);
    expect(est.components.sizeImpact).toBe(0);
  });

  it("should include spread component when useSpreadEstimate is true", () => {
    const sm = new SlippageModel({
      useSpreadEstimate: true,
      defaultSpreadBps: 10,
    });
    const cond = makeConditions({ atr: 0, adv: undefined, spreadBps: undefined });
    const est = sm.estimateSlippage("buy", 100, cond);
    // spread = (10/10000) * 100 / 2 = 0.05
    expect(est.components.spread).toBeCloseTo(0.05);
  });

  it("should use provided spreadBps over default", () => {
    const sm = new SlippageModel({
      useSpreadEstimate: true,
      defaultSpreadBps: 10,
    });
    const cond = makeConditions({ atr: 0, adv: undefined, spreadBps: 20 });
    const est = sm.estimateSlippage("buy", 100, cond);
    // spread = (20/10000) * 100 / 2 = 0.10
    expect(est.components.spread).toBeCloseTo(0.10);
  });

  it("should not include spread when useSpreadEstimate is false", () => {
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const cond = makeConditions({ atr: 0, adv: undefined });
    const est = sm.estimateSlippage("buy", 100, cond);
    expect(est.components.spread).toBe(0);
  });

  it("should correctly calculate bps", () => {
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const cond = makeConditions({ atr: 0, adv: undefined, price: 200 });
    const est = sm.estimateSlippage("buy", 100, cond);
    // bps = (expectedSlippage / price) * 10000
    expect(est.expectedSlippageBps).toBeCloseTo(
      (est.expectedSlippage / 200) * 10000,
    );
  });
});

// ============================================================================
// SLIPPAGE ESTIMATION - TIME OF DAY
// ============================================================================

describe("SlippageModel - Time of Day Effects", () => {
  const OriginalDate = global.Date;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockTime(hour: number, minute: number): void {
    const mockDate = new OriginalDate(2026, 1, 23, hour, minute, 0);
    jest.spyOn(global, "Date").mockImplementation(
      (...args: unknown[]) => {
        if (args.length === 0) {
          return mockDate;
        }
        return new OriginalDate(...(args as [any]));
      },
    );
  }

  it("should apply opening multiplier during first 30 min (9:30-10:00)", () => {
    mockTime(9, 35);
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const est = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ atr: 0, adv: undefined }),
    );
    // timeOfDay = (base + volatility) * (openingMultiplier - 1) = 0.01 * (2.0 - 1) = 0.01
    expect(est.components.timeOfDay).toBeCloseTo(0.01);
  });

  it("should apply closing multiplier during last 30 min (15:30-16:00)", () => {
    mockTime(15, 35);
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const est = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ atr: 0, adv: undefined }),
    );
    // timeOfDay = 0.01 * (1.5 - 1) = 0.005
    expect(est.components.timeOfDay).toBeCloseTo(0.005);
  });

  it("should apply lunch multiplier during 12:00-13:00", () => {
    mockTime(12, 30);
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const est = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ atr: 0, adv: undefined }),
    );
    // timeOfDay = 0.01 * (1.3 - 1) = 0.003
    expect(est.components.timeOfDay).toBeCloseTo(0.003);
  });

  it("should apply no multiplier during normal trading hours (e.g. 14:00)", () => {
    mockTime(14, 0);
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const est = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ atr: 0, adv: undefined }),
    );
    expect(est.components.timeOfDay).toBeCloseTo(0);
  });

  it("should apply no multiplier before market open (e.g. 8:00)", () => {
    mockTime(8, 0);
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const est = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ atr: 0, adv: undefined }),
    );
    expect(est.components.timeOfDay).toBeCloseTo(0);
  });

  it("should apply no multiplier after market close (e.g. 17:00)", () => {
    mockTime(17, 0);
    const sm = new SlippageModel({ useSpreadEstimate: false });
    const est = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ atr: 0, adv: undefined }),
    );
    expect(est.components.timeOfDay).toBeCloseTo(0);
  });
});

// ============================================================================
// SLIPPAGE ESTIMATION - ASSET CLASS
// ============================================================================

describe("SlippageModel - Asset Class Multipliers", () => {
  const OriginalDate = global.Date;

  beforeEach(() => {
    const mockDate = new OriginalDate("2026-02-23T14:00:00");
    jest.spyOn(global, "Date").mockImplementation(
      (...args: unknown[]) => {
        if (args.length === 0) {
          return mockDate;
        }
        return new OriginalDate(...(args as [any]));
      },
    );
    jest.spyOn(OriginalDate, "now").mockReturnValue(mockDate.getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should apply stock multiplier (1.0) for stocks", () => {
    const sm = new SlippageModel();
    const stock = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ assetClass: "stock" }),
    );
    const noClass = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ assetClass: undefined }),
    );
    // Both should be the same (default multiplier = 1.0)
    expect(stock.expectedSlippage).toBeCloseTo(noClass.expectedSlippage);
  });

  it("should apply crypto multiplier (1.5) for crypto", () => {
    const sm = new SlippageModel();
    const stock = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ assetClass: "stock" }),
    );
    const crypto = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ assetClass: "crypto" }),
    );
    expect(crypto.expectedSlippage).toBeCloseTo(stock.expectedSlippage * 1.5);
  });

  it("should apply forex multiplier (0.8) for forex", () => {
    const sm = new SlippageModel();
    const stock = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ assetClass: "stock" }),
    );
    const forex = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ assetClass: "forex" }),
    );
    expect(forex.expectedSlippage).toBeCloseTo(stock.expectedSlippage * 0.8);
  });

  it("should apply futures multiplier (1.0) for futures", () => {
    const sm = new SlippageModel();
    const stock = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ assetClass: "stock" }),
    );
    const futures = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ assetClass: "futures" }),
    );
    expect(futures.expectedSlippage).toBeCloseTo(stock.expectedSlippage);
  });
});

// ============================================================================
// POSITION SIZE ADJUSTMENT
// ============================================================================

describe("SlippageModel - adjustPositionSize", () => {
  let sm: SlippageModel;
  const OriginalDate = global.Date;

  beforeEach(() => {
    const mockDate = new OriginalDate("2026-02-23T14:00:00");
    jest.spyOn(global, "Date").mockImplementation(
      (...args: unknown[]) => {
        if (args.length === 0) {
          return mockDate;
        }
        return new OriginalDate(...(args as [any]));
      },
    );
    jest.spyOn(OriginalDate, "now").mockReturnValue(mockDate.getTime());

    sm = new SlippageModel();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should reduce quantity to account for slippage", () => {
    const slippage = sm.estimateSlippage("buy", 100, makeConditions());

    const result = sm.adjustPositionSize(1000, 100, 95, slippage);

    // Without slippage: 1000 / |100 - 95| = 200 shares
    // With slippage: 1000 / (5 + worstCaseSlippage) < 200
    expect(result.adjustedQuantity).toBeLessThan(200);
    expect(result.adjustedQuantity).toBeGreaterThan(0);
  });

  it("should return integer quantity (floored)", () => {
    const slippage = sm.estimateSlippage("buy", 100, makeConditions());
    const result = sm.adjustPositionSize(1000, 100, 95, slippage);
    expect(Number.isInteger(result.adjustedQuantity)).toBe(true);
  });

  it("should return effectiveRisk = adjustedQuantity * effectiveRiskPerShare", () => {
    const slippage = sm.estimateSlippage("buy", 100, makeConditions());
    const result = sm.adjustPositionSize(1000, 100, 95, slippage);

    const effectiveRiskPerShare = 5 + slippage.worstCaseSlippage;
    expect(result.effectiveRisk).toBeCloseTo(
      result.adjustedQuantity * effectiveRiskPerShare,
    );
  });

  it("should handle tight stop (small risk per share)", () => {
    const slippage = sm.estimateSlippage("buy", 100, makeConditions());
    const result = sm.adjustPositionSize(500, 100, 99.5, slippage);
    expect(result.adjustedQuantity).toBeGreaterThan(0);
  });

  it("should handle wide stop (large risk per share)", () => {
    const slippage = sm.estimateSlippage("buy", 100, makeConditions());
    const result = sm.adjustPositionSize(500, 100, 80, slippage);
    // 500 / (20 + worstCase) -> small quantity
    expect(result.adjustedQuantity).toBeGreaterThanOrEqual(0);
  });

  it("should return 0 quantity when slippage exceeds target risk", () => {
    // Very large worst case slippage
    const fakeSlippage: SlippageEstimate = {
      expectedSlippage: 500,
      expectedSlippageBps: 5000,
      worstCaseSlippage: 1000,
      components: { base: 0, volatility: 0, sizeImpact: 0, timeOfDay: 0, spread: 0 },
      adjustedEntryPrice: 600,
      adjustedStopPrice: 0,
    };
    const result = sm.adjustPositionSize(100, 100, 95, fakeSlippage);
    // 100 / (5 + 1000) ~ 0.099 -> floor = 0
    expect(result.adjustedQuantity).toBe(0);
  });
});

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

describe("SlippageModel - Configuration", () => {
  it("should return a copy of config (not the original reference)", () => {
    const sm = new SlippageModel();
    const config1 = sm.getConfig();
    const config2 = sm.getConfig();
    expect(config1).toEqual(config2);
    expect(config1).not.toBe(config2);
  });

  it("should update config partially", () => {
    const sm = new SlippageModel();
    sm.updateConfig({ baseSlippage: 0.05 });
    const config = sm.getConfig();
    expect(config.baseSlippage).toBe(0.05);
    // Other fields should remain default
    expect(config.volatilityMultiplier).toBe(0.1);
  });

  it("should reflect updated config in slippage estimates", () => {
    const OriginalDate = global.Date;
    const mockDate = new OriginalDate("2026-02-23T14:00:00");
    jest.spyOn(global, "Date").mockImplementation(
      (...args: unknown[]) => {
        if (args.length === 0) {
          return mockDate;
        }
        return new OriginalDate(...(args as [any]));
      },
    );

    const sm = new SlippageModel({ useSpreadEstimate: false });
    const est1 = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ atr: 1, adv: undefined }),
    );

    sm.updateConfig({ volatilityMultiplier: 0.5 });
    const est2 = sm.estimateSlippage(
      "buy",
      100,
      makeConditions({ atr: 1, adv: undefined }),
    );

    expect(est2.components.volatility).toBeGreaterThan(
      est1.components.volatility,
    );

    jest.restoreAllMocks();
  });
});
