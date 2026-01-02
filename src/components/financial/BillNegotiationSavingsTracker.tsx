'use client';

/**
 * Bill Negotiation Savings Tracker Component
 * 
 * Display total savings achieved through bill negotiations with before/after comparisons.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface NegotiationSavings {
  billId: string;
  billName: string;
  provider: string;
  category: string;
  oldAmount: number;
  newAmount: number;
  monthlySavings: number;
  yearlySavings: number;
  negotiatedAt: string;
}

interface SavingsSummary {
  totalMonthlySavings: number;
  totalYearlySavings: number;
  totalLifetimeSavings: number;
  successfulNegotiations: number;
  totalNegotiations: number;
  successRate: number;
  savingsByCategory: {
    category: string;
    savings: number;
  }[];
}

export default function BillNegotiationSavingsTracker() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SavingsSummary | null>(null);
  const [recentSavings, setRecentSavings] = useState<NegotiationSavings[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavings = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/financial/bills/analysis');
      if (!response.ok) throw new Error('Failed to fetch savings');
      
      const data = await response.json();
      setSummary(data.data.summary);
      setRecentSavings(data.data.recentSavings || []);
    } catch (error) {
      console.error('Error fetching savings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchSavings();
  }, [fetchSavings]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-3">💰</div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Savings Yet</h4>
          <p className="text-gray-600">Start negotiating your bills to track your savings!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Monthly Savings</h3>
            <span className="text-2xl">💵</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {formatCurrency(summary.totalMonthlySavings)}
          </div>
          <div className="text-sm opacity-75">per month</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Yearly Savings</h3>
            <span className="text-2xl">📅</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {formatCurrency(summary.totalYearlySavings)}
          </div>
          <div className="text-sm opacity-75">per year</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Lifetime Savings</h3>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {formatCurrency(summary.totalLifetimeSavings)}
          </div>
          <div className="text-sm opacity-75">total saved</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Success Rate</h3>
            <span className="text-2xl">🎯</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {summary.successRate.toFixed(0)}%
          </div>
          <div className="text-sm opacity-75">
            {summary.successfulNegotiations}/{summary.totalNegotiations} successful
          </div>
        </div>
      </div>

      {/* Recent Savings */}
      {recentSavings.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Negotiations</h3>
          <div className="space-y-3">
            {recentSavings.map((saving) => (
              <div
                key={saving.billId}
                className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">{saving.billName}</div>
                    <div className="text-sm text-gray-600 mb-2">
                      {saving.provider} • {saving.category}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Before: </span>
                        <span className="font-medium text-gray-700 line-through">
                          {formatCurrency(saving.oldAmount)}
                        </span>
                      </div>
                      <span className="text-green-600">→</span>
                      <div>
                        <span className="text-gray-500">After: </span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(saving.newAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600 mb-1">
                      {formatCurrency(saving.monthlySavings)}
                    </div>
                    <div className="text-xs text-gray-500">saved/month</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(saving.negotiatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings by Category */}
      {summary.savingsByCategory && summary.savingsByCategory.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Savings by Category</h3>
          <div className="space-y-3">
            {summary.savingsByCategory.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 capitalize mb-1">
                    {item.category.replace(/_/g, ' ')}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                      style={{
                        width: `${(item.savings / summary.totalMonthlySavings) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(item.savings)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {((item.savings / summary.totalMonthlySavings) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

