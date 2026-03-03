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

const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();
const mockListUsers = jest.fn();
const mockCreateClient = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

// ── Import AFTER mocks ──────────────────────────────────────────────────────

import { GET, DELETE } from "../route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(
  url?: string,
  options?: { method?: string; body?: Record<string, unknown> },
): NextRequest {
  const absoluteUrl =
    url || "http://localhost:3000/api/admin/subscriptions";
  const init: RequestInit = { method: options?.method || "GET" };
  if (options?.body) {
    init.method = options.method || "DELETE";
    init.body = JSON.stringify(options.body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(absoluteUrl, init as never);
}

const ENV_BACKUP = { ...process.env };

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV_BACKUP };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

  // Default: auth passes
  mockRequireRole.mockResolvedValue({
    authenticated: true,
    user: { role: "admin" },
  });
});

afterAll(() => {
  process.env = ENV_BACKUP;
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/subscriptions
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Subscriptions API – GET", () => {
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

  it("should return mock data when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.subscriptions).toBeDefined();
    expect(Array.isArray(body.subscriptions)).toBe(true);
    expect(body.subscriptions.length).toBeGreaterThan(0);
  });

  it("should return subscriptions from Supabase when env is configured", async () => {
    const mockSubscriptions = [
      {
        id: "sub-1",
        user_id: "user-1",
        plan: "premium",
        status: "active",
        profiles: { full_name: "Test User" },
      },
    ];

    mockSelect.mockReturnValue({
      order: jest.fn().mockResolvedValue({
        data: mockSubscriptions,
        error: null,
      }),
    });

    mockFrom.mockReturnValue({
      select: mockSelect,
    });

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: "user-1", email: "test@example.com" }] },
      error: null,
    });

    mockCreateClient.mockReturnValue({
      from: mockFrom,
      auth: { admin: { listUsers: mockListUsers } },
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.subscriptions).toBeDefined();
  });

  it("should return 500 when Supabase query fails", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Query failed" },
        }),
      }),
    });

    mockCreateClient.mockReturnValue({
      from: mockFrom,
      auth: { admin: { listUsers: mockListUsers } },
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/admin/subscriptions
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Subscriptions API – DELETE", () => {
  it("should parse body and proceed without auth check", async () => {
    // DELETE handler does not call requireRole — verify it still works
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const req = makeRequest(undefined, {
      method: "DELETE",
      body: { subscriptionId: "sub-1" },
    });
    req.json = jest.fn().mockResolvedValue({ subscriptionId: "sub-1" });

    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("should return 400 when subscriptionId is missing", async () => {
    const req = makeRequest(undefined, {
      method: "DELETE",
      body: {},
    });
    req.json = jest.fn().mockResolvedValue({});

    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it("should return mock success when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const req = makeRequest(undefined, {
      method: "DELETE",
      body: { subscriptionId: "sub-1" },
    });
    req.json = jest.fn().mockResolvedValue({ subscriptionId: "sub-1" });

    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("should cancel subscription via Supabase when env is configured", async () => {
    mockEq.mockResolvedValue({ data: {}, error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockCreateClient.mockReturnValue({ from: mockFrom });

    const req = makeRequest(undefined, {
      method: "DELETE",
      body: { subscriptionId: "sub-1" },
    });
    req.json = jest.fn().mockResolvedValue({ subscriptionId: "sub-1" });

    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("should return 500 when Supabase update fails", async () => {
    mockEq.mockResolvedValue({
      data: null,
      error: { message: "Update failed" },
    });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockCreateClient.mockReturnValue({ from: mockFrom });

    const req = makeRequest(undefined, {
      method: "DELETE",
      body: { subscriptionId: "sub-1" },
    });
    req.json = jest.fn().mockResolvedValue({ subscriptionId: "sub-1" });

    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
