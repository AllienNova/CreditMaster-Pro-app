"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowTrendingUpIcon as TrendingUp,
  ArrowTrendingDownIcon as TrendingDown,
  ChartBarIcon as Activity,
  ExclamationTriangleIcon as AlertTriangle,
  ShieldCheckIcon as Shield,
  BoltIcon as Zap,
  ArrowPathIcon as RefreshCw,
  Cog6ToothIcon as Settings,
  BellIcon as Bell,
  PlusIcon as Plus,
  XMarkIcon as X,
  ClockIcon as Clock,
  CurrencyDollarIcon as DollarSign,
  ArrowUpRightIcon as ArrowUpRight,
  ArrowDownRightIcon as ArrowDownRight,
} from "@heroicons/react/24/outline";

// ============================================================================
// TYPES
// ============================================================================

interface Position {
  id: string;
  symbol: string;
  side: "long" | "short";
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  marketValue: number;
}

interface Order {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: string;
  quantity: number;
  limitPrice?: number;
  status: string;
  createdAt: string;
}

interface Signal {
  id: string;
  symbol: string;
  side: "long" | "short";
  source: string;
  confidence: number;
  entryPrice?: number;
  stopLoss?: number;
  targets?: number[];
}

interface RiskMetrics {
  portfolioHeat: number;
  maxHeat: number;
  heatUtilization: number;
  currentDrawdown: number;
  dailyPL: number;
  dailyPLPercent: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  canTrade: boolean;
  blockReasons: string[];
  killSwitch: { active: boolean; reason?: string };
}

// ============================================================================
// TRADING DASHBOARD PAGE
// ============================================================================

export default function TradingDashboardPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "positions" | "orders" | "signals"
  >("positions");

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [posRes, ordRes, sigRes, riskRes] = await Promise.all([
        fetch("/api/trading/positions"),
        fetch("/api/trading/orders"),
        fetch("/api/trading/signals?action=active"),
        fetch("/api/trading/risk?action=metrics"),
      ]);

      if (posRes.ok) {
        const posData = await posRes.json();
        setPositions(posData.data?.openPositions || []);
      }

      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData.data?.openOrders || []);
      }

      if (sigRes.ok) {
        const sigData = await sigRes.json();
        setSignals(sigData.data?.signals || []);
      }

      if (riskRes.ok) {
        const riskData = await riskRes.json();
        setRiskMetrics(riskData.data);
      }
    } catch (_error) {
      // TradingDashboard error: Failed to fetch trading data
      void _error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate totals
  const totalUnrealizedPL = positions.reduce(
    (sum, p) => sum + p.unrealizedPL,
    0,
  );
  const totalMarketValue = positions.reduce((sum, p) => sum + p.marketValue, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Trading Dashboard
            </h1>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-full">
              Live
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Refresh data"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-5 h-5 text-gray-600 dark:text-slate-400 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors relative"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-slate-400" />
              {signals.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {signals.length}
                </span>
              )}
            </button>
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Risk Banner */}
        {riskMetrics && !riskMetrics.canTrade && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300">
                  Trading Restricted
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {riskMetrics.blockReasons.join(". ")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Portfolio Value */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Portfolio Value
              </span>
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              $
              {totalMarketValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {positions.length} positions
            </p>
          </div>

          {/* Unrealized P&L */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Unrealized P&L
              </span>
              {totalUnrealizedPL >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-green-500" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p
              className={`text-2xl font-bold ${totalUnrealizedPL >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {totalUnrealizedPL >= 0 ? "+" : ""}$
              {totalUnrealizedPL.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Today&apos;s P&L:{" "}
              {riskMetrics
                ? `${riskMetrics.dailyPL >= 0 ? "+" : ""}$${riskMetrics.dailyPL.toFixed(2)}`
                : "--"}
            </p>
          </div>

          {/* Risk Heat */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Portfolio Heat
              </span>
              <Shield
                className={`w-5 h-5 ${
                  riskMetrics?.riskLevel === "critical"
                    ? "text-red-500"
                    : riskMetrics?.riskLevel === "high"
                      ? "text-orange-500"
                      : riskMetrics?.riskLevel === "medium"
                        ? "text-yellow-500"
                        : "text-green-500"
                }`}
              />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {riskMetrics
                ? `${(riskMetrics.heatUtilization * 100).toFixed(1)}%`
                : "--"}
            </p>
            {/* Dynamic width requires inline style - Tailwind cannot handle runtime percentages */}
            <div className="mt-2 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  (riskMetrics?.heatUtilization || 0) > 0.8
                    ? "bg-red-500"
                    : (riskMetrics?.heatUtilization || 0) > 0.6
                      ? "bg-orange-500"
                      : (riskMetrics?.heatUtilization || 0) > 0.4
                        ? "bg-yellow-500"
                        : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min((riskMetrics?.heatUtilization || 0) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Active Signals */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Active Signals
              </span>
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {signals.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {signals.filter((s) => s.confidence > 0.8).length} high confidence
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Positions/Orders/Signals */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-4">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab("positions")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "positions" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"}`}
                  >
                    Positions ({positions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "orders" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"}`}
                  >
                    Orders ({orders.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("signals")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "signals" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"}`}
                  >
                    Signals ({signals.length})
                  </button>
                </div>
                <button
                  onClick={() => setShowOrderEntry(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  New Order
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === "positions" && (
                  <PositionsTable positions={positions} />
                )}
                {activeTab === "orders" && <OrdersTable orders={orders} />}
                {activeTab === "signals" && <SignalsTable signals={signals} />}
              </div>
            </div>
          </div>

          {/* Right Column - Risk & Quick Actions */}
          <div className="space-y-6">
            {/* Risk Monitor */}
            <RiskMonitor metrics={riskMetrics} />

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <button
                  aria-label="Close all positions"
                  title="Close all positions"
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Close All Positions
                  </span>
                  <X className="w-4 h-4 text-gray-500 dark:text-slate-400" aria-hidden="true" />
                </button>
                <button
                  aria-label="Cancel all orders"
                  title="Cancel all orders"
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Cancel All Orders
                  </span>
                  <X className="w-4 h-4 text-gray-500 dark:text-slate-400" aria-hidden="true" />
                </button>
                <button
                  aria-label="Activate kill switch"
                  title="Activate kill switch"
                  className="w-full flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    Activate Kill Switch
                  </span>
                  <AlertTriangle className="w-4 h-4 text-red-500" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Top Signal */}
            {signals.length > 0 && (
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5" />
                  <span className="text-sm font-medium opacity-90">
                    Top Signal
                  </span>
                </div>
                <p className="text-2xl font-bold">{signals[0].symbol}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      signals[0].side === "long"
                        ? "bg-green-500/30"
                        : "bg-red-500/30"
                    }`}
                  >
                    {signals[0].side.toUpperCase()}
                  </span>
                  <span className="text-sm opacity-90">
                    {(signals[0].confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <button
                  aria-label="Execute trade"
                  title="Execute trade"
                  className="w-full mt-4 py-2 bg-white hover:bg-white dark:bg-slate-800/30 rounded-lg text-sm font-medium transition-colors"
                >
                  Execute Trade
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Entry Modal */}
      {showOrderEntry && (
        <OrderEntryModal
          symbol={selectedSymbol}
          onClose={() => setShowOrderEntry(false)}
          onSubmit={fetchData}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PositionsTable({ positions }: { positions: Position[] }) {
  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-slate-400">No open positions</p>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
          Create a new order to open a position
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 dark:text-slate-400">
            <th className="pb-3 font-medium">Symbol</th>
            <th className="pb-3 font-medium">Side</th>
            <th className="pb-3 font-medium text-right">Qty</th>
            <th className="pb-3 font-medium text-right">Entry</th>
            <th className="pb-3 font-medium text-right">Current</th>
            <th className="pb-3 font-medium text-right">P&L</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {positions.map((position) => (
            <tr key={position.id} className="text-sm">
              <td className="py-3 font-medium text-gray-900 dark:text-white">
                {position.symbol}
              </td>
              <td className="py-3">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${position.side === "long" ? "bg-green-100 text-green-700" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}
                >
                  {position.side === "long" ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {position.side.toUpperCase()}
                </span>
              </td>
              <td className="py-3 text-right text-gray-700 dark:text-slate-300">
                {position.quantity}
              </td>
              <td className="py-3 text-right text-gray-700 dark:text-slate-300">
                ${position.avgEntryPrice.toFixed(2)}
              </td>
              <td className="py-3 text-right text-gray-700 dark:text-slate-300">
                ${position.currentPrice.toFixed(2)}
              </td>
              <td
                className={`py-3 text-right font-medium ${position.unrealizedPL >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {position.unrealizedPL >= 0 ? "+" : ""}$
                {position.unrealizedPL.toFixed(2)}
                <span className="text-xs ml-1">
                  ({position.unrealizedPLPercent >= 0 ? "+" : ""}
                  {(position.unrealizedPLPercent * 100).toFixed(2)}%)
                </span>
              </td>
              <td className="py-3 text-right">
                <button
                  aria-label={`Close ${position.symbol} position`}
                  title={`Close ${position.symbol} position`}
                  className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  Close
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-slate-400">No open orders</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 dark:text-slate-400">
            <th className="pb-3 font-medium">Symbol</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Side</th>
            <th className="pb-3 font-medium text-right">Qty</th>
            <th className="pb-3 font-medium text-right">Price</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {orders.map((order) => (
            <tr key={order.id} className="text-sm">
              <td className="py-3 font-medium text-gray-900 dark:text-white">
                {order.symbol}
              </td>
              <td className="py-3 text-gray-700 dark:text-slate-300 capitalize">
                {order.type}
              </td>
              <td className="py-3">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${order.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}
                >
                  {order.side.toUpperCase()}
                </span>
              </td>
              <td className="py-3 text-right text-gray-700 dark:text-slate-300">
                {order.quantity}
              </td>
              <td className="py-3 text-right text-gray-700 dark:text-slate-300">
                {order.limitPrice
                  ? `$${order.limitPrice.toFixed(2)}`
                  : "Market"}
              </td>
              <td className="py-3">
                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium capitalize">
                  {order.status}
                </span>
              </td>
              <td className="py-3 text-right">
                <button
                  aria-label={`Cancel ${order.symbol} order`}
                  title={`Cancel ${order.symbol} order`}
                  className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SignalsTable({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return (
      <div className="text-center py-12">
        <Zap className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-slate-400">No active signals</p>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
          Signals will appear when trading opportunities are detected
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {signals.map((signal) => (
        <div
          key={signal.id}
          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${signal.side === "long" ? "bg-green-100" : "bg-red-100 dark:bg-red-900/30"}`}
            >
              {signal.side === "long" ? (
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {signal.symbol}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${signal.side === "long" ? "bg-green-100 text-green-700" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}
                >
                  {signal.side.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                  {signal.source.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Entry: ${signal.entryPrice?.toFixed(2) || "--"} | SL: $
                {signal.stopLoss?.toFixed(2) || "--"} | TP: $
                {signal.targets?.[0]?.toFixed(2) || "--"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {(signal.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                Confidence
              </div>
            </div>
            <button
              aria-label={`Trade ${signal.symbol}`}
              title={`Trade ${signal.symbol}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Trade
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskMonitor({ metrics }: { metrics: RiskMetrics | null }) {
  if (!metrics) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Risk Monitor
        </h2>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  const riskColor = {
    low: "text-green-600 bg-green-100 dark:bg-green-900/30",
    medium: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
    high: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
    critical: "text-red-600 bg-red-100 dark:bg-red-900/30",
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Risk Monitor
        </h2>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${riskColor[metrics.riskLevel]}`}
        >
          {metrics.riskLevel.toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        {/* Portfolio Heat */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-slate-400">
              Portfolio Heat
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {(metrics.portfolioHeat * 100).toFixed(1)}% /{" "}
              {(metrics.maxHeat * 100).toFixed(0)}%
            </span>
          </div>
          {/* Dynamic width requires inline style - Tailwind cannot handle runtime percentages */}
          <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                metrics.heatUtilization > 0.8
                  ? "bg-red-500"
                  : metrics.heatUtilization > 0.6
                    ? "bg-orange-500"
                    : "bg-green-500"
              }`}
              style={{
                width: `${Math.min(metrics.heatUtilization * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Drawdown */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-slate-400">
              Current Drawdown
            </span>
            <span
              className={`font-medium ${metrics.currentDrawdown > 0.05 ? "text-red-600" : "text-gray-900 dark:text-white"}`}
            >
              {(metrics.currentDrawdown * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Daily P&L */}
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-slate-400">Daily P&L</span>
            <span
              className={`font-medium ${metrics.dailyPL >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {metrics.dailyPL >= 0 ? "+" : ""}${metrics.dailyPL.toFixed(2)} (
              {metrics.dailyPLPercent >= 0 ? "+" : ""}
              {(metrics.dailyPLPercent * 100).toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Kill Switch */}
        {metrics.killSwitch.active && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Kill Switch Active</span>
            </div>
            {metrics.killSwitch.reason && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {metrics.killSwitch.reason}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderEntryModal({
  symbol,
  onClose,
  onSubmit,
}: {
  symbol: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [orderSymbol, setOrderSymbol] = useState(symbol);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("limit");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/trading/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          symbol: orderSymbol,
          side,
          type: orderType,
          quantity: Number.parseFloat(quantity),
          limitPrice:
            orderType === "limit" ? Number.parseFloat(price) : undefined,
          stopLossPrice: stopLoss ? Number.parseFloat(stopLoss) : undefined,
          takeProfitPrice: takeProfit
            ? Number.parseFloat(takeProfit)
            : undefined,
          timeInForce: "day",
        }),
      });

      if (response.ok) {
        onSubmit();
        onClose();
      }
    } catch (_error) {
      // OrderEntryModal error: Failed to create order
      void _error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            New Order
          </h2>
          <button
            onClick={onClose}
            aria-label="Close order entry modal"
            title="Close"
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Symbol
            </label>
            <input
              type="text"
              value={orderSymbol}
              onChange={(e) => setOrderSymbol(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="AAPL"
              required
            />
          </div>

          {/* Side */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Side
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide("buy")}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  side === "buy"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setSide("sell")}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  side === "sell"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Order Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType("market")}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  orderType === "market"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => setOrderType("limit")}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  orderType === "limit"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                }`}
              >
                Limit
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="100"
              min="1"
              required
            />
          </div>

          {/* Price (for limit orders) */}
          {orderType === "limit" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Limit Price
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="150.00"
                step="0.01"
                required
              />
            </div>
          )}

          {/* Stop Loss */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Stop Loss (optional)
            </label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="145.00"
              step="0.01"
            />
          </div>

          {/* Take Profit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Take Profit (optional)
            </label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="160.00"
              step="0.01"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
              side === "buy"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting
              ? "Submitting..."
              : `${side === "buy" ? "Buy" : "Sell"} ${orderSymbol}`}
          </button>
        </form>
      </div>
    </div>
  );
}
