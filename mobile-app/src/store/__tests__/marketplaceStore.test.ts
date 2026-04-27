/**
 * Fynvita Marketplace Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import { useMarketplaceStore } from "../marketplaceStore";

jest.mock("../../services/api/marketplace", () => ({
  __esModule: true,
  default: {
    getProducts: jest.fn(),
    getProviders: jest.fn(),
    getTradelines: jest.fn(),
    getCategories: jest.fn(),
  },
}));

const marketplaceApi = require("../../services/api/marketplace").default;

const mockProducts = [
  { id: "p-1", name: "Credit Repair Kit", price: 49.99, category: "tools" },
  { id: "p-2", name: "Budget Planner", price: 19.99, category: "tools" },
];

const mockProviders = [
  { id: "pv-1", name: "CreditFix Inc", verified: true, category: "repair" },
];

describe("Marketplace Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMarketplaceStore.getState().reset();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useMarketplaceStore.getState();
      expect(state.products).toEqual([]);
      expect(state.providers).toEqual([]);
      expect(state.tradelines).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchProducts", () => {
    it("should fetch products successfully", async () => {
      marketplaceApi.getProducts.mockResolvedValue({
        success: true,
        data: mockProducts,
      });

      await act(async () => {
        await useMarketplaceStore.getState().fetchProducts();
      });

      expect(useMarketplaceStore.getState().products).toEqual(mockProducts);
      expect(useMarketplaceStore.getState().isLoadingProducts).toBe(false);
    });

    it("should handle API error", async () => {
      marketplaceApi.getProducts.mockResolvedValue({
        success: false,
        error: { message: "Service unavailable" },
      });

      await act(async () => {
        await useMarketplaceStore.getState().fetchProducts();
      });

      expect(useMarketplaceStore.getState().error).toBe("Service unavailable");
      expect(useMarketplaceStore.getState().products).toEqual([]);
    });

    it("should handle thrown exception", async () => {
      marketplaceApi.getProducts.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useMarketplaceStore.getState().fetchProducts();
      });

      expect(useMarketplaceStore.getState().error).toBe("Network error");
    });
  });

  describe("fetchProviders", () => {
    it("should fetch providers successfully", async () => {
      marketplaceApi.getProviders.mockResolvedValue({
        success: true,
        data: mockProviders,
      });

      await act(async () => {
        await useMarketplaceStore.getState().fetchProviders();
      });

      expect(useMarketplaceStore.getState().providers).toEqual(mockProviders);
    });

    it("should handle error", async () => {
      marketplaceApi.getProviders.mockRejectedValue(new Error("Failed"));

      await act(async () => {
        await useMarketplaceStore.getState().fetchProviders();
      });

      expect(useMarketplaceStore.getState().error).toBe("Failed");
    });
  });

  describe("fetchTradelines", () => {
    it("should fetch tradelines successfully", async () => {
      const mockTradelines = [{ id: "t-1", name: "AU Tradeline", price: 299 }];
      marketplaceApi.getTradelines.mockResolvedValue({
        success: true,
        data: mockTradelines,
      });

      await act(async () => {
        await useMarketplaceStore.getState().fetchTradelines();
      });

      expect(useMarketplaceStore.getState().tradelines).toEqual(mockTradelines);
    });
  });

  describe("fetchCategories", () => {
    it("should fetch categories successfully", async () => {
      const mockCategories = [
        { category: "tools", count: 5 },
        { category: "repair", count: 3 },
      ];
      marketplaceApi.getCategories.mockResolvedValue({
        success: true,
        data: mockCategories,
      });

      await act(async () => {
        await useMarketplaceStore.getState().fetchCategories();
      });

      expect(useMarketplaceStore.getState().categories).toEqual(mockCategories);
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useMarketplaceStore.setState({ error: "some error" });
      useMarketplaceStore.getState().clearError();
      expect(useMarketplaceStore.getState().error).toBeNull();
    });
  });

  describe("reset", () => {
    it("should reset to initial state", () => {
      useMarketplaceStore.setState({
        products: mockProducts as never[],
        providers: mockProviders as never[],
        error: "err",
      });
      useMarketplaceStore.getState().reset();
      expect(useMarketplaceStore.getState().products).toEqual([]);
      expect(useMarketplaceStore.getState().error).toBeNull();
    });
  });
});
