'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface CreditHistory {
  date: string;
  score: number;
}

interface DisputeStats {
  total: number;
  resolved: number;
  pending: number;
  successRate: number;
}

interface AnalyticsData {
  creditHistory: CreditHistory[];
  disputeStats: DisputeStats;
  scoreFactors: { factor: string; impact: number; status: 'positive' | 'negative' | 'neutral' }[];
  recommendations: string[];
}

export default function UserAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6m');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/user/analytics?range=${timeRange}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          // Use mock data if API not available
          setData({
            creditHistory: [
              { date: 'Jul', score: 620 },
              { date: 'Aug', score: 635 },
              { date: 'Sep', score: 648 },
              { date: 'Oct', score: 655 },
              { date: 'Nov', score: 668 },
              { date: 'Dec', score: 678 },
            ],
            disputeStats: { total: 12, resolved: 9, pending: 3, successRate: 75 },
            scoreFactors: [
              { factor: 'Payment History', impact: 35, status: 'positive' },
              { factor: 'Credit Utilization', impact: 30, status: 'negative' },
              { factor: 'Credit Age', impact: 15, status: 'neutral' },
              { factor: 'Credit Mix', impact: 10, status: 'positive' },
              { factor: 'New Credit', impact: 10, status: 'neutral' },
            ],
            recommendations: [
              'Pay down credit card balances to reduce utilization below 30%',
              'Continue making on-time payments to build positive history',
              'Consider a secured credit card to improve credit mix',
              'Avoid opening new credit accounts for the next 6 months',
            ],
          });
        }
      } catch {
        // Use mock data on error
        setData({
          creditHistory: [
            { date: 'Jul', score: 620 },
            { date: 'Aug', score: 635 },
            { date: 'Sep', score: 648 },
            { date: 'Oct', score: 655 },
            { date: 'Nov', score: 668 },
            { date: 'Dec', score: 678 },
          ],
          disputeStats: { total: 12, resolved: 9, pending: 3, successRate: 75 },
          scoreFactors: [
            { factor: 'Payment History', impact: 35, status: 'positive' },
            { factor: 'Credit Utilization', impact: 30, status: 'negative' },
            { factor: 'Credit Age', impact: 15, status: 'neutral' },
            { factor: 'Credit Mix', impact: 10, status: 'positive' },
            { factor: 'New Credit', impact: 10, status: 'neutral' },
          ],
          recommendations: [
            'Pay down credit card balances to reduce utilization below 30%',
            'Continue making on-time payments to build positive history',
            'Consider a secured credit card to improve credit mix',
            'Avoid opening new credit accounts for the next 6 months',
          ],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 p-8">
        <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="grid grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white">← Back</Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Credit Analytics</h1>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Score Progress */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Credit Score Progress</h2>
          <div className="h-48 flex items-end justify-between gap-2">
            {data?.creditHistory.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white mb-1">{item.score}</span>
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-600 rounded-t"
                  style={{ height: `${((item.score - 300) / 550) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-500 dark:text-slate-400 mt-2">{item.date}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <span className="text-3xl font-bold text-green-600">+{(data?.creditHistory[data.creditHistory.length - 1]?.score || 0) - (data?.creditHistory[0]?.score || 0)}</span>
            <span className="text-gray-600 dark:text-slate-300 ml-2">points gained</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dispute Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dispute Performance</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{data?.disputeStats.total}</p>
                <p className="text-sm text-gray-600 dark:text-slate-300">Total Disputes</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{data?.disputeStats.resolved}</p>
                <p className="text-sm text-gray-600 dark:text-slate-300">Resolved</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{data?.disputeStats.pending}</p>
                <p className="text-sm text-gray-600 dark:text-slate-300">Pending</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{data?.disputeStats.successRate}%</p>
                <p className="text-sm text-gray-600 dark:text-slate-300">Success Rate</p>
              </div>
            </div>
          </div>

          {/* Score Factors */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Score Factors</h2>
            <div className="space-y-3">
              {data?.scoreFactors.map((factor, i) => (
                <div key={i} className="flex items-center">
                  <span className="w-32 text-sm text-gray-600 dark:text-slate-300">{factor.factor}</span>
                  <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mx-3">
                    <div
                      className={`h-full rounded-full ${
                        factor.status === 'positive' ? 'bg-green-500' :
                        factor.status === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${factor.impact}%` }}
                    ></div>
                  </div>
                  <span className="w-10 text-right text-sm font-medium">{factor.impact}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI Recommendations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start p-4 bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg">
                <span className="text-blue-600 mr-3"></span>
                <p className="text-sm text-gray-700 dark:text-slate-200">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

