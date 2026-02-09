'use client';

/**
 * Rebalance Schedule Panel
 *
 * UI component for configuring automated rebalancing schedules
 * and managing pending approval requests.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Bell,
  Shield,
  Play,
  Pause,
  Settings,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  Loader2,
  DollarSign,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type ScheduleFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'manual';
export type ApprovalStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'executed';

export interface ScheduleConfig {
  portfolioId: string;
  portfolioName: string;
  enabled: boolean;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  preferredTime?: string;
  driftThreshold: number;
  minTradeAmount: number;
  requireApproval: boolean;
  approvalTimeout: number;
  taxOptimized: boolean;
}

export interface PendingApproval {
  id: string;
  portfolioId: string;
  portfolioName: string;
  triggerType: 'scheduled' | 'threshold' | 'manual';
  status: ApprovalStatus;
  trades: TradePreview[];
  totalValue: number;
  estimatedTaxImpact?: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface TradePreview {
  assetClass: string;
  action: 'buy' | 'sell';
  amount: number;
  currentPercent: number;
  targetPercent: number;
}

export interface RebalanceSchedulePanelProps {
  schedules: ScheduleConfig[];
  pendingApprovals: PendingApproval[];
  onUpdateSchedule: (config: ScheduleConfig) => Promise<void>;
  onApprove: (approvalId: string) => Promise<void>;
  onReject: (approvalId: string, reason?: string) => Promise<void>;
  onTriggerManual: (portfolioId: string) => Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FREQUENCY_OPTIONS: {
  value: ScheduleFrequency;
  label: string;
  description: string;
}[] = [
  { value: 'daily', label: 'Daily', description: 'Check every day' },
  { value: 'weekly', label: 'Weekly', description: 'Check once per week' },
  { value: 'monthly', label: 'Monthly', description: 'Check once per month' },
  {
    value: 'quarterly',
    label: 'Quarterly',
    description: 'Check every 3 months',
  },
  { value: 'manual', label: 'Manual Only', description: 'Only when triggered' },
];

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// ============================================================================
// COMPONENT
// ============================================================================

export function RebalanceSchedulePanel({
  schedules,
  pendingApprovals,
  onUpdateSchedule,
  onApprove,
  onReject,
  onTriggerManual,
  isLoading = false,
}: RebalanceSchedulePanelProps) {
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<ScheduleConfig | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const activePendingApprovals = useMemo(
    () => pendingApprovals.filter((p) => p.status === 'pending_review'),
    [pendingApprovals]
  );

  const handleEditSchedule = useCallback((schedule: ScheduleConfig) => {
    setEditingSchedule(schedule.portfolioId);
    setLocalConfig({ ...schedule });
  }, []);

  const handleSaveSchedule = useCallback(async () => {
    if (!localConfig) return;

    setProcessingId(localConfig.portfolioId);
    try {
      await onUpdateSchedule(localConfig);
      setEditingSchedule(null);
      setLocalConfig(null);
    } finally {
      setProcessingId(null);
    }
  }, [localConfig, onUpdateSchedule]);

  const handleApprove = useCallback(
    async (approvalId: string) => {
      setProcessingId(approvalId);
      try {
        await onApprove(approvalId);
      } finally {
        setProcessingId(null);
      }
    },
    [onApprove]
  );

  const handleReject = useCallback(
    async (approvalId: string) => {
      setProcessingId(approvalId);
      try {
        await onReject(approvalId, rejectReason);
        setShowRejectModal(null);
        setRejectReason('');
      } finally {
        setProcessingId(null);
      }
    },
    [onReject, rejectReason]
  );

  const handleTriggerManual = useCallback(
    async (portfolioId: string) => {
      setProcessingId(portfolioId);
      try {
        await onTriggerManual(portfolioId);
      } finally {
        setProcessingId(null);
      }
    },
    [onTriggerManual]
  );

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      {activePendingApprovals.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-amber-500/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">
                Pending Approvals ({activePendingApprovals.length})
              </h2>
            </div>
          </div>

          <div className="divide-y divide-gray-800">
            {activePendingApprovals.map((approval) => (
              <div key={approval.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-medium">
                      {approval.portfolioName}
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                      Triggered by {approval.triggerType} • Expires{' '}
                      {new Date(approval.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">
                    Awaiting Approval
                  </span>
                </div>

                {/* Trade Preview */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Proposed Trades
                  </h4>
                  <div className="space-y-2">
                    {approval.trades.map((trade, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-12 px-1.5 py-0.5 text-center text-xs font-medium rounded ${
                              trade.action === 'buy'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {trade.action.toUpperCase()}
                          </span>
                          <span className="text-gray-300">
                            {trade.assetClass}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-500 dark:text-slate-400">
                            {trade.currentPercent.toFixed(1)}% →{' '}
                            {trade.targetPercent.toFixed(1)}%
                          </span>
                          <span className="text-white font-medium">
                            ${trade.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                    <span className="text-sm text-gray-400 dark:text-slate-500">
                      Total Trade Value
                    </span>
                    <span className="text-lg font-semibold text-white">
                      ${approval.totalValue.toLocaleString()}
                    </span>
                  </div>
                  {approval.estimatedTaxImpact !== undefined && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-gray-400 dark:text-slate-500">Est. Tax Impact</span>
                      <span className="text-amber-400">
                        ${approval.estimatedTaxImpact.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowRejectModal(approval.id)}
                    disabled={processingId === approval.id}
                    className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(approval.id)}
                    disabled={processingId === approval.id}
                    className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {processingId === approval.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Approve & Execute
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Configuration */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              Rebalance Schedules
            </h2>
          </div>
        </div>

        <div className="divide-y divide-gray-800">
          {schedules.map((schedule) => {
            const isEditing = editingSchedule === schedule.portfolioId;
            const config = isEditing && localConfig ? localConfig : schedule;

            return (
              <div key={schedule.portfolioId} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-medium">
                      {schedule.portfolioName}
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                      {schedule.enabled ? (
                        <>
                          {
                            FREQUENCY_OPTIONS.find(
                              (f) => f.value === schedule.frequency
                            )?.label
                          }{' '}
                          rebalancing
                          {schedule.frequency === 'weekly' &&
                            schedule.dayOfWeek !== undefined && (
                              <> on {DAY_NAMES[schedule.dayOfWeek]}</>
                            )}
                          {schedule.frequency === 'monthly' &&
                            schedule.dayOfMonth && (
                              <> on day {schedule.dayOfMonth}</>
                            )}
                        </>
                      ) : (
                        'Automatic rebalancing disabled'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTriggerManual(schedule.portfolioId)}
                      disabled={
                        processingId === schedule.portfolioId || isLoading
                      }
                      className="px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {processingId === schedule.portfolioId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Check Now'
                      )}
                    </button>
                    <button
                      onClick={() =>
                        isEditing
                          ? setEditingSchedule(null)
                          : handleEditSchedule(schedule)
                      }
                      className="p-2 text-gray-400 dark:text-slate-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Edit Form */}
                <AnimatePresence>
                  {isEditing && localConfig && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
                        {/* Enable Toggle */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {config.enabled ? (
                              <Play className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Pause className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                            )}
                            <span className="text-sm text-gray-300">
                              Enable Auto-Rebalancing
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setLocalConfig((prev) =>
                                prev
                                  ? { ...prev, enabled: !prev.enabled }
                                  : null
                              )
                            }
                            className={`w-12 h-6 rounded-full transition-colors ${
                              config.enabled ? 'bg-emerald-600' : 'bg-gray-700'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white dark:bg-slate-800 rounded-full transition-transform ${
                                config.enabled
                                  ? 'translate-x-6'
                                  : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Frequency */}
                        <div>
                          <label className="block text-sm text-gray-400 dark:text-slate-500 mb-2">
                            Frequency
                          </label>
                          <select
                            value={config.frequency}
                            onChange={(e) =>
                              setLocalConfig((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      frequency: e.target
                                        .value as ScheduleFrequency,
                                    }
                                  : null
                              )
                            }
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                          >
                            {FREQUENCY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Day Selection */}
                        {config.frequency === 'weekly' && (
                          <div>
                            <label className="block text-sm text-gray-400 dark:text-slate-500 mb-2">
                              Day of Week
                            </label>
                            <select
                              value={config.dayOfWeek ?? 0}
                              onChange={(e) =>
                                setLocalConfig((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        dayOfWeek: parseInt(e.target.value),
                                      }
                                    : null
                                )
                              }
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                            >
                              {DAY_NAMES.map((day, idx) => (
                                <option key={idx} value={idx}>
                                  {day}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {config.frequency === 'monthly' && (
                          <div>
                            <label className="block text-sm text-gray-400 dark:text-slate-500 mb-2">
                              Day of Month
                            </label>
                            <input
                              type="number"
                              value={config.dayOfMonth ?? 1}
                              onChange={(e) =>
                                setLocalConfig((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        dayOfMonth: parseInt(e.target.value),
                                      }
                                    : null
                                )
                              }
                              min="1"
                              max="28"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                            />
                          </div>
                        )}

                        {/* Drift Threshold */}
                        <div>
                          <label className="block text-sm text-gray-400 dark:text-slate-500 mb-2">
                            Drift Threshold (%)
                          </label>
                          <input
                            type="number"
                            value={config.driftThreshold}
                            onChange={(e) =>
                              setLocalConfig((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      driftThreshold: parseFloat(
                                        e.target.value
                                      ),
                                    }
                                  : null
                              )
                            }
                            min="1"
                            max="20"
                            step="0.5"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Trigger rebalancing when any asset drifts more than
                            this percentage
                          </p>
                        </div>

                        {/* Minimum Trade Amount */}
                        <div>
                          <label className="block text-sm text-gray-400 dark:text-slate-500 mb-2">
                            Minimum Trade Amount ($)
                          </label>
                          <input
                            type="number"
                            value={config.minTradeAmount}
                            onChange={(e) =>
                              setLocalConfig((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      minTradeAmount: parseFloat(
                                        e.target.value
                                      ),
                                    }
                                  : null
                              )
                            }
                            min="0"
                            step="50"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                          />
                        </div>

                        {/* Approval Setting */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-gray-300">
                              Require Approval
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setLocalConfig((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      requireApproval: !prev.requireApproval,
                                    }
                                  : null
                              )
                            }
                            className={`w-12 h-6 rounded-full transition-colors ${
                              config.requireApproval
                                ? 'bg-blue-600'
                                : 'bg-gray-700'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white dark:bg-slate-800 rounded-full transition-transform ${
                                config.requireApproval
                                  ? 'translate-x-6'
                                  : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Tax Optimized */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm text-gray-300">
                              Tax-Optimized Trades
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setLocalConfig((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      taxOptimized: !prev.taxOptimized,
                                    }
                                  : null
                              )
                            }
                            className={`w-12 h-6 rounded-full transition-colors ${
                              config.taxOptimized
                                ? 'bg-emerald-600'
                                : 'bg-gray-700'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white dark:bg-slate-800 rounded-full transition-transform ${
                                config.taxOptimized
                                  ? 'translate-x-6'
                                  : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Save/Cancel */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            onClick={() => {
                              setEditingSchedule(null);
                              setLocalConfig(null);
                            }}
                            className="px-4 py-2 text-gray-400 dark:text-slate-500 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveSchedule}
                            disabled={processingId === config.portfolioId}
                            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                          >
                            {processingId === config.portfolioId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Save Schedule
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {schedules.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Calendar className="w-12 h-12 text-gray-600 dark:text-slate-300 mx-auto mb-3" />
              <p className="text-gray-400 dark:text-slate-500">No portfolios configured</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Add a portfolio to set up automatic rebalancing
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowRejectModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Reject Rebalance
              </h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Optional reason for rejection..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none h-24"
              />
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 text-gray-400 dark:text-slate-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(showRejectModal)}
                  disabled={processingId === showRejectModal}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-500 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {processingId === showRejectModal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RebalanceSchedulePanel;
