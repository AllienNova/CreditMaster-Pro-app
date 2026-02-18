"use client";

import { useState, useEffect, useCallback } from "react";
import { PlaidTransaction, PlaidAccount } from "@/lib/financial/plaid-service";
import { useAuth } from "@/hooks/useAuth";

export default function TransactionsList() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"7" | "30" | "90" | "365">("30");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch accounts
      const accountsResponse = await fetch(`/api/financial/accounts`);
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setAccounts(accountsData.data);

        // Fetch transactions for all accounts
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));

        const allTransactions: PlaidTransaction[] = [];
        for (const account of accountsData.data) {
          const txnResponse = await fetch(
            `/api/financial/transactions?accountId=${account.accountId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          );
          if (txnResponse.ok) {
            const txnData = await txnResponse.json();
            allTransactions.push(...txnData.data);
          }
        }

        setTransactions(allTransactions);
      }

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load transactions",
      );
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchData();
    }
  }, [dateRange, authLoading, user, fetchData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Get unique categories
  const categories = Array.from(
    new Set(transactions.flatMap((t) => t.category).filter(Boolean)),
  ).sort();

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter((txn) => {
      // Search filter
      if (
        searchQuery &&
        !txn.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !txn.merchantName?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Account filter
      if (selectedAccount !== "all" && txn.accountId !== selectedAccount) {
        return false;
      }

      // Category filter
      if (
        selectedCategory !== "all" &&
        !txn.category.includes(selectedCategory)
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        comparison = a.date.getTime() - b.date.getTime();
      } else if (sortBy === "amount") {
        comparison = Math.abs(a.amount) - Math.abs(b.amount);
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Calculate stats
  const totalIncome = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpenses = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-200 dark:bg-slate-700 rounded"
              ></div>
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
            Error Loading Transactions
          </h3>
          <p className="text-gray-600 dark:text-slate-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-6"></div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            No Transactions Found
          </h3>
          <p className="text-gray-600 dark:text-slate-300 mb-8">
            Connect your bank accounts to start tracking transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Total Transactions
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {transactions.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Last {dateRange} days
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Total Income
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(totalIncome)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {transactions.filter((t) => t.amount < 0).length} transactions
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Total Expenses
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-red-600">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {transactions.filter((t) => t.amount > 0).length} transactions
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Account
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.accountId}>
                  {account.accountName} (••••{account.mask})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) =>
                setDateRange(e.target.value as "7" | "30" | "90" | "365")
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
            Sort by:
          </span>
          <div className="flex gap-2">
            {(["date", "amount", "name"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSortBy(option)}
                className={`px-3 py-1 rounded text-sm ${sortBy === option ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:bg-slate-700"}`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-1 bg-gray-100 text-gray-700 dark:text-slate-200 rounded text-sm hover:bg-gray-200 dark:bg-slate-700"
          >
            {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Transactions ({filteredTransactions.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {filteredTransactions.map((txn) => (
            <div
              key={txn.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {txn.name}
                    </h3>
                    {txn.pending && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-semibold">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-300">
                    <span>{txn.date.toLocaleDateString()}</span>
                    <span>{txn.category[0] || "Uncategorized"}</span>
                    {txn.merchantName && <span>• {txn.merchantName}</span>}
                  </div>
                </div>
                <div
                  className={`text-2xl font-bold ${txn.amount > 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {txn.amount > 0 ? "-" : "+"}
                  {formatCurrency(Math.abs(txn.amount))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
