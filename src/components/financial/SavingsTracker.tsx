"use client";

import { useState, useEffect, useCallback } from "react";
import { PlaidAccount } from "@/lib/financial/plaid-service";
import { useAuth } from "@/hooks/useAuth";

interface SavingsData {
  totalSavings: number;
  monthlyGrowth: number;
  interestEarned: number;
  savingsRate: number;
  accounts: PlaidAccount[];
  growthHistory: Array<{
    month: string;
    amount: number;
  }>;
  projections: Array<{
    month: string;
    projected: number;
  }>;
}

interface SavingsDashboardResponse {
  accounts: PlaidAccount[];
  cashFlow: number;
  savingsRate: number;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
}

export default function SavingsTracker() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<SavingsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSavingsData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/financial/dashboard`);
      if (!response.ok) throw new Error("Failed to fetch data");

      const result = await response.json();
      const dashboard = result.data as SavingsDashboardResponse;

      // Filter savings accounts (depository accounts)
      const savingsAccounts = dashboard.accounts.filter(
        (a: PlaidAccount) => a.accountType === "depository",
      );

      const totalSavings = savingsAccounts.reduce(
        (sum: number, a: PlaidAccount) => sum + a.currentBalance,
        0,
      );

      // Calculate monthly growth (simplified)
      const monthlyGrowth = dashboard.cashFlow;

      // Mock interest earned (would come from actual data)
      const interestEarned = (totalSavings * 0.02) / 12; // 2% APY monthly

      // Growth history (last 6 months)
      const growthHistory = dashboard.monthlyTrend.map((m) => ({
        month: m.month,
        amount: m.income - m.expenses,
      }));

      // Projections (next 6 months)
      const projections = [];
      for (let i = 1; i <= 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        projections.push({
          month: date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          projected: totalSavings + monthlyGrowth * i,
        });
      }

      setData({
        totalSavings,
        monthlyGrowth,
        interestEarned,
        savingsRate: dashboard.savingsRate,
        accounts: savingsAccounts,
        growthHistory,
        projections,
      });
    } catch (error) {
      console.error("Error fetching savings data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchSavingsData();
    }
  }, [authLoading, user, fetchSavingsData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
            >
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Total Savings</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(data.totalSavings)}
          </div>
          <div className="text-sm opacity-90 mt-1">
            {data.accounts.length} accounts
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Monthly Growth
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div
            className={`text-3xl font-bold ${data.monthlyGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {formatCurrency(data.monthlyGrowth)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Per month
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Interest Earned
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {formatCurrency(data.interestEarned)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            This month
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Savings Rate
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div
            className={`text-3xl font-bold ${data.savingsRate >= 20 ? "text-green-600" : "text-orange-600"}`}
          >
            {data.savingsRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Of income
          </div>
        </div>
      </div>

      {/* Savings Accounts */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Savings Accounts
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            {data.accounts.length} accounts
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {data.accounts.map((account) => (
            <div
              key={account.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                    {account.institutionName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {account.accountName}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-slate-300">
                      {account.institutionName} • ••••{account.mask}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(account.currentBalance)}
                  </div>
                  {account.availableBalance !== undefined && (
                    <div className="text-sm text-gray-500 dark:text-slate-400">
                      Available: {formatCurrency(account.availableBalance)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Growth History */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Savings Growth History
        </h3>
        <div className="space-y-3">
          {data.growthHistory.map((month) => {
            const maxAmount = Math.max(
              ...data.growthHistory.map((m) => Math.abs(m.amount)),
            );
            const percentage = (Math.abs(month.amount) / maxAmount) * 100;

            return (
              <div key={month.month}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {month.month}
                  </span>
                  <span
                    className={`font-bold ${month.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {month.amount >= 0 ? "+" : ""}
                    {formatCurrency(month.amount)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                  <div
                    className={`${month.amount >= 0 ? "bg-green-500" : "bg-red-500"} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Projections */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          6-Month Savings Projection
        </h3>
        <div className="space-y-3">
          {data.projections.map((proj, index) => {
            const maxAmount = Math.max(
              ...data.projections.map((p) => p.projected),
            );
            const percentage = (proj.projected / maxAmount) * 100;

            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {proj.month}
                  </span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(proj.projected)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Savings Tips */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span></span>
          Savings Tips
        </h3>
        <div className="space-y-3">
          {[
            "Automate your savings by setting up automatic transfers on payday",
            "Aim to save at least 20% of your income for optimal wealth building",
            "Build an emergency fund of 3-6 months of expenses before investing",
            "Consider high-yield savings accounts to maximize interest earnings",
            "Review and increase your savings rate annually as your income grows",
          ].map((tip, index) => (
            <div
              key={index}
              className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-lg p-4"
            >
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {index + 1}
              </div>
              <p className="text-gray-700 dark:text-slate-200 flex-1">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
