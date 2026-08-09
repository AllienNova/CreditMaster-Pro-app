/**
 * Tests for /api/financial/spending/insights
 *
 * Coverage:
 * - GET endpoint (AI-powered spending insights)
 * - Middleware auth flow
 * - Query parameter validation (type, priority)
 * - Priority filtering
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

const mockInsightsResult = {
  insights: [
    { id: "i1", type: "patterns", priority: "high", message: "High spend on dining" },
    { id: "i2", type: "trends", priority: "medium", message: "Grocery costs rising" },
    { id: "i3", type: "anomalies", priority: "low", message: "Small unusual charge" },
  ],
  summary: { totalInsights: 3 },
};

const mockAnalyzer = {
  generateInsights: jest.fn().mockResolvedValue(mockInsightsResult),
};

describe("GET /api/financial/spending/insights", () => {
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
    mockAnalyzer.generateInsights.mockResolvedValue(mockInsightsResult);
  });

  it("should return insights with default params", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/insights",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.insights).toHaveLength(3);
    expect(mockAnalyzer.generateInsights).toHaveBeenCalledWith("user-123", "all");
  });

  it("should respect type query parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/insights?type=patterns",
    );
    await GET(request);

    expect(mockAnalyzer.generateInsights).toHaveBeenCalledWith("user-123", "patterns");
  });

  it("should filter insights by priority", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/insights?priority=high",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.insights).toHaveLength(1);
    expect(data.data.insights[0].priority).toBe("high");
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
        "http://localhost:3000/api/financial/spending/insights",
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  it("should return 500 on analyzer error", async () => {
    mockAnalyzer.generateInsights.mockRejectedValue(new Error("Insights failed"));

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/insights",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });

  it("should include meta information in response", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/insights?type=trends&priority=medium",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toBeDefined();
    expect(data.meta.userId).toBe("user-123");
    expect(data.meta.type).toBe("trends");
    expect(data.meta.priority).toBe("medium");
  });
});
