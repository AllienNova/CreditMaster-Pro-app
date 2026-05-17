/**
 * Tests for /api/financial/aggregated
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/financial-aggregation-service");

import { GET, DELETE } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { financialAggregationService } from "@/lib/financial/financial-aggregation-service";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(url: string, method = "GET") {
  const parsedUrl = new URL(url);
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockAggregatedContext = {
  accounts: { total: 3, totalBalance: 50000 },
  budgets: { active: 2 },
  lastUpdated: new Date("2026-01-15T10:00:00Z"),
};

const mockSnapshot = {
  netWorth: 50000,
  totalAssets: 75000,
  totalLiabilities: 25000,
  timestamp: new Date("2026-01-15T10:00:00Z"),
};

const mockTrends = {
  netWorthTrend: [{ date: "2026-01-01", value: 48000 }],
  period: "30d",
};

describe("GET /api/financial/aggregated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (
      financialAggregationService.getAggregatedContext as jest.Mock
    ).mockResolvedValue(mockAggregatedContext);
    (
      financialAggregationService.getFinancialSnapshot as jest.Mock
    ).mockResolvedValue(mockSnapshot);
    (
      financialAggregationService.getFinancialTrends as jest.Mock
    ).mockResolvedValue(mockTrends);
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/financial/aggregated",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without financial:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest(
        "http://localhost:3000/api/financial/aggregated",
      );
      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  it("should return aggregated context successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/aggregated",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.context).toBeDefined();
    expect(
      financialAggregationService.getAggregatedContext,
    ).toHaveBeenCalledWith("user-123", { forceRefresh: false });
  });

  it("should include snapshot when snapshot=true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/aggregated?snapshot=true",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.data.snapshot).toBeDefined();
    expect(
      financialAggregationService.getFinancialSnapshot,
    ).toHaveBeenCalledWith("user-123");
  });

  it("should include trends when trends=true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/aggregated?trends=true&dateRange=90d",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.data.trends).toBeDefined();
    expect(
      financialAggregationService.getFinancialTrends,
    ).toHaveBeenCalledWith("user-123", { period: "90d" });
  });

  it("should force refresh when refresh=true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/aggregated?refresh=true",
    );
    await GET(request);
    expect(
      financialAggregationService.getAggregatedContext,
    ).toHaveBeenCalledWith("user-123", { forceRefresh: true });
  });

  it("should return 500 on service error", async () => {
    (
      financialAggregationService.getAggregatedContext as jest.Mock
    ).mockRejectedValue(new Error("Aggregation error"));
    const request = createMockRequest(
      "http://localhost:3000/api/financial/aggregated",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/financial/aggregated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (financialAggregationService.clearCache as jest.Mock).mockReturnValue(
      undefined,
    );
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/financial/aggregated",
        "DELETE",
      );
      const response = await DELETE(request);
      expect(response.status).toBe(401);
    });
  });

  it("should clear cache successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/aggregated",
      "DELETE",
    );
    const response = await DELETE(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("Cache cleared");
    expect(financialAggregationService.clearCache).toHaveBeenCalledWith(
      "user-123",
    );
  });

  it("should return 500 on service error", async () => {
    (financialAggregationService.clearCache as jest.Mock).mockImplementation(
      () => {
        throw new Error("Cache clear error");
      },
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/aggregated",
      "DELETE",
    );
    const response = await DELETE(request);
    expect(response.status).toBe(500);
  });
});
