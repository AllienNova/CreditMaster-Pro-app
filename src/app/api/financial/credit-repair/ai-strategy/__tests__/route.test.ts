/**
 * Tests for /api/financial/credit-repair/ai-strategy
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

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

describe("GET /api/financial/credit-repair/ai-strategy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest("http://localhost:3000/api/financial/credit-repair/ai-strategy");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const request = createMockRequest("http://localhost:3000/api/financial/credit-repair/ai-strategy");
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return credit repair strategy data successfully", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/credit-repair/ai-strategy");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.prioritizedActions).toBeDefined();
    expect(data.data.impactPredictions).toBeDefined();
    expect(data.data.timelineEstimates).toBeDefined();
    expect(data.data.successMetrics).toBeDefined();
    expect(data.data.strategyOptimizations).toBeDefined();
    expect(data.data.quickWins).toBeDefined();
    expect(data.data.repairScore).toBe(88);
  });

  it("should return prioritized actions with expected structure", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/credit-repair/ai-strategy");
    const response = await GET(request);
    const data = await response.json();
    const action = data.data.prioritizedActions[0];
    expect(action).toHaveProperty("id");
    expect(action).toHaveProperty("title");
    expect(action).toHaveProperty("impact");
    expect(action).toHaveProperty("successProbability");
    expect(action).toHaveProperty("priority");
  });

  it("should return 500 on unexpected error", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockRejectedValue(
      new Error("Service unavailable"),
    );
    const request = createMockRequest("http://localhost:3000/api/financial/credit-repair/ai-strategy");
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
