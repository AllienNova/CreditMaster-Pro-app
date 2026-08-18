"use client";

/**
 * Crypto Portfolio.
 *
 * WHAT THIS PAGE USED TO SHOW EVERY VISITOR AS THEIR OWN HOLDINGS.
 *
 *   a Coinbase wallet worth $45,230 holding 0.35 BTC, among three wallets
 *   a portfolio summary of $86,530 across 8 assets, up $15,230 (21.4%)
 *   unrealised, and $2,180 (2.6%) in the last 24 hours
 *
 * No fetch in the file. Every figure was a claim that the reader owns crypto.
 *
 * THE FEATURE WAS BUILT AND UNREACHABLE. `crypto_wallets` and its holdings
 * tables have existed since migration 20260731000082_crypto_wallet_tracking,
 * and `crypto-wallet-service.ts` queries them in earnest — 33 database calls,
 * including `getUserWallets` and `getPortfolioSummary`. Nothing imported that
 * service except a barrel file and its own test: no route existed, so this
 * screen had nothing to call and showed a constant instead. GET
 * /api/financial/crypto was added to close that gap; it is the missing link
 * between a working service and a screen, not new functionality.
 *
 * FIELDS THE PAGE USED TO SHOW THAT HAVE NO SOURCE, now gone:
 *   - 24-hour change, at every level. `CryptoPortfolioSummary` has no
 *     `change24h`, and neither does `CryptoHolding`. The old page showed
 *     "+$2,180 (2.6%) today" on the summary and a 24h move per coin; nothing
 *     computes either. Prices are stored per holding with a `lastUpdated`, and
 *     no prior price is kept to difference against.
 *
 * FIELD NAMES DIFFER FROM THE OLD LOCAL TYPES, deliberately followed rather
 * than mapped: the service says `totalValueUsd` on a wallet (the old local
 * type said `totalValue`), `unrealizedGainLoss` on a holding (the old one said
 * `gainLoss`), and its WalletType includes `defi`, which the old union did not.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  PieChart,
} from "lucide-react";

/** Mirrors WalletType in crypto-wallet-service.ts:18. */
type WalletType = "hot" | "cold" | "exchange" | "defi";

/** Mirrors CryptoHolding in crypto-wallet-service.ts:65. */
interface CryptoHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  valueUsd: number;
  priceUsd: number;
  costBasis?: number;
  unrealizedGainLoss?: number;
  unrealizedGainLossPercent?: number;
}

/** Mirrors CryptoWallet in crypto-wallet-service.ts:39. */
interface CryptoWallet {
  id: string;
  name: string;
  type: WalletType;
  address?: string;
  exchange?: string;
  isConnected?: boolean;
  lastSync?: string;
  holdings?: CryptoHolding[];
  totalValueUsd: number;
}

/** Mirrors CryptoPortfolioSummary in crypto-wallet-service.ts:130. */
interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  totalWallets: number;
  totalAssets: number;
}

const WALLET_LABELS: Record<WalletType, string> = {
  hot: "Hot wallet",
  cold: "Cold storage",
  exchange: "Exchange",
  defi: "DeFi",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export default function CryptoPortfolioPage() {
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financial/crypto");
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) {
        setWallets([]);
        setSummary(null);
        setError(
          "We could not load your crypto wallets. Nothing here is filled in for you — try again in a moment.",
        );
      } else {
        setWallets(
          Array.isArray(json.data.wallets)
            ? (json.data.wallets as CryptoWallet[])
            : [],
        );
        setSummary((json.data.summary as PortfolioSummary | undefined) ?? null);
      }
    } catch {
      setWallets([]);
      setSummary(null);
      setError("We could not reach the crypto service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = selectedWallet
    ? wallets.filter((w) => w.id === selectedWallet)
    : wallets;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
            <Coins className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Crypto Portfolio
          </h1>
        </div>
        <p className="text-gray-600 dark:text-slate-400 mb-8">
          The wallets you have connected, and what is in them.
        </p>

        {error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Crypto is unavailable
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl"
              />
            ))}
          </div>
        ) : wallets.length === 0 ? (
          !error && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center border border-gray-200 dark:border-slate-700">
              <Wallet className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
              <p className="font-medium text-gray-900 dark:text-white">
                No wallets connected
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Once you connect a wallet or exchange, its holdings appear here.
              </p>
            </div>
          )
        ) : (
          <>
            {/* Summary — only the figures the service computes. There is no
                24-hour change anywhere in the data, so none is shown. */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Total value
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(summary.totalValue)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Cost basis
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(summary.totalCostBasis)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Unrealised
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 flex items-center gap-1 ${
                      summary.unrealizedGainLoss >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {summary.unrealizedGainLoss >= 0 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    {formatCurrency(summary.unrealizedGainLoss)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {formatPercent(summary.unrealizedGainLossPercent)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Wallets
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {summary.totalWallets}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {summary.totalAssets} assets
                  </p>
                </div>
              </div>
            )}

            {wallets.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSelectedWallet(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    selectedWallet === null
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700"
                  }`}
                >
                  All wallets
                </button>
                {wallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      selectedWallet === wallet.id
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700"
                    }`}
                  >
                    {wallet.name}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {visible.map((wallet, index) => (
                <motion.div
                  key={wallet.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        {wallet.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {WALLET_LABELS[wallet.type] ?? wallet.type}
                        {wallet.exchange ? ` · ${wallet.exchange}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(wallet.totalValueUsd)}
                      </p>
                      {wallet.isConnected === false && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Not connected
                        </p>
                      )}
                    </div>
                  </div>

                  {!wallet.holdings || wallet.holdings.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      No holdings recorded in this wallet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                      {wallet.holdings.map((holding) => (
                        <li
                          key={holding.id}
                          className="py-3 flex items-center gap-3"
                        >
                          <PieChart className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {holding.symbol}
                              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-slate-400">
                                {holding.name}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {holding.quantity} @{" "}
                              {formatCurrency(holding.priceUsd)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(holding.valueUsd)}
                            </p>
                            {typeof holding.unrealizedGainLossPercent ===
                              "number" && (
                              <p
                                className={`text-xs ${
                                  holding.unrealizedGainLossPercent >= 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {formatPercent(
                                  holding.unrealizedGainLossPercent,
                                )}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={load}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-300 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}
