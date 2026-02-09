'use client';

/**
 * Smart Budget Management Component
 * 
 * Main component for AI-powered budget management with recommendations,
 * category breakdown, and inline editing.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import BudgetOverview from './BudgetOverview';
import CategoryBreakdown from './CategoryBreakdown';
import AIBudgetRecommendations from './AIBudgetRecommendations';
import BudgetEditor from './BudgetEditor';

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

interface BudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: 'under_budget' | 'on_track' | 'near_limit' | 'over_budget';
  transactions: number;
}

interface BudgetAnalysis {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
  categoriesOverBudget: number;
  categoriesNearLimit: number;
  topCategories: BudgetCategory[];
  daysRemaining: number;
  projectedSpending: number;
  projectedOverage: number;
}

export default function SmartBudgetManagement() {
  const { user } = useAuth();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');

  const fetchBudget = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch current budget
      const budgetResponse = await fetch(`/api/financial/budgets?activeOnly=true`);
      if (!budgetResponse.ok) throw new Error('Failed to fetch budget');
      const budgetData = await budgetResponse.json();
      
      if (budgetData.data && budgetData.data.length > 0) {
        setBudget(budgetData.data[0]);
      }

      // Fetch budget analysis
      const analysisResponse = await fetch(`/api/financial/budgets/analyze?period=${selectedPeriod}`);
      if (!analysisResponse.ok) throw new Error('Failed to fetch analysis');
      const analysisData = await analysisResponse.json();
      setAnalysis(analysisData.data);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget');
    } finally {
      setLoading(false);
    }
  }, [user, selectedPeriod]);

  useEffect(() => {
    void fetchBudget();
  }, [fetchBudget]);

  const handleBudgetUpdate = useCallback(async (updatedBudget: Budget) => {
    try {
      const response = await fetch(`/api/financial/budgets/${updatedBudget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBudget),
      });

      if (!response.ok) throw new Error('Failed to update budget');
      
      await fetchBudget();
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update budget');
    }
  }, [fetchBudget]);

  const handleApplyRecommendation = useCallback(async () => {
    try {
      const response = await fetch('/api/financial/budgets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: selectedPeriod,
          useAI: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate budget');
      
      await fetchBudget();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply recommendation');
    }
  }, [selectedPeriod, fetchBudget]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6" data-testid="budget-error">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Budget</h3>
          <p className="text-gray-600 dark:text-slate-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchBudget}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="smart-budget-page">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Budget</h1>
          <p className="text-gray-600 dark:text-slate-300 mt-1">AI-powered budget management and recommendations</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            data-testid="budget-period-select"
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <button
            onClick={() => setEditMode(!editMode)}
            data-testid="edit-budget-button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {editMode ? 'Cancel Edit' : 'Edit Budget'}
          </button>
        </div>
      </div>

      {/* Budget Overview */}
      {analysis && <BudgetOverview analysis={analysis} period={selectedPeriod} />}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-2">
          {editMode && budget ? (
            <BudgetEditor budget={budget} onSave={handleBudgetUpdate} onCancel={() => setEditMode(false)} />
          ) : (
            analysis && <CategoryBreakdown categories={analysis.topCategories} totalBudgeted={analysis.totalBudgeted} />
          )}
        </div>

        {/* AI Recommendations */}
        <div>
          <AIBudgetRecommendations onApply={handleApplyRecommendation} period={selectedPeriod} />
        </div>
      </div>
    </div>
  );
}
