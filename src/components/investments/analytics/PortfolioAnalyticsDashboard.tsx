"use client";

/**
 * Portfolio Analytics Dashboard
 *
 * Comprehensive portfolio analysis with:
 * - Performance metrics (returns, Sharpe, Sortino, etc.)
 * - Asset allocation visualization
 * - Risk analysis (VaR, correlation matrix)
 * - Sector/geographic exposure
 * - Dividend income tracking
 * - Rebalancing recommendations
 */

import React, { useState, useMemo } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  sector?: string;
  assetClass: "stock" | "etf" | "bond" | "crypto" | "cash" | "other";
  region?: string;
  dividendYield?: number;
  beta?: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  ytdReturn: number;
  oneYearReturn: number;
  threeYearReturn?: number;
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  volatility: number;
  maxDrawdown: number;
  var95: number; // 95% Value at Risk
  cvar95: number; // Conditional VaR
  dividendIncome: number;
  dividendYield: number;
}

export interface AllocationData {
  name: string;
  value: number;
  percent: number;
  color: string;
}

export interface PortfolioAnalyticsDashboardProps {
  holdings: PortfolioHolding[];
  metrics: PortfolioMetrics;
  benchmarkName?: string;
  benchmarkReturn?: number;
  onRebalance?: () => void;
  onOptimize?: () => void;
  className?: string;
}

// ============================================================================
// COLOR PALETTE
// ============================================================================

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#3B82F6",
  Healthcare: "#10B981",
  Financial: "#F59E0B",
  Consumer: "#EF4444",
  Industrial: "#8B5CF6",
  Energy: "#EC4899",
  Utilities: "#06B6D4",
  "Real Estate": "#84CC16",
  Materials: "#F97316",
  Communication: "#6366F1",
  Other: "#6B7280",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PortfolioAnalyticsDashboard({
  holdings,
  metrics,
  benchmarkName = "S&P 500",
  benchmarkReturn = 12.5,
  onRebalance,
  onOptimize,
  className = "",
}: PortfolioAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "allocation" | "risk" | "income"
  >("overview");

  // Calculate allocations
  const { assetAllocation, sectorAllocation, regionAllocation } =
    useMemo(() => {
      const assetMap = new Map<string, number>();
      const sectorMap = new Map<string, number>();
      const regionMap = new Map<string, number>();

      holdings.forEach((h) => {
        const value = h.quantity * h.currentPrice;

        // Asset class
        assetMap.set(h.assetClass, (assetMap.get(h.assetClass) || 0) + value);

        // Sector
        if (h.sector) {
          sectorMap.set(h.sector, (sectorMap.get(h.sector) || 0) + value);
        }

        // Region
        if (h.region) {
          regionMap.set(h.region, (regionMap.get(h.region) || 0) + value);
        }
      });

      const toAllocation = (
        map: Map<string, number>,
        colorMap?: Record<string, string>,
      ): AllocationData[] => {
        const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
        return Array.from(map.entries())
          .map(([name, value], i) => ({
            name,
            value,
            percent: (value / total) * 100,
            color: colorMap?.[name] || COLORS[i % COLORS.length],
          }))
          .sort((a, b) => b.value - a.value);
      };

      return {
        assetAllocation: toAllocation(assetMap),
        sectorAllocation: toAllocation(sectorMap, SECTOR_COLORS),
        regionAllocation: toAllocation(regionMap),
      };
    }, [holdings]);

  // Top holdings
  const topHoldings = useMemo(() => {
    return [...holdings]
      .map((h) => ({
        ...h,
        value: h.quantity * h.currentPrice,
        gain: (h.currentPrice - h.avgCost) * h.quantity,
        gainPercent: ((h.currentPrice - h.avgCost) / h.avgCost) * 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [holdings]);

  return (
    <div className={`portfolio-analytics bg-gray-900 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              Portfolio Analytics
            </h2>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              {holdings.length} holdings • Updated just now
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRebalance}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Rebalance
            </button>
            <button
              onClick={onOptimize}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Optimize
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(["overview", "allocation", "risk", "income"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium transition ${
              activeTab === tab
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 dark:text-slate-500 hover:text-white"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "overview" && (
          <OverviewTab
            metrics={metrics}
            topHoldings={topHoldings}
            benchmarkName={benchmarkName}
            benchmarkReturn={benchmarkReturn}
          />
        )}
        {activeTab === "allocation" && (
          <AllocationTab
            assetAllocation={assetAllocation}
            sectorAllocation={sectorAllocation}
            regionAllocation={regionAllocation}
          />
        )}
        {activeTab === "risk" && (
          <RiskTab metrics={metrics} holdings={holdings} />
        )}
        {activeTab === "income" && (
          <IncomeTab holdings={holdings} metrics={metrics} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

interface OverviewTabProps {
  metrics: PortfolioMetrics;
  topHoldings: (PortfolioHolding & {
    value: number;
    gain: number;
    gainPercent: number;
  })[];
  benchmarkName: string;
  benchmarkReturn: number;
}

function OverviewTab({
  metrics,
  topHoldings,
  benchmarkName,
  benchmarkReturn,
}: OverviewTabProps) {
  const outperformance = metrics.oneYearReturn - benchmarkReturn;

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Portfolio Value"
          value={`$${formatNumber(metrics.totalValue)}`}
          subValue={`Cost: $${formatNumber(metrics.totalCost)}`}
        />
        <MetricCard
          label="Total Gain/Loss"
          value={`${metrics.totalGain >= 0 ? "+" : ""}$${formatNumber(metrics.totalGain)}`}
          subValue={`${metrics.totalGainPercent >= 0 ? "+" : ""}${metrics.totalGainPercent.toFixed(2)}%`}
          valueColor={
            metrics.totalGain >= 0 ? "text-green-400" : "text-red-400"
          }
        />
        <MetricCard
          label="Day Change"
          value={`${metrics.dayChange >= 0 ? "+" : ""}$${formatNumber(metrics.dayChange)}`}
          subValue={`${metrics.dayChangePercent >= 0 ? "+" : ""}${metrics.dayChangePercent.toFixed(2)}%`}
          valueColor={
            metrics.dayChange >= 0 ? "text-green-400" : "text-red-400"
          }
        />
        <MetricCard
          label="1Y Return"
          value={`${metrics.oneYearReturn >= 0 ? "+" : ""}${metrics.oneYearReturn.toFixed(2)}%`}
          subValue={`vs ${benchmarkName}: ${outperformance >= 0 ? "+" : ""}${outperformance.toFixed(2)}%`}
          valueColor={
            metrics.oneYearReturn >= 0 ? "text-green-400" : "text-red-400"
          }
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          label="Sharpe Ratio"
          value={metrics.sharpeRatio.toFixed(2)}
          small
        />
        <MetricCard
          label="Sortino Ratio"
          value={metrics.sortinoRatio.toFixed(2)}
          small
        />
        <MetricCard label="Beta" value={metrics.beta.toFixed(2)} small />
        <MetricCard
          label="Alpha"
          value={`${metrics.alpha >= 0 ? "+" : ""}${metrics.alpha.toFixed(2)}%`}
          small
        />
        <MetricCard
          label="Volatility"
          value={`${metrics.volatility.toFixed(1)}%`}
          small
        />
      </div>

      {/* Top Holdings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Top Holdings</h3>
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700/50 text-xs text-gray-400 dark:text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Weight</th>
                <th className="px-4 py-3 text-right">Gain/Loss</th>
                <th className="px-4 py-3 text-right">Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {topHoldings.map((h) => (
                <tr key={h.symbol} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{h.symbol}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {h.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    ${formatNumber(h.value)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {(
                      (h.value / topHoldings.reduce((s, x) => s + x.value, 0)) *
                      100
                    ).toFixed(1)}
                    %
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${h.gain >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {h.gain >= 0 ? "+" : ""}${formatNumber(h.gain)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${h.gainPercent >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {h.gainPercent >= 0 ? "+" : ""}
                    {h.gainPercent.toFixed(2)}%
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

// ============================================================================
// ALLOCATION TAB
// ============================================================================

interface AllocationTabProps {
  assetAllocation: AllocationData[];
  sectorAllocation: AllocationData[];
  regionAllocation: AllocationData[];
}

function AllocationTab({
  assetAllocation,
  sectorAllocation,
  regionAllocation,
}: AllocationTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Asset Class */}
      <AllocationChart title="Asset Class" data={assetAllocation} />

      {/* Sector */}
      <AllocationChart title="Sector" data={sectorAllocation} />

      {/* Region */}
      {regionAllocation.length > 0 && (
        <AllocationChart title="Region" data={regionAllocation} />
      )}
    </div>
  );
}

function AllocationChart({
  title,
  data,
}: {
  title: string;
  data: AllocationData[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        {title} Allocation
      </h3>

      {/* Simple bar chart */}
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">{item.name}</span>
              <span className="text-white font-medium">
                {item.percent.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.percent}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              ${formatNumber(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// RISK TAB
// ============================================================================

interface RiskTabProps {
  metrics: PortfolioMetrics;
  holdings: PortfolioHolding[];
}

function RiskTab({ metrics, holdings }: RiskTabProps) {
  // Calculate concentration risk
  const totalValue = holdings.reduce(
    (s, h) => s + h.quantity * h.currentPrice,
    0,
  );
  const sortedByValue = [...holdings]
    .map((h) => ({ ...h, value: h.quantity * h.currentPrice }))
    .sort((a, b) => b.value - a.value);

  const top5Weight =
    (sortedByValue.slice(0, 5).reduce((s, h) => s + h.value, 0) / totalValue) *
    100;
  const top10Weight =
    (sortedByValue.slice(0, 10).reduce((s, h) => s + h.value, 0) / totalValue) *
    100;

  // Risk level assessment
  const getRiskLevel = (
    value: number,
    thresholds: [number, number],
  ): "low" | "medium" | "high" => {
    if (value < thresholds[0]) return "low";
    if (value < thresholds[1]) return "medium";
    return "high";
  };

  const riskIndicators = [
    {
      label: "Volatility",
      value: `${metrics.volatility.toFixed(1)}%`,
      level: getRiskLevel(metrics.volatility, [15, 25]),
      description: "Annualized standard deviation of returns",
    },
    {
      label: "Max Drawdown",
      value: `${metrics.maxDrawdown.toFixed(1)}%`,
      level: getRiskLevel(Math.abs(metrics.maxDrawdown), [15, 30]),
      description: "Largest peak-to-trough decline",
    },
    {
      label: "Value at Risk (95%)",
      value: `$${formatNumber(metrics.var95)}`,
      level: getRiskLevel((metrics.var95 / metrics.totalValue) * 100, [2, 5]),
      description: "Maximum expected loss in a day (95% confidence)",
    },
    {
      label: "Beta",
      value: metrics.beta.toFixed(2),
      level: getRiskLevel(Math.abs(metrics.beta - 1), [0.3, 0.6]),
      description: "Market sensitivity relative to S&P 500",
    },
    {
      label: "Top 5 Concentration",
      value: `${top5Weight.toFixed(1)}%`,
      level: getRiskLevel(top5Weight, [40, 60]),
      description: "Weight of top 5 holdings",
    },
    {
      label: "Top 10 Concentration",
      value: `${top10Weight.toFixed(1)}%`,
      level: getRiskLevel(top10Weight, [60, 80]),
      description: "Weight of top 10 holdings",
    },
  ];

  const levelColors = {
    low: "text-green-400 bg-green-400/10",
    medium: "text-yellow-400 bg-yellow-400/10",
    high: "text-red-400 bg-red-400/10",
  };

  return (
    <div className="space-y-6">
      {/* Risk Score */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Risk Score</h3>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              Based on volatility, concentration, and market exposure
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-400">
              {calculateRiskScore(metrics, top5Weight)}
            </div>
            <div className="text-sm text-gray-400 dark:text-slate-500">
              / 100
            </div>
          </div>
        </div>
      </div>

      {/* Risk Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {riskIndicators.map((indicator, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-400 dark:text-slate-500">
                  {indicator.label}
                </div>
                <div className="text-xl font-semibold text-white mt-1">
                  {indicator.value}
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${levelColors[indicator.level]}`}
              >
                {indicator.level.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
              {indicator.description}
            </p>
          </div>
        ))}
      </div>

      {/* High Beta Holdings */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          High Beta Holdings
        </h3>
        <div className="space-y-2">
          {holdings
            .filter((h) => h.beta && h.beta > 1.3)
            .sort((a, b) => (b.beta || 0) - (a.beta || 0))
            .slice(0, 5)
            .map((h) => (
              <div
                key={h.symbol}
                className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
              >
                <span className="text-white font-medium">{h.symbol}</span>
                <span className="text-yellow-400">β {h.beta?.toFixed(2)}</span>
              </div>
            ))}
          {holdings.filter((h) => h.beta && h.beta > 1.3).length === 0 && (
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              No high-beta holdings
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INCOME TAB
// ============================================================================

interface IncomeTabProps {
  holdings: PortfolioHolding[];
  metrics: PortfolioMetrics;
}

function IncomeTab({ holdings, metrics }: IncomeTabProps) {
  // Calculate dividend-paying holdings
  const dividendHoldings = holdings
    .filter((h) => h.dividendYield && h.dividendYield > 0)
    .map((h) => ({
      ...h,
      value: h.quantity * h.currentPrice,
      annualDividend: h.quantity * h.currentPrice * (h.dividendYield! / 100),
    }))
    .sort((a, b) => b.annualDividend - a.annualDividend);

  const totalDividends = dividendHoldings.reduce(
    (s, h) => s + h.annualDividend,
    0,
  );
  const avgYield = metrics.dividendYield;

  return (
    <div className="space-y-6">
      {/* Income Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Annual Dividend Income"
          value={`$${formatNumber(totalDividends)}`}
          subValue={`$${formatNumber(totalDividends / 12)}/month`}
        />
        <MetricCard
          label="Portfolio Yield"
          value={`${avgYield.toFixed(2)}%`}
          subValue="Weighted average"
        />
        <MetricCard
          label="Dividend Payers"
          value={`${dividendHoldings.length}`}
          subValue={`of ${holdings.length} holdings`}
        />
      </div>

      {/* Dividend Holdings Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <h3 className="text-lg font-semibold text-white px-4 py-3 border-b border-gray-700">
          Dividend Holdings
        </h3>
        <table className="w-full">
          <thead className="bg-gray-700/50 text-xs text-gray-400 dark:text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Symbol</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">Yield</th>
              <th className="px-4 py-3 text-right">Annual Income</th>
              <th className="px-4 py-3 text-right">% of Total Income</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {dividendHoldings.slice(0, 10).map((h) => (
              <tr key={h.symbol} className="hover:bg-gray-700/30">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{h.symbol}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {h.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-white">
                  ${formatNumber(h.value)}
                </td>
                <td className="px-4 py-3 text-right text-green-400">
                  {h.dividendYield?.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right text-white">
                  ${formatNumber(h.annualDividend)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {((h.annualDividend / totalDividends) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
  small?: boolean;
}

function MetricCard({
  label,
  value,
  subValue,
  valueColor = "text-white",
  small = false,
}: MetricCardProps) {
  return (
    <div className={`bg-gray-800 rounded-lg ${small ? "p-3" : "p-4"}`}>
      <div
        className={`text-gray-400 dark:text-slate-500 ${small ? "text-xs" : "text-sm"}`}
      >
        {label}
      </div>
      <div
        className={`font-bold ${valueColor} ${small ? "text-lg" : "text-2xl"} mt-1`}
      >
        {value}
      </div>
      {subValue && (
        <div
          className={`text-gray-500 dark:text-slate-400 ${small ? "text-xs" : "text-sm"} mt-1`}
        >
          {subValue}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toFixed(2);
}

function calculateRiskScore(
  metrics: PortfolioMetrics,
  concentration: number,
): number {
  // Simple risk score calculation (lower is less risky)
  let score = 50; // Base score

  // Volatility impact
  if (metrics.volatility < 15) score -= 10;
  else if (metrics.volatility > 25) score += 15;

  // Beta impact
  if (metrics.beta < 0.8) score -= 10;
  else if (metrics.beta > 1.3) score += 10;

  // Concentration impact
  if (concentration > 60) score += 15;
  else if (concentration < 30) score -= 10;

  // Max drawdown impact
  if (Math.abs(metrics.maxDrawdown) > 25) score += 15;
  else if (Math.abs(metrics.maxDrawdown) < 10) score -= 10;

  return Math.max(0, Math.min(100, score));
}

export default PortfolioAnalyticsDashboard;
