/**
 * Tests for /api/financial/budgets/summary
 *
 * Coverage:
 * - GET endpoint (budget summary)
 * - Authentication, Authorization, Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/budget-service");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { budgetService } from "@/lib/financial/budget-service";

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

const mockSummary = {
  totalBudgeted: 5000,
  totalSpent: 3200,
  totalRemaining: 1800,
  categories: [
    { category: "housing", budgeted: 1500, spent: 1500, remaining: 0 },
    { category: "groceries", budgeted: 500, spent: 400, remaining: 100 },
    { category: "dining", budgeted: 300, spent: 350, remaining: -50 },
  ],
};

describe("GET /api/financial/budgets/summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.getBudgetSummary as jest.Mock).mockResolvedValue(mockSummary);
  });

  it("should return budget summary for authenticated user", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/summary");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockSummary);
    expect(budgetService.getBudgetSummary).toHaveBeenCalledWith("user-123");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/summary");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/summary");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 500 on service error", async () => {
    (budgetService.getBudgetSummary as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/summary");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch budget summary");
  });
});
