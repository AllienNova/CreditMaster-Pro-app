"use client";

/**
 * Enhanced Watchlist Component
 *
 * Real-time watchlist with mini charts, signals, and quick actions
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MiniChart } from "../charts/MiniChart";

// ============================================================================
// TYPES
// ============================================================================

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  signal?: "buy" | "sell" | "hold";
  signalStrength?: number;
  priceHistory: { timestamp: number; value: number }[];
  alerts?: { type: string; message: string }[];
}

export interface WatchlistProps {
  items: WatchlistItem[];
  onSelect?: (symbol: string) => void;
  onRemove?: (symbol: string) => void;
  onAddAlert?: (symbol: string) => void;
  onTrade?: (symbol: string, side: "buy" | "sell") => void;
  showMiniCharts?: boolean;
  showSignals?: boolean;
  sortBy?: "symbol" | "price" | "change" | "volume" | "signal";
  sortOrder?: "asc" | "desc";
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Watchlist({
  items,
  onSelect,
  onRemove,
  onAddAlert,
  onTrade,
  showMiniCharts = true,
  showSignals = true,
  sortBy = "symbol",
  sortOrder = "asc",
  className = "",
}: WatchlistProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [currentSortBy, setCurrentSortBy] = useState(sortBy);
  const [currentSortOrder, setCurrentSortOrder] = useState(sortOrder);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const result = items.filter(
      (item) =>
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    result.sort((a, b) => {
      let comparison = 0;
      switch (currentSortBy) {
        case "symbol":
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case "price":
          comparison = a.price - b.price;
          break;
        case "change":
          comparison = a.changePercent - b.changePercent;
          break;
        case "volume":
          comparison = a.volume - b.volume;
          break;
        case "signal":
          const signalOrder = { buy: 3, hold: 2, sell: 1, undefined: 0 };
          comparison =
            (signalOrder[a.signal || "undefined"] || 0) -
            (signalOrder[b.signal || "undefined"] || 0);
          break;
      }
      return currentSortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [items, searchQuery, currentSortBy, currentSortOrder]);

  // Handle sort toggle
  const handleSort = useCallback(
    (column: typeof sortBy) => {
      if (currentSortBy === column) {
        setCurrentSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setCurrentSortBy(column);
        setCurrentSortOrder("asc");
      }
    },
    [currentSortBy],
  );

  // Handle item selection
  const handleSelect = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
      onSelect?.(symbol);
    },
    [onSelect],
  );

  return (
    <div
      className={`watchlist bg-gray-900 rounded-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">Watchlist</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none w-40"
          />
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-800/50 text-xs font-medium text-gray-400 dark:text-slate-500 uppercase">
        <button
          onClick={() => handleSort("symbol")}
          className="col-span-2 text-left hover:text-white flex items-center gap-1"
        >
          Symbol
          {currentSortBy === "symbol" && (
            <span>{currentSortOrder === "asc" ? "↑" : "↓"}</span>
          )}
        </button>
        <button
          onClick={() => handleSort("price")}
          className="col-span-2 text-right hover:text-white flex items-center justify-end gap-1"
        >
          Price
          {currentSortBy === "price" && (
            <span>{currentSortOrder === "asc" ? "↑" : "↓"}</span>
          )}
        </button>
        <button
          onClick={() => handleSort("change")}
          className="col-span-2 text-right hover:text-white flex items-center justify-end gap-1"
        >
          Change
          {currentSortBy === "change" && (
            <span>{currentSortOrder === "asc" ? "↑" : "↓"}</span>
          )}
        </button>
        {showMiniCharts && <div className="col-span-2 text-center">Chart</div>}
        {showSignals && (
          <button
            onClick={() => handleSort("signal")}
            className="col-span-2 text-center hover:text-white flex items-center justify-center gap-1"
          >
            Signal
            {currentSortBy === "signal" && (
              <span>{currentSortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        )}
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
            {searchQuery
              ? "No matching symbols found"
              : "No items in watchlist"}
          </div>
        ) : (
          filteredItems.map((item) => (
            <WatchlistRow
              key={item.symbol}
              item={item}
              isSelected={selectedSymbol === item.symbol}
              showMiniChart={showMiniCharts}
              showSignal={showSignals}
              onSelect={handleSelect}
              onRemove={onRemove}
              onAddAlert={onAddAlert}
              onTrade={onTrade}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-800/30 border-t border-gray-800 text-xs text-gray-500 dark:text-slate-400">
        {filteredItems.length} of {items.length} symbols
      </div>
    </div>
  );
}

// ============================================================================
// ROW COMPONENT
// ============================================================================

interface WatchlistRowProps {
  item: WatchlistItem;
  isSelected: boolean;
  showMiniChart: boolean;
  showSignal: boolean;
  onSelect: (symbol: string) => void;
  onRemove?: (symbol: string) => void;
  onAddAlert?: (symbol: string) => void;
  onTrade?: (symbol: string, side: "buy" | "sell") => void;
}

function WatchlistRow({
  item,
  isSelected,
  showMiniChart,
  showSignal,
  onSelect,
  onRemove,
  onAddAlert,
  onTrade,
}: WatchlistRowProps) {
  const [showActions, setShowActions] = useState(false);
  const isPositive = item.changePercent >= 0;

  return (
    <div
      className={`grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-colors ${
        isSelected ? "bg-blue-900/20" : "hover:bg-gray-800/50"
      }`}
      onClick={() => onSelect(item.symbol)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Symbol & Name */}
      <div className="col-span-2">
        <div className="font-medium text-white">{item.symbol}</div>
        <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
          {item.name}
        </div>
      </div>

      {/* Price */}
      <div className="col-span-2 text-right">
        <div className="font-medium text-white">${item.price.toFixed(2)}</div>
        <div className="text-xs text-gray-500 dark:text-slate-400">
          Vol: {formatVolume(item.volume)}
        </div>
      </div>

      {/* Change */}
      <div className="col-span-2 text-right">
        <div
          className={`font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}
        >
          {isPositive ? "+" : ""}
          {item.change.toFixed(2)}
        </div>
        <div
          className={`text-xs ${isPositive ? "text-green-400/70" : "text-red-400/70"}`}
        >
          {isPositive ? "+" : ""}
          {item.changePercent.toFixed(2)}%
        </div>
      </div>

      {/* Mini Chart */}
      {showMiniChart && (
        <div className="col-span-2 flex justify-center">
          <MiniChart
            data={item.priceHistory}
            width={80}
            height={30}
            type="area"
            showChange={false}
          />
        </div>
      )}

      {/* Signal */}
      {showSignal && (
        <div className="col-span-2 flex justify-center">
          {item.signal && (
            <SignalBadge signal={item.signal} strength={item.signalStrength} />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="col-span-2 flex justify-end gap-1">
        {showActions ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTrade?.(item.symbol, "buy");
              }}
              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
            >
              Buy
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTrade?.(item.symbol, "sell");
              }}
              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Sell
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.(item.symbol);
              }}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
              title="Remove"
            ></button>
          </>
        ) : (
          item.alerts &&
          item.alerts.length > 0 && (
            <span className="px-2 py-1 text-xs bg-yellow-600/20 text-yellow-400 rounded">
              {item.alerts.length} alert{item.alerts.length > 1 ? "s" : ""}
            </span>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SIGNAL BADGE
// ============================================================================

function SignalBadge({
  signal,
  strength,
}: {
  signal: "buy" | "sell" | "hold";
  strength?: number;
}) {
  const colors = {
    buy: "bg-green-600/20 text-green-400 border-green-500/30",
    sell: "bg-red-600/20 text-red-400 border-red-500/30",
    hold: "bg-gray-600/20 text-gray-400 dark:text-slate-500 border-gray-500/30",
  };

  const icons = {
    buy: "▲",
    sell: "▼",
    hold: "●",
  };

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded border ${colors[signal]}`}
    >
      <span className="text-xs">{icons[signal]}</span>
      <span className="text-xs font-medium uppercase">{signal}</span>
      {strength !== undefined && (
        <span className="text-xs opacity-70">({strength}%)</span>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatVolume(volume: number): string {
  if (volume >= 1e9) return (volume / 1e9).toFixed(1) + "B";
  if (volume >= 1e6) return (volume / 1e6).toFixed(1) + "M";
  if (volume >= 1e3) return (volume / 1e3).toFixed(1) + "K";
  return volume.toString();
}

export default Watchlist;
