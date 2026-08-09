/**
 * Auth tests for /api/investments/analytics/correlation (TASK-AUTH-03e / TASK-INV coverage)
 */

import { NextRequest } from "next/server";

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
jest.mock("@/lib/investments/portfolio-analytics", () => ({
  PortfolioAnalytics: jest.fn(),
}));
jest.mock("@/lib/security/redis-rate-limiting", () => ({
  rateLimit: jest.fn(() => ({ check: jest.fn() })),
}));

import { GET } from "../route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const AUTH_USER = { id: "user-123", email: "test@example.com" };

function getPortfolioAnalyticsMock() {
  return jest.requireMock("@/lib/investments/portfolio-analytics") as {
    PortfolioAnalytics: jest.Mock;
  };
}

function createMockRequest(url: string): NextRequest {
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/investments/analytics/correlation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    getPortfolioAnalyticsMock().PortfolioAnalytics.mockImplementation(() => ({}));
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await GET(
      createMockRequest(
        "http://localhost:3000/api/investments/analytics/correlation",
      ),
    );
    expect(res.status).toBe(401);
  });
});

describe("authenticated – /api/investments/analytics/correlation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: AUTH_USER });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("GET instantiates PortfolioAnalytics with user.id and returns 200 on success", async () => {
    const fakeMatrix = { correlations: [], averageCorrelation: 0 };
    const mockGetCorrelationMatrix = jest.fn().mockResolvedValue(fakeMatrix);
    const { PortfolioAnalytics } = getPortfolioAnalyticsMock();
    PortfolioAnalytics.mockImplementation(() => ({
      getCorrelationMatrix: mockGetCorrelationMatrix,
    }));

    const url = `http://localhost:3000/api/investments/analytics/correlation?portfolioId=${VALID_UUID}`;
    const res = await GET(createMockRequest(url));

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown };
    expect(body.success).toBe(true);
    expect(body.data).toEqual(fakeMatrix);
    expect(PortfolioAnalytics).toHaveBeenCalledWith(AUTH_USER.id);
  });

  it("GET returns 400 when portfolioId is missing", async () => {
    getPortfolioAnalyticsMock().PortfolioAnalytics.mockImplementation(() => ({}));
    const url = "http://localhost:3000/api/investments/analytics/correlation";
    const res = await GET(createMockRequest(url));
    expect(res.status).toBe(400);
  });
});
