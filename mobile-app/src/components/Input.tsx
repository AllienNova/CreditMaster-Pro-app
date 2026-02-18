import React, { useMemo } from "react";
import { View, Text, TextInput, TextInputProps, ViewStyle } from "react-native";
import { useTheme } from "../hooks/useTheme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();

  const styles = useMemo(
    () => ({
      container: {
        marginBottom: spacing.md,
      } as ViewStyle,
      label: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.text,
        marginBottom: spacing.xs,
      },
      input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: error ? colors.error : colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: fontSize.md,
        color: colors.text,
      },
      errorText: {
        fontSize: fontSize.xs,
        color: colors.error,
        marginTop: spacing.xs,
      },
    }),
    [colors, spacing, borderRadius, fontSize, fontWeight, error],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textSecondary}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}
