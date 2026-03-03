/**
 * Tests for /api/financial/bills/summary
 *
 * Coverage:
 * - GET endpoint (bill summary)
 * - Authentication, Authorization, Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/bill-detection-service");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { billDetectionService } from "@/lib/financial/bill-detection-service";

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

const mockSummary = {
  totalBills: 8,
  totalMonthly: 450.5,
  upcomingBills: 3,
  overdueBills: 0,
  categories: { subscription: 4, utilities: 3, insurance: 1 },
};

describe("GET /api/financial/bills/summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (billDetectionService.getBillSummary as jest.Mock).mockResolvedValue(mockSummary);
  });

  it("should return bill summary for authenticated user", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/summary");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary).toBeDefined();
    expect(data.summary.totalBills).toBe(8);
    expect(data.summary.totalMonthly).toBe(450.5);
    expect(billDetectionService.getBillSummary).toHaveBeenCalledWith("user-123");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/summary");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/bills/summary");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 500 on service error", async () => {
    (billDetectionService.getBillSummary as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/summary");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch bill summary");
  });
});
