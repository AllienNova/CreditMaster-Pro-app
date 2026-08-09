/**
 * Negative-auth tests for /api/trading/modes (TASK-AUTH-03e)
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

import { GET } from "../route";

function createMockRequest(url: string): NextRequest {
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/trading/modes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await GET(
      createMockRequest("http://localhost:3000/api/trading/modes"),
    );
    expect(res.status).toBe(401);
  });
});
