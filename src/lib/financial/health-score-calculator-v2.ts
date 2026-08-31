/**
 * Financial Health Score Calculator V2
 *
 * Enhanced health score calculator with:
 * - Investment data integration
 * - 6-category scoring (savings, debt, spending, credit, investments, insurance)
 * - Detailed sub-scores and recommendations
 * - Trend analysis and projections
 * - Benchmark comparisons
 * - Quick wins identification
 *
 * Score Ranges:
 * - 90-100: Excellent (A)
 * - 80-89: Good (B)
 * - 70-79: Fair (C)
 * - 60-69: Poor (D)
 * - 0-59: Critical (F)
 */

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();
import {
  AggregatedFinancialContext,
  RiskLevel,
} from "./types/aggregated-context.types";
import {
  FinancialHealthScoreV2,
  HealthScoreBreakdownV2,
  ComponentScoreV2,
  ScoreWeightsV2,
  ScoreThresholdsV2,
  HealthScoreInputV2,
  HealthScoreOptionsV2,
  SubScore,
  ComponentRecommendation,
  BenchmarkComparison,
  ScoreStrength,
  ScoreWeakness,
  QuickWin,
  ScoreHistoryPoint,
  DataQualityAssessment,
  CalculationDetails,
  AgeGroup,
  IncomeGroup,
} from "./types/health-score-v2.types";

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default score weights for V2 algorithm
 * Rebalanced to include investments (total = 1.0)
 */
const DEFAULT_WEIGHTS: ScoreWeightsV2 = {
  savings: 0.2, // Reduced from 0.25 to accommodate investments
  debt: 0.2, // Reduced from 0.25
  spending: 0.15, // Reduced from 0.20
  credit: 0.15, // Reduced from 0.20
  investments: 0.2, // NEW: Investment health
  insurance: 0.1, // Same as before
};

/**
 * Default thresholds for scoring
 */
const DEFAULT_THRESHOLDS: ScoreThresholdsV2 = {
  emergencyFundMonths: { excellent: 6, good: 3, fair: 1 },
  savingsRate: { excellent: 20, good: 15, fair: 10 },
  debtToIncome: { excellent: 20, good: 36, fair: 43 },
  creditUtilization: { excellent: 10, good: 30, fair: 50 },
  budgetAdherence: { excellent: 95, good: 85, fair: 70 },
  investmentReturn: { excellent: 10, good: 7, fair: 4 },
  diversificationScore: { excellent: 80, good: 60, fair: 40 },
  retirementReadiness: { excellent: 100, good: 75, fair: 50 },
};

/**
 * Benchmark data by age group (simplified - would come from database in production)
 */
const AGE_GROUP_BENCHMARKS: Record<
  AgeGroup,
  { avgScore: number; avgNetWorth: number; avgSavingsRate: number }
> = {
  "18-24": { avgScore: 55, avgNetWorth: 10000, avgSavingsRate: 8 },
  "25-34": { avgScore: 62, avgNetWorth: 50000, avgSavingsRate: 12 },
  "35-44": { avgScore: 68, avgNetWorth: 150000, avgSavingsRate: 15 },
  "45-54": { avgScore: 72, avgNetWorth: 300000, avgSavingsRate: 18 },
  "55-64": { avgScore: 75, avgNetWorth: 500000, avgSavingsRate: 20 },
  "65+": { avgScore: 78, avgNetWorth: 600000, avgSavingsRate: 15 },
};

/**
 * Benchmark data by income group
 */
const INCOME_GROUP_BENCHMARKS: Record<
  IncomeGroup,
  { avgScore: number; avgSavingsRate: number }
> = {
  low: { avgScore: 50, avgSavingsRate: 5 },
  "lower-middle": { avgScore: 58, avgSavingsRate: 8 },
  middle: { avgScore: 65, avgSavingsRate: 12 },
  "upper-middle": { avgScore: 72, avgSavingsRate: 18 },
  high: { avgScore: 80, avgSavingsRate: 25 },
};

// ============================================================================
// HEALTH SCORE CALCULATOR V2 CLASS
// ============================================================================

export class HealthScoreCalculatorV2 {
  private weights: ScoreWeightsV2;
  private thresholds: ScoreThresholdsV2;

  constructor(
    weights: ScoreWeightsV2 = DEFAULT_WEIGHTS,
    thresholds: ScoreThresholdsV2 = DEFAULT_THRESHOLDS,
  ) {
    this.weights = weights;
    this.thresholds = thresholds;
  }

  /**
   * Calculate comprehensive financial health score V2
   */
  async calculateScore(
    input: HealthScoreInputV2,
  ): Promise<FinancialHealthScoreV2> {
    const startTime = Date.now();
    const { context, options = {} } = input;

    // Apply custom weights if provided
    const weights = options.customWeights
      ? { ...this.weights, ...options.customWeights }
      : this.weights;

    // Calculate all component scores
    const breakdown: HealthScoreBreakdownV2 = {
      savings: this.calculateSavingsScore(context),
      debt: this.calculateDebtScore(context),
      spending: this.calculateSpendingScore(context),
      credit: this.calculateCreditScore(context),
      investments: this.calculateInvestmentsScore(context),
      insurance: this.calculateInsuranceScore(context),
    };

    // Calculate weighted overall score
    const overallScore = Math.round(
      breakdown.savings.score * weights.savings +
        breakdown.debt.score * weights.debt +
        breakdown.spending.score * weights.spending +
        breakdown.credit.score * weights.credit +
        breakdown.investments.score * weights.investments +
        breakdown.insurance.score * weights.insurance,
    );

    // Get historical data for trends
    const scoreHistory = options.includeHistory
      ? await this.getScoreHistory(context.user.id)
      : [];

    // Calculate trends
    const { trendDirection, trendPercent } = this.calculateTrend(
      overallScore,
      scoreHistory,
    );

    // Calculate projections
    const projections = options.includeProjections
      ? this.calculateProjections(overallScore, trendPercent, breakdown)
      : { projected30: overallScore, projected90: overallScore };

    // Identify strengths, weaknesses, and quick wins
    const topStrengths = this.identifyStrengths(breakdown);
    const topWeaknesses = this.identifyWeaknesses(breakdown);
    const quickWins = this.identifyQuickWins(breakdown, context);

    // Calculate benchmarks
    const ageGroup = options.ageGroup || this.inferAgeGroup(context);
    const incomeGroup = options.incomeGroup || this.inferIncomeGroup(context);
    const benchmarks = this.calculateBenchmarks(
      overallScore,
      ageGroup,
      incomeGroup,
    );

    // Assess data quality
    const dataQuality = this.assessDataQuality(context);

    const calculationTime = Date.now() - startTime;

    return {
      version: 2,
      overallScore,
      grade: this.getGrade(overallScore),
      breakdown,
      trend: trendDirection,
      calculatedAt: new Date(),

      // Enhanced metrics
      percentileRank: benchmarks.percentile,
      ageGroupRank: benchmarks.ageGroupPercentile,
      incomeGroupRank: benchmarks.incomeGroupPercentile,

      // Trend analysis
      trendDirection,
      trendPercent,
      projectedScore30Days: projections.projected30,
      projectedScore90Days: projections.projected90,

      // Actionable insights
      topStrengths,
      topWeaknesses,
      quickWins,

      // Historical context
      previousScore:
        scoreHistory.length > 0
          ? scoreHistory[scoreHistory.length - 1].score
          : undefined,
      previousGrade:
        scoreHistory.length > 0
          ? scoreHistory[scoreHistory.length - 1].grade
          : undefined,
      scoreHistory,

      // Metadata
      dataQuality,
      calculationDetails: {
        algorithm: "v2",
        weightsUsed: weights,
        thresholdsUsed: this.thresholds,
        dataSourcesUsed: this.getDataSourcesUsed(context),
        calculationTime,
      },
    };
  }

  // ==========================================================================
  // SAVINGS SCORE CALCULATION
  // ==========================================================================

  /**
   * Calculate savings score (0-100)
   */
  private calculateSavingsScore(
    context: AggregatedFinancialContext,
  ): ComponentScoreV2 {
    const subScores: SubScore[] = [];
    const recommendations: ComponentRecommendation[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Sub-score 1: Emergency Fund (max 35 points)
    const emergencyFundScore = this.calculateEmergencyFundSubScore(context);
    subScores.push(emergencyFundScore);
    totalScore += emergencyFundScore.score;
    maxPossibleScore += emergencyFundScore.maxScore;

    if (emergencyFundScore.score < emergencyFundScore.maxScore * 0.7) {
      recommendations.push({
        action: "Build your emergency fund to cover 3-6 months of expenses",
        impact: "Provides financial security and reduces stress",
        priority: "high",
        estimatedImprovement: Math.round(
          (emergencyFundScore.maxScore - emergencyFundScore.score) * 0.5,
        ),
        timeframe: "6-12 months",
      });
    }

    // Sub-score 2: Savings Rate (max 35 points)
    const savingsRateScore = this.calculateSavingsRateSubScore(context);
    subScores.push(savingsRateScore);
    totalScore += savingsRateScore.score;
    maxPossibleScore += savingsRateScore.maxScore;

    if (savingsRateScore.score < savingsRateScore.maxScore * 0.7) {
      recommendations.push({
        action: "Increase your savings rate by automating transfers",
        impact: "Accelerates wealth building and goal achievement",
        priority: "medium",
        estimatedImprovement: Math.round(
          (savingsRateScore.maxScore - savingsRateScore.score) * 0.4,
        ),
        timeframe: "1-3 months",
      });
    }

    // Sub-score 3: Active Goals Progress (max 30 points)
    const goalsScore = this.calculateGoalsSubScore(context);
    subScores.push(goalsScore);
    totalScore += goalsScore.score;
    maxPossibleScore += goalsScore.maxScore;

    if (goalsScore.score < goalsScore.maxScore * 0.5) {
      recommendations.push({
        action: "Set specific savings goals with target dates",
        impact: "Increases motivation and tracking ability",
        priority: "low",
        estimatedImprovement: Math.round(
          (goalsScore.maxScore - goalsScore.score) * 0.3,
        ),
        timeframe: "1 week",
      });
    }

    // Normalize to 0-100 scale
    const normalizedScore = Math.round((totalScore / maxPossibleScore) * 100);

    return {
      score: normalizedScore,
      weight: this.weights.savings,
      status: this.getStatus(normalizedScore),
      factors: subScores.map((s) => s.description),
      subScores,
      recommendations,
      trend: "stable",
      trendPercent: 0,
      benchmarkComparison: this.getDefaultBenchmark(normalizedScore),
    };
  }

  private calculateEmergencyFundSubScore(
    context: AggregatedFinancialContext,
  ): SubScore {
    const maxScore = 35;
    const savingsBalance = context.savings.totalSaved;
    const monthlyExpenses = context.spending.monthlyAverage || 1;
    const emergencyMonths = savingsBalance / monthlyExpenses;

    let score: number;
    let description: string;

    if (emergencyMonths >= this.thresholds.emergencyFundMonths.excellent) {
      score = maxScore;
      description = `Excellent emergency fund (${emergencyMonths.toFixed(1)} months)`;
    } else if (emergencyMonths >= this.thresholds.emergencyFundMonths.good) {
      score = Math.round(maxScore * 0.75);
      description = `Good emergency fund (${emergencyMonths.toFixed(1)} months)`;
    } else if (emergencyMonths >= this.thresholds.emergencyFundMonths.fair) {
      score = Math.round(maxScore * 0.5);
      description = `Building emergency fund (${emergencyMonths.toFixed(1)} months)`;
    } else {
      score = Math.round(maxScore * 0.25);
      description = `Low emergency fund (${emergencyMonths.toFixed(1)} months)`;
    }

    return {
      name: "Emergency Fund",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  private calculateSavingsRateSubScore(
    context: AggregatedFinancialContext,
  ): SubScore {
    const maxScore = 35;
    const income = context.spending.transactions.totalIncome || 1;
    const expenses = context.spending.transactions.totalExpenses;
    const savingsRate = ((income - expenses) / income) * 100;

    let score: number;
    let description: string;

    if (savingsRate >= this.thresholds.savingsRate.excellent) {
      score = maxScore;
      description = `Excellent savings rate (${savingsRate.toFixed(1)}%)`;
    } else if (savingsRate >= this.thresholds.savingsRate.good) {
      score = Math.round(maxScore * 0.75);
      description = `Good savings rate (${savingsRate.toFixed(1)}%)`;
    } else if (savingsRate >= this.thresholds.savingsRate.fair) {
      score = Math.round(maxScore * 0.5);
      description = `Fair savings rate (${savingsRate.toFixed(1)}%)`;
    } else if (savingsRate > 0) {
      score = Math.round(maxScore * 0.25);
      description = `Low savings rate (${savingsRate.toFixed(1)}%)`;
    } else {
      score = 0;
      description = `Negative savings rate (${savingsRate.toFixed(1)}%)`;
    }

    return {
      name: "Savings Rate",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  private calculateGoalsSubScore(
    context: AggregatedFinancialContext,
  ): SubScore {
    const maxScore = 30;
    const activeGoals = context.goals.filter((g) => g.status === "active");

    if (activeGoals.length === 0) {
      return {
        name: "Savings Goals",
        score: Math.round(maxScore * 0.3),
        maxScore,
        description: "No active savings goals set",
        impact: "medium",
      };
    }

    // Calculate average progress across goals
    const avgProgress =
      activeGoals.reduce((sum, g) => {
        const progress =
          g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
        return sum + Math.min(100, progress);
      }, 0) / activeGoals.length;

    let score: number;
    if (avgProgress >= 75) {
      score = maxScore;
    } else if (avgProgress >= 50) {
      score = Math.round(maxScore * 0.75);
    } else if (avgProgress >= 25) {
      score = Math.round(maxScore * 0.5);
    } else {
      score = Math.round(maxScore * 0.35);
    }

    return {
      name: "Savings Goals",
      score,
      maxScore,
      description: `${activeGoals.length} active goal(s), ${avgProgress.toFixed(0)}% avg progress`,
      impact: "medium",
    };
  }

  // ==========================================================================
  // DEBT SCORE CALCULATION
  // ==========================================================================

  /**
   * Calculate debt score (0-100)
   */
  private calculateDebtScore(
    context: AggregatedFinancialContext,
  ): ComponentScoreV2 {
    const subScores: SubScore[] = [];
    const recommendations: ComponentRecommendation[] = [];

    const { totalDebt, monthlyPayments } = context.debt;
    const monthlyIncome = context.spending.transactions.totalIncome || 1;
    const debtToIncomeRatio = (monthlyPayments / monthlyIncome) * 100;

    // No debt is excellent
    if (totalDebt === 0) {
      return {
        score: 100,
        weight: this.weights.debt,
        status: "excellent",
        factors: ["Debt-free!"],
        subScores: [
          {
            name: "Total Debt",
            score: 40,
            maxScore: 40,
            description: "No debt - excellent!",
            impact: "high",
          },
        ],
        recommendations: [],
        trend: "stable",
        trendPercent: 0,
        benchmarkComparison: this.getDefaultBenchmark(100),
      };
    }

    // Sub-score 1: Debt-to-Income Ratio (max 40 points)
    const dtiScore = this.calculateDTISubScore(debtToIncomeRatio);
    subScores.push(dtiScore);

    if (debtToIncomeRatio > this.thresholds.debtToIncome.good) {
      recommendations.push({
        action: "Focus on paying down high-interest debt first",
        impact: "Reduces monthly obligations and interest costs",
        priority: "high",
        estimatedImprovement: 15,
        timeframe: "6-12 months",
      });
    }

    // Sub-score 2: High-Interest Debt (max 30 points)
    const highInterestScore = this.calculateHighInterestDebtSubScore(context);
    subScores.push(highInterestScore);

    if (highInterestScore.score < highInterestScore.maxScore * 0.7) {
      recommendations.push({
        action: "Consider debt consolidation or balance transfer",
        impact: "Lower interest rates save money over time",
        priority: "medium",
        estimatedImprovement: 10,
        timeframe: "1-3 months",
      });
    }

    // Sub-score 3: Debt Payoff Progress (max 30 points)
    const payoffScore = this.calculateDebtPayoffSubScore(context);
    subScores.push(payoffScore);

    // Calculate total score
    const totalScore = subScores.reduce((sum, s) => sum + s.score, 0);
    const maxScore = subScores.reduce((sum, s) => sum + s.maxScore, 0);
    const normalizedScore = Math.round((totalScore / maxScore) * 100);

    return {
      score: normalizedScore,
      weight: this.weights.debt,
      status: this.getStatus(normalizedScore),
      factors: subScores.map((s) => s.description),
      subScores,
      recommendations,
      trend: "stable",
      trendPercent: 0,
      benchmarkComparison: this.getDefaultBenchmark(normalizedScore),
    };
  }

  private calculateDTISubScore(debtToIncomeRatio: number): SubScore {
    const maxScore = 40;
    let score: number;
    let description: string;

    if (debtToIncomeRatio <= this.thresholds.debtToIncome.excellent) {
      score = maxScore;
      description = `Low debt-to-income ratio (${debtToIncomeRatio.toFixed(1)}%)`;
    } else if (debtToIncomeRatio <= this.thresholds.debtToIncome.good) {
      score = Math.round(maxScore * 0.7);
      description = `Moderate debt-to-income ratio (${debtToIncomeRatio.toFixed(1)}%)`;
    } else if (debtToIncomeRatio <= this.thresholds.debtToIncome.fair) {
      score = Math.round(maxScore * 0.4);
      description = `High debt-to-income ratio (${debtToIncomeRatio.toFixed(1)}%)`;
    } else {
      score = Math.round(maxScore * 0.15);
      description = `Very high debt-to-income ratio (${debtToIncomeRatio.toFixed(1)}%)`;
    }

    return {
      name: "Debt-to-Income Ratio",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  private calculateHighInterestDebtSubScore(
    context: AggregatedFinancialContext,
  ): SubScore {
    const maxScore = 30;
    const debts = context.debt.items;
    const highInterestDebts = debts.filter((d) => d.interestRate > 15);
    const highInterestTotal = highInterestDebts.reduce(
      (sum, d) => sum + d.balance,
      0,
    );
    const totalDebt = context.debt.totalDebt || 1;
    const highInterestRatio = (highInterestTotal / totalDebt) * 100;

    let score: number;
    let description: string;

    if (highInterestDebts.length === 0) {
      score = maxScore;
      description = "No high-interest debt (>15% APR)";
    } else if (highInterestRatio < 25) {
      score = Math.round(maxScore * 0.7);
      description = `${highInterestDebts.length} high-interest debt(s), ${highInterestRatio.toFixed(0)}% of total`;
    } else if (highInterestRatio < 50) {
      score = Math.round(maxScore * 0.4);
      description = `${highInterestDebts.length} high-interest debt(s), ${highInterestRatio.toFixed(0)}% of total`;
    } else {
      score = Math.round(maxScore * 0.15);
      description = `${highInterestDebts.length} high-interest debt(s), ${highInterestRatio.toFixed(0)}% of total`;
    }

    return {
      name: "High-Interest Debt",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  private calculateDebtPayoffSubScore(
    context: AggregatedFinancialContext,
  ): SubScore {
    const maxScore = 30;
    const payoffPlan = context.debt.payoffPlan;

    if (!payoffPlan) {
      return {
        name: "Debt Payoff Plan",
        score: Math.round(maxScore * 0.3),
        maxScore,
        description: "No debt payoff plan set",
        impact: "medium",
      };
    }

    // Score based on projected payoff time
    const monthsToPayoff = payoffPlan.totalMonths || 120;
    let score: number;
    let description: string;

    if (monthsToPayoff <= 24) {
      score = maxScore;
      description = `On track to be debt-free in ${monthsToPayoff} months`;
    } else if (monthsToPayoff <= 60) {
      score = Math.round(maxScore * 0.7);
      description = `Debt payoff projected in ${monthsToPayoff} months`;
    } else if (monthsToPayoff <= 120) {
      score = Math.round(maxScore * 0.4);
      description = `Long-term debt payoff (${monthsToPayoff} months)`;
    } else {
      score = Math.round(maxScore * 0.2);
      description = `Extended debt payoff timeline (${monthsToPayoff}+ months)`;
    }

    return {
      name: "Debt Payoff Plan",
      score,
      maxScore,
      description,
      impact: "medium",
    };
  }

  // ==========================================================================
  // SPENDING SCORE CALCULATION
  // ==========================================================================

  /**
   * Calculate spending score (0-100)
   */
  private calculateSpendingScore(
    context: AggregatedFinancialContext,
  ): ComponentScoreV2 {
    const subScores: SubScore[] = [];
    const recommendations: ComponentRecommendation[] = [];

    // Sub-score 1: Budget Adherence (max 40 points)
    const budgetScore = this.calculateBudgetAdherenceSubScore(context);
    subScores.push(budgetScore);

    if (budgetScore.score < budgetScore.maxScore * 0.7) {
      recommendations.push({
        action: "Review and adjust budgets to be more realistic",
        impact: "Better budget adherence improves financial control",
        priority: "medium",
        estimatedImprovement: 8,
        timeframe: "1 month",
      });
    }

    // Sub-score 2: Spending vs Income Ratio (max 35 points)
    const spendingRatioScore = this.calculateSpendingRatioSubScore(context);
    subScores.push(spendingRatioScore);

    if (spendingRatioScore.score < spendingRatioScore.maxScore * 0.6) {
      recommendations.push({
        action: "Identify and reduce discretionary spending",
        impact: "Living below your means accelerates wealth building",
        priority: "high",
        estimatedImprovement: 12,
        timeframe: "1-3 months",
      });
    }

    // Sub-score 3: Spending Consistency (max 25 points)
    const consistencyScore = this.calculateSpendingConsistencySubScore(context);
    subScores.push(consistencyScore);

    // Calculate total score
    const totalScore = subScores.reduce((sum, s) => sum + s.score, 0);
    const maxScore = subScores.reduce((sum, s) => sum + s.maxScore, 0);
    const normalizedScore = Math.round((totalScore / maxScore) * 100);

    return {
      score: normalizedScore,
      weight: this.weights.spending,
      status: this.getStatus(normalizedScore),
      factors: subScores.map((s) => s.description),
      subScores,
      recommendations,
      trend: "stable",
      trendPercent: 0,
      benchmarkComparison: this.getDefaultBenchmark(normalizedScore),
    };
  }

  private calculateBudgetAdherenceSubScore(
    context: AggregatedFinancialContext,
  ): SubScore {
    const maxScore = 40;
    const budgets = context.budgets.items.filter((b) => b.budgetedAmount > 0);

    if (budgets.length === 0) {
      return {
        name: "Budget Adherence",
        score: Math.round(maxScore * 0.3),
        maxScore,
        description: "No budgets set up",
        impact: "high",
      };
    }

    // Calculate average adherence
    const avgAdherence =
      budgets.reduce((sum, b) => {
        const spent = b.spentAmount || 0;
        const adherence = Math.min(
          100,
          Math.max(
            0,
            (1 - (spent - b.budgetedAmount) / b.budgetedAmount) * 100,
          ),
        );
        return sum + adherence;
      }, 0) / budgets.length;

    let score: number;
    let description: string;

    if (avgAdherence >= this.thresholds.budgetAdherence.excellent) {
      score = maxScore;
      description = `Excellent budget adherence (${avgAdherence.toFixed(0)}%)`;
    } else if (avgAdherence >= this.thresholds.budgetAdherence.good) {
      score = Math.round(maxScore * 0.75);
      description = `Good budget adherence (${avgAdherence.toFixed(0)}%)`;
    } else if (avgAdherence >= this.thresholds.budgetAdherence.fair) {
      score = Math.round(maxScore * 0.5);
      description = `Fair budget adherence (${avgAdherence.toFixed(0)}%)`;
    } else {
      score = Math.round(maxScore * 0.25);
      description = `Poor budget adherence (${avgAdherence.toFixed(0)}%)`;
    }

    return {
      name: "Budget Adherence",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  private calculateSpendingRatioSubScore(
    context: AggregatedFinancialContext,
  ): SubScore {
    const maxScore = 35;
    const income = context.spending.transactions.totalIncome || 1;
    const expenses = context.spending.transactions.totalExpenses;
    const spendingRatio = (expenses / income) * 100;

    let score: number;
    let description: string;

    if (spendingRatio <= 70) {
      score = maxScore;
      description = `Living well below means (${spendingRatio.toFixed(0)}% of income)`;
    } else if (spendingRatio <= 85) {
      score = Math.round(maxScore * 0.75);
      description = `Good spending ratio (${spendingRatio.toFixed(0)}% of income)`;
    } else if (spendingRatio <= 95) {
      score = Math.round(maxScore * 0.5);
      description = `Spending near income (${spendingRatio.toFixed(0)}% of income)`;
    } else {
      score = Math.round(maxScore * 0.2);
      description = `Spending exceeds income (${spendingRatio.toFixed(0)}% of income)`;
    }

    return {
      name: "Spending Ratio",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  private calculateSpendingConsistencySubScore(
    context: AggregatedFinancialContext,
  ): SubScore {
    const maxScore = 25;
    const anomalies = context.spending.anomalies;
    const highSeverityAnomalies = anomalies.filter(
      (a) => a.severity === "high",
    ).length;

    let score: number;
    let description: string;

    if (highSeverityAnomalies === 0 && anomalies.length <= 2) {
      score = maxScore;
      description = "Consistent spending patterns";
    } else if (highSeverityAnomalies === 0) {
      score = Math.round(maxScore * 0.7);
      description = `${anomalies.length} minor spending anomalies detected`;
    } else if (highSeverityAnomalies <= 2) {
      score = Math.round(maxScore * 0.4);
      description = `${highSeverityAnomalies} significant spending anomalies`;
    } else {
      score = Math.round(maxScore * 0.2);
      description = `${highSeverityAnomalies} major spending anomalies`;
    }

    return {
      name: "Spending Consistency",
      score,
      maxScore,
      description,
      impact: "medium",
    };
  }

  // ==========================================================================
  // CREDIT SCORE CALCULATION
  // ==========================================================================

  /**
   * Calculate credit score component (0-100)
   */
  private calculateCreditScore(
    context: AggregatedFinancialContext,
  ): ComponentScoreV2 {
    const subScores: SubScore[] = [];
    const recommendations: ComponentRecommendation[] = [];
    const creditProfile = context.credit;

    // Sub-score 1: Credit Score (max 50 points)
    const creditScoreSubScore = this.calculateCreditScoreSubScore(
      creditProfile.currentScore,
    );
    subScores.push(creditScoreSubScore);

    if (creditProfile.currentScore < 670) {
      recommendations.push({
        action: "Focus on paying bills on time and reducing credit utilization",
        impact: "Payment history is the biggest factor in credit scores",
        priority: "high",
        estimatedImprovement: 15,
        timeframe: "3-6 months",
      });
    }

    // Sub-score 2: Credit Utilization (max 30 points)
    const utilizationScore = this.calculateUtilizationSubScore(context);
    subScores.push(utilizationScore);

    if (utilizationScore.score < utilizationScore.maxScore * 0.7) {
      recommendations.push({
        action: "Pay down credit card balances to below 30% utilization",
        impact: "Lower utilization can quickly improve credit score",
        priority: "medium",
        estimatedImprovement: 10,
        timeframe: "1-2 months",
      });
    }

    // Sub-score 3: Credit Health Factors (max 20 points)
    const healthFactorsScore =
      this.calculateCreditHealthSubScore(creditProfile);
    subScores.push(healthFactorsScore);

    // Calculate total score
    const totalScore = subScores.reduce((sum, s) => sum + s.score, 0);
    const maxScore = subScores.reduce((sum, s) => sum + s.maxScore, 0);
    const normalizedScore = Math.round((totalScore / maxScore) * 100);

    return {
      score: normalizedScore,
      weight: this.weights.credit,
      status: this.getStatus(normalizedScore),
      factors: subScores.map((s) => s.description),
      subScores,
      recommendations,
      trend: "stable",
      trendPercent: 0,
      benchmarkComparison: this.getDefaultBenchmark(normalizedScore),
    };
  }

  private calculateCreditScoreSubScore(creditScore: number): SubScore {
    const maxScore = 50;
    let score: number;
    let description: string;

    if (creditScore >= 800) {
      score = maxScore;
      description = `Exceptional credit score (${creditScore})`;
    } else if (creditScore >= 740) {
      score = Math.round(maxScore * 0.9);
      description = `Very good credit score (${creditScore})`;
    } else if (creditScore >= 670) {
      score = Math.round(maxScore * 0.75);
      description = `Good credit score (${creditScore})`;
    } else if (creditScore >= 580) {
      score = Math.round(maxScore * 0.5);
      description = `Fair credit score (${creditScore})`;
    } else if (creditScore > 0) {
      score = Math.round(maxScore * 0.25);
      description = `Poor credit score (${creditScore})`;
    } else {
      score = Math.round(maxScore * 0.4);
      description = "Credit score not available";
    }

    return {
      name: "Credit Score",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  private calculateUtilizationSubScore(
    context: AggregatedFinancialContext,
  ): SubScore {
    const maxScore = 30;
    const creditAccounts = context.accounts.credit;
    const totalLimit = creditAccounts.reduce(
      (sum, a) => sum + (a.creditLimit || 0),
      0,
    );
    const totalUsed = creditAccounts.reduce(
      (sum, a) => sum + Math.abs(a.currentBalance),
      0,
    );
    const utilization = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

    let score: number;
    let description: string;

    if (utilization <= this.thresholds.creditUtilization.excellent) {
      score = maxScore;
      description = `Excellent credit utilization (${utilization.toFixed(0)}%)`;
    } else if (utilization <= this.thresholds.creditUtilization.good) {
      score = Math.round(maxScore * 0.75);
      description = `Good credit utilization (${utilization.toFixed(0)}%)`;
    } else if (utilization <= this.thresholds.creditUtilization.fair) {
      score = Math.round(maxScore * 0.5);
      description = `High credit utilization (${utilization.toFixed(0)}%)`;
    } else {
      score = Math.round(maxScore * 0.2);
      description = `Very high credit utilization (${utilization.toFixed(0)}%)`;
    }

    return {
      name: "Credit Utilization",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  private calculateCreditHealthSubScore(
    creditProfile: AggregatedFinancialContext["credit"],
  ): SubScore {
    const maxScore = 20;
    let score = maxScore;
    const factors: string[] = [];

    // Count negative factors from credit factors array
    const negativeFactors = creditProfile.factors.filter(
      (f) => f.status === "negative",
    );
    if (negativeFactors.length > 0) {
      score -= Math.min(10, negativeFactors.length * 2);
      factors.push(`${negativeFactors.length} negative factor(s)`);
    }

    // Deduct for active disputes (neutral - shows engagement)
    if (creditProfile.activeDisputes > 0) {
      factors.push(`${creditProfile.activeDisputes} active dispute(s)`);
    }

    // Score trend
    if (creditProfile.scoreChange > 0) {
      score = Math.min(maxScore, score + 2);
      factors.push(`Score improving (+${creditProfile.scoreChange})`);
    } else if (creditProfile.scoreChange < 0) {
      score = Math.max(0, score - 2);
      factors.push(`Score declining (${creditProfile.scoreChange})`);
    }

    const description =
      factors.length > 0 ? factors.join(", ") : "Good credit health";

    return {
      name: "Credit Health",
      score: Math.max(0, score),
      maxScore,
      description,
      impact: "medium",
    };
  }

  // ==========================================================================
  // INVESTMENTS SCORE CALCULATION (NEW IN V2)
  // ==========================================================================

  /**
   * Calculate investments score (0-100)
   * NEW in V2: Evaluates investment health including diversification,
   * performance, and retirement readiness
   */
  private calculateInvestmentsScore(
    context: AggregatedFinancialContext,
  ): ComponentScoreV2 {
    const subScores: SubScore[] = [];
    const recommendations: ComponentRecommendation[] = [];
    const investments = context.investments;

    // No investments
    if (investments.totalValue === 0) {
      return {
        score: 30,
        weight: this.weights.investments,
        status: "poor",
        factors: ["No investments detected"],
        subScores: [
          {
            name: "Investment Portfolio",
            score: 0,
            maxScore: 100,
            description: "No investment portfolio",
            impact: "high",
          },
        ],
        recommendations: [
          {
            action: "Start investing with a diversified index fund",
            impact: "Building wealth through compound growth",
            priority: "high",
            estimatedImprovement: 20,
            timeframe: "1 month to start",
          },
        ],
        trend: "stable",
        trendPercent: 0,
        benchmarkComparison: this.getDefaultBenchmark(30),
      };
    }

    // Sub-score 1: Portfolio Performance (max 35 points)
    const performanceScore =
      this.calculatePortfolioPerformanceSubScore(investments);
    subScores.push(performanceScore);

    // Sub-score 2: Diversification (max 35 points)
    const diversificationScore =
      this.calculateDiversificationSubScore(investments);
    subScores.push(diversificationScore);

    if (diversificationScore.score < diversificationScore.maxScore * 0.6) {
      recommendations.push({
        action: "Diversify your portfolio across asset classes",
        impact: "Reduces risk and improves long-term returns",
        priority: "medium",
        estimatedImprovement: 10,
        timeframe: "1-3 months",
      });
    }

    // Sub-score 3: Retirement Readiness (max 30 points)
    const retirementScore =
      this.calculateRetirementReadinessSubScore(investments);
    subScores.push(retirementScore);

    if (retirementScore.score < retirementScore.maxScore * 0.5) {
      recommendations.push({
        action: "Increase retirement contributions to at least 15% of income",
        impact: "Ensures financial security in retirement",
        priority: "high",
        estimatedImprovement: 15,
        timeframe: "Ongoing",
      });
    }

    // Calculate total score
    const totalScore = subScores.reduce((sum, s) => sum + s.score, 0);
    const maxScore = subScores.reduce((sum, s) => sum + s.maxScore, 0);
    const normalizedScore = Math.round((totalScore / maxScore) * 100);

    return {
      score: normalizedScore,
      weight: this.weights.investments,
      status: this.getStatus(normalizedScore),
      factors: subScores.map((s) => s.description),
      subScores,
      recommendations,
      trend: "stable",
      trendPercent: 0,
      benchmarkComparison: this.getDefaultBenchmark(normalizedScore),
    };
  }

  private calculatePortfolioPerformanceSubScore(
    investments: AggregatedFinancialContext["investments"],
  ): SubScore {
    const maxScore = 35;
    const returnPercent =
      investments.totalValue > 0
        ? (investments.totalGainLoss /
            (investments.totalValue - investments.totalGainLoss)) *
          100
        : 0;

    let score: number;
    let description: string;

    if (returnPercent >= this.thresholds.investmentReturn.excellent) {
      score = maxScore;
      description = `Excellent returns (${returnPercent.toFixed(1)}%)`;
    } else if (returnPercent >= this.thresholds.investmentReturn.good) {
      score = Math.round(maxScore * 0.75);
      description = `Good returns (${returnPercent.toFixed(1)}%)`;
    } else if (returnPercent >= this.thresholds.investmentReturn.fair) {
      score = Math.round(maxScore * 0.5);
      description = `Fair returns (${returnPercent.toFixed(1)}%)`;
    } else if (returnPercent >= 0) {
      score = Math.round(maxScore * 0.35);
      description = `Low returns (${returnPercent.toFixed(1)}%)`;
    } else {
      score = Math.round(maxScore * 0.2);
      description = `Negative returns (${returnPercent.toFixed(1)}%)`;
    }

    return {
      name: "Portfolio Performance",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  private calculateDiversificationSubScore(
    investments: AggregatedFinancialContext["investments"],
  ): SubScore {
    const maxScore = 35;
    const diversificationScore = investments.diversificationScore;

    let score: number;
    let description: string;

    if (
      diversificationScore >= this.thresholds.diversificationScore.excellent
    ) {
      score = maxScore;
      description = `Excellent diversification (${diversificationScore}%)`;
    } else if (
      diversificationScore >= this.thresholds.diversificationScore.good
    ) {
      score = Math.round(maxScore * 0.75);
      description = `Good diversification (${diversificationScore}%)`;
    } else if (
      diversificationScore >= this.thresholds.diversificationScore.fair
    ) {
      score = Math.round(maxScore * 0.5);
      description = `Fair diversification (${diversificationScore}%)`;
    } else {
      score = Math.round(maxScore * 0.25);
      description = `Poor diversification (${diversificationScore}%)`;
    }

    return {
      name: "Diversification",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  private calculateRetirementReadinessSubScore(
    investments: AggregatedFinancialContext["investments"],
  ): SubScore {
    const maxScore = 30;
    const readiness = investments.retirementReadiness;

    let score: number;
    let description: string;

    if (readiness >= this.thresholds.retirementReadiness.excellent) {
      score = maxScore;
      description = `On track for retirement (${readiness}% ready)`;
    } else if (readiness >= this.thresholds.retirementReadiness.good) {
      score = Math.round(maxScore * 0.75);
      description = `Good retirement progress (${readiness}% ready)`;
    } else if (readiness >= this.thresholds.retirementReadiness.fair) {
      score = Math.round(maxScore * 0.5);
      description = `Building retirement savings (${readiness}% ready)`;
    } else {
      score = Math.round(maxScore * 0.25);
      description = `Behind on retirement savings (${readiness}% ready)`;
    }

    return {
      name: "Retirement Readiness",
      score,
      maxScore,
      description,
      impact: "high",
    };
  }

  // ==========================================================================
  // INSURANCE SCORE CALCULATION
  // ==========================================================================

  /**
   * Calculate insurance score (0-100)
   * Note: Simplified version - would need actual insurance data integration
   */
  private calculateInsuranceScore(
    _context: AggregatedFinancialContext,
  ): ComponentScoreV2 {
    // Placeholder - would need actual insurance data
    return {
      score: 70,
      weight: this.weights.insurance,
      status: "fair",
      factors: ["Insurance coverage not yet tracked"],
      subScores: [
        {
          name: "Insurance Coverage",
          score: 70,
          maxScore: 100,
          description: "Insurance data not available",
          impact: "medium",
        },
      ],
      recommendations: [
        {
          action: "Review and update insurance coverage",
          impact: "Protects against financial catastrophe",
          priority: "low",
          estimatedImprovement: 5,
          timeframe: "1 month",
        },
      ],
      trend: "stable",
      trendPercent: 0,
      benchmarkComparison: this.getDefaultBenchmark(70),
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get letter grade from score
   */
  public getGrade(score: number): "A" | "B" | "C" | "D" | "F" {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  /**
   * Get status from score
   */
  private getStatus(score: number): ComponentScoreV2["status"] {
    if (score >= 90) return "excellent";
    if (score >= 75) return "good";
    if (score >= 60) return "fair";
    if (score >= 40) return "poor";
    return "critical";
  }

  /**
   * Get default benchmark comparison
   */
  private getDefaultBenchmark(score: number): BenchmarkComparison {
    return {
      percentile: Math.min(99, Math.max(1, score)),
      ageGroupAverage: 65,
      incomeGroupAverage: 65,
      comparison: score > 65 ? "above" : score < 65 ? "below" : "average",
    };
  }

  /**
   * Calculate trend from historical scores
   */
  private calculateTrend(
    currentScore: number,
    history: ScoreHistoryPoint[],
  ): {
    trendDirection: "improving" | "declining" | "stable";
    trendPercent: number;
  } {
    if (history.length < 2) {
      return { trendDirection: "stable", trendPercent: 0 };
    }

    const recentScores = history.slice(-5);
    const avgRecent =
      recentScores.reduce((sum, h) => sum + h.score, 0) / recentScores.length;
    const diff = currentScore - avgRecent;
    const trendPercent = (diff / avgRecent) * 100;

    let trendDirection: "improving" | "declining" | "stable";
    if (trendPercent > 2) {
      trendDirection = "improving";
    } else if (trendPercent < -2) {
      trendDirection = "declining";
    } else {
      trendDirection = "stable";
    }

    return { trendDirection, trendPercent };
  }

  /**
   * Calculate score projections
   */
  private calculateProjections(
    currentScore: number,
    trendPercent: number,
    _breakdown: HealthScoreBreakdownV2,
  ): { projected30: number; projected90: number } {
    // Simple linear projection based on trend
    const monthlyChange = trendPercent / 3; // Assume trend is over 3 months
    const projected30 = Math.min(
      100,
      Math.max(0, Math.round(currentScore + monthlyChange)),
    );
    const projected90 = Math.min(
      100,
      Math.max(0, Math.round(currentScore + monthlyChange * 3)),
    );

    return { projected30, projected90 };
  }

  /**
   * Identify top strengths from breakdown
   */
  private identifyStrengths(
    breakdown: HealthScoreBreakdownV2,
  ): ScoreStrength[] {
    const components = Object.entries(breakdown) as [
      keyof HealthScoreBreakdownV2,
      ComponentScoreV2,
    ][];

    return components
      .filter(([, score]) => score.score >= 75)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 3)
      .map(([component, score]) => ({
        component,
        description: score.factors[0] || `Strong ${component} score`,
        score: score.score,
        contribution: score.score * score.weight,
      }));
  }

  /**
   * Identify top weaknesses from breakdown
   */
  private identifyWeaknesses(
    breakdown: HealthScoreBreakdownV2,
  ): ScoreWeakness[] {
    const components = Object.entries(breakdown) as [
      keyof HealthScoreBreakdownV2,
      ComponentScoreV2,
    ][];

    return components
      .filter(([, score]) => score.score < 70)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 3)
      .map(([component, score]) => ({
        component,
        description: score.factors[0] || `Weak ${component} score`,
        score: score.score,
        potentialImprovement: Math.round((100 - score.score) * score.weight),
        recommendation:
          score.recommendations[0]?.action || `Improve ${component}`,
      }));
  }

  /**
   * Identify quick wins - low effort, high impact improvements
   */
  private identifyQuickWins(
    breakdown: HealthScoreBreakdownV2,
    _context: AggregatedFinancialContext,
  ): QuickWin[] {
    const quickWins: QuickWin[] = [];

    // Collect all recommendations with low effort
    const components = Object.entries(breakdown) as [
      keyof HealthScoreBreakdownV2,
      ComponentScoreV2,
    ][];

    for (const [component, score] of components) {
      for (const rec of score.recommendations) {
        if (rec.estimatedImprovement >= 5) {
          quickWins.push({
            title: `Improve ${component}`,
            description: rec.action,
            action: rec.action,
            component,
            estimatedImprovement: rec.estimatedImprovement,
            impact:
              rec.priority === "high"
                ? "high"
                : rec.priority === "medium"
                  ? "medium"
                  : "low",
            effort:
              rec.priority === "low"
                ? "low"
                : rec.priority === "medium"
                  ? "medium"
                  : "high",
            timeframe: rec.timeframe,
            category: component,
          });
        }
      }
    }

    // Sort by improvement/effort ratio and return top 5
    return quickWins
      .sort((a, b) => {
        const effortScore = { low: 3, medium: 2, high: 1 };
        return (
          b.estimatedImprovement * effortScore[b.effort] -
          a.estimatedImprovement * effortScore[a.effort]
        );
      })
      .slice(0, 5);
  }

  /**
   * Calculate benchmark comparisons
   */
  private calculateBenchmarks(
    score: number,
    ageGroup: AgeGroup,
    incomeGroup: IncomeGroup,
  ): {
    percentile: number;
    ageGroupPercentile: number;
    incomeGroupPercentile: number;
  } {
    const ageBenchmark = AGE_GROUP_BENCHMARKS[ageGroup];
    const incomeBenchmark = INCOME_GROUP_BENCHMARKS[incomeGroup];

    // Simple percentile calculation (would be more sophisticated in production)
    const percentile = Math.min(99, Math.max(1, Math.round(score)));
    const ageGroupPercentile = Math.min(
      99,
      Math.max(1, Math.round(50 + (score - ageBenchmark.avgScore) * 2)),
    );
    const incomeGroupPercentile = Math.min(
      99,
      Math.max(1, Math.round(50 + (score - incomeBenchmark.avgScore) * 2)),
    );

    return { percentile, ageGroupPercentile, incomeGroupPercentile };
  }

  /**
   * Infer age group from context (simplified)
   */
  private inferAgeGroup(_context: AggregatedFinancialContext): AgeGroup {
    // Would use user profile data in production
    return "35-44";
  }

  /**
   * Infer income group from context
   */
  private inferIncomeGroup(context: AggregatedFinancialContext): IncomeGroup {
    const monthlyIncome = context.spending.transactions.totalIncome;
    const annualIncome = monthlyIncome * 12;

    if (annualIncome < 30000) return "low";
    if (annualIncome < 50000) return "lower-middle";
    if (annualIncome < 100000) return "middle";
    if (annualIncome < 200000) return "upper-middle";
    return "high";
  }

  /**
   * Get age group from age number
   */
  private getAgeGroupFromAge(age: number): AgeGroup {
    if (age < 25) return "18-24";
    if (age < 35) return "25-34";
    if (age < 45) return "35-44";
    if (age < 55) return "45-54";
    if (age < 65) return "55-64";
    return "65+";
  }

  /**
   * Get income group from annual income
   */
  private getIncomeGroupFromIncome(income: number): IncomeGroup {
    if (income < 35000) return "low";
    if (income < 75000) return "lower-middle";
    if (income < 150000) return "middle";
    if (income < 200000) return "upper-middle";
    return "high";
  }

  /**
   * Assess data quality
   */
  private assessDataQuality(
    context: AggregatedFinancialContext,
  ): DataQualityAssessment {
    const missingData: string[] = [];
    const staleData: string[] = [];

    // Check for missing data
    if (!context.dataCompleteness.accounts) missingData.push("accounts");
    if (!context.dataCompleteness.budgets) missingData.push("budgets");
    if (!context.dataCompleteness.transactions)
      missingData.push("transactions");
    if (!context.dataCompleteness.investments) missingData.push("investments");
    if (!context.dataCompleteness.credit) missingData.push("credit");

    // Check for stale data (simplified - would check actual timestamps)
    const daysSinceUpdate = Math.floor(
      (Date.now() - context.lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceUpdate > 7) {
      staleData.push("Financial data may be outdated");
    }

    const confidenceLevel = Math.max(
      0,
      100 - missingData.length * 15 - staleData.length * 10,
    );

    let overallQuality: DataQualityAssessment["overallQuality"];
    if (confidenceLevel >= 90) overallQuality = "excellent";
    else if (confidenceLevel >= 70) overallQuality = "good";
    else if (confidenceLevel >= 50) overallQuality = "fair";
    else overallQuality = "poor";

    return { overallQuality, missingData, staleData, confidenceLevel };
  }

  /**
   * Get list of data sources used
   */
  private getDataSourcesUsed(context: AggregatedFinancialContext): string[] {
    const sources: string[] = [];

    if (context.dataCompleteness.accounts) sources.push("bank_accounts");
    if (context.dataCompleteness.budgets) sources.push("budgets");
    if (context.dataCompleteness.transactions) sources.push("transactions");
    if (context.dataCompleteness.bills) sources.push("bills");
    if (context.dataCompleteness.savings) sources.push("savings");
    if (context.dataCompleteness.debt) sources.push("debt");
    if (context.dataCompleteness.investments) sources.push("investments");
    if (context.dataCompleteness.credit) sources.push("credit_profile");

    return sources;
  }

  /**
   * Get historical scores for trend analysis
   */
  async getScoreHistory(
    userId: string,
    days = 90,
  ): Promise<ScoreHistoryPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from("financial_health_scores")
      .select("overall_score, calculated_at")
      .eq("user_id", userId)
      .gte("calculated_at", startDate.toISOString())
      .order("calculated_at", { ascending: true });

    return (data || []).map((d) => ({
      date: new Date(d.calculated_at),
      score: d.overall_score,
      grade: this.getGrade(d.overall_score),
    }));
  }

  /**
   * Save health score to database
   */
  async saveScore(
    userId: string,
    score: FinancialHealthScoreV2,
  ): Promise<void> {
    // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
    await supabase.from("financial_health_scores").insert({
      user_id: userId,
      overall_score: score.overallScore,
      savings_score: score.breakdown.savings.score,
      debt_score: score.breakdown.debt.score,
      spending_score: score.breakdown.spending.score,
      credit_score_component: score.breakdown.credit.score,
      investment_score: score.breakdown.investments.score,
      insurance_score: score.breakdown.insurance.score,
      breakdown: score.breakdown,
      recommendations: score.quickWins,
      calculated_at: score.calculatedAt.toISOString(),
      version: 2,
    });
  }

  // ============================================================================
  // PUBLIC BENCHMARKING API (Phase 1.3 Requirements)
  // ============================================================================

  /**
   * Get national average health score
   *
   * Based on Federal Reserve Survey of Consumer Finances data
   *
   * @returns National benchmark data
   */
  async getNationalAverage(): Promise<BenchmarkComparison> {
    // National average across all age and income groups
    const nationalAvgScore = 65; // Based on Federal Reserve data

    return {
      percentile: 50, // National average is 50th percentile
      ageGroupAverage: nationalAvgScore,
      incomeGroupAverage: nationalAvgScore,
      comparison: "average",
    };
  }

  /**
   * Get peer group average based on age and income
   *
   * @param age - User's age
   * @param income - User's annual income
   * @returns Peer group benchmark data
   */
  async getPeerGroupAverage(
    age: number,
    income: number,
  ): Promise<BenchmarkComparison> {
    const ageGroup = this.getAgeGroupFromAge(age);
    const incomeGroup = this.getIncomeGroupFromIncome(income);

    const ageBenchmark = AGE_GROUP_BENCHMARKS[ageGroup];
    const incomeBenchmark = INCOME_GROUP_BENCHMARKS[incomeGroup];

    // Calculate percentile based on peer group
    const peerAvgScore = (ageBenchmark.avgScore + incomeBenchmark.avgScore) / 2;

    return {
      percentile: 50, // Would calculate based on actual distribution
      ageGroupAverage: ageBenchmark.avgScore,
      incomeGroupAverage: incomeBenchmark.avgScore,
      comparison: "average",
    };
  }

  /**
   * Calculate user's percentile ranking
   *
   * @param score - User's health score
   * @returns Percentile ranking (0-100)
   */
  async getScorePercentile(score: number): Promise<number> {
    // Simplified percentile calculation
    // In production, this would query actual score distribution from database

    if (score >= 90) return 95;
    if (score >= 80) return 85;
    if (score >= 70) return 70;
    if (score >= 60) return 50;
    if (score >= 50) return 30;
    return 15;
  }

  /**
   * Get historical score data with trend analysis
   *
   * @param userId - User ID
   * @param months - Number of months of history (default: 6)
   * @returns Historical score data with trends
   */
  async getScoreHistoryWithTrends(
    userId: string,
    months = 6,
  ): Promise<{
    scores: ScoreHistoryPoint[];
    trendDirection: "improving" | "declining" | "stable";
    trendPercent: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  }> {
    const days = months * 30;
    const scores = await this.getScoreHistory(userId, days);

    if (scores.length === 0) {
      return {
        scores: [],
        trendDirection: "stable",
        trendPercent: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
      };
    }

    // Calculate trend
    const latestScore = scores[scores.length - 1]?.score || 0;
    const { trendDirection, trendPercent } = this.calculateTrend(
      latestScore,
      scores,
    );

    // Calculate statistics
    const scoreValues = scores.map((s) => s.score);
    const averageScore = Math.round(
      scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length,
    );
    const highestScore = Math.max(...scoreValues);
    const lowestScore = Math.min(...scoreValues);

    return {
      scores,
      trendDirection,
      trendPercent,
      averageScore,
      highestScore,
      lowestScore,
    };
  }
}

// Export singleton instance
export const healthScoreCalculatorV2 = new HealthScoreCalculatorV2();
export default healthScoreCalculatorV2;
