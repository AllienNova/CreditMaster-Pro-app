/**
 * CPFI Theme Hook
 * Provides theme context and utilities for consistent styling
 */

import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type Theme } from '../../constants/theme';

export interface UseThemeReturn {
  theme: Theme;
  isDark: boolean;
  colors: Theme['colors'];
  spacing: Theme['spacing'];
  borderRadius: Theme['borderRadius'];
  fontSize: Theme['fontSize'];
  fontWeight: Theme['fontWeight'];
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
  };
}

export default useTheme;

