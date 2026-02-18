/**
 * Dividend Tracking Service
 *
 * Tracks dividend income from investments including:
 * - Dividend payment history
 * - Upcoming dividend dates
 * - Yield calculations
 * - Income projections
 * - DRIP tracking
 * - Tax reporting
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

export type DividendType =
  | "qualified"
  | "ordinary"
  | "return_of_capital"
  | "capital_gain";

export interface DividendPayment {
  id: string;
  userId: string;
  accountId: string;
  symbol: string;
  companyName: string;
  exDate: Date;
  payDate: Date;
  recordDate: Date;
  amount: number;
  sharesHeld: number;
  totalAmount: number;
  dividendType: DividendType;
  reinvested: boolean;
  reinvestedShares?: number;
  reinvestedPrice?: number;
  createdAt: Date;
}

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

export interface DividendSummary {
  userId: string;
  totalAnnualIncome: number;
  totalMonthlyIncome: number;
  ytdIncome: number;
  lastMonthIncome: number;
  portfolioYield: number;
  totalDividendStocks: number;
  nextPaymentDate?: Date;
  nextPaymentAmount?: number;
  incomeByMonth: { month: string; amount: number }[];
  incomeByStock: { symbol: string; amount: number }[];
  qualifiedVsOrdinary: { qualified: number; ordinary: number };
}

export interface DividendProjection {
  month: string;
  projectedAmount: number;
  payments: {
    symbol: string;
    expectedAmount: number;
    payDate: Date;
  }[];
}

export interface DRIPSettings {
  userId: string;
  accountId: string;
  enabled: boolean;
  symbols: string[]; // Symbols enrolled in DRIP, empty = all
  minReinvestAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DividendCalendarEntry {
  date: Date;
  type: "ex_date" | "pay_date" | "record_date";
  symbol: string;
  companyName: string;
  amount: number;
  sharesHeld: number;
  totalAmount: number;
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
  // DIVIDEND PAYMENTS
  // ==========================================================================

  async recordDividendPayment(
    payment: Omit<DividendPayment, "id" | "createdAt">,
  ): Promise<DividendPayment> {
    const { data, error } = await this.supabase
      .from("dividend_payments")
      .insert({
        user_id: payment.userId,
        account_id: payment.accountId,
        symbol: payment.symbol,
        company_name: payment.companyName,
        ex_date: payment.exDate.toISOString(),
        pay_date: payment.payDate.toISOString(),
        record_date: payment.recordDate.toISOString(),
        amount: payment.amount,
        shares_held: payment.sharesHeld,
        total_amount: payment.totalAmount,
        dividend_type: payment.dividendType,
        reinvested: payment.reinvested,
        reinvested_shares: payment.reinvestedShares,
        reinvested_price: payment.reinvestedPrice,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record dividend: ${error.message}`);

    return this.mapRowToPayment(data);
  }

  async getDividendHistory(
    userId: string,
    options?: {
      symbol?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<DividendPayment[]> {
    let query = this.supabase
      .from("dividend_payments")
      .select("*")
      .eq("user_id", userId)
      .order("pay_date", { ascending: false });

    if (options?.symbol) {
      query = query.eq("symbol", options.symbol);
    }
    if (options?.startDate) {
      query = query.gte("pay_date", options.startDate.toISOString());
    }
    if (options?.endDate) {
      query = query.lte("pay_date", options.endDate.toISOString());
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error)
      throw new Error(`Failed to get dividend history: ${error.message}`);

    return (data || []).map((row) => this.mapRowToPayment(row));
  }

  // ==========================================================================
  // DIVIDEND STOCKS
  // ==========================================================================

  async getDividendStocks(userId: string): Promise<DividendStock[]> {
    // Get user's holdings
    const { data: holdings, error: holdingsError } = await this.supabase
      .from("holdings")
      .select("*")
      .eq("user_id", userId)
      .gt("shares", 0);

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
          companyName: holding.company_name || holding.symbol,
          sharesHeld: holding.shares,
          avgCostBasis: holding.avg_cost_basis,
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

  // ==========================================================================
  // SUMMARY & ANALYTICS
  // ==========================================================================

  async getDividendSummary(userId: string): Promise<DividendSummary> {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get all dividends for the year
    const ytdDividends = await this.getDividendHistory(userId, {
      startDate: startOfYear,
    });

    // Get last month's dividends
    const lastMonthDividends = ytdDividends.filter(
      (d) => d.payDate >= startOfLastMonth && d.payDate <= endOfLastMonth,
    );

    // Get dividend stocks for projection
    const dividendStocks = await this.getDividendStocks(userId);

    // Calculate totals
    const ytdIncome = ytdDividends.reduce((sum, d) => sum + d.totalAmount, 0);
    const lastMonthIncome = lastMonthDividends.reduce(
      (sum, d) => sum + d.totalAmount,
      0,
    );
    const totalAnnualIncome = dividendStocks.reduce(
      (sum, s) => sum + s.annualDividend * s.sharesHeld,
      0,
    );

    // Calculate portfolio value and yield
    const portfolioValue = dividendStocks.reduce(
      (sum, s) => sum + s.currentPrice * s.sharesHeld,
      0,
    );
    const portfolioYield =
      portfolioValue > 0 ? (totalAnnualIncome / portfolioValue) * 100 : 0;

    // Income by month
    const incomeByMonth = this.calculateIncomeByMonth(ytdDividends);

    // Income by stock
    const incomeByStock = this.calculateIncomeByStock(ytdDividends);

    // Qualified vs ordinary
    const qualifiedVsOrdinary = this.calculateQualifiedVsOrdinary(ytdDividends);

    // Next payment
    const upcomingPayments = dividendStocks
      .filter((s) => s.nextPayDate && s.nextPayDate > now)
      .sort((a, b) => a.nextPayDate!.getTime() - b.nextPayDate!.getTime());

    return {
      userId,
      totalAnnualIncome,
      totalMonthlyIncome: totalAnnualIncome / 12,
      ytdIncome,
      lastMonthIncome,
      portfolioYield,
      totalDividendStocks: dividendStocks.length,
      nextPaymentDate: upcomingPayments[0]?.nextPayDate,
      nextPaymentAmount: upcomingPayments[0]
        ? upcomingPayments[0].annualDividend *
          upcomingPayments[0].sharesHeld *
          this.getFrequencyMultiplier(upcomingPayments[0].frequency)
        : undefined,
      incomeByMonth,
      incomeByStock,
      qualifiedVsOrdinary,
    };
  }

  // ==========================================================================
  // PROJECTIONS
  // ==========================================================================

  async getIncomeProjections(
    userId: string,
    months: number = 12,
  ): Promise<DividendProjection[]> {
    const dividendStocks = await this.getDividendStocks(userId);
    const projections: DividendProjection[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
      const monthLabel = month.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      const payments: DividendProjection["payments"] = [];

      for (const stock of dividendStocks) {
        const expectedPayments = this.getExpectedPaymentsInPeriod(
          stock,
          month,
          monthEnd,
        );

        for (const payment of expectedPayments) {
          payments.push({
            symbol: stock.symbol,
            expectedAmount: payment.amount,
            payDate: payment.date,
          });
        }
      }

      projections.push({
        month: monthLabel,
        projectedAmount: payments.reduce((sum, p) => sum + p.expectedAmount, 0),
        payments,
      });
    }

    return projections;
  }

  // ==========================================================================
  // CALENDAR
  // ==========================================================================

  async getDividendCalendar(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DividendCalendarEntry[]> {
    const dividendStocks = await this.getDividendStocks(userId);
    const entries: DividendCalendarEntry[] = [];

    for (const stock of dividendStocks) {
      // Add ex-date entries
      if (
        stock.nextExDate &&
        stock.nextExDate >= startDate &&
        stock.nextExDate <= endDate
      ) {
        const expectedAmount =
          stock.annualDividend *
          stock.sharesHeld *
          this.getFrequencyMultiplier(stock.frequency);

        entries.push({
          date: stock.nextExDate,
          type: "ex_date",
          symbol: stock.symbol,
          companyName: stock.companyName,
          amount:
            stock.annualDividend * this.getFrequencyMultiplier(stock.frequency),
          sharesHeld: stock.sharesHeld,
          totalAmount: expectedAmount,
        });
      }

      // Add pay-date entries
      if (
        stock.nextPayDate &&
        stock.nextPayDate >= startDate &&
        stock.nextPayDate <= endDate
      ) {
        const expectedAmount =
          stock.annualDividend *
          stock.sharesHeld *
          this.getFrequencyMultiplier(stock.frequency);

        entries.push({
          date: stock.nextPayDate,
          type: "pay_date",
          symbol: stock.symbol,
          companyName: stock.companyName,
          amount:
            stock.annualDividend * this.getFrequencyMultiplier(stock.frequency),
          sharesHeld: stock.sharesHeld,
          totalAmount: expectedAmount,
        });
      }
    }

    return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // ==========================================================================
  // DRIP SETTINGS
  // ==========================================================================

  async getDRIPSettings(
    userId: string,
    accountId: string,
  ): Promise<DRIPSettings | null> {
    const { data, error } = await this.supabase
      .from("drip_settings")
      .select("*")
      .eq("user_id", userId)
      .eq("account_id", accountId)
      .single();

    if (error) return null;

    return {
      userId: data.user_id,
      accountId: data.account_id,
      enabled: data.enabled,
      symbols: data.symbols || [],
      minReinvestAmount: data.min_reinvest_amount,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async updateDRIPSettings(
    userId: string,
    accountId: string,
    settings: Partial<
      Pick<DRIPSettings, "enabled" | "symbols" | "minReinvestAmount">
    >,
  ): Promise<DRIPSettings> {
    const { data, error } = await this.supabase
      .from("drip_settings")
      .upsert({
        user_id: userId,
        account_id: accountId,
        enabled: settings.enabled,
        symbols: settings.symbols,
        min_reinvest_amount: settings.minReinvestAmount,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error)
      throw new Error(`Failed to update DRIP settings: ${error.message}`);

    return {
      userId: data.user_id,
      accountId: data.account_id,
      enabled: data.enabled,
      symbols: data.symbols || [],
      minReinvestAmount: data.min_reinvest_amount,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  // ==========================================================================
  // TAX REPORTING
  // ==========================================================================

  async getTaxReport(
    userId: string,
    year: number,
  ): Promise<{
    year: number;
    totalDividends: number;
    qualifiedDividends: number;
    ordinaryDividends: number;
    returnOfCapital: number;
    capitalGainDistributions: number;
    byAccount: { accountId: string; total: number; qualified: number }[];
    bySymbol: { symbol: string; total: number; qualified: number }[];
  }> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const dividends = await this.getDividendHistory(userId, {
      startDate: startOfYear,
      endDate: endOfYear,
    });

    const byAccount = new Map<string, { total: number; qualified: number }>();
    const bySymbol = new Map<string, { total: number; qualified: number }>();

    let qualifiedTotal = 0;
    let ordinaryTotal = 0;
    let rocTotal = 0;
    let capGainTotal = 0;

    for (const div of dividends) {
      // By account
      const acct = byAccount.get(div.accountId) || { total: 0, qualified: 0 };
      acct.total += div.totalAmount;
      if (div.dividendType === "qualified") acct.qualified += div.totalAmount;
      byAccount.set(div.accountId, acct);

      // By symbol
      const sym = bySymbol.get(div.symbol) || { total: 0, qualified: 0 };
      sym.total += div.totalAmount;
      if (div.dividendType === "qualified") sym.qualified += div.totalAmount;
      bySymbol.set(div.symbol, sym);

      // Totals by type
      switch (div.dividendType) {
        case "qualified":
          qualifiedTotal += div.totalAmount;
          break;
        case "ordinary":
          ordinaryTotal += div.totalAmount;
          break;
        case "return_of_capital":
          rocTotal += div.totalAmount;
          break;
        case "capital_gain":
          capGainTotal += div.totalAmount;
          break;
      }
    }

    return {
      year,
      totalDividends: dividends.reduce((sum, d) => sum + d.totalAmount, 0),
      qualifiedDividends: qualifiedTotal,
      ordinaryDividends: ordinaryTotal,
      returnOfCapital: rocTotal,
      capitalGainDistributions: capGainTotal,
      byAccount: Array.from(byAccount.entries()).map(([accountId, data]) => ({
        accountId,
        ...data,
      })),
      bySymbol: Array.from(bySymbol.entries())
        .map(([symbol, data]) => ({ symbol, ...data }))
        .sort((a, b) => b.total - a.total),
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private calculateIncomeByMonth(
    dividends: DividendPayment[],
  ): { month: string; amount: number }[] {
    const byMonth = new Map<string, number>();

    for (const div of dividends) {
      const monthKey = div.payDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + div.totalAmount);
    }

    return Array.from(byMonth.entries())
      .map(([month, amount]) => ({ month, amount }))
      .reverse();
  }

  private calculateIncomeByStock(
    dividends: DividendPayment[],
  ): { symbol: string; amount: number }[] {
    const byStock = new Map<string, number>();

    for (const div of dividends) {
      byStock.set(div.symbol, (byStock.get(div.symbol) || 0) + div.totalAmount);
    }

    return Array.from(byStock.entries())
      .map(([symbol, amount]) => ({ symbol, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  private calculateQualifiedVsOrdinary(dividends: DividendPayment[]): {
    qualified: number;
    ordinary: number;
  } {
    let qualified = 0;
    let ordinary = 0;

    for (const div of dividends) {
      if (div.dividendType === "qualified") {
        qualified += div.totalAmount;
      } else {
        ordinary += div.totalAmount;
      }
    }

    return { qualified, ordinary };
  }

  private getFrequencyMultiplier(frequency: DividendFrequency): number {
    switch (frequency) {
      case "monthly":
        return 1 / 12;
      case "quarterly":
        return 1 / 4;
      case "semi-annual":
        return 1 / 2;
      case "annual":
        return 1;
      default:
        return 1 / 4; // Default to quarterly
    }
  }

  private getExpectedPaymentsInPeriod(
    stock: DividendStock,
    startDate: Date,
    endDate: Date,
  ): { date: Date; amount: number }[] {
    const payments: { date: Date; amount: number }[] = [];
    const perPaymentAmount =
      stock.annualDividend *
      stock.sharesHeld *
      this.getFrequencyMultiplier(stock.frequency);

    // Simple projection based on frequency
    const monthsInPeriod = this.getMonthsBetween(startDate, endDate);
    let paymentsExpected = 0;

    switch (stock.frequency) {
      case "monthly":
        paymentsExpected = monthsInPeriod;
        break;
      case "quarterly":
        paymentsExpected = monthsInPeriod >= 3 ? 1 : 0;
        break;
      case "semi-annual":
        paymentsExpected = monthsInPeriod >= 6 ? 1 : 0;
        break;
      case "annual":
        paymentsExpected = monthsInPeriod >= 12 ? 1 : 0;
        break;
    }

    for (let i = 0; i < paymentsExpected; i++) {
      payments.push({
        date: new Date(startDate.getFullYear(), startDate.getMonth() + i, 15),
        amount: perPaymentAmount,
      });
    }

    return payments;
  }

  private getMonthsBetween(start: Date, end: Date): number {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1
    );
  }

  private mapRowToPayment(row: Record<string, unknown>): DividendPayment {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      accountId: row.account_id as string,
      symbol: row.symbol as string,
      companyName: row.company_name as string,
      exDate: new Date(row.ex_date as string),
      payDate: new Date(row.pay_date as string),
      recordDate: new Date(row.record_date as string),
      amount: row.amount as number,
      sharesHeld: row.shares_held as number,
      totalAmount: row.total_amount as number,
      dividendType: row.dividend_type as DividendType,
      reinvested: row.reinvested as boolean,
      reinvestedShares: row.reinvested_shares as number | undefined,
      reinvestedPrice: row.reinvested_price as number | undefined,
      createdAt: new Date(row.created_at as string),
    };
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
