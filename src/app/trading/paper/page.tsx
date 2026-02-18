"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  RefreshCw,
  Plus,
  History,
  BarChart3,
  Target,
  DollarSign,
  Percent,
  Clock,
  X,
  Check,
} from "lucide-react";

interface PaperAccount {
  id: string;
  name: string;
  cashBalance: number;
  portfolioValue: number;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
}

interface PaperPosition {
  id: string;
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  side: "long" | "short";
}

interface PaperOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: string;
  quantity: number;
  price?: number;
  status: string;
  createdAt: Date;
}

interface OrderFormData {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  quantity: number;
  limitPrice?: number;
}

const MOCK_ACCOUNT: PaperAccount = {
  id: "1",
  name: "Paper Trading Account",
  cashBalance: 85432.5,
  portfolioValue: 14567.5,
  totalValue: 100000,
  dayChange: 1234.56,
  dayChangePercent: 1.25,
};

const MOCK_POSITIONS: PaperPosition[] = [
  {
    id: "1",
    symbol: "AAPL",
    quantity: 50,
    avgEntryPrice: 175.0,
    currentPrice: 182.5,
    marketValue: 9125.0,
    unrealizedPL: 375.0,
    unrealizedPLPercent: 4.29,
    side: "long",
  },
  {
    id: "2",
    symbol: "MSFT",
    quantity: 15,
    avgEntryPrice: 380.0,
    currentPrice: 362.83,
    marketValue: 5442.5,
    unrealizedPL: -257.5,
    unrealizedPLPercent: -4.51,
    side: "long",
  },
];

const MOCK_ORDERS: PaperOrder[] = [
  {
    id: "1",
    symbol: "NVDA",
    side: "buy",
    type: "limit",
    quantity: 10,
    price: 850.0,
    status: "pending",
    createdAt: new Date(),
  },
];

export default function PaperTradingPage() {
  const [account, setAccount] = useState<PaperAccount>(MOCK_ACCOUNT);
  const [positions, setPositions] = useState<PaperPosition[]>(MOCK_POSITIONS);
  const [orders, setOrders] = useState<PaperOrder[]>(MOCK_ORDERS);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "positions" | "orders" | "history"
  >("positions");
  const [isResetting, setIsResetting] = useState(false);

  const [orderForm, setOrderForm] = useState<OrderFormData>({
    symbol: "",
    side: "buy",
    type: "market",
    quantity: 1,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const handlePlaceOrder = async () => {
    // Simulate order placement
    const newOrder: PaperOrder = {
      id: Date.now().toString(),
      symbol: orderForm.symbol.toUpperCase(),
      side: orderForm.side,
      type: orderForm.type,
      quantity: orderForm.quantity,
      price: orderForm.limitPrice,
      status: orderForm.type === "market" ? "filled" : "pending",
      createdAt: new Date(),
    };

    setOrders([newOrder, ...orders]);
    setShowOrderModal(false);
    setOrderForm({ symbol: "", side: "buy", type: "market", quantity: 1 });
  };

  const handleResetAccount = async () => {
    setIsResetting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setAccount({
      ...MOCK_ACCOUNT,
      cashBalance: 100000,
      portfolioValue: 0,
      totalValue: 100000,
      dayChange: 0,
      dayChangePercent: 0,
    });
    setPositions([]);
    setOrders([]);
    setIsResetting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Paper Trading Banner */}
        <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="font-semibold text-amber-800 dark:text-amber-200">
                Paper Trading Mode
              </h2>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This is a simulated trading environment. No real money is at
                risk. Practice strategies and learn without financial
                consequences.
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <LineChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Paper Trading
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Practice trading with virtual money
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={handleResetAccount}
              disabled={isResetting}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`}
              />
              Reset Account
            </button>
            <button
              onClick={() => setShowOrderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Order
            </button>
          </div>
        </div>

        {/* Account Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Total Value
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(account.totalValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Cash Balance
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(account.cashBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Portfolio Value
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(account.portfolioValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${account.dayChange >= 0 ? "bg-green-100" : "bg-red-100 dark:bg-red-900"}`}
              >
                {account.dayChange >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Day Change
                </p>
                <p
                  className={`text-xl font-bold ${
                    account.dayChange >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(account.dayChange)} (
                  {formatPercent(account.dayChangePercent)})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <div className="flex">
              {[
                {
                  id: "positions",
                  label: "Positions",
                  icon: Target,
                  count: positions.length,
                },
                {
                  id: "orders",
                  label: "Open Orders",
                  icon: Clock,
                  count: orders.filter((o) => o.status === "pending").length,
                },
                { id: "history", label: "Trade History", icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-200 dark:hover:text-gray-300"}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "positions" && (
              <div>
                {positions.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Open Positions
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 mb-4">
                      Place your first paper trade to get started
                    </p>
                    <button
                      onClick={() => setShowOrderModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Place Order
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                          <th className="pb-3 font-medium">Symbol</th>
                          <th className="pb-3 font-medium">Qty</th>
                          <th className="pb-3 font-medium">Avg Price</th>
                          <th className="pb-3 font-medium">Current</th>
                          <th className="pb-3 font-medium">Market Value</th>
                          <th className="pb-3 font-medium">P&L</th>
                          <th className="pb-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((pos) => (
                          <tr
                            key={pos.id}
                            className="border-b border-gray-100 dark:border-slate-700/50 last:border-0"
                          >
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {pos.symbol}
                                </span>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${pos.side === "long" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"}`}
                                >
                                  {pos.side.toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 text-gray-900 dark:text-white">
                              {pos.quantity}
                            </td>
                            <td className="py-4 text-gray-900 dark:text-white">
                              {formatCurrency(pos.avgEntryPrice)}
                            </td>
                            <td className="py-4 text-gray-900 dark:text-white">
                              {formatCurrency(pos.currentPrice)}
                            </td>
                            <td className="py-4 text-gray-900 dark:text-white">
                              {formatCurrency(pos.marketValue)}
                            </td>
                            <td className="py-4">
                              <div
                                className={
                                  pos.unrealizedPL >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                <div className="font-medium">
                                  {formatCurrency(pos.unrealizedPL)}
                                </div>
                                <div className="text-sm">
                                  {formatPercent(pos.unrealizedPLPercent)}
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <button className="px-3 py-1.5 text-sm bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 transition-colors">
                                Close
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "orders" && (
              <div>
                {orders.filter((o) => o.status === "pending").length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Open Orders
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400">
                      You don't have any pending orders
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders
                      .filter((o) => o.status === "pending")
                      .map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`px-2 py-1 rounded text-sm font-medium ${order.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"}`}
                            >
                              {order.side.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {order.symbol}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-slate-400">
                                {order.quantity} shares @{" "}
                                {order.price
                                  ? formatCurrency(order.price)
                                  : "Market"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 dark:text-slate-400">
                              {order.type.toUpperCase()}
                            </span>
                            <button
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              aria-label="Cancel order"
                              title="Cancel order"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Trade History
                </h3>
                <p className="text-gray-500 dark:text-slate-400">
                  Your executed trades will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Performance Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-blue-200 text-sm">Total P&L</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(account.totalValue - 100000)}
                </p>
              </div>
              <div>
                <p className="text-blue-200 text-sm">Return</p>
                <p className="text-2xl font-bold">
                  {formatPercent((account.totalValue - 100000) / 1000)}
                </p>
              </div>
              <div>
                <p className="text-blue-200 text-sm">Win Rate</p>
                <p className="text-xl font-bold">65%</p>
              </div>
              <div>
                <p className="text-blue-200 text-sm">Total Trades</p>
                <p className="text-xl font-bold">12</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm lg:col-span-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              Quick Stats
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Best Trade
                </p>
                <p className="text-lg font-semibold text-green-600">+$450.00</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  AAPL
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Worst Trade
                </p>
                <p className="text-lg font-semibold text-red-600">-$180.00</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  TSLA
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Avg Hold Time
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  3.5 days
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowOrderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Place Paper Order
                </h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePlaceOrder();
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="symbol"
                    className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
                  >
                    Symbol
                  </label>
                  <input
                    id="symbol"
                    type="text"
                    value={orderForm.symbol}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        symbol: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g., AAPL"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Side
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOrderForm({ ...orderForm, side: "buy" })
                      }
                      className={`py-2 rounded-lg font-medium transition-colors ${
                        orderForm.side === "buy"
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOrderForm({ ...orderForm, side: "sell" })
                      }
                      className={`py-2 rounded-lg font-medium transition-colors ${
                        orderForm.side === "sell"
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      Sell
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Order Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOrderForm({
                          ...orderForm,
                          type: "market",
                          limitPrice: undefined,
                        })
                      }
                      className={`py-2 rounded-lg font-medium transition-colors ${
                        orderForm.type === "market"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      Market
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOrderForm({ ...orderForm, type: "limit" })
                      }
                      className={`py-2 rounded-lg font-medium transition-colors ${
                        orderForm.type === "limit"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      Limit
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
                  >
                    Quantity
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    value={orderForm.quantity}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {orderForm.type === "limit" && (
                  <div>
                    <label
                      htmlFor="limitPrice"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
                    >
                      Limit Price
                    </label>
                    <input
                      id="limitPrice"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={orderForm.limitPrice || ""}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          limitPrice: parseFloat(e.target.value) || undefined,
                        })
                      }
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      required={orderForm.type === "limit"}
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      Available Cash
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(account.cashBalance)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="flex-1 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      orderForm.side === "buy"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {orderForm.side === "buy" ? "Buy" : "Sell"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
