"use client";

import { useState, useEffect, useCallback } from "react";
import { PlaidAccount } from "@/lib/financial/plaid-service";
import { useAuth } from "@/hooks/useAuth";

interface InvestmentData {
  totalValue: number;
  totalGain: number;
  gainPercentage: number;
  accounts: PlaidAccount[];
  allocation: Array<{
    type: string;
    value: number;
    percentage: number;
  }>;
}

export default function InvestmentPortfolio() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<InvestmentData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvestmentData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/financial/accounts`);
      if (!response.ok) throw new Error("Failed to fetch accounts");

      const result = await response.json();

      // Filter investment accounts
      const investmentAccounts = result.data.filter(
        (a: PlaidAccount) => a.accountType === "investment",
      );

      const totalValue = investmentAccounts.reduce(
        (sum: number, a: PlaidAccount) => sum + a.currentBalance,
        0,
      );

      // Mock gain data (would come from actual historical data)
      const totalGain = totalValue * 0.12; // 12% gain
      const gainPercentage = 12;

      // Mock allocation data
      const allocation = [
        { type: "Stocks", value: totalValue * 0.6, percentage: 60 },
        { type: "Bonds", value: totalValue * 0.25, percentage: 25 },
        { type: "Cash", value: totalValue * 0.1, percentage: 10 },
        { type: "Other", value: totalValue * 0.05, percentage: 5 },
      ];

      setData({
        totalValue,
        totalGain,
        gainPercentage,
        accounts: investmentAccounts,
        allocation,
      });
    } catch (error) {
      console.error("Error fetching investment data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchInvestmentData();
    }
  }, [authLoading, user, fetchInvestmentData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAllocationColor = (index: number): string => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-blue-500",
    ];
    return colors[index % colors.length];
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

  if (!data || data.accounts.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-6"></div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            No Investment Accounts
          </h3>
          <p className="text-gray-600 dark:text-slate-300">
            Connect your investment accounts to track your portfolio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Total Value</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(data.totalValue)}
          </div>
          <div className="text-sm opacity-90 mt-1">
            {data.accounts.length} accounts
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Total Gain
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(data.totalGain)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            All time
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Return
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            +{data.gainPercentage.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Percentage gain
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Accounts
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.accounts.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Investment accounts
          </div>
        </div>
      </div>

      {/* Asset Allocation */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Asset Allocation
        </h3>
        <div className="space-y-4">
          {data.allocation.map((asset, index) => (
            <div key={asset.type}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 ${getAllocationColor(index)} rounded`}
                  ></div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {asset.type}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 dark:text-white">
                    {formatCurrency(asset.value)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    {asset.percentage}%
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                <div
                  className={`${getAllocationColor(index)} h-3 rounded-full transition-all duration-500`}
                  style={{ width: `${asset.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Accounts */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Investment Accounts
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {data.accounts.map((account) => (
            <div
              key={account.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-500 rounded-lg flex items-center justify-center text-white text-xl font-bold">
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
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(account.currentBalance)}
                  </div>
                  <div className="text-sm text-green-600">+12.5%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Tips */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span></span>
          Investment Tips
        </h3>
        <div className="space-y-3">
          {[
            "Diversify your portfolio across different asset classes to reduce risk",
            "Consider low-cost index funds for long-term growth",
            "Rebalance your portfolio annually to maintain target allocation",
            "Maximize tax-advantaged accounts like 401(k) and IRA",
            "Stay invested for the long term and avoid emotional decisions",
          ].map((tip, index) => (
            <div
              key={index}
              className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-lg p-4"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
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
