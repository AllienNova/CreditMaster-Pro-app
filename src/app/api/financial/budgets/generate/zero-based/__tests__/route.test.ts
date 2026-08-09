/**
 * Tests for /api/financial/budgets/generate/zero-based
 *
 * Coverage:
 * - POST endpoint (zero-based budget generation)
 * - Auth via withPermission (401 / 403), Zod validation (400), engine wiring,
 *   and error handling (500). Mirrors the sibling /generate + /summary route
 *   test setup (mock jwt-validation + resolve-role + rbac + the engine).
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/smart-budget-engine");

import { POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { getSmartBudgetEngine } from "@/lib/financial/smart-budget-engine";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(
  url: string,
  options?: { method?: string; body?: unknown },
) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "POST",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const ENDPOINT =
  "http://localhost:3000/api/financial/budgets/generate/zero-based";

const validPriorities = {
  essentials: 50,
  debtPayoff: 10,
  savings: 20,
  lifestyle: 20,
};

const mockResult = {
  budget: {
    id: "zbb-1",
    userId: "user-123",
    name: "Zero-Based Budget - July 2026",
    period: "monthly",
    totalAmount: 5000,
    categories: [
      {
        id: "c1",
        budgetId: "",
        name: "housing",
        type: "ESSENTIAL",
        allocatedAmount: 1500,
        spentAmount: 0,
        remainingAmount: 1500,
        percentUsed: 0,
        alerts: [],
        rules: [],
      },
    ],
    rules: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    aiGenerated: false,
    confidence: 90,
  },
  unallocated: 0,
  allocationBreakdown: [
    { category: "housing", amount: 1500, percentOfIncome: 30, priority: "essential" },
  ],
};

const mockEngine = {
  generateZeroBasedBudget: jest.fn().mockResolvedValue(mockResult),
};

describe("POST /api/financial/budgets/generate/zero-based", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEngine.generateZeroBasedBudget.mockResolvedValue(mockResult);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (getSmartBudgetEngine as jest.Mock).mockReturnValue(mockEngine);
  });

  it("generates a zero-based budget for a valid request", async () => {
    const req = createMockRequest(ENDPOINT, {
      method: "POST",
      body: { monthlyIncome: 5000, priorities: validPriorities },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockResult);
    expect(mockEngine.generateZeroBasedBudget).toHaveBeenCalledWith(
      "user-123",
      5000,
      validPriorities,
    );
  });

  it("returns 400 when monthlyIncome is missing", async () => {
    const req = createMockRequest(ENDPOINT, {
      method: "POST",
      body: { priorities: validPriorities },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request data");
    expect(mockEngine.generateZeroBasedBudget).not.toHaveBeenCalled();
  });

  it("returns 400 when monthlyIncome is negative", async () => {
    const req = createMockRequest(ENDPOINT, {
      method: "POST",
      body: { monthlyIncome: -100, priorities: validPriorities },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mockEngine.generateZeroBasedBudget).not.toHaveBeenCalled();
  });

  it("returns 400 when priorities do not sum to 100", async () => {
    const req = createMockRequest(ENDPOINT, {
      method: "POST",
      body: {
        monthlyIncome: 5000,
        priorities: { essentials: 50, debtPayoff: 10, savings: 20, lifestyle: 10 },
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request data");
    expect(mockEngine.generateZeroBasedBudget).not.toHaveBeenCalled();
  });

  describe("negative-auth", () => {
    it("returns 401 for an unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const req = createMockRequest(ENDPOINT, {
        method: "POST",
        body: { monthlyIncome: 5000, priorities: validPriorities },
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 for a user without permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const req = createMockRequest(ENDPOINT, {
        method: "POST",
        body: { monthlyIncome: 5000, priorities: validPriorities },
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });
  });

  it("returns 500 when the engine throws", async () => {
    mockEngine.generateZeroBasedBudget.mockRejectedValue(new Error("Engine boom"));
    const req = createMockRequest(ENDPOINT, {
      method: "POST",
      body: { monthlyIncome: 5000, priorities: validPriorities },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to generate zero-based budget");
  });
});
