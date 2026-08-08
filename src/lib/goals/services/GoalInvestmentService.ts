/**
 * Goal Investment Service
 *
 * Links financial goals with investment accounts and manages
 * automated contributions, allocations, and progress tracking.
 */

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();

// ============================================================================
// TYPES
// ============================================================================

export type GoalType =
  | "retirement"
  | "house"
  | "education"
  | "emergency"
  | "vacation"
  | "car"
  | "wedding"
  | "custom";
export type RiskTolerance = "conservative" | "moderate" | "aggressive";
export type ContributionFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly";
export type GoalStatus = "active" | "paused" | "completed" | "cancelled";

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  createdAt: Date;
  status: GoalStatus;
  priority: number;
  icon?: string;
  color?: string;
}

export interface GoalAllocation {
  assetClass: string;
  targetPercent: number;
  currentPercent: number;
  currentValue: number;
}

export interface GoalProjection {
  currentAmount: number;
  projectedAmount: number;
  targetAmount: number;
  projectedDate: Date;
  targetDate: Date;
  isOnTrack: boolean;
  shortfallAmount?: number;
  requiredMonthlyContribution: number;
  confidenceLevel: number;
  scenarios: {
    pessimistic: number;
    expected: number;
    optimistic: number;
  };
}

export interface RecommendedAllocation {
  assetClass: string;
  percent: number;
  rationale: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GOAL_TYPE_DEFAULTS: Record<
  GoalType,
  {
    defaultTimelineYears: number;
    suggestedRisk: RiskTolerance;
    defaultPriority: number;
  }
> = {
  retirement: {
    defaultTimelineYears: 30,
    suggestedRisk: "aggressive",
    defaultPriority: 1,
  },
  house: {
    defaultTimelineYears: 5,
    suggestedRisk: "moderate",
    defaultPriority: 2,
  },
  education: {
    defaultTimelineYears: 18,
    suggestedRisk: "moderate",
    defaultPriority: 3,
  },
  emergency: {
    defaultTimelineYears: 1,
    suggestedRisk: "conservative",
    defaultPriority: 1,
  },
  vacation: {
    defaultTimelineYears: 1,
    suggestedRisk: "conservative",
    defaultPriority: 5,
  },
  car: {
    defaultTimelineYears: 3,
    suggestedRisk: "conservative",
    defaultPriority: 4,
  },
  wedding: {
    defaultTimelineYears: 2,
    suggestedRisk: "conservative",
    defaultPriority: 3,
  },
  custom: {
    defaultTimelineYears: 5,
    suggestedRisk: "moderate",
    defaultPriority: 5,
  },
};

const RISK_ALLOCATIONS: Record<RiskTolerance, RecommendedAllocation[]> = {
  conservative: [
    {
      assetClass: "bonds",
      percent: 60,
      rationale: "Stable income with lower volatility",
    },
    {
      assetClass: "stocks",
      percent: 25,
      rationale: "Growth potential with moderate risk",
    },
    {
      assetClass: "cash",
      percent: 15,
      rationale: "Liquidity and capital preservation",
    },
  ],
  moderate: [
    {
      assetClass: "stocks",
      percent: 50,
      rationale: "Balanced growth opportunity",
    },
    { assetClass: "bonds", percent: 35, rationale: "Income and stability" },
    {
      assetClass: "alternatives",
      percent: 10,
      rationale: "Diversification benefits",
    },
    { assetClass: "cash", percent: 5, rationale: "Emergency reserves" },
  ],
  aggressive: [
    {
      assetClass: "stocks",
      percent: 80,
      rationale: "Maximum growth potential",
    },
    {
      assetClass: "alternatives",
      percent: 15,
      rationale: "Higher risk/return assets",
    },
    {
      assetClass: "bonds",
      percent: 5,
      rationale: "Minimal fixed income for stability",
    },
  ],
};

// ============================================================================
// SERVICE
// ============================================================================

export class GoalInvestmentService {
  // ==========================================================================
  // GOAL MANAGEMENT
  // ==========================================================================

  /**
   * Create a new financial goal
   */
  async createGoal(
    userId: string,
    data: {
      name: string;
      type: GoalType;
      targetAmount: number;
      targetDate: Date;
      initialAmount?: number;
      priority?: number;
      icon?: string;
      color?: string;
    },
  ): Promise<FinancialGoal | null> {
    try {
      const defaults = GOAL_TYPE_DEFAULTS[data.type];

      const { data: result, error } = await supabase
        .from("financial_goals")
        .insert({
          user_id: userId,
          name: data.name,
          type: data.type,
          target_amount: data.targetAmount,
          current_amount: data.initialAmount || 0,
          target_date: data.targetDate.toISOString(),
          status: "active",
          priority: data.priority ?? defaults.defaultPriority,
          icon: data.icon,
          color: data.color,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // GoalInvestmentService error: Failed to create goal
        return null;
      }

      return this.mapGoalFromDb(result);
    } catch (_error) {
      // GoalInvestmentService error: Create goal error
      void _error;
      return null;
    }
  }

  /**
   * Get all goals for a user
   */
  async getGoals(userId: string): Promise<FinancialGoal[]> {
    try {
      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", userId)
        .order("priority", { ascending: true });

      if (error) {
        // GoalInvestmentService error: Failed to get goals
        return [];
      }

      return (data || []).map(this.mapGoalFromDb);
    } catch {
      return [];
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    goalId: string,
    userId: string,
    currentAmount: number,
  ): Promise<boolean> {
    try {
      // The user_id filter is load-bearing: this runs on the service role,
      // which bypasses RLS. Without it this writes an arbitrary amount onto
      // any user's goal. Scoped now rather than annotated because nothing
      // calls it yet, so adding the parameter costs nothing.
      const { error } = await supabase
        .from("financial_goals")
        .update({
          current_amount: currentAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", goalId)
        .eq("user_id", userId);

      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // ALLOCATIONS & RECOMMENDATIONS
  // ==========================================================================

  /**
   * Get recommended allocation for a goal based on timeline and risk
   */
  getRecommendedAllocation(
    goalType: GoalType,
    yearsToGoal: number,
    riskTolerance?: RiskTolerance,
  ): RecommendedAllocation[] {
    // Determine risk based on timeline if not provided
    let risk = riskTolerance;

    if (!risk) {
      if (yearsToGoal <= 2) {
        risk = "conservative";
      } else if (yearsToGoal <= 5) {
        risk = "moderate";
      } else {
        risk = GOAL_TYPE_DEFAULTS[goalType].suggestedRisk;
      }
    }

    // Adjust allocation based on time remaining
    const baseAllocation = RISK_ALLOCATIONS[risk];

    // For shorter timelines, shift towards more conservative
    if (yearsToGoal <= 1 && risk !== "conservative") {
      return RISK_ALLOCATIONS.conservative;
    }

    return baseAllocation;
  }

  /**
   * Calculate glide path - allocation changes as goal approaches
   */
  calculateGlidePath(
    goalType: GoalType,
    totalYears: number,
    currentYear: number,
  ): RecommendedAllocation[] {
    const yearsRemaining = totalYears - currentYear;
    const progressPercent = (currentYear / totalYears) * 100;

    // Start aggressive, gradually become conservative
    if (progressPercent < 25) {
      return this.getRecommendedAllocation(
        goalType,
        yearsRemaining,
        "aggressive",
      );
    } else if (progressPercent < 50) {
      return this.getRecommendedAllocation(
        goalType,
        yearsRemaining,
        "moderate",
      );
    } else if (progressPercent < 75) {
      // Blend between moderate and conservative
      const moderate = RISK_ALLOCATIONS.moderate;
      const conservative = RISK_ALLOCATIONS.conservative;
      return this.blendAllocations(moderate, conservative, 0.5);
    } else {
      return this.getRecommendedAllocation(
        goalType,
        yearsRemaining,
        "conservative",
      );
    }
  }

  private blendAllocations(
    a: RecommendedAllocation[],
    b: RecommendedAllocation[],
    weight: number,
  ): RecommendedAllocation[] {
    const allClasses = new Set([
      ...a.map((x) => x.assetClass),
      ...b.map((x) => x.assetClass),
    ]);

    return Array.from(allClasses).map((assetClass) => {
      const aItem = a.find((x) => x.assetClass === assetClass);
      const bItem = b.find((x) => x.assetClass === assetClass);
      const aPercent = aItem?.percent || 0;
      const bPercent = bItem?.percent || 0;

      return {
        assetClass,
        percent: Math.round(aPercent * (1 - weight) + bPercent * weight),
        rationale: aItem?.rationale || bItem?.rationale || "",
      };
    });
  }

  // ==========================================================================
  // PROJECTIONS & PROGRESS
  // ==========================================================================

  /**
   * Calculate goal projection with Monte Carlo simulation
   */
  calculateProjection(
    currentAmount: number,
    monthlyContribution: number,
    targetAmount: number,
    targetDate: Date,
    expectedReturn: number = 0.07,
    volatility: number = 0.15,
  ): GoalProjection {
    const now = new Date();
    const monthsRemaining = Math.max(
      0,
      (targetDate.getFullYear() - now.getFullYear()) * 12 +
        (targetDate.getMonth() - now.getMonth()),
    );

    const monthlyReturn = expectedReturn / 12;
    const monthlyVol = volatility / Math.sqrt(12);

    // Expected projection
    let expected = currentAmount;
    for (let i = 0; i < monthsRemaining; i++) {
      expected = expected * (1 + monthlyReturn) + monthlyContribution;
    }

    // Pessimistic (5th percentile - ~1.65 std dev below)
    let pessimistic = currentAmount;
    const pessimisticReturn = monthlyReturn - 1.65 * monthlyVol;
    for (let i = 0; i < monthsRemaining; i++) {
      pessimistic = pessimistic * (1 + pessimisticReturn) + monthlyContribution;
    }

    // Optimistic (95th percentile - ~1.65 std dev above)
    let optimistic = currentAmount;
    const optimisticReturn = monthlyReturn + 1.65 * monthlyVol;
    for (let i = 0; i < monthsRemaining; i++) {
      optimistic = optimistic * (1 + optimisticReturn) + monthlyContribution;
    }

    const isOnTrack = expected >= targetAmount;
    const shortfall = isOnTrack ? undefined : targetAmount - expected;

    // Calculate required monthly contribution to reach target
    const requiredMonthly = this.calculateRequiredContribution(
      currentAmount,
      targetAmount,
      monthsRemaining,
      expectedReturn,
    );

    // Confidence level based on how much expected exceeds target
    const confidenceLevel = Math.min(
      100,
      Math.round((expected / targetAmount) * 100),
    );

    return {
      currentAmount,
      projectedAmount: Math.round(expected),
      targetAmount,
      projectedDate: targetDate,
      targetDate,
      isOnTrack,
      shortfallAmount: shortfall ? Math.round(shortfall) : undefined,
      requiredMonthlyContribution: Math.round(requiredMonthly),
      confidenceLevel,
      scenarios: {
        pessimistic: Math.round(pessimistic),
        expected: Math.round(expected),
        optimistic: Math.round(optimistic),
      },
    };
  }

  private calculateRequiredContribution(
    current: number,
    target: number,
    months: number,
    annualReturn: number,
  ): number {
    if (months <= 0) return target - current;

    const r = annualReturn / 12;
    const fv = target;
    const pv = current;
    const n = months;

    // PMT formula: PMT = (FV - PV * (1+r)^n) / (((1+r)^n - 1) / r)
    const compoundFactor = Math.pow(1 + r, n);
    const annuityFactor = (compoundFactor - 1) / r;

    return (fv - pv * compoundFactor) / annuityFactor;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private mapGoalFromDb(row: Record<string, unknown>): FinancialGoal {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      type: row.type as GoalType,
      targetAmount: row.target_amount as number,
      currentAmount: row.current_amount as number,
      targetDate: new Date(row.target_date as string),
      createdAt: new Date(row.created_at as string),
      status: row.status as GoalStatus,
      priority: row.priority as number,
      icon: row.icon as string | undefined,
      color: row.color as string | undefined,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let goalInvestmentServiceInstance: GoalInvestmentService | null = null;

export function getGoalInvestmentService(): GoalInvestmentService {
  if (!goalInvestmentServiceInstance) {
    goalInvestmentServiceInstance = new GoalInvestmentService();
  }
  return goalInvestmentServiceInstance;
}

export const goalInvestmentService = getGoalInvestmentService();
