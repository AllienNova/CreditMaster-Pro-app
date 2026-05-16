/**
 * Negative-auth tests for /api/trading/orders (TASK-AUTH-03e)
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
jest.mock("@/lib/trading/orders", () => ({ getOrderManager: jest.fn() }));
jest.mock("@/lib/trading/brokers/broker-factory", () => ({
  getBrokerFactory: jest.fn(),
}));
jest.mock("@/lib/trading/paper/PaperTradingEngine", () => ({
  PaperTradingEngine: jest.fn(),
}));
jest.mock("@/lib/trading/compliance/gate-runner", () => ({
  runAllGates: jest.fn(),
}));
jest.mock("@/lib/credits", () => ({
  creditService: {},
  CREDIT_COSTS: {},
}));

import { GET, POST, DELETE } from "../route";

function createMockRequest(url: string, method = "GET"): NextRequest {
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/trading/orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await GET(
      createMockRequest("http://localhost:3000/api/trading/orders"),
    );
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await POST(
      createMockRequest("http://localhost:3000/api/trading/orders", "POST"),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await DELETE(
      createMockRequest(
        "http://localhost:3000/api/trading/orders?id=ord-1",
        "DELETE",
      ),
    );
    expect(res.status).toBe(401);
  });
});
