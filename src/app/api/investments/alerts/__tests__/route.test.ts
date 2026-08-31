/**
 * Negative-auth tests for /api/investments/alerts (TASK-AUTH-03e)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
const mockCreateClient = jest.fn((..._args: unknown[]) => ({}) as unknown);
jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { GET, POST, DELETE, PATCH } from "../route";

function createMockRequest(url: string, method = "GET"): NextRequest {
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/investments/alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await GET(
      createMockRequest("http://localhost:3000/api/investments/alerts"),
    );
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await POST(
      createMockRequest("http://localhost:3000/api/investments/alerts", "POST"),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await DELETE(
      createMockRequest(
        "http://localhost:3000/api/investments/alerts?id=alert-1",
        "DELETE",
      ),
    );
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when the request is not authenticated", async () => {
    const res = await PATCH(
      createMockRequest("http://localhost:3000/api/investments/alerts", "PATCH"),
    );
    expect(res.status).toBe(401);
  });
});

/**
 * PATCH exists so the panel's pause/resume control reaches the server instead
 * of flipping a value in local state. Two things are worth pinning:
 *
 *   - only "active" and "disabled" are user-settable. "triggered" is a
 *     lifecycle state an evaluator would set, and no evaluator exists — a
 *     client that could set it could make the UI assert an alert had fired.
 *   - the update is scoped by user_id, and a miss is a 404 rather than a
 *     silent success, so one user cannot pause another's alert and be told
 *     it worked.
 */
describe("PATCH – /api/investments/alerts", () => {
  const filters: Record<string, unknown> = {};
  let updatePayload: Record<string, unknown> | null = null;
  let updateResult: { data: unknown; error: unknown } = {
    data: { id: "alert-1", status: "disabled" },
    error: null,
  };

  const builder: Record<string, unknown> = {
    update: (payload: Record<string, unknown>) => {
      updatePayload = payload;
      return builder;
    },
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return builder;
    },
    select: () => builder,
    maybeSingle: () => Promise.resolve(updateResult),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(filters)) delete filters[key];
    updatePayload = null;
    updateResult = { data: { id: "alert-1", status: "disabled" }, error: null };

    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "u@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockCreateClient.mockReturnValue({ from: () => builder });
  });

  function patchRequest(body: unknown): NextRequest {
    return {
      url: "http://localhost:3000/api/investments/alerts",
      method: "PATCH",
      json: jest.fn().mockResolvedValue(body),
      headers: new Headers(),
      nextUrl: new URL("http://localhost:3000/api/investments/alerts"),
    } as unknown as NextRequest;
  }

  it("disables an alert the caller owns", async () => {
    const res = await PATCH(patchRequest({ id: "alert-1", status: "disabled" }));

    expect(res.status).toBe(200);
    expect(updatePayload).toEqual({ status: "disabled" });
    expect(filters).toMatchObject({ id: "alert-1", user_id: "user-1" });
  });

  it("scopes the update to the caller, not to the id alone", async () => {
    await PATCH(patchRequest({ id: "someone-elses", status: "active" }));

    expect(filters.user_id).toBe("user-1");
  });

  it("rejects a status the user may not set", async () => {
    for (const status of ["triggered", "expired", "nonsense"]) {
      const res = await PATCH(patchRequest({ id: "alert-1", status }));
      expect(res.status).toBe(400);
    }
    expect(updatePayload).toBeNull();
  });

  it("requires an id", async () => {
    const res = await PATCH(patchRequest({ status: "active" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the row is not the caller's", async () => {
    updateResult = { data: null, error: null };

    const res = await PATCH(patchRequest({ id: "alert-1", status: "active" }));

    expect(res.status).toBe(404);
  });

  it("reports a database failure as a 500 rather than a success", async () => {
    updateResult = { data: null, error: { message: "boom" } };

    const res = await PATCH(patchRequest({ id: "alert-1", status: "active" }));

    expect(res.status).toBe(500);
  });
});
