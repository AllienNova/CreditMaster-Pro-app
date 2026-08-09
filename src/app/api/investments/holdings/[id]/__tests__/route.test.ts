/**
 * Tests for /api/investments/holdings/[id] (TASK-AUTH-03e)
 *
 * - negative-auth: unauthenticated callers are rejected with 401.
 * - IDOR regression: an authenticated user B cannot read/update/delete a
 *   holding owned by user A — the mutation is scoped to user_id (AUTH-03e
 *   review CRITICAL #1/#2).
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));

// Stateful supabase mock: holding "holding-A" is owned by "user-A".
// A query scoped to a different user_id resolves to an empty result, exactly
// as Postgres would. The mock records every `.eq()` to prove scoping.
const HOLDING_OWNER = "user-A";
const holdingRow = {
  id: "holding-A",
  user_id: HOLDING_OWNER,
  symbol: "AAPL",
  name: "Apple",
  shares: 10,
  average_cost_basis: 100,
  current_price: 120,
  sector: "Tech",
  asset_type: "stock",
  updated_at: "2026-01-01T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
};

function makeQuery(op: "update" | "delete") {
  const filters: Record<string, unknown> = {};
  const chain: Record<string, unknown> = {};
  chain.eq = (col: string, val: unknown) => {
    filters[col] = val;
    return chain;
  };
  const matches = () =>
    filters.id === holdingRow.id && filters.user_id === holdingRow.user_id;
  // UPDATE → .select().maybeSingle()
  chain.select = () => ({
    maybeSingle: () =>
      Promise.resolve({ data: matches() ? holdingRow : null, error: null }),
    // DELETE → .select() resolves to an array
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({
        data: matches() ? [{ id: holdingRow.id }] : [],
        error: null,
      }).then(resolve),
  });
  void op;
  return chain;
}

const mockSupabase = {
  from: () => ({
    update: () => makeQuery("update"),
    delete: () => makeQuery("delete"),
  }),
};

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(() => mockSupabase),
}));

import { GET, PATCH, DELETE } from "../route";

function createMockRequest(url: string, method = "GET"): NextRequest {
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({ shares: 5 }),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

// holding-A is owned by user-A
const URL_PATH = "http://localhost:3000/api/investments/holdings/holding-A";

describe("negative-auth – /api/investments/holdings/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await GET(createMockRequest(URL_PATH));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await PATCH(createMockRequest(URL_PATH, "PATCH"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await DELETE(createMockRequest(URL_PATH, "DELETE"));
    expect(res.status).toBe(401);
  });
});

describe("IDOR – /api/investments/holdings/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Authenticate as user-B, who does NOT own holding-A.
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-B", email: "user-b@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("PATCH by a non-owner returns 404, not success (AUTH-03e CRITICAL #1)", async () => {
    const res = await PATCH(createMockRequest(URL_PATH, "PATCH"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("DELETE by a non-owner returns 404, not success (AUTH-03e CRITICAL #2)", async () => {
    const res = await DELETE(createMockRequest(URL_PATH, "DELETE"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("idor: user B cannot delete user A's holding — returns 404 (FND-034 regression)", async () => {
    // user-B is already set in beforeEach; user-A owns holding-A.
    const res = await DELETE(createMockRequest(URL_PATH, "DELETE"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("PATCH by the owner succeeds", async () => {
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: HOLDING_OWNER, email: "user-a@example.com" },
    });
    const res = await PATCH(createMockRequest(URL_PATH, "PATCH"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("DELETE by the owner succeeds (FND-034 positive path)", async () => {
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: HOLDING_OWNER, email: "user-a@example.com" },
    });
    const res = await DELETE(createMockRequest(URL_PATH, "DELETE"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
