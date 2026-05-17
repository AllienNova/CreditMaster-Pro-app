/**
 * Tests for /api/financial/dashboard
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/financial-service");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { financialService } from "@/lib/financial/financial-service";

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

const mockDashboard = {
  netWorth: 50000,
  totalAssets: 75000,
  totalLiabilities: 25000,
  monthlyIncome: 5000,
  monthlyExpenses: 3500,
};

describe("GET /api/financial/dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (financialService.getFinancialDashboard as jest.Mock).mockResolvedValue(mockDashboard);
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest("http://localhost:3000/api/financial/dashboard");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest("http://localhost:3000/api/financial/dashboard");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  it("should return dashboard data successfully", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/dashboard");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockDashboard);
    expect(financialService.getFinancialDashboard).toHaveBeenCalledWith("user-123");
  });

  it("should return 500 on service error", async () => {
    (financialService.getFinancialDashboard as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );
    const request = createMockRequest("http://localhost:3000/api/financial/dashboard");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch financial dashboard");
  });
});
