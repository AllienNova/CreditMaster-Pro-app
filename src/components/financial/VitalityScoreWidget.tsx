'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface VitalityScoreWidgetProps {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
  percentile: number;
  isLoading?: boolean;
}

const gradeColors: Record<string, { bg: string; text: string; ring: string }> = {
  A: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ring: '#22C55E' },
  B: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', ring: '#3B82F6' },
  C: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', ring: '#F59E0B' },
  D: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', ring: '#F97316' },
  F: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', ring: '#EF4444' },
};

function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  color,
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  children: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-slate-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function TrendIndicator({
  trend,
  percentage,
}: {
  trend: 'improving' | 'stable' | 'declining';
  percentage: number;
}) {
  if (trend === 'improving') {
    return (
      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <ArrowTrendingUpIcon className="w-4 h-4" />
        <span className="text-sm font-medium">+{percentage}%</span>
      </div>
    );
  }
  if (trend === 'declining') {
    return (
      <div className="flex items-center gap-1 text-red-500">
        <ArrowTrendingDownIcon className="w-4 h-4" />
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
      <MinusIcon className="w-4 h-4" />
      <span className="text-sm font-medium">Stable</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 animate-pulse">
      <div className="flex items-center gap-5">
        <div className="w-28 h-28 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-32"></div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
      </div>
    </div>
  );
}

export function VitalityScoreWidget({
  score,
  grade,
  trend,
  trendPercentage,
  percentile,
  isLoading = false,
}: VitalityScoreWidgetProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const colors = gradeColors[grade];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-5">
        {/* Score Ring */}
        <CircularProgress value={score} size={120} color={colors.ring}>
          <div className="text-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{score}</span>
            <span
              className={`block text-lg font-bold ${colors.text} mt-1 px-2 py-0.5 rounded ${colors.bg}`}
            >
              {grade}
            </span>
          </div>
        </CircularProgress>

        {/* Details */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Financial Vitality Score
          </h3>

          <TrendIndicator trend={trend} percentage={trendPercentage} />

          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            You're doing better than {percentile}% of users
          </p>

          {/* Mini component bars */}
          <div className="flex gap-1 mt-3">
            <div className="flex-1 h-1.5 bg-emerald-500 rounded-full" title="Credit" />
            <div className="flex-1 h-1.5 bg-blue-500 rounded-full" title="Spending" />
            <div className="flex-1 h-1.5 bg-amber-500 rounded-full" title="Savings" />
            <div className="flex-1 h-1.5 bg-red-400 rounded-full" title="Debt" />
            <div className="flex-1 h-1.5 bg-teal-500 rounded-full" title="Investments" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
        <Link
          href="/dashboard/vitality"
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          <SparklesIcon className="w-4 h-4" />
          View full breakdown →
        </Link>
      </div>
    </div>
  );
}

export default VitalityScoreWidget;
