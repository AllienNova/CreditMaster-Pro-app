"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Wallet,
  AlertCircle,
  ExternalLink,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

type WalletType = "hot" | "cold" | "exchange";

interface CryptoHolding {
  symbol: string;
  name: string;
  quantity: number;
  priceUsd: number;
  valueUsd: number;
  change24h: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface CryptoWallet {
  id: string;
  name: string;
  type: WalletType;
  address?: string;
  exchange?: string;
  totalValue: number;
  holdings: CryptoHolding[];
  lastSync: Date;
}

interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  change24h: number;
  change24hPercent: number;
  totalAssets: number;
  totalWallets: number;
}

const MOCK_WALLETS: CryptoWallet[] = [
  {
    id: "1",
    name: "Coinbase",
    type: "exchange",
    exchange: "Coinbase",
    totalValue: 45230,
    lastSync: new Date(),
    holdings: [
      {
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 0.35,
        priceUsd: 97500,
        valueUsd: 34125,
        change24h: 2.5,
        costBasis: 28000,
        gainLoss: 6125,
        gainLossPercent: 21.9,
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        quantity: 2.8,
        priceUsd: 3250,
        valueUsd: 9100,
        change24h: 1.8,
        costBasis: 7500,
        gainLoss: 1600,
        gainLossPercent: 21.3,
      },
      {
        symbol: "LINK",
        name: "Chainlink",
        quantity: 91,
        priceUsd: 22,
        valueUsd: 2005,
        change24h: 0.8,
        costBasis: 1800,
        gainLoss: 205,
        gainLossPercent: 11.4,
      },
    ],
  },
  {
    id: "2",
    name: "Ledger Nano",
    type: "cold",
    address: "0x1234...5678",
    totalValue: 28450,
    lastSync: new Date(Date.now() - 3600000),
    holdings: [
      {
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 0.22,
        priceUsd: 97500,
        valueUsd: 21450,
        change24h: 2.5,
        costBasis: 18000,
        gainLoss: 3450,
        gainLossPercent: 19.2,
      },
      {
        symbol: "SOL",
        name: "Solana",
        quantity: 38,
        priceUsd: 185,
        valueUsd: 7000,
        change24h: 5.2,
        costBasis: 5500,
        gainLoss: 1500,
        gainLossPercent: 27.3,
      },
    ],
  },
  {
    id: "3",
    name: "MetaMask",
    type: "hot",
    address: "0xabcd...efgh",
    totalValue: 12850,
    lastSync: new Date(Date.now() - 7200000),
    holdings: [
      {
        symbol: "ETH",
        name: "Ethereum",
        quantity: 3.2,
        priceUsd: 3250,
        valueUsd: 10400,
        change24h: 1.8,
        costBasis: 8500,
        gainLoss: 1900,
        gainLossPercent: 22.4,
      },
      {
        symbol: "UNI",
        name: "Uniswap",
        quantity: 120,
        priceUsd: 12.5,
        valueUsd: 1500,
        change24h: -0.5,
        costBasis: 1200,
        gainLoss: 300,
        gainLossPercent: 25.0,
      },
      {
        symbol: "AAVE",
        name: "Aave",
        quantity: 3.3,
        priceUsd: 285,
        valueUsd: 950,
        change24h: 1.2,
        costBasis: 800,
        gainLoss: 150,
        gainLossPercent: 18.8,
      },
    ],
  },
];

const MOCK_SUMMARY: PortfolioSummary = {
  totalValue: 86530,
  totalCostBasis: 71300,
  unrealizedGainLoss: 15230,
  unrealizedGainLossPercent: 21.4,
  change24h: 2180,
  change24hPercent: 2.6,
  totalAssets: 8,
  totalWallets: 3,
};

const getWalletIcon = (type: WalletType) => {
  switch (type) {
    case "exchange":
      return Coins;
    case "cold":
      return Wallet;
    case "hot":
      return Wallet;
    default:
      return Wallet;
  }
};

const getWalletColor = (type: WalletType) => {
  switch (type) {
    case "exchange":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "cold":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "hot":
      return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300";
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value: number) => {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
};

export default function CryptoPortfolioPage() {
  const [wallets] = useState<CryptoWallet[]>(MOCK_WALLETS);
  const [summary] = useState<PortfolioSummary>(MOCK_SUMMARY);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  // Aggregate all holdings
  const allHoldings = wallets.flatMap((w) => w.holdings);
  const aggregatedHoldings = allHoldings
    .reduce((acc, h) => {
      const existing = acc.find((a) => a.symbol === h.symbol);
      if (existing) {
        existing.quantity += h.quantity;
        existing.valueUsd += h.valueUsd;
        existing.costBasis += h.costBasis;
        existing.gainLoss = existing.valueUsd - existing.costBasis;
        existing.gainLossPercent =
          (existing.gainLoss / existing.costBasis) * 100;
      } else {
        acc.push({ ...h });
      }
      return acc;
    }, [] as CryptoHolding[])
    .sort((a, b) => b.valueUsd - a.valueUsd);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Coins className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Crypto Portfolio
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Track all your cryptocurrency holdings across wallets and
              exchanges
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Sync All
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
              <Plus className="w-4 h-4" />
              Add Wallet
            </button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl p-6 mb-8 text-white"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-orange-100 text-sm mb-1">
                Total Portfolio Value
              </p>
              <p className="text-3xl font-bold">
                {formatCurrency(summary.totalValue)}
              </p>
              <div
                className={`flex items-center gap-1 mt-1 ${summary.change24h >= 0 ? "text-green-200" : "text-red-200"}`}
              >
                {summary.change24h >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>
                  {formatCurrency(Math.abs(summary.change24h))} (
                  {formatPercent(summary.change24hPercent)}) 24h
                </span>
              </div>
            </div>
            <div>
              <p className="text-orange-100 text-sm mb-1">Unrealized P&L</p>
              <p
                className={`text-2xl font-bold ${summary.unrealizedGainLoss >= 0 ? "text-green-200" : "text-red-200"}`}
              >
                {formatCurrency(summary.unrealizedGainLoss)}
              </p>
              <p className="text-orange-100 text-sm mt-1">
                {formatPercent(summary.unrealizedGainLossPercent)} all time
              </p>
            </div>
            <div>
              <p className="text-orange-100 text-sm mb-1">Cost Basis</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalCostBasis)}
              </p>
              <p className="text-orange-100 text-sm mt-1">Total invested</p>
            </div>
            <div>
              <p className="text-orange-100 text-sm mb-1">Assets / Wallets</p>
              <p className="text-2xl font-bold">
                {summary.totalAssets} / {summary.totalWallets}
              </p>
              <p className="text-orange-100 text-sm mt-1">
                Unique tokens tracked
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Holdings List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-orange-500" />
                  Holdings
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {aggregatedHoldings.map((holding, index) => (
                  <motion.div
                    key={holding.symbol}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold">
                        {holding.symbol.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {holding.name}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-slate-400">
                            {holding.symbol}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {holding.quantity.toFixed(4)} {holding.symbol} @{" "}
                          {formatCurrency(holding.priceUsd)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(holding.valueUsd)}
                        </p>
                        <p
                          className={`text-sm flex items-center justify-end gap-1 ${holding.change24h >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {holding.change24h >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {formatPercent(holding.change24h)}
                        </p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p
                          className={`font-semibold ${holding.gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(holding.gainLoss)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {formatPercent(holding.gainLossPercent)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Wallets Sidebar */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-orange-500" />
              Wallets
            </h2>
            {wallets.map((wallet, index) => {
              const Icon = getWalletIcon(wallet.type);
              return (
                <motion.div
                  key={wallet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() =>
                    setSelectedWallet(
                      selectedWallet === wallet.id ? null : wallet.id,
                    )
                  }
                  className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm cursor-pointer transition-all ${
                    selectedWallet === wallet.id
                      ? "ring-2 ring-orange-500"
                      : "hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`p-2 rounded-lg ${getWalletColor(wallet.type)}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {wallet.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                        {wallet.type} wallet
                      </p>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(wallet.totalValue)}
                    </p>
                  </div>
                  {wallet.address && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 mb-2">
                      <span className="font-mono">{wallet.address}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                    <RefreshCw className="w-3 h-3" />
                    Last synced {new Date(wallet.lastSync).toLocaleTimeString()}
                  </div>

                  {selectedWallet === wallet.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 space-y-2">
                      {wallet.holdings.map((h) => (
                        <div
                          key={h.symbol}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-600 dark:text-slate-400">
                            {h.symbol}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {formatCurrency(h.valueUsd)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Price Alerts */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Price Alerts
                </h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                Set alerts when prices hit your targets
              </p>
              <button className="w-full py-2 text-sm text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                + Create Alert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
