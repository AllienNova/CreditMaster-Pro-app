/**
 * Tests for /api/financial/credit/ai-insights
 */

import { NextRequest } from "next/server";

const mockResolveRoleFromDb = jest.fn();
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
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

describe("GET /api/financial/credit/ai-insights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveRoleFromDb.mockResolvedValue("premium");
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest("http://localhost:3000/api/financial/credit/ai-insights");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest("http://localhost:3000/api/financial/credit/ai-insights");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  it("should return credit AI insights successfully", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/credit/ai-insights");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.predictions).toBeDefined();
    expect(data.data.factorAnalysis).toBeDefined();
    expect(data.data.improvementOpportunities).toBeDefined();
    expect(data.data.alerts).toBeDefined();
    expect(data.data.overallHealthScore).toBeDefined();
    expect(data._meta.generatedAt).toBeDefined();
  });

  it("should return predictions with expected structure", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/credit/ai-insights");
    const response = await GET(request);
    const data = await response.json();
    const prediction = data.data.predictions[0];
    expect(prediction).toHaveProperty("timeframe");
    expect(prediction).toHaveProperty("predictedScore");
    expect(prediction).toHaveProperty("confidence");
  });

  it("should return fallback data on error instead of 500", async () => {
    // This route returns fallback data on error rather than 500
    mockResolveRoleFromDb.mockRejectedValue(
        new Error("Role resolution failed"),
      );
    const request = createMockRequest("http://localhost:3000/api/financial/credit/ai-insights");
    const response = await GET(request);
    // TASK-AUTH-03c: withAuth guard fails closed with 503 when role resolution fails.
    expect(response.status).toBe(503);
  });
});
