/**
 * Tests for /api/financial/budgets/adjust
 *
 * Coverage:
 * - GET endpoint (AI-powered budget adjustment suggestions)
 * - Middleware + JWT + RBAC auth, Error handling
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

const mockSuggestions = [
  { category: "dining", currentAmount: 500, suggestedAmount: 400, reason: "Overspending" },
  { category: "groceries", currentAmount: 300, suggestedAmount: 350, reason: "Underfunded" },
];

const mockSmartBudgetEngine = {
  suggestCategoryAdjustments: jest.fn().mockResolvedValue(mockSuggestions),
};

describe("GET /api/financial/budgets/adjust", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    // Re-set nested mock implementations (resetMocks: true strips them)
    mockSmartBudgetEngine.suggestCategoryAdjustments.mockResolvedValue(mockSuggestions);
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (getSmartBudgetEngine as jest.Mock).mockReturnValue(mockSmartBudgetEngine);
  });

  it("should return adjustment suggestions successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/adjust");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.count).toBe(2);
    expect(data._meta.aiPowered).toBe(true);
    expect(mockSmartBudgetEngine.suggestCategoryAdjustments).toHaveBeenCalledWith("user-123");
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = { status: 401, json: async () => ({ error: "Unauthorized" }) };
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({ error: errorResponse });

    const req = createMockRequest("http://localhost:3000/api/financial/budgets/adjust");
    const res = await GET(req);

    expect(res).toBe(errorResponse);
  });

  it("should return 401 when JWT validation fails", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/adjust");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/adjust");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 500 on service error", async () => {
    mockSmartBudgetEngine.suggestCategoryAdjustments.mockRejectedValue(new Error("Engine error"));
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/adjust");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to get budget adjustment suggestions");
  });
});
