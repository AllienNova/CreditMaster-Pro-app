/**
 * Tests for /api/financial/health-score/v2
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/financial/health-score-calculator-v2");
jest.mock("@/lib/financial/financial-aggregation-service");

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { healthScoreCalculatorV2 } from "@/lib/financial/health-score-calculator-v2";
import { financialAggregationService } from "@/lib/financial/financial-aggregation-service";

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

const mockHealthScore = {
  overallScore: 78,
  grade: "C+",
  breakdown: {},
  quickWins: [],
  calculatedAt: new Date("2026-01-15"),
  dataQuality: "good",
};

const mockContext = { accounts: {}, budgets: {} };

describe("GET /api/financial/health-score/v2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (financialAggregationService.getAggregatedContext as jest.Mock).mockResolvedValue(mockContext);
    (healthScoreCalculatorV2.calculateScore as jest.Mock).mockResolvedValue(mockHealthScore);
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest("http://localhost:3000/api/financial/health-score/v2");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 when accessing another user's data", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/health-score/v2?userId=other-user",
    );
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should calculate health score v2 successfully", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/health-score/v2");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meta.version).toBe(2);
    expect(financialAggregationService.getAggregatedContext).toHaveBeenCalledWith("user-123");
  });

  it("should pass query params as options", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/health-score/v2?includeProjections=false&ageGroup=25-34",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(healthScoreCalculatorV2.calculateScore).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          includeProjections: false,
          ageGroup: "25-34",
        }),
      }),
    );
  });

  it("should return 500 on service error", async () => {
    (financialAggregationService.getAggregatedContext as jest.Mock).mockRejectedValue(
      new Error("Service error"),
    );
    const request = createMockRequest("http://localhost:3000/api/financial/health-score/v2");
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});

describe("POST /api/financial/health-score/v2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (financialAggregationService.getAggregatedContext as jest.Mock).mockResolvedValue(mockContext);
    (healthScoreCalculatorV2.calculateScore as jest.Mock).mockResolvedValue(mockHealthScore);
    (healthScoreCalculatorV2.saveScore as jest.Mock).mockResolvedValue(undefined);
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest("http://localhost:3000/api/financial/health-score/v2", {
      method: "POST",
      body: {},
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 when targeting another user", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/health-score/v2", {
      method: "POST",
      body: { userId: "other-user" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("should calculate and return health score without saving", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/health-score/v2", {
      method: "POST",
      body: { saveScore: false },
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meta.saved).toBe(false);
    expect(healthScoreCalculatorV2.saveScore).not.toHaveBeenCalled();
  });

  it("should calculate and save health score when saveScore=true", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/health-score/v2", {
      method: "POST",
      body: { saveScore: true },
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.meta.saved).toBe(true);
    expect(healthScoreCalculatorV2.saveScore).toHaveBeenCalledWith("user-123", mockHealthScore);
  });

  it("should return 500 on service error", async () => {
    (healthScoreCalculatorV2.calculateScore as jest.Mock).mockRejectedValue(
      new Error("Calculation failed"),
    );
    const request = createMockRequest("http://localhost:3000/api/financial/health-score/v2", {
      method: "POST",
      body: {},
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
