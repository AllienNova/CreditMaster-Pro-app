/**
 * Negative-auth tests for /api/ws/market-data (TASK-AUTH-03e)
 *
 * The SSE upgrade endpoint must reject unauthenticated callers before any
 * stream is opened.
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
jest.mock("@/lib/investments/services/MarketDataService", () => ({
  getMarketDataService: jest.fn(),
}));

import { GET, POST } from "../route";

function createMockRequest(url: string, method = "GET"): NextRequest {
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: new URL(url),
    signal: { addEventListener: jest.fn() },
  } as unknown as NextRequest;
}

describe("negative-auth – /api/ws/market-data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 on an unauthenticated socket upgrade (TASK-AUTH-03e)", async () => {
    const res = await GET(
      createMockRequest(
        "http://localhost:3000/api/ws/market-data?symbols=AAPL",
      ),
    );
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await POST(
      createMockRequest("http://localhost:3000/api/ws/market-data", "POST"),
    );
    expect(res.status).toBe(401);
  });
});
