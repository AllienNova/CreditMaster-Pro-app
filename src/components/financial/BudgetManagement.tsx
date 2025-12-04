'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';

interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date;
}

export default function BudgetManagement() {
  const { user, loading: authLoading } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBudget, setNewBudget] = useState({
    category: '',
    amount: '',
    period: 'monthly' as BudgetPeriod,
  });

  const fetchBudgets = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/financial/budgets`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch budgets');
      }
      
      const data = await response.json();
      setBudgets(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchBudgets();
    }
  }, [authLoading, user, fetchBudgets]);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // TODO: Replace with actual user ID from auth
      const userId = 'user_123';
      
      const response = await fetch('/api/financial/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          category: newBudget.category,
          amount: parseFloat(newBudget.amount),
          period: newBudget.period,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create budget');
      }
      
      await fetchBudgets();
      setShowCreateModal(false);
      setNewBudget({ category: '', amount: '', period: 'monthly' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create budget');
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPercentage = (spent: number, budget: number): number => {
    return Math.min((spent / budget) * 100, 100);
  };

  const getStatusColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = (percentage: number): string => {
    if (percentage >= 100) return 'Over Budget';
    if (percentage >= 80) return 'Warning';
    if (percentage >= 60) return 'On Track';
    return 'Good';
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      'Food and Drink': '🍔',
      'Groceries': '🛒',
      'Shopping': '🛍️',
      'Transportation': '🚗',
      'Entertainment': '🎬',
      'Bills': '📄',
      'Healthcare': '🏥',
      'Education': '📚',
      'Personal': '👤',
      'Other': '💰',
    };
    return icons[category] || '💰';
  };

  const categories = [
    'Food and Drink',
    'Groceries',
    'Shopping',
    'Transportation',
    'Entertainment',
    'Bills',
    'Healthcare',
    'Education',
    'Personal',
    'Other',
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Budgets</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchBudgets}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overBudgetCount = budgets.filter(b => b.spent >= b.amount).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Total Budget</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalBudget)}</div>
          <div className="text-sm text-gray-500 mt-1">{budgets.length} budgets</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Total Spent</h3>
            <span className="text-2xl">💸</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{formatCurrency(totalSpent)}</div>
          <div className="text-sm text-gray-500 mt-1">
            {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}%` : '0%'} of budget
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Remaining</h3>
            <span className="text-2xl">💵</span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(Math.max(0, totalBudget - totalSpent))}
          </div>
          <div className="text-sm text-gray-500 mt-1">Available to spend</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Over Budget</h3>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-3xl font-bold text-orange-600">{overBudgetCount}</div>
          <div className="text-sm text-gray-500 mt-1">Categories</div>
        </div>
      </div>

      {/* Create Budget Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          + Create Budget
        </button>
      </div>

      {/* Budgets List */}
      {budgets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="text-6xl mb-6">💰</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No Budgets Yet</h3>
            <p className="text-gray-600 mb-8">
              Create your first budget to start tracking your spending.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Create Your First Budget
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Your Budgets</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {budgets.map((budget) => {
              const percentage = getPercentage(budget.spent, budget.amount);
              const remaining = budget.amount - budget.spent;
              
              return (
                <div key={budget.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getCategoryIcon(budget.category)}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{budget.category}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="capitalize">{budget.period}</span>
                          <span>•</span>
                          <span>
                            {budget.startDate.toLocaleDateString()} - {budget.endDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                      </div>
                      <div className={`text-sm font-semibold ${
                        remaining >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-semibold ${
                        percentage >= 100 ? 'text-red-600' :
                        percentage >= 80 ? 'text-orange-600' :
                        percentage >= 60 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {getStatusText(percentage)}
                      </span>
                      <span className="text-gray-600">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className={`${getStatusColor(percentage)} h-4 rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Budget Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Budget</h2>
            
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Amount
                </label>
                <input
                  type="number"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period
                </label>
                <select
                  value={newBudget.period}
                  onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value as BudgetPeriod })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
