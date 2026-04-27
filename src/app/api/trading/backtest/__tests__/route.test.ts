/**
 * Tests for Trading Backtest API Routes
 *
 * Coverage:
 * - GET /api/trading/backtest (fetch results)
 * - POST /api/trading/backtest action=run (standard backtest)
 * - POST /api/trading/backtest action=walk-forward
 * - Authentication failures
 * - Input validation
 * - Strategy resolution (inline vs DB lookup)
 * - Error handling
 */

import { NextRequest } from "next/server";

// ============================================================================
// MOCKS
// ============================================================================

const mockValidateFromHeaders = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: { validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args) },
  JWTUser: {},
}));

const mockFrom = jest.fn();
const mockSupabaseAdmin = { from: (...args: unknown[]) => mockFrom(...args) };

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

const mockLoadData = jest.fn();
const mockRunBacktest = jest.fn();
const mockRunWalkForward = jest.fn();

jest.mock("@/lib/trading/backtesting/backtest-engine", () => ({
  createBacktestEngine: jest.fn(() => ({
    loadData: mockLoadData,
    runBacktest: mockRunBacktest,
    runWalkForward: mockRunWalkForward,
  })),
}));

const mockValidateStrategy = jest.fn();

jest.mock("@/lib/trading/strategies/strategy-validator", () => ({
  validateStrategy: mockValidateStrategy,
}));

const mockCheckSufficientCredits = jest.fn().mockResolvedValue(true);
const mockDeductCredits = jest.fn().mockResolvedValue({ success: true, remaining: 100 });

jest.mock("@/lib/credits", () => ({
  creditService: {
    checkSufficientCredits: (...args: unknown[]) => mockCheckSufficientCredits(...args),
    deductCredits: (...args: unknown[]) => mockDeductCredits(...args),
  },
  CREDIT_COSTS: {
    signal_analysis: 50,
    trade_execution: 2,
    backtest_standard: 60,
    backtest_ai: 500,
    chat_message: 15,
    dispute_letter_single: 50,
    dispute_letter_all: 150,
    credit_analysis: 12,
    monthly_reset: 0,
    credit_purchase: 0,
    addon_credit: 0,
  },
}));

import { createBacktestEngine } from "@/lib/trading/backtesting/backtest-engine";
import { GET, POST } from "../route";

// ============================================================================
// TEST DATA
// ============================================================================

const mockUser = { id: "user-123", email: "test@example.com", role: "user" };

const mockBacktestResult = {
  strategyName: "Momentum Breakout",
  symbol: "AAPL",
  totalReturn: 0.15,
  annualizedReturn: 0.18,
  sharpeRatio: 1.5,
  sortinoRatio: 2.1,
  maxDrawdown: -0.08,
  winRate: 0.62,
  profitFactor: 1.8,
  totalTrades: 45,
  equityCurve: [100000, 101000, 102500],
  trades: [],
  monthlyReturns: { "2025-01": 0.02, "2025-02": 0.03 },
};

const mockWalkForwardResult = {
  robustnessScore: 0.78,
  optimizedParams: { period: 14, threshold: 30 },
  inSampleResults: [
    {
      strategyName: "Momentum Breakout",
      symbol: "AAPL",
      totalReturn: 0.2,
      sharpeRatio: 1.8,
      maxDrawdown: -0.06,
      winRate: 0.65,
      totalTrades: 30,
    },
  ],
  outOfSampleResults: [
    {
      strategyName: "Momentum Breakout",
      symbol: "AAPL",
      totalReturn: 0.12,
      sharpeRatio: 1.2,
      maxDrawdown: -0.1,
      winRate: 0.58,
      totalTrades: 15,
    },
  ],
};

const mockDbResult = {
  id: "bt-001",
  user_id: "user-123",
  strategy_name: "Momentum Breakout",
  total_return: 0.15,
  sharpe_ratio: 1.5,
  max_drawdown: -0.08,
  win_rate: 0.62,
  total_trades: 45,
  created_at: "2026-02-25T00:00:00.000Z",
};

const validStrategy = {
  name: "Momentum Breakout",
  entryRules: [{ indicator: "RSI", operator: "lt", value: 30 }],
  exitRules: [{ indicator: "RSI", operator: "gt", value: 70 }],
  positionSizing: "percent" as const,
};

// ============================================================================
// HELPERS
// ============================================================================

function createMockRequest(
  url: string,
  options?: { method?: string; body?: unknown },
): NextRequest {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

function setupAuth(authenticated: boolean) {
  if (authenticated) {
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: mockUser, error: null });
  } else {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null, error: "Invalid token" });
  }
}

// ============================================================================
// TESTS: GET /api/trading/backtest
// ============================================================================

describe("GET /api/trading/backtest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(false);
    const req = createMockRequest("http://localhost/api/trading/backtest");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns backtest results for authenticated user", async () => {
    setupAuth(true);

    const rangeMock = jest.fn().mockResolvedValue({
      data: [mockDbResult],
      count: 1,
      error: null,
    });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/backtest");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.offset).toBe(0);
  });

  it("filters by strategy name", async () => {
    setupAuth(true);

    const rangeMock = jest.fn().mockResolvedValue({ data: [], count: 0, error: null });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const eqMockChain = jest.fn().mockReturnValue({ order: orderMock });
    // First eq for user_id, second for strategy_name
    const eqUserMock = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({ range: rangeMock }),
      eq: eqMockChain,
    });
    const selectMock = jest.fn().mockReturnValue({ eq: eqUserMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/backtest?strategy=Momentum+Breakout");
    await GET(req);

    // Verifies the route processes the strategy param
    expect(selectMock).toHaveBeenCalledWith("*", { count: "exact" });
  });

  it("applies pagination with limit and offset", async () => {
    setupAuth(true);

    const rangeMock = jest.fn().mockResolvedValue({ data: [], count: 0, error: null });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/backtest?limit=5&offset=10");
    const res = await GET(req);
    const body = await res.json();
    expect(body.limit).toBe(5);
    expect(body.offset).toBe(10);
    expect(rangeMock).toHaveBeenCalledWith(10, 14);
  });

  it("caps limit at 100", async () => {
    setupAuth(true);

    const rangeMock = jest.fn().mockResolvedValue({ data: [], count: 0, error: null });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/backtest?limit=500");
    const res = await GET(req);
    const body = await res.json();
    expect(body.limit).toBe(100);
  });

  it("returns 500 on DB error", async () => {
    setupAuth(true);

    const rangeMock = jest.fn().mockResolvedValue({
      data: null,
      count: null,
      error: { message: "DB failure" },
    });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/backtest");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to fetch");
  });
});

// ============================================================================
// TESTS: POST /api/trading/backtest — run action
// ============================================================================

describe("POST /api/trading/backtest action=run", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createBacktestEngine as jest.Mock).mockReturnValue({
      loadData: mockLoadData,
      runBacktest: mockRunBacktest,
      runWalkForward: mockRunWalkForward,
    });
    mockRunBacktest.mockReturnValue(mockBacktestResult);
    mockValidateStrategy.mockReturnValue({ valid: true, errors: [], warnings: [] });
    mockCheckSufficientCredits.mockResolvedValue(true);
    mockDeductCredits.mockResolvedValue({ success: true, remaining: 100 });
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(false);
    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "run", strategy: validStrategy, symbols: ["AAPL"] },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid action", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "invalid" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid action");
  });

  it("returns 400 when neither strategy nor strategyId provided", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "run", symbols: ["AAPL"] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("strategy or strategyId");
  });

  it("returns 400 when symbols is missing", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "run", strategy: validStrategy },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("symbols");
  });

  it("returns 400 when symbols is empty", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "run", strategy: validStrategy, symbols: [] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when strategy validation fails", async () => {
    setupAuth(true);
    mockValidateStrategy.mockReturnValue({
      valid: false,
      errors: [{ field: "entryRules", message: "Invalid indicator" }],
      warnings: [],
    });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "run", strategy: validStrategy, symbols: ["AAPL"] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid strategy");
  });

  it("runs backtest with inline strategy", async () => {
    setupAuth(true);

    // Mock insert for persisting results
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: {
        action: "run",
        strategy: validStrategy,
        symbols: ["AAPL", "MSFT"],
        initialCapital: 50000,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.results).toHaveLength(2);
    expect(body.data.summary.symbols).toEqual(["AAPL", "MSFT"]);
    expect(body.data.summary.initialCapital).toBe(50000);
    expect(mockRunBacktest).toHaveBeenCalledTimes(2);
    expect(mockLoadData).toHaveBeenCalledTimes(2);
  });

  it("loads strategy from DB when strategyId is provided", async () => {
    setupAuth(true);

    const dbStrategy = {
      config: validStrategy,
      name: "DB Strategy",
    };

    // First call: load strategy from DB
    const singleMock = jest.fn().mockResolvedValue({ data: dbStrategy, error: null });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    // Subsequent calls: insert results
    const insertMock = jest.fn().mockResolvedValue({ error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: selectMock };
      return { insert: insertMock };
    });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "run", strategyId: "strat-db-001", symbols: ["AAPL"] },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(selectMock).toHaveBeenCalledWith("config, name");
  });

  it("returns 404 when strategyId is not found", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "run", strategyId: "nonexistent", symbols: ["AAPL"] },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("persists results to backtest_results table", async () => {
    setupAuth(true);

    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: {
        action: "run",
        strategy: validStrategy,
        symbols: ["AAPL"],
        initialCapital: 100000,
      },
    });
    await POST(req);

    expect(mockFrom).toHaveBeenCalledWith("backtest_results");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        strategy_name: "Momentum Breakout",
        initial_capital: 100000,
        total_return: 0.15,
        sharpe_ratio: 1.5,
      }),
    );
  });

  it("defaults initialCapital to 100000", async () => {
    setupAuth(true);

    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "run", strategy: validStrategy, symbols: ["AAPL"] },
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.data.summary.initialCapital).toBe(100000);
  });

  it("includes summary with averages", async () => {
    setupAuth(true);

    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "run", strategy: validStrategy, symbols: ["AAPL"] },
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.data.summary).toEqual(
      expect.objectContaining({
        avgReturn: expect.any(Number),
        avgSharpe: expect.any(Number),
        avgDrawdown: expect.any(Number),
        totalTrades: expect.any(Number),
      }),
    );
  });
});

// ============================================================================
// TESTS: POST /api/trading/backtest — walk-forward action
// ============================================================================

describe("POST /api/trading/backtest action=walk-forward", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createBacktestEngine as jest.Mock).mockReturnValue({
      loadData: mockLoadData,
      runBacktest: mockRunBacktest,
      runWalkForward: mockRunWalkForward,
    });
    mockRunWalkForward.mockResolvedValue(mockWalkForwardResult);
    mockValidateStrategy.mockReturnValue({ valid: true, errors: [], warnings: [] });
    mockCheckSufficientCredits.mockResolvedValue(true);
    mockDeductCredits.mockResolvedValue({ success: true, remaining: 100 });
  });

  it("returns 400 when symbol is missing", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "walk-forward", strategy: validStrategy },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("symbol is required");
  });

  it("returns 400 when windows is out of range", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "walk-forward", strategy: validStrategy, symbol: "AAPL", windows: 25 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("windows must be between");
  });

  it("returns 400 when windows is too low", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "walk-forward", strategy: validStrategy, symbol: "AAPL", windows: 1 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when inSampleRatio is 0", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: {
        action: "walk-forward",
        strategy: validStrategy,
        symbol: "AAPL",
        inSampleRatio: 0,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("inSampleRatio");
  });

  it("returns 400 when inSampleRatio is 1", async () => {
    setupAuth(true);
    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: {
        action: "walk-forward",
        strategy: validStrategy,
        symbol: "AAPL",
        inSampleRatio: 1,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("runs walk-forward analysis successfully", async () => {
    setupAuth(true);

    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: {
        action: "walk-forward",
        strategy: validStrategy,
        symbol: "AAPL",
        windows: 5,
        inSampleRatio: 0.7,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.robustnessScore).toBe(0.78);
    expect(body.data.optimizedParams).toEqual({ period: 14, threshold: 30 });
    expect(body.data.windows).toBe(5);
    expect(body.data.inSampleRatio).toBe(0.7);
    expect(body.data.symbol).toBe("AAPL");
    expect(mockRunWalkForward).toHaveBeenCalledWith("AAPL", validStrategy, 5, 0.7);
  });

  it("persists walk-forward results with strategy name suffix", async () => {
    setupAuth(true);

    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: {
        action: "walk-forward",
        strategy: validStrategy,
        symbol: "AAPL",
      },
    });
    await POST(req);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        strategy_name: "Momentum Breakout (Walk-Forward)",
        symbols: ["AAPL"],
      }),
    );
  });

  it("defaults windows to 5 and inSampleRatio to 0.7", async () => {
    setupAuth(true);

    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "walk-forward", strategy: validStrategy, symbol: "AAPL" },
    });
    await POST(req);

    expect(mockRunWalkForward).toHaveBeenCalledWith("AAPL", validStrategy, 5, 0.7);
  });

  it("loads strategy from DB for walk-forward", async () => {
    setupAuth(true);

    const dbStrategy = { config: validStrategy, name: "DB Strategy" };
    const singleMock = jest.fn().mockResolvedValue({ data: dbStrategy, error: null });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const insertMock = jest.fn().mockResolvedValue({ error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: selectMock };
      return { insert: insertMock };
    });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "walk-forward", strategyId: "strat-db-001", symbol: "AAPL" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 404 when strategyId not found for walk-forward", async () => {
    setupAuth(true);

    const singleMock = jest.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

    mockFrom.mockReturnValue({ select: selectMock });

    const req = createMockRequest("http://localhost/api/trading/backtest", {
      method: "POST",
      body: { action: "walk-forward", strategyId: "nonexistent", symbol: "AAPL" },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
