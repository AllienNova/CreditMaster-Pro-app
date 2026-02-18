"use client";

/**
 * Spending Insights List Component
 *
 * AI-generated spending insights and recommendations with actionable suggestions.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

interface SpendingInsight {
  id: string;
  type: "pattern" | "trend" | "recommendation" | "warning" | "opportunity";
  category: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  confidence: number;
  actionable: boolean;
  actions?: {
    label: string;
    type: "link" | "button";
    url?: string;
    action?: string;
  }[];
  metadata?: {
    amount?: number;
    percentage?: number;
    timeframe?: string;
  };
  createdAt: string;
}

interface SpendingInsightsListProps {
  timeRange?: "7d" | "30d" | "90d";
}

export default function SpendingInsightsList({
  timeRange = "30d",
}: SpendingInsightsListProps) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "actionable">("all");

  const fetchInsights = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/financial/spending/insights?timeRange=${timeRange}`,
      );
      if (!response.ok) throw new Error("Failed to fetch insights");

      const data = await response.json();
      setInsights(data.data || []);
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange]);

  useEffect(() => {
    void fetchInsights();
  }, [fetchInsights]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case "pattern":
        return "";
      case "trend":
        return "";
      case "recommendation":
        return "";
      case "warning":
        return "";
      case "opportunity":
        return "";
      default:
        return "";
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case "pattern":
        return "bg-blue-100 border-blue-300";
      case "trend":
        return "bg-blue-100 border-blue-300";
      case "recommendation":
        return "bg-green-100 border-green-300";
      case "warning":
        return "bg-yellow-100 border-yellow-300";
      case "opportunity":
        return "bg-blue-100 border-blue-300";
      default:
        return "bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600";
    }
  };

  const getImpactBadge = (impact: string): string => {
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

  const filteredInsights = insights.filter((insight) => {
    if (filter === "actionable") return insight.actionable;
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-slate-700 rounded"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl"></span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Insights
          </h3>
          {filteredInsights.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {filteredInsights.length}
            </span>
          )}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:bg-slate-700"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("actionable")}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filter === "actionable" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:bg-slate-700"}`}
          >
            Actionable
          </button>
        </div>
      </div>

      {/* Insights List */}
      {filteredInsights.length > 0 ? (
        <div className="space-y-4">
          {filteredInsights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border-2 ${getTypeColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getTypeIcon(insight.type)}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {insight.title}
                        </h4>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getImpactBadge(insight.impact)}`}
                        >
                          {insight.impact} impact
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-300 capitalize">
                        {insight.category.replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {(insight.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-slate-200 mb-3">
                    {insight.description}
                  </p>

                  {/* Metadata */}
                  {insight.metadata && (
                    <div className="flex items-center gap-4 mb-3 text-xs text-gray-600 dark:text-slate-300">
                      {insight.metadata.amount && (
                        <span className="font-medium">
                          Amount: {formatCurrency(insight.metadata.amount)}
                        </span>
                      )}
                      {insight.metadata.percentage && (
                        <span className="font-medium">
                          {insight.metadata.percentage > 0 ? "+" : ""}
                          {insight.metadata.percentage.toFixed(1)}%
                        </span>
                      )}
                      {insight.metadata.timeframe && (
                        <span>{insight.metadata.timeframe}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {insight.actions && insight.actions.length > 0 && (
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-slate-700">
                      {insight.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (action.url) {
                              window.location.href = action.url;
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3"></div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Insights Available
          </h4>
          <p className="text-gray-600 dark:text-slate-300">
            Check back later for AI-generated insights
          </p>
        </div>
      )}
    </div>
  );
}
