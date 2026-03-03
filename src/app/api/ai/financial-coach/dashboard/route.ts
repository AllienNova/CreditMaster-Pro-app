/**
 * AI Financial Coach - Dashboard API
 *
 * GET /api/ai/financial-coach/dashboard - Get coach dashboard summary
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { financialContextEngine } from "@/lib/financial/financial-context-engine";
import { recommendationEngine } from "@/lib/financial/recommendation-engine";
import { goalPlanner } from "@/lib/financial/goal-planner";
import {
  CoachDashboard,
  Recommendation,
} from "@/lib/financial/types/ai-coach.types";
import type { FinancialContext } from "@/lib/financial/types/financial-context.types";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all data in parallel
    const [context, recommendations, goals] = await Promise.all([
      financialContextEngine.getFinancialContext(user.id),
      recommendationEngine.generateRecommendations({
        userId: user.id,
        limit: 5,
        includeAI: false,
      }),
      goalPlanner.getUserGoals(user.id),
    ]);

    // Calculate dashboard metrics
    const activeGoals = goals.filter(
      (g) => g.status !== "completed" && g.status !== "paused",
    );
    const goalsOnTrack = activeGoals.filter(
      (g) => g.status === "on_track" || g.status === "ahead",
    ).length;

    // Find next milestone
    let nextMilestone:
      | {
          goalName: string;
          id: string;
          name: string;
          targetAmount: number;
          targetPercentage: number;
          achievedDate?: Date;
          isAchieved: boolean;
          celebrationMessage?: string;
        }
      | undefined = undefined;
    for (const goal of activeGoals) {
      const upcoming = goal.milestones.find((m) => !m.isAchieved);
      if (
        upcoming &&
        (!nextMilestone || upcoming.targetAmount < nextMilestone.targetAmount)
      ) {
        nextMilestone = { ...upcoming, goalName: goal.name };
      }
    }

    // Determine budget health
    const overBudgetCount = context.budgets.filter(
      (b) => b.status === "over_budget",
    ).length;
    const budgetHealth =
      overBudgetCount >= 3
        ? "critical"
        : overBudgetCount >= 1
          ? "warning"
          : "healthy";

    // Calculate debt-free date
    let debtFreeDate = undefined;
    let monthsToDebtFree = undefined;
    if (context.debts.totalDebt > 0 && context.debts.monthlyPayments > 0) {
      monthsToDebtFree = Math.ceil(
        context.debts.totalDebt / context.debts.monthlyPayments,
      );
      debtFreeDate = new Date();
      debtFreeDate.setMonth(debtFreeDate.getMonth() + monthsToDebtFree);
    }

    // Generate coach message
    const coachMessage = generateCoachMessage(
      context,
      recommendations.recommendations.length,
      activeGoals.length,
    );
    const focusArea = determineFocusArea(
      context,
      recommendations.recommendations,
    );

    const dashboard: CoachDashboard = {
      userId: user.id,
      generatedAt: new Date(),
      healthScore: context.healthScore.overallScore,
      healthTrend: "stable", // Would need historical data to determine
      topRecommendations: recommendations.recommendations,
      pendingActionsCount: recommendations.recommendations.filter(
        (r) => r.status === "pending",
      ).length,
      activeGoals: activeGoals.length,
      goalsOnTrack,
      nextMilestone,
      budgetHealth,
      monthlyUnallocated: context.transactions.netCashFlow,
      potentialSavings: recommendations.recommendations.reduce(
        (sum, r) => sum + (r.potentialSavings || 0),
        0,
      ),
      debtFreeDate,
      monthsToDebtFree,
      currentDebtProgress: context.debts.totalDebt > 0 ? 0 : 100, // Would need historical data
      coachMessage,
      focusArea,
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Error fetching coach dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch coach dashboard" },
      { status: 500 },
    );
  }
}

function generateCoachMessage(
  context: FinancialContext,
  recCount: number,
  goalCount: number,
): string {
  if (context.healthScore.overallScore >= 80) {
    return "Great job! Your finances are in excellent shape. Let's focus on optimizing your investments.";
  }
  if (context.debts.debtToIncomeRatio > 40) {
    return "Let's work on reducing your debt. I have some strategies that could help you become debt-free faster.";
  }
  if (recCount > 3) {
    return `I have ${recCount} recommendations to help improve your financial health. Let's tackle them together!`;
  }
  if (goalCount === 0) {
    return "Setting financial goals is the first step to success. Let's create your first goal today!";
  }
  return "You're making progress! Keep up the good work and check out your personalized recommendations.";
}

function determineFocusArea(context: FinancialContext, recommendations: Recommendation[]): string {
  if (context.debts.debtToIncomeRatio > 40) return "debt_payoff";
  if (context.accounts.totalSavings < context.transactions.totalExpenses * 3)
    return "emergency_fund";
  if (recommendations.length > 0) return recommendations[0].type;
  return "general";
}
