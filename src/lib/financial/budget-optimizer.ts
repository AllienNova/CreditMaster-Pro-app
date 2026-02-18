/**
 * Budget Optimizer Service
 *
 * AI-powered budget optimization with:
 * - Spending analysis and category recommendations
 * - Budget templates based on income level
 * - What-if scenario modeling
 * - Savings opportunity identification
 * - Benchmark comparisons
 */

import { AIMLService } from "@/lib/aiml-service";
import { financialContextEngine } from "./financial-context-engine";
import { FinancialContext } from "./types/financial-context.types";
import {
  BudgetOptimizationResult,
  BudgetCategorySummary,
  BudgetOptimization,
  BudgetTemplate,
  BudgetTemplateCategory,
  BudgetScenario,
  BudgetChange,
  BudgetImpact,
  OptimizeBudgetRequest,
} from "./types/ai-coach.types";

// ============================================================================
// CONSTANTS
// ============================================================================

const AI_MODEL = "anthropic/claude-4.5-sonnet";

// Budget benchmarks by category (percentage of income)
const CATEGORY_BENCHMARKS: Record<
  string,
  { min: number; max: number; ideal: number }
> = {
  housing: { min: 0.25, max: 0.35, ideal: 0.28 },
  transportation: { min: 0.1, max: 0.15, ideal: 0.12 },
  food: { min: 0.1, max: 0.15, ideal: 0.12 },
  utilities: { min: 0.05, max: 0.1, ideal: 0.07 },
  healthcare: { min: 0.05, max: 0.1, ideal: 0.07 },
  insurance: { min: 0.1, max: 0.15, ideal: 0.12 },
  savings: { min: 0.1, max: 0.2, ideal: 0.15 },
  debt_payments: { min: 0.05, max: 0.2, ideal: 0.1 },
  entertainment: { min: 0.05, max: 0.1, ideal: 0.05 },
  personal: { min: 0.05, max: 0.1, ideal: 0.05 },
  education: { min: 0.0, max: 0.1, ideal: 0.05 },
  other: { min: 0.0, max: 0.1, ideal: 0.02 },
};

// Budget templates for different income levels
const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: "starter",
    name: "Starter Budget",
    description: "For those just starting their financial journey",
    forIncomeRange: { min: 0, max: 40000 },
    categories: [],
    savingsRate: 0.1,
  },
  {
    id: "balanced",
    name: "Balanced Budget",
    description: "A well-rounded approach for middle income",
    forIncomeRange: { min: 40000, max: 80000 },
    categories: [],
    savingsRate: 0.15,
  },
  {
    id: "growth",
    name: "Growth Budget",
    description: "Maximize savings and investments",
    forIncomeRange: { min: 80000, max: 150000 },
    categories: [],
    savingsRate: 0.2,
  },
  {
    id: "wealth",
    name: "Wealth Builder",
    description: "Aggressive savings for high earners",
    forIncomeRange: { min: 150000, max: Infinity },
    categories: [],
    savingsRate: 0.3,
  },
];

// ============================================================================
// BUDGET OPTIMIZER CLASS
// ============================================================================

class BudgetOptimizer {
  private aimlService: AIMLService | null = null;

  private getAIService(): AIMLService | null {
    if (!this.aimlService && process.env.AIML_API_KEY) {
      try {
        this.aimlService = new AIMLService();
      } catch {
        // AIML service initialization failed
      }
    }
    return this.aimlService;
  }

  /**
   * Generate comprehensive budget optimization analysis
   */
  async optimizeBudget(
    request: OptimizeBudgetRequest,
  ): Promise<BudgetOptimizationResult> {
    const {
      userId,
      includeTemplates = true,
      includeScenarios = true,
      targetSavingsRate,
    } = request;

    // Get user's financial context
    const context = await financialContextEngine.getFinancialContext(userId);

    // Analyze current budget
    const categorySummaries = this.analyzeBudgetCategories(context);
    const totalBudgeted = categorySummaries.reduce(
      (sum, c) => sum + c.budgeted,
      0,
    );
    const totalSpent = categorySummaries.reduce((sum, c) => sum + c.spent, 0);

    // Generate optimizations
    const optimizations = this.generateOptimizations(
      categorySummaries,
      context,
    );
    const potentialMonthlySavings = optimizations.reduce(
      (sum, o) => sum + o.potentialSavings,
      0,
    );

    // Get suggested template
    const suggestedTemplate = includeTemplates
      ? this.getSuggestedTemplate(context.transactions.totalIncome * 12)
      : undefined;

    // Generate scenarios
    const scenarios = includeScenarios
      ? this.generateScenarios(context, optimizations, targetSavingsRate)
      : [];

    // Generate AI analysis
    const aiAnalysis = await this.generateAIAnalysis(
      context,
      categorySummaries,
      optimizations,
    );

    return {
      userId,
      generatedAt: new Date(),
      currentBudget: categorySummaries,
      totalBudgeted,
      totalSpent,
      totalIncome: context.transactions.totalIncome,
      optimizations,
      potentialMonthlySavings,
      suggestedTemplate,
      scenarios,
      aiAnalysis,
      keyInsights: this.extractKeyInsights(categorySummaries, optimizations),
    };
  }

  /**
   * Analyze budget categories from financial context
   */
  private analyzeBudgetCategories(
    context: FinancialContext,
  ): BudgetCategorySummary[] {
    const summaries: BudgetCategorySummary[] = [];
    const income = context.transactions.totalIncome;

    for (const budget of context.budgets) {
      const benchmark =
        CATEGORY_BENCHMARKS[budget.category] || CATEGORY_BENCHMARKS.other;
      const idealAmount = income * benchmark.ideal;
      const percentUsed =
        budget.budgetedAmount > 0
          ? (budget.spentAmount / budget.budgetedAmount) * 100
          : 0;

      summaries.push({
        category: budget.category,
        categoryName: this.formatCategoryName(budget.category),
        budgeted: budget.budgetedAmount,
        spent: budget.spentAmount,
        percentUsed,
        trend: this.determineTrend(budget.spentAmount, budget.budgetedAmount),
        benchmarkComparison:
          idealAmount > 0
            ? ((budget.spentAmount - idealAmount) / idealAmount) * 100
            : 0,
      });
    }

    return summaries;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizations(
    categories: BudgetCategorySummary[],
    context: FinancialContext,
  ): BudgetOptimization[] {
    const optimizations: BudgetOptimization[] = [];
    const income = context.transactions.totalIncome;

    for (const category of categories) {
      const benchmark =
        CATEGORY_BENCHMARKS[category.category] || CATEGORY_BENCHMARKS.other;
      const idealAmount = income * benchmark.ideal;
      const maxAmount = income * benchmark.max;

      if (category.spent > maxAmount) {
        const savings = category.spent - idealAmount;
        optimizations.push({
          id: `opt_reduce_${category.category}`,
          category: category.category,
          type: "reduce",
          currentAmount: category.spent,
          suggestedAmount: idealAmount,
          potentialSavings: savings,
          reason: `${category.categoryName} spending is ${((category.spent / income) * 100).toFixed(0)}% of income`,
          difficulty:
            savings > income * 0.1
              ? "hard"
              : savings > income * 0.05
                ? "moderate"
                : "easy",
          priorityScore: ((category.spent - maxAmount) / income) * 100,
          actionSteps: this.getReductionSteps(category.category),
        });
      }
    }
    return optimizations.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  private getSuggestedTemplate(annualIncome: number): BudgetTemplate {
    const template =
      BUDGET_TEMPLATES.find(
        (t) =>
          annualIncome >= t.forIncomeRange.min &&
          annualIncome < t.forIncomeRange.max,
      ) || BUDGET_TEMPLATES[1];
    const monthlyIncome = annualIncome / 12;
    template.categories = Object.entries(CATEGORY_BENCHMARKS).map(
      ([category, benchmark]) => ({
        category,
        categoryName: this.formatCategoryName(category),
        percentOfIncome: benchmark.ideal * 100,
        suggestedAmount: monthlyIncome * benchmark.ideal,
        isRequired: ["housing", "food", "utilities", "transportation"].includes(
          category,
        ),
        tips: this.getCategoryTips(category),
      }),
    );
    return template;
  }

  private generateScenarios(
    context: FinancialContext,
    optimizations: BudgetOptimization[],
    targetSavingsRate?: number,
  ): BudgetScenario[] {
    const scenarios: BudgetScenario[] = [];
    const easyOpts = optimizations.filter((o) => o.difficulty === "easy");
    if (easyOpts.length > 0) {
      const easySavings = easyOpts.reduce(
        (sum, o) => sum + o.potentialSavings,
        0,
      );
      scenarios.push(
        this.createScenario(
          "easy_wins",
          "Easy Wins",
          "Simple changes",
          easyOpts.map((o) => ({
            category: o.category,
            currentAmount: o.currentAmount,
            newAmount: o.suggestedAmount,
            difference: o.currentAmount - o.suggestedAmount,
          })),
          easySavings,
          context,
        ),
      );
    }
    return scenarios;
  }

  private createScenario(
    id: string,
    name: string,
    description: string,
    changes: BudgetChange[],
    projectedSavings: number,
    context: FinancialContext,
  ): BudgetScenario {
    const impact: BudgetImpact = {
      monthlySavings: projectedSavings,
      annualSavings: projectedSavings * 12,
      goalAccelerationDays: Math.round(projectedSavings * 3),
      debtPayoffAcceleration:
        context.debts.totalDebt > 0
          ? Math.round(
              context.debts.totalDebt /
                (context.debts.monthlyPayments + projectedSavings) -
                context.debts.totalDebt / context.debts.monthlyPayments,
            )
          : 0,
      lifestyleImpact:
        projectedSavings > context.transactions.totalIncome * 0.1
          ? "significant"
          : "minimal",
    };
    return { id, name, description, changes, projectedSavings, impact };
  }

  private async generateAIAnalysis(
    context: FinancialContext,
    categories: BudgetCategorySummary[],
    optimizations: BudgetOptimization[],
  ): Promise<string> {
    const aiService = this.getAIService();
    if (!aiService) return this.getDefaultAnalysis(optimizations);
    try {
      const response = await aiService.chat(
        AI_MODEL,
        [
          {
            role: "system",
            content: "You are a financial advisor. Be concise.",
          },
          {
            role: "user",
            content: `Analyze: Income $${context.transactions.totalIncome}/mo, Savings ${((context.transactions.netCashFlow / context.transactions.totalIncome) * 100).toFixed(1)}%`,
          },
        ],
        { temperature: 0.3, max_tokens: 150 },
      );
      return (
        response.choices[0]?.message?.content ||
        this.getDefaultAnalysis(optimizations)
      );
    } catch {
      return this.getDefaultAnalysis(optimizations);
    }
  }

  private formatCategoryName(category: string): string {
    return category
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  private determineTrend(
    spent: number,
    budgeted: number,
  ): "increasing" | "decreasing" | "stable" {
    const ratio = budgeted > 0 ? spent / budgeted : 0;
    if (ratio > 1.1) return "increasing";
    if (ratio < 0.9) return "decreasing";
    return "stable";
  }

  private getReductionSteps(category: string): string[] {
    const steps: Record<string, string[]> = {
      food: ["Meal prep weekly", "Use grocery lists", "Reduce dining out"],
      entertainment: ["Cancel unused subscriptions", "Find free alternatives"],
    };
    return steps[category] || ["Review spending", "Set category limit"];
  }

  private getCategoryTips(category: string): string[] {
    return ["Track spending weekly"];
  }

  private extractKeyInsights(
    categories: BudgetCategorySummary[],
    optimizations: BudgetOptimization[],
  ): string[] {
    const insights: string[] = [];
    const overBudget = categories.filter((c) => c.percentUsed > 100);
    if (overBudget.length > 0)
      insights.push(`${overBudget.length} categories over budget`);
    const totalSavings = optimizations.reduce(
      (sum, o) => sum + o.potentialSavings,
      0,
    );
    if (totalSavings > 0)
      insights.push(`Potential savings: $${totalSavings.toFixed(0)}/month`);
    return insights;
  }

  private getDefaultAnalysis(optimizations: BudgetOptimization[]): string {
    const savings = optimizations.reduce(
      (sum, o) => sum + o.potentialSavings,
      0,
    );
    return savings > 0
      ? `Potential savings: $${savings.toFixed(0)}/month`
      : "Your budget is well-managed.";
  }
}

// Export both class and instance for testing
export { BudgetOptimizer };
export const budgetOptimizer = new BudgetOptimizer();
export default budgetOptimizer;
