/**
 * @jest-environment node
 *
 * Negative-auth tests for /api/disputes/stats (TASK-AUTH-03f, TASK-CRD-3).
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetUserDisputeStats = jest.fn();

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
    getUserDisputeStats: (...args: unknown[]) =>
      mockGetUserDisputeStats(...args),
  },
}));

import { GET } from "../route";

function makeRequest(): NextRequest {
  const url = "http://localhost:3000/api/disputes/stats";
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue({}),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/disputes/stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when not authenticated", async () => {
    expect((await GET(makeRequest())).status).toBe(401);
  });
});
