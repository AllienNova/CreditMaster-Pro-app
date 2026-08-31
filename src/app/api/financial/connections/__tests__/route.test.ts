/**
 * GET /api/financial/connections and DELETE /api/financial/connections/[id]
 *
 * These two routes replaced a hardcoded array. The mobile Connected Accounts
 * screen showed every user three "connected" credit bureaus plus Chase, Marcus
 * and Fidelity, and its Disconnect button filtered a local array — so what is
 * worth pinning here is not the happy path but the ways a disconnect can lie:
 *
 *  1. Plaid refuses -> nothing is deleted locally and the caller learns it
 *     failed. Answering 200 would hide a live bank connection from a user who
 *     believes they ended it.
 *  2. Plaid says the token matches no Item -> the consent is already gone, so
 *     local cleanup proceeds. This is what makes retrying a half-finished
 *     disconnect work instead of wedging forever.
 *  3. Another user's connection id -> 404, not 403, so ids are not probeable.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockListConnections = jest.fn();
const mockRemoveConnection = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/financial/plaid-service", () => ({
  plaidService: {
    listConnections: (...a: unknown[]) => mockListConnections(...a),
    removeConnection: (...a: unknown[]) => mockRemoveConnection(...a),
  },
}));

import { GET } from "../route";
import { DELETE } from "../[connectionId]/route";

const USER = "user-1";
const CONNECTION = "9f1c3f2e-2b0a-4a1e-9c77-8f2b1d6a4e05";

const CONNECTION_PAYLOAD = {
  id: CONNECTION,
  provider: "plaid",
  institutionId: "ins_109508",
  institutionName: "First Platypus Bank",
  status: "active",
  errorCode: null,
  errorMessage: null,
  consentExpiresAt: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  accounts: [
    {
      id: "item-1_acc-1",
      accountName: "Plaid Checking",
      accountType: "depository",
      accountSubtype: "checking",
      mask: "0000",
      currentBalance: 110,
      currency: "USD",
      lastSynced: "2026-08-17T09:00:00.000Z",
    },
  ],
};

function listReq(): NextRequest {
  const url = "http://localhost:3000/api/financial/connections";
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

function deleteReq(id = CONNECTION): NextRequest {
  const url = `http://localhost:3000/api/financial/connections/${id}`;
  return {
    url,
    method: "DELETE",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockValidateFromHeaders.mockResolvedValue({
    valid: true,
    user: { id: USER, email: "user@example.com" },
  });
  mockResolveRoleFromDb.mockResolvedValue("premium");
  mockListConnections.mockResolvedValue([CONNECTION_PAYLOAD]);
  mockRemoveConnection.mockResolvedValue({ outcome: "removed" });
});

describe("GET /api/financial/connections", () => {
  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(listReq())).status).toBe(401);
  });

  it("asks only for the AUTHENTICATED user's connections", async () => {
    await GET(listReq());
    expect(mockListConnections).toHaveBeenCalledWith(USER);
  });

  it("returns each connection with its accounts", async () => {
    const res = await GET(listReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connections: [CONNECTION_PAYLOAD] });
  });

  it("returns an empty list for a user who has linked nothing", async () => {
    // The screen must be able to say "no banks linked". A non-empty default
    // here is exactly the bug this route was built to remove.
    mockListConnections.mockResolvedValue([]);
    expect(await (await GET(listReq())).json()).toEqual({ connections: [] });
  });

  it("returns 500 with no connections at all when the lookup fails", async () => {
    mockListConnections.mockRejectedValue(new Error("db down"));
    const res = await GET(listReq());
    expect(res.status).toBe(500);
    expect((await res.json()).connections).toBeUndefined();
  });
});

describe("DELETE /api/financial/connections/[connectionId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await DELETE(deleteReq())).status).toBe(401);
  });

  it.each(["not-a-uuid", "1", "connections"])(
    "rejects %j before reaching the service",
    async (id) => {
      expect((await DELETE(deleteReq(id))).status).toBe(400);
      expect(mockRemoveConnection).not.toHaveBeenCalled();
    },
  );

  it("revokes on behalf of the AUTHENTICATED user, not a body-supplied one", async () => {
    await DELETE(deleteReq());
    expect(mockRemoveConnection).toHaveBeenCalledWith(CONNECTION, USER);
  });

  it("reads the id from the last path segment", async () => {
    const other = "11111111-2222-3333-4444-555555555555";
    await DELETE(deleteReq(other));
    expect(mockRemoveConnection).toHaveBeenCalledWith(other, USER);
  });

  it("returns 200 when the connection is gone", async () => {
    const res = await DELETE(deleteReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns 404 rather than 403 for someone else's connection", async () => {
    mockRemoveConnection.mockResolvedValue({ outcome: "not_found" });
    expect((await DELETE(deleteReq())).status).toBe(404);
  });

  describe("when the provider refuses", () => {
    beforeEach(() =>
      mockRemoveConnection.mockResolvedValue({
        outcome: "provider_error",
        message: "PLANNED_MAINTENANCE",
      }),
    );

    it("returns 502, never a success", async () => {
      // A 200 here would tell the user their bank was disconnected while the
      // consent kept running.
      const res = await DELETE(deleteReq());
      expect(res.status).toBe(502);
      expect((await res.json()).success).toBeUndefined();
    });

    it("says nothing was changed, so retrying is obviously safe", async () => {
      const body = await (await DELETE(deleteReq())).json();
      expect(body.error).toMatch(/nothing was changed/i);
    });

    it("does not leak the provider's raw error to the client", async () => {
      const body = await (await DELETE(deleteReq())).json();
      expect(JSON.stringify(body)).not.toContain("PLANNED_MAINTENANCE");
    });
  });

  describe("when we hold no usable credential", () => {
    beforeEach(() =>
      mockRemoveConnection.mockResolvedValue({
        outcome: "credential_error",
        message: "binding mismatch",
      }),
    );

    it("returns 500, not the retryable 502", async () => {
      // 502 tells the user to try again. Nothing about a missing credential
      // resolves by retrying, so that would be a loop with no exit.
      expect((await DELETE(deleteReq())).status).toBe(500);
    });

    it("says nothing was changed and points at support, not a retry", async () => {
      const body = await (await DELETE(deleteReq())).json();
      expect(body.error).toMatch(/nothing was changed/i);
      expect(body.error).toMatch(/support/i);
      expect(body.error).not.toMatch(/try again/i);
    });
  });

  it("returns 500 when the consent was revoked but cleanup failed", async () => {
    // The two halves have diverged. Reporting success would leave accounts on
    // screen for a bank that is no longer connected, with no way to explain it.
    mockRemoveConnection.mockRejectedValue(
      new Error("Bank consent was revoked at the provider but ..."),
    );
    const res = await DELETE(deleteReq());
    expect(res.status).toBe(500);
    expect((await res.json()).success).toBeUndefined();
  });
});
