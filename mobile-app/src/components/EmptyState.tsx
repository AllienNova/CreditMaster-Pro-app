/**
 * Fynvita Empty State Component
 * Placeholder for empty lists, no data, etc.
 * Supports both icon-based and SVG illustration variants.
 */

import React, { useMemo } from "react";
import { ViewStyle, TextStyle } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Circle, Rect, Path, Line } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import { Button } from "./Button";
import { useFadeIn, useSlideUp } from "../lib/animations";

// ============================================================================
// Types
// ============================================================================

type EmptyStateType =
  | "no-data"
  | "no-subscriptions"
  | "no-transactions"
  | "no-goals"
  | "getting-started"
  | "error";

interface EmptyStateProps {
  /** SVG illustration variant. Takes precedence over `icon` when set. */
  type?: EmptyStateType;
  /** Ionicons fallback when `type` is not provided */
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

// ============================================================================
// SVG Illustrations
// ============================================================================

function TypeIllustration({ type }: { type: EmptyStateType }) {
  const { colors } = useTheme();

  switch (type) {
    case "no-subscriptions":
      return (
        <Svg width={96} height={96} viewBox="0 0 96 96">
          <Circle cx={48} cy={48} r={44} fill={`${colors.secondary}1A`} />
          <Rect
            x={24}
            y={32}
            width={48}
            height={32}
            rx={4}
            fill={`${colors.secondary}33`}
            stroke={colors.secondary}
            strokeWidth={2}
          />
          <Line
            x1={24}
            y1={44}
            x2={72}
            y2={44}
            stroke={colors.secondary}
            strokeWidth={2}
          />
          <Circle cx={32} cy={52} r={4} fill={colors.secondary} />
          <Rect
            x={40}
            y={50}
            width={24}
            height={4}
            rx={2}
            fill={`${colors.secondary}80`}
          />
        </Svg>
      );

    case "no-transactions":
      return (
        <Svg width={96} height={96} viewBox="0 0 96 96">
          <Circle cx={48} cy={48} r={44} fill={`${colors.accent}1A`} />
          <Rect
            x={28}
            y={28}
            width={40}
            height={40}
            rx={4}
            fill={`${colors.accent}33`}
            stroke={colors.accent}
            strokeWidth={2}
          />
          <Path
            d="M38 48l6 6 14-14"
            stroke={colors.accent}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case "no-goals":
      return (
        <Svg width={96} height={96} viewBox="0 0 96 96">
          <Circle cx={48} cy={48} r={44} fill={`${colors.primary}1A`} />
          <Circle
            cx={48}
            cy={48}
            r={36}
            stroke={colors.borderDark}
            strokeWidth={2}
            fill="none"
          />
          <Circle
            cx={48}
            cy={48}
            r={24}
            stroke={colors.primary}
            strokeOpacity={0.6}
            strokeWidth={2}
            fill="none"
          />
          <Circle
            cx={48}
            cy={48}
            r={12}
            fill={`${colors.primary}33`}
            stroke={colors.primary}
            strokeWidth={2}
          />
          <Circle cx={48} cy={48} r={5} fill={colors.primary} />
        </Svg>
      );

    case "getting-started":
      return (
        <Svg width={96} height={96} viewBox="0 0 96 96">
          <Circle cx={48} cy={48} r={44} fill={`${colors.secondary}1A`} />
          {/* Rocket body */}
          <Path
            d="M48 22 C48 22 34 40 34 58 L48 68 L62 58 C62 40 48 22 48 22 Z"
            fill={colors.secondary}
          />
          {/* Window */}
          <Circle cx={48} cy={48} r={7} fill={colors.surface} stroke={`${colors.secondary}80`} strokeWidth={2} />
          {/* Fins */}
          <Path d="M34 58 L24 70 L38 66 Z" fill={colors.primary} />
          <Path d="M62 58 L72 70 L58 66 Z" fill={colors.primary} />
          {/* Flame */}
          <Path
            d="M43 68 Q46 78 48 74 Q50 78 53 68 Q50 72 48 70 Q46 72 43 68 Z"
            fill={colors.warning}
          />
        </Svg>
      );

    case "error":
      return (
        <Svg width={96} height={96} viewBox="0 0 96 96">
          <Circle cx={48} cy={48} r={44} fill={`${colors.error}1A`} />
          <Circle
            cx={48}
            cy={48}
            r={20}
            fill={`${colors.error}33`}
            stroke={colors.error}
            strokeWidth={2}
          />
          <Path
            d="M48 38v12M48 54h.01"
            stroke={colors.error}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </Svg>
      );

    // no-data default
    default:
      return (
        <Svg width={96} height={96} viewBox="0 0 96 96">
          <Circle cx={48} cy={48} r={44} fill={`${colors.primary}1A`} />
          <Path
            d="M30 36h36M30 48h24M30 60h28"
            stroke={colors.primary}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Circle
            cx={64}
            cy={60}
            r={8}
            fill={`${colors.primary}33`}
            stroke={colors.primary}
            strokeWidth={2}
          />
          <Path
            d="M62 60l2 2 4-4"
            stroke={colors.primary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
  }
}

// ============================================================================
// Component
// ============================================================================

export function EmptyState({
  type,
  icon = "folder-open-outline",
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const fadeStyle = useFadeIn();
  const slideStyle = useSlideUp(80);

  const styles = useMemo(
    () => ({
      container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
      } as ViewStyle,
      illustrationContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.backgroundSecondary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.lg,
      } as ViewStyle,
      title: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        textAlign: "center",
        marginBottom: spacing.sm,
      } as TextStyle,
      description: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: spacing.lg,
        maxWidth: 280,
      } as TextStyle,
      buttonContainer: {
        marginBottom: spacing.sm,
      } as ViewStyle,
    }),
    [colors, spacing, fontSize, fontWeight],
  );

  return (
    <Animated.View style={[styles.container, fadeStyle]}>
      <Animated.View style={[styles.illustrationContainer, slideStyle]}>
        {type ? (
          <TypeIllustration type={type} />
        ) : (
          <Ionicons name={icon} size={64} color={colors.textSecondary} />
        )}
      </Animated.View>

      <Animated.Text style={[styles.title, slideStyle]}>{title}</Animated.Text>

      {description && (
        <Animated.Text style={[styles.description, slideStyle]}>
          {description}
        </Animated.Text>
      )}

      {actionLabel && onAction && (
        <Animated.View style={[styles.buttonContainer, slideStyle]}>
          <Button title={actionLabel} onPress={onAction} variant="primary" />
        </Animated.View>
      )}

      {secondaryActionLabel && onSecondaryAction && (
        <Animated.View style={slideStyle}>
          <Button
            title={secondaryActionLabel}
            onPress={onSecondaryAction}
            variant="ghost"
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default EmptyState;
