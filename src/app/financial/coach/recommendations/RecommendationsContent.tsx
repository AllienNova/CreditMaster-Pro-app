"use client";

import { useCallback } from "react";
import AIBudgetRecommendations from "@/components/financial/AIBudgetRecommendations";
import AIGoalsOptimizer from "@/components/financial/AIGoalsOptimizer";
import AISpendingInsights from "@/components/financial/AISpendingInsights";

export default function RecommendationsContent() {
  const handleApplyBudgetRecommendations = useCallback(async () => {
    const response = await fetch("/api/financial/budgets/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applyAll: true }),
    });
    if (!response.ok) {
      throw new Error("Failed to apply budget recommendations");
    }
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Spending Insights
        </h2>
        <AISpendingInsights />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Budget Recommendations
        </h2>
        <AIBudgetRecommendations
          onApply={handleApplyBudgetRecommendations}
          period="monthly"
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Goal Optimizations
        </h2>
        <AIGoalsOptimizer />
      </section>
    </div>
  );
}
