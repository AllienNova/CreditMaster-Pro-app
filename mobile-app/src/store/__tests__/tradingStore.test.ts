/**
 * Fynvita Trading Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import {
  useTradingStore,
  selectOpenOrders,
  selectOpenPositions,
  selectSignals,
  selectTotalUnrealizedPL,
  selectHighConfidenceSignals,
  selectIsLoading,
  type CreateOrderResult,
} from "../tradingStore";

jest.mock("../../services/api/trading", () => ({
  __esModule: true,
  default: {
    getOrders: jest.fn(),
    createOrder: jest.fn(),
    cancelOrder: jest.fn(),
    cancelAllOrders: jest.fn(),
    getPositions: jest.fn(),
    closePosition: jest.fn(),
    closeAllPositions: jest.fn(),
    getActiveSignals: jest.fn(),
    getSignalSummary: jest.fn(),
    analyzeSymbol: jest.fn(),
    cancelSignal: jest.fn(),
    getRiskMetrics: jest.fn(),
    getRiskSettings: jest.fn(),
    updateRiskSettings: jest.fn(),
    activateKillSwitch: jest.fn(),
    deactivateKillSwitch: jest.fn(),
    getTradeHistory: jest.fn(),
    getTradingStats: jest.fn(),
    getPaperAccount: jest.fn(),
    resetPaperAccount: jest.fn(),
    closePaperPosition: jest.fn(),
    cancelPaperOrder: jest.fn(),
  },
}));

const tradingApi = require("../../services/api/trading").default;

const mockOrders = {
  orders: [{ id: "o-1", symbol: "AAPL", side: "buy", status: "filled" }],
  openOrders: [{ id: "o-2", symbol: "TSLA", side: "buy", status: "pending" }],
};

const mockPositions = {
  positions: [
    { id: "p-1", symbol: "AAPL", side: "long", marketValue: 5000, unrealizedPL: 200 },
  ],
  openPositions: [
    { id: "p-1", symbol: "AAPL", side: "long", marketValue: 5000, unrealizedPL: 200 },
  ],
  summary: { totalValue: 5000, totalPL: 200 },
};

describe("Trading Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTradingStore.getState().reset();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useTradingStore.getState();
      expect(state.orders).toEqual([]);
      expect(state.positions).toEqual([]);
      expect(state.signals).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchOrders", () => {
    it("should fetch orders successfully", async () => {
      tradingApi.getOrders.mockResolvedValue({ data: mockOrders });

      await act(async () => {
        await useTradingStore.getState().fetchOrders();
      });

      expect(useTradingStore.getState().orders).toEqual(mockOrders.orders);
      expect(useTradingStore.getState().openOrders).toEqual(mockOrders.openOrders);
      expect(useTradingStore.getState().isLoading).toBe(false);
    });

    it("should handle error", async () => {
      tradingApi.getOrders.mockRejectedValue(new Error("Broker down"));

      await act(async () => {
        await useTradingStore.getState().fetchOrders();
      });

      expect(useTradingStore.getState().error).toBe("Broker down");
    });
  });

  describe("createOrder", () => {
    it("should create order and refresh", async () => {
      tradingApi.createOrder.mockResolvedValue({ data: { order: { id: "o-3" } } });
      tradingApi.getOrders.mockResolvedValue({ data: mockOrders });

      let result: CreateOrderResult | undefined;
      await act(async () => {
        result = await useTradingStore.getState().createOrder({
          symbol: "AAPL", side: "buy", type: "market", quantity: 10,
        } as never);
      });

      expect(result).toEqual({ success: true });
    });

    it("should return error on failure", async () => {
      tradingApi.createOrder.mockRejectedValue(new Error("Insufficient funds"));

      let result: CreateOrderResult | undefined;
      await act(async () => {
        result = await useTradingStore.getState().createOrder({} as never);
      });

      expect(result?.success).toBe(false);
      expect(result?.error).toBe("Insufficient funds");
    });
  });

  describe("fetchPositions", () => {
    it("should fetch positions successfully", async () => {
      tradingApi.getPositions.mockResolvedValue({ data: mockPositions });

      await act(async () => {
        await useTradingStore.getState().fetchPositions();
      });

      expect(useTradingStore.getState().positions).toHaveLength(1);
      expect(useTradingStore.getState().positionSummary).toEqual(mockPositions.summary);
    });
  });

  describe("fetchSignals", () => {
    it("should fetch signals and summary", async () => {
      const mockSignals = {
        signals: [{ id: "s-1", symbol: "AAPL", confidence: 0.9, status: "active" }],
      };
      const mockSummary = { total: 5, active: 3, bySource: {}, avgConfidence: 0.75 };

      tradingApi.getActiveSignals.mockResolvedValue({ data: mockSignals });
      tradingApi.getSignalSummary.mockResolvedValue({ data: mockSummary });

      await act(async () => {
        await useTradingStore.getState().fetchSignals();
      });

      expect(useTradingStore.getState().signals).toHaveLength(1);
      expect(useTradingStore.getState().signalSummary?.total).toBe(5);
    });
  });

  describe("fetchRiskMetrics", () => {
    it("should fetch risk metrics", async () => {
      const mockMetrics = { dailyPL: 500, maxDrawdown: -2000 };
      tradingApi.getRiskMetrics.mockResolvedValue({ data: mockMetrics });

      await act(async () => {
        await useTradingStore.getState().fetchRiskMetrics();
      });

      expect(useTradingStore.getState().riskMetrics).toEqual(mockMetrics);
    });
  });

  describe("UI Actions", () => {
    it("setSelectedSymbol updates symbol", () => {
      useTradingStore.getState().setSelectedSymbol("TSLA");
      expect(useTradingStore.getState().selectedSymbol).toBe("TSLA");
    });

    it("setActiveTab updates tab", () => {
      useTradingStore.getState().setActiveTab("orders");
      expect(useTradingStore.getState().activeTab).toBe("orders");
    });

    it("clearError clears error", () => {
      useTradingStore.setState({ error: "err" });
      useTradingStore.getState().clearError();
      expect(useTradingStore.getState().error).toBeNull();
    });
  });

  describe("Selectors", () => {
    it("selectOpenOrders returns open orders", () => {
      useTradingStore.setState({ openOrders: mockOrders.openOrders as never[] });
      expect(selectOpenOrders(useTradingStore.getState())).toHaveLength(1);
    });

    it("selectOpenPositions returns open positions", () => {
      useTradingStore.setState({ openPositions: mockPositions.openPositions as never[] });
      expect(selectOpenPositions(useTradingStore.getState())).toHaveLength(1);
    });

    it("selectTotalUnrealizedPL sums PL", () => {
      useTradingStore.setState({ openPositions: mockPositions.openPositions as never[] });
      expect(selectTotalUnrealizedPL(useTradingStore.getState())).toBe(200);
    });

    it("selectHighConfidenceSignals filters > 0.8", () => {
      useTradingStore.setState({
        signals: [
          { id: "s-1", confidence: 0.9 },
          { id: "s-2", confidence: 0.5 },
        ] as never[],
      });
      expect(selectHighConfidenceSignals(useTradingStore.getState())).toHaveLength(1);
    });

    it("selectIsLoading returns loading state", () => {
      expect(selectIsLoading(useTradingStore.getState())).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset to initial state", () => {
      useTradingStore.setState({ orders: mockOrders.orders as never[], error: "err" });
      useTradingStore.getState().reset();
      expect(useTradingStore.getState().orders).toEqual([]);
      expect(useTradingStore.getState().error).toBeNull();
    });
  });
});
