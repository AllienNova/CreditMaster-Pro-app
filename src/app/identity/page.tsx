"use client";

import Link from "next/link";

/**
 * Identity Protection.
 *
 * WHAT THIS PAGE USED TO SAY, TO EVERY USER, WITHOUT ASKING ANYTHING.
 *
 * `MOCK_ALERTS` told the caller that "A new credit card ending in 4821 was
 * opened in your name", that their SSN had been "Used in Application"
 * (severity: critical), and that their email "was found in a data breach from
 * December 2025". `SCAN_RESULTS` reported their email exposed once and their
 * passwords exposed twice, each stamped with a `lastScan` date, as though a
 * scan had run. `RECOMMENDED_ACTIONS` then told them to "Change 2 compromised
 * passwords" and "Freeze credit at TransUnion" — instructions derived from the
 * invented scan. The protection score was computed FROM those invented rows,
 * and the "Run Scan" button set a two-second spinner and did nothing at all.
 *
 * A person who believes "a new credit card was opened in your name" files a
 * police report, calls three bureaus, and freezes their credit. This screen
 * would have sent them to do that on the strength of nothing. It is the same
 * defect as the dark-web page's BREACH_ENTRIES, and worse in degree: that one
 * claimed exposure, this one claimed an account had been opened.
 *
 * THERE IS NO IDENTITY-MONITORING BACKEND. `src/app/api/identity/` does not
 * exist, and no route in the codebase scans for exposed credentials, watches an
 * SSN, or tracks bureau freezes. There is nothing to wire this to, so the
 * honest page is one that says so — the same answer /identity/dark-web gives.
 *
 * The tile grid was not clean navigation either. "Credit Freeze" carried the
 * badge "2/3" — a claim that the caller had frozen two of three bureaus — and
 * pointed at /credit/factors, which is not freeze management. "Identity
 * Insurance" claimed "$1M coverage" with a badge of "Active", a benefit the
 * caller does not have. Three of the six tiles linked to /identity, this page,
 * so they navigated nowhere. What remains are the two that name a real
 * destination and assert nothing.
 */

interface ProtectionFeature {
  title: string;
  subtitle: string;
  href: string;
  iconPath: string;
}

const FEATURES: ProtectionFeature[] = [
  {
    title: "Dark Web Monitoring",
    subtitle: "Scan for exposed data",
    href: "/identity/dark-web",
    iconPath:
      "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  },
  {
    title: "Credit Monitoring",
    subtitle: "New account alerts",
    href: "/dashboard/monitoring",
    iconPath:
      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
];

export default function IdentityProtectionPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Identity Protection
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Where to keep an eye on your personal information.
          </p>
        </div>

        {/*
          Replaces the protection score, the alert list, the scan-status grid
          and the "Run Scan" button. Every one of them reported on a scan that
          never ran.
        */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Identity monitoring is not active
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Fynvita is not connected to an identity-monitoring provider yet. We
            are not watching your SSN, your passwords or your accounts, and we
            have no alerts for you — so we will not show you a score or a scan
            result we made up.
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-3">
            To check whether your details have appeared in a known breach, Have
            I Been Pwned is free and independent. A credit freeze is requested
            directly with each of the three bureaus.
          </p>
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
      </div>
    </div>
  );
}
