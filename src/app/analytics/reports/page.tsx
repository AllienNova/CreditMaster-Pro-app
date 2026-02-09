"use client";


import { Icon } from '@/components/ui/Icon';
const availableReports = [
  { id: "1", name: "Credit Score Summary", description: "Overview of your credit scores across all bureaus", type: "summary", lastGenerated: "Dec 1, 2024", icon: "chart-bar" },
  { id: "2", name: "Dispute Progress Report", description: "Detailed status of all your disputes", type: "disputes", lastGenerated: "Nov 28, 2024", icon: "document-text" },
  { id: "3", name: "Monthly Progress Report", description: "Month-over-month credit improvement analysis", type: "progress", lastGenerated: "Nov 30, 2024", icon: "trending-up" },
  { id: "4", name: "Negative Items Report", description: "List of all negative items on your credit reports", type: "negative", lastGenerated: "Nov 25, 2024", icon: "chart-bar" },
  { id: "5", name: "Credit Utilization Report", description: "Analysis of your credit card usage", type: "utilization", lastGenerated: "Dec 1, 2024", icon: "credit-card" },
  { id: "6", name: "Account History Report", description: "Complete history of all your credit accounts", type: "accounts", lastGenerated: "Nov 20, 2024", icon: "chart-bar" },
];

const scheduledReports = [
  { name: "Weekly Score Update", frequency: "Weekly", nextRun: "Dec 8, 2024", status: "active" },
  { name: "Monthly Progress Summary", frequency: "Monthly", nextRun: "Jan 1, 2025", status: "active" },
  { name: "Dispute Status Alert", frequency: "On Change", nextRun: "When updated", status: "active" },
];

const recentDownloads = [
  { name: "Credit Score Summary - Dec 2024", date: "Dec 1, 2024", format: "PDF", size: "245 KB" },
  { name: "Dispute Progress Report - Nov 2024", date: "Nov 28, 2024", format: "PDF", size: "312 KB" },
  { name: "Monthly Progress - Nov 2024", date: "Nov 30, 2024", format: "PDF", size: "189 KB" },
];

export default function ReportsAnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reports</h1>

      {/* Available Reports */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Available Reports</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {availableReports.map((report) => (
            <div key={report.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:border-emerald-300 hover:shadow-sm transition cursor-pointer">
              <div className="flex items-start gap-3">
                <Icon name={report.icon} className="text-2xl inline-block" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{report.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{report.description}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Last generated: {report.lastGenerated}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition">
                  Generate
                </button>
                <button className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition">
                  Schedule
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Scheduled Reports */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scheduled Reports</h2>
            <button className="text-sm text-emerald-500 hover:text-emerald-600">+ Add Schedule</button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {scheduledReports.map((report, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{report.name}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{report.frequency} • Next: {report.nextRun}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">{report.status}</span>
                  <button className="text-gray-400 hover:text-gray-600 dark:text-slate-300"></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Downloads */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Downloads</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {recentDownloads.map((download, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-red-500 text-xl"></span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{download.name}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{download.date} • {download.format} • {download.size}</p>
                  </div>
                </div>
                <button className="text-emerald-500 hover:text-emerald-600 text-sm font-medium">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Report Builder */}
      <div className="mt-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Custom Report Builder</h2>
            <p className="text-emerald-100 mt-1">Create personalized reports with the data that matters most to you</p>
          </div>
          <button className="px-6 py-2 bg-white dark:bg-slate-800 text-emerald-600 rounded-lg font-medium hover:bg-emerald-50 transition">
            Build Custom Report
          </button>
        </div>
      </div>
    </div>
  );
}

