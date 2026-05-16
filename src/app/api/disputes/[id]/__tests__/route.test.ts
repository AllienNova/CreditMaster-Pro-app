/**
 * Negative-auth tests for /api/disputes/[id] (TASK-AUTH-03f)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetDispute = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/disputes/dispute-service", () => ({
  disputeService: {
    getDispute: (...args: unknown[]) => mockGetDispute(...args),
    updateDisputeStatus: jest.fn(),
    resolveDispute: jest.fn(),
    deleteDispute: jest.fn(),
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

  it("GET returns 403 (IDOR) when reading another user's dispute", async () => {
    mockGetDispute.mockReturnValue({ id: "dispute-123", userId: "victim-1" });
    expect((await GET(makeRequest("GET"))).status).toBe(403);
  });

  it("PATCH returns 403 (IDOR) when updating another user's dispute", async () => {
    mockGetDispute.mockReturnValue({ id: "dispute-123", userId: "victim-1" });
    expect((await PATCH(makeRequest("PATCH"))).status).toBe(403);
  });

  it("DELETE returns 403 (IDOR) when deleting another user's dispute", async () => {
    mockGetDispute.mockReturnValue({ id: "dispute-123", userId: "victim-1" });
    expect((await DELETE(makeRequest("DELETE"))).status).toBe(403);
  });
});
