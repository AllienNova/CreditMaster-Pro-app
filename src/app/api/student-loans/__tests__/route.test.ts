/**
 * /api/student-loans — auth AND behaviour.
 *
 * This file used to contain one test: "GET returns 401 when not authenticated".
 * That is why it survived the route being rewritten from a federal-NSLDS mock
 * into a real read of public.student_loans without a single assertion changing.
 * A negative-auth test proves the guard is wired; it says nothing about whether
 * the route reports the truth. It also went on mocking
 * @/lib/federal-integration-service, which the route no longer imports.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockLimit = jest.fn();
const mockEq = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          mockEq(...args);
          return { order: () => ({ limit: () => mockLimit() }) };
        },
      }),
    }),
  },
}));

import { GET } from "../route";

function createMockRequest(): NextRequest {
  const url = "http://localhost:3000/api/student-loans";
  return {
    url,
    method: "GET",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
    signal: { addEventListener: jest.fn() },
  } as unknown as NextRequest;
}

const loan = (over: Record<string, unknown> = {}) => ({
  loan_id: "L1",
  loan_type: "direct_subsidized",
  servicer_name: "Nelnet",
  current_balance: 10000,
  interest_rate: 5,
  loan_status: "repayment",
  disbursement_date: "2020-09-01",
  ...over,
});

describe("/api/student-loans", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await GET(createMockRequest());
    expect(res.status).toBe(401);
  });

  it("scopes the read to the caller's own user_id", async () => {
    await GET(createMockRequest());
    // The IDOR-relevant assertion: not merely "an eq() happened", but that it
    // filtered on the authenticated id rather than anything client-supplied.
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  describe("when the read fails", () => {
    it("returns 500 rather than an empty list", async () => {
      mockLimit.mockResolvedValue({ data: null, error: { message: "boom" } });
      const res = await GET(createMockRequest());
      expect(res.status).toBe(500);
    });

    it("does not answer with loans: [], which reads as 'you have none'", async () => {
      mockLimit.mockResolvedValue({ data: null, error: { message: "boom" } });
      const body = await (await GET(createMockRequest())).json();
      expect(body.loans).toBeUndefined();
      expect(body.error).toBeTruthy();
    });
  });

  describe("empty portfolio", () => {
    it("reports zero loans without inventing a rate", async () => {
      const body = await (await GET(createMockRequest())).json();
      expect(body.analysis.total_loans).toBe(0);
      expect(body.analysis.total_debt).toBe(0);
      // null, NOT 0 — "you pay 0%" is a false claim about someone's debt.
      expect(body.analysis.weighted_interest_rate).toBeNull();
    });

    it("states that no federal sync has happened, so empty is not read as 'no federal loans'", async () => {
      const body = await (await GET(createMockRequest())).json();
      expect(body.source).toBe("tracked");
      expect(body.federalSync.connected).toBe(false);
      expect(body.federalSync.reason).toMatch(/NSLDS|federal/i);
    });
  });

  describe("portfolio arithmetic", () => {
    it("weights the rate by balance, not by loan count", async () => {
      // $2k @ 9% and $60k @ 3%. A plain mean says 6%, which would badly
      // misrepresent what this borrower actually pays.
      mockLimit.mockResolvedValue({
        data: [
          loan({ current_balance: 2000, interest_rate: 9 }),
          loan({ loan_id: "L2", current_balance: 60000, interest_rate: 3 }),
        ],
        error: null,
      });
      const body = await (await GET(createMockRequest())).json();
      // (2000*9 + 60000*3) / 62000 = 3.1935… -> 3.19
      expect(body.analysis.weighted_interest_rate).toBe(3.19);
      expect(body.analysis.total_debt).toBe(62000);
    });

    it("handles numeric columns arriving as strings from Postgres", async () => {
      mockLimit.mockResolvedValue({
        data: [loan({ current_balance: "10000.50", interest_rate: "4.5" })],
        error: null,
      });
      const body = await (await GET(createMockRequest())).json();
      expect(body.analysis.total_debt).toBe(10000.5);
      expect(body.analysis.weighted_interest_rate).toBe(4.5);
    });

    it("groups by status and servicer", async () => {
      mockLimit.mockResolvedValue({
        data: [
          loan({ loan_status: "repayment", servicer_name: "Nelnet" }),
          loan({ loan_id: "L2", loan_status: "default", servicer_name: "Nelnet" }),
          loan({ loan_id: "L3", loan_status: "repayment", servicer_name: "MOHELA" }),
        ],
        error: null,
      });
      const body = await (await GET(createMockRequest())).json();
      expect(body.analysis.loans_by_status).toEqual({ repayment: 2, default: 1 });
      expect(body.analysis.loans_by_servicer).toEqual({ Nelnet: 2, MOHELA: 1 });
    });

    it("buckets a missing servicer as 'unknown' instead of dropping the loan", async () => {
      mockLimit.mockResolvedValue({
        data: [loan({ servicer_name: "" })],
        error: null,
      });
      const body = await (await GET(createMockRequest())).json();
      expect(body.analysis.loans_by_servicer).toEqual({ unknown: 1 });
      expect(body.analysis.total_loans).toBe(1);
    });
  });
});
