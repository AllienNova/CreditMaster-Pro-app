/**
 * Fynvita Gig Economy Income Tracking Service
 *
 * Manages gig platform income tracking, self-employment tax estimation,
 * quarterly reporting, deduction tracking, and multi-platform aggregation.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export type GigPlatformCategory =
  | "rideshare"
  | "delivery"
  | "freelance"
  | "marketplace"
  | "other";

export type GigIncomeType = "payment" | "tip" | "bonus" | "refund";

export type GigDeductionCategory =
  | "mileage"
  | "home_office"
  | "equipment"
  | "phone"
  | "supplies"
  | "other";

export interface GigPlatform {
  id: string;
  name: string;
  category: GigPlatformCategory;
  connected: boolean;
}

export interface GigIncome {
  id: string;
  userId: string;
  platformId: string;
  amount: number;
  date: string;
  type: GigIncomeType;
  description?: string;
}

export interface GigDeduction {
  id: string;
  userId: string;
  category: GigDeductionCategory;
  amount: number;
  date: string;
  description: string;
}

export interface PlatformBreakdown {
  platform: string;
  amount: number;
}

export interface QuarterlyReport {
  quarter: string;
  totalIncome: number;
  totalDeductions: number;
  netIncome: number;
  estimatedSETax: number;
  estimatedIncomeTax: number;
  totalEstimatedTax: number;
  platformBreakdown: PlatformBreakdown[];
}

export interface IncomeTrend {
  period: string;
  totalIncome: number;
  averagePerPlatform: number;
  platformCount: number;
}

export interface CreateGigIncomeInput {
  platformId: string;
  amount: number;
  date: string;
  type: GigIncomeType;
  description?: string;
}

export interface CreateGigDeductionInput {
  category: GigDeductionCategory;
  amount: number;
  date: string;
  description: string;
}

export interface GigIncomeFilter {
  platformId?: string;
  startDate?: string;
  endDate?: string;
  type?: GigIncomeType;
}

export interface AggregatedIncomeSummary {
  totalIncome: number;
  totalDeductions: number;
  netIncome: number;
  platformBreakdown: PlatformBreakdown[];
  incomeByType: Record<GigIncomeType, number>;
  periodStart: string;
  periodEnd: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Self-employment tax rate: 15.3% (12.4% Social Security + 2.9% Medicare) */
const SE_TAX_RATE = 0.153;

/** SE tax deduction factor: only 92.35% of net earnings are subject to SE tax */
const SE_TAX_DEDUCTION_FACTOR = 0.9235;

/** Half of SE tax is deductible from income for income tax calculation */
const SE_TAX_INCOME_DEDUCTION_FACTOR = 0.5;

/** 2026 federal income tax brackets (single filer) */
const TAX_BRACKETS: { min: number; max: number; rate: number }[] = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

/** Standard deduction for single filer (2026) */
const STANDARD_DEDUCTION = 14600;

/** Known gig platforms with their categories */
const KNOWN_PLATFORMS: Record<string, GigPlatformCategory> = {
  uber: "rideshare",
  lyft: "rideshare",
  doordash: "delivery",
  instacart: "delivery",
  grubhub: "delivery",
  ubereats: "delivery",
  postmates: "delivery",
  shipt: "delivery",
  amazon_flex: "delivery",
  fiverr: "freelance",
  upwork: "freelance",
  toptal: "freelance",
  freelancer: "freelance",
  etsy: "marketplace",
  ebay: "marketplace",
  poshmark: "marketplace",
  mercari: "marketplace",
  taskrabbit: "other",
  rover: "other",
  thumbtack: "other",
  handy: "other",
};

/** IRS standard mileage rate for 2026 (cents per mile) */
const MILEAGE_RATE_CENTS = 67;

// ============================================================================
// Gig Income Service
// ============================================================================

class GigIncomeService {
  // --------------------------------------------------------------------------
  // Platform Management
  // --------------------------------------------------------------------------

  /**
   * Detect the category of a gig platform by its name
   */
  detectPlatformCategory(platformName: string): GigPlatformCategory {
    const normalized = platformName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

    // Check known platforms — sort by normalized key length descending so longer/more
    // specific matches (e.g. "ubereats") are checked before shorter ones (e.g. "uber").
    // Only check if input contains the key (not vice versa) to avoid false positives.
    const sortedEntries = Object.entries(KNOWN_PLATFORMS)
      .map(([key, category]) => ({
        normalizedKey: key.replace(/_/g, ""),
        category,
      }))
      .sort((a, b) => b.normalizedKey.length - a.normalizedKey.length);

    for (const { normalizedKey, category } of sortedEntries) {
      if (normalized.includes(normalizedKey) || normalized === normalizedKey) {
        return category;
      }
    }

    return "other";
  }

  /**
   * Get all gig platforms for a user
   */
  async getPlatforms(userId: string): Promise<GigPlatform[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { data, error } = await supabase
      .from("gig_platforms")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error("Failed to fetch gig platforms");
    }

    return (data || []).map(this.mapDbToPlatform);
  }

  /**
   * Add a gig platform for a user
   */
  async addPlatform(
    userId: string,
    name: string,
    category?: GigPlatformCategory,
  ): Promise<GigPlatform> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const resolvedCategory = category || this.detectPlatformCategory(name);

    const { data, error } = await supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("gig_platforms")
      .insert({
        user_id: userId,
        name,
        category: resolvedCategory,
        connected: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error("Failed to add gig platform");
    }

    return this.mapDbToPlatform(data);
  }

  // --------------------------------------------------------------------------
  // Income CRUD
  // --------------------------------------------------------------------------

  /**
   * Get gig income entries with optional filters
   */
  async getIncome(userId: string, filter?: GigIncomeFilter): Promise<GigIncome[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    let query = supabase
      .from("gig_income")
      .select("*")
      .eq("user_id", userId);

    if (filter?.platformId) {
      query = query.eq("platform_id", filter.platformId);
    }
    if (filter?.startDate) {
      query = query.gte("date", filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte("date", filter.endDate);
    }
    if (filter?.type) {
      query = query.eq("type", filter.type);
    }

    query = query.order("date", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error("Failed to fetch gig income");
    }

    return (data || []).map(this.mapDbToGigIncome);
  }

  /**
   * Add a gig income entry
   */
  async addIncome(userId: string, input: CreateGigIncomeInput): Promise<GigIncome> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    if (input.amount < 0 && input.type !== "refund") {
      throw new Error("Negative amounts are only allowed for refunds");
    }

    const { data, error } = await supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("gig_income")
      .insert({
        user_id: userId,
        platform_id: input.platformId,
        amount: input.amount,
        date: input.date,
        type: input.type,
        description: input.description || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error("Failed to add gig income");
    }

    return this.mapDbToGigIncome(data);
  }

  /**
   * Delete a gig income entry
   */
  async deleteIncome(userId: string, incomeId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { error } = await supabase
      .from("gig_income")
      .delete()
      .eq("id", incomeId)
      .eq("user_id", userId);

    if (error) {
      throw new Error("Failed to delete gig income");
    }
  }

  // --------------------------------------------------------------------------
  // Deduction CRUD
  // --------------------------------------------------------------------------

  /**
   * Get all deductions for a user, optionally filtered by date range
   */
  async getDeductions(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<GigDeduction[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    let query = supabase
      .from("gig_deductions")
      .select("*")
      .eq("user_id", userId);

    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    query = query.order("date", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error("Failed to fetch gig deductions");
    }

    return (data || []).map(this.mapDbToDeduction);
  }

  /**
   * Add a deduction entry
   */
  async addDeduction(
    userId: string,
    input: CreateGigDeductionInput,
  ): Promise<GigDeduction> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    if (input.amount <= 0) {
      throw new Error("Deduction amount must be positive");
    }

    const { data, error } = await supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("gig_deductions")
      .insert({
        user_id: userId,
        category: input.category,
        amount: input.amount,
        date: input.date,
        description: input.description,
      })
      .select()
      .single();

    if (error) {
      throw new Error("Failed to add gig deduction");
    }

    return this.mapDbToDeduction(data);
  }

  /**
   * Delete a deduction entry
   */
  async deleteDeduction(userId: string, deductionId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { error } = await supabase
      .from("gig_deductions")
      .delete()
      .eq("id", deductionId)
      .eq("user_id", userId);

    if (error) {
      throw new Error("Failed to delete gig deduction");
    }
  }

  // --------------------------------------------------------------------------
  // Tax Estimation
  // --------------------------------------------------------------------------

  /**
   * Estimate self-employment tax on net income.
   * SE tax = 15.3% of (net income * 92.35%)
   */
  estimateSETax(netIncome: number): number {
    if (netIncome <= 0) return 0;
    const taxableAmount = netIncome * SE_TAX_DEDUCTION_FACTOR;
    return Math.round(taxableAmount * SE_TAX_RATE * 100) / 100;
  }

  /**
   * Estimate federal income tax using progressive brackets.
   * Accounts for standard deduction and half-SE-tax deduction.
   */
  estimateIncomeTax(netIncome: number): number {
    if (netIncome <= 0) return 0;

    // Half of SE tax is deductible from income
    const seTax = this.estimateSETax(netIncome);
    const seTaxDeduction = seTax * SE_TAX_INCOME_DEDUCTION_FACTOR;

    // Apply standard deduction
    const taxableIncome = Math.max(0, netIncome - STANDARD_DEDUCTION - seTaxDeduction);

    if (taxableIncome <= 0) return 0;

    let totalTax = 0;
    for (const bracket of TAX_BRACKETS) {
      if (taxableIncome <= bracket.min) break;
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      totalTax += taxableInBracket * bracket.rate;
    }

    return Math.round(totalTax * 100) / 100;
  }

  // --------------------------------------------------------------------------
  // Quarterly Reports
  // --------------------------------------------------------------------------

  /**
   * Generate a quarterly income report for estimated tax payments.
   */
  async generateQuarterlyReport(
    userId: string,
    year: number,
    quarter: number,
  ): Promise<QuarterlyReport> {
    if (quarter < 1 || quarter > 4) {
      throw new Error("Quarter must be between 1 and 4");
    }

    const { startDate, endDate } = this.getQuarterDateRange(year, quarter);

    const income = await this.getIncome(userId, {
      startDate,
      endDate,
    });
    const deductions = await this.getDeductions(userId, startDate, endDate);
    const platforms = await this.getPlatforms(userId);

    const totalIncome = income
      .filter((i) => i.type !== "refund")
      .reduce((sum, i) => sum + i.amount, 0);

    const totalRefunds = income
      .filter((i) => i.type === "refund")
      .reduce((sum, i) => sum + Math.abs(i.amount), 0);

    const grossIncome = Math.round((totalIncome - totalRefunds) * 100) / 100;
    const totalDeductions = Math.round(
      deductions.reduce((sum, d) => sum + d.amount, 0) * 100,
    ) / 100;
    const netIncome = Math.round((grossIncome - totalDeductions) * 100) / 100;

    // Annualize the quarterly income for tax bracket purposes
    const annualizedNet = netIncome * 4;
    const estimatedSETax = Math.round((this.estimateSETax(annualizedNet) / 4) * 100) / 100;
    const estimatedIncomeTax = Math.round((this.estimateIncomeTax(annualizedNet) / 4) * 100) / 100;

    // Build platform breakdown
    const platformMap = new Map<string, number>();
    for (const entry of income) {
      const platform = platforms.find((p) => p.id === entry.platformId);
      const platformName = platform?.name || "Unknown";
      const current = platformMap.get(platformName) || 0;
      const entryAmount = entry.type === "refund" ? -Math.abs(entry.amount) : entry.amount;
      platformMap.set(platformName, current + entryAmount);
    }

    const platformBreakdown: PlatformBreakdown[] = Array.from(platformMap.entries())
      .map(([platform, amount]) => ({
        platform,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      quarter: `${year}-Q${quarter}`,
      totalIncome: grossIncome,
      totalDeductions,
      netIncome,
      estimatedSETax,
      estimatedIncomeTax,
      totalEstimatedTax: Math.round((estimatedSETax + estimatedIncomeTax) * 100) / 100,
      platformBreakdown,
    };
  }

  /**
   * Get the start and end date strings for a given quarter
   */
  getQuarterDateRange(
    year: number,
    quarter: number,
  ): { startDate: string; endDate: string } {
    const quarterStartMonth = (quarter - 1) * 3;
    const startDate = `${year}-${String(quarterStartMonth + 1).padStart(2, "0")}-01`;

    const endMonth = quarterStartMonth + 3;
    const endYear = endMonth > 12 ? year + 1 : year;
    const endMonthNormalized = endMonth > 12 ? endMonth - 12 : endMonth;
    // Last day: use day 0 of next month
    const lastDay = new Date(endYear, endMonthNormalized, 0).getDate();
    const endDate = `${year}-${String(quarterStartMonth + 3).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    return { startDate, endDate };
  }

  // --------------------------------------------------------------------------
  // Income Trend Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyze income trends over time (weekly or monthly averages)
   */
  async getIncomeTrends(
    userId: string,
    period: "weekly" | "monthly",
    startDate: string,
    endDate: string,
  ): Promise<IncomeTrend[]> {
    const income = await this.getIncome(userId, { startDate, endDate });

    if (income.length === 0) return [];

    const groupedByPeriod = new Map<string, GigIncome[]>();

    for (const entry of income) {
      const periodKey =
        period === "weekly"
          ? this.getWeekKey(entry.date)
          : this.getMonthKey(entry.date);

      const existing = groupedByPeriod.get(periodKey) || [];
      existing.push(entry);
      groupedByPeriod.set(periodKey, existing);
    }

    const trends: IncomeTrend[] = [];

    for (const [periodKey, entries] of groupedByPeriod) {
      const totalIncome = entries
        .filter((e) => e.type !== "refund")
        .reduce((sum, e) => sum + e.amount, 0);

      const refunds = entries
        .filter((e) => e.type === "refund")
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);

      const net = Math.round((totalIncome - refunds) * 100) / 100;
      const uniquePlatforms = new Set(entries.map((e) => e.platformId));

      trends.push({
        period: periodKey,
        totalIncome: net,
        averagePerPlatform:
          uniquePlatforms.size > 0
            ? Math.round((net / uniquePlatforms.size) * 100) / 100
            : 0,
        platformCount: uniquePlatforms.size,
      });
    }

    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  // --------------------------------------------------------------------------
  // Multi-Platform Aggregation
  // --------------------------------------------------------------------------

  /**
   * Get aggregated income summary across all platforms for a date range
   */
  async getAggregatedSummary(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<AggregatedIncomeSummary> {
    const income = await this.getIncome(userId, { startDate, endDate });
    const deductions = await this.getDeductions(userId, startDate, endDate);
    const platforms = await this.getPlatforms(userId);

    // Platform breakdown
    const platformMap = new Map<string, number>();
    for (const entry of income) {
      const platform = platforms.find((p) => p.id === entry.platformId);
      const platformName = platform?.name || "Unknown";
      const current = platformMap.get(platformName) || 0;
      const entryAmount = entry.type === "refund" ? -Math.abs(entry.amount) : entry.amount;
      platformMap.set(platformName, current + entryAmount);
    }

    const platformBreakdown: PlatformBreakdown[] = Array.from(platformMap.entries())
      .map(([platform, amount]) => ({
        platform,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Income by type
    const incomeByType: Record<GigIncomeType, number> = {
      payment: 0,
      tip: 0,
      bonus: 0,
      refund: 0,
    };
    for (const entry of income) {
      incomeByType[entry.type] += entry.amount;
    }
    for (const key of Object.keys(incomeByType) as GigIncomeType[]) {
      incomeByType[key] = Math.round(incomeByType[key] * 100) / 100;
    }

    const totalIncome = Math.round(
      income
        .filter((i) => i.type !== "refund")
        .reduce((sum, i) => sum + i.amount, 0) * 100,
    ) / 100;

    const totalRefunds = Math.round(
      income
        .filter((i) => i.type === "refund")
        .reduce((sum, i) => sum + Math.abs(i.amount), 0) * 100,
    ) / 100;

    const grossIncome = Math.round((totalIncome - totalRefunds) * 100) / 100;
    const totalDeductionAmount = Math.round(
      deductions.reduce((sum, d) => sum + d.amount, 0) * 100,
    ) / 100;

    return {
      totalIncome: grossIncome,
      totalDeductions: totalDeductionAmount,
      netIncome: Math.round((grossIncome - totalDeductionAmount) * 100) / 100,
      platformBreakdown,
      incomeByType,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  /**
   * Calculate mileage deduction amount using IRS standard rate
   */
  calculateMileageDeduction(miles: number): number {
    if (miles <= 0) return 0;
    return Math.round((miles * MILEAGE_RATE_CENTS) / 100 * 100) / 100;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private getWeekKey(dateStr: string): string {
    const date = new Date(dateStr);
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor(
      (date.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000),
    );
    const weekNum = Math.ceil((dayOfYear + yearStart.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  }

  private getMonthKey(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  private mapDbToPlatform(row: Record<string, unknown>): GigPlatform {
    return {
      id: row.id as string,
      name: row.name as string,
      category: row.category as GigPlatformCategory,
      connected: row.connected as boolean,
    };
  }

  private mapDbToGigIncome(row: Record<string, unknown>): GigIncome {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      platformId: row.platform_id as string,
      amount: row.amount as number,
      date: row.date as string,
      type: row.type as GigIncomeType,
      description: row.description as string | undefined,
    };
  }

  private mapDbToDeduction(row: Record<string, unknown>): GigDeduction {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      category: row.category as GigDeductionCategory,
      amount: row.amount as number,
      date: row.date as string,
      description: row.description as string,
    };
  }
}

// Export singleton instance
export const gigIncomeService = new GigIncomeService();
export default gigIncomeService;
