/**
 * Tests for /api/financial/spending/analysis
 *
 * Coverage:
 * - GET endpoint (spending pattern analysis)
 * - Middleware auth flow
 * - Query parameter validation
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/api/financial-api-middleware");
jest.mock("@/lib/financial/spending-analyzer");
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");

import { GET } from "../route";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { getSpendingAnalyzer } from "@/lib/financial/spending-analyzer";

function createMockRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockAnalysis = {
  patterns: [],
  habits: [],
  velocity: { daily: 50 },
  triggers: [],
  healthScore: 75,
};

const mockAnalyzer = {
  analyzeSpendingPatterns: jest.fn().mockResolvedValue(mockAnalysis),
};

describe("GET /api/financial/spending/analysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (getSpendingAnalyzer as jest.Mock).mockReturnValue(mockAnalyzer);
    mockAnalyzer.analyzeSpendingPatterns.mockResolvedValue(mockAnalysis);
  });

  it("should return spending analysis with default params", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analysis",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockAnalysis);
    expect(mockAnalyzer.analyzeSpendingPatterns).toHaveBeenCalledWith(
      "user-123",
      "monthly",
    );
  });

  it("should respect period query parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analysis?period=weekly",
    );
    await GET(request);

    expect(mockAnalyzer.analyzeSpendingPatterns).toHaveBeenCalledWith(
      "user-123",
      "weekly",
    );
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      error: errorResponse,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analysis",
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should return 500 on analyzer error", async () => {
    mockAnalyzer.analyzeSpendingPatterns.mockRejectedValue(new Error("Analyzer failed"));

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analysis",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });

  it("should include meta information in response", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analysis?period=quarterly",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toBeDefined();
    expect(data.meta.userId).toBe("user-123");
    expect(data.meta.period).toBe("quarterly");
  });
});
