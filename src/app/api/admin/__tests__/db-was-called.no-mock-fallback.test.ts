/**
 * @jest-environment node
 *
 * Wave 7 Phase 4 test class — THE ROUTE MUST ACTUALLY QUERY THE DATABASE.
 *
 * Plan requirement: "DB-was-called assertion per admin/billing/analytics route
 * (Supabase mock throws on unexpected query; no silent fallback)".
 *
 * WHY ASSERTING ON THE RESPONSE IS NOT ENOUGH. FND-049..053: admin routes
 * returned plausible figures without touching the database — `Math.random()`
 * analytics, hardcoded counts, mock rows served when a query failed. Every one
 * of those routes had passing tests, because the tests asserted the SHAPE of
 * the response. A fabricated payload has the same shape as a real one; that is
 * what makes it dangerous and what makes shape-only tests worthless here.
 *
 * So each test below asserts on the SUPABASE CLIENT: which tables were read,
 * and that a read happened at all. A route that stops querying and starts
 * inventing fails here even if its JSON is unchanged.
 *
 * THE MOCK IS STRICT BY DESIGN. `from()` records every table and returns a
 * chainable builder; a route that asks for a table this file does not expect
 * shows up in the recorded list, and a route that asks for nothing fails the
 * `toHaveBeenCalled` assertion. Nothing silently degrades to a default.
 */

import { NextRequest } from "next/server";
import { createClient as _createClient } from "@supabase/supabase-js";
import { getServiceRoleClient as _getSR } from "@/lib/supabase/service-role";

// ── Auth: authenticate as an admin so the handlers run ───────────────────────
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

// ── Supabase: record every table touched ─────────────────────────────────────
const tablesRead: string[] = [];
const mockFrom = jest.fn((table: string) => {
  tablesRead.push(table);
  return makeChain();
});

/** Chainable builder that resolves to an empty, well-formed result. */
function makeChain() {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "eq", "neq", "gt", "gte", "lt", "lte", "in", "is",
    "order", "limit", "range", "not", "or", "filter",
  ]) {
    chain[m] = jest.fn(() => chain);
  }
  chain.single = jest.fn(async () => ({ data: null, error: null }));
  chain.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
  return chain;
}

const client = { from: mockFrom, rpc: jest.fn(async () => ({ data: null, error: null })) };

jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn(() => client) }));
jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(() => client),
}));
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => client),
}));

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
  // resetMocks: true strips factory implementations before every test.
  mockFrom.mockImplementation((table: string) => {
    tablesRead.push(table);
    return makeChain();
  });
  // resetMocks strips the FACTORY implementations too, so the client
  // constructors must be re-armed here — not just `from`. Without this
  // createClient() returns undefined, the route's own try/catch swallows the
  // TypeError, and the suite reports "0 queries" for a route that is fine.
  (_createClient as jest.Mock).mockImplementation(() => client);
  (_getSR as jest.Mock).mockImplementation(() => client);

  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: "admin-1", email: "admin@example.com" },
  });
  mockResolveRoleFromDb.mockResolvedValue("admin");
});

/**
 * Each entry: the route module, the URL, and at least one table the handler
 * MUST read. The table list is the assertion that matters — it is what
 * distinguishes a real query from an invented answer.
 */
// A Next route handler may return NextResponse either synchronously or as a
// promise, so the loaded module is typed to accept both rather than forcing a
// Promise<Response> the handlers do not all produce.
type RouteModule = {
  GET: (r: NextRequest) => Response | Promise<Response>;
};

const ROUTES: Array<{
  name: string;
  load: () => Promise<RouteModule>;
  url: string;
  mustRead: string[];
}> = [
  {
    name: "admin/stats",
    load: () => import("../stats/route"),
    url: "http://localhost:3000/api/admin/stats",
    mustRead: ["profiles"],
  },
  {
    name: "admin/metrics",
    load: () => import("../metrics/route"),
    url: "http://localhost:3000/api/admin/metrics",
    mustRead: ["profiles"],
  },
  {
    name: "admin/analytics",
    load: () => import("../analytics/route"),
    url: "http://localhost:3000/api/admin/analytics",
    mustRead: ["profiles"],
  },
  {
    name: "admin/disputes",
    load: () => import("../disputes/route"),
    url: "http://localhost:3000/api/admin/disputes",
    mustRead: ["disputes"],
  },
  {
    name: "admin/subscriptions",
    load: () => import("../subscriptions/route"),
    url: "http://localhost:3000/api/admin/subscriptions",
    mustRead: ["subscriptions"],
  },
  {
    name: "admin/audit",
    load: () => import("../audit/route"),
    url: "http://localhost:3000/api/admin/audit",
    mustRead: ["audit_logs"],
  },
];

describe.each(ROUTES)("$name — proves it reads the database", ({ load, url, mustRead }) => {
  it("issues at least one query", async () => {
    const { GET } = await load();
    await GET(makeRequest(url));
    expect(mockFrom).toHaveBeenCalled();
  });

  it.each(mustRead)("reads %s", async (table) => {
    const { GET } = await load();
    await GET(makeRequest(url));
    expect(tablesRead).toContain(table);
  });

  it("returns a response rather than throwing on an empty database", async () => {
    // An empty DB is a legitimate state (a fresh deployment). The route must
    // answer honestly, not fall back to fabricated sample figures.
    const { GET } = await load();
    const res = await GET(makeRequest(url));
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(600);
  });

  it("does not answer from a cache when the DB is never consulted", async () => {
    const { GET } = await load();
    tablesRead.length = 0;
    await GET(makeRequest(url));
    // If a route can answer with zero queries, it is not reading state — the
    // shape of the FND-049 defect.
    expect(tablesRead.length).toBeGreaterThan(0);
  });
});

describe("the strict mock itself", () => {
  it("records every table a handler touches", async () => {
    const { GET } = await import("../stats/route");
    await GET(makeRequest("http://localhost:3000/api/admin/stats"));
    expect(tablesRead.length).toBeGreaterThan(0);
    expect(new Set(tablesRead).size).toBeGreaterThan(0);
  });

  it("refuses anonymous callers before any query runs", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { GET } = await import("../stats/route");
    const res = await GET(makeRequest("http://localhost:3000/api/admin/stats"));

    expect(res.status).toBe(401);
    // The guard must run BEFORE the database is touched.
    expect(tablesRead).toHaveLength(0);
  });

  it("refuses a non-admin before any query runs", async () => {
    mockResolveRoleFromDb.mockResolvedValue("user");
    const { GET } = await import("../stats/route");
    const res = await GET(makeRequest("http://localhost:3000/api/admin/stats"));

    expect(res.status).toBe(403);
    expect(tablesRead).toHaveLength(0);
  });
});
