/**
 * Tests for /api/financial/bills/optimizations
 *
 * Coverage:
 * - GET endpoint (bill optimization recommendations)
 * - Authentication, Authorization, Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/rbac");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

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

describe("GET /api/financial/bills/optimizations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
  });

  it("should return optimization data for authenticated user", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/optimizations");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.negotiationOpportunities).toBeDefined();
    expect(data.data.subscriptionOptimizations).toBeDefined();
    expect(data.data.dueDateOptimizations).toBeDefined();
    expect(data.data.totalPotentialSavings).toBeDefined();
    expect(data.data.optimizationScore).toBeDefined();
  });

  it("should return negotiation opportunities with correct structure", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/optimizations");
    const res = await GET(req);
    const data = await res.json();

    const opportunities = data.data.negotiationOpportunities;
    expect(opportunities.length).toBeGreaterThan(0);
    expect(opportunities[0]).toHaveProperty("id");
    expect(opportunities[0]).toHaveProperty("billName");
    expect(opportunities[0]).toHaveProperty("currentAmount");
    expect(opportunities[0]).toHaveProperty("estimatedSavings");
    expect(opportunities[0]).toHaveProperty("difficulty");
    expect(opportunities[0]).toHaveProperty("tips");
  });

  it("should return subscription optimizations with recommendations", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/optimizations");
    const res = await GET(req);
    const data = await res.json();

    const subs = data.data.subscriptionOptimizations;
    expect(subs.length).toBeGreaterThan(0);
    const recommendations = subs.map((s: { recommendation: string }) => s.recommendation);
    expect(recommendations).toEqual(expect.arrayContaining(["cancel", "keep", "downgrade"]));
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/optimizations");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/bills/optimizations");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });
});
