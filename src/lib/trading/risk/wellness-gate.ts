/**
 * Financial Wellness Gate
 *
 * Pre-trade gate that blocks live trading when user's financial health
 * is insufficient. Checks debt-to-income ratio, emergency fund adequacy,
 * and overall financial stability before allowing trades.
 *
 * DTI > 40% → block live trading (allow paper trading)
 * No emergency fund → warning
 * Negative net income → block live trading
 */

import { supabaseAdmin } from "@/lib/supabase/server";

// ============================================================================
// TYPES
// ============================================================================

export interface WellnessCheckResult {
  approved: boolean;
  dtiRatio: number | null;
  monthlyIncome: number;
  monthlyDebtPayments: number;
  hasEmergencyFund: boolean;
  netMonthlyIncome: number;
  violations: WellnessViolation[];
  warnings: WellnessWarning[];
  checkedAt: number;
}

export interface WellnessViolation {
  rule: string;
  message: string;
  currentValue: number;
  limit: number;
}

export interface WellnessWarning {
  rule: string;
  message: string;
  currentValue: number;
  threshold: number;
}

export interface WellnessGateConfig {
  maxDTI: number;
  minMonthlyIncome: number;
  emergencyFundMonths: number;
  incomeEstimateFallback: number;
}

/**
 * Raised when a wellness data lookup returns a query error (not "no rows").
 * Caught by `check()` and converted into a blocking `system_error` violation —
 * a failed lookup must never be silently read as "no debt" / "safe".
 */
class WellnessDataFetchError extends Error {
  constructor(
    public readonly table: string,
    public readonly cause: unknown,
  ) {
    super(`Failed to query "${table}" for wellness check`);
    this.name = "WellnessDataFetchError";
  }
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_WELLNESS_CONFIG: WellnessGateConfig = {
  maxDTI: 40,
  minMonthlyIncome: 0,
  emergencyFundMonths: 3,
  incomeEstimateFallback: 5000,
};

// ============================================================================
// WELLNESS GATE
// ============================================================================

export class WellnessGate {
  private userId: string;
  private config: WellnessGateConfig;

  constructor(userId: string, config?: Partial<WellnessGateConfig>) {
    this.userId = userId;
    this.config = { ...DEFAULT_WELLNESS_CONFIG, ...config };
  }

  /**
   * Run a full wellness check for the user.
   * Returns approval status plus detailed breakdown.
   */
  async check(): Promise<WellnessCheckResult> {
    const violations: WellnessViolation[] = [];
    const warnings: WellnessWarning[] = [];

    let monthlyIncome: number;
    let monthlyDebtPayments: number;
    let hasEmergencyFund: boolean;

    try {
      [monthlyIncome, monthlyDebtPayments, hasEmergencyFund] =
        await Promise.all([
          this.getMonthlyIncome(),
          this.getMonthlyDebtPayments(),
          this.checkEmergencyFund(),
        ]);
    } catch (err) {
      // A failed lookup must never be silently read as a passed safety check —
      // fail closed and block live trading until the underlying error is resolved.
      console.error(
        `[WellnessGate] Wellness data lookup failed for user ${this.userId}, blocking live trading:`,
        err,
      );
      return {
        approved: false,
        dtiRatio: null,
        monthlyIncome: 0,
        monthlyDebtPayments: 0,
        hasEmergencyFund: false,
        netMonthlyIncome: 0,
        violations: [
          {
            rule: "system_error",
            message:
              "Unable to verify financial wellness due to a system error. Live trading is blocked until this can be re-checked.",
            currentValue: 0,
            limit: 0,
          },
        ],
        warnings: [],
        checkedAt: Date.now(),
      };
    }

    const netMonthlyIncome = monthlyIncome - monthlyDebtPayments;
    const dtiRatio =
      monthlyIncome > 0
        ? (monthlyDebtPayments / monthlyIncome) * 100
        : null;

    // Gate 1: DTI ratio check
    if (dtiRatio !== null && dtiRatio > this.config.maxDTI) {
      violations.push({
        rule: "max_dti",
        message: `Debt-to-income ratio ${dtiRatio.toFixed(1)}% exceeds ${this.config.maxDTI}% limit. Pay down debt before live trading.`,
        currentValue: dtiRatio,
        limit: this.config.maxDTI,
      });
    }

    // Gate 2: Negative net income
    if (netMonthlyIncome < this.config.minMonthlyIncome) {
      violations.push({
        rule: "negative_net_income",
        message: `Net monthly income $${netMonthlyIncome.toFixed(2)} is below minimum. Debt payments exceed income.`,
        currentValue: netMonthlyIncome,
        limit: this.config.minMonthlyIncome,
      });
    }

    // Gate 3: No income data (cannot assess risk)
    if (dtiRatio === null && monthlyIncome === 0) {
      violations.push({
        rule: "no_income_data",
        message:
          "No income data available. Link bank accounts or enter income to enable live trading.",
        currentValue: 0,
        limit: 1,
      });
    }

    // Warning: No emergency fund
    if (!hasEmergencyFund) {
      warnings.push({
        rule: "no_emergency_fund",
        message: `No emergency fund detected. Recommend ${this.config.emergencyFundMonths} months of expenses saved before trading.`,
        currentValue: 0,
        threshold: this.config.emergencyFundMonths,
      });
    }

    // Warning: DTI approaching limit
    if (
      dtiRatio !== null &&
      dtiRatio > this.config.maxDTI * 0.8 &&
      dtiRatio <= this.config.maxDTI
    ) {
      warnings.push({
        rule: "dti_approaching_limit",
        message: `DTI ratio ${dtiRatio.toFixed(1)}% is approaching the ${this.config.maxDTI}% limit.`,
        currentValue: dtiRatio,
        threshold: this.config.maxDTI,
      });
    }

    return {
      approved: violations.length === 0,
      dtiRatio,
      monthlyIncome,
      monthlyDebtPayments,
      hasEmergencyFund,
      netMonthlyIncome,
      violations,
      warnings,
      checkedAt: Date.now(),
    };
  }

  /**
   * Quick check — returns just approved/denied without full breakdown.
   */
  async isApproved(): Promise<boolean> {
    const result = await this.check();
    return result.approved;
  }

  // --------------------------------------------------------------------------
  // DATA FETCHERS
  // --------------------------------------------------------------------------

  private async getMonthlyIncome(): Promise<number> {
    // Try profile first. NOTE: `profiles.monthly_income` is NOT present in the
    // live schema (verified 2026-07-31 via `\d+ profiles`) — this lookup fails
    // for every user today, not just on transient errors. The transaction-based
    // fallback below is the only working income source in practice. Logged (not
    // thrown) so a permanently-absent optional enhancement doesn't block every
    // trade — see FND report for the product decision this needs (add the
    // column via migration, or remove this dead lookup).
    const { data: profile, error } = (await supabaseAdmin
      .from("profiles")
      .select("monthly_income")
      .eq("id", this.userId)
      .single()) as { data: { monthly_income?: number } | null; error: unknown };

    if (error) {
      console.error(
        `[WellnessGate] profiles.monthly_income lookup failed for user ${this.userId}, falling back to transaction estimate:`,
        error,
      );
    } else if (profile?.monthly_income && profile.monthly_income > 0) {
      return profile.monthly_income;
    }

    // Fallback: estimate from recent income transactions (3 months)
    return this.estimateIncomeFromTransactions();
  }

  private async estimateIncomeFromTransactions(): Promise<number> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: transactions, error } = await supabaseAdmin
      .from("transactions")
      .select("amount, date")
      .eq("user_id", this.userId)
      .gte("date", threeMonthsAgo.toISOString())
      .gt("amount", 0);

    if (error) {
      throw new WellnessDataFetchError("transactions", error);
    }

    if (!transactions || transactions.length === 0) {
      return 0; // No income data — will trigger no_income_data violation
    }

    const totalIncome = transactions.reduce(
      (sum: number, t: { amount: number }) => sum + t.amount,
      0,
    );
    const months = Math.max(
      1,
      (Date.now() - threeMonthsAgo.getTime()) / (30 * 24 * 60 * 60 * 1000),
    );
    return totalIncome / months;
  }

  private async getMonthlyDebtPayments(): Promise<number> {
    // `debt_accounts` — NOT `debts` (that table has never existed; see FND
    // report). Columns verified against the live schema 2026-07-31.
    const { data: debts, error } = await supabaseAdmin
      .from("debt_accounts")
      .select("minimum_payment, is_active, balance")
      .eq("user_id", this.userId)
      .eq("is_active", true)
      .gt("balance", 0);

    if (error) {
      throw new WellnessDataFetchError("debt_accounts", error);
    }

    if (!debts || debts.length === 0) {
      return 0;
    }

    return debts.reduce(
      (sum: number, d: { minimum_payment: number }) =>
        sum + (d.minimum_payment || 0),
      0,
    );
  }

  private async checkEmergencyFund(): Promise<boolean> {
    // `financial_goals` — NOT `savings_goals` (that table has never existed).
    // The filter column is `type`, not `category`; the live CHECK constraint
    // (`financial_goals_type_check`) confirms `'emergency_fund'` is a valid
    // value. Verified against the live schema 2026-07-31.
    const { data: goals, error } = await supabaseAdmin
      .from("financial_goals")
      .select("current_amount, target_amount, type")
      .eq("user_id", this.userId)
      .eq("type", "emergency_fund");

    if (error) {
      throw new WellnessDataFetchError("financial_goals", error);
    }

    if (!goals || goals.length === 0) {
      return false;
    }

    // Check if any emergency fund goal is at least 50% funded
    return goals.some(
      (g: { current_amount: number; target_amount: number }) =>
        g.target_amount > 0 && g.current_amount / g.target_amount >= 0.5,
    );
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createWellnessGate(
  userId: string,
  config?: Partial<WellnessGateConfig>,
): WellnessGate {
  return new WellnessGate(userId, config);
}
