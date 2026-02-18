"use client";

/**
 * Drift Alert Panel
 *
 * UI component for displaying portfolio drift alerts and
 * threshold configuration with visual indicators.
 */

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  BellOff,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type AssetClass =
  | "us_stocks"
  | "international_stocks"
  | "emerging_markets"
  | "bonds"
  | "real_estate"
  | "commodities"
  | "cash"
  | "crypto"
  | "alternatives";

export type AlertPriority = "low" | "medium" | "high";

export interface DriftData {
  assetClass: AssetClass;
  targetPercent: number;
  currentPercent: number;
  drift: number;
  driftPercent: number;
  isOutOfBounds: boolean;
}

export interface DriftAlert {
  id: string;
  portfolioId: string;
  portfolioName: string;
  priority: AlertPriority;
  totalDrift: number;
  maxDrift: number;
  driftData: DriftData[];
  recommendation: string;
  createdAt: Date;
  dismissed: boolean;
}

export interface DriftThresholdConfig {
  enabled: boolean;
  lowThreshold: number;
  mediumThreshold: number;
  highThreshold: number;
  notifyOnLow: boolean;
  notifyOnMedium: boolean;
  notifyOnHigh: boolean;
}

export interface DriftAlertPanelProps {
  alerts: DriftAlert[];
  thresholdConfig: DriftThresholdConfig;
  onDismissAlert: (alertId: string) => void;
  onDismissAll: () => void;
  onUpdateThresholds: (config: DriftThresholdConfig) => void;
  onRefresh: () => void;
  onRebalanceClick: (portfolioId: string) => void;
  isLoading?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  us_stocks: "US Stocks",
  international_stocks: "Intl Stocks",
  emerging_markets: "Emerging Mkts",
  bonds: "Bonds",
  real_estate: "Real Estate",
  commodities: "Commodities",
  cash: "Cash",
  crypto: "Crypto",
  alternatives: "Alternatives",
};

const PRIORITY_CONFIG: Record<
  AlertPriority,
  { color: string; bgColor: string; icon: React.ReactNode }
> = {
  low: {
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  medium: {
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  high: {
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    icon: <XCircle className="w-5 h-5" />,
  },
};

const DEFAULT_THRESHOLDS: DriftThresholdConfig = {
  enabled: true,
  lowThreshold: 3,
  mediumThreshold: 5,
  highThreshold: 10,
  notifyOnLow: false,
  notifyOnMedium: true,
  notifyOnHigh: true,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DriftAlertPanel({
  alerts,
  thresholdConfig = DEFAULT_THRESHOLDS,
  onDismissAlert,
  onDismissAll,
  onUpdateThresholds,
  onRefresh,
  onRebalanceClick,
  isLoading = false,
}: DriftAlertPanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [localConfig, setLocalConfig] = useState(thresholdConfig);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  // Filter active alerts
  const activeAlerts = useMemo(
    () =>
      alerts
        .filter((a) => !a.dismissed)
        .sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }),
    [alerts],
  );

  const alertCounts = useMemo(
    () => ({
      high: activeAlerts.filter((a) => a.priority === "high").length,
      medium: activeAlerts.filter((a) => a.priority === "medium").length,
      low: activeAlerts.filter((a) => a.priority === "low").length,
    }),
    [activeAlerts],
  );

  const handleSaveSettings = useCallback(() => {
    onUpdateThresholds(localConfig);
    setShowSettings(false);
  }, [localConfig, onUpdateThresholds]);

  const toggleAlertExpand = useCallback((alertId: string) => {
    setExpandedAlertId((prev) => (prev === alertId ? null : alertId));
  }, []);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-5 h-5 text-blue-400" />
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                {activeAlerts.length}
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-white">Drift Alerts</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-gray-400 dark:text-slate-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings
                ? "text-blue-400 bg-blue-500/10"
                : "text-gray-400 dark:text-slate-500 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert Summary */}
      {activeAlerts.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-800/30">
          <div className="flex items-center gap-4">
            {alertCounts.high > 0 && (
              <span className="flex items-center gap-1.5 text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                {alertCounts.high} High
              </span>
            )}
            {alertCounts.medium > 0 && (
              <span className="flex items-center gap-1.5 text-orange-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {alertCounts.medium} Medium
              </span>
            )}
            {alertCounts.low > 0 && (
              <span className="flex items-center gap-1.5 text-yellow-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {alertCounts.low} Low
              </span>
            )}
          </div>
          <button
            onClick={onDismissAll}
            className="text-xs text-gray-400 dark:text-slate-500 hover:text-white transition-colors"
          >
            Dismiss All
          </button>
        </div>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-800 overflow-hidden"
          >
            <div className="px-6 py-4 space-y-4 bg-gray-800/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">
                  Enable Drift Alerts
                </span>
                <button
                  onClick={() =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      enabled: !prev.enabled,
                    }))
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    localConfig.enabled ? "bg-blue-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white dark:bg-slate-800 rounded-full transition-transform ${
                      localConfig.enabled ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="text-sm text-gray-300">Low Threshold</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={localConfig.lowThreshold}
                      onChange={(e) =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          lowThreshold: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-16 px-2 py-1 text-right text-sm bg-gray-800 border border-gray-700 rounded text-white"
                      min="0"
                      max="100"
                      step="0.5"
                    />
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      %
                    </span>
                    <button
                      onClick={() =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          notifyOnLow: !prev.notifyOnLow,
                        }))
                      }
                      className={`p-1.5 rounded ${localConfig.notifyOnLow ? "text-yellow-400" : "text-gray-600 dark:text-slate-300"}`}
                    >
                      {localConfig.notifyOnLow ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="text-sm text-gray-300">
                      Medium Threshold
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={localConfig.mediumThreshold}
                      onChange={(e) =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          mediumThreshold: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-16 px-2 py-1 text-right text-sm bg-gray-800 border border-gray-700 rounded text-white"
                      min="0"
                      max="100"
                      step="0.5"
                    />
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      %
                    </span>
                    <button
                      onClick={() =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          notifyOnMedium: !prev.notifyOnMedium,
                        }))
                      }
                      className={`p-1.5 rounded ${localConfig.notifyOnMedium ? "text-orange-400" : "text-gray-600 dark:text-slate-300"}`}
                    >
                      {localConfig.notifyOnMedium ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm text-gray-300">
                      High Threshold
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={localConfig.highThreshold}
                      onChange={(e) =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          highThreshold: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-16 px-2 py-1 text-right text-sm bg-gray-800 border border-gray-700 rounded text-white"
                      min="0"
                      max="100"
                      step="0.5"
                    />
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      %
                    </span>
                    <button
                      onClick={() =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          notifyOnHigh: !prev.notifyOnHigh,
                        }))
                      }
                      className={`p-1.5 rounded ${localConfig.notifyOnHigh ? "text-red-400" : "text-gray-600 dark:text-slate-300"}`}
                    >
                      {localConfig.notifyOnHigh ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setLocalConfig(thresholdConfig);
                    setShowSettings(false);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-400 dark:text-slate-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerts List */}
      <div className="divide-y divide-gray-800">
        {activeAlerts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-gray-300 font-medium">
              All portfolios are balanced
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              No drift alerts at this time
            </p>
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const config = PRIORITY_CONFIG[alert.priority];
            const isExpanded = expandedAlertId === alert.id;

            return (
              <div key={alert.id} className={`${config.bgColor}`}>
                {/* Alert Header */}
                <div
                  className="px-6 py-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
                  onClick={() => toggleAlertExpand(alert.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={config.color}>{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium">
                          {alert.portfolioName}
                        </h3>
                        <span className={`text-sm font-medium ${config.color}`}>
                          {alert.maxDrift.toFixed(1)}% drift
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 dark:text-slate-500 mt-1 line-clamp-1">
                        {alert.recommendation}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-slate-400">
                        <span>
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </span>
                        <span className="capitalize">
                          {alert.priority} priority
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-500 dark:text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 space-y-4">
                        {/* Drift Breakdown */}
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-300 mb-3">
                            Allocation Drift
                          </h4>
                          <div className="space-y-2">
                            {alert.driftData.map((item) => (
                              <div
                                key={item.assetClass}
                                className="flex items-center gap-3"
                              >
                                <span className="text-xs text-gray-400 dark:text-slate-500 w-24 truncate">
                                  {ASSET_CLASS_LABELS[item.assetClass]}
                                </span>
                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${item.drift > 0 ? "bg-emerald-500" : "bg-red-500"}`}
                                    style={{
                                      width: `${Math.min(Math.abs(item.drift) * 5, 100)}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`text-xs font-medium w-16 text-right ${
                                    item.drift > 0
                                      ? "text-emerald-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {item.drift > 0 ? "+" : ""}
                                  {item.drift.toFixed(1)}%
                                </span>
                                <div className="flex items-center gap-1 w-20">
                                  {item.drift > 0 ? (
                                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3 text-red-400" />
                                  )}
                                  <span className="text-xs text-gray-500 dark:text-slate-400">
                                    {item.currentPercent.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onDismissAlert(alert.id)}
                            className="px-3 py-1.5 text-sm text-gray-400 dark:text-slate-500 hover:text-white transition-colors"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => onRebalanceClick(alert.portfolioId)}
                            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                          >
                            Rebalance Now
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default DriftAlertPanel;
