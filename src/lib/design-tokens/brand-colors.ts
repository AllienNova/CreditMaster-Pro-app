/**
 * Brand Color Primitives
 *
 * Single source of truth for Fynvita brand colours. Both chart tokens
 * (`chart-colors.ts`) and email tokens (`email-colors.ts`) import from here
 * so a brand palette change lands in one file instead of three.
 *
 * Add a new colour here before referencing it in the rendering-environment
 * tokens. Avoid embedding raw hex strings in components.
 */

export const BRAND_COLORS = {
  // Brand spectrum
  emerald: "#10B981",
  blue: "#3B82F6",
  deepBlue: "#2962FF",
  purple: "#8B5CF6",
  indigo: "#6366F1",
  teal: "#14B8A6",
  pink: "#EC4899",

  // Semantic
  amber: "#F59E0B",
  orange: "#F97316",
  yellow: "#EAB308",
  red: "#EF4444",
  lime: "#84CC16",

  // Neutrals
  gray: "#6B7280",
  darkGray: "#374151",
  lightBlue: "#93C5FD",
} as const;

export type BrandColor = (typeof BRAND_COLORS)[keyof typeof BRAND_COLORS];
