'use client';

/**
 * Budget Management Component
 *
 * Comprehensive budget management with CRUD operations, progress tracking,
 * and visual analytics using charts.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Modal, ConfirmDialog, useToast } from '@/components/ui';
import {
  DonutChartComponent,
  BarChartComponent,
  ChartContainer,
} from '@/components/charts';
import AIBudgetOptimizer from './AIBudgetOptimizer';

// Types
interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  alertThreshold: number;
  isActive: boolean;
  rolloverEnabled: boolean;
  rolloverAmount: number;
}

interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  budgetCount: number;
  overBudgetCount: number;
  nearLimitCount: number;
}

interface BudgetFormData {
  name: string;
  category: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  alertThreshold: number;
  rolloverEnabled: boolean;
}

const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Personal Care',
  'Education',
  'Travel',
  'Subscriptions',
  'Groceries',
  'Other',
];

const initialFormData: BudgetFormData = {
  name: '',
  category: 'Food & Dining',
  amount: 0,
  period: 'monthly',
  alertThreshold: 80,
  rolloverEnabled: false,
};

export default function BudgetManagement() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  // State
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch budgets
  const fetchBudgets = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/financial/budgets');

      if (!response.ok) {
        throw new Error('Failed to fetch budgets');
      }

      const result = await response.json();
      setBudgets(result.data.budgets || []);
      setSummary(result.data.summary || null);
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

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate progress percentage
  const getProgressPercentage = (spent: number, amount: number): number => {
    return Math.min(Math.round((spent / amount) * 100), 100);
  };

  // Get progress color based on percentage
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      name: budget.name,
      category: budget.category,
      amount: budget.amount,
      period: budget.period,
      alertThreshold: budget.alertThreshold,
      rolloverEnabled: budget.rolloverEnabled,
    });
    setIsEditModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsDeleteDialogOpen(true);
  };

  // Create budget
  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/financial/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create budget');
      }

      toast.success('Budget created successfully');
      setIsCreateModalOpen(false);
      void fetchBudgets();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create budget'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update budget
  const handleUpdate = async () => {
    if (!selectedBudget) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `/api/financial/budgets/${selectedBudget.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update budget');
      }

      toast.success('Budget updated successfully');
      setIsEditModalOpen(false);
      void fetchBudgets();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update budget'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete budget
  const handleDelete = async () => {
    if (!selectedBudget) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `/api/financial/budgets/${selectedBudget.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete budget');
      }

      toast.success('Budget deleted successfully');
      setIsDeleteDialogOpen(false);
      void fetchBudgets();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete budget'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prepare chart data
  const chartData = budgets.map((b) => ({
    name: b.name,
    value: b.spent,
    color: undefined,
  }));

  const barChartData = budgets.map((b) => ({
    label: b.name.length > 10 ? b.name.substring(0, 10) + '...' : b.name,
    value: b.amount,
    budgeted: b.amount,
    spent: b.spent,
  }));

  // Loading state
  if (authLoading || loading) {
    return <BudgetLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => void fetchBudgets()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
        <p className="text-yellow-600 dark:text-yellow-400">
          Please sign in to manage your budgets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Budget Optimizer - NEW */}
      <AIBudgetOptimizer />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Budgeted"
            value={formatCurrency(summary.totalBudgeted)}
            icon=""
            color="blue"
          />
          <SummaryCard
            title="Total Spent"
            value={formatCurrency(summary.totalSpent)}
            icon=""
            color="green"
          />
          <SummaryCard
            title="Remaining"
            value={formatCurrency(summary.totalRemaining)}
            icon=""
            color={summary.totalRemaining >= 0 ? 'emerald' : 'red'}
          />
          <SummaryCard
            title="Over Budget"
            value={`${summary.overBudgetCount} of ${summary.budgetCount}`}
            icon=""
            color={summary.overBudgetCount > 0 ? 'red' : 'gray'}
          />
        </div>
      )}

      {/* Charts Section */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Spending by Budget" height={300}>
            <DonutChartComponent
              data={chartData}
              height={250}
              currency
              centerLabel="Total Spent"
              showLegend={false}
            />
          </ChartContainer>
          <ChartContainer title="Budget vs Actual" height={300}>
            <BarChartComponent
              data={barChartData}
              bars={[
                { dataKey: 'budgeted', name: 'Budgeted', color: '#3B82F6' },
                { dataKey: 'spent', name: 'Spent', color: '#10B981' },
              ]}
              height={250}
              currency
              showLegend
            />
          </ChartContainer>
        </div>
      )}

      {/* Budget List Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Budgets
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                window.location.href =
                  '/api/financial/export?type=budgets&format=csv';
              }}
              className="px-3 py-2 bg-gray-100 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center gap-2 text-sm"
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
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Budget
            </button>
          </div>
        </div>

        {budgets.length === 0 ? (
          <EmptyBudgetState onCreateClick={openCreateModal} />
        ) : (
          <BudgetList
            budgets={budgets}
            onEdit={openEditModal}
            onDelete={openDeleteDialog}
            formatCurrency={formatCurrency}
            getProgressPercentage={getProgressPercentage}
            getProgressColor={getProgressColor}
          />
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Budget"
        size="md"
      >
        <BudgetForm
          formData={formData}
          onInputChange={handleInputChange}
          onCheckboxChange={handleCheckboxChange}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          isSubmitting={isSubmitting}
          submitLabel="Create Budget"
        />
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Budget"
        size="md"
      >
        <BudgetForm
          formData={formData}
          onInputChange={handleInputChange}
          onCheckboxChange={handleCheckboxChange}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditModalOpen(false)}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
        />
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Budget"
        message={`Are you sure you want to delete "${selectedBudget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}

// Helper Components
function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green:
      'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    emerald:
      'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    gray: 'bg-gray-50 dark:bg-slate-900/20 border-gray-200 dark:border-slate-700',
  };

  return (
    <div
      className={`rounded-lg border p-4 ${colorClasses[color] || colorClasses.gray}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400">{title}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyBudgetState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="p-8 text-center">
      <p className="text-gray-500 dark:text-slate-400 mb-4">
        No budgets yet. Create your first budget to start tracking your
        spending.
      </p>
      <button
        onClick={onCreateClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Create Your First Budget
      </button>
    </div>
  );
}

function BudgetLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-slate-700 rounded-lg h-24"
          />
        ))}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-slate-700 rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface BudgetListProps {
  budgets: Budget[];
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
  formatCurrency: (amount: number) => string;
  getProgressPercentage: (spent: number, amount: number) => number;
  getProgressColor: (percentage: number) => string;
}

function BudgetList({
  budgets,
  onEdit,
  onDelete,
  formatCurrency,
  getProgressPercentage,
  getProgressColor,
}: BudgetListProps) {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {budgets.map((budget) => {
        // Calculate effective budget (base + rollover)
        const effectiveBudget = budget.rolloverEnabled
          ? budget.amount + budget.rolloverAmount
          : budget.amount;
        const percentage = getProgressPercentage(budget.spent, effectiveBudget);
        const progressColor = getProgressColor(percentage);
        const remaining = effectiveBudget - budget.spent;

        return (
          <div
            key={budget.id}
            className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  {budget.name}
                  {budget.rolloverEnabled && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      Rollover
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {budget.category} • {budget.period}
                  {budget.rolloverEnabled && budget.rolloverAmount > 0 && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      (+{formatCurrency(budget.rolloverAmount)} rollover)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(budget)}
                  className="p-2 text-gray-400 dark:text-slate-500 hover:text-blue-600"
                  aria-label="Edit"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(budget)}
                  className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600"
                  aria-label="Delete"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mb-2">
              <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${progressColor} transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">
                {formatCurrency(budget.spent)} of{' '}
                {formatCurrency(effectiveBudget)}
                {budget.rolloverEnabled && budget.rolloverAmount > 0 && (
                  <span className="text-xs ml-1">
                    ({formatCurrency(budget.amount)} +{' '}
                    {formatCurrency(budget.rolloverAmount)})
                  </span>
                )}
              </span>
              <span
                className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}
              >
                {remaining >= 0
                  ? `${formatCurrency(remaining)} left`
                  : `${formatCurrency(Math.abs(remaining))} over`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface BudgetFormProps {
  formData: BudgetFormData;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}

function BudgetForm({
  formData,
  onInputChange,
  onCheckboxChange,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: BudgetFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          Budget Name
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={onInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Monthly Groceries"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          Category
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={onInputChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Amount
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={onInputChange}
            min="0"
            step="0.01"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Period
          </label>
          <select
            name="period"
            value={formData.period}
            onChange={onInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          Alert Threshold (%)
        </label>
        <input
          type="number"
          name="alertThreshold"
          value={formData.alertThreshold}
          onChange={onInputChange}
          min="0"
          max="100"
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="rolloverEnabled"
          checked={formData.rolloverEnabled}
          onChange={onCheckboxChange}
          id="rolloverEnabled"
          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
        />
        <label
          htmlFor="rolloverEnabled"
          className="text-sm text-gray-700 dark:text-slate-300"
        >
          Enable budget rollover
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
