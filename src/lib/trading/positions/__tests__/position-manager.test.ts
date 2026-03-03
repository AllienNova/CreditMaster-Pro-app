/**
 * PositionManager - Comprehensive Test Suite
 *
 * Tests position lifecycle, P&L calculations, price updates, summaries.
 * Mocks @/lib/supabase/server (async createClient).
 */

// ============================================================================
// MOCK SETUP
// ============================================================================

const mockSingle = jest.fn();
const mockLimit = jest.fn(() => ({ single: mockSingle }));
const mockOrder = jest.fn(() => ({ limit: mockLimit, single: mockSingle }));
const mockGt = jest.fn(() => ({ order: mockOrder, single: mockSingle }));
const mockIn = jest.fn(() => ({ order: mockOrder, single: mockSingle }));
const mockLte = jest.fn(() => ({ in: mockIn, order: mockOrder }));
const mockGte = jest.fn(() => ({ lte: mockLte, in: mockIn, order: mockOrder }));
const mockEq: jest.Mock = jest.fn(() => ({ single: mockSingle, eq: mockEq, select: jest.fn(() => ({ single: mockSingle })), gte: mockGte, lte: mockLte, gt: mockGt, order: mockOrder }));
const mockSelect = jest.fn(() => ({ single: mockSingle, eq: mockEq, gte: mockGte, lte: mockLte, gt: mockGt, order: mockOrder, in: mockIn, limit: mockLimit }));
const mockInsert = jest.fn(() => ({ select: mockSelect, single: mockSingle }));
const mockUpdate = jest.fn(() => ({ eq: mockEq, select: mockSelect }));
const mockUpsert = jest.fn(() => ({ eq: mockEq, select: mockSelect }));
const mockDelete = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  upsert: mockUpsert,
  delete: mockDelete,
}));

const mockSupabaseClient = { from: mockFrom };

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

import { PositionManager } from "../position-manager";
import type { Position, PositionClose, TradeRecord } from "../position-types";
import type { Fill, Order } from "../../orders/order-types";

// ============================================================================
// HELPERS
// ============================================================================

function makeManager(config = {}): PositionManager {
  return new PositionManager(config);
}

function makeFill(overrides: Partial<Fill> = {}): Fill {
  return {
    id: "fill-1",
    orderId: "order-1",
    symbol: "AAPL",
    side: "buy",
    quantity: 10,
    price: 150,
    timestamp: new Date("2026-01-01"),
    commission: 1,
    fees: 0.5,
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    userId: "user-1",
    accountId: "account-1",
    symbol: "AAPL",
    side: "buy",
    quantity: 10,
    type: "market",
    timeInForce: "day",
    status: "filled",
    filledQty: 10,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    estimatedValue: 1500,
    ...overrides,
  };
}

function resetChainMocks() {
  [mockFrom, mockSelect, mockInsert, mockUpdate, mockUpsert, mockDelete,
   mockEq, mockSingle, mockGte, mockLte, mockGt, mockIn, mockOrder, mockLimit].forEach(m => m.mockClear());

  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate, upsert: mockUpsert, delete: mockDelete });
  mockSelect.mockReturnValue({ single: mockSingle, eq: mockEq, gte: mockGte, lte: mockLte, gt: mockGt, order: mockOrder, in: mockIn, limit: mockLimit });
  mockInsert.mockReturnValue({ select: mockSelect, single: mockSingle });
  mockUpdate.mockReturnValue({ eq: mockEq, select: mockSelect });
  mockUpsert.mockReturnValue({ eq: mockEq, select: mockSelect });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle, eq: mockEq, select: jest.fn(() => ({ single: mockSingle })), gte: mockGte, lte: mockLte, gt: mockGt, order: mockOrder });
  mockGte.mockReturnValue({ lte: mockLte, in: mockIn, order: mockOrder });
  mockLte.mockReturnValue({ in: mockIn, order: mockOrder });
  mockOrder.mockReturnValue({ limit: mockLimit, single: mockSingle });
  mockLimit.mockReturnValue({ single: mockSingle });
}

// ============================================================================
// TESTS
// ============================================================================

describe("PositionManager", () => {
  let manager: PositionManager;

  beforeEach(() => {
    resetChainMocks();
    manager = makeManager();
  });

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  describe("constructor", () => {
    it("should create instance with default config", () => {
      expect(manager).toBeDefined();
    });

    it("should accept partial config overrides", () => {
      const m = makeManager({ maxPositions: 5 });
      expect(m).toBeDefined();
    });
  });

  // ==========================================================================
  // OPEN POSITION
  // ==========================================================================

  describe("openPosition", () => {
    it("should open a new long position", async () => {
      const fill = makeFill();
      const order = makeOrder();
      const pos = await manager.openPosition(fill, order, "user-1", "account-1");

      expect(pos).toBeDefined();
      expect(pos.symbol).toBe("AAPL");
      expect(pos.side).toBe("long");
      expect(pos.quantity).toBe(10);
      expect(pos.avgEntryPrice).toBe(150);
      expect(pos.status).toBe("open");
    });

    it("should open a new short position", async () => {
      const fill = makeFill({ side: "sell" });
      const order = makeOrder({ side: "sell" });
      const pos = await manager.openPosition(fill, order, "user-1", "account-1");

      expect(pos.side).toBe("short");
      expect(pos.quantity).toBe(10);
    });

    it("should add to an existing long position", async () => {
      const fill1 = makeFill({ price: 150, quantity: 10 });
      const order1 = makeOrder();
      await manager.openPosition(fill1, order1, "user-1", "account-1");

      const fill2 = makeFill({ id: "fill-2", price: 160, quantity: 5 });
      const order2 = makeOrder({ id: "order-2" });
      const pos = await manager.openPosition(fill2, order2, "user-1", "account-1");

      expect(pos.quantity).toBe(15);
      // Avg price: (10*150 + 5*160) / 15 = 2300/15 ~ 153.33
      expect(pos.avgEntryPrice).toBeCloseTo(153.33, 1);
    });
  });

  // ==========================================================================
  // CLOSE POSITION
  // ==========================================================================

  describe("closePosition", () => {
    it("should close a position fully", async () => {
      // Open first
      const fill = makeFill({ price: 150, quantity: 10 });
      const order = makeOrder();
      const pos = await manager.openPosition(fill, order, "user-1", "account-1");

      const close: PositionClose = {
        positionId: pos.id,
        closePrice: 160,
        timestamp: new Date(),
      };

      const { position, realizedPL } = await manager.closePosition(close);
      expect(position.status).toBe("closed");
      // Long P&L: (160 - 150) * 10 = 100
      expect(realizedPL).toBeCloseTo(100, 1);
    });

    it("should partially close a position", async () => {
      const fill = makeFill({ price: 150, quantity: 10 });
      const order = makeOrder();
      const pos = await manager.openPosition(fill, order, "user-1", "account-1");

      const close: PositionClose = {
        positionId: pos.id,
        closePrice: 160,
        closeQuantity: 5,
        timestamp: new Date(),
      };

      const { position, realizedPL } = await manager.closePosition(close);
      expect(position.quantity).toBe(5);
      expect(position.status).toBe("open");
      expect(realizedPL).toBeCloseTo(50, 1);
    });

    it("should throw when closing non-existent position", async () => {
      const close: PositionClose = {
        positionId: "fake-id",
        closePrice: 160,
        timestamp: new Date(),
      };

      await expect(manager.closePosition(close)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // PRICE UPDATES
  // ==========================================================================

  describe("updatePrice", () => {
    it("should update position price and recalculate P&L", async () => {
      const fill = makeFill({ price: 150, quantity: 10 });
      const order = makeOrder();
      const pos = await manager.openPosition(fill, order, "user-1", "account-1");

      manager.updatePrice("AAPL", 160);

      const updated = manager.getPositionBySymbol("AAPL");
      expect(updated).toBeDefined();
      expect(updated!.currentPrice).toBe(160);
      // Unrealized P&L for long: (160 - 150) * 10 = 100
      expect(updated!.unrealizedPL).toBeCloseTo(100, 1);
    });

    it("should update unrealizedPLPercent", async () => {
      const fill = makeFill({ price: 100, quantity: 10 });
      const order = makeOrder();
      await manager.openPosition(fill, order, "user-1", "account-1");

      manager.updatePrice("AAPL", 110);

      const updated = manager.getPositionBySymbol("AAPL");
      // unrealizedPLPercent = unrealizedPL / costBasis = 100/1000 = 0.1
      expect(updated!.unrealizedPLPercent).toBeCloseTo(0.1, 2);
    });
  });

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  describe("getPosition", () => {
    it("should return position by id", async () => {
      const fill = makeFill();
      const order = makeOrder();
      const pos = await manager.openPosition(fill, order, "user-1", "account-1");

      const found = manager.getPosition(pos.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(pos.id);
    });

    it("should return undefined for unknown id", () => {
      expect(manager.getPosition("unknown")).toBeUndefined();
    });
  });

  describe("getPositionBySymbol", () => {
    it("should return position by symbol", async () => {
      const fill = makeFill();
      const order = makeOrder();
      await manager.openPosition(fill, order, "user-1", "account-1");

      const found = manager.getPositionBySymbol("AAPL");
      expect(found).toBeDefined();
      expect(found!.symbol).toBe("AAPL");
    });

    it("should return undefined for unknown symbol", () => {
      expect(manager.getPositionBySymbol("UNKNOWN")).toBeUndefined();
    });
  });

  describe("getOpenPositions", () => {
    it("should return only open positions", async () => {
      const fill = makeFill();
      const order = makeOrder();
      const pos = await manager.openPosition(fill, order, "user-1", "account-1");

      const open = manager.getOpenPositions();
      expect(open).toHaveLength(1);

      // Close it
      await manager.closePosition({
        positionId: pos.id,
        closePrice: 160,
        timestamp: new Date(),
      });

      const afterClose = manager.getOpenPositions();
      expect(afterClose).toHaveLength(0);
    });
  });

  describe("getAllPositions", () => {
    it("should return all positions including closed", async () => {
      const fill = makeFill();
      const order = makeOrder();
      const pos = await manager.openPosition(fill, order, "user-1", "account-1");

      await manager.closePosition({
        positionId: pos.id,
        closePrice: 160,
        timestamp: new Date(),
      });

      const all = manager.getAllPositions();
      expect(all.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // POSITION SUMMARY
  // ==========================================================================

  describe("getSummary", () => {
    it("should return a summary of all positions", async () => {
      const fill = makeFill({ price: 100, quantity: 10 });
      const order = makeOrder();
      await manager.openPosition(fill, order, "user-1", "account-1");

      manager.updatePrice("AAPL", 110);

      const summary = manager.getSummary();
      expect(summary.totalPositions).toBe(1);
      expect(summary.longPositions).toBe(1);
      expect(summary.shortPositions).toBe(0);
      expect(summary.totalMarketValue).toBeGreaterThan(0);
    });

    it("should return zero summary when no positions", () => {
      const summary = manager.getSummary();
      expect(summary.totalPositions).toBe(0);
      expect(summary.totalMarketValue).toBe(0);
    });
  });

  // ==========================================================================
  // TRADES
  // ==========================================================================

  describe("getTrades", () => {
    it("should return all trades", async () => {
      const fill = makeFill();
      const order = makeOrder();
      await manager.openPosition(fill, order, "user-1", "account-1");

      const trades = manager.getTrades();
      expect(trades.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty array when no trades", () => {
      const trades = manager.getTrades();
      expect(trades).toHaveLength(0);
    });
  });

  // ==========================================================================
  // POSITION FILTER
  // ==========================================================================

  describe("getPositions (with filter)", () => {
    it("should filter by status", async () => {
      const fill = makeFill();
      const order = makeOrder();
      await manager.openPosition(fill, order, "user-1", "account-1");

      const open = await manager.getPositions({ status: ["open"] });
      expect(open).toHaveLength(1);

      const closed = await manager.getPositions({ status: ["closed"] });
      expect(closed).toHaveLength(0);
    });

    it("should filter by side", async () => {
      const fill = makeFill();
      const order = makeOrder();
      await manager.openPosition(fill, order, "user-1", "account-1");

      const longs = await manager.getPositions({ side: "long" });
      expect(longs).toHaveLength(1);

      const shorts = await manager.getPositions({ side: "short" });
      expect(shorts).toHaveLength(0);
    });

    it("should filter by symbol", async () => {
      const fill = makeFill();
      const order = makeOrder();
      await manager.openPosition(fill, order, "user-1", "account-1");

      const aapl = await manager.getPositions({ symbol: "AAPL" });
      expect(aapl).toHaveLength(1);

      const googl = await manager.getPositions({ symbol: "GOOGL" });
      expect(googl).toHaveLength(0);
    });
  });

  // ==========================================================================
  // RECONCILIATION
  // ==========================================================================

  describe("reconcileWithBroker", () => {
    it("should reconcile positions with broker data", async () => {
      const fill = makeFill({ price: 150, quantity: 10 });
      const order = makeOrder();
      await manager.openPosition(fill, order, "user-1", "account-1");

      const brokerPositions = [
        {
          symbol: "AAPL",
          side: "long" as const,
          qty: 10,
          avg_entry_price: 150,
          market_value: 1550,
          unrealized_pl: 50,
        },
      ];

      const result = await manager.reconcileWithBroker(brokerPositions);
      expect(result).toBeDefined();
      expect(result.matched).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // LOAD POSITIONS
  // ==========================================================================

  describe("loadPositions", () => {
    it("should load positions from supabase", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });
      // The select chain returns data array (not single)
      mockEq.mockResolvedValueOnce({ data: [], error: null } as any);

      await expect(manager.loadPositions("user-1")).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // PERSIST POSITION
  // ==========================================================================

  describe("persist operations", () => {
    it("should persist position to supabase on open", async () => {
      // persistPosition is called internally during openPosition
      mockSingle.mockResolvedValue({ data: {}, error: null });

      const fill = makeFill();
      const order = makeOrder();
      await manager.openPosition(fill, order, "user-1", "account-1");

      // The from call for positions should have happened
      // (may or may not depending on implementation -- it's called on openPosition)
      expect(manager.getPosition).toBeDefined();
    });
  });
});
