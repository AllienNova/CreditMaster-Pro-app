"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  subscriptions: { plan: string; status: string } | null;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (planFilter !== "all") params.set("plan", planFilter);

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${response.status})`);
      }
      const data: UsersResponse = await response.json();
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, planFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, planFilter]);

  const getStatusBadge = (status: string | null) => {
    const s = status ?? "unknown";
    const styles: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700",
      inactive:
        "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200",
      suspended: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${styles[s] || "bg-gray-100 text-gray-600"}`}
      >
        {s}
      </span>
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-red-500 mb-4">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-gray-900 dark:text-white font-medium mb-2">
          Failed to load users
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {error}
        </p>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          User Management
        </h1>
        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
          + Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-slate-900 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All Plans</option>
            <option value="Basic">Basic</option>
            <option value="Premium">Premium</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {loading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="animate-pulse flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
                          <div className="h-3 w-44 bg-gray-200 dark:bg-slate-700 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse h-4 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse h-5 w-16 bg-gray-200 dark:bg-slate-700 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse h-4 w-10 bg-gray-200 dark:bg-slate-700 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              : users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.full_name || "Unnamed user"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {user.email || "No email"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {user.subscriptions?.plan || "Free"}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-emerald-500 hover:text-emerald-600 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && users.length === 0 && (
          <div className="flex flex-col items-center py-12">
            <svg
              className="w-12 h-12 text-gray-300 dark:text-slate-600 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-gray-500 dark:text-slate-400 font-medium">
              No users found
            </p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {loading
            ? "Loading..."
            : `Showing ${users.length} of ${total} users (page ${page} of ${totalPages || 1})`}
        </p>
        <div className="flex gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
          >
            Previous
          </button>
          <span className="px-3 py-1 bg-emerald-500 text-white rounded text-sm">
            {page}
          </span>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
