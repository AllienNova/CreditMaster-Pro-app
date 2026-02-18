"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditMonitoringDashboard as DashboardData } from "@/lib/credit-monitoring/credit-monitoring-service";
import CreditScoreCard from "./CreditScoreCard";
import CreditScoreChart from "./CreditScoreChart";
import CreditAlertsList from "./CreditAlertsList";
import MonitoringSettings from "./MonitoringSettings";
import AICreditInsights from "./AICreditInsights";
import { useAuth } from "@/hooks/useAuth";

export default function CreditMonitoringDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/credit-monitoring`);

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard");
      }

      const data = await response.json();
      setDashboard(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchDashboard();
      // Refresh every 5 minutes
      const interval = setInterval(
        () => {
          void fetchDashboard();
        },
        5 * 60 * 1000,
      );
      return () => clearInterval(interval);
    }
    return undefined;
  }, [authLoading, user, fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
            >
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
              <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-gray-600 dark:text-slate-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchDashboard}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Settings Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Credit Scores
          </h2>
          <p className="text-gray-600 dark:text-slate-300">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
        >
          Settings
        </button>
      </div>

      {/* AI Credit Insights */}
      <AICreditInsights />

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CreditScoreCard
          bureau="experian"
          score={dashboard.currentScores.experian}
          change={dashboard.scoreChange30Days}
        />
        <CreditScoreCard
          bureau="equifax"
          score={dashboard.currentScores.equifax}
          change={dashboard.scoreChange30Days}
        />
        <CreditScoreCard
          bureau="transunion"
          score={dashboard.currentScores.transunion}
          change={dashboard.scoreChange30Days}
        />
      </div>

      {/* Average Score Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Average Credit Score</h3>
            <div className="text-5xl font-bold">{dashboard.averageScore}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm">30-day change:</span>
              <span
                className={`text-lg font-semibold ${dashboard.scoreChange30Days >= 0 ? "text-green-300" : "text-red-300"}`}
              >
                {dashboard.scoreChange30Days >= 0 ? "+" : ""}
                {dashboard.scoreChange30Days}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm">90-day change:</span>
              <span
                className={`text-lg font-semibold ${dashboard.scoreChange90Days >= 0 ? "text-green-300" : "text-red-300"}`}
              >
                {dashboard.scoreChange90Days >= 0 ? "+" : ""}
                {dashboard.scoreChange90Days}
              </span>
            </div>
          </div>
          <div className="text-6xl"></div>
        </div>
      </div>

      {/* Score History Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Score History
        </h3>
        <CreditScoreChart history={dashboard.history} />
      </div>

      {/* Alerts */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Alerts
          </h3>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
            {dashboard.alerts.filter((a) => !a.read).length} unread
          </span>
        </div>
        <CreditAlertsList
          alerts={dashboard.alerts}
          onRefresh={fetchDashboard}
        />
      </div>

      {/* Recent Changes */}
      {dashboard.recentChanges.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Recent Changes
          </h3>
          <div className="space-y-4">
            {dashboard.recentChanges.map((change, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg"
              >
                <div className="text-2xl"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {change.type}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {change.bureau.charAt(0).toUpperCase() +
                        change.bureau.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                    {change.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                    {change.date.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <MonitoringSettings
          onClose={() => setShowSettings(false)}
          onSave={() => {
            setShowSettings(false);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}
