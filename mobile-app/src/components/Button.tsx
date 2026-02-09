import React, { useMemo } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, borderRadius, fontSize, fontWeight } = useTheme();

  const buttonStyle = useMemo((): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
    };

    switch (size) {
      case 'sm':
        base.paddingVertical = 8;
        base.paddingHorizontal = 12;
        break;
      case 'lg':
        base.paddingVertical = 16;
        base.paddingHorizontal = 24;
        break;
      default:
        base.paddingVertical = 12;
        base.paddingHorizontal = 20;
    }

    switch (variant) {
      case 'secondary':
        base.backgroundColor = colors.secondary;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1;
        base.borderColor = colors.primary;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      default:
        base.backgroundColor = colors.primary;
    }

    if (disabled) {
      base.opacity = 0.5;
    }

    return base;
  }, [variant, size, disabled, colors, borderRadius]);

  const labelStyle = useMemo((): TextStyle => {
    const base: TextStyle = {
      fontWeight: fontWeight.semibold,
    };

    switch (size) {
      case 'sm':
        base.fontSize = fontSize.sm;
        break;
      case 'lg':
        base.fontSize = fontSize.lg;
        break;
      default:
        base.fontSize = fontSize.md;
    }

    switch (variant) {
      case 'outline':
      case 'ghost':
        base.color = colors.primary;
        break;
      default:
        base.color = colors.white;
    }

    return base;
  }, [variant, size, colors, fontSize, fontWeight]);

  const loaderColor = variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white;

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={loaderColor} />
      ) : (
        <>
          {icon}
          <Text style={[labelStyle, icon ? { marginLeft: 8 } : undefined, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
