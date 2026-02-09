'use client';

import { useState, useEffect, useCallback } from 'react';
import { FinancialDashboard as DashboardData } from '@/lib/financial/financial-service';
import Link from 'next/link';
import PlaidLinkButton from './PlaidLinkButton';
import { useAuth } from '@/hooks/useAuth';
import AIInsightsPanel from './AIInsightsPanel';
import HealthScoreCard from './HealthScoreCard';
import BudgetStatusCard from './BudgetStatusCard';
import AccountsSummaryCard from './AccountsSummaryCard';
import QuickActionsBar from './QuickActionsBar';

export default function FinancialDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/financial/dashboard`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard');
      }
      
      const data = await response.json();
      setDashboard(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchDashboard();
    }
  }, [authLoading, user, fetchDashboard]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 dark:text-slate-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchDashboard}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  // Check if user has any accounts
  if (dashboard.accounts.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-6"></div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Connect Your Bank Account</h3>
          <p className="text-gray-600 dark:text-slate-300 mb-8">
            Link your bank accounts to start tracking your finances, managing budgets, and achieving your financial goals.
          </p>
          <PlaidLinkButton onSuccess={fetchDashboard} />
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-4">
            Your data is encrypted and secure. We use bank-level security.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Dashboard</h1>
          <p className="text-gray-600 dark:text-slate-300 mt-1">Your complete financial overview powered by AI</p>
        </div>
        <PlaidLinkButton onSuccess={fetchDashboard} variant="primary" />
      </div>

      {/* Top Row: Health Score + Budget Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthScoreCard />
        <BudgetStatusCard />
      </div>

      {/* Quick Actions Bar */}
      <QuickActionsBar />

      {/* AI Insights Panel */}
      <AIInsightsPanel />

      {/* Accounts Summary */}
      <AccountsSummaryCard />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net Worth */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Net Worth</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold mb-1">{formatCurrency(dashboard.netWorth)}</div>
          <div className="text-sm opacity-75">
            Assets: {formatCurrency(dashboard.totalAssets)}
          </div>
          <div className="text-sm opacity-75">
            Liabilities: {formatCurrency(dashboard.totalLiabilities)}
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Monthly Income</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(dashboard.monthlyIncome)}
          </div>
          <div className="text-sm text-green-600">
            Last 30 days
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Monthly Expenses</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(dashboard.monthlyExpenses)}
          </div>
          <div className="text-sm text-gray-600 dark:text-slate-300">
            Last 30 days
          </div>
        </div>

        {/* Cash Flow */}
        <div className={`rounded-lg shadow p-6 ${
          dashboard.cashFlow >= 0 ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Cash Flow</h3>
            <span className="text-2xl">{dashboard.cashFlow >= 0 ? '' : ''}</span>
          </div>
          <div className={`text-3xl font-bold mb-1 ${
            dashboard.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(dashboard.cashFlow)}
          </div>
          <div className="text-sm text-gray-600 dark:text-slate-300">
            Savings Rate: {formatPercentage(dashboard.savingsRate)}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Spending by Category</h3>
            <Link
              href="/financial/spending"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View Details →
            </Link>
          </div>
          {dashboard.spendingByCategory.length > 0 ? (
            <div className="space-y-3">
              {dashboard.spendingByCategory.slice(0, 5).map((category, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-200">{category.category}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(category.amount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {category.percentage.toFixed(1)}% • {category.transactionCount} transactions
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-slate-400">
              No spending data available
            </div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Trend</h3>
            <Link
              href="/financial/cash-flow"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View Details →
            </Link>
          </div>
          {dashboard.monthlyTrend.length > 0 ? (
            <div className="space-y-3">
              {dashboard.monthlyTrend.slice(-6).map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200 w-20">{month.month}</span>
                  <div className="flex-1 mx-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min((month.income / Math.max(...dashboard.monthlyTrend.map(m => m.income))) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min((month.expenses / Math.max(...dashboard.monthlyTrend.map(m => m.expenses))) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${month.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(month.savings)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-center gap-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600 dark:text-slate-300">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-gray-600 dark:text-slate-300">Expenses</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-slate-400">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Accounts & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Accounts</h3>
            <Link
              href="/financial/accounts"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard.accounts.slice(0, 5).map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    {account.institutionName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{account.accountName}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">••••{account.mask}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(account.currentBalance)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{account.accountType}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
            <Link
              href="/financial/transactions"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard.recentTransactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 rounded-lg transition-colors">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{txn.name}</div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    {txn.date.toLocaleDateString()} • {txn.category[0] || 'Uncategorized'}
                  </div>
                </div>
                <div className={`font-semibold ${txn.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {txn.amount > 0 ? '-' : '+'}{formatCurrency(Math.abs(txn.amount))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
