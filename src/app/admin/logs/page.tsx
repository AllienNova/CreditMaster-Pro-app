"use client";

import { useState } from "react";

const logs = [
  { id: 1, level: "error", message: "Failed to connect to Equifax API: Connection timeout", source: "credit-bureau-service", timestamp: "2024-12-03 10:45:23", count: 12 },
  { id: 2, level: "warning", message: "Rate limit approaching for Experian API (85%)", source: "rate-limiter", timestamp: "2024-12-03 10:42:15", count: 1 },
  { id: 3, level: "error", message: "Payment webhook signature verification failed", source: "stripe-webhook", timestamp: "2024-12-03 10:38:42", count: 3 },
  { id: 4, level: "info", message: "Database migration completed successfully", source: "migration-runner", timestamp: "2024-12-03 10:30:00", count: 1 },
  { id: 5, level: "warning", message: "Email delivery delayed: Queue backlog", source: "email-service", timestamp: "2024-12-03 10:25:18", count: 45 },
  { id: 6, level: "error", message: "User authentication failed: Invalid token", source: "auth-middleware", timestamp: "2024-12-03 10:20:33", count: 8 },
  { id: 7, level: "info", message: "Cache cleared for user preferences", source: "cache-service", timestamp: "2024-12-03 10:15:00", count: 1 },
  { id: 8, level: "error", message: "Dispute letter generation failed: AI service unavailable", source: "ai-service", timestamp: "2024-12-03 10:10:45", count: 5 },
];

export default function AdminLogsPage() {
  const [levelFilter, setLevelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) || log.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLevelBadge = (level: string) => {
    const styles: Record<string, string> = {
      error: "bg-red-100 text-red-700",
      warning: "bg-yellow-100 text-yellow-700",
      info: "bg-blue-100 text-blue-700",
      debug: "bg-gray-100 text-gray-700",
    };
    return <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[level]}`}>{level.toUpperCase()}</span>;
  };

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warningCount = logs.filter((l) => l.level === "warning").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Error Logs</h1>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
            Clear Logs
          </button>
          <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
            Export Logs
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600">Errors (24h)</p>
          <p className="text-3xl font-bold text-red-700">{errorCount}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-600">Warnings (24h)</p>
          <p className="text-3xl font-bold text-yellow-700">{warningCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600">Total Logs (24h)</p>
          <p className="text-3xl font-bold text-blue-700">{logs.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
          <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-mono text-sm">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{getLevelBadge(log.level)}</td>
                <td className="px-6 py-4 text-gray-900 max-w-md truncate">{log.message}</td>
                <td className="px-6 py-4 text-gray-500">{log.source}</td>
                <td className="px-6 py-4 text-gray-500">{log.count > 1 ? `×${log.count}` : "-"}</td>
                <td className="px-6 py-4 text-gray-500">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

