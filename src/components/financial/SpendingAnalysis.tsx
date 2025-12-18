'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  PieChartComponent,
  LineChartComponent,
  BarChartComponent,
  AreaChartComponent,
  ChartContainer,
} from '@/components/charts';

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
  income?: number;
  cashFlow?: number;
}

interface CashFlowData {
  monthlyData: Array<{
    month: string;
    monthLabel: string;
    income: number;
    expenses: number;
    netFlow: number;
    savingsRate: number;
  }>;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalNetFlow: number;
    avgMonthlyIncome: number;
    avgMonthlyExpenses: number;
    avgSavingsRate: number;
  };
  trends: {
    income: 'increasing' | 'decreasing' | 'stable';
    expenses: 'increasing' | 'decreasing' | 'stable';
    netFlow: 'increasing' | 'decreasing' | 'stable';
  };
  health: {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    message: string;
  };
  recommendations: string[];
}

interface ForecastData {
  forecastId: string;
  generatedAt: string;
  forecastPeriod: {
    startDate: string;
    endDate: string;
    months: number;
  };
  predictions: Array<{
    month: string;
    monthLabel: string;
    predictedSpending: number;
    predictedIncome: number;
    predictedNetFlow: number;
    confidenceInterval: { low: number; high: number; confidence: number };
    trend: 'increasing' | 'decreasing' | 'stable';
    seasonalFactor: number;
  }>;
  categoryForecasts: Array<{
    category: string;
    displayName: string;
    currentMonthlyAvg: number;
    predictedMonthlyAvg: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentChange: number;
    confidenceInterval: { low: number; high: number; confidence: number };
  }>;
  accuracy: {
    overallScore: number;
    mape: number;
    rmse: number;
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
    historicalMonths: number;
  };
  insights: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    confidence: number;
    relatedCategory?: string;
    potentialSavings?: number;
  }>;
  recommendations: string[];
}

export default function SpendingAnalysis() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<SpendingData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'30' | '90' | '180' | '365'>('90');
  const [activeTab, setActiveTab] = useState<
    'spending' | 'cashflow' | 'forecast'
  >('spending');

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
      setError(
        err instanceof Error ? err.message : 'Failed to load spending data'
      );
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  const fetchCashFlowData = useCallback(async () => {
    if (!user) return;

    try {
      const months =
        dateRange === '30'
          ? 1
          : dateRange === '90'
            ? 3
            : dateRange === '180'
              ? 6
              : 12;
      const response = await fetch(
        `/api/financial/spending/cashflow?months=${months}`
      );

      if (!response.ok) {
        // Cash flow endpoint may not exist yet, silently fail
        return;
      }

      const result = await response.json();
      if (result.success) {
        setCashFlowData(result.data);
      }
    } catch {
      // Silently fail for cash flow - it's an enhancement
    }
  }, [user, dateRange]);

  const fetchForecastData = useCallback(async () => {
    if (!user) return;

    try {
      const months =
        dateRange === '30'
          ? 1
          : dateRange === '90'
            ? 3
            : dateRange === '180'
              ? 6
              : 12;
      const response = await fetch(
        `/api/financial/spending/forecast?months=${Math.min(months, 6)}&includeCategories=true`
      );

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      setForecastData(result);
    } catch {
      // Silently fail for forecast - it's an enhancement
    }
  }, [user, dateRange]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchSpendingData();
      void fetchCashFlowData();
      void fetchForecastData();
    }
  }, [
    dateRange,
    authLoading,
    user,
    fetchSpendingData,
    fetchCashFlowData,
    fetchForecastData,
  ]);

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
      Restaurants: '🍽️',
      Groceries: '🛒',
      Shopping: '🛍️',
      Transportation: '🚗',
      Travel: '✈️',
      Entertainment: '🎬',
      Bills: '📄',
      Healthcare: '🏥',
      Education: '📚',
      Personal: '👤',
      Transfer: '💸',
      Payment: '💳',
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

  // Prepare chart data
  const pieChartData =
    data?.byCategory.slice(0, 8).map((cat) => ({
      name: cat.category,
      value: cat.amount,
    })) || [];

  const lineChartData =
    data?.byMonth.map((m) => ({
      label: m.month,
      spending: m.amount,
    })) || [];

  const lineConfig = [
    { dataKey: 'spending', name: 'Spending', color: '#3B82F6', dot: true },
  ];

  const barChartData =
    data?.topMerchants.slice(0, 6).map((m) => ({
      label: m.name.length > 12 ? m.name.substring(0, 12) + '...' : m.name,
      value: m.amount,
    })) || [];

  // Cash flow chart data
  const cashFlowChartData =
    cashFlowData?.monthlyData.map((m) => ({
      label: m.monthLabel,
      income: m.income,
      expenses: m.expenses,
      netFlow: m.netFlow,
    })) || [];

  const cashFlowAreaConfig = [
    { dataKey: 'income', name: 'Income', color: '#10B981', fillOpacity: 0.3 },
    {
      dataKey: 'expenses',
      name: 'Expenses',
      color: '#EF4444',
      fillOpacity: 0.3,
    },
  ];

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    if (trend === 'increasing') return '📈';
    if (trend === 'decreasing') return '📉';
    return '➡️';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'good':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'fair':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'poor':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80" />
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Data
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void fetchSpendingData()}
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
      {/* Tab Selector and Date Range */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col gap-4">
          {/* Tab Buttons */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
            <button
              type="button"
              onClick={() => setActiveTab('spending')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'spending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              📊 Spending Analysis
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cashflow')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'cashflow'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              💰 Cash Flow
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('forecast')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'forecast'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🔮 Forecast
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Time Period
            </h3>
            <div className="flex flex-wrap gap-2">
              {(['30', '90', '180', '365'] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDateRange(days)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    dateRange === days
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {days === '30'
                    ? '30 Days'
                    : days === '90'
                      ? '3 Months'
                      : days === '180'
                        ? '6 Months'
                        : '1 Year'}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/api/financial/export?type=spending&format=csv&days=${dateRange}`;
                }}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 text-sm"
                title="Export to CSV"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Tab Content */}
      {activeTab === 'cashflow' && cashFlowData && (
        <>
          {/* Cash Flow Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold opacity-90">
                  Avg Monthly Income
                </h3>
                <span className="text-2xl">
                  {getTrendIcon(cashFlowData.trends.income)}
                </span>
              </div>
              <div className="text-3xl font-bold">
                {formatCurrency(cashFlowData.summary.avgMonthlyIncome)}
              </div>
              <div className="text-sm opacity-90 mt-1">
                Trend: {cashFlowData.trends.income}
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold opacity-90">
                  Avg Monthly Expenses
                </h3>
                <span className="text-2xl">
                  {getTrendIcon(cashFlowData.trends.expenses)}
                </span>
              </div>
              <div className="text-3xl font-bold">
                {formatCurrency(cashFlowData.summary.avgMonthlyExpenses)}
              </div>
              <div className="text-sm opacity-90 mt-1">
                Trend: {cashFlowData.trends.expenses}
              </div>
            </div>

            <div
              className={`bg-gradient-to-br ${cashFlowData.summary.totalNetFlow >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-orange-500 to-orange-600'} rounded-lg shadow p-6 text-white`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold opacity-90">
                  Net Cash Flow
                </h3>
                <span className="text-2xl">
                  {getTrendIcon(cashFlowData.trends.netFlow)}
                </span>
              </div>
              <div className="text-3xl font-bold">
                {formatCurrency(cashFlowData.summary.totalNetFlow)}
              </div>
              <div className="text-sm opacity-90 mt-1">Total for period</div>
            </div>

            <div
              className={`rounded-lg shadow p-6 ${getHealthColor(cashFlowData.health.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold opacity-90">
                  Savings Rate
                </h3>
                <span className="text-2xl">💎</span>
              </div>
              <div className="text-3xl font-bold">
                {cashFlowData.summary.avgSavingsRate.toFixed(1)}%
              </div>
              <div className="text-sm opacity-90 mt-1 capitalize">
                {cashFlowData.health.status}
              </div>
            </div>
          </div>

          {/* Cash Flow Chart */}
          <ChartContainer title="Income vs Expenses Over Time" height={350}>
            <AreaChartComponent
              data={cashFlowChartData}
              areas={cashFlowAreaConfig}
              currency
            />
          </ChartContainer>

          {/* Cash Flow Health & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>🏥</span>
                Cash Flow Health
              </h3>
              <div
                className={`p-4 rounded-lg ${getHealthColor(cashFlowData.health.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold capitalize">
                    {cashFlowData.health.status}
                  </span>
                  <span className="text-2xl font-bold">
                    {cashFlowData.health.score}/100
                  </span>
                </div>
                <p className="text-sm">{cashFlowData.health.message}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>💡</span>
                Recommendations
              </h3>
              <div className="space-y-3">
                {cashFlowData.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-lg p-3"
                  >
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Spending Tab Content */}
      {activeTab === 'spending' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold opacity-90">
                  Total Spending
                </h3>
                <span className="text-2xl">💸</span>
              </div>
              <div className="text-3xl font-bold">
                {formatCurrency(data.totalSpending)}
              </div>
              <div className="text-sm opacity-90 mt-1">
                Last {dateRange} days
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold opacity-90">Income</h3>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-3xl font-bold">
                {formatCurrency(data.income || 0)}
              </div>
              <div className="text-sm opacity-90 mt-1">
                Last {dateRange} days
              </div>
            </div>

            <div
              className={`bg-gradient-to-br ${(data.cashFlow || 0) >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-orange-500 to-orange-600'} rounded-lg shadow p-6 text-white`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold opacity-90">Cash Flow</h3>
                <span className="text-2xl">
                  {(data.cashFlow || 0) >= 0 ? '📈' : '📉'}
                </span>
              </div>
              <div className="text-3xl font-bold">
                {formatCurrency(data.cashFlow || 0)}
              </div>
              <div className="text-sm opacity-90 mt-1">
                {(data.cashFlow || 0) >= 0 ? 'Positive' : 'Negative'}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Transactions
                </h3>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {data.transactionCount}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Avg: {formatCurrency(data.averageTransaction)}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending by Category - Pie Chart */}
            <ChartContainer title="Spending by Category" height={350}>
              <PieChartComponent data={pieChartData} showLegend showLabels />
            </ChartContainer>

            {/* Monthly Trend - Line Chart */}
            <ChartContainer title="Monthly Spending Trend" height={350}>
              <LineChartComponent
                data={lineChartData}
                lines={lineConfig}
                currency
              />
            </ChartContainer>
          </div>

          {/* Category Breakdown List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Category Breakdown
            </h3>
            <div className="space-y-4">
              {data.byCategory.slice(0, 8).map((cat, index) => {
                const widthPercent = Math.min(100, Math.max(0, cat.percentage));
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {getCategoryIcon(cat.category)}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {cat.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(cat.amount)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {cat.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`${getCategoryColor(index)} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {cat.transactionCount} transactions
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Merchants - Bar Chart */}
          <ChartContainer title="Top Merchants" height={300}>
            <BarChartComponent data={barChartData} useCategyColors />
          </ChartContainer>

          {/* Top Merchants List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Top Merchants
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.topMerchants.slice(0, 6).map((merchant, index) => (
                <div
                  key={merchant.name}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      #{index + 1}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(merchant.amount)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {merchant.transactionCount} transactions
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white truncate">
                    {merchant.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>💡</span>
              Spending Insights
            </h3>
            <div className="space-y-3">
              {data.insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-lg p-4"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 flex-1">
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Forecast Tab Content */}
      {activeTab === 'forecast' && forecastData && (
        <>
          {/* Forecast Accuracy Banner */}
          <div
            className={`rounded-lg shadow p-4 ${
              forecastData.accuracy.dataQuality === 'excellent'
                ? 'bg-green-50 dark:bg-green-900/20'
                : forecastData.accuracy.dataQuality === 'good'
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : forecastData.accuracy.dataQuality === 'fair'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Forecast Accuracy: {forecastData.accuracy.overallScore}%
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Based on {forecastData.accuracy.historicalMonths} months of
                    data ({forecastData.accuracy.dataQuality} quality)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Forecast Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {forecastData.predictions.slice(0, 4).map((pred) => (
              <div
                key={pred.month}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {pred.monthLabel}
                  </h3>
                  <span className="text-lg">
                    {pred.trend === 'increasing'
                      ? '📈'
                      : pred.trend === 'decreasing'
                        ? '📉'
                        : '➡️'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatCurrency(pred.predictedSpending)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Range: {formatCurrency(pred.confidenceInterval.low)} -{' '}
                  {formatCurrency(pred.confidenceInterval.high)}
                </div>
                <div
                  className={`text-sm mt-2 ${
                    pred.predictedNetFlow >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  Net: {formatCurrency(pred.predictedNetFlow)}
                </div>
              </div>
            ))}
          </div>

          {/* Forecast Chart */}
          <ChartContainer title="Spending Forecast" height={350}>
            <AreaChartComponent
              data={forecastData.predictions.map((p) => ({
                label: p.monthLabel,
                predicted: p.predictedSpending,
                low: p.confidenceInterval.low,
                high: p.confidenceInterval.high,
              }))}
              areas={[
                {
                  dataKey: 'predicted',
                  name: 'Predicted',
                  color: '#3B82F6',
                  fillOpacity: 0.3,
                },
                {
                  dataKey: 'low',
                  name: 'Lower Bound',
                  color: '#93C5FD',
                  fillOpacity: 0.1,
                },
                {
                  dataKey: 'high',
                  name: 'Upper Bound',
                  color: '#93C5FD',
                  fillOpacity: 0.1,
                },
              ]}
              currency
            />
          </ChartContainer>

          {/* Category Forecasts */}
          {forecastData.categoryForecasts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                📊 Category Forecasts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {forecastData.categoryForecasts.slice(0, 6).map((cat) => (
                  <div
                    key={cat.category}
                    className="border dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {cat.displayName}
                      </span>
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          cat.trend === 'increasing'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : cat.trend === 'decreasing'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {cat.trend === 'increasing'
                          ? '↑'
                          : cat.trend === 'decreasing'
                            ? '↓'
                            : '→'}{' '}
                        {Math.abs(cat.percentChange).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Current: {formatCurrency(cat.currentMonthlyAvg)}/mo
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        Predicted: {formatCurrency(cat.predictedMonthlyAvg)}/mo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forecast Insights */}
          {forecastData.insights.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>🔮</span>
                Forecast Insights
              </h3>
              <div className="space-y-3">
                {forecastData.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`flex items-start gap-3 rounded-lg p-4 ${
                      insight.impact === 'positive'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : insight.impact === 'negative'
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-white dark:bg-gray-800'
                    }`}
                  >
                    <span className="text-xl">
                      {insight.impact === 'positive'
                        ? '✅'
                        : insight.impact === 'negative'
                          ? '⚠️'
                          : 'ℹ️'}
                    </span>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {insight.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {insight.description}
                      </p>
                      {insight.potentialSavings && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                          Potential savings:{' '}
                          {formatCurrency(insight.potentialSavings)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {forecastData.recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>💡</span>
                Recommendations
              </h3>
              <ul className="space-y-2">
                {forecastData.recommendations.map((rec, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-blue-500">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Forecast Tab - No Data State */}
      {activeTab === 'forecast' && !forecastData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-4xl mb-4">🔮</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Spending Forecast
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We need more transaction history to generate accurate spending
            forecasts. Keep tracking your spending and check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
