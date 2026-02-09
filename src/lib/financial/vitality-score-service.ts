/**
 * Fynvita Financial Vitality Score Service
 *
 * Unifies credit score, spending health, savings rate, debt management,
 * and investment performance into a single holistic financial health score.
 */

import { supabaseAdmin } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type VitalityGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface ComponentScore<T = Record<string, unknown>> {
  score: number; // 0-100
  weight: number; // 0-1
  grade: VitalityGrade;
  trend: TrendDirection;
  details: T;
}

export interface CreditDetails {
  currentScore: number;
  scoreChange: number;
  utilizationRate: number;
  paymentHistory: number; // percentage
  accountAge: number; // months
  accountMix: number; // 0-100
}

export interface SpendingDetails {
  budgetAdherence: number; // percentage
  savingsRate: number; // percentage
  necessaryVsDiscretionary: number; // ratio
  monthlyTrend: number; // change percentage
}

export interface SavingsDetails {
  emergencyFundMonths: number;
  savingsRate: number; // percentage of income
  totalSavings: number;
  savingsGoalProgress: number; // percentage
}

export interface DebtDetails {
  debtToIncomeRatio: number;
  totalDebt: number;
  monthlyPayments: number;
  payoffProgress: number; // percentage
  highInterestDebt: number;
}

export interface InvestmentDetails {
  portfolioValue: number;
  ytdReturn: number; // percentage
  diversificationScore: number; // 0-100
  riskAdjustedReturn: number;
  contributionRate: number; // percentage of income
}

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  estimatedPoints: number;
  category: 'credit' | 'spending' | 'savings' | 'debt' | 'investments';
  actionUrl?: string;
}

export interface Milestone {
  target: number;
  description: string;
  reward?: string;
}

export interface FinancialVitalityScore {
  overall: number; // 0-100
  grade: VitalityGrade;
  percentile: number; // compared to peers
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
  credit: number;
  spending: number;
  savings: number;
  debt: number;
  investments: number;
}

// ============================================================================
// Constants
// ============================================================================

const COMPONENT_WEIGHTS = {
  credit: 0.25,
  spending: 0.20,
  savings: 0.20,
  debt: 0.20,
  investments: 0.15,
};

const GRADE_THRESHOLDS: { min: number; grade: VitalityGrade }[] = [
  { min: 90, grade: 'A' },
  { min: 80, grade: 'B' },
  { min: 70, grade: 'C' },
  { min: 60, grade: 'D' },
  { min: 0, grade: 'F' },
];

// ============================================================================
// Financial Vitality Score Service
// ============================================================================

class FinancialVitalityScoreService {
  /**
   * Calculate the complete Financial Vitality Score
   */
  async calculateVitalityScore(userId: string): Promise<FinancialVitalityScore> {
    // Fetch all component data
    const [credit, spending, savings, debt, investments] = await Promise.all([
      this.calculateCreditScore(userId),
      this.calculateSpendingScore(userId),
      this.calculateSavingsScore(userId),
      this.calculateDebtScore(userId),
      this.calculateInvestmentsScore(userId),
    ]);

    // Calculate overall score
    const overall = Math.round(
      credit.score * COMPONENT_WEIGHTS.credit +
      spending.score * COMPONENT_WEIGHTS.spending +
      savings.score * COMPONENT_WEIGHTS.savings +
      debt.score * COMPONENT_WEIGHTS.debt +
      investments.score * COMPONENT_WEIGHTS.investments
    );

    // Determine grade
    const grade = this.getGrade(overall);

    // Calculate trend from history
    const history = await this.getScoreHistory(userId, 30);
    const trend = this.calculateTrend(history);
    const trendPercentage = this.calculateTrendPercentage(history);

    // Get percentile (mock - would need aggregate data)
    const percentile = this.calculatePercentile(overall);

    // Generate quick wins
    const quickWins = this.generateQuickWins({
      credit,
      spending,
      savings,
      debt,
      investments,
    });

    // Determine next milestone
    const nextMilestone = this.getNextMilestone(overall);

    // Save score to history
    await this.saveScoreToHistory(userId, {
      overall,
      credit: credit.score,
      spending: spending.score,
      savings: savings.score,
      debt: debt.score,
      investments: investments.score,
    });

    return {
      overall,
      grade,
      percentile,
      components: {
        credit: { ...credit, weight: COMPONENT_WEIGHTS.credit },
        spending: { ...spending, weight: COMPONENT_WEIGHTS.spending },
        savings: { ...savings, weight: COMPONENT_WEIGHTS.savings },
        debt: { ...debt, weight: COMPONENT_WEIGHTS.debt },
        investments: { ...investments, weight: COMPONENT_WEIGHTS.investments },
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
  async getScoreHistory(userId: string, days: number = 30): Promise<VitalityScoreHistory[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('vitality_score_history')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (error) {
      // Error logged
      return [];
    }

    return (data || []).map((row: {
      date: string;
      overall: number;
      credit: number;
      spending: number;
      savings: number;
      debt: number;
      investments: number;
    }) => ({
      date: new Date(row.date),
      overall: row.overall,
      credit: row.credit,
      spending: row.spending,
      savings: row.savings,
      debt: row.debt,
      investments: row.investments,
    }));
  }

  /**
   * Calculate credit component score
   */
  private async calculateCreditScore(userId: string): Promise<{ score: number; grade: VitalityGrade; trend: TrendDirection; details: CreditDetails }> {
    // In production, this would fetch from credit monitoring service
    // Using mock data for now
    const mockDetails: CreditDetails = {
      currentScore: 720,
      scoreChange: 15,
      utilizationRate: 25,
      paymentHistory: 98,
      accountAge: 72,
      accountMix: 70,
    };

    // Score based on FICO-like factors
    let score = 0;

    // Credit score contribution (35%)
    if (mockDetails.currentScore >= 800) score += 35;
    else if (mockDetails.currentScore >= 740) score += 30;
    else if (mockDetails.currentScore >= 670) score += 25;
    else if (mockDetails.currentScore >= 580) score += 15;
    else score += 5;

    // Utilization (30%)
    if (mockDetails.utilizationRate <= 10) score += 30;
    else if (mockDetails.utilizationRate <= 30) score += 25;
    else if (mockDetails.utilizationRate <= 50) score += 15;
    else score += 5;

    // Payment history (25%)
    score += (mockDetails.paymentHistory / 100) * 25;

    // Account age (10%)
    if (mockDetails.accountAge >= 84) score += 10;
    else if (mockDetails.accountAge >= 36) score += 7;
    else score += 3;

    const trend: TrendDirection = mockDetails.scoreChange > 0 ? 'improving' : mockDetails.scoreChange < 0 ? 'declining' : 'stable';

    return {
      score: Math.round(score),
      grade: this.getGrade(score),
      trend,
      details: mockDetails,
    };
  }

  /**
   * Calculate spending component score
   */
  private async calculateSpendingScore(userId: string): Promise<{ score: number; grade: VitalityGrade; trend: TrendDirection; details: SpendingDetails }> {
    const mockDetails: SpendingDetails = {
      budgetAdherence: 85,
      savingsRate: 15,
      necessaryVsDiscretionary: 0.7,
      monthlyTrend: -5,
    };

    let score = 0;

    // Budget adherence (40%)
    score += (mockDetails.budgetAdherence / 100) * 40;

    // Savings rate (30%)
    if (mockDetails.savingsRate >= 20) score += 30;
    else if (mockDetails.savingsRate >= 15) score += 25;
    else if (mockDetails.savingsRate >= 10) score += 20;
    else if (mockDetails.savingsRate >= 5) score += 10;
    else score += 5;

    // Spending ratio (20%)
    if (mockDetails.necessaryVsDiscretionary >= 0.7) score += 20;
    else if (mockDetails.necessaryVsDiscretionary >= 0.5) score += 15;
    else score += 10;

    // Trend (10%)
    if (mockDetails.monthlyTrend < 0) score += 10;
    else if (mockDetails.monthlyTrend < 5) score += 7;
    else score += 3;

    const trend: TrendDirection = mockDetails.monthlyTrend < 0 ? 'improving' : mockDetails.monthlyTrend > 5 ? 'declining' : 'stable';

    return {
      score: Math.round(score),
      grade: this.getGrade(score),
      trend,
      details: mockDetails,
    };
  }

  /**
   * Calculate savings component score
   */
  private async calculateSavingsScore(userId: string): Promise<{ score: number; grade: VitalityGrade; trend: TrendDirection; details: SavingsDetails }> {
    const mockDetails: SavingsDetails = {
      emergencyFundMonths: 4,
      savingsRate: 15,
      totalSavings: 25000,
      savingsGoalProgress: 65,
    };

    let score = 0;

    // Emergency fund (40%)
    if (mockDetails.emergencyFundMonths >= 6) score += 40;
    else if (mockDetails.emergencyFundMonths >= 3) score += 30;
    else if (mockDetails.emergencyFundMonths >= 1) score += 15;
    else score += 5;

    // Savings rate (35%)
    if (mockDetails.savingsRate >= 20) score += 35;
    else if (mockDetails.savingsRate >= 15) score += 28;
    else if (mockDetails.savingsRate >= 10) score += 20;
    else score += 10;

    // Goal progress (25%)
    score += (mockDetails.savingsGoalProgress / 100) * 25;

    const trend: TrendDirection = mockDetails.savingsRate >= 15 ? 'improving' : mockDetails.savingsRate >= 10 ? 'stable' : 'declining';

    return {
      score: Math.round(score),
      grade: this.getGrade(score),
      trend,
      details: mockDetails,
    };
  }

  /**
   * Calculate debt component score
   */
  private async calculateDebtScore(userId: string): Promise<{ score: number; grade: VitalityGrade; trend: TrendDirection; details: DebtDetails }> {
    const mockDetails: DebtDetails = {
      debtToIncomeRatio: 0.35,
      totalDebt: 45000,
      monthlyPayments: 1200,
      payoffProgress: 40,
      highInterestDebt: 5000,
    };

    let score = 0;

    // DTI ratio (40%)
    if (mockDetails.debtToIncomeRatio <= 0.2) score += 40;
    else if (mockDetails.debtToIncomeRatio <= 0.35) score += 30;
    else if (mockDetails.debtToIncomeRatio <= 0.5) score += 20;
    else score += 10;

    // High interest debt (30%)
    if (mockDetails.highInterestDebt === 0) score += 30;
    else if (mockDetails.highInterestDebt < 5000) score += 20;
    else if (mockDetails.highInterestDebt < 15000) score += 10;
    else score += 5;

    // Payoff progress (30%)
    score += (mockDetails.payoffProgress / 100) * 30;

    const trend: TrendDirection = mockDetails.payoffProgress > 50 ? 'improving' : mockDetails.payoffProgress > 25 ? 'stable' : 'declining';

    return {
      score: Math.round(score),
      grade: this.getGrade(score),
      trend,
      details: mockDetails,
    };
  }

  /**
   * Calculate investments component score
   */
  private async calculateInvestmentsScore(userId: string): Promise<{ score: number; grade: VitalityGrade; trend: TrendDirection; details: InvestmentDetails }> {
    const mockDetails: InvestmentDetails = {
      portfolioValue: 85000,
      ytdReturn: 8.5,
      diversificationScore: 75,
      riskAdjustedReturn: 1.2,
      contributionRate: 12,
    };

    let score = 0;

    // Contribution rate (35%)
    if (mockDetails.contributionRate >= 15) score += 35;
    else if (mockDetails.contributionRate >= 10) score += 28;
    else if (mockDetails.contributionRate >= 5) score += 20;
    else score += 10;

    // Diversification (30%)
    score += (mockDetails.diversificationScore / 100) * 30;

    // Performance (25%)
    if (mockDetails.ytdReturn >= 10) score += 25;
    else if (mockDetails.ytdReturn >= 5) score += 20;
    else if (mockDetails.ytdReturn >= 0) score += 15;
    else score += 5;

    // Risk-adjusted (10%)
    if (mockDetails.riskAdjustedReturn >= 1.5) score += 10;
    else if (mockDetails.riskAdjustedReturn >= 1) score += 7;
    else score += 4;

    const trend: TrendDirection = mockDetails.ytdReturn > 5 ? 'improving' : mockDetails.ytdReturn > 0 ? 'stable' : 'declining';

    return {
      score: Math.round(score),
      grade: this.getGrade(score),
      trend,
      details: mockDetails,
    };
  }

  /**
   * Generate quick wins based on component scores
   */
  private generateQuickWins(components: {
    credit: { score: number; details: CreditDetails };
    spending: { score: number; details: SpendingDetails };
    savings: { score: number; details: SavingsDetails };
    debt: { score: number; details: DebtDetails };
    investments: { score: number; details: InvestmentDetails };
  }): QuickWin[] {
    const quickWins: QuickWin[] = [];

    // Credit quick wins
    if (components.credit.details.utilizationRate > 30) {
      quickWins.push({
        id: 'lower-utilization',
        title: 'Lower Credit Utilization',
        description: 'Pay down credit card balances to below 30% utilization',
        impact: 'high',
        estimatedPoints: 5,
        category: 'credit',
        actionUrl: '/dashboard/credit',
      });
    }

    // Savings quick wins
    if (components.savings.details.emergencyFundMonths < 3) {
      quickWins.push({
        id: 'emergency-fund',
        title: 'Build Emergency Fund',
        description: 'Save 3 months of expenses for emergencies',
        impact: 'high',
        estimatedPoints: 8,
        category: 'savings',
        actionUrl: '/dashboard/savings',
      });
    }

    // Debt quick wins
    if (components.debt.details.highInterestDebt > 0) {
      quickWins.push({
        id: 'pay-high-interest',
        title: 'Pay Off High-Interest Debt',
        description: 'Focus on paying down high-interest credit cards first',
        impact: 'high',
        estimatedPoints: 6,
        category: 'debt',
        actionUrl: '/dashboard/debt',
      });
    }

    // Investment quick wins
    if (components.investments.details.contributionRate < 15) {
      quickWins.push({
        id: 'increase-contributions',
        title: 'Increase Investment Contributions',
        description: 'Try to save at least 15% of income for retirement',
        impact: 'medium',
        estimatedPoints: 4,
        category: 'investments',
        actionUrl: '/dashboard/investments',
      });
    }

    // Spending quick wins
    if (components.spending.details.budgetAdherence < 80) {
      quickWins.push({
        id: 'track-spending',
        title: 'Stick to Your Budget',
        description: 'Review and adjust your budget categories',
        impact: 'medium',
        estimatedPoints: 3,
        category: 'spending',
        actionUrl: '/dashboard/spending',
      });
    }

    return quickWins.slice(0, 5); // Return top 5
  }

  /**
   * Get the next milestone
   */
  private getNextMilestone(currentScore: number): Milestone {
    const milestones = [
      { target: 60, description: 'Financial Starter', reward: 'Basic financial health achieved' },
      { target: 70, description: 'Financial Foundational', reward: 'Solid financial footing' },
      { target: 80, description: 'Financial Fit', reward: 'Above average financial health' },
      { target: 90, description: 'Financial Champion', reward: 'Excellent financial wellness' },
      { target: 100, description: 'Financial Master', reward: 'Peak financial vitality' },
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
    if (history.length < 2) return 'stable';

    const recent = history.slice(-7);
    const older = history.slice(-14, -7);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, h) => sum + h.overall, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.overall, 0) / older.length;

    const diff = recentAvg - olderAvg;

    if (diff > 2) return 'improving';
    if (diff < -2) return 'declining';
    return 'stable';
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
   * Calculate percentile (mock)
   */
  private calculatePercentile(score: number): number {
    // Mock percentile calculation based on score
    if (score >= 90) return 95;
    if (score >= 80) return 80;
    if (score >= 70) return 60;
    if (score >= 60) return 40;
    return 20;
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
    return 'F';
  }

  /**
   * Save score to history
   */
  private async saveScoreToHistory(
    userId: string,
    scores: {
      overall: number;
      credit: number;
      spending: number;
      savings: number;
      debt: number;
      investments: number;
    }
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const today = new Date().toISOString().split('T')[0];

    // Upsert to avoid duplicates for same day
    await supabase
      .from('vitality_score_history')
      .upsert({
        user_id: userId,
        date: today,
        ...scores,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date',
      });
  }
}

// Export singleton instance
export const vitalityScoreService = new FinancialVitalityScoreService();
export default vitalityScoreService;
