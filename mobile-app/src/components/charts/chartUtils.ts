/**
 * Chart Utilities for React Native
 *
 * Common utilities, colors, and formatters for charts.
 * Adapted from web version for React Native Victory Charts.
 */

// Primary chart color palette - matches Fynvita brand
export const CHART_COLORS = {
  primary: "#3B82F6", // Blue
  secondary: "#10B981", // Green
  tertiary: "#8B5CF6", // Purple
  quaternary: "#F59E0B", // Amber
  quinary: "#EF4444", // Red
  senary: "#06B6D4", // Cyan
  septenary: "#EC4899", // Pink
  octonary: "#6366F1", // Indigo

  // Category-specific colors for financial data
  categories: {
    food: "#F97316", // Orange
    transportation: "#3B82F6", // Blue
    housing: "#8B5CF6", // Purple
    utilities: "#06B6D4", // Cyan
    entertainment: "#EC4899", // Pink
    healthcare: "#EF4444", // Red
    shopping: "#F59E0B", // Amber
    personal: "#10B981", // Green
    education: "#6366F1", // Indigo
    savings: "#22C55E", // Emerald
    debt: "#DC2626", // Dark Red
    income: "#16A34A", // Green
    expenses: "#EF4444", // Red
    other: "#6B7280", // Gray
  } as Record<string, string>,

  // Status colors
  status: {
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6",
    neutral: "#6B7280",
  },

  // Gradient pairs for area/bar fills
  gradients: {
    blue: ["#3B82F6", "#1D4ED8"],
    green: ["#10B981", "#059669"],
    purple: ["#8B5CF6", "#7C3AED"],
    amber: ["#F59E0B", "#D97706"],
    red: ["#EF4444", "#DC2626"],
    cyan: ["#06B6D4", "#0891B2"],
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
    CHART_COLORS.categories[normalizedCategory] || CHART_COLORS.categories.other
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

// Victory Chart theme configuration
export const getVictoryTheme = (isDark = false) => ({
  axis: {
    style: {
      axis: {
        stroke: isDark ? "#4B5563" : "#E5E7EB",
        strokeWidth: 1,
      },
      tickLabels: {
        fontSize: 11,
        fill: isDark ? "#9CA3AF" : "#6B7280",
        fontFamily: "System",
      },
      grid: {
        stroke: isDark ? "#374151" : "#E5E7EB",
        strokeDasharray: "3 3",
      },
    },
  },
  tooltip: {
    style: {
      fontSize: 12,
      fill: isDark ? "#FFFFFF" : "#1F2937",
    },
    flyoutStyle: {
      fill: isDark ? "#374151" : "#FFFFFF",
      stroke: isDark ? "#4B5563" : "#E5E7EB",
      strokeWidth: 1,
    },
  },
  legend: {
    style: {
      labels: {
        fontSize: 12,
        fill: isDark ? "#9CA3AF" : "#6B7280",
        fontFamily: "System",
      },
    },
  },
});

// Axis tick formatter for mobile
export function formatAxisTick(
  value: number,
  type: "currency" | "percent" | "number" = "number",
): string {
  switch (type) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercentage(value, 0);
    default:
      return formatNumber(value);
  }
}
