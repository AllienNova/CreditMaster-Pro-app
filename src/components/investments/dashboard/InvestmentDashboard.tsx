"use client";

/**
 * Investment Dashboard
 *
 * Comprehensive investment analysis and monitoring dashboard:
 * - Portfolio overview and metrics
 * - Multi-asset scanner
 * - Technical analysis charts
 * - AI recommendations
 * - Price alerts management
 * - Pattern recognition
 */

import React, { useState, useEffect, useCallback } from "react";
import { AdvancedChartContainer } from "../charts/AdvancedChartContainer";
import { AlertsPanel } from "../alerts/AlertsPanel";
import { PatternOverlay } from "../patterns/PatternOverlay";

// ============================================================================
// TYPES
// ============================================================================

interface DashboardProps {
  userId: string;
  className?: string;
}

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

type DashboardTab =
  | "overview"
  | "scanner"
  | "analysis"
  | "recommendations"
  | "alerts";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InvestmentDashboard({
  userId,
  className = "",
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [portfolioSummary, setPortfolioSummary] =
    useState<PortfolioSummary | null>(null);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [patternData, setPatternData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load watchlist (mock data for now)
      setWatchlist([
        {
          symbol: "AAPL",
          name: "Apple Inc.",
          price: 178.5,
          change: 2.3,
          changePercent: 1.31,
        },
        {
          symbol: "GOOGL",
          name: "Alphabet Inc.",
          price: 141.25,
          change: -0.75,
          changePercent: -0.53,
        },
        {
          symbol: "MSFT",
          name: "Microsoft Corp.",
          price: 378.9,
          change: 4.2,
          changePercent: 1.12,
        },
        {
          symbol: "TSLA",
          name: "Tesla Inc.",
          price: 248.3,
          change: -3.5,
          changePercent: -1.39,
        },
        {
          symbol: "NVDA",
          name: "NVIDIA Corp.",
          price: 495.2,
          change: 12.8,
          changePercent: 2.65,
        },
      ]);

      // Load portfolio summary (mock data)
      setPortfolioSummary({
        totalValue: 125750.0,
        totalGainLoss: 15250.0,
        totalGainLossPercent: 13.8,
        dayChange: 1250.5,
        dayChangePercent: 1.0,
      });
    } catch (_error) {
      // InvestmentDashboard error: Failed to load dashboard data
      void _error;
    } finally {
      setLoading(false);
    }
  };

  const handleSymbolSelect = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab("analysis");
  }, []);

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${className}`}>
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Investment Intelligence</h1>
            <p className="text-sm text-gray-400 dark:text-slate-500">
              AI-powered analysis and recommendations
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAlertsPanelOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
            >
              Alerts
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-gray-800/50 border-b border-gray-700 px-6">
        <div className="flex gap-1">
          {(
            [
              "overview",
              "scanner",
              "analysis",
              "recommendations",
              "alerts",
            ] as DashboardTab[]
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 dark:text-slate-500 hover:text-white"
              }`}
            >
              {tab === "overview" && ""}
              {tab === "scanner" && ""}
              {tab === "analysis" && ""}
              {tab === "recommendations" && ""}
              {tab === "alerts" && ""}
              <span className="ml-2 capitalize">{tab}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab
                portfolioSummary={portfolioSummary}
                watchlist={watchlist}
                onSymbolSelect={handleSymbolSelect}
              />
            )}
            {activeTab === "scanner" && (
              <ScannerTab onSymbolSelect={handleSymbolSelect} />
            )}
            {activeTab === "analysis" && (
              <AnalysisTab
                symbol={selectedSymbol}
                patternData={patternData}
                onPatternScan={setPatternData}
              />
            )}
            {activeTab === "recommendations" && (
              <RecommendationsTab symbol={selectedSymbol} />
            )}
            {activeTab === "alerts" && (
              <AlertsTab userId={userId} symbol={selectedSymbol} />
            )}
          </>
        )}
      </main>

      {/* Alerts Panel Sidebar */}
      <AlertsPanel
        userId={userId}
        symbol={selectedSymbol}
        isOpen={alertsPanelOpen}
        onClose={() => setAlertsPanelOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}

function OverviewTab({
  portfolioSummary,
  watchlist,
  onSymbolSelect,
}: {
  portfolioSummary: PortfolioSummary | null;
  watchlist: WatchlistItem[];
  onSymbolSelect: (symbol: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      {portfolioSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Portfolio Value"
            value={`$${portfolioSummary.totalValue.toLocaleString()}`}
            subtitle="Total holdings"
          />
          <SummaryCard
            title="Total Gain/Loss"
            value={`$${portfolioSummary.totalGainLoss.toLocaleString()}`}
            subtitle={`${portfolioSummary.totalGainLossPercent >= 0 ? "+" : ""}${portfolioSummary.totalGainLossPercent.toFixed(2)}%`}
            positive={portfolioSummary.totalGainLoss >= 0}
          />
          <SummaryCard
            title="Day Change"
            value={`$${portfolioSummary.dayChange.toLocaleString()}`}
            subtitle={`${portfolioSummary.dayChangePercent >= 0 ? "+" : ""}${portfolioSummary.dayChangePercent.toFixed(2)}%`}
            positive={portfolioSummary.dayChange >= 0}
          />
          <SummaryCard
            title="Active Alerts"
            value="3"
            subtitle="Price & pattern alerts"
          />
        </div>
      )}

      {/* Watchlist */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Watchlist</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 dark:text-slate-500 text-sm border-b border-gray-700">
                <th className="pb-3">Symbol</th>
                <th className="pb-3">Name</th>
                <th className="pb-3 text-right">Price</th>
                <th className="pb-3 text-right">Change</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item) => (
                <tr
                  key={item.symbol}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                  onClick={() => onSymbolSelect(item.symbol)}
                >
                  <td className="py-3 font-medium">{item.symbol}</td>
                  <td className="py-3 text-gray-400 dark:text-slate-500">
                    {item.name}
                  </td>
                  <td className="py-3 text-right">${item.price.toFixed(2)}</td>
                  <td
                    className={`py-3 text-right ${item.change >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {item.change >= 0 ? "+" : ""}
                    {item.change.toFixed(2)} ({item.changePercent.toFixed(2)}%)
                  </td>
                  <td className="py-3 text-right">
                    <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">
                      Analyze
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  positive,
}: {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-sm text-gray-400 dark:text-slate-500">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p
        className={`text-sm mt-1 ${
          positive === undefined
            ? "text-gray-400 dark:text-slate-500"
            : positive
              ? "text-green-400"
              : "text-red-400"
        }`}
      >
        {subtitle}
      </p>
    </div>
  );
}

function ScannerTab({
  onSymbolSelect,
}: {
  onSymbolSelect: (symbol: string) => void;
}) {
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanType, setScanType] = useState<
    "patterns" | "breakouts" | "oversold" | "overbought"
  >("patterns");

  const runScan = async () => {
    setScanning(true);
    // Mock scan results
    setTimeout(() => {
      setScanResults([
        {
          symbol: "AAPL",
          pattern: "Double Bottom",
          reliability: 78,
          direction: "bullish",
        },
        {
          symbol: "NVDA",
          pattern: "Bull Flag",
          reliability: 82,
          direction: "bullish",
        },
        {
          symbol: "TSLA",
          pattern: "Head & Shoulders",
          reliability: 65,
          direction: "bearish",
        },
        {
          symbol: "AMD",
          pattern: "Ascending Triangle",
          reliability: 71,
          direction: "bullish",
        },
      ]);
      setScanning(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Market Scanner</h3>
        <div className="flex gap-4 mb-4">
          {(["patterns", "breakouts", "oversold", "overbought"] as const).map(
            (type) => (
              <button
                key={type}
                onClick={() => setScanType(type)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  scanType === type
                    ? "bg-blue-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {type}
              </button>
            ),
          )}
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Run Scan"}
        </button>
      </div>

      {scanResults.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Scan Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scanResults.map((result, idx) => (
              <div
                key={idx}
                onClick={() => onSymbolSelect(result.symbol)}
                className="p-4 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{result.symbol}</p>
                    <p className="text-sm text-gray-400 dark:text-slate-500">
                      {result.pattern}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      result.direction === "bullish"
                        ? "bg-green-600"
                        : "bg-red-600"
                    }`}
                  >
                    {result.direction}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Reliability</span>
                    <span>{result.reliability}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${result.reliability >= 70 ? "bg-green-500" : "bg-yellow-500"}`}
                      style={{ width: `${result.reliability}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisTab({
  symbol,
  patternData,
  onPatternScan,
}: {
  symbol: string;
  patternData: any;
  onPatternScan: (data: any) => void;
}) {
  const [scanning, setScanning] = useState(false);

  const scanPatterns = async () => {
    setScanning(true);
    try {
      const response = await fetch("/api/investments/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await response.json();
      onPatternScan(data);
    } catch (_error) {
      // InvestmentDashboard error: Pattern scan failed
      void _error;
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Technical Analysis: {symbol}</h3>
        <button
          onClick={scanPatterns}
          disabled={scanning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Scan Patterns"}
        </button>
      </div>

      {/* Chart */}
      <div className="bg-gray-800 rounded-lg p-4">
        <AdvancedChartContainer
          symbol={symbol}
          initialTimeframe="1d"
          height={500}
          showToolbar={true}
          showIndicatorPanel={true}
        />
      </div>

      {/* Pattern Results */}
      {patternData && patternData.patterns && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="font-semibold mb-4">
            Detected Patterns ({patternData.patterns.length})
          </h4>
          {patternData.patterns.length === 0 ? (
            <p className="text-gray-400 dark:text-slate-500">
              No patterns detected
            </p>
          ) : (
            <div className="space-y-3">
              {patternData.patterns.map((pattern: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">{pattern.type}</span>
                    <span
                      className={
                        pattern.direction === "bullish"
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {pattern.direction}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                    Target: ${pattern.priceTarget?.toFixed(2)} | Reliability:{" "}
                    {pattern.reliability}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecommendationsTab({ symbol }: { symbol: string }) {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getRecommendation = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/investments/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, includePrice: true }),
      });
      const data = await response.json();
      setRecommendation(data);
    } catch (_error) {
      // InvestmentDashboard error: Failed to get recommendation
      void _error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      getRecommendation();
    }
  }, [symbol]);

  const getActionColor = (action: string) => {
    switch (action) {
      case "strong_buy":
        return "bg-green-600";
      case "buy":
        return "bg-green-500";
      case "hold":
        return "bg-yellow-500";
      case "sell":
        return "bg-red-500";
      case "strong_sell":
        return "bg-red-600";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Recommendations: {symbol}</h3>
        <button
          onClick={getRecommendation}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Refresh Analysis"}
        </button>
      </div>

      {loading && <LoadingState />}

      {!loading && recommendation?.recommendation && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Recommendation */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Recommendation</h4>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(recommendation.recommendation.action)}`}
              >
                {recommendation.recommendation.action
                  .replace("_", " ")
                  .toUpperCase()}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-slate-500">
                  Confidence
                </span>
                <span>
                  {recommendation.recommendation.confidence.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-slate-500">
                  Price Target
                </span>
                <span>
                  ${recommendation.recommendation.priceTarget.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-slate-500">
                  Expected Return
                </span>
                <span
                  className={
                    recommendation.recommendation.expectedReturn >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {recommendation.recommendation.expectedReturn >= 0 ? "+" : ""}
                  {recommendation.recommendation.expectedReturn.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-slate-500">
                  Risk Score
                </span>
                <span>
                  {recommendation.recommendation.riskScore.toFixed(0)}/100
                </span>
              </div>
            </div>
          </div>

          {/* Entry/Exit Levels */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="font-semibold mb-4">Entry/Exit Levels</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-slate-500">
                  Entry Price
                </span>
                <span className="text-blue-400">
                  ${recommendation.recommendation.entryPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-slate-500">
                  Stop Loss
                </span>
                <span className="text-red-400">
                  ${recommendation.recommendation.stopLoss.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-slate-500">
                  Take Profit 1
                </span>
                <span className="text-green-400">
                  ${recommendation.recommendation.takeProfit[0]?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-slate-500">
                  Take Profit 2
                </span>
                <span className="text-green-400">
                  ${recommendation.recommendation.takeProfit[1]?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Reasons */}
          {recommendation.recommendation.reasons?.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h4 className="font-semibold mb-4">Analysis Factors</h4>
              <div className="space-y-2">
                {recommendation.recommendation.reasons.map(
                  (reason: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          reason.impact === "positive"
                            ? "bg-green-400"
                            : reason.impact === "negative"
                              ? "bg-red-400"
                              : "bg-yellow-400"
                        }`}
                      />
                      <span className="text-sm">{reason.description}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Risks */}
          {recommendation.recommendation.risks?.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h4 className="font-semibold mb-4">Risk Factors</h4>
              <div className="space-y-2">
                {recommendation.recommendation.risks.map(
                  (risk: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-red-400"></span>
                      <span className="text-sm">{risk}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlertsTab({ userId, symbol }: { userId: string; symbol: string }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Price Alerts</h3>
      <AlertsPanel
        userId={userId}
        symbol={symbol}
        isOpen={true}
        onClose={() => {}}
        embedded={true}
      />
    </div>
  );
}

export default InvestmentDashboard;
