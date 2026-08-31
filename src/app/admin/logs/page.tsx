"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * WHAT THIS REPLACED. `logs` was invented system output — "Failed to connect to
 * Equifax API: Connection timeout" seen 12 times, "Rate limit approaching for
 * Experian API (85%)" — with sources, levels and timestamps, shown to any
 * admin with no request made.
 *
 * THE ROUTE WAS ALREADY HONEST AND THE PAGE IGNORED IT. GET /api/admin/logs
 * returns `{ logs: [], total: 0, dataAvailable: false, message: "System logs
 * are not yet available. A system_logs table and writer are needed to populate
 * this view." }`. Somebody had already done the hard part — admitting the
 * capability does not exist — and the screen went on rendering a fiction over
 * the top of it.
 *
 * The page now calls that route and prints what it says. When `dataAvailable`
 * turns true it will render the real rows with no further change.
 */

interface SystemLogRow {
  id: string | number;
  level: string;
  message: string;
  source: string;
  timestamp: string;
  /**
   * Optional: the invented rows carried an occurrence count, and the real row
   * shape is not defined yet — /api/admin/logs returns an empty list until a
   * system_logs table exists. Typed optional rather than assumed present.
   */
  count?: number;
}

export default function AdminLogsPage() {
  const [levelFilter, setLevelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<SystemLogRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/logs");
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setLogs(Array.isArray(json.logs) ? json.logs : []);
      // The route tells us when the capability itself is missing. Show that
      // sentence rather than an empty table, which reads as "all quiet".
      setNotice(json.dataAvailable === false ? (json.message ?? null) : null);
    } catch {
      setFailed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLevelBadge = (level: string) => {
    const styles: Record<string, string> = {
      error: "bg-red-100 text-red-700",
      warning: "bg-yellow-100 text-yellow-700",
      info: "bg-blue-100 text-blue-700",
      debug: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200",
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full font-medium ${styles[level]}`}
      >
        {level.toUpperCase()}
      </span>
    );
  };

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warningCount = logs.filter((l) => l.level === "warning").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Error Logs
        </h1>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-300 transition">
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
          <p className="text-sm text-red-600">Errors in this view</p>
          <p className="text-3xl font-bold text-red-700">{errorCount}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-600">Warnings in this view</p>
          <p className="text-3xl font-bold text-yellow-700">{warningCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600">Entries in this view</p>
          <p className="text-3xl font-bold text-blue-700">{logs.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
          <input
            type="date"
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700 font-mono text-sm">
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"
              >
                <td className="px-6 py-4">{getLevelBadge(log.level)}</td>
                <td className="px-6 py-4 text-gray-900 dark:text-white max-w-md truncate">
                  {log.message}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                  {log.source}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                  {typeof log.count === "number" && log.count > 1 ? `×${log.count}` : "-"}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                  {log.timestamp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/*
          "Not built yet", "cannot read", "nothing logged" and "your filter
          matched nothing" are four different answers. An empty table reads as
          the third, and until a system_logs table exists the true answer is
          the first — which the route already says in words.
        */}
        {failed ? (
          <div className="p-6 text-center">
            <p className="text-gray-900 dark:text-white">
              We could not load the system logs.
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
        ) : notice ? (
          <p className="p-6 text-center text-gray-500 dark:text-slate-400">
            {notice}
          </p>
        ) : logs.length === 0 ? (
          <p className="p-6 text-center text-gray-500 dark:text-slate-400">
            No log entries have been recorded.
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="p-6 text-center text-gray-500 dark:text-slate-400">
            No entries match this filter.
          </p>
        ) : null}
      </div>
    </div>
  );
}
