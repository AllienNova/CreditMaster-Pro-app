"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Icon } from "@/components/ui/Icon";

interface ReportConfig {
  type: "monthly" | "quarterly" | "annual" | "custom";
  format: "pdf" | "csv" | "excel";
  startDate: string;
  endDate: string;
  includeTransactions: boolean;
  includeAccounts: boolean;
  includeBudgets: boolean;
  includeGoals: boolean;
}

export default function FinancialReports() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ReportConfig>({
    type: "monthly",
    format: "pdf",
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    includeTransactions: true,
    includeAccounts: true,
    includeBudgets: true,
    includeGoals: true,
  });
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!user) {
      alert("You must be logged in to generate reports");
      return;
    }

    setGenerating(true);

    try {
      // Simulate report generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      alert(
        `Report generated successfully! Format: ${config.format.toUpperCase()}`,
      );
    } catch (error) {
      console.error("Failed to generate report", error);
      alert("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleTypeChange = (type: ReportConfig["type"]) => {
    const now = new Date();
    const startDate = new Date();

    switch (type) {
      case "monthly":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarterly":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "annual":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "custom":
        // Keep current dates
        return setConfig({ ...config, type });
    }

    setConfig({
      ...config,
      type,
      startDate: startDate.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
    });
  };

  const savedReports = [
    {
      id: "1",
      name: "January 2025 Report",
      date: new Date("2025-02-01"),
      format: "pdf",
      size: "2.4 MB",
    },
    {
      id: "2",
      name: "Q4 2024 Report",
      date: new Date("2025-01-01"),
      format: "excel",
      size: "1.8 MB",
    },
    {
      id: "3",
      name: "Annual 2024 Report",
      date: new Date("2025-01-15"),
      format: "pdf",
      size: "5.2 MB",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Generate Report Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Generate New Report
        </h2>

        <div className="space-y-6">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
              Report Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["monthly", "quarterly", "annual", "custom"] as const).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold capitalize transition-colors ${
                      config.type === type
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:border-gray-400"
                    }`}
                  >
                    {type}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={config.startDate}
                onChange={(e) =>
                  setConfig({ ...config, startDate: e.target.value })
                }
                disabled={config.type !== "custom"}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={config.endDate}
                onChange={(e) =>
                  setConfig({ ...config, endDate: e.target.value })
                }
                disabled={config.type !== "custom"}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["pdf", "csv", "excel"] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setConfig({ ...config, format })}
                  className={`px-4 py-3 rounded-lg border-2 font-semibold uppercase transition-colors ${
                    config.format === format
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:border-gray-400"
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Include Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
              Include in Report
            </label>
            <div className="space-y-3">
              {[
                {
                  key: "includeTransactions",
                  label: "Transactions",
                  icon: "sparkles",
                },
                {
                  key: "includeAccounts",
                  label: "Account Balances",
                  icon: "sparkles",
                },
                {
                  key: "includeBudgets",
                  label: "Budget Analysis",
                  icon: "sparkles",
                },
                {
                  key: "includeGoals",
                  label: "Financial Goals",
                  icon: "sparkles",
                },
              ].map((option) => (
                <label
                  key={option.key}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={
                      config[option.key as keyof ReportConfig] as boolean
                    }
                    onChange={(e) =>
                      setConfig({ ...config, [option.key]: e.target.checked })
                    }
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <Icon name={option.icon} className="text-2xl inline-block" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={generating}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating Report...
              </span>
            ) : (
              "Generate Report"
            )}
          </button>
        </div>
      </div>

      {/* Saved Reports */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Saved Reports
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            {savedReports.length} reports
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {savedReports.map((report) => (
            <div
              key={report.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-500 rounded-lg flex items-center justify-center text-white text-2xl"></div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300 mt-1">
                      <span>{report.date.toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="uppercase">{report.format}</span>
                      <span>•</span>
                      <span>{report.size}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Templates */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span></span>
          Quick Report Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: "Monthly Summary",
              description: "Income, expenses, and savings for the month",
              icon: "wallet",
            },
            {
              name: "Tax Report",
              description: "Annual income and deductions for tax filing",
              icon: "wallet",
            },
            {
              name: "Net Worth Statement",
              description: "Complete assets and liabilities breakdown",
              icon: "document-text",
            },
          ].map((template) => (
            <div
              key={template.name}
              className="bg-white dark:bg-slate-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="text-4xl mb-3">{template.icon}</div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                {template.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                {template.description}
              </p>
              <button
                type="button"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
              >
                Use Template
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
