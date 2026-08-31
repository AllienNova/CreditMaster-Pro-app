/**
 * PATCH /api/financial/transactions/[id]
 *
 * The route did not exist, so recategorising a transaction did nothing.
 *
 * The case that matters: updating ZERO rows is not a Postgres error. A
 * transaction belonging to someone else matches nothing, the update resolves
 * cleanly, and a route that answered 200 would tell the user it was
 * recategorised when it was not. `.select().maybeSingle()` after the update is
 * the only signal available, so the absence of a returned row must become a 404.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockEq = jest.fn();
const mockUpdate = jest.fn();
const mockMaybeSingle = jest.fn();

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
      update: (...u: unknown[]) => {
        mockUpdate(...u);
        return {
          eq: (...a: unknown[]) => {
            mockEq(...a);
            return {
              eq: (...b: unknown[]) => {
                mockEq(...b);
                return {
                  select: () => ({ maybeSingle: () => mockMaybeSingle() }),
                };
              },
            };
          },
        };
      },
    }),
  }),
}));

import { PATCH } from "../route";

const OWNER = "user-1";
const TXN = "txn-123";

function req(body: unknown): NextRequest {
  const url = `http://localhost:3000/api/financial/transactions/${TXN}`;
  return {
    url,
    method: "PATCH",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("PATCH /api/financial/transactions/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("premium");
    mockMaybeSingle.mockResolvedValue({
      data: { id: TXN, category: ["Groceries"] },
      error: null,
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await PATCH(req({ category: "Groceries" }))).status).toBe(401);
  });

  describe("validation", () => {
    it.each<[unknown, string]>([
      [{}, "no category"],
      [{ category: "" }, "empty"],
      [{ category: "   " }, "whitespace only"],
      [{ category: 42 }, "not a string"],
      [{ category: "x".repeat(65) }, "too long"],
    ])("rejects %j — %s", async (body, _why) => {
      expect((await PATCH(req(body))).status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("trims the category so ' Food ' does not become its own entry", async () => {
      await PATCH(req({ category: "  Food  " }));
      expect(mockUpdate).toHaveBeenCalledWith({ category: ["Food"] });
    });

    it("writes an ARRAY, because the column is TEXT[] not text", async () => {
      // Postgres rejects a bare string here with `malformed array literal`.
      // The mocked client cannot enforce that, which is exactly how the first
      // draft of this route passed its whole suite while being unrunnable.
      await PATCH(req({ category: "Groceries" }));
      expect(mockUpdate).toHaveBeenCalledWith({ category: ["Groceries"] });
    });
  });

  it("scopes the update to the AUTHENTICATED user as well as the id", async () => {
    await PATCH(req({ category: "Groceries" }));
    expect(mockEq).toHaveBeenCalledWith("user_id", OWNER);
    expect(mockEq).toHaveBeenCalledWith("id", TXN);
  });

  it("returns the updated transaction", async () => {
    const res = await PATCH(req({ category: "Groceries" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.category).toEqual(["Groceries"]);
  });

  describe("when the update matched no row", () => {
    beforeEach(() =>
      mockMaybeSingle.mockResolvedValue({ data: null, error: null }),
    );

    it("returns 404, not a false success", async () => {
      // Zero rows updated is not a Postgres error, so without this the route
      // would report a recategorisation that never happened.
      const res = await PATCH(req({ category: "Groceries" }));
      expect(res.status).toBe(404);
      expect((await res.json()).success).toBeUndefined();
    });
  });

  it("returns 500 when the update errors", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await PATCH(req({ category: "Groceries" }))).status).toBe(500);
  });
});
