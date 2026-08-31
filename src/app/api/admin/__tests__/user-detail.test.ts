/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GET /api/admin/users/[id] — new surface added so the admin member-detail
 * screen has something to call. It previously had nothing, and rendered a
 * hardcoded "John Doe" for every ID.
 *
 * The tests that matter beyond the auth gate:
 *  - payments arrive in CENTS and must be divided exactly once
 *  - an unknown price ID yields null, never "free" (FND-018)
 *  - a section whose query errored is reported in `unavailable`, so the screen
 *    can distinguish "none" from "could not read"
 *  - dispute letter bodies are never selected
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: any[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: any[]) => mockResolveRole(...args),
}));

const mockFrom = jest.fn();
const mockGetUserById = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

jest.mock("@/lib/payment/plan-lookup", () => ({
  lookupPlanByPriceId: (priceId: string | null) =>
    priceId === "price_pro"
      ? { tier: "pro", name: "Pro", monthlyListPrice: 99.99 }
      : null,
}));

import { GET } from "../users/[id]/route";
import { NextRequest } from "next/server";

const VALID_ID = "11111111-2222-3333-4444-555555555555";

function makeRequest(id: string) {
  return new NextRequest(`http://localhost:3000/api/admin/users/${id}`, {
    method: "GET",
  } as never);
}

function authenticatedAdmin() {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "admin-1", email: "admin@fynvita.com" },
  });
  mockResolveRole.mockResolvedValue("admin");
}

/** Chainable query stub whose terminal call resolves to `result`. */
function tableStub(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit"]) {
    chain[method] = jest.fn(() => chain);
  }
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  // `.limit()` / `.order()` are awaited directly by the route.
  (chain as { then?: unknown }).then = (
    resolve: (value: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve);
  return chain;
}

const PROFILE = {
  id: VALID_ID,
  full_name: "Ada Lovelace",
  email: "ada@fynvita.test",
  subscription_tier: "pro",
  subscription_status: "active",
  stripe_customer_id: "cus_1",
  created_at: "2026-02-01T00:00:00.000Z",
};

function wireTables(
  over: Partial<
    Record<
      "profiles" | "subscriptions" | "disputes" | "payments",
      { data: unknown; error: unknown }
    >
  > = {},
) {
  const results = {
    profiles: { data: PROFILE, error: null },
    subscriptions: { data: [], error: null },
    disputes: { data: [], error: null },
    payments: { data: [], error: null },
    ...over,
  };
  mockFrom.mockImplementation((table: string) =>
    tableStub(
      results[table as keyof typeof results] ?? { data: [], error: null },
    ),
  );
  mockGetUserById.mockResolvedValue({
    data: { user: { email: "ada@auth.test", last_sign_in_at: "2026-08-17" } },
    error: null,
  });
  mockCreateClient.mockReturnValue({
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById } },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
});

describe("GET /api/admin/users/[id] — the gate", () => {
  it("401s when unauthenticated", async () => {
    mockValidate.mockResolvedValue({ valid: false, user: null });
    const res = await GET(makeRequest(VALID_ID));
    expect(res.status).toBe(401);
  });

  it("403s a signed-in non-admin", async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRole.mockResolvedValue("user");
    const res = await GET(makeRequest(VALID_ID));
    expect(res.status).toBe(403);
  });

  it("400s a non-UUID id rather than querying with it", async () => {
    authenticatedAdmin();
    wireTables();
    const res = await GET(makeRequest("not-a-uuid"));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("503s when the database is not configured, never a mock user", async () => {
    authenticatedAdmin();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await GET(makeRequest(VALID_ID));
    expect(res.status).toBe(503);
  });
});

describe("GET /api/admin/users/[id] — the member", () => {
  beforeEach(authenticatedAdmin);

  it("404s when no profile matches", async () => {
    wireTables({ profiles: { data: null, error: null } });
    const res = await GET(makeRequest(VALID_ID));
    expect(res.status).toBe(404);
  });

  it("500s when the profile read errors, rather than returning a blank member", async () => {
    wireTables({
      profiles: { data: null, error: { message: "boom" } },
    });
    const res = await GET(makeRequest(VALID_ID));
    expect(res.status).toBe(500);
  });

  it("returns the profile with the auth email and last sign-in", async () => {
    wireTables();
    const res = await GET(makeRequest(VALID_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.full_name).toBe("Ada Lovelace");
    // auth.users is authoritative for email.
    expect(body.user.email).toBe("ada@auth.test");
    expect(body.user.last_sign_in_at).toBe("2026-08-17");
  });

  it("never selects the dispute letter body", async () => {
    wireTables();
    await GET(makeRequest(VALID_ID));

    const selects = mockFrom.mock.results
      .map((r) => (r.value as any).select.mock.calls)
      .flat(2)
      .join(" ");
    expect(selects).not.toContain("letter_content");
    expect(selects).not.toContain("reason");
  });
});

describe("GET /api/admin/users/[id] — money and plans", () => {
  beforeEach(authenticatedAdmin);

  it("divides amount_cents exactly once", async () => {
    wireTables({
      payments: {
        data: [
          {
            id: "p-1",
            amount_cents: 9999,
            currency: "usd",
            status: "paid",
            paid_at: "2026-08-01",
          },
        ],
        error: null,
      },
    });

    const body = await (await GET(makeRequest(VALID_ID))).json();

    // 9999 cents is $99.99 — not $9,999 and not $0.9999.
    expect(body.payments[0].amount).toBe(99.99);
  });

  it("falls back to created_at when the row has no paid_at", async () => {
    wireTables({
      payments: {
        data: [
          {
            id: "p-2",
            amount_cents: 100,
            currency: "usd",
            status: "paid",
            created_at: "2026-07-01",
          },
        ],
        error: null,
      },
    });

    const body = await (await GET(makeRequest(VALID_ID))).json();
    expect(body.payments[0].paid_at).toBe("2026-07-01");
  });

  it("labels a known price ID with its plan", async () => {
    wireTables({
      subscriptions: {
        data: [{ id: "s-1", status: "active", stripe_price_id: "price_pro" }],
        error: null,
      },
    });

    const body = await (await GET(makeRequest(VALID_ID))).json();
    expect(body.subscriptions[0].plan_name).toBe("Pro");
    expect(body.subscriptions[0].monthly_list_price).toBe(99.99);
  });

  it("returns null — not 'free' — for an unknown price ID", async () => {
    wireTables({
      subscriptions: {
        data: [{ id: "s-2", status: "active", stripe_price_id: "price_old" }],
        error: null,
      },
    });

    const body = await (await GET(makeRequest(VALID_ID))).json();
    expect(body.subscriptions[0].tier).toBeNull();
    expect(body.subscriptions[0].plan_name).toBeNull();
    expect(body.subscriptions[0].monthly_list_price).toBeNull();
  });
});

describe("GET /api/admin/users/[id] — empty is not unreadable", () => {
  beforeEach(authenticatedAdmin);

  it("reports no unavailable sections when every query succeeded", async () => {
    wireTables();
    const body = await (await GET(makeRequest(VALID_ID))).json();
    expect(body.unavailable).toEqual([]);
  });

  it("names the section whose query errored", async () => {
    wireTables({
      disputes: { data: null, error: { message: "denied" } },
    });

    const body = await (await GET(makeRequest(VALID_ID))).json();

    // The screen needs this to avoid rendering "no disputes" over a failure.
    expect(body.unavailable).toContain("disputes");
    expect(body.disputes).toEqual([]);
  });

  it("still returns the member when a side query fails", async () => {
    wireTables({ payments: { data: null, error: { message: "denied" } } });

    const res = await GET(makeRequest(VALID_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.full_name).toBe("Ada Lovelace");
    expect(body.unavailable).toContain("payments");
  });
});
