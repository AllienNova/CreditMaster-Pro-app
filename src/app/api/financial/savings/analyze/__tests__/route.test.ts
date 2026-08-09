/**
 * Tests for /api/financial/savings/analyze
 *
 * Coverage:
 * - GET endpoint (savings analysis)
 * - Dual auth: middleware + JWT + RBAC
 * - Query parameter validation (period)
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

const mockAnalysis = {
  opportunities: [{ id: "o1", name: "Reduce dining", amount: 200 }],
  recurringCharges: [{ id: "c1", merchant: "Netflix", amount: 15 }],
  summary: {
    potentialMonthlySavings: 200,
    potentialAnnualSavings: 2400,
  },
};

const mockOptimizer = {
  analyzeSpendingForSavings: jest.fn().mockResolvedValue(mockAnalysis),
};

describe("GET /api/financial/savings/analyze", () => {
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
    mockOptimizer.analyzeSpendingForSavings.mockResolvedValue(mockAnalysis);
  });

  it("should return savings analysis with default period", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/analyze",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockAnalysis);
    expect(mockOptimizer.analyzeSpendingForSavings).toHaveBeenCalledWith(
      "user-123",
      "monthly",
    );
  });

  it("should respect period query parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/analyze?period=quarterly",
    );
    await GET(request);

    expect(mockOptimizer.analyzeSpendingForSavings).toHaveBeenCalledWith(
      "user-123",
      "quarterly",
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
        "http://localhost:3000/api/financial/savings/analyze",
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
        "http://localhost:3000/api/financial/savings/analyze",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 403 for user without permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);

      const request = createMockRequest(
        "http://localhost:3000/api/financial/savings/analyze",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });
  });

  it("should return 400 for invalid period", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/analyze?period=invalid",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid query parameters");
  });

  it("should return 500 on optimizer error", async () => {
    mockOptimizer.analyzeSpendingForSavings.mockRejectedValue(
      new Error("Analysis failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/analyze",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to analyze spending for savings");
  });

  it("should include meta information in response", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/analyze?period=yearly",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data._meta).toBeDefined();
    expect(data._meta.period).toBe("yearly");
    expect(data._meta.opportunitiesFound).toBe(1);
    expect(data._meta.recurringChargesFound).toBe(1);
  });
});
