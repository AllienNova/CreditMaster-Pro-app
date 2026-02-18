/**
 * Fynvita Dashboard Store Unit Tests
 * Tests core dashboard: financial overview, loading states, selectors
 */

import { act } from "@testing-library/react-native";
import {
  useDashboardStore,
  selectDashboard,
  selectNetWorth,
  selectTotalAssets,
  selectTotalLiabilities,
  selectSavingsRate,
  selectMonthlyIncome,
  selectMonthlyExpenses,
  selectCashFlow,
  selectIsLoading,
} from "../dashboardStore";

// Mock financial overview API
const mockGetDashboard = jest.fn();

jest.mock("../../services/api", () => ({
  financialOverviewApi: {
    getDashboard: (...args: unknown[]) => mockGetDashboard(...args),
  },
}));

const mockDashboardData = {
  netWorth: 125000,
  totalAssets: 200000,
  totalLiabilities: 75000,
  monthlyIncome: 8500,
  monthlyExpenses: 5200,
  savingsRate: 38.8,
};

describe("Dashboard Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDashboardStore.setState({
      dashboard: null,
      isLoadingDashboard: false,
      isRefreshing: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useDashboardStore.getState();
      expect(state.dashboard).toBeNull();
      expect(state.isLoadingDashboard).toBe(false);
      expect(state.isRefreshing).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchDashboard", () => {
    it("should fetch and store dashboard data successfully", async () => {
      mockGetDashboard.mockResolvedValue({
        success: true,
        data: mockDashboardData,
      });

      await act(async () => {
        await useDashboardStore.getState().fetchDashboard();
      });

      const state = useDashboardStore.getState();
      expect(state.dashboard).not.toBeNull();
      expect(state.dashboard!.netWorth).toBe(125000);
      expect(state.dashboard!.totalAssets).toBe(200000);
      expect(state.dashboard!.totalLiabilities).toBe(75000);
      expect(state.dashboard!.monthlyIncome).toBe(8500);
      expect(state.dashboard!.monthlyExpenses).toBe(5200);
      expect(state.dashboard!.savingsRate).toBe(38.8);
      expect(state.dashboard!.lastUpdated).toBeDefined();
      expect(state.isLoadingDashboard).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set isLoadingDashboard while fetching", async () => {
      let resolvePromise: (value: unknown) => void;
      mockGetDashboard.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const fetchPromise = useDashboardStore.getState().fetchDashboard();
      expect(useDashboardStore.getState().isLoadingDashboard).toBe(true);
      expect(useDashboardStore.getState().error).toBeNull();

      await act(async () => {
        resolvePromise!({ success: true, data: mockDashboardData });
        await fetchPromise;
      });

      expect(useDashboardStore.getState().isLoadingDashboard).toBe(false);
    });

    it("should clear previous error on fetch", async () => {
      useDashboardStore.setState({ error: "Previous error" });
      mockGetDashboard.mockResolvedValue({
        success: true,
        data: mockDashboardData,
      });

      await act(async () => {
        await useDashboardStore.getState().fetchDashboard();
      });

      expect(useDashboardStore.getState().error).toBeNull();
    });

    it("should set lastUpdated timestamp on successful fetch", async () => {
      mockGetDashboard.mockResolvedValue({
        success: true,
        data: mockDashboardData,
      });

      const before = new Date().toISOString();

      await act(async () => {
        await useDashboardStore.getState().fetchDashboard();
      });

      const lastUpdated = useDashboardStore.getState().dashboard!.lastUpdated;
      expect(new Date(lastUpdated).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime(),
      );
    });

    it("should handle API error response", async () => {
      mockGetDashboard.mockResolvedValue({
        success: false,
        error: { message: "Unauthorized", code: "HTTP_401" },
      });

      await act(async () => {
        await useDashboardStore.getState().fetchDashboard();
      });

      const state = useDashboardStore.getState();
      expect(state.error).toBe("Unauthorized");
      expect(state.dashboard).toBeNull();
      expect(state.isLoadingDashboard).toBe(false);
    });

    it("should handle API error response without message", async () => {
      mockGetDashboard.mockResolvedValue({
        success: false,
      });

      await act(async () => {
        await useDashboardStore.getState().fetchDashboard();
      });

      expect(useDashboardStore.getState().error).toBe(
        "Failed to fetch dashboard",
      );
    });

    it("should handle thrown Error exception", async () => {
      mockGetDashboard.mockRejectedValue(new Error("Network timeout"));

      await act(async () => {
        await useDashboardStore.getState().fetchDashboard();
      });

      const state = useDashboardStore.getState();
      expect(state.error).toBe("Network timeout");
      expect(state.isLoadingDashboard).toBe(false);
    });

    it("should handle non-Error thrown exception", async () => {
      mockGetDashboard.mockRejectedValue("string error");

      await act(async () => {
        await useDashboardStore.getState().fetchDashboard();
      });

      expect(useDashboardStore.getState().error).toBe(
        "Failed to fetch dashboard",
      );
    });

    it("should not overwrite existing dashboard on error", async () => {
      useDashboardStore.setState({
        dashboard: { ...mockDashboardData, lastUpdated: "2024-01-01" },
      });

      mockGetDashboard.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useDashboardStore.getState().fetchDashboard();
      });

      // Dashboard still has the old data
      expect(useDashboardStore.getState().dashboard!.netWorth).toBe(125000);
    });
  });

  describe("refreshDashboard", () => {
    it("should set isRefreshing and call fetchDashboard", async () => {
      mockGetDashboard.mockResolvedValue({
        success: true,
        data: mockDashboardData,
      });

      await act(async () => {
        await useDashboardStore.getState().refreshDashboard();
      });

      const state = useDashboardStore.getState();
      expect(state.isRefreshing).toBe(false);
      expect(state.dashboard).not.toBeNull();
      expect(mockGetDashboard).toHaveBeenCalledTimes(1);
    });

    it("should set isRefreshing to true during refresh", async () => {
      let resolvePromise: (value: unknown) => void;
      mockGetDashboard.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const refreshPromise = useDashboardStore.getState().refreshDashboard();
      expect(useDashboardStore.getState().isRefreshing).toBe(true);

      await act(async () => {
        resolvePromise!({ success: true, data: mockDashboardData });
        await refreshPromise;
      });

      expect(useDashboardStore.getState().isRefreshing).toBe(false);
    });

    it("should reset isRefreshing even on error", async () => {
      mockGetDashboard.mockRejectedValue(new Error("Failure"));

      await act(async () => {
        await useDashboardStore.getState().refreshDashboard();
      });

      expect(useDashboardStore.getState().isRefreshing).toBe(false);
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useDashboardStore.setState({ error: "Some error" });

      act(() => {
        useDashboardStore.getState().clearError();
      });

      expect(useDashboardStore.getState().error).toBeNull();
    });

    it("should be idempotent when error is already null", () => {
      act(() => {
        useDashboardStore.getState().clearError();
      });

      expect(useDashboardStore.getState().error).toBeNull();
    });
  });

  describe("resetStore", () => {
    it("should reset all state to initial values", () => {
      useDashboardStore.setState({
        dashboard: { ...mockDashboardData, lastUpdated: "2024-01-01" },
        isLoadingDashboard: true,
        isRefreshing: true,
        error: "something broke",
      });

      act(() => {
        useDashboardStore.getState().resetStore();
      });

      const state = useDashboardStore.getState();
      expect(state.dashboard).toBeNull();
      expect(state.isLoadingDashboard).toBe(false);
      expect(state.isRefreshing).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("Selectors", () => {
    describe("with dashboard data", () => {
      beforeEach(() => {
        useDashboardStore.setState({
          dashboard: { ...mockDashboardData, lastUpdated: "2024-01-01" },
        });
      });

      it("selectDashboard returns full dashboard", () => {
        const dashboard = selectDashboard(useDashboardStore.getState());
        expect(dashboard).not.toBeNull();
        expect(dashboard!.netWorth).toBe(125000);
      });

      it("selectNetWorth returns net worth", () => {
        expect(selectNetWorth(useDashboardStore.getState())).toBe(125000);
      });

      it("selectTotalAssets returns total assets", () => {
        expect(selectTotalAssets(useDashboardStore.getState())).toBe(200000);
      });

      it("selectTotalLiabilities returns total liabilities", () => {
        expect(selectTotalLiabilities(useDashboardStore.getState())).toBe(
          75000,
        );
      });

      it("selectSavingsRate returns savings rate", () => {
        expect(selectSavingsRate(useDashboardStore.getState())).toBe(38.8);
      });

      it("selectMonthlyIncome returns monthly income", () => {
        expect(selectMonthlyIncome(useDashboardStore.getState())).toBe(8500);
      });

      it("selectMonthlyExpenses returns monthly expenses", () => {
        expect(selectMonthlyExpenses(useDashboardStore.getState())).toBe(5200);
      });

      it("selectCashFlow returns income minus expenses", () => {
        expect(selectCashFlow(useDashboardStore.getState())).toBe(3300);
      });

      it("selectIsLoading returns false when not loading", () => {
        expect(selectIsLoading(useDashboardStore.getState())).toBe(false);
      });
    });

    describe("with null dashboard", () => {
      it("selectDashboard returns null", () => {
        expect(selectDashboard(useDashboardStore.getState())).toBeNull();
      });

      it("selectNetWorth returns 0", () => {
        expect(selectNetWorth(useDashboardStore.getState())).toBe(0);
      });

      it("selectTotalAssets returns 0", () => {
        expect(selectTotalAssets(useDashboardStore.getState())).toBe(0);
      });

      it("selectTotalLiabilities returns 0", () => {
        expect(selectTotalLiabilities(useDashboardStore.getState())).toBe(0);
      });

      it("selectSavingsRate returns 0", () => {
        expect(selectSavingsRate(useDashboardStore.getState())).toBe(0);
      });

      it("selectMonthlyIncome returns 0", () => {
        expect(selectMonthlyIncome(useDashboardStore.getState())).toBe(0);
      });

      it("selectMonthlyExpenses returns 0", () => {
        expect(selectMonthlyExpenses(useDashboardStore.getState())).toBe(0);
      });

      it("selectCashFlow returns 0", () => {
        expect(selectCashFlow(useDashboardStore.getState())).toBe(0);
      });
    });

    describe("selectIsLoading", () => {
      it("returns true when isLoadingDashboard is true", () => {
        useDashboardStore.setState({
          isLoadingDashboard: true,
          isRefreshing: false,
        });
        expect(selectIsLoading(useDashboardStore.getState())).toBe(true);
      });

      it("returns true when isRefreshing is true", () => {
        useDashboardStore.setState({
          isLoadingDashboard: false,
          isRefreshing: true,
        });
        expect(selectIsLoading(useDashboardStore.getState())).toBe(true);
      });

      it("returns true when both are true", () => {
        useDashboardStore.setState({
          isLoadingDashboard: true,
          isRefreshing: true,
        });
        expect(selectIsLoading(useDashboardStore.getState())).toBe(true);
      });

      it("returns false when both are false", () => {
        useDashboardStore.setState({
          isLoadingDashboard: false,
          isRefreshing: false,
        });
        expect(selectIsLoading(useDashboardStore.getState())).toBe(false);
      });
    });
  });
});
