/**
 * Fynvita Admin Analytics Screen
 * Platform performance and insights
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

const MOCK_DATA = {
  userGrowth: [
    { date: "Jan", count: 1200 },
    { date: "Feb", count: 1450 },
    { date: "Mar", count: 1680 },
    { date: "Apr", count: 1920 },
    { date: "May", count: 2150 },
    { date: "Jun", count: 2480 },
  ],
  revenueByMonth: [
    { month: "Jan", revenue: 45000 },
    { month: "Feb", revenue: 52000 },
    { month: "Mar", revenue: 58000 },
    { month: "Apr", revenue: 65000 },
    { month: "May", revenue: 72000 },
    { month: "Jun", revenue: 85000 },
  ],
  disputesByStatus: [
    { status: "Pending", count: 156 },
    { status: "In Progress", count: 89 },
    { status: "Resolved", count: 423 },
    { status: "Rejected", count: 45 },
  ],
  topFeatures: [
    { feature: "Disputes", usage: 15420 },
    { feature: "Score Tracking", usage: 12800 },
    { feature: "AI Analysis", usage: 9650 },
    { feature: "Reports", usage: 7230 },
  ],
};

export default function AdminAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const maxUsers = Math.max(...MOCK_DATA.userGrowth.map((d) => d.count));
  const maxRevenue = Math.max(
    ...MOCK_DATA.revenueByMonth.map((d) => d.revenue),
  );
  const maxDisputes = Math.max(
    ...MOCK_DATA.disputesByStatus.map((d) => d.count),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Admin Analytics</Text>
            <Text style={styles.subtitle}>Platform performance</Text>
          </View>
          <TouchableOpacity style={styles.rangeSelector}>
            <Text style={styles.rangeText}>{timeRange}</Text>
          </TouchableOpacity>
        </View>

        {/* User Growth */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>User Growth</Text>
          <View style={styles.chartContainer}>
            {MOCK_DATA.userGrowth.map((item, i) => (
              <View key={i} style={styles.barColumn}>
                <View
                  style={[
                    styles.bar,
                    styles.blueBar,
                    { height: (item.count / maxUsers) * 80 },
                  ]}
                />
                <Text style={styles.barLabel}>{item.date}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Revenue */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Monthly Revenue</Text>
          <View style={styles.chartContainer}>
            {MOCK_DATA.revenueByMonth.map((item, i) => (
              <View key={i} style={styles.barColumn}>
                <Text style={styles.barValue}>
                  ${(item.revenue / 1000).toFixed(0)}K
                </Text>
                <View
                  style={[
                    styles.bar,
                    styles.greenBar,
                    { height: (item.revenue / maxRevenue) * 80 },
                  ]}
                />
                <Text style={styles.barLabel}>{item.month}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Disputes by Status */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Disputes by Status</Text>
          {MOCK_DATA.disputesByStatus.map((item, i) => (
            <View key={i} style={styles.statusRow}>
              <Text style={styles.statusLabel}>{item.status}</Text>
              <View style={styles.statusBarBg}>
                <View
                  style={[
                    styles.statusBarFill,
                    { width: `${(item.count / maxDisputes) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.statusCount}>{item.count}</Text>
            </View>
          ))}
        </Card>

        {/* Top Features */}
        <Card style={styles.featuresCard}>
          <Text style={styles.sectionTitle}>Top Features by Usage</Text>
          <View style={styles.featuresGrid}>
            {MOCK_DATA.topFeatures.map((item, i) => (
              <View key={i} style={styles.featureItem}>
                <Text style={styles.featureValue}>
                  {item.usage.toLocaleString()}
                </Text>
                <Text style={styles.featureLabel}>{item.feature}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  rangeSelector: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  rangeText: { fontSize: 12, color: theme.colors.primary, fontWeight: "600" },
  chartCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
  },
  barColumn: { alignItems: "center", flex: 1 },
  bar: { width: 20, borderRadius: 4 },
  blueBar: { backgroundColor: theme.colors.primary },
  greenBar: { backgroundColor: theme.colors.success },
  barLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
  barValue: {
    fontSize: 9,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statusLabel: { width: 80, fontSize: 12, color: theme.colors.textSecondary },
  statusBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: theme.colors.border,
    borderRadius: 5,
    marginHorizontal: 8,
  },
  statusBarFill: {
    height: 10,
    backgroundColor: theme.colors.secondary,
    borderRadius: 5,
  },
  statusCount: {
    width: 40,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "right",
  },
  featuresCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
  },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap" },
  featureItem: {
    width: "50%",
    padding: theme.spacing.sm,
    alignItems: "center",
  },
  featureValue: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  featureLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
