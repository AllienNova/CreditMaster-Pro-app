/**
 * Marketplace Store
 *
 * Zustand store for marketplace state management
 */

import { create } from "zustand";
import { toArray } from "./toArray";
import marketplaceApi, {
  MarketplaceProduct,
  MarketplaceProvider,
  MarketplaceTradeline,
} from "../services/api/marketplace";

// ============================================================================
// TYPES
// ============================================================================

interface MarketplaceState {
  products: MarketplaceProduct[];
  providers: MarketplaceProvider[];
  tradelines: MarketplaceTradeline[];
  categories: Array<{ category: string; count: number }>;

  isLoading: boolean;
  isLoadingProducts: boolean;
  isLoadingProviders: boolean;
  isLoadingTradelines: boolean;

  error: string | null;
  lastUpdated: string | null;
}

interface MarketplaceActions {
  fetchProducts: (category?: string, search?: string) => Promise<void>;
  fetchProviders: (category?: string, verified?: boolean) => Promise<void>;
  fetchTradelines: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: MarketplaceState = {
  products: [],
  providers: [],
  tradelines: [],
  categories: [],
  isLoading: false,
  isLoadingProducts: false,
  isLoadingProviders: false,
  isLoadingTradelines: false,
  error: null,
  lastUpdated: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useMarketplaceStore = create<MarketplaceState & MarketplaceActions>(
  (set) => ({
    ...initialState,

    fetchProducts: async (category?: string, search?: string) => {
      set({ isLoadingProducts: true, error: null });
      try {
        const response = await marketplaceApi.getProducts(category, search);
        if (response.success && response.data) {
          set({
            products: toArray(response.data),
            lastUpdated: new Date().toISOString(),
          });
        } else {
          set({
            products: [],
            error: response.error?.message || "Failed to fetch products",
          });
        }
      } catch (error) {
        set({
          products: [],
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch products",
        });
      } finally {
        set({ isLoadingProducts: false });
      }
    },

    fetchProviders: async (category?: string, verified?: boolean) => {
      set({ isLoadingProviders: true, error: null });
      try {
        const response = await marketplaceApi.getProviders(category, verified);
        if (response.success && response.data) {
          set({
            providers: toArray(response.data),
            lastUpdated: new Date().toISOString(),
          });
        } else {
          set({
            providers: [],
            error: response.error?.message || "Failed to fetch providers",
          });
        }
      } catch (error) {
        set({
          providers: [],
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch providers",
        });
      } finally {
        set({ isLoadingProviders: false });
      }
    },

    fetchTradelines: async () => {
      set({ isLoadingTradelines: true, error: null });
      try {
        const response = await marketplaceApi.getTradelines();
        if (response.success && response.data) {
          set({
            tradelines: toArray(response.data),
            lastUpdated: new Date().toISOString(),
          });
        } else {
          set({
            tradelines: [],
            error: response.error?.message || "Failed to fetch tradelines",
          });
        }
      } catch (error) {
        set({
          tradelines: [],
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch tradelines",
        });
      } finally {
        set({ isLoadingTradelines: false });
      }
    },

    fetchCategories: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await marketplaceApi.getCategories();
        if (response.success && response.data) {
          set({
            categories: response.data,
            lastUpdated: new Date().toISOString(),
          });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch categories",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      set(initialState);
    },
  }),
);

export default useMarketplaceStore;
