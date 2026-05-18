/**
 * @jest-environment node
 *
 * ADM-2: Real DB-backed admin analytics/stats/audit/logs (FND-052/053).
 * TDD: these tests must FAIL before the route fix and PASS after.
 *
 * Invariants being tested:
 * - analytics/stats/audit return values derived from seeded DB rows,
 *   not from Math.random() or hardcoded fallbacks.
 * - On DB error every route returns an explicit 4xx/5xx, NEVER a 200
 *   with fabricated numbers.
 * - logs returns dataAvailable:false (no system_logs table).
 * - stats uses the real 6-tier priceMap (Free/Standard/Pro/Family Duo/
 *   Family/Family Plus per CLAUDE.md §10).
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────
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

const mockFrom = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Import AFTER mocks
import { GET as getAnalytics } from "../analytics/route";
import { GET as getStats } from "../stats/route";
import { GET as getAudit } from "../audit/route";
import { GET as getLogs } from "../logs/route";
import { NextRequest } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(url: string): NextRequest {
  return new NextRequest(url.startsWith("http") ? url : `http://localhost:3000${url}`);
}

function asAdmin() {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "admin-1", email: "admin@fynvita.com" },
  });
  mockResolveRole.mockResolvedValue("admin");
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

// ════════════════════════════════════════════════════════════════════════════
//  ANALYTICS — real DB data, not Math.random()
// ════════════════════════════════════════════════════════════════════════════
describe("ADM-2 – analytics returns real DB data", () => {
  function setupAnalyticsMocks({
    disputeCounts,
    subscriptionCounts,
    profileCount,
    revenueSubscriptions,
  }: {
    disputeCounts: Array<{ status: string; count: number }>;
    subscriptionCounts: Array<{ plan: string; count: number }>;
    profileCount: number;
    revenueSubscriptions: Array<{ plan: string }>;
  }) {
    // disputes by status
    const disputeSelectMock = jest.fn().mockResolvedValue({
      data: disputeCounts,
      error: null,
    });
    // subscriptions by plan
    const subSelectMock = jest.fn().mockResolvedValue({
      data: subscriptionCounts,
      error: null,
    });
    // profiles count for revenue
    const profileSelectMock = jest.fn().mockResolvedValue({
      count: profileCount,
      error: null,
    });
    // subscriptions for revenue computation
    const revenueSelectMock = jest.fn().mockResolvedValue({
      data: revenueSubscriptions,
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "disputes" && callCount === 1) return { select: disputeSelectMock };
      if (table === "subscriptions" && callCount === 2) return { select: subSelectMock };
      if (table === "profiles") return { select: profileSelectMock };
      if (table === "subscriptions") return { select: revenueSelectMock };
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });
    mockCreateClient.mockReturnValue({ from: mockFrom });
  }

  it("should reflect seeded dispute counts in disputesByStatus, not Math.random()", async () => {
    asAdmin();

    // Simple mock: disputes query returns real rows — route calls .select().range() (terminal)
    const resolvedRangeMock = jest.fn().mockResolvedValue({
      data: [
        { status: "resolved" },
        { status: "resolved" },
        { status: "sent" },
        { status: "draft" },
        { status: "resolved" },
      ],
      error: null,
    });

    // subscriptions by plan — route calls .select().range() (terminal)
    // 10 standard + 4 pro
    const subRangeMock = jest.fn().mockResolvedValue({
      data: [
        { plan: "standard" },
        { plan: "standard" },
        { plan: "standard" },
        { plan: "standard" },
        { plan: "standard" },
        { plan: "standard" },
        { plan: "standard" },
        { plan: "standard" },
        { plan: "standard" },
        { plan: "standard" },
        { plan: "pro" },
        { plan: "pro" },
        { plan: "pro" },
        { plan: "pro" },
      ],
      error: null,
    });

    // profiles for growth — route calls .select().gte(...).lte(...)
    const profileLteMock = jest.fn().mockResolvedValue({ count: 5, error: null });
    const profileGteMock = jest.fn().mockReturnValue({ lte: profileLteMock });
    const profileSelectMock = jest.fn().mockReturnValue({ gte: profileGteMock });

    // subscriptions for revenueByMonth loop — .select().eq().gte().lte()
    const revLteMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const revGteMock = jest.fn().mockReturnValue({ lte: revLteMock });
    const revEqMock = jest.fn().mockReturnValue({ gte: revGteMock });
    const revSelectMock = jest.fn().mockReturnValue({ eq: revEqMock });

    let subsCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "disputes") {
        return { select: jest.fn().mockReturnValue({ range: resolvedRangeMock }) };
      }
      if (table === "subscriptions") {
        subsCallCount++;
        // First subscriptions call: by-plan query (.select().range())
        if (subsCallCount === 1) return { select: jest.fn().mockReturnValue({ range: subRangeMock }) };
        // Subsequent calls: revenueByMonth loop (.select().eq().gte().lte())
        return { select: revSelectMock };
      }
      if (table === "profiles") return { select: profileSelectMock };
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });
    mockCreateClient.mockReturnValue({ from: mockFrom });

    const res = await getAnalytics(makeRequest("http://localhost:3000/api/admin/analytics"));
    const body = await res.json();

    expect(res.status).toBe(200);
    // The "resolved" count must be 3 (three "resolved" rows seeded above)
    const resolved = body.disputesByStatus.find(
      (d: { status: string; count: number }) => d.status === "resolved",
    );
    expect(resolved).toBeDefined();
    expect(resolved.count).toBe(3);

    // subscriptionsByTier should reflect real plan data (10 standard rows seeded)
    const standard = body.subscriptionsByTier.find(
      (t: { tier: string; count: number }) => t.tier === "standard",
    );
    expect(standard).toBeDefined();
    expect(standard.count).toBe(10);
  });

  it("should return a 500 error on DB failure, not a 200 with fabricated data", async () => {
    asAdmin();

    mockCreateClient.mockReturnValue({
      from: jest.fn().mockImplementation(() => {
        throw new Error("DB connection failed");
      }),
    });

    const res = await getAnalytics(makeRequest("http://localhost:3000/api/admin/analytics"));
    const body = await res.json();

    // Must NOT be 200 with fake data
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(body).not.toHaveProperty("userGrowth");
    expect(body.error).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  STATS — real DB data, 6-tier priceMap, no fallback mock on error
// ════════════════════════════════════════════════════════════════════════════
describe("ADM-2 – stats returns real DB data with 6-tier priceMap", () => {
  function buildStatsChain(
    profileCount: number,
    activeSubCount: number,
    totalDisputeCount: number,
    resolvedDisputeCount: number,
    revenueSubs: Array<{ plan: string }>,
    recentCount: number,
    previousCount: number,
  ) {
    // profiles head count (Promise.all call 1)
    const profilesHead = jest.fn().mockResolvedValue({ count: profileCount, error: null });
    // subscriptions active head count (Promise.all call 2)
    const subsActiveEq = jest.fn().mockResolvedValue({ count: activeSubCount, error: null });
    const subsActiveSelect = jest.fn().mockReturnValue({ eq: subsActiveEq });
    // disputes total head count (Promise.all call 3)
    const disputesTotal = jest.fn().mockResolvedValue({ count: totalDisputeCount, error: null });
    // disputes resolved head count (Promise.all call 4)
    const disputesResolvedEq = jest.fn().mockResolvedValue({ count: resolvedDisputeCount, error: null });
    const disputesResolvedSelect = jest.fn().mockReturnValue({ eq: disputesResolvedEq });

    // subscriptions for revenue (call 5)
    const revenueSubsEq = jest.fn().mockResolvedValue({ data: revenueSubs, error: null });
    const revenueSubsSelect = jest.fn().mockReturnValue({ eq: revenueSubsEq });

    // profiles for recentUsers (call 6)
    const recentGte = jest.fn().mockResolvedValue({ count: recentCount, error: null });
    const recentSelect = jest.fn().mockReturnValue({ gte: recentGte });

    // profiles for previousUsers (call 7)
    const prevLt = jest.fn().mockResolvedValue({ count: previousCount, error: null });
    const prevGte = jest.fn().mockReturnValue({ lt: prevLt });
    const prevSelect = jest.fn().mockReturnValue({ gte: prevGte });

    let fromCount = 0;
    mockFrom.mockImplementation((table: string) => {
      fromCount++;
      if (table === "profiles") {
        if (fromCount === 1) return { select: profilesHead };
        if (fromCount === 6) return { select: recentSelect };
        return { select: prevSelect };
      }
      if (table === "subscriptions") {
        if (fromCount === 2) return { select: subsActiveSelect };
        return { select: revenueSubsSelect };
      }
      if (table === "disputes") {
        if (fromCount === 3) return { select: disputesTotal };
        return { select: disputesResolvedSelect };
      }
      return { select: jest.fn().mockResolvedValue({ data: [], count: 0, error: null }) };
    });
    mockCreateClient.mockReturnValue({ from: mockFrom });
  }

  it("should compute monthlyRevenue using the real 6-tier prices", async () => {
    asAdmin();

    // One sub on each tier:
    // standard=29.99, pro=99.99, family_duo=159.99, family=199.99, family_plus=399.99
    // free=0. Total ≈ 889.95
    buildStatsChain(
      500, // profileCount
      5,   // activeSubCount
      100, // totalDisputeCount
      80,  // resolvedDisputeCount
      [
        { plan: "standard" },
        { plan: "pro" },
        { plan: "family_duo" },
        { plan: "family" },
        { plan: "family_plus" },
        { plan: "free" },
      ],
      20, // recentCount
      10, // previousCount
    );

    const res = await getStats(makeRequest("http://localhost:3000/api/admin/stats"));
    const body = await res.json();

    expect(res.status).toBe(200);
    // standard(29.99) + pro(99.99) + family_duo(159.99) + family(199.99) + family_plus(399.99) + free(0) = 889.95
    expect(body.monthlyRevenue).toBeCloseTo(889.95, 1);
    // totalUsers should come from the seeded count
    expect(body.totalUsers).toBe(500);
  });

  it("should NOT fall back to hardcoded mock when env vars are missing", async () => {
    asAdmin();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await getStats(makeRequest("http://localhost:3000/api/admin/stats"));
    const body = await res.json();

    // Must return an error, not a 200 with hardcoded numbers
    expect(res.status).toBeGreaterThanOrEqual(400);
    // Must NOT be the old hardcoded mock values
    expect(body.totalUsers).not.toBe(1247);
    expect(body.monthlyRevenue).not.toBe(45670);
  });

  it("should return a 500 error on DB failure, not a 200 with fabricated data", async () => {
    asAdmin();

    mockCreateClient.mockReturnValue({
      from: jest.fn().mockImplementation(() => {
        throw new Error("DB failure");
      }),
    });

    const res = await getStats(makeRequest("http://localhost:3000/api/admin/stats"));
    const body = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(500);
    // Must NOT be the old hardcoded mock values
    expect(body.totalUsers).not.toBe(1247);
    expect(body.monthlyRevenue).not.toBe(45670);
    expect(body.error).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  AUDIT — no mock fallback on error
// ════════════════════════════════════════════════════════════════════════════
describe("ADM-2 – audit returns 5xx on DB error, not fabricated 200", () => {
  it("should return 500 when the 42P01 table-missing error occurs", async () => {
    asAdmin();

    const orderMock = jest.fn().mockResolvedValue({
      data: null,
      count: null,
      error: { code: "42P01", message: "relation does not exist" },
    });
    const rangeMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ range: rangeMock });
    mockFrom.mockReturnValue({ select: selectMock });
    mockCreateClient.mockReturnValue({ from: mockFrom });

    const res = await getAudit(makeRequest("http://localhost:3000/api/admin/audit"));
    const body = await res.json();

    // Must NOT be a 200 with fabricated mock data
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(body.error).toBeDefined();
    // Must NOT have the fabricated log array
    expect(body.logs).toBeUndefined();
  });

  it("should return 500 on unexpected exception, not a 200 with fabricated data", async () => {
    asAdmin();

    mockCreateClient.mockReturnValue({
      from: jest.fn().mockImplementation(() => {
        throw new Error("Connection failed");
      }),
    });

    const res = await getAudit(makeRequest("http://localhost:3000/api/admin/audit"));
    const body = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(body.error).toBeDefined();
    expect(body.logs).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  LOGS — honest-unavailable, not fabricated
// ════════════════════════════════════════════════════════════════════════════
describe("ADM-2 – logs returns dataAvailable:false (system_logs has no table)", () => {
  it("should return dataAvailable:false when system_logs table does not exist (42P01)", async () => {
    asAdmin();

    const orderMock = jest.fn().mockResolvedValue({
      data: null,
      count: null,
      error: { code: "42P01", message: "relation does not exist" },
    });
    const rangeMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ range: rangeMock });
    mockFrom.mockReturnValue({ select: selectMock });
    mockCreateClient.mockReturnValue({ from: mockFrom });

    const res = await getLogs(makeRequest("http://localhost:3000/api/admin/logs"));
    const body = await res.json();

    // Must be honest: empty logs, not 50 fabricated entries
    expect(res.status).toBe(200);
    expect(body.dataAvailable).toBe(false);
    expect(body.logs).toEqual([]);
    expect(body.total).toBe(0);
    // Must NOT have fabricated entries
    expect(body.logs.length).toBe(0);
  });

  it("should return dataAvailable:false on unexpected DB exception, not fabricated 200", async () => {
    asAdmin();

    mockCreateClient.mockReturnValue({
      from: jest.fn().mockImplementation(() => {
        throw new Error("Unexpected failure");
      }),
    });

    const res = await getLogs(makeRequest("http://localhost:3000/api/admin/logs"));
    const body = await res.json();

    // For logs, since there is no table, honest empty response is acceptable
    expect(res.status).toBe(200);
    expect(body.dataAvailable).toBe(false);
    expect(body.logs).toEqual([]);
  });
});
