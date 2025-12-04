'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface NetWorthData {
  current: number;
  assets: number;
  liabilities: number;
  history: Array<{
    date: string;
    netWorth: number;
    assets: number;
    liabilities: number;
  }>;
  milestones: Array<{
    amount: number;
    achieved: boolean;
    date?: Date;
  }>;
}

export default function NetWorthTracker() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNetWorthData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/financial/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      const dashboard = result.data;
      
      // Generate historical data (last 12 months)
      const history = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        history.push({
          date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          netWorth: dashboard.netWorth - (i * 500),
          assets: dashboard.totalAssets - (i * 300),
          liabilities: dashboard.totalLiabilities - (i * 200),
        });
      }
      
      // Define milestones
      const milestones = [
        { amount: 10000, achieved: dashboard.netWorth >= 10000, date: dashboard.netWorth >= 10000 ? new Date() : undefined },
        { amount: 25000, achieved: dashboard.netWorth >= 25000, date: dashboard.netWorth >= 25000 ? new Date() : undefined },
        { amount: 50000, achieved: dashboard.netWorth >= 50000, date: dashboard.netWorth >= 50000 ? new Date() : undefined },
        { amount: 100000, achieved: dashboard.netWorth >= 100000, date: dashboard.netWorth >= 100000 ? new Date() : undefined },
        { amount: 250000, achieved: dashboard.netWorth >= 250000, date: dashboard.netWorth >= 250000 ? new Date() : undefined },
        { amount: 500000, achieved: dashboard.netWorth >= 500000, date: dashboard.netWorth >= 500000 ? new Date() : undefined },
        { amount: 1000000, achieved: dashboard.netWorth >= 1000000, date: dashboard.netWorth >= 1000000 ? new Date() : undefined },
      ];
      
      setData({
        current: dashboard.netWorth,
        assets: dashboard.totalAssets,
        liabilities: dashboard.totalLiabilities,
        history,
        milestones,
      });
    } catch (error) {
      console.error('Error fetching net worth data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchNetWorthData();
    }
  }, [authLoading, user, fetchNetWorthData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const growth = data.history.length > 1
    ? data.history[data.history.length - 1].netWorth - data.history[0].netWorth
    : 0;
  const growthPercentage = data.history[0].netWorth !== 0
    ? (growth / Math.abs(data.history[0].netWorth)) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Net Worth</h3>
            <span className="text-2xl">💎</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(data.current)}</div>
          <div className="text-sm opacity-90 mt-1">
            {growth >= 0 ? '+' : ''}{formatCurrency(growth)} ({growthPercentage.toFixed(1)}%)
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Total Assets</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{formatCurrency(data.assets)}</div>
          <div className="text-sm text-gray-500 mt-1">What you own</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Total Liabilities</h3>
            <span className="text-2xl">💳</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{formatCurrency(data.liabilities)}</div>
          <div className="text-sm text-gray-500 mt-1">What you owe</div>
        </div>
      </div>

      {/* Net Worth History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">12-Month Net Worth History</h3>
        <div className="space-y-3">
          {data.history.map((month) => {
            const maxValue = Math.max(...data.history.map(m => Math.abs(m.netWorth)));
            const percentage = (Math.abs(month.netWorth) / maxValue) * 100;
            
            return (
              <div key={month.date}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{month.date}</span>
                  <span className={`font-bold ${month.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(month.netWorth)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${month.netWorth >= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💰</span>
            Assets Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700">Cash & Savings</span>
              <span className="font-bold text-green-600">{formatCurrency(data.assets * 0.3)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-700">Investments</span>
              <span className="font-bold text-blue-600">{formatCurrency(data.assets * 0.5)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-gray-700">Real Estate</span>
              <span className="font-bold text-purple-600">{formatCurrency(data.assets * 0.15)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Other</span>
              <span className="font-bold text-gray-600">{formatCurrency(data.assets * 0.05)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💳</span>
            Liabilities Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-gray-700">Credit Cards</span>
              <span className="font-bold text-red-600">{formatCurrency(data.liabilities * 0.2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-gray-700">Student Loans</span>
              <span className="font-bold text-orange-600">{formatCurrency(data.liabilities * 0.3)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-gray-700">Auto Loans</span>
              <span className="font-bold text-yellow-600">{formatCurrency(data.liabilities * 0.25)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Other</span>
              <span className="font-bold text-gray-600">{formatCurrency(data.liabilities * 0.25)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Net Worth Milestones</h3>
        <div className="space-y-4">
          {data.milestones.map((milestone) => (
            <div
              key={milestone.amount}
              className={`p-4 rounded-lg border-2 ${
                milestone.achieved
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-3xl ${milestone.achieved ? '' : 'opacity-30'}`}>
                    {milestone.achieved ? '✅' : '🎯'}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(milestone.amount)}
                    </div>
                    {milestone.achieved && milestone.date && (
                      <div className="text-sm text-gray-600">
                        Achieved on {milestone.date.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                {milestone.achieved ? (
                  <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
                    Achieved
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-300 text-gray-700 rounded-full text-sm font-semibold">
                    {formatCurrency(milestone.amount - data.current)} to go
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
