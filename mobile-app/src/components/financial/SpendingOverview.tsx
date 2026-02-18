/**
 * Fynvita Spending Overview Widget
 * A compact widget showing spending summary for the dashboard
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../constants/theme";
import Svg, { G, Path } from "react-native-svg";

interface SpendingCategory {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface SpendingOverviewProps {
  totalSpent: number;
  lastMonthSpent: number;
  categories: SpendingCategory[];
  isLoading?: boolean;
}

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#22C55E",
  Shopping: "#3B82F6",
  Transportation: "#F59E0B",
  Entertainment: "#EC4899",
  "Bills & Utilities": "#EF4444",
  "Health & Fitness": "#8B5CF6",
  Travel: "#06B6D4",
  Other: "#9CA3AF",
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

// Mini donut chart for the widget
function MiniDonutChart({
  categories,
  size = 60,
}: {
  categories: SpendingCategory[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;
  const innerRadius = radius * 0.6;

  let currentAngle = -90;
  const total = categories.reduce((sum, cat) => sum + cat.value, 0);

  if (total === 0) {
    return (
      <Svg width={size} height={size}>
        <G>
          <Path
            d={`M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}
                L ${cx - 0.01} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius} Z`}
            fill={theme.colors.border}
          />
        </G>
      </Svg>
    );
  }

  const segments = categories.map((category) => {
    const angle = (category.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return {
      ...category,
      startAngle,
      endAngle: currentAngle,
    };
  });

  const getArcPath = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1Outer = cx + radius * Math.cos(startRad);
    const y1Outer = cy + radius * Math.sin(startRad);
    const x2Outer = cx + radius * Math.cos(endRad);
    const y2Outer = cy + radius * Math.sin(endRad);

    const x1Inner = cx + innerRadius * Math.cos(startRad);
    const y1Inner = cy + innerRadius * Math.sin(startRad);
    const x2Inner = cx + innerRadius * Math.cos(endRad);
    const y2Inner = cy + innerRadius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `
      M ${x1Outer} ${y1Outer}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
      L ${x2Inner} ${y2Inner}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}
      Z
    `;
  };

  return (
    <Svg width={size} height={size}>
      {segments.map((segment, index) => {
        // Handle full circle
        if (segment.percentage >= 99.9) {
          return (
            <G key={index}>
              <Path
                d={`M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}
                    L ${cx - 0.01} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius} Z`}
                fill={
                  segment.color ||
                  CATEGORY_COLORS[segment.name] ||
                  CATEGORY_COLORS.Other
                }
              />
            </G>
          );
        }

        return (
          <G key={index}>
            <Path
              d={getArcPath(segment.startAngle, segment.endAngle)}
              fill={
                segment.color ||
                CATEGORY_COLORS[segment.name] ||
                CATEGORY_COLORS.Other
              }
            />
          </G>
        );
      })}
    </Svg>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonValue} />
      </View>
      <View style={styles.skeletonChart} />
    </View>
  );
}

export function SpendingOverview({
  totalSpent,
  lastMonthSpent,
  categories,
  isLoading = false,
}: SpendingOverviewProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const changeAmount = totalSpent - lastMonthSpent;
  const changePercent =
    lastMonthSpent > 0
      ? Math.abs((changeAmount / lastMonthSpent) * 100).toFixed(1)
      : "0";

  const isUp = changeAmount > 0;
  const isDown = changeAmount < 0;

  const topCategory = [...categories].sort((a, b) => b.value - a.value)[0];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push("/dashboard/spending")}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Spent this month</Text>
          <Text style={styles.value}>{formatCurrency(totalSpent)}</Text>
          <View style={styles.changeRow}>
            {isUp && (
              <>
                <Ionicons
                  name="trending-up"
                  size={14}
                  color={theme.colors.error}
                />
                <Text style={[styles.changeText, styles.changeUp]}>
                  {changePercent}% vs last month
                </Text>
              </>
            )}
            {isDown && (
              <>
                <Ionicons
                  name="trending-down"
                  size={14}
                  color={theme.colors.success}
                />
                <Text style={[styles.changeText, styles.changeDown]}>
                  {changePercent}% vs last month
                </Text>
              </>
            )}
            {!isUp && !isDown && (
              <>
                <Ionicons
                  name="remove"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.changeText}>Same as last month</Text>
              </>
            )}
          </View>
        </View>

        <MiniDonutChart categories={categories} size={60} />
      </View>

      {topCategory && (
        <View style={styles.topCategory}>
          <View
            style={[
              styles.categoryDot,
              {
                backgroundColor:
                  topCategory.color || CATEGORY_COLORS[topCategory.name],
              },
            ]}
          />
          <Text style={styles.categoryName}>{topCategory.name}</Text>
          <Text style={styles.categoryValue}>
            {formatCurrency(topCategory.value)}
          </Text>
        </View>
      )}

      {/* Category bar */}
      <View style={styles.categoryBar}>
        {categories.slice(0, 5).map((category, index) => (
          <View
            key={index}
            style={[
              styles.categorySegment,
              {
                flex: category.percentage,
                backgroundColor:
                  category.color ||
                  CATEGORY_COLORS[category.name] ||
                  CATEGORY_COLORS.Other,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.seeDetails}>See details</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.primary}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  changeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  changeUp: {
    color: theme.colors.error,
  },
  changeDown: {
    color: theme.colors.success,
  },
  topCategory: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
  categoryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  categoryBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: theme.colors.border,
    marginBottom: 12,
  },
  categorySegment: {
    height: "100%",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  seeDetails: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
    marginRight: 4,
  },
  // Skeleton styles
  skeletonHeader: {
    marginBottom: 12,
  },
  skeletonTitle: {
    width: 100,
    height: 14,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonValue: {
    width: 120,
    height: 28,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
  skeletonChart: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.border,
    position: "absolute",
    right: 16,
    top: 16,
  },
});

export default SpendingOverview;
