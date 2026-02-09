/**
 * Tradeline Service
 * 
 * Tradeline operations: getTradelines, getTradelineDetails, filterTradelines
 */

import { getSupabase } from '../supabase/client';
import type { Database } from '../supabase/types';

type TradelineRow = Database['public']['Tables']['tradelines']['Row'];

export interface Tradeline {
  id: string;
  providerId: string;
  creditLimit: number;
  ageMonths: number;
  utilization: number;
  price: number;
  estimatedScoreImpact: number;
  bureausReporting: string[];
  available: boolean;
  createdAt: Date;
}

export interface TradelineFilters {
  minCreditLimit?: number;
  maxCreditLimit?: number;
  minAge?: number;
  maxPrice?: number;
  minScoreImpact?: number;
  bureaus?: string[];
  available?: boolean;
}

const tradelines = () => getSupabase().from('tradelines');

class TradelineService {
  async getTradelines(filters?: TradelineFilters): Promise<Tradeline[]> {
    let query = tradelines().select('*');

    if (filters?.available !== undefined) {
      query = query.eq('available', filters.available);
    }
    if (filters?.minCreditLimit !== undefined) {
      query = query.gte('credit_limit', filters.minCreditLimit);
    }
    if (filters?.maxCreditLimit !== undefined) {
      query = query.lte('credit_limit', filters.maxCreditLimit);
    }
    if (filters?.minAge !== undefined) {
      query = query.gte('age_months', filters.minAge);
    }
    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters?.minScoreImpact !== undefined) {
      query = query.gte('estimated_score_impact', filters.minScoreImpact);
    }

    const { data, error } = await query.order('estimated_score_impact', { ascending: false });

    if (error) {
      // TradelineService error: Error fetching tradelines
      return [];
    }

    let results = (data || []).map(this.mapToTradeline);

    // Filter by bureaus if specified (post-query filter for array contains)
    if (filters?.bureaus && filters.bureaus.length > 0) {
      results = results.filter((t) =>
        filters.bureaus!.some((b) => t.bureausReporting.includes(b))
      );
    }

    return results;
  }

  async getTradelineById(id: string): Promise<Tradeline | null> {
    const { data, error } = await tradelines()
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToTradeline(data);
  }

  async getAvailableTradelines(): Promise<Tradeline[]> {
    return this.getTradelines({ available: true });
  }

  async getTradelinesByProvider(providerId: string): Promise<Tradeline[]> {
    const { data, error } = await tradelines()
      .select('*')
      .eq('provider_id', providerId)
      .eq('available', true)
      .order('estimated_score_impact', { ascending: false });

    if (error) {
      // TradelineService error: Error fetching tradelines by provider
      return [];
    }

    return (data || []).map(this.mapToTradeline);
  }

  async getTopTradelines(limit: number = 10): Promise<Tradeline[]> {
    const { data, error } = await tradelines()
      .select('*')
      .eq('available', true)
      .order('estimated_score_impact', { ascending: false })
      .limit(limit);

    if (error) {
      // TradelineService error: Error fetching top tradelines
      return [];
    }

    return (data || []).map(this.mapToTradeline);
  }

  calculateValueScore(tradeline: Tradeline): number {
    // Value score = (score impact * age factor) / price
    const ageFactor = Math.min(tradeline.ageMonths / 24, 2); // Cap at 2x for 2+ years
    return (tradeline.estimatedScoreImpact * ageFactor) / (tradeline.price / 100);
  }

  private mapToTradeline(row: TradelineRow): Tradeline {
    return {
      id: row.id,
      providerId: row.provider_id,
      creditLimit: row.credit_limit,
      ageMonths: row.age_months,
      utilization: row.utilization,
      price: row.price,
      estimatedScoreImpact: row.estimated_score_impact,
      bureausReporting: row.bureaus_reporting || [],
      available: row.available,
      createdAt: new Date(row.created_at),
    };
  }
}

export const tradelineService = new TradelineService();

