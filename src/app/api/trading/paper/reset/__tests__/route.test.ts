/**
 * Negative-auth tests for /api/trading/paper/reset (TASK-AUTH-03e)
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
jest.mock("@/lib/trading/paper/PaperTradingEngine", () => ({
  getPaperTradingEngine: jest.fn(),
}));

import { POST } from "../route";

function createMockRequest(url: string): NextRequest {
  return {
    url,
    method: "POST",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/trading/paper/reset", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await POST(
      createMockRequest("http://localhost:3000/api/trading/paper/reset"),
    );
    expect(res.status).toBe(401);
  });
});
