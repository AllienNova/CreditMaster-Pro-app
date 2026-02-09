/**
 * Portfolio Service
 * Manages investment portfolios and holdings with Supabase database integration
 */

import { getSupabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

// Type aliases for Supabase rows
type PortfolioRow = Database['public']['Tables']['portfolios']['Row'];
type PortfolioInsert = Database['public']['Tables']['portfolios']['Insert'];
type PortfolioUpdate = Database['public']['Tables']['portfolios']['Update'];
type HoldingRow = Database['public']['Tables']['portfolio_holdings']['Row'];
type HoldingInsert = Database['public']['Tables']['portfolio_holdings']['Insert'];
type HoldingUpdate = Database['public']['Tables']['portfolio_holdings']['Update'];

// Helper to get typed supabase client with any type assertion for table operations
// This is needed because Supabase's strict generic types don't play well with our Database type
const supabase = () => getSupabase() as any;

export interface PortfolioHolding {
  id?: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  sector?: string;
  assetClass?: string;
  purchaseDate?: Date;
  gainLoss?: number;
  gainLossPercent?: number;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  holdings: PortfolioHolding[];
  totalValue: number;
  totalCostBasis?: number;
  totalGainLoss?: number;
  totalGainLossPercent?: number;
  benchmark?: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePortfolioInput {
  userId: string;
  name: string;
  description?: string;
  benchmark?: string;
  isDefault?: boolean;
}

export interface AddHoldingInput {
  portfolioId: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice?: number;
  sector?: string;
  assetClass?: string;
  purchaseDate?: Date;
}

class PortfolioService {
  /**
   * Get a portfolio by ID
   */
  async getPortfolio(portfolioId: string): Promise<Portfolio | null> {
    const supabase = getSupabase();

    // Fetch portfolio
    const { data: portfolioData, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single();

    if (portfolioError) {
      if (portfolioError.code === 'PGRST116') {
        return null; // Not found
      }
      // PortfolioService error: Failed to fetch portfolio
      throw new Error(`Failed to fetch portfolio: ${portfolioError.message}`);
    }

    // Fetch holdings
    const holdings = await this.getPortfolioHoldings(portfolioId);

    return this.mapToPortfolio(portfolioData as PortfolioRow, holdings);
  }

  /**
   * Get holdings for a portfolio
   */
  async getPortfolioHoldings(portfolioId: string): Promise<PortfolioHolding[]> {
    const { data, error } = await supabase().from('portfolio_holdings')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('current_value', { ascending: false });

    if (error) {
      // PortfolioService error: Failed to fetch portfolio holdings
      throw new Error(`Failed to fetch holdings: ${error.message}`);
    }

    return (data || []).map(this.mapToHolding);
  }

  /**
   * Alias for getPortfolioHoldings
   */
  async getHoldings(portfolioId: string): Promise<PortfolioHolding[]> {
    return this.getPortfolioHoldings(portfolioId);
  }

  /**
   * Get all portfolios for a user
   */
  async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    const { data: portfolioData, error } = await supabase().from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      // PortfolioService error: Failed to fetch user portfolios
      throw new Error(`Failed to fetch portfolios: ${error.message}`);
    }

    // Fetch holdings for each portfolio
    const portfoliosWithHoldings = await Promise.all(
      (portfolioData || []).map(async (p: any) => {
        const holdings = await this.getPortfolioHoldings(p.id);
        return this.mapToPortfolio(p as PortfolioRow, holdings);
      })
    );

    return portfoliosWithHoldings;
  }

  /**
   * Get user's default portfolio
   */
  async getDefaultPortfolio(userId: string): Promise<Portfolio | null> {
    const { data, error } = await supabase().from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No default portfolio, get the first one
        const { data: firstPortfolio } = await supabase().from('portfolios')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (firstPortfolio) {
          const holdings = await this.getPortfolioHoldings(firstPortfolio.id);
          return this.mapToPortfolio(firstPortfolio as PortfolioRow, holdings);
        }
        return null;
      }
      throw new Error(`Failed to fetch default portfolio: ${error.message}`);
    }

    const holdings = await this.getPortfolioHoldings(data.id);
    return this.mapToPortfolio(data as PortfolioRow, holdings);
  }

  /**
   * Create a new portfolio
   */
  async createPortfolio(input: CreatePortfolioInput): Promise<Portfolio> {
    // If this is the default portfolio, unset any existing default
    if (input.isDefault) {
      await supabase().from('portfolios')
        .update({ is_default: false })
        .eq('user_id', input.userId);
    }

    const insertData: PortfolioInsert = {
      user_id: input.userId,
      name: input.name,
      description: input.description || null,
      benchmark: input.benchmark || null,
      is_default: input.isDefault ?? false,
      total_value: 0,
    };

    const { data, error } = await supabase().from('portfolios')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // PortfolioService error: Failed to create portfolio
      throw new Error(`Failed to create portfolio: ${error.message}`);
    }

    return this.mapToPortfolio(data as PortfolioRow, []);
  }

  /**
   * Update a portfolio
   */
  async updatePortfolio(
    portfolioId: string,
    updates: Partial<CreatePortfolioInput>
  ): Promise<Portfolio> {
    const updateData: PortfolioUpdate = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.benchmark !== undefined) updateData.benchmark = updates.benchmark;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

    const { data, error } = await supabase().from('portfolios')
      .update(updateData)
      .eq('id', portfolioId)
      .select()
      .single();

    if (error) {
      // PortfolioService error: Failed to update portfolio
      throw new Error(`Failed to update portfolio: ${error.message}`);
    }

    const holdings = await this.getPortfolioHoldings(portfolioId);
    return this.mapToPortfolio(data as PortfolioRow, holdings);
  }

  /**
   * Delete a portfolio
   */
  async deletePortfolio(portfolioId: string): Promise<boolean> {
    // Delete holdings first
    await supabase().from('portfolio_holdings')
      .delete()
      .eq('portfolio_id', portfolioId);

    // Delete portfolio
    const { error } = await supabase().from('portfolios')
      .delete()
      .eq('id', portfolioId);

    if (error) {
      // PortfolioService error: Failed to delete portfolio
      throw new Error(`Failed to delete portfolio: ${error.message}`);
    }

    return true;
  }

  /**
   * Add a holding to a portfolio
   */
  async addHolding(input: AddHoldingInput): Promise<PortfolioHolding> {
    const currentValue = (input.currentPrice || input.costBasis / input.shares) * input.shares;

    const insertData: HoldingInsert = {
      portfolio_id: input.portfolioId,
      symbol: input.symbol.toUpperCase(),
      shares: input.shares,
      cost_basis: input.costBasis,
      current_price: input.currentPrice || input.costBasis / input.shares,
      current_value: currentValue,
      sector: input.sector || null,
      asset_class: input.assetClass || null,
      purchase_date: input.purchaseDate?.toISOString() || null,
    };

    const { data, error } = await supabase().from('portfolio_holdings')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // PortfolioService error: Failed to add holding
      throw new Error(`Failed to add holding: ${error.message}`);
    }

    // Update portfolio total value
    await this.updatePortfolioTotalValue(input.portfolioId);

    return this.mapToHolding(data as HoldingRow);
  }

  /**
   * Update a holding
   */
  async updateHolding(
    holdingId: string,
    updates: Partial<Omit<AddHoldingInput, 'portfolioId'>>
  ): Promise<PortfolioHolding> {
    const updateData: HoldingUpdate = {};
    if (updates.symbol !== undefined) updateData.symbol = updates.symbol.toUpperCase();
    if (updates.shares !== undefined) updateData.shares = updates.shares;
    if (updates.costBasis !== undefined) updateData.cost_basis = updates.costBasis;
    if (updates.currentPrice !== undefined) updateData.current_price = updates.currentPrice;
    if (updates.sector !== undefined) updateData.sector = updates.sector;
    if (updates.assetClass !== undefined) updateData.asset_class = updates.assetClass;
    if (updates.purchaseDate !== undefined) updateData.purchase_date = updates.purchaseDate.toISOString();

    // Recalculate current value if shares or price changed
    if (updates.shares !== undefined || updates.currentPrice !== undefined) {
      const { data: existing } = await supabase().from('portfolio_holdings')
        .select('shares, current_price')
        .eq('id', holdingId)
        .single();

      if (existing) {
        const shares = updates.shares ?? existing.shares;
        const price = updates.currentPrice ?? existing.current_price;
        updateData.current_value = shares * price;
      }
    }

    const { data, error } = await supabase().from('portfolio_holdings')
      .update(updateData)
      .eq('id', holdingId)
      .select()
      .single();

    if (error) {
      // PortfolioService error: Failed to update holding
      throw new Error(`Failed to update holding: ${error.message}`);
    }

    // Update portfolio total value
    const holding = data as HoldingRow;
    await this.updatePortfolioTotalValue(holding.portfolio_id);

    return this.mapToHolding(holding);
  }

  /**
   * Delete a holding
   */
  async deleteHolding(holdingId: string): Promise<boolean> {
    // Get portfolio ID before deleting
    const { data: holding } = await supabase().from('portfolio_holdings')
      .select('portfolio_id')
      .eq('id', holdingId)
      .single();

    const { error } = await supabase().from('portfolio_holdings')
      .delete()
      .eq('id', holdingId);

    if (error) {
      // PortfolioService error: Failed to delete holding
      throw new Error(`Failed to delete holding: ${error.message}`);
    }

    // Update portfolio total value
    if (holding) {
      await this.updatePortfolioTotalValue(holding.portfolio_id);
    }

    return true;
  }

  /**
   * Update prices for all holdings in a portfolio
   */
  async updateHoldingPrices(
    portfolioId: string,
    prices: Record<string, number>
  ): Promise<void> {
    const holdings = await this.getPortfolioHoldings(portfolioId);

    for (const holding of holdings) {
      if (holding.id && prices[holding.symbol]) {
        const newPrice = prices[holding.symbol];
        const newValue = holding.shares * newPrice;

        await supabase().from('portfolio_holdings')
          .update({
            current_price: newPrice,
            current_value: newValue,
          })
          .eq('id', holding.id);
      }
    }

    await this.updatePortfolioTotalValue(portfolioId);
  }

  /**
   * Update portfolio total value based on holdings
   */
  private async updatePortfolioTotalValue(portfolioId: string): Promise<void> {
    const { data: holdings } = await supabase().from('portfolio_holdings')
      .select('current_value')
      .eq('portfolio_id', portfolioId);

    const totalValue = (holdings || []).reduce(
      (sum: number, h: any) => sum + (h.current_value || 0),
      0
    );

    await supabase().from('portfolios')
      .update({ total_value: totalValue })
      .eq('id', portfolioId);
  }

  /**
   * Map database row to Portfolio interface
   */
  private mapToPortfolio(row: PortfolioRow, holdings: PortfolioHolding[]): Portfolio {
    const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0
      ? (totalGainLoss / totalCostBasis) * 100
      : 0;

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description || undefined,
      holdings,
      totalValue: row.total_value || totalValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent,
      benchmark: row.benchmark || undefined,
      isDefault: row.is_default,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to PortfolioHolding interface
   */
  private mapToHolding(row: HoldingRow): PortfolioHolding {
    const gainLoss = row.current_value - row.cost_basis;
    const gainLossPercent = row.cost_basis > 0
      ? (gainLoss / row.cost_basis) * 100
      : 0;

    return {
      id: row.id,
      symbol: row.symbol,
      shares: row.shares,
      costBasis: row.cost_basis,
      currentPrice: row.current_price,
      currentValue: row.current_value,
      sector: row.sector || undefined,
      assetClass: row.asset_class || undefined,
      purchaseDate: row.purchase_date ? new Date(row.purchase_date) : undefined,
      gainLoss,
      gainLossPercent,
    };
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService();
export default portfolioService;
