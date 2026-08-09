/**
 * Tests for /api/financial/bills/[id]/outcome
 *
 * Coverage:
 * - POST endpoint (record negotiation outcome)
 * - Middleware auth, validation, error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/api/financial-api-middleware");
const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/financial/bill-negotiator");

import { POST } from "../route";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { getBillNegotiator } from "@/lib/financial/bill-negotiator";

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

const mockParams = { params: Promise.resolve({ id: "bill-1" }) };

const mockSavingsEstimate = {
  totalPotentialSavings: 300,
  monthlyPotentialSavings: 25,
  annualPotentialSavings: 300,
};

const mockBillNegotiator = {
  trackNegotiationOutcome: jest.fn().mockResolvedValue(undefined),
  calculatePotentialSavings: jest.fn().mockResolvedValue(mockSavingsEstimate),
};

const validBody = {
  success: true,
  savingsAchieved: 20,
  previousMonthlyRate: 89.99,
  newMonthlyRate: 69.99,
  method: "phone" as const,
  duration: 30,
  notes: "Spoke with retention department",
};

describe("POST /api/financial/bills/[id]/outcome", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user-1@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    // Re-set nested mock implementations (resetMocks: true strips them)
    mockBillNegotiator.trackNegotiationOutcome.mockResolvedValue(undefined);
    mockBillNegotiator.calculatePotentialSavings.mockResolvedValue(mockSavingsEstimate);
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (getBillNegotiator as jest.Mock).mockReturnValue(mockBillNegotiator);
  });

  it("should record outcome successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/outcome", {
      method: "POST",
      body: validBody,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.outcome.billId).toBe("bill-1");
    expect(data.data.outcome.savingsAchieved).toBe(20);
    expect(data.data.outcome.annualSavings).toBe(240);
    expect(data.data.updatedSavingsEstimate).toBeDefined();
    expect(mockBillNegotiator.trackNegotiationOutcome).toHaveBeenCalled();
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = { status: 401, json: async () => ({ error: "Unauthorized" }) };
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({ error: errorResponse });

    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/outcome", {
      method: "POST",
      body: validBody,
    });
    const res = await POST(req);

    expect(res).toBe(errorResponse);
  });

  it("should return 400 for missing required fields", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/outcome", {
      method: "POST",
      body: { success: true },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Validation error");
  });

  it("should return 400 when requiresFollowup is true but no followupDate", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/outcome", {
      method: "POST",
      body: {
        ...validBody,
        requiresFollowup: true,
        // missing followupDate
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("followupDate is required");
  });

  it("should return 400 for invalid method value", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/outcome", {
      method: "POST",
      body: { ...validBody, method: "carrier_pigeon" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Validation error");
  });

  it("should return 500 on service error", async () => {
    mockBillNegotiator.trackNegotiationOutcome.mockRejectedValue(new Error("Service error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/outcome", {
      method: "POST",
      body: validBody,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Internal server error");
  });
});

describe("negative-auth – /api/financial/bills/bill-1/outcome", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(createMockRequest("http://localhost:3000/api/financial/bills/bill-1/outcome", { method: "POST" }));
    expect(res.status).toBe(401);
  });
});
