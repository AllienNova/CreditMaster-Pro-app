/**
 * Fynvita Credit Factor Card Component
 * Displays individual credit score factors with impact indicators
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../constants/theme";

type ImpactLevel = "high" | "medium" | "low";
type FactorStatus = "excellent" | "good" | "fair" | "poor" | "very_poor";

interface CreditFactorCardProps {
  name: string;
  description: string;
  impact: ImpactLevel;
  status: FactorStatus;
  value?: string;
  recommendation?: string;
  onPress?: () => void;
}

const impactConfig: Record<ImpactLevel, { label: string; color: string }> = {
  high: { label: "High Impact", color: "#DC2626" },
  medium: { label: "Medium Impact", color: "#F59E0B" },
  low: { label: "Low Impact", color: "#10B981" },
};

const statusConfig: Record<
  FactorStatus,
  { label: string; color: string; icon: string }
> = {
  excellent: { label: "Excellent", color: "#10B981", icon: "checkmark-circle" },
  good: { label: "Good", color: "#22C55E", icon: "checkmark-circle-outline" },
  fair: { label: "Fair", color: "#F59E0B", icon: "alert-circle-outline" },
  poor: { label: "Poor", color: "#EF4444", icon: "alert-circle" },
  very_poor: { label: "Very Poor", color: "#DC2626", icon: "close-circle" },
};

export function CreditFactorCard({
  name,
  description,
  impact,
  status,
  value,
  recommendation,
  onPress,
}: CreditFactorCardProps) {
  const impactInfo = impactConfig[impact];
  const statusInfo = statusConfig[status];

  const content = (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons
            name={statusInfo.icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={statusInfo.color}
          />
          <Text style={styles.name}>{name}</Text>
        </View>
        <View
          style={[
            styles.impactBadge,
            { backgroundColor: `${impactInfo.color}15` },
          ]}
        >
          <Text style={[styles.impactText, { color: impactInfo.color }]}>
            {impactInfo.label}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{description}</Text>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${statusInfo.color}15` },
          ]}
        >
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
        {value && <Text style={styles.value}>{value}</Text>}
      </View>

      {recommendation && (
        <View style={styles.recommendationContainer}>
          <Ionicons
            name="bulb-outline"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.recommendation}>{recommendation}</Text>
        </View>
      )}

      {onPress && (
        <View style={styles.chevronContainer}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textSecondary}
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  impactBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  impactText: {
    fontSize: 11,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  recommendationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  recommendation: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
    lineHeight: 18,
  },
  chevronContainer: {
    position: "absolute",
    right: theme.spacing.md,
    top: "50%",
    marginTop: -10,
  },
});

export default CreditFactorCard;
