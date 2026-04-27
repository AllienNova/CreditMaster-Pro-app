/**
 * Fynvita Investment Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import {
  useInvestmentStore,
  selectHoldings,
  selectWatchlist,
  selectIsLoading,
  selectRecommendationForSymbol,
} from "../investmentStore";

jest.mock("../../services/api/investments", () => ({
  __esModule: true,
  default: {
    getPortfolio: jest.fn(),
    analyzePortfolio: jest.fn(),
    getRecommendation: jest.fn(),
    scanPatterns: jest.fn(),
  },
}));

jest.mock("../../data/dev-seed", () => ({
  seedPortfolio: null,
}));

const investmentsApi = require("../../services/api/investments").default;

const mockPortfolio = {
  totalValue: 50000,
  dayChange: 250,
  holdings: [
    { symbol: "AAPL", shares: 10, avgCost: 150, currentPrice: 185, marketValue: 1850 },
    { symbol: "GOOG", shares: 5, avgCost: 140, currentPrice: 175, marketValue: 875 },
  ],
};

describe("Investment Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useInvestmentStore.getState().reset();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useInvestmentStore.getState();
      expect(state.portfolio).toBeNull();
      expect(state.holdings).toEqual([]);
      expect(state.watchlist).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchPortfolio", () => {
    it("should fetch portfolio successfully", async () => {
      investmentsApi.getPortfolio.mockResolvedValue({ data: mockPortfolio });

      await act(async () => {
        await useInvestmentStore.getState().fetchPortfolio();
      });

      const state = useInvestmentStore.getState();
      expect(state.portfolio).toEqual(mockPortfolio);
      expect(state.holdings).toHaveLength(2);
      expect(state.isLoading).toBe(false);
      expect(state.lastUpdated).not.toBeNull();
    });

    it("should handle error", async () => {
      investmentsApi.getPortfolio.mockRejectedValue(new Error("API down"));

      await act(async () => {
        await useInvestmentStore.getState().fetchPortfolio();
      });

      expect(useInvestmentStore.getState().error).toBe("API down");
      expect(useInvestmentStore.getState().isLoading).toBe(false);
    });
  });

  describe("analyzePortfolio", () => {
    it("should store analysis result", async () => {
      const mockAnalysis = { riskScore: 65, diversification: "good" };
      investmentsApi.analyzePortfolio.mockResolvedValue({ data: mockAnalysis });

      await act(async () => {
        await useInvestmentStore.getState().analyzePortfolio([], {});
      });

      expect(useInvestmentStore.getState().portfolioAnalysis).toEqual(mockAnalysis);
    });
  });

  describe("getRecommendation", () => {
    it("should store recommendation for symbol", async () => {
      const mockRec = { symbol: "AAPL", action: "hold", confidence: 0.85 };
      investmentsApi.getRecommendation.mockResolvedValue({ data: mockRec });

      await act(async () => {
        await useInvestmentStore.getState().getRecommendation("AAPL");
      });

      expect(useInvestmentStore.getState().currentRecommendation).toEqual(mockRec);
      expect(selectRecommendationForSymbol("AAPL")(useInvestmentStore.getState())).toEqual(mockRec);
    });
  });

  describe("scanPatterns", () => {
    it("should store pattern scan result", async () => {
      const mockScan = { patterns: ["head_shoulders"], confidence: 0.7 };
      investmentsApi.scanPatterns.mockResolvedValue({ data: mockScan });

      await act(async () => {
        await useInvestmentStore.getState().scanPatterns("TSLA", "1d");
      });

      expect(useInvestmentStore.getState().currentPatternScan).toEqual(mockScan);
    });
  });

  describe("Watchlist", () => {
    it("should add item to watchlist", () => {
      act(() => {
        useInvestmentStore.getState().addToWatchlist({
          symbol: "MSFT",
          name: "Microsoft",
          price: 420,
          change: 5,
          changePercent: 1.2,
        });
      });

      expect(useInvestmentStore.getState().watchlist).toHaveLength(1);
      expect(useInvestmentStore.getState().watchlist[0].symbol).toBe("MSFT");
    });

    it("should not add duplicate symbol", () => {
      const item = { symbol: "MSFT", name: "Microsoft", price: 420, change: 5, changePercent: 1.2 };
      act(() => {
        useInvestmentStore.getState().addToWatchlist(item);
        useInvestmentStore.getState().addToWatchlist(item);
      });

      expect(useInvestmentStore.getState().watchlist).toHaveLength(1);
    });

    it("should remove item from watchlist", () => {
      act(() => {
        useInvestmentStore.getState().addToWatchlist({
          symbol: "MSFT",
          name: "Microsoft",
          price: 420,
          change: 5,
          changePercent: 1.2,
        });
      });

      act(() => {
        useInvestmentStore.getState().removeFromWatchlist("MSFT");
      });

      expect(useInvestmentStore.getState().watchlist).toHaveLength(0);
    });
  });

  describe("UI Actions", () => {
    it("setSelectedSymbol updates symbol", () => {
      useInvestmentStore.getState().setSelectedSymbol("AAPL");
      expect(useInvestmentStore.getState().selectedSymbol).toBe("AAPL");
    });

    it("clearError clears error", () => {
      useInvestmentStore.setState({ error: "some error" });
      useInvestmentStore.getState().clearError();
      expect(useInvestmentStore.getState().error).toBeNull();
    });
  });

  describe("Selectors", () => {
    it("selectHoldings returns holdings", () => {
      useInvestmentStore.setState({ holdings: mockPortfolio.holdings as never[] });
      expect(selectHoldings(useInvestmentStore.getState())).toHaveLength(2);
    });

    it("selectWatchlist returns watchlist", () => {
      expect(selectWatchlist(useInvestmentStore.getState())).toEqual([]);
    });

    it("selectIsLoading returns loading state", () => {
      expect(selectIsLoading(useInvestmentStore.getState())).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset to initial state", () => {
      useInvestmentStore.setState({ error: "err", holdings: mockPortfolio.holdings as never[] });
      useInvestmentStore.getState().reset();
      expect(useInvestmentStore.getState().holdings).toEqual([]);
      expect(useInvestmentStore.getState().error).toBeNull();
    });
  });
});
