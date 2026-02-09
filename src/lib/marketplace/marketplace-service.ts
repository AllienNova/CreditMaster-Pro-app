/**
 * Marketplace Service
 *
 * Core marketplace operations: getProducts, getCategories, search, filter
 */

import { getSupabase } from '../supabase/client';
import type { Database } from '../supabase/types';

type ProductRow = Database['public']['Tables']['marketplace_products']['Row'];
type ProviderRow = Database['public']['Tables']['marketplace_providers']['Row'];

export interface MarketplaceProduct {
  id: string;
  providerId: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  priceType: 'one_time' | 'monthly' | 'yearly';
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

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  providerId?: string;
  search?: string;
}

const products = () => getSupabase().from('marketplace_products');
const providers = () => getSupabase().from('marketplace_providers');

class MarketplaceService {
  async getProducts(filters?: ProductFilters): Promise<MarketplaceProduct[]> {
    let query = products().select('*').eq('active', true);

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters?.minRating !== undefined) {
      query = query.gte('rating', filters.minRating);
    }
    if (filters?.providerId) {
      query = query.eq('provider_id', filters.providerId);
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query.order('rating', { ascending: false });

    if (error) {
      // MarketplaceService error: Error fetching products
      return [];
    }

    return (data || []).map(this.mapToProduct);
  }

  async getProductById(id: string): Promise<MarketplaceProduct | null> {
    const { data, error } = await products().select('*').eq('id', id).single();

    if (error || !data) {
      return null;
    }

    return this.mapToProduct(data);
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await products()
      .select('category')
      .eq('active', true);

    if (error || !data) {
      return [];
    }

    const categorySet = new Set<string>(
      data.map((p: { category: string }) => p.category)
    );
    const categories = Array.from(categorySet);
    return categories.sort();
  }

  async searchProducts(query: string): Promise<MarketplaceProduct[]> {
    const { data, error } = await products()
      .select('*')
      .eq('active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('rating', { ascending: false })
      .limit(20);

    if (error) {
      // MarketplaceService error: Error searching products
      return [];
    }

    return (data || []).map(this.mapToProduct);
  }

  async getFeaturedProducts(limit: number = 6): Promise<MarketplaceProduct[]> {
    const { data, error } = await products()
      .select('*')
      .eq('active', true)
      .gte('rating', 4.0)
      .order('review_count', { ascending: false })
      .limit(limit);

    if (error) {
      // MarketplaceService error: Error fetching featured products
      return [];
    }

    return (data || []).map(this.mapToProduct);
  }

  private mapToProduct(row: ProductRow): MarketplaceProduct {
    return {
      id: row.id,
      providerId: row.provider_id,
      name: row.name,
      description: row.description,
      category: row.category,
      price: row.price,
      priceType: row.price_type,
      rating: row.rating,
      reviewCount: row.review_count,
      features: row.features as Record<string, unknown>,
      active: row.active,
    };
  }
}

export const marketplaceService = new MarketplaceService();
