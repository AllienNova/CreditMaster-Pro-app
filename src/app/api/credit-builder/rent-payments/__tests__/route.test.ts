/**
 * GET /api/credit-builder/rent-payments
 *
 * This route is the first way into rent reporting — a marketed credit-building
 * feature whose tables and service existed with no route behind them, while the
 * screen that should have shown its data rendered a hardcoded Discover payment
 * five days late instead.
 *
 * Two things are worth pinning beyond the happy path:
 *
 *  1. An empty list is a real answer. A user who has not set up rent reporting
 *     has no payments, and that must not be conflated with a failed lookup —
 *     they lead to opposite actions.
 *  2. estimatedScoreImpact must never appear. getReportingStats computes it as
 *     min(50, months*2) + 10 + 10, which nothing measures. Beside real payment
 *     rows it would read as a measured score change.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetAllPayments = jest.fn();
const mockGetUserAccounts = jest.fn();
const mockGetReportingStats = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/credit/services/RentReportingService", () => ({
  getRentReportingService: () => ({
    getAllPayments: (...a: unknown[]) => mockGetAllPayments(...a),
    getUserAccounts: (...a: unknown[]) => mockGetUserAccounts(...a),
    getReportingStats: (...a: unknown[]) => mockGetReportingStats(...a),
  }),
}));

import { GET } from "../route";

const USER = "user-1";

const PAYMENT = {
  id: "pay-1",
  accountId: "acct-1",
  userId: USER,
  amount: 1450,
  dueDate: "2026-08-01T00:00:00.000Z",
  paidDate: "2026-07-31T00:00:00.000Z",
  status: "on_time",
  reportedToCredit: true,
  bureausReported: ["experian", "transunion"],
};

const ACCOUNT = {
  id: "acct-1",
  userId: USER,
  provider: "rentreporters",
  status: "active",
  landlordName: "Ada Property Co",
  propertyAddress: "12 Bridge St",
  monthlyRent: 1450,
};

function req(): NextRequest {
  const url = "http://localhost:3000/api/credit-builder/rent-payments";
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: USER, email: "user@example.com" },
  });
  mockResolveRoleFromDb.mockResolvedValue("user");
  mockGetAllPayments.mockResolvedValue([PAYMENT]);
  mockGetUserAccounts.mockResolvedValue([ACCOUNT]);
});

describe("GET /api/credit-builder/rent-payments", () => {
  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(req())).status).toBe(401);
  });

  it("asks only for the AUTHENTICATED user's rows", async () => {
    await GET(req());
    expect(mockGetAllPayments).toHaveBeenCalledWith(USER);
    expect(mockGetUserAccounts).toHaveBeenCalledWith(USER);
  });

  it("returns the payments and the accounts that report them", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      payments: [PAYMENT],
      accounts: [ACCOUNT],
    });
  });

  it("returns empty lists for a user with no rent reporting set up", async () => {
    // This is the state almost every user is in. It must be representable —
    // the screen this replaces had no way to say "nothing tracked yet".
    mockGetAllPayments.mockResolvedValue([]);
    mockGetUserAccounts.mockResolvedValue([]);
    expect(await (await GET(req())).json()).toEqual({
      payments: [],
      accounts: [],
    });
  });

  it("never calls getReportingStats", async () => {
    // estimatedScoreImpact is min(50, months*2) + 10 + 10 — an invented
    // formula. Beside real payments it would read as a measured score change.
    await GET(req());
    expect(mockGetReportingStats).not.toHaveBeenCalled();
  });

  it("does not put estimatedScoreImpact in the response", async () => {
    const body = await (await GET(req())).json();
    expect(JSON.stringify(body)).not.toContain("estimatedScoreImpact");
  });

  describe("when the lookup fails", () => {
    beforeEach(() =>
      mockGetAllPayments.mockRejectedValue(new Error("db down")),
    );

    it("returns 500, not an empty list", async () => {
      // An empty list here would tell a user with rent reporting active that
      // they have no payment history — the opposite of the truth.
      const res = await GET(req());
      expect(res.status).toBe(500);
      expect((await res.json()).payments).toBeUndefined();
    });
  });
});
