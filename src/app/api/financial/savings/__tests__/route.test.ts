/**
 * Tests for /api/financial/savings
 *
 * Coverage:
 * - GET endpoint (savings summary, rules, goals, all)
 * - POST endpoint (create_rule, create_goal, add_contribution, calculate_roundup)
 * - JWT-only authentication (no rbac)
 * - Query parameter validation (type)
 * - Action validation
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/financial/savings-automation-service");

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { savingsAutomationService } from "@/lib/financial/savings-automation-service";

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

const mockSummary = { totalSaved: 5000, monthlyRate: 400 };
const mockInsights = [{ id: "i1", message: "Good progress" }];
const mockRecommendations = [{ id: "r1", action: "Increase savings" }];
const mockRules = [{ id: "rule-1", name: "Round up", type: "round_up" }];
const mockGoals = [{ id: "goal-1", name: "Emergency Fund", targetAmount: 10000 }];
const mockRule = { id: "rule-new", name: "Weekly save", type: "fixed" };
const mockGoal = { id: "goal-new", name: "Vacation", targetAmount: 3000 };
const mockContribution = { id: "contrib-1", amount: 100, goalId: "goal-1" };

describe("GET /api/financial/savings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (savingsAutomationService.getSummary as jest.Mock).mockResolvedValue(mockSummary);
    (savingsAutomationService.getInsights as jest.Mock).mockResolvedValue(mockInsights);
    (savingsAutomationService.getRecommendations as jest.Mock).mockResolvedValue(mockRecommendations);
    (savingsAutomationService.getRules as jest.Mock).mockResolvedValue(mockRules);
    (savingsAutomationService.getGoals as jest.Mock).mockResolvedValue(mockGoals);
  });

  it("should return summary by default", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary).toEqual(mockSummary);
    expect(data.data.insights).toEqual(mockInsights);
    expect(data.data.recommendations).toEqual(mockRecommendations);
  });

  it("should return rules when type=rules", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings?type=rules",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.rules).toEqual(mockRules);
  });

  it("should return goals when type=goals", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings?type=goals",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.goals).toEqual(mockGoals);
  });

  it("should return all data when type=all", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings?type=all",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary).toEqual(mockSummary);
    expect(data.data.rules).toEqual(mockRules);
    expect(data.data.goals).toEqual(mockGoals);
    expect(data.data.insights).toEqual(mockInsights);
    expect(data.data.recommendations).toEqual(mockRecommendations);
  });

  it("should return 400 for invalid type parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings?type=invalid",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid type parameter");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 500 on service error", async () => {
    (savingsAutomationService.getSummary as jest.Mock).mockRejectedValue(
      new Error("Service failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch savings data");
  });
});

describe("POST /api/financial/savings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (savingsAutomationService.createRule as jest.Mock).mockResolvedValue(mockRule);
    (savingsAutomationService.createGoal as jest.Mock).mockResolvedValue(mockGoal);
    (savingsAutomationService.addContribution as jest.Mock).mockResolvedValue(mockContribution);
    (savingsAutomationService.calculateRoundUp as jest.Mock).mockReturnValue({
      original: 4.75,
      roundedTo: 5,
      roundUpAmount: 0.25,
    });
  });

  it("should create a rule", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings",
      {
        method: "POST",
        body: { action: "create_rule", name: "Weekly save", type: "fixed", frequency: "weekly" },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.rule).toEqual(mockRule);
  });

  it("should create a goal", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings",
      {
        method: "POST",
        body: { action: "create_goal", name: "Vacation", targetAmount: 3000 },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.goal).toEqual(mockGoal);
  });

  it("should add a contribution", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings",
      {
        method: "POST",
        body: { action: "add_contribution", goalId: "goal-1", amount: 100 },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.contribution).toEqual(mockContribution);
  });

  it("should calculate roundup", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings",
      {
        method: "POST",
        body: { action: "calculate_roundup", amount: 4.75 },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.calculation).toBeDefined();
  });

  it("should return 400 for invalid action", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings",
      {
        method: "POST",
        body: { action: "invalid" },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid action");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings",
      {
        method: "POST",
        body: { action: "create_rule" },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 500 on service error", async () => {
    (savingsAutomationService.createRule as jest.Mock).mockRejectedValue(
      new Error("Create failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings",
      {
        method: "POST",
        body: { action: "create_rule", name: "Test" },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to process savings action");
  });
});
