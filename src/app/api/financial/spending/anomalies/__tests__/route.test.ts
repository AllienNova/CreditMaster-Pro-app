/**
 * Tests for /api/financial/spending/anomalies
 *
 * Coverage:
 * - GET endpoint (anomaly detection)
 * - Middleware auth flow
 * - Query parameter validation
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/api/financial-api-middleware");
jest.mock("@/lib/financial/spending-analyzer");
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/rbac");

import { GET } from "../route";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { getSpendingAnalyzer } from "@/lib/financial/spending-analyzer";

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

const mockAnomaliesResult = {
  anomalies: [
    { id: "a1", type: "spike", amount: 500, category: "dining" },
  ],
  summary: {
    requiresImmediateAction: false,
    totalAnomalies: 1,
  },
};

const mockAnalyzer = {
  detectAnomalies: jest.fn().mockResolvedValue(mockAnomaliesResult),
};

describe("GET /api/financial/spending/anomalies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      userId: "user-123",
      startTime: Date.now(),
    });
    (finalizeResponse as jest.Mock).mockImplementation((_req: unknown, res: unknown) => res);
    (getSpendingAnalyzer as jest.Mock).mockReturnValue(mockAnalyzer);
    mockAnalyzer.detectAnomalies.mockResolvedValue(mockAnomaliesResult);
  });

  it("should return anomalies with default params", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/anomalies",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockAnomaliesResult);
    expect(mockAnalyzer.detectAnomalies).toHaveBeenCalledWith(
      "user-123",
      "medium",
      30,
    );
  });

  it("should respect sensitivity and timeframe query parameters", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/anomalies?sensitivity=high&timeframe=90",
    );
    await GET(request);

    expect(mockAnalyzer.detectAnomalies).toHaveBeenCalledWith(
      "user-123",
      "high",
      90,
    );
  });

  it("should return middleware error when auth fails", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
    (applyFinancialAPIMiddleware as jest.Mock).mockResolvedValue({
      error: errorResponse,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/anomalies",
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should return 500 on analyzer error", async () => {
    mockAnalyzer.detectAnomalies.mockRejectedValue(new Error("Detection failed"));

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/anomalies",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });

  it("should include meta information in response", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/anomalies?sensitivity=low&timeframe=60",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toBeDefined();
    expect(data.meta.userId).toBe("user-123");
    expect(data.meta.sensitivity).toBe("low");
    expect(data.meta.timeframe).toBe(60);
    expect(data.meta.anomaliesDetected).toBe(1);
  });
});
