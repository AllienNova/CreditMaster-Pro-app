/**
 * @jest-environment node
 *
 * POST /api/tax/brackets
 *
 * The tax ENGINE has been complete for some time — TaxBracketCalculator holds
 * the real 2024 federal tables — while the mobile bracket screen called
 * /tax/brackets, a route that did not exist. Both ends built, no wire between
 * them, and the screen swallowed the 404 into an empty state.
 *
 * These tests assert against the published IRS 2024 thresholds rather than
 * against whatever the implementation returns, so a regression in the bracket
 * data fails here rather than showing a user a confidently wrong marginal rate.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...a: unknown[]) => mockValidateFromHeaders(...a),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn(async () => "user"),
}));

const CALLER = "user-tax-1";

function post(body: unknown): NextRequest {
  return {
    url: "http://localhost:3000/api/tax/brackets",
    method: "POST",
    headers: new Headers(),
    nextUrl: new URL("http://localhost:3000/api/tax/brackets"),
    json: async () => body,
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "u@example.com" },
  });
});

describe("POST /api/tax/brackets", () => {
  it("refuses an anonymous caller", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { POST } = await import("../route");

    const res = await POST(
      post({ taxYear: 2024, filingStatus: "single", taxableIncome: 50000 }),
    );

    expect(res.status).toBe(401);
  });

  it("returns the full single-filer bracket table", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      post({ taxYear: 2024, filingStatus: "single", taxableIncome: 50000 }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.brackets).toHaveLength(7);
    expect(body.data.brackets[0]).toEqual({ min: 0, max: 11600, rate: 0.1 });
  });

  it("identifies the bracket the income actually falls in", async () => {
    const { POST } = await import("../route");
    // $50,000 sits in the 22% band for a single filer (47,150 - 100,525).
    const res = await POST(
      post({ taxYear: 2024, filingStatus: "single", taxableIncome: 50000 }),
    );
    const body = await res.json();

    expect(body.data.currentBracket.rate).toBe(0.22);
    expect(body.data.marginalRate).toBe(0.22);
  });

  it("uses the married-filing-jointly table when asked", async () => {
    const { POST } = await import("../route");
    // The same $50,000 is only 12% jointly (23,200 - 94,300) — the whole point
    // of sending filingStatus, and a silent default to `single` would overstate
    // a married filer's marginal rate by ten points.
    const res = await POST(
      post({
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        taxableIncome: 50000,
      }),
    );
    const body = await res.json();

    expect(body.data.currentBracket.rate).toBe(0.12);
  });

  it("computes an effective rate below the marginal rate", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      post({ taxYear: 2024, filingStatus: "single", taxableIncome: 50000 }),
    );
    const body = await res.json();

    // Progressive taxation: only the top slice is taxed at 22%, so the
    // effective rate must be strictly lower. Equal rates would mean the
    // route had flat-rated the whole income.
    expect(body.data.effectiveRate).toBeGreaterThan(0);
    expect(body.data.effectiveRate).toBeLessThan(body.data.marginalRate);
  });

  it("puts a zero income in the lowest bracket rather than failing", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      post({ taxYear: 2024, filingStatus: "single", taxableIncome: 0 }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.currentBracket.rate).toBe(0.1);
    expect(body.data.effectiveRate).toBe(0);
  });

  it("puts a very high income in the top bracket", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      post({ taxYear: 2024, filingStatus: "single", taxableIncome: 2_000_000 }),
    );
    const body = await res.json();

    expect(body.data.marginalRate).toBe(0.37);
  });

  it("rejects a negative income", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      post({ taxYear: 2024, filingStatus: "single", taxableIncome: -1 }),
    );

    expect(res.status).toBe(400);
  });

  it("rejects an unknown filing status rather than defaulting to single", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      post({ taxYear: 2024, filingStatus: "its_complicated", taxableIncome: 1 }),
    );

    expect(res.status).toBe(400);
  });

  it("rejects a missing taxableIncome", async () => {
    const { POST } = await import("../route");
    const res = await POST(post({ taxYear: 2024, filingStatus: "single" }));

    expect(res.status).toBe(400);
  });

  it("echoes the filing status and tax year it actually used", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      post({ taxYear: 2024, filingStatus: "single", taxableIncome: 50000 }),
    );
    const body = await res.json();

    expect(body.data.filingStatus).toBe("single");
    expect(body.data.taxYear).toBe(2024);
  });
});
