/**
 * Tests for /api/financial/disputes/ai-strategy
 */

import { NextRequest } from "next/server";

const mockResolveRoleFromDb = jest.fn();
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
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

describe("GET /api/financial/disputes/ai-strategy", () => {
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

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest("http://localhost:3000/api/financial/disputes/ai-strategy");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for user without disputes:read permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const request = createMockRequest("http://localhost:3000/api/financial/disputes/ai-strategy");
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return dispute strategy data successfully", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/disputes/ai-strategy");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.opportunities).toBeDefined();
    expect(data.data.templates).toBeDefined();
    expect(data.data.evidenceAssessments).toBeDefined();
    expect(data.data.timelinePredictions).toBeDefined();
    expect(data.data.overallSuccessScore).toBe(76);
  });

  it("should include meta information", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/disputes/ai-strategy");
    const response = await GET(request);
    const data = await response.json();
    expect(data._meta.generatedAt).toBeDefined();
    expect(data._meta.dataSourcesUsed).toContain("dispute-service");
  });

  it("should return fallback data on error", async () => {
    mockResolveRoleFromDb.mockRejectedValue(
        new Error("Role resolution failed"),
      );
    const request = createMockRequest("http://localhost:3000/api/financial/disputes/ai-strategy");
    const response = await GET(request);
    // TASK-AUTH-03c: withAuth guard fails closed with 503 when role resolution fails.
    expect(response.status).toBe(503);
  });
});
