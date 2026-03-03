import React from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";
import { useDisputeStore } from "../../src/store/disputeStore";

const { width } = Dimensions.get("window");

/**
 * Dispute Analytics Screen
 *
 * Shows statistics and trends for the user's disputes.
 */
export default function DisputeAnalyticsScreen() {
  const { disputes } = useDisputeStore();

  // Calculate analytics
  const totalDisputes = disputes.length;
  const resolvedDisputes = disputes.filter(
    (d) => d.status === "resolved",
  ).length;
  const pendingDisputes = disputes.filter(
    (d) => d.status === "pending" || d.status === "under_review",
  ).length;
  const successRate =
    totalDisputes > 0
      ? Math.round((resolvedDisputes / totalDisputes) * 100)
      : 0;

  const bureauBreakdown = disputes.reduce(
    (acc, d) => {
      acc[d.bureau] = (acc[d.bureau] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const typeBreakdown = disputes.reduce(
    (acc, d) => {
      const type = d.itemType || "other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dispute Analytics</Text>
        <Text style={styles.subtitle}>Track your dispute performance</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: lightTheme.colors.primary },
          ]}
        >
          <Text style={styles.summaryValue}>{totalDisputes}</Text>
          <Text style={styles.summaryLabel}>Total Disputes</Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: lightTheme.colors.success },
          ]}
        >
          <Text style={styles.summaryValue}>{successRate}%</Text>
          <Text style={styles.summaryLabel}>Success Rate</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: lightTheme.colors.warning },
          ]}
        >
          <Text style={styles.summaryValue}>{pendingDisputes}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#6366F1" }]}>
          <Text style={styles.summaryValue}>{resolvedDisputes}</Text>
          <Text style={styles.summaryLabel}>Resolved</Text>
        </View>
      </View>

      {/* Bureau Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Bureau</Text>
        {Object.entries(bureauBreakdown).length > 0 ? (
          Object.entries(bureauBreakdown).map(([bureau, count]) => (
            <View key={bureau} style={styles.breakdownRow}>
              <View style={styles.breakdownLabel}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: getBureauColor(bureau) },
                  ]}
                />
                <Text style={styles.breakdownText}>
                  {formatBureauName(bureau)}
                </Text>
              </View>
              <Text style={styles.breakdownValue}>{count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No disputes yet</Text>
        )}
      </View>

      {/* Type Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Type</Text>
        {Object.entries(typeBreakdown).length > 0 ? (
          Object.entries(typeBreakdown).map(([type, count]) => (
            <View key={type} style={styles.breakdownRow}>
              <Text style={styles.breakdownText}>{formatTypeName(type)}</Text>
              <Text style={styles.breakdownValue}>{count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No disputes yet</Text>
        )}
      </View>

      {/* Tips */}
      <View style={styles.tipsSection}>
        <Ionicons
          name="bulb-outline"
          size={24}
          color={lightTheme.colors.warning}
        />
        <View style={styles.tipsContent}>
          <Text style={styles.tipsTitle}>Pro Tips</Text>
          <Text style={styles.tipsText}>
            Disputes typically take 30-45 days to resolve. For best results,
            include supporting documentation and be specific about the error.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function getBureauColor(bureau: string): string {
  const colors: Record<string, string> = {
    experian: "#0066CC",
    equifax: "#CC0000",
    transunion: "#00AA00",
  };
  return colors[bureau.toLowerCase()] || lightTheme.colors.primary;
}

function formatBureauName(bureau: string): string {
  const names: Record<string, string> = {
    experian: "Experian",
    equifax: "Equifax",
    transunion: "TransUnion",
  };
  return names[bureau.toLowerCase()] || bureau;
}

function formatTypeName(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: lightTheme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: lightTheme.colors.textSecondary,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  section: {
    margin: 20,
    marginTop: 24,
    padding: 16,
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: lightTheme.colors.text,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.border,
  },
  breakdownLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownText: {
    fontSize: 16,
    color: lightTheme.colors.text,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: 20,
  },
  tipsSection: {
    flexDirection: "row",
    margin: 20,
    padding: 16,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 16,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: lightTheme.colors.text,
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    lineHeight: 20,
  },
});
