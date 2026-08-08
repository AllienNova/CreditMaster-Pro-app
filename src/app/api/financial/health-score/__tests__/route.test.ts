/**
 * Tests for /api/financial/health-score
 *
 * Coverage:
 * - GET endpoint (get current health score)
 * - POST endpoint (calculate and save new score)
 * - Authentication and Authorization
 * - Caching behavior
 * - Error handling
 */

import { NextRequest } from "next/server";

// Build supabase mock chain BEFORE importing the route
const mockBuilder: Record<string, jest.Mock> = {};
const methods = [
  "from", "select", "insert", "update", "delete", "eq", "neq",
  "gt", "gte", "lt", "lte", "order", "limit", "range", "in",
  "is", "match", "single", "maybeSingle", "or", "not", "filter",
  "ilike", "like", "contains", "rpc",
];
methods.forEach((m) => {
  mockBuilder[m] = jest.fn();
});
Object.keys(mockBuilder).forEach((key) => {
  if (key !== "then" && key !== "single" && key !== "maybeSingle")
    mockBuilder[key].mockReturnValue(mockBuilder);
});
mockBuilder.single.mockResolvedValue({ data: null, error: null });
mockBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
mockBuilder.then = jest
  .fn()
  .mockImplementation((resolve) => resolve({ data: [], error: null }));

const mockSupabase = {
  from: mockBuilder.from,
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
};

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: () => mockSupabase,
}));

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/health-score-calculator-v2");
jest.mock("@/lib/financial/financial-aggregation-service");

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { healthScoreCalculatorV2 } from "@/lib/financial/health-score-calculator-v2";
import { financialAggregationService } from "@/lib/financial/financial-aggregation-service";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

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
  breakdown: {
    savings: { score: 70 },
    debt: { score: 80 },
    spending: { score: 75 },
    credit: { score: 85 },
    investments: { score: 65 },
    insurance: { score: 90 },
  },
  quickWins: [
    {
      action: "Increase savings",
      timeframe: "30 days",
      estimatedImprovement: 10,
      effort: "medium",
      component: "savings",
    },
  ],
  percentileRank: 65,
  ageGroupRank: 70,
  incomeGroupRank: 60,
  calculatedAt: new Date("2026-01-15"),
  trendDirection: "up",
  trendPercent: 5,
  projectedScore30Days: 82,
  projectedScore90Days: 88,
};

const mockContext = { accounts: {}, budgets: {}, goals: {} };

describe("GET /api/financial/health-score", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    // Re-set supabase mock chain
    Object.keys(mockBuilder).forEach((key) => {
      if (key !== "then" && key !== "single" && key !== "maybeSingle") {
        mockBuilder[key].mockReturnValue(mockBuilder);
      }
    });
    mockBuilder.single.mockResolvedValue({ data: null, error: null });
    mockBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockBuilder.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null }),
    );
    // Re-set auth
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (financialAggregationService.getAggregatedContext as jest.Mock).mockResolvedValue(mockContext);
    (healthScoreCalculatorV2.calculateScore as jest.Mock).mockResolvedValue(mockHealthScore);
    (healthScoreCalculatorV2.saveScore as jest.Mock).mockResolvedValue(undefined);
    (healthScoreCalculatorV2.getGrade as jest.Mock).mockReturnValue("C+");
    (healthScoreCalculatorV2.getScoreHistory as jest.Mock).mockResolvedValue([]);
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest("http://localhost:3000/api/financial/health-score");
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest("http://localhost:3000/api/financial/health-score");
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(403);
    });
  });

  it("should return historical scores when history=true", async () => {
    (healthScoreCalculatorV2.getScoreHistory as jest.Mock).mockResolvedValue([
      { score: 75, date: "2026-01-01" },
    ]);
    const request = createMockRequest(
      "http://localhost:3000/api/financial/health-score?history=true&days=60",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.history).toHaveLength(1);
    expect(healthScoreCalculatorV2.getScoreHistory).toHaveBeenCalledWith("user-123", 60);
  });

  it("should return cached score when available within last hour", async () => {
    const recentDate = new Date().toISOString();
    mockBuilder.single.mockResolvedValue({
      data: {
        overall_score: 78,
        savings_score: 70,
        debt_score: 80,
        spending_score: 75,
        credit_score_component: 85,
        investment_score: 65,
        insurance_score: 90,
        recommendations: [],
        calculated_at: recentDate,
      },
      error: null,
    });
    const request = createMockRequest("http://localhost:3000/api/financial/health-score");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data._meta.cached).toBe(true);
  });

  it("should calculate new score when no cached score exists", async () => {
    mockBuilder.single.mockResolvedValue({ data: null, error: null });
    const request = createMockRequest("http://localhost:3000/api/financial/health-score");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data._meta.cached).toBe(false);
    expect(financialAggregationService.getAggregatedContext).toHaveBeenCalledWith("user-123");
    expect(healthScoreCalculatorV2.calculateScore).toHaveBeenCalled();
    expect(healthScoreCalculatorV2.saveScore).toHaveBeenCalled();
  });

  it("should return 500 on service error", async () => {
    (financialAggregationService.getAggregatedContext as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );
    mockBuilder.single.mockResolvedValue({ data: null, error: null });
    const request = createMockRequest("http://localhost:3000/api/financial/health-score");
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Database error");
  });
});

describe("POST /api/financial/health-score", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    Object.keys(mockBuilder).forEach((key) => {
      if (key !== "then" && key !== "single" && key !== "maybeSingle") {
        mockBuilder[key].mockReturnValue(mockBuilder);
      }
    });
    mockBuilder.single.mockResolvedValue({ data: null, error: null });
    mockBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockBuilder.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null }),
    );
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (financialAggregationService.getAggregatedContext as jest.Mock).mockResolvedValue(mockContext);
    (healthScoreCalculatorV2.calculateScore as jest.Mock).mockResolvedValue(mockHealthScore);
    (healthScoreCalculatorV2.saveScore as jest.Mock).mockResolvedValue(undefined);
    (healthScoreCalculatorV2.getGrade as jest.Mock).mockReturnValue("C+");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest("http://localhost:3000/api/financial/health-score", {
        method: "POST",
        body: {},
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest("http://localhost:3000/api/financial/health-score", {
        method: "POST",
        body: {},
      });
      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });

  it("should calculate and save new score with forceRecalculate=true", async () => {
    const request = createMockRequest("http://localhost:3000/api/financial/health-score", {
      method: "POST",
      body: { forceRecalculate: true },
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.overall).toBe(78);
    expect(data.message).toContain("calculated and saved");
    expect(healthScoreCalculatorV2.calculateScore).toHaveBeenCalled();
  });

  it("should return cached score when forceRecalculate=false and recent score exists", async () => {
    const recentDate = new Date().toISOString();
    mockBuilder.single.mockResolvedValue({
      data: {
        overall_score: 78,
        savings_score: 70,
        debt_score: 80,
        spending_score: 75,
        credit_score_component: 85,
        investment_score: 65,
        insurance_score: 90,
        recommendations: [],
        calculated_at: recentDate,
      },
      error: null,
    });
    const request = createMockRequest("http://localhost:3000/api/financial/health-score", {
      method: "POST",
      body: { forceRecalculate: false },
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data._meta.cached).toBe(true);
  });

  it("should return 500 on service error", async () => {
    (financialAggregationService.getAggregatedContext as jest.Mock).mockRejectedValue(
      new Error("Service unavailable"),
    );
    const request = createMockRequest("http://localhost:3000/api/financial/health-score", {
      method: "POST",
      body: { forceRecalculate: true },
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
