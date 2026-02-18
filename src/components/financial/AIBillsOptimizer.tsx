"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

interface NegotiationOpportunity {
  id: string;
  billName: string;
  category: string;
  currentAmount: number;
  estimatedSavings: number;
  savingsPercentage: number;
  difficulty: "easy" | "medium" | "hard";
  successProbability: number;
  bestTimeToCall: string;
  tips: string[];
}

interface SubscriptionOptimization {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  lastUsed: string;
  usageScore: number; // 0-100
  recommendation: "keep" | "downgrade" | "cancel";
  alternativeSuggestion?: string;
  potentialSavings: number;
}

interface DueDateOptimization {
  billName: string;
  currentDueDate: number; // day of month
  recommendedDueDate: number;
  reason: string;
  benefit: string;
}

interface AIBillsData {
  negotiationOpportunities: NegotiationOpportunity[];
  subscriptionOptimizations: SubscriptionOptimization[];
  dueDateOptimizations: DueDateOptimization[];
  totalPotentialSavings: number;
  optimizationScore: number; // 0-100
}

export default function AIBillsOptimizer() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AIBillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchOptimizations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch("/api/financial/bills/optimizations");

      if (!response.ok) {
        throw new Error("Failed to fetch bill optimizations");
      }

      const result = await response.json();
      setData(result.data);
    } catch (_error) {
      // Error logged
      toast.error(
        "Failed to load AI recommendations",
        "Please try again later",
      );
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      void fetchOptimizations();
    }
  }, [user, fetchOptimizations]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-600 bg-green-100 border-green-200";
      case "medium":
        return "text-yellow-600 bg-yellow-100 border-yellow-200";
      case "hard":
        return "text-red-600 bg-red-100 border-red-200";
      default:
        return "text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700";
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "keep":
        return "text-green-600 bg-green-100 border-green-200";
      case "downgrade":
        return "text-yellow-600 bg-yellow-100 border-yellow-200";
      case "cancel":
        return "text-red-600 bg-red-100 border-red-200";
      default:
        return "text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg shadow-lg p-6 animate-pulse">
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
    <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl"></div>
          <div>
            <h3 className="text-xl font-bold">AI Bills Optimizer</h3>
            <p className="text-sm opacity-90">
              Negotiation opportunities and subscription optimization
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
          {/* Optimization Score & Potential Savings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Optimization Score */}
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm font-medium opacity-90 mb-2">
                Optimization Score
              </div>
              <div className="text-4xl font-bold">
                {data.optimizationScore}/100
              </div>
              <div className="mt-2 w-full bg-white dark:bg-slate-800/20 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    data.optimizationScore >= 80
                      ? "bg-green-400"
                      : data.optimizationScore >= 60
                        ? "bg-yellow-400"
                        : "bg-red-400"
                  }`}
                  style={{ width: `${data.optimizationScore}%` }}
                ></div>
              </div>
              <div className="text-xs opacity-75 mt-2">
                {data.optimizationScore >= 80
                  ? "Excellent - Well optimized"
                  : data.optimizationScore >= 60
                    ? "Good - Some opportunities"
                    : "Needs attention - High savings potential"}
              </div>
            </div>

            {/* Potential Savings */}
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm font-medium opacity-90 mb-2">
                Total Monthly Savings
              </div>
              <div className="text-4xl font-bold">
                {formatCurrency(data.totalPotentialSavings)}
              </div>
              <div className="text-xs opacity-75 mt-2">
                {formatCurrency(data.totalPotentialSavings * 12)}/year from{" "}
                {data.negotiationOpportunities.length +
                  data.subscriptionOptimizations.length}{" "}
                opportunities
              </div>
            </div>
          </div>

          {/* Negotiation Opportunities */}
          {data.negotiationOpportunities.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 opacity-90">
                Bill Negotiation Opportunities
              </h4>
              <div className="space-y-3">
                {data.negotiationOpportunities.slice(0, 3).map((opp) => (
                  <div
                    key={opp.id}
                    className="bg-white dark:bg-slate-800 rounded-lg p-4 text-gray-900 dark:text-white"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-semibold text-lg">
                            {opp.billName}
                          </h5>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getDifficultyColor(opp.difficulty)}`}
                          >
                            {opp.difficulty}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm mb-2">
                          <div>
                            <span className="text-gray-500 dark:text-slate-400">
                              Current:
                            </span>{" "}
                            <span className="font-semibold">
                              {formatCurrency(opp.currentAmount)}/mo
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-slate-400">
                              Potential Savings:
                            </span>{" "}
                            <span className="font-semibold text-green-600">
                              {formatCurrency(opp.estimatedSavings)}/mo
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-slate-400">
                              Success Rate:
                            </span>{" "}
                            <span className="font-semibold text-blue-600">
                              {opp.successProbability}%
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-slate-300 mb-2">
                          <span className="font-medium">
                            Best time to call:
                          </span>{" "}
                          {opp.bestTimeToCall}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-slate-300">
                          <span className="font-medium">Tips:</span>
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {opp.tips.slice(0, 2).map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/financial/bills/negotiate"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                    >
                      <span>Start Negotiation</span>
                      <span>→</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscription Optimizations */}
          {data.subscriptionOptimizations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 opacity-90">
                Subscription Optimization
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.subscriptionOptimizations.slice(0, 4).map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{sub.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getRecommendationColor(sub.recommendation)}`}
                      >
                        {sub.recommendation}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xl font-bold">
                        {formatCurrency(sub.amount)}
                      </span>
                      <span className="text-xs opacity-75">
                        /{sub.frequency}
                      </span>
                    </div>
                    <div className="text-xs opacity-75 mb-2">
                      Usage Score: {sub.usageScore}/100 • Last used:{" "}
                      {sub.lastUsed}
                    </div>
                    {sub.potentialSavings > 0 && (
                      <div className="text-xs text-green-300 font-medium">
                        Save {formatCurrency(sub.potentialSavings)}/mo
                      </div>
                    )}
                    {sub.alternativeSuggestion && (
                      <div className="text-xs text-blue-200 mt-1">
                        {sub.alternativeSuggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Date Optimizations */}
          {data.dueDateOptimizations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 opacity-90">
                Smart Due Date Alignment
              </h4>
              <div className="space-y-2">
                {data.dueDateOptimizations.slice(0, 3).map((opt, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">
                          {opt.billName}
                        </div>
                        <div className="text-xs opacity-90 mb-1">
                          Move from{" "}
                          <span className="font-semibold">
                            {opt.currentDueDate}th
                          </span>{" "}
                          to{" "}
                          <span className="font-semibold">
                            {opt.recommendedDueDate}th
                          </span>{" "}
                          of the month
                        </div>
                        <div className="text-xs opacity-75">
                          <span className="font-medium">Reason:</span>{" "}
                          {opt.reason}
                        </div>
                        <div className="text-xs text-blue-200 mt-1">
                          {opt.benefit}
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
            <Link
              href="/financial/bills/negotiate"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              <span>View All Opportunities</span>
              <span>→</span>
            </Link>
            <button
              onClick={fetchOptimizations}
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
