/**
 * Tests for /api/financial/goals/optimizations
 *
 * Coverage:
 * - GET endpoint (returns goal optimization recommendations and auto-save data)
 * - JWT + RBAC auth ("financial:read" permission)
 * - Returns hardcoded mock data (autoSaveRules, optimizations, achievementPredictions)
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

function createMockRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

describe("GET /api/financial/goals/optimizations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
  });

  it("should return goal optimizations data", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/optimizations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.autoSaveEnabled).toBe(true);
    expect(data.data.autoSaveRules).toHaveLength(3);
    expect(data.data.totalAutoSavings).toBe(595);
    expect(data.data.optimizations).toHaveLength(3);
    expect(data.data.achievementPredictions).toHaveLength(3);
  });

  it("should return auto-save rules with correct structure", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/optimizations",
    );
    const response = await GET(request);
    const data = await response.json();

    const rules = data.data.autoSaveRules;
    expect(rules[0].type).toBe("round_up");
    expect(rules[0].name).toBe("Round Up Purchases");
    expect(rules[0].linkedGoalName).toBe("Emergency Fund");
    expect(rules[0].isActive).toBe(true);
    expect(rules[1].type).toBe("percentage");
    expect(rules[1].amount).toBe(10);
    expect(rules[2].type).toBe("fixed");
    expect(rules[2].amount).toBe(200);
  });

  it("should return optimizations with projected and optimized dates", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/optimizations",
    );
    const response = await GET(request);
    const data = await response.json();

    const optimizations = data.data.optimizations;
    expect(optimizations[0].goalName).toBe("Emergency Fund");
    expect(optimizations[0].currentContribution).toBe(200);
    expect(optimizations[0].recommendedContribution).toBe(300);
    expect(optimizations[0].monthsSaved).toBe(4);
    expect(optimizations[0].confidence).toBe(85);
    expect(optimizations[0].projectedCompletion).toBeDefined();
    expect(optimizations[0].optimizedCompletion).toBeDefined();
  });

  it("should return achievement predictions with risk factors", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/optimizations",
    );
    const response = await GET(request);
    const data = await response.json();

    const predictions = data.data.achievementPredictions;
    expect(predictions[0].goalName).toBe("Emergency Fund");
    expect(predictions[0].probability).toBe(85);
    expect(predictions[0].riskFactors).toHaveLength(2);
    expect(predictions[1].probability).toBe(92);
    expect(predictions[1].riskFactors).toHaveLength(0);
    expect(predictions[2].probability).toBe(75);
    expect(predictions[2].riskFactors).toHaveLength(2);
  });

  it("should return 401 for invalid JWT", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/optimizations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/optimizations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should check for financial:read permission", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/optimizations",
    );
    await GET(request);

    expect(rbac.hasPermission).toHaveBeenCalledWith(mockUser, "financial:read");
  });

  it("should return 500 on unexpected error", async () => {
    // Force an error by making validateFromHeaders throw
    (jwtValidation.validateFromHeaders as jest.Mock).mockRejectedValue(
      new Error("Unexpected failure"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/optimizations",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch goal optimizations");
  });
});
