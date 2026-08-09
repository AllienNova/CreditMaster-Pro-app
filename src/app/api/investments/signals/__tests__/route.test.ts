/**
 * Negative-auth tests for /api/investments/signals (TASK-AUTH-03e)
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
jest.mock("@/lib/investments/signal-generator", () => ({
  SignalGenerator: jest.fn(() => ({})),
}));
jest.mock("@/lib/security/redis-rate-limiting", () => ({
  rateLimit: jest.fn(() => ({ check: jest.fn() })),
}));

import { GET, POST } from "../route";

function createMockRequest(url: string, method = "GET"): NextRequest {
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/investments/signals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await GET(
      createMockRequest("http://localhost:3000/api/investments/signals"),
    );
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await POST(
      createMockRequest(
        "http://localhost:3000/api/investments/signals",
        "POST",
      ),
    );
    expect(res.status).toBe(401);
  });
});
