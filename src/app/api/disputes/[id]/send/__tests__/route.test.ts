/**
 * @jest-environment node
 *
 * Negative-auth tests for /api/disputes/[id]/send (TASK-AUTH-03f, TASK-CRD-3).
 *
 * IDOR defence is at the service layer. sendDispute throws for wrong owner.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockSendDispute = jest.fn();

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
    sendDispute: (...args: unknown[]) => mockSendDispute(...args),
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

  it("PATCH returns non-2xx (IDOR) when sending another user's dispute", async () => {
    // Service throws for wrong owner — route returns 500.
    mockSendDispute.mockRejectedValue(new Error("Not found"));
    const res = await PATCH(makeRequest());
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
