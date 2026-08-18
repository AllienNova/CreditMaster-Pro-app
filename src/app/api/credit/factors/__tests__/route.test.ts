/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/credit/factors (TASK-AUTH-03c).
 * GET is wrapped in withAuth; the route previously had its auth check
 * commented out.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));

const mockAnalyzeCreditAge = jest.fn();
const mockAnalyzeCreditMix = jest.fn();

jest.mock("@/lib/credit-builder/credit-builder-service", () => ({
  creditBuilderService: {
    analyzeCreditAge: (...a: unknown[]) => mockAnalyzeCreditAge(...a),
    analyzeCreditMix: (...a: unknown[]) => mockAnalyzeCreditMix(...a),
  },
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost:3000/api/credit/factors");
}

function age(over: Record<string, unknown> = {}) {
  return {
    averageAge: 8.25,
    oldestAccount: 12,
    newestAccount: 2,
    closedAccountsImpact: 0,
    recommendations: [],
    keepAliveStrategy: [],
    ...over,
  };
}

function mix(over: Record<string, number> = {}) {
  return {
    current: { installment: 1, revolving: 2, mortgage: 0, other: 0, ...over },
    ideal: { installment: 1, revolving: 3, mortgage: 1, other: 0 },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "user-1", email: "user@example.com" },
  });
  mockResolveRole.mockResolvedValue("user");
  mockAnalyzeCreditAge.mockResolvedValue(age());
  mockAnalyzeCreditMix.mockResolvedValue(mix());
});

describe("Credit Factors API – /api/credit/factors", () => {
  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });
      const res = await GET(makeGet());
      expect(res.status).toBe(401);
    });

    it("GET admits an authenticated user (no role gate)", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const res = await GET(makeGet());
      expect(res.status).toBe(200);
    });
  });

  describe("SF-16 — it used to invent all five factors", () => {
    it("never claims a payment-history figure again", async () => {
      // The old route told every caller, identically, that they had
      // "98% on-time payments" and "2 inquiries (6 months)".
      const body = await (await GET(makeGet())).json();
      const text = JSON.stringify(body);
      expect(text).not.toContain("98% on-time");
      expect(text).not.toContain("32% utilization");
      expect(text).not.toContain("2 inquiries");
    });

    it("analyses the AUTHENTICATED user, not nobody", async () => {
      // `_user` was declared and never read.
      await GET(makeGet());
      expect(mockAnalyzeCreditAge).toHaveBeenCalledWith("user-1");
      expect(mockAnalyzeCreditMix).toHaveBeenCalledWith("user-1");
    });

    it("returns the two factors it can compute, from real analyses", async () => {
      const body = await (await GET(makeGet())).json();
      expect(body.data.factors.map((f: { id: string }) => f.id)).toEqual([
        "credit_age",
        "credit_mix",
      ]);
      expect(body.data.factors[0].value).toContain("8.3 year average");
    });

    it("names the three it cannot, with what would unblock each", async () => {
      // Omitting them would read as "not applicable"; naming them reads as
      // "we do not know", which is the truth.
      const body = await (await GET(makeGet())).json();
      expect(
        body.data.unavailable.map((f: { id: string }) => f.id),
      ).toEqual(["payment_history", "credit_utilization", "new_credit"]);
      for (const f of body.data.unavailable) {
        expect(f.blockedBy).toEqual(expect.any(String));
        expect(f.blockedBy.length).toBeGreaterThan(0);
      }
    });

    it("omits credit age entirely when there is nothing to measure", async () => {
      // An average of 0 across zero accounts is not "0 years of history".
      mockAnalyzeCreditAge.mockResolvedValue(age({ averageAge: 0 }));
      const body = await (await GET(makeGet())).json();
      expect(body.data.factors.map((f: { id: string }) => f.id)).toEqual(["credit_mix"]);
    });

    it("omits credit mix entirely when no account is linked", async () => {
      mockAnalyzeCreditMix.mockResolvedValue(
        mix({ installment: 0, revolving: 0 }),
      );
      const body = await (await GET(makeGet())).json();
      expect(body.data.factors.map((f: { id: string }) => f.id)).toEqual(["credit_age"]);
    });

    it("returns an empty factor list, not a filler one, for a new user", async () => {
      mockAnalyzeCreditAge.mockResolvedValue(age({ averageAge: 0 }));
      mockAnalyzeCreditMix.mockResolvedValue(
        mix({ installment: 0, revolving: 0 }),
      );
      const body = await (await GET(makeGet())).json();
      expect(body.data.factors).toEqual([]);
      // The unavailable list still explains why the page is empty.
      expect(body.data.unavailable).toHaveLength(3);
    });

    it("rates the mix by scored VARIETY, not by account count", async () => {
      // Six revolving cards is a worse mix than one of each of three kinds.
      mockAnalyzeCreditMix.mockResolvedValue(
        mix({ installment: 0, revolving: 6, mortgage: 0 }),
      );
      const body = await (await GET(makeGet())).json();
      const mixFactor = body.data.factors.find(
        (f: { id: string }) => f.id === "credit_mix",
      );
      expect(mixFactor.status).toBe("fair");
    });

    it("returns 500 with no factors when the analysis fails", async () => {
      // Failing to read the caller's accounts is not the same as their
      // having none.
      mockAnalyzeCreditAge.mockRejectedValue(new Error("db down"));
      const res = await GET(makeGet());
      expect(res.status).toBe(500);
      expect((await res.json()).data).toBeUndefined();
    });
  });
});
