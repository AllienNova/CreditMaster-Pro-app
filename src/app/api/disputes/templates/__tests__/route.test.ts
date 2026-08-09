/**
 * Negative-auth tests for /api/disputes/templates (TASK-AUTH-03f)
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

import { GET, POST } from "../route";

function makeRequest(method = "GET"): NextRequest {
  const url = "http://localhost:3000/api/disputes/templates";
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue({}),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/disputes/templates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when not authenticated", async () => {
    expect((await GET(makeRequest("GET"))).status).toBe(401);
  });

  it("POST returns 401 when not authenticated", async () => {
    expect((await POST(makeRequest("POST"))).status).toBe(401);
  });
});
