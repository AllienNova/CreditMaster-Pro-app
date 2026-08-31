/**
 * GET /api/financial/transactions/categories
 *
 * The route did not exist, so the category picker had nothing to offer.
 *
 * These are the categories the USER actually has. transactions.category is free
 * text — no CHECK constraint — so there is no canonical vocabulary to fall back
 * on, and an empty list is the honest answer for someone with no categorised
 * transactions rather than a reason to invent defaults.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockEq = jest.fn();
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
          return { not: () => ({ limit: () => mockLimit() }) };
        },
      }),
    }),
  }),
}));

import { GET } from "../route";

const OWNER = "user-1";

function req(): NextRequest {
  const url = "http://localhost:3000/api/financial/transactions/categories";
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/financial/transactions/categories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("premium");
    mockLimit.mockResolvedValue({
      // TEXT[] — Plaid stores a hierarchy per transaction.
      data: [
        { category: ["Food and Drink", "Groceries"] },
        { category: ["Transport"] },
        { category: ["Groceries"] },
      ],
      error: null,
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(req())).status).toBe(401);
  });

  it("reads only the AUTHENTICATED user's transactions", async () => {
    await GET(req());
    expect(mockEq).toHaveBeenCalledWith("user_id", OWNER);
  });

  it("flattens each hierarchy so every level can be picked", async () => {
    const body = await (await GET(req())).json();
    expect(body.categories).toEqual(["Food and Drink", "Groceries", "Transport"]);
  });

  it("drops null and blank categories rather than listing an empty entry", async () => {
    mockLimit.mockResolvedValue({
      data: [{ category: ["Food"] }, { category: null }, { category: ["   "] }],
      error: null,
    });
    expect((await (await GET(req())).json()).categories).toEqual(["Food"]);
  });

  it("treats ' Food ' and 'Food' as one category", async () => {
    mockLimit.mockResolvedValue({
      data: [{ category: [" Food "] }, { category: ["Food"] }],
      error: null,
    });
    expect((await (await GET(req())).json()).categories).toEqual(["Food"]);
  });

  it("returns an empty list, not invented defaults, when there are none", async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect((await res.json()).categories).toEqual([]);
  });

  it("returns 500 rather than an empty list when the read fails", async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect((await res.json()).categories).toBeUndefined();
  });
});
