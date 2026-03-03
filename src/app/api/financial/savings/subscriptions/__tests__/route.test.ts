/**
 * Tests for /api/financial/savings/subscriptions
 *
 * Coverage:
 * - GET endpoint (subscription audit)
 * - Dual auth: middleware + JWT + RBAC
 * - Query parameter validation (minAmount)
 * - Frequency normalization calculation
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/api/financial-api-middleware");
jest.mock("@/lib/financial/savings-optimizer");
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/rbac");

import { GET } from "../route";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { getSavingsOptimizer } from "@/lib/financial/savings-optimizer";
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
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockRecurringCharges = [
  { id: "c1", merchant: "Netflix", amount: 15.99, frequency: "monthly", isSubscription: true },
  { id: "c2", merchant: "Gym", amount: 50, frequency: "monthly", isSubscription: true },
  { id: "c3", merchant: "Insurance", amount: 300, frequency: "quarterly", isSubscription: false },
];

const mockRecommendations = [
  { name: "Cancel Netflix", potentialMonthlySavings: 15.99 },
  { name: "Downgrade gym", potentialMonthlySavings: 20 },
];

const mockOptimizer = {
  findRecurringCharges: jest.fn().mockResolvedValue(mockRecurringCharges),
  suggestCancelableSubscriptions: jest.fn().mockResolvedValue(mockRecommendations),
};

describe("GET /api/financial/savings/subscriptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (getSavingsOptimizer as jest.Mock).mockReturnValue(mockOptimizer);
    mockOptimizer.findRecurringCharges.mockResolvedValue(mockRecurringCharges);
    mockOptimizer.suggestCancelableSubscriptions.mockResolvedValue(mockRecommendations);
  });

  it("should return subscription audit data", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/subscriptions",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.recurringCharges).toHaveLength(3);
    expect(data.data.subscriptions).toHaveLength(2); // only isSubscription=true
    expect(data.data.recommendations).toHaveLength(2);
    expect(data.data.summary).toBeDefined();
    expect(data.data.summary.totalRecurringCharges).toBe(3);
    expect(data.data.summary.totalSubscriptions).toBe(2);
  });

  it("should respect minAmount query parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/subscriptions?minAmount=20",
    );
    await GET(request);

    expect(mockOptimizer.findRecurringCharges).toHaveBeenCalledWith("user-123", 20);
  });

  it("should calculate potential savings from recommendations", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/subscriptions",
    );
    const response = await GET(request);
    const data = await response.json();

    const expectedMonthlySavings = 15.99 + 20;
    expect(data.data.summary.potentialMonthlySavings).toBeCloseTo(expectedMonthlySavings);
    expect(data.data.summary.potentialAnnualSavings).toBeCloseTo(expectedMonthlySavings * 12);
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      error: errorResponse,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/subscriptions",
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should return 401 for invalid JWT", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/subscriptions",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/subscriptions",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 500 on optimizer error", async () => {
    mockOptimizer.findRecurringCharges.mockRejectedValue(
      new Error("Audit failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/savings/subscriptions",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to audit subscriptions");
  });
});
