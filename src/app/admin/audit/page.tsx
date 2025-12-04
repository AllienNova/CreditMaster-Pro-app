"use client";

import { useState } from "react";

const auditLogs = [
  { id: 1, action: "user.login", user: "admin@creditmasterpro.com", ip: "192.168.1.1", details: "Successful login", timestamp: "2024-12-03 10:45:23", risk: "low" },
  { id: 2, action: "user.login_failed", user: "john@example.com", ip: "45.33.32.156", details: "Invalid password (3rd attempt)", timestamp: "2024-12-03 10:42:15", risk: "medium" },
  { id: 3, action: "data.export", user: "admin@creditmasterpro.com", ip: "192.168.1.1", details: "Exported user list (CSV)", timestamp: "2024-12-03 10:38:42", risk: "medium" },
  { id: 4, action: "user.role_change", user: "admin@creditmasterpro.com", ip: "192.168.1.1", details: "Changed role for bob@example.com to admin", timestamp: "2024-12-03 10:30:00", risk: "high" },
  { id: 5, action: "settings.update", user: "admin@creditmasterpro.com", ip: "192.168.1.1", details: "Updated rate limit settings", timestamp: "2024-12-03 10:25:18", risk: "medium" },
  { id: 6, action: "user.delete", user: "admin@creditmasterpro.com", ip: "192.168.1.1", details: "Deleted user: test@example.com", timestamp: "2024-12-03 10:20:33", risk: "high" },
  { id: 7, action: "api.key_created", user: "admin@creditmasterpro.com", ip: "192.168.1.1", details: "Created new API key for integration", timestamp: "2024-12-03 10:15:00", risk: "high" },
  { id: 8, action: "user.password_reset", user: "jane@example.com", ip: "72.14.192.1", details: "Password reset requested", timestamp: "2024-12-03 10:10:45", risk: "low" },
];

export default function AdminAuditPage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const filteredLogs = auditLogs.filter((log) => {
    const matchesAction = actionFilter === "all" || log.action.startsWith(actionFilter);
    const matchesRisk = riskFilter === "all" || log.risk === riskFilter;
    return matchesAction && matchesRisk;
  });

  const getRiskBadge = (risk: string) => {
    const styles: Record<string, string> = {
      low: "bg-emerald-100 text-emerald-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-red-100 text-red-700",
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${styles[risk]}`}>{risk}</span>;
  };

  const getActionIcon = (action: string) => {
    if (action.startsWith("user.login")) return "🔐";
    if (action.startsWith("user.")) return "👤";
    if (action.startsWith("data.")) return "📊";
    if (action.startsWith("settings.")) return "⚙️";
    if (action.startsWith("api.")) return "🔑";
    return "📋";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
          Export Audit Log
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Events (24h)</p>
          <p className="text-2xl font-bold text-gray-900">{auditLogs.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Login Attempts</p>
          <p className="text-2xl font-bold text-gray-900">{auditLogs.filter((l) => l.action.includes("login")).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">High Risk Events</p>
          <p className="text-2xl font-bold text-red-600">{auditLogs.filter((l) => l.risk === "high").length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Unique Users</p>
          <p className="text-2xl font-bold text-gray-900">{new Set(auditLogs.map((l) => l.user)).size}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="all">All Actions</option>
            <option value="user">User Actions</option>
            <option value="data">Data Actions</option>
            <option value="settings">Settings</option>
            <option value="api">API Actions</option>
          </select>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg" />
          <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span>{getActionIcon(log.action)}</span>
                    <span className="text-sm font-medium text-gray-900">{log.action}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{log.user}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{log.ip}</td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{log.details}</td>
                <td className="px-6 py-4">{getRiskBadge(log.risk)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

