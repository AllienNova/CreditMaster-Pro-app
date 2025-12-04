'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface CashFlowData {
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
    cashFlow: number;
  }>;
  projections: Array<{
    month: string;
    projected: number;
  }>;
  financialHealth: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    insights: string[];
  };
}

interface CashFlowDashboardResponse {
  monthlyIncome: number;
  monthlyExpenses: number;
  cashFlow: number;
  savingsRate: number;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
}

export default function CashFlowAnalysis() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

const fetchCashFlowData = useCallback(async () => {
  if (!user) return;

  try {
      setLoading(true);

      const response = await fetch(`/api/financial/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      const dashboard = result.data as CashFlowDashboardResponse;
      
      // Calculate projections (simple linear projection)
      const avgCashFlow = dashboard.cashFlow;
      const projections = [];
      for (let i = 1; i <= 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        projections.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          projected: avgCashFlow * i,
        });
      }
      
      // Calculate financial health score
      const savingsRate = dashboard.savingsRate;
      let score = 0;
      let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
      const insights: string[] = [];
      
      if (savingsRate >= 20) {
        score = 90 + Math.min(savingsRate - 20, 10);
        status = 'excellent';
        insights.push('🎉 Excellent savings rate! You\'re building wealth effectively.');
      } else if (savingsRate >= 10) {
        score = 70 + (savingsRate - 10);
        status = 'good';
        insights.push('👍 Good savings rate. Consider increasing to 20% for optimal wealth building.');
      } else if (savingsRate >= 5) {
        score = 50 + (savingsRate - 5) * 4;
        status = 'fair';
        insights.push('⚠️ Fair savings rate. Try to increase your savings to at least 10%.');
      } else {
        score = Math.max(savingsRate * 10, 20);
        status = 'poor';
        insights.push('🚨 Low savings rate. Focus on reducing expenses and increasing income.');
      }
      
      if (dashboard.cashFlow < 0) {
        insights.push('⚠️ Negative cash flow detected. Review your expenses immediately.');
      }
      
      if (dashboard.monthlyExpenses > dashboard.monthlyIncome * 0.9) {
        insights.push('💡 Your expenses are high relative to income. Look for areas to cut back.');
      }
      
      setData({
        monthlyIncome: dashboard.monthlyIncome,
        monthlyExpenses: dashboard.monthlyExpenses,
        netCashFlow: dashboard.cashFlow,
        savingsRate: dashboard.savingsRate,
        monthlyTrend: dashboard.monthlyTrend.map(m => ({
          month: m.month,
          income: m.income,
          expenses: m.expenses,
          cashFlow: m.income - m.expenses,
        })),
        projections,
        financialHealth: {
          score,
          status,
          insights,
        },
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cash flow data');
  } finally {
    setLoading(false);
  }
}, [user]);

useEffect(() => {
  if (!authLoading && user) {
    void fetchCashFlowData();
  }
}, [authLoading, user, fetchCashFlowData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getHealthBgColor = (status: string): string => {
    switch (status) {
      case 'excellent':
        return 'from-green-500 to-green-600';
      case 'good':
        return 'from-blue-500 to-blue-600';
      case 'fair':
        return 'from-yellow-500 to-yellow-600';
      case 'poor':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchCashFlowData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Monthly Income</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{formatCurrency(data.monthlyIncome)}</div>
          <div className="text-sm text-gray-500 mt-1">Average per month</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Monthly Expenses</h3>
            <span className="text-2xl">💸</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{formatCurrency(data.monthlyExpenses)}</div>
          <div className="text-sm text-gray-500 mt-1">Average per month</div>
        </div>

        <div className={`bg-white rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Net Cash Flow</h3>
            <span className="text-2xl">{data.netCashFlow >= 0 ? '📈' : '📉'}</span>
          </div>
          <div className={`text-3xl font-bold ${data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.netCashFlow)}
          </div>
          <div className="text-sm text-gray-500 mt-1">Per month</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">Savings Rate</h3>
            <span className="text-2xl">🎯</span>
          </div>
          <div className={`text-3xl font-bold ${data.savingsRate >= 20 ? 'text-green-600' : data.savingsRate >= 10 ? 'text-blue-600' : 'text-orange-600'}`}>
            {data.savingsRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 mt-1">Of income</div>
        </div>
      </div>

      {/* Financial Health Score */}
      <div className={`bg-gradient-to-br ${getHealthBgColor(data.financialHealth.status)} rounded-lg shadow p-8 text-white`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Financial Health Score</h3>
            <p className="text-lg opacity-90 capitalize">{data.financialHealth.status}</p>
          </div>
          <div className="text-6xl font-bold">{data.financialHealth.score}</div>
        </div>
        <div className="w-full bg-white bg-opacity-30 rounded-full h-4">
          <div
            className="bg-white h-4 rounded-full transition-all duration-500"
            style={{ width: `${data.financialHealth.score}%` }}
          ></div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Monthly Cash Flow Trend</h3>
        <div className="space-y-4">
          {data.monthlyTrend.map((month) => (
            <div key={month.month}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{month.month}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-green-600">+{formatCurrency(month.income)}</span>
                  <span className="text-sm text-red-600">-{formatCurrency(month.expenses)}</span>
                  <span className={`font-bold ${month.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(month.cashFlow)}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 h-8">
                <div
                  className="bg-green-500 rounded-l"
                  style={{ width: `${(month.income / (month.income + month.expenses)) * 100}%` }}
                ></div>
                <div
                  className="bg-red-500 rounded-r"
                  style={{ width: `${(month.expenses / (month.income + month.expenses)) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projections */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">6-Month Cash Flow Projection</h3>
        <div className="space-y-3">
          {data.projections.map((proj, index) => {
            const maxAmount = Math.max(...data.projections.map(p => Math.abs(p.projected)));
            const percentage = (Math.abs(proj.projected) / maxAmount) * 100;
            
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{proj.month}</span>
                  <span className={`font-bold ${proj.projected >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(proj.projected)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${proj.projected >= 0 ? 'bg-green-500' : 'bg-red-500'} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>💡</span>
          Financial Insights
        </h3>
        <div className="space-y-3">
          {data.financialHealth.insights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {index + 1}
              </div>
              <p className="text-gray-700 flex-1">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
