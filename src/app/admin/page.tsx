'use client';

import React, { useEffect, useState } from 'react';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalDisputes: number;
  resolvedDisputes: number;
  monthlyRevenue: number;
  userGrowth: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: '👥', color: 'blue' },
    { label: 'Active Subscriptions', value: stats?.activeSubscriptions || 0, icon: '💳', color: 'green' },
    { label: 'Total Disputes', value: stats?.totalDisputes || 0, icon: '📝', color: 'purple' },
    { label: 'Resolved Disputes', value: stats?.resolvedDisputes || 0, icon: '✅', color: 'emerald' },
    { label: 'Monthly Revenue', value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`, icon: '💰', color: 'yellow' },
    { label: 'User Growth', value: `${stats?.userGrowth || 0}%`, icon: '📈', color: 'cyan' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of CreditMaster Pro platform metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <span className="text-2xl">👤</span>
            <p className="text-sm font-medium mt-2">Add User</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <span className="text-2xl">📧</span>
            <p className="text-sm font-medium mt-2">Send Notification</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <span className="text-2xl">📊</span>
            <p className="text-sm font-medium mt-2">Export Report</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <span className="text-2xl">⚙️</span>
            <p className="text-sm font-medium mt-2">System Settings</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[
            { action: 'New user registered', time: '2 minutes ago', icon: '👤' },
            { action: 'Dispute resolved successfully', time: '15 minutes ago', icon: '✅' },
            { action: 'Premium subscription activated', time: '1 hour ago', icon: '💳' },
            { action: 'Credit report uploaded', time: '2 hours ago', icon: '📄' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 py-2 border-b border-gray-100 last:border-0">
              <span className="text-xl">{activity.icon}</span>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

