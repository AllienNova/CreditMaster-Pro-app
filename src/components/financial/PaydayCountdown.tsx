"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface PaydayCountdownProps {
  daysUntilPayday?: number;
  nextPayDate?: Date;
  expectedAmount?: number;
  sourceName?: string;
  percentComplete?: number;
  isLoading?: boolean;
  hasIncomeSources?: boolean;
  onAddIncome?: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function CircularProgress({
  value,
  size = 140,
  strokeWidth = 8,
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
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
          stroke="url(#paydayGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="paydayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-32 h-32 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-32"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAddIncome }: { onAddIncome?: () => void }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
          <BanknotesIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Track Your Payday
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Add your income sources to see a countdown to your next paycheck.
        </p>
        <button
          onClick={onAddIncome}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Income
        </button>
      </div>
    </div>
  );
}

export function PaydayCountdown({
  daysUntilPayday = 0,
  nextPayDate,
  expectedAmount = 0,
  sourceName = "Paycheck",
  percentComplete = 0,
  isLoading = false,
  hasIncomeSources = true,
  onAddIncome,
}: PaydayCountdownProps) {
  const [animatedDays, setAnimatedDays] = useState(0);

  useEffect(() => {
    // Animate the days countdown on mount
    const timer = setTimeout(() => {
      setAnimatedDays(daysUntilPayday);
    }, 100);
    return () => clearTimeout(timer);
  }, [daysUntilPayday]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!hasIncomeSources) {
    return <EmptyState onAddIncome={onAddIncome} />;
  }

  const isPayday = daysUntilPayday === 0;
  const isTomorrow = daysUntilPayday === 1;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-5">
        {/* Circular Progress */}
        <CircularProgress value={percentComplete} size={140}>
          <div className="text-center">
            {isPayday ? (
              <>
                <svg
                  className="w-7 h-7 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  />
                </svg>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Payday!
                </p>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {animatedDays}
                </span>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {isTomorrow ? "day" : "days"}
                </p>
              </>
            )}
          </div>
        </CircularProgress>

        {/* Details */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
            {isPayday
              ? "Today's payday!"
              : isTomorrow
                ? "Payday tomorrow!"
                : "Days until payday"}
          </h3>

          <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(expectedAmount)}
          </p>

          <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
            {sourceName}
          </p>

          <div className="space-y-2">
            {nextPayDate && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                <CalendarDaysIcon className="w-4 h-4" />
                <span>{formatDate(nextPayDate)}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
              <ClockIcon className="w-4 h-4" />
              <span>{percentComplete}% through pay period</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
        <Link
          href="/dashboard/income"
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
        >
          Manage income sources →
        </Link>

        {onAddIncome && (
          <button
            onClick={onAddIncome}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-gray-200 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add
          </button>
        )}
      </div>
    </div>
  );
}

export default PaydayCountdown;
