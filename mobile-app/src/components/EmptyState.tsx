/**
 * Fynvita Empty State Component
 * Placeholder for empty lists, no data, etc.
 */

import React, { useMemo } from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon = 'folder-open-outline',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();

  const styles = useMemo(() => ({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    } as ViewStyle,
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    } as ViewStyle,
    title: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    } as TextStyle,
    description: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.lg,
      maxWidth: 280,
    } as TextStyle,
    buttonContainer: {
      marginBottom: spacing.sm,
    } as ViewStyle,
  }), [colors, spacing, fontSize, fontWeight]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={64} color={colors.textSecondary} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {actionLabel && onAction && (
        <View style={styles.buttonContainer}>
          <Button
            title={actionLabel}
            onPress={onAction}
            variant="primary"
          />
        </View>
      )}

      {secondaryActionLabel && onSecondaryAction && (
        <Button
          title={secondaryActionLabel}
          onPress={onSecondaryAction}
          variant="ghost"
        />
      )}
    </View>
  );
}

export default EmptyState;
