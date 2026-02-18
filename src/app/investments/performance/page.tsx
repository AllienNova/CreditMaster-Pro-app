"use client";

/**
 * Portfolio Performance Page
 *
 * Historical performance charts, benchmark comparisons, and return analytics.
 * Displays time-weighted returns, drawdown analysis, and period comparisons.
 */

import { useState, useEffect, useCallback } from "react";
import type { PerformancePoint } from "@/lib/investments/types/investment.types";

// ============================================================================
// TYPES
// ============================================================================

type TimePeriod =
  | "1W"
  | "1M"
  | "3M"
  | "6M"
  | "YTD"
  | "1Y"
  | "3Y"
  | "5Y"
  | "ALL";

interface PerformanceData {
  points: PerformancePoint[];
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  bestDay: { date: string; return: number };
  worstDay: { date: string; return: number };
  maxDrawdown: number;
  maxDrawdownDate: string;
  sharpeRatio: number;
  volatility: number;
  winRate: number;
  benchmarkReturn: number;
  alpha: number;
}

interface PeriodReturn {
  period: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  alpha: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatLargeNumber(value: number): string {
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return formatCurrency(value);
}

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

function generateMockPerformanceData(period: TimePeriod): PerformanceData {
  const periodDays: Record<TimePeriod, number> = {
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "6M": 180,
    YTD: 45,
    "1Y": 365,
    "3Y": 1095,
    "5Y": 1825,
    ALL: 2555,
  };

  const days = periodDays[period];
  const startValue = 100000;
  let currentValue = startValue;
  const points: PerformancePoint[] = [];
  let maxValue = startValue;
  let maxDrawdown = 0;
  let maxDrawdownDate = "";
  let bestDay = { date: "", return: -Infinity };
  let worstDay = { date: "", return: Infinity };
  let positiveDays = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));

    // Simulate daily returns with slight upward bias
    const dailyReturn = (Math.random() - 0.47) * 0.03;
    currentValue = currentValue * (1 + dailyReturn);
    const cumulativeReturn = ((currentValue - startValue) / startValue) * 100;

    // Track max value for drawdown calculation
    if (currentValue > maxValue) maxValue = currentValue;
    const drawdown = ((currentValue - maxValue) / maxValue) * 100;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownDate = date.toISOString().split("T")[0];
    }

    // Track best/worst days
    if (dailyReturn > bestDay.return) {
      bestDay = {
        date: date.toISOString().split("T")[0],
        return: dailyReturn * 100,
      };
    }
    if (dailyReturn < worstDay.return) {
      worstDay = {
        date: date.toISOString().split("T")[0],
        return: dailyReturn * 100,
      };
    }

    if (dailyReturn > 0) positiveDays++;

    // Benchmark return (S&P 500 simulation)
    const benchmarkReturn = (Math.random() - 0.48) * 0.025;

    points.push({
      date: date,
      value: currentValue,
      dayReturn: dailyReturn * 100,
      cumulativeReturn: cumulativeReturn,
      benchmark:
        startValue * (1 + (i / days) * 0.12 + (Math.random() - 0.5) * 0.02),
    });
  }

  const totalReturn = currentValue - startValue;
  const totalReturnPercent = (totalReturn / startValue) * 100;
  const annualizedReturn = totalReturnPercent * (365 / days);
  const benchmarkReturn = 12 * (days / 365);

  // Approximate daily return std dev for Sharpe
  const dailyReturns = points.map((p) => p.dayReturn);
  const avgDailyReturn =
    dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) /
    dailyReturns.length;
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(252);
  const sharpeRatio = annualVol > 0 ? (annualizedReturn - 4.5) / annualVol : 0;

  return {
    points,
    totalReturn,
    totalReturnPercent,
    annualizedReturn,
    bestDay: { date: bestDay.date, return: bestDay.return },
    worstDay: { date: worstDay.date, return: worstDay.return },
    maxDrawdown,
    maxDrawdownDate,
    sharpeRatio,
    volatility: annualVol,
    winRate: (positiveDays / days) * 100,
    benchmarkReturn,
    alpha: annualizedReturn - benchmarkReturn,
  };
}

function generatePeriodReturns(): PeriodReturn[] {
  return [
    {
      period: "1 Week",
      portfolioReturn: 1.24,
      benchmarkReturn: 0.87,
      alpha: 0.37,
    },
    {
      period: "1 Month",
      portfolioReturn: 3.56,
      benchmarkReturn: 2.14,
      alpha: 1.42,
    },
    {
      period: "3 Months",
      portfolioReturn: 8.12,
      benchmarkReturn: 6.45,
      alpha: 1.67,
    },
    {
      period: "6 Months",
      portfolioReturn: 14.28,
      benchmarkReturn: 11.32,
      alpha: 2.96,
    },
    {
      period: "YTD",
      portfolioReturn: 6.78,
      benchmarkReturn: 5.23,
      alpha: 1.55,
    },
    {
      period: "1 Year",
      portfolioReturn: 18.45,
      benchmarkReturn: 14.67,
      alpha: 3.78,
    },
    {
      period: "3 Years",
      portfolioReturn: 42.12,
      benchmarkReturn: 35.89,
      alpha: 6.23,
    },
    {
      period: "5 Years",
      portfolioReturn: 78.34,
      benchmarkReturn: 62.15,
      alpha: 16.19,
    },
  ];
}

// ============================================================================
// TIME PERIOD OPTIONS
// ============================================================================

const TIME_PERIODS: Array<{ id: TimePeriod; label: string }> = [
  { id: "1W", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "3M", label: "3M" },
  { id: "6M", label: "6M" },
  { id: "YTD", label: "YTD" },
  { id: "1Y", label: "1Y" },
  { id: "3Y", label: "3Y" },
  { id: "5Y", label: "5Y" },
  { id: "ALL", label: "All" },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PerformancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("1Y");
  const [performanceData, setPerformanceData] =
    useState<PerformanceData | null>(null);
  const [periodReturns, setPeriodReturns] = useState<PeriodReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBenchmark, setShowBenchmark] = useState(true);

  const fetchPerformance = useCallback(async (period: TimePeriod) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/investments/portfolio/performance?period=${period}`,
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPerformanceData(result.data);
          setPeriodReturns(result.periodReturns || []);
          return;
        }
      }

      // Fallback to mock data if API is not available
      const mockData = generateMockPerformanceData(period);
      setPerformanceData(mockData);
      setPeriodReturns(generatePeriodReturns());
    } catch {
      // Fallback to mock data on error
      const mockData = generateMockPerformanceData(period);
      setPerformanceData(mockData);
      setPeriodReturns(generatePeriodReturns());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPerformance(selectedPeriod);
  }, [selectedPeriod, fetchPerformance]);

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return <PerformanceLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-red-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading Performance
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={() => void fetchPerformance(selectedPeriod)}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!performanceData) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Portfolio Performance
              </h1>
              <p className="mt-2 text-gray-600 dark:text-slate-400">
                Historical returns, benchmarks, and performance analytics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={showBenchmark}
                  onChange={(e) => setShowBenchmark(e.target.checked)}
                  className="rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                />
                Show Benchmark (S&P 500)
              </label>
              <button
                onClick={() => void fetchPerformance(selectedPeriod)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <SummaryCards data={performanceData} />

        {/* Period Selector */}
        <div className="mt-6 mb-4">
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
            {TIME_PERIODS.map((period) => (
              <button
                key={period.id}
                onClick={() => handlePeriodChange(period.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period.id
                    ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Performance Chart (Visual representation) */}
        <PerformanceChart
          data={performanceData}
          showBenchmark={showBenchmark}
          period={selectedPeriod}
        />

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <DrawdownAnalysis data={performanceData} />
          <RiskMetricsCard data={performanceData} />
        </div>

        {/* Period Returns Table */}
        <PeriodReturnsTable returns={periodReturns} />

        {/* Daily Returns Distribution */}
        <DailyReturnsDistribution points={performanceData.points} />
      </div>
    </div>
  );
}

// ============================================================================
// SUMMARY CARDS
// ============================================================================

function SummaryCards({ data }: { data: PerformanceData }) {
  const stats = [
    {
      label: "Total Return",
      value: formatLargeNumber(data.totalReturn),
      subValue: formatPercent(data.totalReturnPercent),
      isPositive: data.totalReturn >= 0,
    },
    {
      label: "Annualized Return",
      value: formatPercent(data.annualizedReturn),
      subValue: null,
      isPositive: data.annualizedReturn >= 0,
    },
    {
      label: "Alpha vs Benchmark",
      value: formatPercent(data.alpha),
      subValue: `Benchmark: ${formatPercent(data.benchmarkReturn)}`,
      isPositive: data.alpha >= 0,
    },
    {
      label: "Current Value",
      value: formatLargeNumber(
        data.points.length > 0 ? data.points[data.points.length - 1].value : 0,
      ),
      subValue: null,
      isPositive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6"
        >
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
            {stat.label}
          </p>
          <p
            className={`text-2xl font-bold ${
              stat.isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {stat.value}
          </p>
          {stat.subValue && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {stat.subValue}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PERFORMANCE CHART
// ============================================================================

function PerformanceChart({
  data,
  showBenchmark,
  period,
}: {
  data: PerformanceData;
  showBenchmark: boolean;
  period: TimePeriod;
}) {
  if (data.points.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500 dark:text-slate-400">
          No performance data available for this period.
        </p>
      </div>
    );
  }

  // Normalize values to percentage for chart
  const startValue = data.points[0].value;
  const startBenchmark = data.points[0].benchmark || startValue;
  const maxReturn = Math.max(
    ...data.points.map((p) => ((p.value - startValue) / startValue) * 100),
    ...(showBenchmark && data.points[0].benchmark
      ? data.points.map(
          (p) =>
            (((p.benchmark || startBenchmark) - startBenchmark) /
              startBenchmark) *
            100,
        )
      : [0]),
  );
  const minReturn = Math.min(
    ...data.points.map((p) => ((p.value - startValue) / startValue) * 100),
    ...(showBenchmark && data.points[0].benchmark
      ? data.points.map(
          (p) =>
            (((p.benchmark || startBenchmark) - startBenchmark) /
              startBenchmark) *
            100,
        )
      : [0]),
    0,
  );

  const range = maxReturn - minReturn || 1;
  const chartHeight = 300;
  const chartWidth = 100; // percentage width

  // Sample points for chart (max 100 points for performance)
  const sampleRate = Math.max(1, Math.floor(data.points.length / 100));
  const sampledPoints = data.points.filter((_, i) => i % sampleRate === 0);

  const getY = (returnPct: number) => {
    return chartHeight - ((returnPct - minReturn) / range) * chartHeight;
  };

  // Build SVG path for portfolio
  const portfolioPath = sampledPoints
    .map((point, idx) => {
      const x = (idx / (sampledPoints.length - 1)) * chartWidth;
      const returnPct = ((point.value - startValue) / startValue) * 100;
      const y = getY(returnPct);
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Build SVG path for benchmark
  const benchmarkPath =
    showBenchmark && sampledPoints[0].benchmark
      ? sampledPoints
          .map((point, idx) => {
            const x = (idx / (sampledPoints.length - 1)) * chartWidth;
            const returnPct =
              (((point.benchmark || startBenchmark) - startBenchmark) /
                startBenchmark) *
              100;
            const y = getY(returnPct);
            return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ")
      : "";

  // Zero line Y position
  const zeroY = getY(0);

  // Calculate tick marks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const returnVal = minReturn + (range / tickCount) * i;
    return { value: returnVal, y: getY(returnVal) };
  });

  // Date labels
  const dateLabels = [
    sampledPoints[0],
    sampledPoints[Math.floor(sampledPoints.length / 4)],
    sampledPoints[Math.floor(sampledPoints.length / 2)],
    sampledPoints[Math.floor((sampledPoints.length * 3) / 4)],
    sampledPoints[sampledPoints.length - 1],
  ].filter(Boolean);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Portfolio Value ({period})
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
            <span className="text-gray-500 dark:text-slate-400">Portfolio</span>
          </span>
          {showBenchmark && (
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-0.5 bg-blue-400 inline-block"
                style={{ borderTop: "2px dashed" }}
              />
              <span className="text-gray-500 dark:text-slate-400">S&P 500</span>
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`-10 -10 ${chartWidth + 20} ${chartHeight + 40}`}
          className="w-full"
          preserveAspectRatio="none"
          style={{ height: `${chartHeight}px` }}
        >
          {/* Grid lines */}
          {ticks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1="0"
                y1={tick.y}
                x2={chartWidth}
                y2={tick.y}
                stroke="currentColor"
                className="text-gray-200 dark:text-slate-700"
                strokeWidth="0.2"
              />
              <text
                x="-2"
                y={tick.y + 1}
                textAnchor="end"
                className="text-gray-400 dark:text-slate-500"
                fontSize="3"
              >
                {tick.value.toFixed(1)}%
              </text>
            </g>
          ))}

          {/* Zero line */}
          <line
            x1="0"
            y1={zeroY}
            x2={chartWidth}
            y2={zeroY}
            stroke="currentColor"
            className="text-gray-400 dark:text-slate-500"
            strokeWidth="0.3"
            strokeDasharray="1,1"
          />

          {/* Benchmark line */}
          {showBenchmark && benchmarkPath && (
            <path
              d={benchmarkPath}
              fill="none"
              stroke="#60A5FA"
              strokeWidth="0.5"
              strokeDasharray="2,1"
              opacity="0.7"
            />
          )}

          {/* Portfolio area fill */}
          <path
            d={`${portfolioPath} L ${chartWidth} ${zeroY} L 0 ${zeroY} Z`}
            fill="url(#portfolioGradient)"
            opacity="0.15"
          />

          {/* Portfolio line */}
          <path
            d={portfolioPath}
            fill="none"
            stroke="#10B981"
            strokeWidth="0.7"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient
              id="portfolioGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Date labels below chart */}
        <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-slate-500">
          {dateLabels.map((point, idx) => (
            <span key={idx}>
              {new Date(point.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year:
                  period === "1W" || period === "1M" ? undefined : "2-digit",
              })}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DRAWDOWN ANALYSIS
// ============================================================================

function DrawdownAnalysis({ data }: { data: PerformanceData }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Drawdown Analysis
      </h3>

      <div className="space-y-6">
        {/* Max Drawdown */}
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
            Maximum Drawdown
          </p>
          <p className="text-3xl font-bold text-red-600">
            {data.maxDrawdown.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Date: {data.maxDrawdownDate || "N/A"}
          </p>
        </div>

        {/* Best & Worst Days */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
              Best Day
            </p>
            <p className="text-xl font-bold text-green-600">
              {formatPercent(data.bestDay.return)}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {data.bestDay.date || "N/A"}
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
              Worst Day
            </p>
            <p className="text-xl font-bold text-red-600">
              {formatPercent(data.worstDay.return)}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {data.worstDay.date || "N/A"}
            </p>
          </div>
        </div>

        {/* Win Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-slate-400">
              Win Rate (Positive Days)
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {data.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-3">
            <div
              className="bg-emerald-500 h-3 rounded-full"
              style={{ width: `${Math.min(data.winRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RISK METRICS CARD
// ============================================================================

function RiskMetricsCard({ data }: { data: PerformanceData }) {
  const metrics = [
    {
      label: "Sharpe Ratio",
      value: data.sharpeRatio.toFixed(2),
      description: "Risk-adjusted return measure",
      good: data.sharpeRatio >= 1,
    },
    {
      label: "Annualized Volatility",
      value: `${data.volatility.toFixed(2)}%`,
      description: "Standard deviation of returns",
      good: data.volatility < 20,
    },
    {
      label: "Max Drawdown",
      value: `${data.maxDrawdown.toFixed(2)}%`,
      description: "Largest peak-to-trough decline",
      good: Math.abs(data.maxDrawdown) < 15,
    },
    {
      label: "Alpha",
      value: formatPercent(data.alpha),
      description: "Excess return over benchmark",
      good: data.alpha > 0,
    },
    {
      label: "Win Rate",
      value: `${data.winRate.toFixed(1)}%`,
      description: "Percentage of positive days",
      good: data.winRate > 50,
    },
    {
      label: "Annualized Return",
      value: formatPercent(data.annualizedReturn),
      description: "Yearly return rate",
      good: data.annualizedReturn > 0,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Risk Metrics
      </h3>
      <div className="space-y-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {metric.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {metric.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-bold ${
                  metric.good ? "text-green-600" : "text-red-600"
                }`}
              >
                {metric.value}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  metric.good ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PERIOD RETURNS TABLE
// ============================================================================

function PeriodReturnsTable({ returns }: { returns: PeriodReturn[] }) {
  if (returns.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Period Returns Comparison
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="text-left py-3 px-4 text-gray-500 dark:text-slate-400 font-medium">
                Period
              </th>
              <th className="text-right py-3 px-4 text-gray-500 dark:text-slate-400 font-medium">
                Portfolio
              </th>
              <th className="text-right py-3 px-4 text-gray-500 dark:text-slate-400 font-medium">
                Benchmark (S&P 500)
              </th>
              <th className="text-right py-3 px-4 text-gray-500 dark:text-slate-400 font-medium">
                Alpha
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {returns.map((row) => (
              <tr
                key={row.period}
                className="hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                  {row.period}
                </td>
                <td
                  className={`py-3 px-4 text-right font-semibold ${
                    row.portfolioReturn >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPercent(row.portfolioReturn)}
                </td>
                <td
                  className={`py-3 px-4 text-right ${
                    row.benchmarkReturn >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPercent(row.benchmarkReturn)}
                </td>
                <td
                  className={`py-3 px-4 text-right font-semibold ${
                    row.alpha >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPercent(row.alpha)}
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
// DAILY RETURNS DISTRIBUTION
// ============================================================================

function DailyReturnsDistribution({ points }: { points: PerformancePoint[] }) {
  if (points.length === 0) return null;

  // Build histogram buckets
  const bucketSize = 0.5;
  const returns = points.map((p) => p.dayReturn);
  const minReturn = Math.floor(Math.min(...returns));
  const maxReturn = Math.ceil(Math.max(...returns));
  const buckets: Array<{ range: string; count: number; isPositive: boolean }> =
    [];

  for (let i = minReturn; i < maxReturn; i += bucketSize) {
    const count = returns.filter((r) => r >= i && r < i + bucketSize).length;
    buckets.push({
      range: `${i.toFixed(1)}%`,
      count,
      isPositive: i >= 0,
    });
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Daily Returns Distribution
      </h3>
      <div className="flex items-end gap-0.5 h-40">
        {buckets.map((bucket, idx) => (
          <div
            key={idx}
            className="flex-1 flex flex-col items-center justify-end"
            title={`${bucket.range}: ${bucket.count} days`}
          >
            <div
              className={`w-full rounded-t ${
                bucket.isPositive
                  ? "bg-emerald-500 dark:bg-emerald-600"
                  : "bg-red-500 dark:bg-red-600"
              }`}
              style={{
                height: `${(bucket.count / maxCount) * 100}%`,
                minHeight: bucket.count > 0 ? "2px" : "0px",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-slate-500">
        <span>{buckets[0]?.range}</span>
        <span>0%</span>
        <span>{buckets[buckets.length - 1]?.range}</span>
      </div>
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-emerald-500 rounded" />
          Positive days: {returns.filter((r) => r >= 0).length}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded" />
          Negative days: {returns.filter((r) => r < 0).length}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function PerformanceLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          {/* Header */}
          <div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-64 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-96" />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6"
              >
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-3" />
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
              </div>
            ))}
          </div>

          {/* Period Selector */}
          <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg w-96" />

          {/* Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 h-[350px]" />

          {/* Bottom Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 h-[300px]" />
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 h-[300px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
