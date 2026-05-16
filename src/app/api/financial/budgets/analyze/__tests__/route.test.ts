/**
 * Tests for /api/financial/budgets/analyze
 *
 * Coverage:
 * - GET endpoint (budget vs actual analysis)
 * - Middleware + JWT + RBAC auth, validation, error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/api/financial-api-middleware");
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/smart-budget-engine");

import { GET } from "../route";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { getSmartBudgetEngine } from "@/lib/financial/smart-budget-engine";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

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

const mockAnalysis = {
  totalBudgeted: 3000,
  totalSpent: 2800,
  variance: 200,
  categories: [
    { category: "groceries", budgeted: 500, spent: 450, variance: 50 },
    { category: "dining", budgeted: 300, spent: 400, variance: -100 },
  ],
};

const mockSmartBudgetEngine = {
  analyzeBudgetVsActual: jest.fn().mockResolvedValue(mockAnalysis),
};

describe("GET /api/financial/budgets/analyze", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    // Re-set nested mock implementations (resetMocks: true strips them)
    mockSmartBudgetEngine.analyzeBudgetVsActual.mockResolvedValue(mockAnalysis);
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (getSmartBudgetEngine as jest.Mock).mockReturnValue(mockSmartBudgetEngine);
  });

  it("should return analysis with default monthly period", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/analyze");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data._meta.period).toBe("monthly");
    expect(mockSmartBudgetEngine.analyzeBudgetVsActual).toHaveBeenCalledWith("user-123", "monthly");
  });

  it("should accept valid period parameter", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/analyze?period=weekly");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockSmartBudgetEngine.analyzeBudgetVsActual).toHaveBeenCalledWith("user-123", "weekly");
  });

  it("should return 400 for invalid period", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/analyze?period=daily");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid period");
    expect(data.validPeriods).toBeDefined();
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = { status: 401, json: async () => ({ error: "Unauthorized" }) };
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({ error: errorResponse });

    const req = createMockRequest("http://localhost:3000/api/financial/budgets/analyze");
    const res = await GET(req);

    expect(res).toBe(errorResponse);
  });

  it("should return 401 when JWT validation fails", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/analyze");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/analyze");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("should return 500 on service error", async () => {
    mockSmartBudgetEngine.analyzeBudgetVsActual.mockRejectedValue(new Error("Engine error"));
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/analyze");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to analyze budget");
  });
});
