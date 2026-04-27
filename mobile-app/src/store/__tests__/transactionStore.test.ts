/**
 * Fynvita Transaction Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import {
  useTransactionStore,
  selectTransactions,
  selectCategories,
  selectTransactionsByCategory,
  selectRecentTransactions,
  selectIsLoading,
} from "../transactionStore";

jest.mock("../../services/api", () => ({
  transactionApi: {
    getAll: jest.fn(),
    getCategories: jest.fn(),
    updateCategory: jest.fn(),
  },
}));

const { transactionApi } = require("../../services/api");

const mockTransactions = [
  { id: "t-1", description: "Grocery Store", amount: -85.50, category: "food", accountId: "acc-1" },
  { id: "t-2", description: "Gas Station", amount: -45.00, category: "transport", accountId: "acc-1" },
  { id: "t-3", description: "Restaurant", amount: -32.00, category: "food", accountId: "acc-2" },
];

describe("Transaction Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionStore.setState({
      transactions: [],
      categories: [],
      totalCount: 0,
      currentPage: 1,
      isLoadingTransactions: false,
      isLoadingCategories: false,
      isUpdating: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useTransactionStore.getState();
      expect(state.transactions).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.totalCount).toBe(0);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchTransactions", () => {
    it("should fetch transactions successfully", async () => {
      transactionApi.getAll.mockResolvedValue({
        success: true,
        data: { items: mockTransactions, total: 50 },
      });

      await act(async () => {
        await useTransactionStore.getState().fetchTransactions({ page: 1 });
      });

      const state = useTransactionStore.getState();
      expect(state.transactions).toEqual(mockTransactions);
      expect(state.totalCount).toBe(50);
      expect(state.currentPage).toBe(1);
      expect(state.isLoadingTransactions).toBe(false);
    });

    it("should handle API error response", async () => {
      transactionApi.getAll.mockResolvedValue({
        success: false,
        error: { message: "Unauthorized" },
      });

      await act(async () => {
        await useTransactionStore.getState().fetchTransactions();
      });

      expect(useTransactionStore.getState().error).toBe("Unauthorized");
    });

    it("should handle thrown exception", async () => {
      transactionApi.getAll.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useTransactionStore.getState().fetchTransactions();
      });

      expect(useTransactionStore.getState().error).toBe("Network error");
    });
  });

  describe("fetchCategories", () => {
    it("should fetch categories successfully", async () => {
      const mockCategories = ["food", "transport", "entertainment"];
      transactionApi.getCategories.mockResolvedValue({
        success: true,
        data: { categories: mockCategories },
      });

      await act(async () => {
        await useTransactionStore.getState().fetchCategories();
      });

      expect(useTransactionStore.getState().categories).toEqual(mockCategories);
    });

    it("should handle error", async () => {
      transactionApi.getCategories.mockRejectedValue(new Error("Failed"));

      await act(async () => {
        await useTransactionStore.getState().fetchCategories();
      });

      expect(useTransactionStore.getState().error).toBe("Failed");
    });
  });

  describe("updateTransactionCategory", () => {
    it("should update category in local state", async () => {
      useTransactionStore.setState({ transactions: mockTransactions as never[] });
      transactionApi.updateCategory.mockResolvedValue({ success: true });

      let result = false;
      await act(async () => {
        result = await useTransactionStore.getState().updateTransactionCategory("t-1", "dining");
      });

      expect(result).toBe(true);
      expect(useTransactionStore.getState().transactions[0].category).toBe("dining");
    });

    it("should handle failure", async () => {
      useTransactionStore.setState({ transactions: mockTransactions as never[] });
      transactionApi.updateCategory.mockRejectedValue(new Error("Update failed"));

      let result = true;
      await act(async () => {
        result = await useTransactionStore.getState().updateTransactionCategory("t-1", "dining");
      });

      expect(result).toBe(false);
      expect(useTransactionStore.getState().error).toBe("Update failed");
    });
  });

  describe("refreshTransactions", () => {
    it("should re-fetch with current page", async () => {
      useTransactionStore.setState({ currentPage: 3 });
      transactionApi.getAll.mockResolvedValue({
        success: true,
        data: { items: [], total: 0 },
      });

      await act(async () => {
        await useTransactionStore.getState().refreshTransactions();
      });

      expect(transactionApi.getAll).toHaveBeenCalledWith({ page: 3 });
    });
  });

  describe("Selectors", () => {
    beforeEach(() => {
      useTransactionStore.setState({
        transactions: mockTransactions as never[],
        categories: ["food", "transport"],
      });
    });

    it("selectTransactions returns all transactions", () => {
      expect(selectTransactions(useTransactionStore.getState())).toHaveLength(3);
    });

    it("selectCategories returns categories", () => {
      expect(selectCategories(useTransactionStore.getState())).toEqual(["food", "transport"]);
    });

    it("selectTransactionsByCategory filters by category", () => {
      const foodTxns = selectTransactionsByCategory("food")(useTransactionStore.getState());
      expect(foodTxns).toHaveLength(2);
    });

    it("selectRecentTransactions limits results", () => {
      expect(selectRecentTransactions(2)(useTransactionStore.getState())).toHaveLength(2);
    });

    it("selectIsLoading checks all flags", () => {
      expect(selectIsLoading(useTransactionStore.getState())).toBe(false);
      useTransactionStore.setState({ isUpdating: true });
      expect(selectIsLoading(useTransactionStore.getState())).toBe(true);
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useTransactionStore.setState({ error: "some error" });
      useTransactionStore.getState().clearError();
      expect(useTransactionStore.getState().error).toBeNull();
    });
  });

  describe("resetStore", () => {
    it("should reset to initial state", () => {
      useTransactionStore.setState({ transactions: mockTransactions as never[], error: "err" });
      useTransactionStore.getState().resetStore();
      expect(useTransactionStore.getState().transactions).toEqual([]);
      expect(useTransactionStore.getState().error).toBeNull();
    });
  });
});
