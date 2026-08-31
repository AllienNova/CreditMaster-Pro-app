/**
 * Conditional AAL2 enforcement — G-020.
 *
 * Before this, a token carrying `aal: "aal1"` (password verified, second factor
 * NOT satisfied) from a user with a verified TOTP factor was accepted by every
 * guarded route. Measured live: /api/financial/budgets, /api/notifications and
 * /api/privacy/export all returned 200 to such a token. Enrolling MFA bought
 * the user nothing.
 *
 * The two cases that matter most here are the ones that are easy to get
 * backwards:
 *   - aal1 + NO enrolled factor must be ALLOWED (or shipping this locks out
 *     every user who never opted into MFA), and
 *   - a factor-lookup failure must DENY, not allow.
 */

import { NextRequest, NextResponse } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...a: unknown[]) => mockValidateFromHeaders(...a),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...a: unknown[]) => mockResolveRoleFromDb(...a),
}));
jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: () => ({ rpc: (...a: unknown[]) => mockRpc(...a) }),
}));

import { withAuth } from "../api-guard";

const req = () =>
  ({
    url: "http://localhost:3000/api/anything",
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL("http://localhost:3000/api/anything"),
  }) as unknown as NextRequest;

const handler = jest.fn();

function signedInAt(aal: string | undefined) {
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: "user-1", email: "u@example.com", aal },
  });
}

beforeEach(() => {
  mockResolveRoleFromDb.mockResolvedValue("user");
  // Re-established, not merely cleared: jest.config.js sets `resetMocks: true`,
  // which strips implementations. Without this the handler returns undefined and
  // the ALLOWED cases fail on `res.status` — while the DENIED cases still pass,
  // because they never call the handler. A suite that only tested denial would
  // therefore have looked entirely green.
  handler.mockImplementation(async () => NextResponse.json({ ok: true }));
});

describe("aal1 with a verified factor", () => {
  beforeEach(() => {
    signedInAt("aal1");
    mockRpc.mockResolvedValue({ data: true, error: null });
  });

  it("is rejected with 403 mfa_required", async () => {
    const res = await withAuth(handler)(req());

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: "mfa_required" });
  });

  it("never reaches the route handler", async () => {
    await withAuth(handler)(req());
    expect(handler).not.toHaveBeenCalled();
  });

  it("asks about the authenticated caller, not a caller-supplied id", async () => {
    await withAuth(handler)(req());
    expect(mockRpc).toHaveBeenCalledWith("user_has_verified_mfa", {
      p_user_id: "user-1",
    });
  });
});

describe("aal1 with NO enrolled factor", () => {
  it("is allowed — enforcement is conditional on enrolment", async () => {
    // Getting this backwards locks out every user who never opted into MFA.
    signedInAt("aal1");
    mockRpc.mockResolvedValue({ data: false, error: null });

    const res = await withAuth(handler)(req());

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("aal2", () => {
  it("is allowed without consulting the factor table at all", async () => {
    signedInAt("aal2");

    const res = await withAuth(handler)(req());

    expect(res.status).toBe(200);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("tokens with no aal claim", () => {
  it("are allowed — pre-MFA and legacy HS256 tokens carry no such claim", async () => {
    signedInAt(undefined);

    const res = await withAuth(handler)(req());

    expect(res.status).toBe(200);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("factor lookup failure", () => {
  it("fails CLOSED when the RPC returns an error", async () => {
    signedInAt("aal1");
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockRpc.mockResolvedValue({ data: null, error: new Error("42501") });

    const res = await withAuth(handler)(req());

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it("fails CLOSED when the RPC rejects", async () => {
    signedInAt("aal1");
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockRpc.mockRejectedValue(new Error("connection refused"));

    const res = await withAuth(handler)(req());

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not leak the underlying error to the caller", async () => {
    signedInAt("aal1");
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockRpc.mockRejectedValue(new Error("postgres://user:pw@host unreachable"));

    const res = await withAuth(handler)(req());
    const body = JSON.stringify(await res.json());

    expect(body).not.toContain("postgres://");
  });
});
