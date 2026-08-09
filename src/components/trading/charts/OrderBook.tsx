"use client";

/**
 * Order Book
 *
 * Ladder-style order book with bids (green) on the left and asks (red)
 * on the right. Each row shows price, size, and cumulative total.
 * A depth bar behind each row conveys cumulative volume visually.
 * framer-motion layout animations provide smooth row updates.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookProps {
  bids: OrderLevel[];
  asks: OrderLevel[];
  lastPrice?: number;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_LEVELS = 15;

// ============================================================================
// HELPERS
// ============================================================================

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSize(size: number): string {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(2)}M`;
  if (size >= 1_000) return `${(size / 1_000).toFixed(2)}K`;
  return size.toFixed(4);
}

// ============================================================================
// ROW SUBCOMPONENT
// ============================================================================

interface OrderRowProps {
  level: OrderLevel;
  maxTotal: number;
  side: "bid" | "ask";
}

function OrderRow({ level, maxTotal, side }: OrderRowProps) {
  const depthPct = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;
  const isBid = side === "bid";

  return (
    <motion.div
      layout
      className="relative flex items-center h-5 text-xs select-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Depth bar */}
      <div
        className={`absolute inset-y-0 ${isBid ? "right-0" : "left-0"} ${isBid ? "bg-emerald-900/40" : "bg-red-900/40"}`}
        style={{ width: `${depthPct}%` }}
      />

      {/* Content */}
      {isBid ? (
        <div className="relative z-10 flex w-full justify-between px-2">
          <span className="text-gray-400 tabular-nums">{formatSize(level.total)}</span>
          <span className="text-gray-400 tabular-nums">{formatSize(level.size)}</span>
          <span className="text-emerald-400 font-medium tabular-nums">{formatPrice(level.price)}</span>
        </div>
      ) : (
        <div className="relative z-10 flex w-full justify-between px-2">
          <span className="text-red-400 font-medium tabular-nums">{formatPrice(level.price)}</span>
          <span className="text-gray-400 tabular-nums">{formatSize(level.size)}</span>
          <span className="text-gray-400 tabular-nums">{formatSize(level.total)}</span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OrderBook({ bids, asks, lastPrice, className = "" }: OrderBookProps) {
  const visibleBids = bids.slice(0, MAX_LEVELS);
  const visibleAsks = asks.slice(0, MAX_LEVELS);

  const maxBidTotal = visibleBids.length > 0 ? visibleBids[visibleBids.length - 1].total : 0;
  const maxAskTotal = visibleAsks.length > 0 ? visibleAsks[visibleAsks.length - 1].total : 0;

  // Spread between best ask and best bid
  const bestAsk = visibleAsks[0]?.price;
  const bestBid = visibleBids[0]?.price;
  const spread = bestAsk !== undefined && bestBid !== undefined ? bestAsk - bestBid : null;
  const spreadPct =
    spread !== null && bestBid ? ((spread / bestBid) * 100).toFixed(3) : null;

  return (
    <div className={`flex flex-col bg-gray-900 rounded border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex justify-between px-2 py-1 border-b border-gray-700">
        <div className="flex w-1/2 justify-between pr-2">
          <span className="text-xs text-gray-500">Total</span>
          <span className="text-xs text-gray-500">Size</span>
          <span className="text-xs text-emerald-500">Bid</span>
        </div>
        <div className="flex w-1/2 justify-between pl-2">
          <span className="text-xs text-red-500">Ask</span>
          <span className="text-xs text-gray-500">Size</span>
          <span className="text-xs text-gray-500">Total</span>
        </div>
      </div>

      {/* Order rows */}
      <div className="flex flex-1">
        {/* Bids (left column) */}
        <div className="flex flex-col flex-1 border-r border-gray-700">
          <AnimatePresence initial={false}>
            {visibleBids.map((level) => (
              <OrderRow
                key={level.price}
                level={level}
                maxTotal={maxBidTotal}
                side="bid"
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Asks (right column) */}
        <div className="flex flex-col flex-1">
          <AnimatePresence initial={false}>
            {visibleAsks.map((level) => (
              <OrderRow
                key={level.price}
                level={level}
                maxTotal={maxAskTotal}
                side="ask"
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Spread + last price footer */}
      <div className="flex items-center justify-between px-2 py-1 border-t border-gray-700">
        {lastPrice !== undefined && (
          <span className="text-xs font-semibold text-white tabular-nums">
            {formatPrice(lastPrice)}
          </span>
        )}
        {spread !== null && (
          <span className="text-xs text-gray-500 tabular-nums">
            Spread: {formatPrice(spread)} ({spreadPct}%)
          </span>
        )}
      </div>
    </div>
  );
}

export default OrderBook;
