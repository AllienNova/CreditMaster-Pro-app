/**
 * /api/user/analytics tests.
 *
 * - Negative-auth (TASK-AUTH-03f): 401 when unauthenticated.
 * - Real-data + no-fabrication (PARITY-P1): creditHistory is sourced from
 *   `credit_score_history` and disputeStats from the `disputes` table (both
 *   scoped to the authed user.id), with honest empty/zeroed values when there
 *   is no data. The route previously fabricated creditHistory with
 *   Math.random() and defaulted disputeStats to a mock {12,9,3,75}.
 *
 * withAuth resolves auth via jwtValidation.validateFromHeaders.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { GET } from "../route";

// A chainable, thenable query builder: every method returns the builder, and
// awaiting it (at any point in the chain) resolves to { data, error }. Supports
// both the credit-history chain (.select().eq().gte().order()) and the disputes
// chain (.select().eq()).
function queryResult(data: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "order"]) {
    builder[method] = () => builder;
  }
  (builder as { then: unknown }).then = (
    resolve: (v: { data: unknown; error: null }) => unknown,
  ) => resolve({ data, error: null });
  return builder;
}

let scoreRows: { score: number; recorded_at: string }[] | null;
let disputeRows: { status: string }[] | null;

function createMockRequest(range?: string): NextRequest {
  const base = "http://localhost:3000/api/user/analytics";
  const url = range === undefined ? base : `${base}?range=${range}`;
  return {
    url,
    method: "GET",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/user/analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated", async () => {
    const res = await GET(createMockRequest());
    expect(res.status).toBe(401);
  });
});

describe("/api/user/analytics – real data, no fabrication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scoreRows = null;
    disputeRows = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === "credit_score_history") return queryResult(scoreRows);
      if (table === "disputes") return queryResult(disputeRows);
      return queryResult(null);
    });
    mockCreateClient.mockReturnValue({ from: mockFrom });
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("builds creditHistory from real credit_score_history, averaged per month, oldest-first", async () => {
    scoreRows = [
      { score: 700, recorded_at: "2026-01-10T00:00:00Z" },
      { score: 720, recorded_at: "2026-01-25T00:00:00Z" }, // same month → averaged
      { score: 740, recorded_at: "2026-03-05T00:00:00Z" },
    ];
    const res = await GET(createMockRequest("6m"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.creditHistory).toEqual([
      { date: "Jan", score: 710 }, // (700 + 720) / 2
      { date: "Mar", score: 740 },
    ]);
  });

  it("is deterministic — no Math.random (same input → identical output twice)", async () => {
    scoreRows = [{ score: 650, recorded_at: "2026-02-01T00:00:00Z" }];
    const first = await (await GET(createMockRequest("6m"))).json();
    const second = await (await GET(createMockRequest("6m"))).json();
    expect(first.creditHistory).toEqual([{ date: "Feb", score: 650 }]);
    expect(first.creditHistory).toEqual(second.creditHistory);
  });

  it("returns empty creditHistory (not fabricated) when there is no score history", async () => {
    scoreRows = [];
    const body = await (await GET(createMockRequest("6m"))).json();
    expect(body.creditHistory).toEqual([]);
  });

  it("computes disputeStats from real disputes", async () => {
    disputeRows = [
      { status: "resolved" },
      { status: "resolved" },
      { status: "under_review" },
      { status: "rejected" },
    ];
    const body = await (await GET(createMockRequest("6m"))).json();
    expect(body.disputeStats).toEqual({
      total: 4,
      resolved: 2,
      pending: 1, // not resolved, not rejected
      successRate: 50,
    });
  });

  it("zeroes disputeStats (never the old {12,9,3,75} mock) when there are no disputes", async () => {
    disputeRows = [];
    const body = await (await GET(createMockRequest("6m"))).json();
    expect(body.disputeStats).toEqual({
      total: 0,
      resolved: 0,
      pending: 0,
      successRate: 0,
    });
  });

  it("returns honest empty/zeroed data when the database is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const body = await (await GET(createMockRequest("6m"))).json();
    expect(body.creditHistory).toEqual([]);
    expect(body.disputeStats).toEqual({
      total: 0,
      resolved: 0,
      pending: 0,
      successRate: 0,
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("returns standard FICO factor weights with neutral (non-fabricated) status", async () => {
    const body = await (await GET(createMockRequest("6m"))).json();
    expect(body.scoreFactors).toHaveLength(5);
    expect(
      body.scoreFactors.every(
        (f: { status: string }) => f.status === "neutral",
      ),
    ).toBe(true);
    expect(body.scoreFactors[0]).toEqual({
      factor: "Payment History",
      impact: 35,
      status: "neutral",
    });
    expect(body.recommendations).toHaveLength(4);
  });

  it("honors the range param in the echoed timeRange (3m / 12m)", async () => {
    expect((await (await GET(createMockRequest("3m"))).json()).timeRange).toBe(
      "3m",
    );
    expect((await (await GET(createMockRequest("12m"))).json()).timeRange).toBe(
      "12m",
    );
  });

  it("skips score rows with an unparseable recorded_at", async () => {
    scoreRows = [
      { score: 700, recorded_at: "2026-01-10T00:00:00Z" },
      { score: 999, recorded_at: "not-a-real-date" },
    ];
    const body = await (await GET(createMockRequest("6m"))).json();
    expect(body.creditHistory).toEqual([{ date: "Jan", score: 700 }]);
  });

  it("returns 500 when the data layer throws", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("db down");
    });
    const res = await GET(createMockRequest("6m"));
    expect(res.status).toBe(500);
  });
});
