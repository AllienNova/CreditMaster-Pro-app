/**
 * Fynvita Theme Hook
 * Provides theme context and utilities for consistent styling.
 * Automatically switches between light/dark based on system preference.
 */

import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, withOpacity } from '../constants/theme';
import type { Theme } from '../types';

export interface UseThemeReturn {
  theme: Theme;
  isDark: boolean;
  colors: Theme['colors'];
  spacing: Theme['spacing'];
  borderRadius: Theme['borderRadius'];
  fontSize: Theme['fontSize'];
  fontWeight: Theme['fontWeight'];
  shadow: Theme['shadow'];
  iconSize: Theme['iconSize'];
  withOpacity: (hex: string, opacity: number) => string;
}

export function useTheme(): UseThemeReturn {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return {
    theme,
    isDark,
    colors: theme.colors,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    fontSize: theme.fontSize,
    fontWeight: theme.fontWeight,
    shadow: theme.shadow,
    iconSize: theme.iconSize,
    withOpacity,
  };
}

export default useTheme;
