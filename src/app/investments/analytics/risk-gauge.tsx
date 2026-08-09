"use client";

import type { RiskMetrics } from "@/lib/investments/types/advanced-analytics.types";
import { getRiskLevel } from "./risk-level";

export interface RiskGaugeProps {
  riskMetrics: RiskMetrics;
}

export function RiskGauge({ riskMetrics }: RiskGaugeProps) {
  const risk = getRiskLevel(riskMetrics.sharpeRatio);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Risk Metrics
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        {/* Risk Level Indicator */}
        <div className="col-span-2 md:col-span-1">
          <div className={`${risk.bgColor} rounded-lg p-6 text-center`}>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
              Risk Level
            </p>
            <p className={`text-2xl font-bold ${risk.color}`}>{risk.level}</p>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
            Sharpe Ratio
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {riskMetrics.sharpeRatio !== null ? riskMetrics.sharpeRatio.toFixed(2) : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Risk-adjusted return
          </p>
        </div>

        {/* Beta */}
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Beta</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {riskMetrics.beta !== null ? riskMetrics.beta.toFixed(2) : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Market correlation
          </p>
        </div>

        {/* Alpha */}
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
            Alpha
          </p>
          <p
            className={`text-3xl font-bold ${riskMetrics.alpha !== null && riskMetrics.alpha >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {riskMetrics.alpha !== null ? `${(riskMetrics.alpha * 100).toFixed(2)}%` : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Excess return
          </p>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-slate-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            VaR (95%)
          </p>
          <p className="text-lg font-semibold text-red-600">
            {(riskMetrics.valueAtRisk.var95 * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            CVaR (95%)
          </p>
          <p className="text-lg font-semibold text-red-600">
            {(riskMetrics.conditionalVaR.cvar95 * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            Max Drawdown
          </p>
          <p className="text-lg font-semibold text-red-600">
            {(riskMetrics.maxDrawdown * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            Volatility
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {(riskMetrics.volatility.annualized * 100).toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}
