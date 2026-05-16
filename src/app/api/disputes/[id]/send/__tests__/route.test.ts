/**
 * Negative-auth tests for /api/disputes/[id]/send (TASK-AUTH-03f)
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
    sendDispute: jest.fn(),
  },
}));

import { PATCH } from "../route";

function makeRequest(): NextRequest {
  const url = "http://localhost:3000/api/disputes/dispute-123/send";
  return {
    url,
    method: "PATCH",
    headers: new Headers(),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue({}),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/disputes/[id]/send", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "attacker-1", email: "attacker@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("PATCH returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await PATCH(makeRequest())).status).toBe(401);
  });

  it("PATCH returns 403 (IDOR) when sending another user's dispute", async () => {
    mockGetDispute.mockReturnValue({ id: "dispute-123", userId: "victim-1" });
    expect((await PATCH(makeRequest())).status).toBe(403);
  });
});
