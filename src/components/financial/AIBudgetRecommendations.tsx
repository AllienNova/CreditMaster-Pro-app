"use client";

/**
 * AI Budget Recommendations Component
 *
 * Displays AI-generated budget suggestions with one-click apply.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

interface BudgetRecommendation {
  category: string;
  currentBudget: number;
  suggestedBudget: number;
  reason: string;
  impact: "high" | "medium" | "low";
  confidence: number;
}

interface AIBudgetRecommendationsProps {
  onApply: () => Promise<void>;
  period: string;
}

export default function AIBudgetRecommendations({
  onApply,
  period,
}: AIBudgetRecommendationsProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<
    BudgetRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/financial/budgets/adjust`);
      if (!response.ok) throw new Error("Failed to fetch recommendations");

      const data = await response.json();
      setRecommendations(data.data || []);
    } catch (_error) {
      // Error logged
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply();
    } finally {
      setApplying(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "low":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-slate-700 rounded"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl"></span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Recommendations
        </h3>
      </div>

      {/* Recommendations List */}
      {recommendations.length > 0 ? (
        <div className="space-y-4 mb-6">
          {recommendations.slice(0, 5).map((rec, index) => (
            <div
              key={index}
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg border border-blue-100"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white capitalize mb-1">
                    {rec.category.replace(/_/g, " ")}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                    {rec.reason}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${getImpactColor(rec.impact)}`}
                >
                  {rec.impact}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-500 dark:text-slate-400">
                    Current:{" "}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(rec.currentBudget)}
                  </span>
                </div>
                <div className="text-blue-600">→</div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400">
                    Suggested:{" "}
                  </span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(rec.suggestedBudget)}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                Confidence: {(rec.confidence * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-3"></div>
          <p className="text-gray-600 dark:text-slate-300 mb-2">
            No recommendations available
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Your budget looks good!
          </p>
        </div>
      )}

      {/* Apply Button */}
      {recommendations.length > 0 && (
        <button
          onClick={handleApply}
          disabled={applying}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg hover:from-blue-700 hover:to-blue-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {applying ? "Applying..." : "Apply AI Recommendations"}
        </button>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
        <div className="text-xs text-gray-600 dark:text-slate-300">
          <div className="font-medium mb-1">How it works:</div>
          <ul className="space-y-1 ml-4 list-disc">
            <li>AI analyzes your spending patterns</li>
            <li>Compares with similar users</li>
            <li>Suggests optimal budget allocations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
