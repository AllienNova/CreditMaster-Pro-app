/**
 * PCTT Mode Integration Tests
 *
 * Tests for operating mode enforcement, 3-gate risk validation, and graduation
 * recording wired into PCTTTradingService.executeTrade().
 *
 * Covers:
 *   - WATCH mode blocking live trades (paper allowed)
 *   - GUIDED mode setting requiresConfirmation flag
 *   - AUTONOMOUS mode passthrough (no confirmation)
 *   - Enhanced risk validation failures
 *   - Graduation recording after successful live trades
 *   - Graceful fallback when mode manager is unavailable
 *   - getOperatingMode() convenience method
 *
 * IMPORTANT: jest.config has resetMocks:true — all jest.mock factories
 * use arrow-function wrappers so they survive resets.
 */

import type { OHLCV, PCTTSignal, StructureObject } from "../pctt-core";
import type {
  BracketOrderResult,
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
  supabaseAdmin: { from: jest.fn() },
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

// Operating Mode Manager mock
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

// Risk Gateway mock
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
  type TradeSetup,
} from "../pctt-trading-service";
import type { EnhancedRiskValidation } from "../../risk/risk-gateway";

// ============================================================================
// FROZEN CLOCK — the PCTT pre-market checklist's market_calendar check reads
// the real date (pre-market-checklist.ts: `ctx.timestamp ?? new Date()`).
// Without this, the weekend gate short-circuits executeTrade on Sat/Sun.
// Freeze to a fixed weekday so the suite is deterministic.
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
// GLOBAL beforeEach
// ============================================================================

beforeEach(() => {
  // Supabase chain
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
  mockBrokerClosePosition.mockResolvedValue({
    success: false,
    error: "not set",
  });
  mockBrokerGetPositions.mockResolvedValue([]);
  mockBrokerIsMarketOpen.mockResolvedValue(true);

  // Engine defaults
  mockEngineReset.mockReturnValue(undefined);
  mockEngineUpdate.mockReturnValue({
    structure: makeStructure(),
    signal: null,
  });

  // Operating Mode Manager defaults: GUIDED mode (safe default)
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
  mockGetCurrentMode.mockResolvedValue({
    success: true,
    data: "guided",
  });
  mockRecordLiveTrade.mockResolvedValue({ success: true });
  mockRecordActiveDay.mockResolvedValue({ success: true });

  // Risk Gateway default: approved
  mockValidateTradeEnhanced.mockResolvedValue(makeApprovedRiskValidation());
});

// ============================================================================
// TEST HELPERS
// ============================================================================

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

function makeApprovedRiskValidation(): EnhancedRiskValidation {
  return {
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
  };
}

function makeRejectedRiskValidation(
  failedGate: "compliance" | "risk_limits" | "execution" = "risk_limits",
  message: string = "Position size exceeds limit",
): EnhancedRiskValidation {
  return {
    approved: false,
    violations: [
      {
        rule: "max_position_size",
        message,
        severity: "critical",
        currentValue: 15,
        limit: 10,
      },
    ],
    warnings: [],
    gateResults: [
      {
        gate: "compliance",
        passed: failedGate !== "compliance",
        violations:
          failedGate === "compliance"
            ? [
                {
                  rule: "compliance_check",
                  message,
                  severity: "critical",
                  currentValue: 15,
                  limit: 10,
                },
              ]
            : [],
        warnings: [],
      },
      {
        gate: "risk_limits",
        passed: failedGate !== "risk_limits",
        violations:
          failedGate === "risk_limits"
            ? [
                {
                  rule: "max_position_size",
                  message,
                  severity: "critical",
                  currentValue: 15,
                  limit: 10,
                },
              ]
            : [],
        warnings: [],
      },
      {
        gate: "execution",
        passed: failedGate !== "execution",
        violations:
          failedGate === "execution"
            ? [
                {
                  rule: "execution_limit",
                  message,
                  severity: "critical",
                  currentValue: 15,
                  limit: 10,
                },
              ]
            : [],
        warnings: [],
      },
    ],
    operatingMode: "guided",
    confirmationRequired: false,
  };
}

async function createConnectedService(
  configOverrides: Record<string, unknown> = {},
): Promise<PCTTTradingService> {
  const service = new PCTTTradingService("user-123", {
    paperTrading: false,
    ...configOverrides,
  });
  await service.connectBroker("alpaca", {
    apiKey: "test-key",
    apiSecret: "test-secret",
  });
  return service;
}

// ============================================================================
// TESTS: WATCH MODE BLOCKING
// ============================================================================

describe("WATCH mode enforcement", () => {
  it("blocks live trades when in WATCH mode", async () => {
    mockGetModePermissions.mockResolvedValue({
      success: true,
      data: {
        mode: "watch",
        canViewSignals: true,
        canPaperTrade: true,
        canPlaceLiveOrders: false,
        requiresConfirmation: false,
        canAutoExecute: false,
      },
    });

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(false);
    expect(result.error).toContain("WATCH mode active");
    expect(result.operatingMode).toBe("watch");
    expect(result.requiresConfirmation).toBe(false);
    // Broker should NOT have been called
    expect(mockBrokerPlaceBracketOrder).not.toHaveBeenCalled();
  });

  it("allows paper trades even in WATCH mode", async () => {
    mockGetModePermissions.mockResolvedValue({
      success: true,
      data: {
        mode: "watch",
        canViewSignals: true,
        canPaperTrade: true,
        canPlaceLiveOrders: false,
        requiresConfirmation: false,
        canAutoExecute: false,
      },
    });

    // Paper trading = true bypasses the mode block
    const service = new PCTTTradingService("user-123", {
      paperTrading: true,
    });
    await service.connectBroker("alpaca", {
      apiKey: "test-key",
      apiSecret: "test-secret",
    });

    const result = await service.executeTrade(makeValidTradeSetup());

    // Should pass mode check (paper trading allowed)
    // It may still succeed or fail on other checks, but NOT on mode
    if (result.error) {
      expect(result.error).not.toContain("WATCH mode active");
    }
  });

  it("returns operatingMode in the error response for WATCH block", async () => {
    mockGetModePermissions.mockResolvedValue({
      success: true,
      data: {
        mode: "watch",
        canViewSignals: true,
        canPaperTrade: true,
        canPlaceLiveOrders: false,
        requiresConfirmation: false,
        canAutoExecute: false,
      },
    });

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.operatingMode).toBe("watch");
  });
});

// ============================================================================
// TESTS: GUIDED MODE CONFIRMATION
// ============================================================================

describe("GUIDED mode confirmation flag", () => {
  it("sets requiresConfirmation=true for GUIDED mode", async () => {
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

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    expect(result.operatingMode).toBe("guided");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("allows GUIDED mode to place live orders", async () => {
    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    expect(mockBrokerPlaceBracketOrder).toHaveBeenCalled();
  });

  it("returns operatingMode=guided on successful trades", async () => {
    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.operatingMode).toBe("guided");
  });
});

// ============================================================================
// TESTS: AUTONOMOUS MODE PASSTHROUGH
// ============================================================================

describe("AUTONOMOUS mode passthrough", () => {
  beforeEach(() => {
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
  });

  it("executes without requiring confirmation", async () => {
    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    expect(result.operatingMode).toBe("autonomous");
    expect(result.requiresConfirmation).toBe(false);
  });

  it("places orders normally in AUTONOMOUS mode", async () => {
    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    expect(mockBrokerPlaceBracketOrder).toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: RISK VALIDATION
// ============================================================================

describe("3-gate risk validation", () => {
  it("blocks trades when risk validation fails", async () => {
    mockValidateTradeEnhanced.mockResolvedValue(
      makeRejectedRiskValidation("risk_limits", "Position size exceeds limit"),
    );

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(false);
    expect(result.error).toContain("Risk validation failed");
    expect(result.error).toContain("risk_limits");
    expect(result.error).toContain("Position size exceeds limit");
    expect(mockBrokerPlaceBracketOrder).not.toHaveBeenCalled();
  });

  it("blocks trades when compliance gate fails", async () => {
    mockValidateTradeEnhanced.mockResolvedValue(
      makeRejectedRiskValidation("compliance", "Compliance check failed"),
    );

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(false);
    expect(result.error).toContain("Risk validation failed");
    expect(result.error).toContain("compliance");
  });

  it("blocks trades when execution gate fails", async () => {
    mockValidateTradeEnhanced.mockResolvedValue(
      makeRejectedRiskValidation("execution", "Execution limit exceeded"),
    );

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(false);
    expect(result.error).toContain("execution");
  });

  it("includes operatingMode in risk failure response", async () => {
    mockValidateTradeEnhanced.mockResolvedValue(
      makeRejectedRiskValidation(),
    );

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.operatingMode).toBe("guided");
    expect(result.requiresConfirmation).toBe(false);
  });

  it("passes trade context to risk gateway including operatingMode", async () => {
    const service = await createConnectedService();
    await service.executeTrade(makeValidTradeSetup());

    expect(mockValidateTradeEnhanced).toHaveBeenCalledWith(
      expect.objectContaining({
        trade: expect.objectContaining({
          symbol: "AAPL",
          side: "buy",
          quantity: 100,
          price: 101,
          stopLoss: 95,
        }),
        portfolio: expect.objectContaining({
          totalValue: expect.any(Number),
          cashBalance: expect.any(Number),
        }),
        operatingMode: "guided",
        dailyTradeCount: 0,
      }),
    );
  });

  it("fails open when risk gateway throws an error", async () => {
    mockValidateTradeEnhanced.mockRejectedValue(
      new Error("Risk service unavailable"),
    );

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    // Should still proceed (fail-open behavior)
    expect(result.success).toBe(true);
  });

  it("passes trade through when all gates approve", async () => {
    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    expect(mockBrokerPlaceBracketOrder).toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: GRADUATION RECORDING
// ============================================================================

describe("graduation recording after successful trades", () => {
  it("records live trade for graduation tracking", async () => {
    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    expect(mockRecordLiveTrade).toHaveBeenCalledWith(false);
  });

  it("records active day for GUIDED mode", async () => {
    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    expect(mockRecordActiveDay).toHaveBeenCalledWith("guided");
  });

  it("records active day as guided for AUTONOMOUS mode", async () => {
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

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    // AUTONOMOUS maps to "guided" for recordActiveDay
    expect(mockRecordActiveDay).toHaveBeenCalledWith("guided");
  });

  it("does NOT record graduation for paper trades", async () => {
    const service = new PCTTTradingService("user-123", {
      paperTrading: true,
    });
    await service.connectBroker("alpaca", {
      apiKey: "test-key",
      apiSecret: "test-secret",
    });

    // Ensure mode allows paper trades even in WATCH
    mockGetModePermissions.mockResolvedValue({
      success: true,
      data: {
        mode: "watch",
        canViewSignals: true,
        canPaperTrade: true,
        canPlaceLiveOrders: false,
        requiresConfirmation: false,
        canAutoExecute: false,
      },
    });

    await service.executeTrade(makeValidTradeSetup());

    expect(mockRecordLiveTrade).not.toHaveBeenCalled();
    expect(mockRecordActiveDay).not.toHaveBeenCalled();
  });

  it("does not fail the trade if graduation recording fails", async () => {
    mockRecordLiveTrade.mockRejectedValue(new Error("DB error"));
    mockRecordActiveDay.mockRejectedValue(new Error("DB error"));

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    // Trade should still succeed
    expect(result.success).toBe(true);
    expect(result.tradeId).toBeDefined();
  });

  it("does NOT record graduation when mode manager was unavailable", async () => {
    mockGetModePermissions.mockRejectedValue(
      new Error("Mode manager unavailable"),
    );

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    // Trade succeeds with default GUIDED mode
    expect(result.success).toBe(true);
    // But graduation should NOT be recorded (modeManagerAvailable = false)
    expect(mockRecordLiveTrade).not.toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: MODE MANAGER FALLBACK
// ============================================================================

describe("mode manager unavailability fallback", () => {
  it("defaults to GUIDED mode when mode manager throws", async () => {
    mockGetModePermissions.mockRejectedValue(
      new Error("Service unavailable"),
    );

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    // Should succeed with GUIDED defaults (allows live, requires confirmation)
    expect(result.success).toBe(true);
    expect(result.operatingMode).toBe("guided");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("defaults to GUIDED mode when getModePermissions returns failure", async () => {
    mockGetModePermissions.mockResolvedValue({
      success: false,
      error: "Account not found",
    });

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    expect(result.operatingMode).toBe("guided");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("still allows trades with default permissions when mode manager fails", async () => {
    mockGetModePermissions.mockResolvedValue({
      success: false,
      error: "DB connection error",
    });

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    expect(mockBrokerPlaceBracketOrder).toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: getOperatingMode() CONVENIENCE METHOD
// ============================================================================

describe("getOperatingMode() convenience method", () => {
  it("returns current mode from mode manager", async () => {
    mockGetCurrentMode.mockResolvedValue({
      success: true,
      data: "autonomous",
    });

    const service = new PCTTTradingService("user-123");
    const mode = await service.getOperatingMode();

    expect(mode).toBe("autonomous");
  });

  it("returns GUIDED as default when mode manager fails", async () => {
    mockGetCurrentMode.mockRejectedValue(new Error("DB error"));

    const service = new PCTTTradingService("user-123");
    const mode = await service.getOperatingMode();

    expect(mode).toBe("guided");
  });

  it("returns GUIDED when getCurrentMode returns failure result", async () => {
    mockGetCurrentMode.mockResolvedValue({
      success: false,
      error: "Account not found",
    });

    const service = new PCTTTradingService("user-123");
    const mode = await service.getOperatingMode();

    expect(mode).toBe("guided");
  });

  it("returns WATCH mode correctly", async () => {
    mockGetCurrentMode.mockResolvedValue({
      success: true,
      data: "watch",
    });

    const service = new PCTTTradingService("user-123");
    const mode = await service.getOperatingMode();

    expect(mode).toBe("watch");
  });

  it("returns GUIDED mode correctly", async () => {
    mockGetCurrentMode.mockResolvedValue({
      success: true,
      data: "guided",
    });

    const service = new PCTTTradingService("user-123");
    const mode = await service.getOperatingMode();

    expect(mode).toBe("guided");
  });
});

// ============================================================================
// TESTS: EXECUTION RESULT TYPE EXTENSION
// ============================================================================

describe("ExecutionResult type fields", () => {
  it("includes operatingMode on successful execution", async () => {
    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result).toHaveProperty("operatingMode");
    expect(typeof result.operatingMode).toBe("string");
  });

  it("includes requiresConfirmation on successful execution", async () => {
    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result).toHaveProperty("requiresConfirmation");
    expect(typeof result.requiresConfirmation).toBe("boolean");
  });

  it("includes operatingMode in trading condition failure", async () => {
    // Force daily loss limit breach
    const service = new PCTTTradingService("user-123", {
      paperTrading: false,
      maxDailyLoss: 0.001, // Very tight loss limit
      accountSize: 100,
    });
    await service.connectBroker("alpaca", {
      apiKey: "test-key",
      apiSecret: "test-secret",
    });

    // Simulate a previous big loss
    mockBrokerGetAccount.mockResolvedValue({
      id: "test-account",
      status: "active",
      currency: "USD",
      cash: 100,
      portfolioValue: 100,
      buyingPower: 100,
      lastEquity: 100,
      multiplier: 1,
      patternDayTrader: false,
      tradingBlocked: false,
      transfersBlocked: false,
    });

    // Close a position to trigger daily loss recording
    // We need to manipulate the service to have dailyPL < limit
    // Instead, let's test the market closed case
    mockBrokerIsMarketOpen.mockResolvedValue(false);

    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(false);
    expect(result.operatingMode).toBe("guided");
  });
});

// ============================================================================
// TESTS: END-TO-END FLOW
// ============================================================================

describe("end-to-end trade execution flow", () => {
  it("completes full execution flow in GUIDED mode", async () => {
    const service = await createConnectedService();
    const setup = makeValidTradeSetup();
    const result = await service.executeTrade(setup);

    expect(result.success).toBe(true);
    expect(result.tradeId).toBeDefined();
    expect(result.orderId).toBe("order-123");
    expect(result.symbol).toBe("AAPL");
    expect(result.side).toBe("buy");
    expect(result.quantity).toBe(100);
    expect(result.operatingMode).toBe("guided");
    expect(result.requiresConfirmation).toBe(true);

    // Verify the full call chain
    expect(mockGetModePermissions).toHaveBeenCalled();
    expect(mockValidateTradeEnhanced).toHaveBeenCalled();
    expect(mockBrokerPlaceBracketOrder).toHaveBeenCalled();
    expect(mockRecordLiveTrade).toHaveBeenCalled();
    expect(mockRecordActiveDay).toHaveBeenCalled();
  });

  it("completes full execution flow in AUTONOMOUS mode", async () => {
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

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(true);
    expect(result.operatingMode).toBe("autonomous");
    expect(result.requiresConfirmation).toBe(false);
    expect(mockRecordLiveTrade).toHaveBeenCalled();
    expect(mockRecordActiveDay).toHaveBeenCalledWith("guided");
  });

  it("stops at mode check for WATCH live trade", async () => {
    mockGetModePermissions.mockResolvedValue({
      success: true,
      data: {
        mode: "watch",
        canViewSignals: true,
        canPaperTrade: true,
        canPlaceLiveOrders: false,
        requiresConfirmation: false,
        canAutoExecute: false,
      },
    });

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(false);
    // Risk gateway should NOT have been called (early exit)
    expect(mockValidateTradeEnhanced).not.toHaveBeenCalled();
    expect(mockBrokerPlaceBracketOrder).not.toHaveBeenCalled();
  });

  it("stops at risk validation when gate fails", async () => {
    mockValidateTradeEnhanced.mockResolvedValue(
      makeRejectedRiskValidation("compliance", "Trade violates compliance rules"),
    );

    const service = await createConnectedService();
    const result = await service.executeTrade(makeValidTradeSetup());

    expect(result.success).toBe(false);
    // Mode check should have passed
    expect(mockGetModePermissions).toHaveBeenCalled();
    // But broker should NOT have been called
    expect(mockBrokerPlaceBracketOrder).not.toHaveBeenCalled();
    // And graduation should NOT be recorded
    expect(mockRecordLiveTrade).not.toHaveBeenCalled();
  });
});
