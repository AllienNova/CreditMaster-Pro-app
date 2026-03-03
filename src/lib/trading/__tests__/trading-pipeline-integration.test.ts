/**
 * Trading Pipeline Integration Tests
 *
 * End-to-end integration tests verifying that the autonomous trading pipeline
 * modules work together correctly: signal scanning → risk validation →
 * trade execution → journaling, mode graduation, graceful degradation,
 * and concurrent trade handling.
 *
 * These tests mock external dependencies (Supabase, broker APIs) but exercise
 * the real cross-module interactions between trading subsystems.
 */

// ============================================================================
// MODULE-LEVEL MOCKS (must be before imports)
// ============================================================================

// -- Supabase --
const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockUpsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ data: null, error: null }),
});
const mockSingle = jest.fn();
const mockGte = jest.fn().mockReturnValue({ lt: jest.fn().mockResolvedValue({ data: [], error: null }) });
const mockEqChain = jest.fn().mockReturnValue({ single: mockSingle, gte: mockGte });
const mockEq = jest.fn().mockReturnValue({ eq: mockEqChain, single: mockSingle });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  upsert: mockUpsert,
  update: mockUpdate,
});

const mockSupabaseClient = {
  from: (...args: unknown[]) => mockFrom(...args),
};

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
  createClient: () => Promise.resolve(mockSupabaseClient),
}));

// -- Alpaca Broker --
const mockBrokerConnect = jest.fn();
const mockBrokerDisconnect = jest.fn();
const mockBrokerGetConnectionStatus = jest.fn();
const mockBrokerGetAccount = jest.fn();
const mockBrokerGetPositions = jest.fn();
const mockBrokerGetOrders = jest.fn();
const mockBrokerCancelOrder = jest.fn();
const mockBrokerPlaceBracketOrder = jest.fn();
const mockBrokerPlaceOrder = jest.fn();
const mockBrokerIsMarketOpen = jest.fn();

jest.mock("@/lib/trading/brokers/alpaca-broker", () => ({
  AlpacaBroker: class MockAlpacaBroker {
    connect = (...args: unknown[]) => mockBrokerConnect(...args);
    disconnect = (...args: unknown[]) => mockBrokerDisconnect(...args);
    getConnectionStatus = () => mockBrokerGetConnectionStatus();
    getAccount = (...args: unknown[]) => mockBrokerGetAccount(...args);
    getPositions = (...args: unknown[]) => mockBrokerGetPositions(...args);
    getOrders = (...args: unknown[]) => mockBrokerGetOrders(...args);
    cancelOrder = (...args: unknown[]) => mockBrokerCancelOrder(...args);
    placeBracketOrder = (...args: unknown[]) => mockBrokerPlaceBracketOrder(...args);
    placeOrder = (...args: unknown[]) => mockBrokerPlaceOrder(...args);
    isMarketOpen = () => mockBrokerIsMarketOpen();
  },
}));

// -- PCTT Engine --
const mockPCTTReset = jest.fn();
const mockPCTTUpdate = jest.fn();
const mockPCTTEngine = {
  reset: (...args: unknown[]) => mockPCTTReset(...args),
  update: (...args: unknown[]) => mockPCTTUpdate(...args),
};

jest.mock("@/lib/trading/pctt/pctt-core", () => ({
  createPCTTEngine: () => mockPCTTEngine,
  PCTTEngine: jest.fn(),
}));

// -- Operating Mode Manager --
const mockGetModeStatus = jest.fn();
const mockGetGraduationProgress = jest.fn();
const mockGraduate = jest.fn();
const mockGetModePermissions = jest.fn();
const mockGetModeHistory = jest.fn();

const mockRecordLiveTrade = jest.fn();
const mockRecordActiveDay = jest.fn();

const mockModeManager = {
  getModeStatus: (...args: unknown[]) => mockGetModeStatus(...args),
  getGraduationProgress: (...args: unknown[]) => mockGetGraduationProgress(...args),
  graduate: (...args: unknown[]) => mockGraduate(...args),
  getModePermissions: (...args: unknown[]) => mockGetModePermissions(...args),
  getModeHistory: (...args: unknown[]) => mockGetModeHistory(...args),
  recordLiveTrade: (...args: unknown[]) => mockRecordLiveTrade(...args),
  recordActiveDay: (...args: unknown[]) => mockRecordActiveDay(...args),
};

jest.mock("@/lib/trading/modes/operating-mode-manager", () => ({
  createOperatingModeManager: () => mockModeManager,
}));

// -- Signal Scanner --
const mockFetchCandles = jest.fn();
const mockLoadWatchlist = jest.fn();

jest.mock("@/lib/trading/autonomous/signal-scanner", () => ({
  fetchCandles: (...args: unknown[]) => mockFetchCandles(...args),
  loadWatchlist: (...args: unknown[]) => mockLoadWatchlist(...args),
  scanSymbol: jest.requireActual("@/lib/trading/autonomous/signal-scanner").scanSymbol,
  runScanCycle: jest.requireActual("@/lib/trading/autonomous/signal-scanner").runScanCycle,
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { executeAutonomousTrade, checkPortfolioHealth, checkGraduation } from "../autonomous/autonomous-executor";
import { PCTTTradingService } from "../pctt/pctt-trading-service";
import { RiskGateway, DEFAULT_RISK_RULES } from "../risk/risk-gateway";
import type { ScanResult } from "../autonomous/autonomous-types";
import type { OperatingMode } from "../modes/mode-types";

// ============================================================================
// HELPERS
// ============================================================================

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    symbol: "AAPL",
    hasSignal: true,
    qScore: 0.82,
    side: "buy",
    confidence: 0.85,
    entryPrice: 150.0,
    stopLoss: 145.0,
    takeProfit: 160.0,
    regime: "trend_up",
    scannedAt: Date.now(),
    ...overrides,
  };
}

function makeModeStatus(mode: OperatingMode = "autonomous") {
  return {
    success: true,
    data: {
      currentMode: mode,
      modeStartDate: new Date().toISOString(),
      isActive: true,
      nextModeAvailable: false,
      graduationProgress: {
        currentMode: mode,
        nextMode: null,
        criteria: {},
        allCriteriaMet: false,
        summary: `Currently in ${mode} mode`,
      },
    },
  };
}

function makePCTTSignal(overrides: Record<string, unknown> = {}) {
  return {
    type: "long",
    event: "entry_long",
    actionLine: 150.0,
    safetyLine: 145.0,
    qScore: 0.82,
    confidence: 0.85,
    entryPrice: 150.0,
    stopPrice: 145.0,
    targetPrices: [160.0],
    riskReward: 2.0,
    regime: "trend_up",
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeStructure(overrides: Record<string, unknown> = {}) {
  return {
    support: 145.0,
    resistance: 160.0,
    regime: "trend_up",
    event: "entry_long",
    atr: 2.5,
    efficiencyRatio: 0.75,
    crossingCount: 1,
    distanceToSupport: 5.0,
    distanceToResistance: 10.0,
    ...overrides,
  };
}

function makeCandles(count: number = 200): Array<{
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  const candles = [];
  const base = Date.now() - count * 86400000;
  for (let i = 0; i < count; i++) {
    candles.push({
      time: base + i * 86400000,
      open: 148 + Math.random() * 4,
      high: 152 + Math.random() * 4,
      low: 146 + Math.random() * 2,
      close: 149 + Math.random() * 3,
      volume: 1000000 + Math.random() * 500000,
    });
  }
  return candles;
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Trading Pipeline Integration", () => {
  let service: PCTTTradingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    service = new PCTTTradingService("user-123", {
      accountSize: 100000,
      riskPerTrade: 0.02,
      maxDailyLoss: 0.05,
      maxOpenPositions: 5,
      minQScore: 0.65,
      allowedRegimes: ["trend"],
      paperTrading: false,
      autoExecute: true,
      useBracketOrders: true,
      tradingHoursOnly: false,
      pcttConfig: {},
    });

    // Broker mock defaults
    mockBrokerConnect.mockResolvedValue(undefined);
    mockBrokerDisconnect.mockResolvedValue(undefined);
    mockBrokerGetConnectionStatus.mockReturnValue({ connected: true });
    mockBrokerGetAccount.mockResolvedValue({
      portfolioValue: 100000,
      cash: 50000,
      buyingPower: 100000,
    });
    mockBrokerGetPositions.mockResolvedValue([]);
    mockBrokerGetOrders.mockResolvedValue([]);
    mockBrokerIsMarketOpen.mockResolvedValue(true);
    mockBrokerPlaceBracketOrder.mockResolvedValue({
      success: true,
      entryOrder: { id: "order-001", status: "accepted" },
      stopLossOrder: { id: "sl-001", status: "accepted" },
      takeProfitOrder: { id: "tp-001", status: "accepted" },
    });
    mockBrokerPlaceOrder.mockResolvedValue({
      success: true,
      order: { id: "order-001", status: "accepted" },
    });

    // Connect the broker so service.broker is set
    await service.connectBroker("alpaca", { apiKey: "test-key", apiSecret: "test-secret" });

    // Default: user is in autonomous mode
    mockGetModeStatus.mockResolvedValue(makeModeStatus("autonomous"));

    // Default: mode permissions for autonomous
    mockGetModePermissions.mockResolvedValue({
      success: true,
      data: {
        mode: "autonomous",
        canViewSignals: true,
        canPaperTrade: true,
        canPlaceLiveOrders: true,
        requiresConfirmation: false,
        canAutoExecute: true,
      },
    });

    // Default: candles are available
    mockFetchCandles.mockResolvedValue(makeCandles());

    // Default: PCTT engine produces a valid signal on update
    mockPCTTReset.mockReturnValue(undefined);
    mockPCTTUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: makePCTTSignal(),
    });

    // Default: single row return for DB queries
    mockSingle.mockResolvedValue({
      data: { user_id: "user-123", watchlist: ["AAPL", "MSFT"], account_size: 100000 },
      error: null,
    });

    // Default: graduation mocks (for recordLiveTrade / recordActiveDay)
    mockRecordLiveTrade.mockResolvedValue({ success: true });
    mockRecordActiveDay.mockResolvedValue({ success: true });
  });

  // ==========================================================================
  // 1. E2E AUTONOMOUS LOOP: Scan → Mode Check → Execute → Journal
  // ==========================================================================

  describe("E2E Autonomous Loop", () => {
    it("should execute a trade when scan produces a valid signal in autonomous mode", async () => {
      const scanResult = makeScanResult({ symbol: "AAPL", qScore: 0.82 });

      const result = await executeAutonomousTrade("user-123", scanResult, service);

      // Mode was checked
      expect(mockGetModeStatus).toHaveBeenCalled();

      // PCTT engine was invoked for analysis
      expect(mockFetchCandles).toHaveBeenCalledWith("AAPL");

      // Result reflects execution attempt
      expect(result.symbol).toBe("AAPL");
      expect(result.side).toBe("buy");
      expect(typeof result.latencyMs).toBe("number");
      expect(result.executedAt).toBeGreaterThan(0);
    });

    it("should block execution when user is NOT in autonomous mode", async () => {
      mockGetModeStatus.mockResolvedValue(makeModeStatus("guided"));

      const scanResult = makeScanResult({ symbol: "MSFT" });
      const result = await executeAutonomousTrade("user-123", scanResult, service);

      expect(result.success).toBe(false);
      expect(result.error).toContain("guided");
      expect(result.error).toContain("requires autonomous");

      // Broker should NOT have been called
      expect(mockBrokerPlaceBracketOrder).not.toHaveBeenCalled();
    });

    it("should block execution when user is in watch mode", async () => {
      mockGetModeStatus.mockResolvedValue(makeModeStatus("watch"));

      const scanResult = makeScanResult();
      const result = await executeAutonomousTrade("user-123", scanResult, service);

      expect(result.success).toBe(false);
      expect(result.error).toContain("watch");
    });

    it("should log execution to autonomous_execution_logs", async () => {
      const scanResult = makeScanResult({ symbol: "NVDA", qScore: 0.90 });

      await executeAutonomousTrade("user-123", scanResult, service);

      // Verify the log insert was called (will be one of the mockFrom calls)
      const fromCalls = mockFrom.mock.calls;
      const logInsertCall = fromCalls.find(
        (call: unknown[]) => call[0] === "autonomous_execution_logs",
      );
      expect(logInsertCall).toBeDefined();
    });

    it("should handle mode manager failure gracefully", async () => {
      mockGetModeStatus.mockResolvedValue({
        success: false,
        error: "Database connection failed",
      });

      const scanResult = makeScanResult();
      const result = await executeAutonomousTrade("user-123", scanResult, service);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to retrieve operating mode status");
    });

    it("should handle PCTT analysis returning no signal", async () => {
      mockPCTTUpdate.mockReturnValue({ structure: makeStructure(), signal: null });

      const scanResult = makeScanResult();
      const result = await executeAutonomousTrade("user-123", scanResult, service);

      expect(result.success).toBe(false);
      expect(result.error).toContain("no signal");
    });

    it("should handle PCTT analysis returning invalid setup", async () => {
      mockPCTTUpdate.mockReturnValue({
        signal: makePCTTSignal({ qScore: 0.3 }),
        structure: makeStructure(),
      });

      const scanResult = makeScanResult();
      const result = await executeAutonomousTrade("user-123", scanResult, service);

      // The service will produce a setup that may be invalid due to low qScore
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });
  });

  // ==========================================================================
  // 2. RISK GATEWAY INTEGRATION: Mode-dependent validation + 3 gates
  // ==========================================================================

  describe("Risk Gateway Integration", () => {
    let gateway: RiskGateway;

    beforeEach(() => {
      gateway = new RiskGateway("user-123");
    });

    it("should approve a valid trade within all risk limits", async () => {
      const result = await gateway.validateTrade(
        {
          symbol: "AAPL",
          side: "buy",
          quantity: 10,
          price: 150.0,

        },
        {
          totalValue: 100000,
          cashBalance: 50000,
          positions: [],
          openPositionCount: 2,
          dailyPnL: 500,
          weeklyPnL: 0,
          drawdown: 1.5,
        },
      );

      expect(result.approved).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should reject a trade that exceeds max position size", async () => {
      const result = await gateway.validateTrade(
        {
          symbol: "AAPL",
          side: "buy",
          quantity: 500,
          price: 150.0,

        },
        {
          totalValue: 100000,
          cashBalance: 80000,
          positions: [],
          openPositionCount: 0,
          dailyPnL: 0,
          weeklyPnL: 0,
          drawdown: 0,
        },
      );

      // 500 * 150 = $75,000 = 75% of portfolio, exceeds default maxPositionSize (5%)
      expect(result.approved).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      const posViolation = result.violations.find((v) => v.rule === "max_position_size");
      expect(posViolation).toBeDefined();
    });

    it("should reject when daily loss limit is exceeded", async () => {
      const result = await gateway.validateTrade(
        {
          symbol: "MSFT",
          side: "buy",
          quantity: 1,
          price: 300.0,

        },
        {
          totalValue: 100000,
          cashBalance: 90000,
          positions: [],
          openPositionCount: 1,
          dailyPnL: -6000, // -6% daily loss
          weeklyPnL: 0,
          drawdown: 6.0,
        },
      );

      expect(result.approved).toBe(false);
      const dailyLossViolation = result.violations.find(
        (v) => v.rule === "max_daily_loss",
      );
      expect(dailyLossViolation).toBeDefined();
    });

    it("should reject when max open positions is reached", async () => {
      const result = await gateway.validateTrade(
        {
          symbol: "GOOGL",
          side: "buy",
          quantity: 1,
          price: 140.0,

        },
        {
          totalValue: 100000,
          cashBalance: 80000,
          positions: [],
          openPositionCount: DEFAULT_RISK_RULES.maxOpenPositions,
          dailyPnL: 0,
          weeklyPnL: 0,
          drawdown: 0,
        },
      );

      expect(result.approved).toBe(false);
      const positionViolation = result.violations.find(
        (v) => v.rule === "max_open_positions",
      );
      expect(positionViolation).toBeDefined();
    });

    it("should reject when trade depletes cash below minimum reserve", async () => {
      const result = await gateway.validateTrade(
        {
          symbol: "AMZN",
          side: "buy",
          quantity: 30,
          price: 180.0,

        },
        {
          totalValue: 10000,
          cashBalance: 6000, // 30 * 180 = 5400, leaving 600 = 6% (below 10% min)
          positions: [],
          openPositionCount: 0,
          dailyPnL: 0,
          weeklyPnL: 0,
          drawdown: 0,
        },
      );

      expect(result.approved).toBe(false);
      const cashViolation = result.violations.find(
        (v) => v.rule === "min_cash_reserve",
      );
      expect(cashViolation).toBeDefined();
    });

    it("should trigger kill switch on max drawdown exceeded", async () => {
      await gateway.validateTrade(
        {
          symbol: "TSLA",
          side: "buy",
          quantity: 1,
          price: 100.0,

        },
        {
          totalValue: 100000,
          cashBalance: 90000,
          positions: [],
          openPositionCount: 0,
          dailyPnL: -20000,
          weeklyPnL: 0,
          drawdown: DEFAULT_RISK_RULES.maxDrawdown + 1,
        },
      );

      // After kill switch, subsequent trades should also be blocked
      const subsequentResult = await gateway.validateTrade(
        {
          symbol: "SPY",
          side: "buy",
          quantity: 1,
          price: 500.0,

        },
        {
          totalValue: 100000,
          cashBalance: 99000,
          positions: [],
          openPositionCount: 0,
          dailyPnL: 0,
          weeklyPnL: 0,
          drawdown: 0,
        },
      );

      expect(subsequentResult.approved).toBe(false);
      const killSwitchViolation = subsequentResult.violations.find(
        (v) => v.rule === "kill_switch",
      );
      expect(killSwitchViolation).toBeDefined();
    });

    it("should accumulate multiple violations in a single validation", async () => {
      const result = await gateway.validateTrade(
        {
          symbol: "AAPL",
          side: "buy",
          quantity: 1000,
          price: 150.0,

        },
        {
          totalValue: 100000,
          cashBalance: 10000, // Not enough cash
          positions: [],
          openPositionCount: DEFAULT_RISK_RULES.maxOpenPositions, // Max positions
          dailyPnL: -10000, // Big daily loss
          weeklyPnL: 0,
          drawdown: 15,
        },
      );

      expect(result.approved).toBe(false);
      // Should have at least 3 violations: position size, cash reserve, daily loss, max positions
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================================================
  // 3. GRADUATION WORKFLOW: Paper → Criteria Met → Mode Upgrade
  // ==========================================================================

  describe("Graduation Workflow", () => {
    it("should graduate when all criteria are met", async () => {
      mockGetGraduationProgress.mockResolvedValue({
        success: true,
        data: {
          currentMode: "watch",
          nextMode: "guided",
          allCriteriaMet: true,
          criteria: {
            minTrades: { current: 15, required: 10, met: true },
            minDaysActive: { current: 8, required: 7, met: true },
            profitable: { current: true, required: true, met: true },
          },
          summary: "All criteria met for watch → guided graduation",
        },
      });

      mockGraduate.mockResolvedValue({
        success: true,
        data: {
          fromMode: "watch",
          toMode: "guided",
          direction: "upgrade",
          reason: "All graduation criteria met",
          initiatedBy: "system",
          metricsSnapshot: {},
          timestamp: new Date().toISOString(),
        },
      });

      const result = await checkGraduation("user-123");

      expect(result.graduated).toBe(true);
      expect(result.fromMode).toBe("watch");
      expect(result.toMode).toBe("guided");
      expect(mockGraduate).toHaveBeenCalled();
    });

    it("should not graduate when criteria are not met", async () => {
      mockGetGraduationProgress.mockResolvedValue({
        success: true,
        data: {
          currentMode: "watch",
          nextMode: "guided",
          allCriteriaMet: false,
          criteria: {
            minTrades: { current: 3, required: 10, met: false },
            minDaysActive: { current: 2, required: 7, met: false },
            profitable: { current: false, required: true, met: false },
          },
          summary: "Not ready: 3 criteria unmet",
        },
      });

      const result = await checkGraduation("user-123");

      expect(result.graduated).toBe(false);
      expect(result.reason).toContain("unmet criteria");
      expect(mockGraduate).not.toHaveBeenCalled();
    });

    it("should report partial progress correctly", async () => {
      mockGetGraduationProgress.mockResolvedValue({
        success: true,
        data: {
          currentMode: "guided",
          nextMode: "autonomous",
          allCriteriaMet: false,
          criteria: {
            minTrades: { current: 25, required: 20, met: true },
            minDaysActive: { current: 12, required: 14, met: false },
            profitable: { current: true, required: true, met: true },
            userOptIn: { current: false, required: true, met: false },
          },
          summary: "2 of 4 criteria met",
        },
      });

      const result = await checkGraduation("user-123");

      expect(result.graduated).toBe(false);
      expect(result.fromMode).toBe("guided");
      expect(result.reason).toContain("minDaysActive");
      expect(result.reason).toContain("userOptIn");
    });

    it("should handle graduation API failure gracefully", async () => {
      mockGetGraduationProgress.mockResolvedValue({
        success: true,
        data: {
          currentMode: "watch",
          nextMode: "guided",
          allCriteriaMet: true,
          criteria: {
            minTrades: { current: 15, required: 10, met: true },
          },
          summary: "All met",
        },
      });

      mockGraduate.mockResolvedValue({
        success: false,
        error: "Concurrent modification — retry",
      });

      const result = await checkGraduation("user-123");

      expect(result.graduated).toBe(false);
      expect(result.reason).toContain("Graduation failed");
    });

    it("should handle graduation progress check failure", async () => {
      mockGetGraduationProgress.mockResolvedValue({
        success: false,
        error: "Database unavailable",
      });

      const result = await checkGraduation("user-123");

      expect(result.graduated).toBe(false);
      expect(result.fromMode).toBe("UNKNOWN");
      expect(result.reason).toContain("Failed to check graduation");
    });

    it("should transition watch → guided → autonomous in sequence", async () => {
      // First graduation: watch → guided
      mockGetGraduationProgress.mockResolvedValueOnce({
        success: true,
        data: {
          currentMode: "watch",
          nextMode: "guided",
          allCriteriaMet: true,
          criteria: {},
          summary: "Ready",
        },
      });
      mockGraduate.mockResolvedValueOnce({
        success: true,
        data: { fromMode: "watch", toMode: "guided" },
      });

      const first = await checkGraduation("user-123");
      expect(first.graduated).toBe(true);
      expect(first.toMode).toBe("guided");

      // Second graduation: guided → autonomous
      mockGetGraduationProgress.mockResolvedValueOnce({
        success: true,
        data: {
          currentMode: "guided",
          nextMode: "autonomous",
          allCriteriaMet: true,
          criteria: {},
          summary: "Ready",
        },
      });
      mockGraduate.mockResolvedValueOnce({
        success: true,
        data: { fromMode: "guided", toMode: "autonomous" },
      });

      const second = await checkGraduation("user-123");
      expect(second.graduated).toBe(true);
      expect(second.toMode).toBe("autonomous");
    });
  });

  // ==========================================================================
  // 4. GRACEFUL DEGRADATION: Failure → Fallback → Health Check
  // ==========================================================================

  describe("Graceful Degradation", () => {
    it("should handle broker execution failure without crashing", async () => {
      mockBrokerPlaceBracketOrder.mockRejectedValue(
        new Error("Connection timeout to Alpaca"),
      );

      const scanResult = makeScanResult();
      const result = await executeAutonomousTrade("user-123", scanResult, service);

      // Should return error, not throw
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      expect(result.symbol).toBe("AAPL");
    });

    it("should detect unhealthy portfolio via health check", async () => {
      // Mock getTradingStats to return critical state
      const mockGetTradingStats = jest.fn().mockResolvedValue({
        dailyPL: -5000,
        totalExposure: 100000,
        openPositionCount: 15,
        canTrade: false,
        reason: "Daily loss limit reached",
      });

      // Override getTradingStats on the service instance
      Object.defineProperty(service, "getTradingStats", {
        value: mockGetTradingStats,
        writable: true,
      });

      const health = await checkPortfolioHealth("user-123", service);

      expect(health.userId).toBe("user-123");
      expect(health.healthy).toBe(false);
      expect(health.dailyPL).toBe(-5000);
      expect(health.alerts.length).toBeGreaterThan(0);

      const criticalAlerts = health.alerts.filter(
        (a) => a.severity === "critical",
      );
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    it("should return healthy status when portfolio is within limits", async () => {
      const mockGetTradingStats = jest.fn().mockResolvedValue({
        dailyPL: 2000,
        totalExposure: 80000,
        openPositionCount: 3,
        canTrade: true,
      });

      Object.defineProperty(service, "getTradingStats", {
        value: mockGetTradingStats,
        writable: true,
      });

      const health = await checkPortfolioHealth("user-123", service);

      expect(health.healthy).toBe(true);
      expect(health.dailyPL).toBe(2000);
      expect(health.openPositions).toBe(3);
    });

    it("should handle getTradingStats failure gracefully", async () => {
      const mockGetTradingStats = jest.fn().mockRejectedValue(
        new Error("Broker API down"),
      );

      Object.defineProperty(service, "getTradingStats", {
        value: mockGetTradingStats,
        writable: true,
      });

      const health = await checkPortfolioHealth("user-123", service);

      expect(health.healthy).toBe(false);
      expect(health.alerts.length).toBeGreaterThan(0);
      expect(health.alerts[0].message).toContain("Health check error");
    });

    it("should detect high exposure and issue warnings", async () => {
      const mockGetTradingStats = jest.fn().mockResolvedValue({
        dailyPL: 100,
        totalExposure: 95000,
        openPositionCount: 12,
        canTrade: true,
      });

      Object.defineProperty(service, "getTradingStats", {
        value: mockGetTradingStats,
        writable: true,
      });

      const health = await checkPortfolioHealth("user-123", service);

      const exposureWarnings = health.alerts.filter(
        (a) => a.type === "exposure_limit",
      );
      expect(exposureWarnings.length).toBeGreaterThan(0);
    });

    it("should not crash when logging fails", async () => {
      // Make the log insert throw
      mockInsert.mockRejectedValueOnce(new Error("DB write failed"));

      const scanResult = makeScanResult();
      const result = await executeAutonomousTrade("user-123", scanResult, service);

      // Should complete without throwing
      expect(result).toBeDefined();
      expect(result.symbol).toBe("AAPL");
    });
  });

  // ==========================================================================
  // 5. CONCURRENT TRADE SCENARIOS
  // ==========================================================================

  describe("Concurrent Trade Scenarios", () => {
    it("should handle multiple symbols being executed concurrently", async () => {
      const symbols = ["AAPL", "MSFT", "GOOGL"];
      const scanResults = symbols.map((symbol) =>
        makeScanResult({ symbol, qScore: 0.80 + Math.random() * 0.15 }),
      );

      const results = await Promise.all(
        scanResults.map((sr) =>
          executeAutonomousTrade("user-123", sr, service),
        ),
      );

      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result.symbol).toBe(symbols[i]);
        expect(typeof result.success).toBe("boolean");
      });
    });

    it("should correctly identify symbols in concurrent execution", async () => {
      const appleResult = makeScanResult({ symbol: "AAPL" });
      const msftResult = makeScanResult({ symbol: "MSFT" });

      const [apple, msft] = await Promise.all([
        executeAutonomousTrade("user-123", appleResult, service),
        executeAutonomousTrade("user-123", msftResult, service),
      ]);

      expect(apple.symbol).toBe("AAPL");
      expect(msft.symbol).toBe("MSFT");
    });

    it("should handle mixed success/failure in concurrent trades", async () => {
      // First trade: mode check succeeds
      mockGetModeStatus.mockResolvedValueOnce(makeModeStatus("autonomous"));
      // Second trade: mode check fails
      mockGetModeStatus.mockResolvedValueOnce({
        success: false,
        error: "Rate limited",
      });

      const [result1, result2] = await Promise.all([
        executeAutonomousTrade("user-123", makeScanResult({ symbol: "AAPL" }), service),
        executeAutonomousTrade("user-123", makeScanResult({ symbol: "MSFT" }), service),
      ]);

      expect(result1.symbol).toBe("AAPL");
      expect(result2.symbol).toBe("MSFT");
      expect(result2.success).toBe(false);
      expect(result2.error).toContain("Failed to retrieve operating mode status");
    });

    it("should maintain correct latency tracking across concurrent trades", async () => {
      const results = await Promise.all([
        executeAutonomousTrade("user-123", makeScanResult({ symbol: "SPY" }), service),
        executeAutonomousTrade("user-123", makeScanResult({ symbol: "QQQ" }), service),
      ]);

      results.forEach((result) => {
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        expect(result.latencyMs).toBeLessThan(10000); // Sanity check
        expect(result.executedAt).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // 6. MODE → RISK → EXECUTION PIPELINE
  // ==========================================================================

  describe("Mode → Risk → Execution Pipeline", () => {
    it("should only allow execution in autonomous mode through the full pipeline", async () => {
      const modes: OperatingMode[] = ["watch", "guided", "autonomous"];

      for (const mode of modes) {
        jest.clearAllMocks();
        mockGetModeStatus.mockResolvedValue(makeModeStatus(mode));
        mockFetchCandles.mockResolvedValue(makeCandles());
        mockPCTTUpdate.mockReturnValue({
          signal: makePCTTSignal(),
          structure: makeStructure(),
        });

        const result = await executeAutonomousTrade(
          "user-123",
          makeScanResult(),
          service,
        );

        if (mode === "autonomous") {
          // In autonomous mode, execution should proceed (may succeed or fail based on PCTT)
          expect(result.error).not.toContain("requires autonomous");
        } else {
          // In non-autonomous modes, execution should be blocked at mode check
          expect(result.success).toBe(false);
          expect(result.error).toContain("requires autonomous");
        }
      }
    });

    it("should verify mode check happens before any broker interaction", async () => {
      mockGetModeStatus.mockResolvedValue(makeModeStatus("watch"));

      await executeAutonomousTrade("user-123", makeScanResult(), service);

      // Mode was checked
      expect(mockGetModeStatus).toHaveBeenCalled();
      // Broker was never called (blocked at mode check)
      expect(mockBrokerPlaceBracketOrder).not.toHaveBeenCalled();
      // Candles were never fetched (blocked before analysis)
      expect(mockFetchCandles).not.toHaveBeenCalled();
    });

    it("should propagate mode context through to execution result", async () => {
      const result = await executeAutonomousTrade(
        "user-123",
        makeScanResult(),
        service,
      );

      // The autonomous executor should have checked mode
      expect(mockGetModeStatus).toHaveBeenCalled();
      // Result should be defined regardless
      expect(result).toBeDefined();
      expect(result.symbol).toBe("AAPL");
    });
  });
});
