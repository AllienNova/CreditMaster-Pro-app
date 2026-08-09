"use client";

/**
 * Allocation Config Panel
 *
 * UI component for configuring portfolio target allocations
 * with visual sliders, preset models, and validation.
 */

import React, { useState, useCallback, useMemo } from "react";
import { CHART_COLORS } from "@/lib/design-tokens/chart-colors";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Settings,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Shield,
  Briefcase,
  Wallet,
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

export interface TargetAllocation {
  assetClass: AssetClass;
  targetPercent: number;
  minPercent: number;
  maxPercent: number;
}

export interface PortfolioModel {
  id: string;
  name: string;
  description: string;
  riskLevel: "conservative" | "moderate" | "aggressive" | "custom";
  allocations: TargetAllocation[];
}

export interface AllocationConfigPanelProps {
  initialAllocations?: TargetAllocation[];
  onSave: (allocations: TargetAllocation[]) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ASSET_CLASS_INFO: Record<
  AssetClass,
  { label: string; color: string; icon: React.ReactNode }
> = {
  us_stocks: {
    label: "US Stocks",
    color: CHART_COLORS.blue,
    icon: <TrendingUp className="w-4 h-4" />,
  },
  international_stocks: {
    label: "International Stocks",
    color: CHART_COLORS.purple,
    icon: <TrendingUp className="w-4 h-4" />,
  },
  emerging_markets: {
    label: "Emerging Markets",
    color: CHART_COLORS.pink,
    icon: <TrendingUp className="w-4 h-4" />,
  },
  bonds: {
    label: "Bonds",
    color: CHART_COLORS.emerald,
    icon: <Shield className="w-4 h-4" />,
  },
  real_estate: {
    label: "Real Estate",
    color: CHART_COLORS.amber,
    icon: <Briefcase className="w-4 h-4" />,
  },
  commodities: {
    label: "Commodities",
    color: CHART_COLORS.red,
    icon: <Briefcase className="w-4 h-4" />,
  },
  cash: {
    label: "Cash",
    color: CHART_COLORS.gray,
    icon: <Wallet className="w-4 h-4" />,
  },
  crypto: {
    label: "Crypto",
    color: CHART_COLORS.orange,
    icon: <TrendingUp className="w-4 h-4" />,
  },
  alternatives: {
    label: "Alternatives",
    color: CHART_COLORS.teal,
    icon: <Briefcase className="w-4 h-4" />,
  },
};

const PORTFOLIO_MODELS: PortfolioModel[] = [
  {
    id: "aggressive",
    name: "Aggressive Growth",
    description:
      "High growth potential with higher volatility. Best for long-term investors.",
    riskLevel: "aggressive",
    allocations: [
      {
        assetClass: "us_stocks",
        targetPercent: 50,
        minPercent: 45,
        maxPercent: 55,
      },
      {
        assetClass: "international_stocks",
        targetPercent: 25,
        minPercent: 20,
        maxPercent: 30,
      },
      {
        assetClass: "emerging_markets",
        targetPercent: 10,
        minPercent: 5,
        maxPercent: 15,
      },
      { assetClass: "bonds", targetPercent: 10, minPercent: 5, maxPercent: 15 },
      { assetClass: "cash", targetPercent: 5, minPercent: 0, maxPercent: 10 },
    ],
  },
  {
    id: "moderate",
    name: "Balanced",
    description:
      "Balance between growth and stability. Suitable for medium-term goals.",
    riskLevel: "moderate",
    allocations: [
      {
        assetClass: "us_stocks",
        targetPercent: 40,
        minPercent: 35,
        maxPercent: 45,
      },
      {
        assetClass: "international_stocks",
        targetPercent: 15,
        minPercent: 10,
        maxPercent: 20,
      },
      {
        assetClass: "bonds",
        targetPercent: 35,
        minPercent: 30,
        maxPercent: 40,
      },
      {
        assetClass: "real_estate",
        targetPercent: 5,
        minPercent: 0,
        maxPercent: 10,
      },
      { assetClass: "cash", targetPercent: 5, minPercent: 0, maxPercent: 10 },
    ],
  },
  {
    id: "conservative",
    name: "Conservative",
    description:
      "Focus on capital preservation with steady income. Ideal for near-term needs.",
    riskLevel: "conservative",
    allocations: [
      {
        assetClass: "us_stocks",
        targetPercent: 25,
        minPercent: 20,
        maxPercent: 30,
      },
      {
        assetClass: "international_stocks",
        targetPercent: 10,
        minPercent: 5,
        maxPercent: 15,
      },
      {
        assetClass: "bonds",
        targetPercent: 50,
        minPercent: 45,
        maxPercent: 55,
      },
      { assetClass: "cash", targetPercent: 15, minPercent: 10, maxPercent: 20 },
    ],
  },
  {
    id: "income",
    name: "Income Focus",
    description: "Maximizes dividend and interest income. Good for retirees.",
    riskLevel: "conservative",
    allocations: [
      {
        assetClass: "us_stocks",
        targetPercent: 20,
        minPercent: 15,
        maxPercent: 25,
      },
      {
        assetClass: "bonds",
        targetPercent: 50,
        minPercent: 45,
        maxPercent: 55,
      },
      {
        assetClass: "real_estate",
        targetPercent: 15,
        minPercent: 10,
        maxPercent: 20,
      },
      { assetClass: "cash", targetPercent: 15, minPercent: 10, maxPercent: 20 },
    ],
  },
];

const DEFAULT_ALLOCATIONS: TargetAllocation[] = PORTFOLIO_MODELS[1].allocations;

// ============================================================================
// COMPONENT
// ============================================================================

export function AllocationConfigPanel({
  initialAllocations = DEFAULT_ALLOCATIONS,
  onSave,
  onCancel,
  isLoading = false,
}: AllocationConfigPanelProps) {
  const [allocations, setAllocations] =
    useState<TargetAllocation[]>(initialAllocations);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total allocation
  const totalPercent = useMemo(
    () => allocations.reduce((sum, a) => sum + a.targetPercent, 0),
    [allocations],
  );

  const isValid = Math.abs(totalPercent - 100) < 0.01;

  // Update allocation for an asset class
  const updateAllocation = useCallback(
    (assetClass: AssetClass, newPercent: number) => {
      setAllocations((prev) => {
        const updated = prev.map((a) => {
          if (a.assetClass === assetClass) {
            return {
              ...a,
              targetPercent: Math.max(0, Math.min(100, newPercent)),
            };
          }
          return a;
        });
        return updated;
      });
      setSelectedModel(null);
      setError(null);
    },
    [],
  );

  // Update min/max bounds
  const updateBounds = useCallback(
    (assetClass: AssetClass, min: number, max: number) => {
      setAllocations((prev) =>
        prev.map((a) => {
          if (a.assetClass === assetClass) {
            return { ...a, minPercent: min, maxPercent: max };
          }
          return a;
        }),
      );
    },
    [],
  );

  // Apply a preset model
  const applyModel = useCallback((model: PortfolioModel) => {
    setAllocations(model.allocations);
    setSelectedModel(model.id);
    setError(null);
  }, []);

  // Reset to initial
  const handleReset = useCallback(() => {
    setAllocations(initialAllocations);
    setSelectedModel(null);
    setError(null);
  }, [initialAllocations]);

  // Save allocations
  const handleSave = useCallback(async () => {
    if (!isValid) {
      setError("Allocations must total 100%");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(allocations);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save allocations",
      );
    } finally {
      setIsSaving(false);
    }
  }, [allocations, isValid, onSave]);

  // Add new asset class
  const addAssetClass = useCallback(
    (assetClass: AssetClass) => {
      if (allocations.some((a) => a.assetClass === assetClass)) return;

      setAllocations((prev) => [
        ...prev,
        { assetClass, targetPercent: 0, minPercent: 0, maxPercent: 100 },
      ]);
      setSelectedModel(null);
    },
    [allocations],
  );

  // Remove asset class
  const removeAssetClass = useCallback((assetClass: AssetClass) => {
    setAllocations((prev) => prev.filter((a) => a.assetClass !== assetClass));
    setSelectedModel(null);
  }, []);

  // Available asset classes to add
  const availableAssetClasses = useMemo(() => {
    const current = new Set(allocations.map((a) => a.assetClass));
    return (Object.keys(ASSET_CLASS_INFO) as AssetClass[]).filter(
      (ac) => !current.has(ac),
    );
  }, [allocations]);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PieChart className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">
            Target Allocation
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${isValid ? "text-emerald-400" : "text-red-400"}`}
          >
            {totalPercent.toFixed(1)}%
          </span>
          {isValid ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>

      {/* Preset Models */}
      <div className="px-6 py-4 border-b border-gray-800">
        <p className="text-sm text-gray-400 dark:text-slate-500 mb-3">
          Choose a preset or customize:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PORTFOLIO_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => applyModel(model)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedModel === model.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
              }`}
            >
              <p className="text-sm font-medium text-white">{model.name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {model.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Allocation Sliders */}
      <div className="px-6 py-4 space-y-4">
        {allocations.map((allocation) => {
          const info = ASSET_CLASS_INFO[allocation.assetClass];
          return (
            <div key={allocation.assetClass} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: info.color }}
                  />
                  <span className="text-sm text-gray-300">{info.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={allocation.targetPercent}
                    onChange={(e) =>
                      updateAllocation(
                        allocation.assetClass,
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-16 px-2 py-1 text-right text-sm bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    min="0"
                    max="100"
                    step="1"
                  />
                  <span className="text-sm text-gray-500 dark:text-slate-400 w-4">
                    %
                  </span>
                  <button
                    onClick={() => removeAssetClass(allocation.assetClass)}
                    className="p-1 text-gray-500 dark:text-slate-400 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Slider */}
              <div className="relative">
                <input
                  type="range"
                  value={allocation.targetPercent}
                  onChange={(e) =>
                    updateAllocation(
                      allocation.assetClass,
                      parseFloat(e.target.value),
                    )
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  min="0"
                  max="100"
                  step="1"
                  style={{
                    background: `linear-gradient(to right, ${info.color} 0%, ${info.color} ${allocation.targetPercent}%, #374151 ${allocation.targetPercent}%, #374151 100%)`,
                  }}
                />
              </div>

              {/* Min/Max bounds (advanced) */}
              {showAdvanced && (
                <div className="flex items-center gap-4 pl-5 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-slate-400">
                      Min:
                    </span>
                    <input
                      type="number"
                      value={allocation.minPercent}
                      onChange={(e) =>
                        updateBounds(
                          allocation.assetClass,
                          parseFloat(e.target.value) || 0,
                          allocation.maxPercent,
                        )
                      }
                      className="w-12 px-1 py-0.5 text-center bg-gray-800 border border-gray-700 rounded text-gray-300"
                      min="0"
                      max={allocation.targetPercent}
                    />
                    <span className="text-gray-500 dark:text-slate-400">%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-slate-400">
                      Max:
                    </span>
                    <input
                      type="number"
                      value={allocation.maxPercent}
                      onChange={(e) =>
                        updateBounds(
                          allocation.assetClass,
                          allocation.minPercent,
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-12 px-1 py-0.5 text-center bg-gray-800 border border-gray-700 rounded text-gray-300"
                      min={allocation.targetPercent}
                      max="100"
                    />
                    <span className="text-gray-500 dark:text-slate-400">%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Asset Class */}
        {availableAssetClasses.length > 0 && (
          <div className="pt-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addAssetClass(e.target.value as AssetClass);
                  e.target.value = "";
                }
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 border-dashed rounded-lg text-gray-400 dark:text-slate-500 text-sm cursor-pointer hover:border-gray-600"
              defaultValue=""
            >
              <option value="" disabled>
                + Add asset class...
              </option>
              {availableAssetClasses.map((ac) => (
                <option key={ac} value={ac}>
                  {ASSET_CLASS_INFO[ac].label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pie Chart Preview */}
      <div className="px-6 py-4 border-t border-gray-800">
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-32 h-32">
            {allocations
              .reduce<{ element: React.ReactNode; endAngle: number }[]>(
                (acc, allocation, index) => {
                  const startAngle =
                    acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
                  const angle = (allocation.targetPercent / 100) * 360;
                  const endAngle = startAngle + angle;

                  if (allocation.targetPercent === 0) return acc;

                  const largeArc = angle > 180 ? 1 : 0;
                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);

                  const x1 = 50 + 40 * Math.cos(startRad);
                  const y1 = 50 + 40 * Math.sin(startRad);
                  const x2 = 50 + 40 * Math.cos(endRad);
                  const y2 = 50 + 40 * Math.sin(endRad);

                  const pathD =
                    allocation.targetPercent >= 100
                      ? `M 50 10 A 40 40 0 1 1 49.99 10 Z`
                      : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

                  acc.push({
                    element: (
                      <path
                        key={allocation.assetClass}
                        d={pathD}
                        fill={ASSET_CLASS_INFO[allocation.assetClass].color}
                        stroke="#1F2937"
                        strokeWidth="0.5"
                      />
                    ),
                    endAngle,
                  });

                  return acc;
                },
                [],
              )
              .map((item) => item.element)}
            <circle cx="50" cy="50" r="20" fill="#111827" />
            <text
              x="50"
              y="52"
              textAnchor="middle"
              className="text-[8px] fill-white font-medium"
            >
              {totalPercent.toFixed(0)}%
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-3">
          {allocations
            .filter((a) => a.targetPercent > 0)
            .map((allocation) => (
              <div
                key={allocation.assetClass}
                className="flex items-center gap-1.5"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      ASSET_CLASS_INFO[allocation.assetClass].color,
                  }}
                />
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {ASSET_CLASS_INFO[allocation.assetClass].label} (
                  {allocation.targetPercent}%)
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Advanced Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full px-6 py-2 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-slate-500 hover:text-gray-300 border-t border-gray-800"
      >
        <Settings className="w-4 h-4" />
        <span>Advanced Settings</span>
        {showAdvanced ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 py-3 bg-red-500/10 border-t border-red-500/30"
          >
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-800 flex items-center justify-between">
        <button
          onClick={handleReset}
          disabled={isSaving}
          className="px-4 py-2 text-gray-400 dark:text-slate-500 hover:text-white flex items-center gap-2 transition-colors"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Reset
        </button>

        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving || isLoading}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Allocation
          </button>
        </div>
      </div>
    </div>
  );
}

export default AllocationConfigPanel;
