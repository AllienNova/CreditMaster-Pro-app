/**
 * Negative-auth tests for /api/investments/portfolio/analyze (TASK-AUTH-03e)
 * Per-element validation tests (TASK-INV-03 / FND-033)
 */

import { NextRequest } from "next/server";

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
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({})),
}));
jest.mock("@/lib/investments/services/PortfolioAnalysisService", () => ({
  PortfolioAnalysisService: jest.fn().mockImplementation(() => ({
    analyzePortfolio: jest.fn().mockReturnValue({
      totalValue: 1000,
      totalCostBasis: 900,
      totalGainLoss: 100,
      totalGainLossPercent: 11.11,
      beta: 1.0,
      alpha: 0.05,
      sharpeRatio: 1.2,
      sortinoRatio: 1.5,
      maxDrawdown: 0.1,
      volatility: 0.2,
      valueAtRisk: { daily95: 10, daily99: 15, weekly95: 25, monthly95: 45 },
      correlationToMarket: 0.85,
      diversificationScore: 60,
      concentrationRisk: 30,
      sectorExposure: {},
      assetClassAllocation: {},
      dailyReturn: 0.01,
      weeklyReturn: 0.05,
      monthlyReturn: 0.2,
      ytdReturn: 1.5,
      annualizedReturn: 10,
    }),
    analyzeDiversification: jest.fn().mockReturnValue({
      score: 60,
      sectorDiversification: 50,
      assetClassDiversification: 70,
      geographicDiversification: 50,
      recommendations: [],
      overweightedSectors: [],
      underweightedSectors: [],
    }),
  })),
}));

import { GET, POST } from "../route";

const AUTHENTICATED_USER = {
  id: "user-123",
  email: "test@example.com",
  role: "user",
};

function createUnauthRequest(url: string, method = "GET"): NextRequest {
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

function createAuthRequest(
  url: string,
  body: unknown,
  method = "POST",
): NextRequest {
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const VALID_HOLDING = {
  symbol: "AAPL",
  shares: 10,
  costBasis: 150,
  currentPrice: 175,
  sector: "Technology",
  assetClass: "stock",
};

const ANALYZE_URL =
  "http://localhost:3000/api/investments/portfolio/analyze";

describe("negative-auth – /api/investments/portfolio/analyze", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await GET(createUnauthRequest(ANALYZE_URL));
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await POST(createUnauthRequest(ANALYZE_URL, "POST"));
    expect(res.status).toBe(401);
  });
});

describe("per-element validation – POST /api/investments/portfolio/analyze (TASK-INV-03 / FND-033)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: AUTHENTICATED_USER,
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("returns 400 when a holding is missing the required symbol field", async () => {
    const body = {
      holdings: [{ shares: 10, costBasis: 150, currentPrice: 175 }],
    };
    const req = createAuthRequest(ANALYZE_URL, body);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
    expect(typeof json.error).toBe("string");
  });

  it("returns 400 when a holding has negative shares", async () => {
    const body = {
      holdings: [{ ...VALID_HOLDING, shares: -5 }],
    };
    const req = createAuthRequest(ANALYZE_URL, body);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("returns 400 when a holding has non-numeric shares (string)", async () => {
    const body = {
      holdings: [{ ...VALID_HOLDING, shares: "lots" }],
    };
    const req = createAuthRequest(ANALYZE_URL, body);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("returns 400 when the holdings array exceeds the length cap", async () => {
    const holdings = Array.from({ length: 501 }, (_, i) => ({
      ...VALID_HOLDING,
      symbol: `SYM${i}`,
    }));
    const body = { holdings };
    const req = createAuthRequest(ANALYZE_URL, body);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("returns 200 for a fully valid body", async () => {
    const body = { holdings: [VALID_HOLDING] };
    const req = createAuthRequest(ANALYZE_URL, body);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("does not leak Zod internals (no 'ZodError' or issue paths) on invalid input", async () => {
    const body = {
      holdings: [{ shares: "bad", costBasis: 150, currentPrice: 175 }],
    };
    const req = createAuthRequest(ANALYZE_URL, body);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain("ZodError");
    expect(serialized).not.toContain('"issues"');
    // The response must have only a plain error string, not nested Zod structure
    expect(typeof json.error).toBe("string");
    expect(Object.keys(json)).toEqual(["error"]);
  });
});
