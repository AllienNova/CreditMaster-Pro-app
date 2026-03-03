/**
 * Risk Gateway Enhanced Tests — 3-Gate Architecture
 *
 * Tests the new gate-based validation: preTradeCompliance, riskLimits,
 * executionGate, validateTradeEnhanced, and recordCircuitBreakerEvent.
 *
 * Does NOT modify or duplicate existing risk-gateway.test.ts — only tests
 * the new enhanced methods and types.
 */

import {
  RiskGateway,
  DEFAULT_RISK_RULES,
  type ProposedTrade,
  type PortfolioState,
  type TradeContext,
  type OperatingMode,
  type EnhancedRiskValidation,
  type RiskGateResult,
  type CircuitBreakerEventInput,
} from "../risk-gateway";
import { CorrelationMonitor } from "@/lib/trading/correlation-monitor";

// ============================================================================
// MOCK: supabaseAdmin
// ============================================================================

jest.mock("@/lib/supabase/server", () => {
  const upsert = jest.fn().mockResolvedValue({ data: null, error: null });
  const insert = jest.fn().mockResolvedValue({ data: null, error: null });
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
    insert,
    select,
  });

  return {
    __mockUpsert: upsert,
    __mockInsert: insert,
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

function makeContext(overrides?: Partial<TradeContext>): TradeContext {
  return {
    trade: makeSmallBuyTrade(),
    portfolio: makeHealthyPortfolio(),
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("RiskGateway — 3-Gate Enhanced Architecture", () => {
  let gw: RiskGateway;

  beforeEach(() => {
    // Re-setup mock implementations
    const {
      __mockUpsert: upsert,
      __mockInsert: insert,
      __mockSelect: select,
      __mockFrom: from,
    } = jest.requireMock("@/lib/supabase/server");

    upsert.mockResolvedValue({ data: null, error: null });
    insert.mockResolvedValue({ data: null, error: null });
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
      insert: insert,
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

    gw = new RiskGateway("user-enhanced-123");
  });

  // --------------------------------------------------------------------------
  // Gate 1: preTradeCompliance
  // --------------------------------------------------------------------------

  describe("Gate 1: preTradeCompliance", () => {
    it("should pass when no kill switch, no mode restriction, and no compliance issue", async () => {
      const ctx = makeContext({
        operatingMode: "guided",
        complianceScore: 85,
      });

      const result = await gw.preTradeCompliance(ctx);

      expect(result.gate).toBe("compliance");
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should fail with kill switch active", async () => {
      await gw.triggerKillSwitch("Emergency halt", "manual");

      const ctx = makeContext();
      const result = await gw.preTradeCompliance(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe("kill_switch");
      expect(result.violations[0].severity).toBe("critical");
    });

    it("should fail in WATCH mode", async () => {
      const ctx = makeContext({ operatingMode: "watch" });

      const result = await gw.preTradeCompliance(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "watch_mode_restriction"))
        .toBe(true);
    });

    it("should fail when compliance score is below 50", async () => {
      const ctx = makeContext({ complianceScore: 35 });

      const result = await gw.preTradeCompliance(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "low_compliance_score"))
        .toBe(true);
    });

    it("should warn when compliance score is between 50 and 70", async () => {
      const ctx = makeContext({ complianceScore: 60 });

      const result = await gw.preTradeCompliance(ctx);

      expect(result.passed).toBe(true);
      expect(result.warnings.some((w) => w.rule === "compliance_score_warning"))
        .toBe(true);
    });

    it("should not flag compliance when score is not provided", async () => {
      const ctx = makeContext();
      // no complianceScore set

      const result = await gw.preTradeCompliance(ctx);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should report both kill switch and watch mode violations simultaneously", async () => {
      await gw.triggerKillSwitch("Emergency", "manual");
      const ctx = makeContext({ operatingMode: "watch" });

      const result = await gw.preTradeCompliance(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
      expect(result.violations.some((v) => v.rule === "kill_switch")).toBe(true);
      expect(result.violations.some((v) => v.rule === "watch_mode_restriction"))
        .toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Gate 2: riskLimits
  // --------------------------------------------------------------------------

  describe("Gate 2: riskLimits", () => {
    it("should pass for a small trade within all limits", async () => {
      const ctx = makeContext();

      const result = await gw.riskLimits(ctx);

      expect(result.gate).toBe("risk_limits");
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should fail for oversized position", async () => {
      const trade: ProposedTrade = {
        symbol: "TSLA",
        side: "buy",
        quantity: 200,
        price: 100,
        stopLoss: 98,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };
      const ctx = makeContext({ trade });

      const result = await gw.riskLimits(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "max_position_size"))
        .toBe(true);
    });

    it("should fail when cash reserve would be depleted", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.cashBalance = 11000;
      const trade: ProposedTrade = {
        symbol: "MSFT",
        side: "buy",
        quantity: 50,
        price: 200,
        stopLoss: 196,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };
      const ctx = makeContext({ trade, portfolio });

      const result = await gw.riskLimits(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "min_cash_reserve"))
        .toBe(true);
    });

    it("should fail when at max open positions for a buy", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.openPositionCount = 20;
      const ctx = makeContext({ portfolio });

      const result = await gw.riskLimits(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "max_open_positions"))
        .toBe(true);
    });

    it("should fail when daily loss is at the limit", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.dailyPnL = -2000; // 2% of 100k
      const ctx = makeContext({ portfolio });

      const result = await gw.riskLimits(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "max_daily_loss"))
        .toBe(true);
    });

    it("should fail and trigger kill switch when drawdown >= maxDrawdown", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.drawdown = 15;
      const ctx = makeContext({ portfolio });

      const result = await gw.riskLimits(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "max_drawdown")).toBe(
        true,
      );
      expect(gw.getKillSwitchStatus().active).toBe(true);
      expect(gw.getKillSwitchStatus().triggerType).toBe("max_drawdown");
    });

    it("should fail when sector exposure exceeds limit", async () => {
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
      const ctx = makeContext({ trade });

      const result = await gw.riskLimits(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "max_sector_exposure"))
        .toBe(true);
    });

    it("should fail when single position exceeds hard cap (RSK-006)", async () => {
      const trade: ProposedTrade = {
        symbol: "TSLA",
        side: "buy",
        quantity: 200,
        price: 100,
        stopLoss: 98,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };
      const ctx = makeContext({ trade });

      const result = await gw.riskLimits(ctx);

      expect(result.violations.some((v) => v.rule === "max_single_position"))
        .toBe(true);
    });

    it("should fail when HHI exceeds maxHHI (RSK-006)", async () => {
      const portfolio: PortfolioState = {
        totalValue: 100000,
        cashBalance: 50000,
        positions: [{ symbol: "AAPL", value: 45000, percent: 45 }],
        dailyPnL: 0,
        weeklyPnL: 0,
        drawdown: 0,
        openPositionCount: 1,
      };
      const trade: ProposedTrade = {
        symbol: "AAPL",
        side: "buy",
        quantity: 60,
        price: 100,
        stopLoss: 98,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };
      const ctx = makeContext({ trade, portfolio });

      const result = await gw.riskLimits(ctx);

      expect(result.violations.some((v) => v.rule === "max_hhi_concentration"))
        .toBe(true);
    });

    it("should warn when HHI approaches the limit", async () => {
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
      // 175*200 = 35000 = 35% => HHI = 400+400+100+1225 = 2125, above 2000 warning threshold
      const trade: ProposedTrade = {
        symbol: "AMZN",
        side: "buy",
        quantity: 175,
        price: 200,
        stopLoss: 196,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };
      const ctx = makeContext({ trade, portfolio });

      const result = await gw.riskLimits(ctx);

      expect(
        result.warnings.some((w) => w.rule === "hhi_concentration_warning"),
      ).toBe(true);
    });

    it("should detect correlation spike and trigger kill switch (RSK-003)", async () => {
      const monitor = new CorrelationMonitor();
      (monitor.detectRegimeChange as jest.Mock).mockReturnValue([
        {
          severity: "critical",
          timestamp: new Date(),
          affectedPairs: [
            { pair: ["AAPL", "JPM"], before: 0.2, after: 0.8 },
          ],
        },
      ]);

      gw.setCorrelationMonitor(monitor);
      const ctx = makeContext();

      const result = await gw.riskLimits(ctx);

      expect(result.violations.some((v) => v.rule === "correlation_spike_halt"))
        .toBe(true);
      expect(gw.getKillSwitchStatus().active).toBe(true);
      expect(gw.getKillSwitchStatus().triggerType).toBe("correlation_spike");
    });
  });

  // --------------------------------------------------------------------------
  // Gate 3: executionGate
  // --------------------------------------------------------------------------

  describe("Gate 3: executionGate", () => {
    it("should pass with good signal consensus and confidence", async () => {
      const ctx = makeContext();

      const result = await gw.executionGate(ctx);

      expect(result.gate).toBe("execution");
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should fail when signal consensus below minimum", async () => {
      const trade = makeSmallBuyTrade();
      trade.signalConsensus = 0.3;
      const ctx = makeContext({ trade });

      const result = await gw.executionGate(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "min_signal_consensus"))
        .toBe(true);
    });

    it("should fail when signal confidence below minimum", async () => {
      const trade = makeSmallBuyTrade();
      trade.signalConfidence = 0.2;
      const ctx = makeContext({ trade });

      const result = await gw.executionGate(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "min_confidence")).toBe(
        true,
      );
    });

    it("should warn when stop loss is missing", async () => {
      const trade = makeSmallBuyTrade();
      delete trade.stopLoss;
      const ctx = makeContext({ trade });

      const result = await gw.executionGate(ctx);

      expect(result.passed).toBe(true);
      expect(result.warnings.some((w) => w.rule === "missing_stop_loss")).toBe(
        true,
      );
    });

    it("should fail when stop loss risk exceeds maxLossPerTrade", async () => {
      const trade = makeSmallBuyTrade();
      trade.stopLoss = 285; // 5% risk on $300 price, above 2% limit
      const ctx = makeContext({ trade });

      const result = await gw.executionGate(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.rule === "max_loss_per_trade"))
        .toBe(true);
    });

    it("should warn when weekly loss is approaching the limit", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.weeklyPnL = -4000; // 4% of 100k, >= 80% of 5% limit
      const ctx = makeContext({ portfolio });

      const result = await gw.executionGate(ctx);

      expect(result.warnings.some((w) => w.rule === "weekly_loss_warning")).toBe(
        true,
      );
    });

    // Mode-specific: AUTONOMOUS
    it("should fail autonomous mode when compliance score < 70", async () => {
      const ctx = makeContext({
        operatingMode: "autonomous",
        complianceScore: 60,
      });

      const result = await gw.executionGate(ctx);

      expect(result.passed).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "autonomous_compliance_required",
        ),
      ).toBe(true);
    });

    it("should fail autonomous mode when daily trade limit reached", async () => {
      const ctx = makeContext({
        operatingMode: "autonomous",
        complianceScore: 85,
        dailyTradeCount: 10,
        maxDailyTrades: 10,
      });

      const result = await gw.executionGate(ctx);

      expect(result.passed).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "autonomous_daily_trade_limit",
        ),
      ).toBe(true);
    });

    it("should pass autonomous mode with good compliance and trade count", async () => {
      const ctx = makeContext({
        operatingMode: "autonomous",
        complianceScore: 85,
        dailyTradeCount: 5,
        maxDailyTrades: 10,
      });

      const result = await gw.executionGate(ctx);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should not apply autonomous restrictions in guided mode", async () => {
      const ctx = makeContext({
        operatingMode: "guided",
        complianceScore: 60, // would fail autonomous but not guided
      });

      const result = await gw.executionGate(ctx);

      // guided does not check autonomous_compliance_required
      expect(
        result.violations.some(
          (v) => v.rule === "autonomous_compliance_required",
        ),
      ).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // validateTradeEnhanced — Full Pipeline
  // --------------------------------------------------------------------------

  describe("validateTradeEnhanced — full pipeline", () => {
    it("should approve a clean trade with all 3 gates passing", async () => {
      const ctx = makeContext({
        operatingMode: "autonomous",
        complianceScore: 85,
        dailyTradeCount: 2,
        maxDailyTrades: 10,
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(true);
      expect(result.gateResults).toHaveLength(3);
      expect(result.gateResults[0].gate).toBe("compliance");
      expect(result.gateResults[0].passed).toBe(true);
      expect(result.gateResults[1].gate).toBe("risk_limits");
      expect(result.gateResults[1].passed).toBe(true);
      expect(result.gateResults[2].gate).toBe("execution");
      expect(result.gateResults[2].passed).toBe(true);
      expect(result.operatingMode).toBe("autonomous");
      expect(result.confirmationRequired).toBe(false);
    });

    it("should stop at Gate 1 when kill switch is active", async () => {
      await gw.triggerKillSwitch("Test halt", "manual");
      const ctx = makeContext();

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(false);
      // Only Gate 1 should be in results because it short-circuits
      expect(result.gateResults).toHaveLength(1);
      expect(result.gateResults[0].gate).toBe("compliance");
      expect(result.gateResults[0].passed).toBe(false);
    });

    it("should stop at Gate 1 when in WATCH mode", async () => {
      const ctx = makeContext({ operatingMode: "watch" });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(false);
      expect(result.gateResults).toHaveLength(1);
      expect(result.gateResults[0].gate).toBe("compliance");
      expect(
        result.violations.some((v) => v.rule === "watch_mode_restriction"),
      ).toBe(true);
    });

    it("should proceed to Gate 2 and 3 when Gate 1 passes", async () => {
      const ctx = makeContext({
        operatingMode: "guided",
        complianceScore: 85,
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.gateResults).toHaveLength(3);
      expect(result.gateResults[0].gate).toBe("compliance");
      expect(result.gateResults[1].gate).toBe("risk_limits");
      expect(result.gateResults[2].gate).toBe("execution");
    });

    it("should collect violations from all gates when they fail", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.dailyPnL = -2000; // triggers daily loss in Gate 2
      const trade = makeSmallBuyTrade();
      trade.signalConsensus = 0.3; // triggers signal consensus in Gate 3
      const ctx = makeContext({
        trade,
        portfolio,
        complianceScore: 60, // triggers warning in Gate 1
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(false);
      expect(result.gateResults).toHaveLength(3);
      // Gate 1 passes (compliance 60 only warns, not fails)
      expect(result.gateResults[0].passed).toBe(true);
      // Gate 2 fails (daily loss)
      expect(result.gateResults[1].passed).toBe(false);
      // Gate 3 fails (signal consensus)
      expect(result.gateResults[2].passed).toBe(false);

      // All violations collected
      expect(result.violations.some((v) => v.rule === "max_daily_loss")).toBe(
        true,
      );
      expect(
        result.violations.some((v) => v.rule === "min_signal_consensus"),
      ).toBe(true);

      // Compliance warning should be present
      expect(
        result.warnings.some((w) => w.rule === "compliance_score_warning"),
      ).toBe(true);
    });

    it("should set confirmationRequired for GUIDED mode when approved", async () => {
      const ctx = makeContext({
        operatingMode: "guided",
        complianceScore: 85,
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(true);
      expect(result.confirmationRequired).toBe(true);
      expect(result.operatingMode).toBe("guided");
    });

    it("should NOT set confirmationRequired for GUIDED mode when rejected", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.dailyPnL = -2000;
      const ctx = makeContext({
        portfolio,
        operatingMode: "guided",
        complianceScore: 85,
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(false);
      expect(result.confirmationRequired).toBe(false);
    });

    it("should NOT set confirmationRequired for AUTONOMOUS mode", async () => {
      const ctx = makeContext({
        operatingMode: "autonomous",
        complianceScore: 85,
        dailyTradeCount: 2,
        maxDailyTrades: 10,
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(true);
      expect(result.confirmationRequired).toBe(false);
    });

    it("should generate circuit breaker events for critical violations", async () => {
      await gw.triggerKillSwitch("Test kill", "manual");
      const ctx = makeContext();

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.circuitBreakerEvents).toBeDefined();
      expect(result.circuitBreakerEvents!.length).toBeGreaterThan(0);
      expect(result.circuitBreakerEvents![0].breakerType).toBe("kill_switch");
      expect(result.circuitBreakerEvents![0].severity).toBe("critical");
      expect(result.circuitBreakerEvents![0].actionTaken).toBe("trade_blocked");
    });

    it("should generate circuit breaker events for critical Gate 2 violations", async () => {
      const portfolio = makeHealthyPortfolio();
      portfolio.drawdown = 15;
      const ctx = makeContext({ portfolio, complianceScore: 85 });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.circuitBreakerEvents).toBeDefined();
      const drawdownEvent = result.circuitBreakerEvents!.find(
        (e) => e.breakerType === "max_drawdown",
      );
      expect(drawdownEvent).toBeDefined();
      expect(drawdownEvent!.severity).toBe("critical");
    });

    it("should generate adjusted trade when position size is violated", async () => {
      const trade: ProposedTrade = {
        symbol: "TSLA",
        side: "buy",
        quantity: 200,
        price: 100,
        stopLoss: 98,
        signalConsensus: 0.8,
        signalConfidence: 0.7,
      };
      const ctx = makeContext({ trade, complianceScore: 85 });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.adjustedTrade).toBeDefined();
      expect(result.adjustedTrade!.quantity).toBeLessThan(200);
    });

    it("should include operatingMode in result", async () => {
      const ctx = makeContext({ operatingMode: "watch" });
      const result = await gw.validateTradeEnhanced(ctx);
      expect(result.operatingMode).toBe("watch");
    });
  });

  // --------------------------------------------------------------------------
  // recordCircuitBreakerEvent — DB persistence
  // --------------------------------------------------------------------------

  describe("recordCircuitBreakerEvent", () => {
    it("should persist event to circuit_breaker_events table", async () => {
      const { __mockFrom: from, __mockUpsert: upsert } =
        jest.requireMock("@/lib/supabase/server");

      const event: CircuitBreakerEventInput = {
        breakerType: "max_drawdown",
        severity: "critical",
        triggerValue: 15.5,
        thresholdValue: 15,
        actionTaken: "trade_blocked",
        details: { gate: "risk_limits", message: "Drawdown exceeded" },
        symbol: "AAPL",
      };

      await gw.recordCircuitBreakerEvent(event);

      expect(from).toHaveBeenCalledWith("circuit_breaker_events");
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-enhanced-123",
          breaker_type: "max_drawdown",
          severity: "critical",
          trigger_value: 15.5,
          threshold_value: 15,
          action_taken: "trade_blocked",
          symbol: "AAPL",
        }),
      );
    });

    it("should handle null symbol gracefully", async () => {
      const { __mockUpsert: upsert } =
        jest.requireMock("@/lib/supabase/server");

      const event: CircuitBreakerEventInput = {
        breakerType: "loss_velocity",
        severity: "warning",
        triggerValue: 3.5,
        thresholdValue: 3,
        actionTaken: "alert_sent",
        details: { gate: "risk_limits" },
      };

      await gw.recordCircuitBreakerEvent(event);

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: null,
        }),
      );
    });

    it("should survive database errors gracefully", async () => {
      const { __mockUpsert: upsert } =
        jest.requireMock("@/lib/supabase/server");
      upsert.mockRejectedValueOnce(new Error("DB down"));

      const event: CircuitBreakerEventInput = {
        breakerType: "max_drawdown",
        severity: "emergency",
        triggerValue: 20,
        thresholdValue: 15,
        actionTaken: "trade_blocked",
        details: {},
      };

      // Should not throw
      await expect(
        gw.recordCircuitBreakerEvent(event),
      ).resolves.toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Mode Interactions
  // --------------------------------------------------------------------------

  describe("mode interactions", () => {
    it("WATCH mode: should reject live trades via Gate 1 compliance", async () => {
      const ctx = makeContext({ operatingMode: "watch" });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(false);
      expect(result.operatingMode).toBe("watch");
      // Should short-circuit at Gate 1
      expect(result.gateResults).toHaveLength(1);
      expect(
        result.violations.some((v) => v.rule === "watch_mode_restriction"),
      ).toBe(true);
    });

    it("GUIDED mode: should add confirmation flag when trade is approved", async () => {
      const ctx = makeContext({
        operatingMode: "guided",
        complianceScore: 85,
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(true);
      expect(result.confirmationRequired).toBe(true);
      expect(result.gateResults).toHaveLength(3);
    });

    it("GUIDED mode: should NOT add confirmation flag when trade is rejected", async () => {
      const trade = makeSmallBuyTrade();
      trade.signalConsensus = 0.2; // will fail execution gate
      const ctx = makeContext({
        trade,
        operatingMode: "guided",
        complianceScore: 85,
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(false);
      expect(result.confirmationRequired).toBe(false);
    });

    it("AUTONOMOUS mode: should auto-approve with good compliance and trade count", async () => {
      const ctx = makeContext({
        operatingMode: "autonomous",
        complianceScore: 85,
        dailyTradeCount: 3,
        maxDailyTrades: 10,
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(true);
      expect(result.confirmationRequired).toBe(false);
      expect(result.operatingMode).toBe("autonomous");
    });

    it("AUTONOMOUS mode: should reject when compliance score < 70", async () => {
      const ctx = makeContext({
        operatingMode: "autonomous",
        complianceScore: 60,
        dailyTradeCount: 3,
        maxDailyTrades: 10,
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "autonomous_compliance_required",
        ),
      ).toBe(true);
    });

    it("AUTONOMOUS mode: should reject when daily trade limit exceeded", async () => {
      const ctx = makeContext({
        operatingMode: "autonomous",
        complianceScore: 85,
        dailyTradeCount: 10,
        maxDailyTrades: 10,
      });

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(false);
      expect(
        result.violations.some(
          (v) => v.rule === "autonomous_daily_trade_limit",
        ),
      ).toBe(true);
    });

    it("no mode specified: should behave like a standard validation", async () => {
      const ctx = makeContext(); // no operatingMode

      const result = await gw.validateTradeEnhanced(ctx);

      expect(result.approved).toBe(true);
      expect(result.operatingMode).toBeUndefined();
      expect(result.confirmationRequired).toBe(false);
      expect(result.gateResults).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // Backward compatibility: existing validateTrade unchanged
  // --------------------------------------------------------------------------

  describe("backward compatibility", () => {
    it("validateTrade should still work independently of enhanced methods", async () => {
      const portfolio = makeHealthyPortfolio();
      const trade = makeSmallBuyTrade();

      const result = await gw.validateTrade(trade, portfolio);

      expect(result.approved).toBe(true);
      expect(result.violations).toHaveLength(0);
      // Should NOT have enhanced fields
      expect((result as EnhancedRiskValidation).gateResults).toBeUndefined();
    });
  });
});
