"use client";

import { useState, useEffect, useCallback, use } from "react";
import GoalProgressBar from "@/components/financial/GoalProgressBar";
import MilestoneTimeline from "@/components/financial/MilestoneTimeline";
import Link from "next/link";

interface Milestone {
  id: string;
  amount: number;
  date: Date;
  achieved: boolean;
  description: string;
}

interface GoalDetail {
  id: string;
  type:
    | "emergency_fund"
    | "debt_payoff"
    | "savings"
    | "investment"
    | "retirement"
    | "custom";
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  status: "active" | "completed" | "paused";
  autoSaveEnabled?: boolean;
  autoSaveAmount?: number;
  milestones?: Milestone[];
  createdAt: string;
  description?: string;
  monthlyContribution?: number;
}

function GoalDetailLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Goal Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-4" />
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-full" />
      </div>

      {/* Progress Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-slate-700 rounded-lg h-32"
          />
        ))}
      </div>

      {/* Milestones */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 dark:bg-slate-700 rounded"
            />
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-6" />
        <div className="h-40 bg-gray-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getGoalTypeLabel(type: string): string {
  switch (type) {
    case "emergency_fund":
      return "Emergency Fund";
    case "debt_payoff":
      return "Debt Payoff";
    case "savings":
      return "Savings";
    case "investment":
      return "Investment";
    case "retirement":
      return "Retirement";
    default:
      return "Custom Goal";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "active":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "paused":
      return "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
  }
}

interface GoalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { id } = use(params);
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/financial/goals/${id}`);
      if (!response.ok) {
        throw new Error("Failed to load goal details");
      }
      const data: unknown = await response.json();
      if (data && typeof data === "object" && "goal" in data) {
        setGoal((data as { goal: GoalDetail }).goal);
      } else {
        setGoal(data as GoalDetail);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  const progress = goal
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    : 0;

  const daysRemaining = goal
    ? Math.ceil(
        (new Date(goal.targetDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Breadcrumb */}
        <div className="mb-8">
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link
                  href="/financial/coach"
                  className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  AI Coach
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg
                    className="w-6 h-6 text-gray-400 dark:text-slate-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <Link
                    href="/financial/coach/goals"
                    className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 dark:text-slate-400 dark:hover:text-white"
                  >
                    Goals
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg
                    className="w-6 h-6 text-gray-400 dark:text-slate-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-slate-400">
                    Goal Details
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Goal Details
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Detailed analytics, milestones, and AI-powered insights for your
            financial goal
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                Detailed Goal Analytics
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                View your goal progress, milestone timeline, contribution
                history, and AI-generated recommendations to help you reach your
                target faster.
              </p>
            </div>
          </div>
        </div>

        {/* Goal Detail Content */}
        {loading && <GoalDetailLoadingSkeleton />}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchGoal}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && goal && (
          <div className="space-y-6">
            {/* Goal Header Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {goal.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {getGoalTypeLabel(goal.type)}
                    </span>
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeClass(goal.status)}`}
                    >
                      {goal.status.charAt(0).toUpperCase() +
                        goal.status.slice(1)}
                    </span>
                  </div>
                </div>
                <Link
                  href="/financial/coach/goals"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Back to Goals
                </Link>
              </div>

              {goal.description && (
                <p className="text-gray-600 dark:text-slate-400 mb-4">
                  {goal.description}
                </p>
              )}

              {/* Progress */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Progress
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(goal.currentAmount)} /{" "}
                    {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
                <GoalProgressBar progress={progress} />
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-slate-400">
                  <span>{progress.toFixed(1)}% complete</span>
                  <span>
                    {daysRemaining > 0
                      ? `${daysRemaining} days remaining`
                      : "Overdue"}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                  Amount Remaining
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(
                    Math.max(goal.targetAmount - goal.currentAmount, 0)
                  )}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                  Target Date
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Date(goal.targetDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                  Monthly Contribution
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {goal.monthlyContribution
                    ? formatCurrency(goal.monthlyContribution)
                    : goal.autoSaveAmount
                      ? formatCurrency(goal.autoSaveAmount)
                      : "Not set"}
                </p>
              </div>
            </div>

            {/* Auto-Save Status */}
            {goal.autoSaveEnabled !== undefined && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Auto-Save
                </h3>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${
                      goal.autoSaveEnabled ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <span className="text-gray-700 dark:text-slate-300">
                    {goal.autoSaveEnabled
                      ? `Active - ${formatCurrency(goal.autoSaveAmount || 0)}/month`
                      : "Not enabled"}
                  </span>
                </div>
              </div>
            )}

            {/* Milestones */}
            {goal.milestones && goal.milestones.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Milestones (
                  {goal.milestones.filter((m) => m.achieved).length}/
                  {goal.milestones.length} achieved)
                </h3>
                <MilestoneTimeline milestones={goal.milestones} />
              </div>
            )}

            {/* Created Date */}
            {goal.createdAt && (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center">
                Goal created{" "}
                {new Date(goal.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        )}

        {!loading && !error && !goal && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 dark:text-slate-400 mb-4">
              Goal not found
            </p>
            <Link
              href="/financial/coach/goals"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Goals
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
