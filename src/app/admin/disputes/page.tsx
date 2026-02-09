"use client";

import { useState } from "react";

const stats = [
  { label: "Total Disputes", value: "24,567", change: "+18%" },
  { label: "Success Rate", value: "78%", change: "+3%" },
  { label: "Avg Resolution Time", value: "32 days", change: "-5 days" },
  { label: "Pending Review", value: "1,234", change: "+12%" },
];

const disputes = [
  { id: "D-12345", user: "john@example.com", type: "Late Payment", bureau: "Experian", status: "pending", date: "2024-12-01", priority: "high" },
  { id: "D-12346", user: "jane@example.com", type: "Collection", bureau: "Equifax", status: "in_progress", date: "2024-11-28", priority: "medium" },
  { id: "D-12347", user: "bob@example.com", type: "Inquiry", bureau: "TransUnion", status: "resolved", date: "2024-11-25", priority: "low" },
  { id: "D-12348", user: "alice@example.com", type: "Account Error", bureau: "Experian", status: "failed", date: "2024-11-20", priority: "high" },
  { id: "D-12349", user: "charlie@example.com", type: "Identity Theft", bureau: "All", status: "pending", date: "2024-12-02", priority: "urgent" },
];

export default function AdminDisputesPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [bureauFilter, setBureauFilter] = useState("all");

  const filteredDisputes = disputes.filter((d) => {
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesBureau = bureauFilter === "all" || d.bureau === bureauFilter;
    return matchesStatus && matchesBureau;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      in_progress: "bg-blue-100 text-blue-700",
      resolved: "bg-emerald-100 text-emerald-700",
      failed: "bg-red-100 text-red-700",
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>{status.replace("_", " ")}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: "bg-red-500 text-white",
      high: "bg-orange-100 text-orange-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200",
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${styles[priority]}`}>{priority}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dispute Management</h1>
        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
          Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
            <p className="text-sm mt-2 text-emerald-500">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="failed">Failed</option>
          </select>
          <select value={bureauFilter} onChange={(e) => setBureauFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg">
            <option value="all">All Bureaus</option>
            <option value="Experian">Experian</option>
            <option value="Equifax">Equifax</option>
            <option value="TransUnion">TransUnion</option>
          </select>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Bureau</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredDisputes.map((dispute) => (
              <tr key={dispute.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{dispute.id}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{dispute.user}</td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{dispute.type}</td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{dispute.bureau}</td>
                <td className="px-6 py-4">{getPriorityBadge(dispute.priority)}</td>
                <td className="px-6 py-4">{getStatusBadge(dispute.status)}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{dispute.date}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-emerald-500 hover:text-emerald-600 text-sm font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

