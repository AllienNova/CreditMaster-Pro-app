/**
 * Fynvita Financial Vitality Score Service
 *
 * Unifies credit score, spending health, savings rate, debt management,
 * and investment performance into a single holistic financial health score.
 *
 * HONESTY CONTRACT (de-mock, Wave 7 radical-honesty pass):
 * Every component score is computed from REAL per-user data pulled from the
 * app's existing services — never hardcoded. Where a component (or a factor
 * within it) has no real data source in the current schema, it is NOT
 * fabricated:
 *   - A component with no real data for the user is marked `available: false`
 *     and EXCLUDED from the weighted overall, which is renormalized over the
 *     components that do have real data.
 *   - A factor with no observable source (e.g. per-account APRs, credit-bureau
 *     utilization) is left `null` in the details and dropped from that
 *     component's sub-score (the remaining real factors are renormalized).
 *   - `percentile` requires cross-user benchmark data we do not have, so it is
 *     always `null` — never a mock number.
 *   - When no component has real data, `overall` (and `grade`) are `null` so
 *     callers can honestly empty-state instead of showing a laundered number.
 *
 * The scoring band formulas are unchanged; only the inputs became real.
 */

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  financialService,
  type FinancialDashboard,
  type FinancialGoal,
  type Budget,
} from "./financial-service";
import {
  creditMonitoringService,
  type CreditMonitoringDashboard,
} from "@/lib/credit-monitoring/credit-monitoring-service";
import {
  portfolioService,
  type Portfolio,
  type PortfolioHolding,
} from "@/lib/investments/portfolio-service";

// ============================================================================
// Types
// ============================================================================

export type VitalityGrade = "A" | "B" | "C" | "D" | "F";
export type TrendDirection = "improving" | "stable" | "declining";

export interface ComponentScore<T = Record<string, unknown>> {
  score: number; // 0-100
  weight: number; // 0-1 (nominal design weight; excluded when !available)
  /** True when this component was computed from real per-user data. */
  available: boolean;
  grade: VitalityGrade | null; // null when !available (unknown, not "F")
  trend: TrendDirection;
  details: T;
}

/**
 * Credit factors. `currentScore` / `scoreChange` come from the credit
 * monitoring service (credit_scores). The remaining FICO sub-factors
 * (utilization, payment history, account age/mix) are computed by the bureaus
 * and are NOT exposed in our schema, so they stay `null` rather than fabricated.
 */
export interface CreditDetails {
  currentScore: number | null;
  scoreChange: number | null;
  utilizationRate: number | null;
  paymentHistory: number | null;
  accountAge: number | null;
  accountMix: number | null;
}

export interface SpendingDetails {
  budgetAdherence: number | null; // null when the user has no budgets
  savingsRate: number | null;
  necessaryVsDiscretionary: number | null; // ratio, null when no categorized spend
  monthlyTrend: number | null; // %, null when < 2 months of data
}

export interface SavingsDetails {
  emergencyFundMonths: number | null; // null when monthlyExpenses is 0
  savingsRate: number | null;
  totalSavings: number | null; // liquid (depository) balances
  savingsGoalProgress: number | null; // null when no savings/emergency goal
}

/**
 * Debt factors. The vitality debt formula scores monthly debt-to-income,
 * high-interest balances, and payoff progress — all of which require data
 * (monthly minimum payments, per-account APRs, a historical debt baseline)
 * that the current schema does not carry. Total liabilities alone cannot
 * honestly drive that formula, so the debt component is always `available:
 * false`. `totalDebt` is still surfaced (real, informational) for transparency.
 */
export interface DebtDetails {
  debtToIncomeRatio: number | null;
  totalDebt: number | null;
  monthlyPayments: number | null;
  payoffProgress: number | null;
  highInterestDebt: number | null;
}

export interface InvestmentDetails {
  portfolioValue: number | null;
  ytdReturn: number | null; // real aggregate (lifetime) gain/loss %
  diversificationScore: number | null; // 0-100, sector-concentration based
  riskAdjustedReturn: number | null; // null: needs volatility/beta we don't track
  contributionRate: number | null; // null: needs contribution history we don't track
}

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  estimatedPoints: number;
  category: "credit" | "spending" | "savings" | "debt" | "investments";
  actionUrl?: string;
}

export interface Milestone {
  target: number;
  description: string;
  reward?: string;
}

export interface FinancialVitalityScore {
  overall: number | null; // null when no component has real data
  grade: VitalityGrade | null; // null when overall is null
  percentile: number | null; // always null — no cross-user benchmark data
  components: {
    credit: ComponentScore<CreditDetails>;
    spending: ComponentScore<SpendingDetails>;
    savings: ComponentScore<SavingsDetails>;
    debt: ComponentScore<DebtDetails>;
    investments: ComponentScore<InvestmentDetails>;
  };
  trend: TrendDirection;
  trendPercentage: number;
  quickWins: QuickWin[];
  nextMilestone: Milestone;
  lastUpdated: Date;
}

export interface VitalityScoreHistory {
  date: Date;
  overall: number;
  // Component snapshots are `null` when the component had no real data at that
  // snapshot — never a fabricated 0. (Only `overall` is guaranteed real: history
  // is written only when a real overall exists.)
  credit: number | null;
  spending: number | null;
  savings: number | null;
  debt: number | null;
  investments: number | null;
}

/** Internal per-component result (weight is attached at assembly time). */
interface ComponentResult<T> {
  available: boolean;
  score: number;
  grade: VitalityGrade | null;
  trend: TrendDirection;
  details: T;
}

/** A weighted factor: `points` in [0, weight]. Only real factors are included. */
interface ScoreFactor {
  weight: number;
  points: number;
}

// ============================================================================
// Constants
// ============================================================================

const COMPONENT_WEIGHTS = {
  credit: 0.25,
  spending: 0.2,
  savings: 0.2,
  debt: 0.2,
  investments: 0.15,
};

const GRADE_THRESHOLDS: { min: number; grade: VitalityGrade }[] = [
  { min: 90, grade: "A" },
  { min: 80, grade: "B" },
  { min: 70, grade: "C" },
  { min: 60, grade: "D" },
  { min: 0, grade: "F" },
];

// FICO range used to normalize a real credit score to 0-100.
const FICO_MIN = 300;
const FICO_MAX = 850;

/**
 * Keyword match for classifying real spending categories as "necessary".
 * A documented heuristic over the user's real Plaid categories — everything
 * not matched is treated as discretionary. Not a per-user fabrication.
 */
const NECESSARY_CATEGORY_KEYWORDS = [
  "rent",
  "mortgage",
  "utilit",
  "health",
  "medical",
  "insurance",
  "grocer",
  "transport",
  "gas",
  "fuel",
  "loan",
  "debt",
  "tax",
  "childcare",
  "education",
  "tuition",
];

const EMPTY_CREDIT_DETAILS: CreditDetails = {
  currentScore: null,
  scoreChange: null,
  utilizationRate: null,
  paymentHistory: null,
  accountAge: null,
  accountMix: null,
};

const EMPTY_SPENDING_DETAILS: SpendingDetails = {
  budgetAdherence: null,
  savingsRate: null,
  necessaryVsDiscretionary: null,
  monthlyTrend: null,
};

const EMPTY_SAVINGS_DETAILS: SavingsDetails = {
  emergencyFundMonths: null,
  savingsRate: null,
  totalSavings: null,
  savingsGoalProgress: null,
};

const EMPTY_INVESTMENT_DETAILS: InvestmentDetails = {
  portfolioValue: null,
  ytdReturn: null,
  diversificationScore: null,
  riskAdjustedReturn: null,
  contributionRate: null,
};

// ============================================================================
// Small numeric helpers
// ============================================================================

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function round(value: number): number {
  return Math.round(value);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Combine real factors into a 0-100 score, renormalizing over whatever factors
 * are present. When every original factor for a component is present with full
 * points this returns the same scale as the original formula; when only some
 * factors have real data the score is renormalized over those.
 */
function scoreFromFactors(factors: ScoreFactor[]): number {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight === 0) return 0;
  const totalPoints = factors.reduce((sum, f) => sum + f.points, 0);
  return Math.round((totalPoints / totalWeight) * 100);
}

// ============================================================================
// Financial Vitality Score Service
// ============================================================================

class FinancialVitalityScoreService {
  /**
   * Calculate the complete Financial Vitality Score from real per-user data.
   */
  async calculateVitalityScore(
    userId: string,
  ): Promise<FinancialVitalityScore> {
    // Fetch every real data source in parallel. A failed/empty source degrades
    // the corresponding component to `available: false` (honest exclusion) —
    // it never fabricates a value or fails the whole score.
    const [dashboard, creditDash, portfolios, goals, budgets] =
      await Promise.all([
        financialService
          .getFinancialDashboard(userId)
          .catch((error) => {
            console.error("[vitality] financial dashboard unavailable:", error);
            return null;
          }),
        creditMonitoringService
          .getMonitoringDashboard(userId)
          .catch((error) => {
            console.error("[vitality] credit dashboard unavailable:", error);
            return null;
          }),
        portfolioService.getUserPortfolios(userId).catch((error) => {
          console.error("[vitality] portfolios unavailable:", error);
          return [] as Portfolio[];
        }),
        financialService.getFinancialGoals(userId).catch((error) => {
          console.error("[vitality] financial goals unavailable:", error);
          return [] as FinancialGoal[];
        }),
        financialService.getBudgets(userId).catch((error) => {
          console.error("[vitality] budgets unavailable:", error);
          return [] as Budget[];
        }),
      ]);

    // Pure, deterministic component calculators over the fetched real data.
    const credit = this.calculateCreditScore(creditDash);
    const spending = this.calculateSpendingScore(dashboard, budgets);
    const savings = this.calculateSavingsScore(dashboard, goals);
    const debt = this.calculateDebtScore(dashboard);
    const investments = this.calculateInvestmentsScore(portfolios);

    // Weighted overall, renormalized over only the components with real data.
    const weighted: { score: number; available: boolean; weight: number }[] = [
      { score: credit.score, available: credit.available, weight: COMPONENT_WEIGHTS.credit },
      { score: spending.score, available: spending.available, weight: COMPONENT_WEIGHTS.spending },
      { score: savings.score, available: savings.available, weight: COMPONENT_WEIGHTS.savings },
      { score: debt.score, available: debt.available, weight: COMPONENT_WEIGHTS.debt },
      { score: investments.score, available: investments.available, weight: COMPONENT_WEIGHTS.investments },
    ];
    const availableWeighted = weighted.filter((c) => c.available);
    const totalAvailableWeight = availableWeighted.reduce(
      (sum, c) => sum + c.weight,
      0,
    );
    const overall =
      totalAvailableWeight > 0
        ? Math.round(
            availableWeighted.reduce(
              (sum, c) => sum + c.score * c.weight,
              0,
            ) / totalAvailableWeight,
          )
        : null;

    const grade = overall !== null ? this.getGrade(overall) : null;

    // Trend from stored history (real). Stable/0 until 2+ points exist.
    const history = await this.getScoreHistory(userId, 30);
    const trend = this.calculateTrend(history);
    const trendPercentage = this.calculateTrendPercentage(history);

    // Percentile needs cross-user benchmark data we do not have.
    const percentile = null;

    const quickWins = this.generateQuickWins({
      credit,
      spending,
      savings,
      debt,
      investments,
    });

    const nextMilestone = this.getNextMilestone(overall ?? 0);

    // Only record history when there is a real overall score to record.
    // Unavailable components are persisted as `null` (never a fabricated 0) so
    // the history table never accumulates laundered zeros; the live score
    // carries the authoritative `available` flag per component. The write is
    // best-effort — its failure is logged and swallowed so it can never discard
    // the already-computed real overall (which the route's catch-all would
    // otherwise surface as a laundered healthScore: 0).
    if (overall !== null) {
      await this.saveScoreToHistory(userId, {
        overall,
        credit: credit.available ? credit.score : null,
        spending: spending.available ? spending.score : null,
        savings: savings.available ? savings.score : null,
        debt: debt.available ? debt.score : null,
        investments: investments.available ? investments.score : null,
      }).catch((error) => {
        console.error("[vitality] score history write failed:", error);
      });
    }

    return {
      overall,
      grade,
      percentile,
      components: {
        credit: { ...credit, weight: COMPONENT_WEIGHTS.credit },
        spending: { ...spending, weight: COMPONENT_WEIGHTS.spending },
        savings: { ...savings, weight: COMPONENT_WEIGHTS.savings },
        debt: { ...debt, weight: COMPONENT_WEIGHTS.debt },
        investments: {
          ...investments,
          weight: COMPONENT_WEIGHTS.investments,
        },
      },
      trend,
      trendPercentage,
      quickWins,
      nextMilestone,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get vitality score history
   */
  async getScoreHistory(
    userId: string,
    days: number = 30,
  ): Promise<VitalityScoreHistory[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("vitality_score_history")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .order("date", { ascending: true });

    if (error) {
      // Error logged
      return [];
    }

    return (data || []).map(
      (row: {
        date: string;
        overall: number;
        credit: number | null;
        spending: number | null;
        savings: number | null;
        debt: number | null;
        investments: number | null;
      }) => ({
        date: new Date(row.date),
        overall: row.overall,
        credit: row.credit,
        spending: row.spending,
        savings: row.savings,
        debt: row.debt,
        investments: row.investments,
      }),
    );
  }

  /**
   * Calculate credit component score from the real credit monitoring dashboard.
   *
   * The FICO score already encapsulates utilization, payment history, and
   * account age/mix (the bureaus compute it from them); those sub-factors are
   * not in our schema, so the credit component is scored on the real,
   * normalized FICO score alone rather than fabricating them.
   */
  private calculateCreditScore(
    creditDash: CreditMonitoringDashboard | null,
  ): ComponentResult<CreditDetails> {
    const averageScore = creditDash?.averageScore ?? 0;
    const scoreChange = creditDash?.scoreChange30Days ?? 0;

    if (!creditDash || averageScore <= 0) {
      return {
        available: false,
        score: 0,
        grade: null,
        trend: "stable",
        details: EMPTY_CREDIT_DETAILS,
      };
    }

    // Standard linear normalization of a FICO score (300-850) to 0-100.
    const score = clampScore(
      round(((averageScore - FICO_MIN) / (FICO_MAX - FICO_MIN)) * 100),
    );

    const trend: TrendDirection =
      scoreChange > 0 ? "improving" : scoreChange < 0 ? "declining" : "stable";

    return {
      available: true,
      score,
      grade: this.getGrade(score),
      trend,
      details: {
        currentScore: averageScore,
        scoreChange,
        utilizationRate: null,
        paymentHistory: null,
        accountAge: null,
        accountMix: null,
      },
    };
  }

  /**
   * Calculate spending component score from the real financial dashboard
   * (savings rate, month-over-month trend, category mix) and budgets.
   */
  private calculateSpendingScore(
    dashboard: FinancialDashboard | null,
    budgets: Budget[],
  ): ComponentResult<SpendingDetails> {
    if (
      !dashboard ||
      (dashboard.monthlyIncome <= 0 && dashboard.monthlyExpenses <= 0)
    ) {
      return {
        available: false,
        score: 0,
        grade: null,
        trend: "stable",
        details: EMPTY_SPENDING_DETAILS,
      };
    }

    // Savings rate is real only when income is observable. financial-service
    // emits a sentinel 0 when monthlyIncome <= 0 (unknown), indistinguishable
    // from a real 0% rate — so treat unobservable income as null and drop the
    // factor (renormalize) rather than scoring "unknown" as the worst band.
    const savingsRate =
      dashboard.monthlyIncome > 0 ? dashboard.savingsRate : null;
    const necessaryRatio = this.necessaryVsDiscretionaryRatio(
      dashboard.spendingByCategory,
    );
    const monthlyTrendPct = this.monthOverMonthExpenseChange(
      dashboard.monthlyTrend,
    );
    const budgetAdherence = this.computeBudgetAdherence(budgets);

    const factors: ScoreFactor[] = [];

    // Savings rate (weight 30) — real only when income is observable.
    if (savingsRate !== null) {
      factors.push({
        weight: 30,
        points: this.savingsRateSpendingBand(savingsRate),
      });
    }

    // Necessary vs discretionary (weight 20) — real when there is categorized spend.
    if (necessaryRatio !== null) {
      factors.push({ weight: 20, points: this.necessaryBand(necessaryRatio) });
    }

    // Month-over-month trend (weight 10) — real with 2+ months of data.
    if (monthlyTrendPct !== null) {
      factors.push({ weight: 10, points: this.trendBand(monthlyTrendPct) });
    }

    // Budget adherence (weight 40) — real only when the user has budgets.
    if (budgetAdherence !== null) {
      factors.push({ weight: 40, points: (budgetAdherence / 100) * 40 });
    }

    // No real scorable factor remains → honest unavailable, never a coerced 0.
    if (factors.length === 0) {
      return {
        available: false,
        score: 0,
        grade: null,
        trend: "stable",
        details: EMPTY_SPENDING_DETAILS,
      };
    }

    const score = scoreFromFactors(factors);

    const trend: TrendDirection =
      monthlyTrendPct === null
        ? "stable"
        : monthlyTrendPct < 0
          ? "improving"
          : monthlyTrendPct > 5
            ? "declining"
            : "stable";

    return {
      available: true,
      score,
      grade: this.getGrade(score),
      trend,
      details: {
        budgetAdherence:
          budgetAdherence !== null ? round(budgetAdherence) : null,
        savingsRate: savingsRate !== null ? round(savingsRate) : null,
        necessaryVsDiscretionary:
          necessaryRatio !== null ? round2(necessaryRatio) : null,
        monthlyTrend: monthlyTrendPct !== null ? round(monthlyTrendPct) : null,
      },
    };
  }

  /**
   * Calculate savings component score from real liquid balances, savings rate,
   * and savings/emergency-fund goal progress.
   */
  private calculateSavingsScore(
    dashboard: FinancialDashboard | null,
    goals: FinancialGoal[],
  ): ComponentResult<SavingsDetails> {
    if (!dashboard || dashboard.accounts.length === 0) {
      return {
        available: false,
        score: 0,
        grade: null,
        trend: "stable",
        details: EMPTY_SAVINGS_DETAILS,
      };
    }

    const liquidSavings = dashboard.accounts
      .filter((a) => a.accountType === "depository")
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const monthlyExpenses = dashboard.monthlyExpenses;
    const emergencyFundMonths =
      monthlyExpenses > 0 ? liquidSavings / monthlyExpenses : null;

    // Savings rate is real only when income is observable (see the spending
    // note); an unobservable-income sentinel 0 is treated as null and dropped.
    const savingsRate =
      dashboard.monthlyIncome > 0 ? dashboard.savingsRate : null;

    const goal =
      goals.find((g) => g.type === "emergency_fund") ??
      goals.find((g) => g.type === "savings");
    const savingsGoalProgress = goal ? goal.progress : null;

    const factors: ScoreFactor[] = [];

    if (emergencyFundMonths !== null) {
      factors.push({
        weight: 40,
        points: this.emergencyFundBand(emergencyFundMonths),
      });
    }

    if (savingsRate !== null) {
      factors.push({
        weight: 35,
        points: this.savingsRateSavingsBand(savingsRate),
      });
    }

    if (savingsGoalProgress !== null) {
      factors.push({
        weight: 25,
        points: (clampScore(savingsGoalProgress) / 100) * 25,
      });
    }

    // No real scorable factor remains → honest unavailable. The real liquid
    // balance is still surfaced (informational), mirroring debt's totalDebt.
    if (factors.length === 0) {
      return {
        available: false,
        score: 0,
        grade: null,
        trend: "stable",
        details: {
          emergencyFundMonths: null,
          savingsRate: null,
          totalSavings: round(liquidSavings),
          savingsGoalProgress: null,
        },
      };
    }

    const score = scoreFromFactors(factors);

    const trend: TrendDirection =
      savingsRate === null
        ? "stable"
        : savingsRate >= 15
          ? "improving"
          : savingsRate >= 10
            ? "stable"
            : "declining";

    return {
      available: true,
      score,
      grade: this.getGrade(score),
      trend,
      details: {
        emergencyFundMonths:
          emergencyFundMonths !== null ? round1(emergencyFundMonths) : null,
        savingsRate: savingsRate !== null ? round(savingsRate) : null,
        totalSavings: round(liquidSavings),
        savingsGoalProgress:
          savingsGoalProgress !== null ? round(savingsGoalProgress) : null,
      },
    };
  }

  /**
   * Debt component. The scoring factors (monthly debt-to-income, high-interest
   * balances, payoff progress) all require data the current schema does not
   * carry (monthly minimum payments, per-account APRs, a historical baseline).
   * Total liabilities alone cannot honestly drive that formula, so debt is
   * always excluded from the overall. `totalDebt` is surfaced for transparency.
   */
  private calculateDebtScore(
    dashboard: FinancialDashboard | null,
  ): ComponentResult<DebtDetails> {
    const totalDebt = dashboard ? round(dashboard.totalLiabilities) : null;

    return {
      available: false,
      score: 0,
      grade: null,
      trend: "stable",
      details: {
        debtToIncomeRatio: null,
        totalDebt,
        monthlyPayments: null,
        payoffProgress: null,
        highInterestDebt: null,
      },
    };
  }

  /**
   * Calculate investments component score from real portfolio holdings
   * (aggregate return + sector-concentration diversification). Contribution
   * rate and risk-adjusted return require data we don't track and stay null.
   */
  private calculateInvestmentsScore(
    portfolios: Portfolio[],
  ): ComponentResult<InvestmentDetails> {
    const allHoldings = portfolios.flatMap((p) => p.holdings);
    const portfolioValue = portfolios.reduce(
      (sum, p) => sum + (p.totalValue || 0),
      0,
    );

    if (portfolioValue <= 0 && allHoldings.length === 0) {
      return {
        available: false,
        score: 0,
        grade: null,
        trend: "stable",
        details: EMPTY_INVESTMENT_DETAILS,
      };
    }

    const totalCostBasis = portfolios.reduce(
      (sum, p) => sum + (p.totalCostBasis || 0),
      0,
    );
    const totalGainLoss = portfolios.reduce(
      (sum, p) => sum + (p.totalGainLoss || 0),
      0,
    );
    // Return % is real only with a known cost basis. When cost basis is missing
    // (holdings without a purchase price), the return is unknowable — leave it
    // null and DROP the performance factor (renormalize), rather than scoring an
    // unknowable return as a real 0% (which the band would reward as ~mid).
    const returnPct =
      totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : null;

    const diversificationScore = this.diversificationFromHoldings(allHoldings);

    const factors: ScoreFactor[] = [
      { weight: 30, points: (diversificationScore / 100) * 30 },
    ];
    if (returnPct !== null) {
      factors.push({ weight: 25, points: this.performanceBand(returnPct) });
    }

    const score = scoreFromFactors(factors);

    const trend: TrendDirection =
      returnPct === null
        ? "stable"
        : returnPct > 5
          ? "improving"
          : returnPct > 0
            ? "stable"
            : "declining";

    return {
      available: true,
      score,
      grade: this.getGrade(score),
      trend,
      details: {
        portfolioValue: round(portfolioValue),
        ytdReturn: returnPct !== null ? round1(returnPct) : null,
        diversificationScore,
        riskAdjustedReturn: null,
        contributionRate: null,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Factor helpers (bands preserved from the original formula)
  // --------------------------------------------------------------------------

  /** Savings-rate band as used by the spending component (weight 30). */
  private savingsRateSpendingBand(rate: number): number {
    if (rate >= 20) return 30;
    if (rate >= 15) return 25;
    if (rate >= 10) return 20;
    if (rate >= 5) return 10;
    return 5;
  }

  /** Savings-rate band as used by the savings component (weight 35). */
  private savingsRateSavingsBand(rate: number): number {
    if (rate >= 20) return 35;
    if (rate >= 15) return 28;
    if (rate >= 10) return 20;
    return 10;
  }

  private necessaryBand(ratio: number): number {
    if (ratio >= 0.7) return 20;
    if (ratio >= 0.5) return 15;
    return 10;
  }

  private trendBand(monthlyTrend: number): number {
    if (monthlyTrend < 0) return 10;
    if (monthlyTrend < 5) return 7;
    return 3;
  }

  private emergencyFundBand(months: number): number {
    if (months >= 6) return 40;
    if (months >= 3) return 30;
    if (months >= 1) return 15;
    return 5;
  }

  private performanceBand(returnPct: number): number {
    if (returnPct >= 10) return 25;
    if (returnPct >= 5) return 20;
    if (returnPct >= 0) return 15;
    return 5;
  }

  /**
   * Ratio of necessary spend to total spend, from real category amounts.
   * Returns null when there is no categorized spending to analyze.
   */
  private necessaryVsDiscretionaryRatio(
    categories: FinancialDashboard["spendingByCategory"],
  ): number | null {
    const total = categories.reduce((sum, c) => sum + c.amount, 0);
    if (total <= 0) return null;
    const necessary = categories
      .filter((c) => this.isNecessaryCategory(c.category))
      .reduce((sum, c) => sum + c.amount, 0);
    return necessary / total;
  }

  private isNecessaryCategory(category: string): boolean {
    const lower = category.toLowerCase();
    return NECESSARY_CATEGORY_KEYWORDS.some((k) => lower.includes(k));
  }

  /**
   * Month-over-month expense change (%), from the real monthly trend series.
   * Negative = spending decreased. Returns null with < 2 months of data.
   */
  private monthOverMonthExpenseChange(
    trend: FinancialDashboard["monthlyTrend"],
  ): number | null {
    const withData = trend.filter((t) => t.expenses > 0);
    if (withData.length < 2) return null;
    const previous = withData[withData.length - 2].expenses;
    const current = withData[withData.length - 1].expenses;
    if (previous <= 0) return null;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Average budget adherence (%) across the user's real budgets. Returns null
   * when the user has no budgets (so the factor is dropped, not fabricated).
   */
  private computeBudgetAdherence(budgets: Budget[]): number | null {
    const scored = budgets
      .filter((b) => b.amount > 0)
      .map((b) => (b.spent <= b.amount ? 100 : (b.amount / b.spent) * 100));
    if (scored.length === 0) return null;
    return scored.reduce((sum, v) => sum + v, 0) / scored.length;
  }

  /**
   * Sector-concentration diversification (0-100) from real holdings using a
   * Herfindahl-Hirschman index: a single sector scores 0, evenly-spread
   * holdings across many sectors approach 100.
   */
  private diversificationFromHoldings(holdings: PortfolioHolding[]): number {
    const total = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
    if (total <= 0) return 0;

    const bySector = new Map<string, number>();
    for (const h of holdings) {
      const key = (h.sector || h.assetClass || "Unknown").toString();
      bySector.set(key, (bySector.get(key) || 0) + (h.currentValue || 0));
    }

    let hhi = 0;
    for (const value of bySector.values()) {
      const share = value / total;
      hhi += share * share;
    }

    return clampScore(round((1 - hhi) * 100));
  }

  /**
   * Generate quick wins based on component scores. Only fires on real,
   * observable data — a null (unknown) detail never triggers a claim.
   */
  private generateQuickWins(components: {
    credit: ComponentResult<CreditDetails>;
    spending: ComponentResult<SpendingDetails>;
    savings: ComponentResult<SavingsDetails>;
    debt: ComponentResult<DebtDetails>;
    investments: ComponentResult<InvestmentDetails>;
  }): QuickWin[] {
    const quickWins: QuickWin[] = [];

    const { utilizationRate } = components.credit.details;
    if (utilizationRate !== null && utilizationRate > 30) {
      quickWins.push({
        id: "lower-utilization",
        title: "Lower Credit Utilization",
        description: "Pay down credit card balances to below 30% utilization",
        impact: "high",
        estimatedPoints: 5,
        category: "credit",
        actionUrl: "/dashboard/credit",
      });
    }

    const { emergencyFundMonths } = components.savings.details;
    if (emergencyFundMonths !== null && emergencyFundMonths < 3) {
      quickWins.push({
        id: "emergency-fund",
        title: "Build Emergency Fund",
        description: "Save 3 months of expenses for emergencies",
        impact: "high",
        estimatedPoints: 8,
        category: "savings",
        actionUrl: "/dashboard/savings",
      });
    }

    const { highInterestDebt } = components.debt.details;
    if (highInterestDebt !== null && highInterestDebt > 0) {
      quickWins.push({
        id: "pay-high-interest",
        title: "Pay Off High-Interest Debt",
        description: "Focus on paying down high-interest credit cards first",
        impact: "high",
        estimatedPoints: 6,
        category: "debt",
        actionUrl: "/dashboard/debt",
      });
    }

    const { contributionRate } = components.investments.details;
    if (contributionRate !== null && contributionRate < 15) {
      quickWins.push({
        id: "increase-contributions",
        title: "Increase Investment Contributions",
        description: "Try to save at least 15% of income for retirement",
        impact: "medium",
        estimatedPoints: 4,
        category: "investments",
        actionUrl: "/dashboard/investments",
      });
    }

    const { budgetAdherence } = components.spending.details;
    if (budgetAdherence !== null && budgetAdherence < 80) {
      quickWins.push({
        id: "track-spending",
        title: "Stick to Your Budget",
        description: "Review and adjust your budget categories",
        impact: "medium",
        estimatedPoints: 3,
        category: "spending",
        actionUrl: "/dashboard/spending",
      });
    }

    return quickWins.slice(0, 5); // Return top 5
  }

  /**
   * Get the next milestone
   */
  private getNextMilestone(currentScore: number): Milestone {
    const milestones = [
      {
        target: 60,
        description: "Financial Starter",
        reward: "Basic financial health achieved",
      },
      {
        target: 70,
        description: "Financial Foundational",
        reward: "Solid financial footing",
      },
      {
        target: 80,
        description: "Financial Fit",
        reward: "Above average financial health",
      },
      {
        target: 90,
        description: "Financial Champion",
        reward: "Excellent financial wellness",
      },
      {
        target: 100,
        description: "Financial Master",
        reward: "Peak financial vitality",
      },
    ];

    for (const milestone of milestones) {
      if (currentScore < milestone.target) {
        return milestone;
      }
    }

    return milestones[milestones.length - 1];
  }

  /**
   * Calculate trend from history
   */
  private calculateTrend(history: VitalityScoreHistory[]): TrendDirection {
    if (history.length < 2) return "stable";

    const recent = history.slice(-7);
    const older = history.slice(-14, -7);

    if (recent.length === 0 || older.length === 0) return "stable";

    const recentAvg =
      recent.reduce((sum, h) => sum + h.overall, 0) / recent.length;
    const olderAvg =
      older.reduce((sum, h) => sum + h.overall, 0) / older.length;

    const diff = recentAvg - olderAvg;

    if (diff > 2) return "improving";
    if (diff < -2) return "declining";
    return "stable";
  }

  /**
   * Calculate trend percentage
   */
  private calculateTrendPercentage(history: VitalityScoreHistory[]): number {
    if (history.length < 2) return 0;

    const first = history[0].overall;
    const last = history[history.length - 1].overall;

    if (first === 0) return 0;

    return Math.round(((last - first) / first) * 100);
  }

  /**
   * Get grade from score
   */
  private getGrade(score: number): VitalityGrade {
    for (const threshold of GRADE_THRESHOLDS) {
      if (score >= threshold.min) {
        return threshold.grade;
      }
    }
    return "F";
  }

  /**
   * Save score to history
   */
  private async saveScoreToHistory(
    userId: string,
    scores: {
      overall: number;
      credit: number | null;
      spending: number | null;
      savings: number | null;
      debt: number | null;
      investments: number | null;
    },
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const today = new Date().toISOString().split("T")[0];

    // Upsert to avoid duplicates for same day
    await supabase.from("vitality_score_history").upsert(
      {
        user_id: userId,
        date: today,
        ...scores,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,date",
      },
    );
  }
}

// Export singleton instance
export const vitalityScoreService = new FinancialVitalityScoreService();
export default vitalityScoreService;
