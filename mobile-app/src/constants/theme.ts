import { Platform } from 'react-native';
import type { Theme, ThemeColors, ThemeShadow } from '../types';

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Add opacity to a hex color string.
 * @param hex - 6-digit hex color (e.g. '#3B82F6')
 * @param opacity - 0–1 float
 * @returns rgba string
 */
export function withOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ============================================================================
// BASE TOKENS
// ============================================================================

const baseColors = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',
  secondary: '#10B981',
  secondaryDark: '#059669',
  accent: '#8B5CF6',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

// ============================================================================
// SHADOWS (Platform-aware)
// ============================================================================

function makeShadow(
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
  color = '#000000',
): ThemeShadow {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation: 0,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  }) as ThemeShadow;
}

const shadow = {
  none: makeShadow(0, 0, 0, 0),
  sm: makeShadow(1, 0.05, 2, 1),
  md: makeShadow(2, 0.1, 4, 3),
  lg: makeShadow(4, 0.15, 8, 6),
};

// ============================================================================
// LIGHT THEME
// ============================================================================

const lightColors: ThemeColors = {
  ...baseColors,
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
};

export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadow,
  iconSize,
};

// ============================================================================
// DARK THEME
// ============================================================================

const darkColors: ThemeColors = {
  ...baseColors,
  primary: '#60A5FA',
  primaryDark: '#3B82F6',
  primaryLight: '#93C5FD',
  secondary: '#34D399',
  secondaryDark: '#10B981',
  accent: '#A78BFA',
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  surface: '#1E293B',
  card: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',
  border: '#334155',
  borderLight: '#475569',
  borderDark: '#1E293B',
  error: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  info: '#60A5FA',
};

export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadow: {
    none: makeShadow(0, 0, 0, 0),
    sm: makeShadow(1, 0.2, 2, 1, '#000000'),
    md: makeShadow(2, 0.3, 4, 3, '#000000'),
    lg: makeShadow(4, 0.4, 8, 6, '#000000'),
  },
  iconSize,
};

// ============================================================================
// DOMAIN COLORS (shared across themes)
// ============================================================================

export const colors = {
  bureaus: {
    experian: '#0066CC',
    equifax: '#CC0000',
    transunion: '#00AA00',
  },
  status: {
    draft: '#6B7280',
    sent: '#3B82F6',
    under_review: '#F59E0B',
    resolved: '#22C55E',
    rejected: '#EF4444',
  },
  score: {
    excellent: '#22C55E',
    good: '#84CC16',
    fair: '#F59E0B',
    poor: '#EF4444',
  },
};

// ============================================================================
// HELPERS
// ============================================================================

export const getScoreColor = (score: number): string => {
  if (score >= 750) return colors.score.excellent;
  if (score >= 700) return colors.score.good;
  if (score >= 650) return colors.score.fair;
  return colors.score.poor;
};

export const getScoreLabel = (score: number): string => {
  if (score >= 750) return 'Excellent';
  if (score >= 700) return 'Good';
  if (score >= 650) return 'Fair';
  return 'Poor';
};

// ============================================================================
// TYPOGRAPHY PRESETS
// ============================================================================

export const typography = {
  h1: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, lineHeight: 40 },
  h2: { fontSize: fontSize.xxl, fontWeight: fontWeight.semibold, lineHeight: 32 },
  h3: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, lineHeight: 28 },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.normal, lineHeight: 24 },
  bodySmall: { fontSize: fontSize.sm, fontWeight: fontWeight.normal, lineHeight: 20 },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.normal, lineHeight: 16 },
  button: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, lineHeight: 24 },
};

export default lightTheme;
