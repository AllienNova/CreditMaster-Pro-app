/**
 * Negative-auth tests for /api/trading/journal/[id] (TASK-AUTH-03e)
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
jest.mock("@/lib/trading/services/TradingJournalService", () => ({
  getTradingJournalService: jest.fn(),
}));

import { GET, PUT, DELETE } from "../route";

function createMockRequest(url: string, method = "GET"): NextRequest {
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const URL_PATH = "http://localhost:3000/api/trading/journal/trade_1";

describe("negative-auth – /api/trading/journal/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await GET(createMockRequest(URL_PATH));
    expect(res.status).toBe(401);
  });

  it("PUT returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await PUT(createMockRequest(URL_PATH, "PUT"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await DELETE(createMockRequest(URL_PATH, "DELETE"));
    expect(res.status).toBe(401);
  });
});
