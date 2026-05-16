/**
 * Paper Trading API Routes Tests
 *
 * Tests for paper account, orders, positions, performance, and reset endpoints.
 */

// Mock auth guard dependencies before imports
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

import { NextRequest } from "next/server";
import { getPaperTradingEngine } from "@/lib/trading/paper/PaperTradingEngine";

// Import route handlers
import { GET as accountGET, POST as accountPOST } from "../route";
import { GET as ordersGET, POST as ordersPOST, DELETE as ordersDELETE } from "../orders/route";
import { GET as positionsGET } from "../positions/route";
import { GET as performanceGET } from "../performance/route";
import { POST as resetPOST } from "../reset/route";

// ============================================================================
// HELPERS
// ============================================================================

const mockUser = { id: "user_123", email: "test@test.com" };

// Paper routes are wrapped in withAuth; auth is mocked at the guard layer.
function setupAuth(authenticated: boolean) {
  if (authenticated) {
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: mockUser });
    mockResolveRoleFromDb.mockResolvedValue("user");
  } else {
    mockValidateFromHeaders.mockResolvedValue({
      valid: false,
      user: null,
      error: "Unauthorized",
    });
  }
}

function createRequest(
  url: string,
  method: string = "GET",
  body?: Record<string, unknown>,
): NextRequest {
  const absoluteUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  const req = new NextRequest(absoluteUrl, init as never);
  if (body) {
    req.json = jest.fn().mockResolvedValue(body);
  }
  return req;
}

const mockAccount = {
  id: "paper_acc_1",
  userId: "user_123",
  name: "Paper Trading Account",
  initialBalance: 100000,
  cashBalance: 95000,
  buyingPower: 95000,
  portfolioValue: 5000,
  totalValue: 100000,
  dayTradeCount: 2,
  isPDTRestricted: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-15"),
};

const mockOrder = {
  id: "order_1",
  symbol: "AAPL",
  side: "buy",
  type: "market",
  quantity: 10,
  status: "filled",
  filledQuantity: 10,
  avgFilledPrice: 150,
  createdAt: new Date("2026-01-15"),
};

const mockPosition = {
  id: "pos_1",
  accountId: "paper_acc_1",
  symbol: "AAPL",
  quantity: 10,
  avgEntryPrice: 150,
  currentPrice: 155,
  marketValue: 1550,
  unrealizedPL: 50,
  unrealizedPLPercent: 3.33,
  realizedPL: 0,
  costBasis: 1500,
  side: "long",
};

const mockPerformance = {
  totalTrades: 15,
  winRate: 0.6,
  totalPL: 3500,
  sharpeRatio: 1.2,
  maxDrawdown: -5,
  avgWin: 500,
  avgLoss: -200,
};

// ============================================================================
// PAPER ACCOUNT (route.ts)
// ============================================================================

describe("Paper Trading - Account", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(true);
  });

  // --------------------------------------------------------------------------
  // GET /api/trading/paper
  // --------------------------------------------------------------------------

  describe("GET /api/trading/paper", () => {
    it("returns 401 when not authenticated", async () => {
      setupAuth(false);

      const res = await accountGET(createRequest("/api/trading/paper"));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns null when no account exists", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(null),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const res = await accountGET(createRequest("/api/trading/paper"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeNull();
    });

    it("returns account when it exists", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const res = await accountGET(createRequest("/api/trading/paper"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("paper_acc_1");
      expect(data.data.cashBalance).toBe(95000);
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/trading/paper
  // --------------------------------------------------------------------------

  describe("POST /api/trading/paper", () => {
    it("returns 401 when not authenticated", async () => {
      setupAuth(false);

      const req = createRequest("/api/trading/paper", "POST", {});
      const res = await accountPOST(req);

      expect(res.status).toBe(401);
    });

    it("returns 409 when account already exists", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper", "POST", {});
      const res = await accountPOST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain("already exists");
    });

    it("creates account with defaults", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(null),
        createAccount: jest.fn().mockResolvedValue(mockAccount),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper", "POST", {});
      const res = await accountPOST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockEngine.createAccount).toHaveBeenCalledWith(
        "user_123",
        "Paper Trading Account",
        undefined,
      );
    });

    it("creates account with custom name and balance", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(null),
        createAccount: jest.fn().mockResolvedValue({
          ...mockAccount,
          name: "My Paper Account",
          initialBalance: 50000,
        }),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper", "POST", {
        name: "My Paper Account",
        initialBalance: 50000,
      });
      const res = await accountPOST(req);

      expect(res.status).toBe(201);
      expect(mockEngine.createAccount).toHaveBeenCalledWith(
        "user_123",
        "My Paper Account",
        50000,
      );
    });
  });
});

// ============================================================================
// PAPER ORDERS (paper/orders/route.ts)
// ============================================================================

describe("Paper Trading - Orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(true);
  });

  // --------------------------------------------------------------------------
  // GET /api/trading/paper/orders
  // --------------------------------------------------------------------------

  describe("GET /api/trading/paper/orders", () => {
    it("returns 401 when not authenticated", async () => {
      setupAuth(false);

      const req = createRequest("/api/trading/paper/orders");
      const res = await ordersGET(req);

      expect(res.status).toBe(401);
    });

    it("returns 404 when no paper account exists", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(null),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper/orders");
      const res = await ordersGET(req);

      expect(res.status).toBe(404);
    });

    it("returns orders list", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        getOrders: jest.fn().mockResolvedValue([mockOrder]),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper/orders");
      const res = await ordersGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it("returns order blotter when action=blotter", async () => {
      const mockBlotter = {
        openOrders: 2,
        filledOrders: 10,
        cancelledOrders: 1,
        todayOrders: 3,
      };
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        getOrderBlotter: jest.fn().mockResolvedValue(mockBlotter),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper/orders?action=blotter");
      const res = await ordersGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.openOrders).toBe(2);
    });

    it("passes filters to getOrders", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        getOrders: jest.fn().mockResolvedValue([]),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest(
        "/api/trading/paper/orders?status=filled&side=buy&symbol=AAPL",
      );
      const res = await ordersGET(req);

      expect(res.status).toBe(200);
      expect(mockEngine.getOrders).toHaveBeenCalledWith(
        "paper_acc_1",
        expect.objectContaining({
          status: "filled",
          side: "buy",
          symbol: "AAPL",
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/trading/paper/orders
  // --------------------------------------------------------------------------

  describe("POST /api/trading/paper/orders", () => {
    it("returns 401 when not authenticated", async () => {
      setupAuth(false);

      const req = createRequest("/api/trading/paper/orders", "POST", {
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
      });
      const res = await ordersPOST(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when required fields are missing", async () => {
      const req = createRequest("/api/trading/paper/orders", "POST", {
        symbol: "AAPL",
      });
      const res = await ordersPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("returns 404 when no paper account exists", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(null),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper/orders", "POST", {
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
      });
      const res = await ordersPOST(req);

      expect(res.status).toBe(404);
    });

    it("places a market order successfully", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        placeOrder: jest.fn().mockResolvedValue(mockOrder),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper/orders", "POST", {
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
      });
      const res = await ordersPOST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockEngine.placeOrder).toHaveBeenCalledWith(
        "paper_acc_1",
        expect.objectContaining({
          symbol: "AAPL",
          side: "buy",
          type: "market",
          quantity: 10,
          timeInForce: "day",
        }),
      );
    });

    it("places a limit order with custom fields", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        placeOrder: jest.fn().mockResolvedValue({
          ...mockOrder,
          type: "limit",
          limitPrice: 145,
        }),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper/orders", "POST", {
        symbol: "AAPL",
        side: "buy",
        quantity: 10,
        type: "limit",
        limitPrice: 145,
        timeInForce: "gtc",
      });
      const res = await ordersPOST(req);

      expect(res.status).toBe(201);
      expect(mockEngine.placeOrder).toHaveBeenCalledWith(
        "paper_acc_1",
        expect.objectContaining({
          type: "limit",
          limitPrice: 145,
          timeInForce: "gtc",
        }),
      );
    });

    it("returns order validation errors", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        placeOrder: jest.fn().mockRejectedValue(new Error("Insufficient buying power")),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper/orders", "POST", {
        symbol: "AAPL",
        side: "buy",
        quantity: 10000,
      });
      const res = await ordersPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Insufficient buying power");
    });
  });

  // --------------------------------------------------------------------------
  // DELETE /api/trading/paper/orders
  // --------------------------------------------------------------------------

  describe("DELETE /api/trading/paper/orders", () => {
    it("returns 401 when not authenticated", async () => {
      setupAuth(false);

      const req = createRequest("/api/trading/paper/orders?id=order_1", "DELETE");
      const res = await ordersDELETE(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when order id is missing", async () => {
      const req = createRequest("/api/trading/paper/orders", "DELETE");
      const res = await ordersDELETE(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Missing required parameter");
    });

    it("cancels order successfully", async () => {
      const cancelledOrder = { ...mockOrder, status: "cancelled" };
      // DELETE now verifies the order belongs to the caller's account
      // (AUTH-03e HIGH #5) — the engine mock must support getAccount/getOrders.
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        getOrders: jest.fn().mockResolvedValue([mockOrder]),
        cancelOrder: jest.fn().mockResolvedValue(cancelledOrder),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper/orders?id=order_1", "DELETE");
      const res = await ordersDELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEngine.getOrders).toHaveBeenCalledWith(mockAccount.id);
      expect(mockEngine.cancelOrder).toHaveBeenCalledWith("order_1");
    });

    it("returns 404 when the order is not in the caller's account (AUTH-03e HIGH #5)", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        getOrders: jest.fn().mockResolvedValue([]), // order_1 not owned
        cancelOrder: jest.fn(),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper/orders?id=order_1", "DELETE");
      const res = await ordersDELETE(req);

      expect(res.status).toBe(404);
      expect(mockEngine.cancelOrder).not.toHaveBeenCalled();
    });

    it("returns error for already-filled orders", async () => {
      const mockEngine = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        getOrders: jest.fn().mockResolvedValue([mockOrder]),
        cancelOrder: jest
          .fn()
          .mockRejectedValue(new Error("Cannot cancel filled order")),
      };
      (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

      const req = createRequest("/api/trading/paper/orders?id=order_1", "DELETE");
      const res = await ordersDELETE(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Cannot cancel filled order");
    });
  });
});

// ============================================================================
// PAPER POSITIONS (paper/positions/route.ts)
// ============================================================================

describe("Paper Trading - Positions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(true);
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(false);

    const req = createRequest("/api/trading/paper/positions");
    const res = await positionsGET(req);

    expect(res.status).toBe(401);
  });

  it("returns 404 when no paper account exists", async () => {
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(null),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const req = createRequest("/api/trading/paper/positions");
    const res = await positionsGET(req);

    expect(res.status).toBe(404);
  });

  it("returns all positions", async () => {
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(mockAccount),
      getPositions: jest.fn().mockResolvedValue([mockPosition]),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const req = createRequest("/api/trading/paper/positions");
    const res = await positionsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].symbol).toBe("AAPL");
  });

  it("returns single position by symbol", async () => {
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(mockAccount),
      getPosition: jest.fn().mockResolvedValue(mockPosition),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const req = createRequest("/api/trading/paper/positions?symbol=AAPL");
    const res = await positionsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.symbol).toBe("AAPL");
  });

  it("returns 404 when position not found for symbol", async () => {
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(mockAccount),
      getPosition: jest.fn().mockResolvedValue(null),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const req = createRequest("/api/trading/paper/positions?symbol=NVDA");
    const res = await positionsGET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("No position found");
  });
});

// ============================================================================
// PAPER PERFORMANCE (paper/performance/route.ts)
// ============================================================================

describe("Paper Trading - Performance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(true);
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(false);

    const req = createRequest("/api/trading/paper/performance");
    const res = await performanceGET(req);

    expect(res.status).toBe(401);
  });

  it("returns 404 when no paper account for performance action", async () => {
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(null),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const req = createRequest("/api/trading/paper/performance");
    const res = await performanceGET(req);

    expect(res.status).toBe(404);
  });

  it("returns performance metrics by default", async () => {
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(mockAccount),
      getPerformance: jest.fn().mockResolvedValue(mockPerformance),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const req = createRequest("/api/trading/paper/performance");
    const res = await performanceGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.winRate).toBe(0.6);
    expect(data.data.sharpeRatio).toBe(1.2);
  });

  it("passes date range to performance", async () => {
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(mockAccount),
      getPerformance: jest.fn().mockResolvedValue(mockPerformance),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const req = createRequest(
      "/api/trading/paper/performance?startDate=2026-01-01&endDate=2026-02-01",
    );
    const res = await performanceGET(req);

    expect(res.status).toBe(200);
    expect(mockEngine.getPerformance).toHaveBeenCalledWith(
      "paper_acc_1",
      expect.any(Date),
      expect.any(Date),
    );
  });

  it("returns graduation status when action=graduation", async () => {
    const mockGraduation = {
      success: true,
      data: {
        currentMode: "WATCH",
        canGraduate: false,
        progress: { tradeCount: 10, requiredTrades: 50 },
      },
    };
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(null),
      getGraduationStatus: jest.fn().mockResolvedValue(mockGraduation),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const req = createRequest("/api/trading/paper/performance?action=graduation");
    const res = await performanceGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockEngine.getGraduationStatus).toHaveBeenCalledWith("user_123");
  });

  it("returns trade history when action=trades", async () => {
    const mockTrades = [
      { id: "trade_1", symbol: "AAPL", side: "buy", quantity: 10, price: 150 },
    ];
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(mockAccount),
      getTrades: jest.fn().mockResolvedValue(mockTrades),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const req = createRequest(
      "/api/trading/paper/performance?action=trades&limit=50",
    );
    const res = await performanceGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(mockEngine.getTrades).toHaveBeenCalledWith(
      "paper_acc_1",
      undefined,
      undefined,
      50,
    );
  });

  it("returns 400 for unknown action", async () => {
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(mockAccount),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const req = createRequest("/api/trading/paper/performance?action=invalid");
    const res = await performanceGET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Unknown action");
  });
});

// ============================================================================
// PAPER RESET (paper/reset/route.ts)
// ============================================================================

describe("Paper Trading - Reset", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(true);
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(false);

    const res = await resetPOST(createRequest("/api/trading/paper/reset", "POST"));

    expect(res.status).toBe(401);
  });

  it("returns 404 when no paper account exists", async () => {
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(null),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const res = await resetPOST(createRequest("/api/trading/paper/reset", "POST"));

    expect(res.status).toBe(404);
  });

  it("resets account successfully", async () => {
    const resetAccount = {
      ...mockAccount,
      cashBalance: 100000,
      buyingPower: 100000,
      portfolioValue: 0,
      dayTradeCount: 0,
    };
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(mockAccount),
      resetAccount: jest.fn().mockResolvedValue(resetAccount),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const res = await resetPOST(createRequest("/api/trading/paper/reset", "POST"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.cashBalance).toBe(100000);
    expect(mockEngine.resetAccount).toHaveBeenCalledWith("paper_acc_1");
  });

  it("handles reset errors", async () => {
    const mockEngine = {
      getAccount: jest.fn().mockResolvedValue(mockAccount),
      resetAccount: jest.fn().mockRejectedValue(new Error("Reset failed")),
    };
    (getPaperTradingEngine as jest.Mock).mockReturnValue(mockEngine);

    const res = await resetPOST(createRequest("/api/trading/paper/reset", "POST"));

    expect(res.status).toBe(500);
  });
});

// ============================================================================
// negative-auth (TASK-AUTH-03e) — tagged so `npm run test:auth-negative`
// counts every paper-trading handler's 401 path.
// ============================================================================

describe("negative-auth – /api/trading/paper (all routes)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(false);
  });

  it("GET /api/trading/paper returns 401 when unauthenticated", async () => {
    const res = await accountGET(createRequest("/api/trading/paper"));
    expect(res.status).toBe(401);
  });

  it("POST /api/trading/paper returns 401 when unauthenticated", async () => {
    const res = await accountPOST(
      createRequest("/api/trading/paper", "POST", {}),
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/trading/paper/orders returns 401 when unauthenticated", async () => {
    const res = await ordersGET(createRequest("/api/trading/paper/orders"));
    expect(res.status).toBe(401);
  });

  it("POST /api/trading/paper/orders returns 401 when unauthenticated", async () => {
    const res = await ordersPOST(
      createRequest("/api/trading/paper/orders", "POST", {}),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE /api/trading/paper/orders returns 401 when unauthenticated", async () => {
    const res = await ordersDELETE(
      createRequest("/api/trading/paper/orders?id=ord-1", "DELETE"),
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/trading/paper/positions returns 401 when unauthenticated", async () => {
    const res = await positionsGET(
      createRequest("/api/trading/paper/positions"),
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/trading/paper/performance returns 401 when unauthenticated", async () => {
    const res = await performanceGET(
      createRequest("/api/trading/paper/performance"),
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/trading/paper/reset returns 401 when unauthenticated", async () => {
    const res = await resetPOST(
      createRequest("/api/trading/paper/reset", "POST"),
    );
    expect(res.status).toBe(401);
  });
});
