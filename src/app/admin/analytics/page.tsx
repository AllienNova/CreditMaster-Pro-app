'use client';

import React, { useEffect, useState } from 'react';
import { ModelMonitoring } from '@/components/admin';

interface AnalyticsData {
  userGrowth: { date: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  disputesByStatus: { status: string; count: number }[];
  subscriptionsByTier: { tier: string; count: number }[];
  topFeatures: { feature: string; usage: number }[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/admin/analytics?range=${timeRange}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Platform performance and insights</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="h-48 flex items-end justify-between gap-2">
            {data?.userGrowth.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${(item.count / Math.max(...data.userGrowth.map(d => d.count))) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-1">{item.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <div className="h-48 flex items-end justify-between gap-2">
            {data?.revenueByMonth.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-green-500 rounded-t"
                  style={{ height: `${(item.revenue / Math.max(...data.revenueByMonth.map(d => d.revenue))) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-1">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disputes by Status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Disputes by Status</h3>
          <div className="space-y-3">
            {data?.disputesByStatus.map((item, i) => (
              <div key={i} className="flex items-center">
                <span className="w-24 text-sm text-gray-600 dark:text-slate-300 capitalize">{item.status.replace('_', ' ')}</span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(item.count / Math.max(...data.disputesByStatus.map(d => d.count))) * 100}%` }}
                  ></div>
                </div>
                <span className="w-12 text-right text-sm font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscriptions by Tier */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscriptions by Tier</h3>
          <div className="space-y-3">
            {data?.subscriptionsByTier.map((item, i) => {
              const colors = ['bg-gray-400', 'bg-blue-500', 'bg-blue-500', 'bg-yellow-500'];
              return (
                <div key={i} className="flex items-center">
                  <span className="w-24 text-sm text-gray-600 dark:text-slate-300 capitalize">{item.tier}</span>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[i % colors.length]} rounded-full`}
                      style={{ width: `${(item.count / Math.max(...data.subscriptionsByTier.map(d => d.count))) * 100}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-right text-sm font-medium">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Features */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Features by Usage</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {data?.topFeatures.map((item, i) => (
            <div key={i} className="text-center p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.usage.toLocaleString()}</p>
              <p className="text-sm text-gray-600 dark:text-slate-300">{item.feature}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Model Monitoring */}
      <ModelMonitoring />
    </div>
  );
}

