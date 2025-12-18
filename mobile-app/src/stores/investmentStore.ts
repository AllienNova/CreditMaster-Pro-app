/**
 * Investment Store
 * 
 * Zustand store for investment intelligence state management
 */

import { create } from 'zustand';
import investmentsApi, {
  PortfolioResponse,
  Holding,
  RecommendationResponse,
  PatternScanResponse,
  PortfolioAnalysisResponse,
  PortfolioHoldingInput,
} from '../services/api/investments';

// ============================================================================
// TYPES
// ============================================================================

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  addedAt: string;
}

interface InvestmentState {
  // Portfolio Data
  portfolio: PortfolioResponse | null;
  portfolioAnalysis: PortfolioAnalysisResponse | null;
  holdings: Holding[];

  // Recommendations
  recommendations: Record<string, RecommendationResponse>;
  currentRecommendation: RecommendationResponse | null;

  // Pattern Analysis
  patternScans: Record<string, PatternScanResponse>;
  currentPatternScan: PatternScanResponse | null;

  // Watchlist
  watchlist: WatchlistItem[];

  // UI State
  selectedSymbol: string | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface InvestmentActions {
  // Portfolio Actions
  fetchPortfolio: (period?: string) => Promise<void>;
  analyzePortfolio: (holdings: PortfolioHoldingInput[], options?: any) => Promise<void>;
  
  // Recommendation Actions
  getRecommendation: (symbol: string, includePrice?: boolean) => Promise<void>;
  
  // Pattern Actions
  scanPatterns: (symbol: string, timeframe?: string) => Promise<void>;
  
  // Watchlist Actions
  addToWatchlist: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeFromWatchlist: (symbol: string) => void;
  
  // UI Actions
  setSelectedSymbol: (symbol: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: InvestmentState = {
  portfolio: null,
  portfolioAnalysis: null,
  holdings: [],
  recommendations: {},
  currentRecommendation: null,
  patternScans: {},
  currentPatternScan: null,
  watchlist: [],
  selectedSymbol: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useInvestmentStore = create<InvestmentState & InvestmentActions>((set, get) => ({
  ...initialState,

  // Portfolio Actions
  fetchPortfolio: async (period?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await investmentsApi.getPortfolio(period);
      if (response.data) {
        set({
          portfolio: response.data,
          holdings: response.data.holdings,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch portfolio' });
    } finally {
      set({ isLoading: false });
    }
  },

  analyzePortfolio: async (holdings, options) => {
    set({ isLoading: true, error: null });
    try {
      const response = await investmentsApi.analyzePortfolio(holdings, options);
      if (response.data) {
        set({ portfolioAnalysis: response.data });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to analyze portfolio' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Recommendation Actions
  getRecommendation: async (symbol, includePrice = true) => {
    set({ isLoading: true, error: null });
    try {
      const response = await investmentsApi.getRecommendation(symbol, includePrice);
      if (response.data) {
        set((state) => ({
          recommendations: { ...state.recommendations, [symbol]: response.data! },
          currentRecommendation: response.data,
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to get recommendation' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Pattern Actions
  scanPatterns: async (symbol, timeframe = '1d') => {
    set({ isLoading: true, error: null });
    try {
      const response = await investmentsApi.scanPatterns(symbol, timeframe);
      if (response.data) {
        set((state) => ({
          patternScans: { ...state.patternScans, [`${symbol}_${timeframe}`]: response.data! },
          currentPatternScan: response.data,
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to scan patterns' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Watchlist Actions
  addToWatchlist: (item) => {
    set((state) => {
      // Check if already in watchlist
      if (state.watchlist.some((w) => w.symbol === item.symbol)) {
        return state;
      }
      return {
        watchlist: [
          ...state.watchlist,
          { ...item, addedAt: new Date().toISOString() },
        ],
      };
    });
  },

  removeFromWatchlist: (symbol) => {
    set((state) => ({
      watchlist: state.watchlist.filter((w) => w.symbol !== symbol),
    }));
  },

  // UI Actions
  setSelectedSymbol: (symbol) => {
    set({ selectedSymbol: symbol });
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

export const selectPortfolio = (state: InvestmentState) => state.portfolio;
export const selectPortfolioAnalysis = (state: InvestmentState) => state.portfolioAnalysis;
export const selectHoldings = (state: InvestmentState) => state.holdings;
export const selectWatchlist = (state: InvestmentState) => state.watchlist;
export const selectCurrentRecommendation = (state: InvestmentState) => state.currentRecommendation;
export const selectCurrentPatternScan = (state: InvestmentState) => state.currentPatternScan;
export const selectIsLoading = (state: InvestmentState) => state.isLoading;
export const selectError = (state: InvestmentState) => state.error;

export const selectRecommendationForSymbol = (symbol: string) =>
  (state: InvestmentState) => state.recommendations[symbol];

export const selectPatternScanForSymbol = (symbol: string, timeframe: string = '1d') =>
  (state: InvestmentState) => state.patternScans[`${symbol}_${timeframe}`];

export default useInvestmentStore;

