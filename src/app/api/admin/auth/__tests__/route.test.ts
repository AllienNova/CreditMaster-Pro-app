/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────

// Route wrapped in withRole("admin") (TASK-AUTH-03a); guard resolves auth via
// jwtValidation.validateFromHeaders + resolveRoleFromDb.
const mockValidate = jest.fn();
const mockResolveRole = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: any[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: any[]) => mockResolveRole(...args),
}));

const mockCookies = jest.fn();
jest.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

// ── Import AFTER mocks ──────────────────────────────────────────────────────

import { GET } from "../route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(url?: string): NextRequest {
  return new NextRequest(
    url || "http://localhost:3000/api/admin/auth",
    { method: "GET" } as never,
  );
}

const ENV_BACKUP = { ...process.env };

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV_BACKUP };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

  // Default: auth passes (admin)
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "user-1", email: "admin@fynvita.com" },
  });
  mockResolveRole.mockResolvedValue("admin");

  // Default: cookies return access token
  mockCookies.mockReturnValue({
    get: jest.fn((name: string) => {
      if (name === "sb-access-token") return { value: "test-token" };
      return undefined;
    }),
  });

  // Default: supabase client
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "admin@fynvita.com" } },
    error: null,
  });

  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      }),
    }),
  });

  mockCreateClient.mockReturnValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  });
});

afterAll(() => {
  process.env = ENV_BACKUP;
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/auth
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Auth API – GET /api/admin/auth", () => {
  describe("negative-auth", () => {
    it("should return 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });

    it("should return 403 when the authenticated user is not an admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await GET(makeRequest());
      expect(res.status).toBe(403);
    });
  });

  it("should return 500 when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeDefined();
  });

  it("should return 401 when no access token cookie", async () => {
    mockCookies.mockReturnValue({
      get: jest.fn(() => undefined),
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("should return 401 when supabase getUser fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token" },
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("should return isAdmin=true when profiles.role is admin", async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isAdmin).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.role).toBe("admin");
  });

  it("should return isAdmin=false for non-admin role", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "regular@example.com" } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { role: "user" },
            error: null,
          }),
        }),
      }),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isAdmin).toBe(false);
  });

  // FND-003: a formerly-whitelisted email must NOT grant admin — role is the
  // only trusted source. This test previously asserted the vulnerable behavior
  // (whitelisted email => isAdmin: true); updated per Test Integrity Rule
  // exception (requirements changed) to encode the secure behavior.
  it("should return isAdmin=false for formerly-whitelisted email when role is user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "khonour@yahoo.com" } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { role: "user" },
            error: null,
          }),
        }),
      }),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isAdmin).toBe(false);
    expect(body.user.role).toBe("user");
  });

  // FND-004: enterprise subscription tier must NOT grant admin. This test
  // previously asserted the vulnerable behavior (enterprise tier => isAdmin:
  // true); updated per Test Integrity Rule exception (requirements changed) to
  // encode the secure behavior.
  it("should return isAdmin=false for enterprise tier when role is not admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "other@example.com" } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { role: "user", subscription_tier: "enterprise" },
            error: null,
          }),
        }),
      }),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isAdmin).toBe(false);
  });

  it("should reflect the real profiles.role and never a manufactured value", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "other@example.com" } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { role: "premium", subscription_tier: "enterprise" },
            error: null,
          }),
        }),
      }),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.role).toBe("premium");
    expect(body.user.role).not.toBe("enterprise");
  });
});
