"use client";

/**
 * Strategy Recommendations Component
 *
 * Displays ML-powered credit repair strategy recommendations
 *
 * Features:
 * - Top 5 recommended strategies
 * - Success probability visualization
 * - Timeline estimation
 * - Required actions checklist
 * - Legal basis display
 * - ROI calculation
 * - Alternative strategies
 */

import { useState, useEffect, useCallback } from "react";
import { StrategyRecommendation } from "@/lib/strategies/ml-strategy-integration";

interface CreditItem {
  type: string;
  description: string;
  amount?: number;
  date: string;
  bureau: string;
  status: string;
}

interface UserProfile {
  creditScore: number;
  accountAge: number;
  paymentHistory: number;
  utilization: number;
  totalAccounts: number;
  negativeItems: number;
  inquiries: number;
}

interface StrategyRecommendationsProps {
  creditItem: CreditItem;
  userProfile: UserProfile;
  previousAttempts?: string[];
  onSelectStrategy?: (strategyId: string) => void;
}

export default function StrategyRecommendations({
  creditItem,
  userProfile,
  previousAttempts = [],
  onSelectStrategy,
}: StrategyRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<
    StrategyRecommendation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [metrics, setMetrics] = useState<{
    avgSuccessProbability: number;
    avgConfidence: number;
    totalROI: number;
  } | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/strategies/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditItem,
          userProfile,
          previousAttempts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch recommendations");
      }

      const data = await response.json();
      setRecommendations(data.data.recommendations);
      setMetrics(data.data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [creditItem, userProfile, previousAttempts]);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  const getSuccessColor = (probability: number): string => {
    if (probability >= 0.8) return "text-green-600";
    if (probability >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getSuccessBgColor = (probability: number): string => {
    if (probability >= 0.8) return "bg-green-100";
    if (probability >= 0.6) return "bg-yellow-100";
    return "bg-red-100";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600 dark:text-slate-300">
          Analyzing strategies...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchRecommendations}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6 text-center">
        <p className="text-gray-600 dark:text-slate-300">
          No strategies available for this credit item.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Summary */}
      {metrics && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Strategy Analysis
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Avg Success Rate
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {metrics.avgSuccessProbability}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                ML Confidence
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {metrics.avgConfidence}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Expected Score Gain
              </p>
              <p className="text-2xl font-bold text-green-600">
                +{metrics.totalROI}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Recommendations */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Top Recommended Strategies
        </h3>

        {recommendations.map((rec, index) => (
          <div
            key={rec.strategy.id}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">
                    {index + 1}
                  </span>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {rec.strategy.name}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  {rec.reasoning}
                </p>
              </div>

              {/* Success Probability Badge */}
              <div
                className={`${getSuccessBgColor(rec.successProbability)} px-4 py-2 rounded-lg`}
              >
                <p className="text-xs text-gray-600 dark:text-slate-300">
                  Success Rate
                </p>
                <p
                  className={`text-2xl font-bold ${getSuccessColor(rec.successProbability)}`}
                >
                  {Math.round(rec.successProbability * 100)}%
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-300">
                  Score
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {Math.round(rec.score)}/100
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-300">
                  Timeline
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {rec.estimatedTimeline}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-300">ROI</p>
                <p className="text-lg font-semibold text-green-600">
                  +{rec.roi} pts
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-300">
                  Confidence
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  {Math.round(rec.confidence * 100)}%
                </p>
              </div>
            </div>

            {/* Legal Basis */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                Legal Basis
              </p>
              <p className="text-sm text-blue-700">{rec.legalBasis}</p>
            </div>

            {/* Required Actions */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Required Actions:
              </p>
              <ul className="space-y-1">
                {rec.requiredActions.map((action, i) => (
                  <li
                    key={i}
                    className="flex items-start text-sm text-gray-700 dark:text-slate-200"
                  >
                    <span className="text-blue-600 mr-2"></span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Button */}
            <button
              onClick={() => onSelectStrategy?.(rec.strategy.id)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-700 transition-all"
            >
              Use This Strategy
            </button>
          </div>
        ))}
      </div>

      {/* Alternative Strategies */}
      <div>
        <button
          onClick={() => setShowAlternatives(!showAlternatives)}
          className="text-blue-600 hover:text-blue-700 font-semibold"
        >
          {showAlternatives ? "▼" : "▶"} Show Alternative Strategies
        </button>

        {showAlternatives && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Additional strategies are available but have lower success
              probabilities for this specific case. Consider these if the top
              recommendations don't meet your needs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
