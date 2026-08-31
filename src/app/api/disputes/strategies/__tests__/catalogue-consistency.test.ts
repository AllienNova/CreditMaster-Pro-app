/**
 * One dispute-strategy catalogue, across every surface that serves it.
 *
 * There were two, with ZERO overlapping ids: an inline array in
 * /api/disputes/strategies, and ALL_ADVANCED_STRATEGIES in the library used by
 * /disputes/generate and /disputes/recommend-strategy. So a client could be
 * recommended `debt_validation` and then fail to find it in the list, which
 * only knew `validation_request`.
 *
 * These tests exist so that cannot come back. They assert the property — every
 * id the recommender can emit is resolvable by the detail route — rather than a
 * snapshot of today's seven strategies, so adding a strategy does not break
 * them but adding a SECOND CATALOGUE does.
 */

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));

import type { NextRequest } from "next/server";
import {
  ALL_ADVANCED_STRATEGIES,
  getStrategyById,
  recommendStrategy,
} from "@/lib/disputes/advanced-strategies";
import { toDisputeStrategyDTO } from "@/lib/disputes/strategy-dto";

describe("dispute strategy catalogue", () => {
  it("has at least one strategy (guards against an empty sweep)", () => {
    expect(ALL_ADVANCED_STRATEGIES.length).toBeGreaterThan(0);
  });

  it("gives every strategy a unique id", () => {
    const ids = ALL_ADVANCED_STRATEGIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every catalogue id through getStrategyById", () => {
    // The detail route is built on this; an id in the list that the lookup
    // cannot find is a 404 on a strategy the user was just shown.
    for (const s of ALL_ADVANCED_STRATEGIES) {
      expect(getStrategyById(s.id)?.id).toBe(s.id);
    }
  });

  it("only ever recommends strategies that exist in the catalogue", () => {
    // Exercise the scenario space rather than one example: every combination of
    // the boolean flags, across a spread of previousAttempts.
    const flags = [true, false];
    for (const previousAttempts of [0, 1, 3, 10]) {
      for (const hasEvidence of flags) {
        for (const isCollection of flags) {
          for (const hasRelationship of flags) {
            const recommended = recommendStrategy({
              disputeType: "collection",
              previousAttempts,
              hasEvidence,
              accountAge: 12,
              isCollection,
              hasRelationship,
            });
            for (const r of recommended) {
              expect(getStrategyById(r.id)).toBeDefined();
            }
          }
        }
      }
    }
  });

  it("never recommends the same strategy twice in one result", () => {
    const recommended = recommendStrategy({
      disputeType: "collection",
      previousAttempts: 5,
      hasEvidence: true,
      accountAge: 12,
      isCollection: true,
      hasRelationship: true,
    });
    const ids = recommended.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("toDisputeStrategyDTO", () => {
  it("satisfies every field the mobile DisputeStrategy type declares", () => {
    for (const s of ALL_ADVANCED_STRATEGIES) {
      const dto = toDisputeStrategyDTO(s);
      expect(typeof dto.id).toBe("string");
      expect(typeof dto.name).toBe("string");
      expect(typeof dto.description).toBe("string");
      expect(typeof dto.successRate).toBe("number");
      expect(["beginner", "intermediate", "advanced", "expert"]).toContain(
        dto.difficulty,
      );
      // riskLevel is the field the replaced inline catalogue did not have.
      expect(["low", "medium", "high"]).toContain(dto.riskLevel);
      expect(typeof dto.timeline).toBe("string");
      expect(Array.isArray(dto.steps)).toBe(true);
    }
  });

  it("renders the timeline as a range from the real bounds", () => {
    const s = ALL_ADVANCED_STRATEGIES[0];
    const dto = toDisputeStrategyDTO(s);
    const { minDays, maxDays } = s.timeline;
    expect(dto.timeline).toBe(
      minDays === maxDays ? `${minDays} days` : `${minDays}–${maxDays} days`,
    );
  });

  it("collapses an equal min and max to a single figure, not a fake range", () => {
    const dto = toDisputeStrategyDTO({
      ...ALL_ADVANCED_STRATEGIES[0],
      timeline: { minDays: 30, maxDays: 30, phases: [] },
    });
    expect(dto.timeline).toBe("30 days");
  });

  it("maps step order onto the step number the client renders", () => {
    const s = ALL_ADVANCED_STRATEGIES.find((x) => x.steps.length > 0)!;
    const dto = toDisputeStrategyDTO(s);
    expect(dto.steps[0].step).toBe(s.steps[0].order);
    expect(dto.steps[0].title).toBe(s.steps[0].title);
  });
});

/**
 * The test that would actually have caught the original break.
 *
 * The four above pin the LIBRARY's internal consistency, and they would have
 * passed while the bug was live — recommendStrategy and getStrategyById both
 * read the library; it was the LIST ROUTE that served a second, disjoint array.
 * So the route's own output has to be checked against the catalogue, not just
 * the catalogue against itself.
 */
describe("GET /api/disputes/strategies serves the catalogue, not a private copy", () => {
  const req = (url: string) =>
    ({
      url,
      method: "GET",
      headers: new Headers(),
      nextUrl: new URL(url),
    }) as unknown as NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("returns exactly the catalogue's ids", async () => {
    const { GET } = await import("../route");
    const body = await (
      await GET(req("http://localhost:3000/api/disputes/strategies"))
    ).json();
    const returned = body.data.strategies.map((s: { id: string }) => s.id).sort();
    const catalogue = ALL_ADVANCED_STRATEGIES.map((s) => s.id).sort();
    expect(returned).toEqual(catalogue);
  });

  it("returns every id the DETAIL route can resolve", async () => {
    const { GET } = await import("../route");
    const body = await (
      await GET(req("http://localhost:3000/api/disputes/strategies"))
    ).json();
    for (const s of body.data.strategies) {
      expect(getStrategyById(s.id)).toBeDefined();
    }
  });

  it("still filters by difficulty", async () => {
    const { GET } = await import("../route");
    const body = await (
      await GET(
        req("http://localhost:3000/api/disputes/strategies?difficulty=beginner"),
      )
    ).json();
    for (const s of body.data.strategies) {
      expect(s.difficulty).toBe("beginner");
    }
  });
});
