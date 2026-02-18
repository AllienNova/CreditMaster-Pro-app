"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  PieChart,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";

interface DividendStock {
  symbol: string;
  companyName: string;
  sharesHeld: number;
  annualDividend: number;
  dividendYield: number;
  frequency: string;
  nextPayDate?: Date;
  annualIncome: number;
}

interface DividendPayment {
  id: string;
  symbol: string;
  payDate: Date;
  amount: number;
  shares: number;
  totalAmount: number;
  reinvested: boolean;
}

interface DividendSummary {
  totalAnnualIncome: number;
  totalMonthlyIncome: number;
  ytdIncome: number;
  lastMonthIncome: number;
  portfolioYield: number;
  totalDividendStocks: number;
}

const MOCK_STOCKS: DividendStock[] = [
  {
    symbol: "VYM",
    companyName: "Vanguard High Dividend Yield ETF",
    sharesHeld: 50,
    annualDividend: 3.12,
    dividendYield: 3.1,
    frequency: "Quarterly",
    nextPayDate: new Date("2026-03-15"),
    annualIncome: 156,
  },
  {
    symbol: "SCHD",
    companyName: "Schwab US Dividend Equity ETF",
    sharesHeld: 40,
    annualDividend: 2.85,
    dividendYield: 3.5,
    frequency: "Quarterly",
    nextPayDate: new Date("2026-03-20"),
    annualIncome: 114,
  },
  {
    symbol: "JNJ",
    companyName: "Johnson & Johnson",
    sharesHeld: 15,
    annualDividend: 4.76,
    dividendYield: 3.0,
    frequency: "Quarterly",
    nextPayDate: new Date("2026-03-10"),
    annualIncome: 71.4,
  },
  {
    symbol: "PG",
    companyName: "Procter & Gamble",
    sharesHeld: 20,
    annualDividend: 3.76,
    dividendYield: 2.5,
    frequency: "Quarterly",
    nextPayDate: new Date("2026-02-15"),
    annualIncome: 75.2,
  },
  {
    symbol: "KO",
    companyName: "Coca-Cola",
    sharesHeld: 30,
    annualDividend: 1.84,
    dividendYield: 3.1,
    frequency: "Quarterly",
    nextPayDate: new Date("2026-04-01"),
    annualIncome: 55.2,
  },
];

const MOCK_PAYMENTS: DividendPayment[] = [
  {
    id: "1",
    symbol: "VYM",
    payDate: new Date("2026-01-15"),
    amount: 0.78,
    shares: 50,
    totalAmount: 39,
    reinvested: true,
  },
  {
    id: "2",
    symbol: "SCHD",
    payDate: new Date("2026-01-20"),
    amount: 0.71,
    shares: 40,
    totalAmount: 28.4,
    reinvested: false,
  },
  {
    id: "3",
    symbol: "JNJ",
    payDate: new Date("2025-12-10"),
    amount: 1.19,
    shares: 15,
    totalAmount: 17.85,
    reinvested: true,
  },
  {
    id: "4",
    symbol: "PG",
    payDate: new Date("2025-12-15"),
    amount: 0.94,
    shares: 20,
    totalAmount: 18.8,
    reinvested: false,
  },
  {
    id: "5",
    symbol: "KO",
    payDate: new Date("2025-12-01"),
    amount: 0.46,
    shares: 30,
    totalAmount: 13.8,
    reinvested: true,
  },
];

const MOCK_SUMMARY: DividendSummary = {
  totalAnnualIncome: 471.8,
  totalMonthlyIncome: 39.32,
  ytdIncome: 67.4,
  lastMonthIncome: 50.45,
  portfolioYield: 3.05,
  totalDividendStocks: 5,
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function DividendTrackingPage() {
  const [stocks] = useState<DividendStock[]>(MOCK_STOCKS);
  const [payments] = useState<DividendPayment[]>(MOCK_PAYMENTS);
  const [summary] = useState<DividendSummary>(MOCK_SUMMARY);
  const [activeTab, setActiveTab] = useState<
    "holdings" | "history" | "calendar"
  >("holdings");

  const upcomingPayments = stocks
    .filter((s) => s.nextPayDate && s.nextPayDate > new Date())
    .sort(
      (a, b) =>
        (a.nextPayDate?.getTime() || 0) - (b.nextPayDate?.getTime() || 0),
    );

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
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
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
              {formatCurrency(summary.totalAnnualIncome)}
            </p>
            <p className="text-green-200 text-sm mt-1">
              {formatCurrency(summary.totalMonthlyIncome)}/month
            </p>
          </motion.div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              YTD Income
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.ytdIncome)}
            </p>
            <div className="flex items-center gap-1 text-sm mt-1 text-green-600">
              <ArrowUp className="w-3 h-3" />
              +12.5% vs last year
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Portfolio Yield
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.portfolioYield.toFixed(2)}%
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {summary.totalDividendStocks} stocks
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Last Month
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.lastMonthIncome)}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              5 payments
            </p>
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Upcoming Payments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingPayments.slice(0, 3).map((stock) => (
              <div
                key={stock.symbol}
                className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stock.symbol}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-slate-400">
                    {stock.nextPayDate?.toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                  {stock.companyName}
                </p>
                <p className="text-lg font-semibold text-green-600">
                  ~
                  {formatCurrency(
                    (stock.annualDividend / 4) * stock.sharesHeld,
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <div className="flex">
              {[
                { id: "holdings", label: "Holdings", icon: PieChart },
                { id: "history", label: "Payment History", icon: BarChart3 },
                { id: "calendar", label: "Calendar", icon: Calendar },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
                    {stocks.map((stock) => (
                      <tr
                        key={stock.symbol}
                        className="border-b border-gray-100 dark:border-slate-700/50 last:border-0"
                      >
                        <td className="py-4">
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {stock.symbol}
                            </span>
                            <p className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-[200px]">
                              {stock.companyName}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 text-gray-900 dark:text-white">
                          {stock.sharesHeld}
                        </td>
                        <td className="py-4 text-gray-900 dark:text-white">
                          {formatCurrency(stock.annualDividend)}
                        </td>
                        <td className="py-4">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm font-medium">
                            {stock.dividendYield.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-4 text-gray-600 dark:text-slate-400">
                          {stock.frequency}
                        </td>
                        <td className="py-4 font-semibold text-green-600">
                          {formatCurrency(stock.annualIncome)}
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
                        {formatCurrency(summary.totalAnnualIncome)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {payment.symbol}
                          </span>
                          {payment.reinvested && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                              DRIP
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {payment.shares} shares ×{" "}
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        +{formatCurrency(payment.totalAmount)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {payment.payDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
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
