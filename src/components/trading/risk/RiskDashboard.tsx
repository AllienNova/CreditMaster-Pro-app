"use client";

/**
 * RiskDashboard
 *
 * Main risk dashboard container that composes VaRVisualization,
 * DrawdownChart, RiskHeatmap, and CircuitBreakerPanel into a
 * unified portfolio risk overview.
 */

import React, { useMemo } from "react";
import type {
  PortfolioRiskMetrics,
  PositionRisk,
  PortfolioRiskConfig,
} from "@/lib/trading/pctt/portfolio-risk";
import { DEFAULT_PORTFOLIO_RISK_CONFIG } from "@/lib/trading/pctt/portfolio-risk";
import { VaRVisualization } from "./VaRVisualization";
import type { VaRData } from "./VaRVisualization";
import { DrawdownChart } from "./DrawdownChart";
import type { DrawdownDataPoint, DrawdownThresholds } from "./DrawdownChart";
import { RiskHeatmap } from "./RiskHeatmap";
import { CircuitBreakerPanel } from "./CircuitBreakerPanel";
import type { CircuitBreaker } from "./CircuitBreakerPanel";

// ============================================================================
// TYPES
// ============================================================================

export interface RiskDashboardProps {
  /** Portfolio risk metrics from PortfolioRiskManager.getMetrics() */
  metrics: PortfolioRiskMetrics | null;
  /** Array of current position risks */
  positions: PositionRisk[];
  /** Account equity for calculations */
  accountEquity: number;
  /** Portfolio risk configuration */
  config?: Partial<PortfolioRiskConfig>;
  /** Historical drawdown data points for the chart */
  drawdownHistory?: DrawdownDataPoint[];
  /** Circuit breaker definitions */
  circuitBreakers?: CircuitBreaker[];
  /** Callback when reset kill switch is pressed */
  onResetKillSwitch?: () => void;
  /** Whether data is loading */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getRiskScoreColor(score: number): string {
  if (score >= 80) return "text-red-500";
  if (score >= 60) return "text-orange-500";
  if (score >= 40) return "text-amber-500";
  if (score >= 20) return "text-yellow-500";
  return "text-green-500";
}

function getRiskScoreLabel(score: number): string {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Low";
  return "Minimal";
}

/**
 * Calculate an overall risk score (0-100) from portfolio metrics.
 * Uses a weighted formula based on heat utilization, drawdown, and exposure.
 */
function calculateRiskScore(metrics: PortfolioRiskMetrics): number {
  const heatScore = Math.min(metrics.heatUtilization, 1) * 40;
  const drawdownScore = Math.min(metrics.currentDrawdown / 0.15, 1) * 30;
  const exposureScore = Math.min(metrics.grossExposure / 2.0, 1) * 20;
  const concentrationScore = Math.min(metrics.largestPosition / 0.20, 1) * 10;

  return Math.round(
    heatScore + drawdownScore + exposureScore + concentrationScore,
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RiskDashboard({
  metrics,
  positions,
  accountEquity,
  config: configOverrides,
  drawdownHistory = [],
  circuitBreakers = [],
  onResetKillSwitch,
  loading = false,
  className = "",
}: RiskDashboardProps) {
  const config = useMemo(
    () => ({ ...DEFAULT_PORTFOLIO_RISK_CONFIG, ...configOverrides }),
    [configOverrides],
  );

  const riskScore = useMemo(
    () => (metrics ? calculateRiskScore(metrics) : 0),
    [metrics],
  );

  const varData: VaRData | null = useMemo(() => {
    if (!metrics) return null;
    return {
      totalHeat: metrics.totalHeat,
      maxHeat: metrics.maxHeat,
      heatUtilization: metrics.heatUtilization,
      grossExposure: metrics.grossExposure,
      netExposure: metrics.netExposure,
      longExposure: metrics.longExposure,
      shortExposure: metrics.shortExposure,
    };
  }, [metrics]);

  const drawdownThresholds: DrawdownThresholds = useMemo(
    () => ({
      level1: config.drawdownLevel1,
      level2: config.drawdownLevel2,
      killLevel: config.drawdownKillLevel,
    }),
    [config],
  );

  if (loading) {
    return (
      <div
        className={`space-y-6 ${className}`}
        role="status"
        aria-label="Loading risk dashboard"
      >
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded bg-gray-300 dark:bg-gray-600 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 ${className}`}
      role="region"
      aria-label="Risk dashboard"
    >
      {/* Header with Risk Score */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Portfolio Risk Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time risk monitoring and circuit breaker status
          </p>
        </div>

        {metrics && (
          <div className="flex items-center gap-4">
            {/* Risk Score Circle */}
            <div className="flex flex-col items-center" data-testid="risk-score">
              <div className="relative h-16 w-16">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${riskScore} ${100 - riskScore}`}
                    strokeLinecap="round"
                    className={getRiskScoreColor(riskScore)}
                  />
                </svg>
                <span
                  className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getRiskScoreColor(riskScore)}`}
                >
                  {riskScore}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getRiskScoreLabel(riskScore)}
              </span>
            </div>

            {/* Trading Status */}
            <div
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                metrics.canTrade
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              }`}
              role="status"
              aria-label={metrics.canTrade ? "Trading active" : "Trading halted"}
              data-testid="trading-badge"
            >
              {metrics.canTrade ? "Trading Active" : "Trading Halted"}
            </div>
          </div>
        )}
      </div>

      {!metrics && (
        <div
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center"
          role="region"
          aria-label="No risk data"
        >
          <p className="text-gray-500 dark:text-gray-400">
            No risk data available. Connect your portfolio to see risk metrics.
          </p>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VaR Visualization */}
          <VaRVisualization data={varData} />

          {/* Drawdown Chart */}
          <DrawdownChart
            data={drawdownHistory}
            currentDrawdown={metrics.currentDrawdown}
            maxDrawdown={metrics.maxDrawdown}
            scaleFactor={metrics.drawdownScaleFactor}
            thresholds={drawdownThresholds}
          />

          {/* Risk Heatmap */}
          <RiskHeatmap
            positions={positions}
            accountEquity={accountEquity}
          />

          {/* Circuit Breaker Panel */}
          <CircuitBreakerPanel
            breakers={circuitBreakers}
            killSwitchActive={metrics.killSwitchActive}
            killSwitchReason={metrics.killSwitchReason}
            canTrade={metrics.canTrade}
            blockReasons={metrics.blockReasons}
            onResetKillSwitch={onResetKillSwitch}
          />
        </div>
      )}
    </div>
  );
}

export default RiskDashboard;
