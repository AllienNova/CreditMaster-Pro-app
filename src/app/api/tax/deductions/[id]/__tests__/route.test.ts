/**
 * @jest-environment node
 *
 * PATCH / DELETE /api/tax/deductions/[id]
 *
 * The update is built from an ALLOWLIST rather than by spreading the body.
 * Spreading would let a caller set user_id — moving their row into another
 * account, or someone else's into theirs — and set is_verified on their own
 * unsubstantiated entry. Both are asserted here.
 *
 * Amending a deduction also clears its verified flag: an entry that was
 * reviewed at $200 and then edited to $2,000 is not the entry that was
 * reviewed, and keeping the flag would launder the change through the earlier
 * approval.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const eqCalls: Array<[string, unknown]> = [];
const tablesTouched: string[] = [];
let updatePayload: Record<string, unknown> | null = null;
let queryResult: { data: unknown; error: unknown } = { data: null, error: null };

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
  c.update = jest.fn((payload: Record<string, unknown>) => {
    updatePayload = payload;
    return c;
  });
  c.delete = jest.fn(() => c);
  c.select = jest.fn(() => c);
  c.eq = jest.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return c;
  });
  c.maybeSingle = jest.fn(async () => queryResult);
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

const CALLER = "user-ded-2";
const DED_ID = "12341234-1234-1234-1234-123412341234";

const ROW = {
  id: DED_ID,
  category: "charitable",
  name: "Food bank",
  amount: "1200.00",
  deduction_date: "2024-03-04",
  document_id: null,
  is_verified: false,
  notes: null,
};

function req(method: string, body?: unknown, id = DED_ID): NextRequest {
  const url = `http://localhost:3000/api/tax/deductions/${id}`;
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: new URL(url),
    json: async () => body ?? {},
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  eqCalls.length = 0;
  tablesTouched.length = 0;
  updatePayload = null;
  queryResult = { data: ROW, error: null };

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

describe("PATCH /api/tax/deductions/[id]", () => {
  it("refuses an anonymous caller before touching the database", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { PATCH } = await import("../route");

    expect((await PATCH(req("PATCH", { amount: 5 }))).status).toBe(401);
    expect(tablesTouched).toHaveLength(0);
  });

  it("scopes the update to the caller and the path id", async () => {
    const { PATCH } = await import("../route");
    await PATCH(req("PATCH", { amount: 500 }));

    expect(eqCalls).toContainEqual(["user_id", CALLER]);
    expect(eqCalls).toContainEqual(["id", DED_ID]);
  });

  it("ignores user_id in the body", async () => {
    const { PATCH } = await import("../route");
    await PATCH(req("PATCH", { amount: 500, user_id: "victim" }));

    // An allowlist, not a spread — otherwise the row moves accounts.
    expect(updatePayload).not.toHaveProperty("user_id");
  });

  it("does not let the client mark its own entry verified", async () => {
    const { PATCH } = await import("../route");
    await PATCH(req("PATCH", { amount: 500, is_verified: true }));

    expect(updatePayload?.is_verified).toBe(false);
  });

  it("clears the verified flag when the entry is amended", async () => {
    const { PATCH } = await import("../route");
    await PATCH(req("PATCH", { amount: 2000 }));

    // Reviewed at $200 then edited to $2,000 is not the entry that was
    // reviewed; keeping the flag would launder the change through the
    // earlier approval.
    expect(updatePayload?.is_verified).toBe(false);
  });

  it("updates only the fields supplied", async () => {
    const { PATCH } = await import("../route");
    await PATCH(req("PATCH", { name: "Shelter" }));

    expect(updatePayload).toHaveProperty("name", "Shelter");
    expect(updatePayload).not.toHaveProperty("amount");
    expect(updatePayload).not.toHaveProperty("deduction_date");
  });

  it("returns the amount as a number, not the NUMERIC string", async () => {
    const { PATCH } = await import("../route");
    const body = await (await PATCH(req("PATCH", { amount: 1200 }))).json();

    expect(body.data.amount).toBe(1200);
  });

  it("rejects a body with no updatable fields", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(req("PATCH", { nonsense: 1 }));

    // An empty update would clear is_verified and bump updated_at for nothing.
    expect(res.status).toBe(400);
  });

  it("rejects an invalid category", async () => {
    const { PATCH } = await import("../route");
    expect((await PATCH(req("PATCH", { category: "vibes" }))).status).toBe(400);
  });

  it("rejects a negative amount", async () => {
    const { PATCH } = await import("../route");
    expect((await PATCH(req("PATCH", { amount: -1 }))).status).toBe(400);
  });

  it("returns 404 for another user's deduction", async () => {
    queryResult = { data: null, error: null };
    const { PATCH } = await import("../route");

    expect((await PATCH(req("PATCH", { amount: 5 }))).status).toBe(404);
  });

  it("rejects a non-uuid id before querying", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(req("PATCH", { amount: 5 }, "nope"));

    expect(res.status).toBe(400);
    expect(tablesTouched).toHaveLength(0);
  });

  it("surfaces a write failure as 500", async () => {
    queryResult = { data: null, error: { message: "connection reset" } };
    const { PATCH } = await import("../route");

    expect((await PATCH(req("PATCH", { amount: 5 }))).status).toBe(500);
  });
});

describe("DELETE /api/tax/deductions/[id]", () => {
  it("refuses an anonymous caller", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { DELETE } = await import("../route");

    expect((await DELETE(req("DELETE"))).status).toBe(401);
    expect(tablesTouched).toHaveLength(0);
  });

  it("scopes the delete to the caller and the path id", async () => {
    const { DELETE } = await import("../route");
    await DELETE(req("DELETE"));

    expect(eqCalls).toContainEqual(["user_id", CALLER]);
    expect(eqCalls).toContainEqual(["id", DED_ID]);
  });

  it("returns 404 when nothing was deleted", async () => {
    queryResult = { data: null, error: null };
    const { DELETE } = await import("../route");

    expect((await DELETE(req("DELETE"))).status).toBe(404);
  });

  it("reports success only when a row was removed", async () => {
    queryResult = { data: { id: DED_ID }, error: null };
    const { DELETE } = await import("../route");
    const res = await DELETE(req("DELETE"));

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("surfaces a database error as 500", async () => {
    queryResult = { data: null, error: { message: "constraint violation" } };
    const { DELETE } = await import("../route");

    expect((await DELETE(req("DELETE"))).status).toBe(500);
  });
});
