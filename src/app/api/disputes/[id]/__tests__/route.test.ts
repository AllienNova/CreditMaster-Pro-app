/**
 * @jest-environment node
 *
 * Negative-auth tests for /api/disputes/[id] (TASK-AUTH-03f, TASK-CRD-3).
 *
 * IDOR defence is at the service layer. The route calls user-scoped DB service
 * methods. When a caller presents another user's dispute id:
 *   – GET: getDispute returns null → route returns 404
 *   – PATCH: service throws → route returns 500
 *   – DELETE: deleteDispute returns false → route returns 404
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetDispute = jest.fn();
const mockUpdateDisputeStatus = jest.fn();
const mockResolveDispute = jest.fn();
const mockDeleteDispute = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/disputes/dispute-service-db", () => ({
  disputeServiceDB: {
    getDispute: (...args: unknown[]) => mockGetDispute(...args),
    updateDisputeStatus: (...args: unknown[]) =>
      mockUpdateDisputeStatus(...args),
    resolveDispute: (...args: unknown[]) => mockResolveDispute(...args),
    deleteDispute: (...args: unknown[]) => mockDeleteDispute(...args),
  },
}));

import { GET, PATCH, DELETE } from "../route";

function makeRequest(method = "GET"): NextRequest {
  const url = "http://localhost:3000/api/disputes/dispute-123";
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue({}),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/disputes/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "attacker-1", email: "attacker@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("GET returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(makeRequest("GET"))).status).toBe(401);
  });

  it("PATCH returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await PATCH(makeRequest("PATCH"))).status).toBe(401);
  });

  it("DELETE returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await DELETE(makeRequest("DELETE"))).status).toBe(401);
  });

  it("GET returns 404 (IDOR) when reading another user's dispute", async () => {
    // getDispute returns null for wrong owner — route cannot distinguish
    // "not found" from "belongs to other user" (intentional, no existence leak).
    mockGetDispute.mockResolvedValue(null);
    expect((await GET(makeRequest("GET"))).status).toBe(404);
  });

  it("PATCH returns non-2xx (IDOR) when updating another user's dispute", async () => {
    // Service throws for wrong owner.
    mockUpdateDisputeStatus.mockRejectedValue(new Error("Not found"));
    const res = await PATCH(makeRequest("PATCH"));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("DELETE returns 404 (IDOR) when deleting another user's dispute", async () => {
    // deleteDispute returns false for wrong owner.
    mockDeleteDispute.mockResolvedValue(false);
    expect((await DELETE(makeRequest("DELETE"))).status).toBe(404);
  });
});
