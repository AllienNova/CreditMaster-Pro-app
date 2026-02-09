'use client';

/**
 * Portfolio Analytics Dashboard Page
 * 
 * Phase 5.4.2: Advanced portfolio analytics web UI with risk metrics,
 * diversification analysis, correlation heatmap, and rebalancing recommendations
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  RiskMetrics,
  DiversificationScore,
  CorrelationMatrix,
  RebalancingRecommendation,
  SectorExposure,
} from '@/lib/investments/types/advanced-analytics.types';
import { PieChartComponent, HeatmapComponent, BarChartComponent } from '@/components/charts';

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PortfolioAnalyticsPage() {
  const router = useRouter();
  const [portfolioId, setPortfolioId] = useState<string>('');
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [diversification, setDiversification] = useState<DiversificationScore | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationMatrix | null>(null);
  const [rebalance, setRebalance] = useState<RebalancingRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeHorizon, setTimeHorizon] = useState<'1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y'>('1Y');

  // Fetch all analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!portfolioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch all analytics in parallel
      const [riskRes, divRes, corrRes, rebalRes] = await Promise.all([
        fetch(`/api/investments/analytics/risk?portfolioId=${portfolioId}&timeHorizon=${timeHorizon}`),
        fetch(`/api/investments/analytics/diversification?portfolioId=${portfolioId}`),
        fetch(`/api/investments/analytics/correlation?portfolioId=${portfolioId}`),
        fetch(`/api/investments/analytics/rebalance?portfolioId=${portfolioId}`),
      ]);

      if (!riskRes.ok || !divRes.ok || !corrRes.ok || !rebalRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [riskData, divData, corrData, rebalData] = await Promise.all([
        riskRes.json(),
        divRes.json(),
        corrRes.json(),
        rebalRes.json(),
      ]);

      setRiskMetrics(riskData.data);
      setDiversification(divData.data);
      setCorrelation(corrData.data);
      setRebalance(rebalData.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [portfolioId, timeHorizon]);

  // Load portfolio ID from user's default portfolio
  useEffect(() => {
    // Fetch user's default portfolio ID from their profile
    const loadDefaultPortfolio = async () => {
      try {
        const response = await fetch('/api/investments/portfolio/default');
        if (response.ok) {
          const data = await response.json();
          setPortfolioId(data.portfolioId || '00000000-0000-0000-0000-000000000000');
        } else {
          // Use placeholder when no portfolio exists
          setPortfolioId('00000000-0000-0000-0000-000000000000');
        }
      } catch {
        // Fallback to placeholder on error
        setPortfolioId('00000000-0000-0000-0000-000000000000');
      }
    };
    void loadDefaultPortfolio();
  }, []);

  useEffect(() => {
    if (portfolioId) {
      fetchAnalytics();
    }
  }, [portfolioId, fetchAnalytics]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Portfolio Analytics
              </h1>
              <p className="mt-2 text-gray-600 dark:text-slate-400">
                Advanced risk analysis and portfolio optimization
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="1M">1 Month</option>
                <option value="3M">3 Months</option>
                <option value="6M">6 Months</option>
                <option value="1Y">1 Year</option>
                <option value="3Y">3 Years</option>
                <option value="5Y">5 Years</option>
              </select>
              <button
                onClick={fetchAnalytics}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && <LoadingState />}

        {/* Error State */}
        {error && <ErrorState message={error} onRetry={fetchAnalytics} />}

        {/* Analytics Content */}
        {!loading && !error && riskMetrics && diversification && (
          <div className="space-y-6">
            {/* Risk Gauge */}
            <RiskGauge riskMetrics={riskMetrics} />

            {/* Diversification & Sector Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DiversificationChart diversification={diversification} />
              <SectorPieChart sectorExposure={diversification.sectorDiversification.sectorExposures} />
            </div>

            {/* Correlation Heatmap */}
            {correlation && <CorrelationHeatmap correlation={correlation} />}

            {/* Rebalance Recommendations */}
            {rebalance && <RebalanceRecommendations rebalance={rebalance} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// RISK GAUGE COMPONENT
// ============================================================================

interface RiskGaugeProps {
  riskMetrics: RiskMetrics;
}

function RiskGauge({ riskMetrics }: RiskGaugeProps) {
  const getRiskLevel = (sharpe: number): { level: string; color: string; bgColor: string } => {
    if (sharpe >= 2) return { level: 'Low Risk', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (sharpe >= 1) return { level: 'Moderate Risk', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    if (sharpe >= 0) return { level: 'High Risk', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    return { level: 'Very High Risk', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const risk = getRiskLevel(riskMetrics.sharpeRatio);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Risk Metrics</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        {/* Risk Level Indicator */}
        <div className="col-span-2 md:col-span-1">
          <div className={`${risk.bgColor} rounded-lg p-6 text-center`}>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Risk Level</p>
            <p className={`text-2xl font-bold ${risk.color}`}>{risk.level}</p>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Sharpe Ratio</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {riskMetrics.sharpeRatio.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Risk-adjusted return</p>
        </div>

        {/* Beta */}
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Beta</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {riskMetrics.beta.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Market correlation</p>
        </div>

        {/* Alpha */}
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Alpha</p>
          <p className={`text-3xl font-bold ${riskMetrics.alpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(riskMetrics.alpha * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Excess return</p>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-slate-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">VaR (95%)</p>
          <p className="text-lg font-semibold text-red-600">
            {(riskMetrics.valueAtRisk.var95 * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">CVaR (95%)</p>
          <p className="text-lg font-semibold text-red-600">
            {(riskMetrics.conditionalVaR.cvar95 * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Max Drawdown</p>
          <p className="text-lg font-semibold text-red-600">
            {(riskMetrics.maxDrawdown * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Volatility</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {(riskMetrics.volatility.annualized * 100).toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DIVERSIFICATION CHART COMPONENT
// ============================================================================

interface DiversificationChartProps {
  diversification: DiversificationScore;
}

function DiversificationChart({ diversification }: DiversificationChartProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const scoreData = [
    { label: 'Overall', value: diversification.overallScore },
    { label: 'Sector', value: diversification.sectorDiversification.score },
    { label: 'Asset Class', value: diversification.assetClassDiversification.score },
    { label: 'Geographic', value: diversification.geographicDiversification.score },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Diversification Score
      </h2>

      {/* Overall Score */}
      <div className="text-center mb-6">
        <p className={`text-6xl font-bold ${getScoreColor(diversification.overallScore)}`}>
          {diversification.overallScore.toFixed(0)}
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Out of 100</p>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-4">
        {scoreData.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                {item.label}
              </span>
              <span className={`text-sm font-semibold ${getScoreColor(item.value)}`}>
                {item.value.toFixed(0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  item.value >= 80
                    ? 'bg-green-600'
                    : item.value >= 60
                    ? 'bg-yellow-600'
                    : item.value >= 40
                    ? 'bg-orange-600'
                    : 'bg-red-600'
                }`}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Concentration Risk */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Top Holding Concentration
          </span>
          <span className={`text-sm font-semibold ${
            diversification.concentrationRisk.topHoldingAllocation < 30 ? 'text-green-600' : 'text-red-600'
          }`}>
            {diversification.concentrationRisk.topHoldingAllocation.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Top 5 Holdings
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {diversification.concentrationRisk.top5Allocation.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTOR PIE CHART COMPONENT
// ============================================================================

interface SectorPieChartProps {
  sectorExposure: SectorExposure[];
}

function SectorPieChart({ sectorExposure }: SectorPieChartProps) {
  const chartData = sectorExposure.map((sector) => ({
    name: sector.sector.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    value: sector.allocation,
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Sector Allocation
      </h2>

      <PieChartComponent
        data={chartData}
        height={300}
        showLegend={true}
        showLabels={true}
        currency={false}
      />

      {/* Top Holdings by Sector */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
          Top Sectors
        </h3>
        <div className="space-y-2">
          {sectorExposure.slice(0, 5).map((sector) => (
            <div key={sector.sector} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                {sector.sector.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {sector.allocation.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CORRELATION HEATMAP COMPONENT
// ============================================================================

interface CorrelationHeatmapProps {
  correlation: CorrelationMatrix;
}

function CorrelationHeatmap({ correlation }: CorrelationHeatmapProps) {
  // Extract unique symbols from correlations
  const symbols = Array.from(new Set(
    correlation.correlations.flatMap(c => [c.symbol1, c.symbol2])
  )).sort();

  // Build correlation matrix for heatmap
  const heatmapData = correlation.correlations.map(c => ({
    x: c.symbol1,
    y: c.symbol2,
    value: c.correlation,
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Asset Correlation Matrix
      </h2>

      <div className="mb-4 space-y-2">
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Average Correlation: <span className="font-semibold">{correlation.averageCorrelation.toFixed(2)}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Max Correlation: <span className="font-semibold">{correlation.maxCorrelation.toFixed(2)}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Min Correlation: <span className="font-semibold">{correlation.minCorrelation.toFixed(2)}</span>
        </p>
      </div>

      {/* Heatmap */}
      <HeatmapComponent
        data={heatmapData}
        xLabels={symbols}
        yLabels={symbols}
        height={400}
        showValues={false}
        colorScale="blue"
      />

      {/* Highly Correlated Pairs */}
      {correlation.highlyCorrelatedPairs.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            Highly Correlated Pairs (|r| &gt; 0.7)
          </h3>
          <div className="space-y-2">
            {correlation.highlyCorrelatedPairs.slice(0, 5).map((pair, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  {pair.symbol1} ↔ {pair.symbol2}
                </span>
                <span className={`text-sm font-semibold ${
                  pair.correlation > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {pair.correlation.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// REBALANCE RECOMMENDATIONS COMPONENT
// ============================================================================

interface RebalanceRecommendationsProps {
  rebalance: RebalancingRecommendation;
}

function RebalanceRecommendations({ rebalance }: RebalanceRecommendationsProps) {
  const buyTrades = rebalance.trades.filter((t) => t.action === 'buy');
  const sellTrades = rebalance.trades.filter((t) => t.action === 'sell');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Rebalancing Recommendations
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Trades</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">
            {rebalance.trades.length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Expected Improvement</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-300">
            {(rebalance.expectedImprovement.sharpeRatio * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Trading Cost</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">
            ${rebalance.totalTradingCost.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Trades */}
      <div className="space-y-6">
        {/* Buy Trades */}
        {buyTrades.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Buy Recommendations ({buyTrades.length})
            </h3>
            <div className="space-y-2">
              {buyTrades.map((trade, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{trade.symbol}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{trade.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600 dark:text-green-300">
                      {trade.sharesToTrade.toFixed(0)} shares
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      ${trade.estimatedCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sell Trades */}
        {sellTrades.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Sell Recommendations ({sellTrades.length})
            </h3>
            <div className="space-y-2">
              {sellTrades.map((trade, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{trade.symbol}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{trade.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600 dark:text-red-300">
                      {Math.abs(trade.sharesToTrade).toFixed(0)} shares
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      ${trade.estimatedCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {rebalance.recommendations && rebalance.recommendations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Recommendations
          </h3>
          <div className="space-y-2">
            {rebalance.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  • {rec}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
        <p className="text-gray-500 dark:text-slate-400">Loading analytics...</p>
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
        <p className="text-gray-900 dark:text-white font-semibold mb-2">Error Loading Analytics</p>
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

