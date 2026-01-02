'use client';

/**
 * Category Breakdown Component
 * 
 * Displays spending by category with visual charts and progress bars.
 */

import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { useState } from 'react';

interface BudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: 'under_budget' | 'on_track' | 'near_limit' | 'over_budget';
  transactions: number;
}

interface CategoryBreakdownProps {
  categories: BudgetCategory[];
  totalBudgeted: number;
}

export default function CategoryBreakdown({ categories, totalBudgeted }: CategoryBreakdownProps) {
  const [viewMode, setViewMode] = useState<'list' | 'pie' | 'bar'>('list');

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
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProgressColor = (percentUsed: number): string => {
    if (percentUsed >= 100) return 'bg-red-500';
    if (percentUsed >= 90) return 'bg-yellow-500';
    if (percentUsed >= 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Prepare data for charts
  const pieChartData = categories.map(cat => ({
    name: cat.category.replace(/_/g, ' '),
    value: cat.spent,
    color: cat.percentUsed >= 100 ? '#ef4444' : cat.percentUsed >= 90 ? '#f59e0b' : '#3b82f6',
  }));

  const barChartData = categories.map(cat => ({
    label: cat.category.replace(/_/g, ' ').substring(0, 10),
    value: cat.spent,
    budgeted: cat.budgeted,
    spent: cat.spent,
  }));

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('pie')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'pie' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pie
          </button>
          <button
            onClick={() => setViewMode('bar')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bar
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {category.category.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(category.status)}`}>
                    {category.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(category.spent)} / {formatCurrency(category.budgeted)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {category.transactions} transactions
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(category.percentUsed)}`}
                  style={{ width: `${Math.min(100, category.percentUsed)}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{category.percentUsed.toFixed(1)}% used</span>
                <span className={category.remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {category.remaining >= 0 ? formatCurrency(category.remaining) : formatCurrency(Math.abs(category.remaining))} {category.remaining >= 0 ? 'remaining' : 'over'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'pie' && (
        <div className="h-96">
          <PieChart data={pieChartData} />
        </div>
      )}

      {viewMode === 'bar' && (
        <div className="h-96">
          <BarChart data={barChartData} />
        </div>
      )}
    </div>
  );
}

