/**
 * GET /api/financial/transactions/search
 *
 * The route did not exist, so the search box returned nothing for every query.
 *
 * Two things are pinned beyond the happy path: the query is scoped to the
 * caller's own rows, and ilike wildcards in user input are escaped — otherwise
 * a query of "%" matches every transaction the user has, which is not a
 * security hole but is not a search either.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockEq = jest.fn();
const mockOr = jest.fn();
const mockLimit = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: (...a: unknown[]) => {
          mockEq(...a);
          return {
            or: (...b: unknown[]) => {
              mockOr(...b);
              return { order: () => ({ limit: () => mockLimit() }) };
            },
          };
        },
      }),
    }),
  }),
}));

import { GET } from "../route";

const OWNER = "user-1";

function req(q?: string): NextRequest {
  const url = `http://localhost:3000/api/financial/transactions/search${
    q === undefined ? "" : `?q=${encodeURIComponent(q)}`
  }`;
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/financial/transactions/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("premium");
    mockLimit.mockResolvedValue({
      data: [{ id: "t1", name: "Starbucks" }],
      error: null,
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(req("coffee"))).status).toBe(401);
  });

  describe("query validation", () => {
    it.each([undefined, "", "   "])("rejects a query of %j", async (q) => {
      expect((await GET(req(q))).status).toBe(400);
    });

    it("rejects a query over 100 characters", async () => {
      expect((await GET(req("x".repeat(101)))).status).toBe(400);
    });

    it("accepts one exactly at the limit", async () => {
      expect((await GET(req("x".repeat(100)))).status).toBe(200);
    });
  });

  it("scopes the search to the AUTHENTICATED user", async () => {
    await GET(req("coffee"));
    expect(mockEq).toHaveBeenCalledWith("user_id", OWNER);
  });

  it("searches both name and merchant_name", async () => {
    await GET(req("coffee"));
    expect(mockOr).toHaveBeenCalledWith(
      "name.ilike.%coffee%,merchant_name.ilike.%coffee%",
    );
  });

  describe("wildcard handling", () => {
    it("escapes % so it is searched for literally, not as match-all", async () => {
      await GET(req("100%"));
      expect(mockOr).toHaveBeenCalledWith(
        String.raw`name.ilike.%100\%%,merchant_name.ilike.%100\%%`,
      );
    });

    it("escapes _ so it is not a single-character wildcard", async () => {
      await GET(req("a_b"));
      expect(mockOr).toHaveBeenCalledWith(
        String.raw`name.ilike.%a\_b%,merchant_name.ilike.%a\_b%`,
      );
    });
  });

  describe("results", () => {
    it("returns the matches and echoes the query", async () => {
      const body = await (await GET(req("coffee"))).json();
      expect(body.transactions).toHaveLength(1);
      expect(body.query).toBe("coffee");
    });

    it("reports hasMore only when the page is full", async () => {
      expect((await (await GET(req("coffee"))).json()).hasMore).toBe(false);
      mockLimit.mockResolvedValue({
        data: Array.from({ length: 100 }, (_, i) => ({ id: `t${i}` })),
        error: null,
      });
      expect((await (await GET(req("coffee"))).json()).hasMore).toBe(true);
    });

    it("returns an empty list rather than an error when nothing matches", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });
      const res = await GET(req("nothing"));
      expect(res.status).toBe(200);
      expect((await res.json()).transactions).toEqual([]);
    });

    it("returns 500, not an empty result, when the query fails", async () => {
      mockLimit.mockResolvedValue({ data: null, error: { message: "boom" } });
      const res = await GET(req("coffee"));
      expect(res.status).toBe(500);
      expect((await res.json()).transactions).toBeUndefined();
    });
  });
});
