/**
 * Tests for /api/trading/paper/orders (TASK-AUTH-03e)
 *
 * - negative-auth: unauthenticated callers are rejected with 401.
 * - IDOR regression: DELETE must verify the order belongs to the caller's
 *   own paper account before cancelling (AUTH-03e review HIGH #5).
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

// user-A owns account acc-A which holds order-A.
const mockEngine = {
  getAccount: jest.fn(),
  getOrders: jest.fn(),
  cancelOrder: jest.fn(),
};

jest.mock("@/lib/trading/paper/PaperTradingEngine", () => ({
  getPaperTradingEngine: () => mockEngine,
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

describe("negative-auth – /api/trading/paper/orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await GET(
      createMockRequest("http://localhost:3000/api/trading/paper/orders"),
    );
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await POST(
      createMockRequest(
        "http://localhost:3000/api/trading/paper/orders",
        "POST",
      ),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
    const res = await DELETE(
      createMockRequest(
        "http://localhost:3000/api/trading/paper/orders?id=ord-1",
        "DELETE",
      ),
    );
    expect(res.status).toBe(401);
  });
});

describe("IDOR – /api/trading/paper/orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Authenticate as user-B, who owns account acc-B (no order-A in it).
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-B", email: "user-b@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockEngine.getAccount.mockResolvedValue({ id: "acc-B" });
    // acc-B contains only order-B; order-A belongs to a different account.
    mockEngine.getOrders.mockResolvedValue([{ id: "order-B" }]);
    mockEngine.cancelOrder.mockResolvedValue({ id: "order-B", status: "cancelled" });
  });

  it("DELETE of an order not in the caller's account returns 404, not a cancel (AUTH-03e HIGH #5)", async () => {
    const res = await DELETE(
      createMockRequest(
        "http://localhost:3000/api/trading/paper/orders?id=order-A",
        "DELETE",
      ),
    );
    expect(res.status).toBe(404);
    expect(mockEngine.cancelOrder).not.toHaveBeenCalled();
  });

  it("DELETE of an order in the caller's own account succeeds", async () => {
    const res = await DELETE(
      createMockRequest(
        "http://localhost:3000/api/trading/paper/orders?id=order-B",
        "DELETE",
      ),
    );
    expect(res.status).toBe(200);
    expect(mockEngine.cancelOrder).toHaveBeenCalledWith("order-B");
  });
});
