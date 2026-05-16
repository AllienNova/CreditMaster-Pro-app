/**
 * Tests for /api/financial/bills/[id]/negotiate
 *
 * Coverage:
 * - POST endpoint (generate personalized negotiation script)
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

const mockBill = {
  id: "bill-1",
  provider: "Comcast",
  serviceName: "Internet",
  currentAmount: 89.99,
  estimatedSavings: 20,
  negotiationPotential: "high",
  difficulty: "easy",
  billType: "internet",
};

const mockScript = {
  strategy: "balanced",
  targetSavings: 20,
  minimumAcceptableSavings: 10,
  confidence: 85,
  aiModel: "gpt-4",
  generatedAt: new Date(),
  expiresAt: new Date(Date.now() + 86400000),
  steps: ["Step 1: Call provider"],
};

const mockMarketAnalysis = {
  averageMarketRate: 59.99,
  savingsPotential: 30,
  marketPosition: "above_average",
  recommendedAction: "negotiate",
  leveragePoints: ["competitor pricing"],
};

const mockBillNegotiator = {
  identifyNegotiableBills: jest.fn().mockResolvedValue([mockBill]),
  generateNegotiationScript: jest.fn().mockResolvedValue(mockScript),
  analyzeMarketRates: jest.fn().mockResolvedValue(mockMarketAnalysis),
};

describe("POST /api/financial/bills/[id]/negotiate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user-1@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    // Re-set nested mock implementations (resetMocks: true strips them)
    mockBillNegotiator.identifyNegotiableBills.mockResolvedValue([mockBill]);
    mockBillNegotiator.generateNegotiationScript.mockResolvedValue(mockScript);
    mockBillNegotiator.analyzeMarketRates.mockResolvedValue(mockMarketAnalysis);
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (getBillNegotiator as jest.Mock).mockReturnValue(mockBillNegotiator);
  });

  it("should generate a negotiation script successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/negotiate", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.script).toBeDefined();
    expect(data.data.bill.id).toBe("bill-1");
    expect(data.data.marketContext).toBeDefined();
  });

  it("should pass user profile when provided", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/negotiate", {
      method: "POST",
      body: { userTenure: 24, paymentHistory: "excellent", loyaltyScore: 90 },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockBillNegotiator.generateNegotiationScript).toHaveBeenCalledWith(
      mockBill,
      expect.objectContaining({ tenure: 24, paymentHistory: "excellent", loyaltyScore: 90 }),
    );
  });

  it("should return 404 when bill not found", async () => {
    mockBillNegotiator.identifyNegotiableBills.mockResolvedValue([]);
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-999/negotiate", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Bill not found");
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = { status: 401, json: async () => ({ error: "Unauthorized" }) };
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({ error: errorResponse });

    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/negotiate", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);

    expect(res).toBe(errorResponse);
  });

  it("should return 400 for zod validation error", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/negotiate", {
      method: "POST",
      body: { userTenure: -5 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Validation error");
  });

  it("should return 500 on service error", async () => {
    mockBillNegotiator.identifyNegotiableBills.mockRejectedValue(new Error("Service error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1/negotiate", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Internal server error");
  });
});

describe("negative-auth – /api/financial/bills/bill-1/negotiate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(createMockRequest("http://localhost:3000/api/financial/bills/bill-1/negotiate", { method: "POST" }));
    expect(res.status).toBe(401);
  });
});
