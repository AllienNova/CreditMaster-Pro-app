"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

interface UnavailableFactor {
  id: string;
  name: string;
  percentImpact: number;
  /** What would have to exist for this factor to be computed. */
  blockedBy: string;
}

interface CreditFactor {
  id: string;
  name: string;
  impact:
    | "high_positive"
    | "positive"
    | "neutral"
    | "negative"
    | "high_negative";
  category:
    | "payment_history"
    | "credit_utilization"
    | "credit_age"
    | "credit_mix"
    | "new_credit";
  status: "excellent" | "good" | "fair" | "poor" | "very_poor";
  value?: string;
  description: string;
  recommendation?: string;
  percentImpact: number;
}

interface FactorInfo {
  name: string;
  weight: number;
  icon: string;
  description: string;
  tips: string[];
  improvementActions: {
    action: string;
    impact: "high" | "medium" | "low";
    timeframe: string;
  }[];
}

const FACTOR_INFO: Record<string, FactorInfo> = {
  payment_history: {
    name: "Payment History",
    weight: 35,
    icon: "clock",
    description:
      "Your track record of paying bills on time. This is the most important factor in your credit score.",
    tips: [
      "Set up autopay for all accounts",
      "Pay at least the minimum before due date",
      "Contact creditors if you might miss a payment",
    ],
    improvementActions: [
      {
        action: "Set up automatic payments",
        impact: "high",
        timeframe: "Immediate",
      },
      {
        action: "Request goodwill adjustment for late payments",
        impact: "high",
        timeframe: "30-60 days",
      },
      {
        action: "Become an authorized user on account with perfect history",
        impact: "medium",
        timeframe: "30-45 days",
      },
    ],
  },
  credit_utilization: {
    name: "Credit Utilization",
    weight: 30,
    icon: "credit-card",
    description:
      "How much of your available credit you're using. Lower is better - aim for under 30%.",
    tips: [
      "Keep utilization below 30%",
      "Pay down balances before statement closes",
      "Request credit limit increases",
    ],
    improvementActions: [
      {
        action: "Pay down credit card balances",
        impact: "high",
        timeframe: "1-2 billing cycles",
      },
      {
        action: "Request credit limit increase",
        impact: "medium",
        timeframe: "7-14 days",
      },
      {
        action: "Open a new credit card (if appropriate)",
        impact: "medium",
        timeframe: "30-45 days",
      },
    ],
  },
  credit_age: {
    name: "Credit Age",
    weight: 15,
    icon: "calendar",
    description:
      "The average age of your credit accounts. Longer history shows stability.",
    tips: [
      "Keep old accounts open",
      "Avoid opening too many new accounts",
      "Become an authorized user on old accounts",
    ],
    improvementActions: [
      {
        action: "Keep oldest accounts open and active",
        impact: "high",
        timeframe: "Ongoing",
      },
      {
        action: "Become authorized user on old account",
        impact: "medium",
        timeframe: "30-45 days",
      },
      {
        action: "Avoid opening unnecessary new accounts",
        impact: "low",
        timeframe: "Ongoing",
      },
    ],
  },
  credit_mix: {
    name: "Credit Mix",
    weight: 10,
    icon: "puzzle-piece",
    description:
      "The variety of credit types you have. A healthy mix shows you can manage different types.",
    tips: [
      "Have a mix of credit cards and loans",
      "Consider a credit builder loan",
      "Don't open accounts just for mix",
    ],
    improvementActions: [
      {
        action: "Consider a credit builder loan",
        impact: "medium",
        timeframe: "30-60 days",
      },
      {
        action: "Add a secured credit card",
        impact: "medium",
        timeframe: "14-30 days",
      },
      {
        action: "Keep existing account types active",
        impact: "low",
        timeframe: "Ongoing",
      },
    ],
  },
  new_credit: {
    name: "New Credit",
    weight: 10,
    icon: "document",
    description:
      "Recent credit inquiries and new accounts. Too many can signal risk.",
    tips: [
      "Limit hard inquiries",
      "Space out credit applications",
      "Rate shop within 14-45 days",
    ],
    improvementActions: [
      {
        action: "Wait before applying for new credit",
        impact: "medium",
        timeframe: "6-12 months",
      },
      {
        action: "Rate shop within 14-45 day window",
        impact: "low",
        timeframe: "When needed",
      },
      {
        action: "Use pre-qualification tools (soft pulls)",
        impact: "low",
        timeframe: "Immediate",
      },
    ],
  },
};

// Score range definitions
const SCORE_RANGES = [
  {
    min: 300,
    max: 579,
    label: "Poor",
    color: "#EF4444",
    bgColor: "bg-red-500",
  },
  {
    min: 580,
    max: 669,
    label: "Fair",
    color: "#F59E0B",
    bgColor: "bg-orange-500",
  },
  {
    min: 670,
    max: 739,
    label: "Good",
    color: "#EAB308",
    bgColor: "bg-yellow-500",
  },
  {
    min: 740,
    max: 799,
    label: "Very Good",
    color: "#84CC16",
    bgColor: "bg-lime-500",
  },
  {
    min: 800,
    max: 850,
    label: "Excellent",
    color: "#22C55E",
    bgColor: "bg-green-500",
  },
];

const getScoreRange = (score: number) => {
  return (
    SCORE_RANGES.find((range) => score >= range.min && score <= range.max) ||
    SCORE_RANGES[0]
  );
};

export default function CreditFactorsPage() {
  const [factors, setFactors] = useState<CreditFactor[]>([]);
  const [unavailable, setUnavailable] = useState<UnavailableFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentScore, setCurrentScore] = useState(742); // Mock score - in production, fetch from API
  const [scoreChange, setScoreChange] = useState(15); // Mock change - in production, fetch from API

  useEffect(() => {
    fetchFactors();
  }, []);

  const fetchFactors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/credit/factors");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch factors");
      }

      setFactors(data.data?.factors ?? []);
      // Factors this system cannot compute yet, each naming what would
      // populate it. Rendered rather than dropped: a missing factor reads as
      // "not applicable", an unavailable one reads as "we do not know" — and
      // the difference matters when the subject is someone's credit.
      setUnavailable(
        Array.isArray(data.data?.unavailable) ? data.data.unavailable : [],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching factors:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total impact score
  const totalImpactScore = useMemo(() => {
    if (factors.length === 0) return 0;
    return factors.reduce((total, factor) => {
      const statusMultiplier: Record<string, number> = {
        excellent: 1.0,
        good: 0.8,
        fair: 0.5,
        poor: 0.2,
        very_poor: 0.0,
      };
      return (
        total +
        Math.round(
          factor.percentImpact * (statusMultiplier[factor.status] || 0.5),
        )
      );
    }, 0);
  }, [factors]);

  // Get factors that need improvement
  const factorsNeedingImprovement = useMemo(() => {
    return factors.filter(
      (f) =>
        f.status === "fair" || f.status === "poor" || f.status === "very_poor",
    );
  }, [factors]);

  const scoreRange = getScoreRange(currentScore);
  const scorePosition = ((currentScore - 300) / (850 - 300)) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/credit"
                className="text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Credit Factors
              </h1>
            </div>
            <Link
              href="/help/guides"
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Score Range Visualization */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 mb-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 mb-2">
              <h2
                className="text-5xl font-bold"
                style={{ color: scoreRange.color }}
              >
                {currentScore}
              </h2>
              {scoreChange !== 0 && (
                <div
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                    scoreChange >= 0
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        scoreChange >= 0
                          ? "M5 10l7-7m0 0l7 7m-7-7v18"
                          : "M19 14l-7 7m0 0l-7-7m7 7V3"
                      }
                    />
                  </svg>
                  {scoreChange >= 0 ? "+" : ""}
                  {scoreChange} pts
                </div>
              )}
            </div>
            <div
              className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-1"
              style={{
                backgroundColor: `${scoreRange.color}20`,
                color: scoreRange.color,
              }}
            >
              {scoreRange.label}
            </div>
            <p className="text-gray-600 dark:text-slate-300 text-sm">
              {scoreRange.label === "Poor" &&
                "Well below average - Significant improvement needed"}
              {scoreRange.label === "Fair" &&
                "Below average - Room for improvement"}
              {scoreRange.label === "Good" && "Near or slightly above average"}
              {scoreRange.label === "Very Good" &&
                "Above average - Keep up the good work"}
              {scoreRange.label === "Excellent" &&
                "Well above average - Outstanding credit"}
            </p>
          </div>

          {/* Score Range Bar */}
          <div className="relative">
            <div className="flex h-8 rounded-full overflow-hidden mb-3">
              {SCORE_RANGES.map((range, index) => (
                <div
                  key={index}
                  className={`${range.bgColor} transition-all duration-300`}
                  style={{
                    width: `${((range.max - range.min) / 550) * 100}%`,
                    opacity:
                      currentScore >= range.min && currentScore <= range.max
                        ? 1
                        : 0.3,
                  }}
                  title={`${range.label}: ${range.min}-${range.max}`}
                />
              ))}
            </div>

            {/* Score Marker */}
            <div
              className="absolute top-0 transform -translate-x-1/2 transition-all duration-500"
              style={{ left: `${scorePosition}%` }}
            >
              <div className="flex flex-col items-center">
                <div
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: scoreRange.color }}
                />
                <div
                  className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: scoreRange.color }}
                />
              </div>
            </div>

            {/* Range Labels */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-2">
              <span className="font-medium">300</span>
              <span className="font-medium">850</span>
            </div>
          </div>

          {/* Range Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
            {SCORE_RANGES.map((range, index) => (
              <div
                key={index}
                className={`text-center p-2 rounded-lg transition-all ${
                  currentScore >= range.min && currentScore <= range.max
                    ? "bg-gray-50 dark:bg-slate-900 ring-2 ring-offset-2"
                    : "opacity-50"
                }`}
                style={
                  currentScore >= range.min && currentScore <= range.max
                    ? ({
                        "--tw-ring-color": range.color,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <div
                  className={`w-3 h-3 ${range.bgColor} rounded-full mx-auto mb-1`}
                />
                <div className="text-xs font-semibold text-gray-900 dark:text-white">
                  {range.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {range.min}-{range.max}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchFactors}
              className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Success State */}
        {!loading && !error && factors.length > 0 && (
          <>
            {/* Score Impact Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Factor Score
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                    Based on your credit profile
                  </p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-blue-600">
                    {totalImpactScore}
                  </span>
                  <span className="text-lg text-gray-500 dark:text-slate-400 ml-1">
                    /100
                  </span>
                </div>
              </div>
              {factorsNeedingImprovement.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-100 flex items-center">
                  <svg
                    className="w-5 h-5 text-amber-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-amber-700 font-medium">
                    {factorsNeedingImprovement.length} factor
                    {factorsNeedingImprovement.length > 1 ? "s" : ""} need
                    {factorsNeedingImprovement.length === 1 ? "s" : ""}{" "}
                    attention
                  </span>
                </div>
              )}
            </div>

            {/* Overview Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What Affects Your Score
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                Your credit score is calculated based on 5 key factors.
                Understanding these can help you improve your score.
              </p>

              {/* Weight Chart */}
              <div className="flex h-3 rounded-full overflow-hidden mb-2">
                {factors.map((factor) => {
                  const statusColor = getStatusColor(factor.status);
                  return (
                    <div
                      key={factor.id}
                      style={{
                        flex: factor.percentImpact,
                        backgroundColor: statusColor,
                      }}
                    />
                  );
                })}
              </div>

              {/* Weight Labels */}
              <div className="flex text-xs text-gray-500 dark:text-slate-400 mb-4">
                <span className="flex-[35]">35%</span>
                <span className="flex-[30]">30%</span>
                <span className="flex-[15]">15%</span>
                <span className="flex-[10]">10%</span>
                <span className="flex-[10]">10%</span>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 justify-center">
                {[
                  { label: "Excellent", color: "#22C55E" },
                  { label: "Good", color: "#84CC16" },
                  { label: "Fair", color: "#F59E0B" },
                  { label: "Poor", color: "#EF4444" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center">
                    <div
                      className="w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-gray-600 dark:text-slate-300">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Factor Cards */}
            <div className="space-y-4">
              {factors.map((factor) => {
                const info = FACTOR_INFO[factor.id] || {
                  name: factor.name,
                  weight: factor.percentImpact || 0,
                  icon: "sparkles",
                  description: factor.description || "",
                  tips: [],
                  improvementActions: [],
                };
                const isExpanded = expandedFactor === factor.id;
                const statusColor = getStatusColor(factor.status);
                const impactColor = getImpactColor(factor.impact);
                const statusMultiplier: Record<string, number> = {
                  excellent: 1.0,
                  good: 0.8,
                  fair: 0.5,
                  poor: 0.2,
                  very_poor: 0.0,
                };
                const impactPoints = Math.round(
                  info.weight * (statusMultiplier[factor.status] || 0.5),
                );

                return (
                  <div
                    key={factor.id}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedFactor(isExpanded ? null : factor.id)
                      }
                      className="w-full p-6 text-left hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center">
                        {/* Icon */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                          style={{
                            backgroundColor: `${statusColor}20`,
                            color: statusColor,
                          }}
                        >
                          <Icon name={info.icon} className="w-6 h-6" />
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {info.name}
                          </h3>
                          <div className="flex items-center mt-1 space-x-3">
                            <span className="text-sm text-gray-600 dark:text-slate-300">
                              {info.weight}% weight
                            </span>
                            <div className="flex items-center px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded">
                              <span className="text-xs mr-1">
                                {getImpactIcon(factor.impact)}
                              </span>
                              <span
                                className="text-xs font-medium"
                                style={{ color: impactColor }}
                              >
                                {getImpactLabel(factor.impact)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="text-right">
                          <div
                            className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-1"
                            style={{
                              backgroundColor: `${statusColor}20`,
                              color: statusColor,
                            }}
                          >
                            {getStatusLabel(factor.status)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">
                            {impactPoints} pts
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 dark:text-slate-500 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-gray-200 dark:border-slate-700 pt-4">
                        {/* Description */}
                        <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                          {factor.description || info.description}
                        </p>

                        {/* Current Value */}
                        {factor.value && (
                          <div className="flex items-center bg-blue-50 rounded-lg p-3 mb-4">
                            <svg
                              className="w-5 h-5 text-blue-600 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Current: {factor.value}
                            </span>
                          </div>
                        )}

                        {/* AI Recommendation */}
                        {factor.recommendation && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start">
                              <svg
                                className="w-5 h-5 text-amber-600 mr-2 mt-0.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                              </svg>
                              <div>
                                <h4 className="text-sm font-semibold text-amber-900 mb-1">
                                  AI Recommendation
                                </h4>
                                <p className="text-sm text-amber-800">
                                  {factor.recommendation}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Improvement Actions */}
                        {info.improvementActions &&
                          info.improvementActions.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                Action Plan
                              </h4>
                              <div className="space-y-3">
                                {info.improvementActions.map(
                                  (action, index) => (
                                    <div
                                      key={index}
                                      className="flex items-start"
                                    >
                                      <div
                                        className="w-2 h-2 rounded-full mt-2 mr-3"
                                        style={{
                                          backgroundColor:
                                            action.impact === "high"
                                              ? "#22C55E"
                                              : action.impact === "medium"
                                                ? "#F59E0B"
                                                : "#6B7280",
                                        }}
                                      />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                          {action.action}
                                        </p>
                                        <div className="flex items-center mt-1 space-x-2">
                                          <span className="text-xs text-gray-500 dark:text-slate-400">
                                            {action.timeframe}
                                          </span>
                                          <span
                                            className="text-xs font-semibold px-2 py-0.5 rounded"
                                            style={{
                                              backgroundColor:
                                                action.impact === "high"
                                                  ? "#22C55E20"
                                                  : action.impact === "medium"
                                                    ? "#F59E0B20"
                                                    : "#6B728020",
                                              color:
                                                action.impact === "high"
                                                  ? "#22C55E"
                                                  : action.impact === "medium"
                                                    ? "#F59E0B"
                                                    : "#6B7280",
                                            }}
                                          >
                                            {action.impact.toUpperCase()} IMPACT
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                        {/* Quick Tips */}
                        {info.tips && info.tips.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                              Quick Tips
                            </h4>
                            <div className="space-y-2">
                              {info.tips.map((tip, index) => (
                                <div key={index} className="flex items-start">
                                  <svg
                                    className="w-4 h-4 text-blue-600 mr-2 mt-0.5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span className="text-sm text-gray-600 dark:text-slate-300">
                                    {tip}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <Link
                          href={`/credit-builder/${factor.id.replace("_", "-")}`}
                          className="flex items-center justify-center w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                        >
                          Improve This Factor
                          <svg
                            className="w-4 h-4 ml-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Factors we cannot compute yet.
            The route used to return all five with invented values — "98%
            on-time payments" for every user. Three of them have no source in
            this system (SF-16), so they are named here with the reason
            instead. */}
        {!loading && !error && unavailable.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              Not yet available
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              These affect your score, but Fynvita cannot measure them for you
              yet.
            </p>
            <ul className="space-y-3">
              {unavailable.map((f) => (
                <li key={f.id} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {f.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {f.blockedBy}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-gray-400 dark:text-slate-500">
                    {f.percentImpact}% of score
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && factors.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No factor data available
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
              Refresh to load your credit factors
            </p>
            <button
              onClick={fetchFactors}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getStatusColor(status: string): string {
  switch (status) {
    case "excellent":
      return "#22C55E";
    case "good":
      return "#84CC16";
    case "fair":
      return "#F59E0B";
    case "poor":
    case "very_poor":
      return "#EF4444";
    default:
      return "#6B7280";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "fair":
      return "Needs Work";
    case "poor":
      return "Poor";
    case "very_poor":
      return "Critical";
    default:
      return "Unknown";
  }
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case "high_positive":
      return "#22C55E";
    case "positive":
      return "#84CC16";
    case "neutral":
      return "#6B7280";
    case "negative":
      return "#F59E0B";
    case "high_negative":
      return "#EF4444";
    default:
      return "#6B7280";
  }
}

function getImpactLabel(impact: string): string {
  switch (impact) {
    case "high_positive":
      return "Strong Positive";
    case "positive":
      return "Positive";
    case "neutral":
      return "Neutral";
    case "negative":
      return "Negative";
    case "high_negative":
      return "Strong Negative";
    default:
      return "Unknown";
  }
}

function getImpactIcon(impact: string): string {
  switch (impact) {
    case "high_positive":
    case "positive":
      return "↗️";
    case "neutral":
      return "";
    case "negative":
    case "high_negative":
      return "↘️";
    default:
      return "";
  }
}
