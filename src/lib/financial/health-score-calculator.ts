/**
 * Financial Health Score Calculator
 *
 * Calculates a comprehensive 0-100 financial health score based on
 * 5 key categories: Savings, Debt, Spending, Credit, and Insurance.
 *
 * Score Ranges:
 * - 90-100: Excellent (A)
 * - 80-89: Good (B)
 * - 70-79: Fair (C)
 * - 60-69: Poor (D)
 * - 0-59: Critical (F)
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import {
  FinancialHealthScore,
  HealthScoreBreakdown,
  ComponentScore,
  AggregatedAccounts,
  CategorizedTransactions,
  BudgetStatus,
  FinancialGoal,
  DebtAnalysis,
  CreditSummary,
} from "./types/financial-context.types";

// Score weights (must sum to 1.0)
const SCORE_WEIGHTS = {
  savings: 0.25,
  debt: 0.25,
  spending: 0.2,
  credit: 0.2,
  insurance: 0.1,
};

// Thresholds for scoring
const THRESHOLDS = {
  emergencyFundMonths: { excellent: 6, good: 3, fair: 1 },
  savingsRate: { excellent: 20, good: 15, fair: 10 },
  debtToIncome: { excellent: 20, good: 36, fair: 43 },
  creditUtilization: { excellent: 10, good: 30, fair: 50 },
  budgetAdherence: { excellent: 95, good: 85, fair: 70 },
};

interface HealthScoreInput {
  accounts: AggregatedAccounts;
  transactions: CategorizedTransactions;
  budgets: BudgetStatus[];
  goals: FinancialGoal[];
  debts: DebtAnalysis;
  creditProfile: CreditSummary;
}

/**
 * Health Score Calculator Class
 */
export class HealthScoreCalculator {
  /**
   * Calculate comprehensive financial health score
   */
  async calculateScore(input: HealthScoreInput): Promise<FinancialHealthScore> {
    const breakdown: HealthScoreBreakdown = {
      savings: this.calculateSavingsScore(input),
      debt: this.calculateDebtScore(input),
      spending: this.calculateSpendingScore(input),
      credit: this.calculateCreditScore(input),
      insurance: this.calculateInsuranceScore(input),
    };

    // Calculate weighted overall score
    const overallScore = Math.round(
      breakdown.savings.score * SCORE_WEIGHTS.savings +
        breakdown.debt.score * SCORE_WEIGHTS.debt +
        breakdown.spending.score * SCORE_WEIGHTS.spending +
        breakdown.credit.score * SCORE_WEIGHTS.credit +
        breakdown.insurance.score * SCORE_WEIGHTS.insurance,
    );

    return {
      overallScore,
      grade: this.getGrade(overallScore),
      breakdown,
      trend: "stable", // Would compare with historical data
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate savings score (0-100)
   */
  private calculateSavingsScore(input: HealthScoreInput): ComponentScore {
    const factors: string[] = [];
    let score = 50; // Base score

    // Check emergency fund
    const savingsBalance = input.accounts.savings.reduce(
      (sum, a) => sum + a.currentBalance,
      0,
    );
    const monthlyExpenses = input.transactions.totalExpenses || 1;
    const emergencyMonths = savingsBalance / monthlyExpenses;

    if (emergencyMonths >= THRESHOLDS.emergencyFundMonths.excellent) {
      score += 25;
      factors.push("Excellent emergency fund (6+ months)");
    } else if (emergencyMonths >= THRESHOLDS.emergencyFundMonths.good) {
      score += 15;
      factors.push("Good emergency fund (3-6 months)");
    } else if (emergencyMonths >= THRESHOLDS.emergencyFundMonths.fair) {
      score += 5;
      factors.push("Building emergency fund (1-3 months)");
    } else {
      score -= 10;
      factors.push("Low emergency fund (< 1 month)");
    }

    // Check savings rate
    const savingsRate =
      input.transactions.totalIncome > 0
        ? ((input.transactions.totalIncome - input.transactions.totalExpenses) /
            input.transactions.totalIncome) *
          100
        : 0;

    if (savingsRate >= THRESHOLDS.savingsRate.excellent) {
      score += 25;
      factors.push(`Excellent savings rate (${savingsRate.toFixed(1)}%)`);
    } else if (savingsRate >= THRESHOLDS.savingsRate.good) {
      score += 15;
      factors.push(`Good savings rate (${savingsRate.toFixed(1)}%)`);
    } else if (savingsRate >= THRESHOLDS.savingsRate.fair) {
      score += 5;
      factors.push(`Fair savings rate (${savingsRate.toFixed(1)}%)`);
    } else {
      score -= 10;
      factors.push(`Low savings rate (${savingsRate.toFixed(1)}%)`);
    }

    // Check active savings goals
    const activeGoals = input.goals.filter((g) => g.status === "active");
    if (activeGoals.length > 0) {
      score += 10;
      factors.push(`${activeGoals.length} active savings goal(s)`);
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      weight: SCORE_WEIGHTS.savings,
      status: this.getStatus(score),
      factors,
    };
  }

  /**
   * Calculate debt score (0-100)
   */
  private calculateDebtScore(input: HealthScoreInput): ComponentScore {
    const factors: string[] = [];
    let score = 100; // Start high, deduct for debt issues

    const { totalDebt, debtToIncomeRatio, debts } = input.debts;

    // No debt is excellent
    if (totalDebt === 0) {
      factors.push("Debt-free!");
      return {
        score: 100,
        weight: SCORE_WEIGHTS.debt,
        status: "excellent",
        factors,
      };
    }

    // Check debt-to-income ratio
    if (debtToIncomeRatio <= THRESHOLDS.debtToIncome.excellent) {
      factors.push(
        `Low debt-to-income ratio (${debtToIncomeRatio.toFixed(1)}%)`,
      );
    } else if (debtToIncomeRatio <= THRESHOLDS.debtToIncome.good) {
      score -= 20;
      factors.push(
        `Moderate debt-to-income ratio (${debtToIncomeRatio.toFixed(1)}%)`,
      );
    } else if (debtToIncomeRatio <= THRESHOLDS.debtToIncome.fair) {
      score -= 40;
      factors.push(
        `High debt-to-income ratio (${debtToIncomeRatio.toFixed(1)}%)`,
      );
    } else {
      score -= 60;
      factors.push(
        `Very high debt-to-income ratio (${debtToIncomeRatio.toFixed(1)}%)`,
      );
    }

    // Check for high-interest debt
    const highInterestDebts = debts.filter((d) => d.interestRate > 15);
    if (highInterestDebts.length > 0) {
      score -= 10;
      factors.push(
        `${highInterestDebts.length} high-interest debt(s) (>15% APR)`,
      );
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      weight: SCORE_WEIGHTS.debt,
      status: this.getStatus(score),
      factors,
    };
  }

  /**
   * Calculate spending score (0-100)
   */
  private calculateSpendingScore(input: HealthScoreInput): ComponentScore {
    const factors: string[] = [];
    let score = 70; // Base score

    // Check budget adherence
    const budgetsWithSpending = input.budgets.filter(
      (b) => b.budgetedAmount > 0,
    );
    if (budgetsWithSpending.length > 0) {
      const avgAdherence =
        budgetsWithSpending.reduce((sum, b) => {
          const adherence = Math.min(
            100,
            (1 - (b.spentAmount - b.budgetedAmount) / b.budgetedAmount) * 100,
          );
          return sum + adherence;
        }, 0) / budgetsWithSpending.length;

      if (avgAdherence >= THRESHOLDS.budgetAdherence.excellent) {
        score += 20;
        factors.push(
          `Excellent budget adherence (${avgAdherence.toFixed(0)}%)`,
        );
      } else if (avgAdherence >= THRESHOLDS.budgetAdherence.good) {
        score += 10;
        factors.push(`Good budget adherence (${avgAdherence.toFixed(0)}%)`);
      } else if (avgAdherence >= THRESHOLDS.budgetAdherence.fair) {
        factors.push(`Fair budget adherence (${avgAdherence.toFixed(0)}%)`);
      } else {
        score -= 15;
        factors.push(`Poor budget adherence (${avgAdherence.toFixed(0)}%)`);
      }
    } else {
      score -= 10;
      factors.push("No budgets set up");
    }

    // Check for overspending categories
    const overBudgetCount = input.budgets.filter(
      (b) => b.status === "over_budget",
    ).length;
    if (overBudgetCount > 0) {
      score -= overBudgetCount * 5;
      factors.push(`${overBudgetCount} category(ies) over budget`);
    }

    // Check spending vs income ratio
    const spendingRatio =
      input.transactions.totalIncome > 0
        ? (input.transactions.totalExpenses / input.transactions.totalIncome) *
          100
        : 100;

    if (spendingRatio <= 70) {
      score += 10;
      factors.push("Living well below means");
    } else if (spendingRatio <= 90) {
      factors.push("Spending within means");
    } else {
      score -= 20;
      factors.push("Spending exceeds or near income");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      weight: SCORE_WEIGHTS.spending,
      status: this.getStatus(score),
      factors,
    };
  }

  /**
   * Calculate credit score component (0-100)
   */
  private calculateCreditScore(input: HealthScoreInput): ComponentScore {
    const factors: string[] = [];
    const creditScore = input.creditProfile.currentScore;

    // Map credit score to our 0-100 scale
    let score: number;
    if (creditScore >= 800) {
      score = 100;
      factors.push(`Exceptional credit score (${creditScore})`);
    } else if (creditScore >= 740) {
      score = 90;
      factors.push(`Very good credit score (${creditScore})`);
    } else if (creditScore >= 670) {
      score = 75;
      factors.push(`Good credit score (${creditScore})`);
    } else if (creditScore >= 580) {
      score = 55;
      factors.push(`Fair credit score (${creditScore})`);
    } else if (creditScore > 0) {
      score = 30;
      factors.push(`Poor credit score (${creditScore})`);
    } else {
      score = 50; // No credit score available
      factors.push("Credit score not available");
    }

    // Check credit utilization
    const totalCreditLimit = input.accounts.credit.reduce(
      (sum, a) => sum + (a.creditLimit || 0),
      0,
    );
    const totalCreditUsed = input.accounts.credit.reduce(
      (sum, a) => sum + Math.abs(a.currentBalance),
      0,
    );
    const utilization =
      totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

    if (utilization <= THRESHOLDS.creditUtilization.excellent) {
      factors.push(`Excellent credit utilization (${utilization.toFixed(0)}%)`);
    } else if (utilization <= THRESHOLDS.creditUtilization.good) {
      score -= 5;
      factors.push(`Good credit utilization (${utilization.toFixed(0)}%)`);
    } else if (utilization <= THRESHOLDS.creditUtilization.fair) {
      score -= 15;
      factors.push(`High credit utilization (${utilization.toFixed(0)}%)`);
    } else {
      score -= 25;
      factors.push(`Very high credit utilization (${utilization.toFixed(0)}%)`);
    }

    // Check for active disputes
    if (input.creditProfile.activeDisputes > 0) {
      factors.push(`${input.creditProfile.activeDisputes} active dispute(s)`);
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      weight: SCORE_WEIGHTS.credit,
      status: this.getStatus(score),
      factors,
    };
  }

  /**
   * Calculate insurance score (0-100)
   * Note: This is a simplified version - would need insurance data integration
   */
  private calculateInsuranceScore(_input: HealthScoreInput): ComponentScore {
    // Placeholder - would need actual insurance data
    return {
      score: 70,
      weight: SCORE_WEIGHTS.insurance,
      status: "fair",
      factors: ["Insurance coverage not yet tracked"],
    };
  }

  /**
   * Get letter grade from score
   */
  private getGrade(score: number): "A" | "B" | "C" | "D" | "F" {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  /**
   * Get status from score
   */
  private getStatus(score: number): ComponentScore["status"] {
    if (score >= 90) return "excellent";
    if (score >= 75) return "good";
    if (score >= 60) return "fair";
    if (score >= 40) return "poor";
    return "critical";
  }

  /**
   * Save health score to database
   */
  async saveScore(userId: string, score: FinancialHealthScore): Promise<void> {
    await supabase.from("financial_health_scores").insert({
      user_id: userId,
      overall_score: score.overallScore,
      savings_score: score.breakdown.savings.score,
      debt_score: score.breakdown.debt.score,
      spending_score: score.breakdown.spending.score,
      credit_score_component: score.breakdown.credit.score,
      insurance_score: score.breakdown.insurance.score,
      breakdown: score.breakdown,
      recommendations: [],
      calculated_at: score.calculatedAt.toISOString(),
    });
  }

  /**
   * Get historical scores for trend analysis
   */
  async getHistoricalScores(
    userId: string,
    days = 30,
  ): Promise<FinancialHealthScore[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from("financial_health_scores")
      .select("*")
      .eq("user_id", userId)
      .gte("calculated_at", startDate.toISOString())
      .order("calculated_at", { ascending: true });

    return (data || []).map((d) => ({
      overallScore: d.overall_score,
      grade: this.getGrade(d.overall_score),
      breakdown: d.breakdown as HealthScoreBreakdown,
      trend: "stable",
      calculatedAt: new Date(d.calculated_at),
    }));
  }
}

// Export singleton instance
export const healthScoreCalculator = new HealthScoreCalculator();
export default healthScoreCalculator;
