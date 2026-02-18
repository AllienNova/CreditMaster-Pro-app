/**
 * Chart Helper Components for React Native
 *
 * Reusable tooltip and legend components for charts.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { lightTheme as theme } from "../../constants/theme";
import { formatCurrency, formatPercentage } from "./chartUtils";

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
  currency?: boolean;
  percentage?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  currency = false,
  percentage = false,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const formatValue = (value: number, name: string): string => {
    if (formatter) return formatter(value, name);
    if (currency) return formatCurrency(value);
    if (percentage) return formatPercentage(value);
    return value.toLocaleString();
  };

  const formatLabel = (lbl: string): string => {
    if (labelFormatter) return labelFormatter(lbl);
    return lbl;
  };

  return (
    <View style={styles.tooltipContainer}>
      {label && (
        <View style={styles.tooltipHeader}>
          <Text style={styles.tooltipLabel}>{formatLabel(label)}</Text>
        </View>
      )}
      <View style={styles.tooltipContent}>
        {payload.map((entry, index) => (
          <View key={index} style={styles.tooltipRow}>
            <View style={styles.tooltipNameContainer}>
              <View
                style={[styles.tooltipDot, { backgroundColor: entry.color }]}
              />
              <Text style={styles.tooltipName}>{entry.name}</Text>
            </View>
            <Text style={styles.tooltipValue}>
              {formatValue(entry.value, entry.name)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface LegendItem {
  name: string;
  color: string;
  value?: number;
}

interface ChartLegendProps {
  items: LegendItem[];
  layout?: "horizontal" | "vertical";
  align?: "left" | "center" | "right";
  showValues?: boolean;
  currency?: boolean;
  percentage?: boolean;
  onItemPress?: (name: string) => void;
  activeItems?: string[];
}

export function ChartLegend({
  items,
  layout = "horizontal",
  align = "center",
  showValues = false,
  currency = false,
  percentage = false,
  onItemPress,
  activeItems,
}: ChartLegendProps) {
  const formatValue = (value: number): string => {
    if (currency) return formatCurrency(value);
    if (percentage) return formatPercentage(value);
    return value.toLocaleString();
  };

  const isActive = (name: string): boolean => {
    if (!activeItems) return true;
    return activeItems.includes(name);
  };

  const getAlignStyle = () => {
    switch (align) {
      case "left":
        return { justifyContent: "flex-start" as const };
      case "right":
        return { justifyContent: "flex-end" as const };
      case "center":
      default:
        return { justifyContent: "center" as const };
    }
  };

  const containerStyle = [
    layout === "horizontal" ? styles.legendHorizontal : styles.legendVertical,
    getAlignStyle(),
  ];

  return (
    <View style={containerStyle}>
      {items.map((item, index) => {
        const active = isActive(item.name);
        const ItemWrapper = onItemPress ? TouchableOpacity : View;
        const wrapperProps = onItemPress
          ? { onPress: () => onItemPress(item.name), activeOpacity: 0.7 }
          : {};

        return (
          <ItemWrapper
            key={index}
            {...wrapperProps}
            style={[styles.legendItem, !active && styles.legendItemInactive]}
          >
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendName}>{item.name}</Text>
            {showValues && item.value !== undefined && (
              <Text style={styles.legendValue}>{formatValue(item.value)}</Text>
            )}
          </ItemWrapper>
        );
      })}
    </View>
  );
}

/** Inline tooltip shown on chart press - positioned absolutely */
interface InlineTooltipProps {
  x: number;
  y: number;
  label: string;
  value: string;
  color?: string;
  visible?: boolean;
}

export function InlineTooltip({
  x,
  y,
  label,
  value,
  color = theme.colors.primary,
  visible = true,
}: InlineTooltipProps) {
  if (!visible) return null;

  return (
    <View style={[styles.inlineTooltip, { left: x - 50, top: y - 60 }]}>
      <Text style={styles.inlineTooltipLabel}>{label}</Text>
      <View style={styles.inlineTooltipValueRow}>
        <View style={[styles.tooltipDot, { backgroundColor: color }]} />
        <Text style={styles.inlineTooltipValue}>{value}</Text>
      </View>
      <View style={styles.inlineTooltipArrow} />
    </View>
  );
}

/** Empty chart placeholder */
interface EmptyChartProps {
  message?: string;
  height?: number;
}

export function EmptyChart({
  message = "No data available",
  height = 200,
}: EmptyChartProps) {
  return (
    <View
      style={[styles.emptyContainer, { height }]}
      accessible
      accessibilityLabel={message}
    >
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>📊</Text>
      </View>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Tooltip styles
  tooltipContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    minWidth: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipHeader: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tooltipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  tooltipContent: {
    gap: 4,
  },
  tooltipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  tooltipNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tooltipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tooltipName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tooltipValue: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
  },

  // Legend styles
  legendHorizontal: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingVertical: theme.spacing.sm,
  },
  legendVertical: {
    flexDirection: "column",
    gap: 8,
    paddingVertical: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendItemInactive: {
    opacity: 0.4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 4,
  },

  // Inline tooltip styles (absolute positioned)
  inlineTooltip: {
    position: "absolute",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    minWidth: 100,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  inlineTooltipLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  inlineTooltipValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inlineTooltipValue: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  inlineTooltipArrow: {
    position: "absolute",
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: theme.colors.border,
  },

  // Empty chart styles
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  emptyIcon: {
    marginBottom: theme.spacing.sm,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});

export default {
  ChartTooltip,
  ChartLegend,
  InlineTooltip,
  EmptyChart,
};
