/**
 * Tests for Portfolio Risk Manager
 *
 * Tests position management, heat calculation, correlation analysis,
 * drawdown management, kill switch, trade approval, and exposure calculations.
 */

import {
  PortfolioRiskManager,
  createPortfolioRiskManager,
  DEFAULT_PORTFOLIO_RISK_CONFIG,
  type PositionRisk,
  type TradeProposal,
  type PortfolioRiskConfig,
} from "../portfolio-risk";

// ============================================================================
// HELPERS
// ============================================================================

function makePosition(overrides: Partial<PositionRisk> = {}): PositionRisk {
  return {
    symbol: "AAPL",
    side: "long",
    quantity: 100,
    entryPrice: 150,
    currentPrice: 155,
    stopPrice: 145,
    dollarRisk: 0,
    percentRisk: 0,
    unrealizedPL: 0,
    unrealizedPLPercent: 0,
    ...overrides,
  };
}

function makeProposal(overrides: Partial<TradeProposal> = {}): TradeProposal {
  return {
    symbol: "MSFT",
    side: "long",
    quantity: 50,
    entryPrice: 300,
    stopPrice: 295,
    ...overrides,
  };
}

// ============================================================================
// FACTORY
// ============================================================================

describe("createPortfolioRiskManager", () => {
  it("should create an instance with default config", () => {
    const rm = createPortfolioRiskManager(100_000);
    expect(rm).toBeInstanceOf(PortfolioRiskManager);
  });

  it("should create an instance with partial config overrides", () => {
    const rm = createPortfolioRiskManager(100_000, { maxHeat: 0.1 });
    const metrics = rm.getMetrics();
    expect(metrics.maxHeat).toBe(0.1);
  });
});

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

describe("DEFAULT_PORTFOLIO_RISK_CONFIG", () => {
  it("should have expected default values", () => {
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.maxHeat).toBe(0.06);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.maxPositionHeat).toBe(0.02);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.maxGrossExposure).toBe(2.0);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.maxNetExposure).toBe(1.0);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.maxPositionSize).toBe(0.2);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.correlationThreshold).toBe(0.7);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.maxCorrelatedExposure).toBe(0.3);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.correlationLookback).toBe(60);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.drawdownLevel1).toBe(0.05);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.drawdownScale1).toBe(0.5);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.drawdownLevel2).toBe(0.1);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.drawdownScale2).toBe(0.25);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.drawdownKillLevel).toBe(0.15);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.enableKillSwitch).toBe(true);
    expect(DEFAULT_PORTFOLIO_RISK_CONFIG.killSwitchCooldownMinutes).toBe(60);
  });
});

// ============================================================================
// POSITION MANAGEMENT
// ============================================================================

describe("PortfolioRiskManager - Position Management", () => {
  let rm: PortfolioRiskManager;

  beforeEach(() => {
    rm = new PortfolioRiskManager(100_000);
  });

  it("should add a position and calculate derived metrics", () => {
    const pos = makePosition({
      symbol: "AAPL",
      side: "long",
      quantity: 100,
      entryPrice: 150,
      currentPrice: 155,
      stopPrice: 145,
    });
    rm.updatePosition(pos);

    // dollarRisk = |150 - 145| * 100 = 500
    // percentRisk = 500 / 100000 = 0.005
    const heat = rm.calculateHeat();
    expect(heat).toBeCloseTo(0.005);
  });

  it("should update an existing position", () => {
    rm.updatePosition(
      makePosition({ symbol: "AAPL", entryPrice: 150, stopPrice: 145 }),
    );
    const heat1 = rm.calculateHeat();

    // Widen stop -> more risk
    rm.updatePosition(
      makePosition({ symbol: "AAPL", entryPrice: 150, stopPrice: 140 }),
    );
    const heat2 = rm.calculateHeat();

    expect(heat2).toBeGreaterThan(heat1);
  });

  it("should remove a position", () => {
    rm.updatePosition(makePosition({ symbol: "AAPL" }));
    expect(rm.calculateHeat()).toBeGreaterThan(0);

    rm.removePosition("AAPL");
    expect(rm.calculateHeat()).toBe(0);
  });

  it("should handle removing a non-existent position without error", () => {
    expect(() => rm.removePosition("DOESNT_EXIST")).not.toThrow();
  });

  it("should calculate unrealizedPL correctly for long position", () => {
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        side: "long",
        quantity: 100,
        entryPrice: 150,
        currentPrice: 160,
      }),
    );
    // unrealizedPL = (160 - 150) * 100 * 1 = 1000
    const metrics = rm.getMetrics();
    expect(metrics.longExposure).toBeGreaterThan(0);
  });

  it("should calculate dollarRisk for short position", () => {
    rm.updatePosition(
      makePosition({
        symbol: "TSLA",
        side: "short",
        quantity: 50,
        entryPrice: 200,
        currentPrice: 190,
        stopPrice: 210,
      }),
    );
    // dollarRisk = |200 - 210| * 50 = 500
    // percentRisk = 500 / 100000 = 0.005
    expect(rm.calculateHeat()).toBeCloseTo(0.005);
  });
});

// ============================================================================
// HEAT CALCULATION
// ============================================================================

describe("PortfolioRiskManager - Heat Calculation", () => {
  let rm: PortfolioRiskManager;

  beforeEach(() => {
    rm = new PortfolioRiskManager(100_000);
  });

  it("should return 0 heat with no positions", () => {
    expect(rm.calculateHeat()).toBe(0);
  });

  it("should aggregate heat across multiple positions", () => {
    // Position 1: dollarRisk = |150-145|*100 = 500, percentRisk = 0.005
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        entryPrice: 150,
        stopPrice: 145,
        quantity: 100,
      }),
    );
    // Position 2: dollarRisk = |300-295|*100 = 500, percentRisk = 0.005
    rm.updatePosition(
      makePosition({
        symbol: "MSFT",
        entryPrice: 300,
        stopPrice: 295,
        quantity: 100,
      }),
    );

    expect(rm.calculateHeat()).toBeCloseTo(0.01);
  });

  it("should calculate remaining heat correctly", () => {
    // maxHeat = 0.06 (default), no drawdown => scaleFactor = 1.0
    // remaining = 0.06 - 0 = 0.06
    expect(rm.getRemainingHeat()).toBeCloseTo(0.06);

    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        entryPrice: 150,
        stopPrice: 145,
        quantity: 100,
      }),
    );
    // remaining = 0.06 - 0.005 = 0.055
    expect(rm.getRemainingHeat()).toBeCloseTo(0.055);
  });

  it("should not return negative remaining heat", () => {
    // Create a very large position that exceeds maxHeat
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        entryPrice: 150,
        stopPrice: 100,
        quantity: 200,
      }),
    );
    // dollarRisk = |150-100| * 200 = 10000
    // percentRisk = 10000 / 100000 = 0.10 => exceeds maxHeat 0.06
    expect(rm.getRemainingHeat()).toBe(0);
  });

  it("should scale remaining heat by drawdown factor", () => {
    // Set equity to create a 6% drawdown (level 1 threshold = 5%)
    rm.updateEquity(94_000);
    // drawdown = (100000 - 94000) / 100000 = 0.06, scaleFactor = 0.5
    // scaledMaxHeat = 0.06 * 0.5 = 0.03
    expect(rm.getRemainingHeat()).toBeCloseTo(0.03);
  });
});

// ============================================================================
// EQUITY & DRAWDOWN
// ============================================================================

describe("PortfolioRiskManager - Drawdown Management", () => {
  let rm: PortfolioRiskManager;

  beforeEach(() => {
    rm = new PortfolioRiskManager(100_000);
  });

  it("should calculate drawdown from peak", () => {
    expect(rm.calculateDrawdown()).toBe(0);

    rm.updateEquity(95_000);
    // drawdown = (100000 - 95000) / 100000 = 0.05
    expect(rm.calculateDrawdown()).toBeCloseTo(0.05);
  });

  it("should update peak equity when equity increases", () => {
    rm.updateEquity(110_000);
    // new peak = 110000
    rm.updateEquity(105_000);
    // drawdown from new peak: (110000 - 105000) / 110000
    expect(rm.calculateDrawdown()).toBeCloseTo(5000 / 110_000);
  });

  it("should return 0 drawdown when equity equals peak", () => {
    rm.updateEquity(100_000);
    expect(rm.calculateDrawdown()).toBe(0);
  });

  it("should handle zero peak equity", () => {
    const rm2 = new PortfolioRiskManager(0);
    expect(rm2.calculateDrawdown()).toBe(0);
  });

  it("should get scale factor 1.0 with no drawdown", () => {
    expect(rm.getDrawdownScaleFactor()).toBe(1.0);
  });

  it("should get scale factor 0.5 at drawdown level 1 (5%)", () => {
    rm.updateEquity(95_000); // 5% drawdown
    expect(rm.getDrawdownScaleFactor()).toBe(0.5);
  });

  it("should get scale factor 0.5 at 7% drawdown (between level 1 and level 2)", () => {
    rm.updateEquity(93_000); // 7% drawdown
    expect(rm.getDrawdownScaleFactor()).toBe(0.5);
  });

  it("should get scale factor 0.25 at drawdown level 2 (10%)", () => {
    rm.updateEquity(90_000); // 10% drawdown
    expect(rm.getDrawdownScaleFactor()).toBe(0.25);
  });

  it("should get scale factor 0 at drawdown kill level (15%)", () => {
    rm.updateEquity(85_000); // 15% drawdown
    expect(rm.getDrawdownScaleFactor()).toBe(0);
  });

  it("should trigger kill switch automatically at drawdown kill level", () => {
    rm.updateEquity(85_000);
    const metrics = rm.getMetrics();
    expect(metrics.killSwitchActive).toBe(true);
  });
});

// ============================================================================
// KILL SWITCH
// ============================================================================

describe("PortfolioRiskManager - Kill Switch", () => {
  let rm: PortfolioRiskManager;

  beforeEach(() => {
    rm = new PortfolioRiskManager(100_000);
  });

  it("should not be active initially", () => {
    const metrics = rm.getMetrics();
    expect(metrics.killSwitchActive).toBe(false);
  });

  it("should activate on triggerKillSwitch", () => {
    rm.triggerKillSwitch("Test reason");
    const metrics = rm.getMetrics();
    expect(metrics.killSwitchActive).toBe(true);
    expect(metrics.killSwitchReason).toBe("Test reason");
  });

  it("should reset kill switch", () => {
    rm.triggerKillSwitch("Test reason");
    rm.resetKillSwitch();
    const metrics = rm.getMetrics();
    expect(metrics.killSwitchActive).toBe(false);
    expect(metrics.killSwitchReason).toBeUndefined();
  });

  it("should pass cooldown check when no kill switch has been triggered", () => {
    expect(rm.isKillSwitchCooldownPassed()).toBe(true);
  });

  it("should not pass cooldown check immediately after triggering", () => {
    rm.triggerKillSwitch("Test");
    expect(rm.isKillSwitchCooldownPassed()).toBe(false);
  });

  it("should pass cooldown when enough time has elapsed", () => {
    rm.triggerKillSwitch("Test");
    // Simulate time passage: set killSwitchTriggeredAt to 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    // Access private property for testing - use Object assign
    (rm as any).killSwitchTriggeredAt = twoHoursAgo;
    expect(rm.isKillSwitchCooldownPassed()).toBe(true);
  });

  it("should not trigger kill switch when enableKillSwitch is false", () => {
    const rm2 = new PortfolioRiskManager(100_000, {
      enableKillSwitch: false,
    });
    rm2.updateEquity(85_000); // 15% drawdown
    const metrics = rm2.getMetrics();
    expect(metrics.killSwitchActive).toBe(false);
  });
});

// ============================================================================
// CORRELATION ANALYSIS
// ============================================================================

describe("PortfolioRiskManager - Correlation Analysis", () => {
  let rm: PortfolioRiskManager;

  beforeEach(() => {
    rm = new PortfolioRiskManager(100_000);
  });

  it("should return 0 correlation for unknown pair", () => {
    expect(rm.getCorrelation("AAPL", "MSFT")).toBe(0);
  });

  it("should store and retrieve correlation", () => {
    rm.updateCorrelation("AAPL", "MSFT", 0.85);
    expect(rm.getCorrelation("AAPL", "MSFT")).toBe(0.85);
  });

  it("should retrieve correlation regardless of symbol order", () => {
    rm.updateCorrelation("AAPL", "MSFT", 0.85);
    expect(rm.getCorrelation("MSFT", "AAPL")).toBe(0.85);
  });

  it("should find no correlated groups with no positions", () => {
    expect(rm.findCorrelatedGroups()).toEqual([]);
  });

  it("should find correlated groups", () => {
    rm.updatePosition(makePosition({ symbol: "AAPL" }));
    rm.updatePosition(makePosition({ symbol: "MSFT" }));
    rm.updatePosition(makePosition({ symbol: "GOOG" }));
    rm.updateCorrelation("AAPL", "MSFT", 0.85); // above threshold

    const groups = rm.findCorrelatedGroups();
    expect(groups.length).toBe(1);
    expect(groups[0]).toContain("AAPL");
    expect(groups[0]).toContain("MSFT");
    // GOOG should not be in any group since it's uncorrelated
    expect(groups[0]).not.toContain("GOOG");
  });

  it("should not group symbols below correlation threshold", () => {
    rm.updatePosition(makePosition({ symbol: "AAPL" }));
    rm.updatePosition(makePosition({ symbol: "MSFT" }));
    rm.updateCorrelation("AAPL", "MSFT", 0.5); // below default threshold 0.7

    const groups = rm.findCorrelatedGroups();
    expect(groups.length).toBe(0);
  });

  it("should calculate correlated exposure correctly", () => {
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        currentPrice: 150,
        quantity: 100,
      }),
    );
    rm.updatePosition(
      makePosition({
        symbol: "MSFT",
        currentPrice: 300,
        quantity: 50,
      }),
    );
    rm.updateCorrelation("AAPL", "MSFT", 0.9);

    const exposure = rm.calculateCorrelatedExposure();
    // Group exposure = (150*100 + 300*50) / 100000 = (15000 + 15000) / 100000 = 0.30
    expect(exposure).toBeCloseTo(0.30);
  });

  it("should return 0 correlated exposure when no groups exist", () => {
    rm.updatePosition(makePosition({ symbol: "AAPL" }));
    expect(rm.calculateCorrelatedExposure()).toBe(0);
  });
});

// ============================================================================
// EXPOSURE CALCULATIONS
// ============================================================================

describe("PortfolioRiskManager - Exposure Calculations", () => {
  let rm: PortfolioRiskManager;

  beforeEach(() => {
    rm = new PortfolioRiskManager(100_000);
  });

  it("should return 0 gross exposure with no positions", () => {
    expect(rm.calculateGrossExposure()).toBe(0);
  });

  it("should calculate gross exposure correctly", () => {
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        side: "long",
        currentPrice: 150,
        quantity: 100,
      }),
    );
    rm.updatePosition(
      makePosition({
        symbol: "TSLA",
        side: "short",
        currentPrice: 200,
        quantity: 50,
      }),
    );
    // gross = (|150*100| + |200*50|) / 100000 = (15000 + 10000) / 100000 = 0.25
    expect(rm.calculateGrossExposure()).toBeCloseTo(0.25);
  });

  it("should return 0 net exposure with no positions", () => {
    expect(rm.calculateNetExposure()).toBe(0);
  });

  it("should calculate net exposure correctly", () => {
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        side: "long",
        currentPrice: 150,
        quantity: 100,
      }),
    );
    rm.updatePosition(
      makePosition({
        symbol: "TSLA",
        side: "short",
        currentPrice: 200,
        quantity: 50,
      }),
    );
    // net = (15000 - 10000) / 100000 = 0.05
    expect(rm.calculateNetExposure()).toBeCloseTo(0.05);
  });

  it("should return negative net exposure when shorts dominate", () => {
    rm.updatePosition(
      makePosition({
        symbol: "TSLA",
        side: "short",
        currentPrice: 200,
        quantity: 100,
      }),
    );
    // net = (0 - 20000) / 100000 = -0.20
    expect(rm.calculateNetExposure()).toBeCloseTo(-0.20);
  });
});

// ============================================================================
// SECTOR CONCENTRATION
// ============================================================================

describe("PortfolioRiskManager - Sector Concentration", () => {
  let rm: PortfolioRiskManager;

  beforeEach(() => {
    rm = new PortfolioRiskManager(100_000);
  });

  it("should return empty sector concentration with no positions", () => {
    expect(rm.calculateSectorConcentration()).toEqual({});
  });

  it("should categorize as Unknown when no sector is set", () => {
    rm.updatePosition(
      makePosition({ symbol: "AAPL", currentPrice: 150, quantity: 100 }),
    );
    const conc = rm.calculateSectorConcentration();
    expect(conc["Unknown"]).toBeCloseTo(0.15);
  });

  it("should group positions by sector", () => {
    rm.setSector("AAPL", "Technology");
    rm.setSector("MSFT", "Technology");
    rm.setSector("JPM", "Finance");

    rm.updatePosition(
      makePosition({ symbol: "AAPL", currentPrice: 150, quantity: 100 }),
    );
    rm.updatePosition(
      makePosition({ symbol: "MSFT", currentPrice: 300, quantity: 50 }),
    );
    rm.updatePosition(
      makePosition({ symbol: "JPM", currentPrice: 100, quantity: 100 }),
    );

    const conc = rm.calculateSectorConcentration();
    // Technology: (150*100 + 300*50) / 100000 = 30000/100000 = 0.30
    // Finance: (100*100) / 100000 = 0.10
    expect(conc["Technology"]).toBeCloseTo(0.30);
    expect(conc["Finance"]).toBeCloseTo(0.10);
  });
});

// ============================================================================
// TRADE APPROVAL
// ============================================================================

describe("PortfolioRiskManager - Trade Approval", () => {
  let rm: PortfolioRiskManager;

  beforeEach(() => {
    rm = new PortfolioRiskManager(100_000);
  });

  it("should approve a small trade within all limits", () => {
    const result = rm.checkTradeProposal(
      makeProposal({
        symbol: "MSFT",
        entryPrice: 300,
        stopPrice: 295,
        quantity: 10,
      }),
    );
    // dollarRisk = |300-295| * 10 = 50
    // percentRisk = 50/100000 = 0.0005 < maxPositionHeat(0.02)
    expect(result.approved).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("should reject when kill switch is active", () => {
    rm.triggerKillSwitch("Test kill");
    const result = rm.checkTradeProposal(makeProposal());
    expect(result.approved).toBe(false);
    expect(result.reasons.some((r) => r.includes("Kill switch"))).toBe(true);
  });

  it("should reject when drawdown kills trading", () => {
    rm.updateEquity(85_000); // 15% drawdown => kill level
    const result = rm.checkTradeProposal(
      makeProposal({ symbol: "GOOG", entryPrice: 100, stopPrice: 99, quantity: 10 }),
    );
    expect(result.approved).toBe(false);
    expect(result.reasons.some((r) => r.includes("drawdown"))).toBe(true);
  });

  it("should reject when single position heat exceeds max", () => {
    // maxPositionHeat = 0.02 => max dollarRisk = 2000
    // Make a proposal with dollarRisk > 2000
    const result = rm.checkTradeProposal(
      makeProposal({
        symbol: "GOOG",
        entryPrice: 100,
        stopPrice: 80,
        quantity: 200,
      }),
    );
    // dollarRisk = |100-80| * 200 = 4000
    // percentRisk = 4000 / 100000 = 0.04 > 0.02
    expect(result.approved).toBe(false);
    expect(result.reasons.some((r) => r.includes("Position heat"))).toBe(true);
  });

  it("should reject when total heat would exceed max", () => {
    // Fill up heat close to max
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        entryPrice: 100,
        stopPrice: 70,
        quantity: 200,
      }),
    );
    // dollarRisk = 30*200 = 6000, percentRisk = 0.06 = maxHeat

    const result = rm.checkTradeProposal(
      makeProposal({
        symbol: "GOOG",
        entryPrice: 100,
        stopPrice: 99,
        quantity: 100,
      }),
    );
    expect(result.approved).toBe(false);
    expect(result.reasons.some((r) => r.includes("Total heat"))).toBe(true);
  });

  it("should reject when position size exceeds max", () => {
    // maxPositionSize = 0.20 => max position value = 20000
    const result = rm.checkTradeProposal(
      makeProposal({
        symbol: "GOOG",
        entryPrice: 500,
        stopPrice: 499,
        quantity: 50,
      }),
    );
    // positionValue = 500*50 = 25000
    // exposure = 25000 / 100000 = 0.25 > 0.20
    expect(result.approved).toBe(false);
    expect(result.reasons.some((r) => r.includes("Position size"))).toBe(true);
  });

  it("should reject when correlated exposure exceeds max", () => {
    // Add existing position correlated with the proposal
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        currentPrice: 150,
        quantity: 200,
        entryPrice: 150,
        stopPrice: 149,
      }),
    );
    rm.updateCorrelation("AAPL", "MSFT_NEW", 0.9);

    const result = rm.checkTradeProposal(
      makeProposal({
        symbol: "MSFT_NEW",
        entryPrice: 100,
        stopPrice: 99,
        quantity: 20,
      }),
    );
    // AAPL exposure = 150*200/100000 = 0.30
    // MSFT_NEW proposed = 100*20/100000 = 0.02
    // correlated total = 0.32 > maxCorrelatedExposure(0.30)
    expect(result.approved).toBe(false);
    expect(result.reasons.some((r) => r.includes("Correlated exposure"))).toBe(
      true,
    );
  });

  it("should reject when gross exposure exceeds max", () => {
    // maxGrossExposure = 2.0 => max position values = 200000
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        currentPrice: 150,
        quantity: 1300,
        entryPrice: 150,
        stopPrice: 149.99,
      }),
    );
    // gross = 150*1300 / 100000 = 1.95

    const result = rm.checkTradeProposal(
      makeProposal({
        symbol: "GOOG",
        entryPrice: 100,
        stopPrice: 99.99,
        quantity: 100,
      }),
    );
    // proposed exposure = 100*100 / 100000 = 0.10
    // total gross = 1.95 + 0.10 = 2.05 > 2.0
    expect(result.approved).toBe(false);
    expect(result.reasons.some((r) => r.includes("Gross exposure"))).toBe(true);
  });

  it("should provide adjusted quantity when rejected", () => {
    const result = rm.checkTradeProposal(
      makeProposal({
        symbol: "GOOG",
        entryPrice: 100,
        stopPrice: 80,
        quantity: 200,
      }),
    );
    // rejected due to position heat
    expect(result.approved).toBe(false);
    expect(result.adjustedQuantity).toBeDefined();
    expect(result.adjustedQuantity!).toBeGreaterThan(0);
    expect(result.adjustedQuantity!).toBeLessThan(200);
  });

  it("should return metrics with the check result", () => {
    const result = rm.checkTradeProposal(
      makeProposal({
        symbol: "GOOG",
        entryPrice: 300,
        stopPrice: 295,
        quantity: 10,
      }),
    );
    expect(result.metrics).toBeDefined();
    expect(result.metrics.proposedHeat).toBeGreaterThan(0);
    expect(result.metrics.remainingHeat).toBeGreaterThan(0);
    expect(typeof result.metrics.correlationImpact).toBe("number");
  });
});

// ============================================================================
// METRICS
// ============================================================================

describe("PortfolioRiskManager - getMetrics", () => {
  let rm: PortfolioRiskManager;

  beforeEach(() => {
    rm = new PortfolioRiskManager(100_000);
  });

  it("should return clean metrics with no positions", () => {
    const m = rm.getMetrics();
    expect(m.totalHeat).toBe(0);
    expect(m.maxHeat).toBe(0.06);
    expect(m.heatUtilization).toBe(0);
    expect(m.grossExposure).toBe(0);
    expect(m.netExposure).toBe(0);
    expect(m.longExposure).toBe(0);
    expect(m.shortExposure).toBe(0);
    expect(m.largestPosition).toBe(0);
    expect(m.correlatedGroups).toEqual([]);
    expect(m.maxCorrelatedExposure).toBe(0);
    expect(m.currentDrawdown).toBe(0);
    expect(m.drawdownScaleFactor).toBe(1.0);
    expect(m.canTrade).toBe(true);
    expect(m.blockReasons).toEqual([]);
    expect(m.killSwitchActive).toBe(false);
  });

  it("should report correct metrics with positions", () => {
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        side: "long",
        currentPrice: 150,
        quantity: 100,
        entryPrice: 150,
        stopPrice: 145,
      }),
    );
    rm.updatePosition(
      makePosition({
        symbol: "TSLA",
        side: "short",
        currentPrice: 200,
        quantity: 50,
        entryPrice: 200,
        stopPrice: 210,
      }),
    );

    const m = rm.getMetrics();
    expect(m.longExposure).toBeCloseTo(0.15); // 150*100 / 100000
    expect(m.shortExposure).toBeCloseTo(0.10); // 200*50 / 100000
    expect(m.grossExposure).toBeCloseTo(0.25);
    expect(m.netExposure).toBeCloseTo(0.05);
    expect(m.largestPosition).toBeCloseTo(0.15);
  });

  it("should report canTrade=false when heat maxed out", () => {
    rm.updatePosition(
      makePosition({
        symbol: "AAPL",
        entryPrice: 100,
        stopPrice: 70,
        quantity: 200,
      }),
    );
    // percentRisk = 30*200/100000 = 0.06 = maxHeat
    const m = rm.getMetrics();
    expect(m.canTrade).toBe(false);
    expect(m.blockReasons.some((r) => r.includes("heat"))).toBe(true);
  });

  it("should report kill switch in block reasons", () => {
    rm.triggerKillSwitch("Manual kill");
    const m = rm.getMetrics();
    expect(m.canTrade).toBe(false);
    expect(m.blockReasons.some((r) => r.includes("Kill switch"))).toBe(true);
  });

  it("should track drawdown correctly in metrics", () => {
    rm.updateEquity(92_000); // 8% drawdown
    const m = rm.getMetrics();
    expect(m.currentDrawdown).toBeCloseTo(0.08);
    expect(m.drawdownScaleFactor).toBe(0.5); // between level 1 (5%) and level 2 (10%)
  });
});
