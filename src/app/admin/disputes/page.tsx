"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * WHAT THIS REPLACED. Two constants.
 *
 * `stats` invented platform metrics — "24,567 Total Disputes", "78% Success
 * Rate", "32 days Avg Resolution Time", "1,234 Pending Review" — each with a
 * period-over-period change ("+18%", "+3%", "-5 days") computed from nothing.
 * `disputes` invented dispute records with real-looking user emails.
 *
 * WHAT EXISTS. GET /api/admin/disputes (withRole("admin")) returns
 * `{ disputes, total }` and no statistics.
 *
 * So Total Disputes is the route's own `total`, and Pending is counted over
 * the loaded rows and labelled as such. Success Rate and Avg Resolution Time
 * are GONE, not estimated: no outcome history is recorded anywhere, which is
 * the same gap SF-09 records for the per-template `successRate` shown to
 * users. Every `change` figure is gone too — a delta needs a previous period,
 * and nothing stores one.
 */

interface AdminDispute {
  id: string;
  user?: string | null;
  type?: string | null;
  bureau?: string | null;
  status: string;
  date?: string | null;
  priority?: string | null;
}

export default function AdminDisputesPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [bureauFilter, setBureauFilter] = useState("all");
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/disputes");
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setDisputes(Array.isArray(json.disputes) ? json.disputes : []);
      setTotal(typeof json.total === "number" ? json.total : 0);
    } catch {
      setFailed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: "bg-red-500 text-white",
      high: "bg-orange-100 text-orange-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dispute Management
        </h1>
        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
          Export Report
        </button>
      </div>

      {/* Two real figures, not four invented ones. See the note at the top. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Total Disputes
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {failed ? "—" : total}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Pending in this view
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {disputes.filter((d) => d.status === "pending").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={bureauFilter}
            onChange={(e) => setBureauFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
          >
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Bureau
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredDisputes.map((dispute) => (
              <tr
                key={dispute.id}
                className="hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {dispute.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                  {dispute.user}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {dispute.type}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {dispute.bureau}
                </td>
                <td className="px-6 py-4">
                  {dispute.priority ? (
                    getPriorityBadge(dispute.priority)
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">{getStatusBadge(dispute.status)}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                  {dispute.date}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-emerald-500 hover:text-emerald-600 text-sm font-medium">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {failed ? (
          <div className="p-6 text-center">
            <p className="text-gray-900 dark:text-white">
              We could not load the disputes.
            </p>
            <button
              onClick={load}
              className="mt-2 text-sm text-emerald-500 hover:text-emerald-600 font-medium"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <p className="p-6 text-center text-gray-500 dark:text-slate-400">
            Loading…
          </p>
        ) : disputes.length === 0 ? (
          <p className="p-6 text-center text-gray-500 dark:text-slate-400">
            No disputes have been filed.
          </p>
        ) : filteredDisputes.length === 0 ? (
          <p className="p-6 text-center text-gray-500 dark:text-slate-400">
            No disputes match this filter.
          </p>
        ) : null}
      </div>
    </div>
  );
}
