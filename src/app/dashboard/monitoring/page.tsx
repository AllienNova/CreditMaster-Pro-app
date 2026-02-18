"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Alert {
  id: string;
  type: "score_change" | "new_account" | "inquiry" | "payment" | "utilization";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  date: string;
  read: boolean;
}

interface BureauScore {
  bureau: string;
  score: number;
  change: number;
  lastUpdated: string;
}

export default function CreditMonitoringPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scores, setScores] = useState<BureauScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data
    setTimeout(() => {
      setScores([
        {
          bureau: "Experian",
          score: 678,
          change: 12,
          lastUpdated: "2024-12-01",
        },
        { bureau: "Equifax", score: 665, change: 8, lastUpdated: "2024-11-28" },
        {
          bureau: "TransUnion",
          score: 672,
          change: 15,
          lastUpdated: "2024-11-30",
        },
      ]);
      setAlerts([
        {
          id: "1",
          type: "score_change",
          title: "Credit Score Increased",
          description: "Your Experian score increased by 12 points",
          severity: "info",
          date: "2024-12-01",
          read: false,
        },
        {
          id: "2",
          type: "inquiry",
          title: "New Hard Inquiry",
          description: "A hard inquiry was added by ABC Lender",
          severity: "warning",
          date: "2024-11-28",
          read: false,
        },
        {
          id: "3",
          type: "utilization",
          title: "High Utilization Alert",
          description: "Your credit utilization is above 30%",
          severity: "critical",
          date: "2024-11-25",
          read: true,
        },
        {
          id: "4",
          type: "payment",
          title: "Payment Due Soon",
          description: "Chase card payment due in 3 days",
          severity: "warning",
          date: "2024-11-20",
          read: true,
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      info: "bg-blue-100 text-blue-800 border-blue-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
      critical: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[severity] || colors.info;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      score_change: "",
      new_account: "🆕",
      inquiry: "",
      payment: "",
      utilization: "",
    };
    return icons[type] || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 p-8">
        <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-slate-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
              >
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Credit Monitoring
              </h1>
            </div>
            <span className="text-sm text-green-600 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Monitoring Active
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Bureau Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scores.map((bureau) => (
            <div
              key={bureau.bureau}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {bureau.bureau}
                </h3>
                <span
                  className={`text-sm font-medium ${bureau.change >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {bureau.change >= 0 ? "+" : ""}
                  {bureau.change} pts
                </span>
              </div>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {bureau.score}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Updated: {new Date(bureau.lastUpdated).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Recent Alerts
            </h2>
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {alerts.filter((a) => !a.read).length} unread
            </span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`px-6 py-4 flex items-start space-x-4 ${!alert.read ? "bg-blue-50/50" : ""}`}
              >
                <span className="text-2xl">{getTypeIcon(alert.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {alert.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getSeverityColor(alert.severity)}`}
                    >
                      {alert.severity}
                    </span>
                    {!alert.read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {alert.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {new Date(alert.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
