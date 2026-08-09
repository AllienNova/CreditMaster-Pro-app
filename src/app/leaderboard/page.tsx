"use client";

/**
 * Leaderboard Page
 * Rankings for XP, streaks, and challenges
 */

import React, { useEffect, useState, useCallback } from "react";

type LeaderboardType = "weekly_xp" | "monthly_xp" | "streak" | "challenge";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  value: number;
  isCurrentUser?: boolean;
}

interface LeaderboardResponse {
  type: LeaderboardType;
  periodStart: string;
  periodEnd: string;
  entries: LeaderboardEntry[];
  userRank?: number;
  userPercentile?: number;
}

const tabs: { key: LeaderboardType; label: string }[] = [
  { key: "weekly_xp", label: "Weekly XP" },
  { key: "monthly_xp", label: "Monthly XP" },
  { key: "streak", label: "Longest Streak" },
  { key: "challenge", label: "Challenges Won" },
];

function getRankStyle(rank: number): string {
  if (rank === 1) return "text-yellow-500";
  if (rank === 2) return "text-gray-400";
  if (rank === 3) return "text-amber-600";
  return "text-gray-500 dark:text-slate-400";
}

function getRankBadgeBg(rank: number): string {
  if (rank === 1)
    return "bg-yellow-100 dark:bg-yellow-900/30 ring-1 ring-yellow-300 dark:ring-yellow-700";
  if (rank === 2)
    return "bg-gray-100 dark:bg-gray-700/40 ring-1 ring-gray-300 dark:ring-gray-600";
  if (rank === 3)
    return "bg-amber-100 dark:bg-amber-900/30 ring-1 ring-amber-300 dark:ring-amber-700";
  return "bg-gray-50 dark:bg-slate-700/50";
}

function getRankLabel(rank: number): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `#${rank}`;
}

function formatValue(value: number, type: LeaderboardType): string {
  if (type === "streak") return `${value} day${value !== 1 ? "s" : ""}`;
  if (type === "challenge") return `${value} won`;
  return `${value.toLocaleString()} XP`;
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>("weekly_xp");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (type: LeaderboardType) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gamification/leaderboard?type=${type}`);
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Please sign in to view the leaderboard."
            : "Failed to load leaderboard.",
        );
      }
      const json: LeaderboardResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab, fetchLeaderboard]);

  const handleTabChange = (tab: LeaderboardType) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 dark:border-slate-700/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a
              href="/rewards"
              className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-gray-200"
            >
              &larr; Back to Rewards
            </a>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Leaderboard
              </h1>
            </div>
            <div className="w-24" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Stats Card */}
        {data && data.userRank != null && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center justify-around text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                  Your Rank
                </p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  #{data.userRank}
                </p>
              </div>
              <div className="w-px h-10 bg-blue-200 dark:bg-blue-700" />
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                  Top %
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {data.userPercentile != null
                    ? `${data.userPercentile}%`
                    : "-"}
                </p>
              </div>
              <div className="w-px h-10 bg-blue-200 dark:bg-blue-700" />
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                  Period
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  {new Date(data.periodStart).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  &ndash;{" "}
                  {new Date(data.periodEnd).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-300">
              Loading leaderboard...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchLeaderboard(activeTab)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data && data.entries.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 0 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 0 1-2.52.556m-4.5 0a6.023 6.023 0 0 1-2.52-.556"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Rankings Yet
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-4">
              Be the first to earn XP and climb the leaderboard!
            </p>
            <a
              href="/rewards"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Daily Quests
            </a>
          </div>
        )}

        {/* Leaderboard Table */}
        {!loading && !error && data && data.entries.length > 0 && (
          <div className="space-y-2">
            {data.entries.map((entry) => (
              <div
                key={`${entry.rank}-${entry.userId}`}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  entry.isCurrentUser
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                    : entry.rank <= 3
                      ? "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm"
                      : "bg-white dark:bg-slate-800/60 border-gray-100 dark:border-slate-700/50"
                }`}
              >
                {/* Rank Badge */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getRankBadgeBg(entry.rank)}`}
                >
                  <span
                    className={`text-sm font-bold ${getRankStyle(entry.rank)}`}
                  >
                    {getRankLabel(entry.rank)}
                  </span>
                </div>

                {/* Avatar Placeholder */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-300">
                    {entry.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      entry.isCurrentUser
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {entry.displayName}
                    {entry.isCurrentUser && (
                      <span className="ml-1 text-xs text-blue-500 dark:text-blue-400">
                        (You)
                      </span>
                    )}
                  </p>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold ${
                      entry.isCurrentUser
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {formatValue(entry.value, data.type)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
