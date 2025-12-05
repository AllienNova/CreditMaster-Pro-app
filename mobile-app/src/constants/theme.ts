import type { Theme } from '../types';

export const lightTheme: Theme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
};

export const darkTheme: Theme = {
  colors: {
    primary: '#60A5FA',
    secondary: '#A78BFA',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    border: '#334155',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
};

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
    excellent: '#22C55E', // 750+
    good: '#84CC16',      // 700-749
    fair: '#F59E0B',      // 650-699
    poor: '#EF4444',      // Below 650
  },
};

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

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
};

