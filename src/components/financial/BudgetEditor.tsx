'use client';

/**
 * Budget Editor Component
 * 
 * Inline editing for budget amounts and categories.
 */

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

interface Budget {
  id: string;
  userId: string;
  period: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  categories: BudgetCategory[];
  totalBudgeted: number;
  totalSpent: number;
  startDate: string;
  endDate: string;
  aiGenerated: boolean;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

interface BudgetEditorProps {
  budget: Budget;
  onSave: (budget: Budget) => Promise<void>;
  onCancel: () => void;
}

export default function BudgetEditor({ budget, onSave, onCancel }: BudgetEditorProps) {
  const [editedBudget, setEditedBudget] = useState<Budget>(budget);
  const [saving, setSaving] = useState(false);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCategoryChange = (index: number, newAmount: number) => {
    const updatedCategories = [...editedBudget.categories];
    updatedCategories[index] = {
      ...updatedCategories[index],
      budgeted: newAmount,
      remaining: newAmount - updatedCategories[index].spent,
      percentUsed: (updatedCategories[index].spent / newAmount) * 100,
    };

    const totalBudgeted = updatedCategories.reduce((sum, cat) => sum + cat.budgeted, 0);

    setEditedBudget({
      ...editedBudget,
      categories: updatedCategories,
      totalBudgeted,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editedBudget);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Edit Budget</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Total Budget Summary */}
      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Budget</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(editedBudget.totalBudgeted)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Total Spent</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(editedBudget.totalSpent)}
            </div>
          </div>
        </div>
      </div>

      {/* Category Editors */}
      <div className="space-y-4">
        {editedBudget.categories.map((category, index) => (
          <div key={category.category} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <div className="font-medium text-gray-900 capitalize mb-1">
                  {category.category.replace(/_/g, ' ')}
                </div>
                <div className="text-sm text-gray-500">
                  {category.transactions} transactions • {formatCurrency(category.spent)} spent
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={category.budgeted}
                    onChange={(e) => handleCategoryChange(index, parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="10"
                  />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-2">Status</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        category.percentUsed >= 100 ? 'bg-red-500' :
                        category.percentUsed >= 90 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, category.percentUsed)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 min-w-[50px]">
                    {category.percentUsed.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

