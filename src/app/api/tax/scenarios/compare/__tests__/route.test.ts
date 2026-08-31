/**
 * @jest-environment node
 *
 * POST /api/tax/scenarios/compare
 *
 * Runs several what-ifs against the caller's profile and names the best one.
 *
 * "Best" is the assertion that matters. The screen surfaces bestScenario as a
 * recommendation, so picking by the wrong criterion — or picking the first
 * entry when two tie — sends someone toward the more expensive option while
 * looking like advice.
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TaxBracketCalculator } from "@/lib/tax/services/TaxBracketCalculator";

const mockValidateFromHeaders = jest.fn();
const mockFetchTaxProfile = jest.fn();
const mockCalculateTaxes = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...a: unknown[]) => mockValidateFromHeaders(...a),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn(async () => "user"),
}));
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({})),
}));
jest.mock("@/lib/tax/tax-profile-repository", () => ({
  fetchTaxProfile: (...a: unknown[]) => mockFetchTaxProfile(...a),
}));
jest.mock("@/lib/tax/services/TaxBracketCalculator", () => ({
  TaxBracketCalculator: jest.fn().mockImplementation(() => ({
    calculateTaxes: (...a: unknown[]) => mockCalculateTaxes(...a),
  })),
}));

const CALLER = "user-tax-5";

const BASE_PROFILE = {
  id: "p-1",
  userId: CALLER,
  taxYear: 2024,
  grossIncome: 120000,
  w2Income: 120000,
  otherIncome: 0,
  charitableDonations: 0,
  capitalGainsLongTerm: 0,
  ytd401kContribution: 0,
  ytdIraContribution: 0,
  ytdHsaContribution: 0,
};

function scenario(name: string, extra: Record<string, number> = {}) {
  return {
    name,
    grossIncome: 0,
    additional401k: 0,
    additionalIra: 0,
    additionalHsa: 0,
    additionalCharitable: 0,
    capitalGainsRealized: 0,
    rothConversion: 0,
    ...extra,
  };
}

function result(totalTax: number) {
  return {
    taxableIncome: 90000,
    federalTax: totalTax - 4000,
    stateTax: 4000,
    totalTax,
    effectiveRate: totalTax / 120000,
    marginalRate: 0.22,
    takeHomePay: 120000 - totalTax,
  };
}

function post(body: unknown): NextRequest {
  return {
    url: "http://localhost:3000/api/tax/scenarios/compare",
    method: "POST",
    headers: new Headers(),
    nextUrl: new URL("http://localhost:3000/api/tax/scenarios/compare"),
    json: async () => body,
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockResolvedValue({});
  (TaxBracketCalculator as unknown as jest.Mock).mockImplementation(() => ({
    calculateTaxes: (...a: unknown[]) => mockCalculateTaxes(...a),
  }));
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "u@example.com" },
  });
  mockFetchTaxProfile.mockResolvedValue({ ...BASE_PROFILE });
});

describe("POST /api/tax/scenarios/compare", () => {
  it("refuses an anonymous caller", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { POST } = await import("../route");

    expect(
      (await POST(post({ scenarios: [scenario("A")] }))).status,
    ).toBe(401);
  });

  it("returns one result per scenario, in the order supplied", async () => {
    mockCalculateTaxes
      .mockReturnValueOnce(result(20000))
      .mockReturnValueOnce(result(18000));
    const { POST } = await import("../route");

    const body = await (
      await POST(post({ scenarios: [scenario("A"), scenario("B")] }))
    ).json();

    expect(body.data.results.map((r: { name: string }) => r.name)).toEqual([
      "A",
      "B",
    ]);
  });

  it("names the LOWEST-tax scenario as best", async () => {
    mockCalculateTaxes
      .mockReturnValueOnce(result(20000))
      .mockReturnValueOnce(result(15000))
      .mockReturnValueOnce(result(22000));
    const { POST } = await import("../route");

    const body = await (
      await POST(
        post({ scenarios: [scenario("A"), scenario("B"), scenario("C")] }),
      )
    ).json();

    expect(body.data.bestScenario).toBe("B");
  });

  it("keeps the first of two equally good scenarios, deterministically", async () => {
    mockCalculateTaxes
      .mockReturnValueOnce(result(15000))
      .mockReturnValueOnce(result(15000));
    const { POST } = await import("../route");

    const body = await (
      await POST(post({ scenarios: [scenario("A"), scenario("B")] }))
    ).json();

    // A tie must not depend on iteration accidents — the same request has to
    // give the same recommendation every time.
    expect(body.data.bestScenario).toBe("A");
  });

  it("applies each scenario independently to the base profile", async () => {
    mockCalculateTaxes.mockReturnValue(result(20000));
    const { POST } = await import("../route");

    await POST(
      post({
        scenarios: [
          scenario("A", { additional401k: 5000 }),
          scenario("B", { additional401k: 9000 }),
        ],
      }),
    );

    // Each must start from the stored profile. Compounding scenario B on top
    // of A would report 14,000 and rank a modest option as the best available.
    expect(mockCalculateTaxes.mock.calls[0][0].ytd401kContribution).toBe(5000);
    expect(mockCalculateTaxes.mock.calls[1][0].ytd401kContribution).toBe(9000);
  });

  it("rejects an empty scenario list", async () => {
    const { POST } = await import("../route");
    expect((await POST(post({ scenarios: [] }))).status).toBe(400);
  });

  it("rejects a missing scenarios array", async () => {
    const { POST } = await import("../route");
    expect((await POST(post({}))).status).toBe(400);
  });

  it("rejects the whole request when ONE scenario is invalid", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      post({
        scenarios: [scenario("A"), scenario("B", { additional401k: -1 })],
      }),
    );

    // Silently dropping the bad one would compare a different set than the
    // user asked about and still call the winner "best".
    expect(res.status).toBe(400);
    expect(mockCalculateTaxes).not.toHaveBeenCalled();
  });

  it("caps how many scenarios one request may compare", async () => {
    const { POST } = await import("../route");
    const many = Array.from({ length: 25 }, (_, i) => scenario(`S${i}`));

    expect((await POST(post({ scenarios: many }))).status).toBe(400);
  });

  it("returns 409 when the user has no profile", async () => {
    mockFetchTaxProfile.mockResolvedValue(null);
    const { POST } = await import("../route");

    const res = await POST(post({ scenarios: [scenario("A")] }));

    expect(res.status).toBe(409);
    expect(mockCalculateTaxes).not.toHaveBeenCalled();
  });

  it("surfaces a calculator failure as an error", async () => {
    mockCalculateTaxes.mockImplementation(() => {
      throw new Error("calculator exploded");
    });
    const { POST } = await import("../route");

    expect((await POST(post({ scenarios: [scenario("A")] }))).status).toBe(500);
  });
});
