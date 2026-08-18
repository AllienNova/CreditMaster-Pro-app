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

/*
 * A `BreachEntry` interface, BREACH_ENTRIES, EXPOSED_CATEGORIES and a
 * severityClasses() helper lived here. All four existed only to render the
 * invented breach report described in DarkWebContent below, and all four are
 * gone with it — a severity palette for severities nobody measured is not
 * worth keeping warm.
 */

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
  /*
   * This component rendered BREACH_ENTRIES and EXPOSED_CATEGORIES: a summary
   * of "Breaches Found", "Exposed Data Points" and "High / Critical", a
   * per-category exposed/not-found list, and a detail card per breach reading
   *
   *   "MegaCorp Data Breach" — 2025-12-14 — HIGH
   *   "MegaCorp suffered a breach exposing 12M accounts. Your email and hashed
   *    password were included in the dump found on a dark web marketplace."
   *   Affected: user@example.com
   *
   * None of it was real. There is no dark-web monitoring in this codebase at
   * all — no provider client, no route, no table. Searching for a breach
   * source finds only `src/lib/compliance/gdpr-ccpa.ts`, which is about
   * NOTIFYING regulators of a breach of ours, not checking whether the
   * caller's credentials appear in someone else's dump.
   *
   * This is the most actionable fabrication found in the audit. A user who
   * believes it changes passwords, freezes credit, or buys monitoring — real
   * money and real effort, spent on nothing. `affectedEmail` was the
   * placeholder "user@example.com", so the card was not even personalised;
   * it simply read as the caller's own breach.
   *
   * The three summary tiles are gone with it: each was computed FROM the
   * invented list (`BREACH_ENTRIES.length`, a sum over `EXPOSED_CATEGORIES`,
   * a filter on severity), so they were fabrications one step removed — the
   * shape that made the retirement figures on /tax/optimizer and the
   * "Disputable" tile on /marketplace/analysis read as measurements.
   */
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Dark web monitoring is not active
      </h2>
      <p className="text-sm text-gray-600 dark:text-slate-400">
        We have not scanned anything for you. Fynvita is not connected to a
        breach-monitoring provider yet, so we cannot tell you whether your
        details appear in a leak — and we would rather say that than show you a
        result we made up.
      </p>
      <p className="text-sm text-gray-600 dark:text-slate-400 mt-3">
        If you want to check now, Have I Been Pwned is free and independent.
      </p>
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
