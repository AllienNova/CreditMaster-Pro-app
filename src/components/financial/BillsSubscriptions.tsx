'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Modal, ConfirmDialog } from '@/components/ui';
import {
  PieChartComponent,
  LineChartComponent,
  ChartContainer,
} from '@/components/charts';
import type {
  Bill,
  BillSummary,
  DetectedBill,
  BillCategory,
  BillFrequency,
} from '@/lib/financial/types/bill.types';
import AIBillsOptimizer from './AIBillsOptimizer';

// Extended Bill interface for UI display
interface BillWithStatus extends Bill {
  displayStatus: 'upcoming' | 'paid' | 'overdue';
  daysUntilDue: number;
}

// Form state interface
interface BillFormData {
  merchantName: string;
  category: BillCategory;
  amount: string;
  frequency: BillFrequency;
  nextDueDate: string;
  isAutoPay: boolean;
  notes: string;
}

const initialFormData: BillFormData = {
  merchantName: '',
  category: 'subscription',
  amount: '',
  frequency: 'monthly',
  nextDueDate: '',
  isAutoPay: false,
  notes: '',
};

export default function BillsSubscriptions() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [detectedBills, setDetectedBills] = useState<DetectedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    'all' | 'upcoming' | 'overdue' | 'subscriptions'
  >('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetectModal, setShowDetectModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [formData, setFormData] = useState<BillFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Fetch bills from API
  const fetchBills = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/financial/bills', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch bills');
      const data = await response.json();
      setBills(data.bills || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch bill summary
  const fetchSummary = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/financial/bills/summary', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  }, [user]);

  // Detect bills from transactions
  const detectBills = async () => {
    if (!user) return;
    try {
      setIsDetecting(true);
      const response = await fetch('/api/financial/bills/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ minOccurrences: 2, confidenceThreshold: 70 }),
      });
      if (!response.ok) throw new Error('Failed to detect bills');
      const data = await response.json();
      setDetectedBills(data.detectedBills || []);
      setShowDetectModal(true);
      toast.success(`Found ${data.detectedBills?.length || 0} potential bills`);
    } catch (err) {
      toast.error('Failed to detect bills');
    } finally {
      setIsDetecting(false);
    }
  };

  // Create bill
  const handleCreateBill = async () => {
    if (!formData.merchantName || !formData.amount || !formData.nextDueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/financial/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          merchantName: formData.merchantName,
          category: formData.category,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          nextDueDate: new Date(formData.nextDueDate).toISOString(),
          isAutoPay: formData.isAutoPay,
          notes: formData.notes || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to create bill');
      toast.success('Bill created successfully');
      setShowAddModal(false);
      setFormData(initialFormData);
      void fetchBills();
      void fetchSummary();
    } catch (err) {
      toast.error('Failed to create bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update bill
  const handleUpdateBill = async () => {
    if (!selectedBill) return;
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/financial/bills/${selectedBill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          merchantName: formData.merchantName,
          category: formData.category,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          nextDueDate: new Date(formData.nextDueDate).toISOString(),
          isAutoPay: formData.isAutoPay,
          notes: formData.notes || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to update bill');
      toast.success('Bill updated successfully');
      setShowEditModal(false);
      setSelectedBill(null);
      setFormData(initialFormData);
      void fetchBills();
    } catch (err) {
      toast.error('Failed to update bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete bill
  const handleDeleteBill = async () => {
    if (!selectedBill) return;
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/financial/bills/${selectedBill.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete bill');
      toast.success('Bill deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedBill(null);
      void fetchBills();
      void fetchSummary();
    } catch (err) {
      toast.error('Failed to delete bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit modal
  const openEditModal = (bill: Bill) => {
    setSelectedBill(bill);
    setFormData({
      merchantName: bill.merchantName,
      category: bill.category,
      amount: bill.amount.toString(),
      frequency: bill.frequency,
      nextDueDate: new Date(bill.nextDueDate).toISOString().split('T')[0],
      isAutoPay: bill.isAutoPay,
      notes: bill.notes || '',
    });
    setShowEditModal(true);
  };

  useEffect(() => {
    if (!authLoading && user) {
      void fetchBills();
      void fetchSummary();
    }
  }, [authLoading, user, fetchBills, fetchSummary]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      utilities: '',
      rent: '',
      mortgage: '',
      insurance: '',
      subscription: '',
      loan: '',
      credit_card: '',
      phone: '',
      internet: '',
      streaming: '',
      other: '',
    };
    return icons[category] || '';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 dark:bg-slate-700 dark:text-slate-400';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 dark:bg-slate-700 dark:text-slate-400';
    }
  };

  // Calculate bill status based on due date
  const getBillDisplayStatus = (bill: Bill): 'upcoming' | 'overdue' => {
    const today = new Date();
    const dueDate = new Date(bill.nextDueDate);
    return dueDate < today ? 'overdue' : 'upcoming';
  };

  const getDaysUntilDue = (bill: Bill): number => {
    const today = new Date();
    const dueDate = new Date(bill.nextDueDate);
    return Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  // Filter bills
  const filteredBills = bills.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'subscriptions')
      return ['subscription', 'streaming'].includes(b.category);
    if (filter === 'upcoming') return getBillDisplayStatus(b) === 'upcoming';
    if (filter === 'overdue') return getBillDisplayStatus(b) === 'overdue';
    return true;
  });

  const totalMonthly = bills
    .filter((b) => b.frequency === 'monthly' && b.status === 'active')
    .reduce((sum, b) => sum + b.amount, 0);
  const upcomingCount = bills.filter(
    (b) => getBillDisplayStatus(b) === 'upcoming' && b.status === 'active'
  ).length;
  const overdueCount = bills.filter(
    (b) => getBillDisplayStatus(b) === 'overdue' && b.status === 'active'
  ).length;

  // Chart data
  const categoryChartData = Object.entries(
    bills.reduce(
      (acc, bill) => {
        acc[bill.category] = (acc[bill.category] || 0) + bill.amount;
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([name, value]) => ({ name, value }));

  // Bill form component
  const BillForm = ({
    onSubmit,
    submitLabel,
  }: {
    onSubmit: () => void;
    submitLabel: string;
  }) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          Bill Name *
        </label>
        <input
          type="text"
          value={formData.merchantName}
          onChange={(e) =>
            setFormData({ ...formData, merchantName: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          placeholder="e.g., Netflix, Electric Bill"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({
                ...formData,
                category: e.target.value as BillCategory,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="subscription">Subscription</option>
            <option value="streaming">Streaming</option>
            <option value="utilities">Utilities</option>
            <option value="rent">Rent</option>
            <option value="mortgage">Mortgage</option>
            <option value="insurance">Insurance</option>
            <option value="loan">Loan</option>
            <option value="credit_card">Credit Card</option>
            <option value="phone">Phone</option>
            <option value="internet">Internet</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Amount *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Frequency *
          </label>
          <select
            value={formData.frequency}
            onChange={(e) =>
              setFormData({
                ...formData,
                frequency: e.target.value as BillFrequency,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Next Due Date *
          </label>
          <input
            type="date"
            value={formData.nextDueDate}
            onChange={(e) =>
              setFormData({ ...formData, nextDueDate: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="autoPay"
          checked={formData.isAutoPay}
          onChange={(e) =>
            setFormData({ ...formData, isAutoPay: e.target.checked })
          }
          className="w-4 h-4 text-blue-600 rounded"
        />
        <label
          htmlFor="autoPay"
          className="text-sm text-gray-700 dark:text-slate-300"
        >
          Auto-pay enabled
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          placeholder="Optional notes..."
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setFormData(initialFormData);
          }}
          className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
            >
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
            </div>
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

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Bills
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void fetchBills()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Bills Optimizer - NEW */}
      <AIBillsOptimizer />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Total Bills</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold">
            {bills.filter((b) => b.status === 'active').length}
          </div>
          <div className="text-sm opacity-90 mt-1">Active bills</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Monthly Total</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(totalMonthly)}
          </div>
          <div className="text-sm opacity-90 mt-1">Per month</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400">
              Upcoming
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {upcomingCount}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Due soon
          </div>
        </div>
        <div
          className={`rounded-lg shadow p-6 ${overdueCount > 0 ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3
              className={`text-sm font-semibold ${overdueCount > 0 ? 'opacity-90' : 'text-gray-600 dark:text-slate-400'}`}
            >
              Overdue
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div
            className={`text-3xl font-bold ${overdueCount > 0 ? '' : 'text-red-600'}`}
          >
            {overdueCount}
          </div>
          <div
            className={`text-sm mt-1 ${overdueCount > 0 ? 'opacity-90' : 'text-gray-500 dark:text-slate-400'}`}
          >
            Need attention
          </div>
        </div>
      </div>

      {/* Charts Row */}
      {categoryChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Bills by Category" height={300}>
            <PieChartComponent data={categoryChartData} showLegend />
          </ChartContainer>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Upcoming Bills Timeline
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {bills
                .filter((b) => b.status === 'active')
                .sort(
                  (a, b) =>
                    new Date(a.nextDueDate).getTime() -
                    new Date(b.nextDueDate).getTime()
                )
                .slice(0, 5)
                .map((bill) => {
                  const days = getDaysUntilDue(bill);
                  return (
                    <div
                      key={bill.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${days < 0 ? 'bg-red-50' : days <= 7 ? 'bg-yellow-50' : 'bg-gray-50 dark:bg-slate-700'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {getCategoryIcon(bill.category)}
                        </span>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {bill.merchantName}
                          </div>
                          <div
                            className={`text-sm ${days < 0 ? 'text-red-600' : days <= 7 ? 'text-yellow-600' : 'text-gray-600 dark:text-slate-400'}`}
                          >
                            {days < 0
                              ? `${Math.abs(days)} days overdue`
                              : days === 0
                                ? 'Due today'
                                : `Due in ${days} days`}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(bill.amount)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'upcoming', 'overdue', 'subscriptions'] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${filter === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600'}`}
                >
                  {status}
                </button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  '/api/financial/export?type=bills&format=csv';
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
              type="button"
              onClick={() => void detectBills()}
              disabled={isDetecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {isDetecting ? 'Detecting...' : 'Detect Bills'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(initialFormData);
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              + Add Bill
            </button>
          </div>
        </div>
      </div>

      {/* Bills List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Bills & Subscriptions
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            {filteredBills.length} bills
          </p>
        </div>
        {filteredBills.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No bills found
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Add your first bill or detect bills from your transactions
            </p>
            <button
              type="button"
              onClick={() => {
                setFormData(initialFormData);
                setShowAddModal(true);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Bill
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredBills.map((bill) => {
              const days = getDaysUntilDue(bill);
              const displayStatus = getBillDisplayStatus(bill);
              return (
                <div
                  key={bill.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-4xl">
                        {getCategoryIcon(bill.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {bill.merchantName}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(bill.status)}`}
                          >
                            {bill.status}
                          </span>
                          {displayStatus === 'overdue' && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-semibold">
                              Overdue
                            </span>
                          )}
                          {bill.isAutoPay && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-semibold">
                              Auto-Pay
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                          <span className="capitalize">
                            {bill.category.replace('_', ' ')}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{bill.frequency}</span>
                          <span>•</span>
                          <span
                            className={
                              days < 0
                                ? 'text-red-600'
                                : days <= 7
                                  ? 'text-yellow-600'
                                  : ''
                            }
                          >
                            {days < 0
                              ? `${Math.abs(days)} days overdue`
                              : days === 0
                                ? 'Due today'
                                : `Due in ${days} days`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(bill.amount)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-slate-400 capitalize">
                          {bill.frequency}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(bill)}
                          className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="Edit"
                        >
                                                  </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBill(bill);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Delete"
                        >
                                                  </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData(initialFormData);
        }}
        title="Add New Bill"
        size="md"
      >
        <BillForm
          onSubmit={() => void handleCreateBill()}
          submitLabel="Add Bill"
        />
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedBill(null);
          setFormData(initialFormData);
        }}
        title="Edit Bill"
        size="md"
      >
        <BillForm
          onSubmit={() => void handleUpdateBill()}
          submitLabel="Save Changes"
        />
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedBill(null);
        }}
        onConfirm={() => void handleDeleteBill()}
        title="Delete Bill"
        message={`Are you sure you want to delete "${selectedBill?.merchantName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Detected Bills Modal */}
      <Modal
        isOpen={showDetectModal}
        onClose={() => setShowDetectModal(false)}
        title="Detected Bills"
        size="lg"
      >
        <div className="space-y-4">
          {detectedBills.length === 0 ? (
            <p className="text-gray-600 dark:text-slate-400 text-center py-8">
              No recurring bills detected from your transactions.
            </p>
          ) : (
            detectedBills.map((detected, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getCategoryIcon(detected.category)}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {detected.merchantName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">
                      {detected.frequency} • {detected.confidence}% confidence
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(detected.averageAmount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">avg amount</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        merchantName: detected.merchantName,
                        category: detected.category,
                        amount: detected.averageAmount.toString(),
                        frequency: detected.frequency,
                        nextDueDate: new Date(detected.nextExpectedDate)
                          .toISOString()
                          .split('T')[0],
                        isAutoPay: false,
                        notes: '',
                      });
                      setShowDetectModal(false);
                      setShowAddModal(true);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
