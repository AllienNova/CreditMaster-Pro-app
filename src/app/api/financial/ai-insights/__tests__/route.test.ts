/**
 * Tests for /api/financial/ai-insights
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/smart-insights-engine");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { smartInsightsEngine } from "@/lib/financial/smart-insights-engine";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockInsightsResult = {
  insights: [
    {
      id: "ins-1",
      type: "savings_opportunity",
      title: "Reduce dining spending",
      description: "You spent 30% more on dining this month",
      priority: "high",
      actionUrl: "/budgets",
      actionLabel: "View Budgets",
    },
  ],
  generatedAt: "2026-01-15T10:00:00Z",
  processingTimeMs: 150,
};

describe("GET /api/financial/ai-insights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (smartInsightsEngine.generateInsights as jest.Mock).mockResolvedValue(
      mockInsightsResult,
    );
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/financial/ai-insights",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without financial:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest(
        "http://localhost:3000/api/financial/ai-insights",
      );
      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  it("should return AI insights panel data successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/ai-insights",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.insights).toBeDefined();
    expect(data.data.predictions).toBeDefined();
    expect(data.data.healthScore).toBeDefined();
    expect(data.data.healthTrend).toBeDefined();
    expect(data.data.topRecommendation).toBeDefined();
    expect(data._meta.generatedAt).toBeDefined();
  });

  it("should return fallback data on error instead of 500", async () => {
    // TASK-AUTH-03c: auth is now handled by the withAuth guard; a service
    // failure (not an auth failure) is what triggers the route's fallback.
    (smartInsightsEngine.generateInsights as jest.Mock).mockRejectedValue(
      new Error("Unexpected error"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/ai-insights",
    );
    const response = await GET(request);
    const data = await response.json();
    // This route returns fallback data on error
    expect(data.success).toBe(true);
    expect(data._meta.fallback).toBe(true);
    expect(data.data.insights).toEqual([]);
    expect(data.data.predictions).toEqual([]);
    expect(data.data.healthScore).toBe(0);
  });

  it("should include insight type mapping", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/ai-insights",
    );
    const response = await GET(request);
    const data = await response.json();
    // savings_opportunity should map to "opportunity"
    if (data.data.insights.length > 0) {
      expect(["opportunity", "warning", "tip", "prediction"]).toContain(
        data.data.insights[0].type,
      );
    }
  });
});
