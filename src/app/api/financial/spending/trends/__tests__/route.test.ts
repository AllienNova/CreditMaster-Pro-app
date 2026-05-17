/**
 * Tests for /api/financial/spending/trends
 *
 * Coverage:
 * - GET endpoint (spending trends)
 * - Middleware auth flow
 * - Query parameter validation (period, categories, compareWith)
 * - Categories comma-separated parsing
 * - Error handling
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
jest.mock("@/lib/api/financial-api-middleware");
jest.mock("@/lib/financial/spending-analyzer");
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
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

const mockTrends = {
  overall: { direction: "increasing", percentage: 5.2 },
  categoryTrends: [],
  forecast: [],
};

const mockAnalyzer = {
  getSpendingTrends: jest.fn().mockResolvedValue(mockTrends),
};

describe("GET /api/financial/spending/trends", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-123", email: "test@example.com" },
    });
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (getSpendingAnalyzer as jest.Mock).mockReturnValue(mockAnalyzer);
    mockAnalyzer.getSpendingTrends.mockResolvedValue(mockTrends);
  });

  it("should return trends with default params", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/trends",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockTrends);
    expect(mockAnalyzer.getSpendingTrends).toHaveBeenCalledWith(
      "user-123",
      "3m",
      undefined,
    );
  });

  it("should respect period and categories query parameters", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/trends?period=6m&categories=food,transport,housing",
    );
    await GET(request);

    expect(mockAnalyzer.getSpendingTrends).toHaveBeenCalledWith(
      "user-123",
      "6m",
      ["food", "transport", "housing"],
    );
  });

  describe("negative-auth", () => {
    it("should return middleware error when auth fails", async () => {
      const errorResponse = new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
      (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
        error: errorResponse,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/spending/trends",
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  it("should return 500 on analyzer error", async () => {
    mockAnalyzer.getSpendingTrends.mockRejectedValue(new Error("Trends failed"));

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/trends",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });

  it("should include meta information in response", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/trends?period=1y&compareWith=average",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toBeDefined();
    expect(data.meta.userId).toBe("user-123");
    expect(data.meta.period).toBe("1y");
    expect(data.meta.compareWith).toBe("average");
  });
});
