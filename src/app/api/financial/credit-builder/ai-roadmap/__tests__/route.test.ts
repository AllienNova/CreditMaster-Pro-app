/**
 * Tests for /api/financial/credit-builder/ai-roadmap
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
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

describe("GET /api/financial/credit-builder/ai-roadmap", () => {
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
    const request = createMockRequest("http://localhost:3000/api/financial/credit-builder/ai-roadmap");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for user without credit:read permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const request = createMockRequest("http://localhost:3000/api/financial/credit-builder/ai-roadmap");
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return AI roadmap data successfully", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/credit-builder/ai-roadmap");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.milestones).toBeDefined();
    expect(data.data.milestones.length).toBeGreaterThan(0);
    expect(data.data.timelinePredictions).toBeDefined();
    expect(data.data.prioritizedActions).toBeDefined();
    expect(data.data.progressMetrics).toBeDefined();
    expect(data.data.strategyRecommendations).toBeDefined();
  });

  it("should return roadmap with expected milestone structure", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/credit-builder/ai-roadmap");
    const response = await GET(request);
    const data = await response.json();
    const milestone = data.data.milestones[0];
    expect(milestone).toHaveProperty("id");
    expect(milestone).toHaveProperty("title");
    expect(milestone).toHaveProperty("targetScore");
    expect(milestone).toHaveProperty("successProbability");
  });

  it("should return 500 on unexpected error", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockRejectedValue(
      new Error("Unexpected error"),
    );
    const request = createMockRequest("http://localhost:3000/api/financial/credit-builder/ai-roadmap");
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
