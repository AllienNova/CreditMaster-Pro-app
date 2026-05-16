/**
 * Tests for Trading Compliance API Routes
 *
 * Coverage:
 * - GET /api/trading/compliance (retrieve compliance history)
 * - POST /api/trading/compliance (evaluate compliance)
 * - Authentication failures
 * - Input validation (symbol, signalType, currentPrice)
 * - Compliance evaluation success/failure
 * - Error handling
 */

import { NextRequest } from "next/server";

// ============================================================================
// MOCKS
// ============================================================================

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/trading/compliance", () => ({
  createComplianceScorer: jest.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createComplianceScorer } from "@/lib/trading/compliance";
import { GET, POST } from "../route";

// Module-level mock state
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockRange = jest.fn();
const mockEvaluateSignal = jest.fn();

// ============================================================================
// TEST DATA
// ============================================================================

const mockUser = { id: "user-123", email: "test@example.com" };

const mockComplianceScore = {
  id: "score-001",
  user_id: "user-123",
  symbol: "AAPL",
  signal_type: "buy",
  composite_score: 85,
  should_block: false,
  has_critical_violation: false,
  law_scores: {},
  violations: [],
  created_at: "2026-02-25T12:00:00.000Z",
};

const mockComplianceResult = {
  compositeScore: 85,
  shouldBlock: false,
  hasCriticalViolation: false,
  applicableLaws: 18,
  passingLaws: 17,
  failingLaws: 1,
  violations: [
    {
      lawId: "LAW_15",
      lawName: "Sector Concentration Limit",
      severity: "warning" as const,
      message: "Technology sector concentration at 42%",
      remediation: "Consider diversifying into other sectors",
    },
  ],
  summary: "Signal passes compliance with 1 minor warning",
  context: {
    symbol: "AAPL",
    signalType: "buy",
    operatingMode: "watch",
  },
};

const mockBlockedResult = {
  compositeScore: 25,
  shouldBlock: true,
  hasCriticalViolation: true,
  applicableLaws: 20,
  passingLaws: 8,
  failingLaws: 12,
  violations: [
    {
      lawId: "LAW_01",
      lawName: "Daily Loss Limit",
      severity: "critical" as const,
      message: "Daily loss exceeds 5% limit",
      remediation: "Stop trading for the day",
    },
  ],
  summary: "Signal blocked: critical violations detected",
  context: {
    symbol: "AAPL",
    signalType: "buy",
    operatingMode: "autonomous",
  },
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
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  } else {
    mockValidateFromHeaders.mockResolvedValue({
      valid: false,
      user: null,
      error: "Invalid token",
    });
  }
  (createClient as jest.Mock).mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  });
}

function setupComplianceScorer() {
  (createComplianceScorer as jest.Mock).mockReturnValue({
    evaluateSignal: mockEvaluateSignal,
  });
}

function setupSupabaseQuery(data: unknown[] | null, error: unknown = null) {
  const finalResult = { data, error };
  // Supabase query builder returns itself from every method — mock the same behavior.
  // The object is also thenable so `await query` resolves to the final result.
  const chainable: Record<string, unknown> = {};
  chainable.from = mockFrom;
  chainable.select = mockSelect;
  chainable.eq = mockEq;
  chainable.order = mockOrder;
  chainable.range = mockRange;
  chainable.then = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve(finalResult).then(resolve, reject);

  mockFrom.mockReturnValue(chainable);
  mockSelect.mockReturnValue(chainable);
  mockEq.mockReturnValue(chainable);
  mockOrder.mockReturnValue(chainable);
  mockRange.mockReturnValue(chainable);
}

// ============================================================================
// TESTS
// ============================================================================

describe("Trading Compliance API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(true);
    setupComplianceScorer();
  });

  // --------------------------------------------------------------------------
  // Authentication Tests
  // --------------------------------------------------------------------------

  describe("negative-auth – /api/trading/compliance", () => {
    it("GET returns 401 when not authenticated", async () => {
      setupAuth(false);
      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("POST returns 401 when not authenticated", async () => {
      setupAuth(false);
      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: {
            symbol: "AAPL",
            signalType: "buy",
            currentPrice: 150,
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/trading/compliance (Retrieve Compliance History)
  // --------------------------------------------------------------------------

  describe("GET /api/trading/compliance", () => {
    it("returns compliance history with default pagination", async () => {
      setupSupabaseQuery([mockComplianceScore]);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scores).toEqual([mockComplianceScore]);
      expect(data.data.count).toBe(1);
      expect(data.data.offset).toBe(0);
      expect(data.data.limit).toBe(20);
      expect(data.timestamp).toBeDefined();
    });

    it("filters by symbol", async () => {
      setupSupabaseQuery([mockComplianceScore]);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance?symbol=AAPL",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEq).toHaveBeenCalledWith("symbol", "AAPL");
    });

    it("filters by signalType", async () => {
      setupSupabaseQuery([mockComplianceScore]);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance?signalType=buy",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEq).toHaveBeenCalledWith("signal_type", "buy");
    });

    it("applies custom pagination", async () => {
      setupSupabaseQuery([]);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance?limit=10&offset=5",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.offset).toBe(5);
      expect(data.data.limit).toBe(10);
      expect(mockRange).toHaveBeenCalledWith(5, 14);
    });

    it("returns empty array when no scores found", async () => {
      setupSupabaseQuery([]);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scores).toEqual([]);
      expect(data.data.count).toBe(0);
    });

    it("returns 500 when database query fails", async () => {
      setupSupabaseQuery(null, { message: "DB error" });

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to retrieve compliance history");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Unexpected crash");
      });

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to retrieve compliance history");
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/trading/compliance (Evaluate Compliance)
  // --------------------------------------------------------------------------

  describe("POST /api/trading/compliance", () => {
    it("evaluates compliance successfully with passing result", async () => {
      mockEvaluateSignal.mockReturnValue(mockComplianceResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: {
            symbol: "AAPL",
            signalType: "buy",
            currentPrice: 150.25,
            signalStrength: 75,
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.compositeScore).toBe(85);
      expect(data.data.shouldBlock).toBe(false);
      expect(data.data.hasCriticalViolation).toBe(false);
      expect(data.data.applicableLaws).toBe(18);
      expect(data.data.passingLaws).toBe(17);
      expect(data.data.failingLaws).toBe(1);
      expect(data.data.violations).toHaveLength(1);
      expect(data.data.summary).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(createComplianceScorer).toHaveBeenCalled();
    });

    it("evaluates compliance with blocking result", async () => {
      mockEvaluateSignal.mockReturnValue(mockBlockedResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: {
            symbol: "AAPL",
            signalType: "buy",
            currentPrice: 150,
            operatingMode: "autonomous",
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.compositeScore).toBe(25);
      expect(data.data.shouldBlock).toBe(true);
      expect(data.data.hasCriticalViolation).toBe(true);
    });

    it("passes all context fields to compliance scorer", async () => {
      mockEvaluateSignal.mockReturnValue(mockComplianceResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: {
            symbol: "AAPL",
            signalType: "buy",
            currentPrice: 150,
            signalStrength: 80,
            operatingMode: "guided",
            signalId: "sig-001",
            stopLossPrice: 140,
            takeProfitPrice: 170,
            positionSize: 100,
            portfolioValue: 50000,
            openPositions: 3,
            maxPositions: 10,
            dailyPnlPct: -1.5,
            maxDailyLossPct: 5,
            regimeType: "trending",
            relativeVolume: 1.5,
            atr: 3.2,
            extendedHours: false,
            riskRewardRatio: 2.1,
            portfolioCorrelation: 0.4,
            sector: "Technology",
            existingSectors: ["Healthcare", "Finance"],
            daysSinceLastTrade: 2,
            additionalContext: { notes: "earnings week" },
          },
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockEvaluateSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          symbol: "AAPL",
          signalType: "buy",
          operatingMode: "guided",
          signalStrength: 80,
          currentPrice: 150,
          signalId: "sig-001",
          stopLossPrice: 140,
          takeProfitPrice: 170,
          positionSize: 100,
          portfolioValue: 50000,
          openPositions: 3,
          maxPositions: 10,
          dailyPnlPct: -1.5,
          maxDailyLossPct: 5,
          regimeType: "trending",
          relativeVolume: 1.5,
          atr: 3.2,
          extendedHours: false,
          riskRewardRatio: 2.1,
          portfolioCorrelation: 0.4,
          sector: "Technology",
          existingSectors: ["Healthcare", "Finance"],
          daysSinceLastTrade: 2,
          additionalContext: { notes: "earnings week" },
        }),
      );
    });

    it("evaluates sell signal", async () => {
      mockEvaluateSignal.mockReturnValue(mockComplianceResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: {
            symbol: "AAPL",
            signalType: "sell",
            currentPrice: 150,
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("evaluates hold signal", async () => {
      mockEvaluateSignal.mockReturnValue(mockComplianceResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: {
            symbol: "AAPL",
            signalType: "hold",
            currentPrice: 150,
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("defaults signalStrength to 50 when not provided", async () => {
      mockEvaluateSignal.mockReturnValue(mockComplianceResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: {
            symbol: "AAPL",
            signalType: "buy",
            currentPrice: 150,
          },
        },
      );
      await POST(request);

      expect(mockEvaluateSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          signalStrength: 50,
        }),
      );
    });

    it("defaults operatingMode to watch when not provided", async () => {
      mockEvaluateSignal.mockReturnValue(mockComplianceResult);

      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: {
            symbol: "AAPL",
            signalType: "buy",
            currentPrice: 150,
          },
        },
      );
      await POST(request);

      expect(mockEvaluateSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          operatingMode: "watch",
        }),
      );
    });

    // Validation errors

    it("returns 400 for missing symbol", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: { signalType: "buy", currentPrice: 150 },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("symbol is required");
    });

    it("returns 400 for missing signalType", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: { symbol: "AAPL", currentPrice: 150 },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("signalType is required");
    });

    it("returns 400 for invalid signalType", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: { symbol: "AAPL", signalType: "long", currentPrice: 150 },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("signalType is required");
    });

    it("returns 400 for missing currentPrice", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: { symbol: "AAPL", signalType: "buy" },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("currentPrice must be a positive number");
    });

    it("returns 400 for negative currentPrice", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: { symbol: "AAPL", signalType: "buy", currentPrice: -5 },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("currentPrice must be a positive number");
    });

    it("returns 400 for zero currentPrice", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: { symbol: "AAPL", signalType: "buy", currentPrice: 0 },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("currentPrice must be a positive number");
    });

    it("returns 400 for non-numeric currentPrice", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: {
            symbol: "AAPL",
            signalType: "buy",
            currentPrice: "not-a-number",
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("currentPrice must be a positive number");
    });

    it("returns 400 for non-numeric signalStrength", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/trading/compliance",
        {
          method: "POST",
          body: {
            symbol: "AAPL",
            signalType: "buy",
            currentPrice: 150,
            signalStrength: "strong",
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("signalStrength must be a number");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      const request = {
        url: "http://localhost:3000/api/trading/compliance",
        method: "POST",
        json: jest.fn().mockRejectedValue(new Error("JSON parse error")),
        headers: new Headers(),
        nextUrl: new URL("http://localhost:3000/api/trading/compliance"),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to evaluate compliance");
    });
  });
});
