'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Settings,
  Info,
  BarChart3,
} from 'lucide-react';

type AssetClass =
  | 'us_stocks'
  | 'international_stocks'
  | 'bonds'
  | 'real_estate'
  | 'cash';

interface Allocation {
  assetClass: AssetClass;
  name: string;
  targetPercent: number;
  currentPercent: number;
  currentValue: number;
  drift: number;
  color: string;
}

interface RebalanceTrade {
  assetClass: AssetClass;
  name: string;
  action: 'buy' | 'sell';
  amount: number;
  shares?: number;
}

const MOCK_ALLOCATIONS: Allocation[] = [
  {
    assetClass: 'us_stocks',
    name: 'US Stocks',
    targetPercent: 50,
    currentPercent: 55,
    currentValue: 27500,
    drift: 5,
    color: 'bg-blue-500',
  },
  {
    assetClass: 'international_stocks',
    name: 'International Stocks',
    targetPercent: 20,
    currentPercent: 18,
    currentValue: 9000,
    drift: -2,
    color: 'bg-green-500',
  },
  {
    assetClass: 'bonds',
    name: 'Bonds',
    targetPercent: 20,
    currentPercent: 17,
    currentValue: 8500,
    drift: -3,
    color: 'bg-blue-500',
  },
  {
    assetClass: 'real_estate',
    name: 'Real Estate',
    targetPercent: 5,
    currentPercent: 6,
    currentValue: 3000,
    drift: 1,
    color: 'bg-orange-500',
  },
  {
    assetClass: 'cash',
    name: 'Cash',
    targetPercent: 5,
    currentPercent: 4,
    currentValue: 2000,
    drift: -1,
    color: 'bg-gray-500',
  },
];

const MOCK_TRADES: RebalanceTrade[] = [
  { assetClass: 'us_stocks', name: 'US Stocks', action: 'sell', amount: 2500 },
  {
    assetClass: 'international_stocks',
    name: 'International Stocks',
    action: 'buy',
    amount: 1000,
  },
  { assetClass: 'bonds', name: 'Bonds', action: 'buy', amount: 1500 },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function PortfolioRebalancePage() {
  const [allocations] = useState<Allocation[]>(MOCK_ALLOCATIONS);
  const [trades] = useState<RebalanceTrade[]>(MOCK_TRADES);
  const [driftThreshold] = useState(5);

  const totalValue = allocations.reduce((sum, a) => sum + a.currentValue, 0);
  const maxDrift = Math.max(...allocations.map((a) => Math.abs(a.drift)));
  const needsRebalance = maxDrift > driftThreshold;

  const outOfBoundsCount = allocations.filter(
    (a) => Math.abs(a.drift) > driftThreshold
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <PieChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Portfolio Rebalance
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Keep your portfolio aligned with your target allocation
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Rebalance Now
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-6 mb-8 ${ needsRebalance ? 'bg-amber-100 border border-amber-300' : 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' }`}
        >
          <div className="flex items-start gap-4">
            {needsRebalance ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h2
                className={`font-semibold text-lg ${ needsRebalance ? 'text-amber-800' : 'text-green-800 dark:text-green-200' }`}
              >
                {needsRebalance
                  ? 'Rebalancing Recommended'
                  : 'Portfolio is Balanced'}
              </h2>
              <p
                className={`mt-1 ${ needsRebalance ? 'text-amber-700' : 'text-green-700 dark:text-green-300' }`}
              >
                {needsRebalance
                  ? `${outOfBoundsCount} asset class${outOfBoundsCount !== 1 ? 'es are' : ' is'} outside your target allocation. Maximum drift: ${maxDrift.toFixed(1)}%`
                  : 'All asset classes are within your target allocation range.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Portfolio Value
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Max Drift
            </p>
            <p
              className={`text-2xl font-bold ${maxDrift > driftThreshold ? 'text-amber-600' : 'text-green-600'}`}
            >
              {maxDrift.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Drift Threshold
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {driftThreshold}%
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Last Rebalanced
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              45 days
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Allocation */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Current Allocation
            </h2>
            <div className="space-y-4">
              {allocations.map((alloc) => (
                <div key={alloc.assetClass}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${alloc.color}`} />
                      <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        {alloc.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        {formatCurrency(alloc.currentValue)}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                        {alloc.currentPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-gray-100 dark:bg-slate-700 rounded-full">
                    <div
                      className={`absolute h-full rounded-full ${alloc.color}`}
                      style={{ width: `${alloc.currentPercent}%` }}
                    />
                    <div
                      className="absolute w-0.5 h-4 bg-gray-400 -top-1"
                      style={{ left: `${alloc.targetPercent}%` }}
                      title={`Target: ${alloc.targetPercent}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      Target: {alloc.targetPercent}%
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        alloc.drift > 0
                          ? 'text-amber-600'
                          : alloc.drift < 0
                            ? 'text-blue-600'
                            : 'text-gray-500 dark:text-slate-400'
                      }`}
                    >
                      {alloc.drift > 0 ? '+' : ''}
                      {alloc.drift}% drift
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Trades */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-500" />
              Recommended Trades
            </h2>
            {trades.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-slate-400">
                  No trades needed. Your portfolio is balanced!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {trades.map((trade, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${ trade.action === 'sell' ? 'bg-red-50 border border-red-200' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {trade.action === 'sell' ? (
                          <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {trade.action === 'sell' ? 'Sell' : 'Buy'}{' '}
                            {trade.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {trade.action === 'sell'
                              ? 'Overweight'
                              : 'Underweight'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-lg font-semibold ${
                          trade.action === 'sell'
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        {trade.action === 'sell' ? '-' : '+'}
                        {formatCurrency(trade.amount)}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400 mb-4">
                    <span>Total trade value</span>
                    <span className="font-medium">
                      {formatCurrency(
                        trades.reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </span>
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Execute Rebalance
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />
            About Portfolio Rebalancing
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
            Rebalancing keeps your portfolio aligned with your risk tolerance
            and investment goals. Over time, some assets grow faster than
            others, causing your allocation to drift from its target.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Threshold-Based
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Rebalance when drift exceeds {driftThreshold}%
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Tax-Efficient
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Consider using new contributions first
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Automated Monitoring
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Get alerts when rebalancing is needed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
