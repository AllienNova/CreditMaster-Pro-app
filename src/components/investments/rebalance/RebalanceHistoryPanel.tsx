'use client';

/**
 * Rebalance History Panel
 *
 * Displays rebalancing history with detailed trade reports,
 * performance metrics, and export capabilities.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  BarChart3,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type RebalanceStatus = 'completed' | 'partial' | 'failed' | 'cancelled';

export interface HistoricalTrade {
  assetClass: string;
  label: string;
  action: 'buy' | 'sell';
  amount: number;
  shares?: number;
  executedPrice?: number;
  commission?: number;
}

export interface AllocationSnapshot {
  assetClass: string;
  label: string;
  percent: number;
  value: number;
}

export interface RebalanceHistoryItem {
  id: string;
  portfolioId: string;
  portfolioName: string;
  executedAt: Date;
  status: RebalanceStatus;
  triggerType: 'scheduled' | 'threshold' | 'manual';
  preAllocations: AllocationSnapshot[];
  postAllocations: AllocationSnapshot[];
  trades: HistoricalTrade[];
  totalTradeValue: number;
  totalCommission: number;
  taxImplication?: number;
  driftBefore: number;
  driftAfter: number;
  notes?: string;
}

export interface RebalanceStats {
  totalRebalances: number;
  totalTradeValue: number;
  totalCommissions: number;
  avgDriftReduction: number;
  successRate: number;
}

export interface RebalanceHistoryPanelProps {
  history: RebalanceHistoryItem[];
  onExport?: (format: 'csv' | 'pdf') => void;
  onViewDetails?: (itemId: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<
  RebalanceStatus,
  { color: string; icon: React.ReactNode; label: string }
> = {
  completed: {
    color: 'text-emerald-400',
    icon: <CheckCircle className="w-4 h-4" />,
    label: 'Completed',
  },
  partial: {
    color: 'text-amber-400',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Partial',
  },
  failed: {
    color: 'text-red-400',
    icon: <XCircle className="w-4 h-4" />,
    label: 'Failed',
  },
  cancelled: {
    color: 'text-gray-400 dark:text-slate-500',
    icon: <XCircle className="w-4 h-4" />,
    label: 'Cancelled',
  },
};

const TIME_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function RebalanceHistoryPanel({
  history,
  onExport,
  onViewDetails,
}: RebalanceHistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<RebalanceStatus | 'all'>(
    'all'
  );

  // Filter history
  const filteredHistory = useMemo(() => {
    let filtered = [...history];

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const days =
        {
          '7d': 7,
          '30d': 30,
          '90d': 90,
          '1y': 365,
        }[timeFilter] || 0;

      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((h) => new Date(h.executedAt) >= cutoff);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((h) => h.status === statusFilter);
    }

    // Sort by date descending
    return filtered.sort(
      (a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    );
  }, [history, timeFilter, statusFilter]);

  // Calculate stats
  const stats: RebalanceStats = useMemo(() => {
    const completed = filteredHistory.filter((h) => h.status === 'completed');
    return {
      totalRebalances: filteredHistory.length,
      totalTradeValue: filteredHistory.reduce(
        (sum, h) => sum + h.totalTradeValue,
        0
      ),
      totalCommissions: filteredHistory.reduce(
        (sum, h) => sum + h.totalCommission,
        0
      ),
      avgDriftReduction:
        completed.length > 0
          ? completed.reduce(
              (sum, h) => sum + (h.driftBefore - h.driftAfter),
              0
            ) / completed.length
          : 0,
      successRate:
        filteredHistory.length > 0
          ? (completed.length / filteredHistory.length) * 100
          : 0,
    };
  }, [filteredHistory]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">
            Rebalance History
          </h2>
        </div>

        {onExport && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport('csv')}
              className="px-3 py-1.5 text-sm text-gray-400 dark:text-slate-500 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => onExport('pdf')}
              className="px-3 py-1.5 text-sm text-gray-400 dark:text-slate-500 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="px-6 py-4 border-b border-gray-800 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {stats.totalRebalances}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Rebalances</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            ${(stats.totalTradeValue / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Trade Volume</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            ${stats.totalCommissions.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Commissions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-400">
            {stats.avgDriftReduction.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Avg Drift Reduction</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-400">
            {stats.successRate.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Success Rate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-4 bg-gray-800/30">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          <span className="text-sm text-gray-500 dark:text-slate-400">Filters:</span>
        </div>

        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
        >
          {TIME_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as RebalanceStatus | 'all')
          }
          className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="partial">Partial</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* History List */}
      <div className="divide-y divide-gray-800">
        {filteredHistory.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-600 dark:text-slate-300 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-slate-500">No rebalancing history found</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {timeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Rebalancing events will appear here'}
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const statusConfig = STATUS_CONFIG[item.status];
            const isExpanded = expandedId === item.id;

            return (
              <div key={item.id}>
                {/* Summary Row */}
                <div
                  className="px-6 py-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex items-center gap-1.5 ${statusConfig.color}`}
                      >
                        {statusConfig.icon}
                        <span className="text-xs font-medium">
                          {statusConfig.label}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {item.portfolioName}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.executedAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.executedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="capitalize">{item.triggerType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-white font-medium">
                          ${item.totalTradeValue.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {item.trades.length} trades
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-400">
                          {item.driftBefore.toFixed(1)}% →{' '}
                          {item.driftAfter.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">drift</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 space-y-4">
                        {/* Trades */}
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-300 mb-3">
                            Executed Trades
                          </h4>
                          <div className="space-y-2">
                            {item.trades.map((trade, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  trade.action === 'buy'
                                    ? 'bg-emerald-500/5 border border-emerald-500/20'
                                    : 'bg-red-500/5 border border-red-500/20'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {trade.action === 'buy' ? (
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-red-400" />
                                  )}
                                  <div>
                                    <p className="text-sm text-white">
                                      {trade.label}
                                    </p>
                                    {trade.shares && (
                                      <p className="text-xs text-gray-500 dark:text-slate-400">
                                        {trade.shares} shares @ $
                                        {trade.executedPrice?.toFixed(2)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p
                                    className={`text-sm font-medium ${
                                      trade.action === 'buy'
                                        ? 'text-emerald-400'
                                        : 'text-red-400'
                                    }`}
                                  >
                                    {trade.action === 'buy' ? '+' : '-'}$
                                    {trade.amount.toLocaleString()}
                                  </p>
                                  {trade.commission !== undefined && (
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                      ${trade.commission.toFixed(2)} fee
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Allocation Changes */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-800/50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-300 mb-3">
                              Before
                            </h4>
                            <div className="space-y-2">
                              {item.preAllocations.map((alloc) => (
                                <div
                                  key={alloc.assetClass}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-400 dark:text-slate-500">
                                    {alloc.label}
                                  </span>
                                  <span className="text-white">
                                    {alloc.percent.toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-gray-800/50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-300 mb-3">
                              After
                            </h4>
                            <div className="space-y-2">
                              {item.postAllocations.map((alloc) => (
                                <div
                                  key={alloc.assetClass}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-400 dark:text-slate-500">
                                    {alloc.label}
                                  </span>
                                  <span className="text-white">
                                    {alloc.percent.toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="flex items-center justify-between text-sm bg-gray-800/50 rounded-lg p-4">
                          <div className="flex items-center gap-6">
                            <div>
                              <span className="text-gray-500 dark:text-slate-400">Commission:</span>
                              <span className="text-white ml-2">
                                ${item.totalCommission.toFixed(2)}
                              </span>
                            </div>
                            {item.taxImplication !== undefined && (
                              <div>
                                <span className="text-gray-500 dark:text-slate-400">
                                  Tax Impact:
                                </span>
                                <span className="text-amber-400 ml-2">
                                  ${item.taxImplication.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                          {onViewDetails && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(item.id);
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              View Full Report →
                            </button>
                          )}
                        </div>

                        {item.notes && (
                          <p className="text-sm text-gray-500 dark:text-slate-400 italic">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RebalanceHistoryPanel;
