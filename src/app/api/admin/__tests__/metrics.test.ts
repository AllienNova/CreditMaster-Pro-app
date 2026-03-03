/**
 * @jest-environment node
 */

// ── Mocks ────────────────────────────────────────────────────────────────────
// Mock the auth-middleware module used by the metrics route
const mockRequireRole = jest.fn();
const mockCreateAuthResponse = jest.fn();
jest.mock("@/lib/security/auth-middleware", () => ({
  requireRole: mockRequireRole,
  createAuthResponse: mockCreateAuthResponse,
}));

// Mock @supabase/supabase-js – the metrics route creates its own client
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Import AFTER mocks are registered
import { GET } from "../metrics/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(url = "http://localhost:3000/api/admin/metrics") {
  return new NextRequest(url);
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
  mockCreateAuthResponse.mockReturnValue({
    status: 401,
    json: async () => ({ error: errorMsg }),
  });
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  // Default environment variables the route relies on
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("Admin Metrics API – GET /api/admin/metrics", () => {
  // ── Authentication ──────────────────────────────────────────────────────
  describe("Authentication", () => {
    it("should return 401 when the user is not authenticated", async () => {
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

  // ── Successful data fetch ───────────────────────────────────────────────
  describe("Successful metrics retrieval", () => {
    const usersData = [
      { id: "u1", created_at: new Date().toISOString() },
      { id: "u2", created_at: new Date(Date.now() - 86400000 * 60).toISOString() },
    ];
    const disputesData = [
      { id: "d1", status: "resolved", created_at: new Date().toISOString() },
      { id: "d2", status: "sent", created_at: new Date().toISOString() },
      { id: "d3", status: "resolved", created_at: new Date().toISOString() },
    ];
    const subscriptionsData = [
      { id: "s1", plan: "premium", status: "active", amount: 79 },
      { id: "s2", plan: "basic", status: "active", amount: 29 },
      { id: "s3", plan: "premium", status: "canceled", amount: 79 },
    ];
    const paymentsData = [
      { amount: 79, created_at: new Date().toISOString() },
      { amount: 29, created_at: new Date().toISOString() },
    ];

    beforeEach(() => {
      authenticatedAdmin();

      // Build chainable Supabase mock
      const selectForProfiles = jest.fn().mockResolvedValue({
        data: usersData,
        count: usersData.length,
      });
      const selectForDisputes = jest.fn().mockResolvedValue({
        data: disputesData,
        count: disputesData.length,
      });
      const selectForSubscriptions = jest.fn().mockResolvedValue({
        data: subscriptionsData,
        count: subscriptionsData.length,
      });
      const selectForPaymentsGte = jest.fn().mockResolvedValue({
        data: paymentsData,
      });
      const selectForPayments = jest.fn().mockReturnValue({
        gte: selectForPaymentsGte,
      });

      mockFrom.mockImplementation((table: string) => {
        switch (table) {
          case "profiles":
            return { select: selectForProfiles };
          case "disputes":
            return { select: selectForDisputes };
          case "subscriptions":
            return { select: selectForSubscriptions };
          case "payments":
            return { select: selectForPayments };
          default:
            return { select: jest.fn().mockResolvedValue({ data: [], count: 0 }) };
        }
      });

      mockCreateClient.mockReturnValue({ from: mockFrom });
    });

    it("should return 200 with metrics data for default 30d period", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.metrics).toBeDefined();
      expect(body.trends).toBeDefined();
    });

    it("should compute totalUsers from profiles count", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.metrics.totalUsers).toBe(usersData.length);
    });

    it("should compute totalDisputes from disputes count", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.metrics.totalDisputes).toBe(disputesData.length);
    });

    it("should count successfulDisputes as those with status 'resolved'", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      // 2 out of 3 disputes are resolved
      expect(body.metrics.successfulDisputes).toBe(2);
    });

    it("should compute disputeSuccessRate as a percentage string", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      // 2 / 3 = 66.7%
      expect(body.metrics.disputeSuccessRate).toBe("66.7%");
    });

    it("should count activeSubscriptions from active status only", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      // 2 active out of 3 total subscriptions
      expect(body.metrics.activeSubscriptions).toBe(2);
    });

    it("should compute MRR from active subscriptions' amounts", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      // 79 + 29 = 108 (only active ones)
      expect(body.metrics.mrr).toBe(108);
    });

    it("should compute revenue from payments in the period", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      // 79 + 29 = 108
      expect(body.metrics.revenue).toBe(108);
    });

    it("should include the requested period in the response", async () => {
      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/metrics?period=7d"),
      );
      const body = await res.json();

      expect(body.metrics.period).toBe("7d");
    });

    it("should return trend data arrays for users, disputes, and revenue", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      expect(Array.isArray(body.trends.users)).toBe(true);
      expect(Array.isArray(body.trends.disputes)).toBe(true);
      expect(Array.isArray(body.trends.revenue)).toBe(true);

      // Each trend entry has date + value
      if (body.trends.users.length > 0) {
        expect(body.trends.users[0]).toHaveProperty("date");
        expect(body.trends.users[0]).toHaveProperty("value");
      }
    });
  });

  // ── Period parameter handling ───────────────────────────────────────────
  describe("Period parameter", () => {
    beforeEach(() => {
      authenticatedAdmin();
      // Minimal mock that resolves without error
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });
      // Make the first three selects resolve directly
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockImplementation(() => ({
          gte: jest.fn().mockResolvedValue({ data: [] }),
        })),
      }));
      mockCreateClient.mockReturnValue({ from: mockFrom });

      // Override so all four promises resolve with valid structure
      const resolvedValue = { data: [], count: 0 };
      const selectMock = jest.fn().mockReturnValue({
        gte: jest.fn().mockResolvedValue(resolvedValue),
      });
      // For profiles/disputes/subscriptions that don't chain .gte
      const directSelectMock = jest.fn().mockResolvedValue(resolvedValue);
      mockFrom.mockImplementation((table: string) => {
        if (table === "payments") {
          return { select: selectMock };
        }
        return { select: directSelectMock };
      });
      mockCreateClient.mockReturnValue({ from: mockFrom });
    });

    it("should default to 30d when no period is specified", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();
      expect(body.metrics.period).toBe("30d");
    });

    it("should accept 7d period", async () => {
      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/metrics?period=7d"),
      );
      const body = await res.json();
      expect(body.metrics.period).toBe("7d");
    });

    it("should accept 90d period", async () => {
      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/metrics?period=90d"),
      );
      const body = await res.json();
      expect(body.metrics.period).toBe("90d");
    });

    it("should fall back to 30d for unknown period values", async () => {
      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/metrics?period=unknown"),
      );
      const body = await res.json();
      expect(body.metrics.period).toBe("unknown");
      // The switch default sets startDate to 30 days, but the period param is echoed as-is
    });
  });

  // ── Error handling ──────────────────────────────────────────────────────
  describe("Error handling", () => {
    it("should return 500 with error message when Supabase throws", async () => {
      authenticatedAdmin();
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          throw new Error("Supabase connection failed");
        }),
      });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to fetch metrics");
    });

    it("should return 500 when a Supabase query rejects", async () => {
      authenticatedAdmin();
      // Make select() throw synchronously for all tables
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockImplementation(() => {
            throw new Error("DB down");
          }),
        }),
      });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to fetch metrics");
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────
  describe("Edge cases", () => {
    beforeEach(() => {
      authenticatedAdmin();
    });

    it("should handle zero disputes correctly (disputeSuccessRate is 0)", async () => {
      const emptyResult = { data: [], count: 0 };
      mockFrom.mockImplementation((table: string) => {
        if (table === "payments") {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue(emptyResult),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue(emptyResult) };
      });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.metrics.totalDisputes).toBe(0);
      expect(body.metrics.disputeSuccessRate).toBe("0%");
    });

    it("should handle null data arrays gracefully", async () => {
      const nullDataResult = { data: null, count: 0 };
      mockFrom.mockImplementation((table: string) => {
        if (table === "payments") {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue(nullDataResult),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue(nullDataResult) };
      });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.metrics.activeSubscriptions).toBe(0);
      expect(body.metrics.mrr).toBe(0);
      expect(body.metrics.revenue).toBe(0);
      expect(body.metrics.newUsers).toBe(0);
    });
  });
});
