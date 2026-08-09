/**
 * @jest-environment node
 */

// ── Mocks ────────────────────────────────────────────────────────────────────
// Routes wrapped in withRole("admin") (TASK-AUTH-03a); guard resolves auth via
// jwtValidation.validateFromHeaders + resolveRoleFromDb.
const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));

// Mock @supabase/supabase-js – stats and disputes routes create their own client
const mockFrom = jest.fn();
const mockAuth = {
  admin: {
    listUsers: jest.fn(),
  },
};
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Import AFTER mocks
import { GET as getStats } from "../stats/route";
import { GET as getDisputes, PATCH as patchDispute } from "../disputes/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(
  url: string,
  options?: { method?: string; body?: Record<string, unknown> },
) {
  const absoluteUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;
  const init: RequestInit = { method: options?.method || "GET" };
  if (options?.body) {
    init.method = options.method || "PATCH";
    init.body = JSON.stringify(options.body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(absoluteUrl, init as never);
}

function authenticatedAdmin() {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "admin-1", email: "admin@fynvita.com" },
  });
  mockResolveRole.mockResolvedValue("admin");
}

function unauthenticated() {
  mockValidate.mockResolvedValue({ valid: false, user: null });
}

function authenticatedNonAdmin() {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "user-1", email: "user@example.com" },
  });
  mockResolveRole.mockResolvedValue("user");
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  STATS – GET /api/admin/stats
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Stats API – GET /api/admin/stats", () => {
  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const res = await getStats(
        makeRequest("http://localhost:3000/api/admin/stats"),
      );
      expect(mockValidate).toHaveBeenCalled();
      expect(res.status).toBe(401);
    });

    it("should return 403 when authenticated user is not admin", async () => {
      authenticatedNonAdmin();
      const res = await getStats(
        makeRequest("http://localhost:3000/api/admin/stats"),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("DB not configured (no env vars)", () => {
    // ADM-2 (FND-052/053): route no longer returns fabricated data; it returns
    // 503 with an error message so the UI can show an honest "unavailable" state.
    beforeEach(() => {
      authenticatedAdmin();
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    });

    it("should return 503 with error when Supabase is not configured", async () => {
      const res = await getStats(
        makeRequest("http://localhost:3000/api/admin/stats"),
      );
      const body = await res.json();

      // Route must NOT return the old hardcoded fabricated stats (FND-052/053 fix)
      expect(res.status).toBe(503);
      expect(body.error).toBeDefined();
      expect(body.totalUsers).toBeUndefined();
      expect(body.monthlyRevenue).toBeUndefined();
    });
  });

  describe("Live data (with Supabase)", () => {
    beforeEach(() => {
      authenticatedAdmin();
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    });

    it("should fetch and return stats from Supabase", async () => {
      // Mock chainable query builders
      // profiles select -> count
      const profilesSelect = jest.fn().mockResolvedValue({ count: 500 });
      // subscriptions active select -> count
      const subsSelectEq = jest.fn().mockResolvedValue({ count: 300 });
      const subsSelect = jest.fn().mockReturnValue({ eq: subsSelectEq });
      // disputes total select -> count
      const disputesSelect = jest.fn().mockResolvedValue({ count: 150 });
      // disputes resolved select -> count
      const resolvedEq = jest.fn().mockResolvedValue({ count: 120 });
      const resolvedSelect = jest.fn().mockReturnValue({ eq: resolvedEq });

      // subscriptions for revenue — ADM-2: route now reads `plan` column with the
      // real 6-tier priceMap (standard=29.99, pro=99.99, family=199.99)
      const revenueSubsEq = jest.fn().mockResolvedValue({
        data: [
          { stripe_price_id: "price_standard" },
          { stripe_price_id: "price_pro" },
          { stripe_price_id: "price_family" },
        ],
        error: null,
      });
      const revenueSubsSelect = jest.fn().mockReturnValue({ eq: revenueSubsEq });

      // profiles for recent users count
      const recentUsersGte = jest.fn().mockResolvedValue({ count: 50 });
      const recentUsersSelect = jest.fn().mockReturnValue({ gte: recentUsersGte });

      // profiles for previous users count
      const previousLt = jest.fn().mockResolvedValue({ count: 40 });
      const previousGte = jest.fn().mockReturnValue({ lt: previousLt });
      const previousSelect = jest.fn().mockReturnValue({ gte: previousGte });

      let fromCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        fromCallCount++;
        // The route calls tables in this order:
        // 1) profiles (head count) — Promise.all #1
        // 2) subscriptions active (head count) — Promise.all #2
        // 3) disputes total (head count) — Promise.all #3
        // 4) disputes resolved (head count) — Promise.all #4
        // 5) subscriptions for revenue
        // 6) profiles for recentUsers
        // 7) profiles for previousUsers

        if (table === "profiles") {
          // Calls 1, 6, 7
          if (fromCallCount === 1) return { select: profilesSelect };
          if (fromCallCount === 6) return { select: recentUsersSelect };
          return { select: previousSelect };
        }
        if (table === "subscriptions") {
          // Calls 2, 5
          if (fromCallCount === 2) return { select: subsSelect };
          return { select: revenueSubsSelect };
        }
        if (table === "disputes") {
          // Calls 3, 4
          if (fromCallCount === 3) return { select: disputesSelect };
          return { select: resolvedSelect };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], count: 0 }) };
      });

      mockCreateClient.mockReturnValue({ from: mockFrom });

      const res = await getStats(
        makeRequest("http://localhost:3000/api/admin/stats"),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.totalUsers).toBe(500);
      expect(body.activeSubscriptions).toBe(300);
      expect(body.totalDisputes).toBe(150);
      expect(body.resolvedDisputes).toBe(120);
      // Revenue: standard(29.99) + pro(99.99) + family(199.99) = 329.97
      // ADM-2: 6-tier priceMap replaces old 3-tier (price_basic/premium/enterprise) prices
      expect(body.monthlyRevenue).toBeCloseTo(329.97, 1);
      // User growth: (50 - 40) / 40 * 100 = 25.0
      expect(body.userGrowth).toBe(25);
    });

    it("should return 500 with error on exception from Supabase", async () => {
      // ADM-2 (FND-052/053): route no longer falls back to hardcoded mock data;
      // DB errors surface as 500 so callers know the data is unavailable.
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          throw new Error("DB connection failed");
        }),
      });

      const res = await getStats(
        makeRequest("http://localhost:3000/api/admin/stats"),
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBeDefined();
      expect(body.totalUsers).toBeUndefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DISPUTES – GET /api/admin/disputes
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Disputes API – GET /api/admin/disputes", () => {
  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const res = await getDisputes(
        makeRequest("http://localhost:3000/api/admin/disputes"),
      );
      expect(res.status).toBe(401);
    });

    it("should return 403 when authenticated user is not admin", async () => {
      authenticatedNonAdmin();
      const res = await getDisputes(
        makeRequest("http://localhost:3000/api/admin/disputes"),
      );
      expect(res.status).toBe(403);
    });
  });

  // FND-049 remediation (commit 9086c75): the route no longer fabricates mock
  // disputes when Supabase is unconfigured — it returns an honest 503.
  describe("Database not configured (honest 503, never mock)", () => {
    beforeEach(() => {
      authenticatedAdmin();
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    });

    it("returns 503 with no fabricated disputes when Supabase is not configured", async () => {
      const res = await getDisputes(
        makeRequest("http://localhost:3000/api/admin/disputes"),
      );
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.error).toMatch(/database not configured/i);
      expect(body.disputes).toBeUndefined();
    });
  });

  describe("Live data (with Supabase)", () => {
    const disputeRows = [
      { id: "d1", user_id: "u1", status: "resolved", created_at: "2024-11-01" },
      { id: "d2", user_id: "u2", status: "sent", created_at: "2024-11-10" },
    ];

    beforeEach(() => {
      authenticatedAdmin();
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const orderMock = jest.fn().mockResolvedValue({
        data: disputeRows,
        error: null,
      });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });

      mockAuth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            { id: "u1", email: "user1@example.com" },
            { id: "u2", email: "user2@example.com" },
          ],
        },
      });

      mockFrom.mockReturnValue({ select: selectMock });
      mockCreateClient.mockReturnValue({
        from: mockFrom,
        auth: mockAuth,
      });
    });

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    it("should return enriched disputes from Supabase", async () => {
      const res = await getDisputes(
        makeRequest("http://localhost:3000/api/admin/disputes"),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.disputes.length).toBe(2);
      expect(body.total).toBe(2);
      expect(body.disputes[0].user_email).toBe("user1@example.com");
      expect(body.disputes[1].user_email).toBe("user2@example.com");
    });

    it("should return 'Unknown' for users not found in auth", async () => {
      mockAuth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
      });

      const res = await getDisputes(
        makeRequest("http://localhost:3000/api/admin/disputes"),
      );
      const body = await res.json();

      expect(body.disputes[0].user_email).toBe("Unknown");
    });

    it("should return 500 when Supabase returns an error", async () => {
      const orderMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({ select: selectMock });
      mockCreateClient.mockReturnValue({
        from: mockFrom,
        auth: mockAuth,
      });

      const res = await getDisputes(
        makeRequest("http://localhost:3000/api/admin/disputes"),
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to fetch disputes");
    });
  });

  describe("Exception handling", () => {
    it("should return 500 on unexpected throw", async () => {
      authenticatedAdmin();
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      mockCreateClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          throw new Error("Unexpected");
        }),
      });

      const res = await getDisputes(
        makeRequest("http://localhost:3000/api/admin/disputes"),
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");

      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DISPUTES – PATCH /api/admin/disputes
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Disputes API – PATCH /api/admin/disputes", () => {
  // PATCH is wrapped in withRole("admin") (TASK-AUTH-03a, FND-051).
  function makePatchRequest(body: Record<string, unknown>) {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  }

  beforeEach(() => {
    authenticatedAdmin();
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const req = makePatchRequest({
        disputeId: "d1",
        updates: { status: "resolved" },
      });
      const res = await patchDispute(req);
      expect(res.status).toBe(401);
    });

    it("should return 403 when authenticated user is not admin", async () => {
      authenticatedNonAdmin();
      const req = makePatchRequest({
        disputeId: "d1",
        updates: { status: "resolved" },
      });
      const res = await patchDispute(req);
      expect(res.status).toBe(403);
    });
  });

  describe("Validation", () => {
    it("should return 400 when disputeId is missing", async () => {
      const req = makePatchRequest({ updates: { status: "resolved" } });
      const res = await patchDispute(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Missing disputeId or updates");
    });

    it("should return 400 when updates is missing", async () => {
      const req = makePatchRequest({ disputeId: "d1" });
      const res = await patchDispute(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Missing disputeId or updates");
    });

    it("should return 400 when both fields are missing", async () => {
      const req = makePatchRequest({});
      const res = await patchDispute(req);

      expect(res.status).toBe(400);
    });
  });

  // FND-049 remediation (9086c75): PATCH returns an honest 503 when Supabase is
  // unconfigured, never a fabricated "Mock update successful".
  describe("Update with no DB configured (honest 503, never mock)", () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    });

    it("returns 503 (never a fabricated success) when Supabase is not configured", async () => {
      const req = makePatchRequest({
        disputeId: "d1",
        updates: { status: "resolved" },
      });
      const res = await patchDispute(req);
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.error).toMatch(/database not configured/i);
      expect(body.success).toBeUndefined();
    });
  });

  describe("Live update (with Supabase)", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    });

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    it("should update dispute in Supabase and return success", async () => {
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ update: updateMock });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const req = makePatchRequest({
        disputeId: "d1",
        updates: { status: "resolved" },
      });
      const res = await patchDispute(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("should return 500 when Supabase update fails", async () => {
      const eqMock = jest.fn().mockResolvedValue({
        error: { message: "Update failed" },
      });
      const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ update: updateMock });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const req = makePatchRequest({
        disputeId: "d1",
        updates: { status: "resolved" },
      });
      const res = await patchDispute(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to update dispute");
    });
  });

  describe("Exception handling", () => {
    it("should return 500 when request.json() throws", async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new Error("Parse error")),
      } as unknown as NextRequest;

      const res = await patchDispute(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });
  });
});
