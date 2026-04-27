/**
 * Fynvita Budget Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import { useBudgetStore, selectOverBudgetAlerts, selectBudgetByCategory, selectIsLoading } from "../budgetStore";

jest.mock("../../services/api", () => ({
  budgetApi: {
    getAll: jest.fn(),
    getAlerts: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
}));

const { budgetApi } = require("../../services/api");

const mockBudgets = [
  { category: "food", limit: 500, period: "monthly" as const, spent: 300 },
  { category: "transport", limit: 200, period: "monthly" as const, spent: 180 },
];

const mockAlerts = [
  { category: "food", percentUsed: 60, remaining: 200 },
  { category: "transport", percentUsed: 105, remaining: -10 },
];

describe("Budget Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBudgetStore.setState({
      budgets: [],
      alerts: [],
      isLoadingBudgets: false,
      isLoadingAlerts: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useBudgetStore.getState();
      expect(state.budgets).toEqual([]);
      expect(state.alerts).toEqual([]);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchBudgets", () => {
    it("should fetch budgets successfully", async () => {
      budgetApi.getAll.mockResolvedValue({
        success: true,
        data: { budgets: mockBudgets },
      });

      await act(async () => {
        await useBudgetStore.getState().fetchBudgets();
      });

      expect(useBudgetStore.getState().budgets).toEqual(mockBudgets);
      expect(useBudgetStore.getState().isLoadingBudgets).toBe(false);
    });

    it("should handle error", async () => {
      budgetApi.getAll.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useBudgetStore.getState().fetchBudgets();
      });

      expect(useBudgetStore.getState().error).toBe("Network error");
    });
  });

  describe("fetchAlerts", () => {
    it("should fetch and map alerts correctly", async () => {
      budgetApi.getAlerts.mockResolvedValue({
        success: true,
        data: { alerts: mockAlerts },
      });

      await act(async () => {
        await useBudgetStore.getState().fetchAlerts();
      });

      const alerts = useBudgetStore.getState().alerts;
      expect(alerts).toHaveLength(2);
      expect(alerts[0].isOverBudget).toBe(false);
      expect(alerts[1].isOverBudget).toBe(true);
    });

    it("should handle error", async () => {
      budgetApi.getAlerts.mockResolvedValue({
        success: false,
        error: { message: "Server error" },
      });

      await act(async () => {
        await useBudgetStore.getState().fetchAlerts();
      });

      expect(useBudgetStore.getState().error).toBe("Server error");
    });
  });

  describe("createBudget", () => {
    it("should create budget and append to list", async () => {
      const newBudget = { category: "entertainment", limit: 100, period: "monthly" as const };
      budgetApi.upsert.mockResolvedValue({ success: true, data: newBudget });
      budgetApi.getAlerts.mockResolvedValue({ success: true, data: { alerts: [] } });

      let result = false;
      await act(async () => {
        result = await useBudgetStore.getState().createBudget(newBudget);
      });

      expect(result).toBe(true);
      expect(useBudgetStore.getState().budgets).toHaveLength(1);
    });

    it("should return false on failure", async () => {
      budgetApi.upsert.mockRejectedValue(new Error("Create failed"));

      let result = true;
      await act(async () => {
        result = await useBudgetStore.getState().createBudget({ category: "x", limit: 1, period: "monthly" as const });
      });

      expect(result).toBe(false);
      expect(useBudgetStore.getState().error).toBe("Create failed");
    });
  });

  describe("updateBudget", () => {
    it("should update existing budget", async () => {
      useBudgetStore.setState({ budgets: mockBudgets });
      budgetApi.upsert.mockResolvedValue({ success: true });
      budgetApi.getAlerts.mockResolvedValue({ success: true, data: { alerts: [] } });

      let result = false;
      await act(async () => {
        result = await useBudgetStore.getState().updateBudget("food", { limit: 600 });
      });

      expect(result).toBe(true);
      expect(useBudgetStore.getState().budgets[0].limit).toBe(600);
    });

    it("should return false if budget not found", async () => {
      let result = true;
      await act(async () => {
        result = await useBudgetStore.getState().updateBudget("nonexistent", { limit: 100 });
      });

      expect(result).toBe(false);
      expect(useBudgetStore.getState().error).toBe("Budget not found");
    });
  });

  describe("deleteBudget", () => {
    it("should remove budget from list", async () => {
      useBudgetStore.setState({ budgets: mockBudgets });
      budgetApi.delete.mockResolvedValue({ success: true });
      budgetApi.getAlerts.mockResolvedValue({ success: true, data: { alerts: [] } });

      let result = false;
      await act(async () => {
        result = await useBudgetStore.getState().deleteBudget("food");
      });

      expect(result).toBe(true);
      expect(useBudgetStore.getState().budgets).toHaveLength(1);
      expect(useBudgetStore.getState().budgets[0].category).toBe("transport");
    });
  });

  describe("Selectors", () => {
    it("selectOverBudgetAlerts filters correctly", () => {
      useBudgetStore.setState({
        alerts: [
          { category: "food", percentUsed: 60, remaining: 200, isOverBudget: false },
          { category: "transport", percentUsed: 105, remaining: -10, isOverBudget: true },
        ],
      });
      expect(selectOverBudgetAlerts(useBudgetStore.getState())).toHaveLength(1);
    });

    it("selectBudgetByCategory returns matching budget", () => {
      useBudgetStore.setState({ budgets: mockBudgets });
      expect(selectBudgetByCategory("food")(useBudgetStore.getState())?.limit).toBe(500);
    });

    it("selectIsLoading checks all loading flags", () => {
      useBudgetStore.setState({ isCreating: true });
      expect(selectIsLoading(useBudgetStore.getState())).toBe(true);
    });
  });

  describe("resetStore", () => {
    it("should reset all state", () => {
      useBudgetStore.setState({ budgets: mockBudgets, error: "err" });
      useBudgetStore.getState().resetStore();
      expect(useBudgetStore.getState().budgets).toEqual([]);
      expect(useBudgetStore.getState().error).toBeNull();
    });
  });
});
