/**
 * Tests for /api/financial/savings/goal-recommendations
 *
 * Coverage:
 * - GET endpoint (AI-powered savings goal recommendations)
 * - Dual auth: middleware + JWT + RBAC
 * - Query parameter validation (targetAmount)
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/api/financial-api-middleware");
jest.mock("@/lib/financial/savings-optimizer");
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
import { getSavingsOptimizer } from "@/lib/financial/savings-optimizer";
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

const mockRecommendations = [
  { id: "r1", name: "Emergency Fund", targetAmount: 10000, aiGenerated: true },
  { id: "r2", name: "Vacation", targetAmount: 3000, aiGenerated: false },
];

const mockOptimizer = {
  generateSavingsGoalRecommendations: jest.fn().mockResolvedValue(mockRecommendations),
};

describe("GET /api/financial/savings/goal-recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (getSavingsOptimizer as jest.Mock).mockReturnValue(mockOptimizer);
    mockOptimizer.generateSavingsGoalRecommendations.mockResolvedValue(mockRecommendations);
  });

  it("should return goal recommendations without targetAmount", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goal-recommendations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockRecommendations);
    // When no targetAmount query param, z.coerce.number().optional() coerces null to 0
    expect(mockOptimizer.generateSavingsGoalRecommendations).toHaveBeenCalledWith(
      "user-123",
      0,
    );
  });

  it("should respect targetAmount query parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goal-recommendations?targetAmount=5000",
    );
    await GET(request);

    expect(mockOptimizer.generateSavingsGoalRecommendations).toHaveBeenCalledWith(
      "user-123",
      5000,
    );
  });

  it("should include meta information in response", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goal-recommendations?targetAmount=5000",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data._meta).toBeDefined();
    expect(data._meta.recommendationsCount).toBe(2);
    expect(data._meta.targetAmount).toBe(5000);
    expect(data._meta.aiGenerated).toBe(true); // at least one recommendation is AI-generated
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      error: errorResponse,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goal-recommendations",
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should return 401 for invalid JWT", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goal-recommendations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goal-recommendations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 500 on optimizer error", async () => {
    mockOptimizer.generateSavingsGoalRecommendations.mockRejectedValue(
      new Error("Recommendations failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goal-recommendations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to generate savings goal recommendations");
  });
});
