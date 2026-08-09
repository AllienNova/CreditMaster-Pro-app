/**
 * Dividend Tracking Service
 *
 * Tracks dividend income from investments. Surfaces per-holding dividend
 * yield/frequency data for /api/investments/dividends — the only live
 * caller of this service.
 *
 * Wave 7 remediation (trading/assets cluster, 2026-07-31): this file
 * originally also covered dividend PAYMENT history (`dividend_payments`)
 * and DRIP settings (`drip_settings`), plus getDividendSummary/
 * getIncomeProjections/getDividendCalendar/getTaxReport built on top of
 * them. All of that was deleted — those two tables were never migrated,
 * and repo-wide grep confirmed zero callers of any of those methods
 * outside this file (the one live route, /api/investments/dividends,
 * calls only getDividendStocks). See docs/qa/triage-trading.md.
 *
 * getDividendStocks itself had two more phantom-table defects, now fixed:
 *   - queried "holdings" (never migrated) instead of the real
 *     investment_holdings (shares->quantity, avg_cost_basis->average_cost,
 *     company_name->name column renames)
 *   - queried "stock_dividends" (never migrated) — this genuinely is new
 *     reference data (per-symbol dividend rate/frequency), not user data,
 *     so it's built as an empty catalog
 *     (20260731000031_stock_dividends.sql) rather than deleted. It starts
 *     empty: nothing in this repo populates real dividend rates, so every
 *     symbol correctly returns "no dividend info" (the same fail-safe
 *     behavior the swallowed error produced before, now for the honest
 *     reason "not catalogued yet" instead of "table doesn't exist").
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type DividendFrequency =
  | "monthly"
  | "quarterly"
  | "semi-annual"
  | "annual"
  | "irregular";

export interface DividendStock {
  symbol: string;
  companyName: string;
  sharesHeld: number;
  avgCostBasis: number;
  currentPrice: number;
  annualDividend: number;
  dividendYield: number;
  frequency: DividendFrequency;
  nextExDate?: Date;
  nextPayDate?: Date;
  payoutRatio?: number;
  dividendGrowthRate?: number;
  yearsOfGrowth?: number;
  isDividendAristocrat: boolean;
}

// ============================================================================
// DIVIDEND TRACKING SERVICE
// ============================================================================

export class DividendTrackingService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // DIVIDEND STOCKS
  // ==========================================================================

  async getDividendStocks(userId: string): Promise<DividendStock[]> {
    // Get user's holdings
    const { data: holdings, error: holdingsError } = await this.supabase
      .from("investment_holdings")
      .select("*")
      .eq("user_id", userId)
      .gt("quantity", 0);

    if (holdingsError)
      throw new Error(`Failed to get holdings: ${holdingsError.message}`);

    // Get dividend info for each holding
    const dividendStocks: DividendStock[] = [];

    for (const holding of holdings || []) {
      const { data: dividendInfo } = await this.supabase
        .from("stock_dividends")
        .select("*")
        .eq("symbol", holding.symbol)
        .single();

      if (dividendInfo && dividendInfo.annual_dividend > 0) {
        dividendStocks.push({
          symbol: holding.symbol,
          companyName: holding.name || holding.symbol,
          sharesHeld: holding.quantity,
          avgCostBasis: holding.average_cost,
          currentPrice: holding.current_price,
          annualDividend: dividendInfo.annual_dividend,
          dividendYield:
            (dividendInfo.annual_dividend / holding.current_price) * 100,
          frequency: dividendInfo.frequency || "quarterly",
          nextExDate: dividendInfo.next_ex_date
            ? new Date(dividendInfo.next_ex_date)
            : undefined,
          nextPayDate: dividendInfo.next_pay_date
            ? new Date(dividendInfo.next_pay_date)
            : undefined,
          payoutRatio: dividendInfo.payout_ratio,
          dividendGrowthRate: dividendInfo.dividend_growth_rate,
          yearsOfGrowth: dividendInfo.years_of_growth,
          isDividendAristocrat: dividendInfo.years_of_growth >= 25,
        });
      }
    }

    // Sort by dividend yield descending
    return dividendStocks.sort((a, b) => b.dividendYield - a.dividendYield);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let dividendTrackingServiceInstance: DividendTrackingService | null = null;

export function getDividendTrackingService(): DividendTrackingService {
  if (!dividendTrackingServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    dividendTrackingServiceInstance = new DividendTrackingService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return dividendTrackingServiceInstance;
}
