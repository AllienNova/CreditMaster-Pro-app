"use client";

/**
 * Accounts Summary Card Component
 *
 * Displays account balances with hide/show toggle for privacy and quick actions.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment" | "loan";
  balance: number;
  institution: string;
  lastUpdated: string;
}

interface AccountsSummaryData {
  accounts: Account[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export default function AccountsSummaryCard() {
  const { user } = useAuth();
  const [accountsData, setAccountsData] = useState<AccountsSummaryData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [balancesHidden, setBalancesHidden] = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/financial/dashboard");
      if (!response.ok) throw new Error("Failed to fetch accounts");

      const data = await response.json();
      setAccountsData(data.data);
    } catch (_error) {
      // Error logged
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const formatCurrency = (amount: number): string => {
    if (balancesHidden) return "••••••";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getAccountIcon = (type: string): string => {
    switch (type) {
      case "checking":
        return "";
      case "savings":
        return "";
      case "credit":
        return "";
      case "investment":
        return "";
      case "loan":
        return "";
      default:
        return "";
    }
  };

  const getAccountTypeColor = (type: string): string => {
    switch (type) {
      case "checking":
        return "bg-blue-100 text-blue-700";
      case "savings":
        return "bg-green-100 text-green-700";
      case "credit":
        return "bg-blue-100 text-blue-700";
      case "investment":
        return "bg-blue-100 text-blue-700";
      case "loan":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 dark:bg-slate-700 rounded"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (!accountsData || accountsData.accounts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Accounts Summary
        </h3>
        <button
          onClick={() => setBalancesHidden(!balancesHidden)}
          className="text-sm text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors"
          aria-label={balancesHidden ? "Show balances" : "Hide balances"}
        >
          {balancesHidden ? "Show" : "Hide"}
        </button>
      </div>

      {/* Net Worth Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg">
        <div>
          <div className="text-xs text-gray-600 dark:text-slate-300 mb-1">
            Assets
          </div>
          <div className="text-lg font-bold text-green-600">
            {formatCurrency(accountsData.totalAssets)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-slate-300 mb-1">
            Liabilities
          </div>
          <div className="text-lg font-bold text-red-600">
            {formatCurrency(accountsData.totalLiabilities)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-slate-300 mb-1">
            Net Worth
          </div>
          <div className="text-lg font-bold text-blue-600">
            {formatCurrency(accountsData.netWorth)}
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        {accountsData.accounts.slice(0, 4).map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getAccountIcon(account.type)}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {account.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {account.institution}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(account.balance)}
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${getAccountTypeColor(account.type)}`}
              >
                {account.type}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      {accountsData.accounts.length > 4 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <Link
            href="/financial/accounts"
            className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All {accountsData.accounts.length} Accounts →
          </Link>
        </div>
      )}
    </div>
  );
}
