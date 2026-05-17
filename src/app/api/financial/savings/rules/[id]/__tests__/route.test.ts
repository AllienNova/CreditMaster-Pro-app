/**
 * Tests for /api/financial/savings/rules/[id]
 *
 * Coverage:
 * - GET endpoint (fetch specific rule)
 * - PATCH endpoint (update rule, toggle action)
 * - DELETE endpoint (delete rule)
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

const mockRule = {
  id: "rule-1",
  name: "Round up purchases",
  type: "round_up",
  status: "active",
  goalId: "goal-1",
};

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/financial/savings/rules/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (savingsAutomationService.getRule as jest.Mock).mockResolvedValue(mockRule);
  });

  it("should return a specific rule", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/rules/rule-1",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.rule).toEqual(mockRule);
    expect(savingsAutomationService.getRule).toHaveBeenCalledWith("user-123", "rule-1");
  });

  it("should return 404 when rule not found", async () => {
    (savingsAutomationService.getRule as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/rules/nonexistent",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Rule not found");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/savings/rules/rule-1",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (savingsAutomationService.getRule as jest.Mock).mockRejectedValue(
      new Error("Fetch failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/rules/rule-1",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch savings rule");
  });
});

describe("PATCH /api/financial/savings/rules/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (savingsAutomationService.updateRule as jest.Mock).mockResolvedValue(mockRule);
    (savingsAutomationService.toggleRuleStatus as jest.Mock).mockResolvedValue({
      ...mockRule,
      status: "paused",
    });
  });

  it("should update a rule", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/rules/rule-1",
      {
        method: "PATCH",
        body: { name: "Updated rule", config: { amount: 5 } },
      },
    );
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.rule).toEqual(mockRule);
    expect(savingsAutomationService.updateRule).toHaveBeenCalledWith(
      "user-123",
      "rule-1",
      expect.objectContaining({ name: "Updated rule", config: { amount: 5 } }),
    );
  });

  it("should handle toggle action", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/rules/rule-1",
      {
        method: "PATCH",
        body: { action: "toggle" },
      },
    );
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.rule.status).toBe("paused");
    expect(savingsAutomationService.toggleRuleStatus).toHaveBeenCalledWith("user-123", "rule-1");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/savings/rules/rule-1",
        { method: "PATCH", body: { name: "Test" } },
      );
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (savingsAutomationService.updateRule as jest.Mock).mockRejectedValue(
      new Error("Update failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/rules/rule-1",
      { method: "PATCH", body: { name: "Test" } },
    );
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update savings rule");
  });
});

describe("DELETE /api/financial/savings/rules/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (savingsAutomationService.deleteRule as jest.Mock).mockResolvedValue(true);
  });

  it("should delete a rule", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/rules/rule-1",
    );
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(savingsAutomationService.deleteRule).toHaveBeenCalledWith("user-123", "rule-1");
  });

  it("should return 500 when delete fails", async () => {
    (savingsAutomationService.deleteRule as jest.Mock).mockResolvedValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/rules/rule-1",
    );
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete rule");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/savings/rules/rule-1",
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (savingsAutomationService.deleteRule as jest.Mock).mockRejectedValue(
      new Error("Delete failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/rules/rule-1",
    );
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete savings rule");
  });
});
