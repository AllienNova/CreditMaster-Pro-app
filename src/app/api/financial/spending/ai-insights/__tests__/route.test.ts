/**
 * Tests for /api/financial/spending/ai-insights
 *
 * Coverage:
 * - GET endpoint (AI-powered spending insights)
 * - Authentication / Authorization
 * - Mock data response structure
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/rbac");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

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

describe("GET /api/financial/spending/ai-insights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
  });

  it("should return AI insights for authenticated user", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/ai-insights",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.anomalies).toBeDefined();
    expect(data.data.categoryInsights).toBeDefined();
    expect(data.data.reductionRecommendations).toBeDefined();
    expect(data.data.totalPotentialSavings).toBeDefined();
    expect(data.data.anomalyScore).toBeDefined();
  });

  it("should contain valid anomaly structure", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/ai-insights",
    );
    const response = await GET(request);
    const data = await response.json();

    const anomaly = data.data.anomalies[0];
    expect(anomaly).toHaveProperty("id");
    expect(anomaly).toHaveProperty("type");
    expect(anomaly).toHaveProperty("severity");
    expect(anomaly).toHaveProperty("amount");
    expect(anomaly).toHaveProperty("category");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/ai-insights",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/ai-insights",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });
});
