"use client";

/**
 * Reports.
 *
 * WHAT THIS PAGE USED TO CLAIM, WITH NO FETCH IN THE FILE.
 *
 *   - Every report type carried a `lastGenerated` date, so all six read as
 *     documents the visitor had already produced ("Credit Score Summary — last
 *     generated Dec 1, 2024").
 *   - `scheduledReports` showed a "Weekly Score Update" the user had never set
 *     up, marked active, with a next run date.
 *   - `recentDownloads` listed files they had never downloaded, complete with
 *     format and size ("Credit Score Summary - Dec 2024, PDF, 245 KB").
 *
 * Every date was in Dec 2024, so by the time anyone read it the fabrication was
 * also twenty months stale.
 *
 * NONE OF IT HAS ANYWHERE TO COME FROM. There is no generated-reports table, no
 * report-schedules table and no download history in any migration. Report
 * scheduling does not exist as a feature.
 *
 * AND GENERATION CANNOT BE HONESTLY OFFERED YET. POST /api/analytics/reports
 * exists, but it builds its payload from `AnalyticsEngine.generateReport`,
 * which composes the same all-zeros stubs described in task #99 —
 * analytics-engine.ts performs no query anywhere in the file. A "Generate"
 * button would hand the user a PDF of zeros with their name on it, which is a
 * worse outcome than no button: a document looks authoritative in a way a
 * screen does not.
 *
 * So the report catalogue stays — it is product content, and it tells the user
 * what this feature will cover — with the invented `lastGenerated` stripped,
 * and the page says plainly that reports cannot be produced yet.
 */

import { Icon } from "@/components/ui/Icon";

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: "1",
    name: "Credit Score Summary",
    description: "Overview of your credit scores across all bureaus",
    icon: "chart-bar",
  },
  {
    id: "2",
    name: "Dispute Progress Report",
    description: "Detailed status of all your disputes",
    icon: "document-text",
  },
  {
    id: "3",
    name: "Monthly Progress Report",
    description: "Month-over-month credit improvement analysis",
    icon: "trending-up",
  },
  {
    id: "4",
    name: "Negative Items Report",
    description: "List of all negative items on your credit reports",
    icon: "chart-bar",
  },
  {
    id: "5",
    name: "Credit Utilization Report",
    description: "Analysis of your credit card usage",
    icon: "credit-card",
  },
  {
    id: "6",
    name: "Account History Report",
    description: "Complete history of all your credit accounts",
    icon: "chart-bar",
  },
];

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Reports
      </h1>

      {/*
        Replaces the scheduled-reports panel and the download history. Neither
        had a table behind it, and generation would currently produce a
        document full of zeros.
      */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-8 shadow-sm border border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Reports cannot be generated yet
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          We cannot produce, schedule or store reports for you yet, so there is
          no history here and nothing to download. The reports below are what
          this will cover when it works — not documents you already have.
        </p>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Planned reports
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((report) => (
          <div
            key={report.id}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <Icon
                name={report.icon}
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
              />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {report.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              {report.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
