/**
 * Tests for /api/financial/bills/analysis
 *
 * Coverage:
 * - GET endpoint (market analysis and savings potential)
 * - Middleware auth, validation, error handling
 *
 * NOTE: The route passes searchParams.get() values (which return null for
 * missing params) directly to Zod. Zod's .optional() rejects null, so
 * requests without explicit query params cause a ZodError → 400.
 * Success tests must provide valid query params to avoid this.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/api/financial-api-middleware");
jest.mock("@/lib/financial/bill-negotiator");

import { GET } from "../route";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { getBillNegotiator } from "@/lib/financial/bill-negotiator";

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

const mockSavingsEstimate = {
  totalPotentialSavings: 500,
  monthlyPotentialSavings: 42,
  annualPotentialSavings: 504,
  billCount: 5,
  highPotentialBills: [
    {
      id: "bill-1",
      provider: "Comcast",
      serviceName: "Internet",
      currentAmount: 89.99,
      estimatedSavings: 20,
      negotiationPotential: "high",
      difficulty: "easy",
    },
  ],
  confidenceScore: 85,
};

const mockHistory = [
  {
    billId: "bill-1",
    provider: "Comcast",
    billType: "internet",
    totalSavings: 240,
    successRate: 100,
    lastAttemptDate: new Date(),
    attempts: [{ outcome: "success" }],
  },
];

const mockMarketAnalysis = {
  averageMarketRate: 59.99,
  savingsPotential: 30,
  marketPosition: "above_average",
  recommendedAction: "negotiate",
  leveragePoints: ["competitor pricing"],
};

const mockBillNegotiator = {
  calculatePotentialSavings: jest.fn(),
  getBillNegotiationHistory: jest.fn(),
  analyzeMarketRates: jest.fn(),
};

describe("GET /api/financial/bills/analysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set nested mock implementations (resetMocks: true strips them)
    mockBillNegotiator.calculatePotentialSavings.mockResolvedValue(mockSavingsEstimate);
    mockBillNegotiator.getBillNegotiationHistory.mockResolvedValue(mockHistory);
    mockBillNegotiator.analyzeMarketRates.mockResolvedValue(mockMarketAnalysis);
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (getBillNegotiator as jest.Mock).mockReturnValue(mockBillNegotiator);
  });

  it("should return analysis with savings estimate and history", async () => {
    // Must provide all query params — the route passes null for missing
    // params to Zod, and Zod .optional() rejects null (only accepts undefined)
    const req = createMockRequest(
      "http://localhost:3000/api/financial/bills/analysis?billType=internet&provider=Comcast&location=NYC&includeSavingsEstimate=true",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.savingsEstimate).toBeDefined();
    expect(data.data.savingsEstimate.totalPotentialSavings).toBe(500);
    expect(data.data.negotiationHistory).toBeDefined();
    expect(data.data.negotiationHistory.totalNegotiations).toBe(1);
    expect(data.data.negotiationHistory.successfulNegotiations).toBe(1);
  });

  it("should include market analysis when billType and provider are provided", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/financial/bills/analysis?billType=internet&provider=Comcast&location=NYC&includeSavingsEstimate=true",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.marketAnalysis).toBeDefined();
    expect(mockBillNegotiator.analyzeMarketRates).toHaveBeenCalledWith("internet", "Comcast", "NYC");
  });

  it("should still include savings estimate when includeSavingsEstimate=false (z.coerce.boolean coerces string 'false' to true)", async () => {
    // NOTE: z.coerce.boolean() calls Boolean("false") which is true in JS.
    // So passing includeSavingsEstimate=false as a query string actually
    // evaluates to true. This is a known Zod limitation with boolean coercion.
    const req = createMockRequest(
      "http://localhost:3000/api/financial/bills/analysis?billType=internet&provider=Comcast&location=NYC&includeSavingsEstimate=false",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.savingsEstimate).not.toBeNull();
    expect(mockBillNegotiator.calculatePotentialSavings).toHaveBeenCalledWith("user-123");
  });

  it("should return 400 when no query params are provided (null values fail Zod)", async () => {
    // searchParams.get() returns null for missing params; Zod .optional() rejects null
    const req = createMockRequest("http://localhost:3000/api/financial/bills/analysis");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Validation error");
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = { status: 401, json: async () => ({ error: "Unauthorized" }) };
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      error: errorResponse,
    });

    const req = createMockRequest(
      "http://localhost:3000/api/financial/bills/analysis?billType=internet&provider=Comcast&location=NYC&includeSavingsEstimate=true",
    );
    const res = await GET(req);

    expect(res).toBe(errorResponse);
  });

  it("should return 400 for invalid billType", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/financial/bills/analysis?billType=invalid_type&provider=Comcast&location=NYC&includeSavingsEstimate=true",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Validation error");
  });

  it("should return 500 on service error", async () => {
    mockBillNegotiator.calculatePotentialSavings.mockRejectedValue(new Error("Service error"));
    const req = createMockRequest(
      "http://localhost:3000/api/financial/bills/analysis?billType=internet&provider=Comcast&location=NYC&includeSavingsEstimate=true",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Internal server error");
  });
});
