import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Dark Web Monitoring | Identity Protection | Fynvita",
  description:
    "Scan the dark web for your exposed personal information including emails, passwords, and financial data.",
  openGraph: {
    title: "Dark Web Monitoring | Identity Protection | Fynvita",
    description:
      "Scan the dark web for your exposed personal information including emails, passwords, and financial data.",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreachEntry {
  id: string;
  source: string;
  date: string;
  exposedData: string[];
  severity: "critical" | "high" | "medium" | "low";
  affectedEmail: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const BREACH_ENTRIES: BreachEntry[] = [
  {
    id: "br-1",
    source: "MegaCorp Data Breach",
    date: "2025-12-14",
    exposedData: ["Email", "Password (hashed)", "Full Name"],
    severity: "high",
    affectedEmail: "user@example.com",
    description:
      "MegaCorp suffered a breach exposing 12M accounts. Your email and hashed password were included in the dump found on a dark web marketplace.",
  },
  {
    id: "br-2",
    source: "SocialApp Credential Leak",
    date: "2025-08-22",
    exposedData: ["Email", "Password (plaintext)", "Phone Number"],
    severity: "critical",
    affectedEmail: "user@example.com",
    description:
      "SocialApp credentials were leaked in plaintext on a paste site. Your password from this site may be used in credential-stuffing attacks.",
  },
  {
    id: "br-3",
    source: "RetailStore Customer DB",
    date: "2025-05-03",
    exposedData: ["Email", "Mailing Address"],
    severity: "medium",
    affectedEmail: "personal@example.com",
    description:
      "RetailStore customer database was compromised. Your email and mailing address were exposed but no financial data was found.",
  },
  {
    id: "br-4",
    source: "FitnessTrack API Exposure",
    date: "2024-11-18",
    exposedData: ["Email", "Date of Birth"],
    severity: "low",
    affectedEmail: "personal@example.com",
    description:
      "FitnessTrack had an open API that exposed user profile data. Limited personal information was accessible for a short period.",
  },
];

const EXPOSED_CATEGORIES = [
  { category: "Emails", count: 2, status: "exposed" as const },
  { category: "Passwords", count: 2, status: "exposed" as const },
  { category: "Phone Numbers", count: 1, status: "exposed" as const },
  { category: "Addresses", count: 1, status: "exposed" as const },
  { category: "SSN", count: 0, status: "safe" as const },
  { category: "Financial Data", count: 0, status: "safe" as const },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityClasses(severity: BreachEntry["severity"]): {
  badge: string;
  border: string;
} {
  switch (severity) {
    case "critical":
      return {
        badge:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        border: "border-l-red-500",
      };
    case "high":
      return {
        badge:
          "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        border: "border-l-orange-500",
      };
    case "medium":
      return {
        badge:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        border: "border-l-amber-500",
      };
    default:
      return {
        badge:
          "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
        border: "border-l-gray-400",
      };
  }
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function DarkWebLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-slate-700 rounded-lg h-24"
          />
        ))}
      </div>

      {/* Categories */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-10 bg-gray-200 dark:bg-slate-700 rounded"
            />
          ))}
        </div>
      </div>

      {/* Breach entries */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-gray-200 dark:bg-slate-700 rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content (rendered inside Suspense)
// ---------------------------------------------------------------------------

function DarkWebContent() {
  const totalBreaches = BREACH_ENTRIES.length;
  const totalExposed = EXPOSED_CATEGORIES.reduce((s, c) => s + c.count, 0);
  const criticalCount = BREACH_ENTRIES.filter(
    (b) => b.severity === "critical" || b.severity === "high",
  ).length;

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 text-center">
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {totalBreaches}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            Breaches Found
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 text-center">
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {totalExposed}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            Exposed Data Points
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 text-center">
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {criticalCount}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            High / Critical
          </p>
        </div>
      </div>

      {/* Exposed Data Categories */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Exposed Data Categories
        </h2>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
          {EXPOSED_CATEGORIES.map((cat) => (
            <div
              key={cat.category}
              className="flex items-center justify-between px-5 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${cat.status === "exposed" ? "bg-red-500" : "bg-green-500"}`}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {cat.category}
                </span>
              </div>
              <span
                className={`text-sm font-medium ${cat.status === "exposed" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
              >
                {cat.status === "exposed"
                  ? `${cat.count} exposed`
                  : "Not found"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Breach Details */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Breach Details
        </h2>
        <div className="space-y-4">
          {BREACH_ENTRIES.map((breach) => {
            const sc = severityClasses(breach.severity);
            return (
              <div
                key={breach.id}
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 border-l-4 ${sc.border} p-5`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {breach.source}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium uppercase px-2 py-0.5 rounded-full ${sc.badge}`}
                    >
                      {breach.severity}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-500">
                      {breach.date}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                  {breach.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {breach.exposedData.map((d) => (
                    <span
                      key={d}
                      className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-1 rounded"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-500">
                  Affected: {breach.affectedEmail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DarkWebMonitoringPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                href="/identity"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Identity Protection
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
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-slate-400">
                  Dark Web Monitoring
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dark Web Monitoring
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Continuous scans of dark web marketplaces, forums, and paste sites
            for your personal information.
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
                How Dark Web Monitoring Works
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                We continuously scan thousands of dark web sources including
                marketplaces, paste sites, and hacker forums. When your data is
                found, we alert you immediately with recommended actions.
              </p>
            </div>
          </div>
        </div>

        {/* Content with Suspense */}
        <Suspense fallback={<DarkWebLoadingSkeleton />}>
          <DarkWebContent />
        </Suspense>
      </div>
    </div>
  );
}
