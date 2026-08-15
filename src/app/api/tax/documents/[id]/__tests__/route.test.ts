/**
 * @jest-environment node
 *
 * GET / DELETE /api/tax/documents/[id]
 *
 * Tax documents are W-2s, 1099s and their extracted contents — among the most
 * sensitive rows in the product. Every query here runs through the service-role
 * client, which bypasses RLS, so the `.eq("user_id", ...)` is the ONLY access
 * control on someone else's income data. These tests are mostly about that.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const eqCalls: Array<[string, unknown]> = [];
const tablesTouched: string[] = [];
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
  for (const m of ["select", "delete", "update", "insert"]) c[m] = jest.fn(() => c);
  c.eq = jest.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return c;
  });
  c.maybeSingle = jest.fn(async () => queryResult);
  // The audit-log insert is awaited without .maybeSingle(), so the chain has
  // to be thenable or the await hangs on a plain object.
  c.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(resolve);
  return c;
}

const mockFrom = jest.fn((table: string) => {
  tablesTouched.push(table);
  return chain();
});

const mockStorageRemove = jest.fn(async () => ({ error: null }));
const mockStorageFrom = jest.fn(() => ({ remove: mockStorageRemove }));

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(() => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}));

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const CALLER = "user-doc-1";
const DOC_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function req(method: string, id = DOC_ID): NextRequest {
  const url = `http://localhost:3000/api/tax/documents/${id}`;
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  eqCalls.length = 0;
  tablesTouched.length = 0;
  queryResult = { data: { id: DOC_ID, document_name: "W-2 2024" }, error: null };

  mockFrom.mockImplementation((table: string) => {
    tablesTouched.push(table);
    return chain();
  });
  mockStorageRemove.mockResolvedValue({ error: null });
  mockStorageFrom.mockReturnValue({ remove: mockStorageRemove });
  (getServiceRoleClient as jest.Mock).mockReturnValue({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  });

  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: CALLER, email: "u@example.com" },
  });
});

describe("GET /api/tax/documents/[id]", () => {
  it("refuses an anonymous caller before touching the database", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { GET } = await import("../route");

    expect((await GET(req("GET"))).status).toBe(401);
    expect(tablesTouched).toHaveLength(0);
  });

  it("scopes the read to the authenticated user", async () => {
    const { GET } = await import("../route");
    await GET(req("GET"));

    // Without this, any authenticated user could read any other user's W-2.
    expect(eqCalls).toContainEqual(["user_id", CALLER]);
    expect(eqCalls).toContainEqual(["id", DOC_ID]);
  });

  it("returns the document", async () => {
    const { GET } = await import("../route");
    const body = await (await GET(req("GET"))).json();

    expect(body.data.document_name).toBe("W-2 2024");
  });

  it("returns 404 for another user's document", async () => {
    queryResult = { data: null, error: null };
    const { GET } = await import("../route");

    expect((await GET(req("GET"))).status).toBe(404);
  });

  it("rejects a non-uuid id before querying", async () => {
    const { GET } = await import("../route");

    expect((await GET(req("GET", "../../etc/passwd"))).status).toBe(400);
    expect(tablesTouched).toHaveLength(0);
  });

  it("surfaces a database error as 500", async () => {
    queryResult = { data: null, error: { message: "connection reset" } };
    const { GET } = await import("../route");

    expect((await GET(req("GET"))).status).toBe(500);
  });
});

describe("DELETE /api/tax/documents/[id]", () => {
  it("refuses an anonymous caller", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const { DELETE } = await import("../route");

    expect((await DELETE(req("DELETE"))).status).toBe(401);
    expect(tablesTouched).toHaveLength(0);
  });

  it("scopes the delete to the authenticated user", async () => {
    const { DELETE } = await import("../route");
    await DELETE(req("DELETE"));

    // An unscoped delete on a guessed uuid destroys another user's tax record.
    expect(eqCalls).toContainEqual(["user_id", CALLER]);
    expect(eqCalls).toContainEqual(["id", DOC_ID]);
  });

  it("returns 404 when nothing was deleted", async () => {
    queryResult = { data: null, error: null };
    const { DELETE } = await import("../route");

    // A delete that matched no row must not report success — otherwise the UI
    // removes a document the server still holds.
    expect((await DELETE(req("DELETE"))).status).toBe(404);
  });

  it("reports success only when a row was removed", async () => {
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

  it("removes the stored file, not just the row", async () => {
    queryResult = {
      data: { id: DOC_ID, storage_path: "u/1/w2-2024.pdf" },
      error: null,
    };
    const { DELETE } = await import("../route");
    await DELETE(req("DELETE"));

    // The collection-level DELETE already does this. A row-only delete would
    // leave the user's W-2 sitting in the bucket after they deleted it —
    // and would make the two delete paths behave differently.
    expect(mockStorageFrom).toHaveBeenCalledWith("tax-documents");
    expect(mockStorageRemove).toHaveBeenCalledWith(["u/1/w2-2024.pdf"]);
  });

  it("does not call storage when the row has no stored file", async () => {
    queryResult = { data: { id: DOC_ID, storage_path: null }, error: null };
    const { DELETE } = await import("../route");
    await DELETE(req("DELETE"));

    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it("writes an audit-log entry for the deletion", async () => {
    const { DELETE } = await import("../route");
    await DELETE(req("DELETE"));

    expect(tablesTouched).toContain("tax_audit_log");
  });
});
