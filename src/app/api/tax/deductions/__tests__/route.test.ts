/**
 * @jest-environment node
 *
 * GET / POST /api/tax/deductions
 *
 * Two properties carry the weight here.
 *
 * The INSERT must set user_id from the session, never the body — otherwise a
 * deduction can be filed against someone else's return. And `is_verified` must
 * not be client-settable, or an unsubstantiated entry can arrive already
 * looking reviewed.
 *
 * The third is subtler: NUMERIC columns come back from Postgres as STRINGS,
 * because a numeric can exceed what a JS number holds exactly. Passing that
 * through unconverted gives the client "1200.00" where it declares `amount:
 * number`, and every sum over it becomes string concatenation — "0120012000".
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const eqCalls: Array<[string, unknown]> = [];
const tablesTouched: string[] = [];
let insertPayload: Record<string, unknown> | null = null;
let listResult: { data: unknown; error: unknown } = { data: [], error: null };
let insertResult: { data: unknown; error: unknown } = { data: null, error: null };

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...a: unknown[]) => mockValidateFromHeaders(...a),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn(async () => "user"),
}));

function chain() {
  const c: Record<string, unknown> = {};
  c.select = jest.fn(() => c);
  c.order = jest.fn(async () => listResult);
  c.insert = jest.fn((payload: Record<string, unknown>) => {
    insertPayload = payload;
    return c;
  });
  c.single = jest.fn(async () => insertResult);
  c.eq = jest.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return c;
  });
  return c;
}

const mockFrom = jest.fn((table: string) => {
  tablesTouched.push(table);
  return chain();
});

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(() => ({ from: mockFrom })),
}));

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const CALLER = "user-ded-1";

const ROW = {
  id: "d-1",
  category: "charitable",
  name: "Food bank",
  // Postgres returns NUMERIC as a string.
  amount: "1200.00",
  deduction_date: "2024-03-04",
  document_id: null,
  is_verified: false,
  notes: null,
};

function get(url = "http://localhost:3000/api/tax/deductions"): NextRequest {
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

function post(body: unknown): NextRequest {
  const url = "http://localhost:3000/api/tax/deductions";
  return {
    url,
    method: "POST",
    headers: new Headers(),
    nextUrl: new URL(url),
    json: async () => body,
  } as unknown as NextRequest;
}

const VALID = {
  category: "charitable",
  name: "Food bank",
  amount: 1200,
  date: "2024-03-04",
};

beforeEach(() => {
  jest.clearAllMocks();
  eqCalls.length = 0;
  tablesTouched.length = 0;
  insertPayload = null;
  listResult = { data: [ROW], error: null };
  insertResult = { data: ROW, error: null };

  mockFrom.mockImplementation((table: string) => {
    tablesTouched.push(table);
    return chain();
  });
  (getServiceRoleClient as jest.Mock).mockReturnValue({ from: mockFrom });

  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "u@example.com" },
  });
});

describe("GET /api/tax/deductions", () => {
  it("refuses an anonymous caller before touching the database", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { GET } = await import("../route");

    expect((await GET(get())).status).toBe(401);
    expect(tablesTouched).toHaveLength(0);
  });

  it("scopes the read to the caller and the year", async () => {
    const { GET } = await import("../route");
    await GET(get("http://localhost:3000/api/tax/deductions?year=2024"));

    expect(eqCalls).toContainEqual(["user_id", CALLER]);
    expect(eqCalls).toContainEqual(["tax_year", 2024]);
  });

  it("converts a NUMERIC string into a number", async () => {
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    // "1200.00" straight through would make the client's `amount: number`
    // a lie and turn every sum into string concatenation.
    expect(body.data.deductions[0].amount).toBe(1200);
    expect(typeof body.data.deductions[0].amount).toBe("number");
  });

  it("totals the amounts numerically", async () => {
    listResult = {
      data: [ROW, { ...ROW, id: "d-2", amount: "300.50" }],
      error: null,
    };
    const { GET } = await import("../route");
    const body = await (await GET(get())).json();

    expect(body.data.total).toBe(1500.5);
  });

  it("filters by category when asked", async () => {
    const { GET } = await import("../route");
    await GET(
      get("http://localhost:3000/api/tax/deductions?category=charitable"),
    );

    expect(eqCalls).toContainEqual(["category", "charitable"]);
  });

  it("rejects an unknown category rather than returning everything", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      get("http://localhost:3000/api/tax/deductions?category=vibes"),
    );

    expect(res.status).toBe(400);
  });

  it("rejects a non-numeric year", async () => {
    const { GET } = await import("../route");
    expect(
      (await GET(get("http://localhost:3000/api/tax/deductions?year=soon")))
        .status,
    ).toBe(400);
  });

  it("errors rather than reporting no deductions when the read fails", async () => {
    listResult = { data: null, error: { message: "connection reset" } };
    const { GET } = await import("../route");

    // An empty list would invite the user to enter everything a second time.
    expect((await GET(get())).status).toBe(500);
  });
});

describe("POST /api/tax/deductions", () => {
  it("refuses an anonymous caller before touching the database", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { POST } = await import("../route");

    expect((await POST(post(VALID))).status).toBe(401);
    expect(tablesTouched).toHaveLength(0);
  });

  it("writes user_id from the SESSION, never the body", async () => {
    const { POST } = await import("../route");
    await POST(post({ ...VALID, user_id: "victim", userId: "victim" }));

    // Otherwise a deduction can be filed against someone else's return.
    expect(insertPayload?.user_id).toBe(CALLER);
  });

  it("never lets the client mark its own entry verified", async () => {
    const { POST } = await import("../route");
    await POST(post({ ...VALID, isVerified: true, is_verified: true }));

    expect(insertPayload?.is_verified).toBe(false);
  });

  it("derives the tax year from the deduction date when not given", async () => {
    const { POST } = await import("../route");
    await POST(post(VALID));

    expect(insertPayload?.tax_year).toBe(2024);
  });

  it("returns 201 with the created deduction", async () => {
    const { POST } = await import("../route");
    const res = await POST(post(VALID));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toMatchObject({ id: "d-1", amount: 1200 });
  });

  it("rejects a missing name", async () => {
    const { POST } = await import("../route");
    expect((await POST(post({ ...VALID, name: "" }))).status).toBe(400);
  });

  it("rejects an unknown category", async () => {
    const { POST } = await import("../route");
    expect((await POST(post({ ...VALID, category: "vibes" }))).status).toBe(400);
  });

  it("rejects a negative amount", async () => {
    const { POST } = await import("../route");
    expect((await POST(post({ ...VALID, amount: -5 }))).status).toBe(400);
  });

  it("rejects an implausibly large amount", async () => {
    const { POST } = await import("../route");
    expect(
      (await POST(post({ ...VALID, amount: 1e12 }))).status,
    ).toBe(400);
  });

  it("rejects a malformed date", async () => {
    const { POST } = await import("../route");
    expect((await POST(post({ ...VALID, date: "last March" }))).status).toBe(400);
  });

  it("surfaces a write failure as 500, not as a created deduction", async () => {
    insertResult = { data: null, error: { message: "constraint violation" } };
    const { POST } = await import("../route");

    // Reporting success would show the deduction in the UI while the user's
    // actual return never counted it.
    expect((await POST(post(VALID))).status).toBe(500);
  });
});
