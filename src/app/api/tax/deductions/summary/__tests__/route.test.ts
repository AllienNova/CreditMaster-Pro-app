/**
 * @jest-environment node
 *
 * GET /api/tax/deductions/summary
 *
 * The itemise-or-standard recommendation is the assertion that matters: a
 * filer takes the LARGER of the two, and getting the comparison backwards
 * tells someone to leave money on the table with a confident-looking number
 * beside it.
 *
 * The thresholds are asserted against the published 2024 figures ($14,600
 * single, $29,200 married filing jointly) rather than against whatever the
 * constant currently holds, so a bad edit to the tax data fails here.
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const mockValidateFromHeaders = jest.fn();
const mockFetchTaxProfile = jest.fn();
const eqCalls: Array<[string, unknown]> = [];
let rowsResult: { data: unknown; error: unknown } = { data: [], error: null };

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

function chain() {
  const c: Record<string, unknown> = {};
  c.select = jest.fn(() => c);
  c.eq = jest.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return c;
  });
  c.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(rowsResult).then(resolve);
  return c;
}

const mockFrom = jest.fn(() => chain());

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(() => ({ from: mockFrom })),
}));

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const CALLER = "user-ded-3";

function get(url = "http://localhost:3000/api/tax/deductions/summary") {
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  eqCalls.length = 0;
  rowsResult = { data: [], error: null };
  (createClient as jest.Mock).mockResolvedValue({});
  mockFrom.mockImplementation(() => chain());
  (getServiceRoleClient as jest.Mock).mockReturnValue({ from: mockFrom });
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "u@example.com" },
  });
  mockFetchTaxProfile.mockResolvedValue({ filingStatus: "single" });
});

describe("GET /api/tax/deductions/summary", () => {
  it("refuses an anonymous caller", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { GET } = await import("../route");

    expect((await GET(get())).status).toBe(401);
  });

  it("scopes the read to the caller and the year", async () => {
    const { GET } = await import("../route");
    await GET(get("http://localhost:3000/api/tax/deductions/summary?year=2024"));

    expect(eqCalls).toContainEqual(["user_id", CALLER]);
    expect(eqCalls).toContainEqual(["tax_year", 2024]);
  });

  it("totals NUMERIC strings numerically", async () => {
    rowsResult = {
      data: [
        { category: "charitable", amount: "1200.50" },
        { category: "medical", amount: "800.25" },
      ],
      error: null,
    };
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    // String concatenation would produce "1200.50800.25".
    expect(body.data.totalDeductions).toBe(2000.75);
  });

  it("recommends the standard deduction when itemising loses", async () => {
    rowsResult = {
      data: [{ category: "charitable", amount: "5000" }],
      error: null,
    };
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    // $5,000 itemised vs $14,600 standard for a single filer.
    expect(body.data.itemizedVsStandard.standardDeduction).toBe(14600);
    expect(body.data.itemizedVsStandard.recommendation).toBe("standard");
    expect(body.data.itemizedVsStandard.savings).toBe(9600);
  });

  it("recommends itemising when it beats the standard deduction", async () => {
    rowsResult = {
      data: [{ category: "mortgage_interest", amount: "20000" }],
      error: null,
    };
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    expect(body.data.itemizedVsStandard.recommendation).toBe("itemize");
    expect(body.data.itemizedVsStandard.savings).toBe(5400);
  });

  it("never reports a negative saving", async () => {
    rowsResult = { data: [{ category: "medical", amount: "10" }], error: null };
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    // A losing itemised total does not cost anything — the filer simply takes
    // the standard deduction.
    expect(body.data.itemizedVsStandard.savings).toBeGreaterThan(0);
  });

  it("uses the married-filing-jointly threshold when the profile says so", async () => {
    mockFetchTaxProfile.mockResolvedValue({
      filingStatus: "married_filing_jointly",
    });
    rowsResult = {
      data: [{ category: "charitable", amount: "20000" }],
      error: null,
    };
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    // $20,000 beats the single threshold but LOSES to the joint one — the
    // whole reason filing status has to be read rather than assumed.
    expect(body.data.itemizedVsStandard.standardDeduction).toBe(29200);
    expect(body.data.itemizedVsStandard.recommendation).toBe("standard");
  });

  it("flags when the filing status was assumed", async () => {
    mockFetchTaxProfile.mockResolvedValue(null);
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    expect(body.data.filingStatusAssumed).toBe(true);
  });

  it("groups by category, largest first", async () => {
    rowsResult = {
      data: [
        { category: "medical", amount: "100" },
        { category: "charitable", amount: "900" },
        { category: "medical", amount: "200" },
      ],
      error: null,
    };
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    expect(body.data.byCategory).toEqual([
      { category: "charitable", amount: 900, percentage: 75 },
      { category: "medical", amount: 300, percentage: 25 },
    ]);
  });

  it("does not emit NaN percentages when there are no deductions", async () => {
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    // A zero denominator would render as "NaN%" on the screen.
    expect(body.data.byCategory).toEqual([]);
    expect(body.data.totalDeductions).toBe(0);
  });

  it("errors rather than recommending from missing data", async () => {
    rowsResult = { data: null, error: { message: "connection reset" } };
    const { GET } = await import("../route");

    // A zeroed summary would recommend the standard deduction when the user's
    // itemised total might well beat it.
    expect((await GET(get())).status).toBe(500);
  });

  it("rejects a non-numeric year", async () => {
    const { GET } = await import("../route");
    expect(
      (
        await GET(
          get("http://localhost:3000/api/tax/deductions/summary?year=soon"),
        )
      ).status,
    ).toBe(400);
  });
});
