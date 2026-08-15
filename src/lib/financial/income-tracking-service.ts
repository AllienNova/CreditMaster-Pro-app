/**
 * Fynvita Income Tracking Service
 *
 * Manages income sources, payday detection, and countdown functionality.
 * Provides auto-detection from transactions and manual income entry.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export type IncomeFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export interface IncomeSource {
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency: IncomeFrequency;
  nextPayDate: Date;
  accountId?: string;
  isAutoDetected: boolean;
  lastPayDate?: Date;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaydayCountdown {
  daysUntilPayday: number;
  hoursUntilPayday: number;
  nextPayDate: Date;
  expectedAmount: number;
  sourceName: string;
  sourceId: string;
  percentComplete: number;
}

export interface MonthlyIncomeStats {
  totalMonthlyIncome: number;
  expectedNextMonth: number;
  sources: IncomeSource[];
  averagePaycheck: number;
  payFrequency: IncomeFrequency | "mixed";
}

export interface DetectedIncomePattern {
  merchantName: string;
  amount: number;
  frequency: IncomeFrequency;
  confidence: number;
  lastOccurrence: Date;
  occurrences: number;
}

export interface CreateIncomeSourceInput {
  name: string;
  amount: number;
  frequency: IncomeFrequency;
  nextPayDate: Date;
  accountId?: string;
  isAutoDetected?: boolean;
}

export interface UpdateIncomeSourceInput {
  name?: string;
  amount?: number;
  frequency?: IncomeFrequency;
  nextPayDate?: Date;
  accountId?: string;
}

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  merchantName: string;
  category?: string;
  accountId?: string;
}

// ============================================================================
// Constants
// ============================================================================

const FREQUENCY_DAYS: Record<IncomeFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  semimonthly: 15, // Approximate
  monthly: 30,
};

const MIN_OCCURRENCES_FOR_DETECTION = 2;
const MIN_CONFIDENCE_THRESHOLD = 0.7;

// Common income keywords
const INCOME_KEYWORDS = [
  "payroll",
  "direct deposit",
  "salary",
  "wage",
  "ach credit",
  "employer",
  "paycheck",
  "compensation",
  "payment from",
];

// ============================================================================
// Income Tracking Service
// ============================================================================

class IncomeTrackingService {
  /**
   * Get all income sources for a user
   */
  async getIncomeSources(userId: string): Promise<IncomeSource[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { data, error } = await supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", userId)
      .order("next_pay_date", { ascending: true });

    if (error) {
      // IncomeTrackingService error: Error fetching income sources
      throw new Error("Failed to fetch income sources");
    }

    return (data || []).map(this.mapDbToIncomeSource);
  }

  /**
   * Get a single income source by ID
   */
  async getIncomeSource(
    userId: string,
    sourceId: string,
  ): Promise<IncomeSource | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { data, error } = await supabase
      .from("income_sources")
      .select("*")
      .eq("id", sourceId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error("Failed to fetch income source");
    }

    return this.mapDbToIncomeSource(data);
  }

  /**
   * Create a new income source
   */
  async createIncomeSource(
    userId: string,
    input: CreateIncomeSourceInput,
  ): Promise<IncomeSource> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { data, error } = await supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("income_sources")
      .insert({
        user_id: userId,
        name: input.name,
        amount: input.amount,
        frequency: input.frequency,
        next_pay_date: input.nextPayDate.toISOString(),
        account_id: input.accountId || null,
        is_auto_detected: input.isAutoDetected || false,
      })
      .select()
      .single();

    if (error) {
      // IncomeTrackingService error: Error creating income source
      throw new Error("Failed to create income source");
    }

    return this.mapDbToIncomeSource(data);
  }

  /**
   * Update an existing income source
   */
  async updateIncomeSource(
    userId: string,
    sourceId: string,
    input: UpdateIncomeSourceInput,
  ): Promise<IncomeSource> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.frequency !== undefined) updateData.frequency = input.frequency;
    if (input.nextPayDate !== undefined)
      updateData.next_pay_date = input.nextPayDate.toISOString();
    if (input.accountId !== undefined) updateData.account_id = input.accountId;

    const { data, error } = await supabase
      .from("income_sources")
      .update(updateData)
      .eq("id", sourceId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      // IncomeTrackingService error: Error updating income source
      throw new Error("Failed to update income source");
    }

    return this.mapDbToIncomeSource(data);
  }

  /**
   * Delete an income source
   */
  async deleteIncomeSource(userId: string, sourceId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { error } = await supabase
      .from("income_sources")
      .delete()
      .eq("id", sourceId)
      .eq("user_id", userId);

    if (error) {
      // IncomeTrackingService error: Error deleting income source
      throw new Error("Failed to delete income source");
    }
  }

  /**
   * Get payday countdown for the next upcoming payment
   */
  async getPaydayCountdown(userId: string): Promise<PaydayCountdown | null> {
    const sources = await this.getIncomeSources(userId);

    if (sources.length === 0) return null;

    // Find the next upcoming payday
    const now = new Date();
    const upcomingSources = sources
      .filter((s) => new Date(s.nextPayDate) > now)
      .sort(
        (a, b) =>
          new Date(a.nextPayDate).getTime() - new Date(b.nextPayDate).getTime(),
      );

    if (upcomingSources.length === 0) {
      // Update next pay dates and try again
      await this.updateNextPayDates(userId);
      const updatedSources = await this.getIncomeSources(userId);
      const nextSource = updatedSources
        .filter((s) => new Date(s.nextPayDate) > now)
        .sort(
          (a, b) =>
            new Date(a.nextPayDate).getTime() -
            new Date(b.nextPayDate).getTime(),
        )[0];

      if (!nextSource) return null;

      return this.calculateCountdown(nextSource);
    }

    return this.calculateCountdown(upcomingSources[0]);
  }

  /**
   * Calculate countdown for a specific income source
   */
  private calculateCountdown(source: IncomeSource): PaydayCountdown {
    const now = new Date();
    const nextPayDate = new Date(source.nextPayDate);

    const diffMs = nextPayDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    // Calculate percent complete through pay period
    const frequencyDays = FREQUENCY_DAYS[source.frequency];
    const lastPayDate = source.lastPayDate
      ? new Date(source.lastPayDate)
      : new Date(nextPayDate.getTime() - frequencyDays * 24 * 60 * 60 * 1000);

    const totalPeriodMs = nextPayDate.getTime() - lastPayDate.getTime();
    const elapsedMs = now.getTime() - lastPayDate.getTime();
    const percentComplete = Math.min(
      100,
      Math.max(0, (elapsedMs / totalPeriodMs) * 100),
    );

    return {
      daysUntilPayday: Math.max(0, diffDays),
      hoursUntilPayday: Math.max(0, diffHours),
      nextPayDate,
      expectedAmount: source.amount,
      sourceName: source.name,
      sourceId: source.id,
      percentComplete: Math.round(percentComplete),
    };
  }

  /**
   * Get monthly income statistics
   */
  async getMonthlyIncomeStats(userId: string): Promise<MonthlyIncomeStats> {
    const sources = await this.getIncomeSources(userId);

    if (sources.length === 0) {
      return {
        totalMonthlyIncome: 0,
        expectedNextMonth: 0,
        sources: [],
        averagePaycheck: 0,
        payFrequency: "monthly",
      };
    }

    // Calculate monthly income based on frequency
    const monthlyIncomes = sources.map((source) => {
      const multiplier = this.getMonthlyMultiplier(source.frequency);
      return source.amount * multiplier;
    });

    const totalMonthlyIncome = monthlyIncomes.reduce(
      (sum, income) => sum + income,
      0,
    );
    const averagePaycheck =
      sources.reduce((sum, s) => sum + s.amount, 0) / sources.length;

    // Determine dominant frequency
    const frequencyCounts = sources.reduce(
      (acc, s) => {
        acc[s.frequency] = (acc[s.frequency] || 0) + 1;
        return acc;
      },
      {} as Record<IncomeFrequency, number>,
    );

    const dominantFrequency = Object.entries(frequencyCounts).sort(
      ([, a], [, b]) => b - a,
    )[0];

    const payFrequency =
      sources.length > 1 && Object.keys(frequencyCounts).length > 1
        ? "mixed"
        : (dominantFrequency?.[0] as IncomeFrequency) || "monthly";

    return {
      totalMonthlyIncome: Math.round(totalMonthlyIncome * 100) / 100,
      expectedNextMonth: Math.round(totalMonthlyIncome * 100) / 100,
      sources,
      averagePaycheck: Math.round(averagePaycheck * 100) / 100,
      payFrequency,
    };
  }

  /**
   * Get multiplier to convert frequency to monthly amount
   */
  private getMonthlyMultiplier(frequency: IncomeFrequency): number {
    switch (frequency) {
      case "weekly":
        return 4.33; // Average weeks per month
      case "biweekly":
        return 2.17; // Average biweekly periods per month
      case "semimonthly":
        return 2;
      case "monthly":
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Detect income patterns from transactions
   */
  async detectIncomeFromTransactions(
    transactions: Transaction[],
  ): Promise<DetectedIncomePattern[]> {
    // Filter for potential income transactions (credits, positive amounts)
    const incomeTransactions = transactions.filter((t) => t.amount > 0);

    // Group by merchant/description
    const merchantGroups = new Map<string, Transaction[]>();

    for (const txn of incomeTransactions) {
      const key = this.normalizemerchantName(txn.merchantName);
      const existing = merchantGroups.get(key) || [];
      existing.push(txn);
      merchantGroups.set(key, existing);
    }

    const patterns: DetectedIncomePattern[] = [];

    for (const [merchantName, txns] of merchantGroups) {
      if (txns.length < MIN_OCCURRENCES_FOR_DETECTION) continue;

      // Check if it matches income keywords
      const isLikelyIncome = INCOME_KEYWORDS.some((kw) =>
        merchantName.toLowerCase().includes(kw),
      );

      // Calculate average amount and consistency
      const amounts = txns.map((t) => t.amount);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const amountVariance = this.calculateVariance(amounts);
      const amountConsistency =
        amountVariance < 0.1 ? 1 : amountVariance < 0.3 ? 0.7 : 0.4;

      // Detect frequency
      const dates = txns
        .map((t) => new Date(t.date))
        .sort((a, b) => a.getTime() - b.getTime());
      const frequency = this.detectFrequency(dates);

      if (!frequency) continue;

      // Calculate confidence
      const occurrenceScore = Math.min(1, txns.length / 6); // Max score at 6 occurrences
      const keywordScore = isLikelyIncome ? 0.3 : 0;
      const confidence =
        amountConsistency * 0.4 + occurrenceScore * 0.3 + keywordScore;

      if (confidence >= MIN_CONFIDENCE_THRESHOLD) {
        patterns.push({
          merchantName: txns[0].merchantName, // Use original name
          amount: Math.round(avgAmount * 100) / 100,
          frequency: frequency.type,
          confidence: Math.round(confidence * 100) / 100,
          lastOccurrence: dates[dates.length - 1],
          occurrences: txns.length,
        });
      }
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate the next pay date based on frequency
   */
  calculateNextPayDate(lastPayDate: Date, frequency: IncomeFrequency): Date {
    const date = new Date(lastPayDate);

    switch (frequency) {
      case "weekly":
        date.setDate(date.getDate() + 7);
        break;
      case "biweekly":
        date.setDate(date.getDate() + 14);
        break;
      case "semimonthly":
        // Typically 1st and 15th, or 15th and last
        const day = date.getDate();
        if (day < 15) {
          date.setDate(15);
        } else {
          date.setMonth(date.getMonth() + 1);
          date.setDate(1);
        }
        break;
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        break;
    }

    return date;
  }

  /**
   * Update next pay dates for all sources that have passed
   */
  private async updateNextPayDates(userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;
    const sources = await this.getIncomeSources(userId);
    const now = new Date();

    for (const source of sources) {
      if (new Date(source.nextPayDate) <= now) {
        const newNextDate = this.calculateNextPayDate(
          source.nextPayDate,
          source.frequency,
        );

        await supabase
          .from("income_sources")
          .update({
            next_pay_date: newNextDate.toISOString(),
            last_pay_date: source.nextPayDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", source.id)
          .eq("user_id", userId);
      }
    }
  }

  /**
   * Detect frequency from a list of dates
   */
  private detectFrequency(
    dates: Date[],
  ): { type: IncomeFrequency; avgDays: number } | null {
    if (dates.length < 2) return null;

    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const diff = dates[i].getTime() - dates[i - 1].getTime();
      gaps.push(diff / (1000 * 60 * 60 * 24));
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    // Determine frequency based on average gap
    if (avgGap >= 5 && avgGap <= 9) {
      return { type: "weekly", avgDays: avgGap };
    } else if (avgGap >= 12 && avgGap <= 18) {
      return { type: "biweekly", avgDays: avgGap };
    } else if (avgGap >= 13 && avgGap <= 17) {
      return { type: "semimonthly", avgDays: avgGap };
    } else if (avgGap >= 26 && avgGap <= 35) {
      return { type: "monthly", avgDays: avgGap };
    }

    return null;
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow((v - mean) / mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Normalize merchant name for grouping
   */
  private normalizemerchantName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Map database row to IncomeSource
   */
  private mapDbToIncomeSource(row: Record<string, unknown>): IncomeSource {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      amount: row.amount as number,
      frequency: row.frequency as IncomeFrequency,
      nextPayDate: new Date(row.next_pay_date as string),
      accountId: row.account_id as string | undefined,
      isAutoDetected: row.is_auto_detected as boolean,
      lastPayDate: row.last_pay_date
        ? new Date(row.last_pay_date as string)
        : undefined,
      category: row.category as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

// Export singleton instance
export const incomeTrackingService = new IncomeTrackingService();
export default incomeTrackingService;
