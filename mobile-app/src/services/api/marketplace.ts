/**
 * Fynvita Mobile Marketplace API Service
 * Handles all marketplace-related API calls using the core API client
 */

import api from "./client";
import type { ApiResponse, RequestConfig } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface MarketplaceProduct {
  id: string;
  providerId: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  priceType: "one_time" | "monthly" | "yearly";
  rating: number;
  reviewCount: number;
  features: Record<string, unknown>;
  active: boolean;
  provider?: MarketplaceProvider;
}

export interface MarketplaceProvider {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  rating: number;
  reviewCount: number;
  bbbRating: string | null;
  yearsInBusiness: number | null;
  verified: boolean;
  category: string;
}

export interface MarketplaceTradeline {
  id: string;
  bank: string;
  creditLimit: number;
  accountAge: number;
  utilization: number;
  price: number;
  status: "available" | "sold" | "reserved";
  reportingBureaus: string[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const CACHE_5_MIN = 5 * 60 * 1000;

/**
 * Get marketplace products with optional filters
 */
async function getProducts(
  category?: string,
  search?: string,
): Promise<ApiResponse<MarketplaceProduct[]>> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  const query = params.toString();
  const endpoint = `/marketplace/products${query ? `?${query}` : ""}`;

  return api.get<MarketplaceProduct[]>(endpoint, {
    enableCache: true,
    cacheTime: CACHE_5_MIN,
  });
}

/**
 * Get a single product by ID
 */
async function getProductById(
  id: string,
): Promise<ApiResponse<MarketplaceProduct>> {
  return api.get<MarketplaceProduct>(`/marketplace/products/${id}`, {
    enableCache: true,
    cacheTime: CACHE_5_MIN,
  });
}

/**
 * Get marketplace providers with optional filters
 */
async function getProviders(
  category?: string,
  verified?: boolean,
): Promise<ApiResponse<MarketplaceProvider[]>> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (verified !== undefined) params.set("verified", String(verified));
  const query = params.toString();
  const endpoint = `/marketplace/providers${query ? `?${query}` : ""}`;

  return api.get<MarketplaceProvider[]>(endpoint, {
    enableCache: true,
    cacheTime: CACHE_5_MIN,
  });
}

/**
 * Get a single provider by ID
 */
async function getProviderById(
  id: string,
): Promise<ApiResponse<MarketplaceProvider>> {
  return api.get<MarketplaceProvider>(`/marketplace/providers/${id}`, {
    enableCache: true,
    cacheTime: CACHE_5_MIN,
  });
}

/**
 * Get marketplace tradelines
 */
async function getTradelines(): Promise<
  ApiResponse<MarketplaceTradeline[]>
> {
  return api.get<MarketplaceTradeline[]>("/marketplace/tradelines", {
    enableCache: true,
    cacheTime: CACHE_5_MIN,
  });
}

/**
 * Get product categories with counts
 */
async function getCategories(): Promise<
  ApiResponse<Array<{ category: string; count: number }>>
> {
  return api.get<Array<{ category: string; count: number }>>(
    "/marketplace/products/categories",
    {
      enableCache: true,
      cacheTime: CACHE_5_MIN,
    },
  );
}

export const marketplaceApi = {
  getProducts,
  getProductById,
  getProviders,
  getProviderById,
  getTradelines,
  getCategories,
};

export default marketplaceApi;
