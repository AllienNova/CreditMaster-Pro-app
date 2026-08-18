/**
 * @jest-environment node
 *
 * GET /api/financial/real-estate — the caller's own properties and summary.
 *
 * This route exists to expose a feature that was already built and
 * unreachable. `real_estate_tracking` has existed since migration
 * 20260731000081_real_estate_tracking, and real-estate-tracking-service.ts
 * makes 27 database calls against it, but nothing imported that service except
 * src/lib/financial/index.ts (a barrel) and its own test. Meanwhile
 * /financial/real-estate rendered a hardcoded property portfolio to every
 * visitor.
 *
 * These tests drive the REAL withAuth guard (only its two dependencies —
 * jwt-validation and resolve-role — are mocked), so they prove the route is
 * genuinely authenticated and user-scoped, not merely that a fake guard was
 * injected. The tracking service is mocked to control the data.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGetUserProperties = jest.fn();
const mockGetPortfolioSummary = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/financial/real-estate-tracking-service", () => ({
  getRealEstateTrackingService: () => ({
    getUserProperties: (...args: unknown[]) => mockGetUserProperties(...args),
    getPortfolioSummary: (...args: unknown[]) =>
      mockGetPortfolioSummary(...args),
  }),
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

const AUTHED_USER_ID = "user-property-1";

function authenticate(userId: string = AUTHED_USER_ID): void {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: userId, email: "owner@example.com" },
  });
  mockResolveRole.mockResolvedValue("user");
}

function makeRequest(
  url = "http://localhost:3000/api/financial/real-estate",
): NextRequest {
  return new NextRequest(url);
}

const SUMMARY = {
  totalProperties: 1,
  totalValue: 420_000,
  totalEquity: 240_000,
  totalDebt: 180_000,
  netMonthlyCashFlow: 850,
  totalAppreciation: 120_000,
  appreciationPercent: 40,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/financial/real-estate", () => {
  it("returns the caller's properties and summary", async () => {
    authenticate();
    mockGetUserProperties.mockResolvedValue([
      { id: "p1", name: "Maple Street", type: "rental", currentValue: 420_000 },
    ]);
    mockGetPortfolioSummary.mockResolvedValue(SUMMARY);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.properties).toHaveLength(1);
    expect(body.data.summary).toEqual(SUMMARY);
  });

  it("scopes both service calls to the authenticated user", async () => {
    authenticate("user-property-2");
    mockGetUserProperties.mockResolvedValue([]);
    mockGetPortfolioSummary.mockResolvedValue(SUMMARY);

    await GET(makeRequest());

    // IDOR: the id comes from the guard, never the request.
    expect(mockGetUserProperties).toHaveBeenCalledWith("user-property-2");
    expect(mockGetPortfolioSummary).toHaveBeenCalledWith("user-property-2");
  });

  it("ignores a userId supplied in the query string", async () => {
    authenticate("user-property-3");
    mockGetUserProperties.mockResolvedValue([]);
    mockGetPortfolioSummary.mockResolvedValue(SUMMARY);

    await GET(
      makeRequest(
        "http://localhost:3000/api/financial/real-estate?userId=someone-else",
      ),
    );

    expect(mockGetUserProperties).toHaveBeenCalledWith("user-property-3");
    expect(mockGetUserProperties).not.toHaveBeenCalledWith("someone-else");
  });

  it("rejects an unauthenticated caller", async () => {
    mockValidate.mockResolvedValue({ valid: false });

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockGetUserProperties).not.toHaveBeenCalled();
  });

  it("returns an empty list for a caller with no properties, not an error", async () => {
    authenticate();
    mockGetUserProperties.mockResolvedValue([]);
    mockGetPortfolioSummary.mockResolvedValue({
      ...SUMMARY,
      totalProperties: 0,
      totalValue: 0,
      totalEquity: 0,
      totalDebt: 0,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.properties).toEqual([]);
  });

  it("surfaces a 500 rather than fabricating a property", async () => {
    authenticate();
    mockGetUserProperties.mockRejectedValue(new Error("db down"));

    const res = await GET(makeRequest());
    const body = await res.json();

    // An empty portfolio and a broken backend must never look the same.
    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
  });
});
