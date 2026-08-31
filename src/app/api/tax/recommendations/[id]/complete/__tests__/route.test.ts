/**
 * @jest-environment node
 *
 * POST /api/tax/recommendations/[id]/complete
 *
 * Marks one of the caller's own tax recommendations as done.
 *
 * This is a WRITE addressed by an id supplied in the URL, which is the exact
 * shape of an IDOR. The service-role client bypasses RLS entirely, so the
 * `.eq("user_id", ...)` on the update is load-bearing rather than defensive:
 * without it, any authenticated user could close any other user's
 * recommendations by guessing a uuid. Most of these tests exist for that one
 * filter.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const eqCalls: Array<[string, unknown]> = [];
let updateResult: { data: unknown; error: unknown } = { data: null, error: null };
let updatePayload: Record<string, unknown> | null = null;

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...a: unknown[]) => mockValidateFromHeaders(...a),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn(async () => "user"),
}));

const tablesTouched: string[] = [];

function chain() {
  const c: Record<string, unknown> = {};
  c.update = jest.fn((payload: Record<string, unknown>) => {
    updatePayload = payload;
    return c;
  });
  c.select = jest.fn(() => c);
  c.eq = jest.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return c;
  });
  c.maybeSingle = jest.fn(async () => updateResult);
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

const CALLER = "user-tax-6";
const REC_ID = "11111111-2222-3333-4444-555555555555";

// withAuth does not forward Next's route params, so the handler reads the id
// from the pathname. The request must therefore carry a realistic URL.
function post(id = REC_ID): NextRequest {
  const url = `http://localhost:3000/api/tax/recommendations/${id}/complete`;
  return {
    url,
    method: "POST",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  eqCalls.length = 0;
  tablesTouched.length = 0;
  updatePayload = null;
  updateResult = { data: { id: REC_ID }, error: null };

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

describe("POST /api/tax/recommendations/[id]/complete", () => {
  it("refuses an anonymous caller before touching the database", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { POST } = await import("../route");

    const res = await POST(post());

    expect(res.status).toBe(401);
    expect(tablesTouched).toHaveLength(0);
  });

  it("filters the update by the AUTHENTICATED user id", async () => {
    const { POST } = await import("../route");
    await POST(post());

    // The service-role client bypasses RLS. Without this filter any
    // authenticated user could close any other user's recommendation.
    expect(eqCalls).toContainEqual(["user_id", CALLER]);
  });

  it("filters by the recommendation id from the path", async () => {
    const { POST } = await import("../route");
    await POST(post());

    expect(eqCalls).toContainEqual(["id", REC_ID]);
  });

  it("writes to tax_recommendations", async () => {
    const { POST } = await import("../route");
    await POST(post());

    expect(tablesTouched).toContain("tax_recommendations");
  });

  it("sets status to completed", async () => {
    const { POST } = await import("../route");
    await POST(post());

    expect(updatePayload).toMatchObject({ status: "completed" });
  });

  it("returns 404 when the row is absent or owned by someone else", async () => {
    updateResult = { data: null, error: null };
    const { POST } = await import("../route");

    const res = await POST(post());

    // Deliberately NOT 403: distinguishing "does not exist" from "not yours"
    // would confirm the existence of another user's recommendation to anyone
    // probing uuids.
    expect(res.status).toBe(404);
  });

  it("reports success only when a row was actually updated", async () => {
    const { POST } = await import("../route");
    const res = await POST(post());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("rejects an id that is not a uuid", async () => {
    const { POST } = await import("../route");
    const res = await POST(post("not-a-uuid"));

    expect(res.status).toBe(400);
    expect(tablesTouched).toHaveLength(0);
  });

  it("surfaces a database error as a 500, not as success", async () => {
    updateResult = { data: null, error: { message: "connection reset" } };
    const { POST } = await import("../route");

    const res = await POST(post());

    // A swallowed write error would leave the recommendation open while the
    // UI ticks it off — the user believes they have acted and has not.
    expect(res.status).toBe(500);
  });
});
