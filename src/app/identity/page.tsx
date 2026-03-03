"use client";

import { useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  date: string;
  resolved: boolean;
}

interface ScanResult {
  category: string;
  status: "safe" | "exposed" | "monitoring";
  count: number;
  lastScan: string;
}

interface ProtectionFeature {
  title: string;
  subtitle: string;
  href: string;
  badge: string | null;
  iconPath: string;
}

interface ActionItem {
  label: string;
  iconPath: string;
  iconColor: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_ALERTS: Alert[] = [
  {
    id: "1",
    type: "warning",
    title: "Email Found on Dark Web",
    description:
      "Your email address was found in a data breach from December 2025.",
    date: "2026-02-28",
    resolved: false,
  },
  {
    id: "2",
    type: "info",
    title: "New Account Opened",
    description: "A new credit card ending in 4821 was opened in your name.",
    date: "2026-02-25",
    resolved: true,
  },
  {
    id: "3",
    type: "critical",
    title: "SSN Used in Application",
    description:
      "Your Social Security number was used in a credit application you did not initiate.",
    date: "2026-03-01",
    resolved: false,
  },
];

const SCAN_RESULTS: ScanResult[] = [
  {
    category: "Email Addresses",
    status: "exposed",
    count: 1,
    lastScan: "2026-03-02",
  },
  {
    category: "Phone Numbers",
    status: "safe",
    count: 0,
    lastScan: "2026-03-02",
  },
  { category: "SSN", status: "safe", count: 0, lastScan: "2026-03-02" },
  {
    category: "Passwords",
    status: "exposed",
    count: 2,
    lastScan: "2026-03-02",
  },
  {
    category: "Bank Accounts",
    status: "safe",
    count: 0,
    lastScan: "2026-03-02",
  },
  {
    category: "Credit Cards",
    status: "monitoring",
    count: 0,
    lastScan: "2026-03-02",
  },
];

const FEATURES: ProtectionFeature[] = [
  {
    title: "Dark Web Monitoring",
    subtitle: "Scan for exposed data",
    href: "/identity/dark-web",
    badge: "2 found",
    iconPath:
      "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  },
  {
    title: "SSN Monitoring",
    subtitle: "Track SSN usage",
    href: "/identity",
    badge: null,
    iconPath:
      "M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4",
  },
  {
    title: "Credit Monitoring",
    subtitle: "New account alerts",
    href: "/dashboard/monitoring",
    badge: null,
    iconPath:
      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    title: "Credit Freeze",
    subtitle: "Manage bureau freezes",
    href: "/credit/factors",
    badge: "2/3",
    iconPath:
      "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    title: "Identity Insurance",
    subtitle: "$1M coverage",
    href: "/identity",
    badge: "Active",
    iconPath:
      "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Recovery Plan",
    subtitle: "If identity is stolen",
    href: "/identity",
    badge: null,
    iconPath:
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
];

const RECOMMENDED_ACTIONS: ActionItem[] = [
  {
    label: "Change 2 compromised passwords",
    iconPath: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
    iconColor: "text-amber-500",
  },
  {
    label: "Freeze credit at TransUnion",
    iconPath:
      "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    iconColor: "text-blue-500",
  },
  {
    label: "Enable two-factor authentication on 3 accounts",
    iconPath:
      "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
    iconColor: "text-violet-500",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeProtectionScore(results: ScanResult[]): number {
  const exposedCount = results
    .filter((s) => s.status === "exposed")
    .reduce((sum, s) => sum + s.count, 0);
  return exposedCount === 0 ? 100 : Math.max(0, 100 - exposedCount * 15);
}

function scoreColorClass(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function scoreBgClass(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Well Protected";
  if (score >= 60) return "Needs Attention";
  return "At Risk";
}

function alertSeverityClasses(type: Alert["type"]): {
  bg: string;
  icon: string;
  border: string;
} {
  switch (type) {
    case "critical":
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        icon: "text-red-500",
        border: "border-red-200 dark:border-red-800",
      };
    case "warning":
      return {
        bg: "bg-amber-50 dark:bg-amber-900/20",
        icon: "text-amber-500",
        border: "border-amber-200 dark:border-amber-800",
      };
    default:
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        icon: "text-blue-500",
        border: "border-blue-200 dark:border-blue-800",
      };
  }
}

function alertIconPath(type: Alert["type"]): string {
  switch (type) {
    case "critical":
      return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
    case "warning":
      return "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
    default:
      return "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
  }
}

function statusClasses(status: ScanResult["status"]): {
  text: string;
  dot: string;
} {
  switch (status) {
    case "safe":
      return { text: "text-green-600 dark:text-green-400", dot: "bg-green-500" };
    case "exposed":
      return { text: "text-red-600 dark:text-red-400", dot: "bg-red-500" };
    default:
      return { text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" };
  }
}

function statusLabel(result: ScanResult): string {
  if (result.status === "exposed") return `${result.count} exposed`;
  if (result.status === "safe") return "Safe";
  return "Monitoring";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IdentityProtectionPage() {
  const [scanRunning, setScanRunning] = useState(false);

  const protectionScore = computeProtectionScore(SCAN_RESULTS);
  const unresolvedAlerts = MOCK_ALERTS.filter((a) => !a.resolved);
  const exposedCount = SCAN_RESULTS.filter(
    (s) => s.status === "exposed",
  ).reduce((sum, s) => sum + s.count, 0);

  const handleRunScan = () => {
    setScanRunning(true);
    setTimeout(() => setScanRunning(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Identity Protection
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Monitor your personal information across the web and protect against
            identity theft.
          </p>
        </div>

        {/* Protection Score */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Score circle */}
            <div className="flex-shrink-0">
              <div
                className={`relative w-32 h-32 rounded-full border-8 ${scoreBgClass(protectionScore)}/20 flex items-center justify-center`}
              >
                <div className="text-center">
                  <span
                    className={`text-4xl font-bold ${scoreColorClass(protectionScore)}`}
                  >
                    {protectionScore}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Score
                  </p>
                </div>
              </div>
            </div>

            {/* Score info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {scoreLabel(protectionScore)}
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                {exposedCount} items exposed &middot;{" "}
                {unresolvedAlerts.length} active alerts
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                Last scan: Today at 9:00 AM
              </p>
            </div>

            {/* Scan button */}
            <button
              onClick={handleRunScan}
              disabled={scanRunning}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <svg
                className={`w-4 h-4 ${scanRunning ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {scanRunning ? "Scanning..." : "Run Full Scan"}
            </button>
          </div>
        </div>

        {/* Active Alerts */}
        {unresolvedAlerts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Active Alerts
              </h2>
              <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full">
                {unresolvedAlerts.length} unresolved
              </span>
            </div>
            <div className="space-y-3">
              {unresolvedAlerts.map((alert) => {
                const severity = alertSeverityClasses(alert.type);
                return (
                  <div
                    key={alert.id}
                    className={`${severity.bg} border ${severity.border} rounded-lg p-4 flex items-start gap-3`}
                  >
                    <svg
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${severity.icon}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={alertIconPath(alert.type)}
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {alert.title}
                        </h3>
                        <span className="text-xs font-medium uppercase px-2 py-0.5 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300">
                          {alert.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-slate-300 mt-1">
                        {alert.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                        {alert.date}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0"
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Monitoring Status Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Monitoring Status
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {SCAN_RESULTS.map((result) => {
              const sc = statusClasses(result.status);
              return (
                <div
                  key={result.category}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${sc.dot}`}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {result.category}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${sc.text}`}>
                    {statusLabel(result)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Protection Features Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Protection Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 hover:shadow-md transition-shadow relative"
              >
                {feature.badge && (
                  <span
                    className={`absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                      feature.badge.includes("found")
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}
                  >
                    {feature.badge}
                  </span>
                )}
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={feature.iconPath}
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {feature.subtitle}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recommended Actions
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
            {RECOMMENDED_ACTIONS.map((action) => (
              <button
                key={action.label}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <svg
                  className={`w-5 h-5 flex-shrink-0 ${action.iconColor}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={action.iconPath}
                  />
                </svg>
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                  {action.label}
                </span>
                <svg
                  className="w-4 h-4 text-gray-400 dark:text-slate-500"
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
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
