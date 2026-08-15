/**
 * Tests for /api/trading/orders (TASK-AUTH-03e)
 *
 * - negative-auth: unauthenticated callers are rejected with 401.
 * - IDOR regression: an authenticated user cannot read or cancel another
 *   user's orders — every data-access path is scoped to user.id
 *   (AUTH-03e review CRITICAL #3/#4).
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

// Two orders in the in-memory manager: one owned by user-A, one by user-B.
const orderA = { id: "order-A", userId: "user-A", symbol: "AAPL" };
const orderB = { id: "order-B", userId: "user-B", symbol: "MSFT" };
const allOrders = [orderA, orderB];

const mockGetOrders = jest.fn();
const mockOrderManager = {
  getBlotter: () => ({
    openOrders: [...allOrders],
    filledOrders: [],
    cancelledOrders: [],
    totalOpenValue: 0,
    totalFilledValue: 0,
  }),
  getOpenOrders: () => [...allOrders],
  getOrder: (id: string) => allOrders.find((o) => o.id === id),
  getOrders: (...args: unknown[]) => mockGetOrders(...args),
  getOrderEvents: () => [],
};

jest.mock("@/lib/supabase/server", () => ({ supabaseAdmin: {} }));
jest.mock("@/lib/trading/orders", () => ({
  getOrderManager: () => mockOrderManager,
}));
jest.mock("@/lib/trading/brokers/broker-factory", () => ({
  getBrokerFactory: jest.fn(),
}));
jest.mock("@/lib/trading/paper/PaperTradingEngine", () => ({
  PaperTradingEngine: jest.fn(),
}));
jest.mock("@/lib/trading/compliance/gate-runner", () => ({
  runAllGates: jest.fn(),
}));
jest.mock("@/lib/credits", () => ({ creditService: {}, CREDIT_COSTS: {} }));

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
        "http://localhost:3000/api/trading/orders?id=order-A",
        "DELETE",
      ),
    );
    expect(res.status).toBe(401);
  });
});

describe("IDOR – /api/trading/orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Authenticate as user-B.
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-B", email: "user-b@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    // getOrders (DB) is user-scoped via filter.userId — echo only matching rows.
    mockGetOrders.mockImplementation((filter: { userId?: string }) =>
      Promise.resolve(allOrders.filter((o) => o.userId === filter?.userId)),
    );
  });

  it("GET single order by id returns 404 for an order owned by another user (AUTH-03e CRITICAL #3)", async () => {
    const res = await GET(
      createMockRequest("http://localhost:3000/api/trading/orders?id=order-A"),
    );
    expect(res.status).toBe(404);
  });

  it("GET blotter only returns the caller's own orders (AUTH-03e CRITICAL #3)", async () => {
    const res = await GET(
      createMockRequest(
        "http://localhost:3000/api/trading/orders?action=blotter",
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.openOrders).toHaveLength(1);
    expect(body.data.openOrders[0].userId).toBe("user-B");
  });

  it("GET list scopes openOrders and DB orders to the caller (AUTH-03e CRITICAL #3)", async () => {
    const res = await GET(
      createMockRequest("http://localhost:3000/api/trading/orders"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.openOrders).toHaveLength(1);
    expect(body.data.openOrders[0].userId).toBe("user-B");
    // User scoping is the REQUIRED FIRST ARGUMENT, not a filter field. It moved
    // there when getOrders switched to the service-role client (which bypasses
    // RLS), so that omitting it fails to compile rather than silently returning
    // every user's orders.
    expect(mockGetOrders).toHaveBeenCalledWith("user-B", expect.any(Object));
    expect(
      body.data.orders.every((o: { userId: string }) => o.userId === "user-B"),
    ).toBe(true);
  });

  it("DELETE of an order owned by another user returns 403 (AUTH-03e CRITICAL #4)", async () => {
    const res = await DELETE(
      createMockRequest(
        "http://localhost:3000/api/trading/orders?id=order-A",
        "DELETE",
      ),
    );
    expect(res.status).toBe(403);
  });

  it("DELETE of the caller's own order succeeds", async () => {
    const res = await DELETE(
      createMockRequest(
        "http://localhost:3000/api/trading/orders?id=order-B",
        "DELETE",
      ),
    );
    expect(res.status).toBe(200);
  });
});
