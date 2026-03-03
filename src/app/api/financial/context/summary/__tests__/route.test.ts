/**
 * Tests for /api/financial/context/summary
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/financial-context-engine");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { financialContextEngine } from "@/lib/financial/financial-context-engine";

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

const mockSummary = {
  netWorth: 50000,
  totalAssets: 75000,
  totalLiabilities: 25000,
  monthlyIncome: 5000,
  monthlyExpenses: 3500,
  monthlySavings: 1500,
  savingsRate: 30,
  totalDebt: 25000,
  debtToIncomeRatio: 25,
  creditScore: 720,
  healthScore: 78,
  healthGrade: "C",
  activeGoals: 3,
  goalProgress: 45,
};

describe("GET /api/financial/context/summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (
      financialContextEngine.getFinancialSummary as jest.Mock
    ).mockResolvedValue(mockSummary);
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context/summary",
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for user without financial:read permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context/summary",
    );
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return financial summary successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context/summary",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockSummary);
    expect(financialContextEngine.getFinancialSummary).toHaveBeenCalledWith(
      "user-123",
    );
  });

  it("should return 500 on service error", async () => {
    (
      financialContextEngine.getFinancialSummary as jest.Mock
    ).mockRejectedValue(new Error("Database error"));
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context/summary",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
