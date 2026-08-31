"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

// ============================================================================
// Types
// ============================================================================

type VitalityGrade = "A" | "B" | "C" | "D" | "F";
type TrendDirection = "improving" | "stable" | "declining";

interface ComponentScore {
  name: string;
  score: number;
  weight: number;
  grade: VitalityGrade;
  trend: TrendDirection;
  color: string;
  icon: string;
  details: { label: string; value: string }[];
}

interface QuickWin {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  estimatedPoints: number;
  category: string;
  actionUrl: string;
}

interface VitalityScore {
  overall: number;
  grade: VitalityGrade;
  percentile: number;
  trend: TrendDirection;
  trendPercentage: number;
  components: ComponentScore[];
  quickWins: QuickWin[];
  nextMilestone: { target: number; description: string };
}

// ============================================================================
// Mock Data
// ============================================================================

const mockVitalityScore: VitalityScore = {
  overall: 78,
  grade: "B",
  percentile: 72,
  trend: "improving",
  trendPercentage: 5,
  nextMilestone: { target: 80, description: "Financial Fit" },
  components: [
    {
      name: "Credit",
      score: 85,
      weight: 0.25,
      grade: "B",
      trend: "improving",
      color: "#22C55E",
      icon: "credit-card",
      details: [
        { label: "Credit Score", value: "720" },
        { label: "Utilization", value: "25%" },
        { label: "Payment History", value: "98%" },
      ],
    },
    {
      name: "Spending",
      score: 75,
      weight: 0.2,
      grade: "C",
      trend: "stable",
      color: "#3B82F6",
      icon: "banknotes",
      details: [
        { label: "Budget Adherence", value: "85%" },
        { label: "Savings Rate", value: "15%" },
        { label: "Monthly Trend", value: "-5%" },
      ],
    },
    {
      name: "Savings",
      score: 70,
      weight: 0.2,
      grade: "C",
      trend: "improving",
      color: "#F59E0B",
      icon: "piggy-bank",
      details: [
        { label: "Emergency Fund", value: "4 months" },
        { label: "Total Savings", value: "$25,000" },
        { label: "Goal Progress", value: "65%" },
      ],
    },
    {
      name: "Debt",
      score: 72,
      weight: 0.2,
      grade: "C",
      trend: "improving",
      color: "#8B5CF6",
      icon: "scale",
      details: [
        { label: "Debt-to-Income", value: "35%" },
        { label: "Total Debt", value: "$45,000" },
        { label: "Payoff Progress", value: "40%" },
      ],
    },
    {
      name: "Investments",
      score: 80,
      weight: 0.15,
      grade: "B",
      trend: "stable",
      color: "#06B6D4",
      icon: "chart-line",
      details: [
        { label: "Portfolio Value", value: "$85,000" },
        { label: "YTD Return", value: "+8.5%" },
        { label: "Contribution Rate", value: "12%" },
      ],
    },
  ],
  quickWins: [
    {
      id: "1",
      title: "Pay down credit card to below 30%",
      description: "Lowering utilization can boost your credit score quickly",
      impact: "high",
      estimatedPoints: 5,
      category: "Credit",
      actionUrl: "/credit",
    },
    {
      id: "2",
      title: "Build 6-month emergency fund",
      description: "You have 4 months, adding 2 more provides extra security",
      impact: "high",
      estimatedPoints: 8,
      category: "Savings",
      actionUrl: "/financial/savings",
    },
    {
      id: "3",
      title: "Pay off high-interest debt first",
      description: "Focus on cards with 20%+ APR to save on interest",
      impact: "high",
      estimatedPoints: 6,
      category: "Debt",
      actionUrl: "/financial/debt",
    },
    {
      id: "4",
      title: "Increase retirement contribution to 15%",
      description: "You're at 12% - bump it up for tax benefits",
      impact: "medium",
      estimatedPoints: 4,
      category: "Investments",
      actionUrl: "/investments",
    },
  ],
};

const gradeColors: Record<
  VitalityGrade,
  { bg: string; text: string; border: string }
> = {
  A: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500",
  },
  B: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500",
  },
  C: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500",
  },
  D: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500",
  },
  F: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500",
  },
};

const impactColors: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400",
};

// ============================================================================
// Components
// ============================================================================

function ScoreRing({
  score,
  grade,
  size = 200,
}: {
  score: number;
  grade: VitalityGrade;
  size?: number;
}) {
  const radius = (size - 20) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const gradeStyle = gradeColors[grade];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={16}
          className="text-gray-200 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#vitalityGradient)"
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient
            id="vitalityGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-gray-900 dark:text-white">
          {score}
        </span>
        <span
          className={`text-2xl font-bold mt-1 px-3 py-1 rounded-lg ${gradeStyle.bg} ${gradeStyle.text}`}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}

function ComponentCard({ component }: { component: ComponentScore }) {
  const gradeStyle = gradeColors[component.grade];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${component.color}20` }}
          >
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: component.color }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {component.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {(component.weight * 100).toFixed(0)}% weight
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {component.score}
            </span>
            <span
              className={`px-2 py-0.5 rounded ${gradeStyle.bg} ${gradeStyle.text} text-sm font-bold`}
            >
              {component.grade}
            </span>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            {component.trend === "improving" && (
              <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
            )}
            {component.trend === "declining" && (
              <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {component.trend}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${component.score}%`,
            backgroundColor: component.color,
          }}
        />
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-4">
        {component.details.map((detail, i) => (
          <div key={i}>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {detail.label}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {detail.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickWinCard({ quickWin }: { quickWin: QuickWin }) {
  return (
    <Link
      href={quickWin.actionUrl}
      className="block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <LightBulbIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">
              {quickWin.title}
            </h4>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${impactColors[quickWin.impact]}`}
            >
              {quickWin.impact}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
            {quickWin.description}
          </p>
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              +{quickWin.estimatedPoints} points
            </span>
          </div>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-slate-500" />
      </div>
    </Link>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function VitalityScorePage() {
  const [data, setData] = useState<VitalityScore>(mockVitalityScore);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    setData(mockVitalityScore);
  }, []);

  useEffect(() => {
    loadData().then(() => setIsLoading(false));
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-6xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-64"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-48 bg-gray-200 dark:bg-slate-700 rounded-xl"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pointsToNext = data.nextMilestone.target - data.overall;

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      className="min-h-screen bg-gray-50 dark:bg-slate-900 px-4 py-6 sm:p-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              Financial Vitality Score
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400">
              Your holistic financial health at a glance
            </p>
          </div>
          <button
            onClick={() => loadData()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-gray-200 self-start sm:self-center flex-shrink-0"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Score */}
        <div className="bg-gradient-to-br from-emerald-500 via-blue-500 to-blue-600 rounded-xl p-4 sm:p-8 mb-6 sm:mb-8 text-white">
          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            <div className="flex-shrink-0">
              <ScoreRing score={data.overall} grade={data.grade} size={160} />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                {data.trend === "improving" && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800/20 rounded-full">
                    <ArrowTrendingUpIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      +{data.trendPercentage}% this month
                    </span>
                  </div>
                )}
                <div className="px-3 py-1 bg-white dark:bg-slate-800/20 rounded-full">
                  <span className="text-sm">
                    Top {100 - data.percentile}% of users
                  </span>
                </div>
              </div>

              <h2 className="text-3xl font-bold mb-2">
                {data.grade === "A" && "Excellent Financial Health!"}
                {data.grade === "B" && "Good Financial Health"}
                {data.grade === "C" && "Fair Financial Health"}
                {data.grade === "D" && "Needs Improvement"}
                {data.grade === "F" && "Take Action Now"}
              </h2>

              <p className="text-white/80 mb-6">
                {pointsToNext > 0 ? (
                  <>
                    Just {pointsToNext} points to reach &quot;
                    {data.nextMilestone.description}&quot;
                  </>
                ) : (
                  "You have reached the highest level!"
                )}
              </p>

              {/* Component mini-bars */}
              <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-white dark:bg-slate-800/20">
                {data.components.map((comp, i) => (
                  <div
                    key={i}
                    className="h-full"
                    style={{
                      width: `${comp.weight * 100}%`,
                      backgroundColor: comp.color,
                      opacity: comp.score / 100,
                    }}
                    title={`${comp.name}: ${comp.score}`}
                  />
                ))}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-white/70 flex-wrap justify-center md:justify-start">
                {data.components.map((comp, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: comp.color }}
                    />
                    {comp.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Wins */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-amber-500" />
              Quick Wins
            </h2>
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {data.quickWins.reduce((sum, q) => sum + q.estimatedPoints, 0)}{" "}
              points available
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {data.quickWins.map((quickWin) => (
              <QuickWinCard key={quickWin.id} quickWin={quickWin} />
            ))}
          </div>
        </div>

        {/* Component Breakdown */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Score Breakdown
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.components.map((component, i) => (
              <ComponentCard key={i} component={component} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Your Financial Vitality Score is updated daily based on your
            connected accounts and activities.
          </p>
        </div>
      </div>
    </PullToRefresh>
  );
}
