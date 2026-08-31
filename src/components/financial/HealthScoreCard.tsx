"use client";

/**
 * Health Score Card Component
 *
 * Displays financial health score with trend indicator, grade, and quick insights.
 * Integrates with Phase 1 Health Score Calculator.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

interface HealthScoreData {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  trend: "improving" | "declining" | "stable";
  breakdown: {
    savings: { score: number; status: string };
    debt: { score: number; status: string };
    spending: { score: number; status: string };
    credit: { score: number; status: string };
    insurance: { score: number; status: string };
  };
  calculatedAt: string;
}

export default function HealthScoreCard() {
  const { user } = useAuth();
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealthScore = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/financial/health-score");
      if (!response.ok) throw new Error("Failed to fetch health score");

      const data = await response.json();
      setHealthScore(data.data);
    } catch (error) {
      console.error("Error fetching health score:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchHealthScore();
  }, [fetchHealthScore]);

  const getScoreColor = (score: number): string => {
    if (score >= 90) return "from-green-500 to-emerald-600";
    if (score >= 80) return "from-blue-500 to-blue-600";
    if (score >= 70) return "from-yellow-500 to-orange-500";
    if (score >= 60) return "from-orange-500 to-red-500";
    return "from-red-600 to-red-700";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 70) return "Fair";
    if (score >= 60) return "Poor";
    return "Critical";
  };

  const getTrendIcon = (trend: string): string => {
    if (trend === "improving") return "";
    if (trend === "declining") return "";
    return "";
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (!healthScore) {
    return null;
  }

  return (
    <div
      className={`bg-gradient-to-br ${getScoreColor(healthScore.overallScore)} rounded-xl shadow-lg p-6 text-white`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold opacity-90">
          Financial Health Score
        </h3>
        <span className="text-2xl">{getTrendIcon(healthScore.trend)}</span>
      </div>

      {/* Score Display */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="white"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(healthScore.overallScore / 100) * 351.86} 351.86`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold">{healthScore.overallScore}</div>
            <div className="text-sm opacity-90">Grade {healthScore.grade}</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-2xl font-bold mb-2">
            {getScoreLabel(healthScore.overallScore)}
          </div>
          <div className="text-sm opacity-90 mb-3 capitalize">
            {healthScore.trend} trend
          </div>
          <Link
            href="/financial-hub"
            className="inline-block px-4 py-2 bg-white hover:bg-white dark:bg-slate-800/30 rounded-lg text-sm font-medium transition-colors"
          >
            View Details →
          </Link>
        </div>
      </div>

      {/* Quick Breakdown */}
      <div className="grid grid-cols-5 gap-2 pt-4 border-t border-white/20">
        {Object.entries(healthScore.breakdown).map(([key, value]) => (
          <div key={key} className="text-center">
            <div className="text-xs opacity-75 capitalize mb-1">{key}</div>
            <div className="text-lg font-bold">{value.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
