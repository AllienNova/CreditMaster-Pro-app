/**
 * Provider Service
 * 
 * Provider operations: getProviders, getProviderDetails, searchProviders
 */

import { getSupabase } from '../supabase/client';
import type { Database } from '../supabase/types';

type ProviderRow = Database['public']['Tables']['marketplace_providers']['Row'];

export interface Provider {
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
  category: 'tradeline' | 'credit_repair' | 'monitoring' | 'education' | 'legal' | 'coaching';
  createdAt: Date;
}

export interface ProviderFilters {
  category?: string;
  minRating?: number;
  verified?: boolean;
  search?: string;
}

const providers = () => getSupabase().from('marketplace_providers');

class ProviderService {
  async getProviders(filters?: ProviderFilters): Promise<Provider[]> {
    let query = providers().select('*');

    if (filters?.category) {
      // @ts-ignore - Supabase type issue
      query = query.eq('category', filters.category);
    }
    if (filters?.minRating !== undefined) {
      query = query.gte('rating', filters.minRating);
    }
    if (filters?.verified !== undefined) {
      query = query.eq('verified', filters.verified);
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query.order('rating', { ascending: false });

    if (error) {
      console.error('Error fetching providers:', error);
      return [];
    }

    return (data || []).map(this.mapToProvider);
  }

  async getProviderById(id: string): Promise<Provider | null> {
    const { data, error } = await providers()
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToProvider(data);
  }

  async getProvidersByCategory(category: string): Promise<Provider[]> {
    const { data, error } = await providers()
      .select('*')
      // @ts-ignore - Supabase type issue
      .eq('category', category)
      .eq('verified', true)
      .order('rating', { ascending: false });

    if (error) {
      console.error('Error fetching providers by category:', error);
      return [];
    }

    return (data || []).map(this.mapToProvider);
  }

  async searchProviders(query: string): Promise<Provider[]> {
    const { data, error } = await providers()
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('rating', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching providers:', error);
      return [];
    }

    return (data || []).map(this.mapToProvider);
  }

  async getTopProviders(limit: number = 10): Promise<Provider[]> {
    const { data, error } = await providers()
      .select('*')
      .eq('verified', true)
      .gte('rating', 4.0)
      .order('review_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top providers:', error);
      return [];
    }

    return (data || []).map(this.mapToProvider);
  }

  private mapToProvider(row: ProviderRow): Provider {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      website: row.website,
      logoUrl: row.logo_url,
      rating: row.rating,
      reviewCount: row.review_count,
      bbbRating: row.bbb_rating,
      yearsInBusiness: row.years_in_business,
      verified: row.verified,
      category: row.category,
      createdAt: new Date(row.created_at),
    };
  }
}

export const providerService = new ProviderService();

