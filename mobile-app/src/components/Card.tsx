import React, { useMemo } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

export function Card({ children, style, padding = 'md', shadow = true }: CardProps) {
  const { colors, spacing, borderRadius, shadow: themeShadow } = useTheme();

  const paddingValue = useMemo(() => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return spacing.sm;
      case 'lg':
        return spacing.lg;
      default:
        return spacing.md;
    }
  }, [padding, spacing]);

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: paddingValue,
    ...(shadow ? themeShadow.sm : {}),
  };

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}
