"use client";

/**
 * Trading Signals Dashboard Page
 *
 * Phase 5.4.1: Advanced trading signals web UI with real-time updates,
 * filtering, performance tracking, and manual signal generation
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TradingSignal,
  SignalType,
  SignalStatus,
  SignalPerformance,
  AnalysisType,
} from "@/lib/investments/types/trading-signals.types";

// ============================================================================
// PERFORMANCE STATS COMPONENT
// ============================================================================

interface PerformanceStatsProps {
  performance: SignalPerformance;
}

function PerformanceStats({ performance }: PerformanceStatsProps) {
  const stats = [
    {
      label: "Success Rate",
      value: `${(performance.successRate * 100).toFixed(1)}%`,
      color:
        performance.successRate >= 0.6 ? "text-green-600" : "text-yellow-600",
      bgColor: performance.successRate >= 0.6 ? "bg-green-50" : "bg-yellow-50",
    },
    {
      label: "Avg Return",
      value: `${(performance.averageReturn * 100).toFixed(2)}%`,
      color: performance.averageReturn >= 0 ? "text-green-600" : "text-red-600",
      bgColor: performance.averageReturn >= 0 ? "bg-green-50" : "bg-red-50",
    },
    {
      label: "Sharpe Ratio",
      value: performance.sharpeRatio?.toFixed(2) ?? "N/A",
      color:
        (performance.sharpeRatio ?? 0) >= 1
          ? "text-green-600"
          : "text-gray-600 dark:text-slate-300",
      bgColor:
        (performance.sharpeRatio ?? 0) >= 1
          ? "bg-green-50"
          : "bg-gray-50 dark:bg-slate-900",
    },
    {
      label: "Total Signals",
      value: performance.totalSignals.toString(),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Executed",
      value: performance.executedSignals.toString(),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Total Return",
      value: `${(performance.totalReturn * 100).toFixed(2)}%`,
      color: performance.totalReturn >= 0 ? "text-green-600" : "text-red-600",
      bgColor: performance.totalReturn >= 0 ? "bg-green-50" : "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`${stat.bgColor} rounded-lg p-4 border border-gray-200 dark:border-slate-700`}
        >
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
            {stat.label}
          </p>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SIGNAL FILTERS COMPONENT
// ============================================================================

interface SignalFiltersProps {
  selectedSymbols: string[];
  selectedTypes: SignalType[];
  selectedStatuses: SignalStatus[];
  minConfidence: number;
  timeframe: string;
  onSymbolsChange: (symbols: string[]) => void;
  onTypesChange: (types: SignalType[]) => void;
  onStatusesChange: (statuses: SignalStatus[]) => void;
  onConfidenceChange: (confidence: number) => void;
  onTimeframeChange: (timeframe: string) => void;
}

function SignalFilters({
  selectedSymbols,
  selectedTypes,
  selectedStatuses,
  minConfidence,
  timeframe,
  onSymbolsChange,
  onTypesChange,
  onStatusesChange,
  onConfidenceChange,
  onTimeframeChange,
}: SignalFiltersProps) {
  const [symbolInput, setSymbolInput] = useState("");

  const handleAddSymbol = () => {
    if (symbolInput && !selectedSymbols.includes(symbolInput.toUpperCase())) {
      onSymbolsChange([...selectedSymbols, symbolInput.toUpperCase()]);
      setSymbolInput("");
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    onSymbolsChange(selectedSymbols.filter((s) => s !== symbol));
  };

  const toggleType = (type: SignalType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const toggleStatus = (status: SignalStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Filters
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Symbol Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Symbols
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === "Enter" && handleAddSymbol()}
              placeholder="e.g., AAPL"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleAddSymbol}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSymbols.map((symbol) => (
              <span
                key={symbol}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
              >
                {symbol}
                <button
                  onClick={() => handleRemoveSymbol(symbol)}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Signal Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Signal Type
          </label>
          <div className="space-y-2">
            {Object.values(SignalType).map((type) => (
              <label key={type} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => toggleType(type)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-slate-300 capitalize">
                  {type.replace("_", " ")}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Status
          </label>
          <div className="space-y-2">
            {Object.values(SignalStatus).map((status) => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => toggleStatus(status)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-slate-300 capitalize">
                  {status}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Confidence & Timeframe */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Min Confidence: {(minConfidence * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={minConfidence}
              onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="1d">1 Day</option>
              <option value="1w">1 Week</option>
              <option value="1m">1 Month</option>
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="1y">1 Year</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function TradingSignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [performance, setPerformance] = useState<SignalPerformance | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filter states
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<SignalType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<SignalStatus[]>([
    SignalStatus.ACTIVE,
  ]);
  const [minConfidence, setMinConfidence] = useState(0);
  const [timeframe, setTimeframe] = useState<string>("1d");

  // Fetch signals
  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSymbols.length > 0)
        params.append("symbols", selectedSymbols.join(","));
      if (selectedTypes.length > 0)
        params.append("signalTypes", selectedTypes.join(","));
      if (selectedStatuses.length > 0)
        params.append("statuses", selectedStatuses.join(","));
      if (minConfidence > 0)
        params.append("minConfidence", minConfidence.toString());
      if (timeframe) params.append("timeframe", timeframe);

      const response = await fetch(
        `/api/investments/signals?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch signals");
      }

      const data = await response.json();
      setSignals(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signals");
    } finally {
      setLoading(false);
    }
  }, [
    selectedSymbols,
    selectedTypes,
    selectedStatuses,
    minConfidence,
    timeframe,
  ]);

  // Fetch performance stats
  const fetchPerformance = useCallback(async () => {
    try {
      /*
       * /signals/performance, not /signals/history. The latter is not a route
       * this app serves, so this fetch 404'd for every user and the panel
       * stayed empty. The existing route returns { success, data, metadata }
       * and `data` is exactly the shape read below — it was a wrong path, not
       * a missing endpoint.
       */
      const response = await fetch("/api/investments/signals/performance");
      if (!response.ok) throw new Error("Failed to fetch performance");

      const data = await response.json();
      setPerformance(data.data);
    } catch (err) {
      console.error("Failed to load performance:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSignals();
    fetchPerformance();
  }, [fetchSignals, fetchPerformance]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSignals();
      fetchPerformance();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSignals, fetchPerformance]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Trading Signals
              </h1>
              <p className="mt-2 text-gray-600 dark:text-slate-400">
                AI-powered trading signals with real-time analysis
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  autoRefresh
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {autoRefresh ? "Auto-refresh ON" : "⏸️ Auto-refresh OFF"}
              </button>
              <GenerateSignalButton onGenerated={fetchSignals} />
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        {performance && <PerformanceStats performance={performance} />}

        {/* Filters */}
        <SignalFilters
          selectedSymbols={selectedSymbols}
          selectedTypes={selectedTypes}
          selectedStatuses={selectedStatuses}
          minConfidence={minConfidence}
          timeframe={timeframe}
          onSymbolsChange={setSelectedSymbols}
          onTypesChange={setSelectedTypes}
          onStatusesChange={setSelectedStatuses}
          onConfidenceChange={setMinConfidence}
          onTimeframeChange={setTimeframe}
        />

        {/* Signals List */}
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={fetchSignals} />}
        {!loading && !error && (
          <SignalsList signals={signals} onRefresh={fetchSignals} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SIGNALS LIST COMPONENT
// ============================================================================

interface SignalsListProps {
  signals: TradingSignal[];
  onRefresh: () => void;
}

function SignalsList({ signals, onRefresh }: SignalsListProps) {
  if (signals.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12 text-center">
        <p className="text-gray-500 dark:text-slate-400 text-lg">
          No signals found matching your filters
        </p>
        <button
          onClick={onRefresh}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Active Signals ({signals.length})
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SIGNAL CARD COMPONENT
// ============================================================================

interface SignalCardProps {
  signal: TradingSignal;
}

function SignalCard({ signal }: SignalCardProps) {
  const getSignalColor = (type: SignalType) => {
    switch (type) {
      case SignalType.STRONG_BUY:
      case SignalType.BUY:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case SignalType.STRONG_SELL:
      case SignalType.SELL:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case SignalType.HOLD:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 dark:bg-slate-900 dark:text-slate-300";
    }
  };

  const getStatusColor = (status: SignalStatus) => {
    switch (status) {
      case SignalStatus.ACTIVE:
        return "bg-blue-100 text-blue-800";
      case SignalStatus.EXECUTED:
        return "bg-green-100 text-green-800";
      case SignalStatus.EXPIRED:
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100";
      case SignalStatus.CANCELLED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100";
    }
  };

  const priceChange = signal.currentPrice - signal.entryPrice!;
  const priceChangePercent = signal.entryPrice
    ? (priceChange / signal.entryPrice) * 100
    : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {signal.symbol}
            </h3>
            <span className="text-sm text-gray-500 dark:text-slate-400 capitalize">
              {signal.assetType}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${getSignalColor(signal.signalType)}`}
            >
              {signal.signalType.replace("_", " ").toUpperCase()}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(signal.status)}`}
            >
              {signal.status.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${signal.currentPrice.toFixed(2)}
          </p>
          {signal.entryPrice && (
            <p
              className={`text-sm font-medium ${priceChange >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {priceChange >= 0 ? "+" : ""}
              {priceChangePercent.toFixed(2)}%
            </p>
          )}
        </div>
      </div>

      {/* Price Targets */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            Entry
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            ${signal.entryPrice?.toFixed(2) || signal.currentPrice.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            Target
          </p>
          <p className="text-sm font-semibold text-green-600">
            ${signal.targetPrice.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            Stop Loss
          </p>
          <p className="text-sm font-semibold text-red-600">
            ${signal.stopLoss.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            Confidence
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 dark:bg-slate-600 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${signal.confidence * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {(signal.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            Risk/Reward
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            1:{signal.riskRewardRatio.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-4">
        <p className="text-sm text-gray-700 dark:text-slate-300 line-clamp-2">
          {signal.reasoning}
        </p>
      </div>

      {/* Analysis Types */}
      <div className="flex flex-wrap gap-2 mb-4">
        {signal.analysisTypes.map((type) => (
          <span
            key={type}
            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium"
          >
            {type.replace("_", " ").toUpperCase()}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 pt-4 border-t border-gray-200 dark:border-slate-700">
        <span>Timeframe: {signal.timeframe}</span>
        <span>
          Generated: {new Date(signal.generatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// GENERATE SIGNAL BUTTON COMPONENT
// ============================================================================

interface GenerateSignalButtonProps {
  onGenerated: () => void;
}

function GenerateSignalButton({ onGenerated }: GenerateSignalButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [assetType, setAssetType] = useState<
    "stock" | "etf" | "crypto" | "option"
  >("stock");
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([
    AnalysisType.TECHNICAL,
    AnalysisType.FUNDAMENTAL,
    AnalysisType.SENTIMENT,
    AnalysisType.AI_COMBINED,
  ]);

  const handleGenerate = async () => {
    if (!symbol) return;

    setLoading(true);
    try {
      const response = await fetch("/api/investments/signals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          assetType,
          analysisTypes,
          timeframe: "1d",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate signal");
      }

      setIsOpen(false);
      setSymbol("");
      onGenerated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate signal");
    } finally {
      setLoading(false);
    }
  };

  const toggleAnalysisType = (type: AnalysisType) => {
    if (analysisTypes.includes(type)) {
      setAnalysisTypes(analysisTypes.filter((t) => t !== type));
    } else {
      setAnalysisTypes([...analysisTypes, type]);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        + Generate Signal
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Generate Trading Signal
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Symbol
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Asset Type
                </label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="stock">Stock</option>
                  <option value="etf">ETF</option>
                  <option value="crypto">Crypto</option>
                  <option value="option">Option</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Analysis Types
                </label>
                <div className="space-y-2">
                  {Object.values(AnalysisType).map((type) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={analysisTypes.includes(type)}
                        onChange={() => toggleAnalysisType(type)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300 capitalize">
                        {type.replace("_", " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !symbol}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// LOADING & ERROR STATES
// ============================================================================

function LoadingState() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12">
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 dark:text-slate-400">Loading signals...</p>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12">
      <div className="flex flex-col items-center justify-center">
        <div className="text-red-500 text-5xl mb-4"></div>
        <p className="text-gray-900 dark:text-white font-semibold mb-2">
          Error Loading Signals
        </p>
        <p className="text-gray-500 dark:text-slate-400 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
