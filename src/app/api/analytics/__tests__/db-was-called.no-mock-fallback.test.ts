/**
 * @jest-environment node
 *
 * Wave 7 Phase 4 test class — BILLING + ANALYTICS half.
 *
 * Companion to src/app/api/admin/__tests__/db-was-called.no-mock-fallback.test.ts,
 * which covers the six admin routes. The plan's Phase 4 floor is 40 assertions
 * across "admin/billing/analytics"; this file adds the other two areas.
 *
 * SAME PRINCIPLE, TWO SHAPES. A route that reads Supabase directly is asserted
 * on the tables it touches. A route that DELEGATES to a service is asserted on
 * the service call — for `/api/analytics` the source of truth is AnalyticsEngine,
 * so "did it consult the data" means "did it call the engine, with the
 * authenticated caller's id". A shape assertion on the JSON cannot tell either
 * one from a fabricated answer, which is exactly how FND-049..053 survived a
 * green suite.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...a: unknown[]) => mockValidateFromHeaders(...a),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...a: unknown[]) => mockResolveRoleFromDb(...a),
}));

// ── Supabase: record tables and the filters applied ──────────────────────────
const tablesRead: string[] = [];
const eqCalls: Array<[string, unknown]> = [];

function makeChain() {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "neq", "gt", "gte", "lt", "lte", "in", "is", "order", "limit", "range", "not", "or"]) {
    chain[m] = jest.fn(() => chain);
  }
  chain.eq = jest.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return chain;
  });
  chain.single = jest.fn(async () => ({ data: null, error: null }));
  chain.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
  return chain;
}

const mockFrom = jest.fn((table: string) => {
  tablesRead.push(table);
  return makeChain();
});
const client = { from: mockFrom, rpc: jest.fn(async () => ({ data: null, error: null })) };

jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn(() => client) }));
jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(() => client),
}));
// The credits routes reach the DB through the `supabaseAdmin` SINGLETON in
// this module, not through createClient() — a third client shape in the same
// codebase. Mocking only the constructors left those tests reporting "0
// queries" for routes that query correctly.
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => client),
  get supabaseAdmin() {
    return client;
  },
}));

// ── AnalyticsEngine: record every delegation ─────────────────────────────────
const engineCalls: Array<[string, unknown]> = [];
const engineMethod = (name: string) =>
  jest.fn(async (arg: unknown) => {
    engineCalls.push([name, arg]);
    return {};
  });

jest.mock("@/lib/analytics", () => ({
  AnalyticsEngine: {
    getUserAnalytics: engineMethod("getUserAnalytics"),
    getDisputeAnalytics: engineMethod("getDisputeAnalytics"),
    getWorkflowAnalytics: engineMethod("getWorkflowAnalytics"),
    getAIUsageAnalytics: engineMethod("getAIUsageAnalytics"),
    getFinancialImpact: engineMethod("getFinancialImpact"),
    getDashboardMetrics: engineMethod("getDashboardMetrics"),
  },
}));

import { createClient as _createClient } from "@supabase/supabase-js";
import { getServiceRoleClient as _getSR } from "@/lib/supabase/service-role";
import { AnalyticsEngine as _engine } from "@/lib/analytics";

const CALLER = "user-analytics-1";

function makeRequest(url: string): NextRequest {
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  tablesRead.length = 0;
  eqCalls.length = 0;
  engineCalls.length = 0;

  // resetMocks strips factory implementations — re-arm the constructors AND
  // every delegated method, or the routes see undefined and their own
  // try/catch reports a 500 that looks like "no query happened".
  mockFrom.mockImplementation((table: string) => {
    tablesRead.push(table);
    return makeChain();
  });
  (_createClient as jest.Mock).mockImplementation(() => client);
  (_getSR as jest.Mock).mockImplementation(() => client);
  for (const name of Object.keys(_engine)) {
    (_engine as unknown as Record<string, jest.Mock>)[name].mockImplementation(
      async (arg: unknown) => {
        engineCalls.push([name, arg]);
        return {};
      },
    );
  }

  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "u@example.com" },
  });
  mockResolveRoleFromDb.mockResolvedValue("admin");
});

describe("/api/analytics — delegates to the engine, scoped to the caller", () => {
  it("calls AnalyticsEngine rather than answering by itself", async () => {
    const { GET } = await import("../route");
    await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(engineCalls.length).toBeGreaterThan(0);
  });

  it("passes the AUTHENTICATED user id, never one from the query string", async () => {
    const { GET } = await import("../route");
    await GET(
      makeRequest(`http://localhost:3000/api/analytics?userId=someone-else`),
    );

    const ids = engineCalls.map(([, arg]) => arg);
    expect(ids).toContain(CALLER);
    expect(ids).not.toContain("someone-else");
  });

  it.each([
    ["user", "getUserAnalytics"],
    ["financial", "getFinancialImpact"],
    ["dashboard", "getDashboardMetrics"],
  ])("type=%s routes to %s", async (type, method) => {
    const { GET } = await import("../route");
    await GET(makeRequest(`http://localhost:3000/api/analytics?type=${type}`));
    expect(engineCalls.map(([n]) => n)).toContain(method);
  });

  it("refuses an anonymous caller before consulting the engine", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { GET } = await import("../route");
    const res = await GET(makeRequest("http://localhost:3000/api/analytics"));

    expect(res.status).toBe(401);
    expect(engineCalls).toHaveLength(0);
  });
});

describe("/api/credits/balance — reads the ledger, scoped to the caller", () => {
  // The route reads `credit_transactions` directly (route.ts:14) AND reaches
  // `user_credits` through creditService. Which one lands first depends on how
  // far the chain gets, so the assertion is that the LEDGER was consulted —
  // not that a particular table happened to be first. The point of the gate is
  // "did it read state or invent an answer", and either table proves it read.
  const LEDGER_TABLES = ["credit_transactions", "user_credits"];

  it("consults the credit ledger", async () => {
    const { GET } = await import("../../credits/balance/route");
    await GET(makeRequest("http://localhost:3000/api/credits/balance"));
    expect(tablesRead.some((t) => LEDGER_TABLES.includes(t))).toBe(true);
  });

  it("filters on the authenticated user id", async () => {
    const { GET } = await import("../../credits/balance/route");
    await GET(makeRequest("http://localhost:3000/api/credits/balance"));
    expect(eqCalls).toContainEqual(["user_id", CALLER]);
  });

  it("refuses an anonymous caller before touching the ledger", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { GET } = await import("../../credits/balance/route");
    const res = await GET(makeRequest("http://localhost:3000/api/credits/balance"));

    expect(res.status).toBe(401);
    expect(tablesRead).toHaveLength(0);
  });
});

describe("/api/credits/history — reads the ledger, scoped to the caller", () => {
  it("consults the credit ledger", async () => {
    const { GET } = await import("../../credits/history/route");
    await GET(makeRequest("http://localhost:3000/api/credits/history"));
    expect(
      tablesRead.some((t) => ["credit_transactions", "user_credits"].includes(t)),
    ).toBe(true);
  });

  it("filters on the authenticated user id", async () => {
    const { GET } = await import("../../credits/history/route");
    await GET(makeRequest("http://localhost:3000/api/credits/history"));
    expect(eqCalls).toContainEqual(["user_id", CALLER]);
  });

  it("ignores a user id supplied in the query string", async () => {
    const { GET } = await import("../../credits/history/route");
    await GET(
      makeRequest("http://localhost:3000/api/credits/history?userId=victim"),
    );

    expect(eqCalls).toContainEqual(["user_id", CALLER]);
    expect(eqCalls).not.toContainEqual(["user_id", "victim"]);
  });

  it("refuses an anonymous caller before touching the ledger", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { GET } = await import("../../credits/history/route");
    const res = await GET(makeRequest("http://localhost:3000/api/credits/history"));

    expect(res.status).toBe(401);
    expect(tablesRead).toHaveLength(0);
  });
});
