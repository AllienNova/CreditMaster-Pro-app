/**
 * Tests for /api/financial/ai-insights.
 *
 * - Negative-auth: 401 unauthenticated, 403 without financial:read.
 * - Real data (PARITY-P1): healthScore/healthTrend come from
 *   vitalityScoreService, and predictions from spendingForecastService — the
 *   route previously hardcoded healthScore = 78 and a fabricated predictions
 *   array with a lying "ML forecasting model" comment.
 * - Fallback: on a service error the route returns empty/zeroed fallback data.
 */

import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/smart-insights-engine");
jest.mock("@/lib/financial/vitality-score-service", () => ({
  vitalityScoreService: { calculateVitalityScore: jest.fn() },
}));
jest.mock("@/lib/financial/spending-forecast-service", () => ({
  spendingForecastService: { generateForecast: jest.fn() },
}));

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { smartInsightsEngine } from "@/lib/financial/smart-insights-engine";
import { vitalityScoreService } from "@/lib/financial/vitality-score-service";
import { spendingForecastService } from "@/lib/financial/spending-forecast-service";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(): NextRequest {
  const url = "http://localhost:3000/api/financial/ai-insights";
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const mockInsightsResult = {
  insights: [
    {
      id: "ins-1",
      type: "savings_opportunity",
      title: "Reduce dining spending",
      description: "You spent 30% more on dining this month",
      priority: "high",
      actionUrl: "/budgets",
      actionLabel: "View Budgets",
    },
  ],
  generatedAt: "2026-01-15T10:00:00Z",
  processingTimeMs: 150,
};

// currentMonthlyAvg sums to 2900, predictedSpending 2750 — deliberately NOT the
// old hardcoded 3200/3050, so a coincidental pass can't hide a regression.
function forecast(trend: "increasing" | "decreasing" | "stable" = "decreasing") {
  return {
    predictions: [
      {
        predictedSpending: 2750,
        monthLabel: "Feb 2026",
        trend,
        confidenceInterval: { low: 2600, high: 2900, confidence: 0.9 },
      },
    ],
    categoryForecasts: [
      { currentMonthlyAvg: 1800, predictedMonthlyAvg: 1700 },
      { currentMonthlyAvg: 1100, predictedMonthlyAvg: 1050 },
    ],
  };
}

describe("GET /api/financial/ai-insights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (smartInsightsEngine.generateInsights as jest.Mock).mockResolvedValue(
      mockInsightsResult,
    );
    (vitalityScoreService.calculateVitalityScore as jest.Mock).mockResolvedValue(
      { overall: 82, trend: "improving", grade: "B" },
    );
    (spendingForecastService.generateForecast as jest.Mock).mockResolvedValue(
      forecast("decreasing"),
    );
  });

  describe("negative-auth", () => {
    it("returns 401 for an unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      expect((await GET(createMockRequest())).status).toBe(401);
    });

    it("returns 403 without financial:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      expect((await GET(createMockRequest())).status).toBe(403);
    });
  });

  it("returns the real vitality health score + forecast prediction (not the hardcoded 78/3200)", async () => {
    const data = (await (await GET(createMockRequest())).json()).data;

    expect(data.healthScore).toBe(82); // from vitality.overall, not 78
    expect(data.healthTrend).toBe("improving"); // vitality.trend passes through
    expect(data.predictions).toEqual([
      {
        metric: "Monthly Spending",
        currentValue: 2900, // sum of categoryForecasts currentMonthlyAvg
        predictedValue: 2750, // predictions[0].predictedSpending
        timeframe: "Feb 2026",
        confidence: 90, // confidenceInterval.confidence * 100
        trend: "down", // "decreasing" → "down"
      },
    ]);
  });

  it("maps forecast trend increasing→up and stable→stable", async () => {
    (spendingForecastService.generateForecast as jest.Mock).mockResolvedValue(
      forecast("increasing"),
    );
    expect(
      (await (await GET(createMockRequest())).json()).data.predictions[0].trend,
    ).toBe("up");

    (spendingForecastService.generateForecast as jest.Mock).mockResolvedValue(
      forecast("stable"),
    );
    expect(
      (await (await GET(createMockRequest())).json()).data.predictions[0].trend,
    ).toBe("stable");
  });

  it("returns empty predictions (no fabricated row) when the forecast has none", async () => {
    (spendingForecastService.generateForecast as jest.Mock).mockResolvedValue({
      predictions: [],
      categoryForecasts: [],
    });
    const data = (await (await GET(createMockRequest())).json()).data;
    expect(data.predictions).toEqual([]);
    expect(data.healthScore).toBe(82); // health score still real
  });

  it("no longer contains the hardcoded 78 / 3200 / ML-model fabrications in source", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "route.ts"),
      "utf-8",
    );
    expect(source).not.toMatch(/healthScore = 78/);
    expect(source).not.toMatch(/currentValue: 3200/);
    expect(source).not.toContain("ML forecasting model");
  });

  it("returns fallback data when the insights service throws", async () => {
    (smartInsightsEngine.generateInsights as jest.Mock).mockRejectedValue(
      new Error("insights boom"),
    );
    const body = await (await GET(createMockRequest())).json();
    expect(body.success).toBe(true);
    expect(body._meta.fallback).toBe(true);
    expect(body.data.insights).toEqual([]);
    expect(body.data.predictions).toEqual([]);
    expect(body.data.healthScore).toBe(0);
  });

  it("returns fallback data when the vitality/forecast service throws", async () => {
    (vitalityScoreService.calculateVitalityScore as jest.Mock).mockRejectedValue(
      new Error("vitality boom"),
    );
    const body = await (await GET(createMockRequest())).json();
    expect(body._meta.fallback).toBe(true);
    expect(body.data.healthScore).toBe(0);
    expect(body.data.predictions).toEqual([]);
  });

  it("maps insight types to the panel union", async () => {
    const data = (await (await GET(createMockRequest())).json()).data;
    expect(["opportunity", "warning", "tip", "prediction"]).toContain(
      data.insights[0].type,
    );
  });
});
