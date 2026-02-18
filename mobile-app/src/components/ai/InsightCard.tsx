/**
 * Insight Card Component for Mobile
 * Displays AI-generated insights with actions
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../constants/theme";

type InsightType =
  | "spending"
  | "savings"
  | "debt"
  | "credit"
  | "investment"
  | "general";
type InsightPriority = "high" | "medium" | "low";

interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  actionLabel?: string;
  potentialImpact?: string;
}

interface InsightCardProps {
  insight: Insight;
  onAction?: () => void;
  onDismiss?: () => void;
}

const typeConfig: Record<
  InsightType,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  spending: { icon: "wallet", color: "#EF4444" },
  savings: { icon: "trending-up", color: "#22C55E" },
  debt: { icon: "card", color: "#F59E0B" },
  credit: { icon: "analytics", color: "#3B82F6" },
  investment: { icon: "pie-chart", color: "#8B5CF6" },
  general: { icon: "bulb", color: "#06B6D4" },
};

const priorityStyles: Record<InsightPriority, { borderColor: string }> = {
  high: { borderColor: "#EF4444" },
  medium: { borderColor: "#F59E0B" },
  low: { borderColor: "#22C55E" },
};

export function InsightCard({
  insight,
  onAction,
  onDismiss,
}: InsightCardProps) {
  const config = typeConfig[insight.type];
  const priority = priorityStyles[insight.priority];

  return (
    <View style={[styles.container, { borderLeftColor: priority.borderColor }]}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${config.color}15` },
          ]}
        >
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{insight.title}</Text>
          {insight.potentialImpact && (
            <Text style={[styles.impact, { color: config.color }]}>
              {insight.potentialImpact}
            </Text>
          )}
        </View>
        {onDismiss && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Ionicons name="close" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.description}>{insight.description}</Text>

      {insight.actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: config.color }]}
          onPress={onAction}
        >
          <Text style={styles.actionButtonText}>{insight.actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  impact: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  dismissButton: {
    padding: 4,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});

export default InsightCard;
