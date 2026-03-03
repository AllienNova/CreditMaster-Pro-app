/**
 * Chart Container Component for React Native
 *
 * Provides consistent styling and responsive behavior for all charts.
 * Includes title, subtitle, loading state, and error handling.
 */

import React, { ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { lightTheme as theme } from "../../constants/theme";

export interface ChartContainerProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
  loading?: boolean;
  error?: string | null;
  style?: ViewStyle;
  actions?: ReactNode;
  footer?: ReactNode;
  /** Accessible label for the chart */
  accessibilityLabel?: string;
}

export default function ChartContainer({
  title,
  subtitle,
  children,
  height = 300,
  loading = false,
  error = null,
  style,
  actions,
  footer,
  accessibilityLabel,
}: ChartContainerProps) {
  if (loading) {
    return (
      <View
        style={[styles.container, style]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Loading ${title || "chart"}`}
      >
        {title && (
          <View style={styles.header}>
            <View style={[styles.skeletonTitle, { width: "50%" }]} />
            {subtitle && (
              <View
                style={[
                  styles.skeletonSubtitle,
                  { width: "70%", marginTop: 8 },
                ]}
              />
            )}
          </View>
        )}
        <View style={[styles.loadingContent, { height }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading chart data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.container, style]}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`Error loading ${title || "chart"}: ${error}`}
      >
        {title && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>
        )}
        <View style={[styles.errorContent, { height }]}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>!</Text>
          </View>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHint}>Please try refreshing</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={
        accessibilityLabel || `${title || "Chart"} visualization`
      }
    >
      {(title || actions) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {actions && <View style={styles.actions}>{actions}</View>}
        </View>
      )}

      <View style={{ height }}>{children}</View>

      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
  skeletonSubtitle: {
    height: 14,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
  loadingContent: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorContent: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FCA5A5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  errorIconText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#DC2626",
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: "500",
    color: "#DC2626",
    textAlign: "center",
    paddingHorizontal: theme.spacing.md,
  },
  errorHint: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  footer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});

export { ChartContainer };
