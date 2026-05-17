/**
 * Tests for /api/financial/savings/goals/[id]
 *
 * Coverage:
 * - GET endpoint (fetch specific goal)
 * - PATCH endpoint (update goal, contribute action)
 * - DELETE endpoint (delete goal)
 * - JWT-only authentication (no rbac)
 * - Dynamic [id] route parameter
 * - 404 handling
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/financial/savings-automation-service");

import { GET, PATCH, DELETE } from "../route";
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

const mockGoal = {
  id: "goal-1",
  name: "Emergency Fund",
  targetAmount: 10000,
  currentAmount: 3000,
  status: "active",
};

const mockContribution = { id: "contrib-1", amount: 500, goalId: "goal-1" };

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/financial/savings/goals/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (savingsAutomationService.getGoal as jest.Mock).mockResolvedValue(mockGoal);
  });

  it("should return a specific goal", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goals/goal-1",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.goal).toEqual(mockGoal);
    expect(savingsAutomationService.getGoal).toHaveBeenCalledWith("user-123", "goal-1");
  });

  it("should return 404 when goal not found", async () => {
    (savingsAutomationService.getGoal as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goals/nonexistent",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Goal not found");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/savings/goals/goal-1",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (savingsAutomationService.getGoal as jest.Mock).mockRejectedValue(
      new Error("Fetch failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goals/goal-1",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch savings goal");
  });
});

describe("PATCH /api/financial/savings/goals/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (savingsAutomationService.updateGoal as jest.Mock).mockResolvedValue(mockGoal);
    (savingsAutomationService.addContribution as jest.Mock).mockResolvedValue(mockContribution);
    (savingsAutomationService.getGoal as jest.Mock).mockResolvedValue(mockGoal);
  });

  it("should update a goal", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goals/goal-1",
      {
        method: "PATCH",
        body: { name: "Updated Fund", targetAmount: 15000 },
      },
    );
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.goal).toEqual(mockGoal);
    expect(savingsAutomationService.updateGoal).toHaveBeenCalledWith(
      "user-123",
      "goal-1",
      expect.objectContaining({ name: "Updated Fund", targetAmount: 15000 }),
    );
  });

  it("should handle contribute action", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goals/goal-1",
      {
        method: "PATCH",
        body: { action: "contribute", amount: 500, source: "manual" },
      },
    );
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.contribution).toEqual(mockContribution);
    expect(data.data.goal).toEqual(mockGoal);
    expect(savingsAutomationService.addContribution).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ goalId: "goal-1", amount: 500, source: "manual" }),
    );
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/savings/goals/goal-1",
        { method: "PATCH", body: { name: "Test" } },
      );
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (savingsAutomationService.updateGoal as jest.Mock).mockRejectedValue(
      new Error("Update failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goals/goal-1",
      { method: "PATCH", body: { name: "Test" } },
    );
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update savings goal");
  });
});

describe("DELETE /api/financial/savings/goals/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (savingsAutomationService.deleteGoal as jest.Mock).mockResolvedValue(true);
  });

  it("should delete a goal", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goals/goal-1",
    );
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(savingsAutomationService.deleteGoal).toHaveBeenCalledWith("user-123", "goal-1");
  });

  it("should return 500 when delete fails", async () => {
    (savingsAutomationService.deleteGoal as jest.Mock).mockResolvedValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goals/goal-1",
    );
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete goal");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/savings/goals/goal-1",
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (savingsAutomationService.deleteGoal as jest.Mock).mockRejectedValue(
      new Error("Delete failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/goals/goal-1",
    );
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete savings goal");
  });
});
