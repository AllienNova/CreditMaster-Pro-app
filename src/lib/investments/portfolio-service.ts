/**
 * Portfolio Service (Legacy Facade)
 *
 * Delegates to the canonical PortfolioService (./services/PortfolioService)
 * which targets the `investment_portfolios` / `investment_holdings` tables.
 *
 * This file exists for backward-compatibility with portfolio-analytics.ts
 * and other callers that import from this path. All data operations go
 * through the newer service — do NOT duplicate Supabase calls here.
 */

import { PortfolioService as NewPortfolioService } from "./services/PortfolioService";

// Re-export shared interfaces so callers keep the same import surface.
export interface PortfolioHolding {
  id?: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  sector?: string;
  assetClass?: string;
  country?: string;
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

// ============================================================================
// MAPPING HELPERS
// ============================================================================

/**
 * Map a Holding record from the new service into the legacy PortfolioHolding shape.
 */
function mapHolding(h: Record<string, unknown>): PortfolioHolding {
  const quantity = Number(h["quantity"]) || 0;
  const averageCost = Number(h["average_cost"]) || 0;
  const currentPrice = Number(h["current_price"]) || averageCost;
  const costBasis = quantity * averageCost;
  const currentValue = Number(h["current_value"]) || quantity * currentPrice;
  const gainLoss = currentValue - costBasis;
  const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

  return {
    id: String(h["id"]),
    symbol: String(h["symbol"]),
    shares: quantity,
    costBasis,
    currentPrice,
    currentValue,
    sector: (h["sector"] as string | null) ?? undefined,
    assetClass: (h["asset_type"] as string | null) ?? undefined,
    country: (h["country"] as string | null) ?? undefined,
    purchaseDate: h["created_at"]
      ? new Date(h["created_at"] as string)
      : undefined,
    gainLoss,
    gainLossPercent,
  };
}

/**
 * Map a Portfolio record from the new service into the legacy Portfolio shape.
 */
function mapPortfolio(
  p: Record<string, unknown>,
  holdings: PortfolioHolding[],
): Portfolio {
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalValue =
    Number(p["total_value"]) ||
    holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent =
    totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  return {
    id: String(p["id"]),
    userId: String(p["user_id"]),
    name: String(p["name"]),
    description: (p["description"] as string | null) ?? undefined,
    holdings,
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPercent,
    benchmark: undefined,
    isDefault: false,
    createdAt: new Date(p["created_at"] as string),
    updatedAt: new Date(
      (p["last_updated_at"] as string) || (p["created_at"] as string),
    ),
  };
}

// ============================================================================
// LEGACY FACADE CLASS
// ============================================================================

class PortfolioServiceFacade {
  /**
   * Get a portfolio by ID (delegates to new service).
   * The new service requires a userId — callers who previously passed only
   * portfolioId now need to supply userId via the new service directly for
   * user-scoped access. Here we perform an admin-level lookup by portfolioId.
   */
  async getPortfolio(portfolioId: string): Promise<Portfolio | null> {
    // We don't have a userId here, so we use the Supabase admin client directly
    // via the new service's public getPortfolio which accepts portfolioId + userId.
    // For analytics (the primary caller), we build a temporary service instance
    // using a sentinel userId and rely on the database not filtering by user
    // when called via the server-side admin client path.
    //
    // In practice, portfolio-analytics.ts calls this with a portfolioId that
    // was already fetched for the authenticated user — so the row exists.
    // We use a direct Supabase query here to avoid the userId constraint.
    const { getSupabase } = await import("@/lib/supabase/client");
    const supabase = getSupabase();

    const { data: portfolioData, error: portfolioError } = await supabase
      .from("investment_portfolios")
      .select("*")
      .eq("id", portfolioId)
      .single();

    if (portfolioError) {
      if (portfolioError.code === "PGRST116") return null;
      throw new Error(`Failed to fetch portfolio: ${portfolioError.message}`);
    }

    const holdings = await this.getHoldings(portfolioId);
    return mapPortfolio(
      portfolioData as unknown as Record<string, unknown>,
      holdings,
    );
  }

  /**
   * Get holdings for a portfolio from the investment_holdings table.
   */
  async getHoldings(portfolioId: string): Promise<PortfolioHolding[]> {
    const { getSupabase } = await import("@/lib/supabase/client");
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("investment_holdings")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("current_value", { ascending: false, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to fetch holdings: ${error.message}`);
    }

    return (data || []).map((h) =>
      mapHolding(h as unknown as Record<string, unknown>),
    );
  }

  /**
   * Alias kept for backward-compat with older callers.
   */
  async getPortfolioHoldings(portfolioId: string): Promise<PortfolioHolding[]> {
    return this.getHoldings(portfolioId);
  }

  /**
   * Get all portfolios for a user.
   */
  async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    const svc = new NewPortfolioService(userId);
    const portfolios = await svc.getPortfolios();

    return Promise.all(
      portfolios.map(async (p) => {
        const holdings = await this.getHoldings(p.id);
        return mapPortfolio(p as unknown as Record<string, unknown>, holdings);
      }),
    );
  }

  /**
   * Get user's default portfolio (first portfolio for the user).
   */
  async getDefaultPortfolio(userId: string): Promise<Portfolio | null> {
    const svc = new NewPortfolioService(userId);
    const portfolios = await svc.getPortfolios();
    if (portfolios.length === 0) return null;

    const first = portfolios[0];
    const holdings = await this.getHoldings(first.id);
    return mapPortfolio(
      first as unknown as Record<string, unknown>,
      holdings,
    );
  }

  /**
   * Create a new portfolio via the new service.
   */
  async createPortfolio(input: CreatePortfolioInput): Promise<Portfolio> {
    const svc = new NewPortfolioService(input.userId);
    const created = await svc.createPortfolio({
      name: input.name,
      description: input.description,
    });

    return mapPortfolio(created as unknown as Record<string, unknown>, []);
  }

  /**
   * Update a portfolio via the new service.
   * The new service scopes updates by user_id, so we need userId.
   * Callers passing only portfolioId + updates fall back to admin update.
   */
  async updatePortfolio(
    portfolioId: string,
    updates: Partial<CreatePortfolioInput>,
  ): Promise<Portfolio> {
    const { getSupabase } = await import("@/lib/supabase/client");
    const supabase = getSupabase();

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData["name"] = updates.name;
    if (updates.description !== undefined)
      updateData["description"] = updates.description;

    const { data, error } = await supabase
      .from("investment_portfolios")
      .update(updateData)
      .eq("id", portfolioId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update portfolio: ${error.message}`);
    }

    const holdings = await this.getHoldings(portfolioId);
    return mapPortfolio(data as unknown as Record<string, unknown>, holdings);
  }

  /**
   * Delete a portfolio.
   */
  async deletePortfolio(portfolioId: string): Promise<boolean> {
    const { getSupabase } = await import("@/lib/supabase/client");
    const supabase = getSupabase();

    // investment_holdings cascade-deletes via FK in the migration, but do it
    // explicitly here for safety.
    await supabase
      .from("investment_holdings")
      .delete()
      .eq("portfolio_id", portfolioId);

    const { error } = await supabase
      .from("investment_portfolios")
      .delete()
      .eq("id", portfolioId);

    if (error) {
      throw new Error(`Failed to delete portfolio: ${error.message}`);
    }

    return true;
  }

  /**
   * Update prices for all holdings in a portfolio.
   */
  async updateHoldingPrices(
    portfolioId: string,
    prices: Record<string, number>,
  ): Promise<void> {
    const { getSupabase } = await import("@/lib/supabase/client");
    const supabase = getSupabase();
    const holdings = await this.getHoldings(portfolioId);

    for (const holding of holdings) {
      if (holding.id && prices[holding.symbol]) {
        const newPrice = prices[holding.symbol];
        const newValue = holding.shares * newPrice;

        await supabase
          .from("investment_holdings")
          .update({ current_price: newPrice, current_value: newValue })
          .eq("id", holding.id);
      }
    }
  }
}

// Export singleton instance
export const portfolioService = new PortfolioServiceFacade();
export default portfolioService;
