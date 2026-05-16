/**
 * Tests for /api/financial/budgets/generate
 *
 * Coverage:
 * - POST endpoint (AI-powered budget generation)
 * - Middleware + JWT + RBAC auth, Zod validation, error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/api/financial-api-middleware");
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/smart-budget-engine");

import { POST } from "../route";
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
    method: options?.method || "POST",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockBudget = {
  id: "budget-gen-1",
  categories: [
    { category: "housing", amount: 1500 },
    { category: "groceries", amount: 500 },
  ],
  totalAllocated: 4000,
  aiGenerated: true,
  confidence: 0.92,
};

const mockSmartBudgetEngine = {
  generateBudget: jest.fn().mockResolvedValue(mockBudget),
};

describe("POST /api/financial/budgets/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    // Re-set nested mock implementations (resetMocks: true strips them)
    mockSmartBudgetEngine.generateBudget.mockResolvedValue(mockBudget);
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (getSmartBudgetEngine as jest.Mock).mockReturnValue(mockSmartBudgetEngine);
  });

  it("should generate a budget successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/generate", {
      method: "POST",
      body: { monthlyIncome: 5000 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.message).toBe("Smart budget generated successfully");
    expect(mockSmartBudgetEngine.generateBudget).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ monthlyIncome: 5000 }),
    );
  });

  it("should accept optional preferences", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/generate", {
      method: "POST",
      body: {
        monthlyIncome: 5000,
        savingsGoalPercentage: 25,
        debtPaymentPriority: "aggressive",
        lifestylePreference: "frugal",
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(mockSmartBudgetEngine.generateBudget).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        monthlyIncome: 5000,
        savingsGoalPercentage: 25,
        debtPaymentPriority: "aggressive",
        lifestylePreference: "frugal",
      }),
    );
  });

  it("should return 400 for missing monthlyIncome", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/generate", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request data");
    expect(data.details).toBeDefined();
  });

  it("should return 400 for negative monthlyIncome", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/generate", {
      method: "POST",
      body: { monthlyIncome: -1000 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request data");
  });

  it("should return 400 for invalid savingsGoalPercentage", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/generate", {
      method: "POST",
      body: { monthlyIncome: 5000, savingsGoalPercentage: 150 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request data");
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = { status: 401, json: async () => ({ error: "Unauthorized" }) };
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({ error: errorResponse });

    const req = createMockRequest("http://localhost:3000/api/financial/budgets/generate", {
      method: "POST",
      body: { monthlyIncome: 5000 },
    });
    const res = await POST(req);

    expect(res).toBe(errorResponse);
  });

  it("should return 401 when JWT validation fails", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/generate", {
      method: "POST",
      body: { monthlyIncome: 5000 },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/generate", {
      method: "POST",
      body: { monthlyIncome: 5000 },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should return 500 on service error", async () => {
    mockSmartBudgetEngine.generateBudget.mockRejectedValue(new Error("Engine error"));
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/generate", {
      method: "POST",
      body: { monthlyIncome: 5000 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to generate smart budget");
  });
});
