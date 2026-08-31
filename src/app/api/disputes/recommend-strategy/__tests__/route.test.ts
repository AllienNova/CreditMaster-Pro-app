/**
 * POST /api/disputes/recommend-strategy
 *
 * The route did not exist; the mobile call fell through to disputes/[id] with
 * id="recommend-strategy" and Next.js answered 405.
 *
 * The assertions that matter here are about HONESTY of the payload, not just
 * shape: `confidence` is the strategy's documented general success rate, and the
 * response has to say so rather than let a client read it as "we think this will
 * work for you".
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockRecommendStrategy = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/disputes/advanced-strategies", () => ({
  recommendStrategy: (...args: unknown[]) => mockRecommendStrategy(...args),
}));

import { POST } from "../route";

function req(body: unknown): NextRequest {
  const url = "http://localhost:3000/api/disputes/recommend-strategy";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const strategy = {
  id: "debt-validation",
  name: "Debt Validation",
  description: "Force the collector to prove the debt.",
  whenToUse: ["a new collection account", "no prior dispute attempts"],
  successRate: 78,
};

describe("POST /api/disputes/recommend-strategy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockRecommendStrategy.mockReturnValue([strategy]);
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await POST(req({ disputeType: "collection" }))).status).toBe(401);
  });

  describe("validation", () => {
    it.each<[unknown, string]>([
      [{}, "no disputeType"],
      [{ disputeType: "" }, "empty disputeType"],
      [{ disputeType: "x", previousAttempts: -1 }, "negative attempts"],
      [{ disputeType: "x", previousAttempts: 1.5 }, "fractional attempts"],
      [{ disputeType: "x", hasEvidence: "yes" }, "non-boolean flag"],
      [{ disputeType: "x", accountAge: -3 }, "negative account age"],
    ])("rejects %j — %s", async (body, _why) => {
      const res = await POST(req(body));
      expect(res.status).toBe(400);
      expect(mockRecommendStrategy).not.toHaveBeenCalled();
    });
  });

  describe("defaults", () => {
    it("fills the optional scenario flags conservatively", async () => {
      // Every branch in recommendStrategy is ADDITIVE, so conservative defaults
      // can only remove strategies — never invent one the scenario did not earn.
      await POST(req({ disputeType: "collection" }));
      expect(mockRecommendStrategy).toHaveBeenCalledWith({
        disputeType: "collection",
        previousAttempts: 0,
        hasEvidence: false,
        accountAge: 0,
        isCollection: false,
        hasRelationship: false,
      });
    });

    it("passes supplied flags through unchanged", async () => {
      await POST(
        req({
          disputeType: "collection",
          previousAttempts: 3,
          hasEvidence: true,
          accountAge: 24,
          isCollection: true,
          hasRelationship: true,
        }),
      );
      expect(mockRecommendStrategy).toHaveBeenCalledWith({
        disputeType: "collection",
        previousAttempts: 3,
        hasEvidence: true,
        accountAge: 24,
        isCollection: true,
        hasRelationship: true,
      });
    });
  });

  describe("the payload", () => {
    it("maps a strategy to the shape the mobile client reads", async () => {
      const body = await (await POST(req({ disputeType: "collection" }))).json();
      expect(body.recommendations).toHaveLength(1);
      expect(body.recommendations[0]).toMatchObject({
        strategyId: "debt-validation",
        name: "Debt Validation",
        confidence: 78,
      });
    });

    it("states that confidence is a general success rate, not a personal one", async () => {
      // Without this, 78 reads as "we are 78% sure this will work for YOU" —
      // a fabricated claim about someone's credit dispute.
      const body = await (await POST(req({ disputeType: "collection" }))).json();
      expect(body.confidenceBasis).toMatch(/general success rate/i);
      expect(body.confidenceBasis).toMatch(/not a probability/i);
    });

    it("builds the reasoning from the strategy's own stated applicability", async () => {
      const body = await (await POST(req({ disputeType: "collection" }))).json();
      expect(body.recommendations[0].reasoning).toBe(
        "Suggested for: a new collection account; no prior dispute attempts.",
      );
    });

    it("falls back to the description when a strategy lists no whenToUse", async () => {
      mockRecommendStrategy.mockReturnValue([{ ...strategy, whenToUse: [] }]);
      const body = await (await POST(req({ disputeType: "collection" }))).json();
      expect(body.recommendations[0].reasoning).toBe(strategy.description);
    });

    it("returns an empty list rather than inventing one when nothing matches", async () => {
      mockRecommendStrategy.mockReturnValue([]);
      const res = await POST(req({ disputeType: "collection" }));
      expect(res.status).toBe(200);
      expect((await res.json()).recommendations).toEqual([]);
    });
  });

  it("returns 500 with no recommendations when the recommender throws", async () => {
    mockRecommendStrategy.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await POST(req({ disputeType: "collection" }));
    expect(res.status).toBe(500);
    // Guessing at dispute strategy for someone's credit file is worse than
    // saying we could not produce one.
    expect((await res.json()).recommendations).toBeUndefined();
  });
});
