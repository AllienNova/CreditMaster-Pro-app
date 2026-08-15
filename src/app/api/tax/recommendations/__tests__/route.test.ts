/**
 * @jest-environment node
 *
 * GET /api/tax/recommendations
 *
 * The mobile tax screen has called /tax/recommendations since it was written;
 * no route existed. TaxOptimizationEngine.analyzeAndRecommend has existed just
 * as long. This joins them.
 *
 * The behaviour that matters most here is the ABSENT-PROFILE case. Tax advice
 * derived from a made-up profile is worse than no advice: it is specific,
 * confident and wrong, and a user cannot tell it apart from advice based on
 * their real numbers. So "no profile" returns an explicit empty state, never
 * recommendations computed from defaults.
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const mockValidateFromHeaders = jest.fn();
const mockFetchTaxProfile = jest.fn();
const mockAnalyze = jest.fn();

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
    analyzeAndRecommend: (...a: unknown[]) => mockAnalyze(...a),
  },
}));

const CALLER = "user-tax-2";

function get(url = "http://localhost:3000/api/tax/recommendations"): NextRequest {
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  // jest.config sets resetMocks, which wipes a factory mock's implementation
  // between tests — createClient would resolve to undefined and the handler
  // would pass undefined to fetchTaxProfile. Re-armed here; this is the
  // codebase's established idiom for that gotcha.
  (createClient as jest.Mock).mockResolvedValue({});
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "u@example.com" },
  });
  mockFetchTaxProfile.mockResolvedValue({ id: "p-1", userId: CALLER });
  // Mirrors the REAL TaxOptimizationResult field name. Mocking it as
  // `recommendations` made this suite pass against a route that read a
  // property the engine does not have.
  mockAnalyze.mockResolvedValue({
    topRecommendations: [{ id: "r-1", title: "Max the 401(k)", savings: 2200 }],
  });
});

describe("GET /api/tax/recommendations", () => {
  it("refuses an anonymous caller", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { GET } = await import("../route");

    expect((await GET(get())).status).toBe(401);
  });

  it("returns the engine's recommendations", async () => {
    const { GET } = await import("../route");
    const res = await GET(get());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.recommendations).toHaveLength(1);
    expect(body.data.recommendations[0].title).toBe("Max the 401(k)");
  });

  it("passes the AUTHENTICATED user id to the engine", async () => {
    const { GET } = await import("../route");
    await GET(get("http://localhost:3000/api/tax/recommendations?userId=victim"));

    expect(mockAnalyze).toHaveBeenCalledWith(CALLER, expect.anything());
  });

  it("loads the profile for the authenticated user only", async () => {
    const { GET } = await import("../route");
    await GET(get());

    expect(mockFetchTaxProfile).toHaveBeenCalledWith(
      expect.anything(),
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
    expect(body.data.recommendations).toEqual([]);
    expect(body.data.profileMissing).toBe(true);
  });

  it("does NOT invent a profile to generate advice from", async () => {
    mockFetchTaxProfile.mockResolvedValue(null);
    const { GET } = await import("../route");

    await GET(get());

    // Advice computed from a default profile is specific, confident and wrong,
    // and indistinguishable to the user from advice based on their real
    // numbers. The engine must not run at all.
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it("surfaces an engine failure as an error, not as zero recommendations", async () => {
    mockAnalyze.mockRejectedValue(new Error("engine exploded"));
    const { GET } = await import("../route");

    const res = await GET(get());

    // "No recommendations" and "we could not compute recommendations" mean
    // different things to a user deciding whether to act.
    expect(res.status).toBe(500);
  });

  it("honours an explicit taxYear", async () => {
    const { GET } = await import("../route");
    await GET(
      get("http://localhost:3000/api/tax/recommendations?taxYear=2024"),
    );

    expect(mockFetchTaxProfile).toHaveBeenCalledWith(
      expect.anything(),
      CALLER,
      2024,
    );
  });

  it("rejects a non-numeric taxYear rather than coercing it", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      get("http://localhost:3000/api/tax/recommendations?taxYear=last-year"),
    );

    expect(res.status).toBe(400);
  });
});
