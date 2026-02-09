"use client";

import { useState } from "react";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: "active" | "inactive" | "suspended";
  creditScore: number;
  disputes: number;
  joinedAt: string;
}

const mockUsers: User[] = [
  { id: "1", name: "John Doe", email: "john@example.com", plan: "Premium", status: "active", creditScore: 720, disputes: 5, joinedAt: "2024-01-15" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", plan: "Basic", status: "active", creditScore: 650, disputes: 3, joinedAt: "2024-02-20" },
  { id: "3", name: "Bob Wilson", email: "bob@example.com", plan: "Enterprise", status: "active", creditScore: 780, disputes: 12, joinedAt: "2023-11-10" },
  { id: "4", name: "Alice Brown", email: "alice@example.com", plan: "Premium", status: "inactive", creditScore: 590, disputes: 2, joinedAt: "2024-03-05" },
  { id: "5", name: "Charlie Davis", email: "charlie@example.com", plan: "Basic", status: "suspended", creditScore: 620, disputes: 0, joinedAt: "2024-04-12" },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesPlan = planFilter === "all" || user.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusBadge = (status: User["status"]) => {
    const styles = {
      active: "bg-emerald-100 text-emerald-700",
      inactive: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200",
      suspended: "bg-red-100 text-red-700",
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>{status}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
          + Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Credit Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Disputes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Joined</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{user.plan}</td>
                <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{user.creditScore}</td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{user.disputes}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{user.joinedAt}</td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/users/${user.id}`} className="text-emerald-500 hover:text-emerald-600 text-sm font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500 dark:text-slate-400">Showing {filteredUsers.length} of {mockUsers.length} users</p>
        <div className="flex gap-2">
          <button className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900">Previous</button>
          <button className="px-3 py-1 bg-emerald-500 text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900">2</button>
          <button className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900">Next</button>
        </div>
      </div>
    </div>
  );
}

