/**
 * Tests for /api/financial/spending
 *
 * Coverage:
 * - GET endpoint (spending analysis)
 * - Authentication / Authorization
 * - Query parameter handling
 * - Error handling
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

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

function createMockRequest(url: string, options?: { method?: string; body?: unknown }) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

describe("GET /api/financial/spending", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
  });

  it("should return spending analysis for authenticated user", async () => {
    const mockAnalysis = { totalSpent: 1500, categories: [] };
    (financialService.getSpendingAnalysis as jest.Mock).mockResolvedValue(mockAnalysis);

    const request = createMockRequest("http://localhost:3000/api/financial/spending");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockAnalysis);
    expect(financialService.getSpendingAnalysis).toHaveBeenCalledWith("user-123", 30);
  });

  it("should use custom days parameter", async () => {
    (financialService.getSpendingAnalysis as jest.Mock).mockResolvedValue({});

    const request = createMockRequest("http://localhost:3000/api/financial/spending?days=60");
    await GET(request);

    expect(financialService.getSpendingAnalysis).toHaveBeenCalledWith("user-123", 60);
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest("http://localhost:3000/api/financial/spending");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for user without permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);

      const request = createMockRequest("http://localhost:3000/api/financial/spending");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });
  });

  it("should return 500 on service error", async () => {
    (financialService.getSpendingAnalysis as jest.Mock).mockRejectedValue(
      new Error("DB down"),
    );

    const request = createMockRequest("http://localhost:3000/api/financial/spending");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch spending analysis");
  });
});
