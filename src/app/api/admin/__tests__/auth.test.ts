/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────
// Must be defined BEFORE imports

const mockRequireRole = jest.fn();
const mockCreateAuthResponse = jest.fn();
jest.mock("@/lib/security/auth-middleware", () => ({
  requireRole: mockRequireRole,
  createAuthResponse: mockCreateAuthResponse,
}));

const mockGetUser = jest.fn();
const mockFromSelect = jest.fn();
const mockFromSelectEqSingle = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

const mockCookiesGet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (...args: any[]) => mockCookiesGet(...args),
  }),
}));

// Import AFTER mocks
import { GET } from "../../admin/auth/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(
  url: string = "http://localhost:3000/api/admin/auth",
  options?: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
) {
  const absoluteUrl = url.startsWith("http")
    ? url
    : `http://localhost:3000${url}`;
  const init: RequestInit = { method: options?.method || "GET" };
  const headers: Record<string, string> = {};
  if (options?.headers) Object.assign(headers, options.headers);
  if (options?.body) {
    init.method = options.method || "POST";
    init.body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }
  init.headers = headers;
  return new NextRequest(absoluteUrl, init as never);
}

function authenticatedAdmin() {
  mockRequireRole.mockResolvedValue({
    authenticated: true,
    user: { id: "admin-1", email: "admin@fynvita.com", role: "admin" },
  });
}

function unauthenticated(errorMsg = "Not authenticated") {
  mockRequireRole.mockResolvedValue({
    authenticated: false,
    error: errorMsg,
  });
  mockCreateAuthResponse.mockReturnValue(
    new Response(JSON.stringify({ error: errorMsg }), { status: 401 }),
  );
}

function setupSupabaseClient(
  user: { id: string; email: string } | null,
  profile: { subscription_tier: string } | null = null,
  userError: any = null,
) {
  mockFromSelectEqSingle.mockResolvedValue({
    data: profile,
  });
  const eqMock = jest.fn().mockReturnValue({ single: mockFromSelectEqSingle });
  mockFromSelect.mockReturnValue({ eq: eqMock });
  mockGetUser.mockResolvedValue({
    data: { user },
    error: userError,
  });

  mockCreateClient.mockReturnValue({
    auth: { getUser: mockGetUser },
    from: jest.fn().mockReturnValue({ select: mockFromSelect }),
  });
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("Admin Auth API – GET /api/admin/auth", () => {
  describe("Authentication gate (requireRole)", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const res = await GET(makeRequest());
      expect(mockRequireRole).toHaveBeenCalled();
      expect(mockCreateAuthResponse).toHaveBeenCalled();
      expect(res.status).toBe(401);
    });

    it("should call requireRole with 'admin'", async () => {
      unauthenticated();
      const req = makeRequest();
      await GET(req);
      expect(mockRequireRole).toHaveBeenCalledWith(req, "admin");
    });
  });

  describe("Missing Supabase configuration", () => {
    it("should return 500 when SUPABASE_URL is missing", async () => {
      authenticatedAdmin();
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.isAdmin).toBe(false);
      expect(body.error).toBe("Server configuration error");
    });

    it("should return 500 when SUPABASE_ANON_KEY is missing", async () => {
      authenticatedAdmin();
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.isAdmin).toBe(false);
    });
  });

  describe("Missing access token in cookies", () => {
    it("should return 401 when sb-access-token cookie is absent", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockReturnValue(undefined);

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.isAdmin).toBe(false);
      expect(body.error).toBe("Not authenticated");
    });
  });

  describe("Invalid session (getUser fails)", () => {
    it("should return 401 when Supabase getUser returns error", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === "sb-access-token") return { value: "valid-token" };
        if (name === "sb-refresh-token") return { value: "refresh-token" };
        return undefined;
      });
      setupSupabaseClient(null, null, { message: "Invalid token" });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.isAdmin).toBe(false);
      expect(body.error).toBe("Invalid session");
    });

    it("should return 401 when getUser returns null user", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === "sb-access-token") return { value: "valid-token" };
        return undefined;
      });
      setupSupabaseClient(null, null, null);

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Invalid session");
    });
  });

  describe("Admin email whitelist check", () => {
    it("should return isAdmin=true for whitelisted admin email", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === "sb-access-token") return { value: "valid-token" };
        return undefined;
      });
      setupSupabaseClient(
        { id: "user-1", email: "admin@fynvita.com" },
        { subscription_tier: "basic" },
      );

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.isAdmin).toBe(true);
      expect(body.user.role).toBe("admin");
      expect(body.user.email).toBe("admin@fynvita.com");
    });

    it("should return isAdmin=true for kimhons@gmail.com", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === "sb-access-token") return { value: "valid-token" };
        return undefined;
      });
      setupSupabaseClient(
        { id: "user-2", email: "kimhons@gmail.com" },
        { subscription_tier: "premium" },
      );

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.isAdmin).toBe(true);
      expect(body.user.role).toBe("admin");
    });

    it("should return isAdmin=false for non-admin, non-enterprise email", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === "sb-access-token") return { value: "valid-token" };
        return undefined;
      });
      setupSupabaseClient(
        { id: "user-3", email: "regular@user.com" },
        { subscription_tier: "basic" },
      );

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.isAdmin).toBe(false);
      expect(body.user.role).toBe("user");
    });
  });

  describe("Enterprise tier access", () => {
    it("should grant admin access to enterprise tier users", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === "sb-access-token") return { value: "valid-token" };
        return undefined;
      });
      setupSupabaseClient(
        { id: "user-4", email: "enterprise@corp.com" },
        { subscription_tier: "enterprise" },
      );

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.isAdmin).toBe(true);
      expect(body.user.role).toBe("enterprise");
    });

    it("should set role to 'enterprise' when user is not in whitelist but has enterprise tier", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === "sb-access-token") return { value: "valid-token" };
        return undefined;
      });
      setupSupabaseClient(
        { id: "user-5", email: "bigcorp@company.com" },
        { subscription_tier: "enterprise" },
      );

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.user.role).toBe("enterprise");
    });
  });

  describe("Profile lookup", () => {
    it("should handle null profile gracefully (no subscription_tier)", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === "sb-access-token") return { value: "valid-token" };
        return undefined;
      });
      setupSupabaseClient(
        { id: "user-6", email: "nosubscription@user.com" },
        null,
      );

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.isAdmin).toBe(false);
      expect(body.user.role).toBe("user");
    });
  });

  describe("Error handling", () => {
    it("should return 500 when an unexpected error occurs", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockImplementation(() => {
        throw new Error("Cookie read failed");
      });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.isAdmin).toBe(false);
      expect(body.error).toBe("Authentication failed");
    });
  });

  describe("Response shape", () => {
    it("should include user id, email, and role in successful response", async () => {
      authenticatedAdmin();
      mockCookiesGet.mockImplementation((name: string) => {
        if (name === "sb-access-token") return { value: "valid-token" };
        return undefined;
      });
      setupSupabaseClient(
        { id: "user-7", email: "admin@fynvita.com" },
        { subscription_tier: "basic" },
      );

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.user).toHaveProperty("id", "user-7");
      expect(body.user).toHaveProperty("email", "admin@fynvita.com");
      expect(body.user).toHaveProperty("role");
    });
  });
});
