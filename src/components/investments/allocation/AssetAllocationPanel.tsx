'use client';

/**
 * Asset Allocation Panel Component
 *
 * Displays portfolio asset allocation analysis, risk metrics, and rebalancing recommendations
 */

import { useState, useMemo } from 'react';
import {
  AssetAllocationAnalysis,
  RiskTolerance,
  AssetClass,
} from '@/lib/investments/types/asset-allocation.types';
import { Portfolio } from '@/lib/investments/types/investment.types';
import { EfficientFrontierChart } from './EfficientFrontierChart';
import { getAssetAllocationService } from '@/lib/investments/services/AssetAllocationService';

interface AssetAllocationPanelProps {
  portfolio: Portfolio;
  onRebalance?: (recommendations: any[]) => void;
}

export default function AssetAllocationPanel({ portfolio, onRebalance }: AssetAllocationPanelProps) {
  const [analysis, setAnalysis] = useState<AssetAllocationAnalysis | null>(null);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>(RiskTolerance.MODERATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate efficient frontier data
  const efficientFrontierData = useMemo(() => {
    const service = getAssetAllocationService();
    return service.generateEfficientFrontier(20);
  }, []);

  // Calculate current portfolio position for the chart
  const currentPortfolioPosition = useMemo(() => {
    if (!analysis) return undefined;

    return {
      volatility: analysis.riskMetrics.portfolioVolatility * 100,
      expectedReturn: analysis.performanceMetrics.expectedReturn * 100,
      label: 'Current Portfolio',
    };
  }, [analysis]);

  // Calculate recommended portfolio position for the chart
  const recommendedPortfolioPosition = useMemo(() => {
    if (!analysis) return undefined;

    return {
      volatility: analysis.recommendedModel.expectedVolatility * 100,
      expectedReturn: analysis.recommendedModel.expectedReturn * 100,
      label: `Recommended (${analysis.recommendedModel.name})`,
    };
  }, [analysis]);

  const analyzeAllocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/investments/allocation-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio,
          riskTolerance,
          constraints: {
            transactionCostPerTrade: 10,
            minPositionSize: 0.01,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.data);
      } else {
        setError(result.error || 'Failed to analyze allocation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze allocation');
    } finally {
      setLoading(false);
    }
  };

  const getAssetClassColor = (assetClass: AssetClass): string => {
    const colors: Record<AssetClass, string> = {
      [AssetClass.STOCKS]: 'bg-blue-500',
      [AssetClass.BONDS]: 'bg-green-500',
      [AssetClass.CASH]: 'bg-gray-500',
      [AssetClass.REAL_ESTATE]: 'bg-purple-500',
      [AssetClass.COMMODITIES]: 'bg-yellow-500',
      [AssetClass.CRYPTO]: 'bg-orange-500',
      [AssetClass.ALTERNATIVES]: 'bg-pink-500',
    };
    return colors[assetClass] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Asset Allocation Analysis</h2>
        <div className="flex items-center gap-4">
          <select
            value={riskTolerance}
            onChange={(e) => setRiskTolerance(e.target.value as RiskTolerance)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
          >
            <option value={RiskTolerance.VERY_CONSERVATIVE}>Very Conservative</option>
            <option value={RiskTolerance.CONSERVATIVE}>Conservative</option>
            <option value={RiskTolerance.MODERATE}>Moderate</option>
            <option value={RiskTolerance.AGGRESSIVE}>Aggressive</option>
            <option value={RiskTolerance.VERY_AGGRESSIVE}>Very Aggressive</option>
          </select>
          <button
            onClick={analyzeAllocation}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Current Allocation */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Current Allocation</h3>
            <div className="space-y-3">
              {analysis.currentAllocations.map((allocation) => (
                <div key={allocation.assetClass} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300 capitalize">
                      {allocation.assetClass.replace('_', ' ')}
                    </span>
                    <span className="text-white font-semibold">
                      {allocation.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`${getAssetClassColor(allocation.assetClass)} h-2 rounded-full`}
                      style={{ width: `${allocation.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400">
                    ${allocation.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diversification Score */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Diversification Score</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${
                      analysis.diversificationScore >= 70
                        ? 'bg-green-500'
                        : analysis.diversificationScore >= 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${analysis.diversificationScore}%` }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-white">{analysis.diversificationScore}/100</span>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Risk Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400">Volatility</div>
                <div className="text-lg font-semibold text-white">
                  {(analysis.riskMetrics.portfolioVolatility * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Beta</div>
                <div className="text-lg font-semibold text-white">
                  {analysis.riskMetrics.portfolioBeta.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">VaR (95%)</div>
                <div className="text-lg font-semibold text-white">
                  ${analysis.riskMetrics.valueAtRisk.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Max Drawdown</div>
                <div className="text-lg font-semibold text-white">
                  {(analysis.riskMetrics.maxDrawdown * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400">Expected Return</div>
                <div className="text-lg font-semibold text-white">
                  {(analysis.performanceMetrics.expectedReturn * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Sharpe Ratio</div>
                <div className="text-lg font-semibold text-white">
                  {analysis.performanceMetrics.sharpeRatio.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Sortino Ratio</div>
                <div className="text-lg font-semibold text-white">
                  {analysis.performanceMetrics.sortinoRatio.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Information Ratio</div>
                <div className="text-lg font-semibold text-white">
                  {analysis.performanceMetrics.informationRatio.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Efficient Frontier Chart */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <EfficientFrontierChart
              frontierPoints={efficientFrontierData}
              currentPortfolio={currentPortfolioPosition}
              recommendedPortfolio={recommendedPortfolioPosition}
              height={450}
            />
          </div>

          {/* Rebalancing Recommendations */}
          {analysis.needsRebalancing && analysis.rebalancingRecommendations.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Rebalancing Recommendations</h3>
                <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-sm">
                  {analysis.deviationFromTarget.toFixed(1)}% deviation
                </span>
              </div>
              <div className="space-y-3">
                {analysis.rebalancingRecommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-700 rounded-lg border border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-white">{rec.symbol}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            rec.priority === 'high'
                              ? 'bg-red-900/30 text-red-400'
                              : rec.priority === 'medium'
                              ? 'bg-yellow-900/30 text-yellow-400'
                              : 'bg-blue-900/30 text-blue-400'
                          }`}
                        >
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded font-semibold ${
                          rec.action === 'buy'
                            ? 'bg-green-900/30 text-green-400'
                            : rec.action === 'sell'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-gray-600 text-gray-300'
                        }`}
                      >
                        {rec.action.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 mb-2">{rec.reason}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Current: </span>
                        <span className="text-white">{rec.currentPercentage.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Target: </span>
                        <span className="text-white">{rec.targetPercentage.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Shares: </span>
                        <span className="text-white">
                          {rec.action === 'buy' ? '+' : '-'}
                          {rec.sharesToTrade}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Value: </span>
                        <span className="text-white">${rec.valueToTrade.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {onRebalance && (
                <button
                  onClick={() => onRebalance(analysis.rebalancingRecommendations)}
                  className="mt-4 w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                >
                  Execute Rebalancing
                </button>
              )}
            </div>
          )}

          {!analysis.needsRebalancing && (
            <div className="bg-green-900/30 border border-green-500 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-400">
                <span className="text-2xl">✓</span>
                <span className="font-semibold">Portfolio is well-balanced!</span>
              </div>
              <div className="text-sm text-green-300 mt-2">
                Your current allocation is within acceptable ranges for your risk tolerance.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
