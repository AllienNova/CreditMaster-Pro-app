/**
 * @jest-environment node
 */

// ── Mocks ────────────────────────────────────────────────────────────────────
// Routes are wrapped in withRole("admin") (TASK-AUTH-03a). The guard resolves
// auth via jwtValidation.validateFromHeaders + resolveRoleFromDb, so the test
// mocks that path rather than the removed requireRole middleware.
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

// Analytics route calls Supabase directly — mock the client
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

// Import AFTER mocks are registered
import { GET as getSettings, POST as postSettings } from "../settings/route";
import { GET as getAnalytics } from "../analytics/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(
  url: string,
  options?: { method?: string; body?: Record<string, unknown> },
) {
  // Ensure absolute URL for the mock NextRequest
  const absoluteUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;
  const init: RequestInit = { method: options?.method || "GET" };
  if (options?.body) {
    init.method = "POST";
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

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS – GET /api/admin/settings
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Settings API – GET /api/admin/settings", () => {
  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const res = await getSettings(
        makeRequest("http://localhost:3000/api/admin/settings"),
      );
      expect(mockValidate).toHaveBeenCalled();
      expect(res.status).toBe(401);
    });

    it("should return 403 when authenticated user is not admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const req = makeRequest("http://localhost:3000/api/admin/settings");
      const res = await getSettings(req);
      expect(res.status).toBe(403);
    });
  });

  describe("Successful retrieval", () => {
    it("should return the current settings object with status 200", async () => {
      authenticatedAdmin();
      const res = await getSettings(
        makeRequest("http://localhost:3000/api/admin/settings"),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("siteName");
      expect(body).toHaveProperty("supportEmail");
      expect(body).toHaveProperty("maxDisputesPerMonth");
      expect(body).toHaveProperty("aiModelDefault");
      expect(body).toHaveProperty("maintenanceMode");
      expect(body).toHaveProperty("signupsEnabled");
      expect(body).toHaveProperty("stripeTestMode");
    });

    it("should return default siteName as Fynvita", async () => {
      authenticatedAdmin();
      const res = await getSettings(
        makeRequest("http://localhost:3000/api/admin/settings"),
      );
      const body = await res.json();
      expect(body.siteName).toBe("Fynvita");
    });

    it("should return default maxDisputesPerMonth as 10", async () => {
      authenticatedAdmin();
      const res = await getSettings(
        makeRequest("http://localhost:3000/api/admin/settings"),
      );
      const body = await res.json();
      expect(body.maxDisputesPerMonth).toBe(10);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS – POST /api/admin/settings
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Settings API – POST /api/admin/settings", () => {
  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const res = await postSettings(
        makeRequest("http://localhost:3000/api/admin/settings", {
          body: { siteName: "New Name" },
        }),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("Successful update", () => {
    it("should update settings and return success", async () => {
      authenticatedAdmin();

      // Create a request whose .json() actually returns the body
      const req = makeRequest("http://localhost:3000/api/admin/settings", {
        body: { siteName: "Updated Platform" },
      });
      // Override json() on the request to return our desired payload
      req.json = jest.fn().mockResolvedValue({ siteName: "Updated Platform" });

      const res = await postSettings(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.settings).toBeDefined();
      expect(body.settings.siteName).toBe("Updated Platform");
    });

    it("should merge new settings with existing settings", async () => {
      authenticatedAdmin();

      const req = makeRequest("http://localhost:3000/api/admin/settings", {
        body: { maxDisputesPerMonth: 20 },
      });
      req.json = jest.fn().mockResolvedValue({ maxDisputesPerMonth: 20 });

      const res = await postSettings(req);
      const body = await res.json();

      // The updated field should be reflected
      expect(body.settings.maxDisputesPerMonth).toBe(20);
      // Other fields should remain
      expect(body.settings.supportEmail).toBeDefined();
    });

    it("should allow toggling maintenanceMode", async () => {
      authenticatedAdmin();

      const req = makeRequest("http://localhost:3000/api/admin/settings", {
        body: { maintenanceMode: true },
      });
      req.json = jest.fn().mockResolvedValue({ maintenanceMode: true });

      const res = await postSettings(req);
      const body = await res.json();

      expect(body.settings.maintenanceMode).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should return 500 when request.json() throws", async () => {
      authenticatedAdmin();

      const req = makeRequest("http://localhost:3000/api/admin/settings");
      req.json = jest.fn().mockRejectedValue(new Error("Invalid JSON"));

      const res = await postSettings(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to save settings");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ANALYTICS – GET /api/admin/analytics
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Analytics API – GET /api/admin/analytics", () => {
  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics"),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("Successful retrieval", () => {
    beforeEach(() => {
      authenticatedAdmin();

      // disputes: .select("status").range() — terminal
      const disputeRangeMock = jest.fn().mockResolvedValue({
        data: [
          { status: "resolved" },
          { status: "sent" },
          { status: "draft" },
          { status: "under_review" },
          { status: "rejected" },
        ],
        error: null,
      });

      // subscriptions plan-counts: .select("plan").range() — terminal (1st subs call)
      const subPlanRangeMock = jest.fn().mockResolvedValue({
        data: [
          { stripe_price_id: "price_free" },
          { stripe_price_id: "price_standard" },
          { stripe_price_id: "price_pro" },
          { stripe_price_id: "price_family_duo" },
        ],
        error: null,
      });

      // profiles user-growth: .select().gte().lte() — terminal
      const profileLteMock = jest.fn().mockResolvedValue({ count: 5, error: null });
      const profileGteMock = jest.fn().mockReturnValue({ lte: profileLteMock });
      const profileSelectMock = jest.fn().mockReturnValue({ gte: profileGteMock });

      // subscriptions revenue: .select("plan").eq().gte().lte() — terminal (6 calls)
      const revLteMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const revGteMock = jest.fn().mockReturnValue({ lte: revLteMock });
      const revEqMock = jest.fn().mockReturnValue({ gte: revGteMock });
      const revSelectMock = jest.fn().mockReturnValue({ eq: revEqMock });

      // Dispatch by table; distinguish first subscriptions call (plan) from rest (revenue)
      let subsCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "disputes") {
          return { select: jest.fn().mockReturnValue({ range: disputeRangeMock }) };
        }
        if (table === "subscriptions") {
          subsCallCount += 1;
          if (subsCallCount === 1) {
            return { select: jest.fn().mockReturnValue({ range: subPlanRangeMock }) };
          }
          return { select: revSelectMock };
        }
        if (table === "profiles") {
          return { select: profileSelectMock };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      mockCreateClient.mockReturnValue({ from: mockFrom });
    });

    it("should return analytics data with 200 status", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics"),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("userGrowth");
      expect(body).toHaveProperty("revenueByMonth");
      expect(body).toHaveProperty("disputesByStatus");
      expect(body).toHaveProperty("subscriptionsByTier");
      expect(body).toHaveProperty("topFeatures");
      expect(body).toHaveProperty("timeRange");
    });

    it("should default to 30d time range", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics"),
      );
      const body = await res.json();
      expect(body.timeRange).toBe("30d");
    });

    it("should respect the 7d range parameter", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics?range=7d"),
      );
      const body = await res.json();
      expect(body.timeRange).toBe("7d");
    });

    it("should respect the 90d range parameter", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics?range=90d"),
      );
      const body = await res.json();
      expect(body.timeRange).toBe("90d");
    });

    it("should return userGrowth as an array with date and count", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics"),
      );
      const body = await res.json();

      expect(Array.isArray(body.userGrowth)).toBe(true);
      expect(body.userGrowth.length).toBeGreaterThan(0);
      expect(body.userGrowth[0]).toHaveProperty("date");
      expect(body.userGrowth[0]).toHaveProperty("count");
    });

    it("should return revenueByMonth as an array with month and revenue", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics"),
      );
      const body = await res.json();

      expect(Array.isArray(body.revenueByMonth)).toBe(true);
      expect(body.revenueByMonth.length).toBe(6);
      expect(body.revenueByMonth[0]).toHaveProperty("month");
      expect(body.revenueByMonth[0]).toHaveProperty("revenue");
    });

    it("should return disputesByStatus with all five statuses", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics"),
      );
      const body = await res.json();

      expect(body.disputesByStatus.length).toBe(5);
      const statuses = body.disputesByStatus.map(
        (d: { status: string }) => d.status,
      );
      expect(statuses).toContain("draft");
      expect(statuses).toContain("sent");
      expect(statuses).toContain("under_review");
      expect(statuses).toContain("resolved");
      expect(statuses).toContain("rejected");
    });

    it("should return subscriptionsByTier with four tiers", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics"),
      );
      const body = await res.json();

      // Tiers reflect real 6-tier plan names from the seeded mock (not old Math.random names)
      expect(body.subscriptionsByTier.length).toBe(4);
      const tiers = body.subscriptionsByTier.map(
        (t: { tier: string }) => t.tier,
      );
      expect(tiers).toContain("free");
      expect(tiers).toContain("standard");
      expect(tiers).toContain("pro");
      // "family-duo", hyphenated — the canonical SubscriptionTier value from
      // tier-mapping.ts. The old assertion said "family_duo", which is not a
      // member of that union and never was; it only passed because the route
      // echoed back whatever string the fixture's (nonexistent) `plan` column
      // happened to hold. Now the tier is derived from stripe_price_id, so the
      // canonical spelling is the only one that can appear.
      expect(tiers).toContain("family-duo");
    });

    it("should return topFeatures as an array with feature and usage", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics"),
      );
      const body = await res.json();

      expect(body.topFeatures.length).toBe(5);
      expect(body.topFeatures[0]).toHaveProperty("feature");
      expect(body.topFeatures[0]).toHaveProperty("usage");
    });

    it("should have userGrowth counts as positive numbers", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics"),
      );
      const body = await res.json();

      body.userGrowth.forEach((entry: { count: number }) => {
        expect(entry.count).toBeGreaterThan(0);
      });
    });

    it("should handle 365d range (year) by generating 13 data points", async () => {
      const res = await getAnalytics(
        makeRequest("http://localhost:3000/api/admin/analytics?range=1y"),
      );
      const body = await res.json();

      // 1y is not in the explicit list, so days = 365, points = min(365,12)+1 = 13
      expect(body.userGrowth.length).toBe(13);
    });
  });
});
