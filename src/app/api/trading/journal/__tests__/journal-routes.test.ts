/**
 * Trading Journal API Routes Tests
 *
 * Tests for journal CRUD, close trade, and stats endpoints.
 */

// Mock Supabase before imports
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/trading/services/TradingJournalService", () => ({
  getTradingJournalService: jest.fn(),
}));

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTradingJournalService } from "@/lib/trading/services/TradingJournalService";

// Import route handlers
import { GET as journalListGET, POST as journalPOST } from "../route";
import { GET as journalGetGET, PUT as journalPUT, DELETE as journalDELETE } from "../[id]/route";
import { POST as closePOST } from "../[id]/close/route";
import { GET as statsGET } from "../stats/route";

// ============================================================================
// HELPERS
// ============================================================================

const mockUser = { id: "user_123", email: "test@test.com" };

function createMockSupabase(user: typeof mockUser | null = mockUser) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: "Unauthorized" },
      }),
    },
  };
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

const mockTrade = {
  id: "trade_1",
  userId: "user_123",
  symbol: "AAPL",
  direction: "long",
  status: "open",
  entryDate: new Date("2026-01-15"),
  entryPrice: 150,
  entryQuantity: 10,
  entryReason: "breakout",
  positionSize: 1500,
  followedPlan: true,
  tags: ["momentum"],
  createdAt: new Date("2026-01-15"),
  updatedAt: new Date("2026-01-15"),
};

const mockStats = {
  totalTrades: 25,
  winRate: 0.6,
  profitFactor: 1.8,
  totalPL: 5000,
  avgWin: 500,
  avgLoss: -250,
};

// ============================================================================
// JOURNAL LIST + CREATE (route.ts)
// ============================================================================

describe("Trading Journal - List & Create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(createMockSupabase());
  });

  // --------------------------------------------------------------------------
  // GET /api/trading/journal
  // --------------------------------------------------------------------------

  describe("GET /api/trading/journal", () => {
    it("returns 401 when not authenticated", async () => {
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase(null));

      const req = createRequest("/api/trading/journal");
      const res = await journalListGET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns trades list for authenticated user", async () => {
      const mockService = {
        getTrades: jest.fn().mockResolvedValue([mockTrade]),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal");
      const res = await journalListGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(mockService.getTrades).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_123" }),
      );
    });

    it("passes filter params correctly", async () => {
      const mockService = {
        getTrades: jest.fn().mockResolvedValue([]),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest(
        "/api/trading/journal?startDate=2026-01-01&endDate=2026-02-01&symbols=AAPL,TSLA&direction=long&status=open",
      );
      const res = await journalListGET(req);

      expect(res.status).toBe(200);
      expect(mockService.getTrades).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user_123",
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          symbols: ["AAPL", "TSLA"],
          direction: "long",
          status: "open",
        }),
      );
    });

    it("handles service errors gracefully", async () => {
      const mockService = {
        getTrades: jest.fn().mockRejectedValue(new Error("DB error")),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal");
      const res = await journalListGET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain("Failed to fetch");
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/trading/journal
  // --------------------------------------------------------------------------

  describe("POST /api/trading/journal", () => {
    it("returns 401 when not authenticated", async () => {
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase(null));

      const req = createRequest("/api/trading/journal", "POST", {
        symbol: "AAPL",
        direction: "long",
        entryPrice: 150,
        entryQuantity: 10,
      });
      const res = await journalPOST(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when required fields are missing", async () => {
      const req = createRequest("/api/trading/journal", "POST", {
        symbol: "AAPL",
      });
      const res = await journalPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("creates a new trade entry", async () => {
      const mockService = {
        createTrade: jest.fn().mockResolvedValue(mockTrade),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal", "POST", {
        symbol: "AAPL",
        direction: "long",
        entryPrice: 150,
        entryQuantity: 10,
        entryReason: "breakout",
      });
      const res = await journalPOST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.symbol).toBe("AAPL");
      expect(mockService.createTrade).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user_123",
          symbol: "AAPL",
          direction: "long",
          entryPrice: 150,
          entryQuantity: 10,
        }),
      );
    });

    it("handles creation errors", async () => {
      const mockService = {
        createTrade: jest.fn().mockRejectedValue(new Error("Duplicate")),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal", "POST", {
        symbol: "AAPL",
        direction: "long",
        entryPrice: 150,
        entryQuantity: 10,
      });
      const res = await journalPOST(req);

      expect(res.status).toBe(500);
    });
  });
});

// ============================================================================
// JOURNAL SINGLE ENTRY (journal/[id]/route.ts)
// ============================================================================

describe("Trading Journal - Single Entry", () => {
  const makeParams = (id: string) => Promise.resolve({ id });

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(createMockSupabase());
  });

  // --------------------------------------------------------------------------
  // GET /api/trading/journal/[id]
  // --------------------------------------------------------------------------

  describe("GET /api/trading/journal/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase(null));

      const req = createRequest("/api/trading/journal/trade_1");
      const res = await journalGetGET(req, { params: makeParams("trade_1") });

      expect(res.status).toBe(401);
    });

    it("returns 404 when trade not found", async () => {
      const mockService = {
        getTrade: jest.fn().mockResolvedValue(null),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal/trade_999");
      const res = await journalGetGET(req, { params: makeParams("trade_999") });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Trade not found");
    });

    it("returns 403 when trade belongs to another user", async () => {
      const mockService = {
        getTrade: jest.fn().mockResolvedValue({ ...mockTrade, userId: "other_user" }),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal/trade_1");
      const res = await journalGetGET(req, { params: makeParams("trade_1") });

      expect(res.status).toBe(403);
    });

    it("returns trade when owned by user", async () => {
      const mockService = {
        getTrade: jest.fn().mockResolvedValue(mockTrade),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal/trade_1");
      const res = await journalGetGET(req, { params: makeParams("trade_1") });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("trade_1");
    });
  });

  // --------------------------------------------------------------------------
  // PUT /api/trading/journal/[id]
  // --------------------------------------------------------------------------

  describe("PUT /api/trading/journal/[id]", () => {
    it("returns 404 when trade not found", async () => {
      const mockService = {
        getTrade: jest.fn().mockResolvedValue(null),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal/trade_999", "PUT", {
        notes: "updated",
      });
      const res = await journalPUT(req, { params: makeParams("trade_999") });

      expect(res.status).toBe(404);
    });

    it("returns 403 when trade belongs to another user", async () => {
      const mockService = {
        getTrade: jest.fn().mockResolvedValue({ ...mockTrade, userId: "other_user" }),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal/trade_1", "PUT", {
        notes: "updated",
      });
      const res = await journalPUT(req, { params: makeParams("trade_1") });

      expect(res.status).toBe(403);
    });

    it("updates trade successfully", async () => {
      const updatedTrade = { ...mockTrade, notes: "updated notes" };
      const mockService = {
        getTrade: jest.fn().mockResolvedValue(mockTrade),
        updateTrade: jest.fn().mockResolvedValue(updatedTrade),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal/trade_1", "PUT", {
        notes: "updated notes",
      });
      const res = await journalPUT(req, { params: makeParams("trade_1") });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockService.updateTrade).toHaveBeenCalledWith(
        "trade_1",
        expect.objectContaining({ notes: "updated notes" }),
      );
    });

    it("strips protected fields from updates", async () => {
      const mockService = {
        getTrade: jest.fn().mockResolvedValue(mockTrade),
        updateTrade: jest.fn().mockResolvedValue(mockTrade),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal/trade_1", "PUT", {
        id: "HACKED_ID",
        userId: "HACKED_USER",
        createdAt: "HACKED_DATE",
        notes: "legit update",
      });
      const res = await journalPUT(req, { params: makeParams("trade_1") });

      expect(res.status).toBe(200);
      const updateCall = mockService.updateTrade.mock.calls[0][1];
      expect(updateCall.id).toBeUndefined();
      expect(updateCall.userId).toBeUndefined();
      expect(updateCall.createdAt).toBeUndefined();
      expect(updateCall.notes).toBe("legit update");
    });
  });

  // --------------------------------------------------------------------------
  // DELETE /api/trading/journal/[id]
  // --------------------------------------------------------------------------

  describe("DELETE /api/trading/journal/[id]", () => {
    it("returns 404 when trade not found", async () => {
      const mockService = {
        getTrade: jest.fn().mockResolvedValue(null),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal/trade_999", "DELETE");
      const res = await journalDELETE(req, { params: makeParams("trade_999") });

      expect(res.status).toBe(404);
    });

    it("returns 403 when trade belongs to another user", async () => {
      const mockService = {
        getTrade: jest.fn().mockResolvedValue({ ...mockTrade, userId: "other_user" }),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal/trade_1", "DELETE");
      const res = await journalDELETE(req, { params: makeParams("trade_1") });

      expect(res.status).toBe(403);
    });

    it("deletes trade successfully", async () => {
      const mockService = {
        getTrade: jest.fn().mockResolvedValue(mockTrade),
        deleteTrade: jest.fn().mockResolvedValue(undefined),
      };
      (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

      const req = createRequest("/api/trading/journal/trade_1", "DELETE");
      const res = await journalDELETE(req, { params: makeParams("trade_1") });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
      expect(mockService.deleteTrade).toHaveBeenCalledWith("trade_1");
    });
  });
});

// ============================================================================
// CLOSE TRADE (journal/[id]/close/route.ts)
// ============================================================================

describe("Trading Journal - Close Trade", () => {
  const makeParams = (id: string) => Promise.resolve({ id });

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(createMockSupabase());
  });

  it("returns 401 when not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue(createMockSupabase(null));

    const req = createRequest("/api/trading/journal/trade_1/close", "POST", {
      exitPrice: 160,
      exitQuantity: 10,
      exitReason: "target hit",
    });
    const res = await closePOST(req, { params: makeParams("trade_1") });

    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const req = createRequest("/api/trading/journal/trade_1/close", "POST", {
      exitPrice: 160,
    });
    const res = await closePOST(req, { params: makeParams("trade_1") });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 404 when trade not found", async () => {
    const mockService = {
      getTrade: jest.fn().mockResolvedValue(null),
    };
    (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

    const req = createRequest("/api/trading/journal/trade_999/close", "POST", {
      exitPrice: 160,
      exitQuantity: 10,
      exitReason: "target hit",
    });
    const res = await closePOST(req, { params: makeParams("trade_999") });

    expect(res.status).toBe(404);
  });

  it("returns 403 when trade belongs to another user", async () => {
    const mockService = {
      getTrade: jest.fn().mockResolvedValue({ ...mockTrade, userId: "other_user" }),
    };
    (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

    const req = createRequest("/api/trading/journal/trade_1/close", "POST", {
      exitPrice: 160,
      exitQuantity: 10,
      exitReason: "target hit",
    });
    const res = await closePOST(req, { params: makeParams("trade_1") });

    expect(res.status).toBe(403);
  });

  it("returns 400 when trade is already closed", async () => {
    const mockService = {
      getTrade: jest.fn().mockResolvedValue({ ...mockTrade, status: "closed" }),
    };
    (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

    const req = createRequest("/api/trading/journal/trade_1/close", "POST", {
      exitPrice: 160,
      exitQuantity: 10,
      exitReason: "target hit",
    });
    const res = await closePOST(req, { params: makeParams("trade_1") });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("already closed");
  });

  it("closes trade successfully", async () => {
    const closedTrade = {
      ...mockTrade,
      status: "closed",
      exitPrice: 160,
      exitQuantity: 10,
      exitReason: "target hit",
      profitLoss: 100,
      outcome: "win",
    };
    const mockService = {
      getTrade: jest.fn().mockResolvedValue(mockTrade),
      closeTrade: jest.fn().mockResolvedValue(closedTrade),
    };
    (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

    const req = createRequest("/api/trading/journal/trade_1/close", "POST", {
      exitPrice: 160,
      exitQuantity: 10,
      exitReason: "target hit",
      emotionalStateAfter: "confident",
      lessonsLearned: "Good patience on the hold",
    });
    const res = await closePOST(req, { params: makeParams("trade_1") });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe("closed");
    expect(mockService.closeTrade).toHaveBeenCalledWith(
      "trade_1",
      160,
      10,
      "target hit",
      "confident",
      "Good patience on the hold",
    );
  });
});

// ============================================================================
// STATS (journal/stats/route.ts)
// ============================================================================

describe("Trading Journal - Stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(createMockSupabase());
  });

  it("returns 401 when not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue(createMockSupabase(null));

    const req = createRequest("/api/trading/journal/stats");
    const res = await statsGET(req);

    expect(res.status).toBe(401);
  });

  it("returns trade stats by default", async () => {
    const mockService = {
      getTradeStats: jest.fn().mockResolvedValue(mockStats),
    };
    (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

    const req = createRequest("/api/trading/journal/stats");
    const res = await statsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.totalTrades).toBe(25);
    expect(mockService.getTradeStats).toHaveBeenCalledWith(
      "user_123",
      undefined,
      undefined,
    );
  });

  it("passes date range to stats", async () => {
    const mockService = {
      getTradeStats: jest.fn().mockResolvedValue(mockStats),
    };
    (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

    const req = createRequest(
      "/api/trading/journal/stats?action=stats&startDate=2026-01-01&endDate=2026-02-01",
    );
    const res = await statsGET(req);

    expect(res.status).toBe(200);
    expect(mockService.getTradeStats).toHaveBeenCalledWith(
      "user_123",
      expect.any(Date),
      expect.any(Date),
    );
  });

  it("returns insights when action=insights", async () => {
    const mockService = {
      generateInsights: jest.fn().mockResolvedValue([
        "Win rate improving",
        "Reduce position size on losses",
      ]),
    };
    (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

    const req = createRequest("/api/trading/journal/stats?action=insights");
    const res = await statsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(mockService.generateInsights).toHaveBeenCalledWith("user_123");
  });

  it("returns daily performance when action=daily", async () => {
    const mockDaily = [
      { date: "2026-01-15", pnl: 100, trades: 3 },
      { date: "2026-01-16", pnl: -50, trades: 2 },
    ];
    const mockService = {
      getDailyPerformance: jest.fn().mockResolvedValue(mockDaily),
    };
    (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

    const req = createRequest("/api/trading/journal/stats?action=daily&days=14");
    const res = await statsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(mockService.getDailyPerformance).toHaveBeenCalledWith("user_123", 14);
  });

  it("returns symbol performance when action=symbols", async () => {
    const mockSymbolPerf = new Map([
      ["AAPL", { trades: 10, winRate: 0.7, totalPL: 2000 }],
      ["TSLA", { trades: 5, winRate: 0.4, totalPL: -500 }],
    ]);
    const mockService = {
      getSymbolPerformance: jest.fn().mockResolvedValue(mockSymbolPerf),
    };
    (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

    const req = createRequest("/api/trading/journal/stats?action=symbols");
    const res = await statsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.AAPL.trades).toBe(10);
    expect(data.data.TSLA.winRate).toBe(0.4);
  });

  it("returns 400 for unknown action", async () => {
    const req = createRequest("/api/trading/journal/stats?action=invalid");
    const res = await statsGET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Unknown action");
  });

  it("handles service errors", async () => {
    const mockService = {
      getTradeStats: jest.fn().mockRejectedValue(new Error("DB error")),
    };
    (getTradingJournalService as jest.Mock).mockReturnValue(mockService);

    const req = createRequest("/api/trading/journal/stats");
    const res = await statsGET(req);

    expect(res.status).toBe(500);
  });
});
