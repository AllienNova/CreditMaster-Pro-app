/**
 * Tests for /api/financial/context
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/financial-context-engine");

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { financialContextEngine } from "@/lib/financial/financial-context-engine";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(url: string, method = "GET") {
  const parsedUrl = new URL(url);
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: parsedUrl,
    json: jest.fn(),
  } as unknown as NextRequest;
}

const mockContext = {
  accounts: {
    totalAssets: 75000,
    totalLiabilities: 25000,
    netWorth: 50000,
  },
  budgets: { active: 3, onTrack: 2, overBudget: 1 },
  goals: [{ id: "g1", name: "Emergency Fund", progress: 60 }],
  healthScore: 78,
  insights: [{ id: "i1", title: "Save more" }],
};

const mockEnhancedContext = {
  ...mockContext,
  bills: [],
  investments: [],
  creditProfile: {},
};

describe("GET /api/financial/context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (financialContextEngine.getFinancialContext as jest.Mock).mockResolvedValue(
      mockContext,
    );
    (
      financialContextEngine.getEnhancedFinancialContext as jest.Mock
    ).mockResolvedValue(mockEnhancedContext);
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context",
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for user without financial:read permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context",
    );
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return standard context data successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary.netWorth).toBe(50000);
    expect(data.data.accounts).toBeDefined();
    expect(data.data.healthScore).toBe(78);
    expect(data._meta.cached).toBe(true);
    expect(financialContextEngine.getFinancialContext).toHaveBeenCalledWith(
      "user-123",
      false,
    );
  });

  it("should return enhanced context when enhanced=true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context?enhanced=true",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data._meta.enhanced).toBe(true);
    expect(
      financialContextEngine.getEnhancedFinancialContext,
    ).toHaveBeenCalledWith("user-123", expect.objectContaining({
      forceRefresh: false,
      includeBills: true,
      includeInsights: true,
    }));
  });

  it("should force refresh when refresh=true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context?refresh=true",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(financialContextEngine.getFinancialContext).toHaveBeenCalledWith(
      "user-123",
      true,
    );
  });

  it("should return 500 on service error", async () => {
    (financialContextEngine.getFinancialContext as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});

describe("POST /api/financial/context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (financialContextEngine.clearCache as jest.Mock).mockReturnValue(undefined);
    (financialContextEngine.getFinancialContext as jest.Mock).mockResolvedValue(
      mockContext,
    );
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context",
      "POST",
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for user without financial:write permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context",
      "POST",
    );
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("should refresh context successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context",
      "POST",
    );
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("refreshed");
    expect(financialContextEngine.clearCache).toHaveBeenCalledWith("user-123");
    expect(financialContextEngine.getFinancialContext).toHaveBeenCalledWith(
      "user-123",
      true,
    );
  });

  it("should return 500 on service error", async () => {
    (financialContextEngine.clearCache as jest.Mock).mockImplementation(() => {
      throw new Error("Cache error");
    });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/context",
      "POST",
    );
    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
