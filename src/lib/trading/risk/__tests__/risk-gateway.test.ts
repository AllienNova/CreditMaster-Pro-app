/**
 * Risk Gateway Tests
 *
 * Covers pre-trade validation, kill switch (manual + auto-triggers),
 * concentration analysis (HHI, single position cap, sector weights),
 * portfolio risk status, loss recording, rules management, and DB persistence.
 */

import {
  RiskGateway,
  createRiskGateway,
  DEFAULT_RISK_RULES,
  type RiskRules,
  type ProposedTrade,
  type PortfolioState,
  type RiskValidation,
  type KillSwitchStatus,
  type ConcentrationReport,
} from "../risk-gateway";
import { CorrelationMonitor } from "@/lib/trading/correlation-monitor";

// ============================================================================
// MOCK: supabaseAdmin
// ============================================================================

jest.mock("@/lib/supabase/server", () => {
  const upsert = jest.fn().mockResolvedValue({ data: null, error: null });
  const select = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  });
  const from = jest.fn().mockReturnValue({
    upsert,
    select,
  });

  return {
    __mockUpsert: upsert,
    __mockSelect: select,
    __mockFrom: from,
    supabaseAdmin: { from },
  };
});

// ============================================================================
// MOCK: CorrelationMonitor
// ============================================================================

jest.mock("@/lib/trading/correlation-monitor", () => {
  const monitor = {
    detectRegimeChange: jest.fn().mockReturnValue([]),
    getSymbols: jest.fn().mockReturnValue([]),
    getCorrelationMatrix: jest.fn().mockReturnValue({
      symbols: [],
      matrix: [],
      timestamp: new Date(),
      windowDays: 60,
    }),
    ingestPrices: jest.fn(),
    ingestReturns: jest.fn(),
  };

  return {
    __mockMonitor: monitor,
    CorrelationMonitor: jest.fn().mockImplementation(() => monitor),
    correlationMonitor: monitor,
  };
});

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

function makeHealthyPortfolio(): PortfolioState {
  return {
    totalValue: 100000,
    cashBalance: 30000,
    positions: [
      { symbol: "AAPL", value: 9000, percent: 9, sector: "Technology" },
      { symbol: "MSFT", value: 9000, percent: 9, sector: "Technology" },
      { symbol: "JPM", value: 8000, percent: 8, sector: "Financials" },
      { symbol: "JNJ", value: 8000, percent: 8, sector: "Healthcare" },
      { symbol: "XOM", value: 7000, percent: 7, sector: "Energy" },
      { symbol: "PG", value: 7000, percent: 7, sector: "Consumer Staples" },
      { symbol: "NEE", value: 7000, percent: 7, sector: "Utilities" },
      { symbol: "AMT", value: 7000, percent: 7, sector: "Real Estate" },
      { symbol: "UNP", value: 8000, percent: 8, sector: "Industrials" },
    ],
    dailyPnL: 500,
    weeklyPnL: 1200,
    drawdown: 2,
    openPositionCount: 9,
  };
}

function makeSmallBuyTrade(): ProposedTrade {
  return {
    symbol: "MSFT",
    side: "buy",
    quantity: 10,
    price: 300,
    stopLoss: 294,
    signalConsensus: 0.8,
    signalConfidence: 0.7,
    sector: "Technology",
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("RiskGateway", () => {
  let gw: RiskGateway;

  beforeEach(() => {
    // Re-setup mock implementations after resetMocks clears them
    const {
      __mockUpsert: upsert,
      __mockSelect: select,
      __mockFrom: from,
    } = jest.requireMock("@/lib/supabase/server");

    upsert.mockResolvedValue({ data: null, error: null });
    select.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    from.mockReturnValue({
      upsert: upsert,
      select: select,
    });

    const { __mockMonitor: monitor, CorrelationMonitor: MockCtor } =
      jest.requireMock("@/lib/trading/correlation-monitor");

    monitor.detectRegimeChange.mockReturnValue([]);
    monitor.getSymbols.mockReturnValue([]);
    monitor.getCorrelationMatrix.mockReturnValue({
      symbols: [],
      matrix: [],
      timestamp: new Date(),
      windowDays: 60,
    });
    MockCtor.mockImplementation(() => monitor);

    gw = new RiskGateway("user-123");
  });

  // --------------------------------------------------------------------------
  // Constructor & Factory
  // --------------------------------------------------------------------------

  describe("constructor / createRiskGateway", () => {
    it("should initialise with default rules when none provided", () => {
      const rules = gw.getRules();
      expect(rules.maxPositionSize).toBe(DEFAULT_RISK_RULES.maxPositionSize);
      expect(rules.maxDrawdown).toBe(DEFAULT_RISK_RULES.maxDrawdown);
    });

    it("should merge partial rule overrides with defaults", () => {
      const custom = new RiskGateway("u1", { maxDrawdown: 25 });
      const rules = custom.getRules();
      expect(rules.maxDrawdown).toBe(25);
      expect(rules.maxPositionSize).toBe(DEFAULT_RISK_RULES.maxPositionSize);
    });

    it("should create an instance via factory function", () => {
      const instance = createRiskGateway("u2", { maxOpenPositions: 5 });
      expect(instance).toBeInstanceOf(RiskGateway);
      expect(instance.getRules().maxOpenPositions).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // validateTrade — Happy Path
  // --------------------------------------------------------------------------

  describe("validateTrade — approved trades", () => {
    it("should approve a small buy within all limits", async () => {
      const portfolio = makeHealthyPortfolio();
      const trade = makeSmallBuyTrade();

      const result = await gw.validateTrade(trade, portfolio);

      expect(result.approved).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should approve a sell trade even at max open positions", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.openPositionCount = 20; // at max
      const trade: ProposedTrade = {
        symbol: "AAPL",
        side: "sell",
        quantity: 5,
        price: 150,
        stopLoss: 153,
      };

      const result = await gw.validateTrade(trade, portfolio);

      // sell should not be blocked by max open positions
      expect(
        result.violations.find((v) => v.rule === "max_open_positions"),
      ).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // validateTrade — Violations
  // --------------------------------------------------------------------------

  describe("validateTrade — position size limit", () => {
    it("should reject a trade exceeding maxPositionSize", async () => {
      const portfolio = makeHealthyPortfolio();
      // 200 * 100 = 20000, 20% of 100k portfolio — exceeds 10% default
      const trade: ProposedTrade = {
        symbol: "TSLA",
        side: "buy",
        quantity: 200,
        price: 100,
        stopLoss: 98,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };

      const result = await gw.validateTrade(trade, portfolio);

      expect(result.approved).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "max_position_size"),
      ).toBe(true);
    });

    it("should suggest an adjusted trade when position is oversized", async () => {
      const portfolio = makeHealthyPortfolio();
      const trade: ProposedTrade = {
        symbol: "TSLA",
        side: "buy",
        quantity: 200,
        price: 100,
        stopLoss: 98,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };

      const result = await gw.validateTrade(trade, portfolio);

      expect(result.adjustedTrade).toBeDefined();
      expect(result.adjustedTrade!.quantity).toBeLessThan(200);
      // Adjusted quantity should fit within maxPositionSize
      const adjustedPct =
        ((result.adjustedTrade!.quantity * trade.price) /
          portfolio.totalValue) *
        100;
      expect(adjustedPct).toBeLessThanOrEqual(
        DEFAULT_RISK_RULES.maxPositionSize,
      );
    });
  });

  describe("validateTrade — cash reserve", () => {
    it("should reject a trade that drains cash below minimum reserve", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.cashBalance = 11000; // just above 10% of 100k
      // Trade costs 10000 — leaves only 1k = 1%, below 10% min
      const trade: ProposedTrade = {
        symbol: "MSFT",
        side: "buy",
        quantity: 50,
        price: 200,
        stopLoss: 196,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };

      const result = await gw.validateTrade(trade, portfolio);

      expect(result.approved).toBe(false);
      expect(result.violations.some((v) => v.rule === "min_cash_reserve")).toBe(
        true,
      );
    });
  });

  describe("validateTrade — open positions limit", () => {
    it("should reject a buy when at max open positions", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.openPositionCount = 20;

      const trade = makeSmallBuyTrade();
      const result = await gw.validateTrade(trade, portfolio);

      expect(result.approved).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "max_open_positions"),
      ).toBe(true);
    });
  });

  describe("validateTrade — daily loss limit", () => {
    it("should reject when daily loss percent has reached maxDailyLoss", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.dailyPnL = -2000; // 2% of 100k = at limit

      const trade = makeSmallBuyTrade();
      const result = await gw.validateTrade(trade, portfolio);

      expect(result.approved).toBe(false);
      expect(result.violations.some((v) => v.rule === "max_daily_loss")).toBe(
        true,
      );
    });
  });

  describe("validateTrade — drawdown auto-kill-switch", () => {
    it("should reject and trigger kill switch when drawdown >= maxDrawdown", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.drawdown = 15; // at the 15% default limit

      const trade = makeSmallBuyTrade();
      const result = await gw.validateTrade(trade, portfolio);

      expect(result.approved).toBe(false);
      expect(result.violations.some((v) => v.rule === "max_drawdown")).toBe(
        true,
      );

      // Kill switch should now be active
      const ks = gw.getKillSwitchStatus();
      expect(ks.active).toBe(true);
      expect(ks.triggerType).toBe("max_drawdown");
      expect(ks.triggeredBy).toBe("system");
    });
  });

  describe("validateTrade — sector exposure", () => {
    it("should reject when sector exposure exceeds limit", async () => {
      const portfolio = makeHealthyPortfolio();
      // Technology already at 25% + 8% new = 33%, over 25% limit
      const trade: ProposedTrade = {
        symbol: "NVDA",
        side: "buy",
        quantity: 40,
        price: 200,
        stopLoss: 196,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
        sector: "Technology",
      };

      const result = await gw.validateTrade(trade, portfolio);

      expect(result.approved).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "max_sector_exposure"),
      ).toBe(true);
    });

    it("should use per-sector weight limit from maxSectorWeights if defined", async () => {
      const gwCustom = new RiskGateway("user-123", {
        maxSectorWeights: { Technology: 50 }, // generous limit for tech
      });
      const portfolio = makeHealthyPortfolio();
      const trade: ProposedTrade = {
        symbol: "NVDA",
        side: "buy",
        quantity: 40,
        price: 200,
        stopLoss: 196,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
        sector: "Technology",
      };

      const result = await gwCustom.validateTrade(trade, portfolio);

      // 25% existing + 8% trade = 33%, under 50% custom limit
      expect(
        result.violations.find((v) => v.rule === "max_sector_exposure"),
      ).toBeUndefined();
    });
  });

  describe("validateTrade — single position hard cap", () => {
    it("should reject when position exceeds maxSinglePositionPct", async () => {
      const portfolio = makeHealthyPortfolio();
      // 200 * 100 = 20000 = 20% of 100k, exceeds 15% hard cap
      const trade: ProposedTrade = {
        symbol: "TSLA",
        side: "buy",
        quantity: 200,
        price: 100,
        stopLoss: 98,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };

      const result = await gw.validateTrade(trade, portfolio);

      expect(
        result.violations.some((v) => v.rule === "max_single_position"),
      ).toBe(true);
    });
  });

  describe("validateTrade — HHI concentration", () => {
    it("should reject a buy that pushes HHI above maxHHI", async () => {
      const portfolio: PortfolioState = {
        totalValue: 100000,
        cashBalance: 50000,
        positions: [{ symbol: "AAPL", value: 45000, percent: 45 }],
        dailyPnL: 0,
        weeklyPnL: 0,
        drawdown: 0,
        openPositionCount: 1,
      };
      // Existing AAPL at 45% + 6% more = 51%  =>  HHI for single holding = 51^2 = 2601
      // A buy of 6000 at 60*100 adds 6% to AAPL's percent
      const trade: ProposedTrade = {
        symbol: "AAPL",
        side: "buy",
        quantity: 60,
        price: 100,
        stopLoss: 98,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };

      const result = await gw.validateTrade(trade, portfolio);

      expect(
        result.violations.some((v) => v.rule === "max_hhi_concentration"),
      ).toBe(true);
    });

    it("should warn when HHI approaches the limit (>80% of maxHHI)", async () => {
      const portfolio: PortfolioState = {
        totalValue: 100000,
        cashBalance: 50000,
        positions: [
          { symbol: "AAPL", value: 20000, percent: 20 },
          { symbol: "MSFT", value: 20000, percent: 20 },
          { symbol: "GOOG", value: 10000, percent: 10 },
        ],
        dailyPnL: 0,
        weeklyPnL: 0,
        drawdown: 0,
        openPositionCount: 3,
      };
      // Current HHI = 20^2 + 20^2 + 10^2 = 400+400+100 = 900
      // Adding AMZN at 30% => HHI = 400+400+100+900 = 1800
      // Warning threshold = 2500*0.8 = 2000 => 1800 < 2000, no warning
      // Let's increase to trigger warning: AMZN at ~35%
      const trade: ProposedTrade = {
        symbol: "AMZN",
        side: "buy",
        quantity: 175,
        price: 200,
        stopLoss: 196,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };
      // 175*200 = 35000 = 35% => HHI = 400+400+100+1225 = 2125, above 2000 warning

      const result = await gw.validateTrade(trade, portfolio);

      expect(
        result.warnings.some((w) => w.rule === "hhi_concentration_warning"),
      ).toBe(true);
    });
  });

  describe("validateTrade — signal consensus / confidence", () => {
    it("should reject when signalConsensus below minimum", async () => {
      const portfolio = makeHealthyPortfolio();
      const trade: ProposedTrade = {
        symbol: "MSFT",
        side: "buy",
        quantity: 5,
        price: 300,
        stopLoss: 294,
        signalConsensus: 0.3, // below 0.6 default
        signalConfidence: 0.7,
      };

      const result = await gw.validateTrade(trade, portfolio);

      expect(
        result.violations.some((v) => v.rule === "min_signal_consensus"),
      ).toBe(true);
    });

    it("should reject when signalConfidence below minimum", async () => {
      const portfolio = makeHealthyPortfolio();
      const trade: ProposedTrade = {
        symbol: "MSFT",
        side: "buy",
        quantity: 5,
        price: 300,
        stopLoss: 294,
        signalConsensus: 0.8,
        signalConfidence: 0.2, // below 0.5 default
      };

      const result = await gw.validateTrade(trade, portfolio);

      expect(result.violations.some((v) => v.rule === "min_confidence")).toBe(
        true,
      );
    });
  });

  describe("validateTrade — stop loss checks", () => {
    it("should warn when no stop loss is defined", async () => {
      const portfolio = makeHealthyPortfolio();
      const trade: ProposedTrade = {
        symbol: "MSFT",
        side: "buy",
        quantity: 5,
        price: 300,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
        // no stopLoss
      };

      const result = await gw.validateTrade(trade, portfolio);

      expect(result.warnings.some((w) => w.rule === "missing_stop_loss")).toBe(
        true,
      );
    });

    it("should reject when stop loss risk exceeds maxLossPerTrade", async () => {
      const portfolio = makeHealthyPortfolio();
      const trade: ProposedTrade = {
        symbol: "MSFT",
        side: "buy",
        quantity: 5,
        price: 300,
        stopLoss: 285, // 5% risk, above 2% default
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };

      const result = await gw.validateTrade(trade, portfolio);

      expect(
        result.violations.some((v) => v.rule === "max_loss_per_trade"),
      ).toBe(true);
    });
  });

  describe("validateTrade — weekly loss warning", () => {
    it("should warn when weekly loss is approaching the limit", async () => {
      const portfolio = makeHealthyPortfolio();
      // 80% of 5% weekly limit on 100k = 4000 loss
      portfolio.weeklyPnL = -4000;

      const trade = makeSmallBuyTrade();
      const result = await gw.validateTrade(trade, portfolio);

      expect(
        result.warnings.some((w) => w.rule === "weekly_loss_warning"),
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Kill Switch
  // --------------------------------------------------------------------------

  describe("kill switch — manual", () => {
    it("should block all trades when kill switch is active", async () => {
      await gw.triggerKillSwitch("Manual halt for review", "manual");

      const portfolio = makeHealthyPortfolio();
      const trade = makeSmallBuyTrade();
      const result = await gw.validateTrade(trade, portfolio);

      expect(result.approved).toBe(false);
      expect(result.violations[0].rule).toBe("kill_switch");
      expect(result.violations[0].severity).toBe("critical");
    });

    it('should set triggeredBy to "user" for manual trigger', async () => {
      await gw.triggerKillSwitch("Testing", "manual");

      const ks = gw.getKillSwitchStatus();
      expect(ks.active).toBe(true);
      expect(ks.triggeredBy).toBe("user");
      expect(ks.triggerType).toBe("manual");
      expect(ks.triggeredAt).toBeInstanceOf(Date);
    });

    it("should reset when valid confirmation is provided", async () => {
      await gw.triggerKillSwitch("Test halt", "manual");
      expect(gw.getKillSwitchStatus().active).toBe(true);

      const resetResult = await gw.resetKillSwitch("user-123", "CONFIRM_RESET");
      expect(resetResult).toBe(true);
      expect(gw.getKillSwitchStatus().active).toBe(false);
    });

    it("should NOT reset with wrong confirmation string", async () => {
      await gw.triggerKillSwitch("Test halt", "manual");

      const resetResult = await gw.resetKillSwitch("user-123", "please reset");
      expect(resetResult).toBe(false);
      expect(gw.getKillSwitchStatus().active).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Kill Switch — Auto-Triggers (RSK-003)
  // --------------------------------------------------------------------------

  describe("kill switch — loss velocity auto-trigger", () => {
    it("should trigger when loss velocity exceeds threshold", async () => {
      // Default: 3%/hr threshold, 1hr window
      // Record 3 losses rapidly: 1% each, within same ms — total 3%/hr in a 1hr window
      const res1 = await gw.recordLoss(1);
      expect(res1.triggered).toBe(false);
      const res2 = await gw.recordLoss(1);
      expect(res2.triggered).toBe(false);
      const res3 = await gw.recordLoss(1);

      expect(res3.triggered).toBe(true);
      expect(res3.reason).toContain("velocity");
      expect(gw.getKillSwitchStatus().active).toBe(true);
      expect(gw.getKillSwitchStatus().triggerType).toBe("loss_velocity");
    });

    it("should report current loss velocity via getLossVelocity()", async () => {
      await gw.recordLoss(1);
      await gw.recordLoss(0.5);

      const velocity = gw.getLossVelocity();
      expect(velocity).toBeGreaterThan(0);
    });
  });

  describe("kill switch — consecutive losses auto-trigger", () => {
    it("should trigger when consecutive losses reach the limit", async () => {
      // Default limit is 5 consecutive losses
      // Use a low velocity to avoid velocity trigger first:
      // Each loss is 0.1% — total 0.5%/hr which is below 3% threshold
      for (let i = 0; i < 4; i++) {
        const res = await gw.recordLoss(0.1);
        expect(res.triggered).toBe(false);
      }

      const finalRes = await gw.recordLoss(0.1);
      expect(finalRes.triggered).toBe(true);
      expect(finalRes.reason).toContain("consecutive");
      expect(gw.getKillSwitchStatus().triggerType).toBe("consecutive_losses");
    });

    it("should reset consecutive loss counter on a win", async () => {
      await gw.recordLoss(0.1);
      await gw.recordLoss(0.1);
      expect(gw.getConsecutiveLosses()).toBe(2);

      gw.recordWin();
      expect(gw.getConsecutiveLosses()).toBe(0);
    });
  });

  describe("kill switch — correlation spike auto-trigger", () => {
    it("should trigger when correlation spike exceeds threshold", async () => {
      const monitor = new CorrelationMonitor();
      (monitor.detectRegimeChange as jest.Mock).mockReturnValue([
        {
          severity: "critical",
          timestamp: new Date(),
          affectedPairs: [
            { pair: ["AAPL", "JPM"], before: 0.2, after: 0.8 }, // delta 0.6
          ],
        },
      ]);

      gw.setCorrelationMonitor(monitor);
      const portfolio = makeHealthyPortfolio();
      const trade = makeSmallBuyTrade();

      const result = await gw.validateTrade(trade, portfolio);

      expect(
        result.violations.some((v) => v.rule === "correlation_spike_halt"),
      ).toBe(true);
      expect(gw.getKillSwitchStatus().active).toBe(true);
      expect(gw.getKillSwitchStatus().triggerType).toBe("correlation_spike");
    });

    it("should NOT trigger for low severity regime events", async () => {
      const monitor = new CorrelationMonitor();
      (monitor.detectRegimeChange as jest.Mock).mockReturnValue([
        {
          severity: "low",
          timestamp: new Date(),
          affectedPairs: [{ pair: ["AAPL", "JPM"], before: 0.3, after: 0.4 }],
        },
      ]);

      gw.setCorrelationMonitor(monitor);
      const portfolio = makeHealthyPortfolio();
      const trade = makeSmallBuyTrade();

      const result = await gw.validateTrade(trade, portfolio);

      expect(
        result.violations.find((v) => v.rule === "correlation_spike_halt"),
      ).toBeUndefined();
      expect(gw.getKillSwitchStatus().active).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Concentration Analysis (RSK-006)
  // --------------------------------------------------------------------------

  describe("calculateHHI", () => {
    it("should return 10000 for a single-holding portfolio", () => {
      expect(gw.calculateHHI([100])).toBe(10000);
    });

    it("should return sum of squared percentages", () => {
      // Equal-weight 4 positions: 25% each => 4 * 625 = 2500
      expect(gw.calculateHHI([25, 25, 25, 25])).toBe(2500);
    });

    it("should return 0 for empty array", () => {
      expect(gw.calculateHHI([])).toBe(0);
    });

    it("should return higher HHI for more concentrated portfolios", () => {
      const diversified = gw.calculateHHI([20, 20, 20, 20, 20]);
      const concentrated = gw.calculateHHI([60, 10, 10, 10, 10]);
      expect(concentrated).toBeGreaterThan(diversified);
    });
  });

  describe("getConcentrationReport", () => {
    it("should return full concentration report with HHI and violations", () => {
      const portfolio: PortfolioState = {
        totalValue: 100000,
        cashBalance: 10000,
        positions: [
          { symbol: "AAPL", value: 60000, percent: 60, sector: "Technology" },
          { symbol: "JPM", value: 20000, percent: 20, sector: "Financials" },
          { symbol: "JNJ", value: 10000, percent: 10, sector: "Healthcare" },
        ],
        dailyPnL: 0,
        weeklyPnL: 0,
        drawdown: 0,
        openPositionCount: 3,
      };

      const report = gw.getConcentrationReport(portfolio);

      // HHI = 60^2 + 20^2 + 10^2 = 3600+400+100 = 4100
      expect(report.hhi).toBe(4100);
      expect(
        report.violations.some((v) => v.rule === "max_hhi_concentration"),
      ).toBe(true);
      expect(
        report.violations.some((v) => v.rule === "max_single_position"),
      ).toBe(true);
      expect(report.topHolding?.symbol).toBe("AAPL");
      expect(report.topHolding?.pct).toBe(60);
    });

    it("should compute normalized HHI between 0 and 1", () => {
      const portfolio: PortfolioState = {
        totalValue: 100000,
        cashBalance: 0,
        positions: [
          { symbol: "A", value: 60000, percent: 60 },
          { symbol: "B", value: 40000, percent: 40 },
        ],
        dailyPnL: 0,
        weeklyPnL: 0,
        drawdown: 0,
        openPositionCount: 2,
      };

      const report = gw.getConcentrationReport(portfolio);

      expect(report.normalizedHHI).toBeGreaterThanOrEqual(0);
      expect(report.normalizedHHI).toBeLessThanOrEqual(1);
    });

    it("should aggregate sector weights", () => {
      const portfolio: PortfolioState = {
        totalValue: 100000,
        cashBalance: 20000,
        positions: [
          { symbol: "AAPL", value: 30000, percent: 30, sector: "Technology" },
          { symbol: "MSFT", value: 20000, percent: 20, sector: "Technology" },
          { symbol: "JPM", value: 30000, percent: 30, sector: "Financials" },
        ],
        dailyPnL: 0,
        weeklyPnL: 0,
        drawdown: 0,
        openPositionCount: 3,
      };

      const report = gw.getConcentrationReport(portfolio);

      expect(report.sectorWeights["Technology"]).toBe(50);
      expect(report.sectorWeights["Financials"]).toBe(30);
      // Technology at 50% exceeds 25% sector limit
      expect(
        report.violations.some((v) => v.rule === "sector_weight_limit"),
      ).toBe(true);
    });

    it("should return null topHolding for empty portfolio", () => {
      const portfolio: PortfolioState = {
        totalValue: 100000,
        cashBalance: 100000,
        positions: [],
        dailyPnL: 0,
        weeklyPnL: 0,
        drawdown: 0,
        openPositionCount: 0,
      };

      const report = gw.getConcentrationReport(portfolio);

      expect(report.topHolding).toBeNull();
      expect(report.hhi).toBe(0);
    });

    it("should warn when sector weight approaches limit (>85%)", () => {
      const portfolio: PortfolioState = {
        totalValue: 100000,
        cashBalance: 40000,
        positions: [
          { symbol: "AAPL", value: 22000, percent: 22, sector: "Technology" },
          { symbol: "JPM", value: 38000, percent: 38, sector: "Financials" },
        ],
        dailyPnL: 0,
        weeklyPnL: 0,
        drawdown: 0,
        openPositionCount: 2,
      };

      const report = gw.getConcentrationReport(portfolio);

      // Technology at 22% — 85% of 25% = 21.25 => 22% > 21.25 => warning
      expect(
        report.warnings.some(
          (w) => w.rule === "sector_weight_warning" && w.currentValue === 22,
        ),
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Portfolio Risk Status
  // --------------------------------------------------------------------------

  describe("checkPortfolioRisk", () => {
    it("should return healthy for a well-balanced portfolio", async () => {
      const portfolio = makeHealthyPortfolio();
      const check = await gw.checkPortfolioRisk(portfolio);

      expect(check.status).toBe("healthy");
      expect(check.issues).toHaveLength(0);
      expect(check.metrics.cashPercent).toBe(30);
      expect(check.metrics.positionCount).toBe(9);
    });

    it("should return critical when drawdown at limit", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.drawdown = 15;

      const check = await gw.checkPortfolioRisk(portfolio);

      expect(check.status).toBe("critical");
      expect(check.issues.length).toBeGreaterThan(0);
    });

    it("should return critical when daily loss at limit", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.dailyPnL = -2000;

      const check = await gw.checkPortfolioRisk(portfolio);

      expect(check.status).toBe("critical");
    });

    it("should return warning when drawdown approaching limit", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.drawdown = 12.5; // 83% of 15% limit

      const check = await gw.checkPortfolioRisk(portfolio);

      expect(check.status).toBe("warning");
    });

    it("should return warning when cash reserve is low", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.cashBalance = 12000; // 12% — below 15% (1.5x of 10% min)

      const check = await gw.checkPortfolioRisk(portfolio);

      expect(check.status).toBe("warning");
      expect(check.issues.some((i) => i.includes("Cash"))).toBe(true);
    });

    it("should return warning when largest position near limit", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.positions = [{ symbol: "AAPL", value: 92000, percent: 92 }];

      const check = await gw.checkPortfolioRisk(portfolio);

      expect(check.status).toBe("warning");
      expect(check.issues.some((i) => i.includes("Largest position"))).toBe(
        true,
      );
    });
  });

  // --------------------------------------------------------------------------
  // Rules Management
  // --------------------------------------------------------------------------

  describe("rules management", () => {
    it("should return a copy of rules (not a reference)", () => {
      const rules = gw.getRules();
      rules.maxDrawdown = 999;
      expect(gw.getRules().maxDrawdown).toBe(DEFAULT_RISK_RULES.maxDrawdown);
    });

    it("should update rules and persist to DB", async () => {
      await gw.updateRules({ maxDrawdown: 20, maxDailyLoss: 3 });

      const rules = gw.getRules();
      expect(rules.maxDrawdown).toBe(20);
      expect(rules.maxDailyLoss).toBe(3);
      // Should have called supabase upsert
      const { __mockFrom: from } = jest.requireMock("@/lib/supabase/server");
      expect(from).toHaveBeenCalledWith("risk_rules");
    });
  });

  describe("loadRules", () => {
    it("should load rules from database when available", async () => {
      const mockData = {
        max_position_size: 8,
        max_sector_exposure: 20,
        max_drawdown: 12,
        max_daily_loss: 1.5,
        max_weekly_loss: 4,
        max_loss_per_trade: 1,
        max_open_positions: 15,
        max_correlated_exposure: 25,
        min_cash_reserve: 15,
        margin_utilization_limit: 40,
        trading_hours_only: false,
        no_trades_before_earnings: 3,
        no_trades_around_fomc: false,
        min_signal_consensus: 0.7,
        min_confidence: 0.6,
        loss_velocity_window_ms: 7200000,
        loss_velocity_threshold: 5,
        correlation_spike_threshold: 0.4,
        max_consecutive_losses: 3,
        max_hhi: 3000,
        max_single_position_pct: 20,
        max_sector_weights: { Technology: 30 },
        kill_switch_active: true,
        kill_switch_reason: "DB loaded halt",
        kill_switch_triggered_at: "2026-01-15T00:00:00.000Z",
        kill_switch_triggered_by: "system",
        kill_switch_trigger_type: "max_drawdown",
      };

      // Override mock for this test
      const { __mockFrom: from, __mockUpsert: upsert } = jest.requireMock(
        "@/lib/supabase/server",
      );
      from.mockReturnValueOnce({
        upsert: upsert,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      await gw.loadRules();

      const rules = gw.getRules();
      expect(rules.maxPositionSize).toBe(8);
      expect(rules.maxDrawdown).toBe(12);
      expect(rules.maxConsecutiveLosses).toBe(3);
      expect(rules.maxSectorWeights).toEqual({ Technology: 30 });

      // Kill switch should also be loaded
      const ks = gw.getKillSwitchStatus();
      expect(ks.active).toBe(true);
      expect(ks.reason).toBe("DB loaded halt");
      expect(ks.triggerType).toBe("max_drawdown");
    });

    it("should keep defaults when database returns no data", async () => {
      const { __mockFrom: from, __mockUpsert: upsert } = jest.requireMock(
        "@/lib/supabase/server",
      );
      from.mockReturnValueOnce({
        upsert: upsert,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      await gw.loadRules();

      const rules = gw.getRules();
      expect(rules.maxPositionSize).toBe(DEFAULT_RISK_RULES.maxPositionSize);
    });

    it("should survive database errors gracefully", async () => {
      const { __mockFrom: from, __mockUpsert: upsert } = jest.requireMock(
        "@/lib/supabase/server",
      );
      from.mockReturnValueOnce({
        upsert: upsert,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error("DB down")),
          }),
        }),
      });

      // Should not throw
      await expect(gw.loadRules()).resolves.toBeUndefined();
      // Rules should remain at defaults
      expect(gw.getRules().maxPositionSize).toBe(
        DEFAULT_RISK_RULES.maxPositionSize,
      );
    });
  });

  // --------------------------------------------------------------------------
  // DEFAULT_RISK_RULES
  // --------------------------------------------------------------------------

  describe("DEFAULT_RISK_RULES", () => {
    it("should have sensible default values", () => {
      expect(DEFAULT_RISK_RULES.maxPositionSize).toBe(10);
      expect(DEFAULT_RISK_RULES.maxDailyLoss).toBe(2);
      expect(DEFAULT_RISK_RULES.maxDrawdown).toBe(15);
      expect(DEFAULT_RISK_RULES.maxConsecutiveLosses).toBe(5);
      expect(DEFAULT_RISK_RULES.maxHHI).toBe(2500);
      expect(DEFAULT_RISK_RULES.maxSinglePositionPct).toBe(15);
      expect(DEFAULT_RISK_RULES.lossVelocityThreshold).toBe(3);
      expect(DEFAULT_RISK_RULES.correlationSpikeThreshold).toBe(0.3);
    });
  });
});
