/**
 * @jest-environment node
 *
 * Tests for /api/auth/sessions — the route that replaced a direct browser query
 * against `public.sessions`.
 *
 * WHY THE ROUTE EXISTS. SessionManagement.tsx (a client component) called
 * sessionService, which queries `public.sessions` with the BROWSER anon client.
 * That table grants `authenticated` no privilege, so every request returned 403
 * and /settings/security could neither list sessions nor revoke them — a
 * security control that silently did not work.
 *
 * WHAT THESE TESTS PIN DOWN. The route runs under the SERVICE ROLE, which
 * bypasses RLS, so `user.id` from the auth guard is the only thing scoping both
 * the read and the delete. Every query below is asserted to carry
 * .eq("user_id", <authenticated caller>) — never an id from the request.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

// Captures the chain so each test can assert which filters were applied.
let chain: Record<string, jest.Mock>;
const mockFrom = jest.fn(() => chain);

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { GET, DELETE } from "../route";

const CALLER = "user-owner-1";
const OTHER_USERS_SESSION = "session-belonging-to-someone-else";

function makeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, jest.Mock> = {};
  for (const m of ["select", "eq", "gt", "neq", "delete", "order"]) {
    c[m] = jest.fn(() => c);
  }
  // Terminal await on the builder resolves to the query result.
  (c as unknown as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return c;
}

function makeRequest(url: string, method = "GET"): NextRequest {
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const BASE = "http://localhost:3000/api/auth/sessions";

beforeEach(() => {
  jest.clearAllMocks();
  chain = makeChain({ data: [], error: null });
  // jest.config.js sets resetMocks: true, which strips implementations — not
  // just calls — before every test. Without this, from() returns undefined and
  // each case fails inside the route rather than on its assertion.
  mockFrom.mockImplementation(() => chain);
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "owner@example.com" },
  });
  mockResolveRoleFromDb.mockResolvedValue("user");
});

describe("GET /api/auth/sessions", () => {
  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(makeRequest(BASE))).status).toBe(401);
  });

  it("scopes the read to the authenticated caller", async () => {
    await GET(makeRequest(BASE));

    expect(mockFrom).toHaveBeenCalledWith("sessions");
    expect(chain.eq).toHaveBeenCalledWith("user_id", CALLER);
  });

  it("excludes expired sessions", async () => {
    await GET(makeRequest(BASE));

    expect(chain.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
  });

  it("orders by last_activity — the column that exists", async () => {
    // `last_active_at` does NOT exist on public.sessions; ordering by it made
    // PostgREST reject the whole query.
    await GET(makeRequest(BASE));

    expect(chain.order).toHaveBeenCalledWith("last_activity", {
      ascending: false,
    });
  });

  it("derives device, browser and OS from the stored user_agent", async () => {
    chain = makeChain({
      data: [
        {
          id: "s1",
          user_id: CALLER,
          user_agent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          ip_address: "203.0.113.10",
          last_activity: "2026-08-15T04:31:22.423Z",
          expires_at: "2026-08-22T04:31:22.423Z",
          created_at: "2026-08-15T04:31:22.423Z",
        },
      ],
      error: null,
    });

    const body = await (await GET(makeRequest(BASE))).json();

    expect(body.data[0]).toMatchObject({
      deviceName: "Chrome on macOS",
      deviceType: "desktop",
      browser: "Chrome",
      os: "macOS",
    });
  });

  it("reports Unknown rather than guessing when there is no user_agent", async () => {
    chain = makeChain({
      data: [
        {
          id: "s1",
          user_id: CALLER,
          user_agent: null,
          ip_address: "203.0.113.10",
          last_activity: "2026-08-15T04:31:22.423Z",
          expires_at: "2026-08-22T04:31:22.423Z",
          created_at: "2026-08-15T04:31:22.423Z",
        },
      ],
      error: null,
    });

    const body = await (await GET(makeRequest(BASE))).json();

    expect(body.data[0]).toMatchObject({
      deviceName: "Unknown device",
      deviceType: "unknown",
      browser: "Unknown",
      os: "Unknown",
    });
  });

  it("returns 500 when the query fails, rather than an empty list", async () => {
    chain = makeChain({ data: null, error: { message: "boom" } });

    // An empty array would be indistinguishable from "you have no sessions",
    // which on a security screen reads as "nothing to revoke".
    expect((await GET(makeRequest(BASE))).status).toBe(500);
  });
});

describe("DELETE /api/auth/sessions", () => {
  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect(
      (await DELETE(makeRequest(`${BASE}?sessionId=s1`, "DELETE"))).status,
    ).toBe(401);
  });

  it("returns 400 when neither sessionId nor allExcept is given", async () => {
    // Without this guard the delete would carry only .eq("user_id", …) and
    // wipe every session the caller has.
    expect((await DELETE(makeRequest(BASE, "DELETE"))).status).toBe(400);
  });

  it("scopes a single revoke to the caller — IDOR guard", async () => {
    await DELETE(
      makeRequest(`${BASE}?sessionId=${OTHER_USERS_SESSION}`, "DELETE"),
    );

    // Both filters must be present: passing someone else's session id deletes
    // nothing instead of deleting their session.
    expect(chain.eq).toHaveBeenCalledWith("user_id", CALLER);
    expect(chain.eq).toHaveBeenCalledWith("id", OTHER_USERS_SESSION);
  });

  it("scopes a revoke-all-others to the caller", async () => {
    await DELETE(makeRequest(`${BASE}?allExcept=current-1`, "DELETE"));

    expect(chain.eq).toHaveBeenCalledWith("user_id", CALLER);
    expect(chain.neq).toHaveBeenCalledWith("id", "current-1");
  });

  it("returns 500 when the delete fails", async () => {
    chain = makeChain({ data: null, error: { message: "boom" } });

    expect(
      (await DELETE(makeRequest(`${BASE}?sessionId=s1`, "DELETE"))).status,
    ).toBe(500);
  });
});
