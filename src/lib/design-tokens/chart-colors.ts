import { BRAND_COLORS } from "./brand-colors";

/**
 * Chart colour tokens — all values resolve to the shared brand primitives
 * in `brand-colors.ts`. When adding a new colour, add it to BRAND_COLORS
 * first and reference it here.
 */
export const CHART_COLORS = {
  emerald: BRAND_COLORS.emerald,
  blue: BRAND_COLORS.blue,
  purple: BRAND_COLORS.purple,
  amber: BRAND_COLORS.amber,
  red: BRAND_COLORS.red,
  orange: BRAND_COLORS.orange,
  yellow: BRAND_COLORS.yellow,
  lime: BRAND_COLORS.lime,
  indigo: BRAND_COLORS.indigo,
  gray: BRAND_COLORS.gray,
  lightBlue: BRAND_COLORS.lightBlue,
  teal: BRAND_COLORS.teal,
  pink: BRAND_COLORS.pink,
  deepBlue: BRAND_COLORS.deepBlue,
  darkGray: BRAND_COLORS.darkGray,
} as const;

export type ChartColor = (typeof CHART_COLORS)[keyof typeof CHART_COLORS];
