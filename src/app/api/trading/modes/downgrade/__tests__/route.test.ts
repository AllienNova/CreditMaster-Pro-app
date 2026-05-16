/**
 * Negative-auth tests for /api/trading/modes/downgrade (TASK-AUTH-03e)
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

import { POST } from "../route";

function createMockRequest(url: string): NextRequest {
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/trading/modes/downgrade", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(
      createMockRequest("http://localhost:3000/api/trading/modes/downgrade"),
    );
    expect(res.status).toBe(401);
  });
});
