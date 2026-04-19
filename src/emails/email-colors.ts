import { BRAND_COLORS } from "@/lib/design-tokens/brand-colors";

/**
 * Email colour tokens. Brand colours come from the shared primitives in
 * `src/lib/design-tokens/brand-colors.ts`. The status-dark variants (success,
 * error, warning) are email-specific darker shades that remain readable on
 * the coloured background chips used in transactional templates.
 */
export const EMAIL_COLORS = {
  textPrimary: "#374151",
  textSecondary: "#6b7280",
  textTertiary: "#9ca3af",
  textWhite: "#ffffff",
  bgWhite: "#ffffff",
  bgLight: "#f9fafb",
  bgDark: "#111827",

  brand: BRAND_COLORS.emerald,
  brandBlue: BRAND_COLORS.blue,
  brandGradient: `linear-gradient(135deg, ${BRAND_COLORS.emerald}, ${BRAND_COLORS.blue})`,

  // Status backgrounds + darker foregrounds tuned for email clients.
  success: "#065f46",
  successBg: "#ecfdf5",
  error: "#991b1b",
  errorBg: "#fef2f2",
  warning: "#92400e",
  warningBg: "#fffbeb",
  // Bright variants for borders/highlights (match brand primitives so a
  // palette change lands in one place).
  danger: BRAND_COLORS.red,
  warningBright: BRAND_COLORS.amber,

  link: BRAND_COLORS.blue,
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
} as const;
