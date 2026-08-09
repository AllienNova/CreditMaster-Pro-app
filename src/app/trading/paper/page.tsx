"use client";

/**
 * Paper Trading Page — real-data wiring.
 *
 * Previously rendered a hardcoded mock account / positions / orders via local
 * useState, and simulated order placement / reset in-memory. It now reads
 * the real paper-trading account, positions, open orders, performance and trade
 * history from the authed API (Bearer-authenticated, all routes wrapped in
 * `withAuth`), and mutates through the real endpoints:
 *   - GET  /api/trading/paper                              → account
 *   - GET  /api/trading/paper/positions                   → open positions
 *   - GET  /api/trading/paper/orders                      → orders
 *   - GET  /api/trading/paper/performance?action=performance → win rate / P&L
 *   - GET  /api/trading/paper/performance?action=trades   → trade history
 *   - POST /api/trading/paper                              → create account
 *   - POST /api/trading/paper/orders                      → place order / close
 *   - POST /api/trading/paper/reset                        → reset account
 *   - DELETE /api/trading/paper/orders?id=                 → cancel open order
 *
 * Fields with no honest source are omitted rather than faked: the account API
 * exposes no intraday change, so the former "Day Change" card now shows the
 * real net P&L from the performance endpoint; the former "Best/Worst trade" and
 * "Avg hold time" quick-stats (which the performance API does not expose) are
 * replaced with the real avg-win / avg-loss / profit-factor it does expose.
 */

import { useState, useEffect, useCallback } from "react";
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
  Clock,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ============================================================================
// API RESPONSE SHAPES (as they arrive over JSON — dates are ISO strings)
// ============================================================================

interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
  error?: string;
}

interface ApiAccount {
  id: string;
  name: string;
  initialBalance: number;
  cashBalance: number;
  portfolioValue: number;
  totalValue: number;
}

interface ApiPosition {
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

interface ApiOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: string;
  quantity: number;
  status: string;
  limitPrice?: number;
  filledAvgPrice?: number;
  createdAt: string;
}

// `profitFactor` can be Infinity server-side (no losing trades); JSON serializes
// that to `null`, so it is typed nullable and rendered as an em-dash when absent.
interface ApiPerformance {
  netPL: number;
  netPLPercent: number;
  winRate: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
}

interface ApiTrade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  realizedPL?: number;
  executedAt: string;
}

// ============================================================================
// VIEW MODELS (what the UI renders)
// ============================================================================

interface PaperAccount {
  id: string;
  name: string;
  cashBalance: number;
  portfolioValue: number;
  totalValue: number;
  initialBalance: number;
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

interface PaperPerformance {
  netPL: number;
  netPLPercent: number;
  winRate: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
}

interface PaperTrade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  realizedPL?: number;
  executedAt: Date;
}

interface OrderFormData {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  quantity: number;
  limitPrice?: number;
}

// Statuses that represent a live, cancellable order (mirrors the engine blotter).
const OPEN_ORDER_STATUSES = ["pending", "submitted", "accepted", "partial"];

// ============================================================================
// ADAPTERS (API shape → view model)
// ============================================================================

function mapAccount(a: ApiAccount): PaperAccount {
  return {
    id: a.id,
    name: a.name,
    cashBalance: a.cashBalance,
    portfolioValue: a.portfolioValue,
    totalValue: a.totalValue,
    initialBalance: a.initialBalance,
  };
}

function mapPosition(p: ApiPosition): PaperPosition {
  return {
    id: p.id,
    symbol: p.symbol,
    quantity: p.quantity,
    avgEntryPrice: p.avgEntryPrice,
    currentPrice: p.currentPrice,
    marketValue: p.marketValue,
    unrealizedPL: p.unrealizedPL,
    unrealizedPLPercent: p.unrealizedPLPercent,
    side: p.side,
  };
}

function mapOrder(o: ApiOrder): PaperOrder {
  return {
    id: o.id,
    symbol: o.symbol,
    side: o.side,
    type: o.type,
    quantity: o.quantity,
    // Limit price is the resting price; fall back to the filled price for
    // executed orders. Market orders that have not filled carry neither.
    price: o.limitPrice ?? o.filledAvgPrice,
    status: o.status,
    createdAt: new Date(o.createdAt),
  };
}

function mapPerformance(p: ApiPerformance): PaperPerformance {
  return {
    netPL: p.netPL,
    netPLPercent: p.netPLPercent,
    winRate: p.winRate,
    totalTrades: p.totalTrades,
    avgWin: p.avgWin,
    avgLoss: p.avgLoss,
    profitFactor: p.profitFactor,
  };
}

function mapTrade(t: ApiTrade): PaperTrade {
  return {
    id: t.id,
    symbol: t.symbol,
    side: t.side,
    quantity: t.quantity,
    price: t.price,
    realizedPL: t.realizedPL,
    executedAt: new Date(t.executedAt),
  };
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/** Return the current session access token, or null when not signed in. */
async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** Fetch with the Bearer header attached. */
function authedFetch(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

// ============================================================================
// PAGE
// ============================================================================

export default function PaperTradingPage() {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [performance, setPerformance] = useState<PaperPerformance | null>(null);
  const [trades, setTrades] = useState<PaperTrade[]>([]);

  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "positions" | "orders" | "history"
  >("positions");
  const [isResetting, setIsResetting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [orderForm, setOrderForm] = useState<OrderFormData>({
    symbol: "",
    side: "buy",
    type: "market",
    quantity: 1,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setSignedIn(false);
        setAccount(null);
        return;
      }
      setSignedIn(true);

      const accRes = await authedFetch("/api/trading/paper", token);
      if (!accRes.ok) {
        throw new Error(`Failed to load account (${accRes.status})`);
      }
      const accBody = (await accRes.json()) as ApiEnvelope<ApiAccount | null>;

      // Signed in but no paper account yet — surface a create prompt.
      if (!accBody.data) {
        setAccount(null);
        setPositions([]);
        setOrders([]);
        setPerformance(null);
        setTrades([]);
        return;
      }

      const [posRes, ordRes, perfRes, tradeRes] = await Promise.all([
        authedFetch("/api/trading/paper/positions", token),
        authedFetch("/api/trading/paper/orders", token),
        authedFetch(
          "/api/trading/paper/performance?action=performance",
          token,
        ),
        authedFetch("/api/trading/paper/performance?action=trades", token),
      ]);

      const checks: [string, Response][] = [
        ["positions", posRes],
        ["orders", ordRes],
        ["performance", perfRes],
        ["trade history", tradeRes],
      ];
      for (const [label, res] of checks) {
        if (!res.ok) {
          throw new Error(`Failed to load ${label} (${res.status})`);
        }
      }

      const posBody = (await posRes.json()) as ApiEnvelope<ApiPosition[]>;
      const ordBody = (await ordRes.json()) as ApiEnvelope<ApiOrder[]>;
      const perfBody = (await perfRes.json()) as ApiEnvelope<ApiPerformance>;
      const tradeBody = (await tradeRes.json()) as ApiEnvelope<ApiTrade[]>;

      setAccount(mapAccount(accBody.data));
      setPositions((posBody.data ?? []).map(mapPosition));
      setOrders((ordBody.data ?? []).map(mapOrder));
      setPerformance(perfBody.data ? mapPerformance(perfBody.data) : null);
      setTrades((tradeBody.data ?? []).map(mapTrade));
    } catch (err) {
      setAccount(null);
      setPositions([]);
      setOrders([]);
      setPerformance(null);
      setTrades([]);
      setError(
        err instanceof Error ? err.message : "Failed to load paper trading.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleCreateAccount = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setSignedIn(false);
        return;
      }
      const res = await authedFetch("/api/trading/paper", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(`Failed to create account (${res.status})`);
      }
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create account.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handlePlaceOrder = async () => {
    setOrderError(null);
    setIsPlacingOrder(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setOrderError("Your session has expired. Please sign in again.");
        return;
      }
      const res = await authedFetch("/api/trading/paper/orders", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: orderForm.symbol.toUpperCase(),
          side: orderForm.side,
          type: orderForm.type,
          quantity: orderForm.quantity,
          limitPrice: orderForm.limitPrice,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `Failed to place order (${res.status})`);
      }
      setShowOrderModal(false);
      setOrderForm({ symbol: "", side: "buy", type: "market", quantity: 1 });
      await loadData();
    } catch (err) {
      setOrderError(
        err instanceof Error ? err.message : "Failed to place order.",
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleResetAccount = async () => {
    setIsResetting(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setSignedIn(false);
        return;
      }
      const res = await authedFetch("/api/trading/paper/reset", token, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`Failed to reset account (${res.status})`);
      }
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reset account.",
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setSignedIn(false);
        return;
      }
      const res = await authedFetch(
        `/api/trading/paper/orders?id=${encodeURIComponent(orderId)}`,
        token,
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw new Error(`Failed to cancel order (${res.status})`);
      }
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel order.",
      );
    }
  };

  const handleClosePosition = async (position: PaperPosition) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setSignedIn(false);
        return;
      }
      // Flatten the position with an opposing market order.
      const res = await authedFetch("/api/trading/paper/orders", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: position.symbol,
          side: position.side === "long" ? "sell" : "buy",
          type: "market",
          quantity: Math.abs(position.quantity),
        }),
      });
      if (!res.ok) {
        throw new Error(`Failed to close position (${res.status})`);
      }
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to close position.",
      );
    }
  };

  const openOrders = orders.filter((o) =>
    OPEN_ORDER_STATUSES.includes(o.status),
  );

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

        {loading ? (
          <div
            className="animate-pulse space-y-6"
            role="status"
            aria-label="Loading paper trading account"
          >
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-200 dark:bg-slate-700 rounded-xl"
                />
              ))}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-xl" />
          </div>
        ) : !signedIn ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center shadow-sm">
            <Wallet className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Sign in to access paper trading
            </h2>
            <p className="text-gray-500 dark:text-slate-400">
              Your simulated account is tied to your Fynvita login.
            </p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center shadow-sm">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Couldn&apos;t load paper trading
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !account ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center shadow-sm">
            <LineChart className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Start Paper Trading
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              Create a simulated account with $100,000 in virtual cash to
              practice trading risk-free.
            </p>
            <button
              onClick={handleCreateAccount}
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Paper Account
            </button>
          </div>
        ) : (
          <>
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

              {/* Net P&L — the account API exposes no intraday change, so this
                  card shows the real net P&L from the performance endpoint. */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      (performance?.netPL ?? 0) >= 0
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-red-100 dark:bg-red-900"
                    }`}
                  >
                    {(performance?.netPL ?? 0) >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Net P&L
                    </p>
                    <p
                      className={`text-xl font-bold ${
                        (performance?.netPL ?? 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(performance?.netPL ?? 0)} (
                      {formatPercent(performance?.netPLPercent ?? 0)})
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
                      count: openOrders.length,
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
                                  <button
                                    onClick={() => handleClosePosition(pos)}
                                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                                  >
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
                    {openOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No Open Orders
                        </h3>
                        <p className="text-gray-500 dark:text-slate-400">
                          You don&apos;t have any pending orders
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {openOrders.map((order) => (
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
                                onClick={() => handleCancelOrder(order.id)}
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
                  <div>
                    {trades.length === 0 ? (
                      <div className="text-center py-12">
                        <History className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Trade History
                        </h3>
                        <p className="text-gray-500 dark:text-slate-400">
                          Your executed trades will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-sm text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                              <th className="pb-3 font-medium">Date</th>
                              <th className="pb-3 font-medium">Symbol</th>
                              <th className="pb-3 font-medium">Side</th>
                              <th className="pb-3 font-medium">Qty</th>
                              <th className="pb-3 font-medium">Price</th>
                              <th className="pb-3 font-medium">Realized P&L</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trades.map((trade) => (
                              <tr
                                key={trade.id}
                                className="border-b border-gray-100 dark:border-slate-700/50 last:border-0"
                              >
                                <td className="py-4 text-sm text-gray-900 dark:text-white">
                                  {trade.executedAt.toLocaleDateString()}
                                </td>
                                <td className="py-4 font-semibold text-gray-900 dark:text-white">
                                  {trade.symbol}
                                </td>
                                <td className="py-4">
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${trade.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"}`}
                                  >
                                    {trade.side.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-4 text-gray-900 dark:text-white">
                                  {trade.quantity}
                                </td>
                                <td className="py-4 text-gray-900 dark:text-white">
                                  {formatCurrency(trade.price)}
                                </td>
                                <td className="py-4">
                                  {trade.realizedPL !== undefined ? (
                                    <span
                                      className={
                                        trade.realizedPL >= 0
                                          ? "text-green-600 font-medium"
                                          : "text-red-600 font-medium"
                                      }
                                    >
                                      {formatCurrency(trade.realizedPL)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 dark:text-slate-500">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Performance Summary */}
            {performance && (
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
                        {formatCurrency(performance.netPL)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-sm">Return</p>
                      <p className="text-2xl font-bold">
                        {formatPercent(performance.netPLPercent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-sm">Win Rate</p>
                      <p className="text-xl font-bold">
                        {performance.winRate.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-sm">Total Trades</p>
                      <p className="text-xl font-bold">
                        {performance.totalTrades}
                      </p>
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
                        Avg Win
                      </p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(performance.avgWin)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Avg Loss
                      </p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatCurrency(performance.avgLoss)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Profit Factor
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {performance.profitFactor != null
                          ? performance.profitFactor.toFixed(2)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderModal && account && (
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
                {orderError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {orderError}
                  </div>
                )}

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
                    disabled={isPlacingOrder}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                      orderForm.side === "buy"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    {isPlacingOrder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
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
