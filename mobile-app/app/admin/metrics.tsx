/**
 * Admin Metrics — the real analytics aggregates.
 *
 * WHAT THIS REPLACED. Two fixtures shown to every operator with no request:
 *
 *   REVENUE_DATA  Basic $45,000 / Premium $125,000 / Enterprise $75,890
 *   DISPUTE_DATA  Pending 234 / In Progress 567 / Resolved 1,234 / Rejected 89
 *
 * summed into a "$245,890" revenue total and a "2,124 Total" dispute count.
 * The week/month/year selector changed neither, because there was nothing
 * behind it to change.
 *
 * WHERE THE DATA COMES FROM. GET /api/admin/analytics?range= (withRole
 * "admin") returns disputesByStatus and revenueByMonth off the real tables,
 * and the period selector now actually drives that range.
 *
 * THE REVENUE BREAKDOWN CHANGED SUBJECT, DELIBERATELY. The fixture split
 * revenue by plan tier, and no route computes that — /admin/analytics gives
 * revenue BY MONTH and subscription COUNTS by tier, but not revenue by tier.
 * Rather than multiply counts by a price to manufacture the old chart, the
 * chart now shows revenue by month, which is a real series. The tier names it
 * used were invented anyway: this product sells Free, Standard, Pro, Family
 * Duo, Family and Family Plus — there is no "Basic" and no "Enterprise".
 */

import React, { useState, useEffect, useCallback } from "react";
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
import {
  adminAnalyticsApi,
  type AdminAnalytics,
  type AnalyticsRange,
} from "../../src/services/api/admin";

/**
 * The period selector's labels, and the analytics range each one asks for.
 * The old selector had no effect at all; these are the ranges the route
 * accepts (src/app/api/admin/analytics/route.ts).
 */
const PERIODS: { label: string; range: AnalyticsRange }[] = [
  { label: "week", range: "7d" },
  { label: "month", range: "30d" },
  { label: "year", range: "1y" },
];

/** A stable colour per series entry — the fixture hardcoded one per row. */
const SERIES_COLORS = [
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];
const seriesColor = (index: number): string =>
  SERIES_COLORS[index % SERIES_COLORS.length];

/** "in_progress" -> "In progress". Status values are lower_snake slugs. */
const prettyStatus = (value: string): string =>
  value ? value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "";

const { width } = Dimensions.get("window");

export default function AdminMetricsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periods = PERIODS.map((p) => p.label);

  const load = useCallback(async (label: string) => {
    setLoading(true);
    setError(null);

    const range =
      PERIODS.find((p) => p.label === label)?.range ?? ("30d" as AnalyticsRange);
    const res = await adminAnalyticsApi.getAnalytics(range);

    if (!res.success || !res.data) {
      // No zero-filled fallback: an operator reading "$0 revenue" would draw a
      // very different conclusion from "we could not read the analytics".
      setError("We could not load the metrics.");
      setAnalytics(null);
      setLoading(false);
      return;
    }

    setAnalytics(res.data);
    setLoading(false);
  }, []);

  // Refetches when the period changes — the selector used to change nothing.
  useEffect(() => {
    load(selectedPeriod);
  }, [load, selectedPeriod]);

  const revenueByMonth = analytics?.revenueByMonth ?? [];
  const disputesByStatus = analytics?.disputesByStatus ?? [];

  const totalRevenue = revenueByMonth.reduce((sum, p) => sum + p.revenue, 0);
  const totalDisputes = disputesByStatus.reduce((sum, d) => sum + d.count, 0);

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
          <Text style={styles.title}>Metrics</Text>
          <TouchableOpacity>
            <Ionicons name="download" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <Card>
            <Text style={styles.chartTitle}>Loading metrics…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.chartTitle}>{error}</Text>
            <TouchableOpacity onPress={() => load(selectedPeriod)}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {/* Revenue Card */}
        <Card style={styles.chartCard}>
          {/* Was "Revenue Breakdown" over invented plan tiers. Revenue by
              tier is not computed anywhere; revenue by month is. */}
          <Text style={styles.chartTitle}>Revenue by month</Text>
          <Text style={styles.chartTotal}>
            ${totalRevenue.toLocaleString()}
          </Text>
          {!loading && !error && revenueByMonth.length === 0 ? (
            <Text style={styles.emptySeriesText}>
              No revenue recorded in this period.
            </Text>
          ) : null}
          <View style={styles.barChart}>
            {revenueByMonth.map((item, idx) => (
              <View key={item.month} style={styles.barItem}>
                <View style={styles.barContainer}>
                  <View
                    testID={`revenue-bar-${item.month}`}
                    style={[
                      styles.bar,
                      {
                        // Guarded: every month at zero revenue would divide by
                        // zero and render NaN%.
                        height: `${totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0}%`,
                        backgroundColor: seriesColor(idx),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.month}</Text>
                <Text style={styles.barValue}>
                  ${(item.revenue / 1000).toFixed(1)}K
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Disputes Card */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Dispute Status</Text>
          <Text style={styles.chartTotal}>
            {totalDisputes.toLocaleString()} Total
          </Text>
          {!loading && !error && disputesByStatus.length === 0 ? (
            <Text style={styles.emptySeriesText}>
              No disputes recorded in this period.
            </Text>
          ) : null}
          <View style={styles.horizontalBars}>
            {disputesByStatus.map((item, idx) => (
              <View key={item.status} style={styles.horizontalBarItem}>
                <View style={styles.horizontalBarHeader}>
                  <Text style={styles.horizontalBarLabel}>
                    {prettyStatus(item.status)}
                  </Text>
                  <Text style={styles.horizontalBarValue}>{item.count}</Text>
                </View>
                <View style={styles.horizontalBarBg}>
                  <View
                    style={[
                      styles.horizontalBar,
                      {
                        width: `${totalDisputes > 0 ? (item.count / totalDisputes) * 100 : 0}%`,
                        backgroundColor: seriesColor(idx),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Key Metrics */}
        <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
        <View style={styles.kpiGrid}>
          {[
            {
              title: "Conversion Rate",
              value: "12.5%",
              change: "+2.3%",
              icon: "trending-up",
            },
            {
              title: "Churn Rate",
              value: "3.2%",
              change: "-0.5%",
              icon: "trending-down",
            },
            {
              title: "Avg Session",
              value: "8m 32s",
              change: "+1m 12s",
              icon: "time",
            },
            { title: "NPS Score", value: "72", change: "+5", icon: "happy" },
          ].map((kpi, idx) => (
            <Card key={idx} style={styles.kpiCard}>
              <Ionicons
                name={kpi.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiTitle}>{kpi.title}</Text>
              <Text
                style={[
                  styles.kpiChange,
                  { color: kpi.change.startsWith("+") ? "#22C55E" : "#EF4444" },
                ]}
              >
                {kpi.change}
              </Text>
            </Card>
          ))}
        </View>

        {/* Top Features */}
        <Text style={styles.sectionTitle}>Most Used Features</Text>
        <Card style={styles.featuresCard}>
          {[
            { name: "Credit Score Check", usage: 89 },
            { name: "Dispute Generation", usage: 76 },
            { name: "Score Simulator", usage: 65 },
            { name: "Budget Tracking", usage: 54 },
            { name: "Bill Reminders", usage: 43 },
          ].map((feature, idx) => (
            <View
              key={idx}
              style={[styles.featureItem, idx < 4 && styles.featureBorder]}
            >
              <Text style={styles.featureName}>{feature.name}</Text>
              <View style={styles.featureBarBg}>
                <View
                  style={[styles.featureBar, { width: `${feature.usage}%` }]}
                />
              </View>
              <Text style={styles.featureUsage}>{feature.usage}%</Text>
            </View>
          ))}
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
  periodRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  periodButtonActive: { backgroundColor: theme.colors.primary },
  periodText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  periodTextActive: { color: "#fff" },
  chartCard: { marginBottom: theme.spacing.lg },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  emptySeriesText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginVertical: theme.spacing.md,
  },
  chartTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  chartTotal: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.primary,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-around",
    height: 150,
  },
  barItem: { alignItems: "center", flex: 1 },
  barContainer: {
    height: 100,
    width: 40,
    backgroundColor: theme.colors.border,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: { width: "100%", borderRadius: 8 },
  barLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 8 },
  barValue: { fontSize: 12, fontWeight: "600", color: theme.colors.text },
  horizontalBars: { marginTop: theme.spacing.sm },
  horizontalBarItem: { marginBottom: theme.spacing.sm },
  horizontalBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  horizontalBarLabel: { fontSize: 13, color: theme.colors.text },
  horizontalBarValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  horizontalBarBg: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  horizontalBar: { height: "100%", borderRadius: 4 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: theme.spacing.lg,
  },
  kpiCard: {
    width: "48%",
    margin: "1%",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 8,
  },
  kpiTitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  kpiChange: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  featuresCard: { padding: 0 },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
  },
  featureBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  featureName: { width: 120, fontSize: 13, color: theme.colors.text },
  featureBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: "hidden",
  },
  featureBar: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  featureUsage: {
    width: 40,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "right",
  },
});
