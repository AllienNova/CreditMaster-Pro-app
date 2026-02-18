/**
 * Fynvita Dispute Analytics Screen
 * Success rate by bureau, resolution time trends, export
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

const { width } = Dimensions.get("window");

interface BureauStats {
  name: string;
  total: number;
  successful: number;
  pending: number;
  avgDays: number;
  color: string;
}

const BUREAU_STATS: BureauStats[] = [
  {
    name: "Experian",
    total: 15,
    successful: 12,
    pending: 2,
    avgDays: 28,
    color: "#3B82F6",
  },
  {
    name: "Equifax",
    total: 12,
    successful: 9,
    pending: 1,
    avgDays: 32,
    color: "#22C55E",
  },
  {
    name: "TransUnion",
    total: 10,
    successful: 7,
    pending: 1,
    avgDays: 25,
    color: "#F59E0B",
  },
];

const MONTHLY_DATA = [
  { month: "Jul", submitted: 4, resolved: 3 },
  { month: "Aug", submitted: 6, resolved: 5 },
  { month: "Sep", submitted: 8, resolved: 6 },
  { month: "Oct", submitted: 5, resolved: 7 },
  { month: "Nov", submitted: 7, resolved: 4 },
  { month: "Dec", submitted: 3, resolved: 2 },
];

const DISPUTE_TYPES = [
  { type: "Late Payment", count: 12, success: 9 },
  { type: "Collection", count: 8, success: 5 },
  { type: "Inquiry", count: 6, success: 6 },
  { type: "Account Error", count: 5, success: 4 },
  { type: "Identity Theft", count: 2, success: 2 },
];

export default function DisputeAnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState("6m");
  const periods = ["1m", "3m", "6m", "1y", "All"];

  const totalDisputes = BUREAU_STATS.reduce((sum, b) => sum + b.total, 0);
  const totalSuccessful = BUREAU_STATS.reduce(
    (sum, b) => sum + b.successful,
    0,
  );
  const overallSuccessRate = Math.round(
    (totalSuccessful / totalDisputes) * 100,
  );
  const avgResolutionDays = Math.round(
    BUREAU_STATS.reduce((sum, b) => sum + b.avgDays, 0) / BUREAU_STATS.length,
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Dispute Analytics</Text>
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons
              name="download-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodChip,
                selectedPeriod === period && styles.periodChipActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Stats */}
        <Card style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>{totalDisputes}</Text>
              <Text style={styles.overviewLabel}>Total Disputes</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewValue, { color: "#22C55E" }]}>
                {overallSuccessRate}%
              </Text>
              <Text style={styles.overviewLabel}>Success Rate</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text
                style={[styles.overviewValue, { color: theme.colors.primary }]}
              >
                {avgResolutionDays}
              </Text>
              <Text style={styles.overviewLabel}>Avg Days</Text>
            </View>
          </View>
        </Card>

        {/* Bureau Breakdown */}
        <Text style={styles.sectionTitle}>By Bureau</Text>
        {BUREAU_STATS.map((bureau) => (
          <Card key={bureau.name} style={styles.bureauCard}>
            <View style={styles.bureauHeader}>
              <View
                style={[styles.bureauDot, { backgroundColor: bureau.color }]}
              />
              <Text style={styles.bureauName}>{bureau.name}</Text>
              <Text style={styles.bureauTotal}>{bureau.total} disputes</Text>
            </View>
            <View style={styles.bureauStats}>
              <View style={styles.bureauStat}>
                <Text style={styles.bureauStatValue}>
                  {Math.round((bureau.successful / bureau.total) * 100)}%
                </Text>
                <Text style={styles.bureauStatLabel}>Success</Text>
              </View>
              <View style={styles.bureauStat}>
                <Text style={styles.bureauStatValue}>{bureau.successful}</Text>
                <Text style={styles.bureauStatLabel}>Resolved</Text>
              </View>
              <View style={styles.bureauStat}>
                <Text style={[styles.bureauStatValue, { color: "#F59E0B" }]}>
                  {bureau.pending}
                </Text>
                <Text style={styles.bureauStatLabel}>Pending</Text>
              </View>
              <View style={styles.bureauStat}>
                <Text style={styles.bureauStatValue}>{bureau.avgDays}d</Text>
                <Text style={styles.bureauStatLabel}>Avg Time</Text>
              </View>
            </View>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${(bureau.successful / bureau.total) * 100}%`,
                    backgroundColor: bureau.color,
                  },
                ]}
              />
            </View>
          </Card>
        ))}

        {/* Dispute Types */}
        <Text style={styles.sectionTitle}>By Type</Text>
        <Card style={styles.typesCard}>
          {DISPUTE_TYPES.map((item, idx) => (
            <View
              key={item.type}
              style={[
                styles.typeRow,
                idx < DISPUTE_TYPES.length - 1 && styles.typeRowBorder,
              ]}
            >
              <View style={styles.typeInfo}>
                <Text style={styles.typeName}>{item.type}</Text>
                <Text style={styles.typeCount}>{item.count} disputes</Text>
              </View>
              <View style={styles.typeSuccess}>
                <Text
                  style={[
                    styles.typeSuccessRate,
                    {
                      color:
                        item.success / item.count >= 0.75
                          ? "#22C55E"
                          : item.success / item.count >= 0.5
                            ? "#F59E0B"
                            : "#EF4444",
                    },
                  ]}
                >
                  {Math.round((item.success / item.count) * 100)}%
                </Text>
                <Text style={styles.typeSuccessLabel}>success</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Monthly Trend */}
        <Text style={styles.sectionTitle}>Monthly Trend</Text>
        <Card style={styles.trendCard}>
          <View style={styles.trendLegend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
              <Text style={styles.legendText}>Submitted</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#22C55E" }]}
              />
              <Text style={styles.legendText}>Resolved</Text>
            </View>
          </View>
          <View style={styles.chartContainer}>
            {MONTHLY_DATA.map((data, idx) => (
              <View key={data.month} style={styles.chartColumn}>
                <View style={styles.barsContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: data.submitted * 10,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: data.resolved * 10,
                        backgroundColor: "#22C55E",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{data.month}</Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  exportButton: { padding: 4 },
  periodSelector: { flexDirection: "row", marginBottom: theme.spacing.lg },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  periodChipActive: { backgroundColor: theme.colors.primary },
  periodText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  periodTextActive: { color: "#fff" },
  overviewCard: { marginBottom: theme.spacing.lg },
  overviewRow: { flexDirection: "row", alignItems: "center" },
  overviewItem: { flex: 1, alignItems: "center" },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  overviewValue: { fontSize: 28, fontWeight: "700", color: theme.colors.text },
  overviewLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  bureauCard: { marginBottom: theme.spacing.sm },
  bureauHeader: { flexDirection: "row", alignItems: "center" },
  bureauDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  bureauName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  bureauTotal: { fontSize: 12, color: theme.colors.textSecondary },
  bureauStats: { flexDirection: "row", marginTop: theme.spacing.md },
  bureauStat: { flex: 1, alignItems: "center" },
  bureauStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  bureauStatLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginTop: theme.spacing.md,
  },
  progressBar: { height: "100%", borderRadius: 2 },
  typesCard: { marginBottom: theme.spacing.lg },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
  },
  typeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  typeInfo: { flex: 1 },
  typeName: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  typeCount: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  typeSuccess: { alignItems: "flex-end" },
  typeSuccessRate: { fontSize: 16, fontWeight: "700" },
  typeSuccessLabel: { fontSize: 10, color: theme.colors.textSecondary },
  trendCard: { marginBottom: theme.spacing.lg },
  trendLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 100,
  },
  chartColumn: { alignItems: "center" },
  barsContainer: { flexDirection: "row", alignItems: "flex-end" },
  bar: { width: 12, marginHorizontal: 2, borderRadius: 4 },
  chartLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
});
