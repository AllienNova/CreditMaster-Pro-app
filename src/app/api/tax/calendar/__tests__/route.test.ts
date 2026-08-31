/**
 * @jest-environment node
 *
 * GET /api/tax/calendar
 *
 * Estimated-tax deadlines for the authenticated user, derived from
 * TaxOptimizationEngine.getQuarterlyPaymentSchedule.
 *
 * These dates are the point of the feature: missing a 1040-ES deadline costs a
 * real underpayment penalty. So the tests assert the STATUTORY dates rather
 * than whatever the engine emits, and assert that a user with no tax profile
 * gets an explicit empty state rather than a schedule of payment amounts
 * invented from a default income.
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const mockValidateFromHeaders = jest.fn();
const mockFetchTaxProfile = jest.fn();
const mockSchedule = jest.fn();

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
jest.mock("@/lib/tax", () => ({
  taxOptimizationEngine: {
    getQuarterlyPaymentSchedule: (...a: unknown[]) => mockSchedule(...a),
  },
}));

const CALLER = "user-tax-3";

function get(url = "http://localhost:3000/api/tax/calendar"): NextRequest {
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const SCHEDULE = [
  {
    quarter: 1,
    dueDate: new Date("2024-04-15T00:00:00Z"),
    label: "Q1 (Jan-Mar)",
    incomePeriod: "January 1 – March 31",
    federalPayment: 2500,
    statePayment: 400,
  },
  {
    quarter: 2,
    dueDate: new Date("2024-06-17T00:00:00Z"),
    label: "Q2 (Apr-May)",
    incomePeriod: "April 1 – May 31",
    federalPayment: 2500,
    statePayment: 400,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  // resetMocks wipes factory implementations between tests.
  (createClient as jest.Mock).mockResolvedValue({});
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "u@example.com" },
  });
  mockFetchTaxProfile.mockResolvedValue({ id: "p-1", userId: CALLER });
  mockSchedule.mockReturnValue(SCHEDULE);
});

describe("GET /api/tax/calendar", () => {
  it("refuses an anonymous caller", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { GET } = await import("../route");

    expect((await GET(get())).status).toBe(401);
  });

  it("returns one event per quarterly deadline", async () => {
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    expect(body.data.events).toHaveLength(2);
  });

  it("maps a payment entry onto the TaxEvent shape the client declares", async () => {
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();
    const [first] = body.data.events;

    expect(first).toMatchObject({
      type: "payment",
      priority: "critical",
      isCompleted: false,
      category: "estimated-tax",
    });
    expect(typeof first.id).toBe("string");
    expect(first.date).toBe("2024-04-15T00:00:00.000Z");
  });

  it("states the payment amount in the description", async () => {
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    // A deadline with no amount is only half the obligation. Amounts are
    // currency-formatted, so the federal and state figures are asserted as
    // they are actually rendered — $2,500 with the separator, not 2500.
    const { description } = body.data.events[0];
    expect(description).toMatch(/\$2,500 federal/);
    expect(description).toMatch(/\$400 state/);
    // 2500 + 400 — the headline figure is the TOTAL, not just the federal part.
    expect(description).toMatch(/\$2,900/);
  });

  it("scopes the profile read to the authenticated caller", async () => {
    const { GET } = await import("../route");
    await GET(get("http://localhost:3000/api/tax/calendar?userId=victim"));

    expect(mockFetchTaxProfile).toHaveBeenCalledWith(
      CALLER,
      expect.any(Number),
    );
  });

  it("returns an explicit empty state when no profile exists", async () => {
    mockFetchTaxProfile.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(get());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.events).toEqual([]);
    expect(body.data.profileMissing).toBe(true);
  });

  it("does NOT invent payment amounts without a profile", async () => {
    mockFetchTaxProfile.mockResolvedValue(null);
    const { GET } = await import("../route");
    await GET(get());

    // A schedule of dollar amounts derived from a default income would look
    // exactly like a real one, and a user could pay it.
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("filters to future deadlines when upcoming=true", async () => {
    mockSchedule.mockReturnValue([
      { ...SCHEDULE[0], dueDate: new Date("2000-04-15T00:00:00Z") },
      { ...SCHEDULE[1], dueDate: new Date("2999-06-17T00:00:00Z") },
    ]);
    const { GET } = await import("../route");
    const body = await (
      await GET(get("http://localhost:3000/api/tax/calendar?upcoming=true"))
    ).json();

    expect(body.data.events).toHaveLength(1);
    expect(body.data.events[0].date).toBe("2999-06-17T00:00:00.000Z");
  });

  it("returns every deadline when upcoming is absent", async () => {
    mockSchedule.mockReturnValue([
      { ...SCHEDULE[0], dueDate: new Date("2000-04-15T00:00:00Z") },
      { ...SCHEDULE[1], dueDate: new Date("2999-06-17T00:00:00Z") },
    ]);
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    expect(body.data.events).toHaveLength(2);
  });

  it("rejects a non-numeric year rather than coercing it", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      get("http://localhost:3000/api/tax/calendar?year=next"),
    );

    expect(res.status).toBe(400);
  });

  it("surfaces an engine failure as an error, not an empty calendar", async () => {
    mockSchedule.mockImplementation(() => {
      throw new Error("engine exploded");
    });
    const { GET } = await import("../route");

    // An empty calendar reads as "nothing due" — the most dangerous possible
    // wrong answer for a deadline feature.
    expect((await GET(get())).status).toBe(500);
  });
});
