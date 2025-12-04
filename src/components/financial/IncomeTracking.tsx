'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlaidTransaction } from '@/lib/financial/plaid-service';
import { useAuth } from '@/hooks/useAuth';

interface IncomeSource {
  name: string;
  amount: number;
  frequency: string;
  lastReceived: Date;
  transactionCount: number;
}

interface MonthlyIncome {
  month: string;
  amount: number;
}

export default function IncomeTracking() {
  const { user, loading: authLoading } = useAuth();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<MonthlyIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'90' | '180' | '365'>('180');

const fetchIncomeData = useCallback(async () => {
  if (!user) return;

  try {
      setLoading(true);

      const response = await fetch(`/api/financial/spending?days=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      
      // Process income transactions (negative amounts in Plaid)
      const incomeTransactions = data.data.transactions?.filter((t: PlaidTransaction) => t.amount < 0) || [];
      
      // Group by merchant/name to identify income sources
      const sourcesMap = new Map<string, IncomeSource>();
      incomeTransactions.forEach((txn: PlaidTransaction) => {
        const name = txn.merchantName || txn.name;
        if (sourcesMap.has(name)) {
          const source = sourcesMap.get(name)!;
          source.amount += Math.abs(txn.amount);
          source.transactionCount++;
          if (txn.date > source.lastReceived) {
            source.lastReceived = txn.date;
          }
        } else {
          sourcesMap.set(name, {
            name,
            amount: Math.abs(txn.amount),
            frequency: 'Monthly', // Simplified
            lastReceived: txn.date,
            transactionCount: 1,
          });
        }
      });
      
      setIncomeSources(Array.from(sourcesMap.values()).sort((a, b) => b.amount - a.amount));
      
      // Calculate monthly income
      const monthlyMap = new Map<string, number>();
      incomeTransactions.forEach((txn: PlaidTransaction) => {
        const month = txn.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + Math.abs(txn.amount));
      });
      
      setMonthlyIncome(
        Array.from(monthlyMap.entries())
          .map(([month, amount]) => ({ month, amount }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
          .slice(-6)
      );
    } catch (error) {
      console.error('Error fetching income data:', error);
  } finally {
    setLoading(false);
  }
}, [user, dateRange]);

useEffect(() => {
  if (!authLoading && user) {
    void fetchIncomeData();
  }
}, [dateRange, authLoading, user, fetchIncomeData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalIncome = incomeSources.reduce((sum, s) => sum + s.amount, 0);
  const avgMonthly = monthlyIncome.length > 0 
    ? monthlyIncome.reduce((sum, m) => sum + m.amount, 0) / monthlyIncome.length 
    : 0;
  const projectedAnnual = avgMonthly * 12;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Time Period</h3>
          <div className="flex gap-2">
            {(['90', '180', '365'] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setDateRange(days)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  dateRange === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {days === '90' ? '3 Months' : days === '180' ? '6 Months' : '1 Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Total Income</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(totalIncome)}</div>
          <div className="text-sm opacity-90 mt-1">Last {dateRange} days</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Avg Monthly</h3>
            <span className="text-2xl">📅</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(avgMonthly)}</div>
          <div className="text-sm text-gray-500 mt-1">Per month</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Projected Annual</h3>
            <span className="text-2xl">📈</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(projectedAnnual)}</div>
          <div className="text-sm text-gray-500 mt-1">Based on average</div>
        </div>
      </div>

      {/* Income Sources */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Income Sources</h2>
          <p className="text-sm text-gray-600 mt-1">{incomeSources.length} sources identified</p>
        </div>
        <div className="divide-y divide-gray-200">
          {incomeSources.map((source, index) => (
            <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{source.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>{source.frequency}</span>
                    <span>•</span>
                    <span>{source.transactionCount} payments</span>
                    <span>•</span>
                    <span>Last: {source.lastReceived.toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(source.amount)}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {((source.amount / totalIncome) * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Monthly Income Trend</h3>
        <div className="space-y-3">
          {monthlyIncome.map((month) => {
            const maxAmount = Math.max(...monthlyIncome.map(m => m.amount));
            const percentage = (month.amount / maxAmount) * 100;
            
            return (
              <div key={month.month}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{month.month}</span>
                  <span className="font-bold text-green-600">{formatCurrency(month.amount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
