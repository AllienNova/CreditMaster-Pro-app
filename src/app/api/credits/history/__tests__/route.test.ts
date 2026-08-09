/**
 * Negative-auth tests for /api/credits/history (TASK-AUTH-03f)
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
jest.mock("@/lib/supabase/server", () => ({ supabaseAdmin: {} }));
jest.mock("@/lib/credits/credit-service", () => ({
  creditService: { getTransactionHistory: jest.fn() },
}));

import { GET } from "../route";

function createMockRequest(): NextRequest {
  const url = "http://localhost:3000/api/credits/history";
  return {
    url,
    method: "GET",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/credits/history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated", async () => {
    const res = await GET(createMockRequest());
    expect(res.status).toBe(401);
  });
});
