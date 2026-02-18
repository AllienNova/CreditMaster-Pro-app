"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";

interface SpendingAnomaly {
  id: string;
  type:
    | "unusual_large"
    | "duplicate_charge"
    | "subscription_spike"
    | "category_spike";
  severity: "high" | "medium" | "low";
  description: string;
  amount: number;
  expectedAmount?: number;
  category: string;
  merchant: string;
  date: string;
  actionable: boolean;
}

interface CategoryInsight {
  category: string;
  currentSpending: number;
  averageSpending: number;
  trend: "increasing" | "decreasing" | "stable";
  percentChange: number;
  recommendation: string;
  potentialSavings: number;
}

interface SpendingReduction {
  id: string;
  title: string;
  description: string;
  category: string;
  currentAmount: number;
  targetAmount: number;
  monthlySavings: number;
  difficulty: "easy" | "medium" | "hard";
  impact: "high" | "medium" | "low";
}

interface AISpendingData {
  anomalies: SpendingAnomaly[];
  categoryInsights: CategoryInsight[];
  reductionRecommendations: SpendingReduction[];
  totalPotentialSavings: number;
  anomalyScore: number; // 0-100, lower is better
}

export default function AISpendingInsights() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AISpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchInsights = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch("/api/financial/spending/ai-insights");

      if (!response.ok) {
        throw new Error("Failed to fetch spending insights");
      }

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Error fetching spending insights:", error);
      toast.error("Failed to load AI insights", "Please try again later");
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      void fetchInsights();
    }
  }, [user, fetchInsights]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 border-gray-200 dark:border-slate-700";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "hard":
        return "text-red-600";
      default:
        return "text-gray-600 dark:text-slate-300";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return "";
      case "decreasing":
        return "";
      case "stable":
        return "";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-white dark:bg-slate-800/20 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-white dark:bg-slate-800/20 rounded w-full"></div>
          <div className="h-4 bg-white dark:bg-slate-800/20 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl"></div>
          <div>
            <h3 className="text-xl font-bold">AI Spending Intelligence</h3>
            <p className="text-sm opacity-90">
              Anomaly detection and smart recommendations
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 bg-white hover:bg-white dark:bg-slate-800/30 rounded-lg transition-colors text-sm font-medium"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <>
          {/* Anomaly Score & Potential Savings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Anomaly Score */}
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm font-medium opacity-90 mb-2">
                Anomaly Score
              </div>
              <div className="text-4xl font-bold">{data.anomalyScore}/100</div>
              <div className="mt-2 w-full bg-white dark:bg-slate-800/20 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    data.anomalyScore <= 30
                      ? "bg-green-400"
                      : data.anomalyScore <= 60
                        ? "bg-yellow-400"
                        : "bg-red-400"
                  }`}
                  style={{ width: `${data.anomalyScore}%` }}
                ></div>
              </div>
              <div className="text-xs opacity-75 mt-2">
                {data.anomalyScore <= 30
                  ? "Excellent - No major issues"
                  : data.anomalyScore <= 60
                    ? "Good - Minor anomalies detected"
                    : "Attention needed - Review anomalies"}
              </div>
            </div>

            {/* Potential Savings */}
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm font-medium opacity-90 mb-2">
                Potential Monthly Savings
              </div>
              <div className="text-4xl font-bold">
                {formatCurrency(data.totalPotentialSavings)}
              </div>
              <div className="text-xs opacity-75 mt-2">
                From {data.reductionRecommendations.length} optimization
                opportunities
              </div>
            </div>
          </div>

          {/* Anomalies Detected */}
          {data.anomalies.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 opacity-90">
                Anomalies Detected
              </h4>
              <div className="space-y-2">
                {data.anomalies.slice(0, 3).map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="bg-white dark:bg-slate-800 rounded-lg p-4 text-gray-900 dark:text-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getSeverityColor(anomaly.severity)}`}
                          >
                            {anomaly.severity} severity
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {anomaly.category}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">
                          {anomaly.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-slate-300">
                          <div>
                            <span>Amount:</span>{" "}
                            <span className="font-semibold">
                              {formatCurrency(anomaly.amount)}
                            </span>
                          </div>
                          {anomaly.expectedAmount && (
                            <div>
                              <span>Expected:</span>{" "}
                              <span className="font-semibold">
                                {formatCurrency(anomaly.expectedAmount)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span>Merchant:</span>{" "}
                            <span className="font-semibold">
                              {anomaly.merchant}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Insights */}
          {data.categoryInsights.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 opacity-90">
                Category Trends
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.categoryInsights.slice(0, 4).map((insight, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {insight.category}
                      </span>
                      <span className="text-lg">
                        {getTrendIcon(insight.trend)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xl font-bold">
                        {formatCurrency(insight.currentSpending)}
                      </span>
                      <span
                        className={`text-xs ${insight.percentChange > 0 ? "text-red-300" : "text-green-300"}`}
                      >
                        {insight.percentChange > 0 ? "+" : ""}
                        {insight.percentChange.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs opacity-75 mb-2">
                      Avg: {formatCurrency(insight.averageSpending)}
                    </div>
                    {insight.potentialSavings > 0 && (
                      <div className="text-xs text-green-300 font-medium">
                        Save {formatCurrency(insight.potentialSavings)}/mo
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reduction Recommendations */}
          {data.reductionRecommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 opacity-90">
                Smart Reduction Recommendations
              </h4>
              <div className="space-y-3">
                {data.reductionRecommendations.slice(0, 3).map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white dark:bg-slate-800 rounded-lg p-4 text-gray-900 dark:text-white"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-semibold">{rec.title}</h5>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                              rec.impact === "high"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : rec.impact === "medium"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}
                          >
                            {rec.impact} impact
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                          {rec.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-slate-400">
                              Current:
                            </span>{" "}
                            <span className="font-semibold">
                              {formatCurrency(rec.currentAmount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-slate-400">
                              Target:
                            </span>{" "}
                            <span className="font-semibold text-green-600">
                              {formatCurrency(rec.targetAmount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-slate-400">
                              Save:
                            </span>{" "}
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency(rec.monthlySavings)}/mo
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs">
                          <span className="text-gray-500 dark:text-slate-400">
                            Difficulty:
                          </span>{" "}
                          <span
                            className={`font-semibold ${getDifficultyColor(rec.difficulty)}`}
                          >
                            {rec.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3 justify-center">
            <a
              href="/financial/spending"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              <span>View Full Analysis</span>
              <span>→</span>
            </a>
            <button
              onClick={fetchInsights}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-white rounded-lg font-semibold hover:bg-white dark:bg-slate-800/30 transition-colors"
            >
              <span>Refresh</span>
              <span></span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
