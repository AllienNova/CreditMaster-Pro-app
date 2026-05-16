/**
 * Tests for /api/financial/credit/simulator
 *
 * Coverage:
 * - GET endpoint (optimal_path, secured_card_recommendations, credit_mix, invalid type)
 * - POST endpoint (actions, pay_off_card, new_card, scenarios, student_loan, invalid type)
 * - JWT authentication (401)
 * - RBAC permissions (403)
 * - Input validation (400 for invalid profile, actions, etc.)
 * - Error handling (500)
 */

import { NextRequest } from "next/server";

const mockResolveRoleFromDb = jest.fn();
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/auth/rbac");

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

const validProfile = {
  currentScore: 680,
  totalCreditLimit: 10000,
  totalBalance: 4000,
  numberOfAccounts: 4,
  oldestAccountAgeMonths: 60,
  averageAccountAgeMonths: 36,
  hardInquiriesLast12Months: 1,
  latePaymentsLast24Months: 0,
  collectionsCount: 0,
  bankruptcyOnRecord: false,
  utilizationPercentage: 40,
};

function createMockGetRequest(url: string): NextRequest {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

function createMockPostRequest(
  url: string,
  body: unknown,
): NextRequest {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

describe("/api/financial/credit/simulator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveRoleFromDb.mockResolvedValue("premium");
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
  });

  // ============================================================================
  // AUTH TESTS
  // ============================================================================

  describe("authentication and authorization", () => {
    it("GET should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/credit/simulator?type=optimal_path",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("POST should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        { profile: validProfile, actions: [{ type: "hard_inquiry" }] },
      );
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("GET should return 403 for user without credit:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);

      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/credit/simulator?type=optimal_path",
      );
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("POST should return 403 for user without credit:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);

      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        { profile: validProfile, actions: [{ type: "hard_inquiry" }] },
      );
      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });

  // ============================================================================
  // GET TESTS
  // ============================================================================

  describe("GET /api/financial/credit/simulator", () => {
    it("should return optimal path with default target score", async () => {
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/credit/simulator?type=optimal_path",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.actions).toBeDefined();
      expect(data.data.projectedResult).toBeDefined();
      expect(data._meta.simulationType).toBe("optimal_path");
      expect(data._meta.targetScore).toBe(750);
    });

    it("should return optimal path with custom target score", async () => {
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/credit/simulator?type=optimal_path&targetScore=800",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data._meta.targetScore).toBe(800);
    });

    it("should return 400 for invalid target score", async () => {
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/credit/simulator?type=optimal_path&targetScore=900",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Target score must be between 300 and 850");
    });

    it("should return secured card recommendations", async () => {
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/credit/simulator?type=secured_card_recommendations",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recommendations).toBeDefined();
      expect(data._meta.simulationType).toBe("secured_card_recommendations");
    });

    it("should return credit mix analysis", async () => {
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/credit/simulator?type=credit_mix",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.analysis).toBeDefined();
      expect(data.data.analysis.mixRating).toBeDefined();
      expect(data.data.analysis.suggestions).toBeDefined();
      expect(data._meta.simulationType).toBe("credit_mix");
    });

    it("should default to optimal_path when no type specified", async () => {
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/credit/simulator",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data._meta.simulationType).toBe("optimal_path");
    });

    it("should return 400 for invalid simulation type", async () => {
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/credit/simulator?type=invalid_type",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid simulation type");
      expect(data.validTypes).toBeDefined();
    });

    it("should return 500 on unexpected error", async () => {
      mockResolveRoleFromDb.mockRejectedValue(
        new Error("Role resolution failed"),
      );

      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/credit/simulator?type=optimal_path",
      );
      const response = await GET(request);

      // TASK-AUTH-03c: withAuth guard fails closed with 503 when role resolution fails.
      expect(response.status).toBe(503);
    });
  });

  // ============================================================================
  // POST TESTS - Actions simulation
  // ============================================================================

  describe("POST /api/financial/credit/simulator - actions", () => {
    it("should simulate actions successfully", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "actions",
          actions: [
            { type: "pay_down_debt", amount: 2000 },
            { type: "hard_inquiry" },
          ],
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.currentScore).toBe(680);
      expect(data.data.projectedScore).toBeDefined();
      expect(data.data.scoreChange).toBeDefined();
      expect(data.data.changeBreakdown).toBeDefined();
      expect(data._meta.simulationType).toBe("actions");
    });

    it("should default to actions simulation type", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          actions: [{ type: "hard_inquiry" }],
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data._meta.simulationType).toBe("actions");
    });

    it("should return 400 for missing profile", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          actions: [{ type: "hard_inquiry" }],
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid or missing credit profile");
    });

    it("should return 400 for incomplete profile", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: { currentScore: 680 },
          actions: [{ type: "hard_inquiry" }],
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid score in profile", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: { ...validProfile, currentScore: 900 },
          actions: [{ type: "hard_inquiry" }],
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Current score must be between 300 and 850");
    });

    it("should return 400 for missing actions", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "actions",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Actions array is required");
    });

    it("should return 400 for empty actions array", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "actions",
          actions: [],
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Actions array is required");
    });

    it("should return 400 for invalid action type", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "actions",
          actions: [{ type: "invalid_action" }],
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid action");
    });
  });

  // ============================================================================
  // POST TESTS - Pay off card simulation
  // ============================================================================

  describe("POST /api/financial/credit/simulator - pay_off_card", () => {
    it("should simulate paying off a card", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "pay_off_card",
          cardBalance: 2000,
          cardLimit: 5000,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.currentScore).toBe(680);
      expect(data._meta.simulationType).toBe("pay_off_card");
    });

    it("should return 400 for missing cardBalance", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "pay_off_card",
          cardLimit: 5000,
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for negative cardBalance", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "pay_off_card",
          cardBalance: -100,
          cardLimit: 5000,
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for zero cardLimit", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "pay_off_card",
          cardBalance: 1000,
          cardLimit: 0,
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // POST TESTS - New card simulation
  // ============================================================================

  describe("POST /api/financial/credit/simulator - new_card", () => {
    it("should simulate opening a new card", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "new_card",
          newCardLimit: 5000,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data._meta.simulationType).toBe("new_card");
    });

    it("should return 400 for missing newCardLimit", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "new_card",
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for zero newCardLimit", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "new_card",
          newCardLimit: 0,
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // POST TESTS - Scenarios comparison
  // ============================================================================

  describe("POST /api/financial/credit/simulator - scenarios", () => {
    it("should compare scenarios successfully", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "scenarios",
          scenarios: [
            {
              name: "Pay down",
              actions: [{ type: "pay_down_debt", amount: 2000 }],
            },
            {
              name: "New card",
              actions: [{ type: "open_new_card", creditLimit: 5000 }],
            },
          ],
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(2);
      expect(data.data.bestScenario).toBeDefined();
      expect(data.data.worstScenario).toBeDefined();
    });

    it("should return 400 for missing scenarios", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "scenarios",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Scenarios array is required");
    });

    it("should return 400 for empty scenarios array", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "scenarios",
          scenarios: [],
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for scenario without name", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "scenarios",
          scenarios: [{ actions: [{ type: "hard_inquiry" }] }],
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Each scenario must have a name");
    });
  });

  // ============================================================================
  // POST TESTS - Student loan optimization
  // ============================================================================

  describe("POST /api/financial/credit/simulator - student_loan", () => {
    const validLoans = [
      {
        id: "loan-1",
        name: "Federal Loan",
        balance: 20000,
        interestRate: 5.0,
        monthlyPayment: 250,
        type: "federal",
        servicer: "FedLoan",
      },
    ];

    it("should analyze student loans successfully", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "student_loan",
          loans: validLoans,
          income: 60000,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalBalance).toBe(20000);
      expect(data.data.consolidation).toBeDefined();
      expect(data.data.recommendation).toBeDefined();
    });

    it("should return 400 for missing loans", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "student_loan",
          income: 60000,
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for empty loans array", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "student_loan",
          loans: [],
          income: 60000,
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing income", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "student_loan",
          loans: validLoans,
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for negative income", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "student_loan",
          loans: validLoans,
          income: -1000,
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // POST TESTS - Invalid type and errors
  // ============================================================================

  describe("POST /api/financial/credit/simulator - error handling", () => {
    it("should return 400 for invalid simulation type", async () => {
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          simulationType: "invalid_type",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid simulation type");
      expect(data.validTypes).toBeDefined();
    });

    it("should return 500 on unexpected error", async () => {
      mockResolveRoleFromDb.mockRejectedValue(
        new Error("Role resolution failed"),
      );

      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/credit/simulator",
        {
          profile: validProfile,
          actions: [{ type: "hard_inquiry" }],
        },
      );
      const response = await POST(request);

      // TASK-AUTH-03c: withAuth guard fails closed with 503 when role resolution fails.
      expect(response.status).toBe(503);
    });
  });
});
