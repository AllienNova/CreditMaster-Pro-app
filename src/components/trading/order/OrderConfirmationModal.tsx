"use client";

/**
 * Order Confirmation Modal
 *
 * Displays order confirmation with real-time price updates,
 * estimated costs, and execution controls.
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderDetails {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  type: "market" | "limit" | "stop" | "stop_limit";
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: "day" | "gtc" | "ioc" | "fok";
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

export interface LivePrice {
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  spreadPercent: number;
  lastUpdate: Date;
}

export interface OrderConfirmationModalProps {
  isOpen: boolean;
  order: OrderDetails;
  livePrice?: LivePrice;
  isLoadingPrice?: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onRefreshPrice?: () => void;
  accountBalance?: number;
  buyingPower?: number;
}

type ConfirmationState = "preview" | "confirming" | "success" | "error";

// ============================================================================
// COMPONENT
// ============================================================================

export function OrderConfirmationModal({
  isOpen,
  order,
  livePrice,
  isLoadingPrice = false,
  onConfirm,
  onCancel,
  onRefreshPrice,
  accountBalance,
  buyingPower,
}: OrderConfirmationModalProps) {
  const [state, setState] = useState<ConfirmationState>("preview");
  const [error, setError] = useState<string | null>(null);
  const [priceAtConfirm, setPriceAtConfirm] = useState<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState("preview");
      setError(null);
      setPriceAtConfirm(null);
    }
  }, [isOpen]);

  // Calculate estimated values
  const estimatedPrice = order.limitPrice || livePrice?.mid || 0;
  const estimatedTotal = estimatedPrice * order.quantity;
  const executionPrice = order.side === "buy" ? livePrice?.ask : livePrice?.bid;
  const marketImpact =
    executionPrice && estimatedPrice
      ? ((executionPrice - estimatedPrice) / estimatedPrice) * 100
      : 0;

  // Check if price has moved significantly since confirmation started
  const priceDeviation =
    priceAtConfirm && livePrice
      ? Math.abs((livePrice.mid - priceAtConfirm) / priceAtConfirm) * 100
      : 0;
  const priceWarning = priceDeviation > 0.5; // 0.5% threshold

  const handleConfirm = useCallback(async () => {
    setState("confirming");
    setPriceAtConfirm(livePrice?.mid || null);
    setError(null);

    try {
      await onConfirm();
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Order execution failed");
    }
  }, [onConfirm, livePrice?.mid]);

  const handleClose = useCallback(() => {
    if (state !== "confirming") {
      onCancel();
    }
  }, [state, onCancel]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md mx-4 bg-gray-900 rounded-xl shadow-xl border border-gray-800 overflow-hidden"
        >
          {/* Header */}
          <div
            className={`px-6 py-4 border-b border-gray-800 ${
              order.side === "buy" ? "bg-emerald-500/10" : "bg-red-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {order.side === "buy" ? (
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {order.side === "buy" ? "Buy" : "Sell"} {order.symbol}
                  </h2>
                  <p className="text-sm text-gray-400 dark:text-slate-500">
                    {order.type.replace("_", " ").toUpperCase()} Order
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={state === "confirming"}
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Live Price Display */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400 dark:text-slate-500">
                  Live Market Price
                </span>
                <div className="flex items-center gap-2">
                  {isLoadingPrice ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4 text-emerald-400" />
                  )}
                  {onRefreshPrice && (
                    <button
                      onClick={onRefreshPrice}
                      disabled={isLoadingPrice}
                      className="p-1 text-gray-400 dark:text-slate-500 hover:text-white rounded transition-colors"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isLoadingPrice ? "animate-spin" : ""}`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {livePrice ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                      Bid
                    </p>
                    <p className="text-lg font-mono text-red-400">
                      ${livePrice.bid.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                      Mid
                    </p>
                    <p className="text-lg font-mono text-white">
                      ${livePrice.mid.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                      Ask
                    </p>
                    <p className="text-lg font-mono text-emerald-400">
                      ${livePrice.ask.toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-gray-500 dark:text-slate-400">
                    Price unavailable
                  </p>
                </div>
              )}

              {livePrice && (
                <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>
                    Spread: ${livePrice.spread.toFixed(2)} (
                    {livePrice.spreadPercent.toFixed(2)}%)
                  </span>
                  <span>
                    Updated: {livePrice.lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {/* Order Details */}
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400 dark:text-slate-500">
                  Quantity
                </span>
                <span className="text-white font-medium">
                  {order.quantity} shares
                </span>
              </div>

              {order.limitPrice && (
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400 dark:text-slate-500">
                    Limit Price
                  </span>
                  <span className="text-white font-medium">
                    ${order.limitPrice.toFixed(2)}
                  </span>
                </div>
              )}

              {order.stopPrice && (
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400 dark:text-slate-500">
                    Stop Price
                  </span>
                  <span className="text-white font-medium">
                    ${order.stopPrice.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400 dark:text-slate-500">
                  Time in Force
                </span>
                <span className="text-white font-medium">
                  {order.timeInForce.toUpperCase()}
                </span>
              </div>

              {order.takeProfitPrice && (
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400 dark:text-slate-500">
                    Take Profit
                  </span>
                  <span className="text-emerald-400 font-medium">
                    ${order.takeProfitPrice.toFixed(2)}
                  </span>
                </div>
              )}

              {order.stopLossPrice && (
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400 dark:text-slate-500">
                    Stop Loss
                  </span>
                  <span className="text-red-400 font-medium">
                    ${order.stopLossPrice.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-3 bg-gray-800/50 rounded-lg px-3 mt-4">
                <span className="text-gray-300 font-medium">
                  Estimated Total
                </span>
                <span className="text-xl font-bold text-white">
                  $
                  {estimatedTotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Warnings */}
            {priceWarning && state === "preview" && (
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-500">
                    Price Movement Detected
                  </p>
                  <p className="text-xs text-yellow-500/70">
                    Price has moved {priceDeviation.toFixed(2)}% since you
                    started. Review before confirming.
                  </p>
                </div>
              </div>
            )}

            {buyingPower !== undefined &&
              estimatedTotal > buyingPower &&
              order.side === "buy" && (
                <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-500">
                      Insufficient Buying Power
                    </p>
                    <p className="text-xs text-red-500/70">
                      You need ${estimatedTotal.toFixed(2)} but only have $
                      {buyingPower.toFixed(2)} available.
                    </p>
                  </div>
                </div>
              )}

            {/* Status Messages */}
            {state === "success" && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                <div>
                  <p className="font-medium text-emerald-500">
                    Order Submitted Successfully
                  </p>
                  <p className="text-sm text-emerald-500/70">
                    Your order is being processed.
                  </p>
                </div>
              </div>
            )}

            {state === "error" && error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <p className="font-medium text-red-500">Order Failed</p>
                  <p className="text-sm text-red-500/70">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-800">
            {state === "preview" && (
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={
                    isLoadingPrice ||
                    (buyingPower !== undefined &&
                      estimatedTotal > buyingPower &&
                      order.side === "buy")
                  }
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    order.side === "buy"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                  Confirm {order.side === "buy" ? "Buy" : "Sell"}
                </button>
              </div>
            )}

            {state === "confirming" && (
              <div className="flex items-center justify-center gap-3 py-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-gray-300">Processing order...</span>
              </div>
            )}

            {(state === "success" || state === "error") && (
              <button
                onClick={handleClose}
                className="w-full px-4 py-3 text-white bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default OrderConfirmationModal;
