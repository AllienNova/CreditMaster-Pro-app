/**
 * PCTT Trading Service Tests
 *
 * Tests for the native trading service that executes PCTT signals
 * through broker APIs. Mocks Supabase, PCTTEngine, and AlpacaBroker.
 *
 * IMPORTANT: jest.config has resetMocks:true — all jest.mock factories
 * use arrow-function wrappers so they survive resets.
 */

import type { OHLCV, PCTTSignal, StructureObject } from "../pctt-core";
import type {
  BrokerInterface,
  BracketOrderResult,
  OrderResult,
  Position as BrokerPosition,
} from "../../brokers/broker-interface";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Supabase chainable mock builder
const mockUpsert = jest.fn();
const mockUpdateEq = jest.fn();
const mockUpdate = jest.fn();
const mockSelectEq2 = jest.fn();
const mockSelectEq1 = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockSupabaseClient = { from: (...a: unknown[]) => mockFrom(...a) };

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(mockSupabaseClient),
}));

// PCTTEngine mock
const mockEngineUpdate = jest.fn();
const mockEngineReset = jest.fn();

jest.mock("../pctt-core", () => ({
  createPCTTEngine: () => ({
    update: (...args: unknown[]) => mockEngineUpdate(...args),
    reset: (...args: unknown[]) => mockEngineReset(...args),
    getStructure: () => null,
  }),
}));

// AlpacaBroker mock
const mockBrokerConnect = jest.fn();
const mockBrokerDisconnect = jest.fn();
const mockBrokerGetConnectionStatus = jest.fn();
const mockBrokerGetAccount = jest.fn();
const mockBrokerPlaceBracketOrder = jest.fn();
const mockBrokerPlaceOrder = jest.fn();
const mockBrokerClosePosition = jest.fn();
const mockBrokerGetPositions = jest.fn();
const mockBrokerIsMarketOpen = jest.fn();

// Use a plain class so `new AlpacaBroker()` works and is NOT reset by resetMocks
jest.mock("../../brokers/alpaca-broker", () => {
  return {
    AlpacaBroker: class {
      connect(...args: unknown[]) {
        return mockBrokerConnect(...args);
      }
      disconnect(...args: unknown[]) {
        return mockBrokerDisconnect(...args);
      }
      getConnectionStatus(...args: unknown[]) {
        return mockBrokerGetConnectionStatus(...args);
      }
      getAccount(...args: unknown[]) {
        return mockBrokerGetAccount(...args);
      }
      placeBracketOrder(...args: unknown[]) {
        return mockBrokerPlaceBracketOrder(...args);
      }
      placeOrder(...args: unknown[]) {
        return mockBrokerPlaceOrder(...args);
      }
      closePosition(...args: unknown[]) {
        return mockBrokerClosePosition(...args);
      }
      getPositions(...args: unknown[]) {
        return mockBrokerGetPositions(...args);
      }
      isMarketOpen(...args: unknown[]) {
        return mockBrokerIsMarketOpen(...args);
      }
    },
  };
});

// Operating Mode Manager mock — defaults to GUIDED (allows live + requires confirmation)
const mockGetModePermissions = jest.fn();
const mockGetCurrentMode = jest.fn();
const mockRecordLiveTrade = jest.fn();
const mockRecordActiveDay = jest.fn();

jest.mock("@/lib/trading/modes/operating-mode-manager", () => ({
  createOperatingModeManager: () => ({
    getModePermissions: (...args: unknown[]) => mockGetModePermissions(...args),
    getCurrentMode: (...args: unknown[]) => mockGetCurrentMode(...args),
    recordLiveTrade: (...args: unknown[]) => mockRecordLiveTrade(...args),
    recordActiveDay: (...args: unknown[]) => mockRecordActiveDay(...args),
  }),
}));

// Risk Gateway mock — defaults to approved
const mockValidateTradeEnhanced = jest.fn();

jest.mock("@/lib/trading/risk/risk-gateway", () => ({
  RiskGateway: class {
    validateTradeEnhanced(...args: unknown[]) {
      return mockValidateTradeEnhanced(...args);
    }
  },
}));

// Import AFTER mocks are set up
import {
  PCTTTradingService,
  createPCTTTradingService,
  DEFAULT_TRADING_CONFIG,
  type TradeSetup,
} from "../pctt-trading-service";

// ============================================================================
// FROZEN CLOCK — the PCTT pre-market checklist's market_calendar check reads
// the real date (pre-market-checklist.ts: `ctx.timestamp ?? new Date()`).
// Without this, the weekend gate short-circuits executeTrade on Sat/Sun and
// 35 tests fail. Freeze to a fixed weekday so the suite is deterministic.
// ============================================================================

beforeAll(() => {
  jest.useFakeTimers({
    doNotFake: [
      "setTimeout", "clearTimeout", "setInterval", "clearInterval",
      "setImmediate", "clearImmediate", "nextTick", "queueMicrotask",
      "requestAnimationFrame", "cancelAnimationFrame",
      "requestIdleCallback", "cancelIdleCallback", "hrtime", "performance",
    ],
    now: new Date("2026-05-13T15:00:00Z"), // Wednesday, US market hours
  });
});
afterAll(() => {
  jest.useRealTimers();
});

// ============================================================================
// GLOBAL beforeEach — wire up mock chains every time (resetMocks clears them)
// ============================================================================

beforeEach(() => {
  // Supabase chain: from().upsert(), from().update().eq(), from().select().eq().eq()
  mockUpsert.mockResolvedValue({ data: null, error: null });
  mockUpdateEq.mockResolvedValue({ data: null, error: null });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });
  mockSelectEq2.mockResolvedValue({ data: [], error: null });
  mockSelectEq1.mockReturnValue({ eq: mockSelectEq2 });
  mockSelect.mockReturnValue({ eq: mockSelectEq1 });
  mockFrom.mockReturnValue({
    upsert: mockUpsert,
    update: mockUpdate,
    select: mockSelect,
  });

  // Broker defaults
  mockBrokerConnect.mockResolvedValue(undefined);
  mockBrokerDisconnect.mockResolvedValue(undefined);
  mockBrokerGetConnectionStatus.mockReturnValue({
    connected: true,
    lastHeartbeat: new Date(),
    latencyMs: 10,
    marketStatus: "open",
  });
  mockBrokerGetAccount.mockResolvedValue({
    id: "test-account",
    status: "active",
    currency: "USD",
    cash: 100000,
    portfolioValue: 100000,
    buyingPower: 100000,
    lastEquity: 100000,
    multiplier: 1,
    patternDayTrader: false,
    tradingBlocked: false,
    transfersBlocked: false,
  });
  mockBrokerPlaceBracketOrder.mockResolvedValue(makeBracketOrderResult());
  mockBrokerPlaceOrder.mockResolvedValue({ success: false, error: "not set" });
  mockBrokerClosePosition.mockResolvedValue({ success: false, error: "not set" });
  mockBrokerGetPositions.mockResolvedValue([]);
  mockBrokerIsMarketOpen.mockResolvedValue(true);

  // Engine defaults
  mockEngineReset.mockReturnValue(undefined);
  mockEngineUpdate.mockReturnValue({ structure: makeStructure(), signal: null });

  // Operating Mode Manager defaults: GUIDED mode (allows live, requires confirmation)
  mockGetModePermissions.mockResolvedValue({
    success: true,
    data: {
      mode: "guided",
      canViewSignals: true,
      canPaperTrade: true,
      canPlaceLiveOrders: true,
      requiresConfirmation: true,
      canAutoExecute: false,
    },
  });
  mockGetCurrentMode.mockResolvedValue({ success: true, data: "guided" });
  mockRecordLiveTrade.mockResolvedValue({ success: true });
  mockRecordActiveDay.mockResolvedValue({ success: true });

  // Risk Gateway default: approved with all gates passing
  mockValidateTradeEnhanced.mockResolvedValue({
    approved: true,
    violations: [],
    warnings: [],
    gateResults: [
      { gate: "compliance", passed: true, violations: [], warnings: [] },
      { gate: "risk_limits", passed: true, violations: [], warnings: [] },
      { gate: "execution", passed: true, violations: [], warnings: [] },
    ],
    operatingMode: "guided",
    confirmationRequired: true,
  });
});

// ============================================================================
// TEST HELPERS
// ============================================================================

function makeCandle(close: number, index: number = 0): OHLCV {
  return {
    time: Date.now() + index * 60000,
    open: close - 1,
    high: close + 1,
    low: close - 2,
    close,
    volume: 1000,
  };
}

function makeSignal(overrides: Partial<PCTTSignal> = {}): PCTTSignal {
  return {
    type: "long",
    event: "entry_long",
    actionLine: 100,
    safetyLine: 95,
    qScore: 0.8,
    entryPrice: 101,
    stopPrice: 95,
    targetPrices: [107, 113, 119],
    riskReward: 2,
    confidence: 0.8,
    regime: "trend_up",
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeStructure(): StructureObject {
  return {
    support: null,
    resistance: null,
    regime: "trend_up",
    event: "entry_long",
    atr: 2.0,
    efficiencyRatio: 0.7,
    crossingCount: 1,
    distanceToSupport: 3.0,
    distanceToResistance: 5.0,
  };
}

function makeValidTradeSetup(overrides: Partial<TradeSetup> = {}): TradeSetup {
  return {
    symbol: "AAPL",
    signal: makeSignal(),
    structure: makeStructure(),
    shares: 100,
    dollarAmount: 10100,
    riskAmount: 2000,
    entryPrice: 101,
    stopLossPrice: 95,
    takeProfitTargets: [107, 113, 119],
    riskRewardRatio: 2,
    isValid: true,
    validationErrors: [],
    ...overrides,
  };
}

function makeBracketOrderResult(
  overrides: Partial<BracketOrderResult> = {},
): BracketOrderResult {
  return {
    success: true,
    entryOrder: {
      id: "order-123",
      symbol: "AAPL",
      side: "buy",
      type: "market",
      quantity: 100,
      filledQuantity: 100,
      status: "filled",
      timeInForce: "gtc",
      extendedHours: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      filledAt: new Date(),
      filledAvgPrice: 101,
    },
    stopLossOrder: {
      id: "sl-123",
      symbol: "AAPL",
      side: "sell",
      type: "stop",
      quantity: 100,
      filledQuantity: 0,
      status: "new",
      stopPrice: 95,
      timeInForce: "gtc",
      extendedHours: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    takeProfitOrder: {
      id: "tp-123",
      symbol: "AAPL",
      side: "sell",
      type: "limit",
      quantity: 100,
      filledQuantity: 0,
      status: "new",
      limitPrice: 107,
      timeInForce: "gtc",
      extendedHours: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

// ============================================================================
// CONSTRUCTOR & CONFIG TESTS
// ============================================================================

describe("PCTTTradingService - Constructor & Config", () => {
  test("should create with default config", () => {
    const service = new PCTTTradingService("user-1");
    const config = service.getConfig();

    expect(config.accountSize).toBe(DEFAULT_TRADING_CONFIG.accountSize);
    expect(config.riskPerTrade).toBe(DEFAULT_TRADING_CONFIG.riskPerTrade);
    expect(config.maxDailyLoss).toBe(DEFAULT_TRADING_CONFIG.maxDailyLoss);
    expect(config.maxOpenPositions).toBe(
      DEFAULT_TRADING_CONFIG.maxOpenPositions,
    );
    expect(config.minQScore).toBe(DEFAULT_TRADING_CONFIG.minQScore);
    expect(config.paperTrading).toBe(true);
  });

  test("should merge custom config with defaults", () => {
    const service = new PCTTTradingService("user-1", {
      accountSize: 50000,
      riskPerTrade: 0.01,
    });
    const config = service.getConfig();

    expect(config.accountSize).toBe(50000);
    expect(config.riskPerTrade).toBe(0.01);
    // Defaults preserved
    expect(config.maxOpenPositions).toBe(5);
    expect(config.paperTrading).toBe(true);
  });

  test("should update config dynamically", () => {
    const service = new PCTTTradingService("user-1");

    service.updateConfig({ accountSize: 200000 });

    expect(service.getConfig().accountSize).toBe(200000);
  });

  test("should recreate pcttEngine when pcttConfig is updated", () => {
    const service = new PCTTTradingService("user-1");

    // This should not throw — it creates a new engine internally
    service.updateConfig({ pcttConfig: { pivotDepth: 3 } });

    expect(service.getConfig().pcttConfig).toEqual({ pivotDepth: 3 });
  });

  test("getConfig should return a copy", () => {
    const service = new PCTTTradingService("user-1");
    const config1 = service.getConfig();
    const config2 = service.getConfig();

    expect(config1).toEqual(config2);
    expect(config1).not.toBe(config2);
  });
});

// ============================================================================
// DEFAULT_TRADING_CONFIG TESTS
// ============================================================================

describe("DEFAULT_TRADING_CONFIG", () => {
  test("should have expected default values", () => {
    expect(DEFAULT_TRADING_CONFIG.accountSize).toBe(100000);
    expect(DEFAULT_TRADING_CONFIG.riskPerTrade).toBe(0.02);
    expect(DEFAULT_TRADING_CONFIG.maxDailyLoss).toBe(0.05);
    expect(DEFAULT_TRADING_CONFIG.maxOpenPositions).toBe(5);
    expect(DEFAULT_TRADING_CONFIG.minQScore).toBe(0.65);
    expect(DEFAULT_TRADING_CONFIG.allowedRegimes).toEqual(["trend"]);
    expect(DEFAULT_TRADING_CONFIG.tradingHoursOnly).toBe(true);
    expect(DEFAULT_TRADING_CONFIG.autoExecute).toBe(false);
    expect(DEFAULT_TRADING_CONFIG.useBracketOrders).toBe(true);
    expect(DEFAULT_TRADING_CONFIG.paperTrading).toBe(true);
  });
});

// ============================================================================
// BROKER CONNECTION TESTS
// ============================================================================

describe("PCTTTradingService - Broker Connection", () => {
  let service: PCTTTradingService;

  beforeEach(() => {
    service = new PCTTTradingService("user-1");
    // Reset mock implementations since resetMocks clears them
    mockBrokerConnect.mockResolvedValue({
      connected: true,
      accountId: "test-account",
      buyingPower: 100000,
      cash: 100000,
      portfolioValue: 100000,
    });
    mockBrokerDisconnect.mockResolvedValue(undefined);
    mockBrokerGetConnectionStatus.mockReturnValue({
      connected: true,
      lastHeartbeat: new Date(),
      latencyMs: 10,
      marketStatus: "open",
    });
  });

  test("should connect to alpaca broker", async () => {
    const result = await service.connectBroker("alpaca", {
      apiKey: "test-key",
      apiSecret: "test-secret",
    });

    expect(result).toBe(true);
  });

  test("should return false for unsupported broker type", async () => {
    const result = await service.connectBroker("unsupported" as any, {
      apiKey: "key",
      apiSecret: "secret",
    });

    expect(result).toBe(false);
  });

  test("should return false when connection throws", async () => {
    mockBrokerConnect.mockRejectedValue(new Error("Connection failed"));

    const result = await service.connectBroker("alpaca", {
      apiKey: "bad-key",
      apiSecret: "bad-secret",
    });

    expect(result).toBe(false);
  });

  test("isBrokerConnected should return false when no broker", () => {
    expect(service.isBrokerConnected()).toBe(false);
  });

  test("isBrokerConnected should return true after connect", async () => {
    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    expect(service.isBrokerConnected()).toBe(true);
  });

  test("disconnectBroker should disconnect and nullify broker", async () => {
    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });
    await service.disconnectBroker();

    expect(service.isBrokerConnected()).toBe(false);
  });

  test("disconnectBroker should be safe when no broker connected", async () => {
    // Should not throw
    await service.disconnectBroker();

    expect(service.isBrokerConnected()).toBe(false);
  });
});

// ============================================================================
// analyzeForTrade TESTS
// ============================================================================

describe("PCTTTradingService - analyzeForTrade", () => {
  let service: PCTTTradingService;

  beforeEach(() => {
    service = new PCTTTradingService("user-1");
    mockEngineReset.mockReturnValue(undefined);
  });

  test("should return null when engine produces no signal", () => {
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: null,
    });

    const candles = [makeCandle(100), makeCandle(101), makeCandle(102)];
    const result = service.analyzeForTrade("AAPL", candles);

    expect(result).toBeNull();
  });

  test("should return null for none signal type", () => {
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: makeSignal({ type: "none" }),
    });

    const candles = [makeCandle(100)];
    const result = service.analyzeForTrade("AAPL", candles);

    expect(result).toBeNull();
  });

  test("should return TradeSetup for valid long signal", () => {
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: makeSignal({ type: "long", qScore: 0.8, regime: "trend_up" }),
    });

    const candles = [makeCandle(100), makeCandle(101)];
    const result = service.analyzeForTrade("AAPL", candles);

    expect(result).not.toBeNull();
    expect(result!.symbol).toBe("AAPL");
    expect(result!.isValid).toBe(true);
    expect(result!.validationErrors).toHaveLength(0);
    expect(result!.shares).toBeGreaterThan(0);
    expect(result!.entryPrice).toBe(101);
    expect(result!.stopLossPrice).toBe(95);
  });

  test("should flag low Q-score as validation error", () => {
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: makeSignal({ type: "long", qScore: 0.3, regime: "trend_up" }),
    });

    const candles = [makeCandle(100)];
    const result = service.analyzeForTrade("AAPL", candles);

    expect(result).not.toBeNull();
    expect(result!.isValid).toBe(false);
    expect(result!.validationErrors.length).toBeGreaterThan(0);
    expect(result!.validationErrors[0]).toContain("Q-score");
  });

  test("should flag disallowed regime as validation error", () => {
    // Default allowedRegimes is ["trend"], so "range" should be flagged
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: makeSignal({ type: "long", qScore: 0.8, regime: "range" }),
    });

    const candles = [makeCandle(100)];
    const result = service.analyzeForTrade("AAPL", candles);

    expect(result).not.toBeNull();
    expect(result!.isValid).toBe(false);
    expect(result!.validationErrors.some((e) => e.includes("Regime"))).toBe(
      true,
    );
  });

  test("should return null when stop distance is zero", () => {
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: makeSignal({
        type: "long",
        entryPrice: 100,
        stopPrice: 100, // zero distance
      }),
    });

    const candles = [makeCandle(100)];
    const result = service.analyzeForTrade("AAPL", candles);

    expect(result).toBeNull();
  });

  test("should calculate correct position sizing", () => {
    // accountSize=100000, riskPerTrade=0.02 → riskAmount=2000
    // entryPrice=101, stopPrice=95 → stopDistance=6
    // shares = floor(2000/6) = 333
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: makeSignal({
        type: "long",
        entryPrice: 101,
        stopPrice: 95,
        qScore: 0.8,
        regime: "trend_up",
      }),
    });

    const candles = [makeCandle(101)];
    const result = service.analyzeForTrade("AAPL", candles);

    expect(result).not.toBeNull();
    expect(result!.riskAmount).toBe(2000);
    expect(result!.shares).toBe(333);
    expect(result!.dollarAmount).toBe(333 * 101);
  });

  test("should use signal targetPrices when available", () => {
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: makeSignal({
        type: "long",
        targetPrices: [110, 120, 130],
        qScore: 0.8,
        regime: "trend_up",
      }),
    });

    const candles = [makeCandle(100)];
    const result = service.analyzeForTrade("AAPL", candles);

    expect(result).not.toBeNull();
    expect(result!.takeProfitTargets).toEqual([110, 120, 130]);
  });

  test("should generate default targets when signal has empty targetPrices", () => {
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: makeSignal({
        type: "long",
        entryPrice: 100,
        stopPrice: 95,
        targetPrices: [],
        riskReward: 0,
        qScore: 0.8,
        regime: "trend_up",
      }),
    });

    const candles = [makeCandle(100)];
    const result = service.analyzeForTrade("AAPL", candles);

    expect(result).not.toBeNull();
    // 1R=105, 2R=110, 3R=115 (long, stopDistance=5)
    expect(result!.takeProfitTargets).toEqual([105, 110, 115]);
  });

  test("should reset engine before processing candles", () => {
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: null,
    });

    const candles = [makeCandle(100)];
    service.analyzeForTrade("AAPL", candles);

    expect(mockEngineReset).toHaveBeenCalled();
  });

  test("should process all candles through engine", () => {
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: null,
    });

    const candles = [makeCandle(100), makeCandle(101), makeCandle(102)];
    service.analyzeForTrade("AAPL", candles);

    expect(mockEngineUpdate).toHaveBeenCalledTimes(3);
  });

  test("should handle short signal for position sizing", () => {
    mockEngineUpdate.mockReturnValue({
      structure: makeStructure(),
      signal: makeSignal({
        type: "short",
        event: "entry_short",
        entryPrice: 100,
        stopPrice: 106,
        targetPrices: [],
        riskReward: 0,
        qScore: 0.8,
        regime: "trend_down",
      }),
    });

    const service2 = new PCTTTradingService("user-1", {
      allowedRegimes: ["trend"],
    });
    const candles = [makeCandle(100)];
    const result = service2.analyzeForTrade("AAPL", candles);

    expect(result).not.toBeNull();
    // Short: targets go down. stopDistance = 6, direction = -1
    // 1R: 100 - 6*1 = 94, 2R: 100 - 6*2 = 88, 3R: 100 - 6*3 = 82
    expect(result!.takeProfitTargets).toEqual([94, 88, 82]);
  });
});

// ============================================================================
// executeTrade TESTS
// ============================================================================

describe("PCTTTradingService - executeTrade", () => {
  let service: PCTTTradingService;

  beforeEach(() => {
    service = new PCTTTradingService("user-1");
    // Re-set broker mock implementations
    mockBrokerConnect.mockResolvedValue({
      connected: true,
      accountId: "test-account",
      buyingPower: 100000,
      cash: 100000,
      portfolioValue: 100000,
    });
    mockBrokerGetConnectionStatus.mockReturnValue({
      connected: true,
      lastHeartbeat: new Date(),
      latencyMs: 10,
      marketStatus: "open",
    });
    mockBrokerGetAccount.mockResolvedValue({
      id: "test-account",
      status: "active",
      currency: "USD",
      cash: 100000,
      portfolioValue: 100000,
      buyingPower: 100000,
      lastEquity: 100000,
      multiplier: 1,
      patternDayTrader: false,
      tradingBlocked: false,
      transfersBlocked: false,
    });
    mockBrokerIsMarketOpen.mockResolvedValue(true);
    mockBrokerPlaceBracketOrder.mockResolvedValue(makeBracketOrderResult());
    mockUpsert.mockResolvedValue({ data: null, error: null });
  });

  test("should fail when broker is not connected", async () => {
    const setup = makeValidTradeSetup();
    const result = await service.executeTrade(setup);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Broker not connected");
  });

  test("should fail when setup is not valid", async () => {
    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    const setup = makeValidTradeSetup({
      isValid: false,
      validationErrors: ["Q-score too low"],
    });
    const result = await service.executeTrade(setup);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(result.error).toContain("Q-score too low");
  });

  test("should fail when market is closed and tradingHoursOnly is true", async () => {
    mockBrokerIsMarketOpen.mockResolvedValue(false);

    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    const setup = makeValidTradeSetup();
    const result = await service.executeTrade(setup);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Market is closed");
  });

  test("should execute bracket order successfully", async () => {
    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    const setup = makeValidTradeSetup();
    const result = await service.executeTrade(setup);

    expect(result.success).toBe(true);
    expect(result.tradeId).toBeDefined();
    expect(result.orderId).toBe("order-123");
    expect(result.symbol).toBe("AAPL");
    expect(result.side).toBe("buy");
    expect(result.quantity).toBe(100);
  });

  test("should track position after successful execution", async () => {
    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    const setup = makeValidTradeSetup();
    await service.executeTrade(setup);

    const positions = service.getActivePositions();
    expect(positions).toHaveLength(1);
    expect(positions[0].symbol).toBe("AAPL");
    expect(positions[0].side).toBe("long");
    expect(positions[0].quantity).toBe(100);
    expect(positions[0].stopLoss).toBe(95);
    expect(positions[0].status).toBe("open");
  });

  test("should increment daily trade count after execution", async () => {
    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    await service.executeTrade(makeValidTradeSetup());

    const stats = await service.getTradingStats();
    expect(stats.dailyTradeCount).toBe(1);
  });

  test("should fail when bracket order fails", async () => {
    mockBrokerPlaceBracketOrder.mockResolvedValue({
      success: false,
      error: "Insufficient buying power",
    });

    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    const setup = makeValidTradeSetup();
    const result = await service.executeTrade(setup);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Insufficient buying power");
  });

  test("should use simple order when useBracketOrders is false", async () => {
    const svc = new PCTTTradingService("user-1", {
      useBracketOrders: false,
      tradingHoursOnly: false,
    });
    mockBrokerPlaceOrder.mockResolvedValue({
      success: true,
      order: {
        id: "simple-order-1",
        symbol: "AAPL",
        side: "buy",
        type: "market",
        quantity: 100,
        filledQuantity: 100,
        status: "filled",
        timeInForce: "day",
        extendedHours: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as OrderResult);

    await svc.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    const setup = makeValidTradeSetup();
    const result = await svc.executeTrade(setup);

    expect(result.success).toBe(true);
    expect(mockBrokerPlaceOrder).toHaveBeenCalled();
    expect(mockBrokerPlaceBracketOrder).not.toHaveBeenCalled();
  });

  test("should fail when max positions reached", async () => {
    const svc = new PCTTTradingService("user-1", {
      maxOpenPositions: 1,
      tradingHoursOnly: false,
    });
    await svc.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    // Execute first trade
    mockBrokerPlaceBracketOrder.mockResolvedValue(makeBracketOrderResult());
    await svc.executeTrade(makeValidTradeSetup());

    // Second trade should fail because maxOpenPositions = 1
    mockBrokerPlaceBracketOrder.mockResolvedValue(
      makeBracketOrderResult({
        entryOrder: {
          id: "order-456",
          symbol: "MSFT",
          side: "buy",
          type: "market",
          quantity: 50,
          filledQuantity: 50,
          status: "filled",
          timeInForce: "gtc",
          extendedHours: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    );

    const result2 = await svc.executeTrade(
      makeValidTradeSetup({ symbol: "MSFT" }),
    );

    expect(result2.success).toBe(false);
    expect(result2.error).toContain("Maximum positions reached");
  });
});

// ============================================================================
// closePosition TESTS
// ============================================================================

describe("PCTTTradingService - closePosition", () => {
  let service: PCTTTradingService;

  beforeEach(async () => {
    service = new PCTTTradingService("user-1", { tradingHoursOnly: false });
    mockBrokerConnect.mockResolvedValue({
      connected: true,
      accountId: "test-account",
      buyingPower: 100000,
      cash: 100000,
      portfolioValue: 100000,
    });
    mockBrokerGetConnectionStatus.mockReturnValue({
      connected: true,
      lastHeartbeat: new Date(),
      latencyMs: 10,
      marketStatus: "open",
    });
    mockBrokerGetAccount.mockResolvedValue({
      id: "test-account",
      status: "active",
      currency: "USD",
      cash: 100000,
      portfolioValue: 100000,
      buyingPower: 100000,
      lastEquity: 100000,
      multiplier: 1,
      patternDayTrader: false,
      tradingBlocked: false,
      transfersBlocked: false,
    });
    mockBrokerIsMarketOpen.mockResolvedValue(true);
    mockBrokerPlaceBracketOrder.mockResolvedValue(makeBracketOrderResult());
    mockUpsert.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });
  });

  test("should fail when broker is not connected", async () => {
    const svc = new PCTTTradingService("user-1");
    const result = await svc.closePosition("pos-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Broker not connected");
  });

  test("should fail when position is not found", async () => {
    const result = await service.closePosition("nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Position not found");
  });

  test("should close position successfully", async () => {
    // First create a position
    await service.executeTrade(makeValidTradeSetup());
    const positions = service.getActivePositions();
    expect(positions).toHaveLength(1);

    mockBrokerClosePosition.mockResolvedValue({
      success: true,
      order: {
        id: "close-order-1",
        symbol: "AAPL",
        side: "sell",
        type: "market",
        quantity: 100,
        filledQuantity: 100,
        status: "filled",
        timeInForce: "day",
        extendedHours: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        filledAvgPrice: 110,
      },
    });

    const result = await service.closePosition(positions[0].id, "target_hit");

    expect(result.success).toBe(true);
    expect(result.symbol).toBe("AAPL");
    expect(service.getActivePositions()).toHaveLength(0);
  });

  test("should update dailyPL on close (long position profit)", async () => {
    await service.executeTrade(makeValidTradeSetup());
    const positions = service.getActivePositions();

    mockBrokerClosePosition.mockResolvedValue({
      success: true,
      order: {
        id: "close-1",
        symbol: "AAPL",
        side: "sell",
        type: "market",
        quantity: 100,
        filledQuantity: 100,
        status: "filled",
        timeInForce: "day",
        extendedHours: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        filledAvgPrice: 111, // entry was 101 → profit = (111-101)*100 = 1000
      },
    });

    await service.closePosition(positions[0].id);

    const stats = await service.getTradingStats();
    expect(stats.dailyPL).toBe(1000);
  });

  test("should fail when broker close fails", async () => {
    await service.executeTrade(makeValidTradeSetup());
    const positions = service.getActivePositions();

    mockBrokerClosePosition.mockResolvedValue({
      success: false,
      error: "Order rejected",
    });

    const result = await service.closePosition(positions[0].id);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Order rejected");
    // Position should still be open
    expect(service.getActivePositions()).toHaveLength(1);
  });
});

// ============================================================================
// POSITION MANAGEMENT TESTS
// ============================================================================

describe("PCTTTradingService - Position Management", () => {
  test("getActivePositions returns empty array initially", () => {
    const service = new PCTTTradingService("user-1");
    expect(service.getActivePositions()).toEqual([]);
  });

  test("updatePositions should do nothing when no broker", async () => {
    const service = new PCTTTradingService("user-1");
    // Should not throw
    await service.updatePositions();
  });

  test("updatePositions should sync prices from broker", async () => {
    const service = new PCTTTradingService("user-1", {
      tradingHoursOnly: false,
    });
    mockBrokerConnect.mockResolvedValue({
      connected: true,
      accountId: "test-account",
      buyingPower: 100000,
      cash: 100000,
      portfolioValue: 100000,
    });
    mockBrokerGetConnectionStatus.mockReturnValue({
      connected: true,
      lastHeartbeat: new Date(),
      latencyMs: 10,
      marketStatus: "open",
    });
    mockBrokerGetAccount.mockResolvedValue({
      id: "test-account",
      status: "active",
      currency: "USD",
      cash: 100000,
      portfolioValue: 100000,
      buyingPower: 100000,
      lastEquity: 100000,
      multiplier: 1,
      patternDayTrader: false,
      tradingBlocked: false,
      transfersBlocked: false,
    });
    mockBrokerIsMarketOpen.mockResolvedValue(true);
    mockBrokerPlaceBracketOrder.mockResolvedValue(makeBracketOrderResult());
    mockUpsert.mockResolvedValue({ data: null, error: null });

    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });
    await service.executeTrade(makeValidTradeSetup());

    // Now mock getPositions to return updated prices
    mockBrokerGetPositions.mockResolvedValue([
      {
        symbol: "AAPL",
        quantity: 100,
        side: "long",
        entryPrice: 101,
        currentPrice: 108,
        marketValue: 10800,
        costBasis: 10100,
        unrealizedPL: 700,
        unrealizedPLPercent: 6.93,
        realizedPL: 0,
        assetClass: "stock",
      } as BrokerPosition,
    ]);

    await service.updatePositions();

    const positions = service.getActivePositions();
    expect(positions[0].currentPrice).toBe(108);
    expect(positions[0].unrealizedPL).toBe(700);
  });
});

// ============================================================================
// getTradingStats TESTS
// ============================================================================

describe("PCTTTradingService - getTradingStats", () => {
  test("should return default stats when no broker connected", async () => {
    const service = new PCTTTradingService("user-1");

    const stats = await service.getTradingStats();

    expect(stats.dailyPL).toBe(0);
    expect(stats.dailyTradeCount).toBe(0);
    expect(stats.openPositionCount).toBe(0);
    expect(stats.canTrade).toBe(true);
    expect(stats.availableBuyingPower).toBe(100000);
  });

  test("should report canTrade=false when daily loss limit reached", async () => {
    const service = new PCTTTradingService("user-1", {
      accountSize: 100000,
      maxDailyLoss: 0.05, // 5% = $5000
      tradingHoursOnly: false,
    });
    mockBrokerConnect.mockResolvedValue({
      connected: true,
      accountId: "test-account",
      buyingPower: 100000,
      cash: 100000,
      portfolioValue: 100000,
    });
    mockBrokerGetConnectionStatus.mockReturnValue({
      connected: true,
      lastHeartbeat: new Date(),
      latencyMs: 10,
      marketStatus: "open",
    });
    mockBrokerGetAccount.mockResolvedValue({
      id: "test-account",
      status: "active",
      currency: "USD",
      cash: 95000,
      portfolioValue: 95000,
      buyingPower: 95000,
      lastEquity: 100000,
      multiplier: 1,
      patternDayTrader: false,
      tradingBlocked: false,
      transfersBlocked: false,
    });
    mockBrokerIsMarketOpen.mockResolvedValue(true);
    mockBrokerPlaceBracketOrder.mockResolvedValue(makeBracketOrderResult());
    mockUpsert.mockResolvedValue({ data: null, error: null });

    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    // Execute a trade, then close with big loss
    await service.executeTrade(makeValidTradeSetup());
    const pos = service.getActivePositions()[0];

    mockBrokerClosePosition.mockResolvedValue({
      success: true,
      order: {
        id: "close-1",
        symbol: "AAPL",
        side: "sell",
        type: "market",
        quantity: 100,
        filledQuantity: 100,
        status: "filled",
        timeInForce: "day",
        extendedHours: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        filledAvgPrice: 51, // entry=101, loss = (51-101)*100 = -5000
      },
    });
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await service.closePosition(pos.id);

    const stats = await service.getTradingStats();
    expect(stats.canTrade).toBe(false);
    expect(stats.reason).toContain("Daily loss limit");
  });

  test("should handle broker getAccount failure gracefully", async () => {
    const service = new PCTTTradingService("user-1");
    mockBrokerConnect.mockResolvedValue({
      connected: true,
      accountId: "test-account",
      buyingPower: 100000,
      cash: 100000,
      portfolioValue: 100000,
    });
    mockBrokerGetConnectionStatus.mockReturnValue({
      connected: true,
      lastHeartbeat: new Date(),
      latencyMs: 10,
      marketStatus: "open",
    });
    mockBrokerGetAccount.mockRejectedValue(new Error("Network error"));

    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });

    const stats = await service.getTradingStats();

    // Should fall back to config defaults
    expect(stats.availableBuyingPower).toBe(100000);
    expect(stats.canTrade).toBe(true);
  });
});

// ============================================================================
// DAILY STATS RESET TESTS
// ============================================================================

describe("PCTTTradingService - resetDailyStats", () => {
  test("should reset daily PL and trade count", async () => {
    const service = new PCTTTradingService("user-1", {
      tradingHoursOnly: false,
    });
    mockBrokerConnect.mockResolvedValue({
      connected: true,
      accountId: "test-account",
      buyingPower: 100000,
      cash: 100000,
      portfolioValue: 100000,
    });
    mockBrokerGetConnectionStatus.mockReturnValue({
      connected: true,
      lastHeartbeat: new Date(),
      latencyMs: 10,
      marketStatus: "open",
    });
    mockBrokerGetAccount.mockResolvedValue({
      id: "test-account",
      status: "active",
      currency: "USD",
      cash: 100000,
      portfolioValue: 100000,
      buyingPower: 100000,
      lastEquity: 100000,
      multiplier: 1,
      patternDayTrader: false,
      tradingBlocked: false,
      transfersBlocked: false,
    });
    mockBrokerIsMarketOpen.mockResolvedValue(true);
    mockBrokerPlaceBracketOrder.mockResolvedValue(makeBracketOrderResult());
    mockUpsert.mockResolvedValue({ data: null, error: null });

    await service.connectBroker("alpaca", {
      apiKey: "key",
      apiSecret: "secret",
    });
    await service.executeTrade(makeValidTradeSetup());

    let stats = await service.getTradingStats();
    expect(stats.dailyTradeCount).toBe(1);

    service.resetDailyStats();

    stats = await service.getTradingStats();
    expect(stats.dailyPL).toBe(0);
    expect(stats.dailyTradeCount).toBe(0);
  });
});

// ============================================================================
// loadPositions TESTS
// ============================================================================

describe("PCTTTradingService - loadPositions", () => {
  test("should load positions from database", async () => {
    const mockRow = {
      id: "pos-db-1",
      symbol: "GOOG",
      side: "long",
      quantity: 50,
      entry_price: 150,
      stop_loss: 145,
      take_profit: 160,
      q_score: 0.75,
      regime: "trend_up",
      action_line: 148,
      safety_line: 145,
      entry_order_id: "order-db-1",
      stop_loss_order_id: "sl-db-1",
      take_profit_order_id: "tp-db-1",
      entry_time: "2026-02-20T10:00:00Z",
      status: "open",
    };

    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [mockRow], error: null }),
      }),
    });

    const service = new PCTTTradingService("user-1");
    await service.loadPositions();

    const positions = service.getActivePositions();
    expect(positions).toHaveLength(1);
    expect(positions[0].id).toBe("pos-db-1");
    expect(positions[0].symbol).toBe("GOOG");
    expect(positions[0].quantity).toBe(50);
    expect(positions[0].entryPrice).toBe(150);
    expect(positions[0].stopLoss).toBe(145);
    expect(positions[0].qScore).toBe(0.75);
    expect(positions[0].entryTime).toBeInstanceOf(Date);
  });

  test("should handle empty database result", async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const service = new PCTTTradingService("user-1");
    await service.loadPositions();

    expect(service.getActivePositions()).toHaveLength(0);
  });

  test("should handle null data from database", async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const service = new PCTTTradingService("user-1");
    await service.loadPositions();

    expect(service.getActivePositions()).toHaveLength(0);
  });
});

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe("createPCTTTradingService", () => {
  test("should create a service with defaults", () => {
    const service = createPCTTTradingService("user-1");

    expect(service).toBeInstanceOf(PCTTTradingService);
    expect(service.getConfig().accountSize).toBe(100000);
  });

  test("should create a service with custom config", () => {
    const service = createPCTTTradingService("user-1", {
      accountSize: 50000,
      paperTrading: false,
    });

    expect(service.getConfig().accountSize).toBe(50000);
    expect(service.getConfig().paperTrading).toBe(false);
  });
});
