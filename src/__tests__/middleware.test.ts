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
    mockProfileSingle.mockResolvedValue({ data: { role: "user" } });

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
    mockProfileSingle.mockResolvedValue({ data: { role: "admin" } });

    const res = await middleware(
      pageRequest("/admin/dashboard", { "sb-access-token": "good" }),
    );

    expect(res.status).not.toBe(307);
  });
});
