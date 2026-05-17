/**
 * Tests for /api/financial/debt
 *
 * Coverage:
 * - GET endpoint (debt overview with payoff plans)
 * - POST endpoint (add new debt)
 * - JWT-only authentication (no rbac)
 * - Query parameter handling (strategy, extraPayment, compare)
 * - Validation of required fields
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/financial/debt-payoff-service");

import { GET, POST } from "../route";
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
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockOverview = {
  totalDebt: 49000,
  totalMinimumPayments: 885,
  highestInterestRate: 24.99,
  debtToIncomeRatio: 0.177,
};

const mockPayoffPlan = {
  strategy: "avalanche",
  totalMonths: 36,
  totalInterestPaid: 8500,
  monthlyPayment: 1385,
  schedule: [],
};

const mockComparison = {
  avalanche: mockPayoffPlan,
  snowball: { ...mockPayoffPlan, strategy: "snowball", totalInterestPaid: 9200 },
};

const mockMilestones = [
  { month: 12, description: "Discover It paid off" },
  { month: 24, description: "Capital One paid off" },
];

const mockInsights = [
  { type: "tip", message: "Focus on highest interest debt first" },
];

describe("GET /api/financial/debt", () => {
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

  it("should return debt overview with default strategy", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.overview).toEqual(mockOverview);
    expect(data.data.debts).toHaveLength(5);
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

  it("should respect strategy and extraPayment query params", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt?strategy=snowball&extraPayment=200",
    );
    await GET(request);

    expect(debtPayoffService.calculatePayoffPlan).toHaveBeenCalledWith(
      expect.any(Array),
      "snowball",
      200,
    );
  });

  it("should include comparison when compare=true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt?compare=true",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.comparison).toEqual(mockComparison);
    expect(debtPayoffService.compareStrategies).toHaveBeenCalledWith(
      expect.any(Array),
      0,
    );
  });

  it("should not include comparison when compare is not true", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt?compare=false",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.comparison).toBeUndefined();
    expect(debtPayoffService.compareStrategies).not.toHaveBeenCalled();
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/debt",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (debtPayoffService.calculateOverview as jest.Mock).mockImplementation(() => {
      throw new Error("Service failed");
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch debt data");
  });
});

describe("POST /api/financial/debt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
  });

  it("should create a new debt", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt",
      {
        method: "POST",
        body: {
          name: "New Credit Card",
          type: "credit_card",
          balance: 3000,
          interestRate: 18.99,
          minimumPayment: 90,
          dueDate: "2025-02-15",
          creditorName: "Amex",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe("New Credit Card");
    expect(data.data.type).toBe("credit_card");
    expect(data.data.balance).toBe(3000);
    expect(data.data.originalBalance).toBe(3000);
    expect(data.data.interestRate).toBe(18.99);
    expect(data.data.minimumPayment).toBe(90);
    expect(data.data.userId).toBe("user-123");
    expect(data.data.isActive).toBe(true);
    expect(data.data.id).toBeDefined();
  });

  it("should return 400 when missing required fields", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt",
      {
        method: "POST",
        body: {
          name: "Partial Debt",
          type: "credit_card",
          // missing balance, interestRate, minimumPayment
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/debt",
        {
          method: "POST",
          body: {
            name: "Test",
            type: "credit_card",
            balance: 1000,
            interestRate: 15,
            minimumPayment: 30,
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on unexpected error", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/debt",
      {
        method: "POST",
        body: null,
      },
    );
    // The json() mock returns null, which will cause destructuring to fail
    (request.json as jest.Mock).mockRejectedValue(new Error("Parse error"));
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create debt");
  });
});
