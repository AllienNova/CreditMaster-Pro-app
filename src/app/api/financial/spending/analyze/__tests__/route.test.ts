/**
 * Tests for /api/financial/spending/analyze
 *
 * Coverage:
 * - POST endpoint (spending period analysis)
 * - Authentication / Authorization
 * - Request body validation
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/spending-analysis-service");

import { POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { spendingAnalysisService } from "@/lib/financial/spending-analysis-service";

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

describe("POST /api/financial/spending/analyze", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
  });

  it("should return spending analysis for valid date range", async () => {
    const mockAnalysis = { totalSpent: 2500, topCategories: [] };
    (spendingAnalysisService.analyzeSpending as jest.Mock).mockResolvedValue(mockAnalysis);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analyze",
      {
        body: {
          startDate: "2025-01-01",
          endDate: "2025-01-31",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockAnalysis);
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analyze",
      { body: { startDate: "2025-01-01", endDate: "2025-01-31" } },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analyze",
      { body: { startDate: "2025-01-01", endDate: "2025-01-31" } },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 400 when missing required fields", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analyze",
      { body: {} },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 400 for invalid date format", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analyze",
      { body: { startDate: "not-a-date", endDate: "also-bad" } },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid date format");
  });

  it("should return 400 when startDate is after endDate", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analyze",
      { body: { startDate: "2025-02-01", endDate: "2025-01-01" } },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("startDate must be before endDate");
  });

  it("should return 500 on service error", async () => {
    (spendingAnalysisService.analyzeSpending as jest.Mock).mockRejectedValue(
      new Error("Analysis failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/analyze",
      { body: { startDate: "2025-01-01", endDate: "2025-01-31" } },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to analyze spending");
  });
});
