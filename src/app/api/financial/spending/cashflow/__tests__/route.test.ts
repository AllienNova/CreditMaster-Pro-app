/**
 * Tests for /api/financial/spending/cashflow
 *
 * Coverage:
 * - GET endpoint (cash flow analysis)
 * - JWT-only authentication (no rbac)
 * - Query parameter validation (months 1-24)
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/financial/spending-analysis-service");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { spendingAnalysisService } from "@/lib/financial/spending-analysis-service";

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

const mockCashFlow = {
  income: 5000,
  expenses: 3500,
  netCashFlow: 1500,
  months: [],
};

describe("GET /api/financial/spending/cashflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (spendingAnalysisService.getCashFlowAnalysis as jest.Mock).mockResolvedValue(
      mockCashFlow,
    );
  });

  it("should return cash flow analysis with default months", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/cashflow",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockCashFlow);
    expect(spendingAnalysisService.getCashFlowAnalysis).toHaveBeenCalledWith(
      "user-123",
      6,
    );
  });

  it("should respect custom months parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/cashflow?months=12",
    );
    await GET(request);

    expect(spendingAnalysisService.getCashFlowAnalysis).toHaveBeenCalledWith(
      "user-123",
      12,
    );
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/spending/cashflow",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 400 for months out of range (too high)", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/cashflow?months=25",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain("months must be between 1 and 24");
  });

  it("should return 400 for months out of range (too low)", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/cashflow?months=0",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain("months must be between 1 and 24");
  });

  it("should return 500 on service error", async () => {
    (spendingAnalysisService.getCashFlowAnalysis as jest.Mock).mockRejectedValue(
      new Error("Cash flow failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/cashflow",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe("Failed to fetch cash flow analysis");
  });
});
