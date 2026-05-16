/**
 * Tests for /api/financial/investments/ai-insights
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

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

describe("GET /api/financial/investments/ai-insights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/investments/ai-insights",
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for user without financial:read permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const request = createMockRequest(
      "http://localhost:3000/api/financial/investments/ai-insights",
    );
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return investment AI insights successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/investments/ai-insights",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.recommendations).toBeDefined();
    expect(data.data.recommendations.length).toBeGreaterThan(0);
    expect(data.data.riskAnalysis).toBeDefined();
    expect(data.data.riskAnalysis.riskScore).toBe(58);
    expect(data.data.diversificationSuggestions).toBeDefined();
    expect(data.data.marketPredictions).toBeDefined();
    expect(data.data.performanceForecasts).toBeDefined();
    expect(data.data.portfolioHealthScore).toBe(78);
    expect(data.data.aiInsights).toBeDefined();
  });

  it("should return recommendations with expected structure", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/investments/ai-insights",
    );
    const response = await GET(request);
    const data = await response.json();
    const rec = data.data.recommendations[0];
    expect(rec).toHaveProperty("id");
    expect(rec).toHaveProperty("symbol");
    expect(rec).toHaveProperty("type");
    expect(rec).toHaveProperty("confidence");
    expect(rec).toHaveProperty("targetPrice");
    expect(rec).toHaveProperty("riskLevel");
  });

  it("should return 500 on unexpected error", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockRejectedValue(
      new Error("Service unavailable"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/investments/ai-insights",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
