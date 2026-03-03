/**
 * Tests for /api/financial/savings/recommendations
 *
 * Coverage:
 * - GET endpoint (savings recommendations)
 * - Dual auth: middleware + JWT + RBAC
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/api/financial-api-middleware");
jest.mock("@/lib/financial/savings-optimizer");
jest.mock("@/lib/auth/jwt-validation");
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

const mockPotentialSavings = {
  totalMonthlySavings: 350,
  totalAnnualSavings: 4200,
  topOpportunities: [
    { name: "Reduce dining", amount: 200 },
    { name: "Cancel unused subscriptions", amount: 150 },
  ],
  breakdown: { dining: 200, subscriptions: 150 },
  implementationDifficulty: "moderate",
  estimatedTimeToImplement: "2 weeks",
};

const mockOptimizer = {
  calculatePotentialSavings: jest.fn().mockResolvedValue(mockPotentialSavings),
};

describe("GET /api/financial/savings/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    mockOptimizer.calculatePotentialSavings.mockResolvedValue(mockPotentialSavings);
  });

  it("should return savings recommendations", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/recommendations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.potentialSavings).toEqual(mockPotentialSavings);
    expect(data.data.topOpportunities).toEqual(mockPotentialSavings.topOpportunities);
    expect(data.data.breakdown).toEqual(mockPotentialSavings.breakdown);
    expect(data.data.implementation.difficulty).toBe("moderate");
    expect(mockOptimizer.calculatePotentialSavings).toHaveBeenCalledWith("user-123");
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      error: errorResponse,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/recommendations",
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
      "http://localhost:3000/api/financial/savings/recommendations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/recommendations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 500 on optimizer error", async () => {
    mockOptimizer.calculatePotentialSavings.mockRejectedValue(
      new Error("Recommendations failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/recommendations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to generate savings recommendations");
  });

  it("should include meta information in response", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/recommendations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data._meta).toBeDefined();
    expect(data._meta.totalMonthlySavings).toBe(350);
    expect(data._meta.totalAnnualSavings).toBe(4200);
  });
});
