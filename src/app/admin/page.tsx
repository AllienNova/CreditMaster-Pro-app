"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Metrics {
  totalUsers: number;
  newUsers: number;
  totalDisputes: number;
  successfulDisputes: number;
  disputeSuccessRate: string;
  activeSubscriptions: number;
  mrr: number;
  revenue: number;
}

interface Activity {
  type: string;
  message: string;
  time: string;
}

interface SystemService {
  name: string;
  status: "operational" | "degraded" | "down";
  uptime: string;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemService[]>([
    { name: "API Server", status: "operational", uptime: "99.99%" },
    { name: "Database", status: "operational", uptime: "99.95%" },
    { name: "Experian API", status: "operational", uptime: "99.8%" },
    { name: "Stripe", status: "operational", uptime: "100%" },
    { name: "Email Service", status: "operational", uptime: "99.9%" },
  ]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch metrics from admin API
        const metricsRes = await fetch('/api/admin/metrics?period=30d');
        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data.metrics);
        }

        // Fetch recent activity from logs API
        const logsRes = await fetch('/api/admin/logs?limit=5');
        if (logsRes.ok) {
          const data = await logsRes.json();
          setRecentActivity(data.logs?.map((log: any) => ({
            type: log.type || 'info',
            message: log.message || log.action,
            time: formatTimeAgo(new Date(log.created_at))
          })) || []);
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} sec ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  const stats = metrics ? [
    { label: "Total Users", value: metrics.totalUsers.toLocaleString(), change: `+${metrics.newUsers} new`, trend: "up" },
    { label: "Active Subscriptions", value: metrics.activeSubscriptions.toLocaleString(), change: "", trend: "up" },
    { label: "Monthly Revenue", value: formatCurrency(metrics.mrr), change: "", trend: "up" },
    { label: "Dispute Success Rate", value: metrics.disputeSuccessRate, change: `${metrics.successfulDisputes}/${metrics.totalDisputes}`, trend: "up" },
  ] : [];
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex gap-3">
          <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
            Export Report
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p className={`text-sm mt-2 ${stat.trend === "up" ? "text-emerald-500" : "text-red-500"}`}>
              {stat.change} from last month
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.map((activity, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <span className="text-xl">
                  {activity.type === "user" && "👤"}
                  {activity.type === "payment" && "💳"}
                  {activity.type === "dispute" && "📝"}
                  {activity.type === "alert" && "⚠️"}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200">
            <Link href="/admin/logs" className="text-sm text-emerald-500 hover:text-emerald-600">
              View all activity →
            </Link>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {systemStatus.map((service) => (
              <div key={service.name} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${service.status === "operational" ? "bg-emerald-500" : "bg-yellow-500"}`} />
                  <span className="text-sm text-gray-900">{service.name}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${service.status === "operational" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {service.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{service.uptime} uptime</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200">
            <Link href="/admin/health" className="text-sm text-emerald-500 hover:text-emerald-600">
              View system health →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/users" className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
            👥 Manage Users
          </Link>
          <Link href="/admin/disputes" className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition">
            📝 Review Disputes
          </Link>
          <Link href="/admin/features" className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition">
            🚩 Feature Flags
          </Link>
          <Link href="/admin/config" className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
            ⚙️ System Config
          </Link>
        </div>
      </div>
    </div>
  );
}

