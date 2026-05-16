/**
 * Tests for /api/financial/bills/negotiate
 *
 * Coverage:
 * - GET endpoint (negotiation summary / opportunities / insights / active)
 * - POST endpoint (create negotiation)
 * - Authentication, Validation, Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
jest.mock("@/lib/financial/bill-negotiation-service");
jest.mock("@/lib/financial/bill-detection-service");

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { billNegotiationService } from "@/lib/financial/bill-negotiation-service";
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

const mockSummary = { totalNegotiations: 5, totalSavings: 200, successRate: 80 };
const mockInsights = { averageSavings: 40, topCategory: "internet" };
const mockOpportunities = [{ billId: "bill-1", potential: "high" }];
const mockNegotiations = [{ id: "neg-1", status: "in_progress" }];
const mockBill = { id: "bill-1", merchantName: "Comcast", amount: 89.99 };
const mockNegotiation = { id: "neg-1", billId: "bill-1", status: "pending" };

describe("GET /api/financial/bills/negotiate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (billNegotiationService.getNegotiationSummary as jest.Mock).mockResolvedValue(mockSummary);
    (billNegotiationService.getInsights as jest.Mock).mockResolvedValue(mockInsights);
    (billNegotiationService.identifyOpportunities as jest.Mock).mockResolvedValue(mockOpportunities);
    (billNegotiationService.getUserNegotiations as jest.Mock).mockResolvedValue(mockNegotiations);
  });

  it("should return summary and insights by default", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary).toBeDefined();
    expect(data.insights).toBeDefined();
  });

  it("should return opportunities when view=opportunities", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate?view=opportunities");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.opportunities).toBeDefined();
    expect(billNegotiationService.identifyOpportunities).toHaveBeenCalledWith("user-123");
  });

  it("should return insights when view=insights", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate?view=insights");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.insights).toBeDefined();
  });

  it("should return active negotiations when view=active", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate?view=active");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.negotiations).toBeDefined();
    expect(billNegotiationService.getUserNegotiations).toHaveBeenCalledWith("user-123", "in_progress");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return 500 on service error", async () => {
    (billNegotiationService.getNegotiationSummary as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to get negotiation data");
  });
});

describe("POST /api/financial/bills/negotiate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (billDetectionService.getBillById as jest.Mock).mockResolvedValue(mockBill);
    (billNegotiationService.createNegotiation as jest.Mock).mockResolvedValue(mockNegotiation);
  });

  it("should create a negotiation successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate", {
      method: "POST",
      body: { billId: "bill-1", negotiationType: "price_reduction" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.negotiation).toBeDefined();
    expect(billDetectionService.getBillById).toHaveBeenCalledWith("bill-1", "user-123");
    expect(billNegotiationService.createNegotiation).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ billId: "bill-1", negotiationType: "price_reduction" }),
      mockBill,
    );
  });

  it("should return 400 for missing required fields", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate", {
      method: "POST",
      body: { billId: "bill-1" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 404 when bill not found", async () => {
    (billDetectionService.getBillById as jest.Mock).mockResolvedValue(null);
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate", {
      method: "POST",
      body: { billId: "bill-999", negotiationType: "price_reduction" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Bill not found");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate", {
      method: "POST",
      body: { billId: "bill-1", negotiationType: "price_reduction" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 500 on service error", async () => {
    (billNegotiationService.createNegotiation as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate", {
      method: "POST",
      body: { billId: "bill-1", negotiationType: "price_reduction" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to create negotiation");
  });
});

describe("negative-auth – /api/financial/bills/negotiate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const res = await GET(createMockRequest("http://localhost:3000/api/financial/bills/negotiate"));
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const res = await POST(createMockRequest("http://localhost:3000/api/financial/bills/negotiate", { method: "POST" }));
    expect(res.status).toBe(401);
  });
});
