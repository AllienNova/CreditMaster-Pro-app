"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Calendar,
  PieChart,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";

type DividendFrequency =
  | "monthly"
  | "quarterly"
  | "semi-annual"
  | "annual"
  | "irregular";

interface DividendHolding {
  symbol: string;
  name: string;
  shares: number;
  dividendPerShare: number;
  annualDividend: number;
  yield: number;
  frequency: DividendFrequency;
  nextPayDate: string | null;
  lastPayDate: string | null;
}

interface DividendData {
  holdings: DividendHolding[];
  totalAnnualIncome: number;
  averageYield: number;
  nextPaymentDate: string | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const capitalizeFrequency = (freq: DividendFrequency) => {
  switch (freq) {
    case "semi-annual":
      return "Semi-Annual";
    default:
      return freq.charAt(0).toUpperCase() + freq.slice(1);
  }
};

export default function DividendTrackingPage() {
  const [data, setData] = useState<DividendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "holdings" | "calendar"
  >("holdings");

  const fetchDividends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/investments/dividends");
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch dividends");
      }
      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dividend data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDividends();
  }, [fetchDividends]);

  const upcomingPayments = data?.holdings
    .filter((h) => h.nextPayDate && new Date(h.nextPayDate) > new Date())
    .sort(
      (a, b) =>
        new Date(a.nextPayDate!).getTime() - new Date(b.nextPayDate!).getTime(),
    ) ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            <span className="ml-3 text-gray-600 dark:text-slate-400">
              Loading dividend data...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-24">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Failed to load dividends
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={fetchDividends}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dividend Tracker
            </h1>
          </div>
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
            <DollarSign className="w-12 h-12 text-gray-400 dark:text-slate-500 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No dividend-paying holdings
            </h2>
            <p className="text-gray-500 dark:text-slate-400 text-center max-w-md">
              Add dividend-paying stocks or ETFs to your portfolio to start
              tracking your dividend income.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const monthlyIncome = data.totalAnnualIncome / 12;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Dividend Tracker
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Track your dividend income and upcoming payments
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={fetchDividends}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white"
          >
            <p className="text-green-100 text-sm">Annual Income</p>
            <p className="text-2xl font-bold">
              {formatCurrency(data.totalAnnualIncome)}
            </p>
            <p className="text-green-200 text-sm mt-1">
              {formatCurrency(monthlyIncome)}/month
            </p>
          </motion.div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Average Yield
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.averageYield.toFixed(2)}%
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {data.holdings.length} dividend stocks
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Monthly Income
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(monthlyIncome)}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Estimated average
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Next Payment
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.nextPaymentDate
                ? formatDate(data.nextPaymentDate)
                : "N/A"}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {upcomingPayments.length} upcoming
            </p>
          </div>
        </div>

        {/* Upcoming Payments */}
        {upcomingPayments.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Upcoming Payments
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {upcomingPayments.slice(0, 3).map((holding) => (
                <div
                  key={holding.symbol}
                  className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {holding.symbol}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {formatDate(holding.nextPayDate)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                    {holding.name}
                  </p>
                  <p className="text-lg font-semibold text-green-600">
                    ~{formatCurrency(holding.dividendPerShare * holding.shares / (holding.frequency === "monthly" ? 12 : holding.frequency === "quarterly" ? 4 : holding.frequency === "semi-annual" ? 2 : 1))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <div className="flex">
              {[
                { id: "holdings" as const, label: "Holdings", icon: PieChart },
                { id: "calendar" as const, label: "Calendar", icon: Calendar },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === tab.id ? "border-green-500 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-200 dark:hover:text-gray-300"}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === "holdings" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                      <th className="pb-3 font-medium">Symbol</th>
                      <th className="pb-3 font-medium">Shares</th>
                      <th className="pb-3 font-medium">Dividend/Share</th>
                      <th className="pb-3 font-medium">Yield</th>
                      <th className="pb-3 font-medium">Frequency</th>
                      <th className="pb-3 font-medium">Annual Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.holdings.map((holding) => (
                      <tr
                        key={holding.symbol}
                        className="border-b border-gray-100 dark:border-slate-700/50 last:border-0"
                      >
                        <td className="py-4">
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {holding.symbol}
                            </span>
                            <p className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-[200px]">
                              {holding.name}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 text-gray-900 dark:text-white">
                          {holding.shares}
                        </td>
                        <td className="py-4 text-gray-900 dark:text-white">
                          {formatCurrency(holding.dividendPerShare)}
                        </td>
                        <td className="py-4">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm font-medium">
                            {holding.yield.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-4 text-gray-600 dark:text-slate-400">
                          {capitalizeFrequency(holding.frequency)}
                        </td>
                        <td className="py-4 font-semibold text-green-600">
                          {formatCurrency(holding.annualDividend)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-slate-600">
                      <td
                        colSpan={5}
                        className="py-4 font-semibold text-gray-900 dark:text-white"
                      >
                        Total Annual Dividend Income
                      </td>
                      <td className="py-4 font-bold text-green-600 text-lg">
                        {formatCurrency(data.totalAnnualIncome)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Dividend Calendar
                </h3>
                <p className="text-gray-500 dark:text-slate-400">
                  View your dividend payment schedule in calendar format
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
