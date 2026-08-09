/**
 * Tests for /api/financial/spending/forecast
 *
 * Coverage:
 * - GET endpoint (spending forecast)
 * - POST endpoint (forecast summary)
 * - Query parameter validation
 * - Error handling
 * - negative-auth: 401 for unauthenticated requests (route is withAuth-wrapped)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
jest.mock("@/lib/financial/spending-forecast-service");
// TASK-AUTH-03c: route is now wrapped in withAuth.
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));

import { GET, POST } from "../route";
import { spendingForecastService } from "@/lib/financial/spending-forecast-service";

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

const mockForecast = {
  generatedAt: new Date("2025-01-15"),
  forecastPeriod: {
    startDate: new Date("2025-02-01"),
    endDate: new Date("2025-04-30"),
  },
  accuracy: {
    score: 0.85,
    lastValidation: new Date("2025-01-14"),
  },
  predictions: [],
};

const mockSummary = {
  totalPredictedSpend: 5000,
  trend: "increasing",
};

describe("GET /api/financial/spending/forecast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-123", email: "test@example.com" },
    });
    (spendingForecastService.generateForecast as jest.Mock).mockResolvedValue(mockForecast);
  });

  it("should return forecast with default parameters", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generatedAt).toBeDefined();
    expect(data.forecastPeriod).toBeDefined();
    expect(spendingForecastService.generateForecast).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        months: 3,
        includeCategories: true,
        includeSeasonality: true,
        confidenceLevel: 0.95,
        historicalMonths: 12,
      }),
    );
  });

  it("should respect custom query parameters", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast?months=6&confidenceLevel=0.8&historicalMonths=6",
    );
    await GET(request);

    expect(spendingForecastService.generateForecast).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        months: 6,
        confidenceLevel: 0.8,
        historicalMonths: 6,
      }),
    );
  });

  it("should return 400 for months out of range", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast?months=15",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("months must be between 1 and 12");
  });

  it("should return 400 for invalid confidenceLevel", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast?confidenceLevel=1.5",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("confidenceLevel must be between 0.5 and 0.99");
  });

  it("should return 400 for invalid historicalMonths", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast?historicalMonths=30",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("historicalMonths must be between 3 and 24");
  });

  it("should return 500 on service error", async () => {
    (spendingForecastService.generateForecast as jest.Mock).mockRejectedValue(
      new Error("Forecast failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to generate spending forecast");
  });
});

describe("POST /api/financial/spending/forecast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-123", email: "test@example.com" },
    });
    (spendingForecastService.getForecastSummary as jest.Mock).mockResolvedValue(mockSummary);
  });

  it("should return forecast summary for action=summary", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast",
      { method: "POST", body: { action: "summary" } },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockSummary);
    expect(spendingForecastService.getForecastSummary).toHaveBeenCalledWith("user-123");
  });

  it("should return 400 for invalid action", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast",
      { method: "POST", body: { action: "invalid" } },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid action");
  });

  it("should return 500 on service error", async () => {
    (spendingForecastService.getForecastSummary as jest.Mock).mockRejectedValue(
      new Error("Summary failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast",
      { method: "POST", body: { action: "summary" } },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to process forecast request");
  });
});

describe("negative-auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast",
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/spending/forecast",
      { method: "POST", body: { action: "summary" } },
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
