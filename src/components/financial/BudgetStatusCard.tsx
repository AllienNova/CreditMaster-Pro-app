'use client';

/**
 * Budget Status Card Component
 * 
 * Displays current month budget vs actual spending with progress bars and alerts.
 * Integrates with Phase 2.1 Smart Budget Engine.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface BudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: 'under_budget' | 'on_track' | 'near_limit' | 'over_budget';
}

interface BudgetStatusData {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
  categoriesOverBudget: number;
  categoriesNearLimit: number;
  topCategories: BudgetCategory[];
  daysRemaining: number;
}

export default function BudgetStatusCard() {
  const { user } = useAuth();
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBudgetStatus = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/financial/budgets/analyze?period=monthly');
      if (!response.ok) throw new Error('Failed to fetch budget status');
      
      const data = await response.json();
      setBudgetStatus(data.data);
    } catch (error) {
      console.error('Error fetching budget status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchBudgetStatus();
  }, [fetchBudgetStatus]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'under_budget': return 'bg-green-100 text-green-700';
      case 'on_track': return 'bg-blue-100 text-blue-700';
      case 'near_limit': return 'bg-yellow-100 text-yellow-700';
      case 'over_budget': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200';
    }
  };

  const getProgressColor = (percentUsed: number): string => {
    if (percentUsed >= 100) return 'bg-red-500';
    if (percentUsed >= 90) return 'bg-yellow-500';
    if (percentUsed >= 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!budgetStatus) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget Status</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3"></div>
          <p className="text-gray-600 dark:text-slate-300 mb-4">No budget set for this month</p>
          <Link
            href="/financial/smart-budget"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Smart Budget
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Status</h3>
        <span className="text-sm text-gray-500 dark:text-slate-400">{budgetStatus.daysRemaining} days left</span>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Overall Budget</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(budgetStatus.totalSpent)} / {formatCurrency(budgetStatus.totalBudgeted)}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(budgetStatus.percentUsed)}`}
            style={{ width: `${Math.min(100, budgetStatus.percentUsed)}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500 dark:text-slate-400">{budgetStatus.percentUsed.toFixed(1)}% used</span>
          <span className="text-xs font-medium text-gray-700 dark:text-slate-200">
            {formatCurrency(budgetStatus.totalRemaining)} remaining
          </span>
        </div>
      </div>

      {/* Alerts */}
      {(budgetStatus.categoriesOverBudget > 0 || budgetStatus.categoriesNearLimit > 0) && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-lg"></span>
            <div className="flex-1 text-sm">
              {budgetStatus.categoriesOverBudget > 0 && (
                <div className="text-red-700 font-medium">
                  {budgetStatus.categoriesOverBudget} {budgetStatus.categoriesOverBudget === 1 ? 'category' : 'categories'} over budget
                </div>
              )}
              {budgetStatus.categoriesNearLimit > 0 && (
                <div className="text-yellow-700">
                  {budgetStatus.categoriesNearLimit} {budgetStatus.categoriesNearLimit === 1 ? 'category' : 'categories'} near limit
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Categories */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">Top Categories</h4>
        {budgetStatus.topCategories.slice(0, 3).map((category) => (
          <div key={category.category} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200 capitalize">
                {category.category.replace(/_/g, ' ')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-slate-300">
                  {formatCurrency(category.spent)} / {formatCurrency(category.budgeted)}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(category.status)}`}>
                  {category.percentUsed.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(category.percentUsed)}`}
                style={{ width: `${Math.min(100, category.percentUsed)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
        <Link
          href="/financial/smart-budget"
          className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View All Categories →
        </Link>
      </div>
    </div>
  );
}

