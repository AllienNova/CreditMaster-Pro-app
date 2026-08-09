/**
 * Tests for /api/financial/debt/calculate
 *
 * Coverage:
 * - POST endpoint (calculate payoff plan with custom parameters)
 * - JWT-only authentication (no rbac)
 * - Debts array validation (required, non-empty, each debt has required fields)
 * - compareAll flag behavior
 * - Default strategy and extraPayment
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/financial/debt-payoff-service");

import { POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { debtPayoffService } from "@/lib/financial/debt-payoff-service";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

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

const mockDebts = [
  {
    name: "Credit Card",
    balance: 5000,
    interestRate: 20,
    minimumPayment: 150,
  },
  {
    name: "Personal Loan",
    balance: 10000,
    interestRate: 10,
    minimumPayment: 250,
  },
];

const mockOverview = {
  totalDebt: 15000,
  totalMinimumPayments: 400,
  highestInterestRate: 20,
  debtToIncomeRatio: 0.15,
};

const mockPayoffPlan = {
  strategy: "avalanche",
  totalMonths: 24,
  totalInterestPaid: 3200,
  monthlyPayment: 650,
  schedule: [],
};

const mockSnowballPlan = {
  strategy: "snowball",
  totalMonths: 26,
  totalInterestPaid: 3600,
  monthlyPayment: 650,
  schedule: [],
};

const mockComparison: Record<string, typeof mockPayoffPlan> = {
  avalanche: mockPayoffPlan,
  snowball: mockSnowballPlan,
};

const mockMilestones = [
  { month: 12, description: "Credit Card paid off" },
];

const mockInsights = [
  { type: "tip", message: "You could save $400 in interest" },
];

describe("POST /api/financial/debt/calculate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (debtPayoffService.calculateOverview as jest.Mock).mockReturnValue(mockOverview);
    (debtPayoffService.calculatePayoffPlan as jest.Mock).mockReturnValue(mockPayoffPlan);
    (debtPayoffService.compareStrategies as jest.Mock).mockReturnValue(mockComparison);
    (debtPayoffService.generateMilestones as jest.Mock).mockReturnValue(mockMilestones);
    (debtPayoffService.generateInsights as jest.Mock).mockReturnValue(mockInsights);
  });

  it("should calculate payoff plan with default strategy", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt/calculate",
      {
        method: "POST",
        body: { debts: mockDebts },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.overview).toEqual(mockOverview);
    expect(data.data.currentPlan).toEqual(mockPayoffPlan);
    expect(data.data.milestones).toEqual(mockMilestones);
    expect(data.data.insights).toEqual(mockInsights);
    expect(data.data.comparison).toBeUndefined();
    expect(debtPayoffService.calculatePayoffPlan).toHaveBeenCalledWith(
      expect.any(Array),
      "avalanche",
      0,
    );
  });

  it("should use custom strategy and extraPayment", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt/calculate",
      {
        method: "POST",
        body: {
          debts: mockDebts,
          strategy: "snowball",
          extraPayment: 100,
        },
      },
    );
    await POST(request);

    expect(debtPayoffService.calculatePayoffPlan).toHaveBeenCalledWith(
      expect.any(Array),
      "snowball",
      100,
    );
  });

  it("should include comparison when compareAll=true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt/calculate",
      {
        method: "POST",
        body: {
          debts: mockDebts,
          compareAll: true,
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.comparison).toEqual(mockComparison);
    expect(data.data.currentPlan).toEqual(mockPayoffPlan);
    expect(debtPayoffService.compareStrategies).toHaveBeenCalledWith(
      expect.any(Array),
      0,
    );
  });

  it("should pass monthlyIncome to calculateOverview", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt/calculate",
      {
        method: "POST",
        body: {
          debts: mockDebts,
          monthlyIncome: 6000,
        },
      },
    );
    await POST(request);

    expect(debtPayoffService.calculateOverview).toHaveBeenCalledWith(
      expect.any(Array),
      6000,
    );
  });

  it("should return 400 when debts array is missing", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt/calculate",
      {
        method: "POST",
        body: {},
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Debts array is required");
  });

  it("should return 400 when debts array is empty", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt/calculate",
      {
        method: "POST",
        body: { debts: [] },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Debts array is required");
  });

  it("should return 400 when a debt is missing required fields", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt/calculate",
      {
        method: "POST",
        body: {
          debts: [{ name: "Incomplete Debt" }],
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Each debt must have");
  });

  it("should return 400 for invalid strategy when compareAll=true", async () => {
    (debtPayoffService.compareStrategies as jest.Mock).mockReturnValue({
      avalanche: mockPayoffPlan,
      snowball: mockSnowballPlan,
      // "invalid_strategy" key doesn't exist
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt/calculate",
      {
        method: "POST",
        body: {
          debts: mockDebts,
          strategy: "invalid_strategy",
          compareAll: true,
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid strategy selected");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/debt/calculate",
        {
          method: "POST",
          body: { debts: mockDebts },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (debtPayoffService.calculateOverview as jest.Mock).mockImplementation(() => {
      throw new Error("Calculation failed");
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt/calculate",
      {
        method: "POST",
        body: { debts: mockDebts },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to calculate payoff plan");
  });

  it("should process debts with default values for optional fields", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt/calculate",
      {
        method: "POST",
        body: {
          debts: [{
            name: "Minimal Debt",
            balance: 1000,
            interestRate: 15,
            minimumPayment: 30,
          }],
        },
      },
    );
    await POST(request);

    const calledDebts = (debtPayoffService.calculateOverview as jest.Mock).mock.calls[0][0];
    expect(calledDebts[0].id).toBe("debt-0");
    expect(calledDebts[0].userId).toBe("user-123");
    expect(calledDebts[0].originalBalance).toBe(1000);
    expect(calledDebts[0].isActive).toBe(true);
    expect(calledDebts[0].createdAt).toBeDefined();
    expect(calledDebts[0].updatedAt).toBeDefined();
  });
});
