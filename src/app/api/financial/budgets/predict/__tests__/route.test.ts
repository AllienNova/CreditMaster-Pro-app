/**
 * Tests for /api/financial/budgets/predict
 *
 * Coverage:
 * - GET endpoint (predict month-end spending)
 * - Middleware + JWT + RBAC auth, error handling
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

const mockPrediction = {
  daysRemaining: 8,
  currentSpend: 2200,
  predictedTotal: 3100,
  predictions: {
    confidence: 0.87,
    categories: [
      { category: "groceries", predicted: 480, budget: 500 },
      { category: "dining", predicted: 350, budget: 300 },
    ],
  },
};

const mockSmartBudgetEngine = {
  predictMonthEnd: jest.fn().mockResolvedValue(mockPrediction),
};

describe("GET /api/financial/budgets/predict", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    // Re-set nested mock implementations (resetMocks: true strips them)
    mockSmartBudgetEngine.predictMonthEnd.mockResolvedValue(mockPrediction);
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (getSmartBudgetEngine as jest.Mock).mockReturnValue(mockSmartBudgetEngine);
  });

  it("should return prediction successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/predict");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.daysRemaining).toBe(8);
    expect(data.data.predictedTotal).toBe(3100);
    expect(data._meta.daysRemaining).toBe(8);
    expect(data._meta.confidence).toBe(0.87);
    expect(mockSmartBudgetEngine.predictMonthEnd).toHaveBeenCalledWith("user-123");
  });

  describe("negative-auth", () => {
    it("should return middleware error when auth fails", async () => {
      const errorResponse = { status: 401, json: async () => ({ error: "Unauthorized" }) };
      (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({ error: errorResponse });

      const req = createMockRequest("http://localhost:3000/api/financial/budgets/predict");
      const res = await GET(req);

      expect(res).toBe(errorResponse);
    });

    it("should return 401 when JWT validation fails", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
      const req = createMockRequest("http://localhost:3000/api/financial/budgets/predict");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 403 for user without permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const req = createMockRequest("http://localhost:3000/api/financial/budgets/predict");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  it("should return 500 on service error", async () => {
    mockSmartBudgetEngine.predictMonthEnd.mockRejectedValue(new Error("Engine error"));
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/predict");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to predict month-end spending");
  });
});
