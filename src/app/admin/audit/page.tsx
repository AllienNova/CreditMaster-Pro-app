"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * WHAT THIS REPLACED. `auditLogs` was eight invented entries — "user.login" by
 * admin@fynvitapro.com from 192.168.1.1, "Deleted user: test@example.com",
 * "Created new API key for integration" — with plausible timestamps and risk
 * ratings, rendered to any admin with no request made.
 *
 * An audit log is a compliance artefact. A fabricated one is worse than an
 * empty one: it answers "did anyone touch this account?" with a confident no
 * that was never checked.
 *
 * WHERE IT COMES FROM NOW. GET /api/admin/audit (withRole("admin")) returns
 * { logs, total, page, limit, totalPages } from
 *   .from("audit_logs").select("*, profiles(full_name, email)")
 *   .order("created_at", { ascending: false })
 *
 * The live columns are the union of two migrations:
 * 002_production_enhancements.sql:23 creates id, user_id -> profiles, action,
 * resource_type, resource_id, old_values, new_values, ip_address, user_agent,
 * created_at; 20260217000000_infrastructure_persistence.sql adds event_type,
 * level, message, session_id and others with ADD COLUMN IF NOT EXISTS. (Its
 * own CREATE TABLE is a no-op because 002 runs first — this looks like a
 * schema conflict and is not one.)
 *
 * `message` and `severity` come from that later migration and may be null on
 * older rows, so neither is given a default. A missing severity renders NO
 * badge rather than "low", because "low risk" is a claim about the event.
 */

interface AuditLogRow {
  id: string;
  action: string | null;
  ip_address: string | null;
  message: string | null;
  severity: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
}

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/admin/audit?page=1&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setLogs(Array.isArray(json.logs) ? json.logs : []);
      setTotal(typeof json.total === "number" ? json.total : 0);
    } catch {
      // An unreadable audit log and an empty one are different answers to
      // "did anyone touch this?", and must not render the same.
      setFailed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredLogs = logs.filter((log) => {
    const matchesAction =
      actionFilter === "all" || (log.action ?? "").startsWith(actionFilter);
    const matchesRisk = riskFilter === "all" || log.severity === riskFilter;
    return matchesAction && matchesRisk;
  });

  /** No badge when severity is absent — "low" would be a claim about the event. */
  const getRiskBadge = (risk: string | null) => {
    if (!risk) return <span className="text-xs text-gray-400">—</span>;
    const styles: Record<string, string> = {
      low: "bg-emerald-100 text-emerald-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${styles[risk] ?? "bg-gray-100 text-gray-700"}`}
      >
        {risk}
      </span>
    );
  };

  const getActionIcon = (action: string | null) => {
    if ((action ?? "").startsWith("user.login")) return "";
    if ((action ?? "").startsWith("user.")) return "";
    if ((action ?? "").startsWith("data.")) return "";
    if ((action ?? "").startsWith("settings.")) return "";
    if ((action ?? "").startsWith("api.")) return "";
    return "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Audit Trail
        </h1>
        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
          Export Audit Log
        </button>
      </div>

      {/*
        These counted the invented array. "Total Events (24h)" in particular
        claimed a 24-hour window over data with no window at all.

        Total now comes from the route's own `total`, which is the real row
        count. The other three are computed over the LOADED PAGE and say so:
        counting logins or unique users across ALL events needs a server-side
        aggregate that /api/admin/audit does not provide, and a page-scoped
        number under an all-time label is the same mislabel in a new place.
      */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Total Events
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {failed ? "—" : total}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Logins in the latest {PAGE_SIZE}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {logs.filter((l) => (l.action ?? "").includes("login")).length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            High severity in the latest {PAGE_SIZE}
          </p>
          <p className="text-2xl font-bold text-red-600">
            {logs.filter((l) => l.severity === "high").length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Users in the latest {PAGE_SIZE}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Set(logs.map((l) => l.profiles?.email ?? l.id)).size}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
          >
            <option value="all">All Actions</option>
            <option value="user">User Actions</option>
            <option value="data">Data Actions</option>
            <option value="settings">Settings</option>
            <option value="api">API Actions</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <input
            type="date"
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
          />
          <input
            type="date"
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span>{getActionIcon(log.action)}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.action}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                  {log.profiles?.email ?? "unknown"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 font-mono">
                  {log.ip_address ?? "—"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300 max-w-xs truncate">
                  {log.message ?? "—"}
                </td>
                <td className="px-6 py-4">{getRiskBadge(log.severity)}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                  {new Date(log.created_at).toLocaleString("en-US", {
                    timeZone: "UTC",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" UTC"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/*
          Three distinct answers, never conflated: we could not read the log,
          we read it and it is empty, or your filter matched nothing. An audit
          log that cannot be read must not look like one with nothing in it.
        */}
        {failed ? (
          <div className="p-6 text-center">
            <p className="text-gray-900 dark:text-white">
              We could not load the audit log.
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
        ) : logs.length === 0 ? (
          <p className="p-6 text-center text-gray-500 dark:text-slate-400">
            No audit events have been recorded.
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="p-6 text-center text-gray-500 dark:text-slate-400">
            No events match this filter.
          </p>
        ) : null}
      </div>
    </div>
  );
}
