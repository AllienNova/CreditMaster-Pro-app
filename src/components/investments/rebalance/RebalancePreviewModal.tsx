"use client";

/**
 * Rebalance Preview Modal
 *
 * Shows detailed preview of proposed rebalancing trades with
 * before/after allocation visualization and execution confirmation.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type AssetClass = string;

export interface AllocationItem {
  assetClass: AssetClass;
  label: string;
  color: string;
  currentPercent: number;
  currentValue: number;
  targetPercent: number;
  targetValue: number;
}

export interface RebalanceTrade {
  assetClass: AssetClass;
  label: string;
  action: "buy" | "sell";
  amount: number;
  shares?: number;
  currentValue: number;
  targetValue: number;
  percentChange: number;
}

export interface TaxImpact {
  shortTermGains: number;
  longTermGains: number;
  estimatedTax: number;
  taxLossHarvestingOpportunity?: number;
}

export interface RebalancePreview {
  portfolioId: string;
  portfolioName: string;
  totalValue: number;
  allocations: AllocationItem[];
  trades: RebalanceTrade[];
  totalTradeValue: number;
  estimatedCommission: number;
  taxImpact?: TaxImpact;
  warnings?: string[];
}

export interface RebalancePreviewModalProps {
  isOpen: boolean;
  preview: RebalancePreview;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isExecuting?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RebalancePreviewModal({
  isOpen,
  preview,
  onConfirm,
  onCancel,
  isExecuting = false,
}: RebalancePreviewModalProps) {
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const sellTrades = useMemo(
    () => preview.trades.filter((t) => t.action === "sell"),
    [preview.trades],
  );

  const buyTrades = useMemo(
    () => preview.trades.filter((t) => t.action === "buy"),
    [preview.trades],
  );

  const totalSells = useMemo(
    () => sellTrades.reduce((sum, t) => sum + t.amount, 0),
    [sellTrades],
  );

  const totalBuys = useMemo(
    () => buyTrades.reduce((sum, t) => sum + t.amount, 0),
    [buyTrades],
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onCancel}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-gray-900 rounded-xl shadow-xl border border-gray-800 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Rebalance Preview
              </h2>
              <p className="text-sm text-gray-400 dark:text-slate-500">
                {preview.portfolioName}
              </p>
            </div>
            <button
              onClick={onCancel}
              disabled={isExecuting}
              className="p-2 text-gray-400 dark:text-slate-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Allocation Comparison */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-4">
                Allocation Changes
              </h3>
              <div className="space-y-3">
                {preview.allocations.map((item) => {
                  const change = item.targetPercent - item.currentPercent;
                  return (
                    <div
                      key={item.assetClass}
                      className="bg-gray-800/50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-gray-300">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium ${
                              change > 0
                                ? "text-emerald-400"
                                : change < 0
                                  ? "text-red-400"
                                  : "text-gray-500 dark:text-slate-400"
                            }`}
                          >
                            {change > 0 ? "+" : ""}
                            {change.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bars */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                            <span>Current</span>
                            <span>{item.currentPercent.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full opacity-60"
                              style={{
                                width: `${item.currentPercent}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-600 dark:text-slate-300 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                            <span>Target</span>
                            <span>{item.targetPercent.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${item.targetPercent}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trades */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-4">
                Proposed Trades
              </h3>

              {/* Sells */}
              {sellTrades.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400 font-medium">
                      Sell Orders
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      (${totalSells.toLocaleString()} total)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sellTrades.map((trade, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-white">{trade.label}</p>
                          {trade.shares && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {trade.shares} shares
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-400">
                            -${trade.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {trade.percentChange.toFixed(1)}% of position
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buys */}
              {buyTrades.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400 font-medium">
                      Buy Orders
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      (${totalBuys.toLocaleString()} total)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {buyTrades.map((trade, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-white">{trade.label}</p>
                          {trade.shares && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {trade.shares} shares
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-emerald-400">
                            +${trade.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {trade.percentChange.toFixed(1)}% increase
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tax Impact */}
            {preview.taxImpact && (
              <div>
                <button
                  onClick={() => setShowTaxDetails(!showTaxDetails)}
                  className="w-full flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">
                        Estimated Tax Impact
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        ~${preview.taxImpact.estimatedTax.toLocaleString()} in
                        taxes
                      </p>
                    </div>
                  </div>
                  {showTaxDetails ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                  )}
                </button>

                <AnimatePresence>
                  {showTaxDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 p-4 bg-gray-800/50 rounded-lg space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 dark:text-slate-500">
                            Short-term gains
                          </span>
                          <span className="text-white">
                            ${preview.taxImpact.shortTermGains.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 dark:text-slate-500">
                            Long-term gains
                          </span>
                          <span className="text-white">
                            ${preview.taxImpact.longTermGains.toLocaleString()}
                          </span>
                        </div>
                        {preview.taxImpact.taxLossHarvestingOpportunity && (
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>Tax-loss harvesting opportunity</span>
                            <span>
                              -$
                              {preview.taxImpact.taxLossHarvestingOpportunity.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Warnings */}
            {preview.warnings && preview.warnings.length > 0 && (
              <div className="space-y-2">
                {preview.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                  >
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-200">{warning}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 dark:text-slate-500">
                  Portfolio Value
                </span>
                <span className="text-white font-medium">
                  ${preview.totalValue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 dark:text-slate-500">
                  Total Trade Value
                </span>
                <span className="text-white font-medium">
                  ${preview.totalTradeValue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 dark:text-slate-500">
                  Estimated Commission
                </span>
                <span className="text-white">
                  ${preview.estimatedCommission.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex items-center justify-between">
                <span className="text-gray-300 font-medium">
                  Number of Trades
                </span>
                <span className="text-white font-medium">
                  {preview.trades.length}
                </span>
              </div>
            </div>

            {/* Acknowledgment */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-400 dark:text-slate-500">
                I understand that market conditions may cause actual execution
                prices to differ from estimates. Orders will be executed at the
                best available market prices.
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <Info className="w-4 h-4" />
              <span>Trades will execute at market prices</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                disabled={isExecuting}
                className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={!acknowledged || isExecuting}
                className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Execute Rebalance
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default RebalancePreviewModal;
