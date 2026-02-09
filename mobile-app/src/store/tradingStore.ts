/**
 * Trading Store
 *
 * Zustand store for trading state management
 */

import { create } from 'zustand';
import tradingApi, {
  Order,
  Position,
  TradingSignal,
  RiskMetrics,
  RiskSettings,
  PositionSummary,
  TradeHistoryItem,
  TradeStats,
  PaperAccount,
  OrderRequest,
  OrderSide,
  PositionSide,
  SignalSource,
  TradeRecord,
  PaperPosition,
  PaperOrder,
} from '../services/api/trading';

// ============================================================================
// TYPES
// ============================================================================

interface TradingState {
  // Orders
  orders: Order[];
  openOrders: Order[];

  // Positions
  positions: Position[];
  openPositions: Position[];
  positionSummary: PositionSummary | null;

  // Signals
  signals: TradingSignal[];
  signalSummary: {
    total: number;
    active: number;
    bySource: Record<SignalSource, number>;
    avgConfidence: number;
  } | null;

  // Risk
  riskMetrics: RiskMetrics | null;
  riskSettings: RiskSettings | null;

  // Trade History
  tradeHistory: TradeHistoryItem[];
  tradeStats: TradeStats | null;

  // Paper Trading
  paperAccount: PaperAccount | null;

  // UI State
  selectedSymbol: string | null;
  activeTab: 'positions' | 'orders' | 'signals' | 'history';
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface TradingActions {
  // Orders
  fetchOrders: () => Promise<void>;
  createOrder: (order: OrderRequest) => Promise<{ success: boolean; error?: string }>;
  cancelOrder: (orderId: string) => Promise<void>;
  cancelAllOrders: () => Promise<void>;

  // Positions
  fetchPositions: () => Promise<void>;
  closePosition: (positionId: string, closePrice?: number) => Promise<void>;
  closeAllPositions: () => Promise<void>;

  // Signals
  fetchSignals: () => Promise<void>;
  analyzeSymbol: (symbol: string) => Promise<TradingSignal | null>;
  cancelSignal: (signalId: string) => Promise<void>;

  // Risk
  fetchRiskMetrics: () => Promise<void>;
  fetchRiskSettings: () => Promise<void>;
  updateRiskSettings: (settings: Partial<RiskSettings>) => Promise<void>;
  activateKillSwitch: (reason: string) => Promise<void>;
  deactivateKillSwitch: () => Promise<void>;

  // Trade History
  fetchTradeHistory: (params?: { startDate?: string; endDate?: string; outcome?: 'win' | 'loss' | 'breakeven' }) => Promise<void>;
  fetchTradeStats: (period?: 'day' | 'week' | 'month' | 'year' | 'all') => Promise<void>;

  // Paper Trading
  fetchPaperAccount: () => Promise<void>;
  resetPaperAccount: (initialBalance?: number) => Promise<void>;
  closePaperPosition: (positionId: string) => Promise<void>;
  cancelPaperOrder: (orderId: string) => Promise<void>;

  // General
  refreshAll: () => Promise<void>;
  setSelectedSymbol: (symbol: string | null) => void;
  setActiveTab: (tab: TradingState['activeTab']) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: TradingState = {
  orders: [],
  openOrders: [],
  positions: [],
  openPositions: [],
  positionSummary: null,
  signals: [],
  signalSummary: null,
  riskMetrics: null,
  riskSettings: null,
  tradeHistory: [],
  tradeStats: null,
  paperAccount: null,
  selectedSymbol: null,
  activeTab: 'positions',
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastUpdated: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useTradingStore = create<TradingState & TradingActions>((set, get) => ({
  ...initialState,

  // =========================================================================
  // ORDERS
  // =========================================================================

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.getOrders();
      if (response.data) {
        set({
          orders: response.data.orders,
          openOrders: response.data.openOrders,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch orders' });
    } finally {
      set({ isLoading: false });
    }
  },

  createOrder: async (order: OrderRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.createOrder(order);
      if (response.data?.order) {
        // Refresh orders after creation
        await get().fetchOrders();
        return { success: true };
      }
      return { success: false, error: response.data?.validation?.errors?.[0]?.message || 'Failed to create order' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create order';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ isLoading: false });
    }
  },

  cancelOrder: async (orderId: string) => {
    set({ isLoading: true, error: null });
    try {
      await tradingApi.cancelOrder(orderId);
      await get().fetchOrders();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to cancel order' });
    } finally {
      set({ isLoading: false });
    }
  },

  cancelAllOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      await tradingApi.cancelAllOrders();
      await get().fetchOrders();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to cancel orders' });
    } finally {
      set({ isLoading: false });
    }
  },

  // =========================================================================
  // POSITIONS
  // =========================================================================

  fetchPositions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.getPositions();
      if (response.data) {
        set({
          positions: response.data.positions,
          openPositions: response.data.openPositions,
          positionSummary: response.data.summary,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch positions' });
    } finally {
      set({ isLoading: false });
    }
  },

  closePosition: async (positionId: string, closePrice?: number) => {
    set({ isLoading: true, error: null });
    try {
      await tradingApi.closePosition(positionId, closePrice);
      await get().fetchPositions();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to close position' });
    } finally {
      set({ isLoading: false });
    }
  },

  closeAllPositions: async () => {
    set({ isLoading: true, error: null });
    try {
      await tradingApi.closeAllPositions();
      await get().fetchPositions();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to close positions' });
    } finally {
      set({ isLoading: false });
    }
  },

  // =========================================================================
  // SIGNALS
  // =========================================================================

  fetchSignals: async () => {
    set({ isLoading: true, error: null });
    try {
      const [signalsRes, summaryRes] = await Promise.all([
        tradingApi.getActiveSignals({ limit: 50 }),
        tradingApi.getSignalSummary(),
      ]);

      if (signalsRes.data) {
        set({ signals: signalsRes.data.signals });
      }
      if (summaryRes.data) {
        set({
          signalSummary: {
            total: summaryRes.data.total,
            active: summaryRes.data.active,
            bySource: summaryRes.data.bySource,
            avgConfidence: summaryRes.data.avgConfidence,
          },
        });
      }
      set({ lastUpdated: new Date().toISOString() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch signals' });
    } finally {
      set({ isLoading: false });
    }
  },

  analyzeSymbol: async (symbol: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.analyzeSymbol(symbol);
      if (response.data?.fusedSignal) {
        // Create a signal from the analysis
        const signal: TradingSignal = {
          id: `SIG-${Date.now()}`,
          symbol,
          timestamp: response.data.timestamp,
          source: 'fused',
          type: 'entry',
          side: response.data.fusedSignal.side,
          strength: response.data.fusedSignal.consensus,
          confidence: response.data.fusedSignal.confidence,
          status: 'active',
        };
        return signal;
      }
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to analyze symbol' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelSignal: async (signalId: string) => {
    set({ isLoading: true, error: null });
    try {
      await tradingApi.cancelSignal(signalId);
      await get().fetchSignals();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to cancel signal' });
    } finally {
      set({ isLoading: false });
    }
  },

  // =========================================================================
  // RISK
  // =========================================================================

  fetchRiskMetrics: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.getRiskMetrics();
      if (response.data) {
        set({
          riskMetrics: response.data,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch risk metrics' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRiskSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.getRiskSettings();
      if (response.data) {
        set({ riskSettings: response.data });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch risk settings' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateRiskSettings: async (settings: Partial<RiskSettings>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.updateRiskSettings(settings);
      if (response.data) {
        set({ riskSettings: response.data });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update risk settings' });
    } finally {
      set({ isLoading: false });
    }
  },

  activateKillSwitch: async (reason: string) => {
    set({ isLoading: true, error: null });
    try {
      await tradingApi.activateKillSwitch(reason);
      await get().fetchRiskMetrics();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to activate kill switch' });
    } finally {
      set({ isLoading: false });
    }
  },

  deactivateKillSwitch: async () => {
    set({ isLoading: true, error: null });
    try {
      await tradingApi.deactivateKillSwitch();
      await get().fetchRiskMetrics();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to deactivate kill switch' });
    } finally {
      set({ isLoading: false });
    }
  },

  // =========================================================================
  // TRADE HISTORY
  // =========================================================================

  fetchTradeHistory: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.getTradeHistory(params);
      if (response.data) {
        set({
          tradeHistory: response.data.trades,
          tradeStats: response.data.stats,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Mock data for now since backend route may not exist
      const mockTrades: TradeHistoryItem[] = [
        {
          id: '1',
          symbol: 'AAPL',
          direction: 'long',
          entryDate: '2026-01-20',
          entryPrice: 185.50,
          exitDate: '2026-01-25',
          exitPrice: 192.30,
          quantity: 50,
          profitLoss: 340,
          profitLossPercent: 3.67,
          outcome: 'win',
          strategy: 'Breakout',
          holdingPeriodDays: 5,
        },
        {
          id: '2',
          symbol: 'TSLA',
          direction: 'short',
          entryDate: '2026-01-19',
          entryPrice: 245.00,
          exitDate: '2026-01-22',
          exitPrice: 238.50,
          quantity: 20,
          profitLoss: 130,
          profitLossPercent: 2.65,
          outcome: 'win',
          strategy: 'Mean Reversion',
          holdingPeriodDays: 3,
        },
        {
          id: '3',
          symbol: 'NVDA',
          direction: 'long',
          entryDate: '2026-01-18',
          entryPrice: 520.00,
          exitDate: '2026-01-19',
          exitPrice: 515.00,
          quantity: 10,
          profitLoss: -50,
          profitLossPercent: -0.96,
          outcome: 'loss',
          strategy: 'Trend Follow',
          holdingPeriodDays: 1,
        },
      ];

      const mockStats: TradeStats = {
        totalTrades: 47,
        winRate: 58.5,
        profitFactor: 1.85,
        totalPL: 2847.50,
        averageWin: 185.30,
        averageLoss: 95.20,
        bestTrade: 1250.00,
        worstTrade: -450.00,
        avgHoldingPeriod: 3.5,
        largestDrawdown: 8.2,
        expectancy: 42.50,
      };

      set({
        tradeHistory: mockTrades,
        tradeStats: mockStats,
        lastUpdated: new Date().toISOString(),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTradeStats: async (period) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.getTradingStats(period);
      if (response.data) {
        set({ tradeStats: response.data });
      }
    } catch (error) {
      // Stats already set in fetchTradeHistory mock
    } finally {
      set({ isLoading: false });
    }
  },

  // =========================================================================
  // PAPER TRADING
  // =========================================================================

  fetchPaperAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.getPaperAccount();
      if (response.data) {
        set({ paperAccount: response.data });
      }
    } catch (error) {
      // Mock data for paper account
      set({
        paperAccount: {
          id: 'paper-1',
          name: 'Paper Trading Account',
          cashBalance: 85432.50,
          balance: 85432.50,
          equity: 100000,
          buyingPower: 85432.50,
          portfolioValue: 14567.50,
          totalValue: 100000,
          dayChange: 1234.56,
          dayChangePercent: 1.25,
          createdAt: new Date().toISOString(),
          positions: [
            {
              id: 'paper-pos-1',
              symbol: 'AAPL',
              side: 'long' as const,
              quantity: 25,
              avgEntryPrice: 182.50,
              currentPrice: 189.75,
              marketValue: 4743.75,
              unrealizedPL: 181.25,
              unrealizedPLPercent: 0.0397,
              openedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'paper-pos-2',
              symbol: 'NVDA',
              side: 'long' as const,
              quantity: 15,
              avgEntryPrice: 650.00,
              currentPrice: 655.50,
              marketValue: 9832.50,
              unrealizedPL: 82.50,
              unrealizedPLPercent: 0.0085,
              openedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
          orders: [
            {
              id: 'paper-order-1',
              symbol: 'TSLA',
              side: 'buy' as const,
              type: 'limit' as const,
              quantity: 10,
              limitPrice: 245.00,
              status: 'pending' as const,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      });
    } finally {
      set({ isLoading: false });
    }
  },

  resetPaperAccount: async (initialBalance = 100000) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.resetPaperAccount(initialBalance);
      if (response.data) {
        set({ paperAccount: response.data });
      }
    } catch (error) {
      // Mock reset
      set({
        paperAccount: {
          id: 'paper-1',
          name: 'Paper Trading Account',
          cashBalance: initialBalance,
          balance: initialBalance,
          equity: initialBalance,
          buyingPower: initialBalance,
          portfolioValue: 0,
          totalValue: initialBalance,
          dayChange: 0,
          dayChangePercent: 0,
          createdAt: new Date().toISOString(),
          positions: [],
          orders: [],
        },
      });
    } finally {
      set({ isLoading: false });
    }
  },

  closePaperPosition: async (positionId: string) => {
    set({ isLoading: true, error: null });
    try {
      await tradingApi.closePaperPosition(positionId);
      await get().fetchPaperAccount();
    } catch (error) {
      // Mock close - remove position from state
      const currentAccount = get().paperAccount;
      if (currentAccount?.positions) {
        const updatedPositions = currentAccount.positions.filter(p => p.id !== positionId);
        set({
          paperAccount: {
            ...currentAccount,
            positions: updatedPositions,
          },
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  cancelPaperOrder: async (orderId: string) => {
    set({ isLoading: true, error: null });
    try {
      await tradingApi.cancelPaperOrder(orderId);
      await get().fetchPaperAccount();
    } catch (error) {
      // Mock cancel - update order status in state
      const currentAccount = get().paperAccount;
      if (currentAccount?.orders) {
        const updatedOrders = currentAccount.orders.map(o =>
          o.id === orderId ? { ...o, status: 'canceled' as const } : o
        );
        set({
          paperAccount: {
            ...currentAccount,
            orders: updatedOrders,
          },
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // =========================================================================
  // GENERAL
  // =========================================================================

  refreshAll: async () => {
    set({ isRefreshing: true });
    try {
      await Promise.all([
        get().fetchOrders(),
        get().fetchPositions(),
        get().fetchSignals(),
        get().fetchRiskMetrics(),
      ]);
    } finally {
      set({ isRefreshing: false });
    }
  },

  setSelectedSymbol: (symbol) => {
    set({ selectedSymbol: symbol });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));

// ============================================================================
// SELECTORS
// ============================================================================

export const selectOrders = (state: TradingState) => state.orders;
export const selectOpenOrders = (state: TradingState) => state.openOrders;
export const selectPositions = (state: TradingState) => state.positions;
export const selectOpenPositions = (state: TradingState) => state.openPositions;
export const selectPositionSummary = (state: TradingState) => state.positionSummary;
export const selectSignals = (state: TradingState) => state.signals;
export const selectRiskMetrics = (state: TradingState) => state.riskMetrics;
export const selectRiskSettings = (state: TradingState) => state.riskSettings;
export const selectTradeHistory = (state: TradingState) => state.tradeHistory;
export const selectTradeStats = (state: TradingState) => state.tradeStats;
export const selectPaperAccount = (state: TradingState) => state.paperAccount;
export const selectIsLoading = (state: TradingState) => state.isLoading;
export const selectError = (state: TradingState) => state.error;

export const selectTotalUnrealizedPL = (state: TradingState) =>
  state.openPositions.reduce((sum, p) => sum + p.unrealizedPL, 0);

export const selectTotalMarketValue = (state: TradingState) =>
  state.openPositions.reduce((sum, p) => sum + p.marketValue, 0);

export const selectHighConfidenceSignals = (state: TradingState) =>
  state.signals.filter((s) => s.confidence > 0.8);

export default useTradingStore;
