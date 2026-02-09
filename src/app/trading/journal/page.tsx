'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  Plus,
  Filter,
  Download,
  BarChart3,
  Target,
  Brain,
  Calendar,
  ChevronRight,
  X,
} from 'lucide-react';

type TradeOutcome = 'win' | 'loss' | 'breakeven';
type TradeDirection = 'long' | 'short';

interface Trade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryDate: Date;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  profitLoss?: number;
  outcome?: TradeOutcome;
  strategy?: string;
  notes?: string;
}

interface TradeStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPL: number;
  averageWin: number;
  averageLoss: number;
  bestTrade: number;
  worstTrade: number;
}

const MOCK_TRADES: Trade[] = [
  {
    id: '1',
    symbol: 'AAPL',
    direction: 'long',
    entryDate: new Date('2026-01-20'),
    entryPrice: 185.5,
    exitPrice: 192.3,
    quantity: 50,
    profitLoss: 340,
    outcome: 'win',
    strategy: 'Breakout',
    notes: 'Clean breakout above resistance',
  },
  {
    id: '2',
    symbol: 'TSLA',
    direction: 'short',
    entryDate: new Date('2026-01-19'),
    entryPrice: 245.0,
    exitPrice: 238.5,
    quantity: 20,
    profitLoss: 130,
    outcome: 'win',
    strategy: 'Mean Reversion',
  },
  {
    id: '3',
    symbol: 'NVDA',
    direction: 'long',
    entryDate: new Date('2026-01-18'),
    entryPrice: 520.0,
    exitPrice: 515.0,
    quantity: 10,
    profitLoss: -50,
    outcome: 'loss',
    strategy: 'Trend Follow',
  },
  {
    id: '4',
    symbol: 'SPY',
    direction: 'long',
    entryDate: new Date('2026-01-17'),
    entryPrice: 475.0,
    exitPrice: 478.5,
    quantity: 30,
    profitLoss: 105,
    outcome: 'win',
    strategy: 'Momentum',
  },
  {
    id: '5',
    symbol: 'AMD',
    direction: 'long',
    entryDate: new Date('2026-01-16'),
    entryPrice: 142.0,
    exitPrice: 138.0,
    quantity: 25,
    profitLoss: -100,
    outcome: 'loss',
    strategy: 'Breakout',
  },
];

const MOCK_STATS: TradeStats = {
  totalTrades: 47,
  winRate: 58.5,
  profitFactor: 1.85,
  totalPL: 2847.5,
  averageWin: 185.3,
  averageLoss: 95.2,
  bestTrade: 1250.0,
  worstTrade: -450.0,
};

const formatCurrency = (amount: number) => {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
};

export default function TradingJournalPage() {
  const [trades] = useState<Trade[]>(MOCK_TRADES);
  const [stats] = useState<TradeStats>(MOCK_STATS);
  const [showNewTradeModal, setShowNewTradeModal] = useState(false);
  const [filterOutcome, setFilterOutcome] = useState<TradeOutcome | 'all'>(
    'all'
  );

  const filteredTrades =
    filterOutcome === 'all'
      ? trades
      : trades.filter((t) => t.outcome === filterOutcome);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Trading Journal
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Track, analyze, and improve your trading performance
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowNewTradeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Trade
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white"
          >
            <p className="text-green-100 text-sm">Total P/L</p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.totalPL)}
            </p>
            <p className="text-green-200 text-sm mt-1">
              {stats.totalTrades} trades
            </p>
          </motion.div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">Win Rate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.winRate.toFixed(1)}%
            </p>
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${stats.winRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Profit Factor
            </p>
            <p
              className={`text-2xl font-bold ${stats.profitFactor >= 1.5 ? 'text-green-600' : stats.profitFactor >= 1 ? 'text-yellow-600' : 'text-red-600'}`}
            >
              {stats.profitFactor.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Target: 2.0+</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Avg Win/Loss
            </p>
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-semibold">
                ${stats.averageWin.toFixed(0)}
              </span>
              <span className="text-gray-400 dark:text-slate-500">/</span>
              <span className="text-red-600 font-semibold">
                ${stats.averageLoss.toFixed(0)}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              R:R {(stats.averageWin / stats.averageLoss).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Performance Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Best Strategy
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Breakout (68% win rate)
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Best Time
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Morning session (9:30-11:00)
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Suggestion
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Reduce position size after 2 losses
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <span className="text-sm text-gray-500 dark:text-slate-400">Filter:</span>
          </div>
          <div className="flex gap-2">
            {(['all', 'win', 'loss', 'breakeven'] as const).map((outcome) => (
              <button
                key={outcome}
                onClick={() => setFilterOutcome(outcome)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${ filterOutcome === outcome ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600' }`}
              >
                {outcome === 'all'
                  ? 'All'
                  : outcome.charAt(0).toUpperCase() + outcome.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Trade List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 text-left text-sm text-gray-500 dark:text-slate-400">
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Symbol</th>
                  <th className="px-6 py-4 font-medium">Direction</th>
                  <th className="px-6 py-4 font-medium">Entry</th>
                  <th className="px-6 py-4 font-medium">Exit</th>
                  <th className="px-6 py-4 font-medium">P/L</th>
                  <th className="px-6 py-4 font-medium">Strategy</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {trade.entryDate.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {trade.symbol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`flex items-center gap-1 text-sm ${
                          trade.direction === 'long'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {trade.direction === 'long' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {trade.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      ${trade.entryPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {trade.profitLoss !== undefined && (
                        <span
                          className={`font-semibold ${
                            trade.profitLoss >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(trade.profitLoss)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {trade.strategy && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                          {trade.strategy}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-200">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Trade Modal */}
        {showNewTradeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Log New Trade
                </h2>
                <button
                  onClick={() => setShowNewTradeModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Symbol
                    </label>
                    <input
                      type="text"
                      placeholder="AAPL"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Direction
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Entry Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Strategy
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                    <option value="">Select strategy...</option>
                    <option value="breakout">Breakout</option>
                    <option value="trend">Trend Follow</option>
                    <option value="momentum">Momentum</option>
                    <option value="mean_reversion">Mean Reversion</option>
                    <option value="scalp">Scalp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Entry Reason
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Why did you enter this trade?"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowNewTradeModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                    Log Trade
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
