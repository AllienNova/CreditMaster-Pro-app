/**
 * @jest-environment node
 *
 * POST /api/tax/scenarios/calculate
 *
 * "What if I put another $5,000 into my 401(k)?" answered against the user's
 * real profile via TaxBracketCalculator.
 *
 * The tests below care about one thing above all: that the scenario is applied
 * to the CALLER'S OWN profile and that each adjustment lands on the right
 * field. A scenario that silently ignores `additional401k`, or applies a Roth
 * conversion as a deduction rather than as income, returns a plausible number
 * that would lead someone to move real money the wrong way.
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

const CALLER = "user-tax-4";

const BASE_PROFILE = {
  id: "p-1",
  userId: CALLER,
  taxYear: 2024,
  grossIncome: 120000,
  w2Income: 120000,
  otherIncome: 0,
  charitableDonations: 1000,
  capitalGainsLongTerm: 0,
  ytd401kContribution: 5000,
  ytdIraContribution: 0,
  ytdHsaContribution: 0,
};

const RESULT = {
  taxableIncome: 90000,
  federalTax: 14000,
  stateTax: 5000,
  totalTax: 19000,
  effectiveRate: 0.158,
  marginalRate: 0.22,
  takeHomePay: 101000,
  monthlyTakeHome: 8416,
  grossIncome: 120000,
};

function post(body: unknown): NextRequest {
  return {
    url: "http://localhost:3000/api/tax/scenarios/calculate",
    method: "POST",
    headers: new Headers(),
    nextUrl: new URL("http://localhost:3000/api/tax/scenarios/calculate"),
    json: async () => body,
  } as unknown as NextRequest;
}

const SCENARIO = {
  name: "Max the 401(k)",
  grossIncome: 0,
  additional401k: 5000,
  additionalIra: 0,
  additionalHsa: 0,
  additionalCharitable: 0,
  capitalGainsRealized: 0,
  rothConversion: 0,
};

/** The TaxProfile handed to calculateTaxes on the most recent call. */
function appliedProfile() {
  return mockCalculateTaxes.mock.calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockResolvedValue({});
  // resetMocks strips implementations declared in a jest.mock factory — the
  // CONSTRUCTOR included, not just its methods. Without this the route builds
  // a calculator whose calculateTaxes is undefined and its own catch reports a
  // 500 for a reason unrelated to the code under test.
  (TaxBracketCalculator as unknown as jest.Mock).mockImplementation(() => ({
    calculateTaxes: (...a: unknown[]) => mockCalculateTaxes(...a),
  }));
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "u@example.com" },
  });
  mockFetchTaxProfile.mockResolvedValue({ ...BASE_PROFILE });
  mockCalculateTaxes.mockReturnValue({ ...RESULT });
});

describe("POST /api/tax/scenarios/calculate", () => {
  it("refuses an anonymous caller", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { POST } = await import("../route");

    expect((await POST(post(SCENARIO))).status).toBe(401);
  });

  it("loads the profile for the authenticated caller only", async () => {
    const { POST } = await import("../route");
    await POST(post({ ...SCENARIO, userId: "victim" }));

    expect(mockFetchTaxProfile).toHaveBeenCalledWith(
      expect.anything(),
      CALLER,
      expect.any(Number),
    );
  });

  it("returns the TaxScenarioResult shape the client declares", async () => {
    const { POST } = await import("../route");
    const body = await (await POST(post(SCENARIO))).json();

    expect(body.data).toEqual({
      name: "Max the 401(k)",
      taxableIncome: 90000,
      federalTax: 14000,
      stateTax: 5000,
      totalTax: 19000,
      effectiveRate: 0.158,
      marginalRate: 0.22,
      takeHomePay: 101000,
    });
  });

  it("ADDS the extra 401(k) to what the user already contributed", async () => {
    const { POST } = await import("../route");
    await POST(post(SCENARIO));

    // 5,000 already contributed + 5,000 more. Replacing rather than adding
    // would silently discard the year's existing contributions and understate
    // the benefit of the scenario.
    expect(appliedProfile().ytd401kContribution).toBe(10000);
  });

  it("adds IRA, HSA and charitable amounts to their existing balances", async () => {
    const { POST } = await import("../route");
    await POST(
      post({
        ...SCENARIO,
        additionalIra: 2000,
        additionalHsa: 1500,
        additionalCharitable: 500,
      }),
    );

    const p = appliedProfile();
    expect(p.ytdIraContribution).toBe(2000);
    expect(p.ytdHsaContribution).toBe(1500);
    expect(p.charitableDonations).toBe(1500); // 1,000 existing + 500
  });

  it("treats a Roth conversion as taxable INCOME, not a deduction", async () => {
    const { POST } = await import("../route");
    await POST(post({ ...SCENARIO, additional401k: 0, rothConversion: 20000 }));

    // Converting traditional to Roth is ordinary income in the conversion
    // year. Booking it as a deduction would invert the answer and tell someone
    // a conversion SAVES tax in the year they owe most.
    expect(appliedProfile().otherIncome).toBe(20000);
  });

  it("adds realized capital gains to the long-term bucket", async () => {
    const { POST } = await import("../route");
    await POST(post({ ...SCENARIO, capitalGainsRealized: 30000 }));

    expect(appliedProfile().capitalGainsLongTerm).toBe(30000);
  });

  it("overrides gross income only when the scenario supplies one", async () => {
    const { POST } = await import("../route");

    await POST(post(SCENARIO));
    expect(appliedProfile().grossIncome).toBe(120000);

    mockCalculateTaxes.mockClear();
    await POST(post({ ...SCENARIO, grossIncome: 200000 }));
    expect(appliedProfile().grossIncome).toBe(200000);
    expect(appliedProfile().w2Income).toBe(200000);
  });

  it("does not mutate the stored profile object", async () => {
    const stored = { ...BASE_PROFILE };
    mockFetchTaxProfile.mockResolvedValue(stored);
    const { POST } = await import("../route");

    await POST(post(SCENARIO));

    // The scenario is hypothetical. Mutating the fetched profile would leak a
    // what-if into anything else holding that reference.
    expect(stored.ytd401kContribution).toBe(5000);
  });

  it("returns 409 when the user has no profile to base a scenario on", async () => {
    mockFetchTaxProfile.mockResolvedValue(null);
    const { POST } = await import("../route");
    const res = await POST(post(SCENARIO));

    expect(res.status).toBe(409);
    expect(mockCalculateTaxes).not.toHaveBeenCalled();
  });

  it("rejects a negative contribution", async () => {
    const { POST } = await import("../route");
    const res = await POST(post({ ...SCENARIO, additional401k: -1000 }));

    expect(res.status).toBe(400);
  });

  it("rejects a scenario with no name", async () => {
    const { POST } = await import("../route");
    const res = await POST(post({ ...SCENARIO, name: "" }));

    expect(res.status).toBe(400);
  });

  it("surfaces a calculator failure as an error", async () => {
    mockCalculateTaxes.mockImplementation(() => {
      throw new Error("calculator exploded");
    });
    const { POST } = await import("../route");

    expect((await POST(post(SCENARIO))).status).toBe(500);
  });
});
