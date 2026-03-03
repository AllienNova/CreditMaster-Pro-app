/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRequireRole = jest.fn();
const mockCreateAuthResponse = jest.fn();

jest.mock("@/lib/security/auth-middleware", () => ({
  requireRole: (...args: any[]) => mockRequireRole(...args),
  createAuthResponse: (...args: any[]) => mockCreateAuthResponse(...args),
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

  // Default: auth passes
  mockRequireRole.mockResolvedValue({ authenticated: true, user: { role: "admin" } });

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
          data: { subscription_tier: "admin" },
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
  it("should return auth response when requireRole fails", async () => {
    mockRequireRole.mockResolvedValue({
      authenticated: false,
      error: "Forbidden",
    });
    mockCreateAuthResponse.mockReturnValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    expect(mockCreateAuthResponse).toHaveBeenCalled();
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

  it("should return isAdmin=true for whitelisted admin email", async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isAdmin).toBe(true);
    expect(body.user).toBeDefined();
  });

  it("should return isAdmin=false for non-admin email without admin tier", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "regular@example.com" } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { subscription_tier: "basic" },
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

  it("should return isAdmin=true for non-whitelisted email with enterprise tier", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "other@example.com" } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { subscription_tier: "enterprise" },
            error: null,
          }),
        }),
      }),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isAdmin).toBe(true);
  });
});
