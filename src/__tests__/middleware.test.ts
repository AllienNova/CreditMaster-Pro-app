/**
 * @jest-environment node
 *
 * AUTH-04 — middleware deny-by-default for /api/* + admin role from profiles.
 * Closes FND-001.
 */

// --- mocks -----------------------------------------------------------------

// jest resolves the non-edge build of `next/server`, where `NextResponse.next`
// is absent and `NextResponse.json` relies on a `Response.json` static that the
// node test env does not provide. Patch the three statics the middleware uses
// onto thin wrappers over the real `NextResponse` so behaviour is observable.
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  const RealNR = actual.NextResponse;
  const Patched = {
    next: (init?: { headers?: Headers }) =>
      new RealNR(null, { status: 200, headers: init?.headers }),
    json: (body: unknown, init?: { status?: number }) =>
      new RealNR(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
    redirect: (url: string | URL, status = 307) =>
      new RealNR(null, { status, headers: { location: String(url) } }),
  };
  return { ...actual, NextResponse: Patched };
});

import { NextRequest } from "next/server";

const mockGetUser = jest.fn();
const mockProfileSingle = jest.fn();
const mockIsFlagEnabledEdge = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...a: unknown[]) => mockResolveRoleFromDb(...a),
}));

jest.mock("@supabase/ssr", () => ({
  createServerClient: function () {
    return {
      auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
      from: function () {
        return {
          select: function () {
            return {
              eq: function () {
                return { single: (...a: unknown[]) => mockProfileSingle(...a) };
              },
            };
          },
        };
      },
    };
  },
}));

jest.mock("@/lib/flags/edge", () => ({
  isFlagEnabledEdge: (...args: unknown[]) => mockIsFlagEnabledEdge(...args),
  __clearEdgeFlagCache: function () {},
}));

import { middleware } from "@/middleware";

function buildRequest(path: string, cookies: Record<string, string>) {
  const headers = new Headers();
  const cookieEntries = Object.entries(cookies);
  if (cookieEntries.length > 0) {
    headers.set(
      "cookie",
      cookieEntries.map(([name, value]) => `${name}=${value}`).join("; "),
    );
  }
  return new NextRequest(`https://app.fynvita.com${path}`, {
    method: "GET",
    headers,
  });
}

function apiRequest(path: string, cookies: Record<string, string> = {}) {
  return buildRequest(path, cookies);
}

function pageRequest(path: string, cookies: Record<string, string> = {}) {
  return buildRequest(path, cookies);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("middleware — /api deny-by-default (AUTH-04)", () => {
  describe("with auth.deny_by_default flag ON", () => {
    beforeEach(() => {
      mockIsFlagEnabledEdge.mockResolvedValue(true);
    });

    it("returns 401 for a non-public /api route with no session", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const res = await middleware(apiRequest("/api/financial/budgets"));
      expect(res.status).toBe(401);
    });

    it("returns 401 for a non-public /api route when the session is invalid", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: {} });
      const res = await middleware(
        apiRequest("/api/financial/budgets", { "sb-access-token": "bad" }),
      );
      expect(res.status).toBe(401);
    });

    it("passes through a non-public /api route with a valid session", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      const res = await middleware(
        apiRequest("/api/financial/budgets", { "sb-access-token": "good" }),
      );
      expect(res.status).not.toBe(401);
    });

    it("passes through an exact public /api route with no session", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const res = await middleware(apiRequest("/api/health"));
      expect(res.status).not.toBe(401);
    });

    it("passes through a signature-verified webhook with no session", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const res = await middleware(apiRequest("/api/payment/webhook"));
      expect(res.status).not.toBe(401);
    });

    it("passes through a dynamic public /api route with no session", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const res = await middleware(
        apiRequest("/api/marketplace/products/abc-123"),
      );
      expect(res.status).not.toBe(401);
    });
  });

  describe("with auth.deny_by_default flag OFF (ships dark)", () => {
    beforeEach(() => {
      mockIsFlagEnabledEdge.mockResolvedValue(false);
    });

    it("does NOT 401 a non-public /api route when the flag is OFF", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const res = await middleware(apiRequest("/api/financial/budgets"));
      expect(res.status).not.toBe(401);
    });
  });
});

describe("middleware — admin role resolved from profiles, not JWT claims", () => {
  beforeEach(() => {
    mockIsFlagEnabledEdge.mockResolvedValue(true);
    // The cookie client can no longer read profiles at all (see FND-072); the
    // role now comes from resolveRoleFromDb. Default it to a plain user so
    // each test states the role it is actually about.
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("denies admin page access when JWT claims admin but profiles.role is user", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          app_metadata: { role: "admin" },
          user_metadata: { role: "super_admin" },
        },
      },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");

    const res = await middleware(
      pageRequest("/admin/dashboard", { "sb-access-token": "good" }),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
    expect(res.headers.get("location")).toContain("error=unauthorized");
  });

  it("allows admin page access when profiles.role is admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", app_metadata: {}, user_metadata: {} } },
    });
    mockResolveRoleFromDb.mockResolvedValue("admin");

    const res = await middleware(
      pageRequest("/admin/dashboard", { "sb-access-token": "good" }),
    );

    expect(res.status).not.toBe(307);
  });

  it("allows super_admin too", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", app_metadata: {}, user_metadata: {} } },
    });
    mockResolveRoleFromDb.mockResolvedValue("super_admin");

    const res = await middleware(
      pageRequest("/admin/dashboard", { "sb-access-token": "good" }),
    );

    expect(res.status).not.toBe(307);
  });

  /**
   * FND-072. The middleware used to read profiles.role with the @supabase/ssr
   * COOKIE client — i.e. as the `authenticated` role. public.profiles grants
   * that role no SELECT, and Postgres checks table privileges BEFORE RLS, so
   * the query returned nothing, the role fell back to "user", and every admin
   * was redirected to /dashboard?error=unauthorized. All 12 admin screens were
   * dark for everyone, and the catch swallowed it so nothing was logged.
   *
   * Meanwhile api-guard.ts — which guards all 284 API routes — resolved the
   * same question through resolveRoleFromDb and worked fine. One app, one
   * question, two answers.
   *
   * This is the regression test for that: the cookie client is unusable here,
   * and an admin still gets in.
   */
  it("admits an admin even when the cookie client cannot read profiles", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", app_metadata: {}, user_metadata: {} } },
    });
    // What a real `authenticated` request gets today: 42501, permission denied.
    mockProfileSingle.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied for table profiles" },
    });
    mockResolveRoleFromDb.mockResolvedValue("admin");

    const res = await middleware(
      pageRequest("/admin/dashboard", { "sb-access-token": "good" }),
    );

    expect(res.status).not.toBe(307);
  });

  it("does not ask the cookie client for the role at all", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", app_metadata: {}, user_metadata: {} } },
    });
    mockResolveRoleFromDb.mockResolvedValue("admin");
    mockProfileSingle.mockClear();

    await middleware(
      pageRequest("/admin/dashboard", { "sb-access-token": "good" }),
    );

    // Two sources for one decision is how they drifted apart in the first
    // place. resolveRoleFromDb is the declared single source; the middleware
    // must not keep a second path alive beside it.
    expect(mockProfileSingle).not.toHaveBeenCalled();
    expect(mockResolveRoleFromDb).toHaveBeenCalledWith("u1");
  });

  it("denies when the role lookup throws, rather than failing open", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", app_metadata: {}, user_metadata: {} } },
    });
    mockResolveRoleFromDb.mockRejectedValue(new Error("service role unset"));

    const res = await middleware(
      pageRequest("/admin/dashboard", { "sb-access-token": "good" }),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=unauthorized");
  });
});
