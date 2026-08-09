/**
 * Tests for /api/financial/debt (MOK-03 / TASK-FIN-5)
 *
 * DELIBERATE SPEC CHANGE: the previous test encoded the mock's shape
 * (5 hardcoded debts, "Chase Sapphire", etc.). That test validated the mock,
 * not the real contract. This rewrite asserts the real contract:
 *   - GET returns the result of debtService.listDebts(user.id)
 *   - POST persists via debtService.createDebt(user.id, validatedBody)
 *   - debtService is mocked at the service layer, not at the DB layer
 *
 * Coverage:
 * - GET: returns persistence-layer result; forwards to debtPayoffService
 * - GET: query params (strategy, extraPayment, compare)
 * - POST: persists and returns the created debt
 * - POST: returns 400 on validation failure (missing/invalid fields)
 * - 401 on unauthenticated request (GET + POST)
 * - 500 on service error (GET + POST)
 */

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks (must be declared before import of the module under test)
// ---------------------------------------------------------------------------
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/financial/debt-payoff-service");

// Partial mock: preserve the real debtInputSchema so Zod validation runs in
// the route, but replace the debtService singleton with jest.fn() stubs.
jest.mock("@/lib/financial/debt-service", () => {
  const actual = jest.requireActual<typeof import("@/lib/financial/debt-service")>(
    "@/lib/financial/debt-service",
  );
  return {
    ...actual,
    debtService: {
      listDebts: jest.fn(),
      createDebt: jest.fn(),
      updateDebt: jest.fn(),
      deleteDebt: jest.fn(),
    },
  };
});

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { debtPayoffService } from "@/lib/financial/debt-payoff-service";
import { debtService } from "@/lib/financial/debt-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

function createMockRequest(
  url: string,
  options?: { method?: string; body?: unknown },
) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// Test fixtures (persistence-layer shapes, not mock hardcodes)
// ---------------------------------------------------------------------------

const persistedDebt = {
  id: "debt-uuid-1",
  userId: "user-123",
  name: "My Card",
  type: "credit_card",
  balance: 3000,
  originalBalance: 3000,
  interestRate: 18.99,
  minimumPayment: 90,
  dueDate: "2025-02-15",
  creditorName: "Amex",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockOverview = {
  totalDebt: 3000,
  totalMinimumPayments: 90,
  highestInterestRate: 18.99,
  debtToIncomeRatio: 0.6,
};

const mockPayoffPlan = {
  strategy: "avalanche",
  totalMonths: 36,
  totalInterestPaid: 1200,
  monthlyPayment: 120,
  schedule: [],
};

const mockComparison = {
  avalanche: mockPayoffPlan,
  snowball: { ...mockPayoffPlan, strategy: "snowball" },
};

const mockMilestones = [{ month: 36, description: "My Card paid off" }];
const mockInsights = [{ type: "tip", message: "Keep paying extra" }];

// ---------------------------------------------------------------------------
// GET /api/financial/debt
// ---------------------------------------------------------------------------

describe("GET /api/financial/debt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (debtService.listDebts as jest.Mock).mockResolvedValue([persistedDebt]);
    (debtPayoffService.calculateOverview as jest.Mock).mockReturnValue(mockOverview);
    (debtPayoffService.calculatePayoffPlan as jest.Mock).mockReturnValue(mockPayoffPlan);
    (debtPayoffService.compareStrategies as jest.Mock).mockReturnValue(mockComparison);
    (debtPayoffService.generateMilestones as jest.Mock).mockReturnValue(mockMilestones);
    (debtPayoffService.generateInsights as jest.Mock).mockReturnValue(mockInsights);
  });

  it("returns persistence-layer debts (not a hardcoded mock)", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/debt");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(debtService.listDebts).toHaveBeenCalledWith("user-123");
    expect(data.data.debts).toEqual([persistedDebt]);
    expect(data.data.overview).toEqual(mockOverview);
    expect(data.data.currentPlan).toEqual(mockPayoffPlan);
    expect(data.data.milestones).toEqual(mockMilestones);
    expect(data.data.insights).toEqual(mockInsights);
    expect(data.data.comparison).toBeUndefined();
  });

  it("passes strategy and extraPayment to calculatePayoffPlan", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt?strategy=snowball&extraPayment=200",
    );
    await GET(request);

    expect(debtPayoffService.calculatePayoffPlan).toHaveBeenCalledWith(
      [persistedDebt],
      "snowball",
      200,
    );
  });

  it("includes comparison when compare=true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt?compare=true",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.comparison).toEqual(mockComparison);
    expect(debtPayoffService.compareStrategies).toHaveBeenCalledWith(
      [persistedDebt],
      0,
    );
  });

  it("omits comparison when compare is not true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt?compare=false",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.comparison).toBeUndefined();
    expect(debtPayoffService.compareStrategies).not.toHaveBeenCalled();
  });

  describe("negative-auth", () => {
    it("returns 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest("http://localhost:3000/api/financial/debt");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("returns 500 when debtService.listDebts throws", async () => {
    (debtService.listDebts as jest.Mock).mockRejectedValue(new Error("DB error"));
    const request = createMockRequest("http://localhost:3000/api/financial/debt");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch debt data");
  });
});

// ---------------------------------------------------------------------------
// POST /api/financial/debt
// ---------------------------------------------------------------------------

describe("POST /api/financial/debt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (debtService.createDebt as jest.Mock).mockResolvedValue(persistedDebt);
  });

  it("persists via debtService.createDebt and returns the new debt", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/debt", {
      method: "POST",
      body: {
        name: "My Card",
        type: "credit_card",
        balance: 3000,
        interestRate: 18.99,
        minimumPayment: 90,
        dueDate: "2025-02-15",
        creditorName: "Amex",
      },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(debtService.createDebt).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ name: "My Card", balance: 3000 }),
    );
    expect(data.data).toEqual(persistedDebt);
  });

  it("returns 400 when required fields fail Zod validation", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/debt", {
      method: "POST",
      body: {
        name: "Partial",
        type: "credit_card",
        // missing balance, interestRate, minimumPayment
      },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
    expect(debtService.createDebt).not.toHaveBeenCalled();
  });

  it("returns 400 when balance is negative", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/debt", {
      method: "POST",
      body: {
        name: "Bad",
        type: "credit_card",
        balance: -100,
        interestRate: 18,
        minimumPayment: 30,
      },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  describe("negative-auth", () => {
    it("returns 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest("http://localhost:3000/api/financial/debt", {
        method: "POST",
        body: {
          name: "Test",
          type: "credit_card",
          balance: 1000,
          interestRate: 15,
          minimumPayment: 30,
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("returns 500 on unexpected error (e.g. json parse failure)", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/debt", {
      method: "POST",
      body: null,
    });
    (request.json as jest.Mock).mockRejectedValue(new Error("Parse error"));
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create debt");
  });
});
