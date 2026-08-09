/**
 * Chart Utilities
 *
 * Common utilities, colors, and formatters for charts.
 * Includes accessibility-focused helpers for WCAG compliance.
 */

import { CHART_COLORS as TOKENS } from "@/lib/design-tokens/chart-colors";

// Axis tick styles with proper dark mode support and responsive sizing
export const AXIS_TICK_STYLE = {
  fontSize: 11,
  fill: TOKENS.gray,
};

// Dark mode aware axis styles
export const getAxisStyles = (isDark = false) => ({
  tick: {
    fontSize: 11,
    fill: isDark ? "#9CA3AF" : TOKENS.gray,
  },
  tickLine: {
    stroke: isDark ? "#4B5563" : "#E5E7EB",
  },
  axisLine: {
    stroke: isDark ? "#4B5563" : "#E5E7EB",
  },
});

// Grid styles with dark mode support
export const getGridStyles = (isDark = false) => ({
  stroke: isDark ? TOKENS.darkGray : "#E5E7EB",
  strokeDasharray: "3 3",
});

// Generate accessible chart description for screen readers
export function generateChartDescription(
  chartType: string,
  dataPoints: number,
  dataRange?: { min: number; max: number },
  currency = false,
): string {
  const rangeText = dataRange
    ? ` ranging from ${currency ? formatCurrency(dataRange.min) : dataRange.min} to ${currency ? formatCurrency(dataRange.max) : dataRange.max}`
    : "";
  return `${chartType} with ${dataPoints} data points${rangeText}. Use arrow keys to navigate data points when focused.`;
}

// Primary chart color palette - matches Fynvita brand
export const CHART_COLORS = {
  primary: TOKENS.blue,
  secondary: TOKENS.emerald,
  tertiary: TOKENS.purple,
  quaternary: TOKENS.amber,
  quinary: TOKENS.red,
  senary: "#06B6D4", // Cyan - not in chart tokens (axis/grid utility)
  septenary: TOKENS.pink,
  octonary: TOKENS.indigo,

  // Category-specific colors for financial data
  categories: {
    food: TOKENS.orange,
    transportation: TOKENS.blue,
    housing: TOKENS.purple,
    utilities: "#06B6D4", // Cyan
    entertainment: TOKENS.pink,
    healthcare: TOKENS.red,
    shopping: TOKENS.amber,
    personal: TOKENS.emerald,
    education: TOKENS.indigo,
    savings: "#22C55E", // Emerald-500 shade (distinct from emerald token)
    debt: "#DC2626", // Red-600 shade (distinct from red token)
    income: "#16A34A", // Green-600 shade (distinct from emerald token)
    expenses: TOKENS.red,
    other: TOKENS.gray,
  },

  // Status colors
  status: {
    success: TOKENS.emerald,
    warning: TOKENS.amber,
    danger: TOKENS.red,
    info: TOKENS.blue,
    neutral: TOKENS.gray,
  },

  // Gradient pairs for area/bar fills
  gradients: {
    blue: [TOKENS.blue, "#1D4ED8"] as const,
    green: [TOKENS.emerald, "#059669"] as const,
    purple: [TOKENS.purple, "#7C3AED"] as const,
    amber: [TOKENS.amber, "#D97706"] as const,
    red: [TOKENS.red, "#DC2626"] as const,
    cyan: ["#06B6D4", "#0891B2"] as const,
  },
};

// Chart color array for easy iteration
export const CHART_COLOR_ARRAY = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.tertiary,
  CHART_COLORS.quaternary,
  CHART_COLORS.quinary,
  CHART_COLORS.senary,
  CHART_COLORS.septenary,
  CHART_COLORS.octonary,
];

// Gradient definitions for SVG charts
export const CHART_GRADIENTS = {
  primaryGradient: {
    id: "primaryGradient",
    colors: [
      { offset: "0%", color: TOKENS.blue, opacity: 0.8 },
      { offset: "100%", color: TOKENS.blue, opacity: 0.1 },
    ],
  },
  successGradient: {
    id: "successGradient",
    colors: [
      { offset: "0%", color: TOKENS.emerald, opacity: 0.8 },
      { offset: "100%", color: TOKENS.emerald, opacity: 0.1 },
    ],
  },
  dangerGradient: {
    id: "dangerGradient",
    colors: [
      { offset: "0%", color: TOKENS.red, opacity: 0.8 },
      { offset: "100%", color: TOKENS.red, opacity: 0.1 },
    ],
  },
};

// Currency formatter
export function formatCurrency(
  value: number,
  currency: string = "USD",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Percentage formatter
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Number formatter with abbreviations (K, M, B)
export function formatNumber(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

// Date formatter for chart axes
export function formatDate(
  date: string | Date,
  format: "short" | "medium" | "long" = "short",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: "short", day: "numeric" },
    medium: { month: "short", day: "numeric", year: "2-digit" },
    long: { month: "long", day: "numeric", year: "numeric" },
  };
  return d.toLocaleDateString("en-US", optionsMap[format]);
}

// Get color by category name
export function getCategoryColor(category: string): string {
  const normalizedCategory = category.toLowerCase().replace(/[^a-z]/g, "");
  return (
    CHART_COLORS.categories[
      normalizedCategory as keyof typeof CHART_COLORS.categories
    ] || CHART_COLORS.categories.other
  );
}

// Calculate percentage change
export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
