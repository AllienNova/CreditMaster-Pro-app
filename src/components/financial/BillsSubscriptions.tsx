'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  frequency: 'weekly' | 'monthly' | 'yearly';
  category: 'subscription' | 'utility' | 'insurance' | 'loan' | 'other';
  status: 'upcoming' | 'paid' | 'overdue';
  autoPay: boolean;
}

export default function BillsSubscriptions() {
  const { user, loading: authLoading } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'paid' | 'overdue'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchBills = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // TODO: Implement bills API endpoint
      // For now, using mock data
      const mockBills: Bill[] = [
        {
          id: '1',
          name: 'Netflix',
          amount: 15.99,
          dueDate: new Date(2025, 10, 15),
          frequency: 'monthly',
          category: 'subscription',
          status: 'upcoming',
          autoPay: true,
        },
        {
          id: '2',
          name: 'Electric Bill',
          amount: 120.50,
          dueDate: new Date(2025, 10, 20),
          frequency: 'monthly',
          category: 'utility',
          status: 'upcoming',
          autoPay: false,
        },
        {
          id: '3',
          name: 'Car Insurance',
          amount: 150.00,
          dueDate: new Date(2025, 10, 10),
          frequency: 'monthly',
          category: 'insurance',
          status: 'paid',
          autoPay: true,
        },
        {
          id: '4',
          name: 'Spotify',
          amount: 9.99,
          dueDate: new Date(2025, 10, 12),
          frequency: 'monthly',
          category: 'subscription',
          status: 'upcoming',
          autoPay: true,
        },
        {
          id: '5',
          name: 'Internet',
          amount: 79.99,
          dueDate: new Date(2025, 10, 25),
          frequency: 'monthly',
          category: 'utility',
          status: 'upcoming',
          autoPay: true,
        },
      ];
      
      setBills(mockBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchBills();
    }
  }, [authLoading, user, fetchBills]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      subscription: '📺',
      utility: '⚡',
      insurance: '🛡️',
      loan: '🏦',
      other: '📄',
    };
    return icons[category] || '📄';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBills = filter === 'all' ? bills : bills.filter(b => b.status === filter);
  const totalMonthly = bills.filter(b => b.frequency === 'monthly').reduce((sum, b) => sum + b.amount, 0);
  const upcomingCount = bills.filter(b => b.status === 'upcoming').length;
  const overdueCount = bills.filter(b => b.status === 'overdue').length;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Total Bills</h3>
            <span className="text-2xl">📄</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{bills.length}</div>
          <div className="text-sm text-gray-500 mt-1">Active bills</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Monthly Total</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalMonthly)}</div>
          <div className="text-sm text-gray-500 mt-1">Per month</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Upcoming</h3>
            <span className="text-2xl">📅</span>
          </div>
          <div className="text-3xl font-bold text-blue-600">{upcomingCount}</div>
          <div className="text-sm text-gray-500 mt-1">Due soon</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Overdue</h3>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{overdueCount}</div>
          <div className="text-sm text-gray-500 mt-1">Need attention</div>
        </div>
      </div>

      {/* Filters and Add Button */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['all', 'upcoming', 'paid', 'overdue'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            + Add Bill
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Add Bills (Coming Soon)</h4>
            <p className="text-sm text-blue-800">
              You'll be able to connect providers and auto-import billing data in the next release.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(false)}
            className="text-blue-700 hover:text-blue-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bills List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Bills & Subscriptions</h2>
          <p className="text-sm text-gray-600 mt-1">{filteredBills.length} bills</p>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredBills.map((bill) => (
            <div key={bill.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-4xl">{getCategoryIcon(bill.category)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{bill.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${getStatusColor(bill.status)}`}>
                        {bill.status}
                      </span>
                      {bill.autoPay && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                          Auto-Pay
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="capitalize">{bill.category}</span>
                      <span>•</span>
                      <span className="capitalize">{bill.frequency}</span>
                      <span>•</span>
                      <span>Due: {bill.dueDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(bill.amount)}</div>
                  <div className="text-sm text-gray-500 mt-1 capitalize">{bill.frequency}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Upcoming Bills Calendar</h3>
        <div className="space-y-2">
          {bills
            .filter(b => b.status === 'upcoming')
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
            .map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getCategoryIcon(bill.category)}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{bill.name}</div>
                    <div className="text-sm text-gray-600">{bill.dueDate.toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="font-bold text-gray-900">{formatCurrency(bill.amount)}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
