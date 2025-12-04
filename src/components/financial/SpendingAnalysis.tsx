'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

interface MonthlySpending {
  month: string;
  amount: number;
}

interface TopMerchant {
  name: string;
  amount: number;
  transactionCount: number;
}

interface SpendingData {
  totalSpending: number;
  averageDaily: number;
  averageTransaction: number;
  transactionCount: number;
  byCategory: CategorySpending[];
  byMonth: MonthlySpending[];
  topMerchants: TopMerchant[];
  insights: string[];
}

export default function SpendingAnalysis() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<SpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'30' | '90' | '180' | '365'>('90');

const fetchSpendingData = useCallback(async () => {
  if (!user) return;

  try {
      setLoading(true);

      const response = await fetch(`/api/financial/spending?days=${dateRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch spending data');
      }
      
      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spending data');
  } finally {
    setLoading(false);
  }
}, [user, dateRange]);

useEffect(() => {
  if (!authLoading && user) {
    void fetchSpendingData();
  }
}, [dateRange, authLoading, user, fetchSpendingData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      'Food and Drink': '🍔',
      'Restaurants': '🍽️',
      'Groceries': '🛒',
      'Shopping': '🛍️',
      'Transportation': '🚗',
      'Travel': '✈️',
      'Entertainment': '🎬',
      'Bills': '📄',
      'Healthcare': '🏥',
      'Education': '📚',
      'Personal': '👤',
      'Transfer': '💸',
      'Payment': '💳',
    };
    return icons[category] || '💰';
  };

  const getCategoryColor = (index: number): string => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-cyan-500',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchSpendingData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Time Period</h3>
          <div className="flex gap-2">
            {(['30', '90', '180', '365'] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setDateRange(days)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  dateRange === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {days === '30' ? '30 Days' : days === '90' ? '3 Months' : days === '180' ? '6 Months' : '1 Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Total Spending</h3>
            <span className="text-2xl">💸</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(data.totalSpending)}</div>
          <div className="text-sm opacity-90 mt-1">Last {dateRange} days</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Average Daily</h3>
            <span className="text-2xl">📅</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(data.averageDaily)}</div>
          <div className="text-sm text-gray-500 mt-1">Per day</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Avg Transaction</h3>
            <span className="text-2xl">💳</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(data.averageTransaction)}</div>
          <div className="text-sm text-gray-500 mt-1">Per transaction</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Transactions</h3>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{data.transactionCount}</div>
          <div className="text-sm text-gray-500 mt-1">Total count</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Spending by Category</h3>
          <div className="space-y-4">
            {data.byCategory.slice(0, 8).map((cat, index) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getCategoryIcon(cat.category)}</span>
                    <span className="font-semibold text-gray-900">{cat.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{formatCurrency(cat.amount)}</div>
                    <div className="text-sm text-gray-500">{cat.percentage.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${getCategoryColor(index)} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${cat.percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {cat.transactionCount} transactions
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Monthly Spending Trend</h3>
          <div className="space-y-3">
            {data.byMonth.map(month => {
              const maxAmount = Math.max(...data.byMonth.map(m => m.amount));
              const percentage = (month.amount / maxAmount) * 100;
              
              return (
                <div key={month.month}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{month.month}</span>
                    <span className="font-bold text-gray-900">{formatCurrency(month.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Merchants */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Top Merchants</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.topMerchants.slice(0, 6).map((merchant, index) => (
            <div key={merchant.name} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  #{index + 1}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">{formatCurrency(merchant.amount)}</div>
                  <div className="text-xs text-gray-500">{merchant.transactionCount} transactions</div>
                </div>
              </div>
              <div className="font-semibold text-gray-900 truncate">{merchant.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>💡</span>
          Spending Insights
        </h3>
        <div className="space-y-3">
          {data.insights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {index + 1}
              </div>
              <p className="text-gray-700 flex-1">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
