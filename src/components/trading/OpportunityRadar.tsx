"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowTrendingUpIcon as TrendingUp,
  ArrowTrendingDownIcon as TrendingDown,
  ChartBarIcon as Activity,
  BoltIcon as Zap,
  ArrowPathIcon as RefreshCw,
  ChevronRightIcon as ChevronRight,
  StarIcon as Star,
  ClockIcon as Clock,
  AdjustmentsHorizontalIcon as Target,
  InformationCircleIcon as AlertCircle,
} from "@heroicons/react/24/outline";

// ============================================================================
// TYPES
// ============================================================================

type UserTier = "beginner" | "pro" | "quant";

interface InstrumentRanking {
  symbol: string;
  name: string;
  assetClass: string;
  rank: number;
  totalScore: number;
  breakdown: {
    liquidity: number;
    pcttFitness: number;
    opportunity: number;
    realizedEdge: number;
    userFit: number;
  };
  signals: {
    side: "long" | "short" | "neutral";
    confidence: number;
    structure?: string;
  };
  isActive: boolean;
  inCooldown: boolean;
  cooldownEndsAt?: Date;
}

interface AgentThought {
  id: string;
  timestamp: Date;
  message: string;
  type: "rotation" | "signal" | "risk" | "info";
}

// ============================================================================
// OPPORTUNITY RADAR COMPONENT
// ============================================================================

export function OpportunityRadar() {
  const [rankings, setRankings] = useState<InstrumentRanking[]>([]);
  const [thoughts, setThoughts] = useState<AgentThought[]>([]);
  const [tier, setTier] = useState<UserTier>("pro");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "opportunities"
  >("all");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [rankingsRes, iseRes] = await Promise.all([
        fetch(`/api/trading/ise?action=rankings&tier=${tier}`),
        fetch("/api/trading/ise?action=status"),
      ]);

      if (rankingsRes.ok) {
        const data = await rankingsRes.json();
        setRankings(data.data?.rankings || generateMockRankings());
      }

      if (iseRes.ok) {
        const data = await iseRes.json();
        if (data.data?.thoughts) {
          setThoughts(data.data.thoughts);
        }
      }
    } catch (error) {
      console.error("Failed to fetch ISE data:", error);
      setRankings(generateMockRankings());
    } finally {
      setIsLoading(false);
    }
  }, [tier]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter rankings
  const filteredRankings = rankings.filter((r) => {
    if (activeFilter === "active") return r.isActive;
    if (activeFilter === "opportunities")
      return r.totalScore > 0.7 && !r.inCooldown;
    return true;
  });

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return "text-green-600 dark:text-green-400";
    if (score >= 0.6) return "text-blue-600 dark:text-blue-400";
    if (score >= 0.4) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-500 dark:text-slate-400";
  };

  const getScoreBg = (score: number): string => {
    if (score >= 0.8) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 0.6) return "bg-blue-100 dark:bg-blue-900/30";
    if (score >= 0.4) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-gray-100 dark:bg-slate-700";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Opportunity Radar
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {rankings.filter((r) => r.isActive).length} active instruments
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-500 dark:text-slate-400 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Tier Selector */}
        <div className="flex items-center gap-2 mb-4">
          {(["beginner", "pro", "quant"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${tier === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-lg">
          {(["all", "active", "opportunities"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeFilter === filter ? "bg-white dark:bg-slate-600 text-gray-900 shadow-sm" : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"}`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Rankings List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
        {filteredRankings.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-slate-400">
              No instruments match filter
            </p>
          </div>
        ) : (
          filteredRankings.map((ranking) => (
            <div
              key={ranking.symbol}
              onClick={() =>
                setSelectedSymbol(
                  selectedSymbol === ranking.symbol ? null : ranking.symbol,
                )
              }
              className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                selectedSymbol === ranking.symbol
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${ranking.rank <= 3 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"}`}
                  >
                    {ranking.rank}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {ranking.symbol}
                      </span>
                      {ranking.isActive && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {ranking.inCooldown && (
                        <Clock className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                      <span>{ranking.name}</span>
                      <span>•</span>
                      <span className="capitalize">{ranking.assetClass}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Signal Direction */}
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded ${ranking.signals.side === "long" ? "bg-green-100 text-green-700" : ranking.signals.side === "short" ? "bg-red-100 text-red-700" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"}`}
                  >
                    {ranking.signals.side === "long" ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : ranking.signals.side === "short" ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                    <span className="text-xs font-medium">
                      {(ranking.signals.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Total Score */}
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreBg(ranking.totalScore)} ${getScoreColor(ranking.totalScore)}`}
                  >
                    {(ranking.totalScore * 100).toFixed(0)}
                  </div>

                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 dark:text-slate-500 transition-transform ${
                      selectedSymbol === ranking.symbol ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {selectedSymbol === ranking.symbol && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <div className="grid grid-cols-5 gap-3">
                    <ScoreBar
                      label="Liquidity"
                      value={ranking.breakdown.liquidity}
                    />
                    <ScoreBar
                      label="PCTT"
                      value={ranking.breakdown.pcttFitness}
                    />
                    <ScoreBar
                      label="Opportunity"
                      value={ranking.breakdown.opportunity}
                    />
                    <ScoreBar
                      label="Edge"
                      value={ranking.breakdown.realizedEdge}
                    />
                    <ScoreBar label="Fit" value={ranking.breakdown.userFit} />
                  </div>

                  {ranking.signals.structure && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-700 dark:text-slate-300">
                          {ranking.signals.structure}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                      Analyze
                    </button>
                    <button className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors">
                      Trade
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Agent Thoughts Ticker */}
      {thoughts.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="overflow-hidden">
              <p className="text-gray-700 dark:text-slate-300 truncate">
                {thoughts[0]?.message || "Analyzing market conditions..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ScoreBar({ label, value }: { label: string; value: number }) {
  const getBarColor = (v: number): string => {
    if (v >= 0.8) return "bg-green-500";
    if (v >= 0.6) return "bg-blue-500";
    if (v >= 0.4) return "bg-yellow-500";
    return "bg-gray-400";
  };

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-slate-400">{label}</span>
        <span className="font-medium text-gray-700 dark:text-slate-300">
          {(value * 100).toFixed(0)}
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
        {/* Dynamic width requires inline style - Tailwind cannot handle runtime percentages */}
        <div
          className={`h-full ${getBarColor(value)} transition-all`}
          style={
            { width: `${Math.round(value * 100)}%` } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

function generateMockRankings(): InstrumentRanking[] {
  const symbols = [
    { symbol: "AAPL", name: "Apple Inc.", assetClass: "equity" },
    { symbol: "MSFT", name: "Microsoft Corp.", assetClass: "equity" },
    { symbol: "GOOGL", name: "Alphabet Inc.", assetClass: "equity" },
    { symbol: "AMZN", name: "Amazon.com Inc.", assetClass: "equity" },
    { symbol: "NVDA", name: "NVIDIA Corp.", assetClass: "equity" },
    { symbol: "TSLA", name: "Tesla Inc.", assetClass: "equity" },
    { symbol: "META", name: "Meta Platforms", assetClass: "equity" },
    { symbol: "ES", name: "E-mini S&P 500", assetClass: "futures" },
    { symbol: "NQ", name: "E-mini Nasdaq", assetClass: "futures" },
    { symbol: "EUR/USD", name: "Euro/US Dollar", assetClass: "forex" },
  ];

  return symbols.map((s, i) => ({
    ...s,
    rank: i + 1,
    totalScore: 0.95 - i * 0.08 + Math.random() * 0.05,
    breakdown: {
      liquidity: 0.7 + Math.random() * 0.3,
      pcttFitness: 0.5 + Math.random() * 0.5,
      opportunity: 0.4 + Math.random() * 0.6,
      realizedEdge: 0.3 + Math.random() * 0.7,
      userFit: 0.6 + Math.random() * 0.4,
    },
    signals: {
      side:
        Math.random() > 0.5
          ? "long"
          : ((Math.random() > 0.5 ? "short" : "neutral") as
              | "long"
              | "short"
              | "neutral"),
      confidence: 0.5 + Math.random() * 0.5,
      structure: i < 3 ? "Support bounce forming near key level" : undefined,
    },
    isActive: i < 5,
    inCooldown: i === 5 || i === 6,
    cooldownEndsAt: i === 5 ? new Date(Date.now() + 300000) : undefined,
  }));
}

export default OpportunityRadar;
