/**
 * Chart Utilities
 *
 * Common utilities, colors, and formatters for charts.
 */

// Primary chart color palette - matches CPFI brand
export const CHART_COLORS = {
  primary: '#3B82F6', // Blue
  secondary: '#10B981', // Green
  tertiary: '#8B5CF6', // Purple
  quaternary: '#F59E0B', // Amber
  quinary: '#EF4444', // Red
  senary: '#06B6D4', // Cyan
  septenary: '#EC4899', // Pink
  octonary: '#6366F1', // Indigo

  // Category-specific colors for financial data
  categories: {
    food: '#F97316', // Orange
    transportation: '#3B82F6', // Blue
    housing: '#8B5CF6', // Purple
    utilities: '#06B6D4', // Cyan
    entertainment: '#EC4899', // Pink
    healthcare: '#EF4444', // Red
    shopping: '#F59E0B', // Amber
    personal: '#10B981', // Green
    education: '#6366F1', // Indigo
    savings: '#22C55E', // Emerald
    debt: '#DC2626', // Dark Red
    income: '#16A34A', // Green
    expenses: '#EF4444', // Red
    other: '#6B7280', // Gray
  },

  // Status colors
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    neutral: '#6B7280',
  },

  // Gradient pairs for area/bar fills
  gradients: {
    blue: ['#3B82F6', '#1D4ED8'],
    green: ['#10B981', '#059669'],
    purple: ['#8B5CF6', '#7C3AED'],
    amber: ['#F59E0B', '#D97706'],
    red: ['#EF4444', '#DC2626'],
    cyan: ['#06B6D4', '#0891B2'],
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
    id: 'primaryGradient',
    colors: [
      { offset: '0%', color: '#3B82F6', opacity: 0.8 },
      { offset: '100%', color: '#3B82F6', opacity: 0.1 },
    ],
  },
  successGradient: {
    id: 'successGradient',
    colors: [
      { offset: '0%', color: '#10B981', opacity: 0.8 },
      { offset: '100%', color: '#10B981', opacity: 0.1 },
    ],
  },
  dangerGradient: {
    id: 'dangerGradient',
    colors: [
      { offset: '0%', color: '#EF4444', opacity: 0.8 },
      { offset: '100%', color: '#EF4444', opacity: 0.1 },
    ],
  },
};

// Currency formatter
export function formatCurrency(
  value: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
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
  format: 'short' | 'medium' | 'long' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: '2-digit' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
  };
  return d.toLocaleDateString('en-US', optionsMap[format]);
}

// Get color by category name
export function getCategoryColor(category: string): string {
  const normalizedCategory = category.toLowerCase().replace(/[^a-z]/g, '');
  return (
    CHART_COLORS.categories[
      normalizedCategory as keyof typeof CHART_COLORS.categories
    ] || CHART_COLORS.categories.other
  );
}

// Calculate percentage change
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
