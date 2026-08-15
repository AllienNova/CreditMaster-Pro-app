/**
 * @jest-environment node
 *
 * POST /api/tax/documents/[id]/verify
 *
 * Confirms an extraction is correct, optionally with manual corrections.
 *
 * Two properties are load-bearing. The update must be scoped to the caller —
 * it runs through the service-role client, which bypasses RLS — and the
 * `verified_by` stamp must come from the SESSION, never the request body. An
 * attestation that can name someone else as the verifier is worse than no
 * attestation, because the audit trail then actively misleads.
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

const CALLER = "user-doc-2";
const DOC_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function post(body: unknown, id = DOC_ID): NextRequest {
  const url = `http://localhost:3000/api/tax/documents/${id}/verify`;
  return {
    url,
    method: "POST",
    headers: new Headers(),
    nextUrl: new URL(url),
    json: async () => body,
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  eqCalls.length = 0;
  tablesTouched.length = 0;
  updatePayload = null;
  queryResult = { data: { id: DOC_ID, is_verified: true }, error: null };

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

describe("POST /api/tax/documents/[id]/verify", () => {
  it("refuses an anonymous caller before touching the database", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { POST } = await import("../route");

    expect((await POST(post({}))).status).toBe(401);
    expect(tablesTouched).toHaveLength(0);
  });

  it("scopes the update to the authenticated user and the path id", async () => {
    const { POST } = await import("../route");
    await POST(post({}));

    expect(eqCalls).toContainEqual(["user_id", CALLER]);
    expect(eqCalls).toContainEqual(["id", DOC_ID]);
  });

  it("marks the document verified", async () => {
    const { POST } = await import("../route");
    await POST(post({}));

    expect(updatePayload).toMatchObject({
      is_verified: true,
      requires_review: false,
    });
  });

  it("stamps verified_by from the SESSION, not the body", async () => {
    const { POST } = await import("../route");
    await POST(post({ verified_by: "someone-else", corrections: undefined }));

    // An attestation that can name a different verifier makes the audit trail
    // actively misleading.
    expect(updatePayload?.verified_by).toBe(CALLER);
  });

  it("records manual corrections when supplied", async () => {
    const { POST } = await import("../route");
    await POST(post({ corrections: { box1: 84320 } }));

    expect(updatePayload?.manual_corrections).toEqual({ box1: 84320 });
  });

  it("accepts a verification with no corrections", async () => {
    const { POST } = await import("../route");
    const res = await POST(post({}));

    // "The extraction was right" is the common case and must not require a
    // corrections object.
    expect(res.status).toBe(200);
    expect(updatePayload).not.toHaveProperty("manual_corrections");
  });

  it("tolerates a request with no JSON body at all", async () => {
    const { POST } = await import("../route");
    const bad = post({});
    (bad as unknown as { json: () => Promise<unknown> }).json = async () => {
      throw new Error("no body");
    };

    expect((await POST(bad)).status).toBe(200);
  });

  it("rejects corrections that are not an object", async () => {
    const { POST } = await import("../route");

    expect((await POST(post({ corrections: [1, 2] }))).status).toBe(400);
  });

  it("returns 404 for another user's document", async () => {
    queryResult = { data: null, error: null };
    const { POST } = await import("../route");

    expect((await POST(post({}))).status).toBe(404);
  });

  it("rejects a non-uuid id before querying", async () => {
    const { POST } = await import("../route");

    expect((await POST(post({}, "nope"))).status).toBe(400);
    expect(tablesTouched).toHaveLength(0);
  });

  it("surfaces a database error as 500, not as a successful verification", async () => {
    queryResult = { data: null, error: { message: "connection reset" } };
    const { POST } = await import("../route");

    // Reporting success on a failed write would show a verified badge on a
    // document the server still considers unverified.
    expect((await POST(post({}))).status).toBe(500);
  });
});
